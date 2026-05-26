<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';

	type Step = { n: number; title: string; body: string; hint?: string };

	const steps: Step[] = [
		{
			n: 1,
			title: 'What an OpenType feature is',
			body: 'An OpenType feature is a 4-letter rule that tells a text renderer to swap one glyph for another, or to position glyphs differently, based on context. The kerning feature (kern) substitutes the default sidebearing with a kerned value when specific pairs meet. The ligature feature (liga) substitutes f + i with the single fi glyph. The small-caps feature (smcp) substitutes lowercase letters with their uppercase forms scaled to lowercase height. Each feature is independent; renderers can toggle them via CSS.',
			hint: 'There are ~150 registered OT feature tags, but most fonts use fewer than 10. The common ones: kern, liga, dlig, smcp, c2sc, ss01-ss20, salt, calt, onum, lnum, tnum.'
		},
		{
			n: 2,
			title: 'Patens auto-detects from glyph names',
			body: 'Manually writing OpenType feature files (.fea) is precise but tedious. Patens reads your glyph names and infers the features. A glyph named "f_i" becomes a fi ligature in the liga feature. A glyph named "a.smcp" becomes the small-cap substitution for "a" in the smcp feature. A glyph named "a.ss01" becomes a stylistic-set-1 alternate. "one.onum" is the old-style figure for "1". The naming convention is the Adobe Glyph List for New Fonts (AGLFN); Patens uses it as the canonical lookup.',
			hint: 'Name your glyphs as you draw them, in AGLFN style. The features fall out for free. Renaming a glyph after the fact works but means re-checking the feature table.'
		},
		{
			n: 3,
			title: 'Ligatures (liga, dlig)',
			body: 'A ligature replaces two or more glyphs with one. The standard liga feature handles required ligatures — fi, fl, ffi, ffl, ff — that prevent the f\'s overhang from colliding with the next letter. The discretionary dlig feature handles optional decorative ligatures (st, ct, Th). Browsers and most editors apply liga by default; dlig usually requires an explicit opt-in (font-variant-ligatures: discretionary-ligatures in CSS).',
			hint: 'Draw the ligature as a single glyph named f_i (underscore between the source glyph names). The fi shape should be one continuous design — not a literal placement of the f next to the i.'
		},
		{
			n: 4,
			title: 'Small caps + alternates (smcp, c2sc, ss01-ss20)',
			body: 'Small caps (smcp) substitutes lowercase letters with custom-drawn uppercase forms scaled to x-height. c2sc (caps-to-smallcaps) substitutes existing uppercase letters with the same small-cap glyphs — useful for the SHOULTS in all caps. Stylistic sets ss01-ss20 are 20 numbered slots for stylistic alternates: a single-story "a" instead of double-story, a hooked vs straight "g", a Roman vs Italic 7. Each set can be named via the OpenType name table ("Single-story a", "Hooked g") and apps display the names in their UI.',
			hint: 'Use one ss-slot per cohesive set of alternates. A font with 17 stylistic alternates split across ss01–ss17 is confusing; the same alternates grouped logically (ss01 single-story letters, ss02 short descenders, etc.) reads as a feature, not noise.'
		},
		{
			n: 5,
			title: 'Figures (onum, lnum, tnum, pnum)',
			body: 'Four mutually exclusive figure styles: lining (lnum), default in most modern fonts — figures sit on the baseline and reach cap-height. Old-style (onum) — figures sit at x-height with descenders, used in body text to blend with lowercase. Tabular (tnum) — every figure has the same advance width, used in columns of numbers. Proportional (pnum) — figures have their natural width.\n\nA professional font ships all four combinations: tnum + lnum (default), tnum + onum, pnum + lnum, pnum + onum.',
			hint: 'Patens audit code figures-non-tabular fires when a project has lining figures but no tabular variants. In data-heavy contexts (financial reports, tables), tabular figures are required, not optional.'
		},
		{
			n: 6,
			title: 'Contextual alternates (calt)',
			body: 'Contextual alternates (calt) substitute a glyph based on its neighbors. The classic use case: in a script font, the "a" at the end of a word might want a flourish that the "a" inside a word doesn\'t. The rule says "substitute a with a.end when followed by a word boundary." Patens generates simple calt rules from your alternate naming (a.init / a.medi / a.fina); for complex contextual logic, an exported .fea file handles edge cases the auto-detector can\'t infer.',
			hint: 'calt is on by default in most renderers. If you draw .init / .medi / .fina alternates, Patens turns them on for free.'
		},
		{
			n: 7,
			title: 'The Features tab in Patens',
			body: 'Open /project/[id]/features. The page lists every feature Patens detected from your glyph names — kern (auto from your kerning panel), liga (auto from f_i / f_f / f_l names), smcp (auto from .smcp glyphs), and any ss01-ss20 sets. Each feature can be toggled on / off, has an editable name, and shows a preview rendering through HarfBuzz.js — the same shaping engine browsers use. What you see in the preview is what shipped fonts will produce.',
			hint: 'Audit code feature-kern-disabled-with-pairs fires when you have kerning pairs but the kern feature is off. The opposite (kern on, no pairs) also flags so you don\'t ship an empty feature table.'
		},
		{
			n: 8,
			title: 'Live shaping preview',
			body: 'The Preview tab runs HarfBuzz.js — the same C++ shaping library compiled to WebAssembly — over your font and any text you type. It applies your features in the correct order (kern is positioning, liga is substitution; substitutions happen first, then positioning), respects your contextual rules, and renders the output. There\'s no "the font might look different in a real app" — HarfBuzz IS the real app for Chrome, Firefox, and most modern renderers.',
			hint: 'Cmd+Shift+P opens Preview. Type the strings your font will set. Toggle features on/off to see the effect immediately.'
		},
		{
			n: 9,
			title: 'Exporting the feature table',
			body: 'On export, Patens compiles the auto-detected features into the standard OpenType feature file format (.fea), then opentype.js writes them into the GSUB and GPOS tables of the output font. The resulting .otf / .woff2 has every feature you saw in the Features tab — no manual .fea editing needed. For projects that need rules the auto-detector can\'t express (chained contextual substitutions, position-specific decomposition), you can author a custom .fea and Patens merges it with the auto-generated one.',
			hint: 'Verify in the target environment after export. Browsers honor everything; some legacy apps (Word 2016 and earlier) only honor a subset.'
		}
	];

	const jsonLd = `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'HowTo',
				name: 'How to add OpenType features to your font in the browser with Patens',
				description:
					'A 9-step walkthrough of OpenType features in Patens — what features are, how Patens auto-detects them from glyph names, ligatures, small caps, stylistic sets, figures, contextual alternates, live HarfBuzz shaping preview, export.',
				step: steps.map((s) => ({
					'@type': 'HowToStep',
					position: s.n,
					name: s.title,
					text: s.body
				})),
				totalTime: 'PT40M',
				supply: [{ '@type': 'HowToSupply', name: 'A drawn typeface with named glyphs in Patens' }],
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
						name: 'OpenType features',
						item: 'https://patens.design/learn/opentype-features'
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
	<title>How to add OpenType features to your font (2026) — Patens guide</title>
	<meta
		name="description"
		content="The Patens guide to OpenType features — auto-detection from glyph names, ligatures, small caps, stylistic sets, figures, contextual alternates, live HarfBuzz shaping preview, and exporting a working OTF."
	/>
	<link rel="canonical" href="https://patens.design/learn/opentype-features" />
	<meta property="og:title" content="How to add OpenType features to your font — Patens guide" />
	<meta
		property="og:description"
		content="9-step walkthrough — features from glyph names, live HarfBuzz preview, export."
	/>
	<meta property="og:image" content="https://patens.design/og/brand" />
	<meta name="twitter:title" content="How to add OpenType features to your font" />
	<meta name="twitter:description" content="9-step Patens guide to OpenType features." />
	<meta name="twitter:image" content="https://patens.design/og/brand" />
	<!-- eslint-disable svelte/no-at-html-tags, no-useless-escape -->
	{@html jsonLd}
	<!-- eslint-enable svelte/no-at-html-tags, no-useless-escape -->
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
	<a
		href="/learn"
		class="mb-8 inline-flex items-center gap-1.5 text-[12px] text-fg-muted hover:text-fg"
	>
		<ArrowLeft class="size-3" />
		Back to learn
	</a>

	<p class="mb-2 text-[13px] uppercase tracking-[0.18em] text-fg-subtle">
		Guide · 9 steps · ~40 min
	</p>

	<h1
		class="mb-6 text-[36px] leading-tight tracking-tight text-fg"
		style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
	>
		OpenType features.
	</h1>

	<p class="mb-6 text-[15px] leading-relaxed text-fg-muted">
		<strong class="font-semibold text-fg">An OpenType feature is a 4-letter
		rule that tells a text renderer to swap one glyph for another, or to
		position glyphs differently, based on context.</strong>
		Patens infers features from your glyph names (the Adobe Glyph List
		convention) instead of asking you to author a .fea file. Name a glyph
		<code class="rounded bg-surface-1 px-1 py-0.5 font-mono text-[13px]">f_i</code>
		and you have a fi ligature in the
		<code class="rounded bg-surface-1 px-1 py-0.5 font-mono text-[13px]">liga</code>
		feature; name one
		<code class="rounded bg-surface-1 px-1 py-0.5 font-mono text-[13px]">a.smcp</code>
		and you have small caps. This guide covers the auto-detect rules,
		the major features your font will probably ship, and Patens's live
		HarfBuzz shaping preview.
	</p>

	<p class="mb-12 text-[14px] leading-relaxed text-fg-muted">
		The OpenType spec is large; this guide covers the ~10 features that
		90% of fonts use. For everything else (chained contextual
		substitutions, position-specific decomposition), Patens supports a
		custom .fea file that merges with the auto-generated one.
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
					<p class="mb-2 text-[14px] leading-relaxed text-fg-muted whitespace-pre-line">
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
		The <a href="/learn/audit-codes#opentype-features" class="text-accent-strong underline underline-offset-2">audit-codes reference</a>
		documents the OpenType-feature codes Patens emits. The
		<a href="/learn/kerning" class="text-accent-strong underline underline-offset-2">kerning guide</a>
		covers the
		<code class="font-mono text-[13px]">kern</code>
		feature specifically. And the
		<a href="/learn/variable-fonts" class="text-accent-strong underline underline-offset-2">variable-fonts guide</a>
		explains how features behave across masters.
	</p>

	<a
		href="/project/demo/features"
		class="group mt-12 inline-flex items-baseline gap-2 text-[14px] text-accent-strong underline underline-offset-2"
	>
		Open the demo's features tab
		<ArrowRight
			class="size-3 translate-y-0.5 transition-transform group-hover:translate-x-0.5"
		/>
	</a>
</div>
