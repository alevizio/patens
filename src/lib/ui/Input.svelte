<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	type Props = Omit<HTMLInputAttributes, 'value'> & {
		density?: 'sm' | 'md';
		value?: string | number;
	};

	let {
		density = 'md',
		value = $bindable(),
		class: extraClass = '',
		...rest
	}: Props = $props();

	const sizeClass = $derived(
		density === 'sm' ? 'h-8 px-2.5 text-[13px] rounded-md' : 'h-10 px-3 text-sm rounded-lg'
	);
</script>

<input
	{...rest}
	bind:value
	class="block w-full border border-border bg-surface text-fg outline-none transition-[border-color,box-shadow] focus:border-accent focus:ring-2 focus:ring-accent-soft placeholder:text-fg-subtle disabled:opacity-50 {sizeClass} {extraClass}"
/>
