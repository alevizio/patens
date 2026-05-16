<script lang="ts">
	import type { FontMetrics } from '$lib/font/types';

	type Props = {
		metrics: FontMetrics;
		advanceWidth: number;
		leftSidebearing: number;
		rightSidebearing: number;
		showGrid?: boolean;
	};

	let {
		metrics,
		advanceWidth,
		leftSidebearing,
		rightSidebearing,
		showGrid = false
	}: Props = $props();

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
