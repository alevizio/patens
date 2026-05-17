<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { previewStore } from '$lib/stores/preview.svelte';
	import DrawingCanvas from '$lib/drawing/DrawingCanvas.svelte';
	import { DEFAULT_STROKE, DEFAULT_TRACE, sketchToContours } from '$lib/font/sketch-to-bezier';
	import type { Anchor, BezierContour, SketchStroke } from '$lib/font/types';
	import { glyphBounds } from '$lib/font/path';
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
	import Keyboard from '@lucide/svelte/icons/keyboard';
	import Pin from '@lucide/svelte/icons/pin';
	import Copy from '@lucide/svelte/icons/copy';
	import ClipboardPaste from '@lucide/svelte/icons/clipboard-paste';
	import EditorTour from '$lib/ui/EditorTour.svelte';
	import CompositeEditor from '$lib/glyph/CompositeEditor.svelte';
	import ReferenceImagePanel from '$lib/glyph/ReferenceImagePanel.svelte';
	import CommandPalette from '$lib/ui/CommandPalette.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { copyGlyphToClipboard, readGlyphFromClipboard } from '$lib/stores/clipboard.svelte';

	let tool = $state<'pencil' | 'eraser' | 'edit'>('pencil');
	let strokeSize = $state(DEFAULT_STROKE.size);
	let strokeThinning = $state(DEFAULT_STROKE.thinning);
	let smoothness = $state(1);
	let cubicTrace = $state(DEFAULT_TRACE.cubic);
	let cubicMaxError = $state(DEFAULT_TRACE.cubicMaxError);
	let tourOpen = $state(false);
	let shortcutsOpen = $state(false);
	let paletteOpen = $state(false);

	const SHORTCUTS: Array<{ group: string; items: Array<{ keys: string; label: string }> }> = [
		{
			group: 'Tools',
			items: [
				{ keys: 'P', label: 'Pencil' },
				{ keys: 'E', label: 'Eraser' },
				{ keys: 'A', label: 'Edit points' },
				{ keys: 'T', label: 'Trace sketch to vector' }
			]
		},
		{
			group: 'Navigation',
			items: [
				{ keys: '[', label: 'Previous glyph' },
				{ keys: ']', label: 'Next glyph' },
				{ keys: '/', label: 'Open glyph palette' },
				{ keys: '⌘K / Ctrl+K', label: 'Open glyph palette' }
			]
		},
		{
			group: 'Layers',
			items: [
				{ keys: 'S', label: 'Toggle sketch layer' },
				{ keys: 'V', label: 'Toggle vector layer' },
				{ keys: 'G', label: 'Toggle grid' },
				{ keys: 'R', label: 'Toggle reference glyph' },
				{ keys: 'O', label: 'Toggle onion-skin neighbours' },
				{ keys: 'X', label: 'Toggle anchors' }
			]
		},
		{
			group: 'History',
			items: [
				{ keys: '⌘Z / Ctrl+Z', label: 'Undo' },
				{ keys: '⌘⇧Z / Ctrl+Y', label: 'Redo' }
			]
		},
		{
			group: 'Clipboard',
			items: [
				{ keys: '⌘⇧C', label: 'Copy glyph' },
				{ keys: '⌘⇧V', label: 'Paste glyph' }
			]
		},
		{
			group: 'Help',
			items: [
				{ keys: '?', label: 'Show this cheat sheet' }
			]
		}
	];

	$effect(() => {
		// Auto-open the tour the first time someone visits the editor.
		if (!settings.editorTourDismissed) {
			setTimeout(() => (tourOpen = true), 600);
		}
	});
	let showSketch = $state(true);
	let showVector = $state(true);
	let showGrid = $state(false);
	let showReference = $state(true);
	let showOnion = $state(true);
	let showAnchors = $state(true);
	let snapToMetrics = $state(true);
	let zoomPercent = $state(100);
	let resetSignal = $state(0);
	let metricsText = $state('Hamburgevons');
	let metricsSize = $state(96);

	const strokeStyle = $derived({
		...DEFAULT_STROKE,
		size: strokeSize,
		thinning: strokeThinning
	});

	const glyph = $derived(projectStore.selectedGlyph);
	const metrics = $derived(projectStore.project?.metrics);

	const countPathPoints = (commands: BezierContour['commands']) =>
		commands.filter((c) => c.type === 'M' || c.type === 'L' || c.type === 'C' || c.type === 'Q')
			.length;

	const usedByGlyphs = $derived.by(() => {
		if (!projectStore.project || !glyph) return [];
		return Object.values(projectStore.project.glyphs).filter((g) =>
			(g.components ?? []).some((c) => c.baseCodepoint === glyph.codepoint)
		);
	});

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
	};

	const pasteGlyph = async () => {
		if (!glyph) return;
		const payload = await readGlyphFromClipboard();
		if (!payload) {
			alert('Clipboard does not contain a Font Studio glyph.');
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
	};

	const applyPathOp = (op: PathOp) => {
		if (!glyph || glyph.contours.length < 2) return;
		const next = booleanContours(glyph.contours, op);
		if (next.length === 0) return;
		projectStore.updateGlyph(glyph.codepoint, (g) => ({ ...g, contours: next }));
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
		const codepoints = Object.keys(projectStore.project?.glyphs ?? {})
			.map(Number)
			.sort((a, b) => a - b);
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
		} else if (ev.key === 'r' || ev.key === 'R') {
			showReference = !showReference;
		} else if (ev.key === 'o' || ev.key === 'O') {
			showOnion = !showOnion;
		} else if (ev.key === 'x' || ev.key === 'X') {
			showAnchors = !showAnchors;
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
		} else if (ev.key === '?' || (ev.key === '/' && ev.shiftKey)) {
			ev.preventDefault();
			shortcutsOpen = !shortcutsOpen;
		} else if (ev.key === '/' && !ev.shiftKey && !ev.metaKey && !ev.ctrlKey) {
			ev.preventDefault();
			paletteOpen = true;
		} else if ((ev.key === 'k' || ev.key === 'K') && (ev.metaKey || ev.ctrlKey)) {
			ev.preventDefault();
			paletteOpen = true;
		} else if (ev.key === 'Escape') {
			if (shortcutsOpen) shortcutsOpen = false;
			if (paletteOpen) paletteOpen = false;
		}
	};
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if !glyph || !metrics}
	<div class="flex h-full items-center justify-center text-fg-muted">Loading glyph…</div>
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
						onclick={() => (shortcutsOpen = true)}
						class="inline-flex h-7 w-7 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
						title="Keyboard shortcuts (?)"
						aria-label="Keyboard shortcuts"
					>
						<Keyboard class="size-3.5" />
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
					<button
						type="button"
						onclick={() => (showAnchors = !showAnchors)}
						class="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium transition-colors {showAnchors
							? 'bg-warn/10 text-warn'
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
							? 'bg-warn/10 text-warn'
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
							? 'bg-accent/10 text-accent'
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
				</div>
			</div>

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
			{/if}

			<!-- Canvas area -->
			<div class="relative min-h-0 flex-1 overflow-hidden bg-canvas p-6">
				<div class="absolute inset-6 grid place-items-stretch">
					<DrawingCanvas
						{glyph}
						{metrics}
						{tool}
						{strokeStyle}
						{showSketch}
						{showVector}
						{showGrid}
						reference={referenceGlyph}
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
		</div>

		<!-- Right properties panel -->
		<aside class="flex min-h-0 flex-col border-l border-border bg-surface">
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
			</div>

			<div class="border-b border-border p-4">
				<h3 class="mb-3 flex items-center justify-between text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					<span>Metrics</span>
					<select
						value=""
						onchange={(e) => copyMetricsFrom(Number(e.currentTarget.value))}
						class="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-fg-muted hover:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
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
							onchange={(e) =>
								projectStore.updateGlyph(glyph.codepoint, (g) => ({
									...g,
									rightSidebearing: Number(e.currentTarget.value)
								}))}
						/>
					</Field>
				</div>
			</div>

			<div class="border-b border-border p-4">
				<h3 class="mb-3 flex items-center justify-between text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					<span>Status</span>
					<button
						type="button"
						onclick={() => {
							if (!glyph) return;
							if (
								confirm(
									`Remove glyph "${glyph.name}" from the font? Any kerning references will also be dropped.`
								)
							)
								projectStore.removeGlyph(glyph.codepoint);
						}}
						class="rounded p-0.5 text-fg-subtle hover:bg-danger/10 hover:text-danger"
						aria-label="Delete glyph"
						title="Remove this glyph from the font"
					>
						<Trash2 class="size-3" />
					</button>
				</h3>
				<div class="grid grid-cols-2 gap-1">
					{#each ['empty', 'sketch', 'draft', 'final'] as const as status (status)}
						<button
							type="button"
							class="rounded-md border px-2 py-1.5 text-[12px] font-medium capitalize transition-colors {glyph.status ===
							status
								? 'border-accent bg-accent-soft text-accent'
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
					<span class="text-fg-subtle/70" data-numeric>{glyph.anchors?.length ?? 0}</span>
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
									class="rounded p-0.5 text-fg-subtle hover:bg-danger/10 hover:text-danger"
									aria-label="Remove anchor {a.name}"
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
								class="rounded-md border border-dashed border-border-strong/50 bg-transparent px-2 py-1 font-mono text-[11px] text-fg-muted hover:border-warn hover:bg-warn/10 hover:text-warn"
							>
								+ {suggested}
							</button>
						{/if}
					{/each}
				</div>
			</div>

			<ReferenceImagePanel />

			<CompositeEditor />

			{#if usedByGlyphs.length > 0}
				<div class="border-b border-border p-4">
					<h3 class="mb-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
						Used by
						<span class="ml-1 text-fg-subtle/70" data-numeric>{usedByGlyphs.length}</span>
					</h3>
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
				</div>
			{/if}

			<div class="border-b border-border p-4">
				<h3 class="mb-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					Notes
				</h3>
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
			</div>

			<div class="border-b border-border p-4">
				<h3 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					Path operations
				</h3>
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
				</div>
			</div>

			<div class="border-b border-border p-4">
				<h3 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					Live preview
				</h3>
				<div
					class="rounded-md border border-border bg-canvas p-4 text-center text-6xl preview-font leading-none"
				>
					{charLabel === 'space' ? '·' : charLabel}
				</div>
				<div class="mt-2 text-[11px] text-fg-subtle" data-numeric>
					{previewStore.glyphCount} glyphs · {previewStore.sizeKb.toFixed(1)} KB · {previewStore.lastBuildMs.toFixed(
						0
					)} ms
				</div>
				{#if previewStore.error}
					<div class="mt-2 rounded bg-danger/10 p-2 text-[11px] text-danger">
						{previewStore.error}
					</div>
				{/if}
			</div>

			{#if projectStore.project}
				{@const issues = sortBySeverity(auditGlyph(glyph, projectStore.project))}
				<div class="border-b border-border p-4">
					<h3 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
						Audit
					</h3>
					{#if issues.length === 0}
						<div class="flex items-center gap-2 rounded-md bg-success/10 px-2.5 py-2 text-[12px] text-success">
							<CheckCircle2 class="size-3.5" />
							No issues
						</div>
					{:else}
						<ul class="grid gap-1">
							{#each issues as issue (issue.code)}
								<li
									class="flex items-start gap-2 rounded-md px-2.5 py-1.5 text-[11px] {issue.severity ===
									'error'
										? 'bg-danger/10 text-danger'
										: issue.severity === 'warn'
											? 'bg-warn/10 text-warn'
											: 'bg-surface-2 text-fg-muted'}"
								>
									<AlertCircle class="mt-0.5 size-3 shrink-0" />
									<span>{issue.message}</span>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/if}

			<div class="border-b border-border p-4">
				<h3 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					Brush &amp; trace
				</h3>
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
			</div>

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
	<CommandPalette open={paletteOpen} onclose={() => (paletteOpen = false)} />

	{#if shortcutsOpen}
		<button
			type="button"
			class="fixed inset-0 z-40 cursor-default bg-canvas/60 backdrop-blur-sm"
			onclick={() => (shortcutsOpen = false)}
			aria-label="Close shortcuts"
			tabindex="-1"
		></button>
		<div
			role="dialog"
			aria-modal="true"
			aria-label="Keyboard shortcuts"
			class="fixed left-1/2 top-1/2 z-50 max-h-[80vh] w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-2xl"
		>
			<div class="mb-4 flex items-center justify-between gap-3">
				<div class="flex items-center gap-2">
					<Keyboard class="size-4 text-fg-muted" />
					<h2 class="text-base font-semibold tracking-tight">Keyboard shortcuts</h2>
				</div>
				<button
					type="button"
					onclick={() => (shortcutsOpen = false)}
					class="rounded-md px-2 py-1 text-[11px] font-medium text-fg-muted hover:bg-surface-2 hover:text-fg"
				>
					Close · Esc
				</button>
			</div>
			<div class="grid gap-5 sm:grid-cols-2">
				{#each SHORTCUTS as section (section.group)}
					<div>
						<h3 class="mb-1.5 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
							{section.group}
						</h3>
						<ul class="grid gap-1">
							{#each section.items as item (item.keys)}
								<li class="flex items-center justify-between gap-3 text-[12px]">
									<span class="text-fg-muted">{item.label}</span>
									<kbd
										class="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-fg"
										data-numeric>{item.keys}</kbd
									>
								</li>
							{/each}
						</ul>
					</div>
				{/each}
			</div>
		</div>
	{/if}
{/if}
