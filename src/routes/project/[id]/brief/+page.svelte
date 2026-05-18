<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { USE_CASE_LABELS, type UseCase } from '$lib/font/types';
	import Panel from '$lib/ui/Panel.svelte';
	import Field from '$lib/ui/Field.svelte';
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
</script>

{#if !project}
	<div class="flex h-full items-center justify-center text-fg-muted">Loading…</div>
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
				<p class="mt-2 text-[11px] text-fg-subtle">
					Appears in the Specimen between Cover and Character set when set.
				</p>
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
