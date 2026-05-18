<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { previewStore } from '$lib/stores/preview.svelte';
	import { preflightProject } from '$lib/font/audit';
	import { computeBlockCoverage } from '$lib/font/unicode-blocks';
	import Sparkline from '$lib/ui/Sparkline.svelte';
	import GlyphStatusHeatmap from '$lib/ui/GlyphStatusHeatmap.svelte';
	import X from '@lucide/svelte/icons/x';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import Info from '@lucide/svelte/icons/info';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';

	type Props = { open: boolean; onclose: () => void };
	let { open, onclose }: Props = $props();

	const project = $derived(projectStore.project);

	const drawn = $derived(
		project
			? Object.values(project.glyphs).filter((g) => g.contours.length > 0).length
			: 0
	);
	const total = $derived(project ? Object.keys(project.glyphs).length : 0);
	const drawnPct = $derived(total > 0 ? Math.round((drawn / total) * 100) : 0);

	const auditCounts = $derived.by(() => {
		if (!project) return { error: 0, warn: 0, info: 0 };
		const issues = preflightProject(project);
		return {
			error: issues.filter((i) => i.severity === 'error').length,
			warn: issues.filter((i) => i.severity === 'warn').length,
			info: issues.filter((i) => i.severity === 'info').length
		};
	});

	const composites = $derived(
		project
			? Object.values(project.glyphs).filter(
					(g) => (g.components?.length ?? 0) > 0
				).length
			: 0
	);

	const anchorsTotal = $derived(
		project
			? Object.values(project.glyphs).reduce((n, g) => n + (g.anchors?.length ?? 0), 0)
			: 0
	);

	const pinnedCount = $derived(
		project ? Object.values(project.glyphs).filter((g) => g.pinned).length : 0
	);

	const notesCount = $derived(
		project ? Object.values(project.glyphs).filter((g) => g.notes?.trim()).length : 0
	);

	const flaggedCount = $derived(
		project ? Object.values(project.glyphs).filter((g) => g.flagged).length : 0
	);
	const firstFlaggedCp = $derived(
		project
			? Object.values(project.glyphs).find((g) => g.flagged)?.codepoint
			: undefined
	);
	const jumpToFirstFlagged = () => {
		if (firstFlaggedCp) projectStore.selectGlyph(firstFlaggedCp);
		onclose();
	};

	const editsToday = $derived.by(() => {
		if (!project) return 0;
		const dayAgo = Date.now() - 24 * 3600 * 1000;
		return Object.values(project.glyphs).filter((g) => {
			const t = Date.parse(g.updatedAt);
			return Number.isFinite(t) && t >= dayAgo;
		}).length;
	});

	const editsThisWeek = $derived.by(() => {
		if (!project) return 0;
		const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
		return Object.values(project.glyphs).filter((g) => {
			const t = Date.parse(g.updatedAt);
			return Number.isFinite(t) && t >= weekAgo;
		}).length;
	});

	const editsByDay = $derived.by(() => {
		if (!project) return new Array<number>(14).fill(0);
		const DAY_MS = 24 * 3600 * 1000;
		const todayMid = new Date();
		todayMid.setHours(0, 0, 0, 0);
		const todayMidMs = todayMid.getTime();
		const buckets = new Array<number>(14).fill(0);
		for (const g of Object.values(project.glyphs)) {
			const t = Date.parse(g.updatedAt);
			if (!Number.isFinite(t)) continue;
			const dayOffset = Math.floor((todayMidMs - t) / DAY_MS);
			if (dayOffset >= 0 && dayOffset < 14) buckets[13 - dayOffset]++;
		}
		return buckets;
	});

	const editsByDayTotal = $derived(editsByDay.reduce((a, b) => a + b, 0));

	const recentEdits = $derived.by(() => {
		if (!project) return [];
		const dayAgo = Date.now() - 24 * 3600 * 1000;
		return Object.values(project.glyphs)
			.filter((g) => {
				const t = Date.parse(g.updatedAt);
				return Number.isFinite(t) && t >= dayAgo;
			})
			.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
			.slice(0, 8);
	});

	const jumpToGlyph = (cp: number) => {
		projectStore.selectGlyph(cp);
		onclose();
	};

	const currentTags = $derived(project?.tags ?? []);
	const suggestedTags = $derived.by(() => {
		if (!project) return [];
		const set = new Set<string>();
		const useCases = project.brief?.useCases ?? [];
		if (useCases.includes('body-text')) set.add('body');
		if (useCases.includes('display')) set.add('display');
		if (useCases.includes('code')) set.add('mono');
		if (useCases.includes('web-ui')) set.add('ui');
		if (useCases.includes('editorial')) set.add('editorial');
		if (useCases.includes('branding')) set.add('branding');
		if (useCases.includes('print')) set.add('print');
		const family = project.metadata.familyName.toLowerCase();
		if (/serif/.test(family)) set.add('serif');
		if (/sans/.test(family)) set.add('sans');
		if (/mono/.test(family)) set.add('mono');
		if (/script/.test(family)) set.add('script');
		return [...set].filter((t) => !currentTags.includes(t));
	});

	const blockCoverage = $derived(
		project ? computeBlockCoverage(project.glyphs) : []
	);

	const projectFileSizeKb = $derived.by(() => {
		if (!project) return 0;
		try {
			// JSON.stringify works on the $state proxy without unwrapping for this size estimate.
			return JSON.stringify(project).length / 1024;
		} catch {
			return 0;
		}
	});

	const briefCompleteness = $derived.by(() => {
		if (!project) return { filled: 0, total: 6, pct: 0 };
		const b = project.brief ?? {};
		const checks = [
			!!b.intent?.trim(),
			!!b.audience?.trim(),
			(b.useCases?.length ?? 0) > 0,
			!!b.readingConditions?.trim(),
			!!b.differentiation?.trim(),
			(b.references?.length ?? 0) > 0
		];
		const filled = checks.filter(Boolean).length;
		return { filled, total: checks.length, pct: Math.round((filled / checks.length) * 100) };
	});
