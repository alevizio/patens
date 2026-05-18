<script lang="ts">
	import { goto } from '$app/navigation';
	import { projectStore } from '$lib/stores/project.svelte';
	import {
		auditProject,
		preflightProject,
		auditCompatibility,
		sortBySeverity,
		type AuditIssue,
		type AuditSeverity
	} from '$lib/font/audit';
	import Panel from '$lib/ui/Panel.svelte';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import Info from '@lucide/svelte/icons/info';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import Search from '@lucide/svelte/icons/search';
	import ListChecks from '@lucide/svelte/icons/list-checks';

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

	let query = $state('');
	let severityFilter = $state<AuditSeverity | 'all'>('all');

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		return allIssues.filter((i) => {
			if (severityFilter !== 'all' && i.severity !== severityFilter) return false;
			if (!q) return true;
			return (
				i.message.toLowerCase().includes(q) ||
				i.code.toLowerCase().includes(q) ||
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

	const grouped = $derived.by(() => {
		const map = new Map<string, AuditIssue[]>();
		for (const i of filtered) {
			const list = map.get(i.code) ?? [];
			list.push(i);
			map.set(i.code, list);
		}
		return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
	});

	const jumpToGlyph = (cp: number) => {
		if (!project || cp === 0 || !project.glyphs[cp]) return;
		projectStore.selectGlyph(cp);
		goto(`/project/${project.id}/edit`);
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
	<div class="flex h-full items-center justify-center text-fg-muted">Loading…</div>
{:else}
	<div class="h-full overflow-auto">
		<div class="mx-auto flex max-w-5xl flex-col gap-6 p-6">
			<header class="flex items-start gap-3">
				<div class="mt-1 flex size-9 items-center justify-center rounded-md bg-accent-soft text-accent">
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

			<Panel>
				<div class="mb-3 flex flex-wrap items-center gap-2">
					{#each [{ id: 'all', label: 'All', n: counts.all, color: 'text-fg' }, { id: 'error', label: 'Errors', n: counts.error, color: 'text-danger' }, { id: 'warn', label: 'Warnings', n: counts.warn, color: 'text-warn' }, { id: 'info', label: 'Hints', n: counts.info, color: 'text-accent' }] as opt (opt.id)}
						<button
							type="button"
							onclick={() => (severityFilter = opt.id as AuditSeverity | 'all')}
							class="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors {severityFilter ===
							opt.id
								? 'border-accent bg-accent-soft text-accent'
								: 'border-border bg-surface-2/40 hover:border-border-strong'}"
						>
							{opt.label}
							<span class="font-mono {opt.color}" data-numeric>{opt.n}</span>
						</button>
					{/each}
					<div class="ml-auto relative">
						<Search
							class="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-fg-subtle"
						/>
						<input
							bind:value={query}
							placeholder="Search by message, code, hex…"
							class="w-64 rounded-md border border-border bg-surface px-3 py-1.5 pl-8 text-[12px] text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
						/>
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
				{:else}
					<div class="grid gap-4">
						{#each grouped as [code, issues] (code)}
							<div>
								<div class="mb-1.5 flex items-baseline justify-between gap-2">
									<h3 class="font-mono text-[11px] font-semibold text-fg">
										{code}
									</h3>
									<span class="text-[10px] font-mono text-fg-subtle" data-numeric>
										{issues.length} occurrence{issues.length === 1 ? '' : 's'}
									</span>
								</div>
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
												<div class="text-[12px] text-fg">{i.message}</div>
											</div>
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
				{/if}
			</Panel>
		</div>
	</div>
{/if}
