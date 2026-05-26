<script lang="ts">
	// "Path operations" accordion — boolean ops + cleanup + transform
	// buttons. All mutation logic stays in the parent (it touches the
	// projectStore directly and many ops are async). This component is
	// purely the button grid — the parent passes glyph (read-only) so
	// each button can derive its own disabled state.
	import Accordion from '$lib/ui/Accordion.svelte';
	import SidebarButton from '$lib/editor/SidebarButton.svelte';
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
	const sidebearingsBalanced = $derived(
		glyph.leftSidebearing === glyph.rightSidebearing
	);
</script>

<Accordion id="edit-pathops" label="Path operations" defaultOpen={false}>
	<div class="mb-2">
		<SidebarButton
			variant="primary"
			fullWidth
			disabled={isEmpty || autoCleaning}
			onclick={onAutoClean}
			title="Simplify + snap to 10u grid in one step"
		>
			<Wand class="size-3" />
			{autoCleaning ? 'Cleaning…' : 'Auto-clean glyph'}
		</SidebarButton>
	</div>
	<div class="mb-2 grid grid-cols-2 gap-1.5">
		<SidebarButton
			disabled={isSingleContour}
			onclick={() => onPathOp('union')}
			title="Merge all contours into a single silhouette"
		>
			Union
		</SidebarButton>
		<SidebarButton
			disabled={isSingleContour}
			onclick={() => onPathOp('intersection')}
			title="Keep only the area common to all contours"
		>
			Intersect
		</SidebarButton>
		<SidebarButton
			disabled={isSingleContour}
			onclick={() => onPathOp('difference')}
			title="Subtract every contour after the first from the first"
		>
			Subtract
		</SidebarButton>
		<SidebarButton
			disabled={isSingleContour}
			onclick={() => onPathOp('xor')}
			title="Keep regions that belong to an odd number of contours"
		>
			Xor
		</SidebarButton>
	</div>
	<SidebarButton
		fullWidth
		disabled={isEmpty || simplifying}
		onclick={onSimplify}
		title="Reduce noise: re-sample, Douglas-Peucker, then refit bezier curves"
	>
		{simplifying ? 'Simplifying…' : 'Simplify outline'}
	</SidebarButton>
	<div class="mt-1.5 grid grid-cols-2 gap-1.5">
		<SidebarButton
			disabled={isEmpty}
			onclick={() => onSnapGrid(10)}
			title="Round every point to the nearest 10 font units (cleanup)"
		>
			Snap 10u
		</SidebarButton>
		<SidebarButton
			disabled={isEmpty}
			onclick={onReverseWinding}
			title="Flip every contour's winding direction"
		>
			Reverse winding
		</SidebarButton>
	</div>
	<h3
		class="mb-2 mt-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"
	>
		Transform
	</h3>
	<div class="grid grid-cols-2 gap-1.5">
		<SidebarButton disabled={isEmpty} onclick={() => onFlip('horizontal')}>
			Flip H
		</SidebarButton>
		<SidebarButton disabled={isEmpty} onclick={() => onFlip('vertical')}>
			Flip V
		</SidebarButton>
		<SidebarButton disabled={isEmpty} onclick={() => onScale(1.05)}>
			Scale +5%
		</SidebarButton>
		<SidebarButton disabled={isEmpty} onclick={() => onScale(1 / 1.05)}>
			Scale −5%
		</SidebarButton>
		<SidebarButton
			disabled={sidebearingsBalanced}
			onclick={onMakeSymmetric}
			title="Set LSB = RSB = average — useful for symmetric round glyphs (o, O, e)"
		>
			Symmetric LSB/RSB
		</SidebarButton>
		<SidebarButton
			disabled={isEmpty}
			onclick={onCenterHorizontally}
			title="Shift contours so the bbox centre matches advance/2"
		>
			Center in advance
		</SidebarButton>
		<SidebarButton
			disabled={isEmpty}
			onclick={() => onAlignVertically('baseline')}
			title="Shift contours so the bbox bottom sits on baseline"
		>
			Sit on baseline
		</SidebarButton>
		<SidebarButton
			disabled={isEmpty}
			onclick={() => onAlignVertically('capHeight')}
			title="Shift contours so the bbox top hits cap-height"
		>
			Top to cap
		</SidebarButton>
		<SidebarButton
			disabled={isEmpty}
			onclick={() => onAlignVertically('xHeight')}
			title="Shift contours so the bbox top hits x-height"
		>
			Top to x-height
		</SidebarButton>
	</div>
</Accordion>
