<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	type Q = { q: string; a: string };
	type Section = { heading: string; items: Q[] };

	const slugify = (s: string): string =>
		s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

	const sections: Section[] = [
		{
			heading: 'Getting started',
			items: [
				{
					q: 'How do I start drawing?',
					a: 'Open the example project from the home page, then click any glyph tile in the left strip. The pencil tool is selected by default — drag to sketch. Press T (or click Trace) to convert your sketch to Bézier outlines.'
				},
				{
					q: 'Does it work on iPad?',
					a: 'Yes, with Apple Pencil. The sketch tool is pressure-sensitive. The editor uses a full-canvas layout that adapts to the smaller viewport.'
				},
				{
					q: 'Where are my projects saved?',
					a: 'Locally, in your browser\'s IndexedDB. Nothing leaves your machine unless you choose to export (.font.json file) or share via cloud (one-click upload to Vercel Blob when configured).'
				}
			]
		},
		{
			heading: 'Sharing your work',
			items: [
				{
					q: 'How do I share a project with someone?',
					a: 'Three options. (1) Copy share link — uploads to cloud, recipient opens the URL in any browser. (2) Export as .font.json — sends a file the recipient can drop on their home page. (3) Print specimen — Cmd+P on the share view gives you a designer-grade PDF.'
				},
				{
					q: 'Does a share link expire?',
					a: 'No. The cloud-uploaded project lives until you wipe the Vercel Blob store. Future versions may add an explicit "delete share" API; for now the link works indefinitely.'
				},
				{
					q: 'Can the recipient edit what I shared?',
					a: 'No. The share view is read-only. If they want to edit, they can import the .font.json into their own browser as a fresh project — their edits won\'t affect yours.'
				}
			]
		},
		{
			heading: 'Export',
			items: [
				{
					q: 'What formats can I export?',
					a: 'OTF and WOFF2 directly from the share page download buttons. The full Export tab in the editor also offers TTF (with ttfautohint), UFO (for Glyphs/RoboFont/FontLab compatibility), a designer-bundled .zip with a test HTML page, and the portable .font.json.'
				},
				{
					q: 'Why is TTF slower to export than OTF?',
					a: 'TTF export runs through Pyodide + fontTools + ttfautohint (autohinting for screen rendering at small sizes). First export loads Pyodide (~7MB, cached); subsequent exports are ~2 seconds. OTF + WOFF2 export entirely in-browser via opentype.js and take ~150ms.'
				},
				{
					q: 'Can I use the font commercially?',
					a: 'You own everything you draw. The demo project is MIT-licensed under the same terms as the source code. If you build your own font, you decide the license — set it in the project metadata before export.'
				}
			]
		},
		{
			heading: 'Editor',
			items: [
				{
					q: 'What does the audit panel mean?',
					a: 'A continuous integrity check across 93+ codes — contour shape, vertical metrics, OpenType invariants, brief completeness. Errors block release; warnings are advice. Many issues have a "Fix" button that applies the auto-fix in one click. Click "All" next to an issue to see every glyph with the same audit code.'
				},
				{
					q: 'Why does my export include glyphs I never drew?',
					a: 'Composites — letters like Á that combine a base (A) with a mark (acute). The audit module flags composable glyphs you haven\'t drawn yet; the bulk-compose action in the glyph browser builds them automatically from their parts.'
				},
				{
					q: 'How do I reset the demo project?',
					a: 'Open /project/demo/edit?fresh=1 — the ?fresh=1 parameter rebuilds the demo from source, ignoring any local edits.'
				}
			]
		},
		{
			heading: 'Performance + storage',
			items: [
				{
					q: 'My project is slow to load.',
					a: 'Large projects (200+ glyphs) take a moment to deserialize from IndexedDB. The editor stays responsive after; loads are amortized. If you see consistent lag during editing, open DevTools → Performance and capture a trace; please share via GitHub issue.'
				},
				{
					q: 'How big can a project get?',
					a: 'Cloud share caps uploads at 5MB JSON (per the API limit). Local IndexedDB has no hard cap but stays performant up to roughly 500 drawn glyphs with kerning + classes + masters.'
				},
				{
					q: 'Can I work offline?',
					a: 'Yes, after the first load. The app caches the static bundle; once a project is in your IndexedDB, you can edit it without network. Cloud share requires connectivity, but local export (OTF/WOFF2) works fully offline.'
				}
			]
		},
		{
			heading: 'Something\'s broken',
			items: [
				{
					q: 'I found a bug.',
					a: 'Open an issue on GitHub: https://github.com/alevizio/patens/issues/new?template=bug.md — the template asks for browser, OS, project, and steps to reproduce.'
				},
				{
					q: 'I have a feature idea.',
					a: 'Same path with the feature template: https://github.com/alevizio/patens/issues/new?template=feature.md — lead with the problem you want to solve before suggesting how.'
				},
				{
					q: 'I want to contribute code.',
					a: 'Read CONTRIBUTING.md in the repo. Areas where help is wanted: more audit codes, curve-fitting refinements, refining the bespoke Cyrillic shapes (Я / Ж / Ф ship as sketches), and the Greek-lowercase roadmap item.'
				},
				{
					q: 'How do I enable Sign-in / AI / cloud share on my deployment?',
					a: 'See docs/setup.md in the repo — per-platform instructions for Vercel, Cloudflare Pages, Netlify, and self-host. Each integration gracefully degrades when not configured, so you can enable them independently.'
				}
			]
		}
	];
