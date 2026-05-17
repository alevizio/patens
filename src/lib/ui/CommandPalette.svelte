<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import type { Glyph } from '$lib/font/types';
	import Search from '@lucide/svelte/icons/search';
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
		if (char === lower) return 100;
		if (name === lower) return 95;
		if (hex === lower) return 90;
		if (name.startsWith(lower)) return 80;
		if (hex.startsWith(lower)) return 75;
		if (name.includes(lower)) return 50;
		if (hex.includes(lower)) return 40;
		return 0;
	};

	const results = $derived.by(() => {
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
		const g = results[idx];
		if (!g) return;
		projectStore.selectGlyph(g.codepoint);
		onclose();
	};

	const onKey = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			onclose();
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			cursor = Math.min(cursor + 1, results.length - 1);
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
				placeholder="Search glyph by character, name, or U+XXXX…"
				class="w-full bg-transparent py-3.5 pl-11 pr-4 text-[14px] text-fg outline-none"
			/>
		</div>
		<ul class="max-h-[420px] overflow-y-auto py-1">
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
						<span
							class="preview-font flex h-8 w-8 shrink-0 items-center justify-center rounded bg-surface-2 text-lg"
						>
							{labelFor(g)}
						</span>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-[13px] font-medium text-fg">{g.name}</span>
							<span class="block truncate text-[11px] text-fg-subtle" data-numeric>
								U+{g.codepoint.toString(16).toUpperCase().padStart(4, '0')}
								{#if g.contours.length === 0}· empty{/if}
							</span>
						</span>
						<span class="font-mono text-[10px] uppercase text-fg-subtle">{g.status}</span>
					</button>
				</li>
			{/each}
		</ul>
		<div class="border-t border-border bg-surface-2/40 px-4 py-1.5 text-[10px] text-fg-subtle">
			<span class="font-mono">↑↓</span> navigate · <span class="font-mono">↵</span> select ·
			<span class="font-mono">esc</span> close
		</div>
	</div>
{/if}
