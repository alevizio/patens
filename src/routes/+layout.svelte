<script lang="ts">
	import '../app.css';
	import ToastContainer from '$lib/ui/ToastContainer.svelte';
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
	<title>Font Studio</title>
	<meta
		name="description"
		content="Sketch-first personal type design tool. Draw, vectorize, space, kern, and export OTF in the browser."
	/>
</svelte:head>

<div class="min-h-screen">
	{@render children()}
</div>
<ToastContainer />
