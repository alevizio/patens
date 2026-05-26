<script lang="ts">
	// Top-toolbar view-toggle row — Skip empty / Tour / Fit / Ref /
	// Regular / Anchors / Onion / Snap / Sketch / Vector / Grid /
	// Overshoot / VF. Every flag is bindable so the parent's keyboard
	// shortcuts (R/V/G/O/S/X) keep mutating the same state.
	import HelpCircle from '@lucide/svelte/icons/help-circle';
	import Maximize from '@lucide/svelte/icons/maximize';
	import Eye from '@lucide/svelte/icons/eye';
	import Grid3x3 from '@lucide/svelte/icons/grid-3x3';
	import Sliders from '@lucide/svelte/icons/sliders-horizontal';
	import ToolbarToggle from './ToolbarToggle.svelte';

	type Props = {
		skipEmptyNav: boolean;
		showReference: boolean;
		showFamilyRegular: boolean;
		showAnchors: boolean;
		showOnion: boolean;
		snapToMetrics: boolean;
		showSketch: boolean;
		showVector: boolean;
		showGrid: boolean;
		showAnatomy: boolean;
		vfPreviewOpen: boolean;
		hasFamilyRegular: boolean;
		hasMasters: boolean;
		zoomPercent: number;
		onOpenTour: () => void;
		onFit: () => void;
	};
	let {
		skipEmptyNav = $bindable(),
		showReference = $bindable(),
		showFamilyRegular = $bindable(),
		showAnchors = $bindable(),
		showOnion = $bindable(),
		snapToMetrics = $bindable(),
		showSketch = $bindable(),
		showVector = $bindable(),
		showGrid = $bindable(),
		showAnatomy = $bindable(),
		vfPreviewOpen = $bindable(),
		hasFamilyRegular,
		hasMasters,
		zoomPercent,
		onOpenTour,
		onFit
	}: Props = $props();
</script>

<div class="ml-auto flex items-center gap-1">
	<button
		type="button"
		onclick={() => (skipEmptyNav = !skipEmptyNav)}
		aria-pressed={skipEmptyNav}
		class="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 {skipEmptyNav
			? 'bg-accent-soft text-accent-strong'
			: 'text-fg-muted hover:bg-surface-2 hover:text-fg'}"
		title="When on, the [ and ] keys skip empty glyphs as you navigate."
	>
		Skip empty
	</button>
	<button
		type="button"
		onclick={onOpenTour}
		class="inline-flex h-7 w-7 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
		title="Show editor tour"
		aria-label="Show editor tour"
	>
		<HelpCircle class="size-3.5" />
	</button>
	<button
		type="button"
		onclick={onFit}
		class="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
		title="Fit to glyph (⌘0)"
	>
		<Maximize class="size-3.5" />
		<span data-numeric>{zoomPercent}%</span>
	</button>
	<ToolbarToggle
		active={showReference}
		onclick={() => (showReference = !showReference)}
		title="Toggle reference glyph (R)"
	>
		Ref
	</ToolbarToggle>
	{#if hasFamilyRegular}
		<ToolbarToggle
			variant="accent"
			active={showFamilyRegular}
			onclick={() => (showFamilyRegular = !showFamilyRegular)}
			title="Overlay the family Regular's same-glyph contour as a ghost (⇧R)"
		>
			Regular
		</ToolbarToggle>
	{/if}
	<ToolbarToggle
		variant="warn"
		active={showAnchors}
		onclick={() => (showAnchors = !showAnchors)}
		title="Toggle anchors (X)"
	>
		Anchors
	</ToolbarToggle>
	<ToolbarToggle
		active={showOnion}
		onclick={() => (showOnion = !showOnion)}
		title="Onion-skin previous/next glyph (O)"
	>
		Onion
	</ToolbarToggle>
	<ToolbarToggle
		kind="plain"
		active={snapToMetrics}
		onclick={() => (snapToMetrics = !snapToMetrics)}
		title="Snap to metrics while editing points"
	>
		Snap
	</ToolbarToggle>
	<ToolbarToggle
		variant="warn"
		active={showSketch}
		onclick={() => (showSketch = !showSketch)}
		title="Toggle sketch layer (S)"
	>
		Sketch
	</ToolbarToggle>
	<ToolbarToggle
		variant="accent"
		active={showVector}
		onclick={() => (showVector = !showVector)}
		title="Toggle vector layer (V)"
	>
		Vector
	</ToolbarToggle>
	<ToolbarToggle
		kind="plain"
		active={showGrid}
		onclick={() => (showGrid = !showGrid)}
		title="Toggle grid (G)"
	>
		{#snippet icon()}<Grid3x3 class="size-3.5" />{/snippet}
		Grid
	</ToolbarToggle>
	<ToolbarToggle
		kind="plain"
		active={showAnatomy}
		onclick={() => (showAnatomy = !showAnatomy)}
		title="Show overshoot zones for round glyphs"
	>
		{#snippet icon()}<Eye class="size-3.5" />{/snippet}
		Overshoot
	</ToolbarToggle>
	{#if hasMasters}
		<ToolbarToggle
			kind="plain"
			active={vfPreviewOpen}
			onclick={() => (vfPreviewOpen = !vfPreviewOpen)}
			title="Live interpolation preview"
		>
			{#snippet icon()}<Sliders class="size-3.5" />{/snippet}
			VF
		</ToolbarToggle>
	{/if}
</div>
