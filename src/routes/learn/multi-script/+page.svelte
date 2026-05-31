<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	import SiteFooter from '$lib/ui/SiteFooter.svelte';
	import SiteHeader from '$lib/ui/SiteHeader.svelte';
	type Step = { n: number; title: string; body: string; hint?: string };

	const steps: Step[] = [
		{
			n: 1,
			title: 'What "multi-script" actually means',
			body: 'A multi-script font ships glyphs for more than one writing system in a single file — Latin + Cyrillic, Latin + Greek, Latin + Cyrillic + Greek, and so on. The OpenType spec doesn\'t enforce script grouping; a font just has glyphs, and the OS picks which to use based on the codepoint in the source text. Adding Cyrillic to a Latin font means drawing 60-100 more glyphs (uppercase, lowercase, accents, punctuation overlap); adding Greek another ~70.',
			hint: 'The hard part isn\'t the count, it\'s consistency. The Cyrillic К should feel like the Latin K\'s relative — not a different shape stuck in the same file.'
		},
		{
			n: 2,
			title: 'Look-alikes vs bespoke shapes',
			body: 'About 30% of Cyrillic uppercase letters share their shape with Latin (А = A, В = B, Е = E, К = K, М = M, Н = H, О = O, Р = P, С = C, Т = T, Х = X). Greek uppercase has similar overlap (Α = A, Β = B, Ε = E, Ζ = Z, Η = H, Ι = I, Κ = K, Μ = M, Ν = N, Ο = O, Ρ = P, Τ = T, Υ = Y, Χ = X). For these "look-alike" glyphs, Patens lets you reference the Latin glyph as the contour source — one drawing, two codepoints. The remaining 70% are bespoke shapes that need their own design (Cyrillic Я Ж Ф Б Д Г Л П Ц Ч Ш Щ Ъ Ы Ь Э Ю; Greek Γ Δ Θ Λ Ξ Π Σ Φ Ψ Ω).',
			hint: 'Look-alike sharing is a contour reference, not a copy. Editing the Latin K updates the Cyrillic К too.'
		},
		{
			n: 3,
			title: 'Patens demo project — what\'s shipped, what\'s stub',
			body: 'The demo project (open at /project/demo/edit) ships 162 glyphs spanning three scripts. Latin: uppercase + lowercase + digits + punctuation + currency + math + brackets + composite ligatures (88 glyphs). Cyrillic: 17 look-alike letters reusing Latin builders (А В Е К М Н О Р С Т Х uppercase + а е о р с х lowercase). Greek: 14 uppercase look-alikes (Α Β Ε Ζ Η Ι Κ Μ Ν Ο Ρ Τ Υ Χ). The bespoke Cyrillic shapes (Я Ж Ф) and the entire Greek lowercase set ship as stubs — they\'re audit-flagged as `flagged-for-review` so designers see what\'s incomplete on import.',
			hint: 'When you fork the demo for your own typeface, the stubs are your starting work list. The audit code makes them findable via the "needs review" filter on the glyph browser.'
		},
		{
			n: 4,
			title: 'Drawing the bespoke Cyrillic shapes',
			body: 'Я is mirror-of-R; the right leg flips left. Ж is three-vertical-strokes with a horizontal axis — read it as "shouty K back-to-back with K." Ф is O with a vertical bar through the middle that extends above + below the bowl. Б is P with a horizontal at the top. Д is a square pedestal with descender serifs. The proportions matter more than the exact strokes: Cyrillic reads at the same rhythm as Latin lowercase even though uppercase Cyrillic has a slightly larger x-height than uppercase Latin in many designs.',
			hint: 'Reference Cyrillic specimens (Paratype, Nina Stössinger, Maria Doreuli) — don\'t guess from Wikipedia screenshots. The shapes are well-documented; the consistency with your Latin is the design problem.'
		},
		{
			n: 5,
			title: 'Greek lowercase — the deferred set',
			body: 'Greek lowercase is structurally different from Latin lowercase. Cursive descenders (γ ρ φ χ ψ), a true descender on β, distinctive x-height handling for ζ ξ. Most Latin-trained designers underestimate the redesign work — α isn\'t a, η isn\'t n, ν isn\'t v. The Patens demo ships uppercase Greek look-alikes but not the lowercase set; if you need it, expect another full design pass on top of the Latin work.',
			hint: 'If Greek lowercase is in scope for your project, consider working with a designer who has shipped Greek before. The shapes have a long history and "looks fine" usually misses what a Greek reader notices.'
		},
		{
			n: 6,
			title: 'OpenType coverage audit',
			body: 'Patens runs six coverage audit codes that flag undersupplied scripts: `coverage-latin-1-supp` (extended Latin like ñ ø æ), `coverage-currency` (€ £ ¥ ₹), `coverage-math` (≈ ± ÷ ≠), `coverage-typo-essentials` (typographic quotes, en/em dash, ellipsis), `control-glyphs-missing` (.notdef, space, NBSP), and `glyph-count-low` (a generic floor below which a font isn\'t practically useful). These are warnings, not errors — you can ship a font that misses them, but typesetters will hit walls.',
			hint: 'The audit codes don\'t care which scripts you\'ve declared. If you ship a font with Cyrillic that doesn\'t cover the Cyrillic supplement block, you\'ll see warnings for the script you opted into.'
		},
		{
			n: 7,
			title: 'OS/2 ulUnicodeRange flags',
			body: 'The OS/2 table\'s ulUnicodeRange field tells operating systems "this font has glyphs for these scripts." Patens auto-sets the flags based on the actual codepoints you\'ve drawn — Cyrillic letters set bit 9; Greek letters set bit 7. Mis-set flags are why a font sometimes "doesn\'t work" for Cyrillic in Word even though the glyphs are present: Word checks the flag before letting the user select the font for Russian text.',
			hint: 'Patens doesn\'t expose ulUnicodeRange as an editable field on purpose — it should be a function of what you\'ve drawn, not a manual override. If the auto-detection is wrong, file a bug.'
		},
		{
			n: 8,
			title: 'Naming + branding across scripts',
			body: 'A multi-script font usually keeps the same English family name across every script. The OpenType name table supports localised names — name IDs 1 (family), 2 (style), 16 (typographic family), 17 (typographic style) can each have a Cyrillic or Greek transliteration. Patens stores the canonical English name in metadata + supports localised name table records via the `name.localized` array. Default behaviour: ship English everywhere unless you explicitly add a Cyrillic name.',
			hint: 'For non-commercial fonts, English-only naming is fine. Commercial foundries with multi-language clients want at least Cyrillic + Greek localised names so the font appears with its native-script name in Windows + macOS font menus.'
		},
		{
			n: 9,
			title: 'Exporting a multi-script font',
			body: 'On export, Patens compiles every drawn glyph into the output OTF regardless of script. The OS/2 + name table get auto-populated. Cyrillic + Greek glyphs go through the same kern + liga + smcp feature passes as Latin. The end result is a single OTF/WOFF2 that works in every modern browser, Adobe app, InDesign, and Word (assuming ulUnicodeRange is set correctly — see step 7). Test in the actual target environment after export.',
			hint: 'A common gotcha: the font installs and displays in Latin contexts but Cyrillic + Greek "don\'t work." Almost always ulUnicodeRange — open the exported file in `otfinfo --info file.otf` to verify the flags.'
		}
	];

	const jsonLd = `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'HowTo',
				name: 'How to design a multi-script font with Patens',
				description:
					'A 9-step walkthrough of multi-script font design in Patens — Latin + Cyrillic + Greek look-alike sharing, bespoke shape design, OS/2 ulUnicodeRange flags, audit coverage codes, export.',
				step: steps.map((s) => ({
					'@type': 'HowToStep',
					position: s.n,
					name: s.title,
					text: s.body
				})),
				totalTime: 'PT60M',
				supply: [{ '@type': 'HowToSupply', name: 'A drawn Latin typeface in Patens' }],
				tool: [{ '@type': 'HowToTool', name: 'Patens', url: 'https://patens.design' }]
			},
			{
				'@type': 'BreadcrumbList',
				itemListElement: [
					{ '@type': 'ListItem', position: 1, name: 'Patens', item: 'https://patens.design' },
					{ '@type': 'ListItem', position: 2, name: 'Learn', item: 'https://patens.design/learn' },
					{
						'@type': 'ListItem',
						position: 3,
						name: 'Multi-script fonts',
						item: 'https://patens.design/learn/multi-script'
					}
				]
			}
		]
		// Trailing `<\/script>` escape keeps Svelte's parser from misreading
		// the source as the end of this <script> block.
		// eslint-disable-next-line no-useless-escape
	}).replace(/<\/script/g, '<\\/script')}<\/script>`;
