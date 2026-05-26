<script lang="ts">
	// "Kerning" panel — pair-count summary + deep-link to the spacing
	// page filtered by this glyph. Parent gates the {#if asLeft+asRight}
	// check so this never renders for glyphs with no pairs.
	import Accordion from '$lib/ui/Accordion.svelte';
	import { projectStore } from '$lib/stores/project.svelte';
	import type { Glyph } from '$lib/font/types';

	type Props = {
		glyph: Glyph;
		asLeft: number;
		asRight: number;
	};
	let { glyph, asLeft, asRight }: Props = $props();

	const spacingHref = $derived(
		projectStore.project
			? `/project/${projectStore.project.id}/spacing${
					glyph.codepoint > 0x20 && glyph.codepoint < 0x10000
						? `?left=${encodeURIComponent(String.fromCodePoint(glyph.codepoint))}`
						: ''
				}`
			: '#'
	);
</script>

<Accordion id="edit-kerning" label="Kerning" defaultOpen={false}>
	{#snippet badge()}
		<span
			class="rounded bg-accent-soft px-1.5 py-0.5 font-mono text-[10px] text-accent-strong"
			data-numeric
			title="{asLeft} as left side · {asRight} as right side"
		>
			{asLeft + asRight}
		</span>
	{/snippet}
	<p class="text-[11px] text-fg-muted">
		<span data-numeric>{asLeft}</span> pair{asLeft === 1 ? '' : 's'} with this glyph
		on the
		<span class="text-fg">left</span>,
		<span data-numeric>{asRight}</span> on the
		<span class="text-fg">right</span>. Counts include class-based pairs.
	</p>
	<a
		href={spacingHref}
		class="mt-2 inline-flex items-center gap-1 rounded border border-border bg-surface px-2 py-1 text-[11px] font-medium text-fg-muted transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
	>
		Edit on Spacing page →
	</a>
</Accordion>
