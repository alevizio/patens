<script lang="ts">
	import { onMount, type Snippet } from 'svelte';

	/**
	 * Defers rendering of a heavy section until it's near the viewport. Used
	 * on the share page where 79+ glyph SVGs land in multiple grids and
	 * waterfalls — cold load was paying for all of them on first paint even
	 * when a designer-friend lands above-fold and scrolls down later.
	 *
	 * Strategy: render an empty placeholder of approximate height, observe
	 * its intersection with a generous root margin (200px) so the content
	 * mounts JUST before the user scrolls to it. Once mounted, stay mounted
	 * — re-mounting on scroll-out would break things like inspector state.
	 *
	 * The `minHeight` prop is the placeholder's size in pixels, used to
	 * preserve scroll position when the real content swaps in. Pick a
	 * value close to the section's actual rendered height; over-estimating
	 * is safe, under-estimating causes a small layout shift on mount.
	 */
	type Props = {
		minHeight?: number;
		rootMargin?: string;
		/** Force-mount immediately regardless of intersection — used for the
		 *  auto-print path so the printed specimen includes below-fold
		 *  sections that haven't scrolled into view yet. */
		forceMount?: boolean;
		children: Snippet;
	};
	let {
		minHeight = 400,
		rootMargin = '200px',
		forceMount = false,
		children
	}: Props = $props();

	let placeholder: HTMLDivElement | null = $state(null);
	let mounted = $state(false);
	// Reactive force-mount: when the parent sets forceMount=true (e.g.
	// ?print=1 detected), mount immediately. One-way — once mounted,
	// staying mounted is correct regardless of forceMount value later.
	$effect(() => {
		if (forceMount) mounted = true;
	});

	onMount(() => {
		if (mounted) return;
		// beforeprint must force-mount EVERY lazy section before the print
		// dialog snapshots the document. Otherwise the specimen PDF prints
		// empty placeholders below the fold. Browsers fire beforeprint
		// synchronously before the dialog appears, so setting mounted=true
		// here is reflected in the snapshotted DOM.
		const onBeforePrint = () => {
			mounted = true;
		};
		window.addEventListener('beforeprint', onBeforePrint);
		if (typeof IntersectionObserver === 'undefined') {
			// SSR or very old browsers — just mount the content. The share
			// page is ssr=false anyway, so this branch is mostly defensive.
			mounted = true;
			return () => window.removeEventListener('beforeprint', onBeforePrint);
		}
		const obs = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						mounted = true;
						obs.disconnect();
						break;
					}
				}
			},
			{ rootMargin }
		);
		if (placeholder) obs.observe(placeholder);
		return () => {
			obs.disconnect();
			window.removeEventListener('beforeprint', onBeforePrint);
		};
	});
</script>

{#if mounted}
	{@render children()}
{:else}
	<div bind:this={placeholder} style="min-height: {minHeight}px;" aria-hidden="true"></div>
{/if}
