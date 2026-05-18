<script lang="ts">
	import type { BezierContour, FontMetrics } from '$lib/font/types';
	import {
		collectHandlesForPoint,
		collectOnCurvePoints,
		collectSegments,
		deletePoints,
		insertPointOnSegment,
		movePoint,
		movePoints,
		moveHandle,
		pointsInRect,
		projectOntoSegment,
		rebalanceSmoothHandles,
		togglePointType,
		type HandleRef,
		type PointRef
	} from '$lib/font/path-edit';

	type Props = {
		contours: BezierContour[];
		/** Screen pixels per font unit. Used to size handles consistently. */
		pixelsPerUnit: number;
		metrics: FontMetrics;
		snap: boolean;
		eventToFont: (ev: PointerEvent) => { x: number; y: number } | null;
		onChange: (contours: BezierContour[]) => void;
	};

	let { contours, pixelsPerUnit, metrics, snap, eventToFont, onChange }: Props = $props();

	let selectedSet = $state(new Set<string>());
	let primarySelected = $state<PointRef | null>(null);
	let dragging = $state<{ kind: 'point' | 'handle'; ref: PointRef | HandleRef } | null>(null);
	let activePointer = $state<number | null>(null);
	let dragLast = $state<{ x: number; y: number } | null>(null);
	let marqueeStart = $state<{ x: number; y: number } | null>(null);
	let marqueeNow = $state<{ x: number; y: number } | null>(null);

	const handleR = $derived(Math.max(4, 5 / Math.max(pixelsPerUnit, 0.1)));
	const handleSmallR = $derived(Math.max(3, 4 / Math.max(pixelsPerUnit, 0.1)));
	const segHit = $derived(Math.max(6, 10 / Math.max(pixelsPerUnit, 0.1)));
	const snapTol = $derived(Math.max(6, 12 / Math.max(pixelsPerUnit, 0.1)));

	const points = $derived(collectOnCurvePoints(contours));
	const segments = $derived(collectSegments(contours));
	const handles = $derived.by(() =>
		primarySelected ? collectHandlesForPoint(contours, primarySelected) : []
	);

	const refKey = (ref: PointRef) => `${ref.contour}:${ref.index}`;
	const isSelected = (ref: PointRef) => selectedSet.has(refKey(ref));

	const snapY = (y: number): number => {
		if (!snap) return y;
		const candidates = [0, metrics.xHeight, metrics.capHeight, metrics.ascender, metrics.descender];
		for (const c of candidates) {
			if (Math.abs(y - c) < snapTol) return c;
		}
		return y;
	};

	const setSelectionOne = (ref: PointRef) => {
		selectedSet = new Set([refKey(ref)]);
		primarySelected = ref;
	};

	const toggleSelection = (ref: PointRef) => {
		const k = refKey(ref);
		const next = new Set(selectedSet);
		if (next.has(k)) next.delete(k);
		else next.add(k);
		selectedSet = next;
		primarySelected = next.size > 0 ? ref : null;
	};

	const onPointPointerDown = (ev: PointerEvent, ref: PointRef) => {
		ev.stopPropagation();
		ev.preventDefault();
		const target = ev.currentTarget as Element;
		try {
			target.setPointerCapture(ev.pointerId);
		} catch {
			/* ignore */
		}
		activePointer = ev.pointerId;

		// Alt-click: toggle smooth/corner on this point. Don't start a drag.
		if (ev.altKey) {
			onChange(togglePointType(contours, ref));
			setSelectionOne(ref);
			return;
		}

		if (ev.shiftKey) {
			toggleSelection(ref);
		} else if (!isSelected(ref)) {
			setSelectionOne(ref);
		} else {
			primarySelected = ref;
		}

		const fp = eventToFont(ev);
		if (fp) dragLast = fp;
		dragging = { kind: 'point', ref };
	};

	const onHandlePointerDown = (ev: PointerEvent, ref: HandleRef) => {
		ev.stopPropagation();
		ev.preventDefault();
		const target = ev.currentTarget as Element;
		try {
			target.setPointerCapture(ev.pointerId);
		} catch {
			/* ignore */
		}
		activePointer = ev.pointerId;
		dragging = { kind: 'handle', ref };
	};

	const onPointerMove = (ev: PointerEvent) => {
		if (activePointer !== ev.pointerId) return;
		const fp = eventToFont(ev);
		if (!fp) return;
		if (!dragging) return;
		ev.stopPropagation();
		if (dragging.kind === 'point') {
			const ref = dragging.ref as PointRef;
			const sx = Math.round(fp.x);
			const sy = Math.round(snapY(fp.y));
			if (selectedSet.size > 1 && dragLast) {
				// Multi-move: translate every selected by delta from last position
				const refs: PointRef[] = [...selectedSet].map((k) => {
					const [c, i] = k.split(':').map(Number);
					return { contour: c, index: i };
				});
				const dx = sx - Math.round(dragLast.x);
				const dy = sy - Math.round(dragLast.y);
				if (dx !== 0 || dy !== 0) {
					onChange(movePoints(contours, refs, dx, dy));
					dragLast = { x: dragLast.x + dx, y: dragLast.y + dy };
				}
			} else {
				onChange(movePoint(contours, ref, sx, sy));
				dragLast = { x: sx, y: sy };
			}
		} else if (dragging.kind === 'handle') {
			const ref = dragging.ref as HandleRef;
			let next = moveHandle(contours, ref, Math.round(fp.x), Math.round(fp.y));
			// If the anchor point owning this handle is smooth, mirror the opposite
			// handle so they stay colinear through the anchor (G1 continuity).
			if (primarySelected) {
				const anchorCmd = next[primarySelected.contour]?.commands[primarySelected.index];
				if (
					anchorCmd &&
					'pointType' in anchorCmd &&
					anchorCmd.pointType === 'smooth'
				) {
					next = rebalanceSmoothHandles(next, primarySelected, ref);
				}
			}
			onChange(next);
		}
	};

	const onPointerUp = (ev: PointerEvent) => {
		if (activePointer !== ev.pointerId) return;
		try {
			(ev.currentTarget as Element).releasePointerCapture(ev.pointerId);
		} catch {
			/* ignore */
		}
		activePointer = null;
		dragging = null;
		dragLast = null;
	};

	const onSegmentClick = (ev: PointerEvent) => {
		if (ev.button !== 0 && ev.pointerType === 'mouse') return;
		const fp = eventToFont(ev);
		if (!fp) return;
		let best: { seg: (typeof segments)[number]; t: number; x: number; y: number; d: number } | null = null;
		const hitSq = segHit * segHit;
		for (const seg of segments) {
			const r = projectOntoSegment(seg, fp.x, fp.y);
			if (r.distSq < hitSq && (!best || r.distSq < best.d)) {
				best = { seg, t: r.t, x: r.x, y: r.y, d: r.distSq };
			}
		}
		if (!best) return;
		ev.stopPropagation();
		ev.preventDefault();
		const result = insertPointOnSegment(contours, best.seg, Math.round(best.x), Math.round(best.y));
		onChange(result.contours);
		setSelectionOne(result.ref);
	};

	// Background marquee select — pointerdown on a transparent rect covering the whole canvas
	const onMarqueeDown = (ev: PointerEvent) => {
		if (ev.button !== 0 && ev.pointerType === 'mouse') return;
		const fp = eventToFont(ev);
		if (!fp) return;
		ev.stopPropagation();
		const target = ev.currentTarget as Element;
		try {
			target.setPointerCapture(ev.pointerId);
		} catch {
			/* ignore */
		}
		activePointer = ev.pointerId;
		marqueeStart = fp;
		marqueeNow = fp;
		if (!ev.shiftKey) {
			selectedSet = new Set();
			primarySelected = null;
		}
	};

	const onMarqueeMove = (ev: PointerEvent) => {
		if (activePointer !== ev.pointerId || !marqueeStart) return;
		const fp = eventToFont(ev);
		if (fp) marqueeNow = fp;
	};

	const onMarqueeUp = (ev: PointerEvent) => {
		if (activePointer !== ev.pointerId) return;
		try {
			(ev.currentTarget as Element).releasePointerCapture(ev.pointerId);
		} catch {
			/* ignore */
		}
		if (marqueeStart && marqueeNow) {
			const sel = pointsInRect(
				contours,
				marqueeStart.x,
				marqueeStart.y,
				marqueeNow.x,
				marqueeNow.y
			);
			if (sel.length > 0) {
				const next = ev.shiftKey ? new Set(selectedSet) : new Set<string>();
				for (const r of sel) next.add(refKey(r));
				selectedSet = next;
				primarySelected = sel[sel.length - 1];
			}
		}
		marqueeStart = null;
		marqueeNow = null;
		activePointer = null;
	};

	const onKeyDown = (ev: KeyboardEvent) => {
		if (ev.target instanceof HTMLInputElement) return;
		if (ev.target instanceof HTMLTextAreaElement) return;
		if (selectedSet.size === 0) return;
		if (ev.key === 'Delete' || ev.key === 'Backspace') {
			ev.preventDefault();
			const refs: PointRef[] = [...selectedSet].map((k) => {
				const [c, i] = k.split(':').map(Number);
				return { contour: c, index: i };
			});
			onChange(deletePoints(contours, refs));
			selectedSet = new Set();
			primarySelected = null;
		} else if (ev.key === 'Escape') {
			selectedSet = new Set();
			primarySelected = null;
		} else if (
			ev.key === 'ArrowLeft' ||
			ev.key === 'ArrowRight' ||
			ev.key === 'ArrowUp' ||
			ev.key === 'ArrowDown'
		) {
			ev.preventDefault();
			const step = ev.shiftKey ? 10 : 1;
			const dx = ev.key === 'ArrowLeft' ? -step : ev.key === 'ArrowRight' ? step : 0;
			const dy = ev.key === 'ArrowDown' ? -step : ev.key === 'ArrowUp' ? step : 0;
			const refs: PointRef[] = [...selectedSet].map((k) => {
				const [c, i] = k.split(':').map(Number);
				return { contour: c, index: i };
			});
			onChange(movePoints(contours, refs, dx, dy));
		}
	};

	const marqueeRect = $derived.by(() => {
		if (!marqueeStart || !marqueeNow) return null;
		const x = Math.min(marqueeStart.x, marqueeNow.x);
		const y = Math.min(marqueeStart.y, marqueeNow.y);
		const w = Math.abs(marqueeNow.x - marqueeStart.x);
		const h = Math.abs(marqueeNow.y - marqueeStart.y);
		return { x, y, w, h };
	});
