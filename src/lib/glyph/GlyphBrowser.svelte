<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { CATEGORY_LABELS, CATEGORY_ORDER, type GlyphCategory } from '$lib/font/glyph-set';
	import { SCRIPT_PACKS } from '$lib/font/charsets';
	import { findComposableCandidates } from '$lib/font/decompose';
	import { defaultPalette } from '$lib/font/color';
	import { auditGlyph } from '$lib/font/audit';
	import type { Glyph } from '$lib/font/types';
	import GlyphTile from './GlyphTile.svelte';
	import Input from '$lib/ui/Input.svelte';
	import Search from '@lucide/svelte/icons/search';
	import Plus from '@lucide/svelte/icons/plus';
	import Wand from '@lucide/svelte/icons/wand-sparkles';

	let query = $state('');
	let showAddForm = $state(false);
	let newCpInput = $state('');
	let addMode = $state<'single' | 'bulk'>('single');
	let bulkInput = $state('');

	const handleBulkAdd = () => {
		const text = bulkInput;
		if (!text) return;
		const codepoints = new Set<number>();
		for (const ch of text) {
			const cp = ch.codePointAt(0);
			if (cp && cp > 0x20) codepoints.add(cp);
		}
		let added = 0;
		let skipped = 0;
		let firstNew: number | null = null;
		for (const cp of codepoints) {
			const ok = projectStore.addCustomGlyph(cp);
			if (ok) {
				added++;
				if (firstNew === null) firstNew = cp;
			} else {
				skipped++;
			}
		}
		bulkInput = '';
		if (added > 0) {
			toast.success(
				`Added ${added}${skipped ? `, skipped ${skipped}` : ''} glyph${added === 1 ? '' : 's'}.`
			);
			if (firstNew !== null) projectStore.selectGlyph(firstNew);
			showAddForm = false;
		} else if (skipped > 0) {
			toast.warn(`All ${skipped} codepoint${skipped === 1 ? '' : 's'} already in project.`);
		}
	};

	let bulkMode = $state(false);
	let selectedCodepoints = $state<Set<number>>(new Set());

	// Composable-glyph scan — runs against the current project state.
	// Reactive: re-evaluates whenever glyphs change (e.g. user drew the
	// missing combining mark, suddenly more accented forms become
	// composable).
	const composableCandidates = $derived.by(() => {
		if (!projectStore.project) return [];
		return findComposableCandidates(projectStore.project);
	});

	// Default palette for color-aware tile rendering. When null, tiles
	// fall back to monochrome outlines (existing behaviour for
	// non-color projects).
	const browserPalette = $derived(defaultPalette(projectStore.project?.palettes));

	const runAutoCompose = () => {
		const cands = composableCandidates;
		if (cands.length === 0) return;
		for (const c of cands) {
			projectStore.applyComposite(c.codepoint, c.references);
		}
		toast.success(
			`Auto-composed ${cands.length} accented glyph${cands.length === 1 ? '' : 's'}.`
		);
	};

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

	const bulkFlag = (on: boolean) => {
		for (const cp of selectedCodepoints) {
			const g = projectStore.activeGlyphs[cp];
			if (g && !!g.flagged !== on) projectStore.toggleGlyphFlag(cp);
		}
		toast.success(on ? `Flagged ${selectedCodepoints.size}` : `Unflagged ${selectedCodepoints.size}`);
		clearSelection();
	};

	type StatusFilter =
		| 'all'
		| 'drawn'
		| 'undrawn'
		| 'sketch'
		| 'draft'
		| 'final'
		| 'flagged'
		| 'recent'
		| 'attention';
	let statusFilter = $state<StatusFilter>('all');
	const STATUS_OPTIONS: Array<{ id: StatusFilter; label: string; title: string }> = [
		{ id: 'all', label: 'All', title: 'Show every glyph' },
		{ id: 'drawn', label: 'Drawn', title: 'Glyphs with at least one contour' },
		{ id: 'undrawn', label: 'Empty', title: 'Glyphs with no contours yet' },
		{ id: 'sketch', label: 'Sketch', title: 'Status = sketch' },
		{ id: 'draft', label: 'Draft', title: 'Status = draft' },
		{ id: 'final', label: 'Final', title: 'Status = final' },
		{ id: 'flagged', label: 'Flagged', title: 'Flagged for review (Shift+F)' },
		{ id: 'recent', label: 'Recent', title: 'Edited in the last 24 hours' },
		{ id: 'attention', label: 'Needs review', title: 'Has audit warnings or errors' }
	];

	// Always-on audit-flag set — drives both the "Needs review" filter and
	// the count badge on the chip. $derived memoises against project changes,
	// so we only re-run when glyphs actually change; per-keystroke filter
	// edits don't trigger a recompute.
	const attentionCodepoints = $derived.by(() => {
		const project = projectStore.project;
		if (!project) return new Set<number>();
		const flagged = new Set<number>();
		for (const g of Object.values(projectStore.activeGlyphs)) {
			const issues = auditGlyph(g, project);
			if (issues.some((i) => i.severity === 'warn' || i.severity === 'error')) {
				flagged.add(g.codepoint);
			}
		}
		return flagged;
	});
	const attentionCount = $derived(attentionCodepoints.size);

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
			case 'flagged':
				return !!g.flagged;
			case 'recent': {
				const t = Date.parse(g.updatedAt);
				return Number.isFinite(t) && t >= Date.now() - 24 * 3600 * 1000;
			}
			case 'attention':
				return attentionCodepoints.has(g.codepoint);
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
				const notes = (g.notes ?? '').toLowerCase();
				const matches =
					g.name.toLowerCase().includes(lowerQuery) ||
					char === lowerQuery ||
					hex.includes(lowerQuery) ||
					notes.includes(lowerQuery);
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

	// Coverage for each non-Latin script pack the project has any presence
	// in. Shows only after the designer has added at least one glyph from
	// the pack — silent for projects that don't care about that script.
	const scriptCoverage = $derived.by(() => {
		const out: Array<{ id: string; label: string; drawn: number; total: number; pct: number }> = [];
		if (!projectStore.project) return out;
		const glyphs = projectStore.project.glyphs;
		for (const pack of SCRIPT_PACKS) {
			let drawn = 0;
			let present = 0;
			for (const spec of pack.glyphs) {
				const g = glyphs[spec.codepoint];
				if (!g) continue;
				present++;
				if (g.contours.length > 0 || (g.components?.length ?? 0) > 0) drawn++;
			}
			if (present === 0) continue;
			const total = pack.glyphs.length;
			out.push({
				id: pack.id,
				label: pack.label,
				drawn,
				total,
				pct: total > 0 ? Math.round((drawn / total) * 100) : 0
			});
		}
		return out;
	});

	const incompatibleCodepoints = $derived.by(() => {
		const out = new Set<number>();
		if (!projectStore.project) return out;
		const masters = projectStore.project.masters ?? [];
		if (masters.length === 0) return out;
		for (const [cpStr, def] of Object.entries(projectStore.project.glyphs)) {
			if (def.contours.length === 0) continue;
			const baseSig = def.contours.map((c) => c.commands.length).join('/');
			const cp = Number(cpStr);
			for (const m of masters) {
				const g = m.glyphs[cp];
				if (!g || g.contours.length === 0) continue;
				const sig = g.contours.map((c) => c.commands.length).join('/');
				if (sig !== baseSig) {
					out.add(cp);
					break;
				}
			}
		}
		return out;
	});

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
					class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors {statusFilter ===
					opt.id
						? 'bg-accent-soft text-accent-strong'
						: 'text-fg-subtle hover:bg-surface-2 hover:text-fg'}"
					title={opt.title}
				>
					{opt.label}
					{#if opt.id === 'attention' && attentionCount > 0}
						<!-- Passive indicator: the chip itself reports how many glyphs
						     need review, so designers see it without engaging the filter.
						     Hidden at zero so a clean font doesn't shout for attention. -->
						<span
							class="inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-amber-500/20 px-1 text-[9px] font-semibold text-amber-700 dark:text-amber-300"
							data-numeric
						>
							{attentionCount}
						</span>
					{/if}
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
						<span class="text-fg-subtle">{drawnPct}%</span>
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
			{#if composableCandidates.length > 0}
				<button
					type="button"
					onclick={runAutoCompose}
					class="inline-flex h-6 items-center gap-1 rounded-md border border-accent/40 bg-accent-soft/60 px-1.5 text-[11px] font-medium text-accent-strong transition-colors hover:bg-accent-soft"
					aria-label="Auto-compose accented glyphs from base + marks"
					title="Auto-compose {composableCandidates.length} accented glyph{composableCandidates.length === 1 ? '' : 's'} from existing base + combining marks"
				>
					<Wand class="size-3" />
					Compose {composableCandidates.length}
				</button>
			{/if}
			<button
				type="button"
				onclick={() => {
					bulkMode = !bulkMode;
					if (!bulkMode) clearSelection();
				}}
				class="inline-flex h-6 items-center gap-1 rounded-md border px-1.5 text-[11px] font-medium transition-colors {bulkMode
					? 'border-accent bg-accent-soft text-accent-strong'
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
			<div class="mt-2 inline-flex rounded-md border border-border bg-surface p-0.5 text-[10px]">
				<button
					type="button"
					onclick={() => (addMode = 'single')}
					class="rounded px-2 py-0.5 {addMode === 'single'
						? 'bg-accent-soft text-accent-strong'
						: 'text-fg-muted hover:text-fg'}"
				>
					Single
				</button>
				<button
					type="button"
					onclick={() => (addMode = 'bulk')}
					class="rounded px-2 py-0.5 {addMode === 'bulk'
						? 'bg-accent-soft text-accent-strong'
						: 'text-fg-muted hover:text-fg'}"
				>
					Paste text
				</button>
			</div>
			{#if addMode === 'single'}
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
			{:else}
				<div class="mt-2 grid gap-1.5">
					<textarea
						bind:value={bulkInput}
						placeholder="Paste text — every unique character becomes a glyph"
						rows="2"
						class="block w-full resize-y rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-fg outline-none focus:border-accent"
					></textarea>
					<button
						type="button"
						onclick={handleBulkAdd}
						disabled={!bulkInput.trim()}
						class="rounded-md bg-fg px-2 py-1 text-[11px] font-medium text-canvas hover:bg-fg/90 disabled:opacity-40"
					>
						Add unique characters
					</button>
				</div>
			{/if}
			<div class="mt-1.5 flex flex-wrap gap-1 text-[10px]">
				<span class="text-fg-subtle">Quick:</span>
				{#each [{ cp: 0x2026, label: '…' }, { cp: 0x2014, label: '—' }, { cp: 0x2013, label: '–' }, { cp: 0x2018, label: '‘' }, { cp: 0x2019, label: '’' }, { cp: 0x201c, label: '“' }, { cp: 0x201d, label: '”' }, { cp: 0x00a0, label: 'nbsp' }, { cp: 0x00d7, label: '×' }, { cp: 0x2022, label: '•' }] as preset (preset.cp)}
					<button
						type="button"
						onclick={() => {
							const added = projectStore.addCustomGlyph(preset.cp);
							if (added) {
								projectStore.selectGlyph(preset.cp);
								showAddForm = false;
							} else {
								toast.warn(`U+${preset.cp.toString(16).toUpperCase()} already in project`);
							}
						}}
						class="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-fg-muted hover:border-accent hover:text-accent"
						title="Add U+{preset.cp.toString(16).toUpperCase().padStart(4, '0')}"
					>
						{preset.label}
					</button>
				{/each}
			</div>
			<div class="mt-1.5 flex flex-wrap gap-1 text-[10px]">
				<span class="text-fg-subtle">Add script:</span>
				{#each SCRIPT_PACKS as pack (pack.id)}
					<button
						type="button"
						onclick={() => {
							if (!projectStore.project) return;
							const before = Object.keys(projectStore.project.glyphs).length;
							projectStore.addScriptPack(pack);
							const after = projectStore.project
								? Object.keys(projectStore.project.glyphs).length
								: before;
							toast.success(
								`Added ${after - before} ${pack.label} glyph${after - before === 1 ? '' : 's'}.`
							);
						}}
						class="rounded border border-border bg-surface px-1.5 py-0.5 text-fg-muted hover:border-accent hover:text-accent"
						title={pack.description}
					>
						+ {pack.label}
					</button>
				{/each}
			</div>
			{#if scriptCoverage.length > 0}
				<!-- Coverage chips for non-Latin scripts the project already includes.
				     Silent when no script-pack glyphs exist (typical Latin-only project).
				     Mirrors the audit-count badge pattern: passive indicator, not a verb. -->
				<div class="mt-1.5 flex flex-wrap gap-1 text-[10px]">
					<span class="text-fg-subtle">Coverage:</span>
					{#each scriptCoverage as cov (cov.id)}
						<span
							class="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 {cov.pct === 100
								? 'border-success/40 bg-success/10 text-success-strong'
								: cov.pct >= 50
									? 'border-border bg-surface text-fg-muted'
									: 'border-warn/40 bg-warn/10 text-warn-strong'}"
							title="{cov.drawn} / {cov.total} {cov.label} glyphs drawn"
							data-numeric
						>
							{cov.label}
							{#if cov.pct === 100}
								✓
							{:else}
								{cov.pct}%
							{/if}
						</span>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
	<div class="min-h-0 flex-1 overflow-y-auto p-2">
		{#if showPinned}
			<section class="mb-3">
				<h3 class="mb-1.5 px-1.5 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					Pinned
					<span class="ml-1 text-fg-subtle" data-numeric>{pinnedGlyphs.length}</span>
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
							incompatible={incompatibleCodepoints.has(g.codepoint)}
							colorPalette={browserPalette}
							onclick={() => projectStore.selectGlyph(g.codepoint)}
							oncontextmenu={(ev) => {
								ev.preventDefault();
								projectStore.toggleGlyphPin(g.codepoint);
							}}
						/>
					{/each}
				</div>
			</section>
		{/if}
		{#if showRecents}
			<section class="mb-3">
				<h3 class="mb-1.5 px-1.5 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					Recently edited
					<span class="ml-1 text-fg-subtle" data-numeric>{recents.length}</span>
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
							incompatible={incompatibleCodepoints.has(g.codepoint)}
							colorPalette={browserPalette}
							onclick={() => projectStore.selectGlyph(g.codepoint)}
							oncontextmenu={(ev) => {
								ev.preventDefault();
								projectStore.toggleGlyphPin(g.codepoint);
							}}
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
							<span class="ml-1 text-fg-subtle" data-numeric>{list.length}</span>
						</span>
						<span class="font-mono normal-case text-fg-subtle" data-numeric>
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
								incompatible={incompatibleCodepoints.has(g.codepoint)}
							colorPalette={browserPalette}
								onclick={() =>
									bulkMode
										? toggleSelect(g.codepoint)
										: projectStore.selectGlyph(g.codepoint)}
								oncontextmenu={(ev) => {
									if (bulkMode) return;
									ev.preventDefault();
									projectStore.toggleGlyphPin(g.codepoint);
								}}
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
				<button
					type="button"
					onclick={() => bulkFlag(true)}
					disabled={selectedCodepoints.size === 0}
					class="rounded border border-border bg-surface px-1.5 py-1 text-[10px] font-medium hover:border-warn hover:text-warn disabled:opacity-40"
				>
					Flag
				</button>
				<button
					type="button"
					onclick={() => bulkFlag(false)}
					disabled={selectedCodepoints.size === 0}
					class="rounded border border-border bg-surface px-1.5 py-1 text-[10px] font-medium hover:border-warn hover:text-warn disabled:opacity-40"
				>
					Unflag
				</button>
			</div>
		</div>
	{/if}
</aside>
