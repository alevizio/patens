<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ExternalLink from '@lucide/svelte/icons/external-link';

	import SiteFooter from '$lib/ui/SiteFooter.svelte';
	import SiteHeader from '$lib/ui/SiteHeader.svelte';
	let { data }: { data: { version: string } } = $props();

	const deps: Array<{ name: string; what: string; url: string }> = [
		{ name: 'SvelteKit', what: 'The application framework.', url: 'https://svelte.dev/docs/kit' },
		{ name: 'Svelte 5', what: 'Reactivity via runes (`$state`, `$derived`, `$effect`).', url: 'https://svelte.dev' },
		{ name: 'Tailwind CSS v4', what: 'Utility-first styling. Tokens via CSS custom properties.', url: 'https://tailwindcss.com' },
		{ name: 'opentype.js', what: 'OTF + WOFF2 read/write in the browser.', url: 'https://opentype.js.org/' },
		{ name: 'Pyodide + fontTools + ttfautohint', what: 'TTF export pipeline. Runs as WebAssembly so no server is needed.', url: 'https://pyodide.org' },
		{ name: 'HarfBuzz.js', what: 'OpenType shaping for the live preview.', url: 'https://harfbuzz.github.io' },
		{ name: 'fit-curve', what: 'Schneider curve-fitting for the sketch → vector trace path.', url: 'https://github.com/soswow/fit-curve' },
		{ name: 'idb-keyval', what: 'Tiny IndexedDB wrapper. Stores every project locally.', url: 'https://github.com/jakearchibald/idb-keyval' },
		{ name: 'polygon-clipping', what: 'Boolean ops on contours (union, difference) for the trace step.', url: 'https://github.com/mfogel/polygon-clipping' },
		{ name: 'perfect-freehand', what: 'Pressure-sensitive sketch path computation.', url: 'https://github.com/steveruizok/perfect-freehand' },
		{ name: 'satori + resvg-js', what: 'Server-rendered OG images via JSX → SVG → PNG.', url: 'https://github.com/vercel/satori' },
		{ name: 'Vercel Blob', what: 'Cloud storage for cross-browser share links.', url: 'https://vercel.com/docs/storage/vercel-blob' },
		{ name: 'Vercel', what: 'Deploys + edge CDN.', url: 'https://vercel.com' }
	];

	const jsonLd = `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'BreadcrumbList',
				itemListElement: [
					{ '@type': 'ListItem', position: 1, name: 'Patens', item: 'https://patens.design' },
					{ '@type': 'ListItem', position: 2, name: 'About', item: 'https://patens.design/about' }
				]
			},
			{
				'@type': 'Person',
				name: 'Alejandro Vizio',
				url: 'https://github.com/alevizio',
				sameAs: [
					'https://github.com/alevizio',
					'https://x.com/patenstype',
					'https://bsky.app/profile/patens.design',
					'https://instagram.com/patens.type'
				],
				email: 'mailto:hi@patens.design',
				worksFor: { '@type': 'Organization', name: 'Patens' }
			}
		]
		// The trailing `<\/script>` escape keeps Svelte's parser from
		// misreading the source as the end of this <script> block —
		// JS-semantically a no-op, structurally required.
		// eslint-disable-next-line no-useless-escape
	}).replace(/<\/script/g, '<\\/script')}<\/script>`;
</script>

