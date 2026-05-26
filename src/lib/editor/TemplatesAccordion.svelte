<script lang="ts">
	// Right-sidebar "Templates" accordion — appears for empty glyphs only
	// (parent wraps `{#if glyph.contours.length === 0}`). One-click
	// insert of a basic shape (rectangle / circle / vertical stem /
	// horizontal bar) that the designer then refines in edit mode.
	import Accordion from '$lib/ui/Accordion.svelte';
	import SidebarButton from '$lib/editor/SidebarButton.svelte';

	export type Template = 'rect' | 'circle' | 'stem' | 'crossbar';

	type Props = { oninsert: (kind: Template) => void };
	let { oninsert }: Props = $props();
</script>

<Accordion id="edit-templates" label="Templates" defaultOpen={false}>
	<p class="mb-2 text-[11px] text-fg-subtle">
		Start from a basic shape and refine in edit mode (A).
	</p>
	<div class="grid grid-cols-2 gap-1.5">
		<SidebarButton onclick={() => oninsert('rect')}>Rectangle</SidebarButton>
		<SidebarButton onclick={() => oninsert('circle')}>Circle</SidebarButton>
		<SidebarButton onclick={() => oninsert('stem')}>Vertical stem</SidebarButton>
		<SidebarButton onclick={() => oninsert('crossbar')}>Horizontal bar</SidebarButton>
	</div>
</Accordion>
