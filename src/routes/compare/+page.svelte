<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Check from '@lucide/svelte/icons/check';
	import Minus from '@lucide/svelte/icons/minus';

	import SiteFooter from '$lib/ui/SiteFooter.svelte';
	import SiteHeader from '$lib/ui/SiteHeader.svelte';
	type Cell = true | false | 'partial' | string;
	type Row = {
		feature: string;
		note?: string;
		patens: Cell;
		fontlab: Cell;
		glyphs: Cell;
		robofont: Cell;
		fontra: Cell;
		glyphrStudio: Cell;
		typlr: Cell;
		birdfont: Cell;
		fontforge: Cell;
	};

	type Group = { title: string; rows: Row[] };

	const groups: Group[] = [
		{
			title: 'Access',
			rows: [
				{
					feature: 'Price',
					patens: 'Free',
					fontlab: '$499',
					glyphs: '$300',
					robofont: '$400',
					fontra: 'Free',
					glyphrStudio: 'Free',
					typlr: 'Free',
					birdfont: 'Donateware',
					fontforge: 'Free'
				},
				{
					feature: 'Open source',
					patens: 'MIT',
					fontlab: false,
					glyphs: false,
					robofont: false,
					fontra: 'BSD',
					glyphrStudio: 'MIT',
					typlr: false,
					birdfont: 'GPL',
					fontforge: 'GPL'
				},
				{
					feature: 'Runs in browser',
					note: 'No install, no account, opens in a tab',
					patens: true,
					fontlab: false,
					glyphs: false,
					robofont: false,
					fontra: true,
					glyphrStudio: true,
					typlr: true,
					birdfont: false,
					fontforge: false
				},
				{
					feature: 'Platforms',
					patens: 'Any browser',
					fontlab: 'macOS, Windows',
					glyphs: 'macOS only',
					robofont: 'macOS only',
					fontra: 'Any browser',
					glyphrStudio: 'Any browser',
					typlr: 'Any browser',
					birdfont: 'macOS, Windows, Linux',
					fontforge: 'macOS, Windows, Linux'
				},
				{
					feature: 'Offline support',
					note: 'PWA / install-to-home, full editor offline',
					patens: true,
					fontlab: true,
					glyphs: true,
					robofont: true,
					fontra: 'partial',
					glyphrStudio: false,
					typlr: false,
					birdfont: true,
					fontforge: true
				},
				{
					feature: 'Data lives',
					patens: 'Your browser',
					fontlab: 'Your disk',
					glyphs: 'Your disk',
					robofont: 'Your disk',
					fontra: 'Your disk or server',
					glyphrStudio: 'Your browser',
					typlr: 'Your browser',
					birdfont: 'Your disk',
					fontforge: 'Your disk'
				}
			]
		},
		{
			title: 'Drawing & editing',
			rows: [
				{
					feature: 'Pressure-sensitive sketch',
					note: 'Draw with a pencil, trace to Bézier',
					patens: true,
					fontlab: false,
					glyphs: false,
					robofont: false,
					fontra: false,
					glyphrStudio: false,
					typlr: false,
					birdfont: false,
					fontforge: false
				},
				{
					feature: 'Direct Bézier editing',
					patens: true,
					fontlab: true,
					glyphs: true,
					robofont: true,
					fontra: true,
					glyphrStudio: true,
					typlr: true,
					birdfont: true,
					fontforge: true
				},
				{
					feature: 'Components / composites',
					patens: true,
					fontlab: true,
					glyphs: true,
					robofont: true,
					fontra: true,
					glyphrStudio: 'partial',
					typlr: 'partial',
					birdfont: true,
					fontforge: true
				},
				{
					feature: 'Anchor-based mark positioning',
					patens: true,
					fontlab: true,
					glyphs: true,
					robofont: true,
					fontra: true,
					glyphrStudio: false,
					typlr: false,
					birdfont: 'partial',
					fontforge: true
				}
			]
		},
		{
			title: 'OpenType & advanced',
			rows: [
				{
					feature: 'Live HarfBuzz shaping',
					patens: true,
					fontlab: true,
					glyphs: true,
					robofont: 'partial',
					fontra: true,
					glyphrStudio: false,
					typlr: 'partial',
					birdfont: false,
					fontforge: 'partial'
				},
				{
					feature: 'OpenType features (GSUB)',
					patens: true,
					fontlab: true,
					glyphs: true,
					robofont: true,
					fontra: 'partial',
					glyphrStudio: 'partial',
					typlr: 'partial',
					birdfont: 'partial',
					fontforge: true
				},
				{
					feature: 'Variable fonts',
					note: 'Multiple masters, named instances, axis design',
					patens: true,
					fontlab: true,
					glyphs: true,
					robofont: true,
					fontra: true,
					glyphrStudio: 'partial',
					typlr: false,
					birdfont: false,
					fontforge: 'partial'
				},
				{
					feature: 'Kerning + classes',
					patens: true,
					fontlab: true,
					glyphs: true,
					robofont: true,
					fontra: true,
					glyphrStudio: 'partial',
					typlr: 'partial',
					birdfont: 'partial',
					fontforge: true
				},
				{
					feature: 'Color fonts (COLR / CPAL)',
					patens: true,
					fontlab: true,
					glyphs: true,
					robofont: 'partial',
					fontra: 'partial',
					glyphrStudio: false,
					typlr: false,
					birdfont: false,
					fontforge: 'partial'
				},
				{
					feature: 'Multi-script (Latin + Cyrillic + Greek)',
					patens: true,
					fontlab: true,
					glyphs: true,
					robofont: true,
					fontra: true,
					glyphrStudio: 'partial',
					typlr: 'partial',
					birdfont: 'partial',
					fontforge: true
				}
			]
		},
		{
			title: 'Audit, teaching & QA',
			rows: [
				{
					feature: 'Built-in audit module',
					note: '94 codes spanning contour, metrics, OT, briefs',
					patens: true,
					fontlab: 'partial',
					glyphs: 'partial',
					robofont: 'partial',
					fontra: false,
					glyphrStudio: false,
					typlr: false,
					birdfont: false,
					fontforge: 'partial'
				},
				{
					feature: 'One-click "Fix" actions',
					patens: true,
					fontlab: false,
					glyphs: false,
					robofont: false,
					fontra: false,
					glyphrStudio: false,
					typlr: false,
					birdfont: false,
					fontforge: false
				},
				{
					feature: 'Teaching-grade explanations',
					note: 'Audit codes documented in plain language inline',
					patens: true,
					fontlab: false,
					glyphs: false,
					robofont: false,
					fontra: false,
					glyphrStudio: false,
					typlr: false,
					birdfont: false,
					fontforge: false
				},
				{
					feature: 'Pre-flight release check',
					patens: true,
					fontlab: 'partial',
					glyphs: 'partial',
					robofont: 'partial',
					fontra: false,
					glyphrStudio: false,
					typlr: false,
					birdfont: false,
					fontforge: false
				}
			]
		},
		{
			title: 'Sharing & export',
			rows: [
				{
					feature: 'OTF export',
					patens: true,
					fontlab: true,
					glyphs: true,
					robofont: true,
					fontra: true,
					glyphrStudio: true,
					typlr: true,
					birdfont: true,
					fontforge: true
				},
				{
					feature: 'TTF + autohinting',
					patens: true,
					fontlab: true,
					glyphs: true,
					robofont: true,
					fontra: 'partial',
					glyphrStudio: 'partial',
					typlr: 'partial',
					birdfont: true,
					fontforge: true
				},
				{
					feature: 'WOFF2 export',
					patens: true,
					fontlab: true,
					glyphs: true,
					robofont: true,
					fontra: 'partial',
					glyphrStudio: true,
					typlr: true,
					birdfont: 'partial',
					fontforge: true
				},
				{
					feature: 'UFO export',
					patens: true,
					fontlab: true,
					glyphs: true,
					robofont: true,
					fontra: true,
					glyphrStudio: false,
					typlr: false,
					birdfont: false,
					fontforge: true
				},
				{
					feature: 'One-click cloud share link',
					note: 'No account required for the viewer',
					patens: true,
					fontlab: false,
					glyphs: false,
					robofont: false,
					fontra: 'partial',
					glyphrStudio: false,
					typlr: 'partial',
					birdfont: false,
					fontforge: false
				},
				{
					feature: 'Printable specimen sheet',
					patens: true,
					fontlab: 'partial',
					glyphs: 'partial',
					robofont: 'partial',
					fontra: false,
					glyphrStudio: false,
					typlr: 'partial',
					birdfont: false,
					fontforge: false
				}
			]
		}
	];

	type CompetitorKey = Exclude<keyof Row, 'feature' | 'note'>;
	type Competitor = { key: CompetitorKey; name: string; highlight?: boolean };
	const competitors: ReadonlyArray<Competitor> = [
		{ key: 'patens', name: 'Patens', highlight: true },
		{ key: 'fontlab', name: 'FontLab 8' },
		{ key: 'glyphs', name: 'Glyphs 3' },
		{ key: 'robofont', name: 'RoboFont' },
		{ key: 'fontra', name: 'Fontra' },
		{ key: 'glyphrStudio', name: 'Glyphr Studio' },
		{ key: 'typlr', name: 'typlr.app' },
		{ key: 'birdfont', name: 'BirdFont' },
		{ key: 'fontforge', name: 'FontForge' }
	];

	const renderCell = (value: Cell) => value;

	const jsonLd = `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'BreadcrumbList',
				itemListElement: [
					{ '@type': 'ListItem', position: 1, name: 'Patens', item: 'https://patens.design' },
					{ '@type': 'ListItem', position: 2, name: 'Compare', item: 'https://patens.design/compare' }
				]
			},
			{
				'@type': 'WebPage',
				name: 'Patens vs FontLab, Glyphs, Fontra, and other type editors',
				description:
					'Feature-by-feature comparison of Patens against FontLab 8, Glyphs 3, RoboFont, Fontra, Glyphr Studio, typlr.app, BirdFont, and FontForge — pricing, platform, audit module, OpenType features, variable fonts, export formats.',
				url: 'https://patens.design/compare',
				inLanguage: 'en',
				isPartOf: { '@type': 'WebSite', name: 'Patens', url: 'https://patens.design' }
			}
		]
		// Trailing `<\/script>` escape keeps Svelte's parser from misreading
		// the source as the end of this <script> block.
		// eslint-disable-next-line no-useless-escape
	}).replace(/<\/script/g, '<\\/script')}<\/script>`;
