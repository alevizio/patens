<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { CATEGORY_LABELS, CATEGORY_ORDER, type GlyphCategory } from '$lib/font/glyph-set';
	import type { Glyph } from '$lib/font/types';
	import GlyphTile from './GlyphTile.svelte';
	import Input from '$lib/ui/Input.svelte';
	import Search from '@lucide/svelte/icons/search';

	let query = $state('');

	const grouped = $derived.by(() => {
		const project = projectStore.project;
		if (!project) return new Map<GlyphCategory, Glyph[]>();
		const m = new Map<GlyphCategory, Glyph[]>();
		for (const cat of CATEGORY_ORDER) m.set(cat, []);
		const lowerQuery = query.trim().toLowerCase();
		for (const g of Object.values(projectStore.activeGlyphs)) {
			if (lowerQuery) {
				const char = String.fromCodePoint(g.codepoint).toLowerCase();
				const hex = g.codepoint.toString(16).toLowerCase();
				const matches =
					g.name.toLowerCase().includes(lowerQuery) ||
					char === lowerQuery ||
					hex.includes(lowerQuery);
				if (!matches) continue;
			}
			const cat = categoryOf(g);
			m.get(cat)?.push(g);
		}
		for (const [, list] of m) list.sort((a, b) => a.codepoint - b.codepoint);
		return m;
	});

	const totalDrawn = $derived.by(() => {
		return Object.values(projectStore.activeGlyphs).filter((g) => g.contours.length > 0).length;
	});

	function categoryOf(g: Glyph): GlyphCategory {
		if (g.codepoint >= 0x0041 && g.codepoint <= 0x005a) return 'uppercase';
		if (g.codepoint >= 0x0061 && g.codepoint <= 0x007a) return 'lowercase';
		if (g.codepoint >= 0x0030 && g.codepoint <= 0x0039) return 'figure';
		if (g.components && g.components.length > 0) return 'composite';
		if (g.codepoint >= 0x0300 && g.codepoint <= 0x036f) return 'mark';
		if (
			(g.codepoint >= 0x0021 && g.codepoint <= 0x002f) ||
			(g.codepoint >= 0x003a && g.codepoint <= 0x0040) ||
			(g.codepoint >= 0x005b && g.codepoint <= 0x0060) ||
			(g.codepoint >= 0x007b && g.codepoint <= 0x007e) ||
			(g.codepoint >= 0x2010 && g.codepoint <= 0x205f)
		)
			return 'punctuation';
		return 'symbol';
	}
</script>

<aside class="flex h-full flex-col border-r border-border bg-surface">
	<div class="border-b border-border p-3">
		<div class="relative">
			<Search class="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-fg-subtle" />
			<Input
				bind:value={query}
				placeholder="Filter glyphs…"
				density="sm"
				class="pl-8"
			/>
		</div>
		<div class="mt-2 text-[11px] text-fg-subtle" data-numeric>
			{totalDrawn} of {projectStore.project ? Object.keys(projectStore.project.glyphs).length : 0} drawn
		</div>
	</div>
	<div class="min-h-0 flex-1 overflow-y-auto p-2">
		{#each CATEGORY_ORDER as cat (cat)}
			{@const list = grouped.get(cat) ?? []}
			{#if list.length > 0}
				<section class="mb-3">
					<h3
						class="mb-1.5 px-1.5 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"
					>
						{CATEGORY_LABELS[cat]}
						<span class="ml-1 text-fg-subtle/70" data-numeric>{list.length}</span>
					</h3>
					<div class="grid grid-cols-4 gap-0.5">
						{#each list as g (g.codepoint)}
							<GlyphTile
								glyph={g}
								size={44}
								showLabel={false}
								selected={g.codepoint === projectStore.selectedCodepoint}
								ascender={projectStore.project?.metrics.ascender ?? 800}
								descender={projectStore.project?.metrics.descender ?? -200}
								onclick={() => projectStore.selectGlyph(g.codepoint)}
							/>
						{/each}
					</div>
				</section>
			{/if}
		{/each}
	</div>
</aside>
