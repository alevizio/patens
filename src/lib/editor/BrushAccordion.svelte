<script lang="ts">
	// "Brush & trace" accordion — controls drawing pressure / smoothing
	// behaviour for the pencil tool. All values are two-way bound so the
	// parent's keyboard shortcuts (1-9 for weight presets) keep working
	// and so the canvas re-renders on change.
	import Accordion from '$lib/ui/Accordion.svelte';

	type Preset = { name: string; size: number; thin: number };
	const PRESETS: Preset[] = [
		{ name: 'Hair', size: 20, thin: 0 },
		{ name: 'Light', size: 40, thin: 0.1 },
		{ name: 'Regular', size: 70, thin: 0.3 },
		{ name: 'Bold', size: 110, thin: 0.4 },
		{ name: 'Heavy', size: 160, thin: 0.5 }
	];

	type Props = {
		strokeSize: number;
		strokeThinning: number;
		cubicTrace: boolean;
		cubicMaxError: number;
		smoothness: number;
	};
	let {
		strokeSize = $bindable(),
		strokeThinning = $bindable(),
		cubicTrace = $bindable(),
		cubicMaxError = $bindable(),
		smoothness = $bindable()
	}: Props = $props();
</script>

<Accordion id="edit-brush" label="Brush & trace" defaultOpen={false}>
	<div class="grid gap-3">
		<div>
			<span class="mb-1.5 block text-[11px] text-fg-muted">Brush preset</span>
			<div class="flex flex-wrap gap-1">
				{#each PRESETS as preset (preset.name)}
					{@const active =
						strokeSize === preset.size &&
						Math.abs(strokeThinning - preset.thin) < 0.01}
					<button
						type="button"
						onclick={() => {
							strokeSize = preset.size;
							strokeThinning = preset.thin;
						}}
						class="rounded border px-2 py-0.5 text-[10px] font-medium transition-colors {active
							? 'border-accent bg-accent-soft text-accent-strong'
							: 'border-border bg-surface text-fg-muted hover:border-accent-strong hover:text-fg'}"
						title="Size {preset.size}fu · thinning {preset.thin.toFixed(2)}"
					>
						{preset.name}
					</button>
				{/each}
			</div>
		</div>
		<label class="grid gap-1.5">
			<span class="flex items-center justify-between text-[11px] text-fg-muted">
				<span>Thinning (pressure)</span>
				<span data-numeric>{strokeThinning.toFixed(2)}</span>
			</span>
			<input
				type="range"
				min={0}
				max={1}
				step={0.05}
				bind:value={strokeThinning}
				class="h-1 accent-fg"
			/>
		</label>
		<label
			class="flex items-center justify-between gap-2 rounded-md bg-surface-2 px-3 py-2"
		>
			<div class="grid leading-tight">
				<span class="text-[11px] font-medium text-fg">Cubic curves</span>
				<span class="text-[10px] text-fg-subtle">Schneider fit for smooth outlines</span
				>
			</div>
			<input type="checkbox" bind:checked={cubicTrace} class="size-4 accent-fg" />
		</label>
		{#if cubicTrace}
			<label class="grid gap-1.5">
				<span class="flex items-center justify-between text-[11px] text-fg-muted">
					<span>Curve precision</span>
					<span data-numeric>{cubicMaxError}</span>
				</span>
				<input
					type="range"
					min={10}
					max={300}
					step={5}
					bind:value={cubicMaxError}
					class="h-1 accent-fg"
				/>
			</label>
		{:else}
			<label class="grid gap-1.5">
				<span class="flex items-center justify-between text-[11px] text-fg-muted">
					<span>Smoothness (Chaikin)</span>
					<span data-numeric>{smoothness}</span>
				</span>
				<input
					type="range"
					min={0}
					max={3}
					step={1}
					bind:value={smoothness}
					class="h-1 accent-fg"
				/>
			</label>
		{/if}
	</div>
</Accordion>
