<script lang="ts">
	/**
	 * Accordion section — collapsible panel for the right-side sidebars.
	 * Persists open/closed state per `id` in localStorage so the same panels
	 * stay open across reloads, navigations, and project switches.
	 *
	 * Default open or closed is set via `defaultOpen`; explicit user toggles
	 * always win over the default.
	 */
	import type { Snippet } from 'svelte';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	type Props = {
		/** Stable identifier — used as the localStorage key suffix. */
		id: string;
		/** Header label shown in the toggle row. */
		label: string;
		/** Optional icon component rendered before the label. */
		icon?: Snippet;
		/** Optional trailing badge / count / chip rendered on the right. */
		badge?: Snippet;
		/** Whether the panel should be open on first visit. */
		defaultOpen?: boolean;
		/** Body content (snippet). */
		children: Snippet;
		/** Extra class on the body region. */
		bodyClass?: string;
	};

	let {
		id,
		label,
		icon,
		badge,
		defaultOpen = true,
		children,
		bodyClass = ''
	}: Props = $props();

	// id + defaultOpen are configuration set by the parent and don't change
	// over an Accordion's lifetime — initial-value-only is the desired
	// semantics here.
	// svelte-ignore state_referenced_locally
	const STORAGE_KEY = `font-studio:accordion:${id}`;
	// svelte-ignore state_referenced_locally
	let open = $state(defaultOpen);

	$effect(() => {
		if (typeof localStorage === 'undefined') return;
		try {
			const v = localStorage.getItem(STORAGE_KEY);
			if (v === '1') open = true;
			else if (v === '0') open = false;
		} catch {
			/* ignore */
		}
	});

	const toggle = () => {
		open = !open;
		try {
			localStorage.setItem(STORAGE_KEY, open ? '1' : '0');
		} catch {
			/* ignore */
		}
	};
</script>

<section class="border-b border-border">
	<button
		type="button"
		onclick={toggle}
		class="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[10px] font-semibold tracking-wider text-fg-subtle uppercase transition-colors hover:bg-surface-2/40 hover:text-fg"
		aria-expanded={open}
		title={open ? `Collapse ${label}` : `Expand ${label}`}
	>
		{#if open}
			<ChevronDown class="size-3 shrink-0 text-fg-subtle/70" aria-hidden="true" />
		{:else}
			<ChevronRight class="size-3 shrink-0 text-fg-subtle/70" aria-hidden="true" />
		{/if}
		{#if icon}
			{@render icon()}
		{/if}
		<span class="flex-1 truncate">{label}</span>
		{#if badge}
			{@render badge()}
		{/if}
	</button>
	{#if open}
		<div class="px-4 pb-4 {bodyClass}">
			{@render children()}
		</div>
	{/if}
</section>
