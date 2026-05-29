<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	import SiteFooter from '$lib/ui/SiteFooter.svelte';
	import SiteHeader from '$lib/ui/SiteHeader.svelte';
	const steps: Array<{ n: number; title: string; body: string; hint?: string }> = [
		{
			n: 1,
			title: 'Open the demo project',
			body: 'Patens ships with a 162-glyph demo font spanning Latin, Cyrillic, and Greek. Opening it gives you an immediate playground rather than a blank canvas. The demo also gives the audit module something to point at — the best way to understand a code is to see it triggered on a real glyph.',
			hint: 'Go to /project/demo/edit. The project builds on the fly even if your IndexedDB is empty.'
		},
		{
			n: 2,
			title: 'Pick a glyph to start with',
			body: 'The lowercase n is the canonical "first letter" in type design — it sets stem weight, x-height, sidebearings, and the rhythm of the alphabet in one shape. From n the whole alphabet falls out: o, h, b, d, p, q follow its curves; i and l share its sidebearings.',
			hint: 'Select n in the glyph browser. The edit canvas opens with the existing contour visible.'
		},
		{
			n: 3,
			title: 'Sketch with the pencil tool',
			body: 'The pencil tool gives you a pressure-sensitive stroke that captures the gesture before any Bézier math gets in the way. Draw the letter as a single fluid stroke — don\'t try to draw the outline. The sketch layer is intentionally rough; you trace it into Béziers in the next step.',
			hint: 'Press P for pencil. Press 1–9 to set stroke weight. The pressure curve is per-stroke; lighten near the joins for natural taper.'
		},
		{
			n: 4,
			title: 'Trace the sketch to Bézier contours',
			body: 'Patens uses a Schneider curve-fitting algorithm to convert your stroke to a smooth cubic-Bézier contour. The number of control points is chosen automatically based on stroke complexity — fewer, well-placed points read smoother at small sizes than many points along the same shape. Trace runs through a boolean union pass, so overlapping sketch strokes resolve into one closed contour.',
			hint: 'Press T to trace. The toolbar shows the contour count; aim for one closed contour per glyph stroke.'
		},
		{
			n: 5,
			title: 'Refine control points',
			body: 'Cubic Bézier contours have on-curve points and off-curve handles. The on-curve points are where the contour passes through; the handles control how curvy the segment gets. Toggle a point between smooth (handles colinear) and corner (handles independent) with the right-click menu or T-key. Smooth points hold a tangent through a curve; corner points hold a sharp join.',
			hint: 'Audit code near-collinear-points highlights vestigial nodes you can delete. sharp-kink highlights joins that read as accidental.'
		},
		{
			n: 6,
			title: 'Set the spacing',
			body: 'A glyph has three measurements that govern its layout: the left sidebearing (space before the glyph), the advance width (space the glyph occupies), and the right sidebearing (space after, computed from the advance minus the glyph\'s right edge). Type designers calibrate these by eye, in context, looking at strings like nnnonnon or HOHOHO. The goal isn\'t mathematical equality — it\'s optical evenness.',
			hint: 'Press M to toggle metrics mode. The sidebearing inputs accept negative values for letters like italic f.'
		},
		{
			n: 7,
			title: 'Kern a few pairs',
			body: 'Kerning is the per-pair sidebearing adjustment for combinations the default sidebearings don\'t resolve well. AV, To, We, Yo — these are the classic pairs because the slanted right edge of one letter and the open left of the next create too much space. A negative kern value pulls them closer.',
			hint: 'Open the Kerning tab. Patens supports kerning classes (e.g. all uppercase A-grouped letters kern together), which scales to families without authoring N² pairs by hand.'
		},
		{
			n: 8,
			title: 'Run the audit',
			body: 'The audit module checks 94 codes against the project — contour shape, vertical metrics, OpenType invariants, brief completeness, multi-script coverage, naming. Many issues have one-click "Fix" actions (sidebearings deeply negative, off-grid points, near-collinear nodes, etc.). The audit is also a teaching surface: every code links to a plain-language explanation of why it matters.',
			hint: 'The audit summary lives at the bottom of the edit panel and on its own page at /learn/audit-codes.'
		},
		{
			n: 9,
			title: 'Pre-flight before export',
			body: 'The release pre-flight is a stricter pass than the per-glyph audit. It checks vertical-metric consistency across OS/2 + hhea, OpenType invariants (kerning enabled with pairs present, classes referenced by at least one pair), required metadata fields (designer, license, vendor ID), and minimum coverage thresholds for the scripts the project declares.',
			hint: 'Pre-flight runs from the Release Notes panel. Fix any blocking codes; warnings can ship.'
		},
		{
			n: 10,
			title: 'Export OTF, WOFF2, or TTF',
			body: 'OTF and WOFF2 export entirely in the browser via opentype.js — about 150ms for a Latin font. TTF goes through Pyodide + fontTools + ttfautohint for screen-rendering autohinting; first export loads Pyodide (about 7MB, cached after) and takes a few seconds. UFO export bundles a designer-friendly source format. The .font.json export is the portable Patens source — open it on any device by dropping it on the home page.',
			hint: 'Cmd+Shift+E opens the export dialog. Choose your target; the resulting file downloads to your machine.'
		}
	];

	const jsonLd = `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'HowTo',
				name: 'How to make your first font in the browser with Patens',
				description:
					'A 10-step walkthrough from opening the demo project to exporting an OpenType file. Browser-native, no installs, no account.',
				step: steps.map((s) => ({
					'@type': 'HowToStep',
					position: s.n,
					name: s.title,
					text: s.body
				})),
				totalTime: 'PT45M',
				supply: [{ '@type': 'HowToSupply', name: 'A modern browser' }],
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
						name: 'Make your first font',
						item: 'https://patens.design/learn/first-font'
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
	<title>Make your first font in the browser (2026) — Patens tutorial</title>
	<meta
		name="description"
		content="A 10-step walkthrough for making your first OpenType font in Patens. Open the demo, sketch a glyph, trace to Bézier, refine, space, kern, audit, export — no installs, no account."
	/>
	<link rel="canonical" href="https://patens.design/learn/first-font" />
	<meta property="og:title" content="Make your first font in the browser — Patens tutorial" />
	<meta
		property="og:description"
		content="A 10-step walkthrough from opening the demo project to exporting an OpenType file."
	/>
	<meta property="og:image" content="https://patens.design/og/brand" />
	<meta property="og:image:alt" content="Patens — open-source browser-native type design tool with a 94-code audit module" />
	<meta name="twitter:title" content="Make your first font in the browser" />
	<meta name="twitter:description" content="10-step Patens tutorial from sketch to OTF." />
	<meta name="twitter:image" content="https://patens.design/og/brand" />
	<meta name="twitter:image:alt" content="Patens — open-source browser-native type design tool with a 94-code audit module" />
	<!-- eslint-disable svelte/no-at-html-tags, no-useless-escape -->
	{@html jsonLd}
	<!-- eslint-enable svelte/no-at-html-tags, no-useless-escape -->
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
	<SiteHeader current="/learn/first-font" />

	<a
		href="/learn"
		class="mb-8 inline-flex items-center gap-1.5 text-[12px] text-fg-muted hover:text-fg"
	>
		<ArrowLeft class="size-3" />
		Back to learn
	</a>

	<p class="mb-2 text-[13px] uppercase tracking-[0.18em] text-fg-subtle">
		Tutorial · 10 steps · ~45 min
	</p>

	<h1
		class="mb-6 text-[36px] leading-tight tracking-tight text-fg"
		style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
	>
		Make your first font in the browser.
	</h1>

	<p class="mb-6 text-[15px] leading-relaxed text-fg-muted">
		This is the shortest possible path from a blank tab to an OpenType
		file you can install on your machine and use in any app. It uses the
		Patens demo project as a starting point so you have something to
		edit immediately — type design has a steep enough learning curve
		without a blank canvas problem on top.
	</p>

	<p class="mb-12 text-[14px] leading-relaxed text-fg-muted">
		You will not produce a finished, shippable typeface by the end of
		this tutorial. You will produce a working font file with one or two
		letters you drew, and you will know where every part of the editor
		lives. From there, the actual craft begins.
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
		What's next
	</h2>
	<p class="mb-3 text-[14px] leading-relaxed text-fg-muted">
		If you got through this and want to keep going: the
		<a href="/learn/audit-codes" class="text-accent-strong underline underline-offset-2">
			audit-codes reference
		</a>
		explains what every warning means, so you can clean up your file with
		intent rather than guessing. The
		<a href="/help" class="text-accent-strong underline underline-offset-2">FAQ</a>
		covers the next 17 things people ask after their first font.
	</p>
	<p class="mb-16 text-[14px] leading-relaxed text-fg-muted">
		Stuck? Email
		<a href="mailto:hi@patens.design" class="text-accent-strong underline underline-offset-2">
			hi@patens.design
		</a>.
	</p>

	<p class="text-[14px] text-fg-muted">
		Patens is in private alpha.
		<a href="/" class="text-accent-strong underline underline-offset-2">Request an invite →</a>
	</p>
	<SiteFooter />
</div>