</script>

<svelte:head>
	<title>How to design a multi-script font (2026) — Patens guide</title>
	<meta
		name="description"
		content="The Patens guide to multi-script font design — Latin + Cyrillic + Greek look-alike reuse, bespoke shape design (Я Ж Ф, Γ Δ Θ), OS/2 ulUnicodeRange, OpenType coverage audits, multi-script export."
	/>
	<link rel="canonical" href="https://patens.design/learn/multi-script" />
	<meta property="og:title" content="How to design a multi-script font — Patens guide" />
	<meta
		property="og:description"
		content="9-step walkthrough — Latin + Cyrillic + Greek shape reuse + bespoke shapes."
	/>
	<meta property="og:image" content="https://patens.design/og/brand" />
	<meta property="og:image:alt" content="Patens — open-source browser-native type design tool with a 102-code audit module" />
	<meta name="twitter:title" content="How to design a multi-script font" />
	<meta name="twitter:description" content="9-step Patens guide to multi-script design." />
	<meta name="twitter:image" content="https://patens.design/og/brand" />
	<meta name="twitter:image:alt" content="Patens — open-source browser-native type design tool with a 102-code audit module" />
	<!-- eslint-disable svelte/no-at-html-tags, no-useless-escape -->
	{@html jsonLd}
	<!-- eslint-enable svelte/no-at-html-tags, no-useless-escape -->
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
	<SiteHeader current="/learn/multi-script" />

	<a
		href="/learn"
		class="mb-8 inline-flex items-center gap-1.5 text-[12px] text-fg-muted hover:text-fg"
	>
		<ArrowLeft class="size-3" />
		Back to learn
	</a>

	<p class="mb-2 text-[13px] uppercase tracking-[0.18em] text-fg-subtle">
		Guide · 9 steps · ~60 min
	</p>

	<h1
		class="mb-6 text-[36px] leading-tight tracking-tight text-fg"
		
	>
		Multi-script fonts.
	</h1>

	<p class="mb-6 text-[15px] leading-relaxed text-fg-muted">
		<strong class="font-semibold text-fg">A multi-script font ships glyphs
		for more than one writing system in a single file</strong> — Latin +
		Cyrillic, Latin + Greek, Latin + Cyrillic + Greek. About 30% of
		Cyrillic + Greek uppercase shapes are look-alikes for Latin and can
		share the same contour drawing. The remaining 70% are bespoke shapes
		that need their own design pass. This guide covers the reuse pattern,
		the bespoke work, the OS/2 flag that quietly breaks Cyrillic in Word,
		and the audit codes that catch under-coverage.
	</p>

	<p class="mb-12 text-[14px] leading-relaxed text-fg-muted">
		Patens's demo project ships 162 glyphs across Latin + Cyrillic +
		Greek as a working multi-script reference. Bespoke Cyrillic (Я Ж Ф)
		and Greek lowercase ship as audit-flagged stubs so you can see where
		the real design work is.
	</p>

	<ol class="space-y-10">
		{#each steps as step (step.n)}
			<li class="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2">
				<div
					class="row-span-2 flex size-9 items-center justify-center rounded-none border border-border bg-surface-1 text-[13px] font-medium text-fg"
				>
					{step.n}
				</div>
				<h2
					class="text-[20px] leading-tight tracking-tight text-fg"
					
				>
					{step.title}
				</h2>
				<div class="col-start-2">
					<p class="mb-2 text-[14px] leading-relaxed text-fg-muted">
						{step.body}
					</p>
					{#if step.hint}
						<p
							class="border-l-2 border-accent-strong/40 pl-3 text-[13px] leading-relaxed text-fg-muted"
						>
							{step.hint}
						</p>
					{/if}
				</div>
			</li>
		{/each}
	</ol>

	<h2
		class="mt-16 mb-3 text-[20px] tracking-tight text-fg"
		
	>
		Related
	</h2>
	<p class="mb-3 text-[14px] leading-relaxed text-fg-muted">
		The <a href="/learn/audit-codes#multi-script-coverage" class="text-accent-strong underline underline-offset-2">audit-codes reference</a>
		documents the six coverage codes. The
		<a href="/learn/first-font" class="text-accent-strong underline underline-offset-2">first-font tutorial</a>
		covers the Latin baseline you'll usually start from.
	</p>

	<p class="mt-12 text-[14px] text-fg-muted">
		Patens is in private alpha.
		<a href="/" class="text-accent-strong underline underline-offset-2">Request an invite →</a>
	</p>
	<SiteFooter />
</div>
