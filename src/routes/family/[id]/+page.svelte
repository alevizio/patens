<script lang="ts">
	import { goto } from '$app/navigation';
	import { toast } from '$lib/stores/toast.svelte';
	import {
		createSibling,
		createSlantedSibling,
		deleteFamily,
		findRegularSibling,
		loadFamily,
		loadSiblingFonts,
		listSiblings,
		propagateFamilyMetadata,
		propagateKerningClasses,
		saveFamily,
		syncAnchorsFromRegular,
		syncMetricsFromRegular,
		syncMissingClassesFromRegular,
		unloadSiblingFonts,
		unlinkProjectFromFamily
	} from '$lib/font/family';
	import { onDestroy } from 'svelte';
	import { loadProject } from '$lib/font/project';
	import { downloadFamilyBundle } from '$lib/font/family-export';
	import { auditFamily, type FamilyIssue } from '$lib/font/family-audit';
	import { auditProject, auditCompatibility, preflightProject } from '$lib/font/audit';
	import type { Family, FamilyAxes, KerningPair, KerningSide } from '$lib/font/types';
	import Panel from '$lib/ui/Panel.svelte';
	import Field from '$lib/ui/Field.svelte';
	import Input from '$lib/ui/Input.svelte';
	import Button from '$lib/ui/Button.svelte';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Layers from '@lucide/svelte/icons/layers';
	import Plus from '@lucide/svelte/icons/plus';
	import Download from '@lucide/svelte/icons/download';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Unlink from '@lucide/svelte/icons/unlink';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import Info from '@lucide/svelte/icons/info';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';

	type SiblingEntry = Awaited<ReturnType<typeof listSiblings>>[number];
	let { data }: { data: { family: Family; siblings: SiblingEntry[] } } = $props();

	// svelte-ignore state_referenced_locally
	let family = $state<Family>($state.snapshot(data.family));
	// svelte-ignore state_referenced_locally
	let siblings = $state<SiblingEntry[]>([...data.siblings]);
	let saving = $state(false);

	let issues = $state<FamilyIssue[]>([]);
	const refreshAudit = async () => {
		issues = await auditFamily(data.family.id);
	};
	$effect(() => {
		// Re-audit when sibling count *or* the data prop updates (navigation back
		// from a sibling editor reloads `data`, refreshing the audit).
		void siblings.length;
		void data.siblings;
		refreshAudit();
	});

	// Per-sibling project-level audit roll-up — error/warn counts for each
	// sibling so the designer can see at a glance which styles need work.
	// Loaded async, keyed by sibling id. Empty until the load completes.
	let siblingAudits = $state<Record<string, { error: number; warn: number; info: number }>>({});
	const refreshSiblingAudits = async () => {
		const next: typeof siblingAudits = {};
		for (const s of siblings) {
			const p = await loadProject(s.id);
			if (!p) continue;
			const all = [
				...auditProject(p),
				...auditCompatibility(p),
				...preflightProject(p)
			];
			next[s.id] = {
				error: all.filter((i) => i.severity === 'error').length,
				warn: all.filter((i) => i.severity === 'warn').length,
				info: all.filter((i) => i.severity === 'info').length
			};
		}
		siblingAudits = next;
	};
	$effect(() => {
		void siblings.length;
		void data.siblings;
		refreshSiblingAudits();
	});

	// Family-wide designspace summary — total siblings, total masters
	// across all siblings, unique axis tags. Surfaces the family's variable-
	// font footprint at a glance. Derived from the index entries so it
	// doesn't require loading every sibling.
	const designspaceSummary = $derived.by(() => {
		let totalMasters = 0;
		const axisTags = new Set<string>();
		const masterNames = new Set<string>();
		for (const s of siblings) {
			totalMasters += s.masterCount ?? 0;
			for (const name of s.masterNames ?? []) masterNames.add(name);
			for (const tag of Object.keys(s.familyAxes ?? {})) axisTags.add(tag);
		}
		return {
			siblingCount: siblings.length,
			totalMasters,
			axisTags: [...axisTags].sort(),
			masterNames: [...masterNames].sort()
		};
	});

	const refresh = async () => {
		const f = await loadFamily(data.family.id);
		if (f) family = f;
		siblings = await listSiblings(data.family.id);
		await refreshAudit();
	};

	// Empty-string-safe drafts for the family-level metadata inputs. Family
	// fields are `string | undefined`, but `<Input>`'s value binding wants a
	// string — drafts mediate. Drafts sync down from family; on save we
	// normalize empty strings back to undefined so cleared fields actually
	// disappear from sibling metadata.
	// svelte-ignore state_referenced_locally
	let designerDraft = $state(data.family.designer ?? '');
	// svelte-ignore state_referenced_locally
	let copyrightDraft = $state(data.family.copyright ?? '');
	// svelte-ignore state_referenced_locally
	let licenseDraft = $state(data.family.license ?? '');
	$effect(() => {
		designerDraft = family.designer ?? '';
		copyrightDraft = family.copyright ?? '';
		licenseDraft = family.license ?? '';
	});

	const saveFamilyEdits = async () => {
		if (saving) return;
		saving = true;
		try {
			family = {
				...family,
				designer: designerDraft.trim() || undefined,
				copyright: copyrightDraft.trim() || undefined,
				license: licenseDraft.trim() || undefined
			};
			await saveFamily(family);
			const result = await propagateFamilyMetadata(family.id);
			const baseMsg = `Family saved · propagated to ${result.updated} sibling${result.updated === 1 ? '' : 's'}.`;
			toast.success(baseMsg);
			if (result.skipped.length > 0) {
				toast.warn(
					`Skipped locked sibling${result.skipped.length === 1 ? '' : 's'}: ${result.skipped.join(', ')}. Unlock to apply.`
				);
			}
			await refresh();
		} finally {
			saving = false;
		}
	};

	// New-sibling form state
	let newStyleName = $state('Italic');
	let newWght = $state<number>(400);
	let newItal = $state<0 | 1>(1);
	let newWdth = $state<number>(100);
	let templateId = $state<string>('');
	let newSlantMode = $state<'blank' | 'slant'>('blank');
	let newSlantDeg = $state<number>(12);
	$effect(() => {
		// Pre-pick the first sibling as template when none chosen
		if (!templateId && siblings.length > 0) templateId = siblings[0].id;
	});

	const presetItalic = () => {
		newStyleName = 'Italic';
		newWght = 400;
		newItal = 1;
		newWdth = 100;
	};
	const presetBold = () => {
		newStyleName = 'Bold';
		newWght = 700;
		newItal = 0;
		newWdth = 100;
	};
	const presetBoldItalic = () => {
		newStyleName = 'Bold Italic';
		newWght = 700;
		newItal = 1;
		newWdth = 100;
	};
	const presetLight = () => {
		newStyleName = 'Light';
		newWght = 300;
		newItal = 0;
		newWdth = 100;
	};

	const handleCreateSibling = async (e: Event) => {
		e.preventDefault();
		if (!templateId) {
			toast.warn('Pick a template style to clone from.');
			return;
		}
		const axes: FamilyAxes = {
			wght: newWght,
			ital: newItal,
			wdth: newWdth,
			...(newSlantMode === 'slant' ? { slnt: -newSlantDeg } : {})
		};
		const sib =
			newSlantMode === 'slant'
				? await createSlantedSibling(templateId, {
						styleName: newStyleName.trim() || 'Untitled',
						familyAxes: axes,
						slantDeg: newSlantDeg
					})
				: await createSibling(templateId, {
						styleName: newStyleName.trim() || 'Untitled',
						familyAxes: axes
					});
		if (!sib) {
			toast.error('Could not load the template project.');
			return;
		}
		// Link to family
		const { linkProjectToFamily } = await import('$lib/font/family');
		await linkProjectToFamily(sib.id, family.id, axes);
		toast.success(`Created sibling "${sib.metadata.styleName}".`);
		await refresh();
		// Hop into the new sibling's editor
		await goto(`/project/${sib.id}/edit`);
	};

	const handleUnlinkSibling = async (id: string) => {
		const ok = confirm('Remove this style from the family? The project itself is kept.');
		if (!ok) return;
		await unlinkProjectFromFamily(id);
		await refresh();
	};

	// ---------- Family kerning panel ----------
	// Family.kerning is inherited by every sibling at resolution time (see
	// src/lib/font/family-kerning.ts). Editing here propagates immediately —
	// no per-sibling propagation pass needed, the resolver runs on read.
	let newKernLeft = $state('');
	let newKernRight = $state('');
	let newKernValue = $state(-40);

	/**
	 * Parses a kerning-side input. Accepts:
	 *   - a single character (e.g. "A") → returns its codepoint
	 *   - a string starting with "@" (e.g. "@A_left") → returns the string
	 * Returns null if the input is empty / multi-char without @-prefix.
	 */
	const parseKerningSide = (input: string): KerningSide | null => {
		const trimmed = input.trim();
		if (!trimmed) return null;
		if (trimmed.startsWith('@')) return trimmed;
		if ([...trimmed].length !== 1) return null; // strict: one char or @class
		return [...trimmed][0].codePointAt(0) ?? null;
	};

	const formatKerningSide = (side: KerningSide): string => {
		if (typeof side === 'string') return side;
		return String.fromCodePoint(side);
	};

	const addFamilyKern = async () => {
		const left = parseKerningSide(newKernLeft);
		const right = parseKerningSide(newKernRight);
		if (left == null || right == null) {
			toast.warn('Each side must be either one character or an @class-name.');
			return;
		}
		const pair: KerningPair = { left, right, value: Math.round(newKernValue) };
		const existing = family.kerning ?? [];
		// Replace any existing pair with the same (left, right) tuple.
		const filtered = existing.filter(
			(p) => !(p.left === left && p.right === right)
		);
		family = { ...family, kerning: [...filtered, pair] };
		await saveFamily(family);
		newKernLeft = '';
		newKernRight = '';
		newKernValue = -40;
	};

	const deleteFamilyKern = async (idx: number) => {
		const existing = family.kerning ?? [];
		const next = existing.filter((_, i) => i !== idx);
		family = { ...family, kerning: next };
		await saveFamily(family);
	};

	const fixableCodes = new Set([
		'family-upm-mismatch',
		'family-metrics-mismatch-ascender',
		'family-metrics-mismatch-descender',
		'family-metrics-mismatch-capHeight',
		'family-metrics-mismatch-xHeight',
		'family-anchor-missing',
		'family-class-missing'
	]);
	const fixLabel = (code: string): string => {
		if (code === 'family-upm-mismatch') return 'Sync UPM';
		if (code.startsWith('family-metrics-mismatch-')) return 'Sync metrics';
		if (code === 'family-anchor-missing') return 'Copy anchors';
		if (code === 'family-class-missing') return 'Copy class';
		return 'Fix';
	};
	const handleFixIssue = async (issue: FamilyIssue) => {
		if (!issue.siblingId) return;
		if (
			issue.code === 'family-upm-mismatch' ||
			issue.code.startsWith('family-metrics-mismatch-')
		) {
			const ok = await syncMetricsFromRegular(data.family.id, issue.siblingId);
			if (ok) {
				toast.success('Metrics synced from Regular.');
				await refresh();
			}
		} else if (issue.code === 'family-anchor-missing') {
			const added = await syncAnchorsFromRegular(data.family.id, issue.siblingId);
			if (added > 0) {
				toast.success(`Copied ${added} missing anchor${added === 1 ? '' : 's'}.`);
				await refresh();
			} else {
				toast.warn('Nothing to copy.');
			}
		} else if (issue.code === 'family-class-missing') {
			const added = await syncMissingClassesFromRegular(data.family.id, issue.siblingId);
			if (added > 0) {
				toast.success(`Copied ${added} kerning class${added === 1 ? '' : 'es'}.`);
				await refresh();
			} else {
				toast.warn('Nothing to copy.');
			}
		}
	};

	let regularClassCount = $state(0);
	let regularId = $state<string | null>(null);
	$effect(() => {
		void siblings.length;
		(async () => {
			const reg = await findRegularSibling(data.family.id);
			if (!reg) {
				regularClassCount = 0;
				regularId = null;
				return;
			}
			regularId = reg.id;
			const { loadProject: lp } = await import('$lib/font/project');
			const p = await lp(reg.id);
			regularClassCount = p?.classes?.length ?? 0;
		})();
	});

	let propagating = $state(false);
	const handlePropagateClasses = async () => {
		if (propagating) return;
		propagating = true;
		try {
			const updated = await propagateKerningClasses(data.family.id);
			toast.success(
				updated > 0
					? `Pushed ${regularClassCount} class${regularClassCount === 1 ? '' : 'es'} to ${updated} sibling${updated === 1 ? '' : 's'}.`
					: 'No other siblings to update.'
			);
		} finally {
			propagating = false;
		}
	};

	// Side-by-side comparison: build each sibling's font, register as FontFace,
	// render the same string per sibling. Loaded on demand to avoid the upfront
	// cost when the user is just managing the family.
	let compareOpen = $state(false);
	let compareLoading = $state(false);
	let siblingFonts = $state<Map<string, string>>(new Map());
	let compareText = $state('Hamburgefonstiv');
	let compareSize = $state(48);
	const toggleCompare = async () => {
		if (compareLoading) return;
		if (compareOpen) {
			compareOpen = false;
			return;
		}
		compareLoading = true;
		try {
			siblingFonts = await loadSiblingFonts(data.family.id);
			compareOpen = true;
		} finally {
			compareLoading = false;
		}
	};
	onDestroy(() => {
		// Clean up registered FontFaces when navigating away
		unloadSiblingFonts();
	});

	let exporting = $state(false);
	const handleExportBundle = async () => {
		if (exporting) return;
		exporting = true;
		try {
			const bundle = await downloadFamilyBundle(data.family.id);
			if (!bundle) {
				toast.error('Family bundle failed.');
				return;
			}
			toast.success(
				`Family bundle exported (${(bundle.zip.byteLength / 1024).toFixed(1)} KB).`
			);
			if (bundle.flattenedVfSiblings.length > 0) {
				toast.warn(
					`Flattened to static: ${bundle.flattenedVfSiblings.join(', ')}. Export those siblings via their project /export route for true VF.`
				);
			}
			if (bundle.failedSiblings.length > 0) {
				toast.error(
					`Failed to build: ${bundle.failedSiblings.join(', ')}. These siblings are missing from the ZIP — check their project audit.`
				);
			}
		} catch (err) {
			toast.error('Export failed: ' + (err instanceof Error ? err.message : String(err)));
		} finally {
			exporting = false;
		}
	};

	const handleDeleteFamily = async () => {
		const ok = confirm(
			`Delete the family "${family.name}"? Sibling projects are kept (just unlinked).`
		);
		if (!ok) return;
		await deleteFamily(family.id);
		goto('/studio-c104c94c');
	};

	const axisChips = (a: FamilyAxes | undefined): string[] => {
		if (!a) return [];
		const out: string[] = [];
		if (a.wght !== undefined) out.push(`wght ${a.wght}`);
		if (a.wdth !== undefined && a.wdth !== 100) out.push(`wdth ${a.wdth}`);
		if (a.ital) out.push('italic');
		if (a.slnt !== undefined && a.slnt !== 0) out.push(`slnt ${a.slnt}°`);
		return out;
	};
