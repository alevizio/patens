<script lang="ts">
	import { toast } from '$lib/stores/toast.svelte';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import Info from '@lucide/svelte/icons/info';
	import X from '@lucide/svelte/icons/x';

	const iconFor = (kind: 'info' | 'success' | 'warn' | 'error') =>
		kind === 'success'
			? CheckCircle2
			: kind === 'error'
				? AlertCircle
				: kind === 'warn'
					? AlertTriangle
					: Info;

	const colorFor = (kind: 'info' | 'success' | 'warn' | 'error') =>
		kind === 'success'
			? 'border-success/40 bg-success/10 text-success-strong'
			: kind === 'error'
				? 'border-danger/40 bg-danger/10 text-danger-strong'
				: kind === 'warn'
					? 'border-warn/40 bg-warn/10 text-warn-strong'
					: 'border-accent/40 bg-accent/10 text-accent-strong';
</script>

<div class="pointer-events-none fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col gap-2">
	{#each toast.items as t (t.id)}
		{@const Icon = iconFor(t.kind)}
		<div
			role="status"
			aria-live="polite"
			class="pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2 text-[12px] font-medium shadow-lg backdrop-blur-sm {colorFor(t.kind)}"
		>
			<Icon class="mt-0.5 size-3.5 shrink-0" />
			<span class="flex-1">{t.message}</span>
			<button
				type="button"
				onclick={() => toast.dismiss(t.id)}
				class="ml-1 rounded p-0.5 opacity-60 hover:opacity-100"
				aria-label="Dismiss notification"
				title="Dismiss"
			>
				<X class="size-3" />
			</button>
		</div>
	{/each}
</div>
