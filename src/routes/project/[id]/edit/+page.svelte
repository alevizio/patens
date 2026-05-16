<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { previewStore } from '$lib/stores/preview.svelte';
	import DrawingCanvas from '$lib/drawing/DrawingCanvas.svelte';
	import { DEFAULT_STROKE, DEFAULT_TRACE, sketchToContours } from '$lib/font/sketch-to-bezier';
	import type { Anchor, BezierContour, SketchStroke } from '$lib/font/types';
	import { glyphBounds } from '$lib/font/path';
	import { chaikinSmooth } from '$lib/font/path-edit';
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

	let tool = $state<'pencil' | 'eraser' | 'edit'>('pencil');
	let strokeSize = $state(DEFAULT_STROKE.size);
	let strokeThinning = $state(DEFAULT_STROKE.thinning);
	let smoothness = $state(1);
	let cubicTrace = $state(DEFAULT_TRACE.cubic);
	let cubicMaxError = $state(DEFAULT_TRACE.cubicMaxError);
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
			undoLastStroke();
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
				<h3 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					Metrics
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
				<h3 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					Status
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
					<li>⌘Z<span class="ml-2 text-fg-muted">undo last stroke</span></li>
				</ul>
			</div>
		</aside>
	</div>
{/if}
