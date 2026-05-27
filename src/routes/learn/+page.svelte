<script lang="ts">
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Compass from '@lucide/svelte/icons/compass';
	import Pencil from '@lucide/svelte/icons/pen-tool';
	import Wrench from '@lucide/svelte/icons/wrench';
	import ExternalLink from '@lucide/svelte/icons/external-link';

	import SiteFooter from '$lib/ui/SiteFooter.svelte';
	import SiteHeader from '$lib/ui/SiteHeader.svelte';
	// Sidebar nav: anchors + scroll-spy. `mountedSections` is populated by
	// the per-section IntersectionObserver effect; whichever one is closest
	// to the top of the viewport wins `activeId`.
	const SECTIONS = [
		{ id: 'timeline', label: 'Beginner timeline' },
		{ id: 'exercises', label: 'Exercises' },
		{ id: 'tools', label: 'Tools' },
		{ id: 'reading', label: 'Reading' },
		{ id: 'foundries', label: 'Foundries' },
		{ id: 'research', label: 'Research' }
	] as const;
	let activeId = $state<string>(SECTIONS[0].id);

	$effect(() => {
		if (typeof window === 'undefined') return;
		const visible = new Map<string, number>();
		const obs = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (e.isIntersecting) visible.set(e.target.id, e.intersectionRatio);
					else visible.delete(e.target.id);
				}
				if (visible.size === 0) return;
				// Whichever section reads highest in the viewport wins.
				let bestId = activeId;
				let bestTop = Infinity;
				for (const id of visible.keys()) {
					const el = document.getElementById(id);
					if (!el) continue;
					const top = el.getBoundingClientRect().top;
					if (top < bestTop && top >= -80) {
						bestTop = top;
						bestId = id;
					}
				}
				activeId = bestId;
			},
			{ rootMargin: '-80px 0px -55% 0px', threshold: [0, 0.1, 0.25, 0.5] }
		);
		for (const s of SECTIONS) {
			const el = document.getElementById(s.id);
			if (el) obs.observe(el);
		}
		return () => obs.disconnect();
	});

	const TIMELINE: Array<{ weeks: string; phase: string; tasks: string[] }> = [
		{
			weeks: 'Week 1–2',
			phase: 'Research + control set',
			tasks: [
				'Write the brief (intent, audience, use cases, reading conditions).',
				'Collect three corpora: functional (real text the font must handle), historical (writing / lettering / print models), competitive (existing solutions to study).',
				'Sketch only the control glyphs: n o H O p d a e v + punctuation + figures.'
			]
		},
		{
			weeks: 'Week 3–4',
			phase: 'Make the glyphs cohere in text',
			tasks: [
				'Refine proportions; lock UPM, cap-height, x-height.',
				'Get spacing right before kerning — proof in HOHnonHo strings, not isolated glyphs.',
				'Add a couple of kerning pairs (AV, To) and prove they help.'
			]
		},
		{
			weeks: 'Week 5–8',
			phase: 'Expand cautiously',
			tasks: [
				'Fill in the rest of basic Latin; add diacritics with composites.',
				'Add the first feature set (kern + liga is enough).',
				'Build static OTF + WOFF2; install in Font Book; type something real.'
			]
		},
		{
			weeks: 'Week 9–12',
			phase: 'Test in real conditions, then release',
			tasks: [
				'Walk the full Release checklist — browser × OS matrix, app proofs, language tests.',
				'Fix the audit issues that actually matter; mark hints as accepted.',
				'Write design notes, version, license; ship trial + full binaries.'
			]
		}
	];

	const EXERCISES: Array<{ title: string; body: string }> = [
		{
			title: 'Redraw a historical model',
			body: 'Pick a typeface you already love and trace its proportion logic. Not to publish — to learn how it was constructed. Cover an alphabet in one weight.'
		},
		{
			title: 'Build a control set and proof in repeated strings',
			body: 'Draw n o H O a e s c p v y f g. Spend a full day spacing them inside HOHnonHnonH strings — single glyphs lie, strings tell the truth.'
		},
		{
			title: 'Make a serif and a sans that share a proportion model',
			body: 'Same UPM, cap-height, x-height, advance widths. The only differences are terminals and contrast. You will learn what structural choices really carry style.'
		},
		{
			title: 'Test in paragraph text and a browser before calling it finished',
			body: 'Compile WOFF2, drop it into a real page, set a paragraph at 14px. Most fonts that look great at 200px collapse in a paragraph.'
		}
	];

	const TOOLS: Array<{ name: string; role: string; href: string }> = [
		{
			name: 'Glyphs',
			role: 'Mature all-in-one editor on macOS. Best learning materials.',
			href: 'https://glyphsapp.com/learn'
		},
		{
			name: 'RoboFont',
			role: 'UFO-first, Python-scriptable. Modular for design systems.',
			href: 'https://doc.robofont.com/'
		},
		{
			name: 'FontLab',
			role: 'Cross-platform integrated editor with variable + web support.',
			href: 'https://help.fontlab.com/fontlab/8/manual/'
		},
		{
			name: 'FontForge',
			role: 'Free, open source. Wide format support, modest UI.',
			href: 'https://fontforge.org/docs/'
		},
		{
			name: 'fontTools',
			role: 'ttLib / feaLib / TTX / designspaceLib / varLib / subsetting.',
			href: 'https://fonttools.readthedocs.io/en/latest/'
		},
		{
			name: 'fontmake',
			role: 'Builds static + variable binaries from Glyphs / UFO / designspace.',
			href: 'https://github.com/googlefonts/fontmake'
		},
		{
			name: 'FontBakery',
			role: 'Automated QA checks with Google Fonts / Adobe Fonts profiles.',
			href: 'https://fontbakery.readthedocs.io/en/latest/'
		},
		{
			name: 'opentype.js',
			role: 'Read / write OTF + TTF in the browser. (This app uses it.)',
			href: 'https://opentype.js.org/'
		}
	];

	const READING: Array<{ title: string; by: string; why: string; href: string }> = [
		{
			title: 'Designing Type',
			by: 'Karen Cheng',
			why: 'Practical, shape-specific. Treats optical correction and structural consistency as inseparable.',
			href: 'https://yalebooks.yale.edu/book/9780300249927/designing-type/'
		},
		{
			title: 'The Stroke',
			by: 'Gerrit Noordzij',
			why: 'Theoretical. Trains you to think about writing logic, stress, and the white around letters.',
			href: 'https://hyphenpress.co.uk/products/books/978-0-907259-30-5/'
		},
		{
			title: 'Microsoft OpenType Specification',
			by: 'Microsoft',
			why: 'The actual format. Authoritative for tables, layout, variation.',
			href: 'https://learn.microsoft.com/en-us/typography/opentype/spec/'
		},
		{
			title: 'Google Fonts Guide',
			by: 'Google Fonts team',
			why: 'Strongest public model of open-source workflow, QA, and web deployment.',
			href: 'https://googlefonts.github.io/gf-guide/'
		},
		{
			title: 'AFDKO Feature File Specification',
			by: 'Adobe Type Tools',
			why: 'The grammar for .fea — what every modern build pipeline ingests.',
			href: 'https://adobe-type-tools.github.io/afdko/OpenTypeFeatureFileSpecification.html'
		},
		{
			title: 'WOFF2 (W3C Recommendation)',
			by: 'W3C',
			why: 'The web baseline. Why @font-face works the way it does.',
			href: 'https://www.w3.org/TR/WOFF2/'
		},
		{
			title: 'HarfBuzz Manual',
			by: 'HarfBuzz authors',
			why: 'The shaping engine inside Chrome/Firefox/Android. Read it before debugging OT layout.',
			href: 'https://harfbuzz.github.io/'
		}
	];

	const FOUNDRIES: Array<{ name: string; focus: string; why: string; href: string }> = [
		{
			name: 'KLIM Type Foundry',
			focus: 'Historically informed contemporary families',
			why: 'Their design notes (Söhne, The Future) model how to turn references into a concept.',
			href: 'https://klim.co.nz/'
		},
		{
			name: 'Hoefler&Co',
			focus: 'Editorial + institutional systems',
			why: 'Strongest public writing on optical sizes, feature depth, and family architecture.',
			href: 'https://www.typography.com/'
		},
		{
			name: 'Commercial Type',
			focus: 'Editorial workhorses',
			why: 'Graphik essay explains "deliberately plain" as a design position.',
			href: 'https://commercialtype.com/'
		},
		{
			name: 'TypeTogether',
			focus: 'Editorial reading + multiscript',
			why: 'Adelle Sans Multiscript: best model for thinking across writing systems.',
			href: 'https://www.type-together.com/'
		},
		{
			name: 'Dalton Maag',
			focus: 'Variable + multiscript systems',
			why: 'Aktiv Grotesk: typeface as system with 10 scripts, axes, and product surface.',
			href: 'https://www.daltonmaag.com/'
		},
		{
			name: 'Adobe Originals',
			focus: 'Publishing-grade families',
			why: 'Source Serif 4: clearest public story on optical sizes.',
			href: 'https://fonts.adobe.com/foundries/adobe'
		}
	];

	const RESEARCH: Array<{ title: string; by: string; why: string; href: string }> = [
		{
			title: 'Does Print Size Matter for Reading?',
			by: 'Gordon E. Legge & Charles A. Bigelow (2011)',
			why: 'Why print size remains a dominant readability variable — proof at use sizes.',
			href: 'https://jov.arvojournals.org/article.aspx?articleid=2191864'
		},
		{
			title: 'Crowding is unlike ordinary masking',
			by: 'Pelli, Palomares & Majaj (2004)',
			why: 'Why local density and neighboring forms constrain reading rate.',
			href: 'https://jov.arvojournals.org/article.aspx?articleid=2192859'
		}
	];
