<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import Loader from '@lucide/svelte/icons/loader-2';

	type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
	type Density = 'sm' | 'md' | 'lg';

	type Props = HTMLButtonAttributes & {
		variant?: Variant;
		density?: Density;
		fullWidth?: boolean;
		loading?: boolean;
		children?: Snippet;
		icon?: Snippet;
	};

	let {
		variant = 'primary',
		density = 'md',
		fullWidth = false,
		loading = false,
		disabled,
		class: extraClass = '',
		children,
		icon,
		...rest
	}: Props = $props();

	const variantClass: Record<Variant, string> = {
		primary: 'bg-fg text-canvas hover:bg-fg/90 active:bg-fg',
		secondary: 'bg-surface-2 text-fg hover:bg-surface-2/80 border border-border',
		ghost: 'bg-transparent text-fg hover:bg-surface-2',
		danger: 'bg-danger text-canvas hover:bg-danger/90'
	};

	const densityClass: Record<Density, string> = {
		sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-md',
		md: 'h-10 px-4 text-sm gap-2 rounded-lg',
		lg: 'h-12 px-5 text-[15px] gap-2 rounded-xl'
	};

	const spinnerSize: Record<Density, string> = {
		sm: 'size-3.5',
		md: 'size-4',
		lg: 'size-[18px]'
	};
</script>

<button
	{...rest}
	disabled={disabled || loading}
	aria-busy={loading || undefined}
	class="inline-flex items-center justify-center font-medium transition-[background-color,color,border-color,opacity] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent {variantClass[
		variant
	]} {densityClass[density]} {fullWidth ? 'w-full' : ''} {extraClass}"
>
	{#if loading}
		<!-- Spinner replaces the icon slot so the button width stays stable. -->
		<Loader class="{spinnerSize[density]} animate-spin" aria-hidden="true" />
	{:else if icon}
		{@render icon()}
	{/if}
	{#if children}{@render children()}{/if}
</button>
