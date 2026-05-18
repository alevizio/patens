<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import type { GlyphReference } from '$lib/font/types';
	import { contoursToSvgPath } from '$lib/font/path';
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
			toast.warn('A glyph cannot reference itself.');
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

	// Live preview: render each referenced glyph at its current offset.
	type PreviewLayer = {
		path: string;
		idx: number;
		offsetX: number;
		offsetY: number;
		anchors: Array<{ name: string; x: number; y: number }>;
	};
	const previewLayers = $derived.by<PreviewLayer[]>(() => {
		if (!project || components.length === 0) return [];
		const layers: PreviewLayer[] = [];
		components.forEach((comp, idx) => {
			const base = project.glyphs[comp.baseCodepoint];
			if (!base) return;
			const path = contoursToSvgPath(base.contours);
			layers.push({
				path,
				idx,
				offsetX: comp.offsetX,
				offsetY: comp.offsetY,
				anchors: base.anchors ?? []
			});
		});
		return layers;
	});
	// Pair base anchors with mark anchors that share the same name (with mark
	// names prefixed by an underscore, e.g. base has `top`, mark has `_top`).
	type AnchorMatch = { name: string; baseIdx: number; markIdx: number; x: number; y: number };
	const anchorMatches = $derived.by<AnchorMatch[]>(() => {
		const out: AnchorMatch[] = [];
		if (previewLayers.length < 2) return out;
		const base = previewLayers[0];
		for (let i = 1; i < previewLayers.length; i++) {
			const mark = previewLayers[i];
			for (const ba of base.anchors) {
				if (ba.name.startsWith('_')) continue;
				const ma = mark.anchors.find((a) => a.name === `_${ba.name}`);
				if (!ma) continue;
				out.push({
					name: ba.name,
					baseIdx: 0,
					markIdx: i,
					x: base.offsetX + ba.x,
					y: base.offsetY + ba.y
				});
			}
		}
		return out;
	});

	const metrics = $derived(project?.metrics);
	const previewViewBox = $derived.by(() => {
		const asc = metrics?.ascender ?? 800;
		const desc = metrics?.descender ?? -200;
		const width = Math.max(...previewLayers.map((l) => l.offsetX + 1000), 1000);
		return `0 ${-asc} ${width} ${asc - desc}`;
	});
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

		{#if components.length > 0 && previewLayers.length > 0}
			<div class="mb-2 overflow-hidden rounded-md border border-border bg-canvas">
				<svg
					viewBox={previewViewBox}
					preserveAspectRatio="xMidYMid meet"
					class="h-32 w-full"
					style="transform: scaleY(-1);"
					aria-label="Composite preview"
				>
					{#each previewLayers as layer (layer.idx)}
						<g transform="translate({layer.offsetX} {layer.offsetY})">
							<path
								d={layer.path}
								fill={layer.idx === 0 ? 'currentColor' : 'var(--color-accent)'}
								fill-rule="evenodd"
								opacity={layer.idx === 0 ? 1 : 0.7}
							/>
							{#each layer.anchors as a (a.name)}
								<circle cx={a.x} cy={a.y} r="14" fill="var(--color-warn)" opacity="0.6" />
							{/each}
						</g>
					{/each}
					{#each anchorMatches as m (m.name)}
						<circle
							cx={m.x}
							cy={m.y}
							r="22"
							fill="none"
							stroke="var(--color-success)"
							stroke-width="6"
							opacity="0.9"
						/>
					{/each}
				</svg>
			</div>
			{#if anchorMatches.length > 0}
				<p class="mb-2 text-[10px] text-success">
					{anchorMatches.length} anchor match{anchorMatches.length === 1 ? '' : 'es'}: {anchorMatches.map((m) => m.name).join(', ')}
					— GPOS mkmk will use these at export.
				</p>
			{/if}
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
