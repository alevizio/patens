<script lang="ts">
	// "Make alternate" accordion — duplicates the current glyph to a new
	// PUA codepoint with an OpenType feature-name suffix. The export
	// feature-detect picks .ss01 / .smcp / .salt / .alt up automatically.
	import Accordion from '$lib/ui/Accordion.svelte';

	export type AlternateSuffix = 'ss01' | 'smcp' | 'salt' | 'alt';

	type Props = {
		suffix: AlternateSuffix;
		hasContent: boolean;
		onmake: () => void;
	};
	let { suffix = $bindable(), hasContent, onmake }: Props = $props();
</script>

<Accordion id="edit-make-alternate" label="Make alternate" defaultOpen={false}>
	<p class="mb-2 text-[11px] text-fg-subtle">
		Duplicate this glyph to a new alternate (PUA codepoint) with a
		feature-detected name suffix. Rendered via
		<code class="font-mono">font-feature-settings</code> at the chosen tag.
	</p>
	<div class="grid grid-cols-[1fr_auto] gap-1.5">
		<select
			bind:value={suffix}
			class="rounded border border-border bg-surface px-1.5 py-1 text-[11px] outline-none focus:border-accent"
		>
			<option value="ss01">.ss01 — Stylistic set 01</option>
			<option value="smcp">.smcp — Small cap</option>
			<option value="salt">.salt — Stylistic alternate</option>
			<option value="alt">.alt — Generic alternate</option>
		</select>
		<button
			type="button"
			onclick={onmake}
			disabled={!hasContent}
			class="rounded-md border border-accent/40 bg-accent-soft px-2 py-1 text-[11px] font-medium text-accent-strong hover:bg-accent disabled:opacity-40"
		>
			Make
		</button>
	</div>
</Accordion>
