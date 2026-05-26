<script lang="ts">
	/**
	 * Reusable button for the editor's right-sidebar accordions. The
	 * 17+ inline-styled buttons in PathOpsAccordion, BrushAccordion,
	 * DeriveAccordion etc. all share the same visual language; this
	 * component carries the canonical styling so they stay in sync.
	 *
	 * Variants:
	 *   - secondary (default): outlined surface-2 button, the most common
	 *   - primary: filled accent button for the headline action of a panel
	 *   - ghost: borderless, hover-only — for inline tertiary actions
	 *
	 * Includes a press-animation (scale 0.97 on :active) for tactile
	 * feedback and a focus-visible ring for keyboard navigation.
	 */
	import type { Snippet } from 'svelte';

	export type Variant = 'primary' | 'secondary' | 'ghost';

	type Props = {
		onclick: (e: MouseEvent) => void;
		disabled?: boolean;
		variant?: Variant;
		title?: string;
		ariaLabel?: string;
		fullWidth?: boolean;
		children: Snippet;
	};
	let {
		onclick,
		disabled = false,
		variant = 'secondary',
		title,
		ariaLabel,
		fullWidth = false,
		children
	}: Props = $props();

	const VARIANT_CLASSES: Record<Variant, string> = {
		primary:
			'border-accent bg-accent text-accent-fg hover:bg-accent/90 focus-visible:ring-accent/60',
		secondary:
			'border-border bg-surface-2 text-fg-muted hover:border-accent hover:bg-accent-soft hover:text-fg focus-visible:ring-accent/40',
		ghost:
			'border-transparent bg-transparent text-fg-muted hover:bg-surface-2 hover:text-fg focus-visible:ring-accent/40'
	};
</script>

<button
	type="button"
	{onclick}
	{disabled}
	{title}
	aria-label={ariaLabel}
	class="inline-flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-[11px] font-medium transition-[background-color,border-color,color,transform] duration-100 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface-2 disabled:hover:border-border disabled:hover:text-fg-muted disabled:active:scale-100 {fullWidth
		? 'w-full'
		: ''} {VARIANT_CLASSES[variant]}"
>
	{@render children()}
</button>
