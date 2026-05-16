<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import Panel from '$lib/ui/Panel.svelte';
	import Input from '$lib/ui/Input.svelte';
	import Field from '$lib/ui/Field.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Plus from '@lucide/svelte/icons/plus';

	const COMMON_PAIRS: [string, string][] = [
		['A', 'V'], ['A', 'T'], ['A', 'W'], ['A', 'Y'],
		['T', 'a'], ['T', 'o'], ['T', 'e'], ['T', 'r'],
		['V', 'a'], ['V', 'o'], ['V', 'e'],
		['W', 'a'], ['W', 'o'], ['W', 'e'],
		['L', 'T'], ['L', 'V'], ['L', 'Y'],
		['P', 'a'], ['P', 'o'], ['P', 'e'],
		['F', 'a'], ['F', 'o'], ['Y', 'o'], ['Y', 'a']
	];

	let leftChar = $state('A');
	let rightChar = $state('V');
	let pendingValue = $state(0);

	const cpOf = (s: string) => s.codePointAt(0) ?? 0;
	const project = $derived(projectStore.project);

	const currentValue = $derived.by(() => {
		const l = cpOf(leftChar);
		const r = cpOf(rightChar);
		return projectStore.getKerningValue(l, r);
	});

	$effect(() => {
		pendingValue = currentValue;
	});

	const applyKerning = (value: number) => {
		projectStore.upsertKerningPair({
			left: cpOf(leftChar),
			right: cpOf(rightChar),
			value: Math.round(value)
		});
		pendingValue = value;
	};

	const removeKerning = (left: number, right: number) => {
		projectStore.upsertKerningPair({ left, right, value: 0 });
	};

	const pairChar = (cp: number): string => String.fromCodePoint(cp);
</script>

<div class="h-full overflow-auto">
<div class="mx-auto flex max-w-5xl flex-col gap-6 p-6">
	<header>
		<h1 class="text-xl font-semibold tracking-tight">Spacing &amp; kerning</h1>
		<p class="text-sm text-fg-muted">
			Per-glyph sidebearings are edited in the glyph editor. Set kerning pairs here.
		</p>
	</header>

	<Panel>
		<h2 class="mb-4 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			Kerning pair editor
		</h2>
		<div class="grid grid-cols-[1fr_1fr_1fr] gap-3">
			<Field label="Left glyph">
				<Input maxlength={2} bind:value={leftChar} class="text-center text-lg" />
			</Field>
			<Field label="Right glyph">
				<Input maxlength={2} bind:value={rightChar} class="text-center text-lg" />
			</Field>
			<Field label="Adjustment (units)">
				<Input
					type="number"
					value={pendingValue}
					onchange={(e) => applyKerning(Number(e.currentTarget.value))}
				/>
			</Field>
		</div>

		<div class="mt-5 rounded-lg border border-border bg-canvas p-6 text-center">
			<div class="preview-font text-7xl leading-none" style="letter-spacing: 0;">
				{leftChar}{rightChar}
			</div>
			<div class="mt-3 text-[11px] text-fg-subtle" data-numeric>
				kern({leftChar}, {rightChar}) = {currentValue}
			</div>
		</div>

		<div class="mt-3 flex flex-wrap items-center gap-2">
			<span class="text-[11px] font-medium text-fg-muted">Nudge:</span>
			{#each [-30, -10, -5, 0, 5, 10, 30] as delta (delta)}
				<Button
					density="sm"
					variant="secondary"
					onclick={() => applyKerning(currentValue + delta)}
				>
					{delta > 0 ? '+' : ''}{delta}
				</Button>
			{/each}
		</div>
	</Panel>

	<Panel>
		<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			Common pair suggestions
		</h2>
		<div class="flex flex-wrap gap-1.5">
			{#each COMMON_PAIRS as [l, r] (l + r)}
				<button
					type="button"
					class="rounded-md border border-border bg-surface-2 px-2 py-1 font-mono text-[12px] hover:border-accent hover:bg-accent-soft"
					onclick={() => {
						leftChar = l;
						rightChar = r;
					}}
				>
					{l}{r}
				</button>
			{/each}
		</div>
	</Panel>

	<Panel>
		<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			Pairs in this font ({project?.kerning.length ?? 0})
		</h2>
		{#if !project?.kerning || project.kerning.length === 0}
			<p class="text-sm text-fg-muted">No kerning yet. Add a pair above.</p>
		{:else}
			<ul class="grid gap-1">
				{#each project.kerning as pair (`${pair.left}-${pair.right}`)}
					<li
						class="flex items-center gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2"
					>
						<button
							type="button"
							class="preview-font text-2xl font-medium"
							onclick={() => {
								leftChar = pairChar(pair.left);
								rightChar = pairChar(pair.right);
							}}
						>
							{pairChar(pair.left)}{pairChar(pair.right)}
						</button>
						<span class="ml-auto font-mono text-sm text-fg-muted" data-numeric>
							{pair.value > 0 ? '+' : ''}{pair.value}
						</span>
						<button
							type="button"
							onclick={() => removeKerning(pair.left, pair.right)}
							class="rounded p-1 text-fg-subtle hover:bg-danger/10 hover:text-danger"
							aria-label="Remove pair"
						>
							<Trash2 class="size-3.5" />
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</Panel>
</div>
</div>
