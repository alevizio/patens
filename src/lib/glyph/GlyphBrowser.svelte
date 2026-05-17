<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { CATEGORY_LABELS, CATEGORY_ORDER, type GlyphCategory } from '$lib/font/glyph-set';
	import type { Glyph } from '$lib/font/types';
	import GlyphTile from './GlyphTile.svelte';
	import Input from '$lib/ui/Input.svelte';
	import Search from '@lucide/svelte/icons/search';
	import Plus from '@lucide/svelte/icons/plus';

	let query = $state('');
	let showAddForm = $state(false);
	let newCpInput = $state('');

	type StatusFilter = 'all' | 'drawn' | 'undrawn' | 'sketch' | 'draft' | 'final';
	let statusFilter = $state<StatusFilter>('all');
	const STATUS_OPTIONS: Array<{ id: StatusFilter; label: string; title: string }> = [
		{ id: 'all', label: 'All', title: 'Show every glyph' },
		{ id: 'drawn', label: 'Drawn', title: 'Glyphs with at least one contour' },
		{ id: 'undrawn', label: 'Empty', title: 'Glyphs with no contours yet' },
		{ id: 'sketch', label: 'Sketch', title: 'Status = sketch' },
		{ id: 'draft', label: 'Draft', title: 'Status = draft' },
		{ id: 'final', label: 'Final', title: 'Status = final' }
	];

	const parseCodepoint = (s: string): number | null => {
		const trimmed = s.trim();
		if (!trimmed) return null;
		// Accept "U+1234", "1234", "0x1234", or a single character
		const upper = trimmed.replace(/^U\+/i, '').replace(/^0x/i, '');
		if (/^[0-9a-f]+$/i.test(upper)) {
			const n = parseInt(upper, 16);
			if (n > 0 && n < 0x10ffff) return n;
		}
		if ([...trimmed].length === 1) {
			const cp = trimmed.codePointAt(0);
			if (cp && cp > 0) return cp;
		}
		return null;
	};

	const handleAddGlyph = (e: Event) => {
		e.preventDefault();
		const cp = parseCodepoint(newCpInput);
		if (!cp) return;
		const added = projectStore.addCustomGlyph(cp);
		if (added) {
			projectStore.selectGlyph(cp);
			newCpInput = '';
			showAddForm = false;
		} else {
			alert(`Codepoint U+${cp.toString(16).toUpperCase().padStart(4, '0')} already exists.`);
		}
	};

	const handleDelete = (codepoint: number, name: string) => {
		if (!confirm(`Remove glyph "${name}" from the font? Any kerning pairs and class members referencing it will also be removed.`)) return;
		projectStore.removeGlyph(codepoint);
	};

	const matchesStatus = (g: Glyph): boolean => {
		switch (statusFilter) {
			case 'all':
				return true;
			case 'drawn':
				return g.contours.length > 0 || (g.components?.length ?? 0) > 0;
			case 'undrawn':
				return g.contours.length === 0 && (g.components?.length ?? 0) === 0;
			default:
				return g.status === statusFilter;
		}
	};

	const grouped = $derived.by(() => {
		const project = projectStore.project;
		if (!project) return new Map<GlyphCategory, Glyph[]>();
		const m = new Map<GlyphCategory, Glyph[]>();
		for (const cat of CATEGORY_ORDER) m.set(cat, []);
		const lowerQuery = query.trim().toLowerCase();
		for (const g of Object.values(projectStore.activeGlyphs)) {
			if (!matchesStatus(g)) continue;
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

	const filteredTotal = $derived.by(() => {
		let n = 0;
		for (const [, list] of grouped) n += list.length;
		return n;
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
		<div class="mt-2 -mx-0.5 flex flex-wrap gap-0.5">
			{#each STATUS_OPTIONS as opt (opt.id)}
				<button
					type="button"
					onclick={() => (statusFilter = opt.id)}
					class="rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors {statusFilter ===
					opt.id
						? 'bg-accent-soft text-accent'
						: 'text-fg-subtle hover:bg-surface-2 hover:text-fg'}"
					title={opt.title}
				>
					{opt.label}
				</button>
			{/each}
		</div>
		<div class="mt-2 flex items-center justify-between gap-2">
			<div class="text-[11px] text-fg-subtle" data-numeric>
				{#if statusFilter === 'all'}
					{totalDrawn} of {projectStore.project
						? Object.keys(projectStore.project.glyphs).length
						: 0} drawn
				{:else}
					{filteredTotal} shown
				{/if}
			</div>
			<button
				type="button"
				onclick={() => (showAddForm = !showAddForm)}
				class="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-surface px-1.5 text-[11px] font-medium text-fg-muted transition-colors hover:border-accent hover:text-accent"
				aria-label="Add custom glyph"
				title="Add custom codepoint"
			>
				<Plus class="size-3" /> Add
			</button>
		</div>
		{#if showAddForm}
			<form onsubmit={handleAddGlyph} class="mt-2 flex items-center gap-1.5">
				<Input
					density="sm"
					bind:value={newCpInput}
					placeholder="U+1F60A or 😊"
					class="font-mono text-[11px]"
				/>
				<button
					type="submit"
					class="rounded-md bg-fg px-2 py-1 text-[11px] font-medium text-canvas hover:bg-fg/90"
				>
					Add
				</button>
			</form>
		{/if}
	</div>
	<div class="min-h-0 flex-1 overflow-y-auto p-2">
		{#if filteredTotal === 0}
			<div class="px-2 py-6 text-center text-[11px] text-fg-subtle">
				{query.trim() ? 'No glyphs match the search.' : 'No glyphs match this filter.'}
			</div>
		{/if}
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
