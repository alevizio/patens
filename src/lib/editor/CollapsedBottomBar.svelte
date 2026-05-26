<script lang="ts">
	// The full-width expand button shown in place of the bottom bar
	// when the user has collapsed it. Clicking restores the metrics
	// strip + action bar. Persisted via the parent's toggle handler.
	import ChevronUp from '@lucide/svelte/icons/chevron-up';

	type Props = { onExpand: () => void };
	let { onExpand }: Props = $props();
</script>

<button
	type="button"
	onclick={onExpand}
	class="flex items-center justify-between gap-2 border-t border-border bg-surface px-4 py-1.5 text-[11px] text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:bg-surface-2 focus-visible:text-fg"
	title="Expand the live preview + action bar"
>
	<span class="inline-flex items-center gap-2">
		<ChevronUp class="size-3.5" />
		<span>Live preview · actions</span>
	</span>
	<span class="font-mono text-[10px] text-fg-subtle" data-numeric>Show ↑</span>
</button>