</script>

<div class="mx-auto max-w-5xl px-6 py-12">
	<a
		href="/studio-c104c94c"
		class="mb-6 inline-flex items-center gap-1.5 text-[12px] text-fg-muted hover:text-fg"
	>
		<ArrowLeft class="size-3.5" />
		Back to projects
	</a>

	<header class="mb-8 flex items-start gap-3">
		<div class="mt-1 flex size-9 items-center justify-center rounded-md bg-accent-soft text-accent-strong">
			<Layers class="size-4" />
		</div>
		<div class="flex-1">
			<div class="text-[10px] uppercase tracking-wider text-fg-subtle">Family</div>
			<input
				class="block w-full border-0 bg-transparent p-0 text-2xl font-semibold tracking-tight text-fg outline-none focus:ring-1 focus:ring-accent"
				bind:value={family.name}
				onblur={saveFamilyEdits}
				aria-label="Family name"
				title="Family name — edits propagate to every sibling project"
			/>
			<p class="mt-1 text-sm text-fg-muted">
				{siblings.length} style{siblings.length === 1 ? '' : 's'} in this family. Family-level
				designer / license edits fan out to every sibling.
			</p>
		</div>
		<div class="flex flex-col items-end gap-1.5">
			<Button onclick={handleExportBundle} disabled={exporting || siblings.length === 0}>
				{#snippet icon()}<Download class="size-3.5" />{/snippet}
				{exporting ? 'Bundling…' : `Export family ZIP (${siblings.length})`}
			</Button>
			<button
				type="button"
				onclick={handleDeleteFamily}
				class="text-[11px] text-fg-subtle hover:text-danger"
			>
				Delete family
			</button>
		</div>
	</header>

	<div class="flex flex-col gap-6">

	<Panel>
		<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			Family-level metadata
		</h2>
		<div class="grid gap-2 md:grid-cols-3">
			<Field label="Designer">
				<Input bind:value={designerDraft} onblur={saveFamilyEdits} placeholder="Your Name" />
			</Field>
			<Field label="Copyright">
				<Input
					bind:value={copyrightDraft}
					onblur={saveFamilyEdits}
					placeholder="© 2026 …"
				/>
			</Field>
			<Field label="License">
				<Input
					bind:value={licenseDraft}
					onblur={saveFamilyEdits}
					placeholder="SIL OFL 1.1"
				/>
			</Field>
		</div>
		<p class="mt-2 text-[11px] text-fg-subtle">
			Saved fields propagate to every sibling's name-table metadata on the next blur or
			explicit save.
		</p>
	</Panel>

	<Panel>
		<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			Designspace
		</h2>
		<div class="grid gap-3 md:grid-cols-4">
			<div>
				<div class="text-[10px] uppercase tracking-wider text-fg-subtle">Siblings</div>
				<div class="text-[18px] font-medium text-fg" data-numeric>
					{designspaceSummary.siblingCount}
				</div>
			</div>
			<div>
				<div class="text-[10px] uppercase tracking-wider text-fg-subtle">Masters</div>
				<div class="text-[18px] font-medium text-fg" data-numeric>
					{designspaceSummary.totalMasters}
				</div>
			</div>
			<div>
				<div class="text-[10px] uppercase tracking-wider text-fg-subtle">Axes</div>
				<div class="flex flex-wrap items-center gap-1 pt-1.5">
					{#each designspaceSummary.axisTags as tag (tag)}
						<span class="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-fg">
							{tag}
						</span>
					{:else}
						<span class="text-[12px] text-fg-subtle">none declared</span>
					{/each}
				</div>
			</div>
			<div>
				<div class="text-[10px] uppercase tracking-wider text-fg-subtle">Master names</div>
				<div class="flex flex-wrap items-center gap-1 pt-1.5">
					{#each designspaceSummary.masterNames as name (name)}
						<span class="rounded bg-accent-soft/30 px-1.5 py-0.5 text-[11px] text-accent-strong">
							{name}
						</span>
					{:else}
						<span class="text-[12px] text-fg-subtle">—</span>
					{/each}
				</div>
			</div>
		</div>
		<p class="mt-2 text-[11px] text-fg-subtle">
			Aggregated across every sibling. Per-sibling master breakdown shows in the row below.
		</p>
	</Panel>

	<Panel>
		<h2 class="mb-1 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			Family kerning
		</h2>
		<p class="mb-3 text-[12px] leading-relaxed text-fg-muted">
			Pairs that apply across every sibling. Resolved at export time — a sibling can
			override locally by setting the same (left, right) pair in its own kerning. Useful
			for structurally identical spacing (e.g. <span class="font-mono">AV</span> in a
			geometric sans where the bowl + diagonal are the same in every style).
		</p>

		{#if (family.kerning ?? []).length > 0}
			<div class="mb-3 overflow-x-auto">
				<table class="w-full text-[12px]">
					<thead>
						<tr class="border-b border-border text-[10px] uppercase tracking-wider text-fg-subtle">
							<th class="py-1.5 pr-3 text-left font-medium">Left</th>
							<th class="py-1.5 pr-3 text-left font-medium">Right</th>
							<th class="py-1.5 pr-3 text-right font-medium" data-numeric>Value (fu)</th>
							<th class="w-8 py-1.5 text-right font-medium"></th>
						</tr>
					</thead>
					<tbody>
						{#each family.kerning ?? [] as pair, idx (idx + ':' + JSON.stringify(pair.left) + '|' + JSON.stringify(pair.right))}
							<tr class="border-b border-border/40 hover:bg-surface-2/40">
								<td class="py-1.5 pr-3 font-mono text-fg">
									{formatKerningSide(pair.left)}
									{#if typeof pair.left === 'number'}
										<span class="ml-1 text-[10px] text-fg-subtle">
											U+{pair.left.toString(16).toUpperCase().padStart(4, '0')}
										</span>
									{/if}
								</td>
								<td class="py-1.5 pr-3 font-mono text-fg">
									{formatKerningSide(pair.right)}
									{#if typeof pair.right === 'number'}
										<span class="ml-1 text-[10px] text-fg-subtle">
											U+{pair.right.toString(16).toUpperCase().padStart(4, '0')}
										</span>
									{/if}
								</td>
								<td
									class="py-1.5 pr-3 text-right font-mono text-fg {pair.value < 0
										? 'text-warn-strong'
										: pair.value > 0
											? 'text-accent-strong'
											: ''}"
									data-numeric
								>
									{pair.value}
								</td>
								<td class="py-1.5 text-right">
									<button
										type="button"
										onclick={() => deleteFamilyKern(idx)}
										class="inline-flex size-6 items-center justify-center rounded text-fg-subtle hover:bg-danger-soft hover:text-danger"
										aria-label="Remove pair"
										title="Remove this family pair"
									>
										<Trash2 class="size-3" />
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="mb-3 rounded-md border border-dashed border-border bg-surface-2/30 px-3 py-4 text-center text-[12px] text-fg-subtle">
				No family-wide pairs yet. Add one below — it'll apply to every sibling at export.
			</p>
		{/if}

		<form
			class="flex flex-wrap items-end gap-2"
			onsubmit={(e) => {
				e.preventDefault();
				void addFamilyKern();
			}}
		>
			<div class="grow-0">
				<label class="mb-1 block text-[10px] uppercase tracking-wider text-fg-subtle" for="fk-left">
					Left
				</label>
				<Input
					id="fk-left"
					bind:value={newKernLeft}
					placeholder="A or @class"
					density="sm"
					class="w-24 font-mono"
				/>
			</div>
			<div class="grow-0">
				<label class="mb-1 block text-[10px] uppercase tracking-wider text-fg-subtle" for="fk-right">
					Right
				</label>
				<Input
					id="fk-right"
					bind:value={newKernRight}
					placeholder="V or @class"
					density="sm"
					class="w-24 font-mono"
				/>
			</div>
			<div class="grow-0">
				<label class="mb-1 block text-[10px] uppercase tracking-wider text-fg-subtle" for="fk-value">
					Value
				</label>
				<Input
					id="fk-value"
					type="number"
					bind:value={newKernValue}
					density="sm"
					class="w-20 font-mono"
				/>
			</div>
			<Button type="submit" density="sm">
				{#snippet icon()}<Plus class="size-3.5" />{/snippet}
				Add pair
			</Button>
		</form>
	</Panel>

	<Panel>
		<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			Siblings
		</h2>
		{#if siblings.length === 0}
			<p class="text-[12px] text-fg-subtle">
				No siblings yet. Use the form below to clone an existing project into this family,
				or visit any project and link it from its Stats popover (coming next).
			</p>
		{:else}
			<ul class="divide-y divide-border border-y border-border">
				{#each siblings as s (s.id)}
					{@const chips = axisChips(s.familyAxes)}
					<li class="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-3">
						<div class="flex size-12 items-center justify-center text-fg">
							{#if s.thumbnail}
								<svg
									viewBox={s.thumbnail.viewBox}
									width="44"
									height="44"
									preserveAspectRatio="xMidYMid meet"
									style="transform: scaleY(-1);"
									aria-hidden="true"
								>
									<path d={s.thumbnail.path} fill="currentColor" fill-rule="evenodd" />
								</svg>
							{:else}
								<span
									class="text-2xl leading-none text-fg-muted"
									
								>
									H
								</span>
							{/if}
						</div>
						<div class="min-w-0">
							<a
								href="/project/{s.id}/edit"
								class="block truncate text-[15px] leading-tight text-fg transition-colors hover:text-accent-strong"
								
							>
								{s.name}
							</a>
							<div
								class="mt-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 font-mono text-[10px] text-fg-subtle"
								data-numeric
							>
								{#each chips as c (c)}
									<span>{c}</span>
								{/each}
								{#if chips.length === 0}
									<span>no familyAxes</span>
								{/if}
								<span title="Drawn glyphs · last sealed version">
									{s.glyphCount} drawn{s.lastSealedVersion ? ` · v${s.lastSealedVersion}` : ''}
								</span>
								{#if (s.kerningCount ?? 0) > 0}
									<!-- Surface kerning effort at a glance — different
									     siblings often diverge in pair count (e.g. Bold
									     has more pairs than Light), which is a useful
									     family-level health signal. -->
									<span title="Kerning pairs in this sibling">
										{s.kerningCount} pairs
									</span>
								{/if}
								{#if (s.masterCount ?? 0) > 0}
									<!-- Masters chip — a VF sibling's design space at a
									     glance. Names are capped at three by the indexer
									     so the chip stays readable for large families. -->
									<span
										class="inline-flex items-center gap-1 rounded bg-accent-soft/30 px-1.5 text-accent-strong"
										title="Variable-font masters in this sibling — {s.masterNames?.join(', ') ?? ''}"
									>
										+{s.masterCount} master{s.masterCount === 1 ? '' : 's'}
										{#if s.masterNames && s.masterNames.length > 0}
											<span class="text-fg-muted">·</span>
											<span class="text-fg-muted">
												{s.masterNames.join(', ')}{(s.masterCount ?? 0) > 3 ? '…' : ''}
											</span>
										{/if}
									</span>
								{/if}
								{#if (s.editsToday ?? 0) > 0}
									<span
										class="font-medium text-accent-strong"
										title="Glyphs edited in last 24h"
									>
										{s.editsToday} today
									</span>
								{/if}
								{#if siblingAudits[s.id]}
									{@const a = siblingAudits[s.id]}
									<!-- Per-sibling audit roll-up — surfaces project-level
									     error/warn counts so the designer sees which styles
									     need attention without opening each one. Clicks
									     deep-link to that sibling's audit page. -->
									{#if a.error === 0 && a.warn === 0}
										<a
											href="/project/{s.id}/audit"
											class="inline-flex items-center gap-0.5 rounded bg-success/10 px-1.5 py-0 text-success-strong"
											title="All audit checks pass for this sibling"
										>
											✓ clean
										</a>
									{:else}
										<a
											href="/project/{s.id}/audit"
											class="inline-flex items-center gap-1 font-medium"
											title="{a.error} errors, {a.warn} warnings, {a.info} info — open this sibling's audit"
										>
											{#if a.error > 0}
												<span class="text-danger-strong">{a.error}e</span>
											{/if}
											{#if a.warn > 0}
												<span class="text-warn-strong">{a.warn}w</span>
											{/if}
										</a>
									{/if}
								{/if}
							</div>
						</div>
						<button
							type="button"
							onclick={() => handleUnlinkSibling(s.id)}
							class="rounded p-1 text-fg-subtle transition-colors hover:bg-warn/10 hover:text-warn-strong"
							aria-label="Unlink from family"
							title="Unlink from family"
						>
							<Unlink class="size-3.5" />
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</Panel>

	<Panel>
		<div class="mb-3 flex items-baseline justify-between gap-2">
			<h2 class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				Family audit
			</h2>
			{#if issues.length === 0 && siblings.length > 0}
				<span class="inline-flex items-center gap-1 text-[11px] text-success">
					<CheckCircle2 class="size-3" /> All consistent
				</span>
			{:else}
				<span class="font-mono text-[11px] text-fg-subtle" data-numeric>
					{issues.filter((i) => i.severity === 'error').length} err ·
					{issues.filter((i) => i.severity === 'warn').length} warn ·
					{issues.filter((i) => i.severity === 'info').length} info
				</span>
			{/if}
		</div>
		<p class="mb-3 text-[12px] text-fg-subtle">
			Cross-style consistency checks: UPM, vertical metrics, kerning class structure, anchor
			naming, duplicate familyAxes positions.
		</p>
		{#if issues.length > 0}
			<ul class="grid gap-1">
				{#each issues.slice(0, 20) as i, idx (idx)}
					<li
						class="flex items-start gap-2 rounded-md border border-border bg-surface-2/40 px-3 py-2"
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
							<div class="mt-0.5 font-mono text-[10px] text-fg-subtle">{i.code}</div>
						</div>
						{#if i.siblingId && fixableCodes.has(i.code)}
							<button
								type="button"
								onclick={() => handleFixIssue(i)}
								class="rounded border border-accent/40 bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent-strong hover:border-accent hover:bg-accent/15"
								title="Sync the offending field from the Regular sibling"
							>
								{fixLabel(i.code)}
							</button>
						{/if}
						{#if i.siblingId}
							<a
								href="/project/{i.siblingId}/edit"
								class="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-fg-muted hover:border-accent hover:text-accent"
							>
								Open →
							</a>
						{/if}
					</li>
				{/each}
				{#if issues.length > 20}
					<li class="text-[11px] text-fg-subtle">
						+{issues.length - 20} more issues — fix these first.
					</li>
				{/if}
			</ul>
		{/if}
	</Panel>

	{#if siblings.length > 1}
		<Panel>
			<div class="mb-2 flex items-baseline justify-between gap-2">
				<h2 class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					Kerning class structure
				</h2>
				<span class="font-mono text-[11px] text-fg-muted" data-numeric>
					{regularClassCount} class{regularClassCount === 1 ? '' : 'es'} in Regular
				</span>
			</div>
			<p class="mb-3 text-[12px] text-fg-subtle">
				Class <em>definitions</em> (names + members) should match across siblings so kerning
				groups stay aligned. Push the Regular sibling's class structure to every other
				sibling — pair values stay per-style.
			</p>
			<div class="flex flex-wrap items-center gap-2">
				<Button
					density="sm"
					variant="secondary"
					onclick={handlePropagateClasses}
					disabled={propagating || regularClassCount === 0}
					loading={propagating}
				>
					{propagating
						? 'Pushing…'
						: `Push ${regularClassCount} class${regularClassCount === 1 ? '' : 'es'} to ${siblings.length - 1} sibling${siblings.length - 1 === 1 ? '' : 's'}`}
				</Button>
				{#if regularId}
					<a
						href="/project/{regularId}/spacing"
						class="text-[12px] text-fg-muted hover:text-accent"
					>
						Edit Regular's kerning classes →
					</a>
				{/if}
			</div>
		</Panel>
	{/if}

	{#if siblings.length > 1}
		<Panel>
			<div class="mb-2 flex items-baseline justify-between gap-2">
				<h2 class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					Side-by-side proof
				</h2>
				<Button
					density="sm"
					variant="ghost"
					onclick={toggleCompare}
					loading={compareLoading}
				>
					{compareOpen ? 'Hide' : compareLoading ? 'Building…' : 'Render all siblings'}
				</Button>
			</div>
			<p class="mb-3 text-[12px] text-fg-subtle">
				Builds every sibling's OTF in-browser and renders the same string in each — the
				canonical foundry proof for evaluating a family's consistency. Updates whenever you
				rebuild a sibling and re-open this panel.
			</p>
			{#if compareOpen}
				<div class="mb-2 flex flex-wrap items-center gap-1 text-[10px]">
					<span class="text-fg-subtle">Quick proofs:</span>
					{#each ['Hamburgefonstiv', 'HOHOHO nonono', 'AVAVAV ToToTo', 'The quick brown fox', 'abcdefghijklmnopqrstuvwxyz', 'Wafer pillow kerning blot'] as preset (preset)}
						<button
							type="button"
							onclick={() => (compareText = preset)}
							class="rounded border border-border bg-surface px-1.5 py-0.5 text-fg-muted hover:border-accent hover:text-accent"
							title="Replace text with this proof string"
						>
							{preset.length > 24 ? preset.slice(0, 24) + '…' : preset}
						</button>
					{/each}
				</div>
				<div class="mb-3 grid grid-cols-[1fr_auto] items-center gap-2">
					<input
						bind:value={compareText}
						placeholder="Hamburgefonstiv"
						class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-[13px] text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
					/>
					<label class="flex items-center gap-2 text-[11px] text-fg-muted">
						<span>Size</span>
						<input
							type="range"
							min="16"
							max="120"
							step="1"
							bind:value={compareSize as number}
							class="w-24 accent-accent"
						/>
						<span class="w-10 text-right font-mono text-[10px]" data-numeric>{compareSize}px</span>
					</label>
				</div>
				<div class="grid gap-3 rounded-md border border-border bg-canvas p-4">
					{#each siblings as s (s.id)}
						{@const family = siblingFonts.get(s.id)}
						<div>
							<div
								class="mb-1 flex items-baseline justify-between gap-2 text-[10px] font-mono text-fg-subtle"
								data-numeric
							>
								<span>{s.name}</span>
								<span>
									{#if s.familyAxes?.wght}wght {s.familyAxes.wght}{/if}{#if s.familyAxes?.ital} · italic{/if}
								</span>
							</div>
							<div
								class="text-fg"
								style="font-family: '{family}', sans-serif; font-size: {compareSize}px; line-height: 1.2;"
							>
								{compareText || ' '}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</Panel>
	{/if}

	<Panel>
		<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			Add sibling style
		</h2>
		<p class="mb-3 text-[12px] text-fg-subtle">
			Clones an existing sibling to seed the new style — keeps UPM, vertical metrics, kerning
			class structure, and anchors; resets all glyph contours to empty so you draw the new
			style fresh.
		</p>
		<div class="mb-3 inline-flex rounded-md border border-border bg-surface p-0.5">
			<button
				type="button"
				onclick={() => (newSlantMode = 'blank')}
				class="rounded px-2 py-0.5 text-[11px] {newSlantMode === 'blank'
					? 'bg-accent-soft text-accent-strong'
					: 'text-fg-muted hover:text-fg'}"
				title="Start from empty glyph contours"
			>
				Blank clone
			</button>
			<button
				type="button"
				onclick={() => (newSlantMode = 'slant')}
				class="rounded px-2 py-0.5 text-[11px] {newSlantMode === 'slant'
					? 'bg-accent-soft text-accent-strong'
					: 'text-fg-muted hover:text-fg'}"
				title="Pre-fill outlines by slanting the template — useful for italic siblings"
			>
				Slant from template
			</button>
		</div>
		{#if newSlantMode === 'slant'}
			<div class="mb-3 rounded-md border border-dashed border-accent/30 bg-accent-soft/30 px-3 py-2 text-[12px]">
				<label class="flex items-center gap-2">
					<span class="font-medium text-fg-muted">Slant angle</span>
					<input
						type="range"
						min="6"
						max="18"
						step="1"
						bind:value={newSlantDeg as number}
						class="flex-1 accent-accent"
					/>
					<span class="font-mono text-[11px]" data-numeric>{newSlantDeg}°</span>
				</label>
				<p class="mt-1 text-[11px] text-fg-subtle">
					Shears every contour and anchor by <code>tan({newSlantDeg}°)</code> ≈ <span data-numeric>{(Math.tan((newSlantDeg * Math.PI) / 180)).toFixed(3)}</span>.
					Glyphs land as drafts so you can refine. Typical italic = 12°.
				</p>
			</div>
		{/if}

		<div class="mb-3 flex flex-wrap gap-1.5">
			<span class="text-[11px] font-medium text-fg-muted">Preset:</span>
			<button
				type="button"
				onclick={presetItalic}
				class="rounded-md border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium hover:border-accent hover:text-accent"
			>
				Italic
			</button>
			<button
				type="button"
				onclick={presetBold}
				class="rounded-md border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium hover:border-accent hover:text-accent"
			>
				Bold
			</button>
			<button
				type="button"
				onclick={presetBoldItalic}
				class="rounded-md border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium hover:border-accent hover:text-accent"
			>
				Bold Italic
			</button>
			<button
				type="button"
				onclick={presetLight}
				class="rounded-md border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium hover:border-accent hover:text-accent"
			>
				Light
			</button>
		</div>
		<form onsubmit={handleCreateSibling} class="grid gap-3">
			<!-- Identity row: template + style name. Each takes half. -->
			<div class="grid gap-2 md:grid-cols-2">
				<Field label="Template (clone from)">
					<select
						bind:value={templateId}
						class="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-[12px] text-fg outline-none focus:border-accent"
					>
						{#each siblings as s (s.id)}
							<option value={s.id}>{s.name}</option>
						{/each}
						{#if siblings.length === 0}
							<option value="">No siblings — link an existing project first</option>
						{/if}
					</select>
				</Field>
				<Field label="Style name">
					<Input bind:value={newStyleName} placeholder="Italic" />
				</Field>
			</div>
			<!-- Position row: the three axis values, tight horizontal group. -->
			<div class="grid gap-2 md:grid-cols-[1fr_1fr_1fr]">
				<Field label="wght (100–900)">
					<Input type="number" bind:value={newWght as number} />
				</Field>
				<Field label="wdth (% normal)">
					<Input type="number" bind:value={newWdth as number} />
				</Field>
				<Field label="ital">
					<select
						bind:value={newItal}
						class="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-[12px] text-fg outline-none focus:border-accent"
					>
						<option value={0}>0 — upright</option>
						<option value={1}>1 — italic</option>
					</select>
				</Field>
			</div>
			<div>
				<Button type="submit" density="sm" disabled={!templateId}>
					{#snippet icon()}<Plus class="size-3.5" />{/snippet}
					Create sibling
				</Button>
			</div>
		</form>
	</Panel>

	</div>
</div>
