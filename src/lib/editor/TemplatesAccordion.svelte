<script lang="ts">
	// Right-sidebar "Templates" accordion — appears for empty glyphs only
	// (parent wraps `{#if glyph.contours.length === 0}`). One-click
	// insert of a basic shape (rectangle / circle / vertical stem /
	// horizontal bar) that the designer then refines in edit mode.
	import Accordion from '$lib/ui/Accordion.svelte';

	export type Template = 'rect' | 'circle' | 'stem' | 'crossbar';

	type Props = { oninsert: (kind: Template) => void };
	let { oninsert }: Props = $props();
</script>

<Accordion id="edit-templates" label="Templates" defaultOpen={false}>
	<p class="mb-2 text-[11px] text-fg-subtle">
		Start from a basic shape and refine in edit mode (A).
	</p>
	<div class="grid grid-cols-2 gap-1.5">
		<button
			type="button"
			onclick={() => oninsert('rect')}
			class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft"
		>
			Rectangle
		</button>
		<button
			type="button"
			onclick={() => oninsert('circle')}
			class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft"
		>
			Circle
		</button>
		<button
			type="button"
			onclick={() => oninsert('stem')}
			class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft"
		>
			Vertical stem
		</button>
		<button
			type="button"
			onclick={() => oninsert('crossbar')}
			class="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-[11px] font-medium hover:border-accent hover:bg-accent-soft"
		>
			Horizontal bar
		</button>
	</div>
</Accordion>
