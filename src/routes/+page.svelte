<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		createProject,
		deleteProject,
		duplicateProject,
		listProjects,
		saveProject,
		toggleProjectPin,
		toggleProjectArchive,
		backupAllProjects,
		KIND_PRESETS,
		type ProjectKind,
		type ProjectIndexEntry
	} from '$lib/font/project';
	import Button from '$lib/ui/Button.svelte';
	import Field from '$lib/ui/Field.svelte';
	import Input from '$lib/ui/Input.svelte';
	import Panel from '$lib/ui/Panel.svelte';
	import Sparkline from '$lib/ui/Sparkline.svelte';
	import { importFromOtf } from '$lib/font/import';
	import { ensurePython, ufoZipToProject } from '$lib/font/python';
	import { importFromUrl, STARTER_FONTS } from '$lib/font/url-import';
	import { settings } from '$lib/stores/settings.svelte';
	import WelcomeDialog from '$lib/ui/WelcomeDialog.svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import Copy from '@lucide/svelte/icons/copy';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Pin from '@lucide/svelte/icons/pin';
	import Archive from '@lucide/svelte/icons/archive';
	import ArchiveRestore from '@lucide/svelte/icons/archive-restore';
	import PenTool from '@lucide/svelte/icons/pen-tool';
	import Type from '@lucide/svelte/icons/type';
	import UploadCloud from '@lucide/svelte/icons/upload-cloud';
	import FileText from '@lucide/svelte/icons/file-text';
	import Link from '@lucide/svelte/icons/link';
	import Library from '@lucide/svelte/icons/library';
	import LockIcon from '@lucide/svelte/icons/lock';

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
	let projectSort = $state<'updated' | 'name' | 'brief' | 'glyphs'>('updated');
	let onlyToday = $state(false);
	let showArchived = $state(false);
	let activeTag = $state<string | null>(null);
	let loading = $state(true);
	let searchEl = $state<HTMLInputElement | null>(null);

	const handleGlobalKey = (e: KeyboardEvent) => {
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
			return;
		if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
			e.preventDefault();
			searchEl?.focus();
			searchEl?.select();
		} else if (e.key === 'Escape' && activeTag) {
			activeTag = null;
		}
	};

	const archivedCount = $derived(projects.filter((p) => p.archived).length);

	const allTags = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const p of projects) {
			if (!p.tags) continue;
			for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
		}
		return [...counts.entries()].sort((a, b) => b[1] - a[1]);
	});

	const recentReleases = $derived(
		projects
			.filter((p) => p.lastSealedVersion && p.lastSealedAt)
			.sort((a, b) => (a.lastSealedAt! < b.lastSealedAt! ? 1 : -1))
			.slice(0, 5)
	);

	const todayTotals = $derived.by(() => {
		const visible = projects.filter((p) => !p.archived);
		let activeProjects = 0;
		let editedToday = 0;
		let editedThisWeek = 0;
		for (const p of visible) {
			if ((p.editsToday ?? 0) > 0) activeProjects++;
			editedToday += p.editsToday ?? 0;
			editedThisWeek += p.editsThisWeek ?? 0;
		}
		return { activeProjects, editedToday, editedThisWeek };
	});

	const lastVisitedSlug = (id: string): string => {
		if (typeof localStorage === 'undefined') return 'edit';
		try {
			return localStorage.getItem(`font-studio:last-tab:${id}`) || 'edit';
		} catch {
			return 'edit';
		}
	};

	const continueCandidate = $derived.by(() => {
		const visible = projects.filter((p) => !p.archived);
		if (visible.length === 0) return null;
		const top = [...visible].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0];
		if (!top) return null;
		return { ...top, slug: lastVisitedSlug(top.id) };
	});

	const filteredProjects = $derived.by(() => {
		const q = projectQuery.trim().toLowerCase();
		let filtered = q
			? projects.filter(
					(p) =>
						p.name.toLowerCase().includes(q) || p.familyName.toLowerCase().includes(q)
				)
			: [...projects];
		if (!showArchived) filtered = filtered.filter((p) => !p.archived);
		if (onlyToday) filtered = filtered.filter((p) => (p.editsToday ?? 0) > 0);
		if (activeTag) filtered = filtered.filter((p) => p.tags?.includes(activeTag!));
		let sorted: ProjectIndexEntry[];
		switch (projectSort) {
			case 'name':
				sorted = filtered.sort((a, b) => a.name.localeCompare(b.name));
				break;
			case 'brief':
				sorted = filtered.sort((a, b) => (b.briefPct ?? 0) - (a.briefPct ?? 0));
				break;
			case 'glyphs':
				sorted = filtered.sort((a, b) => b.glyphCount - a.glyphCount);
				break;
			case 'updated':
			default:
				sorted = filtered.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
		}
		return sorted.sort((a, b) => {
			const ap = a.pinned ? 0 : 1;
			const bp = b.pinned ? 0 : 1;
			return ap - bp;
		});
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

	let storage = $state<{ used: number; quota: number } | null>(null);
	$effect(() => {
		if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return;
		navigator.storage
			.estimate()
			.then((est) => {
				storage = {
					used: est.usage ?? 0,
					quota: est.quota ?? 0
				};
			})
			.catch(() => {});
	});

	const formatBytes = (n: number): string => {
		if (n < 1024) return `${n} B`;
		if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
		if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
		return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
	};

	let backingUp = $state(false);
	const handleBackupAll = async () => {
		if (backingUp) return;
		backingUp = true;
		try {
			const data = await backupAllProjects();
			const blob = new Blob([JSON.stringify(data, null, 2)], {
				type: 'application/json'
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			const stamp = new Date().toISOString().slice(0, 10);
			a.download = `font-studio-backup-${stamp}.json`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			setTimeout(() => URL.revokeObjectURL(url), 1000);
		} finally {
			backingUp = false;
		}
	};

	const handleTogglePin = async (id: string) => {
		await toggleProjectPin(id);
		await refresh();
	};

	const handleToggleArchive = async (id: string) => {
		await toggleProjectArchive(id);
		await refresh();
	};

	let menuOpen = $state<{ id: string; x: number; y: number } | null>(null);
	const openMenu = (p: ProjectIndexEntry, ev: MouseEvent) => {
		ev.preventDefault();
		menuOpen = { id: p.id, x: ev.clientX, y: ev.clientY };
	};
	const closeMenu = () => (menuOpen = null);
	const menuTarget = $derived(
		menuOpen ? projects.find((p) => p.id === menuOpen!.id) : undefined
	);

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

<svelte:window onkeydown={handleGlobalKey} />

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

	{#if todayTotals.editedToday > 0 || todayTotals.editedThisWeek > 0}
		<div
			class="mb-3 flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2 text-[12px]"
		>
			<span
				class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"
			>
				Today
			</span>
			{#if todayTotals.editedToday > 0}
				<span class="text-fg-muted" data-numeric>
					<span class="font-mono font-semibold text-accent">{todayTotals.editedToday}</span> edit{todayTotals.editedToday === 1 ? '' : 's'} across
					<span class="font-mono font-semibold text-accent">{todayTotals.activeProjects}</span>
					project{todayTotals.activeProjects === 1 ? '' : 's'}
				</span>
			{:else}
				<span class="text-fg-subtle">No edits yet.</span>
			{/if}
			{#if todayTotals.editedThisWeek > todayTotals.editedToday}
				<span class="text-fg-subtle" data-numeric>
					· {todayTotals.editedThisWeek} this week
				</span>
			{/if}
		</div>
	{/if}

	{#if continueCandidate}
		<a
			href="/project/{continueCandidate.id}/{continueCandidate.slug}"
			class="group mb-6 flex items-center gap-4 rounded-lg border border-border bg-surface-2/40 px-4 py-3 transition-colors hover:border-accent hover:bg-surface-2"
		>
			<div
				class="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent"
			>
				<PenTool class="size-4" />
			</div>
			<div class="min-w-0 flex-1">
				<div class="flex items-baseline gap-2">
					<span
						class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"
					>
						Continue working
					</span>
					<span class="text-[11px] text-fg-subtle" data-numeric>
						{continueCandidate.slug} · updated {formatRelative(continueCandidate.updatedAt)}
					</span>
				</div>
				<div class="truncate text-[13px] font-medium text-fg">
					{continueCandidate.name}
					<span class="text-fg-muted">· {continueCandidate.familyName}</span>
				</div>
			</div>
			<span
				class="hidden text-[12px] text-fg-muted transition-colors group-hover:text-accent md:inline"
			>
				Resume →
			</span>
		</a>
	{/if}

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
				<div class="mb-3 flex flex-wrap gap-2">
					<input
						bind:this={searchEl}
						bind:value={projectQuery}
						placeholder="Filter by name or family… (/)"
						class="min-w-[160px] flex-1 rounded-md border border-border bg-surface px-3 py-1.5 text-[13px] text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
					/>
					<button
						type="button"
						onclick={() => (onlyToday = !onlyToday)}
						class="rounded-md border px-2 py-1.5 text-[12px] font-medium transition-colors {onlyToday
							? 'border-accent bg-accent-soft text-accent'
							: 'border-border bg-surface text-fg-muted hover:border-border-strong'}"
					>
						Today
					</button>
					{#if archivedCount > 0}
						<button
							type="button"
							onclick={() => (showArchived = !showArchived)}
							class="rounded-md border px-2 py-1.5 text-[12px] font-medium transition-colors {showArchived
								? 'border-accent bg-accent-soft text-accent'
								: 'border-border bg-surface text-fg-muted hover:border-border-strong'}"
							title={showArchived ? 'Hide archived projects' : 'Show archived projects'}
						>
							<Archive class="inline size-3 align-[-2px]" />
							{showArchived ? 'Hide' : 'Show'} archived <span data-numeric>({archivedCount})</span>
						</button>
					{/if}
					<select
						bind:value={projectSort}
						class="rounded-md border border-border bg-surface px-2 py-1.5 text-[12px] text-fg-muted outline-none focus:border-accent"
						title="Sort by"
					>
						<option value="updated">Recent</option>
						<option value="name">Name</option>
						<option value="brief">Brief %</option>
						<option value="glyphs">Glyphs</option>
					</select>
				</div>
				{#if allTags.length > 0}
					<div class="mb-2 flex flex-wrap items-center gap-1.5">
						<span class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
							Tags
						</span>
						{#each allTags as [t, n] (t)}
							<button
								type="button"
								onclick={() => (activeTag = activeTag === t ? null : t)}
								class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors {activeTag ===
								t
									? 'border-accent bg-accent text-accent-fg'
									: 'border-border bg-surface text-fg-muted hover:border-accent hover:text-accent'}"
								title={activeTag === t ? `Clear ${t} filter` : `Show only ${t}`}
							>
								{t}
								<span class="font-mono text-[9px] opacity-70" data-numeric>{n}</span>
							</button>
						{/each}
						{#if activeTag}
							<button
								type="button"
								onclick={() => (activeTag = null)}
								class="text-[10px] text-fg-subtle hover:text-fg"
							>
								Clear
							</button>
						{/if}
					</div>
				{/if}
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
							oncontextmenu={(ev) => openMenu(p, ev)}
							class="group flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2/40 px-4 py-3 transition-colors hover:border-border-strong hover:bg-surface-2 {p.archived
								? 'opacity-60'
								: ''}"
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
										{#if p.locked}
											<LockIcon class="size-3 text-warn" aria-label="Locked" />
										{/if}
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
										{#if (p.editsByDay ?? []).some((n) => n > 0)}
											<span
												class="inline-flex items-center"
												title="Edits per day, last 14d · {p.editsByDay?.reduce((a, b) => a + b, 0) ?? 0} total"
											>
												<Sparkline
													values={p.editsByDay ?? []}
													width={56}
													height={14}
													label="Edits per day, last 14d"
												/>
											</span>
										{/if}
									</div>
									<div class="truncate text-[12px] text-fg-muted" data-numeric>
										{p.familyName} · {p.glyphCount} drawn · updated {formatRelative(
											p.updatedAt
										)}{p.lastSealedVersion
											? ` · sealed v${p.lastSealedVersion} ${formatRelative(p.lastSealedAt ?? p.updatedAt)}`
											: ''}
									</div>
									{#if p.tagline}
										<div class="mt-0.5 truncate text-[11px] italic text-fg-subtle">
											{p.tagline}
										</div>
									{/if}
									{#if p.tags && p.tags.length > 0}
										<div class="mt-1 flex flex-wrap gap-1">
											{#each p.tags as t (t)}
												<button
													type="button"
													onclick={(ev) => {
														ev.preventDefault();
														ev.stopPropagation();
														activeTag = activeTag === t ? null : t;
													}}
													class="rounded-full bg-surface-2/80 px-1.5 py-0.5 text-[10px] font-medium text-fg-muted hover:bg-accent-soft hover:text-accent"
													title={activeTag === t ? `Clear ${t} filter` : `Show only ${t}`}
												>
													{t}
												</button>
											{/each}
										</div>
									{/if}
								</div>
							</a>
							<div class="flex shrink-0 gap-1">
								<button
									type="button"
									onclick={() => handleTogglePin(p.id)}
									class="inline-flex size-7 items-center justify-center rounded-md transition-colors hover:bg-surface-2 {p.pinned
										? 'text-warn opacity-100'
										: 'text-fg-subtle opacity-0 group-hover:opacity-100 hover:text-fg'}"
									aria-label={p.pinned ? 'Unpin from top' : 'Pin to top'}
									title={p.pinned ? 'Unpin from top' : 'Pin to top'}
								>
									{#if p.pinned}
										<Pin class="size-3.5 fill-warn" />
									{:else}
										<Pin class="size-3.5" />
									{/if}
								</button>
								<div class="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
										onclick={() => handleToggleArchive(p.id)}
										aria-label={p.archived ? 'Unarchive' : 'Archive'}
									>
										{#snippet icon()}{#if p.archived}<ArchiveRestore
													class="size-3.5"
												/>{:else}<Archive class="size-3.5" />{/if}{/snippet}
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
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</Panel>

		<div class="grid gap-4">
			{#if recentReleases.length > 0}
				<Panel padding="md">
					<h2 class="mb-2 text-sm font-semibold tracking-wide text-fg-muted uppercase">
						Recent releases
					</h2>
					<ul class="grid gap-1.5">
						{#each recentReleases as r (r.id)}
							<a
								href="/project/{r.id}/release"
								class="flex items-center justify-between gap-2 rounded-md border border-border bg-surface-2/40 px-2.5 py-1.5 text-[12px] transition-colors hover:border-accent hover:bg-accent-soft/40"
							>
								<span class="min-w-0 truncate text-fg">{r.name}</span>
								<span
									class="flex shrink-0 items-baseline gap-1.5 font-mono text-[11px] text-fg-muted"
									data-numeric
								>
									<span class="text-accent">v{r.lastSealedVersion}</span>
									<span class="text-fg-subtle">
										{formatRelative(r.lastSealedAt!)}
									</span>
								</span>
							</a>
						{/each}
					</ul>
				</Panel>
			{/if}

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

			{#if storage && storage.quota > 0}
				{@const pct = Math.min(100, Math.round((storage.used / storage.quota) * 1000) / 10)}
				<div
					class="rounded-lg border border-border bg-surface-2/40 px-3 py-2 text-[11px] text-fg-muted"
				>
					<div class="flex items-baseline justify-between">
						<span class="font-medium">Browser storage</span>
						<span class="font-mono text-fg-subtle" data-numeric>
							{formatBytes(storage.used)} / {formatBytes(storage.quota)}
						</span>
					</div>
					<div class="mt-1 h-1 overflow-hidden rounded-full bg-surface-2">
						<div
							class="h-full {pct > 80 ? 'bg-danger' : pct > 50 ? 'bg-warn' : 'bg-success'}"
							style="width: {pct}%;"
						></div>
					</div>
					<div class="mt-1 text-[10px] text-fg-subtle">
						Projects are stored locally in your browser. Export OTF/UFO/JSON
						periodically to keep backups.
					</div>
					{#if projects.length > 0}
						<button
							type="button"
							onclick={handleBackupAll}
							disabled={backingUp}
							class="mt-2 w-full rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-medium text-fg-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
						>
							{backingUp ? 'Bundling…' : `Backup all (${projects.length}) → JSON`}
						</button>
					{/if}
				</div>
			{/if}
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

	{#if menuOpen && menuTarget}
		<button
			type="button"
			class="fixed inset-0 z-40 cursor-default"
			onclick={closeMenu}
			aria-label="Close menu"
			tabindex="-1"
		></button>
		<div
			role="menu"
			class="fixed z-50 w-56 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-xl"
			style="left: {Math.min(menuOpen.x, window.innerWidth - 240)}px; top: {Math.min(
				menuOpen.y,
				window.innerHeight - 280
			)}px;"
		>
			<div class="border-b border-border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
				{menuTarget.name}
			</div>
			<button
				type="button"
				role="menuitem"
				onclick={() => {
					handleTogglePin(menuTarget!.id);
					closeMenu();
				}}
				class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-fg-muted hover:bg-surface-2 hover:text-fg"
			>
				<Pin class="size-3.5" />
				{menuTarget.pinned ? 'Unpin from top' : 'Pin to top'}
			</button>
			<button
				type="button"
				role="menuitem"
				onclick={() => {
					handleDuplicate(menuTarget!.id);
					closeMenu();
				}}
				class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-fg-muted hover:bg-surface-2 hover:text-fg"
			>
				<Copy class="size-3.5" />
				Duplicate
			</button>
			<button
				type="button"
				role="menuitem"
				onclick={() => {
					handleToggleArchive(menuTarget!.id);
					closeMenu();
				}}
				class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-fg-muted hover:bg-surface-2 hover:text-fg"
			>
				{#if menuTarget.archived}
					<ArchiveRestore class="size-3.5" />
					Unarchive
				{:else}
					<Archive class="size-3.5" />
					Archive
				{/if}
			</button>
			<button
				type="button"
				role="menuitem"
				onclick={() => {
					navigator.clipboard?.writeText(menuTarget!.id).catch(() => {});
					closeMenu();
				}}
				class="flex w-full items-center gap-2 border-t border-border px-3 py-1.5 text-left text-[12px] text-fg-muted hover:bg-surface-2 hover:text-fg"
			>
				<span class="font-mono text-[10px] text-fg-subtle">ID</span>
				Copy project ID
			</button>
			<button
				type="button"
				role="menuitem"
				onclick={() => {
					handleDelete(menuTarget!);
					closeMenu();
				}}
				class="flex w-full items-center gap-2 border-t border-border px-3 py-1.5 text-left text-[12px] text-danger hover:bg-danger/10"
			>
				<Trash2 class="size-3.5" />
				Delete…
			</button>
		</div>
	{/if}
</div>
