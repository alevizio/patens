<script lang="ts">
	// Per-glyph audit panel — issue list with "See all in audit page"
	// deep-links and an inline "Fix" button for the 11 auto-fixable
	// codes. The fixable code set must stay in sync with the parent's
	// fixIssue() handler; keeping it inline (vs importing a FIXABLE_CODES
	// constant) avoids a circular dep through the audit module.
	import Accordion from '$lib/ui/Accordion.svelte';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import Wand from '@lucide/svelte/icons/wand-2';
	import { describeAuditCode, type AuditIssue } from '$lib/font/audit';

	type Props = {
		issues: AuditIssue[];
		projectId: string;
		onfix: (code: string) => void;
	};
	let { issues, projectId, onfix }: Props = $props();

	const isFixable = (code: string) =>
		code === 'self-intersecting' ||
		code === 'duplicate-points' ||
		code === 'near-collinear-points' ||
		code === 'contour-winding-collision' ||
		code === 'off-grid-points' ||
		code === 'open-contour' ||
		code === 'zero-advance' ||
		code === 'overflows-advance' ||
		code === 'anchor-naming-mark-no-prefix' ||
		code === 'anchor-naming-base-with-prefix' ||
		code === 'tiny-contour';
</script>

<Accordion id="edit-audit" label="Audit" defaultOpen={issues.length > 0}>
	{#snippet badge()}
		{#if issues.length > 0}
			<span
				class="rounded px-1.5 py-0.5 font-mono text-[10px] {issues[0].severity ===
				'error'
					? 'bg-danger/15 text-danger-strong'
					: issues[0].severity === 'warn'
						? 'bg-warn/15 text-warn-strong'
						: 'bg-surface-2 text-fg-muted'}"
				data-numeric
			>
				{issues.length}
			</span>
		{:else}
			<span
				class="rounded bg-success/15 px-1.5 py-0.5 font-mono text-[10px] text-success-strong"
			>
				ok
			</span>
		{/if}
	{/snippet}
	{#if issues.length === 0}
		<div
			class="flex items-center gap-2 rounded-md bg-success/10 px-2.5 py-2 text-[12px] text-success-strong"
		>
			<CheckCircle2 class="size-3.5" />
			No issues
		</div>
	{:else}
		<ul class="grid gap-1">
			<!-- Key must include the index: the audit legitimately emits the same
			     code more than once per glyph (e.g. one master-point-count issue
			     per mismatching contour), and duplicate keys crash Svelte. -->
			{#each issues as issue, i (issue.code + ':' + i)}
				<li
					class="flex items-start gap-2 rounded-md px-2.5 py-1.5 text-[11px] {issue.severity ===
					'error'
						? 'bg-danger/10 text-danger-strong'
						: issue.severity === 'warn'
							? 'bg-warn/10 text-warn-strong'
							: 'bg-surface-2 text-fg-muted'}"
				>
					<AlertCircle class="mt-0.5 size-3 shrink-0" />
					<span class="flex-1" title={describeAuditCode(issue.code)}>
						{issue.message}
					</span>
					<a
						href="/project/{projectId}/audit?code={encodeURIComponent(issue.code)}"
						class="shrink-0 rounded border border-current/30 bg-canvas/50 px-1.5 py-0.5 text-[10px] font-medium transition-colors hover:bg-canvas/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/40"
						title="See all glyphs with this audit code"
					>
						All
					</a>
					{#if isFixable(issue.code)}
						<button
							type="button"
							onclick={() => onfix(issue.code)}
							class="inline-flex shrink-0 items-center gap-1 rounded border border-accent bg-accent-soft px-2 py-1 text-[11px] font-medium text-accent-strong transition-all duration-100 ease-out hover:bg-accent/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
							title="Apply automatic fix for this issue"
						>
							<Wand class="size-3" /> Fix
						</button>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</Accordion>
