<script lang="ts">
	import { untrack } from 'svelte';
	import { projectStore } from '$lib/stores/project.svelte';
	import DrawingCanvas from '$lib/drawing/DrawingCanvas.svelte';
	import { DEFAULT_STROKE, DEFAULT_TRACE, sketchToContours } from '$lib/font/sketch-to-bezier';
	import type { Anchor, BezierContour, ColorLayer, Glyph, SketchStroke } from '$lib/font/types';
	import { defaultPalette } from '$lib/font/color';
	import { glyphBounds } from '$lib/font/path';
	import { interpolateGlyph, computeMasterWeights } from '$lib/font/interpolate';
	import {
		chaikinSmooth,
		booleanContours,
		transformPoints,
		simplifyContours,
		type AffineMatrix,
		type PathOp
	} from '$lib/font/path-edit';
	import { aglfnName } from '$lib/font/aglfn';
	import LoadingPanel from '$lib/ui/LoadingPanel.svelte';
	// EditorTour is tour-trigger-only (first-visit + help button). Lazy.
	import type EditorTourType from '$lib/ui/EditorTour.svelte';
	// First decomposition target from the 4219-line editor +page.svelte —
	// the toolbar's glyph-identity block (char preview + name + status +
	// pin + flag toggles). Bounded, view-mostly, low-risk extraction.
	import EditorGlyphHeader from '$lib/editor/EditorGlyphHeader.svelte';
	import EditorToolGroup from '$lib/editor/EditorToolGroup.svelte';
	import BrushSizeSlider from '$lib/editor/BrushSizeSlider.svelte';
	import TemplatesAccordion from '$lib/editor/TemplatesAccordion.svelte';
	import NotesAccordion from '$lib/editor/NotesAccordion.svelte';
	import TagsAccordion from '$lib/editor/TagsAccordion.svelte';
	import UsedByAccordion from '$lib/editor/UsedByAccordion.svelte';
	import KerningAccordion from '$lib/editor/KerningAccordion.svelte';
	import DeriveAccordion from '$lib/editor/DeriveAccordion.svelte';
	import MakeAlternateAccordion from '$lib/editor/MakeAlternateAccordion.svelte';
	import LivePreviewAccordion from '$lib/editor/LivePreviewAccordion.svelte';
	import AuditAccordion from '$lib/editor/AuditAccordion.svelte';
	import BrushAccordion from '$lib/editor/BrushAccordion.svelte';
	import PathOpsAccordion from '$lib/editor/PathOpsAccordion.svelte';
	import ColorLayersPanel from '$lib/editor/ColorLayersPanel.svelte';
	import MetricsPanel from '$lib/editor/MetricsPanel.svelte';
	import StatusPanel from '$lib/editor/StatusPanel.svelte';
	import AnchorsPanel from '$lib/editor/AnchorsPanel.svelte';
	import GlyphPanel from '$lib/editor/GlyphPanel.svelte';
	import ShortcutsPanel from '$lib/editor/ShortcutsPanel.svelte';
	import EditorViewToggles from '$lib/editor/EditorViewToggles.svelte';
	import EditorActionBar from '$lib/editor/EditorActionBar.svelte';
	import VfLivePreviewStrip from '$lib/editor/VfLivePreviewStrip.svelte';
	import MastersStrip from '$lib/editor/MastersStrip.svelte';
	import MetricsStrip from '$lib/editor/MetricsStrip.svelte';
	import OnboardingHints from '$lib/editor/OnboardingHints.svelte';
	import CollapsedBottomBar from '$lib/editor/CollapsedBottomBar.svelte';
	import { createCanvasDropController } from '$lib/editor/canvas-drop.svelte';
	import {
		downloadGlyphPng,
		downloadGlyphSvg,
		glyphSvgPathString
	} from '$lib/editor/glyph-export';
	import { parseSvgPasteToGlyph } from '$lib/editor/glyph-paste';
	import { SAMPLE_WORDS } from '$lib/editor/sample-words';
	import {
		computePeerComparison,
		computeSpacingSuggestion,
		countDrawnGlyphs,
		findMissingControlGlyphs,
		computeSuggestedNext,
		isBriefEmpty,
		pickReferenceGlyph,
		pickOnionNeighbours,
		computeGlyphStats,
		computeAglfnSuggestion,
		computeCurrentGlyphIssues,
		computeAllProjectTags,
		pickFamilyReferenceGlyph,
		pickPinnedSnapshotGhost,
		computeUsedByGlyphs,
		computeInvolvedKerning,
		computeCopyableMetricSources
	} from '$lib/editor/glyph-deriveds';
	import { fixAuditIssue } from '$lib/editor/fix-issue';
	import { createEditorKeyHandler } from '$lib/editor/keybindings';
	import {
		snapPointsToGrid,
		flipContours,
		scaleContours,
		alignContoursVertically,
		centerContoursHorizontally,
		autoSpaceContours,
		runAutoClean
	} from '$lib/editor/path-edit-transforms';
	// 5 right-sidebar panels — together ~42 KB of source, expanded ~50-60
	// KB bundled. None of them are needed for first paint of the canvas;
	// they hydrate on idle ~200ms after the editor is interactive. The
	// short pop-in is invisible at editor-load speeds and well worth
	// shrinking the cold-load critical path.
	import type CompositeEditorType from '$lib/glyph/CompositeEditor.svelte';
	import type ReferenceImagePanelType from '$lib/glyph/ReferenceImagePanel.svelte';
	import type RevisionsPanelType from '$lib/glyph/RevisionsPanel.svelte';
	import type StemsPanelType from '$lib/glyph/StemsPanel.svelte';
	import type MetricsInspectorType from '$lib/glyph/MetricsInspector.svelte';
	import { tipFor } from '$lib/font/anatomy-tips';
	import { settings } from '$lib/stores/settings.svelte';
	import { copyGlyphToClipboard, readGlyphFromClipboard } from '$lib/stores/clipboard.svelte';
	import { toast } from '$lib/stores/toast.svelte';

	let tool = $state<'pencil' | 'eraser' | 'edit'>('pencil');
	let strokeSize = $state(DEFAULT_STROKE.size);
	let strokeThinning = $state(DEFAULT_STROKE.thinning);
	let smoothness = $state(1);
	let cubicTrace = $state(DEFAULT_TRACE.cubic);
	let cubicMaxError = $state(DEFAULT_TRACE.cubicMaxError);
	let tourOpen = $state(false);
	let EditorTourLazy = $state<typeof EditorTourType | null>(null);
	$effect(() => {
		if (tourOpen && !EditorTourLazy) {
			import('$lib/ui/EditorTour.svelte').then((m) => {
				EditorTourLazy = m.default;
			});
		}
	});

	// Hydrate the 5 right-sidebar panels on idle. Batched into one
	// Promise.all so all 5 chunks fetch in parallel ~200ms after the
	// canvas renders, then mount together via reactive state updates.
	let CompositeEditorLazy = $state<typeof CompositeEditorType | null>(null);
	let ReferenceImagePanelLazy = $state<typeof ReferenceImagePanelType | null>(null);
	let RevisionsPanelLazy = $state<typeof RevisionsPanelType | null>(null);
	let StemsPanelLazy = $state<typeof StemsPanelType | null>(null);
	let MetricsInspectorLazy = $state<typeof MetricsInspectorType | null>(null);
	$effect(() => {
		if (CompositeEditorLazy) return;
		const load = async () => {
			const [composite, ref, rev, stems, metrics] = await Promise.all([
				import('$lib/glyph/CompositeEditor.svelte'),
				import('$lib/glyph/ReferenceImagePanel.svelte'),
				import('$lib/glyph/RevisionsPanel.svelte'),
				import('$lib/glyph/StemsPanel.svelte'),
				import('$lib/glyph/MetricsInspector.svelte')
			]);
			CompositeEditorLazy = composite.default;
			ReferenceImagePanelLazy = ref.default;
			RevisionsPanelLazy = rev.default;
			StemsPanelLazy = stems.default;
			MetricsInspectorLazy = metrics.default;
		};
		if (typeof requestIdleCallback !== 'undefined') {
			requestIdleCallback(load, { timeout: 1500 });
		} else {
			setTimeout(load, 250);
		}
	});

	let skipEmptyNav = $state(settings.editor.skipEmptyNav);
	let showAnatomy = $state(settings.editor.showAnatomy);

	// Hoist `glyph` + `metrics` derivations above any other $derived/$effect
	// that closes over them. Previously sat ~60 lines down, which put them in
	// TDZ when Svelte 5 eagerly evaluated the dependent deriveds at component
	// init — that crash silently aborted /edit's mount, so clicking the Edit
	// tab from elsewhere appeared to "do nothing".
	const glyph = $derived(projectStore.selectedGlyph);
	const metrics = $derived(projectStore.project?.metrics);

	const canvasDrop = createCanvasDropController(() => ({
		glyph: glyph ?? null,
		metrics: metrics ?? null
	}));


	// Tour is now strictly user-invoked via the "?" button in the toolbar.
	// The auto-open used to fire 600ms after first edit-page mount, but the
	// tooltip's z-50 pointer-events-auto layer could overlap interactive
	// elements (most notably the tab nav) and silently eat their clicks —
	// leading to confusing "tabs don't work" / "stuck in glyph" reports.
	let showSketch = $state(true);
	let showVector = $state(true);
	let showGrid = $state(settings.editor.showGrid);
	let showReference = $state(settings.editor.showReference);
	let showOnion = $state(settings.editor.showOnion);
	let showAnchors = $state(settings.editor.showAnchors);
	let showFamilyRegular = $state(false);
	let familyRegularProject = $state<import('$lib/font/types').Project | null>(null);
	$effect(() => {
		const fid = projectStore.project?.familyId;
		const ownId = projectStore.project?.id;
		if (!fid) {
			familyRegularProject = null;
			return;
		}
		(async () => {
			const { findRegularSibling } = await import('$lib/font/family');
			const { loadProject: lp } = await import('$lib/font/project');
			const reg = await findRegularSibling(fid);
			// Don't self-reference if this IS the Regular.
			if (!reg || reg.id === ownId) {
				familyRegularProject = null;
				return;
			}
			familyRegularProject = await lp(reg.id);
		})();
	});
	const familyReferenceGlyph = $derived(
		showFamilyRegular
			? pickFamilyReferenceGlyph(glyph ?? null, familyRegularProject)
			: null
	);
	const pinnedSnapshotGhost = $derived(pickPinnedSnapshotGhost(glyph ?? null));
	const currentGlyphIssues = $derived(
		computeCurrentGlyphIssues(glyph ?? null, projectStore.project ?? null)
	);
	const existingProjectTags = $derived(
		computeAllProjectTags(projectStore.project ?? null)
	);
	const aglfnSuggestion = $derived(computeAglfnSuggestion(glyph ?? null));

	// Persist editor toggles. Single $effect with explicit untrack on the
	// write side so the loop never bounces back through the store's $state.
	$effect(() => {
		const snap = { skipEmptyNav, showAnatomy, showGrid, showReference, showOnion, showAnchors };
		untrack(() => settings.updateEditorPrefs(snap));
	});
	let snapToMetrics = $state(true);
	let zoomPercent = $state(100);
	let resetSignal = $state(0);
	let metricsText = $state('Hamburgevons');
	let metricsSize = $state(96);

	// Bottom bar (metrics preview + action row) collapse — persist across
	// sessions in localStorage. Collapsing claws back ~170px of canvas height.
	const BOTTOM_BAR_KEY = 'font-studio:editor-bottom-bar-collapsed';
	let bottomBarCollapsed = $state(false);
	$effect(() => {
		if (typeof localStorage === 'undefined') return;
		try {
			bottomBarCollapsed = localStorage.getItem(BOTTOM_BAR_KEY) === '1';
		} catch {
			/* ignore */
		}
	});
	const toggleBottomBar = () => {
		bottomBarCollapsed = !bottomBarCollapsed;
		try {
			localStorage.setItem(BOTTOM_BAR_KEY, bottomBarCollapsed ? '1' : '0');
		} catch {
			/* ignore */
		}
	};

	const strokeStyle = $derived({
		...DEFAULT_STROKE,
		size: strokeSize,
		thinning: strokeThinning
	});


	let vfPreviewOpen = $state(false);
	let vfAxisValues = $state<Record<string, number>>({});

	$effect(() => {
		const axes = projectStore.project?.axes;
		if (!axes) return;
		const projectTags = new Set(axes.map((a) => a.tag));
		// Reads of vfAxisValues are wrapped in untrack() so the effect re-runs
		// only when the axis SET changes — not when we write back to vfAxisValues
		// ourselves. Removes the reliance on the early-return guard to break the
		// cycle (same pattern as compare/+page.svelte, see commit bc7399d).
		untrack(() => {
			const existingTags = new Set(Object.keys(vfAxisValues));
			let needsUpdate = false;
			for (const a of axes) if (!existingTags.has(a.tag)) needsUpdate = true;
			for (const k of existingTags) if (!projectTags.has(k)) needsUpdate = true;
			if (!needsUpdate) return;
			const next: Record<string, number> = {};
			for (const a of axes) {
				next[a.tag] = vfAxisValues[a.tag] ?? a.default;
			}
			vfAxisValues = next;
		});
	});

	const hasMastersForGlyph = $derived(
		(projectStore.project?.masters?.length ?? 0) > 0 &&
			(projectStore.project?.axes?.length ?? 0) > 0
	);

	const interpolatedContours = $derived.by(() => {
		if (!vfPreviewOpen || !glyph || !projectStore.project || !hasMastersForGlyph) return null;
		const defaultGlyph = projectStore.project.glyphs[glyph.codepoint];
		if (!defaultGlyph || defaultGlyph.contours.length === 0) return null;
		const masters = projectStore.project.masters ?? [];
		const masterVariants = masters
			.map((m) => ({
				id: m.id,
				location: m.location,
				glyph: m.glyphs[glyph.codepoint]
			}))
			.filter((m) => m.glyph && m.glyph.contours.length > 0);
		if (masterVariants.length === 0) return null;
		const defaultLocation: Record<string, number> = {};
		for (const a of projectStore.project.axes ?? []) defaultLocation[a.tag] = a.default;
		const weights = computeMasterWeights(
			vfAxisValues,
			defaultLocation,
			masterVariants.map((m) => ({ id: m.id, location: m.location }))
		);
		const samples = weights.map((w) => ({
			glyph: w.id ? masterVariants.find((m) => m.id === w.id)!.glyph! : defaultGlyph,
			weight: w.weight
		}));
		return interpolateGlyph(samples);
	});

	const mastersStripGlyphs = $derived.by(() => {
		if (!projectStore.project || !glyph) return [];
		const masters = projectStore.project.masters ?? [];
		if (masters.length === 0) return [];
		const defaultGlyph = projectStore.project.glyphs[glyph.codepoint];
		const baseSignature = defaultGlyph?.contours.length
			? defaultGlyph.contours.map((c) => c.commands.length).join('/')
			: null;
		const out: Array<{
			id: string | undefined;
			name: string;
			glyph: Glyph | undefined;
			compatible: boolean;
		}> = [{ id: undefined, name: 'Default', glyph: defaultGlyph, compatible: true }];
		for (const m of masters) {
			const g = m.glyphs[glyph.codepoint];
			let compatible = true;
			if (baseSignature && g && g.contours.length > 0) {
				const sig = g.contours.map((c) => c.commands.length).join('/');
				compatible = sig === baseSignature;
			}
			out.push({ id: m.id, name: m.name, glyph: g, compatible });
		}
		return out;
	});

	const usedByGlyphs = $derived(
		computeUsedByGlyphs(glyph ?? null, projectStore.project ?? null)
	);

	// Per-glyph sample words for the bottom-bar metrics input. Designers
	// click "Sample" to fill with a word that exercises the current glyph
	// in real context — kerning pairs, joins, ascender/descender behaviour.
	// Multiple samples per glyph so repeat clicks cycle through variety.
	let sampleIndex = $state(0);
	// Build a sample string from the current glyph's actual kerning pairs.
	// Returns null when no pairs involve this glyph as a codepoint pair —
	// class-based pairs are excluded since their members are spread across
	// many glyphs and a sample string from them isn't necessarily relevant.
	const kerningSample = (): string | null => {
		const p = projectStore.project;
		if (!p || !glyph) return null;
		const cp = glyph.codepoint;
		const others: string[] = [];
		for (const pair of p.kerning) {
			if (typeof pair.left === 'number' && typeof pair.right === 'number') {
				if (pair.left === cp && pair.right > 0x20 && pair.right < 0x10000) {
					others.push(String.fromCodePoint(pair.right));
				} else if (pair.right === cp && pair.left > 0x20 && pair.left < 0x10000) {
					others.push(String.fromCodePoint(pair.left));
				}
			}
		}
		if (others.length === 0) return null;
		const ch = String.fromCodePoint(cp);
		// Render pair-context bigrams: V → "Va Vo Ve" / "aV oV eV" mixed.
		// Up to 6 pairs to keep the preview from overflowing the bottom bar.
		return others
			.slice(0, 6)
			.map((o) => {
				// Show which side this glyph is on — if pair.left was cp,
				// glyph goes first; if cp was pair.right, glyph goes second.
				return `${ch}${o}`;
			})
			.join(' ');
	};

	// Helper: is every letter in a word actually drawn? Used by smartSample
	// to skip suggestions that would show notdef boxes for missing glyphs.
	const wordHasAllDrawn = (word: string): boolean => {
		const p = projectStore.project;
		if (!p) return false;
		for (const ch of word) {
			const cpp = ch.codePointAt(0) ?? 0;
			if (cpp <= 0x20) continue; // skip spaces / control
			const g = p.glyphs[cpp];
			if (!g || g.contours.length === 0) return false;
		}
		return true;
	};

	const smartSample = () => {
		if (!glyph) return;
		const cp = glyph.codepoint;
		// First click prefers a pair-exercising sample when the current
		// glyph has codepoint-based kerning pairs. Subsequent clicks cycle
		// back into the curated word list so designers can still see
		// regular-text samples by clicking again.
		if (sampleIndex === 0) {
			const ks = kerningSample();
			if (ks) {
				metricsText = ks;
				sampleIndex++;
				return;
			}
		}
		if (cp <= 0x20 || cp > 0x7e) return;
		const ch = String.fromCodePoint(cp);
		const words = SAMPLE_WORDS[ch];
		if (!words || words.length === 0) {
			// Digits / punctuation fallback: build a short context string.
			if (cp >= 0x30 && cp <= 0x39) {
				metricsText = `${ch}${ch}${ch} 1029384756`;
			} else {
				metricsText = `Aa ${ch} Bb`;
			}
			return;
		}
		// Prefer words whose letters are all drawn — avoids surfacing
		// notdef boxes in the preview when the project is still in the
		// 12-glyphs-drawn stage.
		const drawnOnly = words.filter(wordHasAllDrawn);
		const pool = drawnOnly.length > 0 ? drawnOnly : words;
		metricsText = pool[sampleIndex % pool.length];
		sampleIndex++;
	};

	// Reset the sample cycle when the active glyph changes — so the first
	// click on a freshly-selected glyph always picks the kerning sample
	// (if applicable), not a stale word from the previous glyph's cycle.
	$effect(() => {
		void glyph?.codepoint;
		untrack(() => (sampleIndex = 0));
	});

	// Kerning pairs that involve the current glyph — either directly via
	// codepoint or via membership in a kerning class. Useful inline so the
	// designer knows whether spacing edits ripple into pairs, without
	// jumping to the spacing page.
	const involvedKerning = $derived(
		computeInvolvedKerning(glyph ?? null, projectStore.project ?? null)
	);

	const spacingSuggestion = $derived(
		glyph && projectStore.project
			? computeSpacingSuggestion(glyph, projectStore.project)
			: null
	);

	const applySpacingSuggestion = () => {
		if (!glyph || !spacingSuggestion) return;
		projectStore.updateGlyph(glyph.codepoint, (g) => ({
			...g,
			leftSidebearing: spacingSuggestion.lsb,
			rightSidebearing: spacingSuggestion.rsb
		}));
	};

	const copyableMetricSources = $derived(
		computeCopyableMetricSources(glyph ?? null, projectStore.project ?? null)
	);

	const copyMetricsFrom = (codepoint: number) => {
		if (!projectStore.project || !glyph || !codepoint) return;
		const src = projectStore.project.glyphs[codepoint];
		if (!src) return;
		projectStore.updateGlyph(glyph.codepoint, (g) => ({
			...g,
			advanceWidth: src.advanceWidth,
			leftSidebearing: src.leftSidebearing,
			rightSidebearing: src.rightSidebearing
		}));
	};

	const glyphStats = $derived(computeGlyphStats(glyph ?? null));

	const anatomyTip = $derived(glyph ? tipFor(glyph.codepoint) : null);

	const peerComparison = $derived(
		glyph && projectStore.project
			? computePeerComparison(glyph, projectStore.project)
			: null
	);

	const totalDrawn = $derived(countDrawnGlyphs(projectStore.project ?? null));
	const controlMissing = $derived(
		findMissingControlGlyphs(projectStore.project ?? null)
	);
	const showControlHint = $derived(totalDrawn < 13 && controlMissing.length > 0);

	const suggestedNext = $derived(computeSuggestedNext(projectStore.project ?? null));
	const showSuggestedNext = $derived(
		totalDrawn >= 1 && suggestedNext.length > 0 && totalDrawn < 50
	);
	const briefIsEmpty = $derived(isBriefEmpty(projectStore.project ?? null));
	const showBriefFirstHint = $derived(totalDrawn === 0 && briefIsEmpty);

	const referenceGlyph = $derived(
		showReference && glyph && projectStore.project
			? pickReferenceGlyph(glyph, projectStore.project)
			: null
	);

	const onionGlyphs = $derived(
		showOnion && glyph && projectStore.project
			? pickOnionNeighbours(glyph, projectStore.project)
			: { prev: null, next: null }
	);

	const charLabel = $derived(
		glyph
			? glyph.codepoint > 0x20 && glyph.codepoint < 0x10000
				? String.fromCodePoint(glyph.codepoint)
				: glyph.codepoint === 0x20
					? 'space'
					: glyph.name
			: ''
	);

	const trace = () => {
		if (!glyph || !glyph.sketch || glyph.sketch.length === 0) return;
		const raw = sketchToContours(glyph.sketch, strokeStyle, {
			cubic: cubicTrace,
			cubicMaxError
		});
		// Chaikin smoothing only applies to polyline (non-cubic) output;
		// Schneider-fitted curves are already smooth.
		const contours = cubicTrace ? raw : chaikinSmooth(raw, smoothness);
		const bounds = glyphBounds(contours);
		const advance =
			contours.length > 0
				? Math.max(
						Math.round(bounds.maxX + glyph.rightSidebearing),
						glyph.leftSidebearing + glyph.rightSidebearing + 50
					)
				: glyph.advanceWidth;
		projectStore.updateGlyph(glyph.codepoint, (g) => ({
			...g,
			contours,
			status: contours.length > 0 ? 'draft' : g.status,
			advanceWidth: advance
		}));
		if (contours.length > 0) tool = 'edit';
	};

	const handleContoursChange = (contours: BezierContour[]) => {
		if (!glyph) return;
		const cp = glyph.codepoint;
		projectStore.updateGlyph(cp, (g) => ({
			...g,
			contours,
			status: contours.length > 0 ? 'draft' : g.sketch && g.sketch.length > 0 ? 'sketch' : 'empty'
		}));
	};

	const handleAnchorsChange = (anchors: Anchor[]) => {
		if (!glyph) return;
		projectStore.updateGlyph(glyph.codepoint, (g) => ({ ...g, anchors }));
	};

	/**
	 * One-click fixes for fixable audit issues. Maps each issue's
	 * code to the right cleanup operation:
	 *
	 * - self-intersecting → boolean union (polygon-clipping resolves
	 *   self-crosses as a side effect of running any boolean op).
	 * - duplicate-points → walk commands, drop any L/M command within
	 *   0.5fu of the previous on-curve point.
	 * - near-collinear-points → drop any L-command whose middle point
	 *   is within 1fu of the line between its neighbours.
	 */
	const fixIssue = (code: string) => {
		if (!glyph) return;
		fixAuditIssue(glyph, code, handleContoursChange);
	};

	type DeriveTransform = 'copy' | 'flipH' | 'flipV' | 'rotate180';
	let deriveSourceCp = $state<number | null>(null);
	let deriveTransform = $state<DeriveTransform>('flipH');

	const drawnSources = $derived.by(() => {
		if (!projectStore.project || !glyph) return [];
		return Object.values(projectStore.project.glyphs)
			.filter((g) => g.codepoint !== glyph.codepoint && g.contours.length > 0)
			.sort((a, b) => a.codepoint - b.codepoint);
	});

	type Template = 'rect' | 'circle' | 'stem' | 'crossbar';
	const insertTemplate = (kind: Template) => {
		if (!glyph || !metrics) return;
		const top = metrics.capHeight;
		const advance = glyph.advanceWidth;
		const sb = glyph.leftSidebearing;
		const right = advance - glyph.rightSidebearing;
		const width = right - sb;
		const cx = (sb + right) / 2;
		const cy = top / 2;
		const r = Math.min(width, top) / 2;

		let commands: BezierContour['commands'] = [];
		let winding: BezierContour['winding'] = 'cw';
		if (kind === 'rect') {
			commands = [
				{ type: 'M', x: sb, y: 0 },
				{ type: 'L', x: right, y: 0 },
				{ type: 'L', x: right, y: top },
				{ type: 'L', x: sb, y: top },
				{ type: 'Z' }
			];
		} else if (kind === 'stem') {
			const sw = Math.max(60, Math.round(metrics.unitsPerEm * 0.08));
			const x0 = cx - sw / 2;
			const x1 = cx + sw / 2;
			commands = [
				{ type: 'M', x: x0, y: 0 },
				{ type: 'L', x: x1, y: 0 },
				{ type: 'L', x: x1, y: top },
				{ type: 'L', x: x0, y: top },
				{ type: 'Z' }
			];
		} else if (kind === 'crossbar') {
			const sw = Math.max(60, Math.round(metrics.unitsPerEm * 0.08));
			const y0 = metrics.xHeight / 2 - sw / 2;
			const y1 = metrics.xHeight / 2 + sw / 2;
			commands = [
				{ type: 'M', x: sb, y: y0 },
				{ type: 'L', x: right, y: y0 },
				{ type: 'L', x: right, y: y1 },
				{ type: 'L', x: sb, y: y1 },
				{ type: 'Z' }
			];
		} else if (kind === 'circle') {
			// Cubic bezier approximation of a circle (4 arcs)
			const k = 0.5522847498;
			const ox = r * k;
			const oy = r * k;
			commands = [
				{ type: 'M', x: cx, y: cy + r },
				{ type: 'C', x1: cx - ox, y1: cy + r, x2: cx - r, y2: cy + oy, x: cx - r, y: cy },
				{ type: 'C', x1: cx - r, y1: cy - oy, x2: cx - ox, y2: cy - r, x: cx, y: cy - r },
				{ type: 'C', x1: cx + ox, y1: cy - r, x2: cx + r, y2: cy - oy, x: cx + r, y: cy },
				{ type: 'C', x1: cx + r, y1: cy + oy, x2: cx + ox, y2: cy + r, x: cx, y: cy + r },
				{ type: 'Z' }
			];
			winding = 'ccw';
		}
		const next: BezierContour = { commands, closed: true, winding };
		projectStore.updateGlyph(glyph.codepoint, (g) => ({
			...g,
			contours: [...g.contours, next],
			status: 'draft'
		}));
	};

	const applyDerive = () => {
		if (!glyph || !projectStore.project || deriveSourceCp == null) return;
		const src = projectStore.project.glyphs[deriveSourceCp];
		if (!src || src.contours.length === 0) return;
		const bounds = glyphBounds(src.contours);
		const cx = (bounds.minX + bounds.maxX) / 2;
		const cy = (bounds.minY + bounds.maxY) / 2;
		let m: AffineMatrix;
		switch (deriveTransform) {
			case 'flipH':
				m = { a: -1, b: 0, c: 0, d: 1, tx: 2 * cx, ty: 0 };
				break;
			case 'flipV':
				m = { a: 1, b: 0, c: 0, d: -1, tx: 0, ty: 2 * cy };
				break;
			case 'rotate180':
				m = { a: -1, b: 0, c: 0, d: -1, tx: 2 * cx, ty: 2 * cy };
				break;
			case 'copy':
			default:
				m = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
		}
		const refs = src.contours.flatMap((c, ci) =>
			c.commands
				.map((cmd, i) =>
					cmd.type === 'M' || cmd.type === 'L' || cmd.type === 'Q' || cmd.type === 'C'
						? { contour: ci, index: i }
						: null
				)
				.filter((r): r is { contour: number; index: number } => r !== null)
		);
		const next = transformPoints(
			JSON.parse(JSON.stringify(src.contours)) as BezierContour[],
			refs,
			m
		);
		projectStore.updateGlyph(glyph.codepoint, (g) => ({
			...g,
			contours: next,
			advanceWidth: src.advanceWidth,
			leftSidebearing: src.leftSidebearing,
			rightSidebearing: src.rightSidebearing,
			status: 'draft'
		}));
		deriveSourceCp = null;
	};

	// On-canvas drag of a gradient handle. Linear: move start/end.
	// Radial: start handle moves the centre, end handle changes the
	// radius. Sweep: start moves centre, end rotates the whole arc
	// while preserving the angular span. Inlined from the canvas
	// markup so the JSX-equivalent stays scannable.
	const onGradientEndpointDrag = (
		layerId: string,
		endpoint: 'start' | 'end',
		coord: { x: number; y: number }
	) => {
		if (!glyph) return;
		projectStore.updateColorLayer(glyph.codepoint, layerId, (layer: ColorLayer) => {
			const g = layer.gradient;
			if (!g) return layer;
			if (g.type === 'linear') {
				return { ...layer, gradient: { ...g, [endpoint]: coord } };
			}
			if (g.type === 'radial') {
				if (endpoint === 'start') {
					return { ...layer, gradient: { ...g, center: coord } };
				}
				const dx = coord.x - g.center.x;
				const dy = coord.y - g.center.y;
				const radius = Math.max(1, Math.round(Math.hypot(dx, dy)));
				return { ...layer, gradient: { ...g, radius } };
			}
			if (endpoint === 'start') {
				return { ...layer, gradient: { ...g, center: coord } };
			}
			const dx = coord.x - g.center.x;
			const dy = coord.y - g.center.y;
			const span = g.endAngle - g.startAngle;
			const newStart = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
			return {
				...layer,
				gradient: { ...g, startAngle: newStart, endAngle: newStart + span }
			};
		});
	};

	// Make alternate — duplicates the current glyph to a new PUA codepoint
	// with a `.ss01` / `.smcp` / `.salt` name suffix. The naming convention
	// auto-detects as the corresponding OpenType feature at export.
	let alternateSuffix = $state<'ss01' | 'smcp' | 'salt' | 'alt'>('ss01');
	const makeAlternate = () => {
		if (!glyph || !projectStore.project) return;
		// Find a free PUA codepoint. Start at U+E001 (skip 0xE000 reserved-ish)
		// and walk forward until we find an empty slot.
		let cp = 0xe001;
		while (projectStore.project.glyphs[cp]) cp++;
		// Build the name: prefer aglfn(originalCp) + '.suffix', fall back to
		// the glyph's existing name.
		const baseName = aglfnName(glyph.codepoint) || glyph.name;
		const altName = `${baseName}.${alternateSuffix}`;
		// Create the new glyph as a copy of the current one.
		projectStore.addCustomGlyph(cp, altName);
		projectStore.updateGlyph(cp, (g) => ({
			...g,
			contours: JSON.parse(JSON.stringify(glyph.contours)),
			advanceWidth: glyph.advanceWidth,
			leftSidebearing: glyph.leftSidebearing,
			rightSidebearing: glyph.rightSidebearing,
			anchors: glyph.anchors ? JSON.parse(JSON.stringify(glyph.anchors)) : undefined,
			status: 'draft',
			notes: `Alternate (.${alternateSuffix}) of ${baseName}. Substitution auto-emitted by feature-detect at export.`
		}));
		projectStore.selectGlyph(cp);
		toast.success(
			`Created "${altName}" at U+${cp.toString(16).toUpperCase().padStart(4, '0')}`
		);
	};

	const addAnchor = (name: string) => {
		if (!glyph || !metrics) return;
		const trimmed = name.trim();
		if (!trimmed) return;
		const existing = glyph.anchors ?? [];
		if (existing.some((a) => a.name === trimmed)) return;
		const cx = Math.round(glyph.advanceWidth / 2);
		const isMark = glyph.codepoint >= 0x0300 && glyph.codepoint <= 0x036f;
		const isUpper = glyph.codepoint >= 0x0041 && glyph.codepoint <= 0x005a;
		const defaultY = trimmed.includes('bottom')
			? 0
			: isMark
				? 0
				: isUpper
					? metrics.capHeight
					: metrics.xHeight;
		projectStore.updateGlyph(glyph.codepoint, (g) => ({
			...g,
			anchors: [...(g.anchors ?? []), { name: trimmed, x: cx, y: defaultY }]
		}));
	};

	const removeAnchor = (anchorName: string) => {
		if (!glyph) return;
		projectStore.updateGlyph(glyph.codepoint, (g) => ({
			...g,
			anchors: (g.anchors ?? []).filter((a) => a.name !== anchorName)
		}));
	};

	const copyGlyph = async () => {
		if (!glyph) return;
		await copyGlyphToClipboard(glyph);
		toast.success(`Copied "${glyph.name}" to clipboard`);
	};

	const pasteGlyph = async () => {
		if (!glyph || !metrics) return;
		const payload = await readGlyphFromClipboard();
		if (payload) {
			projectStore.updateGlyph(glyph.codepoint, (g) => ({
				...g,
				contours: payload.contours,
				advanceWidth: payload.advanceWidth,
				leftSidebearing: payload.leftSidebearing,
				rightSidebearing: payload.rightSidebearing,
				anchors: payload.anchors ?? g.anchors,
				components: payload.components ?? g.components,
				status: payload.contours.length > 0 ? 'draft' : g.status
			}));
			toast.success(
				`Pasted ${payload.contours.length} contour${payload.contours.length === 1 ? '' : 's'}`
			);
			return;
		}
		try {
			const text = await navigator.clipboard.readText();
			const patch = await parseSvgPasteToGlyph(text, {
				ascender: metrics.ascender,
				descender: metrics.descender,
				defaultSidebearing:
					projectStore.project?.metrics.defaultSidebearing ?? 60
			});
			if (!patch) {
				toast.warn('Clipboard does not contain a Patens glyph or SVG path.');
				return;
			}
			projectStore.updateGlyph(glyph.codepoint, (g) => ({
				...g,
				contours: patch.contours,
				advanceWidth: patch.advanceWidth,
				status: patch.contours.length > 0 ? 'draft' : g.status
			}));
			toast.success(
				`Imported ${patch.contours.length} contour${patch.contours.length === 1 ? '' : 's'} from SVG path`
			);
		} catch {
			toast.warn('Clipboard does not contain a Patens glyph or SVG path.');
		}
	};

	const applyPathOp = (op: PathOp) => {
		if (!glyph || glyph.contours.length < 2) return;
		const next = booleanContours(glyph.contours, op);
		if (next.length === 0) return;
		projectStore.updateGlyph(glyph.codepoint, (g) => ({ ...g, contours: next }));
	};

	const reverseAllContours = () => {
		if (!glyph || glyph.contours.length === 0) return;
		import('$lib/font/path').then(({ reverseContour }) => {
			projectStore.updateGlyph(glyph!.codepoint, (g) => ({
				...g,
				contours: g.contours.map((c) => ({
					...c,
					commands: reverseContour(c.commands),
					winding: c.winding === 'cw' ? 'ccw' : 'cw'
				}))
			}));
		});
	};

	const snapAllPointsToGrid = (step = 10) => {
		if (!glyph || glyph.contours.length === 0) return;
		const next = snapPointsToGrid(glyph.contours, step);
		projectStore.updateGlyph(glyph.codepoint, (g) => ({ ...g, contours: next }));
	};

	let autoCleaning = $state(false);
	const autoCleanGlyph = async () => {
		if (!glyph || glyph.contours.length === 0 || autoCleaning) return;
		autoCleaning = true;
		try {
			const latest = glyph.revisions?.[glyph.revisions.length - 1];
			const recent = latest
				? Date.now() - new Date(latest.takenAt).getTime() < 30_000
				: false;
			if (!recent) projectStore.saveRevision(glyph.codepoint, 'pre-auto-clean');
			const next = await runAutoClean(glyph.contours);
			if (!next) {
				toast.warn('Simplify returned empty geometry; nothing changed.');
				return;
			}
			projectStore.updateGlyph(glyph.codepoint, (g) => ({ ...g, contours: next }));
			toast.success('Auto-clean: simplified + snapped to 10u grid');
		} finally {
			autoCleaning = false;
		}
	};

	let simplifying = $state(false);
	const applySimplify = async () => {
		if (!glyph || glyph.contours.length === 0 || simplifying) return;
		simplifying = true;
		try {
			const next = await simplifyContours(glyph.contours);
			if (next.length > 0) {
				projectStore.updateGlyph(glyph.codepoint, (g) => ({ ...g, contours: next }));
			}
		} finally {
			simplifying = false;
		}
	};

	const flipSelection = (axis: 'horizontal' | 'vertical') => {
		if (!glyph || glyph.contours.length === 0) return;
		const next = flipContours(glyph.contours, axis);
		projectStore.updateGlyph(glyph.codepoint, (g) => ({ ...g, contours: next }));
	};

	const makeSymmetric = () => {
		if (!glyph) return;
		const avg = Math.round((glyph.leftSidebearing + glyph.rightSidebearing) / 2);
		projectStore.updateGlyph(glyph.codepoint, (g) => ({
			...g,
			leftSidebearing: avg,
			rightSidebearing: avg
		}));
	};

	const alignVertically = (target: 'baseline' | 'capHeight' | 'xHeight') => {
		if (!glyph || glyph.contours.length === 0 || !metrics) return;
		const next = alignContoursVertically(glyph.contours, target, metrics);
		if (!next) return;
		projectStore.updateGlyph(glyph.codepoint, (g) => ({ ...g, contours: next }));
	};

	const centerHorizontally = () => {
		if (!glyph || glyph.contours.length === 0) return;
		const next = centerContoursHorizontally(glyph.contours, glyph.advanceWidth);
		if (!next) return;
		projectStore.updateGlyph(glyph.codepoint, (g) => ({ ...g, contours: next }));
	};

	const scaleGlyph = (factor: number) => {
		if (!glyph || glyph.contours.length === 0) return;
		const next = scaleContours(glyph.contours, factor);
		projectStore.updateGlyph(glyph.codepoint, (g) => ({ ...g, contours: next }));
	};

	const autoSpace = () => {
		if (!glyph || !projectStore.project || glyph.contours.length === 0) return;
		const patch = autoSpaceContours(
			glyph.contours,
			projectStore.project.metrics.defaultSidebearing
		);
		projectStore.updateGlyph(glyph.codepoint, (g) => ({ ...g, ...patch }));
	};

	const exportGlyphPng = async () => {
		if (!glyph || !metrics) return;
		const name = await downloadGlyphPng(glyph, metrics);
		if (name) toast.success(`Exported ${name}`);
	};

	const copyGlyphPath = async () => {
		if (!glyph) return;
		const d = glyphSvgPathString(glyph);
		if (!d) return;
		try {
			await navigator.clipboard.writeText(d);
			toast.success(`Copied SVG path for ${glyph.name}`);
		} catch {
			toast.error('Could not copy — try the keyboard shortcut Cmd+Shift+C.');
		}
	};

	const exportGlyphSvg = () => {
		if (!glyph || !metrics) return;
		downloadGlyphSvg(glyph, metrics);
	};

	const clearSketch = () => {
		if (!glyph) return;
		projectStore.updateGlyph(glyph.codepoint, (g) => ({
			...g,
			sketch: [],
			status: g.contours.length > 0 ? g.status : 'empty'
		}));
	};

	const clearVector = () => {
		if (!glyph) return;
		if (!confirm('Clear the vector outline for this glyph?')) return;
		projectStore.updateGlyph(glyph.codepoint, (g) => ({
			...g,
			contours: [],
			status: g.sketch && g.sketch.length > 0 ? 'sketch' : 'empty'
		}));
	};

	const handleSketchChange = (strokes: SketchStroke[]) => {
		if (!glyph) return;
		const cp = glyph.codepoint;
		projectStore.updateGlyph(cp, (g) => ({
			...g,
			sketch: strokes,
			status: strokes.length > 0 && g.contours.length === 0 ? 'sketch' : g.status
		}));
	};

	const undoLastStroke = () => {
		if (!glyph || !glyph.sketch || glyph.sketch.length === 0) return;
		projectStore.updateGlyph(glyph.codepoint, (g) => ({
			...g,
			sketch: g.sketch?.slice(0, -1)
		}));
	};

	const handleKeyDown = createEditorKeyHandler({
		getGlyph: () => glyph ?? null,
		getSkipEmptyNav: () => skipEmptyNav,
		getFamilyRegular: () => familyRegularProject,
		setTool: (t) => (tool = t),
		toggleSketch: () => (showSketch = !showSketch),
		toggleVector: () => (showVector = !showVector),
		toggleGrid: () => (showGrid = !showGrid),
		toggleReference: () => (showReference = !showReference),
		toggleFamilyRegular: () => (showFamilyRegular = !showFamilyRegular),
		toggleOnion: () => (showOnion = !showOnion),
		toggleAnchors: () => (showAnchors = !showAnchors),
		trace,
		copyGlyph,
		pasteGlyph
	});
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if !glyph || !metrics}
	<LoadingPanel label="Loading glyph" />
{:else}
	<div class="grid h-full grid-cols-[1fr_280px]">
		<!-- min-w-0 is load-bearing: grid items default to min-width:auto, so
		     without it the toolbar's nowrap min-content locks this 1fr track
		     wide and pushes the 280px properties sidebar fully offscreen at
		     laptop/iPad widths (1024-1440). -->
		<div class="flex min-h-0 min-w-0 flex-col">
			<!-- Top toolbar -->
			<div
				class="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-border bg-surface px-4 py-2"
			>
				<EditorGlyphHeader {glyph} />

				<div class="h-6 w-px bg-border"></div>

				<EditorToolGroup bind:tool hasContours={glyph.contours.length > 0} />

				<BrushSizeSlider bind:size={strokeSize} />

				<EditorViewToggles
					bind:skipEmptyNav
					bind:showReference
					bind:showFamilyRegular
					bind:showAnchors
					bind:showOnion
					bind:snapToMetrics
					bind:showSketch
					bind:showVector
					bind:showGrid
					bind:showAnatomy
					bind:vfPreviewOpen
					hasFamilyRegular={!!familyRegularProject}
					hasMasters={hasMastersForGlyph}
					{zoomPercent}
					onOpenTour={() => (tourOpen = true)}
					onFit={() => resetSignal++}
				/>
			</div>

			{#if projectStore.project}
				<OnboardingHints
					projectId={projectStore.project.id}
					briefUseCases={projectStore.project.brief?.useCases ?? []}
					showBriefHint={showBriefFirstHint}
					{showControlHint}
					{showSuggestedNext}
					{controlMissing}
					{suggestedNext}
				/>
			{/if}

			<!-- Canvas area -->
			<div
				class="relative min-h-0 flex-1 overflow-hidden bg-canvas p-6 {canvasDrop.active
					? 'ring-2 ring-accent ring-inset'
					: ''}"
				ondragenter={canvasDrop.onDragEnter}
				ondragleave={canvasDrop.onDragLeave}
				ondragover={canvasDrop.onDragOver}
				ondrop={canvasDrop.onDrop}
				role="application"
			>
				{#if canvasDrop.active}
					<div
						class="pointer-events-none absolute inset-6 z-10 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-accent bg-accent/10 backdrop-blur-[2px] text-[14px] font-medium text-accent-strong"
					>
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							class="size-8 animate-pulse"
							aria-hidden="true"
						>
							<path d="M12 16V4M12 4l-4 4M12 4l4 4" stroke-linecap="round" />
							<path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke-linecap="round" />
						</svg>
						<span>Drop image to use as tracing reference</span>
					</div>
				{/if}
				<div class="absolute inset-6 grid place-items-stretch">
					<DrawingCanvas
						{glyph}
						{metrics}
						{tool}
						{strokeStyle}
						{showSketch}
						{showVector}
						{showGrid}
						{showAnatomy}
						reference={referenceGlyph}
						familyReference={familyReferenceGlyph}
						snapshotGhost={pinnedSnapshotGhost}
						onionPrev={onionGlyphs.prev}
						onionNext={onionGlyphs.next}
						{snapToMetrics}
						{showAnchors}
						{resetSignal}
						onSketchChange={handleSketchChange}
						onContoursChange={handleContoursChange}
						onAnchorsChange={handleAnchorsChange}
						onZoomChange={(p) => (zoomPercent = p)}
						colorPalette={defaultPalette(projectStore.project?.palettes)}
						onGradientEndpointChange={onGradientEndpointDrag}
					/>
				</div>
			</div>

			{#if hasMastersForGlyph && vfPreviewOpen && interpolatedContours}
				<VfLivePreviewStrip
					advanceWidth={glyph.advanceWidth}
					{interpolatedContours}
					{metrics}
					bind:axisValues={vfAxisValues}
					onClose={() => (vfPreviewOpen = false)}
				/>
			{/if}

			{#if mastersStripGlyphs.length > 1}
				<MastersStrip items={mastersStripGlyphs} {metrics} />
			{/if}

			<!-- Bottom strips (live preview + action bar). Collapsible via the
			     chevron to claw back ~170px of canvas height when zoomed in.
			     State persists in localStorage. -->
			{#if bottomBarCollapsed}
				<CollapsedBottomBar onExpand={toggleBottomBar} />
			{:else}
				<MetricsStrip
					bind:text={metricsText}
					bind:size={metricsSize}
					onSample={smartSample}
					onCollapse={toggleBottomBar}
				/>

			<EditorActionBar
				{glyph}
				onTrace={trace}
				onUndoStroke={undoLastStroke}
				onAutoSpace={autoSpace}
				onCopy={copyGlyph}
				onPaste={pasteGlyph}
				onCopyPath={copyGlyphPath}
				onExportPng={exportGlyphPng}
				onExportSvg={exportGlyphSvg}
				onClearSketch={clearSketch}
				onClearVector={clearVector}
			/>
			{/if}
		</div>

		<!-- Right properties panel — block layout (no flex) with overflow-y
		     on the aside itself, so the 13 stacked section divs (Glyph /
		     Metrics / Status / Live preview / Audit / …) scroll naturally
		     instead of getting clipped past the viewport. -->
		<aside class="h-full overflow-y-auto border-l border-border bg-surface">
			<GlyphPanel
				{glyph}
				{aglfnSuggestion}
				{anatomyTip}
				{glyphStats}
				{peerComparison}
			/>

			<MetricsPanel
				{glyph}
				copyableSources={copyableMetricSources}
				{spacingSuggestion}
				onCopyMetricsFrom={copyMetricsFrom}
				onApplySpacingSuggestion={applySpacingSuggestion}
			/>

			<StatusPanel {glyph} />

			<AnchorsPanel {glyph} onAddAnchor={addAnchor} onRemoveAnchor={removeAnchor} />

			{#if ReferenceImagePanelLazy}
				<ReferenceImagePanelLazy />
			{/if}

			{#if glyph.contours.length === 0}
				<TemplatesAccordion oninsert={insertTemplate} />
			{/if}

			{#if glyph.contours.length === 0 && drawnSources.length > 0}
				<DeriveAccordion
					sources={drawnSources}
					bind:sourceCp={deriveSourceCp}
					bind:transform={deriveTransform}
					onapply={applyDerive}
				/>
				<MakeAlternateAccordion
					bind:suffix={alternateSuffix}
					hasContent={(glyph.components?.length ?? 0) > 0}
					onmake={makeAlternate}
				/>
			{/if}

			{#if CompositeEditorLazy}
				<CompositeEditorLazy />
			{/if}

			{#if MetricsInspectorLazy}
				<MetricsInspectorLazy />
			{/if}

			{#if RevisionsPanelLazy}
				<RevisionsPanelLazy />
			{/if}

			{#if StemsPanelLazy}
				<StemsPanelLazy />
			{/if}

			{#if usedByGlyphs.length > 0}
				<UsedByAccordion usedBy={usedByGlyphs} />
			{/if}

			{#if involvedKerning.asLeft + involvedKerning.asRight > 0}
				<KerningAccordion
					{glyph}
					asLeft={involvedKerning.asLeft}
					asRight={involvedKerning.asRight}
				/>
			{/if}

			<NotesAccordion {glyph} />

			<TagsAccordion {glyph} existingTags={existingProjectTags} />

			<PathOpsAccordion
				{glyph}
				{autoCleaning}
				{simplifying}
				onAutoClean={autoCleanGlyph}
				onPathOp={applyPathOp}
				onSimplify={applySimplify}
				onSnapGrid={snapAllPointsToGrid}
				onReverseWinding={reverseAllContours}
				onFlip={flipSelection}
				onScale={scaleGlyph}
				onMakeSymmetric={makeSymmetric}
				onCenterHorizontally={centerHorizontally}
				onAlignVertically={alignVertically}
			/>

			<LivePreviewAccordion {glyph} {charLabel} />

			{#if projectStore.project}
				<AuditAccordion
					issues={currentGlyphIssues}
					projectId={projectStore.project.id}
					onfix={fixIssue}
				/>
			{/if}

			<BrushAccordion
				bind:strokeSize
				bind:strokeThinning
				bind:cubicTrace
				bind:cubicMaxError
				bind:smoothness
			/>

			<ColorLayersPanel {glyph} />

			<ShortcutsPanel />
		</aside>
	</div>
	{#if EditorTourLazy}
		<EditorTourLazy open={tourOpen} onclose={() => (tourOpen = false)} />
	{/if}

{/if}
