<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { projectStore } from '$lib/stores/project.svelte';
	import { previewStore } from '$lib/stores/preview.svelte';
	import { settings } from '$lib/stores/settings.svelte';
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
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';
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
	import GlyphTile from '$lib/glyph/GlyphTile.svelte';
	import HelpCircle from '@lucide/svelte/icons/help-circle';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import Save from '@lucide/svelte/icons/save';
	import Share2 from '@lucide/svelte/icons/share-2';
	import Printer from '@lucide/svelte/icons/printer';
	import Check from '@lucide/svelte/icons/check';
	import Loader from '@lucide/svelte/icons/loader-2';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';

	let { data, children } = $props();

	// Load project into store on mount / when route ID changes.
	// As of Phase C Day 4, load() is async — it awaits y-indexeddb sync
	// so the doc reflects any locally-persisted Y.Doc state before the
	// UI starts driving mutations. Reference-font loading depends on
	// brief.references which only exists post-hydration.
	$effect(() => {
		if (projectStore.project?.id !== data.project.id) {
			void projectStore.load(data.project).then(() => {
				projectStore.loadAllReferenceFonts();
			});
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

	// Resizable sidebar — persisted globally (not per project).
	let sidebarWidth = $state(260);
	let sidebarCollapsed = $state(false);
	$effect(() => {
		try {
			const stored = localStorage.getItem('font-studio:sidebar-width');
			const n = stored ? parseInt(stored, 10) : NaN;
			if (Number.isFinite(n) && n >= 200 && n <= 500) sidebarWidth = n;
			sidebarCollapsed = localStorage.getItem('font-studio:sidebar-collapsed') === '1';
		} catch {
			// ignore
		}
	});
	const toggleSidebar = () => {
		sidebarCollapsed = !sidebarCollapsed;
		try {
			localStorage.setItem(
				'font-studio:sidebar-collapsed',
				sidebarCollapsed ? '1' : '0'
			);
		} catch {
			// ignore
		}
	};
	let dragging = $state(false);
	const startDrag = (ev: PointerEvent) => {
		ev.preventDefault();
		dragging = true;
		const move = (m: PointerEvent) => {
			const next = Math.max(200, Math.min(500, m.clientX));
			sidebarWidth = next;
		};
		const up = () => {
			dragging = false;
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', up);
			try {
				localStorage.setItem('font-studio:sidebar-width', String(sidebarWidth));
			} catch {
				// ignore
			}
		};
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up);
	};

	let settingsOpen = $state(false);
	let statsOpen = $state(false);
	let shortcutsOpen = $state(false);
	let paletteOpen = $state(false);
	let projectSwitcherOpen = $state(false);
	let projectSwitcherEl = $state<HTMLDivElement | null>(null);

	// Project file export — writes the project as a single .font.json the
	// recipient can drop on their home page to import. This is the
	// portable async-share path that DOESN'T rely on the recipient having
	// the project already in their IndexedDB (the way /share/{id} does).
	const exportProjectFile = () => {
		const p = projectStore.project;
		if (!p) {
			t.warn('No project loaded');
			return;
		}
		const safe = (s: string) => s.replace(/[^A-Za-z0-9_-]/g, '') || 'project';
		const filename = `${safe(p.metadata.familyName)}-${safe(p.metadata.styleName)}.font.json`;
		// Strip the project id so importing creates a new project rather
		// than colliding with an existing record on the recipient's machine.
		// Schema version is preserved so migrate() runs if needed.
		const payload = { ...p, id: undefined };
		const json = JSON.stringify(payload, null, 2);
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		t.success(`Exported ${filename}`);
	};

	// Sliding tab underline. A single absolutely-positioned bar inside the nav
	// translates+scales between tabs on route change. Transform-only so the
	// canvas-drawing surface keeps its frame budget; first paint skips the
	// transition so the bar lands without sliding in from origin.
	let tabNavEl = $state<HTMLElement | null>(null);
	let tabBarLeft = $state(0);
	let tabBarWidth = $state(0);
	let tabBarReady = $state(false);
	const measureActiveTab = () => {
		if (!tabNavEl) return;
		const active = tabNavEl.querySelector<HTMLElement>('a[data-tab-active="true"]');
		if (!active) {
			tabBarWidth = 0;
			return;
		}
		tabBarLeft = active.offsetLeft;
		tabBarWidth = active.offsetWidth;
	};
	$effect(() => {
		// Re-measure whenever the active route changes.
		void currentPath;
		if (!tabNavEl) return;
		requestAnimationFrame(() => {
			measureActiveTab();
			if (!tabBarReady) requestAnimationFrame(() => (tabBarReady = true));
		});
	});
	$effect(() => {
		if (typeof window === 'undefined' || !tabNavEl) return;
		const onResize = () => measureActiveTab();
		window.addEventListener('resize', onResize);
		// ResizeObserver catches width changes the route-change effect misses:
		// e.g. the Audit tab's badge appearing/disappearing shifts every tab
		// to its right, and font loads can also reflow the row.
		const ro = new ResizeObserver(() => measureActiveTab());
		ro.observe(tabNavEl);
		return () => {
			window.removeEventListener('resize', onResize);
			ro.disconnect();
		};
	});

	// Close the project switcher on outside-click + Escape, without rendering
	// a fixed-inset overlay (which used to eat every click on the page).
	$effect(() => {
		if (!projectSwitcherOpen) return;
		const onDown = (e: MouseEvent) => {
			if (!projectSwitcherEl) return;
			if (e.target instanceof Node && projectSwitcherEl.contains(e.target)) return;
			projectSwitcherOpen = false;
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') projectSwitcherOpen = false;
		};
		window.addEventListener('mousedown', onDown, true);
		window.addEventListener('keydown', onKey);
		return () => {
			window.removeEventListener('mousedown', onDown, true);
			window.removeEventListener('keydown', onKey);
		};
	});
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

	// font5.md "four interacting layers" mental model — Brief, Drawing, Compiled, Business.
	const fourLayers = $derived.by(() => {
		const p = projectStore.project;
		if (!p) return [];
		const b = p.brief ?? {};
		const briefChecks = [
			!!b.intent?.trim(),
			!!b.audience?.trim(),
			(b.useCases?.length ?? 0) > 0,
			!!b.readingConditions?.trim(),
			!!b.differentiation?.trim(),
			(b.references?.length ?? 0) > 0
		];
		const briefPct = Math.round((briefChecks.filter(Boolean).length / 6) * 100);
		const total = Object.keys(p.glyphs).length;
		const drawn = Object.values(p.glyphs).filter(
			(g) => g.contours.length > 0 || (g.components?.length ?? 0) > 0
		).length;
		const drawingPct = total > 0 ? Math.round((drawn / total) * 100) : 0;
		const compiledOk = auditErrorCount === 0 && drawn >= 26;
		const businessChecks = [
			!!p.metadata.license?.trim(),
			!!p.metadata.copyright?.trim(),
			!!p.metadata.version?.trim(),
			(p.changelog?.length ?? 0) > 0
		];
		const businessPct = Math.round((businessChecks.filter(Boolean).length / 4) * 100);
		return [
			{ key: 'brief', label: 'Brief', pct: briefPct, href: `/project/${p.id}/brief` },
			{ key: 'drawing', label: 'Drawing', pct: drawingPct, href: `/project/${p.id}/edit` },
			{
				key: 'compiled',
				label: 'Compiled',
				pct: compiledOk ? 100 : drawn >= 26 ? 50 : 0,
				href: `/project/${p.id}/audit`
			},
			{
				key: 'business',
				label: 'Business',
				pct: businessPct,
				href: `/project/${p.id}/release`
			}
		];
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
		{ href: `/project/${id}/compare`, label: 'Compare', icon: Layers },
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
			const wasClean = !projectStore.dirty;
			await projectStore.flush();
			t.success(wasClean ? 'Already saved.' : 'Saved.');
		} else if ((e.metaKey || e.ctrlKey) && e.key === ',') {
			e.preventDefault();
			settingsOpen = !settingsOpen;
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
		} else if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'e' || e.key === 'E')) {
			e.preventDefault();
			await quickExportOtf();
		} else if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
			e.preventDefault();
			toggleSidebar();
		} else if ((e.metaKey || e.ctrlKey) && (e.key === 'j' || e.key === 'J')) {
			e.preventDefault();
			const order: Array<'system' | 'light' | 'dark'> = ['system', 'light', 'dark'];
			const idx = order.indexOf(settings.theme);
			const next = order[(idx + 1) % order.length];
			settings.setTheme(next);
			t.success(`Theme: ${next}`);
		} else if ((e.metaKey || e.ctrlKey) && (e.key === 'm' || e.key === 'M')) {
			// Cycle to the next master
			const masters = projectStore.project?.masters ?? [];
			if (masters.length > 0) {
				e.preventDefault();
				const all = ['default', ...masters.map((m) => m.id)];
				const current = projectStore.selectedMasterId ?? 'default';
				const idx = all.indexOf(current);
				const next = all[(idx + 1) % all.length];
				projectStore.selectMaster(next === 'default' ? undefined : next);
				const label =
					next === 'default'
						? 'Default'
						: masters.find((m) => m.id === next)?.name ?? next;
				t.success(`Master: ${label}`);
			}
		} else if (
			(e.metaKey || e.ctrlKey) &&
			!e.shiftKey &&
			!e.altKey &&
			e.key >= '1' &&
			e.key <= '9'
		) {
			const idx = parseInt(e.key, 10) - 1;
			const tab = tabs[idx];
			if (tab) {
				e.preventDefault();
				goto(tab.href);
			}
		}
	};

	const quickExportOtf = async () => {
		const project = projectStore.project;
		if (!project) return;
		try {
			const { buildFont, downloadFont } = await import('$lib/font/export');
			const result = buildFont(project);
			const filename = `${project.metadata.familyName.replace(/\s+/g, '')}-${project.metadata.styleName.replace(/\s+/g, '')}.otf`;
			downloadFont(result.font, filename);
			t.success(`Exported ${filename}`);
		} catch (err) {
			t.error(`Export failed: ${(err as Error).message}`);
		}
	};
