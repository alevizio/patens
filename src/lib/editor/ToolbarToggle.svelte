<script lang="ts">
	/**
	 * Top-toolbar toggle button used across the editor's view-toggles
	 * row. Shows an active state with a subtle filled background; off
	 * state is borderless text. Supports an optional leading icon.
	 *
	 * Variants:
	 *   - neutral (default): fg/10 background when active
	 *   - accent: accent-soft background when active (for primary toggles)
	 *   - warn: warn/10 background when active (for callouts like anchors,
	 *     sketch — warm-coloured layers in the canvas)
	 *
	 * Includes Eye/EyeOff swap when `kind="visibility"` so the consumer
	 * doesn't have to repeat the icon-swap pattern 9 times.
	 */
	import type { Snippet } from 'svelte';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';

	export type ToggleVariant = 'neutral' | 'accent' | 'warn';
	export type ToggleKind = 'visibility' | 'plain';

	type Props = {
		active: boolean;
		onclick: () => void;
		title?: string;
		variant?: ToggleVariant;
		/** "visibility" auto-renders the eye/eye-off pair; "plain" lets you pass a custom icon. */
		kind?: ToggleKind;
		icon?: Snippet;
		children: Snippet;
	};
	let {
		active,
		onclick,
		title,
		variant = 'neutral',
		kind = 'visibility',
		icon,
		children
	}: Props = $props();

	const ACTIVE_CLASSES: Record<ToggleVariant, string> = {
		neutral: 'bg-fg/10 text-fg',
		accent: 'bg-accent-soft text-accent-strong',
		warn: 'bg-warn/10 text-warn-strong'
	};
</script>

<button
	type="button"
	{onclick}
	{title}
	aria-pressed={active}
	class="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 {active
		? ACTIVE_CLASSES[variant]
		: 'text-fg-subtle hover:bg-surface-2 hover:text-fg'}"
>
	{#if kind === 'visibility'}
		{#if active}
			<Eye class="size-3.5" aria-hidden="true" />
		{:else}
			<EyeOff class="size-3.5" aria-hidden="true" />
		{/if}
	{:else if icon}
		{@render icon()}
	{/if}
	{@render children()}
</button>
