<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { USE_CASE_LABELS, type UseCase } from '$lib/font/types';
	import Panel from '$lib/ui/Panel.svelte';
	import Field from '$lib/ui/Field.svelte';
	import LoadingPanel from '$lib/ui/LoadingPanel.svelte';
	import Input from '$lib/ui/Input.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import FileText from '@lucide/svelte/icons/file-text';

	const project = $derived(projectStore.project);
	const brief = $derived(project?.brief ?? {});
	const selectedUseCases = $derived(brief.useCases ?? []);

	const toggleUseCase = (uc: UseCase) => {
		const next = selectedUseCases.includes(uc)
			? selectedUseCases.filter((c) => c !== uc)
			: [...selectedUseCases, uc];
		projectStore.updateBrief({ useCases: next });
	};

	const countWords = (s: string | undefined): number => {
		const trimmed = (s ?? '').trim();
		if (!trimmed) return 0;
		return trimmed.split(/\s+/).length;
	};

	let newRefName = $state('');
	let newRefUrl = $state('');
	let newRefKind = $state<'functional' | 'historical' | 'competitive'>('competitive');
	let newRefNotes = $state('');
	const addReference = (e: Event) => {
		e.preventDefault();
		if (!newRefName.trim()) return;
		projectStore.addBriefReference({
			name: newRefName.trim(),
			url: newRefUrl.trim() || undefined,
			kind: newRefKind,
			notes: newRefNotes.trim() || undefined
		});
		toast.success(`Added reference "${newRefName.trim()}"`);
		newRefName = '';
		newRefUrl = '';
		newRefNotes = '';
	};

	const KIND_LABELS = {
		functional: 'Functional',
		historical: 'Historical',
		competitive: 'Competitive'
	};
	const KIND_COLORS = {
		functional: 'bg-success/15 text-success',
		historical: 'bg-warn/15 text-warn',
		competitive: 'bg-accent/15 text-accent'
	};

	const COMMON_REFS: Array<{
		name: string;
		url: string;
		kind: 'functional' | 'historical' | 'competitive';
		notes: string;
	}> = [
		{
			name: 'Inter',
			url: 'https://rsms.me/inter/',
			kind: 'competitive',
			notes: 'Reference UI sans — high x-height, generous apertures.'
		},
		{
			name: 'IBM Plex Sans',
			url: 'https://www.ibm.com/plex/',
			kind: 'competitive',
			notes: 'System-style with distinctive humanist details.'
		},
		{
			name: 'Source Serif',
			url: 'https://github.com/adobe-fonts/source-serif',
			kind: 'competitive',
			notes: 'Open-source workhorse serif from Adobe.'
		},
		{
			name: 'JetBrains Mono',
			url: 'https://www.jetbrains.com/lp/mono/',
			kind: 'competitive',
			notes: 'Reference mono — tall lowercase, ligature-friendly.'
		},
		{
			name: 'Recursive',
			url: 'https://www.recursive.design/',
			kind: 'competitive',
			notes: 'Variable, casual/proportional axes — modern range example.'
		}
	];

	const addCommonRef = (preset: (typeof COMMON_REFS)[number]) => {
		const exists = (brief.references ?? []).some(
			(r) => r.name.toLowerCase() === preset.name.toLowerCase()
		);
		if (exists) {
			toast.success(`"${preset.name}" already in references.`);
			return;
		}
		projectStore.addBriefReference(preset);
		toast.success(`Added "${preset.name}"`);
	};

	// Foundry-style essay opening templates (KLIM / Hoefler / Commercial Type cadence).
	const ESSAY_OPENINGS = $derived.by<Array<{ label: string; text: string }>>(() => {
		const family = project?.metadata.familyName ?? 'This typeface';
		const familyAlt = project?.metadata.familyName ?? 'This family';
		return [
			{
				label: 'Reference-as-argument (KLIM cadence)',
				text: `${family} began as a memory of [reference], framed through the practical reality of [adjacent reference]. Where [reference] is [observation], we wanted [intentional departure]. The result reads as [intended tone] without losing [intended craft quality].`
			},
			{
				label: 'Optical-size logic (Hoefler cadence)',
				text: `${familyAlt} exists because one outline does not survive both small-text reading and large-display setting. At caption sizes the counters open and the joins soften; at display sizes the proportions tighten and the terminals sharpen. The middle weights are tuned for the sizes most copy actually runs at.`
			},
			{
				label: 'Editorial workhorse (Commercial Type cadence)',
				text: `${family} is deliberately plain. Its goal is to carry [editorial context] without calling attention to itself — the kind of face you stop noticing on the second page. Every choice was made in service of [reading condition]; the personality lives in [specific micro-detail], not in any single dramatic gesture.`
			}
		];
	});
	const insertEssayOpening = (text: string) => {
		const current = (brief.designNotes ?? '').trim();
		const next = current ? `${current}\n\n${text}` : text;
		projectStore.updateBrief({ designNotes: next });
	};

	// Decision log — captures non-version-scoped design decisions as they happen
	let newDecisionTitle = $state('');
	let newDecisionRationale = $state('');
	const submitDecision = (e: Event) => {
		e.preventDefault();
		if (!newDecisionTitle.trim() || !newDecisionRationale.trim()) return;
		projectStore.addDecision({
			decision: newDecisionTitle,
			rationale: newDecisionRationale
		});
		toast.success('Logged decision.');
		newDecisionTitle = '';
		newDecisionRationale = '';
	};
	const formatDecisionDate = (iso: string) => {
		const d = new Date(iso);
		if (!Number.isFinite(d.getTime())) return iso;
		return d.toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	};
