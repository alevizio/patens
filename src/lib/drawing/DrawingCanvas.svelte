<script lang="ts">
	import type { BezierContour, FontMetrics, Glyph, SketchStroke } from '$lib/font/types';
	import {
		DEFAULT_STROKE,
		sketchOutlineSvg,
		type StrokeStyle
	} from '$lib/font/sketch-to-bezier';
	import { contoursToSvgPath } from '$lib/font/path';
	import MetricsOverlay from './MetricsOverlay.svelte';
	import VectorPointLayer from './VectorPointLayer.svelte';

	type Tool = 'pencil' | 'eraser' | 'edit';

	type Props = {
		glyph: Glyph;
		metrics: FontMetrics;
		tool?: Tool;
		strokeStyle?: StrokeStyle;
		showSketch?: boolean;
		showVector?: boolean;
		showGrid?: boolean;
		/** Optional reference glyph rendered behind the current one for proportion comparison. */
		reference?: Glyph | null;
		/** Called with the new sketch strokes array (replaces glyph.sketch). */
		onSketchChange?: (strokes: SketchStroke[]) => void;
		/** Called when the user moves/adds/deletes points on the vector layer. */
		onContoursChange?: (contours: BezierContour[]) => void;
	};

	let {
		glyph,
		metrics,
		tool = 'pencil',
		strokeStyle = DEFAULT_STROKE,
		showSketch = true,
		showVector = true,
		showGrid = false,
		reference = null,
		onSketchChange,
		onContoursChange
	}: Props = $props();

	let svgEl: SVGSVGElement | null = $state(null);
	let activePointer = $state<number | null>(null);
	let activeStroke = $state<SketchStroke | null>(null);
	let liveOutline = $state('');
	let renderedWidth = $state(800);

	const advance = $derived(Math.max(glyph.advanceWidth, 400));
	const padX = 100;
	const padY = 80;
	const viewW = $derived(advance + padX * 2);
	const viewH = $derived(metrics.ascender - metrics.descender + padY * 2);
	const viewBox = $derived(
		`${-padX} ${-(metrics.ascender + padY)} ${viewW} ${viewH}`
	);
	const pixelsPerUnit = $derived(renderedWidth / Math.max(viewW, 1));

	$effect(() => {
		if (!svgEl) return;
		const ro = new ResizeObserver((entries) => {
			for (const e of entries) {
				renderedWidth = e.contentRect.width;
			}
		});
		ro.observe(svgEl);
		return () => ro.disconnect();
	});

	const eventToFont = (ev: PointerEvent): { x: number; y: number } | null => {
		if (!svgEl) return null;
		const pt = svgEl.createSVGPoint();
		pt.x = ev.clientX;
		pt.y = ev.clientY;
		const ctm = svgEl.getScreenCTM();
		if (!ctm) return null;
		const inv = ctm.inverse();
		const local = pt.matrixTransform(inv);
		// Y flip — SVG Y+ down, font Y+ up. Drawing layer is rendered with scale(1, -1).
		return { x: local.x, y: -local.y };
	};

	const handlePointerDown = (ev: PointerEvent) => {
		if (tool === 'edit') return; // vector layer handles its own events
		if (ev.button !== 0 && ev.pointerType === 'mouse') return;
		if (!svgEl) return;
		const fp = eventToFont(ev);
		if (!fp) return;
		ev.preventDefault();
		svgEl.setPointerCapture(ev.pointerId);
		activePointer = ev.pointerId;

		if (tool === 'eraser') {
			eraseAt(fp);
			return;
		}

		activeStroke = {
			id: crypto.randomUUID(),
			points: [
				{
					x: fp.x,
					y: fp.y,
					pressure: ev.pressure > 0 ? ev.pressure : ev.pointerType === 'mouse' ? 0.5 : 0.5,
					t: Date.now()
				}
			]
		};
		liveOutline = sketchOutlineSvg(activeStroke, strokeStyle);
	};

	const handlePointerMove = (ev: PointerEvent) => {
		if (activePointer !== ev.pointerId) return;
		const fp = eventToFont(ev);
		if (!fp) return;
		if (tool === 'eraser') {
			eraseAt(fp);
			return;
		}
		if (!activeStroke) return;
		const last = activeStroke.points[activeStroke.points.length - 1];
		const dx = fp.x - last.x;
		const dy = fp.y - last.y;
		if (dx * dx + dy * dy < 4) return; // skip micro-movements (2 font units)
		activeStroke = {
			...activeStroke,
			points: [
				...activeStroke.points,
				{
					x: fp.x,
					y: fp.y,
					pressure: ev.pressure > 0 ? ev.pressure : 0.5,
					t: Date.now()
				}
			]
		};
		liveOutline = sketchOutlineSvg(activeStroke, strokeStyle);
	};

	const handlePointerUp = (ev: PointerEvent) => {
		if (activePointer !== ev.pointerId) return;
		activePointer = null;
		if (svgEl) svgEl.releasePointerCapture(ev.pointerId);
		if (activeStroke && activeStroke.points.length >= 2) {
			const next = [...(glyph.sketch ?? []), activeStroke];
			onSketchChange?.(next);
		}
		activeStroke = null;
		liveOutline = '';
	};

	const eraseAt = (fp: { x: number; y: number }) => {
		const existing = glyph.sketch ?? [];
		if (existing.length === 0) return;
		const radiusSq = (strokeStyle.size * 0.6) ** 2;
		const remaining = existing.filter(
			(s) =>
				!s.points.some((p) => {
					const dx = p.x - fp.x;
					const dy = p.y - fp.y;
					return dx * dx + dy * dy < radiusSq;
				})
		);
		if (remaining.length !== existing.length) {
			onSketchChange?.(remaining);
		}
	};
