<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { glyphBounds } from '$lib/font/path';
	import type { BezierContour } from '$lib/font/types';

	const glyph = $derived(projectStore.selectedGlyph);
	const metrics = $derived(projectStore.project?.metrics);

	const bounds = $derived.by(() => {
		if (!glyph || glyph.contours.length === 0) return null;
		return glyphBounds(glyph.contours);
	});

	const pointCount = $derived.by(() => {
		if (!glyph) return 0;
		let n = 0;
		for (const c of glyph.contours) {
			for (const cmd of c.commands) {
				if (cmd.type === 'M' || cmd.type === 'L' || cmd.type === 'C' || cmd.type === 'Q') n++;
			}
		}
		return n;
	});

	// Signed-area approximation using shoelace on on-curve points only — close
	// enough for a "denser/lighter" relative metric at glyph-design time.
	const approxArea = $derived.by(() => {
		if (!glyph) return 0;
		let total = 0;
		for (const c of glyph.contours) {
			const pts: Array<{ x: number; y: number }> = [];
			for (const cmd of c.commands) {
				if (cmd.type === 'M' || cmd.type === 'L' || cmd.type === 'C' || cmd.type === 'Q') {
					pts.push({ x: cmd.x, y: cmd.y });
				}
			}
			if (pts.length < 3) continue;
			let a = 0;
			for (let i = 0; i < pts.length; i++) {
				const j = (i + 1) % pts.length;
				a += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
			}
			total += Math.abs(a / 2);
		}
		return total;
	});

	const relTo = (val: number | undefined, ref: number | undefined): string => {
		if (val === undefined || ref === undefined || ref === 0) return '—';
		const diff = val - ref;
		const sign = diff > 0 ? '+' : '';
		return `${sign}${diff}`;
	};

	const computeOvershoot = (b: { minY: number; maxY: number } | null) => {
		if (!b || !metrics) return null;
		const above = b.maxY - metrics.capHeight;
		const below = b.minY;
		return { above, below };
	};
	const overshoot = $derived(computeOvershoot(bounds));
</script>

{#if glyph}
	<div class="border-b border-border p-4">
		<h3 class="mb-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			Metrics inspector
		</h3>
		{#if glyph.contours.length === 0}
			<p class="text-[11px] text-fg-subtle">
				Draw or trace to see precise measurements.
			</p>
		{:else if !bounds || !metrics}
			<p class="text-[11px] text-fg-subtle">No bounds available.</p>
		{:else}
			<dl
				class="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1 text-[11px]"
				data-numeric
			>
				<dt class="text-fg-muted">LSB</dt>
				<dd class="text-right font-mono text-fg">{glyph.leftSidebearing}</dd>
				<dt class="text-fg-muted">RSB</dt>
				<dd class="text-right font-mono text-fg">{glyph.rightSidebearing}</dd>
				<dt class="text-fg-muted">Advance</dt>
				<dd class="text-right font-mono text-fg">{glyph.advanceWidth}</dd>
				<dt class="text-fg-muted">BBox W × H</dt>
				<dd class="text-right font-mono text-fg">
					{Math.round(bounds.maxX - bounds.minX)} × {Math.round(bounds.maxY - bounds.minY)}
				</dd>
				<dt class="text-fg-muted">BBox top / bottom</dt>
				<dd class="text-right font-mono text-fg">
					{Math.round(bounds.maxY)} / {Math.round(bounds.minY)}
				</dd>
				<dt class="text-fg-muted">vs cap height</dt>
				<dd class="text-right font-mono text-fg">
					{relTo(Math.round(bounds.maxY), metrics.capHeight)}
				</dd>
				<dt class="text-fg-muted">vs x-height</dt>
				<dd class="text-right font-mono text-fg">
					{relTo(Math.round(bounds.maxY), metrics.xHeight)}
				</dd>
				{#if overshoot}
					<dt class="text-fg-muted" title="Positive = extends above cap height">
						Overshoot ↑
					</dt>
					<dd
						class="text-right font-mono {overshoot.above > 0
							? 'text-success'
							: overshoot.above < 0
								? 'text-warn'
								: 'text-fg'}"
					>
						{overshoot.above > 0 ? '+' : ''}{overshoot.above}
					</dd>
					<dt class="text-fg-muted" title="Negative = drops below baseline">
						Overshoot ↓
					</dt>
					<dd
						class="text-right font-mono {overshoot.below < 0
							? 'text-success'
							: overshoot.below > 0
								? 'text-warn'
								: 'text-fg'}"
					>
						{overshoot.below > 0 ? '+' : ''}{overshoot.below}
					</dd>
				{/if}
				<dt class="text-fg-muted">Contours</dt>
				<dd class="text-right font-mono text-fg">{glyph.contours.length}</dd>
				<dt class="text-fg-muted">On-curve points</dt>
				<dd class="text-right font-mono text-fg">{pointCount}</dd>
				<dt class="text-fg-muted" title="Sum of |signed shoelace area|; relative density measure">
					~ ink area
				</dt>
				<dd class="text-right font-mono text-fg">
					{(approxArea / 1000).toFixed(1)}k u²
				</dd>
			</dl>
			<p class="mt-2 text-[10px] text-fg-subtle">
				Overshoots: rounds + diagonals typically need a few units above/below the cap or
				baseline so they look optically equal to flats. 10–15u at 1000 UPM is common.
			</p>
		{/if}
	</div>
{/if}
