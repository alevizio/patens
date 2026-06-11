<script lang="ts">
	// "Metrics" sidebar panel — advance / LSB / RSB editors plus the
	// peer-match suggestion (one-click apply a similar-width peer's
	// sidebearings). Lock toggle prevents accidental edits in masters.
	import Field from '$lib/ui/Field.svelte';
	import Input from '$lib/ui/Input.svelte';
	import Lock from '@lucide/svelte/icons/lock';
	import Unlock from '@lucide/svelte/icons/unlock';
	import { projectStore } from '$lib/stores/project.svelte';
	import type { Glyph } from '$lib/font/types';

	export type SpacingSuggestion = {
		peerName: string;
		peerChar: string;
		lsb: number;
		rsb: number;
	};

	type Props = {
		glyph: Glyph;
		copyableSources: Glyph[];
		spacingSuggestion: SpacingSuggestion | null;
		onCopyMetricsFrom: (codepoint: number) => void;
		onApplySpacingSuggestion: () => void;
	};
	let {
		glyph,
		copyableSources,
		spacingSuggestion,
		onCopyMetricsFrom,
		onApplySpacingSuggestion
	}: Props = $props();
</script>

<div class="border-b border-border p-4">
	<h3
		class="mb-3 flex items-center justify-between text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"
	>
		<span class="inline-flex items-center gap-1.5">
			Metrics
			<button
				type="button"
				onclick={() =>
					projectStore.updateGlyph(glyph.codepoint, (g) => ({
						...g,
						metricsLocked: !g.metricsLocked
					}))}
				class="flex min-h-6 min-w-6 items-center justify-center rounded text-fg-subtle transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 {glyph.metricsLocked
					? 'text-warn'
					: 'hover:text-fg'}"
				aria-label={glyph.metricsLocked ? 'Unlock metrics' : 'Lock metrics'}
				aria-pressed={glyph.metricsLocked}
				title={glyph.metricsLocked
					? 'Unlock — allow LSB/RSB/Adv edits'
					: 'Lock — prevent accidental LSB/RSB/Adv edits'}
			>
				{#if glyph.metricsLocked}
					<Lock class="size-3" />
				{:else}
					<Unlock class="size-3" />
				{/if}
			</button>
		</span>
		<select
			value=""
			disabled={glyph.metricsLocked}
			onchange={(e) => onCopyMetricsFrom(Number(e.currentTarget.value))}
			class="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-fg-muted transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-40"
			title="Copy LSB / RSB / advance from another glyph"
		>
			<option value="" disabled selected>Copy from…</option>
			{#each copyableSources as g (g.codepoint)}
				<option value={g.codepoint}
					>{g.name} · {g.advanceWidth}/{g.leftSidebearing}/{g.rightSidebearing}</option
				>
			{/each}
		</select>
	</h3>
	<div class="grid grid-cols-3 gap-2">
		<Field label="Adv">
			<Input
				type="number"
				density="sm"
				value={glyph.advanceWidth}
				disabled={glyph.metricsLocked}
				onchange={(e) =>
					projectStore.updateGlyph(glyph.codepoint, (g) => ({
						...g,
						advanceWidth: Number(e.currentTarget.value)
					}))}
			/>
		</Field>
		<Field label="LSB">
			<Input
				type="number"
				density="sm"
				value={glyph.leftSidebearing}
				disabled={glyph.metricsLocked}
				onchange={(e) =>
					projectStore.updateGlyph(glyph.codepoint, (g) => ({
						...g,
						leftSidebearing: Number(e.currentTarget.value)
					}))}
			/>
		</Field>
		<Field label="RSB">
			<Input
				type="number"
				density="sm"
				value={glyph.rightSidebearing}
				disabled={glyph.metricsLocked}
				onchange={(e) =>
					projectStore.updateGlyph(glyph.codepoint, (g) => ({
						...g,
						rightSidebearing: Number(e.currentTarget.value)
					}))}
			/>
		</Field>
	</div>
	{#if spacingSuggestion}
		<button
			type="button"
			onclick={onApplySpacingSuggestion}
			class="mt-2 flex w-full items-center gap-1.5 rounded border border-dashed border-accent/40 bg-accent-soft/30 px-2 py-1.5 text-left text-[11px] text-fg-muted transition-all duration-100 ease-out hover:border-accent hover:bg-accent-soft active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
			title="Apply suggested LSB/RSB from a similar-width peer"
		>
			<span>Match peer</span>
			<span class="preview-font text-fg">{spacingSuggestion.peerChar}</span>
			<span class="ml-auto font-mono text-accent" data-numeric>
				{spacingSuggestion.lsb} / {spacingSuggestion.rsb}
			</span>
		</button>
	{/if}
</div>