</script>

{#if !project}
	<LoadingPanel label="Loading brief" />
{:else}
	<div class="h-full overflow-auto">
		<div class="mx-auto flex max-w-5xl flex-col gap-6 p-6">
			<header class="flex items-start gap-3">
				<div class="mt-1 flex size-9 items-center justify-center rounded-md bg-accent-soft text-accent">
					<FileText class="size-4" />
				</div>
				<div>
					<h1 class="text-xl font-semibold tracking-tight">Brief</h1>
					<p class="text-sm text-fg-muted">
						Type design is system design. Defining the problem before drawing keeps
						scope, audience, and use cases honest as the family grows.
					</p>
				</div>
			</header>

			<Panel>
				<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					Intent
				</h2>
				<Field
					label="What is this typeface for?"
					hint="One sentence is enough. What problem does it solve, what voice does it carry?"
				>
					<textarea
						value={brief.intent ?? ''}
						oninput={(e) => projectStore.updateBrief({ intent: e.currentTarget.value })}
						placeholder="e.g., A sturdy contemporary geometric sans for product UI at 12–32px, optimised for small data tables and dashboards."
						rows="3"
						class="block w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
					></textarea>
					<div class="text-right font-mono text-[10px] text-fg-subtle" data-numeric>
						{countWords(brief.intent)} words · {(brief.intent ?? '').length} chars
					</div>
				</Field>

				<Field
					label="Audience / typical user"
					hint="Designers? Engineers? Newspaper readers? Drives a lot of downstream decisions."
				>
					<textarea
						value={brief.audience ?? ''}
						oninput={(e) => projectStore.updateBrief({ audience: e.currentTarget.value })}
						placeholder="e.g., Product designers and engineers building B2B SaaS dashboards."
						rows="2"
						class="block w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
					></textarea>
					<div class="text-right font-mono text-[10px] text-fg-subtle" data-numeric>
						{countWords(brief.audience)} words · {(brief.audience ?? '').length} chars
					</div>
				</Field>

				<Field
					label="Reading conditions"
					hint="Sizes, distances, screens vs. print, foreground/background contrast."
				>
					<textarea
						value={brief.readingConditions ?? ''}
						oninput={(e) =>
							projectStore.updateBrief({ readingConditions: e.currentTarget.value })}
						placeholder="e.g., 12–16px on 1× and 2× displays; mostly dark mode; long sessions; no large display use."
						rows="2"
						class="block w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
					></textarea>
					<div class="text-right font-mono text-[10px] text-fg-subtle" data-numeric>
						{countWords(brief.readingConditions)} words · {(brief.readingConditions ?? '').length} chars
					</div>
				</Field>
			</Panel>

			<Panel>
				<h2 class="mb-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					Use cases
				</h2>
				<p class="mb-3 text-[12px] text-fg-subtle">
					Tag every context this family must serve. Affects axis choices, feature set,
					hinting effort, and naming.
				</p>
				<div class="flex flex-wrap gap-1.5">
					{#each Object.entries(USE_CASE_LABELS) as [uc, label] (uc)}
						{@const active = selectedUseCases.includes(uc as UseCase)}
						<button
							type="button"
							onclick={() => toggleUseCase(uc as UseCase)}
							class="rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors {active
								? 'border-accent bg-accent-soft text-accent'
								: 'border-border bg-surface-2/40 text-fg-muted hover:border-border-strong hover:text-fg'}"
						>
							{label}
						</button>
					{/each}
				</div>
			</Panel>

			<Panel>
				<h2 class="mb-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					Differentiation
				</h2>
				<Field
					label="What's the angle vs comparable families?"
					hint="If you could only state one design decision a competitor wouldn't make, what is it?"
				>
					<textarea
						value={brief.differentiation ?? ''}
						oninput={(e) =>
							projectStore.updateBrief({ differentiation: e.currentTarget.value })}
						placeholder="e.g., Slightly higher x-height than Inter, with shorter ascenders — tighter line spacing in dashboards without losing aperture clarity."
						rows="3"
						class="block w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
					></textarea>
					<div class="text-right font-mono text-[10px] text-fg-subtle" data-numeric>
						{countWords(brief.differentiation)} words · {(brief.differentiation ?? '').length} chars
					</div>
				</Field>
			</Panel>

			<Panel>
				<h2 class="mb-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					Design notes
				</h2>
				<p class="mb-3 text-[12px] text-fg-subtle">
					The editorial story behind the typeface — the kind of essay that lives at the
					top of a foundry's specimen page. Markdown-light, kept whole.
				</p>
				<textarea
					value={brief.designNotes ?? ''}
					oninput={(e) => projectStore.updateBrief({ designNotes: e.currentTarget.value })}
					placeholder={`e.g., A digital-first reading face whose proportions were derived from… The italic was drawn first and informed the upright via shared stress angles… Vietnamese diacritics use a single shared shape across two-storey marks…`}
					rows="6"
					class="block w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm leading-[1.55] text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
				></textarea>
				<div class="mt-1 flex items-baseline justify-between gap-3 text-[11px] text-fg-subtle">
					<span>Appears in the Specimen between Cover and Character set when set.</span>
					<span class="font-mono text-[10px]" data-numeric>
						{countWords(brief.designNotes)} words · {(brief.designNotes ?? '').length} chars
					</span>
				</div>
				{#if !brief.designNotes?.trim()}
					<div class="mt-3 rounded-md border border-dashed border-border-strong/50 bg-surface-2/40 p-3">
						<div class="mb-2 text-[11px] font-medium text-fg-muted">
							Stuck on the opening? Drop in a foundry-style template and rewrite over
							it:
						</div>
						<div class="flex flex-wrap gap-1.5">
							{#each ESSAY_OPENINGS as opening (opening.label)}
								<button
									type="button"
									onclick={() => insertEssayOpening(opening.text)}
									class="rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-medium text-fg-muted hover:border-accent hover:text-accent"
									title="Insert {opening.label} into design notes"
								>
									+ {opening.label}
								</button>
							{/each}
						</div>
					</div>
				{/if}
		</Panel>

		<Panel>
				<h2 class="mb-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					Decision log ({project.decisions?.length ?? 0})
				</h2>
				<p class="mb-3 text-[12px] text-fg-subtle">
					Capture each meaningful decision while the context is fresh. Different from the
					changelog — these are <em>per-decision</em> not per-version, and they're what makes
					a foundry's specimens worth reading. They flow into the exported
					<code>DESIGN.md</code>.
				</p>
				{#if project.decisions && project.decisions.length > 0}
					<ul class="mb-3 grid gap-2">
						{#each project.decisions as d (d.id)}
							<li
								class="grid grid-cols-[1fr_auto] items-start gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2"
							>
								<div class="min-w-0">
									<div class="flex items-baseline gap-2">
										<span class="text-[13px] font-semibold text-fg">{d.decision}</span>
										<span class="text-[10px] font-mono text-fg-subtle" data-numeric>
											{formatDecisionDate(d.date)}
										</span>
									</div>
									<div class="mt-0.5 whitespace-pre-line text-[12px] text-fg-muted">
										{d.rationale}
									</div>
								</div>
								<button
									type="button"
									onclick={() => projectStore.removeDecision(d.id)}
									class="rounded p-1 text-fg-subtle hover:bg-danger/10 hover:text-danger"
									aria-label="Remove decision"
								>
									<Trash2 class="size-3.5" />
								</button>
							</li>
						{/each}
					</ul>
				{/if}
				<form
					onsubmit={submitDecision}
					class="rounded-md border border-dashed border-border-strong/50 bg-surface-2/40 p-3"
				>
					<div class="grid gap-2">
						<Field label="What did you decide?">
							<Input
								density="sm"
								bind:value={newDecisionTitle}
								placeholder="e.g. tighten default sidebearing from 50 to 40 units"
							/>
						</Field>
						<Field label="Why?">
							<textarea
								bind:value={newDecisionRationale}
								placeholder="What problem did this solve? What's the trade-off you accepted?"
								rows="3"
								class="block w-full resize-y rounded-md border border-border bg-surface px-2 py-1.5 text-[12px] text-fg outline-none focus:border-accent"
							></textarea>
						</Field>
						<Button
							density="sm"
							type="submit"
							disabled={!newDecisionTitle.trim() || !newDecisionRationale.trim()}
						>
							{#snippet icon()}<Plus class="size-3.5" />{/snippet}
							Log decision
						</Button>
					</div>
				</form>
		</Panel>

		<Panel>
				<h2 class="mb-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					Reference corpus ({brief.references?.length ?? 0})
				</h2>
				<p class="mb-3 text-[12px] text-fg-subtle">
					Track three kinds of references: <strong class="text-success">functional</strong>
					(real text this font must handle), <strong class="text-warn">historical</strong>
					(writing/lettering/print models), and
					<strong class="text-accent">competitive</strong> (existing solutions to study).
				</p>
				{#if brief.references && brief.references.length > 0}
					<ul class="mb-4 grid gap-1.5">
						{#each brief.references as r (r.id)}
							<li
								class="grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2"
							>
								<span
									class="rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase {KIND_COLORS[
										r.kind ?? 'competitive'
									]}"
								>
									{KIND_LABELS[r.kind ?? 'competitive']}
								</span>
								<div class="min-w-0">
									<div class="flex items-center gap-1.5">
										<span class="truncate text-[13px] font-medium text-fg">{r.name}</span>
										{#if r.url}
											<a
												href={r.url}
												target="_blank"
												rel="noopener"
												class="text-fg-subtle hover:text-accent"
												aria-label="Open reference URL"
											>
												<ExternalLink class="size-3" />
											</a>
										{/if}
									</div>
									{#if r.notes}
										<div class="text-[11px] text-fg-muted">{r.notes}</div>
									{/if}
								</div>
								<button
									type="button"
									onclick={() => projectStore.removeBriefReference(r.id)}
									class="rounded p-1 text-fg-subtle hover:bg-danger/10 hover:text-danger"
									aria-label="Remove reference {r.name}"
								>
									<Trash2 class="size-3.5" />
								</button>
							</li>
						{/each}
					</ul>
				{/if}
				<div class="mb-3 flex flex-wrap items-center gap-1.5">
					<span class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
						Quick add
					</span>
					{#each COMMON_REFS as preset (preset.name)}
						<button
							type="button"
							onclick={() => addCommonRef(preset)}
							class="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-fg-muted transition-colors hover:border-accent hover:text-accent"
							title={preset.notes}
						>
							{preset.name}
						</button>
					{/each}
				</div>
				<form
					onsubmit={addReference}
					class="rounded-md border border-dashed border-border-strong/50 bg-surface-2/40 p-3"
				>
					<div class="mb-2 grid grid-cols-[1fr_1fr_auto] gap-2">
						<Field label="Name">
							<Input
								density="sm"
								bind:value={newRefName}
								placeholder="e.g., Inter, Söhne, Caslon 1722"
							/>
						</Field>
						<Field label="URL (optional)">
							<Input
								density="sm"
								bind:value={newRefUrl}
								placeholder="https://…"
								type="url"
							/>
						</Field>
						<Field label="Kind">
							<select
								bind:value={newRefKind}
								class="h-8 rounded-md border border-border bg-surface px-2 text-[13px] outline-none focus:border-accent"
							>
								<option value="functional">Functional</option>
								<option value="historical">Historical</option>
								<option value="competitive">Competitive</option>
							</select>
						</Field>
					</div>
					<Field label="Notes (optional)">
						<Input
							density="sm"
							bind:value={newRefNotes}
							placeholder="What you're studying about it"
						/>
					</Field>
					<div class="mt-2 flex justify-end">
						<Button type="submit" density="sm" disabled={!newRefName.trim()}>
							{#snippet icon()}<Plus class="size-3.5" />{/snippet}
							Add reference
						</Button>
					</div>
				</form>
			</Panel>
		</div>
	</div>
{/if}
