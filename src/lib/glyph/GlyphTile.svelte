<script lang="ts">
	import type { ColorPalette, Glyph, RGBA } from '$lib/font/types';
	import { contoursToSvgPath, glyphBounds } from '$lib/font/path';
	import { planColorRender, rgbaToCss, sampleColorLine } from '$lib/font/color';

	// SVG sweep-gradient slice approximation — see DrawingCanvas for
	// rationale. Tile copy uses fewer slices (36) since tiles render
	// small; 5° resolution is fine at 44–48px.
	const TILE_SWEEP_SLICES = 36;
	const tileSweepSlices = (
		center: { x: number; y: number },
		startDeg: number,
		endDeg: number,
		stops: Array<{ offset: number; color: RGBA }>,
		radius: number
	): Array<{ points: string; color: string }> => {
		const out: Array<{ points: string; color: string }> = [];
		const span = endDeg - startDeg;
		for (let i = 0; i < TILE_SWEEP_SLICES; i++) {
			const t1 = i / TILE_SWEEP_SLICES;
			const t2 = (i + 1) / TILE_SWEEP_SLICES;
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
	import Pin from '@lucide/svelte/icons/pin';
	import StickyNote from '@lucide/svelte/icons/sticky-note';
	import Link2 from '@lucide/svelte/icons/link-2';

	type Props = {
		glyph: Glyph;
		selected?: boolean;
		size?: number;
		showLabel?: boolean;
		ascender?: number;
		descender?: number;
		incompatible?: boolean;
		/**
		 * When provided, the tile renders the glyph's colorLayers
		 * (including any linear/radial gradients) using this palette
		 * instead of the monochrome contours. The mono contours render
		 * below the color overlay as a fallback / outline.
		 */
		colorPalette?: ColorPalette | null;
		onclick?: () => void;
		oncontextmenu?: (ev: MouseEvent) => void;
	};

	let {
		glyph,
		selected = false,
		size = 56,
		showLabel = true,
		ascender = 800,
		descender = -200,
		incompatible = false,
		colorPalette = null,
		onclick,
		oncontextmenu
	}: Props = $props();

	// Color render plan — only used when a palette is supplied AND the
	// glyph has visible color layers. Same machinery the DrawingCanvas
	// uses for the editor's color overlay, so gradients render
	// identically in the tile and on the canvas.
	const colorRenderPlan = $derived(
		colorPalette && glyph.colorLayers && glyph.colorLayers.length > 0
			? planColorRender(glyph.colorLayers, colorPalette)
			: []
	);

	const char = $derived(
		glyph.codepoint > 0 && glyph.codepoint < 0x10000 && glyph.codepoint > 0x20
			? String.fromCodePoint(glyph.codepoint)
			: glyph.codepoint === 0x20
				? '␣'
				: ''
	);

	const statusColor = $derived(
		{
			empty: 'bg-fg-subtle/30',
			sketch: 'bg-warn',
			draft: 'bg-accent',
			final: 'bg-success'
		}[glyph.status]
	);

	const fontSpan = $derived(ascender - descender);

	const svgPath = $derived.by(() => {
		if (glyph.contours.length === 0) return '';
		return contoursToSvgPath(glyph.contours);
	});

	const dimsLabel = $derived.by(() => {
		if (glyph.contours.length === 0) return '';
		const b = glyphBounds(glyph.contours);
		const w = Math.round(b.maxX - b.minX);
		const h = Math.round(b.maxY - b.minY);
		return ` · ${w}×${h}`;
	});

	// EM-square viewBox: every tile shows the same span on both axes (the
	// font's full em-height), horizontally centred on each glyph's advance.
	// This keeps every glyph at the same intrinsic scale — a narrow letter
	// (I, l) naturally renders narrow inside the same window that a wide
	// letter (M, W) fills, instead of each being independently stretched.
	const viewBox = $derived.by(() => {
		const advance = Math.max(glyph.advanceWidth, 100);
		const minX = (advance - fontSpan) / 2;
		return `${minX} ${descender} ${fontSpan} ${fontSpan}`;
	});

	const componentCount = $derived(glyph.components?.length ?? 0);

	const noteSnippet = $derived.by(() => {
		const n = glyph.notes?.trim();
		if (!n) return '';
		const first = n.split('\n')[0] ?? '';
		return first.length > 60 ? ` · "${first.slice(0, 57)}…"` : ` · "${first}"`;
	});
</script>

<button
	type="button"
	{onclick}
	oncontextmenu={oncontextmenu ?? undefined}
	aria-pressed={selected}
	class="group relative flex flex-col items-center gap-1 rounded-md border p-1.5 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent {selected
		? 'border-accent bg-accent-soft'
		: 'border-transparent bg-transparent hover:border-border hover:bg-surface-2/60'}"
	title="{glyph.name} · U+{glyph.codepoint.toString(16).toUpperCase().padStart(4, '0')}{dimsLabel} · adv {glyph.advanceWidth}{componentCount > 0 ? ` · ${componentCount} component${componentCount === 1 ? '' : 's'}` : ''}{noteSnippet}"
	style="width: {size + 12}px;"
>
	<div
		class="relative flex items-center justify-center overflow-hidden rounded bg-canvas"
		style="width: {size}px; height: {size}px;"
	>
		{#if svgPath || colorRenderPlan.length > 0}
			<svg
				viewBox={viewBox}
				width={size}
				height={size}
				preserveAspectRatio="xMidYMid meet"
				style="transform: scaleY(-1);"
				aria-hidden="true"
			>
				{#if colorRenderPlan.length > 0}
					{@const tileSweepR = fontSpan * 2}
					<defs>
						{#each colorRenderPlan as step (step.layerId)}
							{#if step.fill.type === 'linearGradient'}
								<linearGradient
									id="gt-grad-{glyph.codepoint}-{step.layerId}"
									gradientUnits="userSpaceOnUse"
									x1={step.fill.start.x}
									y1={step.fill.start.y}
									x2={step.fill.end.x}
									y2={step.fill.end.y}
								>
									{#each step.fill.stops as s (s.offset)}
										<stop offset={s.offset} stop-color={rgbaToCss(s.color)} />
									{/each}
								</linearGradient>
							{:else if step.fill.type === 'radialGradient'}
								<radialGradient
									id="gt-grad-{glyph.codepoint}-{step.layerId}"
									gradientUnits="userSpaceOnUse"
									cx={step.fill.center.x}
									cy={step.fill.center.y}
									r={Math.max(step.fill.radius, 1)}
								>
									{#each step.fill.stops as s (s.offset)}
										<stop offset={s.offset} stop-color={rgbaToCss(s.color)} />
									{/each}
								</radialGradient>
							{:else if step.fill.type === 'sweepGradient'}
								<clipPath id="gt-clip-{glyph.codepoint}-{step.layerId}">
									<path d={step.path} />
								</clipPath>
							{/if}
						{/each}
					</defs>
					{#each colorRenderPlan as step (step.layerId)}
						{#if step.fill.type === 'sweepGradient'}
							<g clip-path="url(#gt-clip-{glyph.codepoint}-{step.layerId})">
								{#each tileSweepSlices(step.fill.center, step.fill.startAngle, step.fill.endAngle, step.fill.stops, tileSweepR) as slice, i (i)}
									<polygon points={slice.points} fill={slice.color} />
								{/each}
							</g>
						{:else}
							<path
								d={step.path}
								fill={step.fill.type === 'solid'
									? rgbaToCss(step.fill.color)
									: `url(#gt-grad-${glyph.codepoint}-${step.layerId})`}
								fill-rule="evenodd"
							/>
						{/if}
					{/each}
				{:else}
					<path d={svgPath} fill="currentColor" fill-rule="evenodd" />
				{/if}
			</svg>
		{:else if char}
			<!-- System-font fallback. Font-size scales with the tile so an
			     undrawn slot renders at approximately the same visual height
			     as a drawn glyph: cap-height of a typical font is ~70% of em,
			     and the drawn-glyph branch above fits the em square to the
			     tile. So sizing the fallback to ~62% of the tile keeps the
			     two pipelines visually matched at any tile size. -->
			<span
				class="font-light leading-none text-fg-subtle"
				style="font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif; font-size: {Math.round(size * 0.62)}px;"
			>
				{char}
			</span>
		{:else}
			<span class="text-[10px] font-mono text-fg-subtle" data-numeric>
				{glyph.codepoint.toString(16).toUpperCase().padStart(4, '0')}
			</span>
		{/if}
	</div>
	{#if showLabel}
		<span class="text-[10px] font-mono text-fg-muted" data-numeric>
			{glyph.codepoint.toString(16).toUpperCase().padStart(4, '0')}
		</span>
	{/if}
	<span
		class="absolute right-1 top-1 size-1.5 rounded-full {statusColor}"
		aria-label="Status: {glyph.status}"
	></span>
	{#if glyph.pinned}
		<Pin
			class="absolute left-1 top-1 size-2.5 fill-warn text-warn"
			aria-label="Pinned"
		/>
	{/if}
	{#if glyph.flagged}
		<span
			class="absolute right-2 top-2 size-2 rounded-full bg-warn ring-1 ring-canvas"
			aria-label="Flagged for review"
			title="Flagged for review"
		></span>
	{/if}
	{#if glyph.notes?.trim()}
		<StickyNote
			class="absolute bottom-1 right-1 size-2.5 {/(?:^|\W)(TODO|FIXME)\b/i.test(glyph.notes)
				? 'text-warn'
				: 'text-accent'}"
			aria-label={/(?:^|\W)(TODO|FIXME)\b/i.test(glyph.notes ?? '')
				? 'Note contains TODO/FIXME'
				: 'Has notes'}
		/>
	{/if}
	{#if incompatible}
		<span
			class="absolute bottom-1 left-1 size-1.5 rounded-full bg-danger ring-1 ring-canvas"
			aria-label="Incompatible with default master"
			title="Contour or point counts differ from the default master"
		></span>
	{/if}
	{#if componentCount > 0}
		<Link2
			class="absolute bottom-1 left-1/2 size-2.5 -translate-x-1/2 text-accent"
			aria-label="Composite glyph ({componentCount} component{componentCount === 1 ? '' : 's'})"
		/>
	{/if}
</button>
