<script lang="ts">
	import '../app.css';
	import ToastContainer from '$lib/ui/ToastContainer.svelte';

	let { children } = $props();
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
