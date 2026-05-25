<script lang="ts">
	import { onMount } from 'svelte';

	type Props = {
		/** What's loading (e.g. "glyph", "specimen"). Used in the primary line. */
		label?: string;
		/** Rotating sub-messages — set this for slow ops (Python boot, family build). */
		messages?: readonly string[];
		/** How long each rotating sub-message is shown, ms. */
		rotateMs?: number;
		/** Fill the parent height. */
		fill?: boolean;
	};

	let { label = 'Loading', messages, rotateMs = 1800, fill = true }: Props = $props();

	// Typography flicker. Each style is the word "loading" rendered in its own
	// font + weight + slant; the style name below makes the loader self-
	// documenting. Cycles fast (160ms) so it reads as motion, not a slideshow.
	const TYPE_STYLES = [
		{ name: 'Sans', font: 'ui-sans-serif, system-ui, sans-serif', weight: 400, style: 'normal' },
		{ name: 'Serif', font: 'ui-serif, Georgia, "Times New Roman", serif', weight: 400, style: 'normal' },
		{ name: 'Mono', font: 'ui-monospace, Menlo, "Courier New", monospace', weight: 400, style: 'normal' },
		{ name: 'Slab', font: '"Georgia", "Hoefler Text", serif', weight: 700, style: 'normal' },
		{ name: 'Bold', font: 'ui-sans-serif, system-ui, sans-serif', weight: 800, style: 'normal' },
		{ name: 'Light', font: 'ui-sans-serif, system-ui, sans-serif', weight: 200, style: 'normal' },
		{ name: 'Black', font: 'ui-sans-serif, system-ui, sans-serif', weight: 900, style: 'normal' },
		{ name: 'Display', font: '"Times New Roman", "Hoefler Text", serif', weight: 900, style: 'normal' },
		{ name: 'Condensed', font: '"Arial Narrow", "Helvetica Neue Condensed", sans-serif', weight: 600, style: 'normal' }
	] as const;

	let styleIdx = $state(0);
	let messageIdx = $state(0);

	onMount(() => {
		// Respect prefers-reduced-motion: hold on a single style instead of
		// flickering. Pick "Sans" (index 0) — neutral and readable.
		const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
		const typeTick = reduced
			? undefined
			: setInterval(() => (styleIdx = (styleIdx + 1) % TYPE_STYLES.length), 160);
		let msgTick: ReturnType<typeof setInterval> | undefined;
		if (messages && messages.length > 1) {
			msgTick = setInterval(
				() => (messageIdx = (messageIdx + 1) % messages.length),
				rotateMs
			);
		}
		return () => {
			if (typeTick) clearInterval(typeTick);
			if (msgTick) clearInterval(msgTick);
		};
	});

	const currentStyle = $derived(TYPE_STYLES[styleIdx]);
	const currentMessage = $derived(messages?.[messageIdx]);
	const loadingWord = $derived(label.toLowerCase().replace(/[….]+$/, ''));
</script>

<div
	class="flex {fill ? 'h-full' : ''} flex-col items-center justify-center gap-3 text-fg-muted"
	role="status"
	aria-live="polite"
	aria-busy="true"
>
	<!-- Reduced-motion users see a single static rendering instead of the
	     fast type flicker. -->
	<div
		class="text-3xl leading-none tracking-tight text-fg motion-reduce:[animation:none]"
		style="font-family: {currentStyle.font}; font-weight: {currentStyle.weight}; font-style: {currentStyle.style};"
		aria-hidden="true"
	>
		{loadingWord}
	</div>

	<div class="flex flex-col items-center gap-0.5 text-center">
		<div
			class="font-mono text-[10px] tracking-wider text-fg-subtle uppercase tabular-nums"
			data-numeric
			aria-hidden="true"
		>
			{currentStyle.name}
		</div>
		{#if currentMessage}
			<div class="mt-1 text-[11px] text-fg-subtle">{currentMessage}</div>
		{/if}
	</div>

	<!-- Screen-reader-only label — the visual loop is decorative. -->
	<span class="sr-only">{label}</span>
</div>

<style>
	/* Static fallback for motion-reduce: pin styleIdx visually by disabling
	   the JS animation isn't possible at CSS layer; this is handled by the
	   timer simply not feeling like motion at this size. We do, however,
	   damp the cadence-driven layout shifts. */
	@media (prefers-reduced-motion: reduce) {
		div[role='status'] {
			--no-flicker: 1;
		}
	}
</style>
