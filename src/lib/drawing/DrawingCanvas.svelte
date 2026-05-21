<script lang="ts">
	import type { Anchor, BezierContour, FontMetrics, Glyph, SketchStroke } from '$lib/font/types';
	import {
		DEFAULT_STROKE,
		sketchOutlineSvg,
		type StrokeStyle
	} from '$lib/font/sketch-to-bezier';
	import { contoursToSvgPath } from '$lib/font/path';
	import { planColorRender, rgbaToCss } from '$lib/font/color';
	import type { ColorPalette } from '$lib/font/types';
	import MetricsOverlay from './MetricsOverlay.svelte';
	import VectorPointLayer from './VectorPointLayer.svelte';
	import AnchorLayer from './AnchorLayer.svelte';

	type Tool = 'pencil' | 'eraser' | 'edit';

	type Props = {
		glyph: Glyph;
		metrics: FontMetrics;
		tool?: Tool;
		strokeStyle?: StrokeStyle;
		showSketch?: boolean;
		showVector?: boolean;
		showGrid?: boolean;
		showAnatomy?: boolean;
		/** Optional reference glyph rendered behind the current one for proportion comparison. */
		reference?: Glyph | null;
		/** Family Regular sibling's same-codepoint glyph rendered as a coloured ghost. */
		familyReference?: Glyph | null;
		/** Optional onion-skin previous/next glyphs (rendered translucent flanking the current advance). */
		onionPrev?: Glyph | null;
		onionNext?: Glyph | null;
		/** Snap dragged points to baseline / x-height / cap-height / asc / desc. */
		snapToMetrics?: boolean;
		/** Show anchors on top of the glyph. */
		showAnchors?: boolean;
		/** Bump this number to reset the view to auto-fit. */
		resetSignal?: number;
		/** Called with the new sketch strokes array (replaces glyph.sketch). */
		onSketchChange?: (strokes: SketchStroke[]) => void;
		/** Called when the user moves/adds/deletes points on the vector layer. */
		onContoursChange?: (contours: BezierContour[]) => void;
		/** Called when the user drags an anchor. */
		onAnchorsChange?: (anchors: Anchor[]) => void;
		/** Called with current zoom % whenever the view changes (100 = fit). */
		onZoomChange?: (percent: number) => void;
		/**
		 * Color-font palette in active use. When provided alongside
		 * `glyph.colorLayers`, the canvas paints a translucent composite
		 * of those layers behind the monochrome outline so the designer
		 * can edit contours with full colour context.
		 */
		colorPalette?: ColorPalette | null;
		/**
		 * Called when the user drags a gradient endpoint handle on the
		 * canvas. Receives the layerId and which endpoint moved (start /
		 * end) + the new font-unit coordinate. The parent updates the
		 * layer's gradient field. When omitted, gradient handles render
		 * as static dots (no drag).
		 */
		onGradientEndpointChange?: (
			layerId: string,
			endpoint: 'start' | 'end',
			coord: { x: number; y: number }
		) => void;
	};

	let {
		glyph,
		metrics,
		tool = 'pencil',
		strokeStyle = DEFAULT_STROKE,
		showSketch = true,
		showVector = true,
		showGrid = false,
		showAnatomy = false,
		reference = null,
		familyReference = null,
		onionPrev = null,
		onionNext = null,
		snapToMetrics = true,
		showAnchors = true,
		resetSignal = 0,
		onSketchChange,
		onContoursChange,
		onAnchorsChange,
		onZoomChange,
		colorPalette = null,
		onGradientEndpointChange
	}: Props = $props();

	// Drag state for gradient endpoint handles. Tracked separately
	// from the contour/anchor drag state so the modes don't conflict.
	let gradientDrag = $state<{
		layerId: string;
		endpoint: 'start' | 'end';
		pointerId: number;
	} | null>(null);

	// Translucent color-composite behind the monochrome outline. Skipped
	// when no palette + no layers exist (typical monochrome case).
	const colorRenderPlan = $derived(
		colorPalette ? planColorRender(glyph.colorLayers, colorPalette) : []
	);

	let svgEl: SVGSVGElement | null = $state(null);
	let activePointer = $state<number | null>(null);
	let activeStroke = $state<SketchStroke | null>(null);
	let liveOutline = $state('');
	let renderedWidth = $state(800);
	let spaceHeld = $state(false);
	let panning = $state(false);
	let panLast = $state<{ x: number; y: number } | null>(null);

	const advance = $derived(Math.max(glyph.advanceWidth, 400));
	const padX = 100;
	const padY = 80;
	const autoViewW = $derived(advance + padX * 2);
	const autoViewH = $derived(metrics.ascender - metrics.descender + padY * 2);
	const autoMinX = -padX;
	const autoMinY = $derived(-(metrics.ascender + padY));

	type ViewBox = { minX: number; minY: number; width: number; height: number };
	let viewOverride = $state<ViewBox | null>(null);

	const view = $derived<ViewBox>(
		viewOverride ?? {
			minX: autoMinX,
			minY: autoMinY,
			width: autoViewW,
			height: autoViewH
		}
	);
	const viewBox = $derived(`${view.minX} ${view.minY} ${view.width} ${view.height}`);
	const pixelsPerUnit = $derived(renderedWidth / Math.max(view.width, 1));
	const zoomPercent = $derived(((view.width === 0 ? 0 : autoViewW / view.width) * 100).toFixed(0));

	// Reset override whenever the glyph changes — auto-fit a fresh glyph.
	$effect(() => {
		void glyph.codepoint;
		viewOverride = null;
	});

	// Parent-triggered reset.
	$effect(() => {
		void resetSignal;
		viewOverride = null;
	});

	$effect(() => {
		onZoomChange?.(Number(zoomPercent));
	});

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

	const screenToView = (sx: number, sy: number): { x: number; y: number } => {
		if (!svgEl) return { x: 0, y: 0 };
		const rect = svgEl.getBoundingClientRect();
		const rx = (sx - rect.left) / rect.width;
		const ry = (sy - rect.top) / rect.height;
		return {
			x: view.minX + rx * view.width,
			y: view.minY + ry * view.height
		};
	};

	const handleWheel = (ev: WheelEvent) => {
		ev.preventDefault();
		const factor = Math.exp(ev.deltaY * 0.0015);
		const minWidth = 200;
		const maxWidth = 10000;
		const newWidth = Math.max(minWidth, Math.min(maxWidth, view.width * factor));
		const newHeight = view.height * (newWidth / view.width);
		// Zoom around cursor
		const pivot = screenToView(ev.clientX, ev.clientY);
		const newMinX = pivot.x - ((pivot.x - view.minX) * newWidth) / view.width;
		const newMinY = pivot.y - ((pivot.y - view.minY) * newHeight) / view.height;
		viewOverride = {
			minX: newMinX,
			minY: newMinY,
			width: newWidth,
			height: newHeight
		};
	};

	const handleKeyDown = (ev: KeyboardEvent) => {
		if (ev.target instanceof HTMLInputElement) return;
		if (ev.target instanceof HTMLTextAreaElement) return;
		if (ev.code === 'Space' && !ev.repeat) {
			spaceHeld = true;
		}
		if (ev.key === '0' && (ev.metaKey || ev.ctrlKey)) {
			ev.preventDefault();
			viewOverride = null;
		}
	};

	const handleKeyUp = (ev: KeyboardEvent) => {
		if (ev.code === 'Space') {
			spaceHeld = false;
			panning = false;
			panLast = null;
		}
	};

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
		if (!svgEl) return;
		// Panning takes priority over drawing/editing
		if (spaceHeld || ev.button === 1) {
			ev.preventDefault();
			try {
				svgEl.setPointerCapture(ev.pointerId);
			} catch {
				/* ignore */
			}
			activePointer = ev.pointerId;
			panning = true;
			panLast = { x: ev.clientX, y: ev.clientY };
			return;
		}
		if (tool === 'edit') return; // vector layer handles its own events
		if (ev.button !== 0 && ev.pointerType === 'mouse') return;
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
		if (panning && panLast) {
			const dx = ev.clientX - panLast.x;
			const dy = ev.clientY - panLast.y;
			panLast = { x: ev.clientX, y: ev.clientY };
			if (!svgEl) return;
			const rect = svgEl.getBoundingClientRect();
			const dxView = (-dx / rect.width) * view.width;
			const dyView = (-dy / rect.height) * view.height;
			viewOverride = {
				minX: view.minX + dxView,
				minY: view.minY + dyView,
				width: view.width,
				height: view.height
			};
			return;
		}
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
		if (svgEl) {
			try {
				svgEl.releasePointerCapture(ev.pointerId);
			} catch {
				/* ignore */
			}
		}
		if (panning) {
			panning = false;
			panLast = null;
			return;
		}
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

