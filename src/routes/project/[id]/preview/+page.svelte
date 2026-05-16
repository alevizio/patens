<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import Panel from '$lib/ui/Panel.svelte';

	const SAMPLES = [
		'The quick brown fox jumps over the lazy dog',
		'Pack my box with five dozen liquor jugs',
		'Sphinx of black quartz, judge my vow',
		'How vexingly quick daft zebras jump'
	];

	const WATERFALL = [12, 18, 24, 32, 48, 72, 96, 144];

	let customText = $state('Hello, world');

	const sample = $derived(projectStore.project?.metadata.familyName ?? 'Sample');
</script>

<div class="h-full overflow-auto">
<div class="mx-auto flex max-w-6xl flex-col gap-6 p-6">
	<header>
		<h1 class="text-xl font-semibold tracking-tight">Preview</h1>
		<p class="text-sm text-fg-muted">
			Live render of <span class="font-mono text-fg">{sample}</span> via
			<code>@font-face</code>. Updates as you draw.
		</p>
	</header>

	<Panel>
		<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			Custom string
		</h2>
		<input
			bind:value={customText}
			class="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
			placeholder="Type something…"
		/>
		<div class="preview-font mt-4 text-6xl leading-tight">{customText}</div>
	</Panel>

	<Panel>
		<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			Waterfall
		</h2>
		<div class="grid gap-3">
			{#each WATERFALL as size (size)}
				<div class="flex items-baseline gap-4">
					<span
						class="w-10 shrink-0 text-right font-mono text-[11px] text-fg-subtle"
						data-numeric
					>
						{size}px
					</span>
					<span class="preview-font truncate leading-[1.2]" style="font-size: {size}px;">
						{SAMPLES[0]}
					</span>
				</div>
			{/each}
		</div>
	</Panel>

	<Panel>
		<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			Pangrams
		</h2>
		<div class="grid gap-3">
			{#each SAMPLES as text (text)}
				<div class="preview-font text-2xl leading-snug">{text}</div>
			{/each}
		</div>
	</Panel>

	<Panel>
		<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			Glyph proof
		</h2>
		<div class="preview-font text-3xl leading-snug">
			<div>HOHOHO HOnono HnHonHonH</div>
			<div>nonono AVAVAV LATATe</div>
			<div>0123456789 .,;:!?</div>
		</div>
	</Panel>
</div>
</div>
