<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { projectStore } from '$lib/stores/project.svelte';
	import { contoursToSvgPath } from '$lib/font/path';
	import { loadProject } from '$lib/font/project';
	import { listSiblings } from '$lib/font/family';
	import { toast } from '$lib/stores/toast.svelte';
	import Panel from '$lib/ui/Panel.svelte';
	import LoadingPanel from '$lib/ui/LoadingPanel.svelte';
	import Layers from '@lucide/svelte/icons/layers';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import UploadCloud from '@lucide/svelte/icons/upload-cloud';

	const project = $derived(projectStore.project);
	const metrics = $derived(project?.metrics);

	type Layer = {
		id: string;
		label: string;
		sublabel: string;
		color: string;
		pathD: string;
		advanceWidth: number;
		upm: number;
		ascender: number;
		descender: number;
		visible: boolean;
		opacity: number;
		mode: 'stroke' | 'fill' | 'both';
		// Source coord system. Project contours store Y-UP (font convention);
		// opentype.js getPath returns Y-DOWN (SVG convention). The canvas is
		// pre-flipped via scaleY(-1) for Y-UP, so Y-DOWN layers need an extra
		// inversion to render right-side up.
		yDir: 'up' | 'down';
	};

	// Layer palette — reuses the metrics-overlay tokens defined in app.css
	// (--baseline, --x-height, --cap-height, --ascender, --descender plus
	// success). Already a coordinated foundry palette and stays in sync with
	// light/dark theme changes automatically.
	const COLOR_TOKENS = [
		'var(--color-baseline)',
		'var(--color-descender)',
		'var(--color-x-height)',
		'var(--color-ascender)',
		'var(--color-cap-height)',
		'var(--color-warn)'
	];

	let cp = $state<number>(0x0048); // default: H
	let layers = $state<Layer[]>([]);
	let dragActive = $state(false);
	let dragCounter = 0;

	// Sync default codepoint to whatever's selected in the project store
	$effect(() => {
		if (projectStore.selectedCodepoint && layers.length === 0) {
			cp = projectStore.selectedCodepoint;
		}
	});

	const codepointHex = $derived(`U+${cp.toString(16).toUpperCase().padStart(4, '0')}`);
	const charPreview = $derived(
		cp > 0x20 && cp < 0x10000 ? String.fromCodePoint(cp) : ''
	);

	// Build the "self" layer + sibling layers automatically when cp changes
	$effect(() => {
		if (!project) return;
		void cp; // dependency
		rebuildAutoLayers();
	});

	const rebuildAutoLayers = async () => {
		if (!project || !metrics) return;
		// Preserve any reference-font layers (drag-dropped); replace self + siblings
		const preserved = layers.filter((l) => l.id.startsWith('ref-'));
		const next: Layer[] = [];
		// 1. The current project's glyph
		const ownGlyph = project.glyphs[cp];
		if (ownGlyph && ownGlyph.contours.length > 0) {
			next.push({
				id: 'self',
				label: project.metadata.familyName,
				sublabel: project.metadata.styleName,
				color: COLOR_TOKENS[0],
				pathD: contoursToSvgPath(ownGlyph.contours),
				advanceWidth: ownGlyph.advanceWidth,
				upm: metrics.unitsPerEm,
				ascender: metrics.ascender,
				descender: metrics.descender,
				visible: true,
				opacity: 1,
				mode: 'fill',
				yDir: 'up'
			});
		}
		// 2. Sibling glyphs (if family)
		if (project.familyId) {
			const sibs = await listSiblings(project.familyId);
			let colorIdx = 1;
			for (const s of sibs) {
				if (s.id === project.id) continue;
				const sp = await loadProject(s.id);
				if (!sp) continue;
				const g = sp.glyphs[cp];
				if (!g || g.contours.length === 0) continue;
				next.push({
					id: `sibling-${s.id}`,
					label: sp.metadata.familyName,
					sublabel: `${sp.metadata.styleName} (sibling)`,
					color: COLOR_TOKENS[colorIdx % COLOR_TOKENS.length],
					pathD: contoursToSvgPath(g.contours),
					advanceWidth: g.advanceWidth,
					upm: sp.metrics.unitsPerEm,
					ascender: sp.metrics.ascender,
					descender: sp.metrics.descender,
					visible: true,
					opacity: 0.45,
					mode: 'stroke',
					yDir: 'up'
				});
				colorIdx++;
			}
		}
		// 3. Preserved reference layers — recolor sequentially
		for (let i = 0; i < preserved.length; i++) {
			preserved[i] = {
				...preserved[i],
				color: COLOR_TOKENS[(next.length + i) % COLOR_TOKENS.length]
			};
		}
		layers = [...next, ...preserved];
	};

	// Drag-drop reference OTF
	const onDragEnter = (e: DragEvent) => {
		dragCounter++;
		dragActive = true;
		e.preventDefault();
	};
	const onDragLeave = () => {
		dragCounter--;
		if (dragCounter <= 0) dragActive = false;
	};
	const onDragOver = (e: DragEvent) => e.preventDefault();
	const onDrop = async (e: DragEvent) => {
		e.preventDefault();
		dragActive = false;
		dragCounter = 0;
		const file = e.dataTransfer?.files?.[0];
		if (!file) return;
		await addReferenceFromFile(file);
	};

	const addReferenceFromFile = async (file: File) => {
		if (!metrics) return;
		try {
			const buffer = await file.arrayBuffer();
			const opentype = await import('opentype.js');
			const font = opentype.parse(buffer) as unknown as {
				unitsPerEm: number;
				ascender: number;
				descender: number;
				charToGlyph: (s: string) => {
					advanceWidth: number;
					getPath: (x: number, y: number, fontSize: number) => { toPathData: (decimals: number) => string };
				};
				names: { fullName?: { en?: string } };
			};
			const ch = String.fromCodePoint(cp);
			const ot = font.charToGlyph(ch);
			if (!ot) {
				toast.warn(`Reference font has no glyph for ${codepointHex}.`);
				return;
			}
			const pathObj = ot.getPath(0, 0, font.unitsPerEm);
			const pathD = pathObj.toPathData(2);
			const refLabel =
				font.names.fullName?.en?.trim() ?? file.name.replace(/\.[^.]+$/, '');
			const id = `ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
			layers = [
				...layers,
				{
					id,
					label: refLabel,
					sublabel: `${file.name} · reference`,
					color: COLOR_TOKENS[layers.length % COLOR_TOKENS.length],
					pathD,
					advanceWidth: ot.advanceWidth,
					upm: font.unitsPerEm,
					ascender: font.ascender,
					descender: font.descender,
					visible: true,
					opacity: 0.45,
					mode: 'stroke',
					yDir: 'down'
				}
			];
			toast.success(`Loaded ${refLabel} as reference layer.`);
		} catch (err) {
			toast.error(`Couldn't parse font: ${err instanceof Error ? err.message : String(err)}`);
		}
	};

	const removeLayer = (id: string) => {
		layers = layers.filter((l) => l.id !== id);
	};
	const toggleLayer = (id: string) => {
		layers = layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l));
	};
	const cycleMode = (id: string) => {
		layers = layers.map((l) =>
			l.id === id
				? {
						...l,
						mode:
							l.mode === 'fill' ? 'stroke' : l.mode === 'stroke' ? 'both' : 'fill'
					}
				: l
		);
	};
	const setOpacity = (id: string, opacity: number) => {
		layers = layers.map((l) => (l.id === id ? { ...l, opacity } : l));
	};

	// Compute a shared viewBox big enough to fit every layer, normalised to the
	// largest UPM so the comparison is at TRUE relative scale across fonts with
	// different unit systems.
	const targetUpm = $derived(Math.max(1000, ...layers.map((l) => l.upm)));
	const viewBox = $derived.by(() => {
		const upm = targetUpm;
		const top = Math.max(...layers.map((l) => l.ascender * (upm / l.upm)), upm * 0.8);
		const bottom = Math.min(...layers.map((l) => l.descender * (upm / l.upm)), -upm * 0.2);
		const width = Math.max(...layers.map((l) => l.advanceWidth * (upm / l.upm)), upm);
		const pad = Math.round(width * 0.1);
		return `${-pad} ${-top} ${width + pad * 2} ${top - bottom}`;
	});
	// Project metrics → viewBox (targetUpm) scale so guide lines stay glued to
	// project glyph cap/x-height when a higher-UPM reference font joins.
	const guideScale = $derived(metrics ? targetUpm / metrics.unitsPerEm : 1);

	// Quick-pick codepoints from drawn glyphs in the current project
	const drawnGlyphs = $derived.by(() => {
		if (!project) return [];
		return Object.values(project.glyphs)
			.filter((g) => g.contours.length > 0)
			.sort((a, b) => a.codepoint - b.codepoint);
	});

	// Cleanup on navigation
	onDestroy(() => {
		layers = [];
	});

	onMount(() => {
		// nothing async on mount; effect handles initial build
	});