</script>

<svelte:head>
	<title>Help · Patens</title>
	<meta name="description" content="Common questions about Patens — sharing, export, the editor, performance." />
	<!-- Per-page OG overrides — same pattern as /share. The global layout
	     sets generic "Patens" defaults; these override for /help so
	     a shared link unfurls with the page-specific title and description. -->
	<meta property="og:title" content="Help · Patens" />
	<meta property="og:description" content="Common questions about Patens — sharing, export, the editor, performance." />
	<meta property="og:image" content="/og/brand" />
	<meta name="twitter:title" content="Help · Patens" />
	<meta name="twitter:description" content="Common questions about Patens — sharing, export, the editor, performance." />
	<meta name="twitter:image" content="/og/brand" />
	<!-- FAQPage + BreadcrumbList JSON-LD. FAQPage drives direct-answer
	     extraction (Google deprecated rich snippets May 2026 but Claude
	     / Perplexity / ChatGPT still parse it for answers). BreadcrumbList
	     gives AI engines site-hierarchy context for entity linking. -->
	<!-- eslint-disable svelte/no-at-html-tags, no-useless-escape -->
	{@html `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'FAQPage',
				mainEntity: sections.flatMap((s) =>
					s.items.map((it) => ({
						'@type': 'Question',
						name: it.q,
						acceptedAnswer: { '@type': 'Answer', text: it.a }
					}))
				)
			},
			{
				'@type': 'BreadcrumbList',
				itemListElement: [
					{ '@type': 'ListItem', position: 1, name: 'Patens', item: 'https://patens.design' },
					{ '@type': 'ListItem', position: 2, name: 'Help', item: 'https://patens.design/help' }
				]
			}
		]
	}).replace(/<\/script/g, '<\\/script')}<\/script>`}
	<!-- eslint-enable svelte/no-at-html-tags, no-useless-escape -->
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
	<a
		href="/"
		class="mb-8 inline-flex items-center gap-1.5 text-[12px] text-fg-muted hover:text-fg"
	>
		<ArrowLeft class="size-3" />
		Back to the foundry
	</a>

	<h1
		class="mb-3 text-[48px] leading-tight tracking-tight text-fg"
		style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
	>
		Help
	</h1>
	<p class="mb-12 text-[14px] leading-relaxed text-fg-muted">
		The questions that come up most. For the deeper architecture, see
		<a
			href="https://github.com/alevizio/patens/blob/main/docs/architecture.md"
			class="text-accent-strong underline underline-offset-2"
		>
			docs/architecture.md
		</a>. For everything else, the
		<a
			href="https://github.com/alevizio/patens/issues"
			class="text-accent-strong underline underline-offset-2"
		>
			GitHub issues
		</a>
		are open.
	</p>

	{#each sections as section (section.heading)}
		<h2
			id={slugify(section.heading)}
			class="group mt-16 border-t border-border/30 pt-12 mb-4 scroll-mt-8 text-[28px] tracking-tight text-fg"
			style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
		>
			<a
				href={`#${slugify(section.heading)}`}
				class="inline-flex items-baseline gap-2 hover:text-accent-strong"
			>
				{section.heading}
				<span
					class="text-[12px] text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100"
					aria-hidden="true"
				>
					#
				</span>
			</a>
		</h2>
		<div class="space-y-4">
			{#each section.items as item (item.q)}
				<details
					class="group rounded-md border border-border bg-surface-2/30 transition-colors hover:bg-surface-2/50"
				>
					<summary
						class="cursor-pointer list-none px-4 py-3 text-[14px] font-medium text-fg [&::-webkit-details-marker]:hidden"
					>
						<span class="mr-2 text-accent-strong group-open:rotate-90 inline-block transition-transform">
							›
						</span>
						{item.q}
					</summary>
					<div class="px-4 pb-4 pl-9 text-[13px] leading-relaxed text-fg-muted">
						{item.a}
					</div>
				</details>
			{/each}
		</div>
	{/each}
</div>
