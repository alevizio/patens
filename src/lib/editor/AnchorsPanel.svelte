<script lang="ts">
	// Anchors panel — list of named attach points on the glyph, with the
	// bbox-suggest button (per-glyph) and a project-wide "apply to all
	// drifted" button. The 5 quick-add chips (top/bottom/_top/_bottom/
	// ogonek) cover ~95% of accent-mark wiring.
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { projectStore } from '$lib/stores/project.svelte';
	import { suggestAnchors, findAnchorDrift } from '$lib/font/anchors-suggest';
	import { toast } from '$lib/stores/toast.svelte';
	import type { Glyph } from '$lib/font/types';

	type Props = {
		glyph: Glyph;
		onAddAnchor: (name: string) => void;
		onRemoveAnchor: (name: string) => void;
	};
	let { glyph, onAddAnchor, onRemoveAnchor }: Props = $props();

	const SUGGESTED_NAMES = ['top', 'bottom', '_top', '_bottom', 'ogonek'] as const;
</script>

<div class="border-b border-border p-4">
	<h3
		class="mb-3 flex items-center justify-between text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"
	>
		<span>Anchors</span>
		<span class="text-fg-subtle" data-numeric>{glyph.anchors?.length ?? 0}</span>
	</h3>
	{#if projectStore.project}
		{@const suggestions = suggestAnchors(glyph, projectStore.project)}
		{#if suggestions.length > 0}
			{@const needsUpdate = suggestions.some((s) => {
				const ex = glyph.anchors?.find((a) => a.name === s.name);
				return !ex || Math.abs(ex.x - s.x) > 8 || Math.abs(ex.y - s.y) > 8;
			})}
			{#if needsUpdate}
				<button
					type="button"
					onclick={() =>
						projectStore.applyAnchorSuggestions(
							glyph.codepoint,
							suggestions.map((s) => ({ name: s.name, x: s.x, y: s.y }))
						)}
					class="mb-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-accent/40 bg-accent-soft/60 px-2 py-1.5 text-[11px] font-medium text-accent-strong hover:bg-accent-soft"
					title="Centre anchors on the glyph's actual bbox at cap/x-height. Existing custom-named anchors are preserved."
				>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						class="size-3"
					>
						<path d="M5 12h14M12 5v14M9 9l3-3 3 3M9 15l3 3 3-3" />
					</svg>
					Suggest anchors from bbox
				</button>
			{/if}
		{/if}
		{@const projectDrift = findAnchorDrift(projectStore.project)}
		{#if projectDrift.length > 0}
			<button
				type="button"
				onclick={() => {
					for (const item of projectDrift) {
						projectStore.applyAnchorSuggestions(
							item.codepoint,
							item.suggestions.map((s) => ({ name: s.name, x: s.x, y: s.y }))
						);
					}
					toast.success(
						`Applied bbox anchors to ${projectDrift.length} glyph${projectDrift.length === 1 ? '' : 's'}.`
					);
				}}
				class="mb-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium text-fg-muted hover:border-accent hover:text-accent"
				title="Re-centre anchors on bbox for every glyph in the project that's drifted"
			>
				Apply to {projectDrift.length} drifted glyph{projectDrift.length === 1
					? ''
					: 's'} project-wide
			</button>
		{/if}
	{/if}
	{#if glyph.anchors && glyph.anchors.length > 0}
		<ul class="mb-2 grid gap-1">
			{#each glyph.anchors as a (a.name)}
				<li
					class="flex items-center justify-between gap-2 rounded-md border border-border bg-surface-2/40 px-2 py-1.5 text-[12px]"
				>
					<span class="font-mono text-warn">{a.name}</span>
					<span class="text-fg-subtle" data-numeric>{a.x}, {a.y}</span>
					<button
						type="button"
						onclick={() => onRemoveAnchor(a.name)}
						class="rounded p-0.5 text-fg-subtle hover:bg-danger/10 hover:text-danger-strong"
						aria-label="Remove anchor {a.name}"
						title="Remove anchor {a.name}"
					>
						<Trash2 class="size-3" />
					</button>
				</li>
			{/each}
		</ul>
	{/if}
	<div class="flex flex-wrap gap-1.5">
		{#each SUGGESTED_NAMES as suggested (suggested)}
			{#if !glyph.anchors?.some((a) => a.name === suggested)}
				<button
					type="button"
					onclick={() => onAddAnchor(suggested)}
					class="rounded-md border border-dashed border-border-strong/50 bg-transparent px-2 py-1 font-mono text-[11px] text-fg-muted hover:border-warn hover:bg-warn/10 hover:text-warn-strong"
				>
					+ {suggested}
				</button>
			{/if}
		{/each}
	</div>
</div>
