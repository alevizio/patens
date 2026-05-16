<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		padding?: 'none' | 'sm' | 'md' | 'lg';
		class?: string;
		children: Snippet;
	};

	let { padding = 'md', class: extraClass = '', children }: Props = $props();

	const padClass = $derived(
		({
			none: '',
			sm: 'p-3',
			md: 'p-5',
			lg: 'p-6'
		})[padding]
	);
</script>

<div class="rounded-xl border border-border bg-surface {padClass} {extraClass}">
	{@render children()}
</div>
