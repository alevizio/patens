<script lang="ts">
	import type { Glyph } from '$lib/font/types';

	type Props = {
		glyphs: Glyph[];
		cols?: number;
		cellSize?: number;
		onpick?: (cp: number) => void;
	};
	let { glyphs, cols = 32, cellSize = 8, onpick }: Props = $props();

	const sorted = $derived(
		[...glyphs].sort((a, b) => a.codepoint - b.codepoint)
	);

	const colorFor = (g: Glyph): string => {
		if (g.status === 'final') return 'hsl(var(--success))';
		if (g.status === 'draft') return 'hsl(var(--accent))';
		if (g.status === 'sketch') return 'hsl(var(--warn))';
		return 'hsl(var(--fg-subtle) / 0.25)';
	};
</script>

<div
	class="grid gap-px overflow-hidden rounded"
	style="grid-template-columns: repeat({cols}, {cellSize}px);"
>
	{#each sorted as g (g.codepoint)}
		<button
			type="button"
			onclick={() => onpick?.(g.codepoint)}
			class="block transition-transform hover:scale-150 hover:z-10"
			style="width: {cellSize}px; height: {cellSize}px; background-color: {colorFor(g)};"
			title="{g.name} · U+{g.codepoint.toString(16).toUpperCase().padStart(4, '0')} · {g.status}"
			aria-label="{g.name} ({g.status})"
		></button>
	{/each}
</div>
