<script lang="ts">
	import type { BezierContour } from '$lib/font/types';
	import {
		collectOnCurvePoints,
		collectSegments,
		deletePoint,
		insertPointOnSegment,
		movePoint,
		projectOntoSegment,
		type PointRef
	} from '$lib/font/path-edit';

	type Props = {
		contours: BezierContour[];
		/** Screen pixels per font unit. Used to size handles consistently. */
		pixelsPerUnit: number;
		eventToFont: (ev: PointerEvent) => { x: number; y: number } | null;
		onChange: (contours: BezierContour[]) => void;
	};

	let { contours, pixelsPerUnit, eventToFont, onChange }: Props = $props();

	let selected = $state<PointRef | null>(null);
	let dragging = $state<PointRef | null>(null);
	let activePointer = $state<number | null>(null);

	const handleR = $derived(Math.max(4, 5 / Math.max(pixelsPerUnit, 0.1)));
	const segHit = $derived(Math.max(6, 10 / Math.max(pixelsPerUnit, 0.1)));

	const points = $derived(collectOnCurvePoints(contours));
	const segments = $derived(collectSegments(contours));

	const isSelected = (ref: PointRef) =>
		selected !== null && selected.contour === ref.contour && selected.index === ref.index;

	const onPointPointerDown = (ev: PointerEvent, ref: PointRef) => {
		ev.stopPropagation();
		ev.preventDefault();
		const target = ev.currentTarget as Element;
		try {
			target.setPointerCapture(ev.pointerId);
		} catch {
			// some synthetic / cross-frame contexts disallow capture — drag still works
			// because subsequent pointermove events fire on the same element while held
		}
		activePointer = ev.pointerId;
		dragging = ref;
		selected = ref;
	};

	const onPointPointerMove = (ev: PointerEvent) => {
		if (dragging === null || activePointer !== ev.pointerId) return;
		const fp = eventToFont(ev);
		if (!fp) return;
		ev.stopPropagation();
		onChange(movePoint(contours, dragging, Math.round(fp.x), Math.round(fp.y)));
	};

	const onPointPointerUp = (ev: PointerEvent) => {
		if (activePointer !== ev.pointerId) return;
		try {
			(ev.currentTarget as Element).releasePointerCapture(ev.pointerId);
		} catch {
			/* ignore */
		}
		activePointer = null;
		dragging = null;
	};

	const onSegmentClick = (ev: PointerEvent) => {
		if (ev.button !== 0 && ev.pointerType === 'mouse') return;
		const fp = eventToFont(ev);
		if (!fp) return;
		// Find closest segment within hit radius
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
		selected = result.ref;
	};

	const onKeyDown = (ev: KeyboardEvent) => {
		if (!selected) return;
		if (ev.key === 'Delete' || ev.key === 'Backspace') {
			ev.preventDefault();
			const next = deletePoint(contours, selected);
			selected = null;
			onChange(next);
		}
		if (ev.key === 'Escape') {
			selected = null;
		}
	};
</script>

<svelte:window onkeydown={onKeyDown} />

<g class="vector-point-layer">
	<!-- Segment click targets (transparent, slightly thick) -->
	{#each segments as seg, si (seg.contourIndex + ':' + seg.startCmdIndex + '-' + seg.endCmdIndex)}
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

	<!-- Point handles -->
	{#each points as p (p.contourIndex + ':' + p.pointIndex)}
		{@const ref = { contour: p.contourIndex, index: p.pointIndex }}
		<circle
			cx={p.x}
			cy={-p.y}
			r={handleR}
			fill={isSelected(ref) ? 'var(--color-accent)' : 'var(--color-surface)'}
			stroke="var(--color-accent)"
			stroke-width="1.5"
			vector-effect="non-scaling-stroke"
			class="cursor-grab transition-[fill]"
			onpointerdown={(ev) => onPointPointerDown(ev, ref)}
			onpointermove={onPointPointerMove}
			onpointerup={onPointPointerUp}
			onpointercancel={onPointPointerUp}
			role="button"
			aria-label="Point {p.pointIndex} of contour {p.contourIndex}"
			tabindex="0"
		/>
	{/each}
</g>
