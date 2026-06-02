<script lang="ts">
	import type { FamilyIndexEntry } from '$lib/font/family';
	import { formatRelative } from '$lib/util/format';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import SiteHeader from '$lib/ui/SiteHeader.svelte';

	let { data }: { data: { families: FamilyIndexEntry[] } } = $props();
</script>

<svelte:head>
	<title>Families — Patens</title>
	<meta name="description" content="Every type family in your foundry — siblings, axes, and family-wide audits." />
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
	<SiteHeader current="/families" />

	<!-- Back-to-projects affordance kept as a small inline link below the
	     shared site nav, so app-surface navigation isn't lost when the
	     marketing nav takes the top of the page. -->
	<a
		href="/studio-c104c94c"
		class="-mt-6 mb-6 inline-flex items-center gap-1.5 text-[12px] text-fg-muted hover:text-fg"
	>
		<ArrowLeft class="size-3.5" />
		Back to projects
	</a>

	<!-- Hero: editorial heading + intro. Same h1 treatment as home -->
	<section class="mb-16 max-w-3xl">
		<h1 class="text-[40px] leading-[1.05] tracking-tight text-fg">
			Families
		</h1>
		<p class="mt-4 text-[15px] leading-relaxed text-fg-muted">
			Each family ties two or more sibling projects — Regular + Italic + Bold + … —
			under one canonical name with shared metadata and a unified release bundle.
		</p>
	</section>

	{#if data.families.length === 0}
		<!-- Empty state: asymmetric — ASCII model on the left, instructional
		     copy on the right. Breaks the centered-card-on-empty pattern. -->
		<section class="grid gap-8 md:grid-cols-[5fr_7fr] md:gap-12">
			<div
				class="rounded-none border border-dashed border-border bg-surface-2/30 p-8"
			>
				<pre
					class="block whitespace-pre text-left font-mono text-[11px] leading-[1.2] text-fg-subtle"
					aria-hidden="true">{`  Roman      Italic      Bold
  ──────     ──────     ──────
   H  O       H  O       H  O
   n  o       n  o       n  o`}</pre>
			</div>
			<div class="flex flex-col justify-center gap-3">
				<h2 class="text-[22px] leading-tight tracking-tight text-fg">
					No families yet
				</h2>
				<p class="text-[14px] leading-relaxed text-fg-muted">
					A family is a set of sibling projects sharing one canonical name.
					Open any project from the home page, right-click it, and choose
					<span class="font-medium text-fg">Start family from this project…</span>
					to link siblings.
				</p>
				<a
					href="/studio-c104c94c"
					class="mt-2 inline-flex w-fit items-center gap-1.5 rounded-none border border-border bg-surface px-3 py-1.5 text-[12px] font-medium text-fg-muted transition-colors hover:border-accent hover:text-accent"
				>
					Browse projects →
				</a>
			</div>
		</section>
	{:else}
		<section>
			<div class="mb-5 flex items-baseline justify-between gap-3">
				<h2 class="text-[24px] leading-none tracking-tight text-fg">
					Your families
				</h2>
				<span class="font-mono text-[11px] text-fg-subtle" data-numeric>
					{data.families.length}
				</span>
			</div>
			<ul class="divide-y divide-border border-y border-border">
				{#each data.families as f (f.id)}
					<li>
						<a
							href="/family/{f.id}"
							class="group flex items-baseline justify-between gap-4 py-4 transition-colors"
						>
							<div class="min-w-0 flex-1">
								<div
									class="truncate text-[20px] leading-tight text-fg transition-colors group-hover:text-accent-strong"
								>
									{f.name}
								</div>
								<div
									class="mt-1 font-mono text-[11px] text-fg-subtle"
									data-numeric
								>
									{f.siblingCount ?? 0} style{f.siblingCount === 1 ? '' : 's'} ·
									updated {formatRelative(f.updatedAt)}
								</div>
							</div>
							<span
								class="shrink-0 font-mono text-[14px] text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent-strong"
								aria-hidden="true"
							>
								→
							</span>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</div>
