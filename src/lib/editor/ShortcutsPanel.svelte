<script lang="ts">
	// Static keyboard-shortcut reference list — bottom of the sidebar.
	// No props, no state; lifted out so the editor +page.svelte loses
	// 18 lines of inert markup. Display only — actual key bindings
	// live in the parent's onkeydown handler.
</script>

<div class="mt-auto p-4 text-[11px] text-fg-subtle">
	<p class="mb-1 font-medium">Shortcuts</p>
	<ul class="grid gap-0.5" data-numeric>
		<li>[ ]<span class="ml-2 text-fg-muted">prev/next glyph</span></li>
		<li>P E A<span class="ml-2 text-fg-muted">pencil / eraser / edit points</span></li>
		<li>S V G R O<span class="ml-2 text-fg-muted">sketch / vector / grid / ref / onion</span></li>
		<li>T<span class="ml-2 text-fg-muted">trace to vector</span></li>
		<li>Shift-click<span class="ml-2 text-fg-muted">add to selection</span></li>
		<li>Drag empty<span class="ml-2 text-fg-muted">marquee select</span></li>
		<li>Arrows<span class="ml-2 text-fg-muted">nudge selected (Shift = ×10)</span></li>
		<li>Del<span class="ml-2 text-fg-muted">delete selected points</span></li>
		<li>Space-drag<span class="ml-2 text-fg-muted">pan</span></li>
		<li>Wheel<span class="ml-2 text-fg-muted">zoom</span></li>
		<li>⌘0<span class="ml-2 text-fg-muted">fit to glyph</span></li>
		<li>⌘Z / ⌘⇧Z<span class="ml-2 text-fg-muted">undo / redo</span></li>
		<li>⌘⇧C / ⌘⇧V<span class="ml-2 text-fg-muted">copy / paste glyph</span></li>
	</ul>
</div>
