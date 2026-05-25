<script lang="ts">
	import '../app.css';
	import ToastContainer from '$lib/ui/ToastContainer.svelte';
	import OfflineIndicator from '$lib/ui/OfflineIndicator.svelte';
	import { consoleHello, installKonamiListener, celebrate } from '$lib/delight';
	import { toast } from '$lib/stores/toast.svelte';
	import { onMount, onDestroy } from 'svelte';

	let { children } = $props();

	let cleanupKonami: (() => void) | null = null;
	onMount(() => {
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

<svelte:head>
	<title>Patens</title>
	<meta
		name="description"
		content="Sketch-first personal type design tool. Draw, vectorize, space, kern, and export OTF in the browser."
	/>

	<!-- Open Graph + Twitter Card. Per-route +page.svelte can override title /
	     description / og:title / og:description via their own svelte:head; the
	     image at /og.png is dynamically rendered from the demo OTF + Satori
	     (see src/routes/og.png/+server.ts). -->
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="Patens" />
	<meta property="og:title" content="Patens" />
	<meta
		property="og:description"
		content="Sketch-first browser type editor — variable fonts, AI completion, OTF export."
	/>
	<meta property="og:image" content="/og.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="Patens — Hn wordmark with HONE and TONE rendered in the app's demo typeface" />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Patens" />
	<meta
		name="twitter:description"
		content="Sketch-first browser type editor — variable fonts, AI completion, OTF export."
	/>
	<meta name="twitter:image" content="/og.png" />
</svelte:head>

<div class="min-h-screen">
	{@render children()}
</div>
<ToastContainer />
<OfflineIndicator />
