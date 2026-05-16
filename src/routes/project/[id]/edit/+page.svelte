<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { previewStore } from '$lib/stores/preview.svelte';
	import DrawingCanvas from '$lib/drawing/DrawingCanvas.svelte';
	import { DEFAULT_STROKE, sketchToContours } from '$lib/font/sketch-to-bezier';
	import type { BezierContour, SketchStroke } from '$lib/font/types';
	import { glyphBounds } from '$lib/font/path';
	import { chaikinSmooth } from '$lib/font/path-edit';
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

	let tool = $state<'pencil' | 'eraser' | 'edit'>('pencil');
	let strokeSize = $state(DEFAULT_STROKE.size);
	let strokeThinning = $state(DEFAULT_STROKE.thinning);
	let smoothness = $state(1);
	let showSketch = $state(true);
	let showVector = $state(true);
	let showGrid = $state(false);
	let showReference = $state(true);

	const strokeStyle = $derived({
		...DEFAULT_STROKE,
		size: strokeSize,
		thinning: strokeThinning
	});

	const glyph = $derived(projectStore.selectedGlyph);
	const metrics = $derived(projectStore.project?.metrics);

	const referenceGlyph = $derived.by(() => {
		if (!showReference || !glyph || !projectStore.project) return null;
		const cp = glyph.codepoint;
		// Pick a sensible reference based on the category of the current glyph
		const candidates: number[] = [];
		if (cp >= 0x0041 && cp <= 0x005a) candidates.push(0x0048, 0x004f, 0x004e); // H, O, N
		else if (cp >= 0x0061 && cp <= 0x007a) candidates.push(0x006e, 0x006f); // n, o
		else if (cp >= 0x0030 && cp <= 0x0039) candidates.push(0x0030, 0x0031); // 0, 1
		else if (cp === 0x0020 || cp === 0x002e) return null;
		else candidates.push(0x0048, 0x006e, 0x006f); // fall back to uppercase H or lowercase n/o
		for (const c of candidates) {
			if (c === cp) continue;
			const g = projectStore.project.glyphs[c];
			if (g && g.contours.length > 0) return g;
		}
		return null;
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
		const raw = sketchToContours(glyph.sketch, strokeStyle);
		const contours = chaikinSmooth(raw, smoothness);
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
						onSketchChange={handleSketchChange}
						onContoursChange={handleContoursChange}
					/>
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
					<label class="grid gap-1.5">
						<span class="flex items-center justify-between text-[11px] text-fg-muted">
							<span>Smoothness (trace)</span>
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
				</div>
			</div>

			<div class="mt-auto p-4 text-[11px] text-fg-subtle">
				<p class="mb-1 font-medium">Shortcuts</p>
				<ul class="grid gap-0.5" data-numeric>
					<li>[ ]<span class="ml-2 text-fg-muted">prev/next glyph</span></li>
					<li>P E A<span class="ml-2 text-fg-muted">pencil / eraser / edit points</span></li>
					<li>S V G R<span class="ml-2 text-fg-muted">toggle sketch / vector / grid / ref</span></li>
					<li>T<span class="ml-2 text-fg-muted">trace to vector</span></li>
					<li>Del<span class="ml-2 text-fg-muted">delete selected point</span></li>
					<li>⌘Z<span class="ml-2 text-fg-muted">undo last stroke</span></li>
				</ul>
			</div>
		</aside>
	</div>
{/if}
