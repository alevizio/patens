<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { contoursToSvgPath } from '$lib/font/path';
	import Camera from '@lucide/svelte/icons/camera';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';

	const glyph = $derived(projectStore.selectedGlyph);
	const metrics = $derived(projectStore.project?.metrics);
	const revisions = $derived(glyph?.revisions ?? []);

	const formatTime = (iso: string): string => {
		const then = new Date(iso).getTime();
		const diff = Date.now() - then;
		const min = Math.round(diff / 60000);
		if (min < 1) return 'just now';
		if (min < 60) return `${min}m`;
		const hr = Math.round(min / 60);
		if (hr < 24) return `${hr}h`;
		return new Date(iso).toLocaleDateString();
	};

	const takeSnapshot = () => {
		if (!glyph || glyph.contours.length === 0) return;
		projectStore.saveRevision(glyph.codepoint);
		toast.success('Snapshot saved');
	};

	const restore = (revId: string) => {
		if (!glyph) return;
		projectStore.restoreRevision(glyph.codepoint, revId);
		toast.info('Restored snapshot — ⌘Z to undo');
	};

	const remove = (revId: string) => {
		if (!glyph) return;
		projectStore.deleteRevision(glyph.codepoint, revId);
	};
</script>

{#if glyph}
	<div class="border-b border-border p-4">
		<h3 class="mb-2 flex items-center justify-between text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			<span class="inline-flex items-center gap-1.5">
				<Camera class="size-3" /> Snapshots
				<span class="text-fg-subtle" data-numeric>{revisions.length}/8</span>
			</span>
			<button
				type="button"
				onclick={takeSnapshot}
				disabled={glyph.contours.length === 0}
				class="inline-flex h-5 items-center gap-1 rounded border border-border bg-surface px-1.5 text-[10px] font-medium text-fg-muted hover:border-accent hover:text-accent disabled:opacity-40"
				title="Capture the current state for later"
			>
				Snap
			</button>
		</h3>
		{#if revisions.length === 0}
			<p class="text-[11px] text-fg-subtle">
				Capture iterations as you go — restore any of the last 8.
			</p>
		{:else}
			<ul class="grid gap-1">
				{#each revisions as r (r.id)}
					<li class="flex items-center gap-2 rounded-md border border-border bg-surface-2/40 px-2 py-1.5">
						<svg
							viewBox="0 {metrics?.descender ?? -200} {Math.max(r.advanceWidth, 100)} {(metrics?.ascender ?? 800) - (metrics?.descender ?? -200)}"
							width="32"
							height="32"
							preserveAspectRatio="xMidYMid meet"
							style="transform: scaleY(-1);"
							aria-hidden="true"
						>
							<path
								d={contoursToSvgPath(r.contours)}
								fill="currentColor"
								fill-rule="evenodd"
							/>
						</svg>
						<span class="flex-1 truncate text-[11px] text-fg-muted" data-numeric>
							{formatTime(r.takenAt)}
						</span>
						<button
							type="button"
							onclick={() => restore(r.id)}
							class="rounded p-0.5 text-fg-subtle hover:bg-accent/10 hover:text-accent-strong"
							aria-label="Restore this snapshot"
							title="Restore"
						>
							<RotateCcw class="size-3" />
						</button>
						<button
							type="button"
							onclick={() => remove(r.id)}
							class="rounded p-0.5 text-fg-subtle hover:bg-danger/10 hover:text-danger-strong"
							aria-label="Delete this snapshot"
							title="Delete"
						>
							<Trash2 class="size-3" />
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
{/if}
