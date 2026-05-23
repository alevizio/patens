<script lang="ts">
	import { goto } from '$app/navigation';
	import { toast } from '$lib/stores/toast.svelte';
	import {
		createProject,
		deleteProject,
		duplicateProject,
		listProjects,
		saveProject,
		toggleProjectPin,
		toggleProjectArchive,
		backupAllProjects,
		restoreFromBackup,
		addScriptPack,
		KIND_PRESETS,
		type ProjectKind,
		type ProjectIndexEntry
	} from '$lib/font/project';
	import { SCRIPT_PACKS } from '$lib/font/charsets';
	import Button from '$lib/ui/Button.svelte';
	import Field from '$lib/ui/Field.svelte';
	import Input from '$lib/ui/Input.svelte';
	import Panel from '$lib/ui/Panel.svelte';
	import Sparkline from '$lib/ui/Sparkline.svelte';
	import ShortcutsDialog from '$lib/ui/ShortcutsDialog.svelte';
	import { importFromOtf } from '$lib/font/import';
	import { ensurePython, ufoZipToProject } from '$lib/font/python';
	import { importFromUrl, STARTER_FONTS } from '$lib/font/url-import';
	import { settings } from '$lib/stores/settings.svelte';
	import WelcomeDialog from '$lib/ui/WelcomeDialog.svelte';
	import CreateFontDialog from '$lib/ui/CreateFontDialog.svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import Copy from '@lucide/svelte/icons/copy';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { homeTagline, continueGreeting } from '$lib/delight';
	import { formatRelative } from '$lib/util/format';
	import Pin from '@lucide/svelte/icons/pin';
	import Archive from '@lucide/svelte/icons/archive';
	import ArchiveRestore from '@lucide/svelte/icons/archive-restore';
	import Layers from '@lucide/svelte/icons/layers';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import LockIcon from '@lucide/svelte/icons/lock';
	import Download from '@lucide/svelte/icons/download';
	import UploadCloud from '@lucide/svelte/icons/upload-cloud';
	import HardDrive from '@lucide/svelte/icons/hard-drive';
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';
	import StorageDialog from '$lib/ui/StorageDialog.svelte';
	// createDemoProject is no longer imported here — the project layout's
	// load function builds the demo on the fly for /project/demo/edit.

	const taglineParts = $derived(homeTagline().split('\n'));

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

	let shortcutsOpen = $state(false);
	const handleGlobalKey = (e: KeyboardEvent) => {
		// ⌘K always focuses the project search, even from inside an input
		if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
			e.preventDefault();
			searchEl?.focus();
			searchEl?.select();
			return;
		}
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
			return;
		if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
			e.preventDefault();
			shortcutsOpen = !shortcutsOpen;
		} else if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
			e.preventDefault();
			searchEl?.focus();
			searchEl?.select();
		} else if (e.key === 'Escape') {
			if (shortcutsOpen) shortcutsOpen = false;
			else if (activeTag) activeTag = null;
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
	let createDialogOpen = $state(false);
	let storageDialogOpen = $state(false);
	let openingDemo = $state(false);

	const handleOpenDemo = async () => {
		if (openingDemo) return;
		openingDemo = true;
		try {
			// Navigate to /project/demo/edit — the project layout's load
			// function recognises 'demo' as a special id and builds the
			// demo project on the fly. Works even when IndexedDB is
			// unavailable (private mode, quota errors, etc), which the
			// previous "saveProject then goto" flow didn't.
			await goto('/project/demo/edit');
		} finally {
			openingDemo = false;
		}
	};
	let importWarning = $state<string | null>(null);
	let newName = $state('');
	let newFamily = $state('');
	let newKind = $state<ProjectKind | undefined>(undefined);
	let urlInput = $state('');

	const refresh = async () => {
		try {
			projects = await listProjects();
		} catch (err) {
			console.error('Failed to list projects:', err);
			toast.error(
				`Couldn't load your projects: ${err instanceof Error ? err.message : String(err)}`
			);
		} finally {
			loading = false;
		}
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

	let restoring = $state(false);
	let restoreMessage = $state<string | null>(null);
	const handleRestoreFromFile = async (file: File) => {
		if (restoring) return;
		restoring = true;
		restoreMessage = null;
		try {
			const text = await file.text();
			const parsed = JSON.parse(text);
			if (!parsed?.projects || !Array.isArray(parsed.projects)) {
				throw new Error('Not a Font Studio backup file.');
			}
			const overwrite = confirm(
				`Restore ${parsed.projects.length} projects from "${file.name}"?\n\nClick OK to OVERWRITE existing ones with the same ID, or Cancel to skip duplicates.`
			);
			const result = await restoreFromBackup(parsed, { overwrite });
			const upgradedNote = result.upgraded > 0 ? ` · ${result.upgraded} upgraded` : '';
			restoreMessage = `Added ${result.added}${result.skipped ? `, skipped ${result.skipped}` : ''}${upgradedNote}.`;
			await refresh();
		} catch (err) {
			restoreMessage = `Restore failed: ${(err as Error).message}`;
		} finally {
			restoring = false;
		}
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

	const handleStartFamily = async (p: ProjectIndexEntry) => {
		const { createFamily, linkProjectToFamily } = await import('$lib/font/family');
		const family = await createFamily({
			name: p.familyName || p.name
		});
		// Link the originating project as the "Regular" sibling. Both writes must
		// complete before navigating so the family hub sees a populated sibling.
		await linkProjectToFamily(p.id, family.id, { wght: 400, ital: 0, wdth: 100 });
		await refresh();
		await goto(`/family/${family.id}`);
	};

	const handleDeleteAllArchived = async () => {
		const archived = projects.filter((p) => p.archived);
		if (archived.length === 0) return;
		const ok = confirm(
			`Permanently delete ${archived.length} archived project${archived.length === 1 ? '' : 's'}? This cannot be undone.`
		);
		if (!ok) return;
		for (const a of archived) await deleteProject(a.id);
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

	let newScriptPacks = $state<Set<string>>(new Set());
	const handleCreate = async (input: {
		name: string;
		familyName: string;
		kind: ProjectKind | undefined;
		scriptPacks: Set<string>;
	}) => {
		const trimmed = input.name.trim();
		if (!trimmed || creating) return;
		creating = true;
		const isFirstProject = projects.length === 0;
		try {
			let project = createProject({
				name: trimmed,
				familyName: input.familyName.trim() || trimmed,
				kind: input.kind
			});
			// Apply any selected non-Latin script packs at creation time.
			for (const pack of SCRIPT_PACKS) {
				if (input.scriptPacks.has(pack.id)) {
					project = addScriptPack(project, pack);
				}
			}
			await saveProject(project);
			createDialogOpen = false;
			if (isFirstProject) {
				// Welcome the user into their own foundry on first create.
				// celebrate() stays dynamically imported so canvas-confetti only
				// loads when this branch actually fires.
				toast.success(`Welcome to your foundry. Start with the letter H — it sets the proportion for everything else.`);
				const { celebrate } = await import('$lib/delight');
				celebrate('small');
			}
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
				toast.warn(importWarning);
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
			if (importWarning) toast.warn(importWarning);
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
				if (importWarning) toast.warn(importWarning);
				await goto(`/project/${project.id}/edit`);
			} else {
				importing = true;
				const { project } = await importFromOtf(file);
				importWarning = checkReservedName(project.metadata.familyName);
				await saveProject(project);
				if (importWarning) toast.warn(importWarning);
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
			if (importWarning) toast.warn(importWarning);
			await goto(`/project/${project.id}/edit`);
		} catch (err) {
			importError = err instanceof Error ? err.message : 'Could not read UFO archive.';
		} finally {
			ufoImporting = false;
			input.value = '';
		}
	};

</script>

<svelte:head>
	<!-- Load the demo OTF as 'StudioGeometric' so the home page's big "Hn"
	     mark renders in Font Studio's own typeface — the home page literally
	     shows the product's output. `swap` keeps the fallback (Hoefler Text)
	     visible until the OTF loads, so no FOIT. -->
	<style>
		@font-face {
			font-family: 'StudioGeometric';
			src: url('/demo-fonts/StudioGeometric-Regular.otf') format('opentype');
			font-weight: 400;
			font-style: normal;
			font-display: swap;
		}
	</style>
</svelte:head>

<svelte:window onkeydown={handleGlobalKey} />

<div
	class="relative mx-auto max-w-6xl px-6 py-8 sm:py-10"
	ondragenter={onDragEnter}
	ondragleave={onDragLeave}
	ondragover={onDragOver}
	ondrop={onDrop}
	role="application"
>
	<!-- Slim top bar: brand pill + secondary nav. Acts as the dashboard's
	     chrome header — distinct from the editorial hero below. -->
	<!-- Editorial wordmark header: Hoefler serif name acts as the identity, no
	     rounded-icon logo block (anti-pattern from .impeccable.md). The
	     today-pill is the only chromatic accent up here and only when there's
	     real activity to surface. -->
	<header
		class="mb-16 flex items-baseline justify-between gap-3 border-b border-border/50 pb-5"
	>
		<a href="/" class="group inline-flex items-baseline gap-3">
			<span
				class="text-[20px] leading-none tracking-tight text-fg transition-colors group-hover:text-accent-strong"
				style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
			>
				Font Studio
			</span>
			{#if todayTotals.editedToday > 0}
				<span
					class="hidden items-baseline gap-1 font-mono text-[10px] font-medium tracking-wide text-accent-strong uppercase sm:inline-flex"
					data-numeric
					title="Glyphs edited today across all projects"
				>
					<span class="size-1 self-center rounded-full bg-accent"></span>
					{todayTotals.editedToday} today
				</span>
			{/if}
		</a>
		<nav class="flex items-baseline gap-5">
			<a
				href="/families"
				class="text-[12px] font-medium text-fg-muted underline-offset-4 transition-colors hover:text-fg hover:underline"
			>
				Families
			</a>
			<a
				href="/learn"
				class="text-[12px] font-medium text-fg-muted underline-offset-4 transition-colors hover:text-fg hover:underline"
			>
				Learn the craft
			</a>
			<button
				type="button"
				onclick={() => settings.setTheme(settings.theme === 'dark' ? 'light' : 'dark')}
				class="inline-flex size-7 items-center justify-center text-fg-muted transition-colors hover:text-fg"
				aria-label={settings.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
				title={settings.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
			>
				{#if settings.theme === 'dark'}
					<Sun class="size-3.5" />
				{:else}
					<Moon class="size-3.5" />
				{/if}
			</button>
			{#if storage && storage.quota > 0}
				{@const pct = Math.min(100, (storage.used / storage.quota) * 100)}
				<button
					type="button"
					onclick={() => (storageDialogOpen = true)}
					class="inline-flex size-7 items-center justify-center text-fg-muted transition-colors hover:text-fg"
					aria-label="Browser storage"
					title="Browser storage · backup & restore"
				>
					<HardDrive
						class="size-3.5 {pct > 80 ? 'text-danger-strong' : pct > 50 ? 'text-warn-strong' : ''}"
					/>
				</button>
			{/if}
		</nav>
	</header>

	<!-- Spacing scale, editorial cadence:
	     - mb-5   20px — within a section
	     - mb-10  40px — between section sub-blocks
	     - mb-20  80px — between distinct sections
	     - mt-28 112px — for the demo band that closes the page
	     Section headers run two registers — Hoefler serif at 28-32px for
	     primary sections, ui-serif at 18px for tertiary, never both heavy. -->

	<!-- Hero: editorial. The Hoefler tagline carries the page; the CTAs
	     demote to a primary button + an inline secondary link. The 3-card
	     dashboard strip was crowding the typographic statement. -->
	<section class="mb-20">
		{#if continueCandidate}
			<a
				href="/project/{continueCandidate.id}/{continueCandidate.slug}"
				class="group mb-6 inline-flex items-baseline gap-2 text-[12px] leading-none text-fg-muted transition-colors hover:text-accent-strong"
			>
				<span class="font-mono uppercase tracking-wider" data-numeric>
					← Continue
				</span>
				<span style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;">
					{continueGreeting(continueCandidate.updatedAt)}
				</span>
				<span class="text-fg-subtle">·</span>
				<span class="truncate">{continueCandidate.name}</span>
				<span class="font-mono text-fg-subtle" data-numeric>
					{formatRelative(continueCandidate.updatedAt)}
				</span>
			</a>
		{/if}

		<h1
			class="max-w-4xl text-balance text-[44px] leading-[1.02] tracking-tight sm:text-[64px]"
		>
			<span
				class="block text-fg"
				style="font-family: 'Hoefler Text', ui-serif, Georgia, 'Times New Roman', serif;"
			>
				{taglineParts[0]}
			</span>
			<span class="mt-2 block font-sans text-[0.6em] font-semibold leading-tight text-fg-muted">
				{taglineParts[1]}
			</span>
		</h1>

		<p class="mt-8 max-w-xl text-[15px] leading-relaxed text-fg-muted">
			Sketch, vectorize, space, kern, and export a real <span class="font-mono text-fg" data-numeric>.otf</span> — all in your
			browser. Every project is saved locally.
		</p>

		<div class="mt-10 flex flex-wrap items-baseline gap-x-6 gap-y-3">
			<button
				type="button"
				onclick={() => (createDialogOpen = true)}
				class="inline-flex items-center gap-2 rounded-md bg-fg px-4 py-2.5 text-[13px] font-medium text-canvas transition-colors hover:bg-accent-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
			>
				<Plus class="size-4" />
				Start a new font
			</button>
			<button
				type="button"
				onclick={() => (createDialogOpen = true)}
				class="group inline-flex items-baseline gap-1.5 text-[13px] font-medium text-fg-muted underline-offset-[5px] transition-colors hover:text-fg hover:underline"
			>
				Or import an existing one
				<span class="text-fg-subtle transition-transform group-hover:translate-x-0.5">
					→
				</span>
			</button>
		</div>
	</section>

	{#if projects.length > 0 || !loading}
		<!-- Quick Start as a foundry index: no card chrome, no background.
		     Each tile is a typographic sample of its kind — the "Aa" itself
		     does the work the icon-with-rounded-corner pattern used to do.
		     Hover lights up the type, not the container. -->
		<section id="quick-start" class="mb-20 scroll-mt-8">
			<div class="mb-6 flex items-baseline justify-between gap-3">
				<h2
					class="text-[18px] tracking-tight text-fg"
					style="font-family: ui-serif, Georgia, serif;"
				>
					Or pick a kind
				</h2>
				<span class="font-mono text-[10px] tracking-wider text-fg-subtle uppercase">
					Pre-fills the Brief
				</span>
			</div>
			<div class="grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-4">
				{#each QUICK_PRESETS as p (p.id)}
					{@const previewStyle = p.kind === 'display'
						? "font-family: 'Helvetica Neue', Impact, 'Arial Black', sans-serif; font-weight: 900; letter-spacing: -0.03em;"
						: p.kind === 'mono'
							? "font-family: ui-monospace, Menlo, 'Courier New', monospace; font-weight: 500;"
							: p.kind === 'text'
								? "font-family: ui-serif, Georgia, 'Times New Roman', serif;"
								: 'font-family: ui-sans-serif, system-ui, sans-serif; font-weight: 600;'}
					<button
						type="button"
						onclick={() => createFromPreset(p)}
						disabled={presetBusy !== null}
						class="group flex flex-col items-baseline gap-2 border-b border-border/60 pb-4 text-left transition-colors hover:border-fg disabled:opacity-60"
						title={p.intent}
					>
						<div
							class="text-[44px] leading-none text-fg-muted transition-colors group-hover:text-fg"
							style={previewStyle}
						>
							Aa
						</div>
						<div class="mt-2">
							<div class="text-[13px] font-medium text-fg">{p.label}</div>
							<div class="mt-1 line-clamp-2 text-[11px] leading-snug text-fg-subtle">
								{p.intent}
							</div>
						</div>
					</button>
				{/each}
			</div>
		</section>
	{/if}

	<div class="grid gap-8">
		<!-- Primary content section: bigger header (28px) so it dominates
		     the secondary sections by typographic weight. -->
		<section>
			<div class="mb-5 flex items-baseline justify-between gap-3">
				<h2
					class="text-[28px] leading-none tracking-tight text-fg"
					style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
				>
					Your fonts
				</h2>
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
							? 'border-accent bg-accent-soft text-accent-strong'
							: 'border-border bg-surface text-fg-muted hover:border-border-strong'}"
					>
						Today
					</button>
					{#if archivedCount > 0}
						<button
							type="button"
							onclick={() => (showArchived = !showArchived)}
							class="rounded-md border px-2 py-1.5 text-[12px] font-medium transition-colors {showArchived
								? 'border-accent bg-accent-soft text-accent-strong'
								: 'border-border bg-surface text-fg-muted hover:border-border-strong'}"
							title={showArchived ? 'Hide archived projects' : 'Show archived projects'}
						>
							<Archive class="inline size-3 align-[-2px]" />
							{showArchived ? 'Hide' : 'Show'} archived <span data-numeric>({archivedCount})</span>
						</button>
						{#if showArchived}
							<button
								type="button"
								onclick={handleDeleteAllArchived}
								class="rounded-md border border-danger/40 bg-danger/10 px-2 py-1.5 text-[11px] font-medium text-danger-strong hover:border-danger hover:bg-danger/15"
								title="Permanently delete every archived project"
							>
								Delete {archivedCount} archived…
							</button>
						{/if}
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
					{#if projectQuery || onlyToday || showArchived || activeTag || projectSort !== 'updated'}
						<button
							type="button"
							onclick={() => {
								projectQuery = '';
								onlyToday = false;
								showArchived = false;
								activeTag = null;
								projectSort = 'updated';
							}}
							class="rounded-md border border-border bg-surface px-2 py-1.5 text-[11px] font-medium text-fg-muted hover:border-danger hover:text-danger"
							title="Reset every filter and sort"
						>
							Reset
						</button>
					{/if}
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
				<!-- Card-shaped skeletons that match the real row geometry:
				     square thumbnail on the left, two text bars, a meta strip.
				     Staggered shimmer pulses so it doesn't read as broken. -->
				<ul class="grid gap-2" aria-busy="true" aria-label="Loading projects">
					{#each [0, 1, 2, 3] as i (i)}
						<li
							class="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-3 motion-safe:animate-[skel-shimmer_1.4s_ease-in-out_infinite]"
							style="animation-delay: {i * 120}ms"
						>
							<div class="size-12 shrink-0 rounded-md bg-surface-2"></div>
							<div class="flex-1 space-y-1.5">
								<div class="h-3 w-2/5 rounded bg-surface-2"></div>
								<div class="h-2 w-3/5 rounded bg-surface-2/70"></div>
							</div>
							<div class="h-2 w-16 rounded bg-surface-2/60"></div>
						</li>
					{/each}
				</ul>
			{:else if projects.length === 0}
				<div class="rounded-lg border border-dashed border-border-strong/50 bg-surface-2/50 p-10 text-center">
					<pre
						class="mx-auto mb-3 inline-block whitespace-pre text-left font-mono text-[10px] leading-[1.15] text-fg-subtle"
						aria-hidden="true">{`     ╱ ╲
    ╱   ╲      H  O  n  o
   ╱     ╲     ──────────
  ╱───────╲    your control set
 ╱         ╲   draws this whole
╱           ╲  family.`}</pre>
					<p class="text-sm text-fg-muted">No fonts yet. Create one to begin.</p>
				</div>
			{:else if filteredProjects.length === 0}
				<div class="rounded-lg border border-dashed border-border-strong/50 bg-surface-2/50 p-6 text-center text-[12px] text-fg-muted">
					No projects match "{projectQuery}".
				</div>
			{:else}
				<!-- Editorial rows — no card chrome, type-driven hierarchy.
				     Bottom border separates entries. Name in Hoefler, meta in
				     mono+sans, actions on hover. Reads like a foundry release index. -->
				<ul class="grid">
					{#each filteredProjects as p (p.id)}
						<li
							oncontextmenu={(ev) => openMenu(p, ev)}
							class="group relative flex items-center justify-between gap-4 border-b border-border/60 py-4 transition-colors hover:border-fg/30 {p.archived
								? 'opacity-60'
								: ''}"
						>
							<a
								href="/project/{p.id}/edit"
								class="flex min-w-0 flex-1 items-center gap-5"
							>
								<div
									class="flex size-10 shrink-0 items-center justify-center overflow-hidden text-fg"
									style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
								>
									{#if p.thumbnail}
										<svg
											viewBox={p.thumbnail.viewBox}
											width="40"
											height="40"
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
										<span class="text-[28px] leading-none">
											{(p.familyName[0] ?? 'A').toUpperCase()}
										</span>
									{/if}
								</div>
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<div
											class="truncate text-[16px] leading-tight text-fg transition-colors group-hover:text-accent-strong"
											style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
										>{p.name}</div>
										{#if p.locked}
											<LockIcon class="size-3 text-warn" aria-label="Locked" />
										{/if}
										{#if (p.briefPct ?? 0) > 0}
											<span
												class="rounded px-1.5 py-0.5 font-mono text-[10px] font-medium {(p.briefPct ?? 0) >= 67
													? 'bg-success/15 text-success-strong'
													: (p.briefPct ?? 0) >= 33
														? 'bg-warn/15 text-warn-strong'
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
												class="rounded bg-accent/15 px-1.5 py-0.5 font-mono text-[10px] font-medium text-accent-strong"
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
									{#if (p.auditErrorCount ?? 0) > 0 || (p.auditWarnCount ?? 0) > 0}
										<!-- Audit roll-up chip — surfaces at-rest counts so
										     designers see which projects need attention from
										     the home page without opening each. Links into
										     the audit page via the context menu's Open audit
										     entry. -->
										<button
											type="button"
											onclick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												goto(`/project/${p.id}/audit`);
											}}
											class="mt-0.5 inline-flex items-center gap-1.5 text-[11px] hover:underline"
											data-numeric
											title="{p.auditErrorCount ?? 0} errors, {p.auditWarnCount ?? 0} warnings — open this project's audit"
										>
											{#if (p.auditErrorCount ?? 0) > 0}
												<span class="font-medium text-danger-strong">
													{p.auditErrorCount}e
												</span>
											{/if}
											{#if (p.auditWarnCount ?? 0) > 0}
												<span class="font-medium text-warn-strong">
													{p.auditWarnCount}w
												</span>
											{/if}
										</button>
									{:else if p.glyphCount > 0}
										<button
											type="button"
											onclick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												goto(`/project/${p.id}/audit`);
											}}
											class="mt-0.5 inline-block text-[10px] text-success hover:underline"
											title="Audit clean — open to verify"
										>
											✓ audit clean
										</button>
									{/if}
									{#if p.tagline}
										<div
											class="mt-0.5 truncate text-[11px] text-fg-subtle"
											style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
										>
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
													class="rounded-full bg-surface-2/80 px-1.5 py-0.5 text-[10px] font-medium text-fg-muted hover:bg-accent-soft hover:text-accent-strong"
													title={activeTag === t ? `Clear ${t} filter` : `Show only ${t}`}
												>
													{t}
												</button>
											{/each}
										</div>
									{/if}
									{#if p.familyId}
										<div class="mt-1">
											<button
												type="button"
												onclick={(ev) => {
													ev.preventDefault();
													ev.stopPropagation();
													goto(`/family/${p.familyId}`);
												}}
												class="inline-flex items-center gap-1 rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent-strong hover:bg-accent hover:text-accent-fg"
												title="Open family hub"
											>
												<Layers class="size-2.5" />
												Family
												{#if p.familyAxes}
													<span class="font-mono" data-numeric>
														{#if p.familyAxes.wght}{p.familyAxes.wght}{/if}{#if p.familyAxes.ital}i{/if}
													</span>
												{/if}
											</button>
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
										title="Duplicate project"
									>
										{#snippet icon()}<Copy class="size-3.5" />{/snippet}
									</Button>
									<Button
										variant="ghost"
										density="sm"
										onclick={() => handleToggleArchive(p.id)}
										aria-label={p.archived ? 'Unarchive' : 'Archive'}
										title={p.archived ? 'Unarchive project' : 'Archive project'}
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
										title="Delete project"
									>
										{#snippet icon()}<Trash2 class="size-3.5" />{/snippet}
									</Button>
								</div>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		{#if recentReleases.length > 0}
			<!-- Recent releases as a tight editorial list. Same divider rhythm as
			     the project list above; never a panel-within-a-panel. -->
			<section class="mt-16">
				<h2
					class="mb-5 text-[18px] tracking-tight text-fg"
					style="font-family: ui-serif, Georgia, serif;"
				>
					Recent releases
				</h2>
				<ul class="grid">
					{#each recentReleases as r (r.id)}
						<a
							href="/project/{r.id}/release"
							class="group flex items-baseline justify-between gap-3 border-b border-border/60 py-2.5 transition-colors hover:border-fg/30"
						>
							<span
								class="min-w-0 truncate text-[14px] text-fg group-hover:text-accent-strong"
								style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
							>
								{r.name}
							</span>
							<span
								class="flex shrink-0 items-baseline gap-2 font-mono text-[11px] text-fg-muted"
								data-numeric
							>
								<span class="text-accent-strong">v{r.lastSealedVersion}</span>
								<span class="text-fg-subtle">{formatRelative(r.lastSealedAt!)}</span>
							</span>
						</a>
					{/each}
				</ul>
			</section>
		{/if}
	</div>

	<!-- See it in action — editorial split. The "Hn" mark uses Font Studio's
	     own demo OTF as its rendering surface (via the @font-face loaded by
	     the FontFace promise below), which is the point: the home page's
	     biggest typographic statement is the product's own output. The
	     downloads sit as quiet links below, not card buttons. -->
	<section class="mt-28 grid gap-10 md:grid-cols-[5fr_7fr] md:gap-16">
		<div>
			<h2
				class="text-[28px] leading-[1.05] tracking-tight text-fg"
				style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
			>
				See it in action.
			</h2>
			<p class="mt-4 text-[14px] leading-relaxed text-fg-muted">
				Open the example project to explore a font mid-design — eight drawn
				glyphs across uppercase and lowercase, the Brief filled in,
				metrics set. Edit a point, run a boolean op, ship the OTF.
			</p>
			<p class="mt-5 font-mono text-[10px] tracking-wider text-fg-subtle uppercase">
				Example project &nbsp;·&nbsp; Two demo OTFs
			</p>
		</div>
		<div>
			<button
				type="button"
				onclick={handleOpenDemo}
				disabled={openingDemo}
				class="group block w-full text-left"
			>
				<div
					class="flex select-none items-baseline gap-1 border-b border-border pb-3 text-[120px] leading-[0.9] tracking-tight text-fg transition-colors group-hover:text-accent-strong sm:text-[156px]"
					style="font-family: 'StudioGeometric', 'Hoefler Text', ui-serif, Georgia, serif;"
					aria-hidden="true"
				>
					Hn
				</div>
				<div class="mt-5 flex items-baseline justify-between gap-4">
					<div>
						<div
							class="text-[18px] leading-tight text-fg group-hover:text-accent-strong"
							style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
						>
							{openingDemo ? 'Opening…' : 'Open the example project'}
						</div>
						<div
							class="mt-1 font-mono text-[11px] tracking-wide text-fg-subtle"
							data-numeric
						>
							8 glyphs drawn · Brief filled · v0.1.0-demo
						</div>
					</div>
					<span
						class="shrink-0 text-[20px] text-fg-muted transition-transform group-hover:translate-x-1 group-hover:text-accent-strong"
					>
						→
					</span>
				</div>
			</button>

			<div
				class="mt-6 flex flex-wrap items-baseline gap-x-6 gap-y-2 font-mono text-[11px] text-fg-muted"
			>
				<span class="text-[10px] tracking-wider text-fg-subtle uppercase">
					Or just the OTFs &nbsp;↓
				</span>
				<a
					href="/demo-fonts/StudioGeometric-Regular.otf"
					download
					class="group inline-flex items-baseline gap-1.5 underline-offset-[5px] transition-colors hover:text-fg hover:underline"
					title="Download Studio Geometric Regular (.otf)"
				>
					Studio Geometric
					<span class="text-fg-subtle" data-numeric>2.3 KB</span>
					<Download class="size-3 self-center text-fg-subtle group-hover:text-fg" aria-hidden="true" />
				</a>
				<a
					href="/demo-fonts/StudioSlab-Regular.otf"
					download
					class="group inline-flex items-baseline gap-1.5 underline-offset-[5px] transition-colors hover:text-fg hover:underline"
					title="Download Studio Slab Regular (.otf)"
				>
					Studio Slab
					<span class="text-fg-subtle" data-numeric>2.4 KB</span>
					<Download class="size-3 self-center text-fg-subtle group-hover:text-fg" aria-hidden="true" />
				</a>
			</div>
		</div>
	</section>

	<!-- Quiet foundry signoff. Anchors the page; no border, no chrome —
	     just type, breathing room, and a single horizontal rule. -->
	<footer class="mt-28 mb-4 border-t border-border/60 pt-6">
		<div class="flex flex-wrap items-baseline justify-between gap-3">
			<span
				class="text-[14px] text-fg-muted"
				style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
			>
				Font Studio
			</span>
			<span class="font-mono text-[10px] tracking-wider text-fg-subtle uppercase">
				Personal type design tool &nbsp;·&nbsp; 2026
			</span>
		</div>
	</footer>

	{#if dragActive}
		<!-- Drop overlay: cream tint over the page so the user still sees
		     where they're dropping; Hoefler heading carries the moment.
		     No backdrop-blur (anti-pattern), no glow. Just type + canvas. -->
		<div
			class="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-canvas/90"
		>
			<div class="text-center">
				<UploadCloud
					class="mx-auto mb-6 size-10 text-accent-strong"
					strokeWidth={1.25}
				/>
				<div
					class="text-[44px] leading-none tracking-tight text-fg"
					style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
				>
					Drop here.
				</div>
				<div
					class="mt-4 font-mono text-[11px] tracking-wider text-fg-subtle uppercase"
				>
					.otf &nbsp;·&nbsp; .ttf &nbsp;·&nbsp; .woff2 &nbsp;·&nbsp; .ufo.zip
				</div>
			</div>
		</div>
	{/if}

	<WelcomeDialog
		open={!settings.welcomeDismissed}
		onclose={() => settings.dismissWelcome()}
	/>
	<ShortcutsDialog open={shortcutsOpen} onclose={() => (shortcutsOpen = false)} />
	<CreateFontDialog
		open={createDialogOpen}
		onclose={() => (createDialogOpen = false)}
		{creating}
		{importing}
		{ufoImporting}
		{urlImporting}
		{importError}
		oncreate={(input) => handleCreate(input)}
		onfile={(file) => importFile(file)}
		onufo={(file) => importFile(file)}
		onurl={(url) => handleUrlImport(url)}
	/>
	{#if storage && storage.quota > 0}
		<StorageDialog
			open={storageDialogOpen}
			onclose={() => (storageDialogOpen = false)}
			used={storage.used}
			quota={storage.quota}
			projectCount={projects.length}
			{backingUp}
			{restoring}
			{restoreMessage}
			onbackup={handleBackupAll}
			onrestore={(file) => handleRestoreFromFile(file)}
		/>
	{/if}

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
			<!-- Direct jump to the project's audit page — saves a click vs.
			     entering the project then navigating the tab bar. -->
			<a
				role="menuitem"
				href="/project/{menuTarget.id}/audit"
				onclick={closeMenu}
				class="flex w-full items-center gap-2 border-t border-border px-3 py-1.5 text-left text-[12px] text-fg-muted hover:bg-surface-2 hover:text-fg"
			>
				<AlertCircle class="size-3.5" />
				Open audit
			</a>
			{#if menuTarget.familyId}
				<a
					role="menuitem"
					href="/family/{menuTarget.familyId}"
					onclick={closeMenu}
					class="flex w-full items-center gap-2 border-t border-border px-3 py-1.5 text-left text-[12px] text-fg-muted hover:bg-surface-2 hover:text-fg"
				>
					<Layers class="size-3.5" />
					Open family
				</a>
			{:else}
				<button
					type="button"
					role="menuitem"
					onclick={() => {
						handleStartFamily(menuTarget!);
						closeMenu();
					}}
					class="flex w-full items-center gap-2 border-t border-border px-3 py-1.5 text-left text-[12px] text-fg-muted hover:bg-surface-2 hover:text-fg"
				>
					<Layers class="size-3.5" />
					Start family from this project…
				</button>
			{/if}
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
				class="flex w-full items-center gap-2 border-t border-border px-3 py-1.5 text-left text-[12px] text-danger-strong hover:bg-danger/10"
			>
				<Trash2 class="size-3.5" />
				Delete…
			</button>
		</div>
	{/if}
</div>
