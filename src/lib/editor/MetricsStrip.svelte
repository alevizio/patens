<script lang="ts">
	// FontLab-style live metrics strip — type a string, see it rendered
	// in the live-built project font at a chosen size. The Sample button
	// fills the input with a curated word that exercises the current
	// glyph (good for spotting kerning gaps and proportion problems).
	import Wand from '@lucide/svelte/icons/wand-sparkles';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';

	type Props = {
		text: string;
		size: number;
		onSample: () => void;
		onCollapse: () => void;
	};
	let {
		text = $bindable(),
		size = $bindable(),
		onSample,
		onCollapse
	}: Props = $props();
</script>

<div class="flex flex-col gap-1.5 border-t border-border bg-surface px-4 py-2.5">
	<div class="flex items-center gap-3">
		<input
			type="text"
			bind:value={text}
			placeholder="Type to preview…"
			class="h-7 flex-1 rounded-md border border-border bg-surface-2 px-2 text-[12px] text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
		/>
		<button
			type="button"
			onclick={onSample}
			class="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-surface px-2 text-[11px] font-medium text-fg-muted hover:border-accent hover:text-accent"
			title="Fill with a word that exercises the current glyph (click again for another)"
		>
			<Wand class="size-3" />
			Sample
		</button>
		<label class="flex items-center gap-1.5">
			<span class="text-[11px] text-fg-muted">Size</span>
			<input
				type="range"
				min={24}
				max={200}
				step={4}
				bind:value={size}
				class="h-1 w-24 accent-fg"
				aria-label="Metrics preview size"
			/>
			<span class="w-8 text-[11px] text-fg-subtle" data-numeric>{size}</span>
		</label>
		<button
			type="button"
			onclick={onCollapse}
			class="inline-flex size-6 items-center justify-center rounded text-fg-subtle hover:bg-surface-2 hover:text-fg"
			title="Collapse the live preview + action bar"
			aria-label="Collapse bottom bar"
		>
			<ChevronDown class="size-3.5" />
		</button>
	</div>
	<div
		class="preview-font max-h-[120px] overflow-x-auto overflow-y-hidden whitespace-nowrap leading-[1]"
		style="font-size: {size}px;"
	>
		{text || ' '}
	</div>
</div>
