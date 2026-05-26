<script lang="ts">
	// Toolbar tool-selector buttons: Pencil · Eraser · Edit points.
	// Extracted from editor +page.svelte. The `tool` value is two-way
	// bound so the parent's keyboard handlers (P / E / A shortcuts) can
	// still set it. Edit-points is disabled when there are no contours
	// to edit — same gating as the original inline version.
	import Pencil from '@lucide/svelte/icons/pencil';
	import Eraser from '@lucide/svelte/icons/eraser';
	import MousePointer from '@lucide/svelte/icons/mouse-pointer-2';

	type Tool = 'pencil' | 'eraser' | 'edit';
	type Props = {
		tool: Tool;
		hasContours: boolean;
	};
	let { tool = $bindable(), hasContours }: Props = $props();
</script>

<div class="flex items-center gap-0.5 rounded-md bg-surface-2 p-0.5">
	<button
		type="button"
		onclick={() => (tool = 'pencil')}
		class="inline-flex h-7 w-7 items-center justify-center rounded transition-colors {tool ===
		'pencil'
			? 'bg-surface text-fg shadow-sm'
			: 'text-fg-muted hover:text-fg'}"
		title="Pencil (P)"
		aria-label="Pencil"
	>
		<Pencil class="size-3.5" />
	</button>
	<button
		type="button"
		onclick={() => (tool = 'eraser')}
		class="inline-flex h-7 w-7 items-center justify-center rounded transition-colors {tool ===
		'eraser'
			? 'bg-surface text-fg shadow-sm'
			: 'text-fg-muted hover:text-fg'}"
		title="Eraser (E)"
		aria-label="Eraser"
	>
		<Eraser class="size-3.5" />
	</button>
	<button
		type="button"
		onclick={() => (tool = 'edit')}
		class="inline-flex h-7 w-7 items-center justify-center rounded transition-colors {tool ===
		'edit'
			? 'bg-surface text-fg shadow-sm'
			: 'text-fg-muted hover:text-fg'}"
		title="Edit points (A)"
		aria-label="Edit points"
		disabled={!hasContours}
	>
		<MousePointer class="size-3.5" />
	</button>
</div>