</script>

<svg
	bind:this={svgEl}
	{viewBox}
	class="h-full w-full select-none touch-none cursor-crosshair"
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onpointerup={handlePointerUp}
	onpointercancel={handlePointerUp}
	role="img"
	aria-label="Drawing canvas for glyph {glyph.name}"
>
	<!-- Inner group flips Y so we can think in font space (Y+ up) -->
	<g transform="scale(1, -1)">
		<MetricsOverlay
			{metrics}
			advanceWidth={advance}
			leftSidebearing={glyph.leftSidebearing}
			rightSidebearing={glyph.rightSidebearing}
			{showGrid}
		/>

		<!-- Reference glyph ghosted behind current glyph for proportion comparison -->
		{#if reference && reference.contours.length > 0 && reference.codepoint !== glyph.codepoint}
			<g fill="var(--color-fg)" opacity="0.08" fill-rule="evenodd" pointer-events="none">
				<path d={contoursToSvgPath(reference.contours)} />
			</g>
		{/if}

		<!-- Sketch layer (translucent) -->
		{#if showSketch && glyph.sketch}
			<g opacity="0.35" fill="var(--color-fg)">
				{#each glyph.sketch as s (s.id)}
					<path d={sketchOutlineSvg(s, strokeStyle)} />
				{/each}
			</g>
		{/if}

		<!-- Vector layer (final) -->
		{#if showVector && glyph.contours.length > 0}
			<g fill="var(--color-fg)" fill-rule="evenodd">
				<path d={contoursToSvgPath(glyph.contours)} />
			</g>
		{/if}

		<!-- Active in-progress stroke -->
		{#if liveOutline}
			<path d={liveOutline} fill="var(--color-fg)" opacity="0.85" />
		{/if}
	</g>

	<!-- Vector point layer overlays on top — uses screen-space (no Y flip), receives its own pointer events -->
	{#if tool === 'edit' && glyph.contours.length > 0 && onContoursChange}
		<VectorPointLayer
			contours={glyph.contours}
			{pixelsPerUnit}
			eventToFont={eventToFont}
			onChange={onContoursChange}
		/>
	{/if}
</svg>
