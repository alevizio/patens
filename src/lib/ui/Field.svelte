<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		label: string;
		hint?: string;
		error?: string | null;
		required?: boolean;
		children: Snippet;
	};

	let { label, hint, error, required = false, children }: Props = $props();
</script>

<label class="flex flex-col gap-1.5">
	<span class="flex items-center gap-1 text-[13px] font-medium text-fg-muted">
		{label}
		{#if required}<span class="text-danger" aria-hidden="true">*</span>{/if}
	</span>
	{@render children()}
	{#if error}
		<span class="text-[12px] text-danger">{error}</span>
	{:else if hint}
		<span class="text-[12px] text-fg-subtle">{hint}</span>
	{/if}
</label>
