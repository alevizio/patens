<script lang="ts">
	/**
	 * OfflineIndicator — a small banner that surfaces when `navigator.onLine`
	 * goes false. Sits in the global layout so it's available on every route.
	 *
	 * The service worker makes most of the app keep working offline (cached
	 * static assets + cached HTML routes), so the message is about the
	 * scope of what fails: cloud share writes, OG image refresh, RSS poll —
	 * not the editor itself.
	 *
	 * Auto-dismisses when connectivity returns.
	 */
	import { onMount } from 'svelte';
	import WifiOff from '@lucide/svelte/icons/wifi-off';

	let online = $state(true);

	onMount(() => {
		online = navigator.onLine;
		const onOnline = () => (online = true);
		const onOffline = () => (online = false);
		window.addEventListener('online', onOnline);
		window.addEventListener('offline', onOffline);
		return () => {
			window.removeEventListener('online', onOnline);
			window.removeEventListener('offline', onOffline);
		};
	});
</script>

{#if !online}
	<div
		class="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 transform"
		role="status"
		aria-live="polite"
	>
		<div
			class="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-[12px] text-fg-muted shadow-sm"
		>
			<WifiOff class="size-3.5 text-warn" />
			<span>Offline — local edits still save; share + cloud sync paused.</span>
		</div>
	</div>
{/if}
