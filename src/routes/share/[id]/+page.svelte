<script lang="ts">
	import GlyphTile from '$lib/glyph/GlyphTile.svelte';
	import { contoursToSvgPath } from '$lib/font/path';
	import {
		defaultPalette,
		planColorRender,
		rgbaToCss,
		sampleColorLine,
		type ColorRenderStep
	} from '$lib/font/color';
	import { detectFeatures, featureLabel } from '$lib/font/feature-detect';
	import type { RGBA } from '$lib/font/types';
	import Eye from '@lucide/svelte/icons/eye';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Download from '@lucide/svelte/icons/download';

	let { data } = $props();
	const project = $derived(data.project);
	// Pass the project's default palette so color/gradient layers
	// render in the glyph tiles. When no palette exists, tiles fall
	// back to monochrome outlines.
	const palette = $derived(defaultPalette(project.palettes));

	// Sweep slice approximation for the typeset preview (SVG has no
	// native conic gradient). Same approach as GlyphTile/DrawingCanvas.
	const TYPESET_SWEEP_SLICES = 48;
	const typesetSweepSlices = (
		center: { x: number; y: number },
		startDeg: number,
		endDeg: number,
		stops: Array<{ offset: number; color: RGBA }>,
		radius: number
	): Array<{ points: string; color: string }> => {
		const out: Array<{ points: string; color: string }> = [];
		const span = endDeg - startDeg;
		for (let i = 0; i < TYPESET_SWEEP_SLICES; i++) {
			const t1 = i / TYPESET_SWEEP_SLICES;
			const t2 = (i + 1) / TYPESET_SWEEP_SLICES;
			const tMid = (t1 + t2) / 2;
			const color = sampleColorLine(stops, tMid);
			const a1 = ((startDeg + span * t1) * Math.PI) / 180;
			const a2 = ((startDeg + span * t2) * Math.PI) / 180;
			out.push({
				points: `${center.x},${center.y} ${center.x + Math.cos(a1) * radius},${center.y + Math.sin(a1) * radius} ${center.x + Math.cos(a2) * radius},${center.y + Math.sin(a2) * radius}`,
				color: rgbaToCss(color)
			});
		}
		return out;
	};

	// Glyph grid: only show drawn glyphs (skip empty placeholders),
	// sorted by codepoint for a stable order.
	const drawnGlyphs = $derived(
		Object.values(project.glyphs)
			.filter((g) => g.contours.length > 0)
			.sort((a, b) => a.codepoint - b.codepoint)
	);

	const ascender = $derived(project.metrics.ascender);
	const descender = $derived(project.metrics.descender);

	// Live typesetting — visitor types any text, we render it inline
	// using the project's own SVG paths. Kerning pairs from the
	// project apply automatically so visitors see the font as the
	// designer intended (not as system-fallback substitutes).
	let typeText = $state('Type something here');
	const kerningLookup = $derived.by(() => {
		const map = new Map<string, number>();
		for (const k of project.kerning) {
			if (typeof k.left !== 'number' || typeof k.right !== 'number') continue;
			map.set(`${k.left},${k.right}`, k.value);
		}
		return map;
	});
	const typeset = $derived.by(() => {
		const out: Array<{
			id: string;
			char: string;
			path: string;
			advance: number;
			x: number;
			colorPlan: ColorRenderStep[];
		}> = [];
		let x = 0;
		const codepoints = [...typeText];
		for (let i = 0; i < codepoints.length; i++) {
			const ch = codepoints[i];
			const cp = ch.codePointAt(0) ?? 0;
			const g = project.glyphs[cp];
			if (!g || g.contours.length === 0) {
				// Missing glyph — render as a hollow box at half-em width.
				const w = Math.round(project.metrics.unitsPerEm * 0.5);
				out.push({ id: `${i}-${cp}`, char: ch, path: '', advance: w, x, colorPlan: [] });
				x += w;
				continue;
			}
			// Compute the color render plan when the glyph has color
			// layers + the project has a palette; otherwise renderColorPlan
			// is empty and we fall back to monochrome contours.
			const colorPlan =
				palette && g.colorLayers && g.colorLayers.length > 0
					? planColorRender(g.colorLayers, palette)
					: [];
			out.push({
				id: `${i}-${cp}`,
				char: ch,
				path: contoursToSvgPath(g.contours),
				advance: g.advanceWidth,
				x,
				colorPlan
			});
			x += g.advanceWidth;
			if (i + 1 < codepoints.length) {
				const nextCp = codepoints[i + 1].codePointAt(0) ?? 0;
				const kv = kerningLookup.get(`${cp},${nextCp}`);
				if (kv !== undefined) x += kv;
			}
		}
		return { glyphs: out, totalWidth: x };
	});

	const fontSpan = $derived(ascender - descender);

	const sweepRadiusTypeset = $derived(fontSpan * 2);

	// Waterfall sample — common pangram laid out at several heights.
	// Reuses the same typeset computation but on a fixed string.
	const WATERFALL_TEXT = 'The quick brown fox jumps over the lazy dog.';
	const WATERFALL_SIZES = [14, 18, 24, 36, 56];
	const computeRow = (text: string): { glyphs: typeof typeset.glyphs; totalWidth: number } => {
		const out: typeof typeset.glyphs = [];
		let x = 0;
		const codepoints = [...text];
		for (let i = 0; i < codepoints.length; i++) {
			const ch = codepoints[i];
			const cp = ch.codePointAt(0) ?? 0;
			const g = project.glyphs[cp];
			if (!g || g.contours.length === 0) {
				const w = Math.round(project.metrics.unitsPerEm * 0.5);
				out.push({ id: `${i}-${cp}`, char: ch, path: '', advance: w, x, colorPlan: [] });
				x += w;
				continue;
			}
			out.push({
				id: `${i}-${cp}`,
				char: ch,
				path: contoursToSvgPath(g.contours),
				advance: g.advanceWidth,
				x,
				colorPlan: []
			});
			x += g.advanceWidth;
			if (i + 1 < codepoints.length) {
				const nextCp = codepoints[i + 1].codePointAt(0) ?? 0;
				const kv = kerningLookup.get(`${cp},${nextCp}`);
				if (kv !== undefined) x += kv;
			}
		}
		return { glyphs: out, totalWidth: x };
	};
	const waterfallRow = $derived(computeRow(WATERFALL_TEXT));

	// Download flow — lazy-loads the export pipeline only on click so
	// the initial share-page bundle stays light for visitors who don't
	// download. Builds the chosen format in-browser and triggers a save.
	let downloading = $state<null | 'otf' | 'woff2'>(null);
	let downloadError = $state<string | null>(null);
	const safeFilename = (s: string): string => s.replace(/[^A-Za-z0-9_-]/g, '') || 'Font';
	const triggerDownload = (buffer: ArrayBuffer, ext: 'otf' | 'woff2', mime: string) => {
		const blob = new Blob([buffer], { type: mime });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${safeFilename(project.metadata.familyName)}-${safeFilename(project.metadata.styleName)}.${ext}`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};
	const downloadOtf = async () => {
		if (downloading) return;
		downloading = 'otf';
		downloadError = null;
		try {
			const { buildFont } = await import('$lib/font/export');
			const { font } = buildFont(project);
			triggerDownload(font.toArrayBuffer(), 'otf', 'font/otf');
		} catch (err) {
			downloadError = err instanceof Error ? err.message : String(err);
		} finally {
			downloading = null;
		}
	};
	const downloadWoff2 = async () => {
		if (downloading) return;
		downloading = 'woff2';
		downloadError = null;
		try {
			const { buildFont } = await import('$lib/font/export');
			const { otfToWoff2 } = await import('$lib/font/woff2');
			const { font } = buildFont(project);
			const otf = font.toArrayBuffer();
			const woff2 = await otfToWoff2(otf);
			triggerDownload(woff2, 'woff2', 'font/woff2');
		} catch (err) {
			downloadError = err instanceof Error ? err.message : String(err);
		} finally {
			downloading = null;
		}
	};

	// Glyph tag inventory — same grouping logic as the design-md exporter.
	// Surfaces the project's own taxonomy (flagship / WIP / alternate /
	// mark / composite / etc.) so designer-friends see what the designer
	// considers special.
	const tagInventory = $derived.by(() => {
		const buckets = new Map<string, string[]>();
		for (const g of Object.values(project.glyphs)) {
			if (!g.tags || g.tags.length === 0) continue;
			const label =
				g.codepoint > 0x20 && g.codepoint < 0x10000
					? String.fromCodePoint(g.codepoint)
					: g.name;
			for (const t of g.tags) {
				const arr = buckets.get(t) ?? [];
				arr.push(label);
				buckets.set(t, arr);
			}
		}
		return [...buckets.entries()]
			.sort((a, b) => b[1].length - a[1].length)
			.map(([tag, members]) => ({ tag, members }));
	});

	// OpenType features the project ships. Combines kern/liga toggles
	// with anything detectFeatures finds via glyph-name suffixes (ss01,
	// onum, etc.).
	const sharedFeatures = $derived.by(() => {
		const out: Array<{ tag: string; label: string; count?: number }> = [];
		if (project.features.kern) out.push({ tag: 'kern', label: 'Kerning' });
		if (project.features.liga) out.push({ tag: 'liga', label: 'Standard ligatures' });
		const disabled = new Set(project.features.disabledAutoFeatures ?? []);
		const autoOn = project.features.autoFeatures !== false;
		if (autoOn) {
			for (const f of detectFeatures(project.glyphs)) {
				if (disabled.has(f.feature)) continue;
				out.push({ tag: f.feature, label: featureLabel(f.feature), count: f.subs.length });
			}
		}
		return out;
	});

	// OpenGraph metadata — derived so social cards always reflect current
	// project state. Description truncated to 200 chars (well under the
	// 300-char Twitter limit) and falls back to a spec summary when the
	// brief is unpopulated.
	const shareTitle = $derived(
		`${project.metadata.familyName} · ${project.metadata.styleName}`
	);
	const shareDesc = $derived.by(() => {
		const briefIntent = project.brief?.intent?.split('. ')[0]?.slice(0, 200);
		if (briefIntent) return briefIntent;
		if (project.description) return project.description.slice(0, 200);
		const drawn = Object.values(project.glyphs).filter((g) => g.contours.length > 0).length;
		return `${drawn} drawn glyphs · UPM ${project.metrics.unitsPerEm} · ${project.kerning.length} kerning pairs`;
	});

	// Specs block — pulled from project state for the visitor footer.
	const specs = $derived.by(() => {
		const drawn = Object.values(project.glyphs).filter((g) => g.contours.length > 0).length;
		const total = Object.keys(project.glyphs).length;
		return {
			drawn,
			total,
			upm: project.metrics.unitsPerEm,
			capHeight: project.metrics.capHeight,
			xHeight: project.metrics.xHeight,
			kerningPairs: project.kerning.length,
			palettes: project.palettes?.length ?? 0,
			axes: project.axes?.length ?? 0
		};
	});
</script>

<svelte:head>
	<title>{project.metadata.familyName} — {project.metadata.styleName}</title>
	<meta name="description" content={shareDesc} />
	<!-- OpenGraph for link unfurls on Twitter, Slack, Discord, iMessage.
	     og:image points at the prerendered /og.png (Font Studio brand
	     image). A project-specific dynamic OG would need a server-side
	     project store which doesn't exist today — IndexedDB lives client-
	     side. The brand image is better than no image for unfurl preview. -->
	<meta property="og:type" content="website" />
	<meta property="og:title" content={shareTitle} />
	<meta property="og:description" content={shareDesc} />
	<meta property="og:site_name" content="Font Studio" />
	<meta property="og:image" content="/og.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={shareTitle} />
	<meta name="twitter:description" content={shareDesc} />
	<meta name="twitter:image" content="/og.png" />
</svelte:head>

<div class="mx-auto max-w-4xl px-6 py-8">
	<!-- Read-only banner — clarifies what the route is for. -->
	<div
		class="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface-2/60 px-3 py-1 text-[11px] font-semibold tracking-wide uppercase text-fg-muted"
	>
		<Eye class="size-3" />
		<span>Shared view · read-only</span>
	</div>

	<header class="mb-8 flex items-start justify-between gap-4">
		<div>
			<h1
				class="text-[36px] leading-tight tracking-tight text-fg"
				style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
			>
				{project.metadata.familyName}
			</h1>
			<p class="mt-1 text-[13px] text-fg-muted">
				{project.metadata.styleName} · designed by {project.metadata.designer || 'Unknown'}
			</p>
			{#if project.description}
				<p class="mt-3 max-w-prose text-[14px] leading-relaxed text-fg">
					{project.description}
				</p>
			{/if}
		</div>
		<!-- Download — two formats: OTF for install, WOFF2 for web.
		     Both lazy-load the export pipeline only on click. -->
		<div class="flex shrink-0 gap-2">
			<button
				type="button"
				onclick={downloadOtf}
				disabled={downloading !== null}
				class="inline-flex items-center gap-1.5 rounded-md border border-accent bg-accent px-3 py-1.5 text-[12px] font-medium text-accent-fg hover:bg-accent/90 disabled:opacity-50"
				title="Download as OTF — install in macOS, Windows, design apps"
			>
				<Download class="size-3.5" />
				{downloading === 'otf' ? 'Building…' : 'OTF'}
			</button>
			<button
				type="button"
				onclick={downloadWoff2}
				disabled={downloading !== null}
				class="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-[12px] font-medium text-fg hover:border-accent disabled:opacity-50"
				title="Download as WOFF2 — for @font-face web embedding"
			>
				<Download class="size-3.5" />
				{downloading === 'woff2' ? 'Building…' : 'WOFF2'}
			</button>
		</div>
	</header>
	{#if downloadError}
		<div class="mb-6 rounded-md bg-danger/10 px-3 py-2 text-[12px] text-danger-strong">
			Download failed: {downloadError}
		</div>
	{/if}

	<!-- Live typeset preview. Renders typed text using the project's
	     own SVG paths + kerning data, so visitors see the WIP font
	     as the designer intended. -->
	<section class="mb-10">
		<h2
			class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"
		>
			Try it
		</h2>
		<input
			type="text"
			bind:value={typeText}
			placeholder="Type something..."
			class="w-full rounded-md border border-border bg-surface px-3 py-2 text-[14px] text-fg outline-none focus:border-accent"
		/>
		<div
			class="mt-3 overflow-x-auto rounded-md border border-border bg-canvas px-4 py-6"
			style="--font-baseline: {ascender}px;"
		>
			<svg
				viewBox="0 {descender} {Math.max(typeset.totalWidth, 100)} {fontSpan}"
				preserveAspectRatio="xMinYMid meet"
				style="height: 96px; width: auto; transform: scaleY(-1); display: block;"
				aria-label="Typeset preview of {project.metadata.familyName}"
			>
				<!-- Color/gradient defs per glyph instance. Each gradient
				     def's id is scoped by glyph index so multiple
				     occurrences of the same letter don't collide. -->
				<defs>
					{#each typeset.glyphs as g (g.id)}
						{#each g.colorPlan as step (step.layerId)}
							{#if step.fill.type === 'linearGradient'}
								<linearGradient
									id="ts-{g.id}-{step.layerId}"
									gradientUnits="userSpaceOnUse"
									x1={step.fill.start.x + g.x}
									y1={step.fill.start.y}
									x2={step.fill.end.x + g.x}
									y2={step.fill.end.y}
								>
									{#each step.fill.stops as s (s.offset)}
										<stop offset={s.offset} stop-color={rgbaToCss(s.color)} />
									{/each}
								</linearGradient>
							{:else if step.fill.type === 'radialGradient'}
								<radialGradient
									id="ts-{g.id}-{step.layerId}"
									gradientUnits="userSpaceOnUse"
									cx={step.fill.center.x + g.x}
									cy={step.fill.center.y}
									r={Math.max(step.fill.radius, 1)}
								>
									{#each step.fill.stops as s (s.offset)}
										<stop offset={s.offset} stop-color={rgbaToCss(s.color)} />
									{/each}
								</radialGradient>
							{:else if step.fill.type === 'sweepGradient'}
								<clipPath id="ts-clip-{g.id}-{step.layerId}">
									<path d={step.path} transform="translate({g.x} 0)" />
								</clipPath>
							{/if}
						{/each}
					{/each}
				</defs>
				{#each typeset.glyphs as g (g.id)}
					{#if g.colorPlan.length > 0}
						{#each g.colorPlan as step (step.layerId)}
							{#if step.fill.type === 'sweepGradient'}
								<g clip-path="url(#ts-clip-{g.id}-{step.layerId})">
									{#each typesetSweepSlices({ x: step.fill.center.x + g.x, y: step.fill.center.y }, step.fill.startAngle, step.fill.endAngle, step.fill.stops, sweepRadiusTypeset) as slice, i (i)}
										<polygon points={slice.points} fill={slice.color} />
									{/each}
								</g>
							{:else}
								<path
									d={step.path}
									transform="translate({g.x} 0)"
									fill={step.fill.type === 'solid'
										? rgbaToCss(step.fill.color)
										: `url(#ts-${g.id}-${step.layerId})`}
									fill-rule="evenodd"
								/>
							{/if}
						{/each}
					{:else if g.path}
						<path
							d={g.path}
							transform="translate({g.x} 0)"
							fill="currentColor"
							fill-rule="evenodd"
							class="text-fg"
						/>
					{:else}
						<rect
							x={g.x + 20}
							y={descender + 20}
							width={g.advance - 40}
							height={fontSpan - 40}
							fill="none"
							stroke="currentColor"
							stroke-width="20"
							stroke-dasharray="40 40"
							class="text-fg-subtle"
						/>
					{/if}
				{/each}
			</svg>
		</div>
		<p class="mt-2 text-[11px] text-fg-subtle">
			Live render with the project's kerning applied. Dashed boxes mark
			glyphs the designer hasn't drawn yet — system font won't substitute.
		</p>
	</section>

	<!-- Brief — visible project narrative for designer-friends.
	     Renders intent + audience + differentiation as a small
	     prose block. Each piece is conditional so the section
	     stays clean for projects without a populated brief. -->
	{#if project.brief && (project.brief.intent || project.brief.audience || project.brief.differentiation)}
		<section class="mb-10">
			<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				Brief
			</h2>
			<div class="space-y-3 rounded-md border border-border bg-surface-2/30 p-4 text-[13px] leading-relaxed text-fg-muted">
				{#if project.brief.intent}
					<p>
						<span class="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
							Intent
						</span><br />
						{project.brief.intent}
					</p>
				{/if}
				{#if project.brief.audience}
					<p>
						<span class="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
							Audience
						</span><br />
						{project.brief.audience}
					</p>
				{/if}
				{#if project.brief.differentiation}
					<p>
						<span class="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
							Differentiation
						</span><br />
						{project.brief.differentiation}
					</p>
				{/if}
			</div>
		</section>
	{/if}

	<!-- Waterfall — same pangram at multiple sizes. Shows how the
	     typeface behaves from caption to display. -->
	{#if waterfallRow.glyphs.length > 0}
		<section class="mb-10">
			<h2
				class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"
			>
				Waterfall
			</h2>
			<div class="space-y-3 rounded-md border border-border bg-canvas px-4 py-5">
				{#each WATERFALL_SIZES as size (size)}
					<div class="flex items-baseline gap-4">
						<span class="w-10 shrink-0 text-right font-mono text-[10px] text-fg-subtle" data-numeric>
							{size}px
						</span>
						<svg
							viewBox="0 {descender} {Math.max(waterfallRow.totalWidth, 100)} {fontSpan}"
							preserveAspectRatio="xMinYMid meet"
							style="height: {size}px; width: auto; transform: scaleY(-1);"
							aria-label="Waterfall {size}px"
						>
							{#each waterfallRow.glyphs as g (g.id)}
								{#if g.path}
									<path
										d={g.path}
										transform="translate({g.x} 0)"
										fill="currentColor"
										fill-rule="evenodd"
										class="text-fg"
									/>
								{/if}
							{/each}
						</svg>
					</div>
				{/each}
			</div>
			<p class="mt-2 text-[11px] text-fg-subtle">
				The classic English pangram from 14px (caption) to 56px (small display).
			</p>
		</section>
	{/if}

	<!-- Specs block — at-a-glance facts for designer-friends. -->
	<section class="mb-10">
		<h2
			class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"
		>
			Specs
		</h2>
		<dl class="grid grid-cols-2 gap-x-6 gap-y-3 rounded-md border border-border bg-surface-2/30 p-4 sm:grid-cols-4">
			<div>
				<dt class="text-[10px] uppercase tracking-wider text-fg-subtle">Drawn</dt>
				<dd class="text-[14px] font-medium text-fg" data-numeric>
					{specs.drawn}/{specs.total}
				</dd>
			</div>
			<div>
				<dt class="text-[10px] uppercase tracking-wider text-fg-subtle">UPM</dt>
				<dd class="text-[14px] font-medium text-fg" data-numeric>{specs.upm}</dd>
			</div>
			<div>
				<dt class="text-[10px] uppercase tracking-wider text-fg-subtle">Cap-height</dt>
				<dd class="text-[14px] font-medium text-fg" data-numeric>{specs.capHeight}</dd>
			</div>
			<div>
				<dt class="text-[10px] uppercase tracking-wider text-fg-subtle">x-height</dt>
				<dd class="text-[14px] font-medium text-fg" data-numeric>{specs.xHeight}</dd>
			</div>
			{#if specs.kerningPairs > 0}
				<div>
					<dt class="text-[10px] uppercase tracking-wider text-fg-subtle">Kerning pairs</dt>
					<dd class="text-[14px] font-medium text-fg" data-numeric>{specs.kerningPairs}</dd>
				</div>
			{/if}
			{#if specs.palettes > 0}
				<div>
					<dt class="text-[10px] uppercase tracking-wider text-fg-subtle">Palettes</dt>
					<dd class="text-[14px] font-medium text-fg" data-numeric>
						{specs.palettes}
						<span class="text-[10px] font-normal text-fg-subtle">CPAL</span>
					</dd>
				</div>
			{/if}
			{#if specs.axes > 0}
				<div>
					<dt class="text-[10px] uppercase tracking-wider text-fg-subtle">Axes</dt>
					<dd class="text-[14px] font-medium text-fg" data-numeric>
						{specs.axes}
						<span class="text-[10px] font-normal text-fg-subtle">VF</span>
					</dd>
				</div>
			{/if}
		</dl>
	</section>

	<!-- Tag inventory — designer-applied taxonomy. -->
	{#if tagInventory.length > 0}
		<section class="mb-10">
			<h2
				class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"
			>
				Tags
			</h2>
			<div class="flex flex-wrap gap-1.5">
				{#each tagInventory as t (t.tag)}
					<span
						class="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2/40 px-2.5 py-1 text-[11px]"
						title={t.members.join(' · ')}
					>
						<span class="font-medium text-fg">{t.tag}</span>
						<span class="text-fg-subtle" data-numeric>{t.members.length}</span>
					</span>
				{/each}
			</div>
		</section>
	{/if}

	<!-- OpenType features the project ships. -->
	{#if sharedFeatures.length > 0}
		<section class="mb-10">
			<h2
				class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"
			>
				OpenType features
			</h2>
			<div class="flex flex-wrap gap-1.5">
				{#each sharedFeatures as f (f.tag)}
					<span
						class="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2/40 px-2.5 py-1 text-[11px]"
						title={f.count !== undefined ? `${f.count} substitution${f.count === 1 ? '' : 's'}` : undefined}
					>
						<span class="font-mono text-fg">{f.tag}</span>
						<span class="text-fg-muted">·</span>
						<span class="text-fg-muted">{f.label}</span>
						{#if f.count !== undefined}
							<span class="font-mono text-[10px] text-fg-subtle" data-numeric>
								·{f.count}
							</span>
						{/if}
					</span>
				{/each}
			</div>
			<!-- CSS snippet for designers embedding via @font-face. Includes
			     the @font-face rule + a feature-settings example with every
			     non-default-on feature so designers see what's available. -->
			<details class="mt-3 rounded-md border border-border bg-surface-2/30">
				<summary class="cursor-pointer px-3 py-2 text-[11px] font-medium text-fg-muted hover:text-fg">
					CSS embed snippet
				</summary>
				<pre
					class="overflow-x-auto border-t border-border bg-canvas/60 px-3 py-3 font-mono text-[11px] leading-relaxed text-fg"><code
						>{`@font-face {
  font-family: '${project.metadata.familyName}';
  src: url('${safeFilename(project.metadata.familyName)}-${safeFilename(project.metadata.styleName)}.woff2') format('woff2');
  font-weight: ${project.familyAxes?.wght ?? 400};
  font-style: normal;
  font-display: swap;
}

body {
  font-family: '${project.metadata.familyName}', sans-serif;
  font-feature-settings: ${sharedFeatures.map((f) => `'${f.tag}' 1`).join(', ')};
}`}</code></pre>
			</details>
		</section>
	{/if}

	<!-- Drawn glyph grid. Counts give context for the work-in-progress
	     state without spilling into editor chrome. -->
	<section class="mb-10">
		<h2
			class="mb-3 flex items-baseline justify-between text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"
		>
			<span>Glyphs</span>
			<span class="font-mono normal-case text-fg-subtle" data-numeric>
				{drawnGlyphs.length} drawn · {Object.keys(project.glyphs).length} total
			</span>
		</h2>
		{#if drawnGlyphs.length === 0}
			<p class="rounded border border-border bg-surface-2/40 p-6 text-center text-[13px] text-fg-muted">
				No glyphs drawn yet.
			</p>
		{:else}
			<div class="grid grid-cols-8 gap-1 sm:grid-cols-10 md:grid-cols-12">
				{#each drawnGlyphs as g (g.codepoint)}
					<GlyphTile
						glyph={g}
						size={48}
						showLabel={false}
						{ascender}
						{descender}
						colorPalette={palette}
					/>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Metadata footer — vendor + license info so the recipient
	     understands the legal context of what they're looking at. -->
	<footer class="border-t border-border pt-6 text-[12px] leading-relaxed text-fg-muted">
		<dl class="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3">
			<div>
				<dt class="text-[10px] font-semibold tracking-wider uppercase text-fg-subtle">
					Version
				</dt>
				<dd class="font-mono text-fg" data-numeric>{project.metadata.version}</dd>
			</div>
			<div>
				<dt class="text-[10px] font-semibold tracking-wider uppercase text-fg-subtle">
					License
				</dt>
				<dd class="text-fg">{project.metadata.license || '—'}</dd>
			</div>
			<div>
				<dt class="text-[10px] font-semibold tracking-wider uppercase text-fg-subtle">
					Vendor
				</dt>
				<dd class="font-mono text-fg" data-numeric>{project.metadata.vendorID || '—'}</dd>
			</div>
		</dl>
		{#if project.metadata.copyright}
			<p class="mt-4 text-fg-muted">{project.metadata.copyright}</p>
		{/if}
	</footer>

	<div class="mt-10">
		<a
			href="/"
			class="inline-flex items-center gap-1.5 text-[12px] text-fg-muted hover:text-fg"
		>
			<ArrowLeft class="size-3" />
			Back to studio
		</a>
	</div>
</div>
