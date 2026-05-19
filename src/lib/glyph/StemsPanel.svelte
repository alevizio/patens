<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { detectStemWidths, type StemMeasurement } from '$lib/font/stem-detect';
	import { glyphBounds } from '$lib/font/path';
	import Ruler from '@lucide/svelte/icons/ruler';

	const glyph = $derived(projectStore.selectedGlyph);
	const metrics = $derived(projectStore.project?.metrics);

	let measurements = $state<StemMeasurement[]>([]);
	let measuring = $state(false);
	// Plain `let` (not $state) — only read+written inside the $effect below to
	// dedupe re-measures; making it reactive risks the read-then-write cycle
	// that crashed audit's mount (see commit bc7399d).
	let lastKey = '';

	const measure = async () => {
		if (!glyph || !metrics || glyph.contours.length === 0 || measuring) return;
		measuring = true;
		try {
			const bbox = glyphBounds(glyph.contours);
			measurements = await detectStemWidths(
				glyph.contours,
				bbox,
				glyph.advanceWidth,
				{ capHeight: metrics.capHeight, xHeight: metrics.xHeight }
			);
		} finally {
			measuring = false;
		}
	};

	// Auto-measure on glyph change.
	$effect(() => {
		const key = glyph
			? `${glyph.codepoint}:${glyph.contours.length}:${glyph.updatedAt}`
			: '';
		if (key === lastKey) return;
		lastKey = key;
		if (glyph?.contours.length) {
			measure();
		} else {
			measurements = [];
		}
	});
</script>

{#if glyph && glyph.contours.length > 0}
	<div class="border-b border-border p-4">
		<h3 class="mb-2 flex items-center justify-between text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			<span class="inline-flex items-center gap-1.5">
				<Ruler class="size-3" /> Stems
			</span>
			<button
				type="button"
				onclick={measure}
				disabled={measuring}
				class="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-fg-muted hover:border-accent hover:text-accent disabled:opacity-40"
				title="Re-measure"
			>
				{measuring ? '…' : 'Re-scan'}
			</button>
		</h3>
		{#if measurements.length === 0}
			<p class="text-[11px] text-fg-subtle">
				Scanning the silhouette at x/cap-height slices…
			</p>
		{:else}
			<ul class="grid gap-1">
				{#each measurements as m (m.y)}
					<li class="flex items-center justify-between gap-2 text-[11px]">
						<span class="font-mono text-fg-subtle" data-numeric>y={m.y}</span>
						<span class="flex flex-wrap gap-1">
							{#each m.runs as r, i (i)}
								<span
									class="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-fg"
									data-numeric
									title="x={r.x}"
								>
									{r.width}
								</span>
							{/each}
						</span>
					</li>
				{/each}
			</ul>
			<p class="mt-2 text-[10px] text-fg-subtle">
				Compare these widths across n, h, m, b, d, l for stem consistency.
			</p>
		{/if}
	</div>
{/if}
