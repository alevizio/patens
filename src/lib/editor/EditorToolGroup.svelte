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

	const buttonClass = (active: boolean, disabled = false) =>
		`inline-flex h-7 w-7 items-center justify-center rounded transition-all duration-100 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-40 active:scale-95 disabled:active:scale-100 ${
			active
				? 'bg-surface text-fg shadow-sm'
				: disabled
					? 'text-fg-subtle'
					: 'text-fg-muted hover:text-fg'
		}`;
</script>

<div class="flex items-center gap-0.5 rounded-md bg-surface-2 p-0.5">
	<button
		type="button"
		onclick={() => (tool = 'pencil')}
		class={buttonClass(tool === 'pencil')}
		title="Pencil (P)"
		aria-label="Pencil"
		aria-pressed={tool === 'pencil'}
	>
		<Pencil class="size-3.5" />
	</button>
	<button
		type="button"
		onclick={() => (tool = 'eraser')}
		class={buttonClass(tool === 'eraser')}
		title="Eraser (E)"
		aria-label="Eraser"
		aria-pressed={tool === 'eraser'}
	>
		<Eraser class="size-3.5" />
	</button>
	<button
		type="button"
		onclick={() => (tool = 'edit')}
		class={buttonClass(tool === 'edit', !hasContours)}
		title={hasContours ? 'Edit points (A)' : 'Draw something first to edit points'}
		aria-label="Edit points"
		aria-pressed={tool === 'edit'}
		disabled={!hasContours}
	>
		<MousePointer class="size-3.5" />
	</button>
</div>
