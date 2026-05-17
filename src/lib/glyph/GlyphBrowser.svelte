<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { CATEGORY_LABELS, CATEGORY_ORDER, type GlyphCategory } from '$lib/font/glyph-set';
	import type { Glyph } from '$lib/font/types';
	import GlyphTile from './GlyphTile.svelte';
	import Input from '$lib/ui/Input.svelte';
	import Search from '@lucide/svelte/icons/search';
	import Plus from '@lucide/svelte/icons/plus';

	let query = $state('');
	let showAddForm = $state(false);
	let newCpInput = $state('');

	let bulkMode = $state(false);
	let selectedCodepoints = $state<Set<number>>(new Set());

	const toggleSelect = (cp: number) => {
		const next = new Set(selectedCodepoints);
		if (next.has(cp)) next.delete(cp);
		else next.add(cp);
		selectedCodepoints = next;
	};

	const clearSelection = () => {
		selectedCodepoints = new Set();
	};

	const bulkSetStatus = (status: 'empty' | 'sketch' | 'draft' | 'final') => {
		for (const cp of selectedCodepoints) {
			projectStore.setGlyphStatus(cp, status);
		}
		toast.success(
			`Set ${selectedCodepoints.size} glyph${selectedCodepoints.size === 1 ? '' : 's'} → ${status}`
		);
		clearSelection();
	};

	const bulkPin = () => {
		for (const cp of selectedCodepoints) {
			const g = projectStore.activeGlyphs[cp];
			if (g && !g.pinned) projectStore.toggleGlyphPin(cp);
		}
		toast.success(`Pinned ${selectedCodepoints.size}`);
		clearSelection();
	};

	const bulkUnpin = () => {
		for (const cp of selectedCodepoints) {
			const g = projectStore.activeGlyphs[cp];
			if (g && g.pinned) projectStore.toggleGlyphPin(cp);
		}
		toast.success(`Unpinned ${selectedCodepoints.size}`);
		clearSelection();
	};

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
			toast.warn(
				`Codepoint U+${cp.toString(16).toUpperCase().padStart(4, '0')} already exists.`
			);
		}
	};

	const focusFirstInput = (node: HTMLElement) => {
		queueMicrotask(() => node.querySelector<HTMLInputElement>('input')?.focus());
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

	const recents = $derived.by(() => {
		const glyphs = Object.values(projectStore.activeGlyphs);
		return glyphs
			.filter((g) => g.contours.length > 0 || (g.components && g.components.length > 0))
			.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
			.slice(0, 8);
	});

	const showRecents = $derived(
		!query.trim() && statusFilter === 'all' && recents.length > 0
	);

	const pinnedGlyphs = $derived.by(() => {
		const glyphs = Object.values(projectStore.activeGlyphs);
		return glyphs
			.filter((g) => g.pinned)
			.sort((a, b) => a.codepoint - b.codepoint);
	});

	const showPinned = $derived(!query.trim() && statusFilter === 'all' && pinnedGlyphs.length > 0);

	const totalGlyphs = $derived(
		projectStore.project ? Object.keys(projectStore.project.glyphs).length : 0
	);

	const totalDrawn = $derived.by(() => {
		return Object.values(projectStore.activeGlyphs).filter((g) => g.contours.length > 0).length;
	});

	const drawnPct = $derived(totalGlyphs > 0 ? Math.round((totalDrawn / totalGlyphs) * 100) : 0);

	const categoryStats = $derived.by(() => {
		const out = new Map<GlyphCategory, { drawn: number; total: number }>();
		for (const cat of CATEGORY_ORDER) out.set(cat, { drawn: 0, total: 0 });
		if (!projectStore.project) return out;
		for (const g of Object.values(projectStore.activeGlyphs)) {
			const c = categoryOf(g);
			const cell = out.get(c);
			if (!cell) continue;
			cell.total++;
			if (g.contours.length > 0 || (g.components?.length ?? 0) > 0) cell.drawn++;
		}
		return out;
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
			<div class="flex-1 min-w-0">
				<div class="flex items-baseline justify-between text-[11px] text-fg-subtle" data-numeric>
					<span>
						{#if statusFilter === 'all'}
							{totalDrawn} / {totalGlyphs} drawn
						{:else}
							{filteredTotal} shown
						{/if}
					</span>
					{#if statusFilter === 'all' && totalGlyphs > 0}
						<span class="text-fg-subtle/70">{drawnPct}%</span>
					{/if}
				</div>
				{#if statusFilter === 'all' && totalGlyphs > 0}
					<div class="mt-1 h-0.5 w-full overflow-hidden rounded-full bg-surface-2">
						<div
							class="h-full bg-accent transition-all duration-500"
							style="width: {drawnPct}%;"
						></div>
					</div>
				{/if}
			</div>
			<button
				type="button"
				onclick={() => {
					bulkMode = !bulkMode;
					if (!bulkMode) clearSelection();
				}}
				class="inline-flex h-6 items-center gap-1 rounded-md border px-1.5 text-[11px] font-medium transition-colors {bulkMode
					? 'border-accent bg-accent-soft text-accent'
					: 'border-border bg-surface text-fg-muted hover:border-accent hover:text-accent'}"
				aria-label="Toggle bulk-select mode"
				title="Toggle bulk-select mode"
			>
				Bulk
			</button>
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
			<form
				onsubmit={handleAddGlyph}
				use:focusFirstInput
				class="mt-2 flex items-center gap-1.5"
			>
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
		{#if showPinned}
			<section class="mb-3">
				<h3 class="mb-1.5 px-1.5 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					Pinned
					<span class="ml-1 text-fg-subtle/70" data-numeric>{pinnedGlyphs.length}</span>
				</h3>
				<div class="grid grid-cols-4 gap-0.5">
					{#each pinnedGlyphs as g (g.codepoint)}
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
		{#if showRecents}
			<section class="mb-3">
				<h3 class="mb-1.5 px-1.5 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					Recently edited
					<span class="ml-1 text-fg-subtle/70" data-numeric>{recents.length}</span>
				</h3>
				<div class="grid grid-cols-4 gap-0.5">
					{#each recents as g (g.codepoint)}
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
		{#if filteredTotal === 0}
			<div class="px-2 py-6 text-center text-[11px] text-fg-subtle">
				{query.trim() ? 'No glyphs match the search.' : 'No glyphs match this filter.'}
			</div>
		{/if}
		{#each CATEGORY_ORDER as cat (cat)}
			{@const list = grouped.get(cat) ?? []}
			{@const stats = categoryStats.get(cat) ?? { drawn: 0, total: 0 }}
			{#if list.length > 0}
				<section class="mb-3">
					<h3
						class="mb-1.5 flex items-baseline justify-between gap-2 px-1.5 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"
					>
						<span>
							{CATEGORY_LABELS[cat]}
							<span class="ml-1 text-fg-subtle/70" data-numeric>{list.length}</span>
						</span>
						<span class="font-mono normal-case text-fg-subtle/60" data-numeric>
							{stats.drawn}/{stats.total}
						</span>
					</h3>
					<div class="grid grid-cols-4 gap-0.5">
						{#each list as g (g.codepoint)}
							<GlyphTile
								glyph={g}
								size={44}
								showLabel={false}
								selected={bulkMode
									? selectedCodepoints.has(g.codepoint)
									: g.codepoint === projectStore.selectedCodepoint}
								ascender={projectStore.project?.metrics.ascender ?? 800}
								descender={projectStore.project?.metrics.descender ?? -200}
								onclick={() =>
									bulkMode
										? toggleSelect(g.codepoint)
										: projectStore.selectGlyph(g.codepoint)}
							/>
						{/each}
					</div>
				</section>
			{/if}
		{/each}
	</div>

	{#if bulkMode}
		<div class="border-t border-border bg-surface-2/50 px-2 py-2">
			<div class="mb-1.5 flex items-center justify-between text-[11px]">
				<span class="font-medium text-fg-muted" data-numeric>
					{selectedCodepoints.size} selected
				</span>
				<button
					type="button"
					onclick={clearSelection}
					disabled={selectedCodepoints.size === 0}
					class="text-[10px] text-fg-subtle hover:text-fg disabled:opacity-40"
				>
					Clear
				</button>
			</div>
			<div class="grid grid-cols-2 gap-1">
				<button
					type="button"
					onclick={() => bulkSetStatus('final')}
					disabled={selectedCodepoints.size === 0}
					class="rounded border border-border bg-surface px-1.5 py-1 text-[10px] font-medium hover:border-success hover:text-success disabled:opacity-40"
				>
					→ final
				</button>
				<button
					type="button"
					onclick={() => bulkSetStatus('draft')}
					disabled={selectedCodepoints.size === 0}
					class="rounded border border-border bg-surface px-1.5 py-1 text-[10px] font-medium hover:border-accent hover:text-accent disabled:opacity-40"
				>
					→ draft
				</button>
				<button
					type="button"
					onclick={bulkPin}
					disabled={selectedCodepoints.size === 0}
					class="rounded border border-border bg-surface px-1.5 py-1 text-[10px] font-medium hover:border-warn hover:text-warn disabled:opacity-40"
				>
					Pin
				</button>
				<button
					type="button"
					onclick={bulkUnpin}
					disabled={selectedCodepoints.size === 0}
					class="rounded border border-border bg-surface px-1.5 py-1 text-[10px] font-medium hover:border-warn hover:text-warn disabled:opacity-40"
				>
					Unpin
				</button>
			</div>
		</div>
	{/if}
</aside>
