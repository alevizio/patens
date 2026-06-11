<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import SiteFooter from '$lib/ui/SiteFooter.svelte';
	import SiteHeader from '$lib/ui/SiteHeader.svelte';
	import type { PageData } from './$types';
	import type { EducationProgram } from '$lib/education/programs';

	type Props = { data: PageData };
	let { data }: Props = $props();

	const REGION_ORDER = ['Europe', 'North America'] as const;
</script>

<svelte:head>
	<title>Type design education (2026) · Patens — 10 programs</title>
	<meta
		name="description"
		content="The 10 type-design programs that produce ~40-50 graduates per year. MA programs at Reading, KABK, ECAL, ANRT, ESAD, EINA. Certificate programs at Type@Cooper, Type West, Plantin Institute, TypeParis. Faculty, tools, traditions, contact paths."
	/>
	<link rel="canonical" href="https://patens.design/education" />
	<meta property="og:title" content="Type design education · Patens" />
	<meta
		property="og:description"
		content="The 10 programs that train the world's next type designers."
	/>
	<meta property="og:image" content="https://patens.design/og/brand" />
	<meta property="og:image:alt" content="Patens — open-source browser-native type design tool with a 105-code audit module" />
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
	<SiteHeader current="/education" />

	<a
		href="/"
		class="mb-8 inline-flex items-center gap-1.5 rounded-sm text-[12px] text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:text-fg focus-visible:underline focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
	>
		<ArrowLeft class="size-3" />
		Back to the foundry
	</a>

	<p class="mb-2 text-[13px] uppercase tracking-[0.18em] text-fg-subtle">
		The schools
	</p>

	<h1 class="mb-6 text-[48px] leading-tight tracking-tight text-fg">
		Where type designers are trained.
	</h1>

	<p class="mb-6 text-[15px] leading-relaxed text-fg-muted">
		Type design is a small field, and the formal pathways into it are
		few. Six MA-level programs and four certificate programs produce
		roughly forty graduates per year worldwide. Reading and KABK Type and
		Media are the gold-standard MAs; the others occupy specific niches —
		research-led at ANRT, historical-revival at Plantin, multi-script at
		ECAL, accessible certificate paths at Type@Cooper and Type West.
	</p>

	<p class="mb-12 text-[14px] leading-relaxed text-fg-muted">
		Patens's audit-as-pedagogy framing was built knowing this map.
		Several of the references on the <a
			href="/library"
			class="font-medium text-accent-strong underline underline-offset-2 hover:text-accent">library</a> are written by the faculty below — Gerry Leonidas's Greek
		primer, Gerrit Noordzij's stroke theory (the KABK lineage), Fred
		Smeijers's counterpunch reconstruction. The audit module pays them
		respect by transcribing their rules, not replacing them.
	</p>

	{#each REGION_ORDER as region, ri (region)}
		{@const programs: EducationProgram[] = data.byRegion[region] ?? []}
		<section class="mb-16">
			<h2
				class="mt-16 border-t border-border/30 pt-12 mb-2 text-[28px] tracking-tight text-fg"
			>
				<span
					class="mr-3 align-middle font-mono text-[10px] tracking-wider text-fg-subtle tabular-nums"
					data-numeric>0{ri + 1}</span
				>{region}
			</h2>
			<p class="mb-8 text-[13px] text-fg-subtle">
				{programs.length} {programs.length === 1 ? 'program' : 'programs'}
			</p>

			<ul class="grid gap-8">
				{#each programs as program (program.id)}
					<li class="border-t border-border/40 pt-5">
						<div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
							<div class="flex items-baseline gap-2">
								<span
									class="font-mono text-[11px] tracking-wider text-fg-subtle tabular-nums"
									data-numeric>{String(program.index).padStart(2, '0')}</span
								>
								<a
									href={program.url}
									target="_blank"
									rel="noopener noreferrer"
									class="text-[16px] font-medium text-fg hover:text-accent-strong hover:underline underline-offset-[5px]"
								>
									{program.name}
									<ExternalLink class="ml-1 inline size-3 text-fg-subtle" aria-hidden="true" />
								</a>
							</div>
							<span
								class="rounded-none border border-border bg-surface-2/40 px-2 py-0.5 font-mono text-[10px] tracking-wider text-fg-muted uppercase"
							>
								{program.format}
							</span>
						</div>

						<p class="mt-1 font-mono text-[11px] text-fg-subtle">
							{program.institution} · {program.city}, {program.country} · est. {program.established}
						</p>

						<div class="mt-3 grid gap-2 text-[13px] leading-relaxed">
							<p class="text-fg-muted">
								<span class="text-fg-subtle">Format.</span>
								{program.length} · {program.cohortSize}
							</p>
							{#if program.tradition}
								<p class="text-fg-muted">
									<span class="text-fg-subtle">Tradition.</span>
									{program.tradition}
								</p>
							{/if}
							<p class="text-fg-muted">
								<span class="text-fg-subtle">Tools.</span>
								{program.tools.join(' · ')}
							</p>
							<p class="text-fg-muted">
								<span class="text-fg-subtle">Faculty.</span>
								{#each program.faculty as f, fi (f.name)}
									<span class="text-fg">{f.name}</span>
									{#if f.role}<span class="text-fg-subtle"> — {f.role}</span>{/if}
									{#if fi < program.faculty.length - 1}<span class="text-fg-subtle"> · </span>{/if}
								{/each}
							</p>
						</div>

						<p class="mt-3 text-[13px] leading-relaxed text-fg-muted">
							<span class="text-fg-subtle">Why we care.</span>
							{program.whyPatensCares}
						</p>
					</li>
				{/each}
			</ul>
		</section>
	{/each}

	<section class="mt-16 mb-12 border-t border-border/30 pt-12">
		<h2 class="mb-4 text-[20px] tracking-tight text-fg">
			Not pictured
		</h2>
		<p class="mb-3 text-[14px] leading-relaxed text-fg-muted">
			Patens learns from informal education too: TypeDrawers and the
			<a
				href="https://alphabettes.org/"
				target="_blank"
				rel="noopener noreferrer"
				class="font-medium text-accent-strong underline underline-offset-2 hover:text-accent">Alphabettes</a> community, Type Electives and Crafting Type online courses,
			Patreon-funded educators like Erik van Blokland,
			<a
				href="https://www.youtube.com/c/FrankAdebiaye"
				target="_blank"
				rel="noopener noreferrer"
				class="font-medium text-accent-strong underline underline-offset-2 hover:text-accent">Frank Adebiaye's YouTube</a> + the Velvetyne open foundry, and the foundry blogs already
			on the <a
				href="/library"
				class="font-medium text-accent-strong underline underline-offset-2 hover:text-accent">library</a> page (Klim, Frere-Jones, Phinney on Fonts). The full
			outreach map is in
			<a
				href="https://github.com/alevizio/patens/blob/main/docs/research/type-education-landscape.md"
				target="_blank"
				rel="noopener noreferrer"
				class="font-medium text-accent-strong underline underline-offset-2 hover:text-accent">type-education-landscape.md</a>.
		</p>
		<p class="text-[14px] leading-relaxed text-fg-muted">
			If you teach type, write to <a
				href="mailto:hi@patens.design"
				class="font-medium text-accent-strong underline underline-offset-2 hover:text-accent">hi@patens.design</a>. The audit module is a teaching surface; we want
			to hear how it could fit your curriculum.
		</p>
	</section>
	<SiteFooter />
</div>
