<script lang="ts">
	// Toolbar brush-size slider (10–120fu range, step 2). Bindable so the
	// parent's keyboard handlers (1-9 to set weight presets) still work.
	type Props = { size: number };
	let { size = $bindable() }: Props = $props();
</script>

<label class="flex items-center gap-2 pl-2">
	<span class="text-[11px] font-medium text-fg-muted">Brush</span>
	<input
		type="range"
		min={10}
		max={120}
		step={2}
		bind:value={size}
		class="h-1 w-24 accent-fg"
		aria-label="Brush size"
	/>
	<span class="w-8 text-[11px] text-fg-subtle" data-numeric>{size}</span>
</label>
