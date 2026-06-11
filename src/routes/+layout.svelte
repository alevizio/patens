<script lang="ts">
	import '../app.css';
	import ToastContainer from '$lib/ui/ToastContainer.svelte';
	import OfflineIndicator from '$lib/ui/OfflineIndicator.svelte';
	// CommandPalette is Cmd-K-triggered — defer the 15 KB module until
	// first activation. Saves the cost on every cold load across every
	// route, since this layout wraps the entire app.
	import type CommandPaletteType from '$lib/ui/CommandPalette.svelte';
	import { palette } from '$lib/stores/palette.svelte';
	import { consoleHello, installKonamiListener, celebrate } from '$lib/delight';
	import { toast } from '$lib/stores/toast.svelte';
	import { onMount, onDestroy } from 'svelte';

	let { children } = $props();

	// Global Cmd-K / Ctrl-K — opens the command palette from any route.
	// CommandPalette is project-aware (searches glyphs in a project,
	// searches projects + families otherwise).
	const handleGlobalKey = (e: KeyboardEvent) => {
		if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
			// Inputs/textareas keep their browser Cmd-K behavior intact.
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
				return;
			e.preventDefault();
			palette.toggle();
		}
	};

	// Lazy-load CommandPalette only when palette.open flips true (first
	// Cmd-K press). 15 KB saved on every cold load.
	let CommandPaletteLazy = $state<typeof CommandPaletteType | null>(null);
	$effect(() => {
		if (palette.open && !CommandPaletteLazy) {
			import('$lib/ui/CommandPalette.svelte').then((m) => {
				CommandPaletteLazy = m.default;
			});
		}
	});

	let cleanupKonami: (() => void) | null = null;
	onMount(() => {
		// Hydration sentinel. With SSR on, the layout's HTML lands before
		// hydration attaches event listeners, so playwright clicks can race
		// the hydration boundary. Setting this attribute *after* onMount
		// gives tests a clean signal that "Svelte has mounted and listeners
		// are live." Negligible runtime cost; no visual effect.
		document.documentElement.dataset.hydrated = 'true';
		consoleHello();
		cleanupKonami = installKonamiListener(() => {
			toast.success('★ Foundry mode unlocked.');
			celebrate('large');
		});
	});
	onDestroy(() => {
		cleanupKonami?.();
	});
</script>

<svelte:window onkeydown={handleGlobalKey} />

<svelte:head>
	<title>Patens</title>
	<meta name="author" content="Alejandro Vizio" />

	<!-- Identity-level tags ONLY. Svelte does NOT dedupe meta tags — a
	     layout-level description/og:title/og:image renders BEFORE any
	     page-level one and crawlers take the first, which silently
	     defeated every per-page description and all 7 custom OG card
	     variants (2026-06 QA). Each +page.svelte declares its own
	     title/description/og:*/twitter:* set (34 routes verified);
	     the layout keeps only what is page-invariant and never
	     overridden. <title> alone is special-cased by Svelte and safe
	     as a fallback. -->
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="Patens" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:site" content="@patenstype" />
	<meta name="twitter:creator" content="@patenstype" />
</svelte:head>

<!-- Skip-to-content link — invisible until focused with the keyboard.
     Lets users on screen readers / keyboard-only navigation jump
     straight past the header into the page's main content without
     re-tabbing through the nav on every route. -->
<a
	href="#main-content"
	class="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-fg focus-visible:px-3 focus-visible:py-2 focus-visible:text-[12px] focus-visible:font-medium focus-visible:text-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
>
	Skip to content
</a>
<div id="main-content" class="min-h-screen">
	{@render children()}
</div>
<ToastContainer />
<OfflineIndicator />
{#if CommandPaletteLazy}
	<CommandPaletteLazy open={palette.open} onclose={() => palette.hide()} />
{/if}
