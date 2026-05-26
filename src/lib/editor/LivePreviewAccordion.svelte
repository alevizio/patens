<script lang="ts">
	// "Live preview" panel — renders the current glyph in the live-built
	// project font (via @font-face from previewStore) plus build stats.
	// Falls back to the system stack when the glyph has no contours yet,
	// so the panel still confirms which letter you're on.
	import Accordion from '$lib/ui/Accordion.svelte';
	import { previewStore } from '$lib/stores/preview.svelte';
	import type { Glyph } from '$lib/font/types';

	type Props = { glyph: Glyph; charLabel: string };
	let { glyph, charLabel }: Props = $props();

	const previewChar = $derived(charLabel === 'space' ? '·' : charLabel);
</script>

<Accordion id="edit-live-preview" label="Live preview" defaultOpen={true}>
	{#if glyph.contours.length > 0}
		<div
			class="rounded-md border border-border bg-canvas p-4 text-center text-6xl preview-font leading-none"
		>
			{previewChar}
		</div>
	{:else}
		<div
			class="rounded-md border border-dashed border-border bg-canvas p-4 text-center text-6xl leading-none text-fg-subtle"
			style="font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;"
			title="Draw contours to see the live preview"
		>
			{previewChar}
		</div>
	{/if}
	<div class="mt-2 text-[11px] text-fg-subtle" data-numeric>
		{previewStore.glyphCount} glyphs · {previewStore.sizeKb.toFixed(1)} KB · {previewStore.lastBuildMs.toFixed(
			0
		)} ms
	</div>
	{#if previewStore.error}
		<div class="mt-2 rounded bg-danger/10 p-2 text-[11px] text-danger-strong">
			{previewStore.error}
		</div>
	{/if}
</Accordion>
