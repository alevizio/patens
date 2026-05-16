<script lang="ts">
	import type { Anchor } from '$lib/font/types';

	type Props = {
		anchors: Anchor[];
		pixelsPerUnit: number;
		eventToFont: (ev: PointerEvent) => { x: number; y: number } | null;
		onChange: (anchors: Anchor[]) => void;
	};

	let { anchors, pixelsPerUnit, eventToFont, onChange }: Props = $props();

	let dragging = $state<number | null>(null);
	let activePointer = $state<number | null>(null);

	const crossR = $derived(Math.max(8, 10 / Math.max(pixelsPerUnit, 0.1)));
	const labelOffset = $derived(Math.max(14, 16 / Math.max(pixelsPerUnit, 0.1)));
	const labelSize = $derived(Math.max(10, 11 / Math.max(pixelsPerUnit, 0.1)));

	const onPointerDown = (ev: PointerEvent, idx: number) => {
		ev.stopPropagation();
		ev.preventDefault();
		const target = ev.currentTarget as Element;
		try {
			target.setPointerCapture(ev.pointerId);
		} catch {
			/* ignore */
		}
		activePointer = ev.pointerId;
		dragging = idx;
	};

	const onPointerMove = (ev: PointerEvent) => {
		if (dragging === null || activePointer !== ev.pointerId) return;
		const fp = eventToFont(ev);
		if (!fp) return;
		ev.stopPropagation();
		const next = anchors.map((a, i) =>
			i === dragging ? { ...a, x: Math.round(fp.x), y: Math.round(fp.y) } : a
		);
		onChange(next);
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
	};
</script>

<g class="anchor-layer">
	{#each anchors as a, i (a.name + ':' + i)}
		<g class="anchor">
			<!-- Cross marker -->
			<line
				x1={a.x - crossR}
				y1={-a.y}
				x2={a.x + crossR}
				y2={-a.y}
				stroke="var(--color-warn)"
				stroke-width="1.5"
				vector-effect="non-scaling-stroke"
				pointer-events="none"
			/>
			<line
				x1={a.x}
				y1={-a.y - crossR}
				x2={a.x}
				y2={-a.y + crossR}
				stroke="var(--color-warn)"
				stroke-width="1.5"
				vector-effect="non-scaling-stroke"
				pointer-events="none"
			/>
			<!-- Hit target / drag handle -->
			<circle
				cx={a.x}
				cy={-a.y}
				r={crossR * 0.85}
				fill="var(--color-warn)"
				fill-opacity="0.15"
				stroke="var(--color-warn)"
				stroke-width="1.5"
				vector-effect="non-scaling-stroke"
				class="cursor-grab"
				role="button"
				tabindex="0"
				aria-label="Anchor {a.name}"
				onpointerdown={(ev) => onPointerDown(ev, i)}
				onpointermove={onPointerMove}
				onpointerup={onPointerUp}
				onpointercancel={onPointerUp}
			/>
			<!-- Name label -->
			<text
				x={a.x + labelOffset}
				y={-a.y}
				dominant-baseline="middle"
				font-size={labelSize}
				font-family="ui-monospace, monospace"
				fill="var(--color-warn)"
				class="select-none"
				style="paint-order: stroke; stroke: var(--color-canvas); stroke-width: 3;"
				pointer-events="none"
			>
				{a.name}
			</text>
		</g>
	{/each}
</g>
