<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		createProject,
		deleteProject,
		duplicateProject,
		listProjects,
		saveProject,
		KIND_PRESETS,
		type ProjectKind,
		type ProjectIndexEntry
	} from '$lib/font/project';
	import Button from '$lib/ui/Button.svelte';
	import Field from '$lib/ui/Field.svelte';
	import Input from '$lib/ui/Input.svelte';
	import Panel from '$lib/ui/Panel.svelte';
	import { importFromOtf } from '$lib/font/import';
	import { ensurePython, ufoZipToProject } from '$lib/font/python';
	import { importFromUrl, STARTER_FONTS } from '$lib/font/url-import';
	import { settings } from '$lib/stores/settings.svelte';
	import WelcomeDialog from '$lib/ui/WelcomeDialog.svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import Copy from '@lucide/svelte/icons/copy';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import PenTool from '@lucide/svelte/icons/pen-tool';
	import Type from '@lucide/svelte/icons/type';
	import UploadCloud from '@lucide/svelte/icons/upload-cloud';
	import FileText from '@lucide/svelte/icons/file-text';
	import Link from '@lucide/svelte/icons/link';
	import Library from '@lucide/svelte/icons/library';

	// Well-known OFL families whose Reserved Font Names must be changed in derivative work.
	const OFL_RESERVED_FAMILIES = [
		'Inter',
		'Roboto',
		'Open Sans',
		'Source Sans',
		'Source Code',
		'Source Serif',
		'Noto',
		'Public Sans',
		'JetBrains Mono',
		'Fira Sans',
		'Fira Code',
		'IBM Plex',
		'Work Sans',
		'Lato',
		'Montserrat',
		'Recursive'
	];

	let projects = $state<ProjectIndexEntry[]>([]);
	let projectQuery = $state('');
	let loading = $state(true);

	const filteredProjects = $derived.by(() => {
		const q = projectQuery.trim().toLowerCase();
		if (!q) return projects;
		return projects.filter(
			(p) =>
				p.name.toLowerCase().includes(q) || p.familyName.toLowerCase().includes(q)
		);
	});
	let creating = $state(false);
	let importing = $state(false);
	let ufoImporting = $state(false);
	let urlImporting = $state(false);
	let importError = $state<string | null>(null);
	let importWarning = $state<string | null>(null);
	let newName = $state('');
	let newFamily = $state('');
	let newKind = $state<ProjectKind | undefined>(undefined);
	let urlInput = $state('');

	const refresh = async () => {
		projects = await listProjects();
		loading = false;
	};
	refresh();

	const handleCreate = async (e: Event) => {
		e.preventDefault();
		const trimmed = newName.trim();
		if (!trimmed || creating) return;
		creating = true;
		try {
			const project = createProject({
				name: trimmed,
				familyName: newFamily.trim() || trimmed,
				kind: newKind
			});
			await saveProject(project);
			await goto(`/project/${project.id}/edit`);
		} finally {
			creating = false;
		}
	};

	type QuickPreset = {
		id: string;
		label: string;
		kind: ProjectKind;
		intent: string;
		useCases: import('$lib/font/types').UseCase[];
	};
	const QUICK_PRESETS: QuickPreset[] = [
		{
			id: 'web-ui',
			label: 'Web UI sans',
			kind: 'ui',
			intent:
				'A neutral geometric sans for product UI at 12–28px, with strong digit + punctuation legibility.',
			useCases: ['web-ui', 'body-text']
		},
		{
			id: 'display',
			label: 'Display',
			kind: 'display',
			intent: 'A high-contrast display face for headlines, posters, and brand moments.',
			useCases: ['display', 'branding']
		},
		{
			id: 'mono',
			label: 'Code monospace',
			kind: 'mono',
			intent:
				'A monospaced face for editors and terminals; equal advance widths, disambiguated 0/O and 1/l/I.',
			useCases: ['code', 'data-tables']
		},
		{
			id: 'editorial',
			label: 'Editorial serif',
			kind: 'text',
			intent:
				'A reading-first serif for long-form editorial — balanced contrast, comfortable rhythm at 14–18px.',
			useCases: ['body-text', 'editorial']
		}
	];

	let presetBusy = $state<string | null>(null);
	const createFromPreset = async (p: QuickPreset) => {
		if (presetBusy) return;
		presetBusy = p.id;
		try {
			const project = createProject({
				name: p.label,
				familyName: p.label,
				kind: p.kind
			});
			project.brief = { intent: p.intent, useCases: p.useCases };
			await saveProject(project);
			await goto(`/project/${project.id}/brief`);
		} finally {
			presetBusy = null;
		}
	};

	const handleDuplicate = async (id: string) => {
		await duplicateProject(id);
		await refresh();
	};

	const handleDelete = async (entry: ProjectIndexEntry) => {
		const ok = confirm(`Delete "${entry.name}"? This cannot be undone.`);
		if (!ok) return;
		await deleteProject(entry.id);
		await refresh();
	};

	const checkReservedName = (family: string): string | null => {
		const trimmed = family.trim();
		const hit = OFL_RESERVED_FAMILIES.find((name) =>
			trimmed.toLowerCase().includes(name.toLowerCase())
		);
		if (!hit) return null;
		return `"${trimmed}" looks like a derivative of the OFL-licensed "${hit}" family. The OFL requires you to change the family name in derivative work before redistributing. Rename the project in Export → Metadata before sharing.`;
	};

	const handleImport = async (ev: Event) => {
		const input = ev.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		importing = true;
		importError = null;
		importWarning = null;
		try {
			const { project } = await importFromOtf(file);
			importWarning = checkReservedName(project.metadata.familyName);
			await saveProject(project);
			if (importWarning) {
				// Surface warning before navigating away
				alert(importWarning);
			}
			await goto(`/project/${project.id}/edit`);
		} catch (err) {
			importError = err instanceof Error ? err.message : 'Could not read this font file.';
		} finally {
			importing = false;
			input.value = '';
		}
	};

	const handleUrlImport = async (url: string) => {
		if (!url.trim() || urlImporting) return;
		urlImporting = true;
		importError = null;
		importWarning = null;
		try {
			const { project } = await importFromUrl(url);
			importWarning = checkReservedName(project.metadata.familyName);
			await saveProject(project);
			if (importWarning) alert(importWarning);
			await goto(`/project/${project.id}/edit`);
		} catch (err) {
			importError = err instanceof Error ? err.message : 'Could not fetch font from URL';
		} finally {
			urlImporting = false;
		}
	};

	/**
	 * Route a dropped or picked File to the right importer based on extension.
	 * Same code path the home-page upload buttons use.
	 */
	const importFile = async (file: File) => {
		const name = file.name.toLowerCase();
		importError = null;
		importWarning = null;
		try {
			if (name.endsWith('.zip') || name.endsWith('.ufo.zip')) {
				ufoImporting = true;
				await ensurePython();
				const buffer = await file.arrayBuffer();
				const projectJson = await ufoZipToProject(buffer);
				const parsed = JSON.parse(projectJson);
				const ts = new Date().toISOString();
				const project: Parameters<typeof saveProject>[0] = {
					...parsed,
					id: crypto.randomUUID(),
					name: `${parsed.metadata?.familyName ?? 'Untitled'} (UFO)`,
					createdAt: ts,
					updatedAt: ts
				};
				importWarning = checkReservedName(project.metadata.familyName);
				await saveProject(project);
				if (importWarning) alert(importWarning);
				await goto(`/project/${project.id}/edit`);
			} else {
				importing = true;
				const { project } = await importFromOtf(file);
				importWarning = checkReservedName(project.metadata.familyName);
				await saveProject(project);
				if (importWarning) alert(importWarning);
				await goto(`/project/${project.id}/edit`);
			}
		} catch (err) {
			importError = err instanceof Error ? err.message : 'Could not read this file.';
		} finally {
			importing = false;
			ufoImporting = false;
		}
	};

	let dragActive = $state(false);
	let dragCounter = 0;
	const onDragEnter = (ev: DragEvent) => {
		ev.preventDefault();
		dragCounter++;
		dragActive = true;
	};
	const onDragLeave = (ev: DragEvent) => {
		ev.preventDefault();
		dragCounter--;
		if (dragCounter <= 0) dragActive = false;
	};
	const onDragOver = (ev: DragEvent) => {
		ev.preventDefault();
	};
	const onDrop = async (ev: DragEvent) => {
		ev.preventDefault();
		dragActive = false;
		dragCounter = 0;
		const file = ev.dataTransfer?.files?.[0];
		if (file) await importFile(file);
	};

	const handleUfoImport = async (ev: Event) => {
		const input = ev.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		ufoImporting = true;
		importError = null;
		importWarning = null;
		try {
			await ensurePython();
			const buffer = await file.arrayBuffer();
			const projectJson = await ufoZipToProject(buffer);
			const parsed = JSON.parse(projectJson);
			const ts = new Date().toISOString();
			const project: Parameters<typeof saveProject>[0] = {
				...parsed,
				id: crypto.randomUUID(),
				name: `${parsed.metadata?.familyName ?? 'Untitled'} (UFO)`,
				createdAt: ts,
				updatedAt: ts
			};
			importWarning = checkReservedName(project.metadata.familyName);
			await saveProject(project);
			if (importWarning) alert(importWarning);
			await goto(`/project/${project.id}/edit`);
		} catch (err) {
			importError = err instanceof Error ? err.message : 'Could not read UFO archive.';
		} finally {
			ufoImporting = false;
			input.value = '';
		}
	};

	const formatRelative = (iso: string): string => {
		const then = new Date(iso).getTime();
		const diff = Date.now() - then;
		const min = Math.round(diff / 60000);
		if (min < 1) return 'just now';
		if (min < 60) return `${min}m ago`;
		const hr = Math.round(min / 60);
		if (hr < 24) return `${hr}h ago`;
		const day = Math.round(hr / 24);
		if (day < 7) return `${day}d ago`;
		return new Date(iso).toLocaleDateString();
	};
