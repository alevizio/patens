<script lang="ts">
	type Props = {
		values: number[];
		width?: number;
		height?: number;
		label?: string;
	};
	let { values, width = 56, height = 14, label }: Props = $props();

	const max = $derived(Math.max(1, ...values));
	const total = $derived(values.reduce((a, b) => a + b, 0));
	const stepX = $derived(values.length > 1 ? width / (values.length - 1) : 0);

	const linePath = $derived.by(() => {
		if (values.length === 0) return '';
		return values
			.map((v, i) => {
				const x = i * stepX;
				const y = height - (v / max) * (height - 1) - 0.5;
				return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
			})
			.join(' ');
	});

	const fillPath = $derived.by(() => {
		if (values.length === 0) return '';
		return `${linePath} L${(values.length - 1) * stepX},${height} L0,${height} Z`;
	});

	const todayValue = $derived(values[values.length - 1] ?? 0);
</script>

<svg
	{width}
	{height}
	viewBox="0 0 {width} {height}"
	role="img"
	aria-label={label ?? `${total} edits in last ${values.length} days, ${todayValue} today`}
	class="overflow-visible"
>
	<path d={fillPath} fill="hsl(var(--accent) / 0.15)" />
	<path d={linePath} fill="none" stroke="hsl(var(--accent))" stroke-width="1" stroke-linejoin="round" />
	{#if todayValue > 0 && values.length > 0}
		<circle
			cx={(values.length - 1) * stepX}
			cy={height - (todayValue / max) * (height - 1) - 0.5}
			r="1.4"
			fill="hsl(var(--accent))"
		/>
	{/if}
</svg>
