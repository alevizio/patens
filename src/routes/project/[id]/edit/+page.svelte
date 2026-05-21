<script lang="ts">
	import { untrack } from 'svelte';
	import { projectStore } from '$lib/stores/project.svelte';
	import { previewStore } from '$lib/stores/preview.svelte';
	import DrawingCanvas from '$lib/drawing/DrawingCanvas.svelte';
	import { DEFAULT_STROKE, DEFAULT_TRACE, sketchToContours } from '$lib/font/sketch-to-bezier';
	import type { Anchor, BezierContour, ColorLayer, ColorPalette, Glyph, SketchStroke } from '$lib/font/types';
	import { createColorLayer, defaultPalette, rgbaToCss } from '$lib/font/color';
	import { glyphBounds, contoursToSvgPath } from '$lib/font/path';
	import { interpolateGlyph, computeMasterWeights } from '$lib/font/interpolate';
	import {
		chaikinSmooth,
		booleanContours,
		transformPoints,
		selectionCentroid,
		simplifyContours,
		type AffineMatrix,
		type PathOp
	} from '$lib/font/path-edit';
	import { auditGlyph, sortBySeverity } from '$lib/font/audit';
	import Button from '$lib/ui/Button.svelte';
	import Field from '$lib/ui/Field.svelte';
	import Input from '$lib/ui/Input.svelte';
	import LoadingPanel from '$lib/ui/LoadingPanel.svelte';
	import Accordion from '$lib/ui/Accordion.svelte';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Eraser from '@lucide/svelte/icons/eraser';
	import MousePointer from '@lucide/svelte/icons/mouse-pointer-2';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import Wand from '@lucide/svelte/icons/wand-sparkles';
	import Grid3x3 from '@lucide/svelte/icons/grid-3x3';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Maximize from '@lucide/svelte/icons/maximize';
	import AlignHorizontalSpaceAround from '@lucide/svelte/icons/align-horizontal-space-around';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import HelpCircle from '@lucide/svelte/icons/help-circle';
	import Pin from '@lucide/svelte/icons/pin';
	import Flag from '@lucide/svelte/icons/flag';
	import FileText from '@lucide/svelte/icons/file-text';
	import Lock from '@lucide/svelte/icons/lock';
	import Unlock from '@lucide/svelte/icons/unlock';
	import Sliders from '@lucide/svelte/icons/sliders-horizontal';
	import Copy from '@lucide/svelte/icons/copy';
	import ClipboardPaste from '@lucide/svelte/icons/clipboard-paste';
	import EditorTour from '$lib/ui/EditorTour.svelte';
	import CompositeEditor from '$lib/glyph/CompositeEditor.svelte';
	import ReferenceImagePanel from '$lib/glyph/ReferenceImagePanel.svelte';
	import RevisionsPanel from '$lib/glyph/RevisionsPanel.svelte';
	import StemsPanel from '$lib/glyph/StemsPanel.svelte';
	import MetricsInspector from '$lib/glyph/MetricsInspector.svelte';
	import { tipFor } from '$lib/font/anatomy-tips';
	import Lightbulb from '@lucide/svelte/icons/lightbulb';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
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
	let skipEmptyNav = $state(settings.editor.skipEmptyNav);
	let showAnatomy = $state(settings.editor.showAnatomy);

	// Hoist `glyph` + `metrics` derivations above any other $derived/$effect
	// that closes over them. Previously sat ~60 lines down, which put them in
	// TDZ when Svelte 5 eagerly evaluated the dependent deriveds at component
	// init — that crash silently aborted /edit's mount, so clicking the Edit
	// tab from elsewhere appeared to "do nothing".
	const glyph = $derived(projectStore.selectedGlyph);
	const metrics = $derived(projectStore.project?.metrics);

	let canvasDragActive = $state(false);
	let canvasDragCounter = 0;
	const onCanvasDragEnter = (e: DragEvent) => {
		if (!e.dataTransfer?.types.includes('Files')) return;
		e.preventDefault();
		canvasDragCounter++;
		canvasDragActive = true;
	};
	const onCanvasDragLeave = (e: DragEvent) => {
		e.preventDefault();
		canvasDragCounter--;
		if (canvasDragCounter <= 0) canvasDragActive = false;
	};
	const onCanvasDragOver = (e: DragEvent) => {
		if (e.dataTransfer?.types.includes('Files')) e.preventDefault();
	};
	const onCanvasDrop = async (e: DragEvent) => {
		e.preventDefault();
		canvasDragActive = false;
		canvasDragCounter = 0;
		const file = e.dataTransfer?.files?.[0];
		if (!file || !file.type.startsWith('image/') || !glyph || !metrics) return;
		if (file.size > 4 * 1024 * 1024) {
			toast.warn('Image is over 4MB — please use a smaller reference.');
			return;
		}
		const dataUrl = await new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result));
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
		const dim = await new Promise<{ width: number; height: number }>((resolve, reject) => {
			const img = new window.Image();
			img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
			img.onerror = reject;
			img.src = dataUrl;
		});
		const fontHeight = metrics.ascender - metrics.descender;
		const scale = fontHeight / dim.height;
		projectStore.updateGlyph(glyph.codepoint, (g) => ({
			...g,
			referenceImage: {
				src: dataUrl,
				x: 0,
				y: metrics.descender,
				width: Math.round(dim.width * scale),
				height: Math.round(dim.height * scale),
				opacity: 0.4
			}
		}));
	};


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
		if (!glyph) return;
		const payload = await readGlyphFromClipboard();
		if (!payload) {
			toast.warn('Clipboard does not contain a Font Studio glyph.');
			return;
		}
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
		toast.success(`Pasted ${payload.contours.length} contour${payload.contours.length === 1 ? '' : 's'}`);
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
		let dy = 0;
		if (target === 'baseline') dy = -bounds.minY; // bbox bottom → 0
		else if (target === 'capHeight') dy = metrics.capHeight - bounds.maxY; // bbox top → cap
		else dy = metrics.xHeight - bounds.maxY; // bbox top → x-height
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

	const exportGlyphPng = () => {
		if (!glyph || !metrics || glyph.contours.length === 0) return;
		const bounds = glyphBounds(glyph.contours);
		const padX = 60;
		const padY = 60;
		const left = Math.min(0, bounds.minX) - padX;
		const right = Math.max(glyph.advanceWidth, bounds.maxX) + padX;
		const top = metrics.ascender + padY;
		const bottom = metrics.descender - padY;
		const width = right - left;
		const height = top - bottom;
		const px = 800; // canvas pixel width
		const scale = px / width;
		const c = document.createElement('canvas');
		c.width = Math.round(px);
		c.height = Math.round(height * scale);
		const ctx = c.getContext('2d');
		if (!ctx) return;
		ctx.fillStyle = 'white';
		ctx.fillRect(0, 0, c.width, c.height);
		ctx.save();
		ctx.translate(-left * scale, top * scale);
		ctx.scale(scale, -scale);
		ctx.fillStyle = 'black';
		ctx.fill(new Path2D(contoursToSvgPath(glyph.contours)), 'evenodd');
		ctx.restore();
		c.toBlob((blob) => {
			if (!blob) return;
			const safeName = (glyph.name || 'glyph').replace(/[^a-zA-Z0-9_-]/g, '_');
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${safeName}.png`;
			a.click();
			URL.revokeObjectURL(url);
			toast.success(`Exported ${safeName}.png`);
		}, 'image/png');
	};

	const copyGlyphPath = async () => {
		if (!glyph || glyph.contours.length === 0) return;
		const d = contoursToSvgPath(glyph.contours);
		try {
			await navigator.clipboard.writeText(d);
			toast.success(`Copied path (${d.length} chars)`);
		} catch {
			toast.error('Clipboard write failed.');
		}
	};

	const exportGlyphSvg = () => {
		if (!glyph || !metrics || glyph.contours.length === 0) return;
		const bounds = glyphBounds(glyph.contours);
		const padX = 40;
		const padY = 40;
		const left = Math.min(0, bounds.minX) - padX;
		const right = Math.max(glyph.advanceWidth, bounds.maxX) + padX;
		const top = metrics.ascender + padY;
		const bottom = metrics.descender - padY;
		const width = right - left;
		const height = top - bottom;
		const pathD = contoursToSvgPath(glyph.contours);
		const safeName = (glyph.name || 'glyph').replace(/[^a-zA-Z0-9_-]/g, '_');
		const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${left} ${-top} ${width} ${height}" width="${width}" height="${height}">
	<g transform="scale(1, -1)">
		<path d="${pathD}" fill="black" fill-rule="evenodd" />
	</g>
</svg>
`;
		const blob = new Blob([svg], { type: 'image/svg+xml' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${safeName}.svg`;
		a.click();
		URL.revokeObjectURL(url);
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

	const handleKeyDown = (ev: KeyboardEvent) => {
		if (ev.target instanceof HTMLInputElement) return;
		if (ev.target instanceof HTMLTextAreaElement) return;
		const allGlyphs = projectStore.project?.glyphs ?? {};
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
		} else if (ev.key === 'v' || ev.key === 'V') {
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
				<div class="flex items-center gap-2 pr-3">
					<span
						class="flex h-9 min-w-9 items-center justify-center rounded-md bg-fg/5 px-2 text-xl font-medium text-fg"
					>
						{charLabel}
					</span>
					<div class="grid leading-tight">
						<span class="text-sm font-medium text-fg">{glyph.name}</span>
						<span class="text-[11px] text-fg-subtle" data-numeric>
							U+{glyph.codepoint
								.toString(16)
								.toUpperCase()
								.padStart(4, '0')} · {glyph.status}
						</span>
					</div>
					<button
						type="button"
						onclick={() => projectStore.toggleGlyphPin(glyph.codepoint)}
						class="ml-1 inline-flex h-6 w-6 items-center justify-center rounded text-fg-subtle transition-colors hover:bg-surface-2 {glyph.pinned
							? 'text-warn hover:text-warn'
							: 'hover:text-fg'}"
						aria-label={glyph.pinned ? 'Unpin glyph' : 'Pin glyph'}
						title={glyph.pinned ? 'Unpin' : 'Pin for quick access'}
					>
						<Pin class="size-3.5 {glyph.pinned ? 'fill-current' : ''}" />
					</button>
					<button
						type="button"
						onclick={() => projectStore.toggleGlyphFlag(glyph.codepoint)}
						class="inline-flex h-6 w-6 items-center justify-center rounded text-fg-subtle transition-colors hover:bg-surface-2 {glyph.flagged
							? 'text-warn hover:text-warn'
							: 'hover:text-fg'}"
						aria-label={glyph.flagged ? 'Unflag glyph' : 'Flag glyph for review'}
						title={glyph.flagged ? 'Unflag' : 'Flag for review (⇧F)'}
					>
						<Flag class="size-3.5 {glyph.flagged ? 'fill-current' : ''}" />
					</button>
				</div>

				<div class="h-6 w-px bg-border"></div>

				<!-- Tool group -->
				<div class="flex items-center gap-0.5 rounded-md bg-surface-2 p-0.5">
					<button
						type="button"
						onclick={() => (tool = 'pencil')}
						class="inline-flex h-7 w-7 items-center justify-center rounded transition-colors {tool ===
						'pencil'
							? 'bg-surface text-fg shadow-sm'
							: 'text-fg-muted hover:text-fg'}"
						title="Pencil (P)"
						aria-label="Pencil"
					>
						<Pencil class="size-3.5" />
					</button>
					<button
						type="button"
						onclick={() => (tool = 'eraser')}
						class="inline-flex h-7 w-7 items-center justify-center rounded transition-colors {tool ===
						'eraser'
							? 'bg-surface text-fg shadow-sm'
							: 'text-fg-muted hover:text-fg'}"
						title="Eraser (E)"
						aria-label="Eraser"
					>
						<Eraser class="size-3.5" />
					</button>
					<button
						type="button"
						onclick={() => (tool = 'edit')}
						class="inline-flex h-7 w-7 items-center justify-center rounded transition-colors {tool ===
						'edit'
							? 'bg-surface text-fg shadow-sm'
							: 'text-fg-muted hover:text-fg'}"
						title="Edit points (A)"
						aria-label="Edit points"
						disabled={glyph.contours.length === 0}
					>
						<MousePointer class="size-3.5" />
					</button>
				</div>

				<label class="flex items-center gap-2 pl-2">
					<span class="text-[11px] font-medium text-fg-muted">Brush</span>
					<input
						type="range"
						min={10}
						max={120}
						step={2}
						bind:value={strokeSize}
						class="h-1 w-24 accent-fg"
						aria-label="Brush size"
					/>
					<span class="w-8 text-[11px] text-fg-subtle" data-numeric>{strokeSize}</span>
				</label>

				<div class="ml-auto flex items-center gap-1">
					<button
						type="button"
						onclick={() => (skipEmptyNav = !skipEmptyNav)}
						class="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium transition-colors {skipEmptyNav
							? 'bg-accent-soft text-accent-strong'
							: 'text-fg-muted hover:bg-surface-2 hover:text-fg'}"
						title="[ ] navigation skips empty glyphs"
					>
						Skip empty
					</button>
					<button
						type="button"
						onclick={() => (tourOpen = true)}
						class="inline-flex h-7 w-7 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
						title="Show editor tour"
						aria-label="Show editor tour"
					>
						<HelpCircle class="size-3.5" />
					</button>
					<button
						type="button"
						onclick={() => (resetSignal++)}
						class="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
						title="Fit to glyph (⌘0)"
					>
						<Maximize class="size-3.5" />
						<span data-numeric>{zoomPercent}%</span>
					</button>
					<button
						type="button"
						onclick={() => (showReference = !showReference)}
						class="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium transition-colors {showReference
							? 'bg-fg/10 text-fg'
							: 'text-fg-subtle hover:bg-surface-2'}"
						title="Toggle reference glyph (R)"
					>
						{#if showReference}<Eye class="size-3.5" />{:else}<EyeOff class="size-3.5" />{/if}
						Ref
					</button>
					{#if familyRegularProject}
						<button
							type="button"
							onclick={() => (showFamilyRegular = !showFamilyRegular)}
							class="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium transition-colors {showFamilyRegular
								? 'bg-accent-soft text-accent-strong'
								: 'text-fg-subtle hover:bg-surface-2'}"
							title="Overlay the family Regular's same-glyph contour as a ghost (⇧R)"
						>
							{#if showFamilyRegular}<Eye class="size-3.5" />{:else}<EyeOff class="size-3.5" />{/if}
							Regular
						</button>
					{/if}
					<button
						type="button"
						onclick={() => (showAnchors = !showAnchors)}
						class="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium transition-colors {showAnchors
							? 'bg-warn/10 text-warn-strong'
							: 'text-fg-subtle hover:bg-surface-2'}"
						title="Toggle anchors (X)"
					>
						{#if showAnchors}<Eye class="size-3.5" />{:else}<EyeOff class="size-3.5" />{/if}
						Anchors
					</button>
					<button
						type="button"
						onclick={() => (showOnion = !showOnion)}
						class="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium transition-colors {showOnion
							? 'bg-fg/10 text-fg'
							: 'text-fg-subtle hover:bg-surface-2'}"
						title="Onion-skin previous/next glyph (O)"
					>
						{#if showOnion}<Eye class="size-3.5" />{:else}<EyeOff class="size-3.5" />{/if}
						Onion
					</button>
					<button
						type="button"
						onclick={() => (snapToMetrics = !snapToMetrics)}
						class="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium transition-colors {snapToMetrics
							? 'bg-fg/10 text-fg'
							: 'text-fg-subtle hover:bg-surface-2'}"
						title="Snap to metrics while editing points"
					>
						Snap
					</button>
					<button
						type="button"
						onclick={() => (showSketch = !showSketch)}
						class="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium transition-colors {showSketch
							? 'bg-warn/10 text-warn-strong'
							: 'text-fg-subtle hover:bg-surface-2'}"
						title="Toggle sketch layer (S)"
					>
						{#if showSketch}<Eye class="size-3.5" />{:else}<EyeOff class="size-3.5" />{/if}
						Sketch
					</button>
					<button
						type="button"
						onclick={() => (showVector = !showVector)}
						class="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium transition-colors {showVector
							? 'bg-accent/10 text-accent-strong'
							: 'text-fg-subtle hover:bg-surface-2'}"
						title="Toggle vector layer (V)"
					>
						{#if showVector}<Eye class="size-3.5" />{:else}<EyeOff class="size-3.5" />{/if}
						Vector
					</button>
					<button
						type="button"
						onclick={() => (showGrid = !showGrid)}
						class="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium transition-colors {showGrid
							? 'bg-fg/10 text-fg'
							: 'text-fg-subtle hover:bg-surface-2'}"
						title="Toggle grid (G)"
					>
						<Grid3x3 class="size-3.5" />
						Grid
					</button>
					<button
						type="button"
						onclick={() => (showAnatomy = !showAnatomy)}
						class="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium transition-colors {showAnatomy
							? 'bg-fg/10 text-fg'
							: 'text-fg-subtle hover:bg-surface-2'}"
						title="Show overshoot zones for round glyphs"
					>
						<Eye class="size-3.5" />
						Overshoot
					</button>
					{#if hasMastersForGlyph}
						<button
							type="button"
							onclick={() => (vfPreviewOpen = !vfPreviewOpen)}
							class="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium transition-colors {vfPreviewOpen
								? 'bg-fg/10 text-fg'
								: 'text-fg-subtle hover:bg-surface-2'}"
							title="Live interpolation preview"
						>
							<Sliders class="size-3.5" />
							VF
						</button>
					{/if}
				</div>
			</div>

			{#if showBriefFirstHint && projectStore.project}
				<div
					class="flex items-center gap-3 border-b border-border bg-warn-soft/30 bg-warn/5 px-4 py-2 text-[12px] text-fg-muted"
				>
					<span class="font-medium text-warn">Before you draw →</span>
					<span>
						Type design is system design. Write a one-line intent and pick a use case
						or two — it'll guide every decision below.
					</span>
					<a
						href="/project/{projectStore.project.id}/brief"
						class="ml-auto rounded border border-warn/40 bg-warn/10 px-2 py-0.5 text-[11px] font-medium text-warn-strong hover:bg-warn/15"
					>
						Open Brief →
					</a>
				</div>
			{/if}

			<!-- Onboarding control-glyph hint -->
			{#if showControlHint}
				<div
					class="flex items-center gap-3 border-b border-border bg-accent-soft/30 px-4 py-2 text-[12px] text-fg-muted"
				>
					<span class="font-medium text-accent">Start here →</span>
					<span>Draw these {controlMissing.length} first; they set proportion + texture for everything else.</span>
					<div class="ml-auto flex flex-wrap items-center gap-1">
						{#each controlMissing as cp (cp)}
							<button
								type="button"
								onclick={() => projectStore.selectGlyph(cp)}
								class="flex h-6 min-w-6 items-center justify-center rounded border border-border bg-surface px-1 text-[13px] font-medium hover:border-accent hover:bg-accent-soft"
								title="Jump to {String.fromCodePoint(cp)}"
							>
								{String.fromCodePoint(cp)}
							</button>
						{/each}
					</div>
				</div>
			{:else if showSuggestedNext}
				<div
					class="flex items-center gap-3 border-b border-border bg-accent-soft/20 px-4 py-2 text-[12px] text-fg-muted"
				>
					<span class="font-medium text-accent">Suggested next →</span>
					<span>
						Priority picks based on your Brief use cases ({(projectStore.project?.brief
							?.useCases ?? []).join(', ') || 'defaults'}).
					</span>
					<div class="ml-auto flex flex-wrap items-center gap-1">
						{#each suggestedNext as cp (cp)}
							{@const ch =
								cp > 0x20 && cp < 0x10000 ? String.fromCodePoint(cp) : '?'}
							<button
								type="button"
								onclick={() => projectStore.selectGlyph(cp)}
								class="flex h-6 min-w-6 items-center justify-center rounded border border-border bg-surface px-1 text-[13px] font-medium hover:border-accent hover:bg-accent-soft"
								title="Jump to U+{cp.toString(16).toUpperCase().padStart(4, '0')}"
							>
								{ch}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Canvas area -->
			<div
				class="relative min-h-0 flex-1 overflow-hidden bg-canvas p-6 {canvasDragActive
					? 'ring-2 ring-accent ring-inset'
					: ''}"
				ondragenter={onCanvasDragEnter}
				ondragleave={onCanvasDragLeave}
				ondragover={onCanvasDragOver}
				ondrop={onCanvasDrop}
				role="application"
			>
				{#if canvasDragActive}
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
						onionPrev={onionGlyphs.prev}
						onionNext={onionGlyphs.next}
						{snapToMetrics}
						{showAnchors}
						{resetSignal}
						onSketchChange={handleSketchChange}
						onContoursChange={handleContoursChange}
						onAnchorsChange={handleAnchorsChange}
						onZoomChange={(p) => (zoomPercent = p)}
					/>
				</div>
			</div>

			{#if hasMastersForGlyph && vfPreviewOpen && interpolatedContours}
				<div class="border-t border-border bg-surface-2/40 px-4 py-2">
					<div class="mb-1.5 flex items-center justify-between">
						<span class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
							Live interpolation
						</span>
						<button
							type="button"
							onclick={() => (vfPreviewOpen = false)}
							class="text-[10px] text-fg-subtle hover:text-fg"
						>
							Hide
						</button>
					</div>
					<div class="flex items-center gap-3">
						<div class="shrink-0 rounded border border-border bg-canvas p-2">
							<svg
								viewBox="0 {metrics?.descender ?? -200} {Math.max(glyph.advanceWidth, 200)} {(metrics?.ascender ?? 800) - (metrics?.descender ?? -200)}"
								width="80"
								height="80"
								preserveAspectRatio="xMidYMid meet"
								style="transform: scaleY(-1);"
							>
								<path
									d={contoursToSvgPath(interpolatedContours)}
									fill="currentColor"
									fill-rule="evenodd"
								/>
							</svg>
						</div>
						<div class="flex-1 grid gap-1.5">
							{#each projectStore.project?.axes ?? [] as axis (axis.tag)}
								<label class="grid grid-cols-[60px_1fr_50px] items-center gap-2 text-[11px]">
									<span class="font-mono text-fg-muted">{axis.tag}</span>
									<input
										type="range"
										min={axis.minimum}
										max={axis.maximum}
										step={(axis.maximum - axis.minimum) / 200 || 1}
										value={vfAxisValues[axis.tag] ?? axis.default}
										oninput={(e) =>
											(vfAxisValues = {
												...vfAxisValues,
												[axis.tag]: Number(e.currentTarget.value)
											})}
										class="h-1 accent-accent"
									/>
									<span class="text-right font-mono text-fg-subtle" data-numeric>
										{Math.round(vfAxisValues[axis.tag] ?? axis.default)}
									</span>
								</label>
							{/each}
						</div>
					</div>
				</div>
			{/if}

			{#if mastersStripGlyphs.length > 1}
				<div class="flex items-center gap-2 border-t border-border bg-surface-2/40 px-4 py-2 overflow-x-auto">
					<span class="shrink-0 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
						Masters
					</span>
					{#each mastersStripGlyphs as item (item.id ?? 'default')}
						{@const isActive = (projectStore.selectedMasterId ?? '') === (item.id ?? '')}
						<button
							type="button"
							onclick={() => projectStore.selectMaster(item.id)}
							class="relative flex shrink-0 flex-col items-center gap-0.5 rounded border px-2 py-1 transition-colors {isActive
								? 'border-accent bg-accent-soft'
								: item.compatible
									? 'border-border bg-surface hover:border-accent/50'
									: 'border-danger/60 bg-surface hover:border-danger'}"
							title={item.compatible
								? `Switch to ${item.name}`
								: `${item.name} — contour/point counts don't match Default. Sync from Default to fix.`}
						>
							{#if !item.compatible}
								<span
									class="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-danger"
									aria-label="Incompatible"
								></span>
							{/if}
							<svg
								viewBox="0 {metrics?.descender ?? -200} {Math.max(item.glyph?.advanceWidth ?? 100, 100)} {(metrics?.ascender ?? 800) - (metrics?.descender ?? -200)}"
								width="40"
								height="40"
								preserveAspectRatio="xMidYMid meet"
								style="transform: scaleY(-1);"
								aria-hidden="true"
							>
								{#if item.glyph && item.glyph.contours.length > 0}
									<path
										d={contoursToSvgPath(item.glyph.contours)}
										fill="currentColor"
										fill-rule="evenodd"
									/>
								{/if}
							</svg>
							<span class="text-[10px] font-medium {isActive ? 'text-accent' : 'text-fg-muted'}">
								{item.name}
							</span>
						</button>
					{/each}
				</div>
			{/if}

			<!-- Bottom strips (live preview + action bar). Collapsible via the
			     chevron to claw back ~170px of canvas height when zoomed in.
			     State persists in localStorage. -->
			{#if bottomBarCollapsed}
				<button
					type="button"
					onclick={toggleBottomBar}
					class="flex items-center justify-between gap-2 border-t border-border bg-surface px-4 py-1.5 text-[11px] text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
					title="Expand the live preview + action bar"
				>
					<span class="inline-flex items-center gap-2">
						<ChevronUp class="size-3.5" />
						<span>Live preview · actions</span>
					</span>
					<span class="font-mono text-[10px] text-fg-subtle" data-numeric>
						Show ↑
					</span>
				</button>
			{:else}
				<!-- Live text strip (FontLab-style metrics window) -->
				<div class="flex flex-col gap-1.5 border-t border-border bg-surface px-4 py-2.5">
					<div class="flex items-center gap-3">
						<input
							type="text"
							bind:value={metricsText}
							placeholder="Type to preview…"
							class="h-7 flex-1 rounded-md border border-border bg-surface-2 px-2 text-[12px] text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
						/>
						<label class="flex items-center gap-1.5">
							<span class="text-[11px] text-fg-muted">Size</span>
							<input
								type="range"
								min={24}
								max={200}
								step={4}
								bind:value={metricsSize}
								class="h-1 w-24 accent-fg"
								aria-label="Metrics preview size"
							/>
							<span class="w-8 text-[11px] text-fg-subtle" data-numeric>{metricsSize}</span>
						</label>
						<button
							type="button"
							onclick={toggleBottomBar}
							class="inline-flex size-6 items-center justify-center rounded text-fg-subtle hover:bg-surface-2 hover:text-fg"
							title="Collapse the live preview + action bar"
							aria-label="Collapse bottom bar"
						>
							<ChevronDown class="size-3.5" />
						</button>
					</div>
				<div
					class="preview-font max-h-[120px] overflow-x-auto overflow-y-hidden whitespace-nowrap leading-[1]"
					style="font-size: {metricsSize}px;"
				>
					{metricsText || ' '}
				</div>
			</div>

			<!-- Bottom action bar -->
			<div class="flex items-center gap-2 border-t border-border bg-surface px-4 py-2.5">
				<Button variant="primary" density="sm" onclick={trace} disabled={!glyph.sketch?.length}>
					{#snippet icon()}<Wand class="size-3.5" />{/snippet}
					Trace to vector (T)
				</Button>
				<Button
					variant="ghost"
					density="sm"
					onclick={undoLastStroke}
					disabled={!glyph.sketch?.length}
					aria-label="Undo last stroke"
				>
					{#snippet icon()}<RotateCcw class="size-3.5" />{/snippet}
					Undo stroke
				</Button>
				<Button
					variant="secondary"
					density="sm"
					onclick={autoSpace}
					disabled={glyph.contours.length === 0}
				>
					{#snippet icon()}<AlignHorizontalSpaceAround class="size-3.5" />{/snippet}
					Auto-space
				</Button>
				<Button
					variant="ghost"
					density="sm"
					onclick={copyGlyph}
					disabled={glyph.contours.length === 0}
					aria-label="Copy glyph (⌘⇧C)"
				>
					{#snippet icon()}<Copy class="size-3.5" />{/snippet}
					Copy
				</Button>
				<Button
					variant="ghost"
					density="sm"
					onclick={pasteGlyph}
					aria-label="Paste glyph (⌘⇧V)"
				>
					{#snippet icon()}<ClipboardPaste class="size-3.5" />{/snippet}
					Paste
				</Button>
				<div class="ml-auto flex items-center gap-2">
					<Button
						variant="ghost"
						density="sm"
						onclick={copyGlyphPath}
						disabled={glyph.contours.length === 0}
						aria-label="Copy SVG path attribute to clipboard"
					>
						{#snippet icon()}<Copy class="size-3.5" />{/snippet}
						Copy path
					</Button>
					<Button
						variant="ghost"
						density="sm"
						onclick={exportGlyphPng}
						disabled={glyph.contours.length === 0}
						aria-label="Export this glyph as PNG"
					>
						{#snippet icon()}<FileText class="size-3.5" />{/snippet}
						PNG
					</Button>
					<Button
						variant="ghost"
						density="sm"
						onclick={exportGlyphSvg}
						disabled={glyph.contours.length === 0}
						aria-label="Export this glyph as SVG"
					>
						{#snippet icon()}<FileText class="size-3.5" />{/snippet}
						Export SVG
					</Button>
					<Button
						variant="ghost"
						density="sm"
						onclick={clearSketch}
						disabled={!glyph.sketch?.length}
					>
						{#snippet icon()}<Trash2 class="size-3.5" />{/snippet}
						Clear sketch
					</Button>
					<Button
						variant="ghost"
						density="sm"
						onclick={clearVector}
						disabled={glyph.contours.length === 0}
					>
						{#snippet icon()}<Trash2 class="size-3.5" />{/snippet}
						Clear vector
					</Button>
				</div>
			</div>
			{/if}
		</div>

		<!-- Right properties panel — block layout (no flex) with overflow-y
		     on the aside itself, so the 13 stacked section divs (Glyph /
		     Metrics / Status / Live preview / Audit / …) scroll naturally
		     instead of getting clipped past the viewport. -->
		<aside class="h-full overflow-y-auto border-l border-border bg-surface">
			<div class="border-b border-border p-4">
				<h3 class="mb-3 flex items-center justify-between text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					<span>Glyph</span>
					{#if projectStore.selectedMasterId}
						<button
							type="button"
							onclick={() => {
								if (!projectStore.selectedMasterId) return;
								if (
									confirm(
										'Replace this glyph in the active master with a copy of the default master? This is the canonical fix when point counts diverge.'
									)
								) {
									projectStore.syncGlyphFromDefault(
										glyph.codepoint,
										projectStore.selectedMasterId
									);
									toast.success('Synced from default master');
								}
							}}
							class="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-fg-muted hover:border-accent hover:text-accent"
							title="Copy contours/metrics from the default master into this master"
						>
							Sync from Default
						</button>
					{/if}
				</h3>
				<Field label="Name">
					<Input
						density="sm"
						value={glyph.name}
						onchange={(e) => projectStore.renameGlyph(glyph.codepoint, e.currentTarget.value)}
						class="font-mono text-[12px]"
					/>
				</Field>
				{#if anatomyTip}
					<div class="mt-2 flex items-start gap-2 rounded-md border border-warn/30 bg-warn/5 px-2 py-1.5">
						<Lightbulb class="mt-0.5 size-3 shrink-0 text-warn" />
						<div class="min-w-0">
							<div class="text-[11px] font-semibold text-fg">{anatomyTip.headline}</div>
							<div class="text-[11px] leading-snug text-fg-muted">{anatomyTip.body}</div>
						</div>
					</div>
				{/if}
				<dl class="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
					<dt class="text-fg-subtle">Contours</dt>
					<dd class="text-right font-mono text-fg" data-numeric>{glyphStats.contours}</dd>
					<dt class="text-fg-subtle">Points</dt>
					<dd class="text-right font-mono text-fg" data-numeric>{glyphStats.points}</dd>
					<dt class="text-fg-subtle">Width × Height</dt>
					<dd class="text-right font-mono text-fg" data-numeric>
						{glyphStats.width} × {glyphStats.height}
					</dd>
					<dt class="text-fg-subtle">BBox X</dt>
					<dd class="text-right font-mono text-fg" data-numeric>
						{glyphStats.minX} → {glyphStats.maxX}
					</dd>
					<dt class="text-fg-subtle">BBox Y</dt>
					<dd class="text-right font-mono text-fg" data-numeric>
						{glyphStats.minY} → {glyphStats.maxY}
					</dd>
				</dl>
				{#if peerComparison}
					<div
						class="mt-2 rounded border border-border bg-surface-2/40 px-2 py-1.5 text-[11px] text-fg-muted"
					>
						vs peers (n={peerComparison.peerCount}): median adv
						<span class="font-mono text-fg" data-numeric>{peerComparison.medianAdv}</span>
						·
						<span
							class="font-mono {peerComparison.pct > 25 ? 'text-warn' : 'text-fg'}"
							data-numeric
						>
							{peerComparison.diff > 0 ? '+' : ''}{peerComparison.diff} ({peerComparison.pct}%)
						</span>
					</div>
				{/if}
			</div>

			<div class="border-b border-border p-4">
				<h3 class="mb-3 flex items-center justify-between text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					<span class="inline-flex items-center gap-1.5">
						Metrics
						<button
							type="button"
							onclick={() =>
								projectStore.updateGlyph(glyph.codepoint, (g) => ({
									...g,
									metricsLocked: !g.metricsLocked
								}))}
							class="rounded p-0.5 text-fg-subtle hover:bg-surface-2 {glyph.metricsLocked
								? 'text-warn'
								: 'hover:text-fg'}"
							aria-label={glyph.metricsLocked ? 'Unlock metrics' : 'Lock metrics'}
							title={glyph.metricsLocked
								? 'Unlock — allow LSB/RSB/Adv edits'
								: 'Lock — prevent accidental LSB/RSB/Adv edits'}
						>
							{#if glyph.metricsLocked}
								<Lock class="size-3" />
							{:else}
								<Unlock class="size-3" />
							{/if}
						</button>
					</span>
					<select
						value=""
						disabled={glyph.metricsLocked}
						onchange={(e) => copyMetricsFrom(Number(e.currentTarget.value))}
						class="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-fg-muted hover:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-40"
						title="Copy LSB / RSB / advance from another glyph"
					>
						<option value="" disabled selected>Copy from…</option>
						{#each copyableMetricSources as g (g.codepoint)}
							<option value={g.codepoint}
								>{g.name} · {g.advanceWidth}/{g.leftSidebearing}/{g.rightSidebearing}</option
							>
						{/each}
					</select>
				</h3>
				<div class="grid grid-cols-3 gap-2">
					<Field label="Adv">
						<Input
							type="number"
							density="sm"
							value={glyph.advanceWidth}
							disabled={glyph.metricsLocked}
							onchange={(e) =>
								projectStore.updateGlyph(glyph.codepoint, (g) => ({
									...g,
									advanceWidth: Number(e.currentTarget.value)
								}))}
						/>
					</Field>
					<Field label="LSB">
						<Input
							type="number"
							density="sm"
							value={glyph.leftSidebearing}
							disabled={glyph.metricsLocked}
							onchange={(e) =>
								projectStore.updateGlyph(glyph.codepoint, (g) => ({
									...g,
									leftSidebearing: Number(e.currentTarget.value)
								}))}
						/>
					</Field>
					<Field label="RSB">
						<Input
							type="number"
							density="sm"
							value={glyph.rightSidebearing}
							disabled={glyph.metricsLocked}
							onchange={(e) =>
								projectStore.updateGlyph(glyph.codepoint, (g) => ({
									...g,
									rightSidebearing: Number(e.currentTarget.value)
								}))}
						/>
					</Field>
				</div>
				{#if spacingSuggestion}
					<button
						type="button"
						onclick={applySpacingSuggestion}
						class="mt-2 flex w-full items-center gap-1.5 rounded border border-dashed border-accent/40 bg-accent-soft/30 px-2 py-1.5 text-left text-[11px] text-fg-muted hover:border-accent hover:bg-accent-soft"
						title="Apply suggested LSB/RSB from a similar-width peer"
					>
						<span>Match peer</span>
						<span class="preview-font text-fg">{spacingSuggestion.peerChar}</span>
						<span class="ml-auto font-mono text-accent" data-numeric>
							{spacingSuggestion.lsb} / {spacingSuggestion.rsb}
						</span>
					</button>
				{/if}
			</div>

			<div class="border-b border-border p-4">
				<h3 class="mb-3 flex items-center justify-between text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					<span>Status</span>
					<div class="flex items-center gap-0.5">
						<button
							type="button"
							onclick={() => {
								if (!glyph) return;
								if (
									confirm(
										`Reset glyph "${glyph.name}" to empty? Clears outlines, sketches, components, anchors, notes, and the reference image.`
									)
								) {
									const name = glyph.name;
									projectStore.resetGlyph(glyph.codepoint);
									toast.warn(`Reset "${name}" — ⌘Z to undo`, 4000);
								}
							}}
							class="rounded p-0.5 text-fg-subtle hover:bg-warn/10 hover:text-warn-strong"
							aria-label="Reset glyph to empty"
							title="Reset glyph (keep its slot but wipe data)"
						>
							<RotateCcw class="size-3" />
						</button>
						<button
							type="button"
							onclick={() => {
								if (!glyph) return;
								if (
									confirm(
										`Remove glyph "${glyph.name}" from the font? Any kerning references will also be dropped.`
									)
								) {
									const name = glyph.name;
									projectStore.removeGlyph(glyph.codepoint);
									toast.warn(`Removed "${name}" — ⌘Z to undo`, 4000);
								}
							}}
							class="rounded p-0.5 text-fg-subtle hover:bg-danger/10 hover:text-danger-strong"
							aria-label="Delete glyph"
							title="Remove this glyph from the font"
						>
							<Trash2 class="size-3" />
						</button>
					</div>
				</h3>
				<div class="grid grid-cols-2 gap-1">
					{#each ['empty', 'sketch', 'draft', 'final'] as const as status (status)}
						<button
							type="button"
							class="rounded-md border px-2 py-1.5 text-[12px] font-medium capitalize transition-colors {glyph.status ===
							status
								? 'border-accent bg-accent-soft text-accent-strong'
								: 'border-border bg-transparent text-fg-muted hover:bg-surface-2'}"
							onclick={() =>
								projectStore.updateGlyph(glyph.codepoint, (g) => ({ ...g, status }))}
						>
							{status}
						</button>
					{/each}
				</div>
			</div>

			<div class="border-b border-border p-4">
				<h3 class="mb-3 flex items-center justify-between text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					<span>Anchors</span>
					<span class="text-fg-subtle" data-numeric>{glyph.anchors?.length ?? 0}</span>
				</h3>
				{#if glyph.anchors && glyph.anchors.length > 0}
					<ul class="mb-2 grid gap-1">
						{#each glyph.anchors as a (a.name)}
							<li
								class="flex items-center justify-between gap-2 rounded-md border border-border bg-surface-2/40 px-2 py-1.5 text-[12px]"
							>
								<span class="font-mono text-warn">{a.name}</span>
								<span class="text-fg-subtle" data-numeric>{a.x}, {a.y}</span>
								<button
									type="button"
									onclick={() => removeAnchor(a.name)}
									class="rounded p-0.5 text-fg-subtle hover:bg-danger/10 hover:text-danger-strong"
									aria-label="Remove anchor {a.name}"
									title="Remove anchor {a.name}"
								>
									<Trash2 class="size-3" />
								</button>
							</li>
						{/each}
					</ul>
				{/if}
				<div class="flex flex-wrap gap-1.5">
					{#each ['top', 'bottom', '_top', '_bottom', 'ogonek'] as suggested (suggested)}
						{#if !glyph.anchors?.some((a) => a.name === suggested)}
							<button
								type="button"
								onclick={() => addAnchor(suggested)}
								class="rounded-md border border-dashed border-border-strong/50 bg-transparent px-2 py-1 font-mono text-[11px] text-fg-muted hover:border-warn hover:bg-warn/10 hover:text-warn-strong"
							>
								+ {suggested}
							</button>
						{/if}
					{/each}
				</div>
			</div>

			<ReferenceImagePanel />

			{#if glyph.contours.length === 0}
				<Accordion id="edit-templates" label="Templates" defaultOpen={false}>
					<p class="mb-2 text-[11px] text-fg-subtle">
						Start from a basic shape and refine in edit mode (A).
					</p>
					<div class="grid grid-cols-2 gap-1.5">
						<button
							type="button"
							onclick={() => insertTemplate('rect')}
							class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft"
						>
							Rectangle
						</button>
						<button
							type="button"
							onclick={() => insertTemplate('circle')}
							class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft"
						>
							Circle
						</button>
						<button
							type="button"
							onclick={() => insertTemplate('stem')}
							class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft"
						>
							Vertical stem
						</button>
						<button
							type="button"
							onclick={() => insertTemplate('crossbar')}
							class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft"
						>
							Horizontal bar
						</button>
					</div>
				</Accordion>
			{/if}

			{#if glyph.contours.length === 0 && drawnSources.length > 0}
				<Accordion id="edit-derive" label="Derive from another glyph" defaultOpen={false}>
					<p class="mb-2 text-[11px] text-fg-subtle">
						One-shot generate this glyph from one you've already drawn. Good for
						<code class="font-mono">b/d</code>, <code class="font-mono">p/q</code>,
						<code class="font-mono">n/u</code>.
					</p>
					<div class="grid grid-cols-2 gap-1.5">
						<select
							bind:value={deriveSourceCp}
							class="rounded border border-border bg-surface px-1.5 py-1 text-[11px] outline-none focus:border-accent"
						>
							<option value={null} disabled>Source glyph</option>
							{#each drawnSources as g (g.codepoint)}
								<option value={g.codepoint}>{g.name}</option>
							{/each}
						</select>
						<select
							bind:value={deriveTransform}
							class="rounded border border-border bg-surface px-1.5 py-1 text-[11px] outline-none focus:border-accent"
						>
							<option value="copy">Copy as-is</option>
							<option value="flipH">Flip horizontal</option>
							<option value="flipV">Flip vertical</option>
							<option value="rotate180">Rotate 180°</option>
						</select>
					</div>
					<button
						type="button"
						onclick={applyDerive}
						disabled={deriveSourceCp == null}
						class="mt-2 w-full rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40"
					>
						Generate
					</button>
				</Accordion>
			{/if}

			<CompositeEditor />

			<MetricsInspector />

			<RevisionsPanel />

			<StemsPanel />

			{#if usedByGlyphs.length > 0}
				<Accordion id="edit-usedby" label="Used by" defaultOpen={true}>
					{#snippet badge()}
						<span
							class="rounded bg-accent-soft px-1.5 py-0.5 font-mono text-[10px] text-accent-strong"
							data-numeric
						>
							{usedByGlyphs.length}
						</span>
					{/snippet}
					<p class="mb-2 text-[11px] text-fg-subtle">
						These composite glyphs reference this glyph. Edits here propagate.
					</p>
					<div class="flex flex-wrap gap-1">
						{#each usedByGlyphs as g (g.codepoint)}
							<button
								type="button"
								onclick={() => projectStore.selectGlyph(g.codepoint)}
								class="rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[12px] font-medium text-fg-muted hover:border-accent hover:text-accent"
								title={g.name}
							>
								{g.codepoint > 0x20 && g.codepoint < 0x10000
									? String.fromCodePoint(g.codepoint)
									: g.name}
							</button>
						{/each}
					</div>
				</Accordion>
			{/if}

			<Accordion id="edit-notes" label="Notes" defaultOpen={false}>
				<textarea
					value={glyph.notes ?? ''}
					oninput={(e) =>
						projectStore.updateGlyph(glyph.codepoint, (g) => ({
							...g,
							notes: e.currentTarget.value
						}))}
					placeholder="Design intent, todos, references…"
					rows="3"
					class="block w-full resize-y rounded-md border border-border bg-surface-2/40 px-2 py-1.5 text-[12px] text-fg outline-none focus:border-accent focus:bg-surface"
				></textarea>
			</Accordion>

			<Accordion id="edit-pathops" label="Path operations" defaultOpen={false}>
				<button
					type="button"
					onclick={autoCleanGlyph}
					disabled={glyph.contours.length === 0 || autoCleaning}
					class="mb-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-accent bg-accent text-accent-fg px-2 py-1.5 text-[11px] font-medium hover:bg-accent/90 disabled:opacity-40"
					title="Simplify + snap to 10u grid in one step"
				>
					<Wand class="size-3" />
					{autoCleaning ? 'Cleaning…' : 'Auto-clean glyph'}
				</button>
				<div class="mb-2 grid grid-cols-2 gap-1.5">
					<button
						type="button"
						onclick={() => applyPathOp('union')}
						disabled={glyph.contours.length < 2}
						class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40"
						title="Merge all contours into a single silhouette"
					>
						Union
					</button>
					<button
						type="button"
						onclick={() => applyPathOp('intersection')}
						disabled={glyph.contours.length < 2}
						class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40"
						title="Keep only the area common to all contours"
					>
						Intersect
					</button>
					<button
						type="button"
						onclick={() => applyPathOp('difference')}
						disabled={glyph.contours.length < 2}
						class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40"
						title="Subtract every contour after the first from the first"
					>
						Subtract
					</button>
					<button
						type="button"
						onclick={() => applyPathOp('xor')}
						disabled={glyph.contours.length < 2}
						class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40"
						title="Keep regions that belong to an odd number of contours"
					>
						Xor
					</button>
				</div>
				<button
					type="button"
					onclick={applySimplify}
					disabled={glyph.contours.length === 0 || simplifying}
					class="w-full rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40"
					title="Reduce noise: re-sample, Douglas-Peucker, then refit bezier curves"
				>
					{simplifying ? 'Simplifying…' : 'Simplify outline'}
				</button>
				<div class="mt-1.5 grid grid-cols-2 gap-1.5">
					<button
						type="button"
						onclick={() => snapAllPointsToGrid(10)}
						disabled={glyph.contours.length === 0}
						class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40"
						title="Round every point to the nearest 10 font units (cleanup)"
					>
						Snap 10u
					</button>
					<button
						type="button"
						onclick={reverseAllContours}
						disabled={glyph.contours.length === 0}
						class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40"
						title="Flip every contour's winding direction"
					>
						Reverse winding
					</button>
				</div>
				<h3 class="mb-2 mt-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					Transform
				</h3>
				<div class="grid grid-cols-2 gap-1.5">
					<button
						type="button"
						onclick={() => flipSelection('horizontal')}
						disabled={glyph.contours.length === 0}
						class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40"
					>
						Flip H
					</button>
					<button
						type="button"
						onclick={() => flipSelection('vertical')}
						disabled={glyph.contours.length === 0}
						class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40"
					>
						Flip V
					</button>
					<button
						type="button"
						onclick={() => scaleGlyph(1.05)}
						disabled={glyph.contours.length === 0}
						class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40"
					>
						Scale +5%
					</button>
					<button
						type="button"
						onclick={() => scaleGlyph(1 / 1.05)}
						disabled={glyph.contours.length === 0}
						class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40"
					>
						Scale −5%
					</button>
					<button
						type="button"
						onclick={makeSymmetric}
						disabled={glyph.leftSidebearing === glyph.rightSidebearing}
						class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40"
						title="Set LSB = RSB = average — useful for symmetric round glyphs (o, O, e)"
					>
						Symmetric LSB/RSB
					</button>
					<button
						type="button"
						onclick={centerHorizontally}
						disabled={glyph.contours.length === 0}
						class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40"
						title="Shift contours so the bbox centre matches advance/2"
					>
						Center in advance
					</button>
					<button
						type="button"
						onclick={() => alignVertically('baseline')}
						disabled={glyph.contours.length === 0}
						class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40"
						title="Shift contours so the bbox bottom sits on baseline"
					>
						Sit on baseline
					</button>
					<button
						type="button"
						onclick={() => alignVertically('capHeight')}
						disabled={glyph.contours.length === 0}
						class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40"
						title="Shift contours so the bbox top hits cap-height"
					>
						Top to cap
					</button>
					<button
						type="button"
						onclick={() => alignVertically('xHeight')}
						disabled={glyph.contours.length === 0}
						class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40"
						title="Shift contours so the bbox top hits x-height"
					>
						Top to x-height
					</button>
				</div>
			</Accordion>

			<Accordion id="edit-live-preview" label="Live preview" defaultOpen={true}>
				{#if glyph.contours.length > 0}
					<div
						class="rounded-md border border-border bg-canvas p-4 text-center text-6xl preview-font leading-none"
					>
						{charLabel === 'space' ? '·' : charLabel}
					</div>
				{:else}
					<!-- No contours yet — the project font would paint blank.
					     Render the codepoint in the system stack at low opacity
					     so the panel still tells you which letter you're on. -->
					<div
						class="rounded-md border border-dashed border-border bg-canvas p-4 text-center text-6xl leading-none text-fg-subtle"
						style="font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;"
						title="Draw contours to see the live preview"
					>
						{charLabel === 'space' ? '·' : charLabel}
					</div>
				{/if}
				<div class="mt-2 text-[11px] text-fg-subtle" data-numeric>
					{previewStore.glyphCount} glyphs · {previewStore.sizeKb.toFixed(1)} KB · {previewStore.lastBuildMs.toFixed(
						0
					)} ms
				</div>
				{#if previewStore.error}
					<div class="mt-2 rounded bg-danger/10 p-2 text-[11px] text-danger-strong">
						{previewStore.error}
					</div>
				{/if}
			</Accordion>

			{#if projectStore.project}
				{@const issues = sortBySeverity(auditGlyph(glyph, projectStore.project))}
				<Accordion id="edit-audit" label="Audit" defaultOpen={issues.length > 0}>
					{#snippet badge()}
						{#if issues.length > 0}
							<span
								class="rounded px-1.5 py-0.5 font-mono text-[10px] {issues[0].severity === 'error'
									? 'bg-danger/15 text-danger-strong'
									: issues[0].severity === 'warn'
										? 'bg-warn/15 text-warn-strong'
										: 'bg-surface-2 text-fg-muted'}"
								data-numeric
							>
								{issues.length}
							</span>
						{:else}
							<span
								class="rounded bg-success/15 px-1.5 py-0.5 font-mono text-[10px] text-success-strong"
							>
								ok
							</span>
						{/if}
					{/snippet}
					{#if issues.length === 0}
						<div class="flex items-center gap-2 rounded-md bg-success/10 px-2.5 py-2 text-[12px] text-success-strong">
							<CheckCircle2 class="size-3.5" />
							No issues
						</div>
					{:else}
						<ul class="grid gap-1">
							{#each issues as issue (issue.code)}
								<li
									class="flex items-start gap-2 rounded-md px-2.5 py-1.5 text-[11px] {issue.severity ===
									'error'
										? 'bg-danger/10 text-danger-strong'
										: issue.severity === 'warn'
											? 'bg-warn/10 text-warn-strong'
											: 'bg-surface-2 text-fg-muted'}"
								>
									<AlertCircle class="mt-0.5 size-3 shrink-0" />
									<span>{issue.message}</span>
								</li>
							{/each}
						</ul>
					{/if}
				</Accordion>
			{/if}

			<Accordion id="edit-brush" label="Brush & trace" defaultOpen={false}>
				<div class="grid gap-3">
					<label class="grid gap-1.5">
						<span class="flex items-center justify-between text-[11px] text-fg-muted">
							<span>Thinning (pressure)</span>
							<span data-numeric>{strokeThinning.toFixed(2)}</span>
						</span>
						<input
							type="range"
							min={0}
							max={1}
							step={0.05}
							bind:value={strokeThinning}
							class="h-1 accent-fg"
						/>
					</label>
					<label class="flex items-center justify-between gap-2 rounded-md bg-surface-2 px-3 py-2">
						<div class="grid leading-tight">
							<span class="text-[11px] font-medium text-fg">Cubic curves</span>
							<span class="text-[10px] text-fg-subtle"
								>Schneider fit for smooth outlines</span
							>
						</div>
						<input
							type="checkbox"
							bind:checked={cubicTrace}
							class="size-4 accent-fg"
						/>
					</label>
					{#if cubicTrace}
						<label class="grid gap-1.5">
							<span class="flex items-center justify-between text-[11px] text-fg-muted">
								<span>Curve precision</span>
								<span data-numeric>{cubicMaxError}</span>
							</span>
							<input
								type="range"
								min={10}
								max={300}
								step={5}
								bind:value={cubicMaxError}
								class="h-1 accent-fg"
							/>
						</label>
					{:else}
						<label class="grid gap-1.5">
							<span class="flex items-center justify-between text-[11px] text-fg-muted">
								<span>Smoothness (Chaikin)</span>
								<span data-numeric>{smoothness}</span>
							</span>
							<input
								type="range"
								min={0}
								max={3}
								step={1}
								bind:value={smoothness}
								class="h-1 accent-fg"
							/>
						</label>
					{/if}
				</div>
			</Accordion>

			<!-- Color layers — color-fonts M1 day-8. Per-glyph stack of
			     ColorLayers; bottom-up render order. Active palette swatches
			     come from the project's `default` palette. -->
			{#if projectStore.project}
				{@const activePalette = defaultPalette(projectStore.project.palettes)}
				{@const layers = glyph.colorLayers ?? []}
				<div class="border-b border-border p-4">
					<h3 class="mb-3 flex items-center justify-between text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
						<span>Color layers</span>
						{#if layers.length > 0}
							<span class="font-mono text-[10px] text-fg-subtle" data-numeric>
								{layers.length}
							</span>
						{/if}
					</h3>

					{#if !activePalette}
						<div class="rounded-md border border-dashed border-border bg-surface-2/30 px-3 py-2.5 text-[11px] text-fg-subtle">
							No palettes yet. Create one on the
							<a
								href="/project/{projectStore.project.id}/features"
								class="underline-offset-2 hover:underline hover:text-fg"
							>
								Features tab
							</a>
							to start layering colors.
						</div>
					{:else}
						<button
							type="button"
							onclick={() => {
								if (!activePalette) return;
								// Copy the current monochrome contours into a fresh layer
								// — most common workflow: draw, layer, recolor, draw next.
								const newLayer = createColorLayer(
									glyph.contours,
									0,
									`Layer ${layers.length + 1}`
								);
								projectStore.addColorLayer(glyph.codepoint, newLayer);
							}}
							class="mb-2 w-full rounded-md border border-dashed border-border bg-surface-2/30 px-2 py-1.5 text-[11px] font-medium text-fg-muted transition-colors hover:border-accent hover:text-accent"
						>
							+ Add layer from current contours
						</button>

						{#if layers.length === 0}
							<p class="text-[11px] leading-snug text-fg-subtle">
								No layers yet. Click "Add layer" — copies the monochrome
								outline into a new layer; pick a palette colour from the
								row below.
							</p>
						{:else}
							<ol class="grid gap-1.5">
								{#each layers as l, idx (l.id)}
									{@const color = activePalette.colors[l.paletteIndex]}
									<li
										class="grid grid-cols-[auto_auto_1fr_auto] items-center gap-2 rounded-md border border-border bg-surface-2/30 px-2 py-1.5 text-[11px]"
									>
										<span
											class="size-4 shrink-0 rounded border border-border"
											style="background: {color
												? rgbaToCss(color)
												: 'transparent'};"
											title="Palette index {l.paletteIndex}"
										></span>
										<button
											type="button"
											onclick={() =>
												projectStore.updateColorLayer(
													glyph.codepoint,
													l.id,
													(layer: ColorLayer) => ({ ...layer, hidden: !layer.hidden })
												)}
											class="font-mono text-[10px] {l.hidden
												? 'text-fg-subtle'
												: 'text-fg'} hover:text-accent"
											aria-label={l.hidden ? 'Show layer' : 'Hide layer'}
											title={l.hidden ? 'Show layer' : 'Hide layer'}
										>
											{l.hidden ? '○' : '●'}
										</button>
										<select
											value={l.paletteIndex}
											onchange={(e) =>
												projectStore.updateColorLayer(
													glyph.codepoint,
													l.id,
													(layer: ColorLayer) => ({
														...layer,
														paletteIndex: Number(e.currentTarget.value)
													})
												)}
											class="rounded border border-border bg-surface px-1 py-0 font-mono text-[10px] text-fg outline-none focus:border-accent"
											aria-label="Palette colour for layer {idx}"
										>
											{#each activePalette.colors as _c, i (i)}
												<option value={i}>{i}</option>
											{/each}
										</select>
										<button
											type="button"
											onclick={() =>
												projectStore.removeColorLayer(glyph.codepoint, l.id)}
											class="rounded p-0.5 text-fg-subtle hover:bg-warn/10 hover:text-warn-strong"
											aria-label="Delete layer"
											title="Delete layer"
										>
											<span class="font-mono text-[12px]">×</span>
										</button>
									</li>
								{/each}
							</ol>
						{/if}
					{/if}
				</div>
			{/if}

			<div class="mt-auto p-4 text-[11px] text-fg-subtle">
				<p class="mb-1 font-medium">Shortcuts</p>
				<ul class="grid gap-0.5" data-numeric>
					<li>[ ]<span class="ml-2 text-fg-muted">prev/next glyph</span></li>
					<li>P E A<span class="ml-2 text-fg-muted">pencil / eraser / edit points</span></li>
					<li>S V G R O<span class="ml-2 text-fg-muted">sketch / vector / grid / ref / onion</span></li>
					<li>T<span class="ml-2 text-fg-muted">trace to vector</span></li>
					<li>Shift-click<span class="ml-2 text-fg-muted">add to selection</span></li>
					<li>Drag empty<span class="ml-2 text-fg-muted">marquee select</span></li>
					<li>Arrows<span class="ml-2 text-fg-muted">nudge selected (Shift = ×10)</span></li>
					<li>Del<span class="ml-2 text-fg-muted">delete selected points</span></li>
					<li>Space-drag<span class="ml-2 text-fg-muted">pan</span></li>
					<li>Wheel<span class="ml-2 text-fg-muted">zoom</span></li>
					<li>⌘0<span class="ml-2 text-fg-muted">fit to glyph</span></li>
					<li>⌘Z / ⌘⇧Z<span class="ml-2 text-fg-muted">undo / redo</span></li>
					<li>⌘⇧C / ⌘⇧V<span class="ml-2 text-fg-muted">copy / paste glyph</span></li>
				</ul>
			</div>
		</aside>
	</div>
	<EditorTour open={tourOpen} onclose={() => (tourOpen = false)} />

{/if}