</script>

{#if open && project}
	<button
		type="button"
		class="fixed inset-0 z-30 cursor-default"
		onclick={onclose}
		aria-label="Close stats"
		tabindex="-1"
	></button>
	<div
		role="dialog"
		aria-modal="false"
		aria-label="Project stats"
		class="absolute right-2 top-full z-40 mt-1.5 w-80 rounded-lg border border-border bg-surface shadow-xl"
	>
		<div class="flex items-center justify-between border-b border-border px-4 py-2.5">
			<h2 class="text-[12px] font-semibold tracking-wide text-fg">{project.metadata.familyName}</h2>
			<button
				type="button"
				onclick={onclose}
				class="rounded p-0.5 text-fg-subtle hover:bg-surface-2 hover:text-fg"
				aria-label="Close"
			>
				<X class="size-3.5" />
			</button>
		</div>

		<div class="grid gap-3 p-4">
			<div>
				<div class="flex items-baseline justify-between text-[11px]" data-numeric>
					<span class="font-medium text-fg-muted">Coverage</span>
					<span class="font-mono text-fg">{drawn} / {total} drawn · {drawnPct}%</span>
				</div>
				<div class="mt-1 h-1 overflow-hidden rounded-full bg-surface-2">
					<div
						class="h-full bg-accent transition-all duration-500"
						style="width: {drawnPct}%;"
					></div>
				</div>
			</div>

			{#if editsByDayTotal > 0}
				<div>
					<div class="flex items-baseline justify-between text-[11px]" data-numeric>
						<span class="font-medium text-fg-muted">Edits, last 14 days</span>
						<span class="font-mono text-fg">{editsByDayTotal} total</span>
					</div>
					<div class="mt-1">
						<Sparkline values={editsByDay} width={272} height={28} label="Edits per day, last 14 days" />
					</div>
				</div>
			{/if}

			<div>
				<div class="mb-1 flex items-baseline justify-between text-[11px]">
					<span class="font-medium text-fg-muted">Status map</span>
					<span
						class="flex items-center gap-2 font-mono text-[10px] text-fg-subtle"
						data-numeric
					>
						<span class="inline-flex items-center gap-1">
							<span class="size-1.5 rounded-full bg-success"></span>final
						</span>
						<span class="inline-flex items-center gap-1">
							<span class="size-1.5 rounded-full bg-accent"></span>draft
						</span>
						<span class="inline-flex items-center gap-1">
							<span class="size-1.5 rounded-full bg-warn"></span>sketch
						</span>
					</span>
				</div>
				<GlyphStatusHeatmap
					glyphs={Object.values(project.glyphs)}
					cols={32}
					cellSize={8}
					onpick={(cp) => {
						projectStore.selectGlyph(cp);
						onclose();
					}}
				/>
			</div>

			{#if blockCoverage.length > 0}
				<div>
					<div class="mb-1 flex items-baseline justify-between text-[11px]">
						<span class="font-medium text-fg-muted">Coverage by Unicode block</span>
						<span class="font-mono text-[10px] text-fg-subtle" data-numeric>
							{blockCoverage.length} blocks
						</span>
					</div>
					<ul class="grid gap-1">
						{#each blockCoverage as c (c.block.name)}
							{@const pct = c.defined > 0 ? Math.round((c.drawn / c.defined) * 100) : 0}
							<li>
								<div
									class="flex items-baseline justify-between gap-2 text-[11px]"
									data-numeric
								>
									<span class="min-w-0 truncate text-fg-muted">{c.block.name}</span>
									<span class="font-mono text-fg-subtle">
										{c.drawn}/{c.defined}
										{#if c.defined < c.total}
											<span class="opacity-50">· {c.total - c.defined} not in project</span>
										{/if}
									</span>
								</div>
								<div class="mt-0.5 h-1 overflow-hidden rounded-full bg-surface-2">
									<div
										class="h-full {pct === 100 ? 'bg-success' : pct >= 50 ? 'bg-accent' : 'bg-warn'}"
										style="width: {pct}%;"
									></div>
								</div>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if recentEdits.length > 0}
				<div>
					<div class="mb-1 text-[11px] font-medium text-fg-muted">Edited today</div>
					<div class="flex flex-wrap gap-1">
						{#each recentEdits as g (g.codepoint)}
							<a
								href="/project/{project.id}/edit"
								onclick={() => jumpToGlyph(g.codepoint)}
								class="inline-flex items-center gap-1 rounded bg-surface-2/60 px-1.5 py-0.5 font-mono text-[10px] text-fg hover:bg-surface-2"
								data-numeric
								title="{g.name} · U+{g.codepoint.toString(16).toUpperCase().padStart(4, '0')}"
							>
								<span>
									{#if g.codepoint > 0x20 && g.codepoint < 0x10000}
										{String.fromCodePoint(g.codepoint)}
									{:else}
										{g.name}
									{/if}
								</span>
								<span class="text-fg-subtle">
									{g.codepoint.toString(16).toUpperCase().padStart(4, '0')}
								</span>
							</a>
						{/each}
					</div>
				</div>
			{/if}

			<div>
				<label
					class="block text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"
					for="proj-tags"
				>
					Tags
				</label>
				<div class="mt-1 flex flex-wrap items-center gap-1">
					{#each currentTags as t (t)}
						<span
							class="inline-flex items-center gap-0.5 rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent"
						>
							{t}
							<button
								type="button"
								onclick={() => {
									projectStore.updateTags(currentTags.filter((x) => x !== t));
								}}
								class="rounded-full p-0.5 hover:bg-accent/15"
								aria-label="Remove tag {t}"
							>
								<X class="size-2.5" />
							</button>
						</span>
					{/each}
					<input
						id="proj-tags"
						type="text"
						placeholder="Add tag…"
						class="min-w-[80px] flex-1 border-0 bg-transparent text-[11px] text-fg outline-none placeholder:text-fg-subtle"
						onkeydown={(e) => {
							if (e.key !== 'Enter' && e.key !== ',') return;
							e.preventDefault();
							const val = e.currentTarget.value.trim();
							if (!val) return;
							projectStore.updateTags([...currentTags, val]);
							e.currentTarget.value = '';
						}}
					/>
				</div>
				{#if suggestedTags.length > 0}
					<div class="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
						<span class="text-fg-subtle">Suggested:</span>
						{#each suggestedTags as s (s)}
							<button
								type="button"
								onclick={() => projectStore.updateTags([...currentTags, s])}
								class="rounded-full border border-dashed border-border px-1.5 py-0.5 text-fg-muted hover:border-accent hover:text-accent"
							>
								+ {s}
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<div>
				<label
					class="block text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"
					for="proj-desc"
				>
					Description
				</label>
				<textarea
					id="proj-desc"
					value={project.description ?? ''}
					oninput={(e) => projectStore.updateDescription(e.currentTarget.value)}
					placeholder="Project brief, goals, references…"
					rows="2"
					class="mt-1 block w-full resize-y rounded-md border border-border bg-surface-2/40 px-2 py-1.5 text-[12px] text-fg outline-none focus:border-accent focus:bg-surface"
				></textarea>
			</div>

			<dl class="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
				<dt class="text-fg-muted">Composites</dt>
				<dd class="text-right font-mono text-fg" data-numeric>{composites}</dd>
				<dt class="text-fg-muted">Anchors total</dt>
				<dd class="text-right font-mono text-fg" data-numeric>{anchorsTotal}</dd>
				<dt class="text-fg-muted">Kerning pairs</dt>
				<dd class="text-right font-mono text-fg" data-numeric>{project.kerning.length}</dd>
				<dt class="text-fg-muted">Kerning classes</dt>
				<dd class="text-right font-mono text-fg" data-numeric>{project.classes?.length ?? 0}</dd>
				<dt class="text-fg-muted">Masters</dt>
				<dd class="text-right font-mono text-fg" data-numeric>{1 + (project.masters?.length ?? 0)}</dd>
				<dt class="text-fg-muted">Axes</dt>
				<dd class="text-right font-mono text-fg" data-numeric>{project.axes?.length ?? 0}</dd>
				<dt class="text-fg-muted">Instances</dt>
				<dd class="text-right font-mono text-fg" data-numeric>{project.instances?.length ?? 0}</dd>
				<dt class="text-fg-muted">Pinned</dt>
				<dd class="text-right font-mono text-fg" data-numeric>{pinnedCount}</dd>
				<dt class="text-fg-muted">With notes</dt>
				<dd class="text-right font-mono text-fg" data-numeric>{notesCount}</dd>
				<dt class="text-fg-muted">Decisions logged</dt>
				<dd class="text-right font-mono text-fg" data-numeric>
					{project.decisions?.length ?? 0}
				</dd>
				<dt class="text-fg-muted">Edited today</dt>
				<dd class="text-right font-mono text-fg" data-numeric>{editsToday}</dd>
				<dt class="text-fg-muted">Edited this week</dt>
				<dd class="text-right font-mono text-fg" data-numeric>{editsThisWeek}</dd>
				<dt class="text-fg-muted">Flagged</dt>
				<dd class="text-right font-mono text-fg" data-numeric>
					{#if flaggedCount > 0}
						<a
							href="/project/{project.id}/edit"
							onclick={jumpToFirstFlagged}
							class="text-warn hover:underline"
							title="Jump to the first flagged glyph"
						>
							{flaggedCount} →
						</a>
					{:else}
						{flaggedCount}
					{/if}
				</dd>
				<dt class="text-fg-muted">Last build</dt>
				<dd class="text-right font-mono text-fg" data-numeric>
					{previewStore.sizeKb.toFixed(1)} KB · {previewStore.lastBuildMs.toFixed(0)}ms
				</dd>
				<dt class="text-fg-muted">Project file</dt>
				<dd class="text-right font-mono text-fg" data-numeric>
					{projectFileSizeKb.toFixed(1)} KB JSON
				</dd>
			</dl>

			<div class="border-t border-border pt-3">
				<a
					href="/project/{project.id}/brief"
					onclick={onclose}
					class="block rounded-md border border-border bg-surface-2/40 px-2 py-1.5 hover:border-accent"
				>
					<div class="flex items-baseline justify-between text-[11px]">
						<span class="font-medium text-fg-muted">Brief completeness</span>
						<span class="font-mono text-fg" data-numeric>
							{briefCompleteness.filled}/{briefCompleteness.total} · {briefCompleteness.pct}%
						</span>
					</div>
					<div class="mt-1 h-1 overflow-hidden rounded-full bg-surface-2">
						<div
							class="h-full bg-accent transition-all duration-500"
							style="width: {briefCompleteness.pct}%;"
						></div>
					</div>
				</a>
			</div>

			<div class="border-t border-border pt-3">
				<div class="mb-1.5 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					Pre-flight
				</div>
				{#if auditCounts.error === 0 && auditCounts.warn === 0 && auditCounts.info === 0}
					<div class="inline-flex items-center gap-1.5 rounded-md bg-success/10 px-2 py-1 text-[11px] font-medium text-success">
						<CheckCircle2 class="size-3" /> All checks pass
					</div>
				{:else}
					<div class="flex flex-wrap gap-1.5">
						{#if auditCounts.error > 0}
							<span class="inline-flex items-center gap-1 rounded-md bg-danger/10 px-2 py-1 text-[11px] font-medium text-danger">
								<AlertCircle class="size-3" /> {auditCounts.error} error{auditCounts.error === 1 ? '' : 's'}
							</span>
						{/if}
						{#if auditCounts.warn > 0}
							<span class="inline-flex items-center gap-1 rounded-md bg-warn/10 px-2 py-1 text-[11px] font-medium text-warn">
								<AlertTriangle class="size-3" /> {auditCounts.warn} warning{auditCounts.warn === 1 ? '' : 's'}
							</span>
						{/if}
						{#if auditCounts.info > 0}
							<span class="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-1 text-[11px] font-medium text-accent">
								<Info class="size-3" /> {auditCounts.info} hint{auditCounts.info === 1 ? '' : 's'}
							</span>
						{/if}
					</div>
					<a
						href="/project/{project.id}/export"
						onclick={onclose}
						class="mt-2 inline-block text-[11px] text-accent hover:underline"
					>
						See details on Export →
					</a>
				{/if}
			</div>
		</div>
	</div>
{/if}
