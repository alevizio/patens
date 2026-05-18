<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { projectStore } from '$lib/stores/project.svelte';
	import { previewStore } from '$lib/stores/preview.svelte';
	import { listProjects, type ProjectIndexEntry } from '$lib/font/project';
	import GlyphBrowser from '$lib/glyph/GlyphBrowser.svelte';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Pen from '@lucide/svelte/icons/pen-tool';
	import Ruler from '@lucide/svelte/icons/ruler';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import Download from '@lucide/svelte/icons/download';
	import Code from '@lucide/svelte/icons/code-2';
	import Sliders from '@lucide/svelte/icons/sliders-horizontal';
	import Layers from '@lucide/svelte/icons/layers';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Settings from '@lucide/svelte/icons/settings';
	import Undo2 from '@lucide/svelte/icons/undo-2';
	import Redo2 from '@lucide/svelte/icons/redo-2';
	import FileText from '@lucide/svelte/icons/file-text';
	import Compass from '@lucide/svelte/icons/compass';
	import Rocket from '@lucide/svelte/icons/rocket';
	import ListChecks from '@lucide/svelte/icons/list-checks';
	import LockIcon from '@lucide/svelte/icons/lock';
	import UnlockIcon from '@lucide/svelte/icons/unlock';
	import { auditProject, preflightProject, auditCompatibility } from '$lib/font/audit';
	import SettingsDialog from '$lib/ui/SettingsDialog.svelte';
	import ShortcutsDialog from '$lib/ui/ShortcutsDialog.svelte';
	import StatsPopover from '$lib/ui/StatsPopover.svelte';
	import CommandPalette from '$lib/ui/CommandPalette.svelte';
	import HelpCircle from '@lucide/svelte/icons/help-circle';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import Save from '@lucide/svelte/icons/save';
	import Check from '@lucide/svelte/icons/check';
	import Loader from '@lucide/svelte/icons/loader-2';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';

	let { data, children } = $props();

	// Load project into store on mount / when route ID changes.
	$effect(() => {
		if (projectStore.project?.id !== data.project.id) {
			projectStore.load(data.project);
			projectStore.loadAllReferenceFonts();
		}
	});

	// Trigger preview rebuilds when project changes.
	$effect(() => {
		// Touch the dependency
		void projectStore.project?.updatedAt;
		void projectStore.project?.glyphs;
		void projectStore.project?.kerning;
		void projectStore.project?.metrics;
		previewStore.requestRebuild();
	});

	const id = $derived(page.params.id);
	const currentPath = $derived(page.url.pathname);

	// Persist the last visited tab per project so the home page can deep-link "Continue working".
	$effect(() => {
		const cp = currentPath;
		const projectId = projectStore.project?.id;
		if (!projectId) return;
		const match = cp.match(/\/project\/[^/]+\/([^/?]+)/);
		const slug = match?.[1] ?? 'edit';
		try {
			localStorage.setItem(`font-studio:last-tab:${projectId}`, slug);
		} catch {
			// localStorage may be unavailable; fail silently.
		}
	});

	let settingsOpen = $state(false);
	let statsOpen = $state(false);
	let shortcutsOpen = $state(false);
	let paletteOpen = $state(false);
	let projectSwitcherOpen = $state(false);
	// Tick every 30s so the "Saved Xs ago" string stays fresh
	let nowTick = $state(Date.now());
	$effect(() => {
		const id = setInterval(() => (nowTick = Date.now()), 30_000);
		return () => clearInterval(id);
	});
	const savedAgoLabel = $derived.by(() => {
		const ts = projectStore.lastSavedAt;
		if (!ts) return 'Saved';
		const sec = Math.max(0, Math.floor((nowTick - ts) / 1000));
		if (sec < 5) return 'Saved just now';
		if (sec < 60) return `Saved ${sec}s ago`;
		const min = Math.floor(sec / 60);
		if (min < 60) return `Saved ${min}m ago`;
		const hr = Math.floor(min / 60);
		return `Saved ${hr}h ago`;
	});
	let allProjects = $state<ProjectIndexEntry[]>([]);

	$effect(() => {
		if (projectSwitcherOpen) listProjects().then((list) => (allProjects = list));
	});

	const auditErrorCount = $derived.by(() => {
		const p = projectStore.project;
		if (!p) return 0;
		let n = 0;
		for (const i of auditProject(p)) if (i.severity === 'error') n++;
		for (const i of auditCompatibility(p)) if (i.severity === 'error') n++;
		for (const i of preflightProject(p)) if (i.severity === 'error') n++;
		return n;
	});

	const tabs = $derived([
		{ href: `/project/${id}/brief`, label: 'Brief', icon: Compass, shortcut: '⌘⇧B' },
		{ href: `/project/${id}/edit`, label: 'Edit', icon: Pen },
		{ href: `/project/${id}/spacing`, label: 'Spacing', icon: Ruler },
		{ href: `/project/${id}/designspace`, label: 'Designspace', icon: Sliders },
		{ href: `/project/${id}/features`, label: 'Features', icon: Code },
		{ href: `/project/${id}/ai`, label: 'AI', icon: Sparkles },
		{ href: `/project/${id}/preview`, label: 'Preview', icon: EyeIcon },
		{ href: `/project/${id}/specimen`, label: 'Specimen', icon: FileText },
		{ href: `/project/${id}/audit`, label: 'Audit', icon: ListChecks, badge: auditErrorCount },
		{ href: `/project/${id}/release`, label: 'Release', icon: Rocket, shortcut: '⌘⇧R' },
		{ href: `/project/${id}/export`, label: 'Export', icon: Download }
	]);

	const isActive = (href: string) =>
		currentPath === href || currentPath.startsWith(href + '/');

	const nameInput = $derived(projectStore.project?.name ?? '');

	import { toast as t } from '$lib/stores/toast.svelte';
	const handleGlobalKey = async (e: KeyboardEvent) => {
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
			if (!(e.metaKey || e.ctrlKey)) return;
		}
		if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
			e.preventDefault();
			shortcutsOpen = !shortcutsOpen;
			return;
		}
		if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
			e.preventDefault();
			paletteOpen = !paletteOpen;
			return;
		}
		if (e.key === '/' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
			// When not focused in an input/textarea, `/` opens the glyph palette anywhere in the project.
			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
				return;
			e.preventDefault();
			paletteOpen = true;
			return;
		}
		if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) {
			e.preventDefault();
			await projectStore.flush();
			t.success('Saved.');
		} else if ((e.metaKey || e.ctrlKey) && (e.key === 'p' || e.key === 'P')) {
			// Only steal Cmd+P on the specimen page; print there directly
			if (currentPath.endsWith('/specimen')) {
				e.preventDefault();
				window.print();
			}
		} else if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'l' || e.key === 'L')) {
			e.preventDefault();
			projectStore.toggleLock();
			t.success(projectStore.project?.locked ? 'Project locked.' : 'Project unlocked.');
		} else if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'b' || e.key === 'B')) {
			e.preventDefault();
			if (projectStore.project) goto(`/project/${projectStore.project.id}/brief`);
		} else if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'r' || e.key === 'R')) {
			e.preventDefault();
			if (projectStore.project) goto(`/project/${projectStore.project.id}/release`);
		}
	};
