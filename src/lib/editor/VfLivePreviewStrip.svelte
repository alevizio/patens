<script lang="ts">
	// VF "Live interpolation" strip — appears below the canvas when the
	// glyph has masters and the VF toggle in the view-toggles row is on.
	// Per-axis sliders update `axisValues` (bound to the parent's state);
	// `interpolatedContours` is recomputed in the parent and passed in.
	import { contoursToSvgPath } from '$lib/font/path';
	import { projectStore } from '$lib/stores/project.svelte';
	import type { BezierContour } from '$lib/font/types';

	type Metrics = { ascender: number; descender: number } | undefined;
	type Props = {
		advanceWidth: number;
		interpolatedContours: BezierContour[];
		metrics: Metrics;
		axisValues: Record<string, number>;
		onClose: () => void;
	};
	let {
		advanceWidth,
		interpolatedContours,
		metrics,
		axisValues = $bindable(),
		onClose
	}: Props = $props();
</script>

<div class="border-t border-border bg-surface-2/40 px-4 py-2">
		<div class="mb-1.5 flex items-center justify-between">
			<span class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				Live interpolation
			</span>
			<button
				type="button"
				onclick={onClose}
				class="text-[10px] text-fg-subtle transition-colors hover:text-fg hover:underline focus-visible:outline-none focus-visible:text-fg focus-visible:underline"
			>
				Hide
			</button>
		</div>
		<div class="flex items-center gap-3">
			<div class="shrink-0 rounded border border-border bg-canvas p-2">
				<svg
					viewBox="0 {metrics?.descender ?? -200} {Math.max(advanceWidth, 200)} {(metrics?.ascender ??
						800) - (metrics?.descender ?? -200)}"
					width="80"
					height="80"
					preserveAspectRatio="xMidYMid meet"
					style="transform: scaleY(-1);"
				>
					<path
						d={contoursToSvgPath(interpolatedContours)}
						fill="currentColor"
						fill-rule="evenodd"
					/>
				</svg>
			</div>
			<div class="flex-1 grid gap-1.5">
				{#each projectStore.project?.axes ?? [] as axis (axis.tag)}
					<label
						class="grid grid-cols-[60px_1fr_50px] items-center gap-2 text-[11px]"
					>
						<span class="font-mono text-fg-muted">{axis.tag}</span>
						<input
							type="range"
							min={axis.minimum}
							max={axis.maximum}
							step={(axis.maximum - axis.minimum) / 200 || 1}
							value={axisValues[axis.tag] ?? axis.default}
							oninput={(e) =>
								(axisValues = {
									...axisValues,
									[axis.tag]: Number(e.currentTarget.value)
								})}
							class="h-1 accent-accent"
						/>
						<span class="text-right font-mono text-fg-subtle" data-numeric>
							{Math.round(axisValues[axis.tag] ?? axis.default)}
						</span>
					</label>
				{/each}
			</div>
		</div>
	</div>

