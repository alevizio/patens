<script lang="ts">
	// "Used by" panel — composite glyphs that reference this one as a
	// component. Parent gates `{#if usedByGlyphs.length > 0}` so this
	// component never renders with an empty list, but we still defend
	// against it for type safety.
	import Accordion from '$lib/ui/Accordion.svelte';
	import { projectStore } from '$lib/stores/project.svelte';
	import type { Glyph } from '$lib/font/types';

	type Props = { usedBy: Glyph[] };
	let { usedBy }: Props = $props();
</script>

<Accordion id="edit-usedby" label="Used by" defaultOpen={true}>
	{#snippet badge()}
		<span
			class="rounded bg-accent-soft px-1.5 py-0.5 font-mono text-[10px] text-accent-strong"
			data-numeric
		>
			{usedBy.length}
		</span>
	{/snippet}
	<p class="mb-2 text-[11px] text-fg-subtle">
		These composite glyphs reference this glyph. Edits here propagate.
	</p>
	<div class="flex flex-wrap gap-1">
		{#each usedBy as g (g.codepoint)}
			<button
				type="button"
				onclick={() => projectStore.selectGlyph(g.codepoint)}
				class="rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[12px] font-medium text-fg-muted hover:border-accent hover:text-accent"
				title={g.name}
			>
				{g.codepoint > 0x20 && g.codepoint < 0x10000
					? String.fromCodePoint(g.codepoint)
					: g.name}
			</button>
		{/each}
	</div>
</Accordion>
