<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { goto } from '$app/navigation';
	import { contoursToSvgPath } from '$lib/font/path';
	import type { Glyph } from '$lib/font/types';
	import Search from '@lucide/svelte/icons/search';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import { onMount } from 'svelte';

	type Props = {
		open: boolean;
		onclose: () => void;
	};
	let { open, onclose }: Props = $props();

	let inputEl: HTMLInputElement | null = $state(null);
	let query = $state('');
	let cursor = $state(0);

	const allGlyphs = $derived(Object.values(projectStore.activeGlyphs));

	const score = (g: Glyph, q: string): number => {
		if (!q) return 0;
		const lower = q.toLowerCase();
		const name = g.name.toLowerCase();
		const char = String.fromCodePoint(g.codepoint).toLowerCase();
		const hex = g.codepoint.toString(16).toLowerCase();
		const notes = (g.notes ?? '').toLowerCase();
		const tags = (g.tags ?? []).join(' ');
		if (char === lower) return 100;
		if (name === lower) return 95;
		if (hex === lower) return 90;
		if (name.startsWith(lower)) return 80;
		if (hex.startsWith(lower)) return 75;
		// Exact tag match outranks substring matches in name/notes —
		// "#wip" should land all WIP glyphs at the top.
		if (g.tags?.includes(lower)) return 70;
		if (name.includes(lower)) return 50;
		if (hex.includes(lower)) return 40;
		if (tags.includes(lower)) return 35;
		// Note search — lower score so explicit name/codepoint matches
		// always win, but lets users find "the glyph I wrote TODO in"
		// or "the one tagged 'WIP'" via the command palette.
		if (notes.includes(lower)) return 30;
		return 0;
	};

	// Page navigation commands — prefix-based ">audit" syntax. Returns a
	// flat list of {label, target} pairs filtered by the query suffix.
	type PageCmd = { label: string; slug: string; hint?: string };
	const PAGES: PageCmd[] = [
		{ label: 'Edit', slug: 'edit', hint: 'Draw glyphs' },
		{ label: 'Brief', slug: 'brief', hint: 'Project intent + decisions' },
		{ label: 'Audit', slug: 'audit', hint: 'Issues across the project' },
		{ label: 'Spacing & kerning', slug: 'spacing', hint: 'Pair editor + auto-space' },
		{ label: 'Designspace', slug: 'designspace', hint: 'Axes + masters' },
		{ label: 'Features', slug: 'features', hint: '.fea + palettes + auto-kern' },
		{ label: 'Preview', slug: 'preview', hint: 'Live shape + feature toggles' },
		{ label: 'Compare', slug: 'compare', hint: 'Overlay siblings + references' },
		{ label: 'Specimen', slug: 'specimen', hint: 'Printable sample sheet' },
		{ label: 'Release', slug: 'release', hint: 'Pre-flight + snapshots' },
		{ label: 'Export', slug: 'export', hint: 'OTF / TTF / WOFF2 / bundle' },
		{ label: 'AI', slug: 'ai', hint: 'Suggestions + drafts' }
	];

	const pageMode = $derived(query.startsWith('>'));
	const pageResults = $derived.by(() => {
		if (!pageMode) return [];
		const q = query.slice(1).trim().toLowerCase();
		if (!q) return PAGES;
		return PAGES.filter(
			(p) =>
				p.label.toLowerCase().includes(q) ||
				p.slug.includes(q) ||
				(p.hint ?? '').toLowerCase().includes(q)
		);
	});

	const results = $derived.by(() => {
		if (pageMode) return [];
		const q = query.trim();
		if (!q) {
			// Show recently edited when no query
			return allGlyphs
				.filter((g) => g.contours.length > 0)
				.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
				.slice(0, 12);
		}
		return allGlyphs
			.map((g) => ({ g, s: score(g, q) }))
			.filter((r) => r.s > 0)
			.sort((a, b) => b.s - a.s)
			.slice(0, 12)
			.map((r) => r.g);
	});

	$effect(() => {
		if (open) {
			cursor = 0;
			query = '';
			// Focus on next tick
			queueMicrotask(() => inputEl?.focus());
		}
	});

	const selectAt = (idx: number) => {
		if (pageMode) {
			const p = pageResults[idx];
			if (!p) return;
			const projectId = projectStore.project?.id;
			if (projectId) goto(`/project/${projectId}/${p.slug}`);
			onclose();
			return;
		}
		const g = results[idx];
		if (!g) return;
		projectStore.selectGlyph(g.codepoint);
		onclose();
	};

	const activeListLength = $derived(pageMode ? pageResults.length : results.length);

	const onKey = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			onclose();
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			cursor = Math.min(cursor + 1, activeListLength - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			cursor = Math.max(cursor - 1, 0);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			selectAt(cursor);
		}
	};

	const labelFor = (g: Glyph): string => {
		const char =
			g.codepoint > 0x20 && g.codepoint < 0x10000 ? String.fromCodePoint(g.codepoint) : '';
		return char || g.name;
	};
