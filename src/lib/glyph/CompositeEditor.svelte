<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import type { GlyphReference } from '$lib/font/types';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Plus from '@lucide/svelte/icons/plus';

	let newRefInput = $state('');
	let showAdd = $state(false);

	const glyph = $derived(projectStore.selectedGlyph);
	const components = $derived<GlyphReference[]>(glyph?.components ?? []);

	const project = $derived(projectStore.project);

	const labelFor = (cp: number): string => {
		const g = project?.glyphs[cp];
		if (g) {
			const char =
				cp > 0x20 && cp < 0x10000 ? String.fromCodePoint(cp) : '';
			return `${g.name}${char ? ` "${char}"` : ''}`;
		}
		return `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
	};

	const parseCodepoint = (s: string): number | null => {
		const trimmed = s.trim();
		if (!trimmed) return null;
		const upper = trimmed.replace(/^U\+/i, '').replace(/^0x/i, '');
		if (/^[0-9a-f]+$/i.test(upper)) {
			const n = parseInt(upper, 16);
			if (n > 0 && n < 0x10ffff) return n;
		}
		if ([...trimmed].length === 1) {
			const cp = trimmed.codePointAt(0);
			if (cp && cp > 0) return cp;
		}
		// Try lookup by glyph name
		if (project) {
			for (const g of Object.values(project.glyphs)) {
				if (g.name === trimmed) return g.codepoint;
			}
		}
		return null;
	};

	const updateComponent = (idx: number, mut: Partial<GlyphReference>) => {
		if (!glyph) return;
		projectStore.updateGlyph(glyph.codepoint, (g) => ({
			...g,
			components: (g.components ?? []).map((c, i) => (i === idx ? { ...c, ...mut } : c))
		}));
	};

	const removeComponent = (idx: number) => {
		if (!glyph) return;
		projectStore.updateGlyph(glyph.codepoint, (g) => ({
			...g,
			components: (g.components ?? []).filter((_, i) => i !== idx)
		}));
	};

	const addComponent = (e: Event) => {
		e.preventDefault();
		if (!glyph) return;
		const cp = parseCodepoint(newRefInput);
		if (!cp) return;
		if (cp === glyph.codepoint) {
			alert('A glyph cannot reference itself.');
			return;
		}
		const offsetY = components.length === 0 ? 0 : project?.metrics.xHeight ?? 0;
		projectStore.updateGlyph(glyph.codepoint, (g) => ({
			...g,
			components: [...(g.components ?? []), { baseCodepoint: cp, offsetX: 0, offsetY }]
		}));
		newRefInput = '';
		showAdd = false;
	};

	const nudge = (idx: number, dx: number, dy: number) => {
		const c = components[idx];
		if (!c) return;
		updateComponent(idx, { offsetX: c.offsetX + dx, offsetY: c.offsetY + dy });
	};
</script>

{#if glyph}
	<div class="border-b border-border p-4">
		<h3 class="mb-3 flex items-center justify-between text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			<span>Composite</span>
			<button
				type="button"
				onclick={() => (showAdd = !showAdd)}
				class="inline-flex h-5 items-center gap-1 rounded border border-border bg-surface px-1.5 text-[10px] font-medium text-fg-muted hover:border-accent hover:text-accent"
				aria-label="Add component"
				title="Reference another glyph"
			>
				<Plus class="size-3" /> Add
			</button>
		</h3>

		{#if components.length === 0 && !showAdd}
			<p class="text-[11px] text-fg-subtle">
				No components. Compose this glyph from references (e.g. <code class="font-mono">a</code> + <code class="font-mono">U+0301</code>).
			</p>
		{/if}

		{#if components.length > 0}
			<ul class="mb-2 grid gap-1.5">
				{#each components as comp, idx (idx)}
					<li class="rounded-md border border-border bg-surface-2/40 p-2">
						<div class="mb-1.5 flex items-center justify-between gap-2">
							<span class="truncate text-[12px] font-medium text-fg">
								{labelFor(comp.baseCodepoint)}
							</span>
							<button
								type="button"
								onclick={() => removeComponent(idx)}
								class="rounded p-0.5 text-fg-subtle hover:bg-danger/10 hover:text-danger"
								aria-label="Remove component"
							>
								<Trash2 class="size-3" />
							</button>
						</div>
						<div class="grid grid-cols-2 items-center gap-1.5">
							<label class="flex items-center gap-1 text-[10px] text-fg-subtle">
								<span>x</span>
								<input
									type="number"
									value={comp.offsetX}
									onchange={(e) =>
										updateComponent(idx, { offsetX: Number(e.currentTarget.value) })}
									class="w-full rounded border border-border bg-surface px-1.5 py-0.5 text-right font-mono text-[11px] tabular-nums outline-none focus:border-accent"
								/>
							</label>
							<label class="flex items-center gap-1 text-[10px] text-fg-subtle">
								<span>y</span>
								<input
									type="number"
									value={comp.offsetY}
									onchange={(e) =>
										updateComponent(idx, { offsetY: Number(e.currentTarget.value) })}
									class="w-full rounded border border-border bg-surface px-1.5 py-0.5 text-right font-mono text-[11px] tabular-nums outline-none focus:border-accent"
								/>
							</label>
						</div>
						<div class="mt-1.5 flex justify-center gap-0.5">
							<button
								type="button"
								onclick={() => nudge(idx, -10, 0)}
								class="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] hover:border-accent"
								title="Nudge left 10"
							>←</button>
							<button
								type="button"
								onclick={() => nudge(idx, 0, 10)}
								class="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] hover:border-accent"
								title="Nudge up 10"
							>↑</button>
							<button
								type="button"
								onclick={() => nudge(idx, 0, -10)}
								class="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] hover:border-accent"
								title="Nudge down 10"
							>↓</button>
							<button
								type="button"
								onclick={() => nudge(idx, 10, 0)}
								class="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] hover:border-accent"
								title="Nudge right 10"
							>→</button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}

		{#if showAdd}
			<form onsubmit={addComponent} class="flex items-center gap-1.5">
				<input
					bind:value={newRefInput}
					placeholder="U+0061 or a or acute"
					class="min-w-0 flex-1 rounded border border-border bg-surface px-2 py-1 font-mono text-[11px] outline-none focus:border-accent"
				/>
				<button
					type="submit"
					class="rounded bg-fg px-2 py-1 text-[11px] font-medium text-canvas hover:bg-fg/90"
				>
					Add
				</button>
			</form>
		{/if}

		{#if components.length > 0 && glyph.contours.length === 0}
			<p class="mt-2 text-[10px] text-fg-subtle">
				Pure composite: outlines come from the referenced glyphs at export time.
			</p>
		{:else if components.length > 0}
			<p class="mt-2 text-[10px] text-warn">
				Has both contours and components — export will use contours only.
			</p>
		{/if}
	</div>
{/if}
