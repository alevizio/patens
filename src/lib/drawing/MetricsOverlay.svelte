<script lang="ts">
	import type { FontMetrics } from '$lib/font/types';

	type Props = {
		metrics: FontMetrics;
		advanceWidth: number;
		leftSidebearing: number;
		rightSidebearing: number;
		showGrid?: boolean;
		showAnatomy?: boolean;
	};

	let {
		metrics,
		advanceWidth,
		leftSidebearing,
		rightSidebearing,
		showGrid = false,
		showAnatomy = false
	}: Props = $props();

	// Overshoot ~2% of cap height — round glyphs (o, O, c, e, s) extend slightly past
	// cap/x/baseline so they appear optically aligned with flat-topped peers.
	const overshoot = $derived(Math.round(metrics.capHeight * 0.02));

	const advance = $derived(advanceWidth);

	const guideLines = $derived([
		{ y: metrics.ascender, label: 'asc', color: 'var(--color-ascender)' },
		{ y: metrics.capHeight, label: 'cap', color: 'var(--color-cap-height)' },
		{ y: metrics.xHeight, label: 'x', color: 'var(--color-x-height)' },
		{ y: 0, label: 'base', color: 'var(--color-baseline)' },
		{ y: metrics.descender, label: 'desc', color: 'var(--color-descender)' }
	]);
</script>

<g class="pointer-events-none" data-overlay="metrics">
	<!-- Glyph body fill -->
	<rect
		x={0}
		y={-metrics.ascender}
		width={advance}
		height={metrics.ascender - metrics.descender}
		fill="var(--color-surface)"
	/>

	{#if showGrid}
		{@const step = 100}
		{#each Array.from({ length: Math.floor(advance / step) + 1 }) as _, i (i)}
			<line
				x1={i * step}
				x2={i * step}
				y1={-metrics.ascender}
				y2={-metrics.descender}
				stroke="var(--color-grid)"
				stroke-width="1"
				vector-effect="non-scaling-stroke"
			/>
		{/each}
		{#each Array.from({ length: Math.floor((metrics.ascender - metrics.descender) / step) + 1 }) as _, i (i)}
			<line
				x1={0}
				x2={advance}
				y1={-metrics.descender - i * step}
				y2={-metrics.descender - i * step}
				stroke="var(--color-grid)"
				stroke-width="1"
				vector-effect="non-scaling-stroke"
			/>
		{/each}
	{/if}

	{#if showAnatomy}
		<!-- Overshoot zones: subtle horizontal bands where round chars should reach -->
		<rect
			x={-50}
			y={-(metrics.capHeight + overshoot)}
			width={advance + 100}
			height={overshoot}
			fill="var(--color-cap-height)"
			opacity="0.06"
		/>
		<rect
			x={-50}
			y={-(metrics.xHeight + overshoot)}
			width={advance + 100}
			height={overshoot}
			fill="var(--color-x-height)"
			opacity="0.06"
		/>
		<rect
			x={-50}
			y={0}
			width={advance + 100}
			height={overshoot}
			fill="var(--color-baseline)"
			opacity="0.06"
		/>
		<!-- Overshoot guide lines (dotted) -->
		<line
			x1={-50}
			x2={advance + 50}
			y1={-(metrics.capHeight + overshoot)}
			y2={-(metrics.capHeight + overshoot)}
			stroke="var(--color-cap-height)"
			stroke-width="1"
			stroke-dasharray="1 4"
			vector-effect="non-scaling-stroke"
			opacity="0.5"
		/>
		<line
			x1={-50}
			x2={advance + 50}
			y1={-(metrics.xHeight + overshoot)}
			y2={-(metrics.xHeight + overshoot)}
			stroke="var(--color-x-height)"
			stroke-width="1"
			stroke-dasharray="1 4"
			vector-effect="non-scaling-stroke"
			opacity="0.5"
		/>
		<line
			x1={-50}
			x2={advance + 50}
			y1={overshoot}
			y2={overshoot}
			stroke="var(--color-baseline)"
			stroke-width="1"
			stroke-dasharray="1 4"
			vector-effect="non-scaling-stroke"
			opacity="0.5"
		/>
	{/if}

	<!-- Horizontal guide lines -->
	{#each guideLines as line (line.label)}
		<line
			x1={-50}
			x2={advance + 50}
			y1={-line.y}
			y2={-line.y}
			stroke={line.color}
			stroke-width="1.25"
			stroke-dasharray={line.label === 'base' ? 'none' : '4 4'}
			vector-effect="non-scaling-stroke"
			opacity="0.55"
		/>
		<text
			x={-12}
			y={-line.y}
			text-anchor="end"
			dominant-baseline="middle"
			fill={line.color}
			font-size="11"
			font-family="ui-monospace, monospace"
			class="select-none"
			style="paint-order: stroke; stroke: var(--color-canvas); stroke-width: 3;"
		>
			{line.label}
		</text>
	{/each}

	<!-- Side bearings -->
	<line
		x1={leftSidebearing}
		x2={leftSidebearing}
		y1={-metrics.ascender}
		y2={-metrics.descender}
		stroke="var(--color-border-strong)"
		stroke-width="1"
		stroke-dasharray="2 4"
		vector-effect="non-scaling-stroke"
		opacity="0.7"
	/>
	<line
		x1={advance - rightSidebearing}
		x2={advance - rightSidebearing}
		y1={-metrics.ascender}
		y2={-metrics.descender}
		stroke="var(--color-border-strong)"
		stroke-width="1"
		stroke-dasharray="2 4"
		vector-effect="non-scaling-stroke"
		opacity="0.7"
	/>

	<!-- Advance width edges -->
	<line
		x1={0}
		x2={0}
		y1={-metrics.ascender}
		y2={-metrics.descender}
		stroke="var(--color-border-strong)"
		stroke-width="1.25"
		vector-effect="non-scaling-stroke"
	/>
	<line
		x1={advance}
		x2={advance}
		y1={-metrics.ascender}
		y2={-metrics.descender}
		stroke="var(--color-border-strong)"
		stroke-width="1.25"
		vector-effect="non-scaling-stroke"
	/>
</g>
