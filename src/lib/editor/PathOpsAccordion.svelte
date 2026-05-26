<script lang="ts">
	// "Path operations" accordion — boolean ops + cleanup + transform
	// buttons. All mutation logic stays in the parent (it touches the
	// projectStore directly and many ops are async). This component is
	// purely the button grid — the parent passes glyph (read-only) so
	// each button can derive its own disabled state.
	import Accordion from '$lib/ui/Accordion.svelte';
	import Wand from '@lucide/svelte/icons/wand-sparkles';
	import type { Glyph } from '$lib/font/types';
	import type { PathOp } from '$lib/font/path-edit';

	type Props = {
		glyph: Glyph;
		autoCleaning: boolean;
		simplifying: boolean;
		onAutoClean: () => void;
		onPathOp: (op: PathOp) => void;
		onSimplify: () => void;
		onSnapGrid: (gridSize: number) => void;
		onReverseWinding: () => void;
		onFlip: (axis: 'horizontal' | 'vertical') => void;
		onScale: (factor: number) => void;
		onMakeSymmetric: () => void;
		onCenterHorizontally: () => void;
		onAlignVertically: (target: 'baseline' | 'capHeight' | 'xHeight') => void;
	};
	let {
		glyph,
		autoCleaning,
		simplifying,
		onAutoClean,
		onPathOp,
		onSimplify,
		onSnapGrid,
		onReverseWinding,
		onFlip,
		onScale,
		onMakeSymmetric,
		onCenterHorizontally,
		onAlignVertically
	}: Props = $props();

	const isEmpty = $derived(glyph.contours.length === 0);
	const isSingleContour = $derived(glyph.contours.length < 2);
	const sidebearingsBalanced = $derived(glyph.leftSidebearing === glyph.rightSidebearing);
</script>

<Accordion id="edit-pathops" label="Path operations" defaultOpen={false}>
	<button
		type="button"
		onclick={onAutoClean}
		disabled={isEmpty || autoCleaning}
		class="mb-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-accent bg-accent text-accent-fg px-2 py-1.5 text-[11px] font-medium hover:bg-accent/90 disabled:opacity-40"
		title="Simplify + snap to 10u grid in one step"
	>
		<Wand class="size-3" />
		{autoCleaning ? 'Cleaning…' : 'Auto-clean glyph'}
	</button>
	<div class="mb-2 grid grid-cols-2 gap-1.5">
		<button
			type="button"
			onclick={() => onPathOp('union')}
			disabled={isSingleContour}
			class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40"
			title="Merge all contours into a single silhouette"
		>
			Union
		</button>
		<button
			type="button"
			onclick={() => onPathOp('intersection')}
			disabled={isSingleContour}
			class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40"
			title="Keep only the area common to all contours"
		>
			Intersect
		</button>
		<button
			type="button"
			onclick={() => onPathOp('difference')}
			disabled={isSingleContour}
			class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40"
			title="Subtract every contour after the first from the first"
		>
			Subtract
		</button>
		<button
			type="button"
			onclick={() => onPathOp('xor')}
			disabled={isSingleContour}
			class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40"
			title="Keep regions that belong to an odd number of contours"
		>
			Xor
		</button>
	</div>
	<button
		type="button"
		onclick={onSimplify}
		disabled={isEmpty || simplifying}
		class="w-full rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40"
		title="Reduce noise: re-sample, Douglas-Peucker, then refit bezier curves"
	>
		{simplifying ? 'Simplifying…' : 'Simplify outline'}
	</button>
	<div class="mt-1.5 grid grid-cols-2 gap-1.5">
		<button
			type="button"
			onclick={() => onSnapGrid(10)}
			disabled={isEmpty}
			class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40"
			title="Round every point to the nearest 10 font units (cleanup)"
		>
			Snap 10u
		</button>
		<button
			type="button"
			onclick={onReverseWinding}
			disabled={isEmpty}
			class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40"
			title="Flip every contour's winding direction"
		>
			Reverse winding
		</button>
	</div>
	<h3
		class="mb-2 mt-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"
	>
		Transform
	</h3>
	<div class="grid grid-cols-2 gap-1.5">
		<button
			type="button"
			onclick={() => onFlip('horizontal')}
			disabled={isEmpty}
			class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40"
		>
			Flip H
		</button>
		<button
			type="button"
			onclick={() => onFlip('vertical')}
			disabled={isEmpty}
			class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40"
		>
			Flip V
		</button>
		<button
			type="button"
			onclick={() => onScale(1.05)}
			disabled={isEmpty}
			class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40"
		>
			Scale +5%
		</button>
		<button
			type="button"
			onclick={() => onScale(1 / 1.05)}
			disabled={isEmpty}
			class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40"
		>
			Scale −5%
		</button>
		<button
			type="button"
			onclick={onMakeSymmetric}
			disabled={sidebearingsBalanced}
			class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40"
			title="Set LSB = RSB = average — useful for symmetric round glyphs (o, O, e)"
		>
			Symmetric LSB/RSB
		</button>
		<button
			type="button"
			onclick={onCenterHorizontally}
			disabled={isEmpty}
			class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40"
			title="Shift contours so the bbox centre matches advance/2"
		>
			Center in advance
		</button>
		<button
			type="button"
			onclick={() => onAlignVertically('baseline')}
			disabled={isEmpty}
			class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40"
			title="Shift contours so the bbox bottom sits on baseline"
		>
			Sit on baseline
		</button>
		<button
			type="button"
			onclick={() => onAlignVertically('capHeight')}
			disabled={isEmpty}
			class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40"
			title="Shift contours so the bbox top hits cap-height"
		>
			Top to cap
		</button>
		<button
			type="button"
			onclick={() => onAlignVertically('xHeight')}
			disabled={isEmpty}
			class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40"
			title="Shift contours so the bbox top hits x-height"
		>
			Top to x-height
		</button>
	</div>
</Accordion>
