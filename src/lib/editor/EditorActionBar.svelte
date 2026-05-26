<script lang="ts">
	// Bottom action bar — primary actions (Trace / Undo stroke / Auto-
	// space / Copy / Paste) + secondary right-side cluster (Copy path /
	// PNG / SVG / Clear sketch / Clear vector). All handlers stay in
	// the parent; this component is purely a button cluster.
	import Button from '$lib/ui/Button.svelte';
	import Wand from '@lucide/svelte/icons/wand-sparkles';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import AlignHorizontalSpaceAround from '@lucide/svelte/icons/align-horizontal-space-around';
	import Copy from '@lucide/svelte/icons/copy';
	import ClipboardPaste from '@lucide/svelte/icons/clipboard-paste';
	import FileText from '@lucide/svelte/icons/file-text';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import type { Glyph } from '$lib/font/types';

	type Props = {
		glyph: Glyph;
		onTrace: () => void;
		onUndoStroke: () => void;
		onAutoSpace: () => void;
		onCopy: () => void;
		onPaste: () => void;
		onCopyPath: () => void;
		onExportPng: () => void;
		onExportSvg: () => void;
		onClearSketch: () => void;
		onClearVector: () => void;
	};
	let {
		glyph,
		onTrace,
		onUndoStroke,
		onAutoSpace,
		onCopy,
		onPaste,
		onCopyPath,
		onExportPng,
		onExportSvg,
		onClearSketch,
		onClearVector
	}: Props = $props();

	const hasSketch = $derived(!!glyph.sketch?.length);
	const isEmpty = $derived(glyph.contours.length === 0);
</script>

<div class="flex items-center gap-2 border-t border-border bg-surface px-4 py-2.5">
	<Button variant="primary" density="sm" onclick={onTrace} disabled={!hasSketch}>
		{#snippet icon()}<Wand class="size-3.5" />{/snippet}
		Trace to vector (T)
	</Button>
	<Button
		variant="ghost"
		density="sm"
		onclick={onUndoStroke}
		disabled={!hasSketch}
		title="Undo last stroke"
	>
		{#snippet icon()}<RotateCcw class="size-3.5" />{/snippet}
		Undo stroke
	</Button>
	<Button variant="secondary" density="sm" onclick={onAutoSpace} disabled={isEmpty}>
		{#snippet icon()}<AlignHorizontalSpaceAround class="size-3.5" />{/snippet}
		Auto-space
	</Button>
	<Button
		variant="ghost"
		density="sm"
		onclick={onCopy}
		disabled={isEmpty}
		aria-label="Copy glyph (⌘⇧C)"
	>
		{#snippet icon()}<Copy class="size-3.5" />{/snippet}
		Copy
	</Button>
	<Button
		variant="ghost"
		density="sm"
		onclick={onPaste}
		aria-label="Paste glyph or SVG path (⌘⇧V)"
		title="Paste a Patens glyph or SVG path data — try copying a shape from Figma / Illustrator"
	>
		{#snippet icon()}<ClipboardPaste class="size-3.5" />{/snippet}
		Paste
	</Button>
	<div class="ml-auto flex items-center gap-2">
		<Button
			variant="ghost"
			density="sm"
			onclick={onCopyPath}
			disabled={isEmpty}
			title="Copy SVG path attribute to clipboard"
		>
			{#snippet icon()}<Copy class="size-3.5" />{/snippet}
			Copy path
		</Button>
		<Button
			variant="ghost"
			density="sm"
			onclick={onExportPng}
			disabled={isEmpty}
			title="Export this glyph as PNG"
		>
			{#snippet icon()}<FileText class="size-3.5" />{/snippet}
			PNG
		</Button>
		<Button
			variant="ghost"
			density="sm"
			onclick={onExportSvg}
			disabled={isEmpty}
			title="Export this glyph as SVG"
		>
			{#snippet icon()}<FileText class="size-3.5" />{/snippet}
			Export SVG
		</Button>
		<Button
			variant="ghost"
			density="sm"
			onclick={onClearSketch}
			disabled={!hasSketch}
		>
			{#snippet icon()}<Trash2 class="size-3.5" />{/snippet}
			Clear sketch
		</Button>
		<Button
			variant="ghost"
			density="sm"
			onclick={onClearVector}
			disabled={isEmpty}
		>
			{#snippet icon()}<Trash2 class="size-3.5" />{/snippet}
			Clear vector
		</Button>
	</div>
</div>
