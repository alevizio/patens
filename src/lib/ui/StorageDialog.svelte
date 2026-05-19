<script lang="ts">
	import Panel from './Panel.svelte';
	import X from '@lucide/svelte/icons/x';
	import HardDrive from '@lucide/svelte/icons/hard-drive';
	import Download from '@lucide/svelte/icons/download';
	import Upload from '@lucide/svelte/icons/upload';

	type Props = {
		open: boolean;
		onclose: () => void;
		used: number;
		quota: number;
		projectCount: number;
		backingUp: boolean;
		restoring: boolean;
		restoreMessage: string | null;
		onbackup: () => void;
		onrestore: (file: File) => void;
	};

	let {
		open,
		onclose,
		used,
		quota,
		projectCount,
		backingUp,
		restoring,
		restoreMessage,
		onbackup,
		onrestore
	}: Props = $props();

	const pct = $derived(
		quota > 0 ? Math.min(100, Math.round((used / quota) * 1000) / 10) : 0
	);

	const formatBytes = (bytes: number): string => {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
		return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
	};
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 grid place-items-center bg-fg/40 p-4 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-labelledby="storage-title"
		onclick={(e) => {
			if (e.target === e.currentTarget) onclose();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') onclose();
		}}
		tabindex="-1"
	>
		<Panel class="w-full max-w-md">
			<div class="mb-5 flex items-start justify-between gap-3">
				<div class="flex items-center gap-3">
					<div
						class="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent-strong"
					>
						<HardDrive class="size-4" />
					</div>
					<div>
						<h2
							id="storage-title"
							class="text-[18px] leading-tight tracking-tight text-fg"
							style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
						>
							Browser storage
						</h2>
						<p class="mt-0.5 text-[11px] text-fg-subtle">
							Projects live in this browser
						</p>
					</div>
				</div>
				<button
					type="button"
					onclick={onclose}
					class="rounded p-1 text-fg-muted hover:bg-surface-2 hover:text-fg"
					aria-label="Close"
					title="Close (Esc)"
				>
					<X class="size-4" />
				</button>
			</div>

			<!-- Usage figure as the hero number. -->
			<div class="mb-5">
				<div class="flex items-baseline justify-between gap-2">
					<span
						class="font-mono text-[28px] leading-none text-fg"
						data-numeric
						title="{pct}% used"
					>
						{formatBytes(used)}
					</span>
					<span
						class="font-mono text-[12px] text-fg-subtle"
						data-numeric
					>
						of {formatBytes(quota)}
					</span>
				</div>
				<div class="mt-3 h-1 overflow-hidden rounded-full bg-surface-2">
					<div
						class="h-full transition-all {pct > 80
							? 'bg-danger'
							: pct > 50
								? 'bg-warn'
								: 'bg-fg/40'}"
						style="width: {Math.max(pct, 0.5)}%;"
					></div>
				</div>
				<p class="mt-3 text-[12px] leading-relaxed text-fg-muted">
					Back up periodically to keep a copy outside this browser. Clearing
					site data or running out of quota will lose unsaved projects.
				</p>
			</div>

			<!-- Backup / Restore actions. -->
			<div class="grid gap-2">
				{#if projectCount > 0}
					<button
						type="button"
						onclick={onbackup}
						disabled={backingUp}
						class="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2/40 px-4 py-2.5 text-[13px] font-medium text-fg transition-colors hover:border-accent hover:bg-accent-soft/40 hover:text-accent-strong disabled:opacity-60"
					>
						<span class="inline-flex items-center gap-2">
							<Download class="size-3.5" />
							{backingUp ? 'Bundling…' : `Backup ${projectCount} project${projectCount === 1 ? '' : 's'} to JSON`}
						</span>
						<span class="font-mono text-[11px] text-fg-subtle">→</span>
					</button>
				{/if}
				<label
					class="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-surface-2/40 px-4 py-2.5 text-[13px] font-medium text-fg transition-colors hover:border-accent hover:bg-accent-soft/40 hover:text-accent-strong"
				>
					<span class="inline-flex items-center gap-2">
						<Upload class="size-3.5" />
						{restoring ? 'Restoring…' : 'Restore from JSON…'}
					</span>
					<span class="font-mono text-[11px] text-fg-subtle">↑</span>
					<input
						type="file"
						accept="application/json,.json"
						class="hidden"
						disabled={restoring}
						onchange={(e) => {
							const f = e.currentTarget.files?.[0];
							if (f) onrestore(f);
							e.currentTarget.value = '';
						}}
					/>
				</label>
				{#if restoreMessage}
					<p class="text-[11px] text-fg-subtle">{restoreMessage}</p>
				{/if}
			</div>
		</Panel>
	</div>
{/if}