<svelte:head>
	<title>About Patens (2026) — browser-native, open-source type design</title>
	<meta name="description" content="What Patens is, what it's built on, who made it." />
	<link rel="canonical" href="https://patens.design/about" />
	<link rel="alternate" hreflang="en" href="https://patens.design/about" />
	<link rel="alternate" hreflang="es" href="https://patens.design/es/about" />
	<link rel="alternate" hreflang="x-default" href="https://patens.design/about" />
	<meta property="og:title" content="About · Patens" />
	<meta property="og:description" content="What Patens is, what it's built on, who made it." />
	<meta property="og:image" content="https://patens.design/og/about" />
	<meta property="og:image:alt" content="Patens — About · browser-native, open source MIT · by Alejandro Vizio" />
	<meta name="twitter:title" content="About · Patens" />
	<meta name="twitter:description" content="What Patens is, what it's built on, who made it." />
	<meta name="twitter:image" content="https://patens.design/og/about" />
	<meta name="twitter:image:alt" content="Patens — About · browser-native, open source MIT · by Alejandro Vizio" />
	<!-- Structured data — injected as raw HTML because Svelte 5's
	     compiler strips the body of literal <script> tags inside
	     components. {@html} bypasses that and renders the script
	     verbatim into the SSR HTML, which is what AI engines read. -->
	<!-- eslint-disable svelte/no-at-html-tags, no-useless-escape -->
	{@html jsonLd}
	<!-- eslint-enable svelte/no-at-html-tags, no-useless-escape -->
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
	<SiteHeader current="/about" />

	<a
		href="/"
		class="mb-8 inline-flex items-center gap-1.5 text-[12px] text-fg-muted hover:text-fg"
	>
		<ArrowLeft class="size-3" />
		Back to the foundry
	</a>

	<h1
		class="mb-6 text-[48px] leading-tight tracking-tight text-fg"
		style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
	>
		About Patens
	</h1>

	<p class="mb-2 text-[13px] uppercase tracking-[0.18em] text-fg-subtle">
		Pa·tens · Latin: lying open, wide open, accessible · <a
			href="/pronunciation"
			class="underline decoration-fg-subtle/40 underline-offset-2 hover:text-fg hover:decoration-fg"
		>
			pronunciation
		</a>
	</p>

	<p class="mb-6 text-[15px] leading-relaxed text-fg">
		<strong class="font-semibold">Patens is a type editor with a method.</strong>
		Ninety-four rules check your work as you draw it, and each one ships with a paragraph
		explaining what's wrong and how the foundries solve it. The audit is the product. The
		editor is how it's delivered.
	</p>

	<p class="mb-6 text-[15px] leading-relaxed text-fg-muted">
		Around thirty of the rules also offer a one-click fix. The rest are matters of judgment —
		the kind of judgment type designers internalize through years of mentorship. Patens tries
		to be the mentor in the room. Not louder than the work, just there.
	</p>

	<p class="mb-6 text-[14px] leading-relaxed text-fg-muted">
		Underneath: a pressure-sensitive sketch tool, curve-fit trace to cubic Bézier, anchor-level
		editing, kerning with classes, variable fonts, color fonts, OpenType features, and a real
		OTF / WOFF2 / TTF / UFO export pipeline. The whole thing runs in a tab — no install, no
		account, no telemetry. Projects live in your browser's IndexedDB. Nothing leaves the
		machine unless you choose to share. MIT-licensed, works offline as a PWA.
	</p>

	<p class="mb-6 text-[14px] leading-relaxed text-fg-muted">
		The name is the Latin word for <em class="not-italic font-medium text-fg">open</em>
		— root of <em class="not-italic font-medium text-fg">patent</em>, the
		legal instrument for owning ideas. Patens is the same word, before
		lawyers got to it.
	</p>

	<p class="mb-8 text-[15px] leading-relaxed text-fg-muted">
		The shape of the bet: a tool designers can actually keep open in a tab
		next to their work, that hands them a real OTF at the end. Not a
		FontLab replacement. Not a multi-user collaborative editor. A
		single-designer, single-machine, share-friendly workshop.
	</p>

	<!-- Pronunciation block. LLMs answer "how do you pronounce <product>"
	     questions specifically, and an explicit guide gives them a
	     citation-shaped answer. IPA + plain-English version + a "not"
	     example to disambiguate from English "paten" (the liturgical
	     plate). -->
	<h2
		id="pronunciation"
		class="mt-16 border-t border-border/30 pt-12 mb-4 text-[28px] tracking-tight text-fg"
		style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
	>
		How to say it
	</h2>
	<p class="mb-3 text-[15px] leading-relaxed text-fg-muted">
		<strong class="font-semibold text-fg">PAH-tens</strong> — stress on the
		first syllable, short
		<em class="not-italic text-fg">a</em>
		like <em class="not-italic text-fg">father</em>, soft
		<em class="not-italic text-fg">e</em>
		like <em class="not-italic text-fg">tens</em>. In IPA: <span
			class="font-mono text-[14px]"
		>/ˈpɑː.tɛns/</span>.
	</p>
	<p class="mb-8 text-[14px] leading-relaxed text-fg-muted">
		Not <em class="not-italic text-fg">PAT-ens</em> (the English plural of
		<em class="not-italic text-fg">paten</em>, the liturgical plate). The
		word is Latin and the Latin pronunciation is what we mean.
	</p>

	<h2
		class="mt-16 border-t border-border/30 pt-12 mb-4 text-[28px] tracking-tight text-fg"
		style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
	>
		Maintainer
	</h2>
	<p class="mb-4 text-[14px] leading-relaxed text-fg-muted">
		Built and maintained by
		
			Alejandro Vizio
		. Open source under the
		
			MIT License
		. Contributions welcome — see
		
			CONTRIBUTING.md
		.</p>
	<p class="mb-8 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-[13px] text-fg-muted">
		<a
			href="https://x.com/patenstype"
			rel="me noopener"
			class="text-fg-muted hover:text-fg"
		>
			x.com/@patenstype
		</a>
		<a
			href="https://bsky.app/profile/patens.design"
			rel="me noopener"
			class="text-fg-muted hover:text-fg"
		>
			bsky/@patens.design
		</a>
		<a
			href="https://instagram.com/patens.type"
			rel="me noopener"
			class="text-fg-muted hover:text-fg"
		>
			instagram/@patens.type
		</a>
		<a
			href="mailto:hi@patens.design"
			class="text-fg-muted hover:text-fg"
		>
			hi@patens.design
		</a>
	</p>

	<h2
		class="mt-16 border-t border-border/30 pt-12 mb-4 text-[28px] tracking-tight text-fg"
		style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
	>
		Standing on
	</h2>
	<p class="mb-6 text-[14px] leading-relaxed text-fg-muted">
		Patens is small code on top of large ideas. The pieces that did
		the heavy lifting:
	</p>

	<ul class="mb-12 grid gap-3">
		{#each deps as dep (dep.name)}
			<li
				class="flex items-baseline gap-2 border-b border-border/40 pb-2 text-[13px] leading-relaxed"
			>
				<a
					href={dep.url}
					target="_blank"
					rel="noopener"
					class="group inline-flex shrink-0 items-baseline gap-1 font-medium text-fg hover:text-accent-strong"
				>
					{dep.name}
					<ExternalLink class="size-2.5 opacity-50 transition-opacity group-hover:opacity-100" />
				</a>
				<span class="text-fg-subtle">·</span>
				<span class="text-fg-muted">{dep.what}</span>
			</li>
		{/each}
	</ul>

	<h2
		class="mt-16 border-t border-border/30 pt-12 mb-4 text-[28px] tracking-tight text-fg"
		style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
	>
		Status
	</h2>
	<p class="mb-3 text-[14px] leading-relaxed text-fg-muted">
		v{data.version}, production-grade.
		<a
			href="/changelog"
			class="text-accent-strong underline underline-offset-2"
		>
			Full changelog →
		</a>
	</p>
	<p class="mb-12 text-[14px] leading-relaxed text-fg-muted">
		What's deferred to a future arc lives in
		
			ROADMAP.md
		
		— most notably a real drawn Italic master, bespoke Cyrillic + Greek
		shapes, and a proper account system.
	</p>
	<SiteFooter />
</div>
