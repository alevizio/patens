<script lang="ts">
	import { goto } from '$app/navigation';
	import { toast } from '$lib/stores/toast.svelte';
	import {
		createSibling,
		createSlantedSibling,
		deleteFamily,
		findRegularSibling,
		loadFamily,
		listSiblings,
		propagateFamilyMetadata,
		propagateKerningClasses,
		saveFamily,
		unlinkProjectFromFamily
	} from '$lib/font/family';
	import { loadProject } from '$lib/font/project';
	import { downloadFamilyBundle } from '$lib/font/family-export';
	import { auditFamily, type FamilyIssue } from '$lib/font/family-audit';
	import type { Family, FamilyAxes } from '$lib/font/types';
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

	const refresh = async () => {
		const f = await loadFamily(data.family.id);
		if (f) family = f;
		siblings = await listSiblings(data.family.id);
		await refreshAudit();
	};

	const saveFamilyEdits = async () => {
		if (saving) return;
		saving = true;
		try {
			await saveFamily(family);
			const count = await propagateFamilyMetadata(family.id);
			toast.success(`Family saved · propagated to ${count} sibling${count === 1 ? '' : 's'}.`);
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

	let regularClassCount = $state(0);
	$effect(() => {
		void siblings.length;
		(async () => {
			const reg = await findRegularSibling(data.family.id);
			if (!reg) {
				regularClassCount = 0;
				return;
			}
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
		goto('/');
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
		href="/"
		class="mb-6 inline-flex items-center gap-1.5 text-[12px] text-fg-muted hover:text-fg"
	>
		<ArrowLeft class="size-3.5" />
		Back to projects
	</a>

	<header class="mb-8 flex items-start gap-3">
		<div class="mt-1 flex size-9 items-center justify-center rounded-md bg-accent-soft text-accent">
			<Layers class="size-4" />
		</div>
		<div class="flex-1">
			<div class="text-[10px] uppercase tracking-wider text-fg-subtle">Family</div>
			<input
				class="block w-full border-0 bg-transparent p-0 text-2xl font-semibold tracking-tight text-fg outline-none focus:ring-1 focus:ring-accent"
				bind:value={family.name}
				onblur={saveFamilyEdits}
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

	<Panel>
		<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			Family-level metadata
		</h2>
		<div class="grid gap-2 md:grid-cols-3">
			<Field label="Designer">
				<Input bind:value={family.designer as string} onblur={saveFamilyEdits} placeholder="Your Name" />
			</Field>
			<Field label="Copyright">
				<Input
					bind:value={family.copyright as string}
					onblur={saveFamilyEdits}
					placeholder="© 2026 …"
				/>
			</Field>
			<Field label="License">
				<Input
					bind:value={family.license as string}
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

	<Panel class="mt-6">
		<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			Siblings
		</h2>
		{#if siblings.length === 0}
			<p class="text-[12px] text-fg-subtle">
				No siblings yet. Use the form below to clone an existing project into this family,
				or visit any project and link it from its Stats popover (coming next).
			</p>
		{:else}
			<ul class="grid gap-2 md:grid-cols-2">
				{#each siblings as s (s.id)}
					{@const chips = axisChips(s.familyAxes)}
					<li
						class="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border border-border bg-surface-2/40 p-3"
					>
						<div
							class="flex size-12 items-center justify-center overflow-hidden rounded bg-canvas"
						>
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
								<span class="text-2xl font-mono text-fg-muted">H</span>
							{/if}
						</div>
						<div class="min-w-0">
							<a
								href="/project/{s.id}/edit"
								class="block truncate text-[13px] font-semibold text-fg hover:text-accent"
							>
								{s.name}
							</a>
							<div class="flex flex-wrap gap-1 mt-0.5">
								{#each chips as c (c)}
									<span
										class="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-fg-muted"
										data-numeric
									>
										{c}
									</span>
								{/each}
								{#if chips.length === 0}
									<span class="text-[10px] text-fg-subtle">no familyAxes set</span>
								{/if}
							</div>
						</div>
						<button
							type="button"
							onclick={() => handleUnlinkSibling(s.id)}
							class="rounded p-1 text-fg-subtle hover:bg-warn/10 hover:text-warn"
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

	<Panel class="mt-6">
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
		<Panel class="mt-6">
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
		</Panel>
	{/if}

	<Panel class="mt-6">
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
					? 'bg-accent-soft text-accent'
					: 'text-fg-muted hover:text-fg'}"
				title="Start from empty glyph contours"
			>
				Blank clone
			</button>
			<button
				type="button"
				onclick={() => (newSlantMode = 'slant')}
				class="rounded px-2 py-0.5 text-[11px] {newSlantMode === 'slant'
					? 'bg-accent-soft text-accent'
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
		<form onsubmit={handleCreateSibling} class="grid gap-2 md:grid-cols-[1fr_1fr_auto_auto_auto]">
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
			<Field label="wght">
				<Input type="number" bind:value={newWght as number} />
			</Field>
			<Field label="wdth">
				<Input type="number" bind:value={newWdth as number} />
			</Field>
			<Field label="ital">
				<select
					bind:value={newItal}
					class="rounded-md border border-border bg-surface px-2 py-1.5 text-[12px] text-fg outline-none focus:border-accent"
				>
					<option value={0}>0 (upright)</option>
					<option value={1}>1 (italic)</option>
				</select>
			</Field>
			<div class="md:col-span-5">
				<Button type="submit" density="sm" disabled={!templateId}>
					{#snippet icon()}<Plus class="size-3.5" />{/snippet}
					Create sibling
				</Button>
			</div>
		</form>
	</Panel>
</div>