</script>

{#if !project || !metrics}
	<LoadingPanel label="Loading compare" />
{:else}
	<div
		class="relative h-full overflow-auto"
		ondragenter={onDragEnter}
		ondragleave={onDragLeave}
		ondragover={onDragOver}
		ondrop={onDrop}
		role="application"
	>
		<div class="mx-auto flex max-w-5xl flex-col gap-6 p-6">
			<header class="flex items-start gap-3">
				<div class="mt-1 flex size-9 items-center justify-center rounded-md bg-accent-soft text-accent">
					<Layers class="size-4" />
				</div>
				<div>
					<h1 class="text-xl font-semibold tracking-tight">Compare</h1>
					<p class="text-sm text-fg-muted">
						Overlay glyph outlines across your project, family siblings, and any
						reference font. Drop an <code>.otf</code> / <code>.ttf</code> anywhere on
						this page to add it as a layer.
					</p>
				</div>
			</header>

			<Panel>
				<div class="mb-3 flex items-baseline justify-between gap-3">
					<h2 class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
						Glyph
					</h2>
					<span class="font-mono text-[11px] text-fg-subtle" data-numeric>
						{codepointHex}
						{#if charPreview}· "{charPreview}"{/if}
					</span>
				</div>
				<div class="flex flex-wrap gap-1">
					{#each drawnGlyphs as g (g.codepoint)}
						<button
							type="button"
							onclick={() => (cp = g.codepoint)}
							class="size-8 rounded border text-center font-mono text-[12px] transition-colors {cp ===
							g.codepoint
								? 'border-accent bg-accent-soft text-accent'
								: 'border-border bg-surface text-fg-muted hover:border-accent'}"
							title="{g.name} · {`U+${g.codepoint.toString(16).toUpperCase().padStart(4, '0')}`}"
						>
							{#if g.codepoint > 0x20 && g.codepoint < 0x10000}
								{String.fromCodePoint(g.codepoint)}
							{:else}
								·
							{/if}
						</button>
					{/each}
					{#if drawnGlyphs.length === 0}
						<span class="text-[12px] text-fg-subtle">No drawn glyphs in this project yet.</span>
					{/if}
				</div>
			</Panel>

			<Panel padding="none">
				<div
					class="relative grid min-h-[480px] grid-cols-[1fr_280px] divide-x divide-border"
				>
					<div class="overflow-hidden bg-canvas p-6">
						{#if layers.length === 0}
							<div class="flex h-full items-center justify-center text-center text-[12px] text-fg-subtle">
								<div>
									Pick a glyph above, or drop a reference <code>.otf</code> /
									<code>.ttf</code> anywhere on this page.
								</div>
							</div>
						{:else}
							<svg
								viewBox={viewBox}
								class="h-full w-full"
								style="transform: scaleY(-1);"
								preserveAspectRatio="xMidYMid meet"
								aria-label="Glyph overlay comparison"
							>
								<!-- Guides live in viewBox (targetUpm) space — scale project
								     metrics so they stay aligned with project glyph when a
								     reference font bumps targetUpm above project UPM. -->
								<line
									x1={-100000}
									x2={100000}
									y1={0}
									y2={0}
									stroke="currentColor"
									stroke-opacity="0.15"
									stroke-width="2"
									vector-effect="non-scaling-stroke"
								/>
								<line
									x1={-100000}
									x2={100000}
									y1={metrics.capHeight * guideScale}
									y2={metrics.capHeight * guideScale}
									stroke="currentColor"
									stroke-opacity="0.08"
									stroke-width="1"
									vector-effect="non-scaling-stroke"
								/>
								<line
									x1={-100000}
									x2={100000}
									y1={metrics.xHeight * guideScale}
									y2={metrics.xHeight * guideScale}
									stroke="currentColor"
									stroke-opacity="0.08"
									stroke-width="1"
									vector-effect="non-scaling-stroke"
								/>
								{#each layers as layer (layer.id)}
									{#if layer.visible}
										{@const s = targetUpm / layer.upm}
										{@const ys = layer.yDir === 'down' ? -s : s}
										<g transform="scale({s} {ys})" opacity={layer.opacity}>
											<path
												d={layer.pathD}
												fill={layer.mode === 'stroke' ? 'none' : layer.color}
												stroke={layer.mode === 'fill' ? 'none' : layer.color}
												stroke-width="2"
												vector-effect="non-scaling-stroke"
												fill-rule="evenodd"
											/>
										</g>
									{/if}
								{/each}
							</svg>
						{/if}
					</div>

					<div class="flex flex-col gap-2 overflow-y-auto p-3">
						<div class="mb-1 flex items-center justify-between">
							<span class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
								Layers ({layers.length})
							</span>
							<label
								class="inline-flex cursor-pointer items-center gap-1 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-fg-muted hover:border-accent hover:text-accent"
								title="Add a reference font as a comparison layer"
							>
								<UploadCloud class="size-3" /> Add font
								<input
									type="file"
									accept=".otf,.ttf,.woff,.woff2"
									class="hidden"
									onchange={async (e) => {
										const f = e.currentTarget.files?.[0];
										if (f) await addReferenceFromFile(f);
										e.currentTarget.value = '';
									}}
								/>
							</label>
						</div>
						{#if layers.length === 0}
							<p class="text-[11px] text-fg-subtle">
								Layers appear once you pick a drawn glyph.
							</p>
						{/if}
						{#each layers as layer (layer.id)}
							<div
								class="rounded-md border border-border bg-surface-2/40 transition-colors {layer.visible
									? ''
									: 'opacity-50'}"
							>
								<!-- Row 1: title + actions. Primary attention. -->
								<div class="flex items-start gap-2 px-2.5 pt-2">
									<button
										type="button"
										onclick={() => cycleMode(layer.id)}
										class="mt-1 size-3 shrink-0 rounded-sm border transition-transform hover:scale-110"
										style="background-color: {layer.mode !== 'stroke'
											? layer.color
											: 'transparent'}; border-color: {layer.color};"
										title="Rendering: {layer.mode}. Click to cycle fill / stroke / both."
										aria-label="Toggle layer rendering mode"
									></button>
									<div class="min-w-0 flex-1 leading-tight">
										<div class="truncate text-[12px] font-medium text-fg">
											{layer.label}
										</div>
										<div class="truncate text-[10px] text-fg-subtle">
											{layer.sublabel}
										</div>
									</div>
									<button
										type="button"
										onclick={() => toggleLayer(layer.id)}
										class="-mr-1 rounded p-1 text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
										aria-label="Toggle visibility"
										title={layer.visible ? 'Hide this layer' : 'Show this layer'}
									>
										{#if layer.visible}<Eye class="size-3.5" />{:else}<EyeOff class="size-3.5" />{/if}
									</button>
									{#if layer.id.startsWith('ref-')}
										<button
											type="button"
											onclick={() => removeLayer(layer.id)}
											class="-mr-1 rounded p-1 text-fg-subtle transition-colors hover:bg-danger/10 hover:text-danger"
											aria-label="Remove reference layer"
											title="Remove this reference layer"
										>
											<Trash2 class="size-3.5" />
										</button>
									{/if}
								</div>
								<!-- Row 2: metrics inline (advance · UPM). Secondary. -->
								<div
									class="flex items-baseline gap-3 px-2.5 pt-1 font-mono text-[10px] text-fg-subtle"
									data-numeric
								>
									<span>
										adv <span class="text-fg">{layer.advanceWidth}</span>
									</span>
									<span>
										UPM <span class="text-fg">{layer.upm}</span>
									</span>
								</div>
								<!-- Row 3: opacity band — visually subordinate but always reachable. -->
								<label
									class="mt-2 flex items-center gap-2 border-t border-border/60 px-2.5 py-1.5 text-[10px] text-fg-subtle"
								>
									<span class="w-10">opacity</span>
									<input
										type="range"
										min="0.1"
										max="1"
										step="0.05"
										value={layer.opacity}
										oninput={(e) =>
											setOpacity(layer.id, Number(e.currentTarget.value))}
										class="flex-1 accent-accent"
									/>
									<span class="w-6 text-right font-mono" data-numeric>
										{Math.round(layer.opacity * 100)}
									</span>
								</label>
							</div>
						{/each}
					</div>
				</div>
			</Panel>
		</div>

		{#if dragActive}
			<div class="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-accent-soft/95 backdrop-blur-sm">
				<div class="text-center">
					<UploadCloud class="mx-auto mb-3 size-16 text-accent" />
					<div class="text-2xl font-semibold text-accent">Drop font to add layer</div>
					<div class="mt-1 text-sm text-accent/80">.otf · .ttf · .woff · .woff2</div>
				</div>
			</div>
		{/if}
	</div>
{/if}