</script>

{#if open}
	<button
		type="button"
		class="fixed inset-0 z-40 cursor-default bg-canvas/60 backdrop-blur-sm"
		onclick={onclose}
		aria-label="Close palette"
		tabindex="-1"
	></button>
	<div
		role="dialog"
		aria-modal="true"
		aria-label="Glyph search"
		class="fixed left-1/2 top-[20%] z-50 w-[min(540px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
	>
		<div class="relative border-b border-border">
			<Search
				class="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
			/>
			<input
				bind:this={inputEl}
				bind:value={query}
				onkeydown={onKey}
				oninput={() => (cursor = 0)}
				placeholder="Search glyph by character, name, U+XXXX, or > for pages…"
				class="w-full bg-transparent py-3.5 pl-11 pr-4 text-[14px] text-fg outline-none"
			/>
		</div>
		<ul class="max-h-[420px] overflow-y-auto py-1">
			{#if pageMode}
				{#if pageResults.length === 0}
					<li class="px-4 py-6 text-center text-[12px] text-fg-subtle">
						No pages match "{query.slice(1).trim()}".
					</li>
				{/if}
				{#each pageResults as p, i (p.slug)}
					<li>
						<button
							type="button"
							onclick={() => selectAt(i)}
							onmouseenter={() => (cursor = i)}
							class="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors {cursor ===
							i
								? 'bg-accent-soft/40'
								: 'hover:bg-surface-2'}"
						>
							<span
								class="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-surface-2 text-accent-strong"
							>
								<ArrowRight class="size-4" />
							</span>
							<span class="min-w-0 flex-1">
								<span class="block truncate text-[13px] font-medium text-fg">{p.label}</span>
								{#if p.hint}
									<span class="block truncate text-[11px] text-fg-subtle">{p.hint}</span>
								{/if}
							</span>
							<span class="font-mono text-[10px] text-fg-subtle">/{p.slug}</span>
						</button>
					</li>
				{/each}
			{:else}
			{#if results.length === 0}
				<li class="px-4 py-6 text-center text-[12px] text-fg-subtle">
					No glyphs match "{query}".
				</li>
			{/if}
			{#each results as g, i (g.codepoint)}
				<li>
					<button
						type="button"
						onclick={() => selectAt(i)}
						onmouseenter={() => (cursor = i)}
						class="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors {cursor ===
						i
							? 'bg-accent-soft/40'
							: 'hover:bg-surface-2'}"
					>
						<!-- Tile prefers the project's own glyph shape when drawn —
						     designers want to see THEIR work, not a system-font
						     glyph that may look completely different. Falls back to
						     the system-font character when the glyph isn't drawn. -->
						<span
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-surface-2 text-lg"
							style="font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;"
						>
							{#if g.contours.length > 0 && projectStore.project}
								{@const metrics = projectStore.project.metrics}
								<svg
									viewBox="0 {metrics.descender} {Math.max(g.advanceWidth, 100)} {metrics.ascender - metrics.descender}"
									width="24"
									height="24"
									preserveAspectRatio="xMidYMid meet"
									style="transform: scaleY(-1);"
									aria-hidden="true"
								>
									<path
										d={contoursToSvgPath(g.contours)}
										fill="currentColor"
										fill-rule="evenodd"
									/>
								</svg>
							{:else}
								{labelFor(g)}
							{/if}
						</span>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-[13px] font-medium text-fg">{g.name}</span>
							<span class="block truncate text-[11px] text-fg-subtle" data-numeric>
								U+{g.codepoint.toString(16).toUpperCase().padStart(4, '0')}
								{#if g.contours.length === 0}· empty{/if}
							</span>
							{#if query.trim() && g.notes && g.notes.toLowerCase().includes(query.trim().toLowerCase())}
								<!-- Surface matching notes context so the user sees WHY
								     this glyph matched — particularly useful when
								     searching for a tag like "TODO" or a domain term. -->
								<span class="block truncate text-[10px] italic text-fg-muted">
									{g.notes.split('\n')[0]}
								</span>
							{/if}
						</span>
						<span class="font-mono text-[10px] uppercase text-fg-subtle">{g.status}</span>
					</button>
				</li>
			{/each}
			{/if}
		</ul>
		<div class="border-t border-border bg-surface-2/40 px-4 py-1.5 text-[10px] text-fg-subtle">
			<span class="font-mono">↑↓</span> navigate · <span class="font-mono">↵</span> select ·
			<span class="font-mono">esc</span> close ·
			<span class="font-mono">&gt;</span> for page commands
		</div>
	</div>
{/if}
