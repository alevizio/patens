<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Download from '@lucide/svelte/icons/download';
	import Camera from '@lucide/svelte/icons/camera';

	import SiteFooter from '$lib/ui/SiteFooter.svelte';
	import SiteHeader from '$lib/ui/SiteHeader.svelte';
	// Press kit factsheet — the structured-data canonical source for
	// journalists writing about Patens. Pulled inline as a TS const so
	// the JSON-LD + the visible factsheet table can't drift apart.
	const facts = {
		product: 'Patens',
		tagline: 'Browser-native, open-source type design environment.',
		url: 'https://patens.design',
		version: '1.5.2',
		license: 'MIT',
		releasedAt: '2026-05',
		maintainer: 'Alejandro Vizio',
		maintainerUrl: 'https://github.com/alevizio',
		repo: 'https://github.com/alevizio/patens',
		pronunciation: 'PAH-tens (Latin: /ˈpɑː.tɛns/)',
		contact: 'hi@patens.design',
		twitter: '@patenstype',
		bluesky: '@patens.design',
		instagram: '@patens.type'
	};

	const oneLiner =
		'Patens is a type design tool that teaches as you draw. A built-in 94-code audit module runs continuously alongside the editor — every contour, metric, and kern pair gets checked against the rules type designers internalize through years of mentorship, with plain-English fixes for around 30 of the codes. Sketch with a pressure-sensitive pencil, trace to Bézier, kern, ship OpenType. Browser-native, open-source MIT, no installs, no account.';

	const elevatorPitch =
		'There are five reasonable type editors on the web in 2026 — Glyphr Studio, Fontra, typlr.app, FontStruct, and now Patens. FontLab and Glyphs cover the high end (±$300–500, desktop-only, professional). The browser tier was hobbyist-focused until Fontra brought variable-font seriousness and Patens brought audit-first teaching. The differentiator: Patens is the only one where the audit module is a first-class teaching surface — every warning explains what it means, why it matters, and (for ~30 of the 94 codes) offers a one-click fix. Designed for the in-between: the logo-to-font moment, the learning curve, the share-without-installing handoff.';

	const technical =
		'SvelteKit 2 + Svelte 5 runes, Tailwind CSS v4, TypeScript strict mode. opentype.js for OTF + WOFF2 export, Pyodide + fontTools + ttfautohint for TTF, HarfBuzz.js (WebAssembly) for live OpenType shaping, polygon-clipping for boolean contour ops, perfect-freehand for the pressure-sensitive sketch path, satori + resvg-js for per-project OG image rendering, Vercel Blob for cloud share. The 94-code audit module runs in a Web Worker with a monotonic-seq stale-response guard.';

	const milestones: Array<{ when: string; what: string }> = [
		{ when: 'May 2026', what: 'v1.5.2 — Production-grade, all P0 launch-blocking work complete. SEO/AIO foundation, comprehensive a11y, audit module workerized, family-wide kerning, global Cmd-K, bulk select v2.' },
		{ when: 'Apr 2026', what: 'Renamed Font Studio → Patens; secured patens.design as the canonical domain.' },
		{ when: 'Mar 2026', what: 'v1.4.0 — Color-fonts + COLR/CPAL support, multi-script (Latin + Cyrillic + Greek) demo set landed.' },
		{ when: 'Feb 2026', what: 'v1.2.0 — TTF export via Pyodide + ttfautohint, OpenType feature auto-detection.' },
		{ when: 'Jan 2026', what: 'v1.0.0 — First production release. Cloud share via Vercel Blob, family-wide kerning, audit module.' }
	];

	const jsonLd = `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'WebPage',
				name: 'Press kit — Patens',
				description: 'Patens press kit: factsheet, descriptions, logos, screenshots, milestones, contact.',
				url: 'https://patens.design/press',
				inLanguage: 'en',
				isPartOf: { '@type': 'WebSite', name: 'Patens', url: 'https://patens.design' }
			},
			{
				'@type': 'BreadcrumbList',
				itemListElement: [
					{ '@type': 'ListItem', position: 1, name: 'Patens', item: 'https://patens.design' },
					{ '@type': 'ListItem', position: 2, name: 'Press', item: 'https://patens.design/press' }
				]
			}
		]
		// Trailing `<\/script>` escape keeps Svelte's parser from misreading
		// the source as the end of this <script> block.
		// eslint-disable-next-line no-useless-escape
	}).replace(/<\/script/g, '<\\/script')}<\/script>`;
