<script lang="ts">
	// Right-sidebar "Tags" accordion — free-form taxonomy chips + datalist
	// autocomplete fed from the project-wide tag set. The autocomplete
	// matters: it stops drift between "wip" / "WIP" / "in-progress" for
	// the same concept (addGlyphTag normalises to lowercase but the
	// completion menu surfaces existing tags so designers reuse them).
	import Accordion from '$lib/ui/Accordion.svelte';
	import { projectStore } from '$lib/stores/project.svelte';
	import type { Glyph } from '$lib/font/types';

	type Props = { glyph: Glyph; existingTags: string[] };
	let { glyph, existingTags }: Props = $props();
</script>

<Accordion id="edit-tags" label="Tags" defaultOpen={false}>
	{#snippet badge()}
		{#if (glyph.tags?.length ?? 0) > 0}
			<span
				class="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-fg-muted"
				data-numeric
			>
				{glyph.tags?.length}
			</span>
		{/if}
	{/snippet}
	{#if (glyph.tags?.length ?? 0) > 0}
		<div class="mb-2 flex flex-wrap gap-1">
			{#each glyph.tags ?? [] as t (t)}
				<span
					class="inline-flex items-center gap-1 rounded bg-accent-soft/40 px-1.5 py-0.5 text-[11px] text-accent-strong"
				>
					{t}
					<button
						type="button"
						onclick={() => projectStore.removeGlyphTag(glyph.codepoint, t)}
						class="text-fg-subtle hover:text-danger-strong"
						aria-label="Remove tag {t}"
						title="Remove tag"
					>
						×
					</button>
				</span>
			{/each}
		</div>
	{/if}
	<input
		type="text"
		placeholder="Add tag — Enter to save"
		list="glyph-tag-suggestions"
		onkeydown={(e) => {
			if (e.key === 'Enter') {
				const v = (e.currentTarget as HTMLInputElement).value;
				if (v.trim()) {
					projectStore.addGlyphTag(glyph.codepoint, v);
					(e.currentTarget as HTMLInputElement).value = '';
				}
			}
		}}
		class="block w-full rounded border border-border bg-surface px-2 py-1 text-[11px] outline-none focus:border-accent"
	/>
	<datalist id="glyph-tag-suggestions">
		{#each existingTags as t (t)}
			<option value={t}></option>
		{/each}
	</datalist>
	<p class="mt-1 text-[10px] text-fg-subtle">
		Free-form taxonomy — lowercase, deduped. Useful for "needs-redraw", "WIP", "v2",
		etc.
	</p>
</Accordion>