</script>

<svelte:head>
	<title>Learn type design — Patens (2026)</title>
	<meta name="description" content="A beginner-to-shipping path for type design with Patens. Seven tutorials covering your first font, kerning, OpenType features, variable fonts, multi-script (Latin · Cyrillic · Greek), export formats, and the 94-code audit module." />
	<link rel="canonical" href="https://patens.design/learn" />
	<meta property="og:title" content="Learn type design · Patens" />
	<meta property="og:description" content="Seven tutorials from first font to shipping. Plus the 94-code audit reference." />
	<meta property="og:image" content="https://patens.design/og/learn" />
	<meta property="og:image:alt" content="Patens — Learn type design · seven tutorials · 94-code audit reference · open source" />
	<meta name="twitter:title" content="Learn type design · Patens" />
	<meta name="twitter:description" content="Seven tutorials from first font to shipping. Plus the 94-code audit reference." />
	<meta name="twitter:image" content="https://patens.design/og/learn" />
	<meta name="twitter:image:alt" content="Patens — Learn type design · seven tutorials · 94-code audit reference · open source" />
	<!-- CollectionPage + BreadcrumbList + ItemList JSON-LD. CollectionPage
	     tells crawlers this is an index page. ItemList enumerates the 7
	     tutorials with descriptions so AI engines can extract + cite them
	     individually when asked "patens kerning tutorial" / "how to design
	     a variable font" / etc. -->
	<!-- eslint-disable svelte/no-at-html-tags, no-useless-escape -->
	{@html `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'CollectionPage',
				name: 'Learn type design — Patens',
				description:
					'Seven tutorials covering the beginner-to-shipping path for type design with Patens, plus the 94-code audit reference.',
				url: 'https://patens.design/learn',
				inLanguage: 'en',
				isPartOf: { '@type': 'WebSite', name: 'Patens', url: 'https://patens.design/' }
			},
			{
				'@type': 'BreadcrumbList',
				itemListElement: [
					{ '@type': 'ListItem', position: 1, name: 'Patens', item: 'https://patens.design/' },
					{ '@type': 'ListItem', position: 2, name: 'Learn', item: 'https://patens.design/learn' }
				]
			},
			{
				'@type': 'ItemList',
				name: 'Patens tutorials',
				itemListOrder: 'https://schema.org/ItemListOrderAscending',
				numberOfItems: 7,
				itemListElement: [
					{ '@type': 'ListItem', position: 1, name: 'Your first font, sketch to OTF', url: 'https://patens.design/learn/first-font', description: '10-step path from blank canvas to a downloadable OpenType file.' },
					{ '@type': 'ListItem', position: 2, name: 'Kerning fundamentals', url: 'https://patens.design/learn/kerning', description: '9-step guide to class-based kerning + the spacing tab.' },
					{ '@type': 'ListItem', position: 3, name: 'OpenType features', url: 'https://patens.design/learn/opentype-features', description: '9-step guide to ligatures, stylistic sets, and feature wiring.' },
					{ '@type': 'ListItem', position: 4, name: 'Variable fonts', url: 'https://patens.design/learn/variable-fonts', description: '9-step guide to masters, axes, instances, and the 2D variation explorer.' },
					{ '@type': 'ListItem', position: 5, name: 'Multi-script: Latin · Cyrillic · Greek', url: 'https://patens.design/learn/multi-script', description: 'How Patens handles three scripts in one font with shape-sharing.' },
					{ '@type': 'ListItem', position: 6, name: 'Export formats', url: 'https://patens.design/learn/export-formats', description: 'OTF, WOFF2, TTF, UFO, .font.json — which format for which audience.' },
					{ '@type': 'ListItem', position: 7, name: 'Audit codes reference', url: 'https://patens.design/learn/audit-codes', description: 'All 94 audit codes grouped by family with what they mean and how to fix.' }
				]
			}
		]
	}).replace(/<\/script/g, '<\\/script')}<\/script>`}
	<!-- eslint-enable svelte/no-at-html-tags, no-useless-escape -->
