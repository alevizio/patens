<script lang="ts">
	// Top-toolbar glyph identity block: char preview · name · codepoint ·
	// status · pin · flag. Extracted from the 4219-line editor +page.svelte
	// as part of the decomposition pass — bounded responsibility (read-
	// only display + pin/flag toggle), zero coupling outside of `glyph`
	// and the global projectStore singleton.
	import Pin from '@lucide/svelte/icons/pin';
	import Flag from '@lucide/svelte/icons/flag';
	import { projectStore } from '$lib/stores/project.svelte';
	import type { Glyph } from '$lib/font/types';

	type Props = { glyph: Glyph };
	let { glyph }: Props = $props();

	// Visible label for the glyph: the unicode character itself when
	// printable, "space" for U+0020 (which would render as a blank box),
	// or a U+XXXX fallback for control characters / astral plane.
	const charLabel = $derived(
		glyph.codepoint > 0x20 && glyph.codepoint < 0x10000
			? String.fromCodePoint(glyph.codepoint)
			: glyph.codepoint === 0x20
				? 'space'
				: `U+${glyph.codepoint.toString(16).toUpperCase().padStart(4, '0')}`
	);
</script>

<div class="flex items-center gap-2 pr-3">
	<span
		class="flex h-9 min-w-9 items-center justify-center rounded-md bg-fg/5 px-2 text-xl font-medium text-fg"
	>
		{charLabel}
	</span>
	<div class="grid leading-tight">
		<span class="text-sm font-medium text-fg">{glyph.name}</span>
		<span class="text-[11px] text-fg-subtle" data-numeric>
			U+{glyph.codepoint
				.toString(16)
				.toUpperCase()
				.padStart(4, '0')} · {glyph.status}
		</span>
	</div>
	<button
		type="button"
		onclick={() => projectStore.toggleGlyphPin(glyph.codepoint)}
		class="ml-1 inline-flex h-6 w-6 items-center justify-center rounded text-fg-subtle transition-colors hover:bg-surface-2 {glyph.pinned
			? 'text-warn hover:text-warn'
			: 'hover:text-fg'}"
		aria-label={glyph.pinned ? 'Unpin glyph' : 'Pin glyph'}
		title={glyph.pinned ? 'Unpin' : 'Pin for quick access'}
	>
		<Pin class="size-3.5 {glyph.pinned ? 'fill-current' : ''}" />
	</button>
	<button
		type="button"
		onclick={() => projectStore.toggleGlyphFlag(glyph.codepoint)}
		class="inline-flex h-6 w-6 items-center justify-center rounded text-fg-subtle transition-colors hover:bg-surface-2 {glyph.flagged
			? 'text-warn hover:text-warn'
			: 'hover:text-fg'}"
		aria-label={glyph.flagged ? 'Unflag glyph' : 'Flag glyph for review'}
		title={glyph.flagged ? 'Unflag' : 'Flag for review (⇧F)'}
	>
		<Flag class="size-3.5 {glyph.flagged ? 'fill-current' : ''}" />
	</button>
</div>