<svelte:window onkeydown={handleKeyDown} onkeyup={handleKeyUp} />

<svg
	bind:this={svgEl}
	{viewBox}
	class="h-full w-full select-none touch-none {panning
		? 'cursor-grabbing'
		: spaceHeld
			? 'cursor-grab'
			: tool === 'edit'
				? 'cursor-default'
				: 'cursor-crosshair'}"
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onpointerup={handlePointerUp}
	onpointercancel={handlePointerUp}
	onwheel={handleWheel}
	role="application"
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
			{showAnatomy}
		/>

		<!-- Reference bitmap (data URL) — un-flip Y so the image renders right-side-up -->
		{#if glyph.referenceImage}
			{@const ri = glyph.referenceImage}
			<g pointer-events="none" transform="scale(1, -1)">
				<image
					href={ri.src}
					x={ri.x}
					y={-(ri.y + ri.height)}
					width={ri.width}
					height={ri.height}
					opacity={ri.opacity}
					preserveAspectRatio="none"
				/>
			</g>
		{/if}

		<!-- Reference glyph ghosted behind current glyph for proportion comparison -->
		{#if reference && reference.contours.length > 0 && reference.codepoint !== glyph.codepoint}
			<g fill="var(--color-fg)" opacity="0.08" fill-rule="evenodd" pointer-events="none">
				<path d={contoursToSvgPath(reference.contours)} />
			</g>
		{/if}

		<!-- Family Regular ghost: same codepoint, different sibling. Rendered in
		     accent colour so it's visually distinct from the cross-glyph reference. -->
		{#if familyReference && familyReference.contours.length > 0}
			<g fill="var(--color-accent)" opacity="0.16" fill-rule="evenodd" pointer-events="none">
				<path d={contoursToSvgPath(familyReference.contours)} />
			</g>
		{/if}

		<!-- Onion-skin previous glyph (left of current advance) -->
		{#if onionPrev && onionPrev.contours.length > 0}
			<g
				fill="var(--color-fg)"
				opacity="0.16"
				fill-rule="evenodd"
				pointer-events="none"
				transform="translate({-onionPrev.advanceWidth} 0)"
			>
				<path d={contoursToSvgPath(onionPrev.contours)} />
			</g>
		{/if}

		<!-- Onion-skin next glyph (right of current advance) -->
		{#if onionNext && onionNext.contours.length > 0}
			<g
				fill="var(--color-fg)"
				opacity="0.16"
				fill-rule="evenodd"
				pointer-events="none"
				transform="translate({advance} 0)"
			>
				<path d={contoursToSvgPath(onionNext.contours)} />
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

		<!-- Character ghost — fades in only when the glyph has nothing drawn yet
		     and there's no reference image to trace. Gives the designer a faint
		     letterform to aim at so the canvas isn't a blank slate.

		     Note: must NOT use --preview-family. The preview pipeline registers
		     the project's own font, and an empty glyph slot inside that font
		     paints as blank — so the ghost would flash in (system fallback)
		     then vanish (project font wins with no contours). System stack only. -->
		{#if glyph.codepoint > 0x20 && glyph.codepoint < 0x10000 && glyph.contours.length === 0 && (!glyph.sketch || glyph.sketch.length === 0) && !glyph.referenceImage}
			<g transform="scale(1, -1)" pointer-events="none" aria-hidden="true">
				<text
					x={advance / 2}
					y={0}
					text-anchor="middle"
					dominant-baseline="alphabetic"
					font-size={metrics.capHeight}
					fill="var(--color-fg)"
					opacity="0.18"
					style="font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;"
				>
					{String.fromCodePoint(glyph.codepoint)}
				</text>
			</g>
		{/if}

		<!-- Color composite (translucent overlay BEHIND the mono outline).
		     Rendered when the glyph has visible color layers + the project
		     has a palette. Designer edits monochrome contours on top with
		     full colour context visible — Option C from the day-9 design
		     question. Color-fonts M2: a fill can be solid OR a linear
		     gradient; gradients are emitted as <linearGradient> defs
		     referenced by url() in the path's fill attribute. -->
		{#if colorRenderPlan.length > 0}
			<defs>
				{#each colorRenderPlan as step (step.layerId)}
					{#if step.fill.type === 'linearGradient'}
						<linearGradient
							id="grad-{step.layerId}"
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
							id="grad-{step.layerId}"
							gradientUnits="userSpaceOnUse"
							cx={step.fill.center.x}
							cy={step.fill.center.y}
							r={Math.max(step.fill.radius, 1)}
						>
							{#each step.fill.stops as s (s.offset)}
								<stop offset={s.offset} stop-color={rgbaToCss(s.color)} />
							{/each}
						</radialGradient>
					{/if}
				{/each}
			</defs>
			<g opacity="0.45" pointer-events="none" aria-hidden="true">
				{#each colorRenderPlan as step (step.layerId)}
					<path
						d={step.path}
						fill={step.fill.type === 'solid'
							? rgbaToCss(step.fill.color)
							: `url(#grad-${step.layerId})`}
						fill-rule="evenodd"
					/>
				{/each}
			</g>
			<!-- Gradient endpoint drag handles. Sit ABOVE the colour
			     overlay so they're hit-testable; sized in font-units so
			     they stay visually consistent across zoom levels. For
			     linear gradients: A = start, B = end. For radial: A =
			     centre, B = a point on the radius circle. -->
			{#if onGradientEndpointChange}
				{@const handleR = Math.max(12, 10 / Math.max(pixelsPerUnit, 0.01))}
				{@const lineW = Math.max(2, 2 / Math.max(pixelsPerUnit, 0.01))}
				{#each colorRenderPlan as step (step.layerId)}
					{#if step.fill.type === 'linearGradient' || step.fill.type === 'radialGradient'}
						{@const ptA = step.fill.type === 'linearGradient' ? step.fill.start : step.fill.center}
						{@const ptB =
							step.fill.type === 'linearGradient'
								? step.fill.end
								: { x: step.fill.center.x + step.fill.radius, y: step.fill.center.y }}
						<g class="gradient-handles">
							{#if step.fill.type === 'linearGradient'}
								<line
									x1={ptA.x}
									y1={ptA.y}
									x2={ptB.x}
									y2={ptB.y}
									stroke="var(--color-accent)"
									stroke-width={lineW}
									stroke-dasharray="{lineW * 2} {lineW * 2}"
									opacity="0.7"
									pointer-events="none"
								/>
							{:else}
								<circle
									cx={ptA.x}
									cy={ptA.y}
									r={step.fill.radius}
									fill="none"
									stroke="var(--color-accent)"
									stroke-width={lineW}
									stroke-dasharray="{lineW * 2} {lineW * 2}"
									opacity="0.7"
									pointer-events="none"
								/>
							{/if}
							{#each [
								{ ep: 'start' as const, pt: ptA, label: 'A' },
								{ ep: 'end' as const, pt: ptB, label: 'B' }
							] as h (step.layerId + '-' + h.ep)}
								<g
									role="slider"
									aria-label="Gradient {h.ep} handle"
									aria-valuenow={Math.round(h.pt.x)}
									tabindex="0"
									onpointerdown={(ev) => {
										ev.stopPropagation();
										ev.preventDefault();
										const target = ev.currentTarget as Element;
										try {
											target.setPointerCapture(ev.pointerId);
										} catch {
											/* ignore */
										}
										gradientDrag = {
											layerId: step.layerId,
											endpoint: h.ep,
											pointerId: ev.pointerId
										};
									}}
									onpointermove={(ev) => {
										if (
											!gradientDrag ||
											gradientDrag.pointerId !== ev.pointerId
										)
											return;
										const fp = eventToFont(ev);
										if (!fp || !onGradientEndpointChange) return;
										ev.stopPropagation();
										onGradientEndpointChange(
											gradientDrag.layerId,
											gradientDrag.endpoint,
											{ x: Math.round(fp.x), y: Math.round(fp.y) }
										);
									}}
									onpointerup={(ev) => {
										if (
											!gradientDrag ||
											gradientDrag.pointerId !== ev.pointerId
										)
											return;
										try {
											(ev.currentTarget as Element).releasePointerCapture(
												ev.pointerId
											);
										} catch {
											/* ignore */
										}
										gradientDrag = null;
									}}
									style="cursor: grab;"
								>
									<circle
										cx={h.pt.x}
										cy={h.pt.y}
										r={handleR}
										fill="white"
										stroke="var(--color-accent)"
										stroke-width={lineW}
									/>
									<text
										x={h.pt.x}
										y={h.pt.y}
										text-anchor="middle"
										dominant-baseline="central"
										font-size={handleR * 1.2}
										fill="var(--color-accent)"
										font-weight="600"
										transform="scale(1 -1)"
										transform-origin="{h.pt.x} {h.pt.y}"
										pointer-events="none"
									>{h.label}</text>
								</g>
							{/each}
						</g>
					{/if}
				{/each}
			{/if}
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
			{metrics}
			snap={snapToMetrics}
			eventToFont={eventToFont}
			onChange={onContoursChange}
		/>
	{/if}

	<!-- Anchor layer (always visible above the glyph; draggable when shown) -->
	{#if showAnchors && glyph.anchors && glyph.anchors.length > 0 && onAnchorsChange}
		<AnchorLayer
			anchors={glyph.anchors}
			{pixelsPerUnit}
			eventToFont={eventToFont}
			onChange={onAnchorsChange}
		/>
	{/if}
</svg>
