<script lang="ts">
	import type { FamilyIndexEntry } from '$lib/font/family';
	import { formatRelative } from '$lib/util/format';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Layers from '@lucide/svelte/icons/layers';
	import Type from '@lucide/svelte/icons/type';

	let { data }: { data: { families: FamilyIndexEntry[] } } = $props();
</script>

<svelte:head>
	<title>Families — Font Studio</title>
	<meta name="description" content="Every type family in your foundry — siblings, axes, and family-wide audits." />
</svelte:head>

<div class="mx-auto max-w-6xl px-6 py-8 sm:py-10">
	<!-- Slim top bar — matches the home page chrome -->
	<header
		class="mb-10 flex items-center justify-between gap-3 border-b border-border/50 pb-4"
	>
		<a href="/" class="group inline-flex items-center gap-2.5">
			<span
				class="inline-flex size-7 items-center justify-center rounded-lg bg-fg text-canvas transition-transform group-hover:scale-105"
			>
				<Type class="size-3.5" />
			</span>
			<span
				class="text-[13px] font-medium tracking-tight text-fg"
				style="font-family: ui-monospace, 'SF Mono', Menlo, monospace;"
			>
				Font Studio
			</span>
		</a>
		<a
			href="/"
			class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
		>
			<ArrowLeft class="size-3.5" />
			Back to projects
		</a>
	</header>

	<!-- Hero: editorial heading + intro. Same h1 treatment as home -->
	<section class="mb-16 max-w-3xl">
		<h1
			class="text-[40px] leading-[1.05] tracking-tight text-fg"
			style="font-family: 'Hoefler Text', ui-serif, Georgia, 'Times New Roman', serif;"
		>
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
				class="rounded-2xl border border-dashed border-border bg-surface-2/30 p-8"
			>
				<pre
					class="block whitespace-pre text-left font-mono text-[11px] leading-[1.2] text-fg-subtle"
					aria-hidden="true">{`  Roman      Italic      Bold
  ──────     ──────     ──────
   H  O       H  O       H  O
   n  o       n  o       n  o`}</pre>
			</div>
			<div class="flex flex-col justify-center gap-3">
				<h2
					class="text-[22px] leading-tight tracking-tight text-fg"
					style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
				>
					No families yet
				</h2>
				<p class="text-[14px] leading-relaxed text-fg-muted">
					A family is a set of sibling projects sharing one canonical name.
					Open any project from the home page, right-click it, and choose
					<span class="font-medium text-fg">Start family from this project…</span>
					to link siblings.
				</p>
				<a
					href="/"
					class="mt-2 inline-flex w-fit items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-[12px] font-medium text-fg-muted transition-colors hover:border-accent hover:text-accent"
				>
					Browse projects →
				</a>
			</div>
		</section>
	{:else}
		<section>
			<div class="mb-5 flex items-baseline justify-between gap-3">
				<h2
					class="text-[24px] leading-none tracking-tight text-fg"
					style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
				>
					Your families
				</h2>
				<span class="font-mono text-[11px] text-fg-subtle" data-numeric>
					{data.families.length}
				</span>
			</div>
			<ul class="grid gap-2">
				{#each data.families as f (f.id)}
					<li>
						<a
							href="/family/{f.id}"
							class="group flex items-center gap-4 rounded-2xl border border-border bg-surface px-5 py-4 transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-sm"
						>
							<div
								class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-strong"
							>
								<Layers class="size-5" />
							</div>
							<div class="min-w-0 flex-1">
								<div
									class="truncate text-[16px] leading-tight text-fg"
									style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
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
								class="text-fg-subtle transition-all group-hover:translate-x-0.5 group-hover:text-accent"
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
