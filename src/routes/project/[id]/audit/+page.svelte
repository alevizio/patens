<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { projectStore } from '$lib/stores/project.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import {
		auditProject,
		preflightProject,
		auditCompatibility,
		describeAuditCode,
		sortBySeverity,
		type AuditIssue,
		type AuditSeverity
	} from '$lib/font/audit';
	import { glyphBounds, roundToFontUnits } from '$lib/font/path';
	import { booleanContours } from '$lib/font/path-edit';
	import { aglfnName } from '$lib/font/aglfn';
	import Panel from '$lib/ui/Panel.svelte';
	import LoadingPanel from '$lib/ui/LoadingPanel.svelte';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import Info from '@lucide/svelte/icons/info';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import Search from '@lucide/svelte/icons/search';
	import ListChecks from '@lucide/svelte/icons/list-checks';
	import Wand from '@lucide/svelte/icons/wand-sparkles';

	const project = $derived(projectStore.project);

	const allIssues = $derived.by(() => {
		if (!project) return [] as AuditIssue[];
		const out: AuditIssue[] = [];
		out.push(...auditProject(project));
		out.push(...auditCompatibility(project));
		out.push(...preflightProject(project));
		// Dedup by codepoint+code+message
		const seen = new Set<string>();
		const dedup: AuditIssue[] = [];
		for (const i of out) {
			const k = `${i.codepoint}:${i.code}:${i.message}`;
			if (seen.has(k)) continue;
			seen.add(k);
			dedup.push(i);
		}
		return sortBySeverity(dedup);
	});

	// URL ?code=<audit-code>&severity=error|warn|info seeds let other surfaces
	// (release pre-flight summary, future audit-link buttons) deep-link
	// directly to a specific issue type. Falls back to empty query / all
	// severities when the params are absent or invalid.
	const initialCode = page.url.searchParams.get('code') ?? '';
	const sevParam = page.url.searchParams.get('severity');
	const initialSeverity: AuditSeverity | 'all' =
		sevParam === 'error' || sevParam === 'warn' || sevParam === 'info' ? sevParam : 'all';
	let query = $state(initialCode);
	let severityFilter = $state<AuditSeverity | 'all'>(initialSeverity);
	let groupMode = $state<'code' | 'glyph'>('code');

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		return allIssues.filter((i) => {
			if (severityFilter !== 'all' && i.severity !== severityFilter) return false;
			if (!q) return true;
			// Match against message, code, hex, AND the curated description —
			// so "donut", "hole", "rasteriser" find contour-winding-collision
			// without the designer needing to remember the exact code name.
			const desc = describeAuditCode(i.code)?.toLowerCase() ?? '';
			return (
				i.message.toLowerCase().includes(q) ||
				i.code.toLowerCase().includes(q) ||
				desc.includes(q) ||
				(i.codepoint > 0 && i.codepoint.toString(16).toLowerCase().includes(q))
			);
		});
	});

	const counts = $derived({
		all: allIssues.length,
		error: allIssues.filter((i) => i.severity === 'error').length,
		warn: allIssues.filter((i) => i.severity === 'warn').length,
		info: allIssues.filter((i) => i.severity === 'info').length
	});

	// Celebrate the first time the audit hits 0 issues in a session. Plain `let`
	// (not $state) so writing back inside the effect doesn't retrigger it — the
	// reactive write/read cycle on $state crashed audit's mount with
	// "Maximum update depth exceeded" when reached after some nav sequences.
	let lastSeenAllPass = false;
	$effect(() => {
		const allPass = counts.all === 0 && projectStore.project !== null;
		if (allPass && !lastSeenAllPass) {
			(async () => {
				const { celebrate } = await import('$lib/delight');
				celebrate('medium');
			})();
		}
		lastSeenAllPass = allPass;
	});

	const grouped = $derived.by(() => {
		const map = new Map<string, AuditIssue[]>();
		for (const i of filtered) {
			const list = map.get(i.code) ?? [];
			list.push(i);
			map.set(i.code, list);
		}
		return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
	});

	const groupedByGlyph = $derived.by(() => {
		const map = new Map<number, AuditIssue[]>();
		for (const i of filtered) {
			const key = i.codepoint;
			const list = map.get(key) ?? [];
			list.push(i);
			map.set(key, list);
		}
		// Sort by issue count desc; project-level issues (cp=0) shown first.
		return [...map.entries()].sort((a, b) => {
			if (a[0] === 0 && b[0] !== 0) return -1;
			if (b[0] === 0 && a[0] !== 0) return 1;
			return b[1].length - a[1].length;
		});
	});

	const FIXABLE_CODES = new Set([
		'open-contour',
		'overflows-advance',
		'zero-advance',
		'naming-version',
		'metrics-asc-mismatch',
		'metrics-desc-mismatch',
		'metrics-gap-mismatch',
		'metrics-use-typo-off',
		'glyph-name-invalid',
		'glyph-name-empty',
		'glyph-name-too-long',
		// Contour-shape fixers (parity with the Edit-tab audit panel).
		'self-intersecting',
		'duplicate-points',
		'near-collinear-points',
		// Winding-collision fix is the same polygon-union routine as the
		// self-intersecting fix — clipping normalises nested winding too.
		'contour-winding-collision',
		// Fractional coordinates from SVG paste / Figma — round to int.
		'off-grid-points',
		// Anchor naming — fix is purely a rename based on isMark.
		'anchor-naming-mark-no-prefix',
		'anchor-naming-base-with-prefix'
	]);

	// Build a small "next 3 things to fix" list: prefer errors with auto-fix,
	// then errors, then warnings, then anything with an auto-fix.
	const nextToFix = $derived.by(() => {
		const score = (i: AuditIssue) => {
			let s = 0;
			if (i.severity === 'error') s += 100;
			else if (i.severity === 'warn') s += 50;
			else s += 20;
			if (FIXABLE_CODES.has(i.code)) s += 30;
			return s;
		};
		return [...allIssues].sort((a, b) => score(b) - score(a)).slice(0, 3);
	});

	const jumpToGlyph = (cp: number) => {
		if (!project || cp === 0 || !project.glyphs[cp]) return;
		projectStore.selectGlyph(cp);
		goto(`/project/${project.id}/edit`);
	};

	const fixableInList = $derived(filtered.filter((i) => FIXABLE_CODES.has(i.code)));

	const fixAllVisible = () => {
		if (fixableInList.length === 0) return;
		const counts = new Map<string, number>();
		for (const i of fixableInList) {
			fixIssue(i);
			counts.set(i.code, (counts.get(i.code) ?? 0) + 1);
		}
		const summary = [...counts.entries()]
			.map(([c, n]) => `${n}× ${c}`)
			.join(', ');
		toast.success(`Applied ${fixableInList.length} fixes (${summary})`);
	};

	// Mirrors the editor's auto-snapshot-before-fix: contour-mutating fixes
	// save a labelled snapshot first when the most-recent snapshot for that
	// glyph is older than 30 seconds. Same insurance the editor's per-glyph
	// Fix button provides — Fix-all-visible on the audit page can run
	// dozens of these in one click, so the protection matters even more here.
	const CONTOUR_MUTATING = new Set([
		'self-intersecting',
		'contour-winding-collision',
		'off-grid-points',
		'duplicate-points',
		'near-collinear-points'
	]);
	const snapshotIfNeeded = (codepoint: number, code: string) => {
		if (!project || !CONTOUR_MUTATING.has(code)) return;
		const g = project.glyphs[codepoint];
		if (!g || g.contours.length === 0) return;
		const latest = g.revisions?.[g.revisions.length - 1];
		const recent = latest ? Date.now() - new Date(latest.takenAt).getTime() < 30_000 : false;
		if (!recent) projectStore.saveRevision(codepoint, `pre-fix: ${code}`);
	};

	const fixIssue = (issue: AuditIssue) => {
		if (!project) return;
		snapshotIfNeeded(issue.codepoint, issue.code);
		switch (issue.code) {
			case 'open-contour': {
				projectStore.updateGlyph(issue.codepoint, (g) => ({
					...g,
					contours: g.contours.map((c) => (c.closed ? c : { ...c, closed: true }))
				}));
				toast.success('Closed open contours');
				return;
			}
			case 'overflows-advance':
			case 'zero-advance': {
				const g = project.glyphs[issue.codepoint];
				if (!g || g.contours.length === 0) return;
				const b = glyphBounds(g.contours);
				const sb = project.metrics.defaultSidebearing;
				const target = Math.max(1, Math.round(b.maxX) + sb);
				projectStore.updateGlyph(issue.codepoint, (gg) => ({ ...gg, advanceWidth: target }));
				toast.success(`Set advance to ${target}`);
				return;
			}
			case 'naming-version': {
				projectStore.updateMetadata({ version: '1.000' });
				toast.success('Version set to 1.000');
				return;
			}
			case 'metrics-asc-mismatch':
			case 'metrics-desc-mismatch':
			case 'metrics-gap-mismatch': {
				projectStore.updateMetrics({
					hheaAscender: project.metrics.typoAscender ?? project.metrics.ascender,
					hheaDescender: project.metrics.typoDescender ?? project.metrics.descender,
					hheaLineGap: project.metrics.typoLineGap ?? 0
				});
				toast.success('hhea metrics synced to typo metrics');
				return;
			}
			case 'metrics-use-typo-off': {
				projectStore.updateMetrics({ useTypoMetrics: true });
				toast.success('USE_TYPO_METRICS enabled');
				return;
			}
			case 'glyph-name-invalid':
			case 'glyph-name-empty':
			case 'glyph-name-too-long': {
				const g = project.glyphs[issue.codepoint];
				if (!g) return;
				// Prefer the AGLFN name for this codepoint — gives "zero" instead of
				// "_0", "ampersand" instead of "_&_", etc.
				const aglfn = aglfnName(issue.codepoint);
				const aglfnValid = /^[A-Za-z._][A-Za-z0-9._-]{0,62}$/.test(aglfn);
				let cleaned = aglfnValid
					? aglfn
					: g.name.replace(/[^A-Za-z0-9._-]/g, '_');
				if (!/^[A-Za-z._]/.test(cleaned)) cleaned = '_' + cleaned;
				if (cleaned.length > 63) cleaned = cleaned.slice(0, 63);
				if (!cleaned.trim() || /^_+$/.test(cleaned)) {
					cleaned = `uni${issue.codepoint.toString(16).toUpperCase().padStart(4, '0')}`;
				}
				projectStore.renameGlyph(issue.codepoint, cleaned);
				toast.success(`Renamed to "${cleaned}"`);
				return;
			}
			// Contour-shape fixers — same logic as the Edit-tab audit panel.
			case 'self-intersecting':
			case 'contour-winding-collision': {
				const g = project.glyphs[issue.codepoint];
				if (!g) return;
				const cleaned = booleanContours(g.contours, 'union');
				projectStore.updateGlyph(issue.codepoint, (gg) => ({ ...gg, contours: cleaned }));
				return;
			}
			case 'off-grid-points': {
				const g = project.glyphs[issue.codepoint];
				if (!g) return;
				const cleaned = g.contours.map((c) => ({
					...c,
					commands: roundToFontUnits(c.commands)
				}));
				projectStore.updateGlyph(issue.codepoint, (gg) => ({ ...gg, contours: cleaned }));
				return;
			}
			case 'anchor-naming-mark-no-prefix':
			case 'anchor-naming-base-with-prefix': {
				const g = project.glyphs[issue.codepoint];
				if (!g || !g.anchors) return;
				const isMark = issue.codepoint >= 0x0300 && issue.codepoint <= 0x036f;
				const cleaned = g.anchors.map((a) => {
					if (isMark && !a.name.startsWith('_')) return { ...a, name: `_${a.name}` };
					if (!isMark && a.name.startsWith('_')) return { ...a, name: a.name.slice(1) };
					return a;
				});
				projectStore.updateGlyph(issue.codepoint, (gg) => ({ ...gg, anchors: cleaned }));
				toast.success('Renamed anchors to match convention.');
				return;
			}
			case 'duplicate-points': {
				const g = project.glyphs[issue.codepoint];
				if (!g) return;
				const cleaned = g.contours.map((c) => {
					const out: typeof c.commands = [];
					let prevX: number | null = null;
					let prevY: number | null = null;
					for (const cmd of c.commands) {
						if (cmd.type === 'Z') {
							out.push(cmd);
							prevX = null;
							prevY = null;
							continue;
						}
						if (
							prevX !== null &&
							prevY !== null &&
							cmd.type !== 'M' &&
							Math.abs(cmd.x - prevX) < 0.5 &&
							Math.abs(cmd.y - prevY) < 0.5
						)
							continue;
						out.push(cmd);
						prevX = cmd.x;
						prevY = cmd.y;
					}
					return { ...c, commands: out };
				});
				projectStore.updateGlyph(issue.codepoint, (gg) => ({ ...gg, contours: cleaned }));
				return;
			}
			case 'near-collinear-points': {
				const g = project.glyphs[issue.codepoint];
				if (!g) return;
				const cleaned = g.contours.map((c) => {
					const cmds = [...c.commands];
					const drop = new Set<number>();
					for (let i = 1; i < cmds.length - 1; i++) {
						const a = cmds[i - 1];
						const b = cmds[i];
						const d = cmds[i + 1];
						if (
							(a.type !== 'M' && a.type !== 'L') ||
							b.type !== 'L' ||
							d.type !== 'L'
						)
							continue;
						const num = Math.abs(
							(d.y - a.y) * b.x - (d.x - a.x) * b.y + d.x * a.y - d.y * a.x
						);
						const den = Math.hypot(d.x - a.x, d.y - a.y);
						if (den < 0.001) continue;
						if (num / den < 1) drop.add(i);
					}
					if (drop.size === 0) return c;
					return { ...c, commands: cmds.filter((_, i) => !drop.has(i)) };
				});
				projectStore.updateGlyph(issue.codepoint, (gg) => ({ ...gg, contours: cleaned }));
				return;
			}
		}
	};

	const labelFor = (cp: number) => {
		if (cp === 0) return 'Project';
		const g = project?.glyphs[cp];
		if (!g) return `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
		const char =
			cp > 0x20 && cp < 0x10000 ? String.fromCodePoint(cp) : '';
		return char ? `${char} (${g.name})` : g.name;
	};
</script>

{#if !project}
	<LoadingPanel label="Running audit" />
{:else}
	<div class="h-full overflow-auto">
		<div class="mx-auto flex max-w-5xl flex-col gap-6 p-6">
			<header class="flex items-start gap-3">
				<div class="mt-1 flex size-9 items-center justify-center rounded-md bg-accent-soft text-accent-strong">
					<ListChecks class="size-4" />
				</div>
				<div>
					<h1 class="text-xl font-semibold tracking-tight">Audit</h1>
					<p class="text-sm text-fg-muted">
						Every per-glyph issue, master compatibility break, and pre-flight check
						aggregated into one sortable view. Click any glyph to jump in and fix it.
					</p>
				</div>
			</header>

			{#if nextToFix.length > 0}
				<Panel>
					<div class="mb-2 flex items-baseline justify-between gap-2">
						<h2 class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
							Next to fix
						</h2>
						<span class="text-[10px] font-mono text-fg-subtle" data-numeric>
							top {nextToFix.length} of {allIssues.length}
						</span>
					</div>
					<ul class="grid gap-1">
						{#each nextToFix as i (`${i.codepoint}:${i.code}:${i.message}`)}
							<li
								class="flex items-start gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2"
							>
								<span class="mt-0.5">
									{#if i.severity === 'error'}
										<AlertCircle class="size-3.5 text-danger" />
									{:else if i.severity === 'warn'}
										<AlertTriangle class="size-3.5 text-warn" />
									{:else}
										<Info class="size-3.5 text-accent" />
									{/if}
								</span>
								<div class="min-w-0 flex-1">
									<div class="text-[12px] text-fg" title={describeAuditCode(i.code)}>
										{i.message}
									</div>
									<div
										class="mt-0.5 font-mono text-[10px] text-fg-subtle"
										data-numeric
										title={describeAuditCode(i.code)}
									>
										{i.code}
										{#if i.codepoint > 0}
											· {labelFor(i.codepoint)}
										{/if}
									</div>
								</div>
								{#if FIXABLE_CODES.has(i.code)}
									<button
										type="button"
										onclick={() => fixIssue(i)}
										class="inline-flex items-center gap-1 rounded border border-accent/40 bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent-strong hover:border-accent hover:bg-accent/15"
										title="Apply automatic fix"
									>
										<Wand class="size-2.5" /> Fix
									</button>
								{/if}
								{#if i.codepoint > 0 && project.glyphs[i.codepoint]}
									<button
										type="button"
										onclick={() => jumpToGlyph(i.codepoint)}
										class="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-fg-muted hover:border-accent hover:text-accent"
										title="Open this glyph in the editor"
									>
										Open →
									</button>
								{/if}
							</li>
						{/each}
					</ul>
				</Panel>
			{/if}

			<Panel>
				<div class="mb-3 flex flex-wrap items-center gap-2">
					{#each [{ id: 'all', label: 'All', n: counts.all, color: 'text-fg' }, { id: 'error', label: 'Errors', n: counts.error, color: 'text-danger-strong' }, { id: 'warn', label: 'Warnings', n: counts.warn, color: 'text-warn-strong' }, { id: 'info', label: 'Hints', n: counts.info, color: 'text-accent-strong' }] as opt (opt.id)}
						<button
							type="button"
							onclick={() => (severityFilter = opt.id as AuditSeverity | 'all')}
							class="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors {severityFilter ===
							opt.id
								? 'border-accent bg-accent-soft text-accent-strong'
								: 'border-border bg-surface-2/40 hover:border-border-strong'}"
						>
							{opt.label}
							<span class="font-mono {opt.color}" data-numeric>{opt.n}</span>
						</button>
					{/each}
					{#if fixableInList.length > 0}
						<button
							type="button"
							onclick={fixAllVisible}
							class="inline-flex items-center gap-1 rounded-md border border-accent bg-accent text-accent-fg px-2.5 py-1 text-[11px] font-medium hover:bg-accent/90"
							title="Apply automatic fixes to every mechanically-fixable issue in the visible list"
						>
							<Wand class="size-3" /> Fix {fixableInList.length} applicable
						</button>
					{/if}
					<div class="ml-auto flex items-center gap-2">
						<div class="inline-flex rounded-md border border-border bg-surface p-0.5">
							<button
								type="button"
								onclick={() => (groupMode = 'code')}
								class="rounded px-2 py-0.5 text-[11px] {groupMode === 'code'
									? 'bg-accent-soft text-accent-strong'
									: 'text-fg-muted hover:text-fg'}"
								title="Group issues by check"
							>
								By check
							</button>
							<button
								type="button"
								onclick={() => (groupMode = 'glyph')}
								class="rounded px-2 py-0.5 text-[11px] {groupMode === 'glyph'
									? 'bg-accent-soft text-accent-strong'
									: 'text-fg-muted hover:text-fg'}"
								title="Group issues by glyph"
							>
								By glyph
							</button>
						</div>
						<div class="relative">
							<Search
								class="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-fg-subtle"
							/>
							<input
								bind:value={query}
								placeholder="Search message, code, hex, description…"
								class="w-64 rounded-md border border-border bg-surface px-3 py-1.5 pl-8 text-[12px] text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
							/>
						</div>
					</div>
				</div>

				{#if filtered.length === 0}
					<div class="rounded-lg border border-dashed border-success/40 bg-success/5 p-10 text-center">
						<CheckCircle2 class="mx-auto mb-2 size-6 text-success" />
						{#if counts.all === 0}
							<div class="text-[13px] font-medium text-success">All checks pass</div>
							<div class="mt-1 text-[12px] text-fg-muted">
								No errors, warnings, or hints reported on the current state.
							</div>
						{:else}
							<div class="text-[13px] font-medium text-fg">No issues match this filter.</div>
						{/if}
					</div>
				{:else if groupMode === 'code'}
					<div class="grid gap-4">
						{#each grouped as [code, issues] (code)}
							{@const desc = describeAuditCode(code)}
							<div>
								<div class="mb-1.5 flex items-baseline justify-between gap-2">
									<h3
										class="font-mono text-[11px] font-semibold text-fg"
										title={desc}
									>
										{code}
									</h3>
									<span class="text-[10px] font-mono text-fg-subtle" data-numeric>
										{issues.length} occurrence{issues.length === 1 ? '' : 's'}
									</span>
								</div>
								{#if desc}
									<!-- Inline help under each code heading. Designers learning
									     the craft don't need to leave the page to look up what
									     "self-intersecting" means. Curated dictionary lives
									     next to the audit module so they can't drift apart. -->
									<p class="mb-1.5 text-[11px] leading-snug text-fg-subtle">{desc}</p>
								{/if}
								<ul class="grid gap-1">
									{#each issues as i (`${i.codepoint}:${i.code}:${i.message}`)}
										<li
											class="flex items-start gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2"
										>
											<span class="mt-0.5">
												{#if i.severity === 'error'}
													<AlertCircle class="size-3.5 text-danger" />
												{:else if i.severity === 'warn'}
													<AlertTriangle class="size-3.5 text-warn" />
												{:else}
													<Info class="size-3.5 text-accent" />
												{/if}
											</span>
											<div class="min-w-0 flex-1">
												<div class="text-[12px] text-fg" title={describeAuditCode(i.code)}>
													{i.message}
												</div>
											</div>
											{#if FIXABLE_CODES.has(i.code)}
												<button
													type="button"
													onclick={() => fixIssue(i)}
													class="inline-flex items-center gap-1 rounded border border-accent/40 bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent-strong hover:border-accent hover:bg-accent/15"
													title="Apply automatic fix"
												>
													<Wand class="size-2.5" /> Fix
												</button>
											{/if}
											{#if i.codepoint > 0 && project.glyphs[i.codepoint]}
												<button
													type="button"
													onclick={() => jumpToGlyph(i.codepoint)}
													class="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-fg-muted hover:border-accent hover:text-accent"
													title="Open this glyph in the editor"
												>
													{labelFor(i.codepoint)} →
												</button>
											{:else}
												<span class="text-[10px] text-fg-subtle">{labelFor(i.codepoint)}</span>
											{/if}
										</li>
									{/each}
								</ul>
							</div>
						{/each}
					</div>
				{:else}
					<div class="grid gap-4">
						{#each groupedByGlyph as [cp, issues] (cp)}
							<div>
								<div class="mb-1.5 flex items-baseline justify-between gap-2">
									<h3 class="text-[12px] font-semibold text-fg">
										{#if cp === 0}
											Project-level
										{:else if project.glyphs[cp]}
											<button
												type="button"
												onclick={() => jumpToGlyph(cp)}
												class="font-mono text-fg hover:text-accent"
												title="Open this glyph in the editor"
											>
												{labelFor(cp)}
												<span class="text-fg-subtle" data-numeric>
													· U+{cp.toString(16).toUpperCase().padStart(4, '0')}
												</span>
											</button>
										{:else}
											<span class="font-mono">{labelFor(cp)}</span>
										{/if}
									</h3>
									<span class="text-[10px] font-mono text-fg-subtle" data-numeric>
										{issues.length} issue{issues.length === 1 ? '' : 's'}
									</span>
								</div>
								<ul class="grid gap-1">
									{#each issues as i (`${i.code}:${i.message}`)}
										<li
											class="flex items-start gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2"
										>
											<span class="mt-0.5">
												{#if i.severity === 'error'}
													<AlertCircle class="size-3.5 text-danger" />
												{:else if i.severity === 'warn'}
													<AlertTriangle class="size-3.5 text-warn" />
												{:else}
													<Info class="size-3.5 text-accent" />
												{/if}
											</span>
											<div class="min-w-0 flex-1">
												<div class="text-[12px] text-fg" title={describeAuditCode(i.code)}>
													{i.message}
												</div>
												<div
													class="mt-0.5 font-mono text-[10px] text-fg-subtle"
													title={describeAuditCode(i.code)}
												>
													{i.code}
												</div>
											</div>
											{#if FIXABLE_CODES.has(i.code)}
												<button
													type="button"
													onclick={() => fixIssue(i)}
													class="inline-flex items-center gap-1 rounded border border-accent/40 bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent-strong hover:border-accent hover:bg-accent/15"
													title="Apply automatic fix"
												>
													<Wand class="size-2.5" /> Fix
												</button>
											{/if}
										</li>
									{/each}
								</ul>
							</div>
						{/each}
					</div>
				{/if}
			</Panel>
		</div>
	</div>
{/if}
