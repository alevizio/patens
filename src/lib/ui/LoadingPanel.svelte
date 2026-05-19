<script lang="ts">
	import { onMount } from 'svelte';

	type Props = {
		/** What's loading (e.g. "glyph", "specimen"). Used in the primary line. */
		label?: string;
		/** Rotating sub-messages — set this for slow ops (Python boot, family build). */
		messages?: readonly string[];
		/** How long each rotating message is shown, ms. */
		rotateMs?: number;
		/** Delay before anything appears (avoids flicker on fast loads). */
		delayMs?: number;
		/** Fill the parent height. */
		fill?: boolean;
	};

	let {
		label = 'Loading',
		messages,
		rotateMs = 1800,
		delayMs = 120,
		fill = true
	}: Props = $props();

	let visible = $state(false);
	let messageIdx = $state(0);

	onMount(() => {
		const t = setTimeout(() => (visible = true), delayMs);
		let rot: ReturnType<typeof setInterval> | undefined;
		if (messages && messages.length > 1) {
			rot = setInterval(
				() => (messageIdx = (messageIdx + 1) % messages.length),
				rotateMs
			);
		}
		return () => {
			clearTimeout(t);
			if (rot) clearInterval(rot);
		};
	});

	const currentMessage = $derived(messages?.[messageIdx]);
</script>

<div
	class="flex {fill ? 'h-full' : ''} flex-col items-center justify-center gap-4 text-fg-muted transition-opacity duration-200 {visible
		? 'opacity-100'
		: 'opacity-0'}"
	role="status"
	aria-live="polite"
	aria-busy="true"
>
	<!-- Three dots in a row, each pulsing on a stagger.
	     Reduced-motion users get a static dot trio instead — no animation. -->
	<div class="flex gap-1.5 motion-reduce:gap-1" aria-hidden="true">
		<span
			class="size-1.5 rounded-full bg-fg-muted/60 motion-safe:animate-[loading-pulse_1.2s_ease-in-out_infinite] motion-safe:[animation-delay:-0.32s]"
		></span>
		<span
			class="size-1.5 rounded-full bg-fg-muted/60 motion-safe:animate-[loading-pulse_1.2s_ease-in-out_infinite] motion-safe:[animation-delay:-0.16s]"
		></span>
		<span
			class="size-1.5 rounded-full bg-fg-muted/60 motion-safe:animate-[loading-pulse_1.2s_ease-in-out_infinite]"
		></span>
	</div>

	<div class="text-center">
		<div class="text-[12px] font-medium text-fg">{label}</div>
		{#if currentMessage}
			<div class="mt-1 text-[11px] text-fg-subtle">{currentMessage}</div>
		{/if}
	</div>
</div>

<style>
	@keyframes loading-pulse {
		0%,
		80%,
		100% {
			opacity: 0.3;
			transform: scale(0.85);
		}
		40% {
			opacity: 1;
			transform: scale(1);
		}
	}
</style>
