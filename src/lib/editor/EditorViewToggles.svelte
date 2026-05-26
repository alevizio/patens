<script lang="ts">
	// Top-toolbar view-toggle row — Skip empty / Tour / Fit / Ref /
	// Regular / Anchors / Onion / Snap / Sketch / Vector / Grid /
	// Overshoot / VF. Every flag is bindable so the parent's keyboard
	// shortcuts (R/V/G/O/S/X) keep mutating the same state.
	import HelpCircle from '@lucide/svelte/icons/help-circle';
	import Maximize from '@lucide/svelte/icons/maximize';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import Grid3x3 from '@lucide/svelte/icons/grid-3x3';
	import Sliders from '@lucide/svelte/icons/sliders-horizontal';

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
		class="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium transition-colors {skipEmptyNav
			? 'bg-accent-soft text-accent-strong'
			: 'text-fg-muted hover:bg-surface-2 hover:text-fg'}"
		title="When on, the [ and ] keys skip empty glyphs as you navigate."
	>
		Skip empty
	</button>
	<button
		type="button"
		onclick={onOpenTour}
		class="inline-flex h-7 w-7 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
		title="Show editor tour"
		aria-label="Show editor tour"
	>
		<HelpCircle class="size-3.5" />
	</button>
	<button
		type="button"
		onclick={onFit}
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
	{#if hasFamilyRegular}
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
	{#if hasMasters}
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
