<script lang="ts">
	// "Derive from another glyph" accordion — populates an empty glyph by
	// copying / flipping / rotating a sibling. Useful for b/d, p/q, n/u
	// pairs. Parent gates {#if contours.length === 0 && sources.length > 0}.
	import Accordion from '$lib/ui/Accordion.svelte';
	import type { Glyph } from '$lib/font/types';

	export type DeriveTransform = 'copy' | 'flipH' | 'flipV' | 'rotate180';

	type Props = {
		sources: Glyph[];
		sourceCp: number | null;
		transform: DeriveTransform;
		onapply: () => void;
	};
	let {
		sources,
		sourceCp = $bindable(),
		transform = $bindable(),
		onapply
	}: Props = $props();
</script>

<Accordion id="edit-derive" label="Derive from another glyph" defaultOpen={false}>
	<p class="mb-2 text-[11px] text-fg-subtle">
		One-shot generate this glyph from one you've already drawn. Good for
		<code class="font-mono">b/d</code>, <code class="font-mono">p/q</code>,
		<code class="font-mono">n/u</code>.
	</p>
	<div class="grid grid-cols-2 gap-1.5">
		<select
			bind:value={sourceCp}
			class="rounded border border-border bg-surface px-1.5 py-1 text-[11px] outline-none focus:border-accent"
		>
			<option value={null} disabled>Source glyph</option>
			{#each sources as g (g.codepoint)}
				<option value={g.codepoint}>{g.name}</option>
			{/each}
		</select>
		<select
			bind:value={transform}
			class="rounded border border-border bg-surface px-1.5 py-1 text-[11px] outline-none focus:border-accent"
		>
			<option value="copy">Copy as-is</option>
			<option value="flipH">Flip horizontal</option>
			<option value="flipV">Flip vertical</option>
			<option value="rotate180">Rotate 180°</option>
		</select>
	</div>
	<button
		type="button"
		onclick={onapply}
		disabled={sourceCp == null}
		class="mt-2 w-full rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft disabled:opacity-40"
	>
		Generate
	</button>
</Accordion>
