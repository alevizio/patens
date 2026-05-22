<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { contoursToSvgPath } from '$lib/font/path';
	import Camera from '@lucide/svelte/icons/camera';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Pin from '@lucide/svelte/icons/pin';
	import PinOff from '@lucide/svelte/icons/pin-off';

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

	// Label state for the next snapshot. Cleared after Snap so the
	// input doesn't carry stale text across glyphs / sessions.
	let pendingLabel = $state('');
	const takeSnapshot = () => {
		if (!glyph || glyph.contours.length === 0) return;
		const label = pendingLabel.trim() || undefined;
		projectStore.saveRevision(glyph.codepoint, label);
		toast.success(label ? `Snapshot: "${label}"` : 'Snapshot saved');
		pendingLabel = '';
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

	const togglePin = (revId: string) => {
		if (!glyph) return;
		projectStore.toggleRevisionPin(glyph.codepoint, revId);
	};

	// Inline rename state — only one row is editable at a time.
	let editingRevId = $state<string | null>(null);
	let editingLabel = $state('');
	const startEdit = (revId: string, currentLabel: string | undefined) => {
		editingRevId = revId;
		editingLabel = currentLabel ?? '';
	};
	const commitEdit = () => {
		if (!glyph || !editingRevId) return;
		projectStore.renameRevision(glyph.codepoint, editingRevId, editingLabel);
		editingRevId = null;
		editingLabel = '';
	};
	const cancelEdit = () => {
		editingRevId = null;
		editingLabel = '';
	};
	const focusOnMount = (node: HTMLInputElement) => {
		queueMicrotask(() => node.focus());
	};

	// The active ghost: most-recent pinned snapshot. Mirrors the logic in
	// the editor's pinnedSnapshotGhost derivation so the label here matches
	// what's painted on the canvas.
	const activeGhost = $derived.by(() => {
		const pins = revisions.filter((r) => r.pinned);
		if (pins.length === 0) return null;
		return pins.reduce((a, b) => (a.takenAt > b.takenAt ? a : b));
	});
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
		<!-- Optional label for the next snapshot — useful for marking
		     "before redrawing the bowl" / "v2 with serif" / etc. Cleared
		     after each save so the input stays fresh. -->
		<input
			type="text"
			bind:value={pendingLabel}
			placeholder="Label (optional) — Enter to snap"
			disabled={glyph.contours.length === 0}
			onkeydown={(e) => {
				if (e.key === 'Enter') takeSnapshot();
			}}
			class="mb-2 w-full rounded border border-border bg-surface px-2 py-1 text-[11px] outline-none focus:border-accent disabled:opacity-40"
		/>
		{#if activeGhost}
			<!-- Tells the designer which pinned snapshot is being rendered as
			     the canvas ghost. Pinning multiple? Most-recent wins; this
			     line confirms which one. -->
			<div class="mb-2 flex items-center gap-1.5 rounded bg-warn/10 px-2 py-1 text-[10px] text-warn-strong">
				<span class="inline-block size-1.5 rounded-full bg-warn"></span>
				<span class="truncate">
					Ghost: {activeGhost.label ?? formatTime(activeGhost.takenAt)}
				</span>
			</div>
		{/if}
		{#if revisions.length === 0}
			<p class="text-[11px] text-fg-subtle">
				Capture iterations as you go — restore any of the last 8.
			</p>
		{:else}
			<ul class="grid gap-1">
				{#each revisions as r (r.id)}
					<li
						class="flex items-center gap-2 rounded-md border px-2 py-1.5 {r.pinned
							? 'border-accent/40 bg-accent-soft/20'
							: 'border-border bg-surface-2/40'}"
					>
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
						<span class="flex-1 min-w-0 truncate text-[11px] text-fg-muted">
							{#if editingRevId === r.id}
								<!-- Inline rename input. Enter commits, Escape cancels,
								     blur commits (so clicking elsewhere saves too). Focus
								     via an action since entering edit mode is an explicit
								     designer click — a11y linter accepts this over autofocus. -->
								<input
									type="text"
									bind:value={editingLabel}
									use:focusOnMount
									placeholder="Label"
									onkeydown={(e) => {
										if (e.key === 'Enter') commitEdit();
										else if (e.key === 'Escape') cancelEdit();
									}}
									onblur={commitEdit}
									class="block w-full rounded border border-accent bg-surface px-1.5 py-0.5 text-[11px] text-fg outline-none"
								/>
								<span class="block text-[10px] text-fg-subtle" data-numeric>
									{formatTime(r.takenAt)}
								</span>
							{:else}
								<button
									type="button"
									onclick={() => startEdit(r.id, r.label)}
									class="block w-full truncate text-left hover:text-accent"
									title="Click to rename"
								>
									{#if r.label}
										<span class="block truncate text-fg">{r.label}</span>
										<span class="block text-[10px] text-fg-subtle" data-numeric>
											{formatTime(r.takenAt)}
										</span>
									{:else}
										<span class="text-fg-subtle italic" data-numeric>
											{formatTime(r.takenAt)} · click to label
										</span>
									{/if}
								</button>
							{/if}
						</span>
						<button
							type="button"
							onclick={() => togglePin(r.id)}
							class="rounded p-0.5 {r.pinned
								? 'text-accent-strong hover:bg-accent/10'
								: 'text-fg-subtle hover:bg-accent/10 hover:text-accent-strong'}"
							aria-label={r.pinned ? 'Unpin this snapshot' : 'Pin this snapshot'}
							title={r.pinned ? 'Unpin — let it rotate out' : 'Pin — exempt from the 8-cap rotation'}
						>
							{#if r.pinned}
								<PinOff class="size-3" />
							{:else}
								<Pin class="size-3" />
							{/if}
						</button>
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
