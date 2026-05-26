<script lang="ts">
	// "Glyph" sidebar panel — name editor + AGLFN suggestion + anatomy
	// tip + bbox stats + peer comparison. Header has a "Sync from
	// Default" master action when a non-default master is selected.
	import Field from '$lib/ui/Field.svelte';
	import Input from '$lib/ui/Input.svelte';
	import Lightbulb from '@lucide/svelte/icons/lightbulb';
	import { projectStore } from '$lib/stores/project.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import type { Glyph } from '$lib/font/types';

	export type GlyphStats = {
		contours: number;
		points: number;
		minX: number;
		maxX: number;
		minY: number;
		maxY: number;
		width: number;
		height: number;
	};
	export type AnatomyTip = { headline: string; body: string };
	export type PeerComparison = {
		medianAdv: number;
		diff: number;
		pct: number;
		peerCount: number;
	};

	type Props = {
		glyph: Glyph;
		aglfnSuggestion: string | null;
		anatomyTip: AnatomyTip | null;
		glyphStats: GlyphStats;
		peerComparison: PeerComparison | null;
	};
	let {
		glyph,
		aglfnSuggestion,
		anatomyTip,
		glyphStats,
		peerComparison
	}: Props = $props();
</script>

<div class="border-b border-border p-4">
	<h3
		class="mb-3 flex items-center justify-between text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"
	>
		<span>Glyph</span>
		{#if projectStore.selectedMasterId}
			<button
				type="button"
				onclick={() => {
					if (!projectStore.selectedMasterId) return;
					if (
						confirm(
							'Replace this glyph in the active master with a copy of the default master? This is the canonical fix when point counts diverge.'
						)
					) {
						projectStore.syncGlyphFromDefault(
							glyph.codepoint,
							projectStore.selectedMasterId
						);
						toast.success('Synced from default master');
					}
				}}
				class="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-fg-muted transition-all duration-100 ease-out hover:border-accent hover:text-accent active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
				title="Copy contours/metrics from the default master into this master"
			>
				Sync from Default
			</button>
		{/if}
	</h3>
	<Field label="Name">
		<Input
			density="sm"
			value={glyph.name}
			onchange={(e) => projectStore.renameGlyph(glyph.codepoint, e.currentTarget.value)}
			class="font-mono text-[12px]"
		/>
		{#if aglfnSuggestion}
			<button
				type="button"
				onclick={() => projectStore.renameGlyph(glyph.codepoint, aglfnSuggestion)}
				class="mt-1 inline-flex items-center gap-1 rounded border border-accent/40 bg-accent-soft/40 px-1.5 py-0.5 text-[10px] font-mono text-accent-strong transition-all duration-100 ease-out hover:bg-accent-soft active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
				title="Rename to the AGLFN canonical name for U+{glyph.codepoint
					.toString(16)
					.toUpperCase()
					.padStart(4, '0')}"
			>
				→ {aglfnSuggestion}
			</button>
		{/if}
	</Field>
	{#if anatomyTip}
		<div
			class="mt-2 flex items-start gap-2 rounded-md border border-warn/30 bg-warn/5 px-2 py-1.5"
		>
			<Lightbulb class="mt-0.5 size-3 shrink-0 text-warn" />
			<div class="min-w-0">
				<div class="text-[11px] font-semibold text-fg">{anatomyTip.headline}</div>
				<div class="text-[11px] leading-snug text-fg-muted">{anatomyTip.body}</div>
			</div>
		</div>
	{/if}
	<dl class="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
		<dt class="text-fg-subtle">Contours</dt>
		<dd class="text-right font-mono text-fg" data-numeric>{glyphStats.contours}</dd>
		<dt class="text-fg-subtle">Points</dt>
		<dd class="text-right font-mono text-fg" data-numeric>{glyphStats.points}</dd>
		<dt class="text-fg-subtle">Width × Height</dt>
		<dd class="text-right font-mono text-fg" data-numeric>
			{glyphStats.width} × {glyphStats.height}
		</dd>
		<dt class="text-fg-subtle">BBox X</dt>
		<dd class="text-right font-mono text-fg" data-numeric>
			{glyphStats.minX} → {glyphStats.maxX}
		</dd>
		<dt class="text-fg-subtle">BBox Y</dt>
		<dd class="text-right font-mono text-fg" data-numeric>
			{glyphStats.minY} → {glyphStats.maxY}
		</dd>
	</dl>
	{#if peerComparison}
		<div
			class="mt-2 rounded border border-border bg-surface-2/40 px-2 py-1.5 text-[11px] text-fg-muted"
		>
			vs peers (n={peerComparison.peerCount}): median adv
			<span class="font-mono text-fg" data-numeric>{peerComparison.medianAdv}</span>
			·
			<span
				class="font-mono {peerComparison.pct > 25 ? 'text-warn' : 'text-fg'}"
				data-numeric
			>
				{peerComparison.diff > 0 ? '+' : ''}{peerComparison.diff} ({peerComparison.pct}%)
			</span>
		</div>
	{/if}
</div>
