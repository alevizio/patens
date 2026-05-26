<script lang="ts">
	// Glyph status panel — 4-state radio (empty / sketch / draft / final)
	// plus reset + remove glyph buttons in the header. Both destructive
	// actions confirm() first; toast.warn surfaces the ⌘Z hint.
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { projectStore } from '$lib/stores/project.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import type { Glyph } from '$lib/font/types';

	type Props = { glyph: Glyph };
	let { glyph }: Props = $props();

	const STATUSES = ['empty', 'sketch', 'draft', 'final'] as const;
</script>

<div class="border-b border-border p-4">
	<h3
		class="mb-3 flex items-center justify-between text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"
	>
		<span>Status</span>
		<div class="flex items-center gap-0.5">
			<button
				type="button"
				onclick={() => {
					if (
						confirm(
							`Reset glyph "${glyph.name}" to empty? Clears outlines, sketches, components, anchors, notes, and the reference image.`
						)
					) {
						const name = glyph.name;
						projectStore.resetGlyph(glyph.codepoint);
						toast.warn(`Reset "${name}" — ⌘Z to undo`, 4000);
					}
				}}
				class="rounded p-0.5 text-fg-subtle hover:bg-warn/10 hover:text-warn-strong"
				aria-label="Reset glyph to empty"
				title="Reset glyph (keep its slot but wipe data)"
			>
				<RotateCcw class="size-3" />
			</button>
			<button
				type="button"
				onclick={() => {
					if (
						confirm(
							`Remove glyph "${glyph.name}" from the font? Any kerning references will also be dropped.`
						)
					) {
						const name = glyph.name;
						projectStore.removeGlyph(glyph.codepoint);
						toast.warn(`Removed "${name}" — ⌘Z to undo`, 4000);
					}
				}}
				class="rounded p-0.5 text-fg-subtle hover:bg-danger/10 hover:text-danger-strong"
				aria-label="Delete glyph"
				title="Remove this glyph from the font"
			>
				<Trash2 class="size-3" />
			</button>
		</div>
	</h3>
	<div class="grid grid-cols-2 gap-1">
		{#each STATUSES as status (status)}
			<button
				type="button"
				class="rounded-md border px-2 py-1.5 text-[12px] font-medium capitalize transition-colors {glyph.status ===
				status
					? 'border-accent bg-accent-soft text-accent-strong'
					: 'border-border bg-transparent text-fg-muted hover:bg-surface-2'}"
				onclick={() =>
					projectStore.updateGlyph(glyph.codepoint, (g) => ({ ...g, status }))}
			>
				{status}
			</button>
		{/each}
	</div>
</div>
