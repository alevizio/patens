<script lang="ts">
	// Masters strip — small horizontally-scrollable preview of each
	// master's version of the current glyph. Click swaps the active
	// master. A red dot + danger border marks incompatible masters
	// (contour/point counts don't match Default).
	import { contoursToSvgPath } from '$lib/font/path';
	import { projectStore } from '$lib/stores/project.svelte';
	import type { Glyph } from '$lib/font/types';

	export type MasterStripItem = {
		id: string | undefined;
		name: string;
		glyph: Glyph | undefined;
		compatible: boolean;
	};

	type Metrics = { ascender: number; descender: number } | undefined;

	type Props = { items: MasterStripItem[]; metrics: Metrics };
	let { items, metrics }: Props = $props();
</script>

<div
	class="flex items-center gap-2 border-t border-border bg-surface-2/40 px-4 py-2 overflow-x-auto"
>
	<span
		class="shrink-0 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"
	>
		Masters
	</span>
	{#each items as item (item.id ?? 'default')}
		{@const isActive = (projectStore.selectedMasterId ?? '') === (item.id ?? '')}
		<button
			type="button"
			onclick={() => projectStore.selectMaster(item.id)}
			aria-pressed={isActive}
			class="relative flex shrink-0 flex-col items-center gap-0.5 rounded border px-2 py-1 transition-all duration-100 ease-out active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 {isActive
				? 'border-accent bg-accent-soft'
				: item.compatible
					? 'border-border bg-surface hover:border-accent/50'
					: 'border-danger/60 bg-surface hover:border-danger'}"
			title={item.compatible
				? `Switch to ${item.name}`
				: `${item.name} — contour/point counts don't match Default. Sync from Default to fix.`}
		>
			{#if !item.compatible}
				<span
					class="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-danger"
					aria-label="Incompatible"
				></span>
			{/if}
			<svg
				viewBox="0 {metrics?.descender ?? -200} {Math.max(
					item.glyph?.advanceWidth ?? 100,
					100
				)} {(metrics?.ascender ?? 800) - (metrics?.descender ?? -200)}"
				width="40"
				height="40"
				preserveAspectRatio="xMidYMid meet"
				style="transform: scaleY(-1);"
				aria-hidden="true"
			>
				{#if item.glyph && item.glyph.contours.length > 0}
					<path
						d={contoursToSvgPath(item.glyph.contours)}
						fill="currentColor"
						fill-rule="evenodd"
					/>
				{/if}
			</svg>
			<span
				class="text-[10px] font-medium {isActive
					? 'text-accent-strong'
					: 'text-fg-muted'}"
			>
				{item.name}
			</span>
		</button>
	{/each}
</div>