</svelte:head>

<div class="mx-auto max-w-6xl px-6 py-8 sm:py-10">
	<SiteHeader current="/learn" />

	<!-- Hero -->
	<section class="mb-16 max-w-3xl">
		<h1
			class="text-[48px] leading-[1.05] tracking-tight text-fg"
			style="font-family: 'Hoefler Text', ui-serif, Georgia, 'Times New Roman', serif;"
		>
			Learn type design
		</h1>
		<p class="mt-4 text-[15px] leading-relaxed text-fg-muted">
			A pragmatic 8–12 week starter path, exercises that actually teach you to see,
			and the tools, books, and foundries a real practice runs on. Adapted from
			foundry essays and the standards docs that govern the format.
		</p>
	</section>

	<!-- Sidebar nav + main content. The sidebar sticks to the top of the
	     viewport while scrolling and highlights the section currently in
	     view. On mobile it's hidden — the page just stacks. -->
	<div class="lg:grid lg:grid-cols-[180px_1fr] lg:gap-12 xl:grid-cols-[200px_1fr] xl:gap-16">
		<aside class="hidden lg:block">
			<nav class="sticky top-8">
				<div class="mb-3 font-mono text-[10px] tracking-wider text-fg-subtle uppercase">
					On this page
				</div>
				<ul class="grid border-l border-border">
					{#each SECTIONS as s (s.id)}
						<li>
							<a
								href="#{s.id}"
								class="-ml-px block border-l-2 py-1.5 pl-4 text-[12px] leading-tight transition-colors {activeId ===
								s.id
									? 'border-fg font-medium text-fg'
									: 'border-transparent text-fg-subtle hover:text-fg'}"
							>
								{s.label}
							</a>
						</li>
					{/each}
				</ul>
			</nav>
		</aside>

		<div class="min-w-0">

	<!-- PATENS-SPECIFIC GUIDES — surfaced first because most visitors
	     arrived from a Patens search; the canonical reading list further
	     down is reference. -->
	<section id="patens-guides" class="mb-16 grid gap-4 sm:grid-cols-2">
		<a
			href="/learn/first-font"
			class="group rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-fg/30 focus-visible:outline-none focus-visible:border-fg focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
		>
			<div class="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
				Tutorial · 10 steps
			</div>
			<div
				class="mb-2 text-[18px] leading-tight text-fg"
				style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
			>
				Make your first font
			</div>
			<p class="text-[13px] leading-relaxed text-fg-muted">
				From opening the demo to exporting an OpenType file — the shortest
				path through Patens.
			</p>
		</a>
		<a
			href="/learn/kerning"
			class="group rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-fg/30 focus-visible:outline-none focus-visible:border-fg focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
		>
			<div class="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
				Guide · 9 steps
			</div>
			<div
				class="mb-2 text-[18px] leading-tight text-fg"
				style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
			>
				Kerning
			</div>
			<p class="text-[13px] leading-relaxed text-fg-muted">
				Sidebearings vs kerning, class-based kerning, family-wide
				propagation, the audit codes that catch common mistakes.
			</p>
		</a>
		<a
			href="/learn/variable-fonts"
			class="group rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-fg/30 focus-visible:outline-none focus-visible:border-fg focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
		>
			<div class="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
				Guide · 9 steps
			</div>
			<div
				class="mb-2 text-[18px] leading-tight text-fg"
				style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
			>
				Variable fonts
			</div>
			<p class="text-[13px] leading-relaxed text-fg-muted">
				Axes, masters, instances, the 2D variation explorer, exporting
				a working .otf / .woff2.
			</p>
		</a>
		<a
			href="/learn/opentype-features"
			class="group rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-fg/30 focus-visible:outline-none focus-visible:border-fg focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
		>
			<div class="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
				Guide · 9 steps
			</div>
			<div
				class="mb-2 text-[18px] leading-tight text-fg"
				style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
			>
				OpenType features
			</div>
			<p class="text-[13px] leading-relaxed text-fg-muted">
				Auto-detection from glyph names, ligatures, small caps, stylistic
				sets, figures, live HarfBuzz shaping preview.
			</p>
		</a>
		<a
			href="/learn/multi-script"
			class="group rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-fg/30 focus-visible:outline-none focus-visible:border-fg focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
		>
			<div class="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
				Guide · 9 steps
			</div>
			<div
				class="mb-2 text-[18px] leading-tight text-fg"
				style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
			>
				Multi-script fonts
			</div>
			<p class="text-[13px] leading-relaxed text-fg-muted">
				Latin + Cyrillic + Greek look-alike reuse, bespoke shapes (Я Ж Ф),
				OS/2 ulUnicodeRange, coverage audits.
			</p>
		</a>
		<a
			href="/learn/export-formats"
			class="group rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-fg/30 focus-visible:outline-none focus-visible:border-fg focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
		>
			<div class="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
				Reference
			</div>
			<div
				class="mb-2 text-[18px] leading-tight text-fg"
				style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
			>
				Export formats
			</div>
			<p class="text-[13px] leading-relaxed text-fg-muted">
				OTF, WOFF2, TTF, UFO, .font.json, designer bundle — which to
				pick for which audience.
			</p>
		</a>
		<a
			href="/learn/audit-codes"
			class="group rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-fg/30 focus-visible:outline-none focus-visible:border-fg focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
		>
			<div class="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
				Reference
			</div>
			<div
				class="mb-2 text-[18px] leading-tight text-fg"
				style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
			>
				Audit codes
			</div>
			<p class="text-[13px] leading-relaxed text-fg-muted">
				Every warning the editor emits, what triggers it, and why it
				matters — grouped by family.
			</p>
		</a>
	</section>

	<!-- TIMELINE — primary section, biggest treatment -->
	<section id="timeline" class="mb-16 scroll-mt-8">
		<div class="mb-6 flex items-baseline gap-3">
			<Compass class="size-5 self-center text-accent" />
			<h2
				class="text-[28px] leading-none tracking-tight text-fg"
				style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
			>
				Beginner timeline
			</h2>
			<span class="text-[12px] text-fg-subtle">8–12 weeks</span>
		</div>
		<ol class="grid gap-3">
			{#each TIMELINE as phase, i (phase.weeks)}
				<li
					class="grid grid-cols-1 gap-5 rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-accent/40 md:grid-cols-[180px_1fr]"
				>
					<!-- Big phase number + weeks on the left -->
					<div class="flex items-baseline gap-3 md:flex-col md:items-start md:gap-1">
						<div
							class="text-[44px] leading-none text-accent"
							style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
							data-numeric
						>
							{i + 1}
						</div>
						<div>
							<div
								class="font-mono text-[11px] text-fg-subtle"
								data-numeric
							>
								{phase.weeks}
							</div>
							<div class="text-[10px] tracking-wider text-fg-subtle uppercase">
								Phase
							</div>
						</div>
					</div>
					<div class="min-w-0">
						<div
							class="text-[18px] leading-tight text-fg"
							style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
						>
							{phase.phase}
						</div>
						<ul class="mt-3 grid gap-2 text-[13px] leading-relaxed text-fg-muted">
							{#each phase.tasks as t (t)}
								<li class="flex gap-2.5">
									<span class="mt-2 size-1 shrink-0 rounded-full bg-fg-subtle"></span>
									<span>{t}</span>
								</li>
							{/each}
						</ul>
					</div>
				</li>
			{/each}
		</ol>
	</section>

	<!-- EXERCISES — secondary, 2-col grid -->
	<section id="exercises" class="mb-16 scroll-mt-8">
		<div class="mb-5 flex items-baseline gap-3">
			<Pencil class="size-4 self-center text-accent" />
			<h2
				class="text-[28px] leading-none tracking-tight text-fg"
				style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
			>
				Exercises that teach you to see
			</h2>
		</div>
		<div class="grid gap-3 sm:grid-cols-2">
			{#each EXERCISES as ex (ex.title)}
				<div class="rounded-2xl border border-border bg-surface p-5">
					<div
						class="text-[15px] leading-tight text-fg"
						style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
					>
						{ex.title}
					</div>
					<p class="mt-2 text-[13px] leading-relaxed text-fg-muted">{ex.body}</p>
				</div>
			{/each}
		</div>
	</section>

	<!-- TOOLS — asymmetric: heading column + grid column.
	     Breaks the "stack of full-width sections" rhythm. -->
	<section id="tools" class="mb-16 grid scroll-mt-8 gap-8 md:grid-cols-[4fr_8fr] md:gap-10">
		<div>
			<div class="flex items-baseline gap-3">
				<Wrench class="size-4 self-center text-accent" />
				<h2
					class="text-[28px] leading-tight tracking-tight text-fg"
					style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
				>
					Tools the practice runs on
				</h2>
			</div>
			<p class="mt-3 text-[13px] leading-relaxed text-fg-muted">
				The actual editors and pipelines used in production. Most are
				open source.
			</p>
		</div>
		<div class="grid gap-2">
			{#each TOOLS as t (t.name)}
				<a
					href={t.href}
					target="_blank"
					rel="noopener"
					class="group flex items-baseline gap-4 rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:border-accent hover:bg-accent-soft/20"
				>
					<div
						class="w-[130px] shrink-0 text-[14px] text-fg"
						style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
					>
						{t.name}
					</div>
					<div class="min-w-0 flex-1 text-[12px] leading-snug text-fg-muted">
						{t.role}
					</div>
					<ExternalLink
						class="size-3.5 shrink-0 text-fg-subtle group-hover:text-accent"
						aria-hidden="true"
					/>
				</a>
			{/each}
		</div>
	</section>

	<!-- READING — same asymmetric pattern, mirrored to vary the rhythm -->
	<section id="reading" class="mb-16 grid scroll-mt-8 gap-8 md:grid-cols-[8fr_4fr] md:gap-10">
		<div class="grid gap-2 md:order-2-NEVER">
			{#each READING as r (r.title)}
				<a
					href={r.href}
					target="_blank"
					rel="noopener"
					class="group rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:border-accent hover:bg-accent-soft/20"
				>
					<div class="flex items-baseline justify-between gap-3">
						<span
							class="text-[14px] leading-tight text-fg"
							style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
						>
							{r.title}
						</span>
						<ExternalLink
							class="size-3.5 shrink-0 text-fg-subtle group-hover:text-accent"
							aria-hidden="true"
						/>
					</div>
					<div
						class="mt-0.5 font-mono text-[10px] tracking-wide text-fg-subtle"
						data-numeric
					>
						{r.by}
					</div>
					<p class="mt-1.5 text-[12px] leading-snug text-fg-muted">{r.why}</p>
				</a>
			{/each}
		</div>
		<div>
			<div class="flex items-baseline gap-3">
				<BookOpen class="size-4 self-center text-accent" />
				<h2
					class="text-[28px] leading-tight tracking-tight text-fg"
					style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
				>
					Reading
				</h2>
			</div>
			<p class="mt-3 text-[13px] leading-relaxed text-fg-muted">
				Books that train the eye, plus the standards docs that govern the
				format on the wire.
			</p>
		</div>
	</section>

	<!-- FOUNDRIES — 2-col grid of cards, slightly more typographic -->
	<section id="foundries" class="mb-16 scroll-mt-8">
		<div class="mb-5 flex items-baseline gap-3">
			<Compass class="size-4 self-center text-accent" />
			<h2
				class="text-[28px] leading-none tracking-tight text-fg"
				style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
			>
				Foundries worth studying
			</h2>
		</div>
		<p class="mb-4 max-w-2xl text-[13px] leading-relaxed text-fg-muted">
			The strongest type-design education isn't in books — it's reading how
			foundries argue for their decisions. These public pages model the rhetoric,
			the system, and the production craft.
		</p>
		<div class="grid gap-2 sm:grid-cols-2">
			{#each FOUNDRIES as f (f.name)}
				<a
					href={f.href}
					target="_blank"
					rel="noopener"
					class="group rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:border-accent hover:bg-accent-soft/20"
				>
					<div class="flex items-baseline justify-between gap-2">
						<span
							class="text-[15px] leading-tight text-fg"
							style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
						>
							{f.name}
						</span>
						<ExternalLink
							class="size-3.5 shrink-0 text-fg-subtle group-hover:text-accent"
							aria-hidden="true"
						/>
					</div>
					<div class="mt-1 text-[11px] font-medium text-fg-muted">{f.focus}</div>
					<p class="mt-1 text-[11px] leading-snug text-fg-subtle">{f.why}</p>
				</a>
			{/each}
		</div>
	</section>

	<!-- RESEARCH — small tertiary section -->
	<section id="research" class="mb-16 scroll-mt-8">
		<div class="mb-4 flex items-baseline gap-3">
			<BookOpen class="size-4 self-center text-accent" />
			<h2
				class="text-[18px] leading-none tracking-tight text-fg"
				style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
			>
				Legibility research
			</h2>
			<span class="text-[11px] text-fg-subtle">
				Why proof paragraphs matter more than polished hero glyphs
			</span>
		</div>
		<div class="grid gap-2">
			{#each RESEARCH as r (r.title)}
				<a
					href={r.href}
					target="_blank"
					rel="noopener"
					class="group flex items-baseline gap-4 rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:border-accent hover:bg-accent-soft/20"
				>
					<div class="min-w-0 flex-1">
						<div
							class="text-[14px] leading-tight text-fg"
							style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
						>
							{r.title}
						</div>
						<div
							class="mt-0.5 font-mono text-[10px] tracking-wide text-fg-subtle"
							data-numeric
						>
							{r.by}
						</div>
						<p class="mt-1.5 text-[12px] leading-snug text-fg-muted">{r.why}</p>
					</div>
					<ExternalLink
						class="size-3.5 shrink-0 text-fg-subtle group-hover:text-accent"
						aria-hidden="true"
					/>
				</a>
			{/each}
		</div>
	</section>

	<!-- Final CTA — editorial closing rule. No tinted container, no icon-box;
	     a thin accent border-t + Hoefler heading + action button. -->
	<section class="mt-24 border-t border-accent/30 pt-10">
		<div class="flex flex-col items-start gap-6 md:flex-row md:items-center md:gap-8">
			<div class="flex-1">
				<div
					class="text-[28px] leading-tight text-fg"
					style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
				>
					Ready to start?
				</div>
				<p class="mt-2 text-[13px] leading-relaxed text-fg-muted">
					Create a project, fill in the Brief tab, draw your control set —
					<span class="font-mono text-fg-muted" data-numeric>n o H O a e s c p v y f g</span>.
				</p>
			</div>
			<a
				href="/"
				class="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-accent px-5 py-2.5 text-[13px] font-medium text-accent-fg transition-colors hover:bg-accent/90"
			>
				New project →
			</a>
		</div>
	</section>

		</div>
	</div>
	<SiteFooter />
</div>