</script>

<svelte:window onkeydown={handleGlobalKey} />

<div class="flex h-screen flex-col">
	<!-- Two-row header, editorial chrome. Row 1 (~52px) carries identity +
	     system actions; row 2 (~38px) carries the tab nav + edit actions.
	     Both rows have been stripped of their cluster-box backgrounds and
	     pill chrome — the buttons sit on the surface directly, separated
	     by spacing and dividers rather than boxes. -->
	<header class="border-b border-border bg-surface">
		<!-- Row 1: identity, family/version meta, save status, system buttons. -->
		<div class="flex h-[52px] items-center gap-4 px-5">
			<a
				href="/"
				class="inline-flex size-7 items-center justify-center text-fg-subtle transition-colors hover:text-fg"
				aria-label="Back to projects"
				title="Back to projects"
			>
				<ArrowLeft class="size-4" />
			</a>

			<!-- Identity zone: glyph thumb, project name (editable), switcher -->
			<div class="relative flex min-w-0 items-center gap-2">
				{#if projectStore.selectedGlyph && projectStore.project}
					<a
						href="/project/{projectStore.project.id}/edit"
						class="shrink-0"
						title="Open {projectStore.selectedGlyph.name} in editor"
					>
						<GlyphTile
							glyph={projectStore.selectedGlyph}
							size={28}
							showLabel={false}
							ascender={projectStore.project.metrics.ascender}
							descender={projectStore.project.metrics.descender}
						/>
					</a>
				{/if}
				<input
					type="text"
					value={nameInput}
					oninput={(e) => projectStore.updateName(e.currentTarget.value)}
					class="min-w-0 max-w-[14rem] truncate border-0 bg-transparent px-1 text-[15px] text-fg outline-none focus:ring-1 focus:ring-accent"
					style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
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
					<!-- No fixed-inset click-catcher — closed by window-mousedown
					     effect above so it doesn't eat clicks on the rest of the page.
					     Editorial direction matches home + families: no row pills,
					     divider rhythm between projects, left-border indicator on
					     active/hover, Hoefler serif on project names. -->
					<div
						bind:this={projectSwitcherEl}
						class="absolute left-0 top-full z-40 mt-1.5 max-h-[420px] w-80 overflow-y-auto rounded-lg border border-border bg-surface shadow-xl"
					>
						<ul class="divide-y divide-border">
							{#each allProjects as p (p.id)}
								{@const active = p.id === projectStore.project?.id}
								<li>
									<a
										href="/project/{p.id}/edit"
										onclick={() => (projectSwitcherOpen = false)}
										class="group flex items-center gap-3 border-l-2 px-3.5 py-2.5 transition-colors {active
											? 'border-fg bg-surface-2/40'
											: 'border-transparent hover:border-border-strong hover:bg-surface-2/30'}"
									>
										<div
											class="flex size-9 shrink-0 items-center justify-center overflow-hidden text-fg"
										>
											{#if p.thumbnail}
												<svg
													viewBox={p.thumbnail.viewBox}
													width="36"
													height="36"
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
												<span
													class="text-[22px] leading-none"
													style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
												>
													{(p.familyName[0] ?? 'A').toUpperCase()}
												</span>
											{/if}
										</div>
										<div class="min-w-0 flex-1">
											<div class="flex items-center gap-1.5">
												<div
													class="truncate text-[14px] leading-tight text-fg"
													style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
												>
													{p.name}
												</div>
												{#if p.locked}
													<LockIcon
														class="size-2.5 shrink-0 text-warn-strong"
														aria-label="Locked"
													/>
												{/if}
											</div>
											<div
												class="mt-0.5 truncate font-mono text-[10px] text-fg-subtle"
												data-numeric
											>
												{p.familyName} · {p.glyphCount} drawn{(p.kerningCount ?? 0) > 0
													? ` · ${p.kerningCount} kern`
													: ''}{(p.editsToday ?? 0) > 0
													? ` · ${p.editsToday} today`
													: ''}
											</div>
											{#if p.tagline}
												<div
													class="mt-0.5 truncate text-[11px] leading-snug text-fg-subtle"
													style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
												>
													{p.tagline}
												</div>
											{/if}
										</div>
									</a>
								</li>
							{/each}
						</ul>
						{#if allProjects.length === 0}
							<div class="px-4 py-3 text-[12px] text-fg-subtle">No other projects.</div>
						{/if}
						<a
							href="/"
							class="block border-t border-border px-4 py-2.5 text-[12px] font-medium text-accent-strong transition-colors hover:bg-accent-soft/30"
						>
							All projects · New font →
						</a>
					</div>
				{/if}
			</div>

			<!-- Meta strip: family name + version + master (lg only). Quiet
			     dot-separated mono line, divider via spacing not borders. -->
			<div class="hidden items-baseline gap-3 pl-3 lg:flex">
				<div class="font-mono text-[11px] text-fg-subtle" data-numeric>
					<span>{projectStore.project?.metadata.familyName}</span>
					<span class="mx-1.5">·</span>
					<span class="text-fg-muted">v{projectStore.project?.metadata.version}</span>
				</div>
				{#if projectStore.project && (projectStore.project.masters?.length ?? 0) > 0}
					<label class="inline-flex items-baseline gap-1.5">
						<span
							class="font-mono text-[10px] tracking-wider text-fg-subtle uppercase"
						>
							Master
						</span>
						<span class="relative inline-block">
							<select
								value={projectStore.selectedMasterId ?? ''}
								onchange={(e) =>
									projectStore.selectMaster(e.currentTarget.value || undefined)}
								class="cursor-pointer appearance-none bg-transparent pr-4 text-[11px] font-medium text-fg outline-none hover:underline hover:underline-offset-4 focus-visible:underline focus-visible:underline-offset-4"
								aria-label="Master"
							>
								<option value="">Default</option>
								{#each projectStore.project.masters ?? [] as m (m.id)}
									<option value={m.id}>{m.name}</option>
								{/each}
							</select>
							<ChevronDown
								class="pointer-events-none absolute top-1/2 right-0 size-3 -translate-y-1/2 text-fg-subtle"
								aria-hidden="true"
							/>
						</span>
					</label>
				{/if}
				{#if projectStore.project?.familyId}
					<a
						href="/family/{projectStore.project.familyId}"
						class="inline-flex items-baseline gap-1 font-mono text-[10px] tracking-wider text-accent-strong uppercase underline-offset-[5px] hover:underline"
						title="Open family hub"
					>
						Family
						{#if projectStore.project.familyAxes?.wght || projectStore.project.familyAxes?.ital}
							<span data-numeric>
								·&nbsp;{projectStore.project.familyAxes?.wght ?? 400}{projectStore
									.project.familyAxes?.ital
									? 'i'
									: ''}
							</span>
						{/if}
					</a>
				{/if}
			</div>

			<div class="flex-1"></div>

			<!-- Save status — text only, no pill chrome. Mono on the "Saved Xs
			     ago" line treats it as data, not as a status badge. Container
			     is items-center because the dot has no baseline; pairing a
			     circle with baseline-aligned text reads misaligned. -->
			<div
				class="hidden items-center gap-1.5 font-mono text-[11px] text-fg-muted md:inline-flex"
				data-numeric
				title={projectStore.saving
					? 'Saving project to local storage'
					: projectStore.dirty
						? 'Unsaved changes will autosave shortly'
						: 'Saved to local storage'}
			>
				{#if projectStore.saving}
					<Loader class="size-3 animate-spin" />
					<span>Saving…</span>
				{:else if projectStore.dirty}
					<span class="size-1.5 rounded-full bg-warn-strong"></span>
					<span>Unsaved</span>
				{:else}
					<span class="size-1.5 rounded-full bg-success-strong"></span>
					<span>{savedAgoLabel}</span>
				{/if}
			</div>

			<!-- System action buttons. No cluster-box chrome — they sit on the
			     header surface with simple spacing. Hover tooltips carry the
			     meaning, no labels needed since the set is unchanging. -->
			<div class="flex items-center gap-1">
				<div class="relative">
					<button
						type="button"
						onclick={() => (statsOpen = !statsOpen)}
						class="inline-flex size-7 items-center justify-center rounded text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
						aria-label="Project stats"
						title="Project stats"
					>
						<BarChart3 class="size-3.5" />
					</button>
					<StatsPopover open={statsOpen} onclose={() => (statsOpen = false)} />
				</div>
				<button
					type="button"
					onclick={async () => {
						const url = `${location.origin}/share/${id}`;
						try {
							await navigator.clipboard.writeText(url);
							t.success('Share link copied');
						} catch {
							t.warn('Could not copy — link: ' + url);
						}
					}}
					class="inline-flex size-7 items-center justify-center rounded text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
					aria-label="Copy share link"
					title="Copy share link (read-only viewer)"
				>
					<Share2 class="size-3.5" />
				</button>
				<button
					type="button"
					onclick={() =>
						window.open(`/share/${id}?print=1`, '_blank', 'noopener,noreferrer')}
					class="inline-flex size-7 items-center justify-center rounded text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
					aria-label="Print specimen sheet"
					title="Print specimen — opens share view + browser print dialog"
				>
					<Printer class="size-3.5" />
				</button>
				<button
					type="button"
					onclick={exportProjectFile}
					class="inline-flex size-7 items-center justify-center rounded text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
					aria-label="Export project as .font.json"
					title="Export project file — single .font.json a friend can drop on their home page to import"
				>
					<Download class="size-3.5" />
				</button>
				<button
					type="button"
					onclick={() => projectStore.toggleLock()}
					class="inline-flex size-7 items-center justify-center rounded transition-colors hover:bg-surface-2 {projectStore.project?.locked
						? 'text-warn-strong'
						: 'text-fg-subtle hover:text-fg'}"
					aria-label={projectStore.project?.locked
						? 'Unlock project'
						: 'Lock project (read-only)'}
					title={projectStore.project?.locked
						? 'Project is locked — unlock to edit (⌘⇧L)'
						: 'Lock — seal as read-only (⌘⇧L)'}
				>
					{#if projectStore.project?.locked}
						<LockIcon class="size-3.5" />
					{:else}
						<UnlockIcon class="size-3.5" />
					{/if}
				</button>
				<button
					type="button"
					onclick={() => (shortcutsOpen = true)}
					class="inline-flex size-7 items-center justify-center rounded text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
					aria-label="Keyboard shortcuts"
					title="Keyboard shortcuts (?)"
				>
					<HelpCircle class="size-3.5" />
				</button>
				<button
					type="button"
					onclick={() => settings.setTheme(settings.theme === 'dark' ? 'light' : 'dark')}
					class="inline-flex size-7 items-center justify-center rounded text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
					aria-label={settings.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
					title={settings.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
				>
					{#if settings.theme === 'dark'}
						<Sun class="size-3.5" />
					{:else}
						<Moon class="size-3.5" />
					{/if}
				</button>
				<button
					type="button"
					onclick={() => (settingsOpen = true)}
					class="inline-flex size-7 items-center justify-center rounded text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
					aria-label="Settings"
					title="Settings (API key, etc.)"
				>
					<Settings class="size-3.5" />
				</button>
			</div>
		</div>

		<!-- Row 2: tab navigation + edit actions. Editorial tab treatment —
		     active state is a thick bottom border (rendered as a single sliding
		     bar) + ink-dark color; inactive is muted with hover. -->
		<div class="flex h-[40px] items-center gap-4 px-5">
			<nav
				bind:this={tabNavEl}
				class="relative flex h-full flex-1 items-stretch gap-7 overflow-x-auto lg:gap-9 xl:gap-12"
			>
				{#each tabs as tab (tab.href)}
					{@const Icon = tab.icon}
					{@const active = isActive(tab.href)}
					<a
						href={tab.href}
						data-tab-active={active}
						title={'shortcut' in tab
							? `${tab.label} (${tab.shortcut})`
							: tab.label}
						class="group relative inline-flex shrink-0 items-center gap-1.5 text-[12px] transition-colors {active
							? 'font-semibold text-fg'
							: 'font-medium text-fg-muted hover:text-fg'}"
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
					</a>
				{/each}

				<!-- Sliding active-tab indicator. Base width 1px, scaled via
				     transform.scaleX. Sits at -bottom-px so it flushes with
				     the header row's own bottom border. -->
				<span
					aria-hidden="true"
					class="tab-underline pointer-events-none absolute -bottom-px left-0 h-[2px] w-px origin-left bg-fg"
					class:tab-underline--ready={tabBarReady}
					style="transform: translate3d({tabBarLeft}px, 0, 0) scaleX({tabBarWidth}); opacity: {tabBarWidth >
					0
						? 1
						: 0};"
				></span>
			</nav>

			<!-- Undo/Redo — kept close to the tabs since they apply to whatever
			     page you're on. -->
			<div class="flex items-center gap-1">
				<button
					type="button"
					onclick={() => projectStore.undo()}
					disabled={!projectStore.canUndo}
					class="inline-flex size-7 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent"
					aria-label="Undo"
					title="Undo (⌘Z)"
				>
					<Undo2 class="size-3.5" />
				</button>
				<button
					type="button"
					onclick={() => projectStore.redo()}
					disabled={!projectStore.canRedo}
					class="inline-flex size-7 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent"
					aria-label="Redo"
					title="Redo (⌘⇧Z)"
				>
					<Redo2 class="size-3.5" />
				</button>
			</div>

			{#if fourLayers.length > 0}
				<div
					class="hidden items-center gap-2 border-l border-border pl-3 lg:flex"
					title="font5.md's four-layer model: brief → drawing → compiled → business"
					aria-label="Project layer progress"
				>
					{#each fourLayers as layer (layer.key)}
						<a
							href={layer.href}
							class="group flex flex-col items-center gap-0.5"
							title="{layer.label}: {layer.pct}%"
						>
							<div class="h-[3px] w-9 overflow-hidden rounded-full bg-surface-2">
								<div
									class="h-full {layer.pct === 100
										? 'bg-success'
										: layer.pct >= 50
											? 'bg-accent'
											: 'bg-warn'}"
									style="width: {layer.pct}%;"
								></div>
							</div>
							<span
								class="text-[9px] tracking-wider text-fg-subtle uppercase group-hover:text-fg"
							>
								{layer.label}
							</span>
						</a>
					{/each}
				</div>
			{/if}

			<!-- Build size + last version. Plain mono text, no chrome — they
			     read as the data they are, hyperlinked through to their tabs. -->
			<div class="hidden items-baseline gap-3 lg:flex">
				{#if projectStore.project?.changelog?.[0]}
					<a
						href="/project/{projectStore.project.id}/release"
						class="font-mono text-[10px] text-fg-muted underline-offset-4 hover:text-fg hover:underline"
						title="Last sealed version (jump to Release)"
						data-numeric
					>
						v{projectStore.project.changelog[0].version}
					</a>
				{/if}
				{#if previewStore.sizeKb > 0}
					<a
						href="/project/{projectStore.project?.id}/export"
						class="font-mono text-[10px] text-fg-muted underline-offset-4 hover:text-fg hover:underline"
						title="Last preview build size · {previewStore.lastBuildMs.toFixed(0)}ms — jump to Export"
						data-numeric
					>
						{previewStore.sizeKb.toFixed(1)} KB
					</a>
				{/if}
			</div>
		</div>
	</header>

	<SettingsDialog open={settingsOpen} onclose={() => (settingsOpen = false)} />
	<ShortcutsDialog open={shortcutsOpen} onclose={() => (shortcutsOpen = false)} />
	<CommandPalette open={paletteOpen} onclose={() => (paletteOpen = false)} />

	{#if projectStore.project?.locked}
		<div
			class="flex items-center gap-2 border-b border-warn/40 bg-warn/10 px-4 py-1.5 text-[12px] text-warn-strong"
		>
			<LockIcon class="size-3.5" />
			<span class="font-medium">Project is locked.</span>
			<span class="text-fg-muted">All edits are blocked until you unlock it.</span>
		</div>
	{/if}

	<div class="flex min-h-0 flex-1">
		{#if !sidebarCollapsed}
			<div class="shrink-0" style="width: {sidebarWidth}px;">
				<GlyphBrowser />
			</div>
			<div
				role="separator"
				aria-orientation="vertical"
				aria-label="Resize sidebar"
				onpointerdown={startDrag}
				class="group flex w-1 shrink-0 cursor-col-resize items-center justify-center bg-border transition-colors hover:bg-accent {dragging
					? 'bg-accent'
					: ''}"
			>
				<span class="h-8 w-px bg-border-strong group-hover:bg-accent"></span>
			</div>
		{:else}
			<button
				type="button"
				onclick={toggleSidebar}
				class="flex h-full w-3 shrink-0 items-center justify-center bg-border text-fg-subtle transition-colors hover:bg-accent hover:text-canvas"
				aria-label="Show glyph browser (⌘\\)"
				title="Show glyph browser (⌘\)"
			>
				›
			</button>
		{/if}
		<main class="min-h-0 min-w-0 flex-1 overflow-hidden bg-canvas">
			{@render children()}
		</main>
	</div>
</div>

<style>
	/* Sliding tab underline.
	   - transform + opacity only (GPU compositor, no layout/paint).
	   - First paint has no transition: the bar lands at the active tab
	     without sliding in from origin. After one RAF, .tab-underline--ready
	     enables the transition for subsequent route changes.
	   - Reduced motion: keep the opacity fade for the rare case where the
	     bar appears/disappears, but skip the slide. */
	.tab-underline {
		transition: none;
		will-change: transform;
	}
	.tab-underline--ready {
		transition:
			transform 280ms cubic-bezier(0.22, 1, 0.36, 1),
			opacity 180ms ease-out;
	}
	@media (prefers-reduced-motion: reduce) {
		.tab-underline--ready {
			transition: opacity 180ms ease-out;
		}
	}
</style>
