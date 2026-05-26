<script lang="ts">
	import { untrack } from 'svelte';
	import { projectStore } from '$lib/stores/project.svelte';
	import DrawingCanvas from '$lib/drawing/DrawingCanvas.svelte';
	import { DEFAULT_STROKE, DEFAULT_TRACE, sketchToContours } from '$lib/font/sketch-to-bezier';
	import type { Anchor, BezierContour, ColorLayer, Glyph, SketchStroke } from '$lib/font/types';
	import { defaultPalette } from '$lib/font/color';
	import { glyphBounds, roundToFontUnits } from '$lib/font/path';
	import { interpolateGlyph, computeMasterWeights } from '$lib/font/interpolate';
	import {
		chaikinSmooth,
		booleanContours,
		transformPoints,
		simplifyContours,
		type AffineMatrix,
		type PathOp
	} from '$lib/font/path-edit';
	import { auditGlyph, auditCompatibility, sortBySeverity } from '$lib/font/audit';
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
	const familyReferenceGlyph = $derived.by(() => {
		if (!showFamilyRegular || !familyRegularProject || !glyph) return null;
		const same = familyRegularProject.glyphs[glyph.codepoint];
		return same && same.contours.length > 0 ? same : null;
	});

	// When any snapshot is pinned for the current glyph, render the most-recent
	// pinned one as a ghost overlay on the canvas. Turns "pin" from a passive
	// safe-keep marker into an active comparison tool: pin the version you
	// like, iterate, see the delta in real time.
	const pinnedSnapshotGhost = $derived.by(() => {
		const pins = glyph?.revisions?.filter((r) => r.pinned) ?? [];
		if (pins.length === 0) return null;
		// Newest pinned first — most recently chosen baseline wins.
		const newest = pins.reduce((a, b) => (a.takenAt > b.takenAt ? a : b));
		return newest.contours;
	});

	// Combined audit + compatibility issues for the current glyph. Lifted
	// from the template so the O(masters × glyphs × contours) compatibility
	// scan only re-runs when the project actually changes — not on every
	// accordion render.
	const currentGlyphIssues = $derived.by(() => {
		if (!glyph || !projectStore.project) return [];
		return sortBySeverity([
			...auditGlyph(glyph, projectStore.project),
			...auditCompatibility(projectStore.project).filter(
				(i) => i.codepoint === glyph.codepoint
			)
		]);
	});

	// Unique tag set across the whole project — drives the datalist on the
	// per-glyph Tags accordion so designers can autocomplete existing tags
	// instead of typing fresh ones from scratch every time.
	const existingProjectTags = $derived.by(() => {
		const p = projectStore.project;
		if (!p) return [] as string[];
		const set = new Set<string>();
		for (const g of Object.values(p.glyphs)) {
			for (const t of g.tags ?? []) set.add(t);
		}
		return [...set].sort();
	});

	// AGLFN name suggestion. Returns the canonical Adobe Glyph List for
	// New Fonts name for the current codepoint when (a) one exists, (b) it
	// differs from the current name, and (c) it's a valid PostScript
	// glyph name. Null otherwise — no suggestion to surface.
	const aglfnSuggestion = $derived.by(() => {
		if (!glyph) return null;
		const aglfn = aglfnName(glyph.codepoint);
		if (!aglfn || aglfn === glyph.name) return null;
		if (!/^[A-Za-z._][A-Za-z0-9._-]{0,62}$/.test(aglfn)) return null;
		return aglfn;
	});

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

	const countPathPoints = (commands: BezierContour['commands']) =>
		commands.filter((c) => c.type === 'M' || c.type === 'L' || c.type === 'C' || c.type === 'Q')
			.length;

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

	const usedByGlyphs = $derived.by(() => {
		if (!projectStore.project || !glyph) return [];
		return Object.values(projectStore.project.glyphs).filter((g) =>
			(g.components ?? []).some((c) => c.baseCodepoint === glyph.codepoint)
		);
	});

	// Per-glyph sample words for the bottom-bar metrics input. Designers
	// click "Sample" to fill with a word that exercises the current glyph
	// in real context — kerning pairs, joins, ascender/descender behaviour.
	// Multiple samples per glyph so repeat clicks cycle through variety.
	const SAMPLE_WORDS: Record<string, string[]> = {
		A: ['HAMBURGEVONS', 'Avocado', 'AVALANCHE', 'Allegro'],
		a: ['Hamburgevons', 'avocado', 'apricot', 'arrival'],
		B: ['Bouquet', 'Bilbao', 'BRAVADO'],
		b: ['rabbit', 'habit', 'bobbing'],
		C: ['Concentric', 'Calcium', 'CASCADE'],
		c: ['echelon', 'crescent', 'cycle'],
		D: ['DODGE', 'Diamond', 'Dragonfly'],
		d: ['standard', 'doodle', 'paddle'],
		E: ['Epsilon', 'EVEREST', 'Echo'],
		e: ['element', 'reverence', 'esteem'],
		F: ['Fjord', 'Effort', 'FORTUNE'],
		f: ['effort', 'fluffy', 'official'],
		G: ['Glacier', 'GIGABYTE', 'Genuine'],
		g: ['rugged', 'glowing', 'engaging'],
		H: ['Hamburgevons', 'HORIZON', 'Helium'],
		h: ['highlight', 'hashish', 'thatch'],
		I: ['Iris', 'Italic', 'INCISIVE'],
		i: ['incidence', 'minimum', 'finishing'],
		J: ['Jovial', 'JACKDAW', 'Jasmine'],
		j: ['banjo', 'jovial', 'enjoy'],
		K: ['Kayak', 'KILOWATT', 'Kingdom'],
		k: ['skipping', 'knocked', 'token'],
		L: ['Lullaby', 'LATITUDE', 'Lantern'],
		l: ['lulling', 'willow', 'distill'],
		M: ['Mammoth', 'MOSAIC', 'Meridian'],
		m: ['mammal', 'common', 'simmer'],
		N: ['Nominal', 'NOCTURNE', 'Nebula'],
		n: ['minimum', 'inning', 'cannon'],
		O: ['Orbit', 'OCTAVE', 'Oolong'],
		o: ['cocoon', 'moon', 'cooperation'],
		P: ['Plateau', 'PYRAMID', 'Phantom'],
		p: ['apple', 'puppy', 'pepper'],
		Q: ['Quartz', 'QUEUE', 'Quiver'],
		q: ['quick', 'queue', 'quaint'],
		R: ['Rhythm', 'REVERIE', 'Radius'],
		r: ['murmur', 'mirror', 'narrator'],
		S: ['Sussex', 'SUSPENSE', 'Sirius'],
		s: ['essence', 'sussex', 'glass'],
		T: ['Trinity', 'TANGENT', 'Tabular'],
		t: ['tattoo', 'titanic', 'attempt'],
		U: ['Uplift', 'UMBRELLA', 'Unique'],
		u: ['unusual', 'museum', 'curfew'],
		V: ['Velvet', 'VIVID', 'Vacuum'],
		v: ['velvet', 'survey', 'civilian'],
		W: ['Willow', 'WORKFLOW', 'Whirlwind'],
		w: ['willow', 'window', 'wallow'],
		X: ['Xenon', 'EXAMPLE', 'Xylophone'],
		x: ['oxide', 'exotic', 'maximum'],
		Y: ['Yacht', 'YESTERDAY', 'Yearly'],
		y: ['yearly', 'symphony', 'beyond'],
		Z: ['Zigzag', 'ZENITH', 'Zephyr'],
		z: ['zigzag', 'pizza', 'puzzle'],
		// Digits — show in column + mixed context. Tabular vs proportional
		// figure decisions are most visible here.
		'0': ['1029384756', 'Year 2026', 'Code 007'],
		'1': ['11/11 11:11', '1024 KB', 'One in 100'],
		'2': ['22 February 2022', '1024 × 768', 'Two for 22'],
		'3': ['33⅓ rpm', '3.14159', 'Three minus 3'],
		'4': ['Front-end 4.0', '4444 forty-four', 'For 4-year-olds'],
		'5': ['$55.55', '5/5 stars', 'Top 5 of 555'],
		'6': ['6.6.66 number', '60 fps', 'Six 6s in 6666'],
		'7': ['Mach 7.7', '777 jet', 'Seven of 77'],
		'8': ['8 of 88 days', '88.8°', '8/8 done'],
		'9': ['9 lives, 99 cats', '999 ohms', 'Nine of 99'],
		// Punctuation — show in real sentence context so kerning + spacing
		// problems are visible.
		'.': ['e.g. or i.e. Dr. Jr.', 'A.M. or P.M.', 'Sentence. Another.'],
		',': ['1,234,567 commas', 'apples, oranges, pears', 'However, despite that,'],
		';': ['list; another; final', 'so; therefore', 'one; two; three'],
		':': ['12:34 PM', 'Note: read this', 'time: 6:30'],
		'!': ['Hello! Surprise!', 'Watch out!', 'Wow!! Really??!'],
		'?': ['Why? When? How?', 'Hello? Anyone?', 'Sure? Really??'],
		"'": ["it's, don't, can't", "'80s, '90s", "the dog's bone"],
		'"': ['"hello," she said', '"quoted text"', 'the "best" answer'],
		'(': ['(parenthetical)', '(see note)', '(a + b)'],
		')': ['ok (yes)', '(done)', '(2 + 3) × 4'],
		'-': ['well-known dash', 'thirty-three', 'state-of-the-art'],
		'/': ['1/2 + 3/4', 'and/or both', 'true/false'],
		'@': ['name@host.com', '@user mention', 'reply@here'],
		'#': ['#hashtag rules', '#1 ranked', '#000 in CSS'],
		'&': ['Tom & Jerry', 'AT&T Inc.', 'rock & roll']
	};
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
	const involvedKerning = $derived.by(() => {
		const p = projectStore.project;
		if (!p || !glyph) return { asLeft: 0, asRight: 0 };
		const cp = glyph.codepoint;
		const classes = p.classes ?? [];
		const memberClassNames = new Set(
			classes.filter((c) => c.members.includes(cp)).map((c) => c.name)
		);
		let asLeft = 0;
		let asRight = 0;
		const matches = (side: import('$lib/font/types').KerningSide, role: 'left' | 'right') => {
			const hit =
				(typeof side === 'number' && side === cp) ||
				(typeof side === 'string' && memberClassNames.has(side));
			if (!hit) return;
			if (role === 'left') asLeft++;
			else asRight++;
		};
		for (const pair of p.kerning) {
			matches(pair.left, 'left');
			matches(pair.right, 'right');
		}
		return { asLeft, asRight };
	});

	const spacingSuggestion = $derived.by(() => {
		if (!projectStore.project || !glyph || glyph.contours.length === 0) return null;
		// Pick a peer in the same category (upper/lower/figure) with the
		// closest bbox width — its sidebearings are a sensible starting point.
		const cp = glyph.codepoint;
		const sameCategory = (other: number): boolean => {
			if (cp >= 0x0041 && cp <= 0x005a) return other >= 0x0041 && other <= 0x005a;
			if (cp >= 0x0061 && cp <= 0x007a) return other >= 0x0061 && other <= 0x007a;
			if (cp >= 0x0030 && cp <= 0x0039) return other >= 0x0030 && other <= 0x0039;
			return false;
		};
		const myBounds = glyphBounds(glyph.contours);
		const myWidth = myBounds.maxX - myBounds.minX;
		if (myWidth <= 0) return null;
		const peers = Object.values(projectStore.project.glyphs).filter(
			(g) =>
				g.codepoint !== cp &&
				g.contours.length > 0 &&
				sameCategory(g.codepoint)
		);
		if (peers.length === 0) return null;
		const scored = peers
			.map((g) => {
				const b = glyphBounds(g.contours);
				const w = b.maxX - b.minX;
				return { glyph: g, diff: Math.abs(w - myWidth) };
			})
			.sort((a, b) => a.diff - b.diff);
		const closest = scored[0];
		if (
			closest.glyph.leftSidebearing === glyph.leftSidebearing &&
			closest.glyph.rightSidebearing === glyph.rightSidebearing
		)
			return null;
		return {
			peerName: closest.glyph.name,
			peerChar: String.fromCodePoint(closest.glyph.codepoint),
			lsb: closest.glyph.leftSidebearing,
			rsb: closest.glyph.rightSidebearing
		};
	});

	const applySpacingSuggestion = () => {
		if (!glyph || !spacingSuggestion) return;
		projectStore.updateGlyph(glyph.codepoint, (g) => ({
			...g,
			leftSidebearing: spacingSuggestion.lsb,
			rightSidebearing: spacingSuggestion.rsb
		}));
	};

	const copyableMetricSources = $derived.by(() => {
		if (!projectStore.project || !glyph) return [];
		return Object.values(projectStore.project.glyphs)
			.filter((g) => g.codepoint !== glyph.codepoint && g.contours.length > 0)
			.sort((a, b) => a.codepoint - b.codepoint);
	});

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

	const glyphStats = $derived.by(() => {
		if (!glyph || glyph.contours.length === 0) {
			return { contours: 0, points: 0, minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
		}
		const b = glyphBounds(glyph.contours);
		const points = glyph.contours.reduce((n, c) => n + countPathPoints(c.commands), 0);
		return {
			contours: glyph.contours.length,
			points,
			minX: Math.round(b.minX),
			maxX: Math.round(b.maxX),
			minY: Math.round(b.minY),
			maxY: Math.round(b.maxY),
			width: Math.round(b.maxX - b.minX),
			height: Math.round(b.maxY - b.minY)
		};
	});

	const anatomyTip = $derived(glyph ? tipFor(glyph.codepoint) : null);

	const peerComparison = $derived.by(() => {
		if (!projectStore.project || !glyph || glyph.contours.length === 0) return null;
		const cp = glyph.codepoint;
		const sameCat = (other: number): boolean => {
			if (cp >= 0x0041 && cp <= 0x005a) return other >= 0x0041 && other <= 0x005a;
			if (cp >= 0x0061 && cp <= 0x007a) return other >= 0x0061 && other <= 0x007a;
			if (cp >= 0x0030 && cp <= 0x0039) return other >= 0x0030 && other <= 0x0039;
			return false;
		};
		const peers = Object.values(projectStore.project.glyphs).filter(
			(g) => g.codepoint !== cp && sameCat(g.codepoint) && g.contours.length > 0
		);
		if (peers.length < 2) return null;
		const adv = peers.map((g) => g.advanceWidth).sort((a, b) => a - b);
		const medianAdv = adv[Math.floor(adv.length / 2)];
		const diff = glyph.advanceWidth - medianAdv;
		const pct = Math.round((Math.abs(diff) / medianAdv) * 100);
		return { medianAdv, diff, pct, peerCount: peers.length };
	});

	// Control-glyph onboarding (n o H O a e s c p v y f g — the canonical proportion/texture set)
	const CONTROL_GLYPHS = [0x006e, 0x006f, 0x0048, 0x004f, 0x0061, 0x0065, 0x0073, 0x0063, 0x0070, 0x0076, 0x0079, 0x0066, 0x0067];
	const totalDrawn = $derived(
		projectStore.project
			? Object.values(projectStore.project.glyphs).filter((g) => g.contours.length > 0).length
			: 0
	);
	const controlMissing = $derived(
		projectStore.project
			? CONTROL_GLYPHS.filter((cp) => (projectStore.project!.glyphs[cp]?.contours.length ?? 0) === 0)
			: []
	);
	const showControlHint = $derived(totalDrawn < 13 && controlMissing.length > 0);

	/**
	 * Priority codepoints by use case. We surface up to 8 missing glyphs in
	 * priority order — control glyphs first, then use-case-specific picks
	 * derived from the Brief.
	 */
	const useCaseTargets = (uc: string | undefined): number[] => {
		const digits = [0x0030, 0x0031, 0x0032, 0x0033, 0x0034, 0x0035, 0x0036, 0x0037, 0x0038, 0x0039];
		const corePunct = [0x002e, 0x002c, 0x003a, 0x003b, 0x0021, 0x003f, 0x0027, 0x0022];
		const wrap = [0x0028, 0x0029, 0x002d, 0x002013, 0x2014];
		switch (uc) {
			case 'web-ui':
				return [...digits, ...corePunct];
			case 'body-text':
				return [...corePunct, ...wrap, ...digits];
			case 'data-tables':
				return [...digits, 0x002e, 0x002c, 0x0025, 0x0024];
			case 'code':
				return [...digits, 0x005b, 0x005d, 0x007b, 0x007d, 0x002f, 0x005c, 0x003d];
			case 'display':
				return [];
			default:
				return [...digits, ...corePunct];
		}
	};

	const suggestedNext = $derived.by(() => {
		if (!projectStore.project) return [] as number[];
		const useCases = projectStore.project.brief?.useCases ?? [];
		const priority: number[] = [];
		// Start with control glyphs not yet drawn
		for (const cp of CONTROL_GLYPHS) {
			if ((projectStore.project.glyphs[cp]?.contours.length ?? 0) === 0) priority.push(cp);
		}
		// Then use-case targets
		for (const uc of useCases) {
			for (const cp of useCaseTargets(uc)) {
				if (priority.includes(cp)) continue;
				if ((projectStore.project.glyphs[cp]?.contours.length ?? 0) === 0) priority.push(cp);
			}
		}
		return priority.slice(0, 10);
	});

	const showSuggestedNext = $derived(
		totalDrawn >= 1 && suggestedNext.length > 0 && totalDrawn < 50
	);

	const briefIsEmpty = $derived.by(() => {
		const b = projectStore.project?.brief;
		if (!b) return true;
		return !(
			b.intent?.trim() ||
			b.audience?.trim() ||
			(b.useCases?.length ?? 0) > 0 ||
			b.differentiation?.trim() ||
			(b.references?.length ?? 0) > 0
		);
	});

	const showBriefFirstHint = $derived(totalDrawn === 0 && briefIsEmpty);

	const referenceGlyph = $derived.by(() => {
		if (!showReference || !glyph || !projectStore.project) return null;
		const cp = glyph.codepoint;
		const candidates: number[] = [];
		if (cp >= 0x0041 && cp <= 0x005a) candidates.push(0x0048, 0x004f, 0x004e);
		else if (cp >= 0x0061 && cp <= 0x007a) candidates.push(0x006e, 0x006f);
		else if (cp >= 0x0030 && cp <= 0x0039) candidates.push(0x0030, 0x0031);
		else if (cp === 0x0020 || cp === 0x002e) return null;
		else candidates.push(0x0048, 0x006e, 0x006f);
		for (const c of candidates) {
			if (c === cp) continue;
			const g = projectStore.project.glyphs[c];
			if (g && g.contours.length > 0) return g;
		}
		return null;
	});

	const onionGlyphs = $derived.by(() => {
		if (!showOnion || !glyph || !projectStore.project) return { prev: null, next: null };
		const codepoints = Object.keys(projectStore.project.glyphs)
			.map(Number)
			.sort((a, b) => a - b);
		const idx = codepoints.indexOf(glyph.codepoint);
		if (idx === -1) return { prev: null, next: null };
		const findDrawn = (start: number, step: number) => {
			let i = start;
			while (i >= 0 && i < codepoints.length) {
				const g = projectStore.project!.glyphs[codepoints[i]];
				if (g && g.contours.length > 0) return g;
				i += step;
			}
			return null;
		};
		return { prev: findDrawn(idx - 1, -1), next: findDrawn(idx + 1, 1) };
	});

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
		const cp = glyph.codepoint;
		// Auto-snapshot before any contour-mutating fix when the most
		// recent snapshot is older than 30s or the list is empty.
		// Cheap insurance — ⌘Z still works, but a labelled snapshot
		// also stays in the panel so the designer can compare or
		// restore later. The 30s window prevents spam if the user
		// runs multiple fixes back-to-back.
		const contourFix =
			code === 'self-intersecting' ||
			code === 'contour-winding-collision' ||
			code === 'duplicate-points' ||
			code === 'near-collinear-points' ||
			code === 'off-grid-points' ||
			code === 'tiny-contour';
		if (contourFix && glyph.contours.length > 0) {
			const latest = glyph.revisions?.[glyph.revisions.length - 1];
			const recent = latest ? Date.now() - new Date(latest.takenAt).getTime() < 30_000 : false;
			if (!recent) {
				projectStore.saveRevision(cp, `pre-fix: ${code}`);
			}
		}
		if (code === 'off-grid-points') {
			const cleaned = glyph.contours.map((c) => ({
				...c,
				commands: roundToFontUnits(c.commands)
			}));
			handleContoursChange(cleaned);
			toast.success('Snapped all points to integer font units.');
			return;
		}
		if (code === 'self-intersecting' || code === 'contour-winding-collision') {
			const cleaned = booleanContours(glyph.contours, 'union');
			handleContoursChange(cleaned);
			toast.success(
				code === 'self-intersecting'
					? 'Cleaned self-intersections via boolean union.'
					: 'Re-oriented nested contours via boolean union.'
			);
			return;
		}
		if (code === 'duplicate-points') {
			const cleaned = glyph.contours.map((c) => {
				const out: typeof c.commands = [];
				let prevX: number | null = null;
				let prevY: number | null = null;
				for (const cmd of c.commands) {
					if (cmd.type === 'Z') {
						out.push(cmd);
						prevX = null;
						prevY = null;
						continue;
					}
					if (
						prevX !== null &&
						prevY !== null &&
						cmd.type !== 'M' &&
						Math.abs(cmd.x - prevX) < 0.5 &&
						Math.abs(cmd.y - prevY) < 0.5
					) {
						// Drop this command — it's a duplicate of the previous point.
						continue;
					}
					out.push(cmd);
					prevX = cmd.x;
					prevY = cmd.y;
				}
				return { ...c, commands: out };
			});
			handleContoursChange(cleaned);
			toast.success('Removed duplicate points.');
			return;
		}
		if (code === 'near-collinear-points') {
			const cleaned = glyph.contours.map((c) => {
				// Build the index of L/M points only (curves break the
				// L-sequence and aren't considered for collinearity).
				const cmds = [...c.commands];
				const drop = new Set<number>();
				for (let i = 1; i < cmds.length - 1; i++) {
					const a = cmds[i - 1];
					const b = cmds[i];
					const d = cmds[i + 1];
					if (
						a.type !== 'M' && a.type !== 'L'
						|| b.type !== 'L'
						|| d.type !== 'L'
					)
						continue;
					const num = Math.abs(
						(d.y - a.y) * b.x - (d.x - a.x) * b.y + d.x * a.y - d.y * a.x
					);
					const den = Math.hypot(d.x - a.x, d.y - a.y);
					if (den < 0.001) continue;
					if (num / den < 1) drop.add(i);
				}
				if (drop.size === 0) return c;
				return { ...c, commands: cmds.filter((_, i) => !drop.has(i)) };
			});
			handleContoursChange(cleaned);
			toast.success('Removed near-collinear points.');
			return;
		}
		// Non-contour fixes that nonetheless make sense per-glyph in the editor.
		if (code === 'open-contour') {
			const cleaned = glyph.contours.map((c) => (c.closed ? c : { ...c, closed: true }));
			handleContoursChange(cleaned);
			toast.success('Closed open contours.');
			return;
		}
		if (code === 'zero-advance' || code === 'overflows-advance') {
			if (glyph.contours.length === 0 || !projectStore.project) return;
			const b = glyphBounds(glyph.contours);
			const sb = projectStore.project.metrics.defaultSidebearing;
			const target = Math.max(1, Math.round(b.maxX) + sb);
			projectStore.updateGlyph(cp, (g) => ({ ...g, advanceWidth: target }));
			toast.success(`Set advance to ${target}.`);
			return;
		}
		if (code === 'anchor-naming-mark-no-prefix' || code === 'anchor-naming-base-with-prefix') {
			if (!glyph.anchors) return;
			const isMark = cp >= 0x0300 && cp <= 0x036f;
			const cleaned = glyph.anchors.map((a) => {
				if (isMark && !a.name.startsWith('_')) return { ...a, name: `_${a.name}` };
				if (!isMark && a.name.startsWith('_')) return { ...a, name: a.name.slice(1) };
				return a;
			});
			projectStore.updateGlyph(cp, (g) => ({ ...g, anchors: cleaned }));
			toast.success('Renamed anchors to match convention.');
			return;
		}
		if (code === 'tiny-contour') {
			// Drop any closed contour smaller than 8×8 font units in bbox —
			// the same threshold the audit uses. Auto-snapshot upstream
			// gives the designer a path back if any of them weren't actual
			// artefacts.
			const before = glyph.contours.length;
			const cleaned = glyph.contours.filter((c) => {
				if (!c.closed) return true;
				const b = glyphBounds([c]);
				return b.maxX - b.minX >= 8 || b.maxY - b.minY >= 8;
			});
			const dropped = before - cleaned.length;
			if (dropped === 0) return;
			handleContoursChange(cleaned);
			toast.success(`Removed ${dropped} tiny contour${dropped === 1 ? '' : 's'}.`);
			return;
		}
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
		// Reuse the existing reverseContour helper from path.ts
		import('$lib/font/path').then(({ reverseContour }) => {
			projectStore.updateGlyph(glyph.codepoint, (g) => ({
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
		const snap = (n: number) => Math.round(n / step) * step;
		const next = glyph.contours.map((c) => ({
			...c,
			commands: c.commands.map((cmd) => {
				if (cmd.type === 'Z') return cmd;
				if (cmd.type === 'M' || cmd.type === 'L') {
					return { ...cmd, x: snap(cmd.x), y: snap(cmd.y) };
				}
				if (cmd.type === 'Q') {
					return { ...cmd, x: snap(cmd.x), y: snap(cmd.y), x1: snap(cmd.x1), y1: snap(cmd.y1) };
				}
				return {
					...cmd,
					x: snap(cmd.x),
					y: snap(cmd.y),
					x1: snap(cmd.x1),
					y1: snap(cmd.y1),
					x2: snap(cmd.x2),
					y2: snap(cmd.y2)
				};
			})
		}));
		projectStore.updateGlyph(glyph.codepoint, (g) => ({ ...g, contours: next }));
	};

	let autoCleaning = $state(false);
	const autoCleanGlyph = async () => {
		if (!glyph || glyph.contours.length === 0 || autoCleaning) return;
		autoCleaning = true;
		try {
			// Same auto-snapshot policy as audit fixes — Auto-clean reshapes
			// the outline (simplify + grid-snap), so deposit a labelled
			// snapshot first when the most-recent one is older than 30s.
			const latest = glyph.revisions?.[glyph.revisions.length - 1];
			const recent = latest ? Date.now() - new Date(latest.takenAt).getTime() < 30_000 : false;
			if (!recent) projectStore.saveRevision(glyph.codepoint, 'pre-auto-clean');
			// 1. Simplify (re-sample, DP, refit cubics) for noise reduction
			const simplified = await simplifyContours(glyph.contours);
			if (simplified.length === 0) {
				toast.warn('Simplify returned empty geometry; nothing changed.');
				return;
			}
			// 2. Snap every command coordinate to nearest 10 units
			const snap = (n: number) => Math.round(n / 10) * 10;
			const snapped = simplified.map((c) => ({
				...c,
				commands: c.commands.map((cmd) => {
					if (cmd.type === 'Z') return cmd;
					if (cmd.type === 'M' || cmd.type === 'L') {
						return { ...cmd, x: snap(cmd.x), y: snap(cmd.y) };
					}
					if (cmd.type === 'Q') {
						return { ...cmd, x: snap(cmd.x), y: snap(cmd.y), x1: snap(cmd.x1), y1: snap(cmd.y1) };
					}
					return {
						...cmd,
						x: snap(cmd.x),
						y: snap(cmd.y),
						x1: snap(cmd.x1),
						y1: snap(cmd.y1),
						x2: snap(cmd.x2),
						y2: snap(cmd.y2)
					};
				})
			}));
			projectStore.updateGlyph(glyph.codepoint, (g) => ({ ...g, contours: snapped }));
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
		// Flip the whole glyph around its bbox center (selection-aware variants
		// could be added later; for now we mirror the whole outline).
		const bounds = glyphBounds(glyph.contours);
		const cx = (bounds.minX + bounds.maxX) / 2;
		const cy = (bounds.minY + bounds.maxY) / 2;
		const m: AffineMatrix =
			axis === 'horizontal'
				? { a: -1, b: 0, c: 0, d: 1, tx: 2 * cx, ty: 0 }
				: { a: 1, b: 0, c: 0, d: -1, tx: 0, ty: 2 * cy };
		// Build a fake "all points" PointRef list
		const allRefs = glyph.contours.flatMap((c, ci) =>
			c.commands
				.map((cmd, i) =>
					cmd.type === 'M' || cmd.type === 'L' || cmd.type === 'Q' || cmd.type === 'C'
						? { contour: ci, index: i }
						: null
				)
				.filter((r): r is { contour: number; index: number } => r !== null)
		);
		const next = transformPoints(glyph.contours, allRefs, m);
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
		const bounds = glyphBounds(glyph.contours);
		const dy =
			target === 'baseline'
				? -bounds.minY // bbox bottom → 0
				: target === 'capHeight'
					? metrics.capHeight - bounds.maxY // bbox top → cap
					: metrics.xHeight - bounds.maxY; // bbox top → x-height
		if (dy === 0) return;
		const m: AffineMatrix = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: Math.round(dy) };
		const allRefs = glyph.contours.flatMap((c, ci) =>
			c.commands
				.map((cmd, i) =>
					cmd.type === 'M' || cmd.type === 'L' || cmd.type === 'Q' || cmd.type === 'C'
						? { contour: ci, index: i }
						: null
				)
				.filter((r): r is { contour: number; index: number } => r !== null)
		);
		const next = transformPoints(glyph.contours, allRefs, m);
		projectStore.updateGlyph(glyph.codepoint, (g) => ({ ...g, contours: next }));
	};

	const centerHorizontally = () => {
		if (!glyph || glyph.contours.length === 0) return;
		const bounds = glyphBounds(glyph.contours);
		const targetCenter = glyph.advanceWidth / 2;
		const currentCenter = (bounds.minX + bounds.maxX) / 2;
		const dx = Math.round(targetCenter - currentCenter);
		if (dx === 0) return;
		const m: AffineMatrix = { a: 1, b: 0, c: 0, d: 1, tx: dx, ty: 0 };
		const allRefs = glyph.contours.flatMap((c, ci) =>
			c.commands
				.map((cmd, i) =>
					cmd.type === 'M' || cmd.type === 'L' || cmd.type === 'Q' || cmd.type === 'C'
						? { contour: ci, index: i }
						: null
				)
				.filter((r): r is { contour: number; index: number } => r !== null)
		);
		const next = transformPoints(glyph.contours, allRefs, m);
		projectStore.updateGlyph(glyph.codepoint, (g) => ({ ...g, contours: next }));
	};

	const scaleGlyph = (factor: number) => {
		if (!glyph || glyph.contours.length === 0) return;
		const bounds = glyphBounds(glyph.contours);
		const cx = (bounds.minX + bounds.maxX) / 2;
		const cy = (bounds.minY + bounds.maxY) / 2;
		const m: AffineMatrix = {
			a: factor,
			b: 0,
			c: 0,
			d: factor,
			tx: cx - factor * cx,
			ty: cy - factor * cy
		};
		const allRefs = glyph.contours.flatMap((c, ci) =>
			c.commands
				.map((cmd, i) =>
					cmd.type === 'M' || cmd.type === 'L' || cmd.type === 'Q' || cmd.type === 'C'
						? { contour: ci, index: i }
						: null
				)
				.filter((r): r is { contour: number; index: number } => r !== null)
		);
		const next = transformPoints(glyph.contours, allRefs, m);
		projectStore.updateGlyph(glyph.codepoint, (g) => ({ ...g, contours: next }));
	};

	const autoSpace = () => {
		if (!glyph || !projectStore.project || glyph.contours.length === 0) return;
		const bounds = glyphBounds(glyph.contours);
		const sb = projectStore.project.metrics.defaultSidebearing;
		const dx = Math.round(sb - bounds.minX);
		projectStore.updateGlyph(glyph.codepoint, (g) => {
			const shifted =
				dx === 0
					? g.contours
					: g.contours.map((c) => ({
							...c,
							commands: c.commands.map((cmd) => {
								if (cmd.type === 'M' || cmd.type === 'L') return { ...cmd, x: cmd.x + dx };
								if (cmd.type === 'Q')
									return { ...cmd, x1: cmd.x1 + dx, x: cmd.x + dx };
								if (cmd.type === 'C')
									return { ...cmd, x1: cmd.x1 + dx, x2: cmd.x2 + dx, x: cmd.x + dx };
								return cmd;
							})
						}));
			const newBounds = glyphBounds(shifted);
			const width = newBounds.maxX - newBounds.minX;
			return {
				...g,
				contours: shifted,
				leftSidebearing: sb,
				rightSidebearing: sb,
				advanceWidth: Math.max(50, Math.round(sb * 2 + width))
			};
		});
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

	const jumpAttention = (
		direction: 'next' | 'prev',
		codepoints: number[],
		allGlyphs: Record<number, Glyph>,
		project: NonNullable<typeof projectStore.project>
	) => {
		const attention: Array<{ cp: number; firstMessage: string }> = [];
		for (const cp of codepoints) {
			const g = allGlyphs[cp];
			if (!g) continue;
			const issues = sortBySeverity(auditGlyph(g, project)).filter(
				(i) => i.severity === 'warn' || i.severity === 'error'
			);
			if (issues.length > 0) attention.push({ cp, firstMessage: issues[0].message });
		}
		if (attention.length === 0) {
			toast.info('No glyphs need attention', 1500);
			return;
		}
		const aIdx = attention.findIndex((a) => a.cp === projectStore.selectedCodepoint);
		const targetIdx =
			direction === 'next'
				? aIdx >= 0
					? (aIdx + 1) % attention.length
					: 0
				: aIdx >= 0
					? (aIdx - 1 + attention.length) % attention.length
					: attention.length - 1;
		const target = attention[targetIdx];
		projectStore.selectGlyph(target.cp);
		const name = allGlyphs[target.cp]?.name ?? 'glyph';
		toast.info(`${name} — ${target.firstMessage}`, 2200);
	};

	const handleKeyDown = (ev: KeyboardEvent) => {
		if (ev.target instanceof HTMLInputElement) return;
		if (ev.target instanceof HTMLTextAreaElement) return;
		const project = projectStore.project;
		const allGlyphs = project?.glyphs ?? {};
		const allCodepoints = Object.keys(allGlyphs)
			.map(Number)
			.sort((a, b) => a - b);
		const codepoints = skipEmptyNav
			? allCodepoints.filter(
					(cp) =>
						allGlyphs[cp]?.contours.length > 0 ||
						(allGlyphs[cp]?.components?.length ?? 0) > 0
				)
			: allCodepoints;
		const idx = codepoints.indexOf(projectStore.selectedCodepoint);
		// Shift+]/Shift+[ — jump to next/prev glyph that the audit module flags
		// with warn or error. Lets a designer step through the punch list
		// without leaving the editor. Computed on-demand so we only pay the
		// audit cost when the user actually presses the shortcut.
		if ((ev.key === '}' || (ev.key === ']' && ev.shiftKey)) && project) {
			ev.preventDefault();
			jumpAttention('next', codepoints, allGlyphs, project);
			return;
		}
		if ((ev.key === '{' || (ev.key === '[' && ev.shiftKey)) && project) {
			ev.preventDefault();
			jumpAttention('prev', codepoints, allGlyphs, project);
			return;
		}
		if (ev.key === ']') {
			ev.preventDefault();
			const next = codepoints[Math.min(idx + 1, codepoints.length - 1)];
			projectStore.selectGlyph(next);
		} else if (ev.key === '[') {
			ev.preventDefault();
			projectStore.selectGlyph(codepoints[Math.max(idx - 1, 0)]);
		} else if (ev.key === 'p' || ev.key === 'P') {
			tool = 'pencil';
		} else if (ev.key === 'e' || ev.key === 'E') {
			tool = 'eraser';
		} else if (ev.key === 'a' || ev.key === 'A') {
			if (glyph && glyph.contours.length > 0) tool = 'edit';
		} else if (ev.key === 't' || ev.key === 'T') {
			trace();
		} else if (ev.key === 's' || ev.key === 'S') {
			showSketch = !showSketch;
		} else if ((ev.key === 'v' || ev.key === 'V') && !ev.metaKey && !ev.ctrlKey) {
			// Bare V/Shift+V toggles vector layer. Cmd+Shift+V (paste glyph)
			// is intentionally NOT this branch — it falls through to the
			// modifier-aware handler below. Without the !meta/!ctrl guard
			// this branch swallowed Cmd+Shift+V and paste was unreachable.
			showVector = !showVector;
		} else if (ev.key === 'g' || ev.key === 'G') {
			showGrid = !showGrid;
		} else if (ev.key === 'R' && ev.shiftKey && familyRegularProject) {
			// Shift+R toggles the family-Regular ghost overlay (only when this is a
			// sibling — Regular project itself doesn't have anything to compare to).
			showFamilyRegular = !showFamilyRegular;
		} else if (ev.key === 'r' || ev.key === 'R') {
			showReference = !showReference;
		} else if (ev.key === 'o' || ev.key === 'O') {
			showOnion = !showOnion;
		} else if (ev.key === 'x' || ev.key === 'X') {
			showAnchors = !showAnchors;
		} else if (ev.key >= '1' && ev.key <= '4' && glyph && !ev.metaKey && !ev.ctrlKey) {
			const map: Record<string, 'empty' | 'sketch' | 'draft' | 'final'> = {
				'1': 'empty',
				'2': 'sketch',
				'3': 'draft',
				'4': 'final'
			};
			projectStore.setGlyphStatus(glyph.codepoint, map[ev.key]);
			toast.info(`Status: ${map[ev.key]}`, 1500);
		} else if (ev.key === '`' && glyph) {
			const willPin = !glyph.pinned;
			projectStore.toggleGlyphPin(glyph.codepoint);
			toast.info(willPin ? `Pinned ${glyph.name}` : `Unpinned ${glyph.name}`, 1500);
		} else if ((ev.key === 'F' || ev.key === 'f') && ev.shiftKey && glyph) {
			const willFlag = !glyph.flagged;
			projectStore.toggleGlyphFlag(glyph.codepoint);
			toast.info(
				willFlag ? `Flagged ${glyph.name} for review` : `Unflagged ${glyph.name}`,
				1500
			);
		} else if ((ev.key === 'z' || ev.key === 'Z') && (ev.metaKey || ev.ctrlKey)) {
			ev.preventDefault();
			if (ev.shiftKey) {
				projectStore.redo();
			} else {
				projectStore.undo();
			}
		} else if ((ev.key === 'y' || ev.key === 'Y') && (ev.metaKey || ev.ctrlKey)) {
			ev.preventDefault();
			projectStore.redo();
		} else if ((ev.key === 'c' || ev.key === 'C') && ev.shiftKey && (ev.metaKey || ev.ctrlKey)) {
			ev.preventDefault();
			copyGlyph();
		} else if ((ev.key === 'v' || ev.key === 'V') && ev.shiftKey && (ev.metaKey || ev.ctrlKey)) {
			ev.preventDefault();
			pasteGlyph();
		}
	};
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if !glyph || !metrics}
	<LoadingPanel label="Loading glyph" />
{:else}
	<div class="grid h-full grid-cols-[1fr_280px]">
		<div class="flex min-h-0 flex-col">
			<!-- Top toolbar -->
			<div
				class="flex items-center gap-2 border-b border-border bg-surface px-4 py-2"
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
						class="pointer-events-none absolute inset-6 z-10 flex items-center justify-center rounded-lg bg-accent/10 text-[14px] font-medium text-accent-strong"
					>
						Drop image to use as tracing reference
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
