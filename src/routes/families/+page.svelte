<script lang="ts">
	import type { FamilyIndexEntry } from '$lib/font/family';
	import Panel from '$lib/ui/Panel.svelte';
	import { formatRelative } from '$lib/util/format';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Layers from '@lucide/svelte/icons/layers';

	let { data }: { data: { families: FamilyIndexEntry[] } } = $props();
</script>

<div class="mx-auto max-w-4xl px-6 py-12">
	<a
		href="/"
		class="mb-6 inline-flex items-center gap-1.5 text-[12px] text-fg-muted hover:text-fg"
	>
		<ArrowLeft class="size-3.5" />
		Back to projects
	</a>

	<header class="mb-8 flex items-start gap-3">
		<div
			class="mt-1 flex size-9 items-center justify-center rounded-md bg-accent-soft text-accent"
		>
			<Layers class="size-4" />
		</div>
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Families</h1>
			<p class="mt-1 text-sm text-fg-muted">
				Every multi-style family you've started. Each family ties two or more sibling
				projects (Regular + Italic + Bold + …) under one canonical name with shared metadata
				and a unified release bundle.
			</p>
		</div>
	</header>

	<Panel>
		{#if data.families.length === 0}
			<div class="flex flex-col items-center gap-3 py-12 text-center">
				<pre
					class="inline-block whitespace-pre text-left font-mono text-[10px] leading-[1.15] text-fg-subtle"
					aria-hidden="true">{`  Roman      Italic      Bold
  ──────     ──────     ──────
   H  O       H  O       H  O
   n  o       n  o       n  o`}</pre>
				<p class="max-w-sm text-[12px] text-fg-subtle">
					No families yet. Right-click any project on the home page and choose <strong
						class="text-fg-muted">Start family from this project…</strong> to link
					siblings under one canonical name.
				</p>
			</div>
		{:else}
			<ul class="grid gap-2">
				{#each data.families as f (f.id)}
					<li>
						<a
							href="/family/{f.id}"
							class="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-2/40 px-4 py-3 transition-colors hover:border-accent hover:bg-surface-2"
						>
							<div class="flex items-center gap-3">
								<Layers class="size-4 text-accent" />
								<div>
									<div class="text-[13px] font-semibold text-fg">{f.name}</div>
									<div
										class="font-mono text-[11px] text-fg-subtle"
										data-numeric
									>
										{f.siblingCount ?? 0} style{f.siblingCount === 1 ? '' : 's'} · updated {formatRelative(
											f.updatedAt
										)}
									</div>
								</div>
							</div>
							<span class="text-[11px] text-fg-muted">Open →</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</Panel>
</div>
