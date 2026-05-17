<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { projectStore } from '$lib/stores/project.svelte';
	import { previewStore } from '$lib/stores/preview.svelte';
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
	import SettingsDialog from '$lib/ui/SettingsDialog.svelte';
	import Save from '@lucide/svelte/icons/save';
	import Check from '@lucide/svelte/icons/check';
	import Loader from '@lucide/svelte/icons/loader-2';

	let { data, children } = $props();

	// Load project into store on mount / when route ID changes.
	$effect(() => {
		if (projectStore.project?.id !== data.project.id) {
			projectStore.load(data.project);
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

	let settingsOpen = $state(false);

	const tabs = $derived([
		{ href: `/project/${id}/edit`, label: 'Edit', icon: Pen },
		{ href: `/project/${id}/spacing`, label: 'Spacing', icon: Ruler },
		{ href: `/project/${id}/designspace`, label: 'Designspace', icon: Sliders },
		{ href: `/project/${id}/features`, label: 'Features', icon: Code },
		{ href: `/project/${id}/ai`, label: 'AI', icon: Sparkles },
		{ href: `/project/${id}/preview`, label: 'Preview', icon: EyeIcon },
		{ href: `/project/${id}/specimen`, label: 'Specimen', icon: FileText },
		{ href: `/project/${id}/export`, label: 'Export', icon: Download }
	]);

	const isActive = (href: string) =>
		currentPath === href || currentPath.startsWith(href + '/');

	const nameInput = $derived(projectStore.project?.name ?? '');
</script>

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

		<div class="flex min-w-0 flex-1 items-center gap-3">
			<input
				type="text"
				value={nameInput}
				oninput={(e) => projectStore.updateName(e.currentTarget.value)}
				class="min-w-0 max-w-xs flex-shrink truncate border-0 bg-transparent px-1 text-sm font-medium text-fg outline-none focus:ring-1 focus:ring-accent"
				aria-label="Project name"
			/>
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
					class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors {isActive(
						tab.href
					)
						? 'bg-surface text-fg shadow-sm'
						: 'text-fg-muted hover:text-fg'}"
				>
					<Icon class="size-3.5" />
					{tab.label}
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
				<span>Saved</span>
			{/if}
		</div>

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

	<div class="flex min-h-0 flex-1">
		<div class="w-[260px] shrink-0">
			<GlyphBrowser />
		</div>
		<main class="min-h-0 min-w-0 flex-1 overflow-hidden bg-canvas">
			{@render children()}
		</main>
	</div>
</div>
