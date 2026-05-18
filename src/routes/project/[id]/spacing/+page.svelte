<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { SCRIPT_PACKS } from '$lib/font/charsets';
	import { isClassRef, type KerningSide } from '$lib/font/types';
	import { contoursToSvgPath, glyphBounds } from '$lib/font/path';
	import { detectStemWidths } from '$lib/font/stem-detect';
	import Panel from '$lib/ui/Panel.svelte';
	import Input from '$lib/ui/Input.svelte';
	import Field from '$lib/ui/Field.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Plus from '@lucide/svelte/icons/plus';
	import Globe from '@lucide/svelte/icons/globe';
	import Group from '@lucide/svelte/icons/group';

	const COMMON_PAIRS: [string, string][] = [
		['A', 'V'], ['A', 'T'], ['A', 'W'], ['A', 'Y'],
		['T', 'a'], ['T', 'o'], ['T', 'e'], ['T', 'r'],
		['V', 'a'], ['V', 'o'], ['V', 'e'],
		['W', 'a'], ['W', 'o'], ['W', 'e'],
		['L', 'T'], ['L', 'V'], ['L', 'Y'],
		['P', 'a'], ['P', 'o'], ['P', 'e'],
		['F', 'a'], ['F', 'o'], ['Y', 'o'], ['Y', 'a']
	];

	let leftChar = $state('A');
	let rightChar = $state('V');

	// ---------- Sidebearing classes ----------
	let newSbName = $state('');
	let newSbMembers = $state('');
	const parseMemberCodepoints = (s: string): number[] => {
		const result: number[] = [];
		for (const ch of s) {
			const cp = ch.codePointAt(0);
			if (cp && cp > 0x20) result.push(cp);
		}
		return Array.from(new Set(result));
	};
	const createSbClass = () => {
		const cps = parseMemberCodepoints(newSbMembers);
		if (cps.length === 0) {
			toast.warn('Add at least one character.');
			return;
		}
		projectStore.addSidebearingClass(newSbName, cps);
		newSbName = '';
		newSbMembers = '';
	};

	// font5.md: spacing as "stable text color across repeated patterns of stems,
	// rounds, diagonals, punctuation, and figures." These presets cover the
	// classic four-axis split.
	const SB_PRESETS: Array<{ name: string; chars: string }> = [
		{ name: 'Vertical stems (upper)', chars: 'HILMNEFTKBDPR' },
		{ name: 'Vertical stems (lower)', chars: 'hilmnbdpqkfr' },
		{ name: 'Rounds (upper)', chars: 'OCGQUS' },
		{ name: 'Rounds (lower)', chars: 'oceqsbdp' },
		{ name: 'Diagonals', chars: 'AVWXYKMN' },
		{ name: 'Figures', chars: '0123456789' }
	];
	const insertPreset = (preset: (typeof SB_PRESETS)[number]) => {
		newSbName = preset.name;
		newSbMembers = preset.chars;
	};
	const sbClassAvg = (members: number[]): { lsb: number; rsb: number } => {
		if (!project || members.length === 0) return { lsb: 0, rsb: 0 };
		let lsb = 0;
		let rsb = 0;
		let n = 0;
		for (const cp of members) {
			const g = project.glyphs[cp];
			if (!g) continue;
			lsb += g.leftSidebearing;
			rsb += g.rightSidebearing;
			n++;
		}
		return n > 0 ? { lsb: Math.round(lsb / n), rsb: Math.round(rsb / n) } : { lsb: 0, rsb: 0 };
	};
	let pairsOnlyDrawn = $state(true);
	const visiblePairs = $derived.by(() => {
		if (!pairsOnlyDrawn || !project) return COMMON_PAIRS;
		return COMMON_PAIRS.filter(([l, r]) => {
			const left = project.glyphs[l.codePointAt(0) ?? 0];
			const right = project.glyphs[r.codePointAt(0) ?? 0];
			return left?.contours.length && right?.contours.length;
		});
	});
	let pendingValue = $state(0);
	let newClassName = $state('@A_left');
	let newClassMembers = $state('A Á Â Ä À Å Ã');

	// ---------- Spacing playground ----------
	let playgroundText = $state('Hamburgefonts AVATAR To We La Pa\nQuick brown fox jumps over');
	let playgroundSize = $state(72);
	let playgroundLineHeight = $state(1.15);
	let playgroundTracking = $state(0); // em-based, scaled to 1000ths
	let playgroundKern = $state(true);
	let playgroundLiga = $state(true);
	let referenceFont = $state('');
	const REFERENCE_PRESETS = [
		{ id: '', label: 'Off' },
		{ id: 'Inter', label: 'Inter' },
		{ id: 'Helvetica Neue, Helvetica, Arial', label: 'Helvetica' },
		{ id: 'Georgia, Times, serif', label: 'Georgia' },
		{ id: 'ui-monospace, Menlo, monospace', label: 'Mono' },
		{ id: '-apple-system, system-ui, sans-serif', label: 'System UI' }
	];
	// briefReferenceFamilies declared below alongside the rest of the
	// $deriveds — moved out of the playground block to fix declaration order.
	const playgroundFeatures = $derived(
		`'kern' ${playgroundKern ? 1 : 0}, 'liga' ${playgroundLiga ? 1 : 0}`
	);

	// ---------- Sidebearing analyzer ----------
	type AnalyzerCategory = 'uppercase' | 'lowercase' | 'figure' | 'all';
	let analyzerCategory = $state<AnalyzerCategory>('lowercase');

	const analyzerGlyphs = $derived.by(() => {
		if (!project) return [];
		const all = Object.values(project.glyphs)
			.filter((g) => g.contours.length > 0)
			.sort((a, b) => a.codepoint - b.codepoint);
		switch (analyzerCategory) {
			case 'uppercase':
				return all.filter((g) => g.codepoint >= 0x0041 && g.codepoint <= 0x005a);
			case 'lowercase':
				return all.filter((g) => g.codepoint >= 0x0061 && g.codepoint <= 0x007a);
			case 'figure':
				return all.filter((g) => g.codepoint >= 0x0030 && g.codepoint <= 0x0039);
			case 'all':
				return all;
		}
	});

	const analyzerMax = $derived(
		analyzerGlyphs.reduce(
			(m, g) => Math.max(m, g.leftSidebearing, g.rightSidebearing),
			60
		)
	);

	const cpOf = (s: string) => s.codePointAt(0) ?? 0;
	const project = $derived(projectStore.project);

	// Pull the family names the user added in the Brief — they're auto-loaded
	// from Google Fonts at project load, so they're available here for free.
	const briefReferenceFamilies = $derived(
		(project?.brief?.references ?? [])
			.map((r) => r.name.trim())
			.filter((n) => n.length > 0)
	);

	// ---------- Kerning class auto-suggest ----------
	// Find every base glyph (Latin A-Z or a-z that's drawn) and group its
	// composite descendants. One @Base_left class per base means a single
	// kerning rule covers every accented variant. Saves dozens of pairs.
	type ClassSuggestion = { name: string; members: number[]; basis: string };
	const classSuggestions = $derived.by(() => {
		if (!project) return [] as ClassSuggestion[];
		const out: ClassSuggestion[] = [];
		const existingNames = new Set((project.classes ?? []).map((c) => c.name));
		for (let cp = 0x0041; cp <= 0x007a; cp++) {
			// Latin only; skip [ \ ] ^ _ ` between Z and a
			if (cp > 0x005a && cp < 0x0061) continue;
			const base = project.glyphs[cp];
			if (!base) continue;
			const descendants = Object.values(project.glyphs).filter((g) =>
				(g.components ?? []).some((c) => c.baseCodepoint === cp)
			);
			// Suggest when there's at least one composite descendant — the class
			// is useful even before the base glyph is drawn.
			if (descendants.length === 0) continue;
			const members = [cp, ...descendants.map((d) => d.codepoint)];
			const char = String.fromCodePoint(cp);
			const className = `@${char === char.toUpperCase() ? char : char + '_lc'}_left`;
			if (existingNames.has(className)) continue;
			out.push({
				name: className,
				members,
				basis: `${char} + ${descendants.length} composite variant${descendants.length === 1 ? '' : 's'}`
			});
		}
		return out.slice(0, 12);
	});

	const acceptClassSuggestion = (sug: ClassSuggestion) => {
		projectStore.upsertKerningClass({ name: sug.name, members: sug.members });
		toast.success(`Added ${sug.name} (${sug.members.length} members)`);
	};

	// Expand class refs on either side of the current kerning pair into a
	// grid of all member-pair renderings — so the designer can see at a glance
	// whether the class kern looks right for every member.
	const classExpansionPairs = $derived.by(() => {
		if (!project) return [] as Array<{ l: string; r: string }>;
		const left = parseSide(leftChar);
		const right = parseSide(rightChar);
		const leftIsClass = isClassRef(left);
		const rightIsClass = isClassRef(right);
		if (!leftIsClass && !rightIsClass) return [];
		const resolve = (side: KerningSide): string[] => {
			if (isClassRef(side)) {
				const cls = (project.classes ?? []).find((c) => c.name === side);
				return (cls?.members ?? []).map((cp) => String.fromCodePoint(cp));
			}
			return [String.fromCodePoint(side)];
		};
		const lefts = resolve(left);
		const rights = resolve(right);
		const out: Array<{ l: string; r: string }> = [];
		for (const l of lefts) {
			for (const r of rights) {
				out.push({ l, r });
				if (out.length >= 48) return out; // sanity cap
			}
		}
		return out;
	});

	/** Parse a "side" input — leading @ → class ref, else first char → codepoint */
	const parseSide = (s: string): KerningSide => {
		const trimmed = s.trim();
		if (trimmed.startsWith('@')) return trimmed;
		return cpOf(trimmed);
	};

	const currentValue = $derived.by(() => {
		return projectStore.getKerningValue(parseSide(leftChar), parseSide(rightChar));
	});

	$effect(() => {
		pendingValue = currentValue;
	});

	const applyKerning = (value: number) => {
		projectStore.upsertKerningPair({
			left: parseSide(leftChar),
			right: parseSide(rightChar),
			value: Math.round(value)
		});
		pendingValue = value;
	};

	const removeKerning = (left: KerningSide, right: KerningSide) => {
		projectStore.upsertKerningPair({ left, right, value: 0 });
	};

	const sideLabel = (side: KerningSide): string => {
		if (isClassRef(side)) return side;
		return String.fromCodePoint(side);
	};

	let bulkText = $state('');
	let bulkResult = $state<string | null>(null);

	const makeFiguresTabular = () => {
		if (!project) return;
		const digits = Array.from({ length: 10 }, (_, i) => 0x0030 + i)
			.map((cp) => project.glyphs[cp])
			.filter((g) => g && g.contours.length > 0);
		if (digits.length === 0) {
			toast.warn('No figures (0–9) drawn yet.');
			return;
		}
		const targetAdvance = Math.max(...digits.map((g) => g.advanceWidth));
		for (const g of digits) {
			const extra = targetAdvance - g.advanceWidth;
			const lsb = g.leftSidebearing + Math.round(extra / 2);
			const rsb = g.rightSidebearing + (extra - Math.round(extra / 2));
			projectStore.updateGlyph(g.codepoint, (gg) => ({
				...gg,
				advanceWidth: targetAdvance,
				leftSidebearing: lsb,
				rightSidebearing: rsb
			}));
		}
		toast.success(`Set ${digits.length} figures to advance ${targetAdvance} units (centred).`);
	};

	const setAllSidebearings = (which: 'left' | 'right' | 'both', value: number, category: 'all' | 'upper' | 'lower' | 'figure') => {
		if (!project) return;
		const inRange = (cp: number): boolean => {
			switch (category) {
				case 'upper':
					return cp >= 0x0041 && cp <= 0x005a;
				case 'lower':
					return cp >= 0x0061 && cp <= 0x007a;
				case 'figure':
					return cp >= 0x0030 && cp <= 0x0039;
				case 'all':
					return true;
			}
		};
		const targets = Object.values(project.glyphs).filter(
			(g) => g.contours.length > 0 && inRange(g.codepoint)
		);
		if (targets.length === 0) {
			toast.warn('No drawn glyphs in this category.');
			return;
		}
		for (const g of targets) {
			projectStore.updateGlyph(g.codepoint, (gg) => {
				const next = { ...gg };
				if (which === 'left' || which === 'both') next.leftSidebearing = value;
				if (which === 'right' || which === 'both') next.rightSidebearing = value;
				next.advanceWidth = next.leftSidebearing + (gg.advanceWidth - gg.leftSidebearing - gg.rightSidebearing) + next.rightSidebearing;
				return next;
			});
		}
		toast.success(`Updated ${targets.length} glyph${targets.length === 1 ? '' : 's'}.`);
	};

	let bulkSbCategory = $state<'all' | 'upper' | 'lower' | 'figure'>('lower');
	let bulkSbWhich = $state<'left' | 'right' | 'both'>('both');
	let bulkSbValue = $state(40);

	// ---------- Stem rhythm strip ----------
	type RhythmSet = 'lower-stems' | 'upper-stems';
	const RHYTHM_SETS: Record<RhythmSet, { label: string; codepoints: number[] }> = {
		'lower-stems': {
			label: 'Lowercase stems',
			codepoints: [0x006e, 0x0068, 0x006d, 0x0062, 0x0064, 0x006b, 0x006c, 0x0069, 0x0070, 0x0071, 0x0075, 0x0072]
		},
		'upper-stems': {
			label: 'Uppercase stems',
			codepoints: [0x0048, 0x004e, 0x0049, 0x004c, 0x0046, 0x0045, 0x0054, 0x004b, 0x004d, 0x0050, 0x0042, 0x0044, 0x0052]
		}
	};
	let rhythmSet = $state<RhythmSet>('lower-stems');
	let rhythmStemWidths = $state<Map<number, number>>(new Map());

	const rhythmDrawn = $derived.by(() => {
		if (!project) return [];
		return RHYTHM_SETS[rhythmSet].codepoints
			.map((cp) => project.glyphs[cp])
			.filter((g) => g && g.contours.length > 0);
	});

	const measureRhythmStems = async () => {
		if (!project) return;
		const next = new Map<number, number>();
		for (const g of rhythmDrawn) {
			try {
				const ms = await detectStemWidths(
					g.contours,
					glyphBounds(g.contours),
					g.advanceWidth,
					{ capHeight: project.metrics.capHeight, xHeight: project.metrics.xHeight }
				);
				// Median width across all detected runs (excluding very narrow ones)
				const allWidths = ms.flatMap((m) => m.runs.map((r) => r.width)).filter((w) => w >= 40);
				if (allWidths.length === 0) continue;
				allWidths.sort((a, b) => a - b);
				const median = allWidths[Math.floor(allWidths.length / 2)];
				next.set(g.codepoint, median);
			} catch {
				/* skip glyph */
			}
		}
		rhythmStemWidths = next;
	};

	// Auto-measure when the set or drawn glyphs change
	let rhythmKey = $state('');
	$effect(() => {
		const k = `${rhythmSet}:${rhythmDrawn.map((g) => `${g.codepoint}:${g.updatedAt}`).join('|')}`;
		if (k === rhythmKey) return;
		rhythmKey = k;
		if (rhythmDrawn.length > 0) measureRhythmStems();
		else rhythmStemWidths = new Map();
	});

	const rhythmMedianStem = $derived.by(() => {
		const widths = [...rhythmStemWidths.values()];
		if (widths.length === 0) return 0;
		widths.sort((a, b) => a - b);
		return widths[Math.floor(widths.length / 2)];
	});
	const importBulkKerning = () => {
		if (!bulkText.trim()) return;
		const lines = bulkText
			.split(/\r?\n/)
			.map((l) => l.trim())
			.filter(Boolean);
		let added = 0;
		let skipped = 0;
		for (const line of lines) {
			// Accept either whitespace or comma separators: "A V -50" or "A,V,-50"
			const parts = line.split(/[\s,]+/);
			if (parts.length < 3) {
				skipped++;
				continue;
			}
			const value = Number(parts[parts.length - 1]);
			if (!Number.isFinite(value)) {
				skipped++;
				continue;
			}
			const leftRaw = parts[0];
			const rightRaw = parts.slice(1, -1).join('');
			const left: KerningSide = leftRaw.startsWith('@')
				? leftRaw
				: (leftRaw.codePointAt(0) ?? 0);
			const right: KerningSide = rightRaw.startsWith('@')
				? rightRaw
				: (rightRaw.codePointAt(0) ?? 0);
			if (!left || !right) {
				skipped++;
				continue;
			}
			projectStore.upsertKerningPair({ left, right, value: Math.round(value) });
			added++;
		}
		bulkResult = `${added} added${skipped > 0 ? `, ${skipped} skipped` : ''}.`;
		if (added > 0) bulkText = '';
	};

	const addClass = () => {
		const name = newClassName.trim();
		if (!name.startsWith('@')) {
			toast.warn('Class name must start with @ (e.g. @A_left)');
			return;
		}
		const members = newClassMembers
			.trim()
			.split(/\s+/)
			.map((s) => s.codePointAt(0) ?? 0)
			.filter((cp) => cp > 0);
		if (members.length === 0) return;
		projectStore.upsertKerningClass({ name, members });
		newClassName = '@class';
		newClassMembers = '';
	};
