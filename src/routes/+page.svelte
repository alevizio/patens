<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		createProject,
		deleteProject,
		duplicateProject,
		listProjects,
		saveProject,
		type ProjectIndexEntry
	} from '$lib/font/project';
	import Button from '$lib/ui/Button.svelte';
	import Field from '$lib/ui/Field.svelte';
	import Input from '$lib/ui/Input.svelte';
	import Panel from '$lib/ui/Panel.svelte';
	import { importFromOtf } from '$lib/font/import';
	import { ensurePython, ufoZipToProject } from '$lib/font/python';
	import { importFromUrl, STARTER_FONTS } from '$lib/font/url-import';
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
	let loading = $state(true);
	let creating = $state(false);
	let importing = $state(false);
	let ufoImporting = $state(false);
	let urlImporting = $state(false);
	let importError = $state<string | null>(null);
	let importWarning = $state<string | null>(null);
	let newName = $state('');
	let newFamily = $state('');
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
				familyName: newFamily.trim() || trimmed
			});
			await saveProject(project);
			await goto(`/project/${project.id}/edit`);
		} finally {
			creating = false;
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

<div class="mx-auto max-w-5xl px-6 py-12 sm:py-20">
	<header class="mb-12 flex flex-col gap-3">
		<div
			class="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[12px] font-medium text-fg-muted"
		>
			<Type class="size-3.5" />
			Font Studio
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
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-sm font-semibold tracking-wide text-fg-muted uppercase">Your fonts</h2>
				{#if !loading}
					<span class="text-[12px] text-fg-subtle" data-numeric>
						{projects.length} project{projects.length === 1 ? '' : 's'}
					</span>
				{/if}
			</div>

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
			{:else}
				<ul class="grid gap-2">
					{#each projects as p (p.id)}
						<li
							class="group flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2/40 px-4 py-3 transition-colors hover:border-border-strong hover:bg-surface-2"
						>
							<a
								href="/project/{p.id}/edit"
								class="flex min-w-0 flex-1 items-center gap-4"
							>
								<div
									class="flex size-12 shrink-0 items-center justify-center rounded-md bg-fg/5 font-mono text-xl font-semibold text-fg"
								>
									{(p.familyName[0] ?? 'A').toUpperCase()}
								</div>
								<div class="min-w-0 flex-1">
									<div class="truncate text-sm font-medium text-fg">{p.name}</div>
									<div class="truncate text-[12px] text-fg-muted" data-numeric>
										{p.familyName} · {p.glyphCount} drawn · updated {formatRelative(
											p.updatedAt
										)}
									</div>
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
</div>