</script>

<div
	class="relative mx-auto max-w-5xl px-6 py-12 sm:py-20"
	ondragenter={onDragEnter}
	ondragleave={onDragLeave}
	ondragover={onDragOver}
	ondrop={onDrop}
	role="application"
>
	<header class="mb-12 flex flex-col gap-3">
		<div class="flex items-center justify-between gap-2">
			<div
				class="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[12px] font-medium text-fg-muted"
			>
				<Type class="size-3.5" />
				Font Studio
			</div>
			<a
				href="/learn"
				class="rounded-full border border-border bg-surface px-3 py-1 text-[12px] font-medium text-fg-muted hover:border-accent hover:text-accent"
			>
				Learn the craft →
			</a>
		</div>
		<h1 class="text-4xl font-semibold tracking-tight sm:text-5xl">
			Design your own typeface,<br />
			<span class="text-fg-muted">one glyph at a time.</span>
		</h1>
		<p class="max-w-xl text-base text-fg-muted">
			Sketch with a pen or trackpad, vectorize, space, kern, and export a real OTF — all in
			your browser. Every project is saved locally.
		</p>
	</header>

	<div class="grid gap-6 lg:grid-cols-[1fr_320px]">
		<Panel padding="md">
			<div class="mb-3 flex items-center justify-between gap-3">
				<h2 class="text-sm font-semibold tracking-wide text-fg-muted uppercase">Your fonts</h2>
				{#if !loading}
					<span class="text-[12px] text-fg-subtle" data-numeric>
						{filteredProjects.length} of {projects.length}
					</span>
				{/if}
			</div>
			{#if projects.length > 6}
				<input
					bind:value={projectQuery}
					placeholder="Filter by name or family…"
					class="mb-3 block w-full rounded-md border border-border bg-surface px-3 py-1.5 text-[13px] text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
				/>
			{/if}

			{#if loading}
				<div class="grid gap-2">
					{#each [1, 2, 3] as i (i)}
						<div class="h-16 animate-pulse rounded-lg bg-surface-2"></div>
					{/each}
				</div>
			{:else if projects.length === 0}
				<div class="rounded-lg border border-dashed border-border-strong/50 bg-surface-2/50 p-10 text-center">
					<PenTool class="mx-auto mb-3 size-8 text-fg-subtle" />
					<p class="text-sm text-fg-muted">No fonts yet. Create one to begin.</p>
				</div>
			{:else if filteredProjects.length === 0}
				<div class="rounded-lg border border-dashed border-border-strong/50 bg-surface-2/50 p-6 text-center text-[12px] text-fg-muted">
					No projects match "{projectQuery}".
				</div>
			{:else}
				<ul class="grid gap-2">
					{#each filteredProjects as p (p.id)}
						<li
							class="group flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2/40 px-4 py-3 transition-colors hover:border-border-strong hover:bg-surface-2"
						>
							<a
								href="/project/{p.id}/edit"
								class="flex min-w-0 flex-1 items-center gap-4"
							>
								<div
									class="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-fg/5 font-mono text-xl font-semibold text-fg"
								>
									{#if p.thumbnail}
										<svg
											viewBox={p.thumbnail.viewBox}
											width="44"
											height="44"
											preserveAspectRatio="xMidYMid meet"
											style="transform: scaleY(-1);"
											aria-hidden="true"
										>
											<path
												d={p.thumbnail.path}
												fill="currentColor"
												fill-rule="evenodd"
											/>
										</svg>
									{:else}
										{(p.familyName[0] ?? 'A').toUpperCase()}
									{/if}
								</div>
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<div class="truncate text-sm font-medium text-fg">{p.name}</div>
										{#if (p.briefPct ?? 0) > 0}
											<span
												class="rounded px-1.5 py-0.5 font-mono text-[10px] font-medium {(p.briefPct ?? 0) >= 67
													? 'bg-success/15 text-success'
													: (p.briefPct ?? 0) >= 33
														? 'bg-warn/15 text-warn'
														: 'bg-fg/10 text-fg-subtle'}"
												title={(p.briefMissing ?? []).length === 0
													? 'Brief complete'
													: `Missing: ${(p.briefMissing ?? []).join(', ')}`}
												data-numeric
											>
												Brief {p.briefPct}%
											</span>
										{/if}
										{#if (p.editsToday ?? 0) > 0}
											<span
												class="rounded bg-accent/15 px-1.5 py-0.5 font-mono text-[10px] font-medium text-accent"
												title="Glyphs edited in last 24h{(p.editsThisWeek ?? 0) > (p.editsToday ?? 0)
													? ` · ${p.editsThisWeek} this week`
													: ''}"
												data-numeric
											>
												{p.editsToday} today
											</span>
										{/if}
									</div>
									<div class="truncate text-[12px] text-fg-muted" data-numeric>
										{p.familyName} · {p.glyphCount} drawn · updated {formatRelative(
											p.updatedAt
										)}
									</div>
									{#if p.tagline}
										<div class="mt-0.5 truncate text-[11px] italic text-fg-subtle">
											{p.tagline}
										</div>
									{/if}
								</div>
							</a>
							<div class="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
								<Button
									variant="ghost"
									density="sm"
									onclick={() => handleDuplicate(p.id)}
									aria-label="Duplicate"
								>
									{#snippet icon()}<Copy class="size-3.5" />{/snippet}
								</Button>
								<Button
									variant="ghost"
									density="sm"
									onclick={() => handleDelete(p)}
									aria-label="Delete"
								>
									{#snippet icon()}<Trash2 class="size-3.5" />{/snippet}
								</Button>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</Panel>

		<div class="grid gap-4">
			<Panel padding="md">
				<h2 class="mb-2 text-sm font-semibold tracking-wide text-fg-muted uppercase">
					Quick start
				</h2>
				<p class="mb-3 text-[12px] text-fg-subtle">
					Pick a use case and skip straight to the Brief tab with intent + use cases
					pre-filled.
				</p>
				<div class="grid grid-cols-2 gap-1.5">
					{#each QUICK_PRESETS as p (p.id)}
						<button
							type="button"
							onclick={() => createFromPreset(p)}
							disabled={presetBusy !== null}
							class="rounded-md border border-border bg-surface-2/40 px-2.5 py-2 text-left transition-colors hover:border-accent hover:bg-accent-soft/40 disabled:opacity-60"
						>
							<div class="text-[12px] font-medium text-fg">{p.label}</div>
							<div class="mt-0.5 line-clamp-2 text-[10px] text-fg-subtle">
								{p.intent}
							</div>
						</button>
					{/each}
				</div>
			</Panel>

			<Panel padding="md">
				<h2 class="mb-4 text-sm font-semibold tracking-wide text-fg-muted uppercase">
					New font
				</h2>
				<form onsubmit={handleCreate} class="grid gap-4">
					<Field label="Project name" required>
						<Input
							bind:value={newName}
							placeholder="e.g. Personal Sans"
							required
							maxlength={60}
						/>
					</Field>
					<Field label="Font family name" hint="Defaults to project name">
						<Input
							bind:value={newFamily}
							placeholder="e.g. Personal Sans"
							maxlength={60}
						/>
					</Field>
					<div>
						<div class="mb-1.5 text-[13px] font-medium text-fg-muted">Kind</div>
						<div class="grid grid-cols-4 gap-1.5">
							{#each Object.entries(KIND_PRESETS) as [id, preset] (id)}
								<button
									type="button"
									onclick={() => (newKind = newKind === id ? undefined : (id as ProjectKind))}
									class="rounded-md border px-2 py-1.5 text-[12px] font-medium transition-colors {newKind ===
									id
										? 'border-accent bg-accent-soft text-accent'
										: 'border-border bg-surface-2/40 text-fg-muted hover:border-border-strong hover:text-fg'}"
									title={preset.description}
								>
									{preset.label}
								</button>
							{/each}
						</div>
						{#if newKind}
							<div class="mt-1.5 text-[11px] text-fg-subtle">
								{KIND_PRESETS[newKind].description}
							</div>
						{/if}
					</div>
					<Button type="submit" loading={creating} disabled={!newName.trim()} fullWidth>
						{#snippet icon()}<Plus class="size-4" />{/snippet}
						{creating ? 'Creating…' : 'Create font'}
					</Button>
				</form>
			</Panel>

			<Panel padding="md">
				<h2 class="mb-2 text-sm font-semibold tracking-wide text-fg-muted uppercase">
					Start from a font
				</h2>
				<p class="mb-3 text-[12px] text-fg-subtle">
					Import an OTF/TTF to remix, or a UFO 3 archive to round-trip with Glyphs /
					RoboFont / FontLab.
				</p>
				<label
					class="mb-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong/50 bg-surface-2/40 px-3 py-3 text-sm font-medium text-fg-muted transition-colors hover:border-accent hover:bg-accent-soft/40 hover:text-accent"
				>
					<UploadCloud class="size-4" />
					{importing ? 'Importing…' : 'Choose .otf / .ttf'}
					<input
						type="file"
						accept=".otf,.ttf,font/otf,font/ttf,application/font-sfnt"
						class="sr-only"
						onchange={handleImport}
						disabled={importing}
					/>
				</label>
				<label
					class="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong/50 bg-surface-2/40 px-3 py-3 text-sm font-medium text-fg-muted transition-colors hover:border-accent hover:bg-accent-soft/40 hover:text-accent"
				>
					<FileText class="size-4" />
					{ufoImporting ? 'Loading Python…' : 'Choose .ufo.zip'}
					<input
						type="file"
						accept=".zip,application/zip"
						class="sr-only"
						onchange={handleUfoImport}
						disabled={ufoImporting}
					/>
				</label>
				{#if importError}
					<div class="mt-2 rounded-md bg-danger/10 px-3 py-2 text-[12px] text-danger">
						{importError}
					</div>
				{/if}

				<div class="mt-4 grid gap-2">
					<div class="text-[11px] font-medium tracking-wider text-fg-subtle uppercase">
						Or from a URL
					</div>
					<form
						class="flex items-center gap-2"
						onsubmit={(e) => {
							e.preventDefault();
							handleUrlImport(urlInput);
						}}
					>
						<div class="relative flex-1">
							<Link
								class="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-fg-subtle"
							/>
							<Input
								bind:value={urlInput}
								placeholder="GitHub URL or direct .otf/.ttf/.woff2/.ufo.zip"
								density="sm"
								class="pl-8"
								disabled={urlImporting}
							/>
						</div>
						<Button
							type="submit"
							density="sm"
							loading={urlImporting}
							disabled={!urlInput.trim() || urlImporting}
						>
							{urlImporting ? 'Fetching…' : 'Fetch'}
						</Button>
					</form>
				</div>

				<div class="mt-4 grid gap-2">
					<div
						class="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wider text-fg-subtle uppercase"
					>
						<Library class="size-3" /> Starter library
					</div>
					<div class="grid grid-cols-2 gap-1.5">
						{#each STARTER_FONTS as starter (starter.id)}
							<button
								type="button"
								class="group rounded-md border border-border bg-surface-2/40 px-2.5 py-2 text-left transition-colors hover:border-accent hover:bg-accent-soft/40 disabled:opacity-60"
								disabled={urlImporting}
								onclick={() => handleUrlImport(starter.url)}
								title={starter.url}
							>
								<div class="text-[12px] font-medium text-fg">{starter.label}</div>
								<div class="truncate text-[10px] text-fg-subtle">{starter.description}</div>
							</button>
						{/each}
					</div>
				</div>
			</Panel>
		</div>
	</div>

	{#if dragActive}
		<div
			class="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-accent-soft/95 backdrop-blur-sm"
		>
			<div class="text-center">
				<UploadCloud class="mx-auto mb-3 size-16 text-accent" />
				<div class="text-2xl font-semibold text-accent">Drop to import</div>
				<div class="mt-1 text-sm text-fg-muted">
					Accepts .otf · .ttf · .woff2 · .ufo.zip
				</div>
			</div>
		</div>
	{/if}

	<WelcomeDialog
		open={!settings.welcomeDismissed}
		onclose={() => settings.dismissWelcome()}
	/>
</div>
