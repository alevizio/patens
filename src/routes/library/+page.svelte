<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import SiteFooter from '$lib/ui/SiteFooter.svelte';
	import SiteHeader from '$lib/ui/SiteHeader.svelte';
	import type { PageData } from './$types';
	import type {
		LibraryEntry,
		LibraryLicensing,
		LibraryCategory
	} from '$lib/library/canon';

	type Props = { data: PageData };
	let { data }: Props = $props();

	const CATEGORY_ORDER: LibraryCategory[] = [
		'Foundational craft & theory',
		'Specifications',
		'Academic + research',
		'Foundry blogs',
		'Living OFL exemplars'
	];

	// License badge styling — Swiss palette, no second hue
	const licenseLabel: Record<LibraryLicensing, string> = {
		open: 'Open',
		cc: 'CC',
		'fair-use': 'Fair use',
		'license-required': 'License req',
		'public-domain': 'Public domain'
	};

	// Confidence dot — ✅ / ⚠️ / ❓ as visual character
	const confidenceMark = (c: LibraryEntry['confidence']) =>
		c === 'confirmed' ? '✅' : c === 'likely' ? '⚠️' : '❓';
</script>

<svelte:head>
	<title>The library (2026) · Patens — 42 canonical type-design references</title>
	<meta
		name="description"
		content="The 42 canonical type-design references that ground Patens's audit module — Tracy 1986, Bringhurst 1992, Hochuli 1987, Smeijers 1996, Noordzij 1985, Cheng 2006, plus the OpenType spec, Knuth Metafont papers, foundry blogs, the multi-script primers, and living OFL exemplars (Bungee, Fit, Amstelvar, Roboto Flex)."
	/>
	<link rel="canonical" href="https://patens.design/library" />
	<meta property="og:title" content="The library · Patens" />
	<meta
		property="og:description"
		content="42 canonical references that ground the 102-code audit module."
	/>
	<meta property="og:image" content="https://patens.design/og/brand" />
	<meta property="og:image:alt" content="Patens — open-source browser-native type design tool with a 102-code audit module" />
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
	<SiteHeader current="/library" />

	<a
		href="/"
		class="mb-8 inline-flex items-center gap-1.5 rounded-sm text-[12px] text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:text-fg focus-visible:underline focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
	>
		<ArrowLeft class="size-3" />
		Back to the foundry
	</a>

	<p class="mb-2 text-[13px] uppercase tracking-[0.18em] text-fg-subtle">
		The reading list
	</p>

	<h1 class="mb-6 text-[48px] leading-tight tracking-tight text-fg">
		The library — {data.totalCount} canonical references.
	</h1>

	<p class="mb-6 text-[15px] leading-relaxed text-fg-muted">
		The audit module on this site doesn't invent its rules — it transcribes
		them from the literature. These are the {data.totalCount} canonical
		references that ground the {99}-code audit, the citation engine, and the
		teaching prose on every <a
			href="/audit"
			class="font-medium text-accent-strong underline underline-offset-2 hover:text-accent">/audit/[code]</a> page.
	</p>

	<p class="mb-12 text-[14px] leading-relaxed text-fg-muted">
		Five categories: foundational craft books, normative specifications,
		academic + research literature, and contemporary foundry blogs. Each
		entry carries author, year, publisher, licensing posture, which Patens
		audit families it informs, and a link to a copy where one exists in the
		open. Compiled from <a
			href="https://github.com/alevizio/patens/blob/main/docs/research/canonical-library.md"
			target="_blank"
			rel="noopener noreferrer"
			class="font-medium text-accent-strong underline underline-offset-2 hover:text-accent">canonical-library.md</a> (the research artifact).
	</p>

	{#each CATEGORY_ORDER as category, ci (category)}
		{@const entries: LibraryEntry[] = data.byCategory[category] ?? []}
		<section class="mb-16">
			<h2
				class="mt-16 border-t border-border/30 pt-12 mb-2 text-[28px] tracking-tight text-fg"
			>
				<span
					class="mr-3 align-middle font-mono text-[10px] tracking-wider text-fg-subtle tabular-nums"
					data-numeric>0{ci + 1}</span
				>{category}
			</h2>
			<p class="mb-8 text-[13px] text-fg-subtle">
				{entries.length} {entries.length === 1 ? 'entry' : 'entries'}
			</p>

			<ul class="grid gap-6">
				{#each entries as entry (entry.id)}
					<li class="border-t border-border/40 pt-5">
						<div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
							<div class="flex items-baseline gap-2">
								<span
									class="font-mono text-[11px] tracking-wider text-fg-subtle tabular-nums"
									data-numeric>{String(entry.index).padStart(2, '0')}</span
								>
								<span aria-hidden="true">{confidenceMark(entry.confidence)}</span>
								<a
									href={entry.canonicalUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="text-[16px] font-medium text-fg hover:text-accent-strong hover:underline underline-offset-[5px]"
								>
									{entry.title}
									{#if entry.canonicalUrl}
										<ExternalLink class="ml-1 inline size-3 text-fg-subtle" aria-hidden="true" />
									{/if}
								</a>
							</div>
							<span
								class="rounded-none border border-border bg-surface-2/40 px-2 py-0.5 font-mono text-[10px] tracking-wider text-fg-muted uppercase"
							>
								{licenseLabel[entry.licensing]}
							</span>
						</div>

						<p class="mt-1 font-mono text-[11px] text-fg-subtle">
							{entry.author} · {entry.year} · {entry.publisher}
						</p>

						<p class="mt-2 text-[14px] leading-relaxed text-fg-muted">
							{entry.whyCanonical}
						</p>

						{#if entry.topicalCoverage}
							<p class="mt-1.5 text-[13px] leading-relaxed text-fg-muted">
								<span class="text-fg-subtle">Coverage:</span>
								{entry.topicalCoverage}
							</p>
						{/if}

						{#if entry.licensingDetail}
							<p class="mt-1.5 text-[12px] leading-relaxed text-fg-subtle">
								<span class="font-medium">Licensing.</span>
								{entry.licensingDetail}
							</p>
						{/if}

						{#if entry.digitization}
							<p class="mt-1 text-[12px] leading-relaxed text-fg-subtle">
								<span class="font-medium">Where to find.</span>
								{entry.digitization}
							</p>
						{/if}

						<div class="mt-2 flex flex-wrap gap-1.5">
							{#each entry.auditFamilies as family (family)}
								<span
									class="rounded-none border border-border/60 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-fg-subtle"
								>
									{family}
								</span>
							{/each}
						</div>
					</li>
				{/each}
			</ul>
		</section>
	{/each}

	<section class="mt-16 mb-12 border-t border-border/30 pt-12">
		<h2 class="mb-4 text-[20px] tracking-tight text-fg">
			A note on what's missing
		</h2>
		<p class="mb-3 text-[14px] leading-relaxed text-fg-muted">
			Three traditions don't appear in this 42-source core but inform the
			work: the punchcutting tradition before Moxon (oral, mostly lost),
			the proprietary in-house manuals at Linotype + Monotype + ITC (not
			publicly available), and contemporary multi-script literature in
			languages other than English (sparse digitization, often
			untranslated). See the <a
				href="https://github.com/alevizio/patens/blob/main/docs/research/canonical-library.md#section-5-—-honest-gaps-meta-observations"
				target="_blank"
				rel="noopener noreferrer"
				class="font-medium text-accent-strong underline underline-offset-2 hover:text-accent">honest-gaps section</a>
			of the research artifact for the longer note.
		</p>
		<p class="text-[14px] leading-relaxed text-fg-muted">
			The library grows as the audit grows. If a reference is missing
			that you think belongs, write to
			<a
				href="mailto:hi@patens.design"
				class="font-medium text-accent-strong underline underline-offset-2 hover:text-accent"
				>hi@patens.design</a
			>.
		</p>
	</section>
	<SiteFooter />
</div>
