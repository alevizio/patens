<script lang="ts">
	import type { Glyph } from '$lib/font/types';
	import { contoursToSvgPath, glyphBounds } from '$lib/font/path';
	import Pin from '@lucide/svelte/icons/pin';
	import StickyNote from '@lucide/svelte/icons/sticky-note';

	type Props = {
		glyph: Glyph;
		selected?: boolean;
		size?: number;
		showLabel?: boolean;
		ascender?: number;
		descender?: number;
		incompatible?: boolean;
		onclick?: () => void;
	};

	let {
		glyph,
		selected = false,
		size = 56,
		showLabel = true,
		ascender = 800,
		descender = -200,
		incompatible = false,
		onclick
	}: Props = $props();

	const char = $derived(
		glyph.codepoint > 0 && glyph.codepoint < 0x10000 && glyph.codepoint > 0x20
			? String.fromCodePoint(glyph.codepoint)
			: glyph.codepoint === 0x20
				? '␣'
				: ''
	);

	const statusColor = $derived(
		{
			empty: 'bg-fg-subtle/30',
			sketch: 'bg-warn',
			draft: 'bg-accent',
			final: 'bg-success'
		}[glyph.status]
	);

	const fontSpan = $derived(ascender - descender);

	const svgPath = $derived.by(() => {
		if (glyph.contours.length === 0) return '';
		return contoursToSvgPath(glyph.contours);
	});

	const dimsLabel = $derived.by(() => {
		if (glyph.contours.length === 0) return '';
		const b = glyphBounds(glyph.contours);
		const w = Math.round(b.maxX - b.minX);
		const h = Math.round(b.maxY - b.minY);
		return ` · ${w}×${h}`;
	});

	const viewBox = $derived.by(() => {
		const totalHeight = fontSpan;
		const width = Math.max(glyph.advanceWidth, 100);
		return `0 ${-ascender} ${width} ${totalHeight}`;
	});
</script>

<button
	type="button"
	{onclick}
	aria-pressed={selected}
	class="group relative flex flex-col items-center gap-1 rounded-md border p-1.5 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent {selected
		? 'border-accent bg-accent-soft'
		: 'border-transparent bg-transparent hover:border-border hover:bg-surface-2/60'}"
	title="{glyph.name} · U+{glyph.codepoint.toString(16).toUpperCase().padStart(4, '0')}{dimsLabel} · adv {glyph.advanceWidth}"
	style="width: {size + 12}px;"
>
	<div
		class="relative flex items-center justify-center overflow-hidden rounded bg-canvas"
		style="width: {size}px; height: {size}px;"
	>
		{#if svgPath}
			<svg
				viewBox={viewBox}
				width={size}
				height={size}
				preserveAspectRatio="xMidYMid meet"
				style="transform: scaleY(-1);"
				aria-hidden="true"
			>
				<path d={svgPath} fill="currentColor" fill-rule="evenodd" />
			</svg>
		{:else}
			<span
				class="text-xl font-light text-fg-subtle"
				style="font-family: var(--preview-family);"
			>
				{char}
			</span>
		{/if}
	</div>
	{#if showLabel}
		<span class="text-[10px] font-mono text-fg-muted" data-numeric>
			{glyph.codepoint.toString(16).toUpperCase().padStart(4, '0')}
		</span>
	{/if}
	<span
		class="absolute right-1 top-1 size-1.5 rounded-full {statusColor}"
		aria-label="Status: {glyph.status}"
	></span>
	{#if glyph.pinned}
		<Pin
			class="absolute left-1 top-1 size-2.5 fill-warn text-warn"
			aria-label="Pinned"
		/>
	{/if}
	{#if glyph.flagged}
		<span
			class="absolute right-2 top-2 size-2 rounded-full bg-warn ring-1 ring-canvas"
			aria-label="Flagged for review"
			title="Flagged for review"
		></span>
	{/if}
	{#if glyph.notes?.trim()}
		<StickyNote
			class="absolute bottom-1 right-1 size-2.5 text-accent"
			aria-label="Has notes"
		/>
	{/if}
	{#if incompatible}
		<span
			class="absolute bottom-1 left-1 size-1.5 rounded-full bg-danger ring-1 ring-canvas"
			aria-label="Incompatible with default master"
			title="Contour or point counts differ from the default master"
		></span>
	{/if}
</button>
