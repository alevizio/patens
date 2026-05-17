<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { STANDARD_AXES } from '$lib/font/types';
	import Panel from '$lib/ui/Panel.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Field from '$lib/ui/Field.svelte';
	import Input from '$lib/ui/Input.svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Sliders from '@lucide/svelte/icons/sliders-horizontal';
	import Layers from '@lucide/svelte/icons/layers';
	import Tag from '@lucide/svelte/icons/tag';

	const project = $derived(projectStore.project);

	let newMasterName = $state('Bold');
	let newMasterLocation = $state<Record<string, number>>({});

	const defaultLocation = $derived.by(() => {
		const loc: Record<string, number> = {};
		for (const a of project?.axes ?? []) loc[a.tag] = a.default;
		return loc;
	});

	$effect(() => {
		// Pre-populate new-master location with axis defaults, except for the
		// first axis which gets the max value (the typical "Bold" target).
		const axes = project?.axes ?? [];
		const next: Record<string, number> = {};
		for (let i = 0; i < axes.length; i++) {
			next[axes[i].tag] = i === 0 ? axes[i].maximum : axes[i].default;
		}
		newMasterLocation = next;
	});

	const handleAddAxis = (tag: string) => projectStore.addAxis(tag);

	const handleAddMaster = async () => {
		const trimmed = newMasterName.trim();
		if (!trimmed || (project?.axes ?? []).length === 0) return;
		await projectStore.addMaster(trimmed, { ...newMasterLocation });
		newMasterName = 'Master';
	};

	const COMMON_INSTANCES = [
		{ styleName: 'Thin', wght: 100 },
		{ styleName: 'Light', wght: 300 },
		{ styleName: 'Regular', wght: 400 },
		{ styleName: 'Medium', wght: 500 },
		{ styleName: 'SemiBold', wght: 600 },
		{ styleName: 'Bold', wght: 700 },
		{ styleName: 'Black', wght: 900 }
	];

	const handleAddInstance = (styleName: string, baseLocation: Record<string, number>) => {
		if (!project) return;
		// Fill in any unspecified axes with their defaults
		const loc: Record<string, number> = {};
		for (const a of project.axes ?? []) {
			loc[a.tag] = baseLocation[a.tag] ?? a.default;
		}
		projectStore.upsertInstance({
			id: crypto.randomUUID(),
			familyName: project.metadata.familyName,
			styleName,
			location: loc
		});
	};
</script>