</script>

<div class="h-full overflow-auto">
<div class="mx-auto flex max-w-5xl flex-col gap-6 p-6">
	<header>
		<h1 class="text-xl font-semibold tracking-tight">Spacing &amp; kerning</h1>
		<p class="text-sm text-fg-muted">
			Per-glyph sidebearings are edited in the glyph editor. Set kerning pairs here.
		</p>
	</header>

	<Panel>
		<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			Spacing playground
		</h2>
		<p class="mb-3 text-[12px] text-fg-subtle">
			Type anything, scrub the size, toggle features. This is the fastest way to
			feel your rhythm and find awkward pairs.
		</p>
		<div class="mb-3 grid grid-cols-[1fr_180px_auto] items-center gap-3">
			<input
				bind:value={playgroundText}
				class="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
				placeholder="Type to test spacing…"
			/>
			<label class="flex items-center gap-2 text-[11px] text-fg-muted">
				Size
				<input
					type="range"
					min={24}
					max={200}
					step={2}
					bind:value={playgroundSize}
					class="h-1 flex-1 accent-accent"
				/>
				<span class="w-8 text-right font-mono text-fg" data-numeric>{playgroundSize}</span>
			</label>
			<div class="flex items-center gap-1">
				<button
					type="button"
					onclick={() => (playgroundKern = !playgroundKern)}
					class="rounded-md border px-2 py-1 font-mono text-[11px] {playgroundKern
						? 'border-accent bg-accent-soft text-accent'
						: 'border-border bg-surface-2 text-fg-muted hover:border-fg-subtle'}"
					title="Toggle kerning"
				>
					kern
				</button>
				<button
					type="button"
					onclick={() => (playgroundLiga = !playgroundLiga)}
					class="rounded-md border px-2 py-1 font-mono text-[11px] {playgroundLiga
						? 'border-accent bg-accent-soft text-accent'
						: 'border-border bg-surface-2 text-fg-muted hover:border-fg-subtle'}"
					title="Toggle ligatures"
				>
					liga
				</button>
			</div>
		</div>
		<div class="mb-3 grid grid-cols-2 gap-3">
			<label class="flex items-center gap-2 text-[11px] text-fg-muted">
				Line height
				<input
					type="range"
					min={0.8}
					max={2}
					step={0.05}
					bind:value={playgroundLineHeight}
					class="h-1 flex-1 accent-accent"
				/>
				<span class="w-10 text-right font-mono text-fg" data-numeric>
					{playgroundLineHeight.toFixed(2)}
				</span>
			</label>
			<label class="flex items-center gap-2 text-[11px] text-fg-muted">
				Tracking
				<input
					type="range"
					min={-50}
					max={200}
					step={5}
					bind:value={playgroundTracking}
					class="h-1 flex-1 accent-accent"
				/>
				<span class="w-12 text-right font-mono text-fg" data-numeric>
					{playgroundTracking > 0 ? '+' : ''}{playgroundTracking}
				</span>
			</label>
		</div>
		<div
			class="preview-font min-h-[160px] whitespace-pre-wrap rounded-lg border border-border bg-canvas p-6"
			style="font-size: {playgroundSize}px; line-height: {playgroundLineHeight}; letter-spacing: {playgroundTracking / 1000}em; font-feature-settings: {playgroundFeatures};"
		>
			{playgroundText || 'Type above…'}
		</div>
		<div class="mt-3 flex flex-wrap items-center gap-1.5">
			<span class="text-[11px] font-medium text-fg-muted">Compare with:</span>
			{#each REFERENCE_PRESETS as opt (opt.id)}
				<button
					type="button"
					onclick={() => (referenceFont = opt.id)}
					class="rounded-md px-2 py-1 text-[11px] font-medium transition-colors {referenceFont ===
					opt.id
						? 'bg-accent-soft text-accent'
						: 'text-fg-subtle hover:bg-surface-2 hover:text-fg'}"
				>
					{opt.label}
				</button>
			{/each}
			{#each briefReferenceFamilies as name (name)}
				<button
					type="button"
					onclick={() => (referenceFont = name)}
					class="rounded-md px-2 py-1 text-[11px] font-medium transition-colors {referenceFont ===
					name
						? 'bg-accent-soft text-accent'
						: 'border border-accent/30 text-accent/80 hover:bg-accent-soft/40'}"
					title="From Brief — auto-loaded from Google Fonts"
				>
					{name}
				</button>
			{/each}
			<input
				bind:value={referenceFont}
				placeholder="Or any font family…"
				class="ml-2 rounded-md border border-border bg-surface px-2 py-1 text-[11px] outline-none focus:border-accent"
			/>
		</div>
		{#if referenceFont}
			<div
				class="mt-2 min-h-[160px] whitespace-pre-wrap rounded-lg border border-dashed border-border-strong/50 bg-canvas/50 p-6 text-fg-muted"
				style="font-family: {referenceFont}, sans-serif; font-size: {playgroundSize}px; line-height: {playgroundLineHeight}; letter-spacing: {playgroundTracking / 1000}em; font-feature-settings: {playgroundFeatures};"
			>
				{playgroundText || `Reference: ${referenceFont}`}
			</div>
		{/if}
	</Panel>

	<Panel>
		<div class="mb-3 flex items-center justify-between gap-3">
			<h2 class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				Sidebearing analyzer
			</h2>
			<div class="flex items-center gap-1">
				{#each [{ id: 'lowercase', label: 'a–z' }, { id: 'uppercase', label: 'A–Z' }, { id: 'figure', label: '0–9' }, { id: 'all', label: 'All drawn' }] as opt (opt.id)}
					<button
						type="button"
						onclick={() => (analyzerCategory = opt.id as AnalyzerCategory)}
						class="rounded-md px-2 py-1 text-[11px] font-medium transition-colors {analyzerCategory ===
						opt.id
							? 'bg-accent-soft text-accent'
							: 'text-fg-subtle hover:bg-surface-2 hover:text-fg'}"
					>
						{opt.label}
					</button>
				{/each}
			</div>
		</div>
		<p class="mb-3 text-[12px] text-fg-subtle">
			Bars show LSB and RSB to scale. Symmetric round glyphs (o, O, e) should
			look balanced; stems with serifs/finials typically lean asymmetric.
		</p>
		{#if analyzerGlyphs.length === 0}
			<p class="text-sm text-fg-muted">No drawn glyphs in this category yet.</p>
		{:else}
			<ul class="grid gap-1">
				{#each analyzerGlyphs as g (g.codepoint)}
					{@const lsbPct = (g.leftSidebearing / analyzerMax) * 100}
					{@const rsbPct = (g.rightSidebearing / analyzerMax) * 100}
					{@const asymmetric =
						Math.abs(g.leftSidebearing - g.rightSidebearing) >
						Math.max(20, Math.min(g.leftSidebearing, g.rightSidebearing) * 0.4)}
					<li
						class="grid grid-cols-[40px_1fr_30px_1fr_60px] items-center gap-2 rounded-md px-2 py-1.5 text-[12px] hover:bg-surface-2/40"
					>
						<a
							href="/project/{project?.id}/edit"
							onclick={() => projectStore.selectGlyph(g.codepoint)}
							class="preview-font text-center text-xl leading-none hover:text-accent"
							title="Open {g.name}"
						>
							{String.fromCodePoint(g.codepoint)}
						</a>
						<div class="flex h-2 justify-end overflow-hidden rounded-full bg-surface-2">
							<div
								class="h-full {asymmetric ? 'bg-warn' : 'bg-accent/70'}"
								style="width: {Math.max(2, lsbPct)}%;"
							></div>
						</div>
						<div class="text-center font-mono text-[10px] text-fg-subtle" data-numeric>
							{g.leftSidebearing}
						</div>
						<div class="flex h-2 overflow-hidden rounded-full bg-surface-2">
							<div
								class="h-full {asymmetric ? 'bg-warn' : 'bg-accent/70'}"
								style="width: {Math.max(2, rsbPct)}%;"
							></div>
						</div>
						<div class="text-right font-mono text-[10px] text-fg-subtle" data-numeric>
							{g.rightSidebearing}
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</Panel>

	<Panel>
		<h2 class="mb-2 inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			<Group class="size-3" /> Sidebearing classes ({project?.sidebearingClasses?.length ?? 0})
		</h2>
		<p class="mb-3 text-[12px] text-fg-subtle">
			Group glyphs that should share LSB/RSB (e.g. H I L M N for vertical stems, O C G Q for rounds).
			Edits to a class propagate to every member, so spacing stays coherent before kerning starts.
		</p>
		{#if project?.sidebearingClasses && project.sidebearingClasses.length > 0}
			<ul class="mb-3 grid gap-2">
				{#each project.sidebearingClasses as cls (cls.id)}
					{@const avg = sbClassAvg(cls.members)}
					<li class="rounded-md border border-border bg-surface-2/40 px-3 py-2">
						<div class="mb-1.5 flex items-center justify-between gap-2">
							<input
								type="text"
								value={cls.name}
								onchange={(e) =>
									projectStore.renameSidebearingClass(cls.id, e.currentTarget.value)}
								class="min-w-0 flex-1 border-0 bg-transparent text-[13px] font-medium text-fg outline-none focus:ring-1 focus:ring-accent"
							/>
							<button
								type="button"
								onclick={() => projectStore.removeSidebearingClass(cls.id)}
								class="rounded p-1 text-fg-subtle hover:bg-danger/10 hover:text-danger"
								aria-label="Delete class"
							>
								<Trash2 class="size-3.5" />
							</button>
						</div>
						<div class="mb-2 flex flex-wrap gap-1">
							{#each cls.members as cp (cp)}
								{@const g = project.glyphs[cp]}
								<button
									type="button"
									onclick={() =>
										projectStore.updateSidebearingClassMembers(
											cls.id,
											cls.members.filter((m) => m !== cp)
										)}
									class="inline-flex items-center gap-0.5 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-fg hover:bg-danger/10 hover:text-danger"
									title="Remove {g?.name ?? cp.toString(16)}"
								>
									{#if cp > 0x20 && cp < 0x10000}
										{String.fromCodePoint(cp)}
									{:else}
										{g?.name ?? cp}
									{/if}
								</button>
							{/each}
						</div>
						<div class="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 text-[11px]">
							<span class="text-fg-muted">LSB</span>
							<input
								type="number"
								value={avg.lsb}
								onchange={(e) =>
									projectStore.setSidebearingClassValues(
										cls.id,
										Number(e.currentTarget.value),
										null
									)}
								class="w-full rounded-md border border-border bg-surface px-2 py-1 font-mono text-[11px] text-fg outline-none focus:border-accent"
							/>
							<span class="text-fg-muted">RSB</span>
							<input
								type="number"
								value={avg.rsb}
								onchange={(e) =>
									projectStore.setSidebearingClassValues(
										cls.id,
										null,
										Number(e.currentTarget.value)
									)}
								class="w-full rounded-md border border-border bg-surface px-2 py-1 font-mono text-[11px] text-fg outline-none focus:border-accent"
							/>
						</div>
						{#if cls.members.length > 0}
							{@const rhythm = cls.members
								.map((cp) =>
									cp > 0x20 && cp < 0x10000 ? String.fromCodePoint(cp) : ''
								)
								.filter(Boolean)
								.flatMap((ch) => ['n', ch, 'o', ch])
								.join('')}
							<div
								class="preview-font mt-2 overflow-hidden rounded bg-canvas px-2 py-1.5 text-2xl leading-none text-fg"
								title="Rhythm proof — letters drawn from this class interleaved with n and o so you can eyeball whether spacing produces stable text color"
							>
								{rhythm}
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
		<div class="grid grid-cols-[1fr_2fr_auto] gap-2">
			<Field label="Name">
				<Input density="sm" bind:value={newSbName} placeholder="Vertical stems" />
			</Field>
			<Field label="Members (paste characters)">
				<Input density="sm" bind:value={newSbMembers} placeholder="HILMN" />
			</Field>
			<Button density="sm" onclick={createSbClass} disabled={!newSbMembers.trim()}>
				{#snippet icon()}<Plus class="size-3.5" />{/snippet}
				Add class
			</Button>
		</div>
		<div class="mt-1.5 flex flex-wrap items-center gap-1 text-[10px]">
			<span class="text-fg-subtle">Quick presets:</span>
			{#each SB_PRESETS as preset (preset.name)}
				<button
					type="button"
					onclick={() => insertPreset(preset)}
					class="rounded-full border border-border bg-surface px-2 py-0.5 text-fg-muted hover:border-accent hover:text-accent"
					title="Pre-fill: {preset.chars}"
				>
					{preset.name}
				</button>
			{/each}
		</div>
	</Panel>

	<Panel>
		<div class="mb-3 flex items-center justify-between gap-3">
			<h2 class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				Stem rhythm
			</h2>
			<div class="flex items-center gap-1">
				{#each Object.entries(RHYTHM_SETS) as [id, set] (id)}
					<button
						type="button"
						onclick={() => (rhythmSet = id as RhythmSet)}
						class="rounded-md px-2 py-1 text-[11px] font-medium transition-colors {rhythmSet ===
						id
							? 'bg-accent-soft text-accent'
							: 'text-fg-subtle hover:bg-surface-2 hover:text-fg'}"
					>
						{set.label}
					</button>
				{/each}
			</div>
		</div>
		<p class="mb-3 text-[12px] text-fg-subtle">
			Scans every drawn stem-bearing glyph and reports its median vertical-stem width.
			Stems should match within ~5 units across the set; outliers highlight in warn.
		</p>
		{#if rhythmDrawn.length === 0}
			<p class="text-sm text-fg-muted">No drawn glyphs in this set yet.</p>
		{:else}
			<div class="flex flex-wrap gap-4 rounded-lg border border-border bg-canvas p-4">
				{#each rhythmDrawn as g (g.codepoint)}
					{@const stem = rhythmStemWidths.get(g.codepoint) ?? 0}
					{@const diff = stem && rhythmMedianStem ? stem - rhythmMedianStem : 0}
					{@const isOutlier = stem > 0 && Math.abs(diff) > 5}
					<div class="flex flex-col items-center gap-1">
						<svg
							viewBox="0 0 {Math.max(g.advanceWidth, 200)} {(project?.metrics.ascender ?? 800) - (project?.metrics.descender ?? -200)}"
							width="60"
							height="80"
							preserveAspectRatio="xMidYMid meet"
							style="transform: scaleY(-1);"
							aria-label={g.name}
						>
							<g transform="translate(0 {-(project?.metrics.ascender ?? 800)})">
								<path
									d={contoursToSvgPath(g.contours)}
									fill="currentColor"
									fill-rule="evenodd"
								/>
							</g>
						</svg>
						<div class="flex flex-col items-center text-[10px]">
							<span class="font-mono text-fg">{String.fromCodePoint(g.codepoint)}</span>
							{#if stem > 0}
								<span
									class="font-mono {isOutlier ? 'text-warn' : 'text-fg-subtle'}"
									data-numeric
								>
									{stem}
									{#if isOutlier}({diff > 0 ? '+' : ''}{diff}){/if}
								</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
			{#if rhythmMedianStem > 0}
				<p class="mt-2 text-[11px] text-fg-subtle">
					Median stem width:
					<span class="font-mono text-fg" data-numeric>{rhythmMedianStem}</span> ·
					Outliers marked in warn ({rhythmDrawn.filter((g) => {
						const s = rhythmStemWidths.get(g.codepoint);
						return s && Math.abs(s - rhythmMedianStem) > 5;
					}).length} of {rhythmDrawn.length})
				</p>
			{/if}
		{/if}
	</Panel>

	<Panel>
		<h2 class="mb-4 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			Kerning pair editor
		</h2>
		<div class="grid grid-cols-[1fr_1fr_1fr] gap-3">
			<Field label="Left glyph">
				<Input maxlength={2} bind:value={leftChar} class="text-center text-lg" />
			</Field>
			<Field label="Right glyph">
				<Input maxlength={2} bind:value={rightChar} class="text-center text-lg" />
			</Field>
			<Field label="Adjustment (units)">
				<Input
					type="number"
					value={pendingValue}
					onchange={(e) => applyKerning(Number(e.currentTarget.value))}
				/>
			</Field>
		</div>

		<div class="mt-5 rounded-lg border border-border bg-canvas p-6 text-center">
			<div class="preview-font text-7xl leading-none" style="letter-spacing: 0;">
				{leftChar}{rightChar}
			</div>
			<div class="mt-3 text-[11px] text-fg-subtle" data-numeric>
				kern({leftChar}, {rightChar}) = {currentValue}
			</div>
		</div>
		{#if classExpansionPairs.length > 0}
			<div class="mt-3 rounded-lg border border-accent/30 bg-accent-soft/15 px-4 py-3">
				<div class="mb-2 text-[10px] font-semibold tracking-wider text-accent uppercase">
					Class expansion ({classExpansionPairs.length} pair{classExpansionPairs.length === 1 ? '' : 's'})
				</div>
				<div
					class="preview-font flex flex-wrap gap-x-4 gap-y-1 leading-snug"
					style="font-size: 32px;"
				>
					{#each classExpansionPairs as p (p.l + p.r)}
						<span>{p.l}{p.r}</span>
					{/each}
				</div>
				<p class="mt-2 text-[10px] text-fg-subtle">
					The kerning value above applies to every pair shown. Scan for outliers — some
					members may need their own pair override.
				</p>
			</div>
		{/if}
		{#if !isClassRef(parseSide(leftChar)) && !isClassRef(parseSide(rightChar)) && leftChar.length === 1 && rightChar.length === 1}
			<div class="mt-3 rounded-lg border border-border bg-canvas px-6 py-4">
				<div class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					In context
				</div>
				<div class="preview-font mt-2 text-3xl leading-snug">
					{`H${leftChar}H${leftChar}${rightChar}H${rightChar}H`}
				</div>
				<div class="preview-font mt-1 text-3xl leading-snug">
					{`n${leftChar}n${leftChar}${rightChar}n${rightChar}n`}
				</div>
				<div class="preview-font mt-1 text-2xl leading-snug text-fg-muted">
					{`The ${leftChar}${rightChar}erage ${leftChar}${rightChar}ailable ${leftChar}${rightChar}ailable`}
				</div>
			</div>
		{/if}

		<div class="mt-3 flex flex-wrap items-center gap-2">
			<span class="text-[11px] font-medium text-fg-muted">Nudge:</span>
			{#each [-30, -10, -5, 0, 5, 10, 30] as delta (delta)}
				<Button
					density="sm"
					variant="secondary"
					onclick={() => applyKerning(currentValue + delta)}
				>
					{delta > 0 ? '+' : ''}{delta}
				</Button>
			{/each}
		</div>
	</Panel>

	<Panel>
		<div class="mb-3 flex items-center justify-between gap-3">
			<h2 class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				Common pair suggestions
			</h2>
			<label class="flex items-center gap-1.5 text-[11px] text-fg-muted">
				<input type="checkbox" bind:checked={pairsOnlyDrawn} class="accent-accent" />
				Only pairs both drawn
			</label>
		</div>
		<div class="flex flex-wrap gap-1.5">
			{#each visiblePairs as [l, r] (l + r)}
				{@const existing = projectStore.getKerningValue(cpOf(l), cpOf(r))}
				{@const hasKern = existing !== 0}
				<button
					type="button"
					class="rounded-md border px-2 py-1 font-mono text-[12px] {hasKern
						? 'border-accent/40 bg-accent-soft text-accent'
						: 'border-border bg-surface-2 hover:border-accent hover:bg-accent-soft'}"
					onclick={() => {
						leftChar = l;
						rightChar = r;
					}}
					title={hasKern ? `Current kern: ${existing}` : 'Click to load this pair'}
				>
					{l}{r}
					{#if hasKern}<span class="ml-1 text-[10px] text-fg-subtle" data-numeric>{existing}</span>{/if}
				</button>
			{/each}
			{#if visiblePairs.length === 0}
				<p class="text-[11px] text-fg-subtle">
					No common pairs match — draw a couple uppercase letters first, then come back.
				</p>
			{/if}
		</div>
	</Panel>

	<Panel>
		<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			Bulk spacing
		</h2>
		<div class="mb-4 grid gap-3 md:grid-cols-2">
			<div>
				<div class="mb-1.5 text-[11px] font-medium text-fg-muted">Tabular figures</div>
				<p class="mb-2 text-[11px] text-fg-subtle">
					Set every digit to the widest digit's advance, centred — required for
					data tables and most UI.
				</p>
				<Button density="sm" variant="secondary" onclick={makeFiguresTabular}>
					Tabularise 0–9
				</Button>
			</div>
			<div>
				<div class="mb-1.5 text-[11px] font-medium text-fg-muted">Apply sidebearing</div>
				<div class="grid grid-cols-[auto_auto_auto_1fr] items-center gap-1.5">
					<select
						bind:value={bulkSbWhich}
						class="rounded border border-border bg-surface px-1.5 py-1 text-[11px] outline-none"
					>
						<option value="both">LSB + RSB</option>
						<option value="left">LSB</option>
						<option value="right">RSB</option>
					</select>
					<span class="text-[11px] text-fg-subtle">=</span>
					<input
						type="number"
						bind:value={bulkSbValue}
						class="w-16 rounded border border-border bg-surface px-1.5 py-1 text-right font-mono text-[11px] outline-none"
					/>
					<select
						bind:value={bulkSbCategory}
						class="rounded border border-border bg-surface px-1.5 py-1 text-[11px] outline-none"
					>
						<option value="upper">to A–Z</option>
						<option value="lower">to a–z</option>
						<option value="figure">to 0–9</option>
						<option value="all">to all drawn</option>
					</select>
				</div>
				<Button
					density="sm"
					variant="secondary"
					onclick={() => setAllSidebearings(bulkSbWhich, bulkSbValue, bulkSbCategory)}
					class="mt-2"
				>
					Apply
				</Button>
			</div>
		</div>
	</Panel>

	<Panel>
		<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			Bulk import kerning
		</h2>
		<p class="mb-2 text-[12px] text-fg-subtle">
			Paste pairs as <code>left right value</code> per line. Comma or whitespace
			separated. Use <code>@classname</code> for class refs. Existing pairs are overwritten.
		</p>
		<textarea
			bind:value={bulkText}
			rows="5"
			placeholder={`A V -60\nT a -40\n@upper_left o -20`}
			class="block w-full resize-y rounded-md border border-border bg-surface-2/40 px-3 py-2 font-mono text-[12px] text-fg outline-none focus:border-accent focus:bg-surface"
		></textarea>
		<div class="mt-2 flex items-center justify-between gap-3">
			<span class="text-[11px] text-fg-subtle">
				{#if bulkResult}{bulkResult}{/if}
			</span>
			<Button density="sm" onclick={importBulkKerning} disabled={!bulkText.trim()}>
				{#snippet icon()}<Plus class="size-3.5" />{/snippet}
				Import pairs
			</Button>
		</div>
	</Panel>

	<Panel>
		<h2 class="mb-3 inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			<Group class="size-3" /> Kerning classes ({project?.classes?.length ?? 0})
		</h2>
		<p class="mb-3 text-[12px] text-fg-subtle">
			Group glyphs that share a side (e.g. <code>@A_left = [A Á Â Ä À]</code>).
			Then use the class name (with <code>@</code>) as either side of a kerning pair —
			one rule covers all members.
		</p>
		{#if classSuggestions.length > 0}
			<div class="mb-4 rounded-md border border-accent/30 bg-accent-soft/20 p-3">
				<div class="mb-2 text-[11px] font-semibold text-accent">
					Suggested from composites ({classSuggestions.length})
				</div>
				<p class="mb-2 text-[11px] text-fg-muted">
					Each base letter with composite variants becomes one class — kerning the
					base then automatically covers every accented form.
				</p>
				<div class="flex flex-wrap gap-1.5">
					{#each classSuggestions as s (s.name)}
						<button
							type="button"
							onclick={() => acceptClassSuggestion(s)}
							class="rounded-md border border-accent/40 bg-surface px-2 py-1 text-[11px] font-medium text-accent hover:bg-accent-soft"
							title={s.basis}
						>
							+ <span class="font-mono">{s.name}</span>
							<span class="ml-1 text-fg-muted">({s.members.length})</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}
		{#if project && (project.classes ?? []).length > 0}
			<ul class="mb-3 grid gap-1">
				{#each project.classes ?? [] as cls (cls.name)}
					<li
						class="flex items-center gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2"
					>
						<span class="font-mono text-[13px] font-medium text-accent">{cls.name}</span>
						<span class="text-[12px] text-fg-muted">
							{cls.members.map((cp) => String.fromCodePoint(cp)).join(' ')}
						</span>
						<button
							type="button"
							onclick={() => {
								leftChar = cls.name;
							}}
							class="ml-auto rounded border border-border bg-surface px-2 py-0.5 text-[11px] text-fg-muted hover:border-accent hover:text-accent"
						>
							Use as left
						</button>
						<button
							type="button"
							onclick={() => {
								rightChar = cls.name;
							}}
							class="rounded border border-border bg-surface px-2 py-0.5 text-[11px] text-fg-muted hover:border-accent hover:text-accent"
						>
							Use as right
						</button>
						<button
							type="button"
							onclick={() => projectStore.removeKerningClass(cls.name)}
							class="rounded p-1 text-fg-subtle hover:bg-danger/10 hover:text-danger"
							aria-label="Remove class {cls.name}"
						>
							<Trash2 class="size-3.5" />
						</button>
					</li>
				{/each}
			</ul>
		{/if}
		<div class="grid grid-cols-[1fr_2fr_auto] items-end gap-2 rounded-md border border-dashed border-border-strong/50 bg-surface-2/40 p-3">
			<Field label="Class name (must start with @)">
				<Input density="sm" bind:value={newClassName} placeholder="@A_left" />
			</Field>
			<Field label="Member glyphs (space-separated)">
				<Input density="sm" bind:value={newClassMembers} placeholder="A Á Â Ä À Å Ã" />
			</Field>
			<Button density="sm" onclick={addClass}>
				{#snippet icon()}<Plus class="size-3.5" />{/snippet}
				Add class
			</Button>
		</div>
	</Panel>

	<Panel>
		<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			Pairs in this font ({project?.kerning.length ?? 0})
		</h2>
		{#if !project?.kerning || project.kerning.length === 0}
			<p class="text-sm text-fg-muted">No kerning yet. Add a pair above.</p>
		{:else}
			<ul class="grid gap-1">
				{#each project.kerning as pair (`${pair.left}-${pair.right}`)}
					<li
						class="flex items-center gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2"
					>
						<button
							type="button"
							class="flex items-center gap-1 text-2xl font-medium"
							onclick={() => {
								leftChar = sideLabel(pair.left);
								rightChar = sideLabel(pair.right);
							}}
						>
							<span class={isClassRef(pair.left) ? 'font-mono text-[14px] text-accent' : 'preview-font'}>
								{sideLabel(pair.left)}
							</span>
							<span class={isClassRef(pair.right) ? 'font-mono text-[14px] text-accent' : 'preview-font'}>
								{sideLabel(pair.right)}
							</span>
						</button>
						<span class="ml-auto font-mono text-sm text-fg-muted" data-numeric>
							{pair.value > 0 ? '+' : ''}{pair.value}
						</span>
						<button
							type="button"
							onclick={() => removeKerning(pair.left, pair.right)}
							class="rounded p-1 text-fg-subtle hover:bg-danger/10 hover:text-danger"
							aria-label="Remove pair"
						>
							<Trash2 class="size-3.5" />
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</Panel>

	<Panel>
		<h2 class="mb-3 inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			<Globe class="size-3" /> Script packs
		</h2>
		<p class="mb-3 text-[12px] text-fg-subtle">
			Extend the default Latin set with Greek, Cyrillic, or Vietnamese. Adding a pack
			creates empty glyph slots — your existing glyphs are untouched.
		</p>
		<div class="grid gap-2 md:grid-cols-3">
			{#each SCRIPT_PACKS as pack (pack.id)}
				{@const present = project?.glyphs[pack.glyphs[0]?.codepoint ?? 0] !== undefined}
				<div class="rounded-md border border-border bg-surface-2/40 px-3 py-3">
					<div class="text-[13px] font-medium text-fg">{pack.label}</div>
					<div class="mb-2 text-[11px] text-fg-subtle">{pack.description}</div>
					<Button
						density="sm"
						variant={present ? 'ghost' : 'secondary'}
						onclick={() => projectStore.addScriptPack(pack)}
						disabled={present}
					>
						{#snippet icon()}<Plus class="size-3.5" />{/snippet}
						{present ? 'Already added' : `Add ${pack.glyphs.length} glyphs`}
					</Button>
				</div>
			{/each}
		</div>
	</Panel>
</div>
</div>