</script>

<svelte:head>
	<title>Patens vs FontLab, Glyphs, Fontra — type editor comparison (2026)</title>
	<meta
		name="description"
		content="How Patens compares to FontLab 8, Glyphs 3, RoboFont, Fontra, Glyphr Studio, typlr.app, BirdFont, and FontForge — pricing, browser-native vs desktop, audit + teaching features, OpenType + variable + color fonts, export formats."
	/>
	<link rel="canonical" href="https://patens.design/compare" />
	<meta property="og:title" content="Patens vs FontLab, Glyphs, Fontra — feature comparison" />
	<meta
		property="og:description"
		content="Browser-native, open-source type editor with a 94-code audit. Compare against FontLab, Glyphs, RoboFont, Fontra, Glyphr Studio, typlr, BirdFont, FontForge."
	/>
	<meta property="og:image" content="https://patens.design/og/brand" />
	<meta property="og:image:alt" content="Patens — open-source browser-native type design tool with a 94-code audit module" />
	<meta name="twitter:title" content="Patens vs FontLab, Glyphs, Fontra" />
	<meta name="twitter:description" content="Feature-by-feature comparison of the major type-design tools." />
	<meta name="twitter:image" content="https://patens.design/og/brand" />
	<meta name="twitter:image:alt" content="Patens — open-source browser-native type design tool with a 94-code audit module" />
	<!-- eslint-disable svelte/no-at-html-tags, no-useless-escape -->
	{@html jsonLd}
	<!-- eslint-enable svelte/no-at-html-tags, no-useless-escape -->
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
	<SiteHeader current="/compare" />

	<a
		href="/"
		class="mb-8 inline-flex items-center gap-1.5 text-[12px] text-fg-muted hover:text-fg"
	>
		<ArrowLeft class="size-3" />
		Back to the foundry
	</a>

	<h1
		class="mb-6 max-w-3xl text-[48px] leading-tight tracking-tight text-fg"
		style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
	>
		Patens vs the world.
	</h1>

	<p class="mb-4 max-w-3xl text-[15px] leading-relaxed text-fg-muted">
		Patens isn't trying to replace FontLab or Glyphs. Those are deeper, faster,
		and built for professionals shipping commercial families across years.
		Patens is for the in-between — the designer who drew a logo and wants
		a real font from it, the student learning why a kerning pair feels wrong,
		the foundry that wants to share a specimen without making someone install
		software.
	</p>

	<p class="mb-12 max-w-3xl text-[14px] leading-relaxed text-fg-muted">
		The honest take per row, below. Cells with
		<span class="inline-flex items-baseline gap-1 align-baseline">
			<Check class="size-3 translate-y-0.5 text-accent-strong" />
		</span>
		are first-class; <em class="not-italic text-fg">partial</em> means it's
		possible but rough; everything else is what the tool says or charges.
	</p>

	<!-- The comparison table. Two presentations: a wide table at md+ and a
	     stack of per-tool cards at small screens (because 9 columns × dozens
	     of rows doesn't survive a phone). -->
	<div class="hidden lg:block">
		{#each groups as group (group.title)}
			<section class="mb-12">
				<h2
					class="mb-4 text-[14px] uppercase tracking-[0.14em] text-fg-muted"
				>
					{group.title}
				</h2>
				<div
					class="overflow-hidden rounded-lg border border-border/40 bg-surface-1/40"
				>
					<table class="w-full border-collapse text-[13px]">
						<thead>
							<tr class="border-b border-border/40 bg-surface-2/40">
								<th
									class="sticky left-0 z-10 bg-surface-2/40 px-4 py-3 text-left font-medium text-fg"
									scope="col"
								>
									Feature
								</th>
								{#each competitors as c (c.key)}
									<th
										class="px-3 py-3 text-left font-medium text-fg whitespace-nowrap"
										class:bg-accent-soft={c.highlight}
										class:text-accent-strong={c.highlight}
										scope="col"
									>
										{c.name}
									</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each group.rows as row (row.feature)}
								<tr class="border-b border-border/30 last:border-b-0">
									<th
										class="sticky left-0 bg-surface-1/40 px-4 py-3 text-left align-top font-normal text-fg"
										scope="row"
									>
										<div>{row.feature}</div>
										{#if row.note}
											<div
												class="mt-0.5 text-[11px] leading-snug text-fg-muted"
											>
												{row.note}
											</div>
										{/if}
									</th>
									{#each competitors as c (c.key)}
										{@const v = renderCell(row[c.key])}
										<td
											class="px-3 py-3 align-top text-[13px] text-fg-muted"
											class:bg-accent-soft={c.highlight}
											class:text-accent-strong={c.highlight}
										>
											{#if v === true}
												<Check class="size-3.5" aria-label="Yes" />
											{:else if v === false}
												<Minus
													class="size-3.5 text-fg-muted/40"
													aria-label="No"
												/>
											{:else if v === 'partial'}
												<span
													class="text-[11px] uppercase tracking-wide text-fg-muted"
												>
													partial
												</span>
											{:else}
												{v}
											{/if}
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		{/each}
	</div>

	<!-- Mobile / tablet: per-tool cards, Patens first. -->
	<div class="lg:hidden">
		{#each competitors as c (c.key)}
			<section
				class="mb-8 rounded-lg border p-4"
				class:border-accent-strong={c.highlight}
				class:bg-accent-soft={c.highlight}
				class:border-border={!c.highlight}
			>
				<h2
					class="mb-3 text-[28px] tracking-tight"
					class:text-accent-strong={c.highlight}
					class:text-fg={!c.highlight}
					style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
				>
					{c.name}
				</h2>
				{#each groups as group (group.title)}
					<div class="mb-3">
						<div
							class="mb-1 text-[11px] uppercase tracking-[0.14em] text-fg-muted"
						>
							{group.title}
						</div>
						<dl class="grid grid-cols-2 gap-x-4 gap-y-1 text-[13px]">
							{#each group.rows as row (row.feature)}
								{@const v = renderCell(row[c.key])}
								<dt class="text-fg-muted">{row.feature}</dt>
								<dd class="text-fg">
									{#if v === true}
										<Check class="size-3.5" aria-label="Yes" />
									{:else if v === false}
										<span class="text-fg-muted/40">—</span>
									{:else if v === 'partial'}
										<span class="text-[11px] uppercase tracking-wide">partial</span>
									{:else}
										{v}
									{/if}
								</dd>
							{/each}
						</dl>
					</div>
				{/each}
			</section>
		{/each}
	</div>

	<h2
		class="mt-16 mb-3 text-[28px] tracking-tight text-fg"
		style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
	>
		When Patens is the right answer
	</h2>
	<ul class="mb-10 max-w-3xl space-y-2 text-[14px] leading-relaxed text-fg-muted">
		<li>
			You want to <em class="not-italic text-fg">try</em> type design without
			a $300+ commitment or a 1GB download.
		</li>
		<li>
			You drew a logo and want a real OpenType file from it, end-to-end, in
			a tab.
		</li>
		<li>
			You're teaching or learning — and want an editor that explains why a
			vertical metric warning matters, not just that it exists.
		</li>
		<li>
			You want to share a specimen with a client without asking them to
			install software.
		</li>
		<li>
			You care that the tool is open source, MIT-licensed, and the data
			never leaves your machine unless you tell it to.
		</li>
	</ul>

	<h2
		class="mt-12 mb-3 text-[28px] tracking-tight text-fg"
		style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
	>
		When it isn't
	</h2>
	<ul class="mb-10 max-w-3xl space-y-2 text-[14px] leading-relaxed text-fg-muted">
		<li>
			You're shipping a 40-master family with hundreds of CJK glyphs.
			FontLab or Glyphs will outpace Patens by years of tooling.
		</li>
		<li>
			You need Python scripting to drive design space exploration. RoboFont
			or Fontra integrate deeper with the Python ecosystem.
		</li>
		<li>
			You require a specific paid feature (custom hinting,
			interpolated-composite resolution, foundry-grade CFF subroutinization
			tuning) that a commercial tool ships.
		</li>
	</ul>

	<h2
		class="mt-12 mb-3 text-[28px] tracking-tight text-fg"
		style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
	>
		Try it
	</h2>
	<p class="mb-3 text-[14px] leading-relaxed text-fg-muted">
		The demo project ships with 162 drawn glyphs across Latin, Cyrillic, and
		Greek. Open it in your browser and edit a real font:
	</p>
	<p class="mb-16 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-[14px]">
		<a
			href="/project/demo/edit"
			class="text-accent-strong underline underline-offset-2"
		>
			Open the demo editor
		</a>
		<a
			href="/share/demo"
			class="text-fg-muted underline underline-offset-2 hover:text-fg"
		>
			View the specimen sheet
		</a>
		<a
			href="https://github.com/alevizio/patens"
			class="text-fg-muted underline underline-offset-2 hover:text-fg"
		>
			Source on GitHub
		</a>
	</p>

	<p class="mb-4 text-[12px] leading-relaxed text-fg-muted">
		Comparison reflects feature parity at v1.5.2 (Patens) and current
		shipping versions of the others as of May 2026. If something here is
		wrong about your tool, open an
		<a
			href="https://github.com/alevizio/patens/issues/new"
			class="text-accent-strong underline underline-offset-2"
		>
			issue
		</a>
		and it'll be corrected — accuracy beats marketing.
	</p>
	<SiteFooter />
</div>