</script>

<svelte:window onkeydown={handleGlobalKey} />

<div class="flex h-screen flex-col">
	<header
		class="flex items-center gap-4 border-b border-border bg-surface px-4 py-2.5"
	>
		<a
			href="/"
			class="inline-flex size-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
			aria-label="Back to projects"
		>
			<ArrowLeft class="size-4" />
		</a>

		<div class="relative flex min-w-0 flex-1 items-center gap-1">
			<input
				type="text"
				value={nameInput}
				oninput={(e) => projectStore.updateName(e.currentTarget.value)}
				class="min-w-0 max-w-xs flex-shrink truncate border-0 bg-transparent px-1 text-sm font-medium text-fg outline-none focus:ring-1 focus:ring-accent"
				aria-label="Project name"
			/>
			<button
				type="button"
				onclick={() => (projectSwitcherOpen = !projectSwitcherOpen)}
				class="inline-flex size-6 items-center justify-center rounded text-fg-subtle hover:bg-surface-2 hover:text-fg"
				aria-label="Switch project"
				title="Switch project"
			>
				<ChevronDown class="size-3.5" />
			</button>
			{#if projectSwitcherOpen}
				<button
					type="button"
					class="fixed inset-0 z-30 cursor-default"
					onclick={() => (projectSwitcherOpen = false)}
					aria-label="Close project switcher"
					tabindex="-1"
				></button>
				<div
					class="absolute left-0 top-full z-40 mt-1.5 max-h-[420px] w-80 overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-xl"
				>
					{#each allProjects as p (p.id)}
						<a
							href="/project/{p.id}/edit"
							onclick={() => (projectSwitcherOpen = false)}
							class="flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-surface-2 {p.id ===
							projectStore.project?.id
								? 'bg-accent-soft/40'
								: ''}"
						>
							<div
								class="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded bg-fg/5 text-[14px] font-semibold text-fg"
							>
								{#if p.thumbnail}
									<svg
										viewBox={p.thumbnail.viewBox}
										width="32"
										height="32"
										preserveAspectRatio="xMidYMid meet"
										style="transform: scaleY(-1);"
										aria-hidden="true"
									>
										<path d={p.thumbnail.path} fill="currentColor" fill-rule="evenodd" />
									</svg>
								{:else}
									{(p.familyName[0] ?? 'A').toUpperCase()}
								{/if}
							</div>
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-1.5">
									<div class="truncate text-[13px] font-medium text-fg">{p.name}</div>
									{#if p.locked}
										<LockIcon class="size-2.5 text-warn" aria-label="Locked" />
									{/if}
								</div>
								<div class="truncate text-[11px] text-fg-subtle" data-numeric>
									{p.familyName} · {p.glyphCount} drawn{(p.kerningCount ?? 0) > 0
										? ` · ${p.kerningCount} kern`
										: ''}{(p.editsToday ?? 0) > 0 ? ` · ${p.editsToday} today` : ''}
								</div>
								{#if p.tagline}
									<div class="mt-0.5 truncate text-[10px] italic text-fg-subtle">
										{p.tagline}
									</div>
								{/if}
							</div>
						</a>
					{/each}
					{#if allProjects.length === 0}
						<div class="px-3 py-2 text-[12px] text-fg-subtle">No other projects.</div>
					{/if}
					<div class="mt-1 border-t border-border pt-1">
						<a
							href="/"
							class="block rounded-md px-3 py-2 text-[12px] font-medium text-accent hover:bg-accent-soft/40"
						>
							All projects · New font →
						</a>
					</div>
				</div>
			{/if}
		</div>
		<div class="hidden flex-1 items-center gap-3 lg:flex">
			<div class="text-[12px] text-fg-subtle" data-numeric>
				{projectStore.project?.metadata.familyName} · v{projectStore.project?.metadata.version}
			</div>
			{#if projectStore.project && (projectStore.project.masters?.length ?? 0) > 0}
				<label class="ml-2 inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2 py-1">
					<Layers class="size-3 text-fg-muted" />
					<select
						value={projectStore.selectedMasterId ?? ''}
						onchange={(e) =>
							projectStore.selectMaster(e.currentTarget.value || undefined)}
						class="bg-transparent text-[12px] font-medium text-fg outline-none"
						aria-label="Master"
					>
						<option value="">Default</option>
						{#each projectStore.project.masters ?? [] as m (m.id)}
							<option value={m.id}>{m.name}</option>
						{/each}
					</select>
				</label>
			{/if}
		</div>

		<nav class="flex items-center gap-0.5 rounded-lg bg-surface-2 p-0.5">
			{#each tabs as tab (tab.href)}
				{@const Icon = tab.icon}
				<button
					type="button"
					onclick={() => goto(tab.href)}
					title={'shortcut' in tab ? `${tab.label} (${tab.shortcut})` : tab.label}
					class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors {isActive(
						tab.href
					)
						? 'bg-surface text-fg shadow-sm'
						: 'text-fg-muted hover:text-fg'}"
				>
					<Icon class="size-3.5" />
					{tab.label}
					{#if 'badge' in tab && (tab.badge ?? 0) > 0}
						<span
							class="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 font-mono text-[9px] font-semibold text-canvas"
							data-numeric
							aria-label="{tab.badge} errors"
						>
							{tab.badge}
						</span>
					{/if}
				</button>
			{/each}
		</nav>

		<div class="flex items-center gap-0.5">
			<button
				type="button"
				onclick={() => projectStore.undo()}
				disabled={!projectStore.canUndo}
				class="inline-flex size-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent"
				aria-label="Undo"
				title="Undo (⌘Z)"
			>
				<Undo2 class="size-4" />
			</button>
			<button
				type="button"
				onclick={() => projectStore.redo()}
				disabled={!projectStore.canRedo}
				class="inline-flex size-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent"
				aria-label="Redo"
				title="Redo (⌘⇧Z)"
			>
				<Redo2 class="size-4" />
			</button>
		</div>

		<div class="flex items-center gap-2 text-[12px] text-fg-subtle" data-numeric>
			{#if projectStore.saving}
				<Loader class="size-3.5 animate-spin" />
				<span>Saving…</span>
			{:else if projectStore.dirty}
				<Save class="size-3.5" />
				<span>Unsaved</span>
			{:else}
				<Check class="size-3.5 text-success" />
				<span>{savedAgoLabel}</span>
			{/if}
			{#if projectStore.project?.changelog?.[0]}
				<a
					href="/project/{projectStore.project.id}/release"
					class="hidden rounded bg-surface-2/60 px-1.5 py-0.5 font-mono text-[10px] text-fg-muted hover:bg-surface-2 hover:text-fg md:inline-flex"
					title="Last sealed version (jump to Release)"
				>
					v{projectStore.project.changelog[0].version}
				</a>
			{/if}
		</div>

		<div class="relative">
			<button
				type="button"
				onclick={() => (statsOpen = !statsOpen)}
				class="inline-flex size-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
				aria-label="Project stats"
				title="Project stats"
			>
				<BarChart3 class="size-4" />
			</button>
			<StatsPopover open={statsOpen} onclose={() => (statsOpen = false)} />
		</div>

		<button
			type="button"
			onclick={() => projectStore.toggleLock()}
			class="inline-flex size-8 items-center justify-center rounded-md transition-colors hover:bg-surface-2 {projectStore.project?.locked
				? 'text-warn'
				: 'text-fg-muted hover:text-fg'}"
			aria-label={projectStore.project?.locked ? 'Unlock project' : 'Lock project (read-only)'}
			title={projectStore.project?.locked
				? 'Project is locked — unlock to edit (⌘⇧L)'
				: 'Lock — seal as read-only (⌘⇧L)'}
		>
			{#if projectStore.project?.locked}
				<LockIcon class="size-4" />
			{:else}
				<UnlockIcon class="size-4" />
			{/if}
		</button>

		<button
			type="button"
			onclick={() => (shortcutsOpen = true)}
			class="inline-flex size-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
			aria-label="Keyboard shortcuts"
			title="Keyboard shortcuts (?)"
		>
			<HelpCircle class="size-4" />
		</button>

		<button
			type="button"
			onclick={() => (settingsOpen = true)}
			class="inline-flex size-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
			aria-label="Settings"
			title="Settings (API key, etc.)"
		>
			<Settings class="size-4" />
		</button>
	</header>

	<SettingsDialog open={settingsOpen} onclose={() => (settingsOpen = false)} />
	<ShortcutsDialog open={shortcutsOpen} onclose={() => (shortcutsOpen = false)} />
	<CommandPalette open={paletteOpen} onclose={() => (paletteOpen = false)} />

	{#if projectStore.project?.locked}
		<div
			class="flex items-center gap-2 border-b border-warn/40 bg-warn/10 px-4 py-1.5 text-[12px] text-warn"
		>
			<LockIcon class="size-3.5" />
			<span class="font-medium">Project is locked.</span>
			<span class="text-fg-muted">All edits are blocked until you unlock it.</span>
		</div>
	{/if}

	<div class="flex min-h-0 flex-1">
		<div class="w-[260px] shrink-0">
			<GlyphBrowser />
		</div>
		<main class="min-h-0 min-w-0 flex-1 overflow-hidden bg-canvas">
			{@render children()}
		</main>
	</div>
</div>