</script>

<svelte:head>
	<title>Press kit (2026) · Patens</title>
	<meta
		name="description"
		content="Patens press kit — factsheet, one-liner, elevator pitch, technical summary, logos, screenshots, milestones, founder contact."
	/>
	<link rel="canonical" href="https://patens.design/press" />
	<link rel="alternate" hreflang="en" href="https://patens.design/press" />
	<link rel="alternate" hreflang="es" href="https://patens.design/es/press" />
	<link rel="alternate" hreflang="x-default" href="https://patens.design/press" />
	<meta property="og:title" content="Press kit · Patens" />
	<meta
		property="og:description"
		content="Everything you need to write about Patens — factsheet, descriptions, assets, contact."
	/>
	<meta property="og:image" content="https://patens.design/og/press" />
	<meta property="og:image:alt" content="Patens — Press kit · factsheet, brand assets, contact" />
	<meta name="twitter:title" content="Press kit · Patens" />
	<meta name="twitter:description" content="Factsheet + descriptions + assets + contact." />
	<meta name="twitter:image" content="https://patens.design/og/press" />
	<meta name="twitter:image:alt" content="Patens — Press kit · factsheet, brand assets, contact" />
	<!-- eslint-disable svelte/no-at-html-tags, no-useless-escape -->
	{@html jsonLd}
	<!-- eslint-enable svelte/no-at-html-tags, no-useless-escape -->
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
	<SiteHeader current="/press" />

	<a
		href="/"
		class="mb-8 inline-flex items-center gap-1.5 text-[12px] text-fg-muted hover:text-fg"
	>
		<ArrowLeft class="size-3" />
		Back to the foundry
	</a>

	<p class="mb-2 text-[13px] uppercase tracking-[0.18em] text-fg-subtle">
		Press kit
	</p>

	<h1
		class="mb-6 text-[48px] leading-tight tracking-tight text-fg"
		style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
	>
		Patens — press kit.
	</h1>

	<p class="mb-12 text-[15px] leading-relaxed text-fg-muted">
		Everything you need to write, link, or cite. Email
		<a href="mailto:hi@patens.design" class="text-accent-strong underline underline-offset-2">hi@patens.design</a>
		for review copies, founder interview, or anything else.
	</p>

	<!-- FACTSHEET — copy/pasteable table, the structured-data canonical -->
	<section class="mb-16">
		<h2
			class="mb-4 text-[28px] tracking-tight text-fg"
			style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
		>
			Factsheet
		</h2>
		<dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[14px]">
			<dt class="text-fg-subtle">Product</dt>
			<dd class="text-fg">{facts.product}</dd>
			<dt class="text-fg-subtle">Tagline</dt>
			<dd class="text-fg">{facts.tagline}</dd>
			<dt class="text-fg-subtle">URL</dt>
			<dd>
				<a href={facts.url} class="text-accent-strong underline underline-offset-2">
					{facts.url}
				</a>
			</dd>
			<dt class="text-fg-subtle">Version</dt>
			<dd class="font-mono text-fg" data-numeric>{facts.version}</dd>
			<dt class="text-fg-subtle">Released</dt>
			<dd class="text-fg" data-numeric>{facts.releasedAt}</dd>
			<dt class="text-fg-subtle">License</dt>
			<dd class="text-fg">{facts.license}</dd>
			<dt class="text-fg-subtle">Pronunciation</dt>
			<dd class="text-fg">{facts.pronunciation}</dd>
			<dt class="text-fg-subtle">Maintainer</dt>
			<dd class="text-fg">
				<a href={facts.maintainerUrl} class="text-accent-strong underline underline-offset-2">
					{facts.maintainer}
				</a>
			</dd>
			<dt class="text-fg-subtle">Source</dt>
			<dd>
				<a href={facts.repo} class="text-accent-strong underline underline-offset-2">
					{facts.repo.replace('https://', '')}
				</a>
			</dd>
			<dt class="text-fg-subtle">Contact</dt>
			<dd>
				<a href="mailto:{facts.contact}" class="text-accent-strong underline underline-offset-2">
					{facts.contact}
				</a>
			</dd>
			<dt class="text-fg-subtle">Social</dt>
			<dd class="text-fg">
				<a href="https://x.com/{facts.twitter.replace('@', '')}" class="text-accent-strong underline underline-offset-2">
					{facts.twitter}
				</a>
				<span class="mx-1 text-fg-subtle">·</span>
				<a href="https://bsky.app/profile/{facts.bluesky.replace('@', '')}" class="text-accent-strong underline underline-offset-2">
					bsky/{facts.bluesky}
				</a>
				<span class="mx-1 text-fg-subtle">·</span>
				<a href="https://instagram.com/{facts.instagram.replace('@', '')}" class="text-accent-strong underline underline-offset-2">
					instagram/{facts.instagram}
				</a>
			</dd>
		</dl>
	</section>

	<!-- DESCRIPTIONS — short, long, technical -->
	<section class="mb-16">
		<h2
			class="mb-4 text-[28px] tracking-tight text-fg"
			style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
		>
			Descriptions
		</h2>

		<h3 class="mb-2 text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
			One-liner ({oneLiner.length} characters)
		</h3>
		<p class="mb-8 rounded-md border border-border bg-surface-1/40 p-4 text-[14px] leading-relaxed text-fg-muted">
			{oneLiner}
		</p>

		<h3 class="mb-2 text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
			Elevator pitch ({elevatorPitch.length} characters)
		</h3>
		<p class="mb-8 rounded-md border border-border bg-surface-1/40 p-4 text-[14px] leading-relaxed text-fg-muted">
			{elevatorPitch}
		</p>

		<h3 class="mb-2 text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
			Technical summary
		</h3>
		<p class="mb-4 rounded-md border border-border bg-surface-1/40 p-4 text-[14px] leading-relaxed text-fg-muted">
			{technical}
		</p>
	</section>

	<!-- LOGOS + BRAND ASSETS -->
	<section class="mb-16">
		<h2
			class="mb-4 text-[28px] tracking-tight text-fg"
			style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
		>
			Logos + brand assets
		</h2>
		<p class="mb-6 text-[14px] leading-relaxed text-fg-muted">
			The Patens identity is the lowercase "Hn" mark set in StudioGeometric
			(the demo typeface that ships with the editor — the home page
			literally renders this font for the wordmark).
		</p>

		<div class="grid gap-4 sm:grid-cols-2">
			<div class="rounded-lg border border-border bg-surface p-6">
				<div
					class="mb-3 flex h-24 items-center justify-center rounded bg-canvas text-[64px] leading-none text-fg"
					style="font-family: 'StudioGeometric', 'Hoefler Text', ui-serif, Georgia, serif;"
				>
					Hn
				</div>
				<div class="text-[12px] font-medium text-fg">Wordmark — light</div>
				<div class="mt-1 text-[11px] text-fg-subtle">Rendered live from the demo OTF.</div>
				<a
					href="/og/brand"
					download="patens-wordmark-light.png"
					class="mt-3 inline-flex items-center gap-1.5 text-[12px] text-accent-strong hover:underline"
				>
					<Download class="size-3" />
					Download as 1200×630 PNG (OG image)
				</a>
			</div>
			<div class="rounded-lg border border-border bg-canvas-soft p-6">
				<div
					class="mb-3 flex h-24 items-center justify-center rounded bg-fg text-[64px] leading-none text-canvas"
					style="font-family: 'StudioGeometric', 'Hoefler Text', ui-serif, Georgia, serif;"
				>
					Hn
				</div>
				<div class="text-[12px] font-medium text-fg">Wordmark — dark</div>
				<div class="mt-1 text-[11px] text-fg-subtle">Invert the wordmark for dark contexts.</div>
				<a
					href="/favicon.svg"
					download="patens-icon.svg"
					class="mt-3 inline-flex items-center gap-1.5 text-[12px] text-accent-strong hover:underline"
				>
					<Download class="size-3" />
					Download favicon (SVG)
				</a>
			</div>
		</div>

		<p class="mt-4 text-[12px] leading-relaxed text-fg-subtle">
			Need a vector logo, a specific aspect ratio, or a branded social
			cover? Email <a href="mailto:hi@patens.design" class="text-accent-strong underline underline-offset-2">hi@patens.design</a> — happy to make one for the piece.
		</p>
	</section>

	<!-- SCREENSHOTS — placeholder cards until founder ships real assets -->
	<section class="mb-16">
		<h2
			class="mb-4 text-[28px] tracking-tight text-fg"
			style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
		>
			Screenshots
		</h2>
		<p class="mb-6 text-[14px] leading-relaxed text-fg-muted">
			Visit the live editor at
			<a href="/project/demo/edit" class="text-accent-strong underline underline-offset-2">/project/demo/edit</a>
			and screenshot directly — every surface is camera-ready (no real user
			data, the demo project is shipped open). Email for hi-res renders if
			you need 2× retina exports or specific framing.
		</p>
		<div class="grid gap-3 sm:grid-cols-2">
			{#each [
				{ name: 'Editor — drawing surface', path: '/project/demo/edit' },
				{ name: 'Audit module', path: '/project/demo/audit' },
				{ name: 'Spacing + kerning', path: '/project/demo/spacing' },
				{ name: 'Designspace + variation explorer', path: '/project/demo/designspace' },
				{ name: 'Features tab + HarfBuzz preview', path: '/project/demo/features' },
				{ name: 'Specimen', path: '/project/demo/specimen' }
			] as shot (shot.name)}
				<a
					href={shot.path}
					class="group rounded-lg border border-border bg-surface p-4 transition-colors hover:border-fg/30"
				>
					<div class="mb-2 flex h-20 items-center justify-center rounded bg-surface-2 text-fg-subtle">
						<Camera class="size-5" />
					</div>
					<div class="text-[13px] font-medium text-fg">{shot.name}</div>
					<div class="mt-1 font-mono text-[10px] text-fg-subtle">{shot.path}</div>
				</a>
			{/each}
		</div>
	</section>

	<!-- MILESTONES -->
	<section class="mb-16">
		<h2
			class="mb-4 text-[28px] tracking-tight text-fg"
			style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
		>
			Milestones
		</h2>
		<ol class="grid gap-3 border-l border-border pl-5 text-[14px] leading-relaxed text-fg-muted">
			{#each milestones as m (m.when)}
				<li>
					<span class="block text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
						{m.when}
					</span>
					<span class="text-fg-muted">{m.what}</span>
				</li>
			{/each}
		</ol>
	</section>

	<!-- LINKS for further coverage -->
	<section class="mb-12">
		<h2
			class="mb-4 text-[28px] tracking-tight text-fg"
			style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
		>
			Further reading
		</h2>
		<ul class="grid gap-2 text-[14px] leading-relaxed text-fg-muted">
			<li>
				<a href="/about" class="text-accent-strong underline underline-offset-2">About + maintainer</a>
				— context on why Patens exists.
			</li>
			<li>
				<a href="/compare" class="text-accent-strong underline underline-offset-2">Patens vs FontLab, Glyphs, Fontra</a>
				— feature-by-feature competitive comparison.
			</li>
			<li>
				<a href="/learn" class="text-accent-strong underline underline-offset-2">Learn the craft</a>
				— five long-form tutorials covering the full Patens workflow.
			</li>
			<li>
				<a href="/changelog" class="text-accent-strong underline underline-offset-2">Changelog</a>
				— every release since v0.4. RSS at
				<a href="/changelog/rss.xml" class="text-accent-strong underline underline-offset-2">/changelog/rss.xml</a>.
			</li>
			<li>
				<a href="https://github.com/alevizio/patens" class="text-accent-strong underline underline-offset-2">Source on GitHub</a>
				— MIT-licensed, public roadmap, public issues.
			</li>
		</ul>
	</section>

	<p class="mb-4 text-[12px] leading-relaxed text-fg-subtle">
		Last updated: 2026-05-25. Maintained by hand; if anything is stale,
		<a href="mailto:hi@patens.design" class="text-accent-strong underline underline-offset-2">drop me a note</a>.
	</p>
	<SiteFooter />
</div>
