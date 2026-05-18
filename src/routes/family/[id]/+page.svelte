<script lang="ts">
	import { goto } from '$app/navigation';
	import { toast } from '$lib/stores/toast.svelte';
	import {
		createSibling,
		deleteFamily,
		loadFamily,
		listSiblings,
		propagateFamilyMetadata,
		saveFamily,
		unlinkProjectFromFamily,
		type FamilyIndexEntry
	} from '$lib/font/family';
	import { loadProject } from '$lib/font/project';
	import type { Family, FamilyAxes } from '$lib/font/types';
	import Panel from '$lib/ui/Panel.svelte';
	import Field from '$lib/ui/Field.svelte';
	import Input from '$lib/ui/Input.svelte';
	import Button from '$lib/ui/Button.svelte';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Layers from '@lucide/svelte/icons/layers';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Unlink from '@lucide/svelte/icons/unlink';

	type SiblingEntry = Awaited<ReturnType<typeof listSiblings>>[number];
	let { data }: { data: { family: Family; siblings: SiblingEntry[] } } = $props();

	// svelte-ignore state_referenced_locally
	let family = $state<Family>($state.snapshot(data.family));
	// svelte-ignore state_referenced_locally
	let siblings = $state<SiblingEntry[]>([...data.siblings]);
	let saving = $state(false);

	const refresh = async () => {
		const f = await loadFamily(data.family.id);
		if (f) family = f;
		siblings = await listSiblings(data.family.id);
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
			wdth: newWdth
		};
		const sib = await createSibling(templateId, {
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
		goto(`/project/${sib.id}/edit`);
	};

	const handleUnlinkSibling = async (id: string) => {
		const ok = confirm('Remove this style from the family? The project itself is kept.');
		if (!ok) return;
		await unlinkProjectFromFamily(id);
		await refresh();
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
		<button
			type="button"
			onclick={handleDeleteFamily}
			class="rounded-md border border-border bg-surface px-2 py-1.5 text-[12px] text-fg-muted hover:border-danger hover:text-danger"
		>
			Delete family
		</button>
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
		<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			Add sibling style
		</h2>
		<p class="mb-3 text-[12px] text-fg-subtle">
			Clones an existing sibling to seed the new style — keeps UPM, vertical metrics, kerning
			class structure, and anchors; resets all glyph contours to empty so you draw the new
			style fresh.
		</p>
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
