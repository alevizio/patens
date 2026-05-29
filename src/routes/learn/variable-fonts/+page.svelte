<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	import SiteFooter from '$lib/ui/SiteFooter.svelte';
	import SiteHeader from '$lib/ui/SiteHeader.svelte';
	type Step = { n: number; title: string; body: string; hint?: string };

	const steps: Step[] = [
		{
			n: 1,
			title: 'What a variable font is',
			body: 'A variable font is a single font file that contains multiple master designs and a way to interpolate smoothly between them. Instead of shipping Regular, Medium, Bold, and Black as four separate files, you ship one file with a weight axis and the rasteriser computes the in-between weights on demand. The result: one file covers a continuous design space rather than a fixed set of discrete styles, fewer HTTP requests on the web, and the ability to tune type to context (slightly heavier on a low-contrast background, slightly narrower in a tight column).',
			hint: 'A variable font is also a valid static font — every OpenType variable file works as a Regular when the renderer ignores its axes. You\'re not picking one or the other.'
		},
		{
			n: 2,
			title: 'Axes',
			body: 'An axis is a single dimension along which the design varies. The five standard registered axes are weight (wght, default 400), width (wdth, default 100), slant (slnt, default 0), italic (ital, 0 or 1), and optical size (opsz). Custom axes are allowed (a 4-letter tag prefixed by uppercase, e.g. GRAD for grade), but renderers only recognise the registered ones for CSS. Each axis has a min, default, and max value.',
			hint: 'Audit code axis-range-invalid fires when min ≥ default ≥ max isn\'t satisfied. The default should be the most common reading weight (400 for wght), not the midpoint of the range.'
		},
		{
			n: 3,
			title: 'Masters',
			body: 'A master is one drawn instance of every glyph at a specific point in design space. A weight-axis-only font needs at least two masters (one at the lightest end, one at the heaviest); the renderer interpolates between them. A two-axis font (weight + width) needs masters at the four corners of the rectangle at minimum, optionally with masters inside the rectangle to control intermediate behavior. Patens stores each master as a sibling project linked into a Family record.',
			hint: 'Every glyph must have the same number of contours and the same number of points in the same order across all masters. Audit code master-contour-count and master-point-count fire when they don\'t.'
		},
		{
			n: 4,
			title: 'Adding your first axis',
			body: 'In Patens, axes are defined at the Family level. Open /family/[id] → Designspace, click Add axis, pick wght, set min 100, default 400, max 900. The Family now has a wght axis but no masters along it. Drawing a sibling project and marking it as the "wght 400" master gives the family its first masters; a second sibling at wght 900 completes the line.',
			hint: 'Start with one axis (wght is the canonical first axis). Adding a second axis triples the work — every new master needs to be drawn at multiple axis positions.'
		},
		{
			n: 5,
			title: 'Where masters live in design space',
			body: 'A master\'s position in design space is its coordinate on each declared axis. A wght-only font: master A is at wght 400, master B at wght 900. A wght+wdth font: master A at (400, 100), B at (900, 100), C at (400, 75), D at (900, 75). Patens lists every master with its axis coordinates on the Designspace page; the 2D variation explorer (Cmd+E from any axis page) lets you drag through the rectangle and see the interpolation live.',
			hint: 'master-axis-out-of-range fires when a master\'s coordinate is outside the declared min/max of the axis. master-orphan-axis fires when a master references an axis the family no longer declares.'
		},
		{
			n: 6,
			title: 'Instances',
			body: 'An instance is a named point in design space that the operating system surfaces as a style — what the user sees in the font menu when picking "Regular" or "Bold". A wght-only font usually has 9 instances: Thin (100), ExtraLight (200), Light (300), Regular (400), Medium (500), SemiBold (600), Bold (700), ExtraBold (800), Black (900). The instances are pointers into the design space; they don\'t need to coincide with masters.',
			hint: 'Audit code no-instances fires when a family has axes but no instances. Without instances, app font menus only show "Regular" and users can\'t pick weights from the dropdown — only via CSS font-variation-settings.'
		},
		{
			n: 7,
			title: 'The 2D variation explorer',
			body: 'For families with two or more axes, Patens ships a 2D explorer — a draggable surface where each axis is a dimension and the current sample text re-renders live as you drag. It\'s the fastest way to see how the interpolation behaves at points your instances don\'t cover. The explorer also shows where your masters and instances are placed, so you can spot gaps or clusters at a glance.',
			hint: 'Drag with Shift to constrain to one axis. Drag with Cmd to snap to nearest 10-unit grid.'
		},
		{
			n: 8,
			title: 'Common gotchas',
			body: 'Variable fonts are interpolation, not magic. The two masters set the endpoints; everything between is a linear blend. If your Thin and Black are too different in stroke contrast or letter proportion, the intermediate weights look wrong. The fix is to add a master in the middle to anchor the interpolation. Patens flags master-empty when a glyph is drawn at one master but missing at another — interpolation needs every master to have every glyph.',
			hint: 'Drawing 88 glyphs at 2 masters is 176 glyph designs. Plan accordingly — variable fonts are 2-4× the work of a static family.'
		},
		{
			n: 9,
			title: 'Exporting a variable font',
			body: 'On export, Patens compiles the masters into an OpenType variable font (.otf with gvar / HVAR tables, or .woff2). The output works in every modern browser via @font-face, in Adobe apps via the CSS-equivalent UI, and in InDesign 2020+. Instances appear in the OS font menu (macOS Big Sur+, Windows 10+). The .font.json export preserves the full designspace so a collaborator can open and continue from where you left off.',
			hint: 'CSS hookup: font-family: "YourFont"; font-variation-settings: "wght" 525, "wdth" 87;'
		}
	];

	const jsonLd = `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'HowTo',
				name: 'How to design a variable font in the browser with Patens',
				description:
					'A 9-step walkthrough of variable fonts in Patens — axes, masters, instances, the 2D variation explorer, export to .otf / .woff2.',
				step: steps.map((s) => ({
					'@type': 'HowToStep',
					position: s.n,
					name: s.title,
					text: s.body
				})),
				totalTime: 'PT45M',
				supply: [{ '@type': 'HowToSupply', name: 'A family with at least one drawn glyph set' }],
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
						name: 'Variable fonts',
						item: 'https://patens.design/learn/variable-fonts'
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
	<title>How to design a variable font in the browser (2026) — Patens guide</title>
	<meta
		name="description"
		content="The Patens guide to variable fonts — axes, masters, instances, the 2D variation explorer, the audit codes that catch interpolation problems, and exporting a working .otf / .woff2."
	/>
	<link rel="canonical" href="https://patens.design/learn/variable-fonts" />
	<meta property="og:title" content="How to design a variable font in the browser — Patens guide" />
	<meta
		property="og:description"
		content="9-step walkthrough — axes, masters, instances, the 2D explorer, export."
	/>
	<meta property="og:image" content="https://patens.design/og/brand" />
	<meta property="og:image:alt" content="Patens — open-source browser-native type design tool with a 94-code audit module" />
	<meta name="twitter:title" content="How to design a variable font in the browser" />
	<meta name="twitter:description" content="9-step Patens guide to variable fonts." />
	<meta name="twitter:image" content="https://patens.design/og/brand" />
	<meta name="twitter:image:alt" content="Patens — open-source browser-native type design tool with a 94-code audit module" />
	<!-- eslint-disable svelte/no-at-html-tags, no-useless-escape -->
	{@html jsonLd}
	<!-- eslint-enable svelte/no-at-html-tags, no-useless-escape -->
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
	<SiteHeader current="/learn/variable-fonts" />

	<a
		href="/learn"
		class="mb-8 inline-flex items-center gap-1.5 text-[12px] text-fg-muted hover:text-fg"
	>
		<ArrowLeft class="size-3" />
		Back to learn
	</a>

	<p class="mb-2 text-[13px] uppercase tracking-[0.18em] text-fg-subtle">
		Guide · 9 steps · ~45 min
	</p>

	<h1
		class="mb-6 text-[36px] leading-tight tracking-tight text-fg"
		style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
	>
		Variable fonts.
	</h1>

	<p class="mb-6 text-[15px] leading-relaxed text-fg-muted">
		<strong class="font-semibold text-fg">A variable font is a single file
		that contains multiple master designs and a way to interpolate smoothly
		between them.</strong>
		Instead of shipping Regular, Medium, Bold, and Black as four separate
		files, you ship one file with a weight axis. The rasteriser computes
		the in-between weights on demand. This guide covers axes, masters,
		instances, Patens's 2D variation explorer, and the export path.
	</p>

	<p class="mb-12 text-[14px] leading-relaxed text-fg-muted">
		Variable fonts are the dominant modern format on the web — Google
		Fonts shifted its catalog to variable in 2022 — and Patens supports
		designing, previewing, and exporting them entirely in the browser.
	</p>

	<ol class="space-y-10">
		{#each steps as step (step.n)}
			<li class="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2">
				<div
					class="row-span-2 flex size-9 items-center justify-center rounded-full border border-border bg-surface-1 text-[13px] font-medium text-fg"
				>
					{step.n}
				</div>
				<h2
					class="text-[20px] leading-tight tracking-tight text-fg"
					style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
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
		style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
	>
		Related
	</h2>
	<p class="mb-3 text-[14px] leading-relaxed text-fg-muted">
		The <a href="/learn/audit-codes#variable-fonts-axes" class="text-accent-strong underline underline-offset-2">audit-codes reference</a>
		documents the eleven designspace / variable-font codes. The
		<a href="/learn/kerning" class="text-accent-strong underline underline-offset-2">kerning guide</a>
		covers how kerning interacts with multi-master families. And the
		<a href="/learn/first-font" class="text-accent-strong underline underline-offset-2">first-font tutorial</a>
		is the right place to start if you haven't drawn a static master yet.
	</p>

	<p class="mt-12 text-[14px] text-fg-muted">
		Patens is in private alpha.
		<a href="/" class="text-accent-strong underline underline-offset-2">Request an invite →</a>
	</p>
	<SiteFooter />
</div>