{#if !project}
	<div class="flex h-full items-center justify-center text-fg-muted">Loading…</div>
{:else}
	<div class="h-full overflow-auto">
		<div class="mx-auto flex max-w-5xl flex-col gap-6 p-6">
			<header>
				<h1 class="text-xl font-semibold tracking-tight">Designspace</h1>
				<p class="text-sm text-fg-muted">
					Define axes and masters to make this a variable font. Each additional master is
					interpolated against the default at its axis location.
				</p>
			</header>

			<Panel>
				<h2 class="mb-3 inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					<Sliders class="size-3" /> Axes
				</h2>
				{#if !project.axes || project.axes.length === 0}
					<p class="mb-3 text-sm text-fg-muted">
						No axes yet. Start with Weight or Width — the most widely supported axes.
					</p>
				{:else}
					<div class="mb-3 grid gap-2">
						{#each project.axes as axis (axis.tag)}
							<div
								class="grid grid-cols-[1fr_auto_auto_auto_auto] items-end gap-2 rounded-md border border-border bg-surface-2/40 px-3 py-2.5"
							>
								<div>
									<div class="text-[13px] font-medium text-fg">{axis.name}</div>
									<div class="font-mono text-[11px] text-fg-subtle">{axis.tag}</div>
								</div>
								<Field label="Min">
									<Input
										type="number"
										density="sm"
										value={axis.minimum}
										onchange={(e) =>
											projectStore.updateAxis(axis.tag, { minimum: Number(e.currentTarget.value) })}
									/>
								</Field>
								<Field label="Default">
									<Input
										type="number"
										density="sm"
										value={axis.default}
										onchange={(e) =>
											projectStore.updateAxis(axis.tag, { default: Number(e.currentTarget.value) })}
									/>
								</Field>
								<Field label="Max">
									<Input
										type="number"
										density="sm"
										value={axis.maximum}
										onchange={(e) =>
											projectStore.updateAxis(axis.tag, { maximum: Number(e.currentTarget.value) })}
									/>
								</Field>
								<button
									type="button"
									onclick={() => projectStore.removeAxis(axis.tag)}
									class="self-end rounded p-1.5 text-fg-subtle hover:bg-danger/10 hover:text-danger"
									aria-label="Remove axis {axis.tag}"
								>
									<Trash2 class="size-3.5" />
								</button>
							</div>
						{/each}
					</div>
				{/if}
				<div class="flex flex-wrap items-center gap-2">
					<span class="text-[11px] font-medium text-fg-muted">Add standard axis:</span>
					{#each Object.entries(STANDARD_AXES) as [tag, def] (tag)}
						{@const present = (project.axes ?? []).some((a) => a.tag === tag)}
						<button
							type="button"
							onclick={() => handleAddAxis(tag)}
							disabled={present}
							class="rounded-md border border-dashed border-border-strong/50 bg-transparent px-2 py-1 font-mono text-[11px] text-fg-muted hover:border-accent hover:text-accent disabled:opacity-40"
						>
							+ {tag} ({def.name})
						</button>
					{/each}
				</div>
			</Panel>

			<Panel>
				<h2 class="mb-3 inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					<Layers class="size-3" /> Masters
				</h2>
				<div class="mb-3 grid gap-2">
					<div
						class="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border border-accent/30 bg-accent-soft/30 px-3 py-2.5"
					>
						<div>
							<div class="text-[13px] font-medium text-fg">
								Default <span class="text-fg-muted">— anchored at axis defaults</span>
							</div>
							<div class="font-mono text-[11px] text-fg-subtle" data-numeric>
								{(project.axes ?? []).length === 0
									? 'No axes defined'
									: (project.axes ?? []).map((a) => `${a.tag}=${a.default}`).join(' · ')}
							</div>
						</div>
						<span class="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">
							{Object.keys(project.glyphs).filter((cp) => project.glyphs[Number(cp)].contours.length > 0).length} drawn
						</span>
					</div>
					{#each project.masters ?? [] as m (m.id)}
						<div
							class="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2.5"
						>
							<div>
								<input
									type="text"
									value={m.name}
									oninput={(e) =>
										projectStore.updateMaster(m.id, (mm) => ({
											...mm,
											name: e.currentTarget.value
										}))}
									class="w-full border-0 bg-transparent text-[13px] font-medium text-fg outline-none focus:ring-1 focus:ring-accent"
								/>
								<div class="font-mono text-[11px] text-fg-subtle" data-numeric>
									{Object.entries(m.location).map(([k, v]) => `${k}=${v}`).join(' · ')}
								</div>
							</div>
							<span class="rounded-full bg-fg/10 px-2 py-0.5 text-[10px] font-medium text-fg-muted">
								{Object.keys(m.glyphs).filter((cp) => m.glyphs[Number(cp)].contours.length > 0).length} drawn
							</span>
							<button
								type="button"
								onclick={() => {
									const n = projectStore.syncAllEmptyFromDefault(m.id);
									if (n > 0) toast.success(`Copied ${n} glyph${n === 1 ? '' : 's'} from Default into ${m.name}`);
									else toast.info(`${m.name} already has all the default's drawn glyphs`);
								}}
								class="rounded border border-border bg-surface px-2 py-1 text-[11px] font-medium text-fg-muted hover:border-accent hover:text-accent"
								title="Copy every drawn default glyph into this master (skips glyphs already drawn here)"
							>
								Fill from Default
							</button>
							<button
								type="button"
								onclick={() => {
									if (confirm(`Remove master "${m.name}"? This deletes its glyph data.`))
										projectStore.removeMaster(m.id);
								}}
								class="rounded p-1.5 text-fg-subtle hover:bg-danger/10 hover:text-danger"
								aria-label="Remove master {m.name}"
							>
								<Trash2 class="size-3.5" />
							</button>
						</div>
					{/each}
				</div>

				{#if (project.axes ?? []).length > 0}
					<div class="rounded-md border border-dashed border-border-strong/50 bg-surface-2/40 p-3">
						<div class="mb-2 text-[11px] font-medium text-fg-muted">Add master</div>
						<div class="grid grid-cols-[1fr_auto_auto] items-end gap-2">
							<Field label="Name">
								<Input density="sm" bind:value={newMasterName} placeholder="e.g. Bold" />
							</Field>
							{#each project.axes ?? [] as axis (axis.tag)}
								<Field label={axis.tag}>
									<Input
										type="number"
										density="sm"
										value={newMasterLocation[axis.tag] ?? axis.default}
										onchange={(e) =>
											(newMasterLocation = {
												...newMasterLocation,
												[axis.tag]: Number(e.currentTarget.value)
											})}
									/>
								</Field>
							{/each}
							<Button density="sm" onclick={handleAddMaster}>
								{#snippet icon()}<Plus class="size-3.5" />{/snippet}
								Add master
							</Button>
						</div>
						<div class="mt-2 text-[11px] text-fg-subtle">
							New masters start as a copy of the default master, so they're
							interpolation-compatible from day one.
						</div>
					</div>
				{:else}
					<p class="text-sm text-fg-muted">Add an axis above before creating additional masters.</p>
				{/if}
			</Panel>

			{#if (project.axes ?? []).length > 0}
				<Panel>
					<h2 class="mb-2 inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
						<Tag class="size-3" /> Named instances
					</h2>
					<p class="mb-3 text-[12px] text-fg-subtle">
						Preset axis positions baked into the variable font's <code>fvar</code> table —
						these appear as selectable styles in OS font menus.
					</p>
					{#if (project.instances ?? []).length > 0}
						<ul class="mb-3 grid gap-1">
							{#each project.instances ?? [] as inst (inst.id)}
								<li
									class="flex items-center gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2"
								>
									<div class="flex-1">
										<div class="text-[13px] font-medium text-fg">{inst.styleName}</div>
										<div class="font-mono text-[11px] text-fg-subtle" data-numeric>
											{Object.entries(inst.location).map(([k, v]) => `${k}=${v}`).join(' · ')}
										</div>
									</div>
									<button
										type="button"
										onclick={() => projectStore.removeInstance(inst.id)}
										class="rounded p-1 text-fg-subtle hover:bg-danger/10 hover:text-danger"
										aria-label="Remove instance {inst.styleName}"
									>
										<Trash2 class="size-3.5" />
									</button>
								</li>
							{/each}
						</ul>
					{/if}
					<div class="flex flex-wrap items-center gap-1.5">
						<span class="text-[11px] font-medium text-fg-muted">Add common weight:</span>
						{#each COMMON_INSTANCES as preset (preset.styleName)}
							{@const present = (project.instances ?? []).some(
								(i) => i.styleName === preset.styleName
							)}
							<button
								type="button"
								onclick={() => handleAddInstance(preset.styleName, { wght: preset.wght })}
								disabled={present}
								class="rounded-md border border-dashed border-border-strong/50 bg-transparent px-2 py-1 text-[11px] font-medium text-fg-muted hover:border-accent hover:text-accent disabled:opacity-40"
							>
								+ {preset.styleName} ({preset.wght})
							</button>
						{/each}
					</div>
				</Panel>
			{/if}
		</div>
	</div>
{/if}
