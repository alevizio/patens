<script lang="ts">
	// Right-sidebar "Notes" accordion — freeform per-glyph notes textarea
	// with a TODO/FIXME badge. The regex stays in sync with the audit
	// module's "notes-todo" code so what's badged here is what's flagged
	// on /audit.
	import Accordion from '$lib/ui/Accordion.svelte';
	import { projectStore } from '$lib/stores/project.svelte';
	import type { Glyph } from '$lib/font/types';

	type Props = { glyph: Glyph };
	let { glyph }: Props = $props();
</script>

<Accordion id="edit-notes" label="Notes" defaultOpen={false}>
	{#snippet badge()}
		{#if glyph.notes && /(?:^|\W)(TODO|FIXME)\b/i.test(glyph.notes)}
			<span
				class="rounded bg-warn/15 px-1.5 py-0.5 font-mono text-[10px] text-warn-strong"
				title="Notes contain TODO/FIXME"
				data-numeric
			>
				TODO
			</span>
		{:else if glyph.notes && glyph.notes.trim().length > 0}
			<span
				class="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-fg-muted"
				data-numeric
			>
				{glyph.notes.trim().length}
			</span>
		{/if}
	{/snippet}
	<textarea
		value={glyph.notes ?? ''}
		oninput={(e) =>
			projectStore.updateGlyph(glyph.codepoint, (g) => ({
				...g,
				notes: e.currentTarget.value
			}))}
		placeholder="Design intent, todos, references…"
		rows="3"
		class="block w-full resize-y rounded-md border border-border bg-surface-2/40 px-2 py-1.5 text-[12px] text-fg outline-none transition-colors focus:border-accent focus:bg-surface focus-visible:ring-2 focus-visible:ring-accent/40"
	></textarea>
</Accordion>
