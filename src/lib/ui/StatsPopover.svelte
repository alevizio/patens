<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { previewStore } from '$lib/stores/preview.svelte';
	import { preflightProject } from '$lib/font/audit';
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
				<dt class="text-fg-muted">Last build</dt>
				<dd class="text-right font-mono text-fg" data-numeric>
					{previewStore.sizeKb.toFixed(1)} KB · {previewStore.lastBuildMs.toFixed(0)}ms
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
