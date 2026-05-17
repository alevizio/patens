<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { SCRIPT_PACKS } from '$lib/font/charsets';
	import { isClassRef, type KerningSide } from '$lib/font/types';
	import Panel from '$lib/ui/Panel.svelte';
	import Input from '$lib/ui/Input.svelte';
	import Field from '$lib/ui/Field.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Plus from '@lucide/svelte/icons/plus';
	import Globe from '@lucide/svelte/icons/globe';
	import Group from '@lucide/svelte/icons/group';

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
	let newClassName = $state('@A_left');
	let newClassMembers = $state('A Á Â Ä À Å Ã');

	const cpOf = (s: string) => s.codePointAt(0) ?? 0;
	const project = $derived(projectStore.project);

	/** Parse a "side" input — leading @ → class ref, else first char → codepoint */
	const parseSide = (s: string): KerningSide => {
		const trimmed = s.trim();
		if (trimmed.startsWith('@')) return trimmed;
		return cpOf(trimmed);
	};

	const currentValue = $derived.by(() => {
		return projectStore.getKerningValue(parseSide(leftChar), parseSide(rightChar));
	});

	$effect(() => {
		pendingValue = currentValue;
	});

	const applyKerning = (value: number) => {
		projectStore.upsertKerningPair({
			left: parseSide(leftChar),
			right: parseSide(rightChar),
			value: Math.round(value)
		});
		pendingValue = value;
	};

	const removeKerning = (left: KerningSide, right: KerningSide) => {
		projectStore.upsertKerningPair({ left, right, value: 0 });
	};

	const sideLabel = (side: KerningSide): string => {
		if (isClassRef(side)) return side;
		return String.fromCodePoint(side);
	};

	const addClass = () => {
		const name = newClassName.trim();
		if (!name.startsWith('@')) {
			alert('Class name must start with @ (e.g. @A_left)');
			return;
		}
		const members = newClassMembers
			.trim()
			.split(/\s+/)
			.map((s) => s.codePointAt(0) ?? 0)
			.filter((cp) => cp > 0);
		if (members.length === 0) return;
		projectStore.upsertKerningClass({ name, members });
		newClassName = '@class';
		newClassMembers = '';
	};
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
		<h2 class="mb-3 inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			<Group class="size-3" /> Kerning classes ({project?.classes?.length ?? 0})
		</h2>
		<p class="mb-3 text-[12px] text-fg-subtle">
			Group glyphs that share a side (e.g. <code>@A_left = [A Á Â Ä À]</code>).
			Then use the class name (with <code>@</code>) as either side of a kerning pair —
			one rule covers all members.
		</p>
		{#if project && (project.classes ?? []).length > 0}
			<ul class="mb-3 grid gap-1">
				{#each project.classes ?? [] as cls (cls.name)}
					<li
						class="flex items-center gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2"
					>
						<span class="font-mono text-[13px] font-medium text-accent">{cls.name}</span>
						<span class="text-[12px] text-fg-muted">
							{cls.members.map((cp) => String.fromCodePoint(cp)).join(' ')}
						</span>
						<button
							type="button"
							onclick={() => {
								leftChar = cls.name;
							}}
							class="ml-auto rounded border border-border bg-surface px-2 py-0.5 text-[11px] text-fg-muted hover:border-accent hover:text-accent"
						>
							Use as left
						</button>
						<button
							type="button"
							onclick={() => {
								rightChar = cls.name;
							}}
							class="rounded border border-border bg-surface px-2 py-0.5 text-[11px] text-fg-muted hover:border-accent hover:text-accent"
						>
							Use as right
						</button>
						<button
							type="button"
							onclick={() => projectStore.removeKerningClass(cls.name)}
							class="rounded p-1 text-fg-subtle hover:bg-danger/10 hover:text-danger"
							aria-label="Remove class {cls.name}"
						>
							<Trash2 class="size-3.5" />
						</button>
					</li>
				{/each}
			</ul>
		{/if}
		<div class="grid grid-cols-[1fr_2fr_auto] items-end gap-2 rounded-md border border-dashed border-border-strong/50 bg-surface-2/40 p-3">
			<Field label="Class name (must start with @)">
				<Input density="sm" bind:value={newClassName} placeholder="@A_left" />
			</Field>
			<Field label="Member glyphs (space-separated)">
				<Input density="sm" bind:value={newClassMembers} placeholder="A Á Â Ä À Å Ã" />
			</Field>
			<Button density="sm" onclick={addClass}>
				{#snippet icon()}<Plus class="size-3.5" />{/snippet}
				Add class
			</Button>
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
							class="flex items-center gap-1 text-2xl font-medium"
							onclick={() => {
								leftChar = sideLabel(pair.left);
								rightChar = sideLabel(pair.right);
							}}
						>
							<span class={isClassRef(pair.left) ? 'font-mono text-[14px] text-accent' : 'preview-font'}>
								{sideLabel(pair.left)}
							</span>
							<span class={isClassRef(pair.right) ? 'font-mono text-[14px] text-accent' : 'preview-font'}>
								{sideLabel(pair.right)}
							</span>
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

	<Panel>
		<h2 class="mb-3 inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
			<Globe class="size-3" /> Script packs
		</h2>
		<p class="mb-3 text-[12px] text-fg-subtle">
			Extend the default Latin set with Greek, Cyrillic, or Vietnamese. Adding a pack
			creates empty glyph slots — your existing glyphs are untouched.
		</p>
		<div class="grid gap-2 md:grid-cols-3">
			{#each SCRIPT_PACKS as pack (pack.id)}
				{@const present = project?.glyphs[pack.glyphs[0]?.codepoint ?? 0] !== undefined}
				<div class="rounded-md border border-border bg-surface-2/40 px-3 py-3">
					<div class="text-[13px] font-medium text-fg">{pack.label}</div>
					<div class="mb-2 text-[11px] text-fg-subtle">{pack.description}</div>
					<Button
						density="sm"
						variant={present ? 'ghost' : 'secondary'}
						onclick={() => projectStore.addScriptPack(pack)}
						disabled={present}
					>
						{#snippet icon()}<Plus class="size-3.5" />{/snippet}
						{present ? 'Already added' : `Add ${pack.glyphs.length} glyphs`}
					</Button>
				</div>
			{/each}
		</div>
	</Panel>
</div>
</div>