</script>

<svelte:window onkeydown={onKeyDown} />

<g class="vector-point-layer">
	<!-- Big transparent rect for marquee start. Sized to cover any reasonable viewBox. -->
	<rect
		x={-100000}
		y={-100000}
		width={200000}
		height={200000}
		fill="transparent"
		pointer-events="all"
		class="cursor-default"
		role="presentation"
		onpointerdown={onMarqueeDown}
		onpointermove={onMarqueeMove}
		onpointerup={onMarqueeUp}
		onpointercancel={onMarqueeUp}
	/>

	<!-- Segment click targets -->
	{#each segments as seg (seg.contourIndex + ':' + seg.startCmdIndex + '-' + seg.endCmdIndex)}
		<line
			x1={seg.ax}
			y1={-seg.ay}
			x2={seg.bx}
			y2={-seg.by}
			stroke="transparent"
			stroke-width={segHit}
			class="cursor-copy"
			role="button"
			tabindex="-1"
			aria-label="Insert point on segment"
			onpointerdown={onSegmentClick}
		/>
	{/each}

	<!-- Visible segment outlines -->
	{#each segments as seg (seg.contourIndex + ':o:' + seg.startCmdIndex + '-' + seg.endCmdIndex)}
		<line
			x1={seg.ax}
			y1={-seg.ay}
			x2={seg.bx}
			y2={-seg.by}
			stroke="var(--color-accent)"
			stroke-width="1.5"
			vector-effect="non-scaling-stroke"
			opacity="0.6"
			pointer-events="none"
		/>
	{/each}

	<!-- Bezier handles for the primary-selected point -->
	{#each handles as h, hi (h.ref.contour + ':' + h.ref.cmdIndex + ':' + h.ref.which)}
		<line
			x1={h.anchorX}
			y1={-h.anchorY}
			x2={h.x}
			y2={-h.y}
			stroke="var(--color-fg-muted)"
			stroke-width="1"
			stroke-dasharray="3 3"
			vector-effect="non-scaling-stroke"
			opacity="0.7"
			pointer-events="none"
		/>
		<rect
			x={h.x - handleSmallR}
			y={-h.y - handleSmallR}
			width={handleSmallR * 2}
			height={handleSmallR * 2}
			fill="var(--color-surface)"
			stroke="var(--color-fg-muted)"
			stroke-width="1.5"
			vector-effect="non-scaling-stroke"
			class="cursor-grab"
			role="button"
			tabindex="-1"
			aria-label="Bezier handle"
			onpointerdown={(ev) => onHandlePointerDown(ev, h.ref)}
			onpointermove={onPointerMove}
			onpointerup={onPointerUp}
			onpointercancel={onPointerUp}
		/>
	{/each}

	<!-- On-curve point handles. Smooth = green circle; corner = square (rotated 45° = diamond). -->
	{#each points as p (p.contourIndex + ':' + p.pointIndex)}
		{@const ref = { contour: p.contourIndex, index: p.pointIndex }}
		{@const sel = isSelected(ref)}
		{@const smooth = p.pointType === 'smooth'}
		{@const fillColor = sel
			? smooth
				? 'var(--color-success)'
				: 'var(--color-accent)'
			: 'var(--color-surface)'}
		{@const strokeColor = smooth ? 'var(--color-success)' : 'var(--color-accent)'}
		{#if smooth}
			<circle
				cx={p.x}
				cy={-p.y}
				r={handleR}
				fill={fillColor}
				stroke={strokeColor}
				stroke-width="1.5"
				vector-effect="non-scaling-stroke"
				class="cursor-grab transition-[fill]"
				onpointerdown={(ev) => onPointPointerDown(ev, ref)}
				onpointermove={onPointerMove}
				onpointerup={onPointerUp}
				onpointercancel={onPointerUp}
				role="button"
				aria-label="Smooth point {p.pointIndex} of contour {p.contourIndex} (Alt-click to make corner)"
				tabindex="0"
			/>
		{:else}
			<rect
				x={p.x - handleR}
				y={-p.y - handleR}
				width={handleR * 2}
				height={handleR * 2}
				transform="rotate(45 {p.x} {-p.y})"
				fill={fillColor}
				stroke={strokeColor}
				stroke-width="1.5"
				vector-effect="non-scaling-stroke"
				class="cursor-grab transition-[fill]"
				onpointerdown={(ev) => onPointPointerDown(ev, ref)}
				onpointermove={onPointerMove}
				onpointerup={onPointerUp}
				onpointercancel={onPointerUp}
				role="button"
				aria-label="Corner point {p.pointIndex} of contour {p.contourIndex} (Alt-click to make smooth)"
				tabindex="0"
			/>
		{/if}
	{/each}

	<!-- Marquee selection rectangle (only while dragging) -->
	{#if marqueeRect}
		<rect
			x={marqueeRect.x}
			y={-(marqueeRect.y + marqueeRect.h)}
			width={marqueeRect.w}
			height={marqueeRect.h}
			fill="var(--color-accent-soft)"
			fill-opacity="0.2"
			stroke="var(--color-accent)"
			stroke-width="1"
			stroke-dasharray="4 3"
			vector-effect="non-scaling-stroke"
			pointer-events="none"
		/>
	{/if}
</g>
