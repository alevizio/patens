<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Terminal from '@lucide/svelte/icons/terminal';

	import SiteFooter from '$lib/ui/SiteFooter.svelte';
	import SiteHeader from '$lib/ui/SiteHeader.svelte';
	// The 9 audit families with the count of codes in each. Numbers add to 94
	// (the canonical total surfaced everywhere else: README, llms.txt,
	// ARCHITECTURE.md, /press, the home trust band).
	const families: Array<{ name: string; count: number; example: string }> = [
		{ name: 'Contour shape', count: 9, example: 'self-intersecting · winding-collision · sharp-kink' },
		{ name: 'Vertical metrics + topology', count: 10, example: 'cap-above-ascender · win-clip-top · use-typo-off' },
		{ name: 'Spacing + sidebearings', count: 8, example: 'overflows-advance · deeply-negative-lsb · class-drift' },
		{ name: 'OpenType invariants', count: 11, example: 'duplicate-glyph-name · pair-orphan-class · feature-kern-disabled' },
		{ name: 'Naming + metadata', count: 13, example: 'naming-family · vendor-id-invalid · glyph-name-not-canonical' },
		{ name: 'Coverage', count: 7, example: 'typo-essentials · latin-1-supp · currency · math' },
		{ name: 'Anchors', count: 4, example: 'mark-no-prefix · base-with-prefix · without-partner' },
		{ name: 'Variable fonts', count: 9, example: 'master-contour-count · axis-out-of-range · no-instances' },
		{ name: 'Color fonts · brief · misc', count: 23, example: 'palette-length-mismatch · brief-no-intent · figures-non-tabular' }
	];

	// Six sample codes chosen to span the 9 families + the fixable/judgment
	// split. The prose is verbatim from describeAuditCode() so what's on
	// this page IS what users see when they hover a code in the editor.
	const samples: Array<{ code: string; description: string; fixable: boolean }> = [
		{
			code: 'self-intersecting',
			description:
				"A contour crosses itself. Rasterisers fill the overlap unpredictably depending on fill-rule (even-odd vs non-zero).",
			fixable: true
		},
		{
			code: 'xheight-misaligned',
			description:
				"A lowercase letter that should reach x-height is sitting noticeably below it. Uneven tops across letters give text a wobbly rhythm; consistent x-height alignment is what makes type read smoothly.",
			fixable: false
		},
		{
			code: 'sidebearing-class-drift-lsb',
			description:
				"This glyph's left sidebearing has drifted from the median of its sidebearing-class peers. Either re-apply the class or remove this glyph from it.",
			fixable: false
		},
		{
			code: 'kerning-extreme',
			description:
				"A kerning pair exceeds half the smaller glyph's advance — almost certainly a decimal typo (e.g. -500 typed when -50 was meant). Check the value in the spacing pair editor.",
			fixable: false
		},
		{
			code: 'metrics-cap-above-ascender',
			description:
				"Cap-height exceeds the ascender. Capital letters will clip when rendered — ascender is the platform-recognised top of the glyph bounding box, caps must fit inside it.",
			fixable: false
		},
		{
			code: 'glyph-name-not-canonical',
			description:
				"The glyph name differs from the canonical Adobe Glyph List for New Fonts name for this codepoint. Renaming keeps downstream tooling (feature substitutions, color emoji lookups, PostScript naming) consistent.",
			fixable: true
		}
	];

	// FAQ items — surfaced both in the page UI + the FAQPage JSON-LD.
	// AI engines (ChatGPT, Claude, Perplexity, Gemini) preferentially
	// extract from FAQPage schema when answering "what is X" / "how
	// does Y work" / "is Z free" queries. Keeping the answers concrete
	// and citation-friendly.
	const faqs: Array<{ q: string; a: string }> = [
		{
			q: 'How many audit codes are there?',
			a: 'Ninety-four, all live and shipping in production today. The full reference is at /learn/audit-codes. The count grows over time but every code already shipped has a stable ID that is never reused; deprecated codes get marked deprecated rather than recycled, on the same convention OpenSSF Scorecard, CodeQL, and ESLint use.'
		},
		{
			q: 'How many codes have a one-click fix?',
			a: 'Around 30 of the 94 (roughly a third). The rest are "designer judgment" findings — they explain the rule and surface the problem, but the right resolution depends on the designer\'s intent (e.g. an x-height misalignment might be deliberate optical correction or might be a bug). The audit teaches you what to look at; the human decides what to do about it.'
		},
		{
			q: 'Can I add my own audit codes?',
			a: 'Yes. The audit module is in src/lib/font/audit.ts in the open-source repo. Adding a code is a single function that returns AuditIssue[] keyed by glyph/codepoint, plus an entry in describeAuditCode() for the teaching prose. The CONTRIBUTING.md "areas where help is wanted" section lists this as one of the highest-leverage contribution paths.'
		},
		{
			q: 'Is the audit module free? Will it ever be paywalled?',
			a: 'Free, MIT-licensed, and the editor is committed to never being paywalled — see DESIGN_PHILOSOPHY.md in the repo. The optional integrations (cloud share, GitHub OAuth, AI presets) gracefully degrade when unconfigured; the audit module is core, in-browser, and always works.'
		},
		{
			q: 'Does the audit run on every keystroke?',
			a: 'No — it runs in a Web Worker with a debounced trigger after edits stop, so the typing path stays responsive. The worker maintains a monotonic seq guard that ignores stale responses if a newer edit lands while the previous audit pass was still running. The full 94-code pass over a 162-glyph project takes well under 100ms on modern hardware.'
		},
		{
			q: 'How does Patens\'s audit differ from FontBakery or fontTools\'s checks?',
			a: 'FontBakery and fontTools (subset, checker, etc.) are great release-time linters — you run them once on the final binary and get a pass/fail report. Patens\'s audit is integrated continuously into the editor surface itself: every change re-checks, the findings appear in the panel next to the glyph you\'re working on, and the teaching prose explains the rule in real time. Different tier of the same tradition — Patens is upstream of FontBakery, not a replacement for it.'
		},
		{
			q: 'Can I run the audit on a font file I didn\'t make in Patens?',
			a: 'Yes via the CLI: `npx patens audit my.font.json`. Patens\'s portable .font.json format is its native interchange — if you have a font in .otf or .ufo or a Glyphs file, you\'d need to convert first (UFO import is supported in the editor; OTF + UFO export is supported). The audit runs against the Project type regardless of how it was created.'
		}
	];

	const jsonLd = `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'WebPage',
				name: 'The audit module — Patens',
				description:
					'An audit module that teaches as you draw. 94 codes covering contour shape, metrics, OpenType invariants, naming, coverage, anchors, variable fonts, color fonts, and brief completeness. Every code carries plain-English teaching prose; around 30 codes have a one-click fix.',
				url: 'https://patens.design/audit',
				inLanguage: 'en',
				isPartOf: { '@type': 'WebSite', name: 'Patens', url: 'https://patens.design' }
			},
			{
				'@type': 'BreadcrumbList',
				itemListElement: [
					{ '@type': 'ListItem', position: 1, name: 'Patens', item: 'https://patens.design' },
					{ '@type': 'ListItem', position: 2, name: 'The audit module', item: 'https://patens.design/audit' }
				]
			},
			{
				'@type': 'FAQPage',
				mainEntity: faqs.map((f) => ({
					'@type': 'Question',
					name: f.q,
					acceptedAnswer: { '@type': 'Answer', text: f.a }
				}))
			}
		]
		// eslint-disable-next-line no-useless-escape
	}).replace(/<\/script/g, '<\\/script')}<\/script>`;

	const slugify = (s: string): string =>
		s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
</script>

<svelte:head>
	<title>The audit module (2026) — Patens teaches as you draw</title>
	<meta
		name="description"
		content="Patens's audit module: 94 codes across contour shape, metrics, OpenType invariants, naming, coverage, anchors, variable fonts, color fonts, and brief completeness. Plain-English teaching prose on every code; around 30 codes have a one-click fix. Also runs as a CLI."
	/>
	<link rel="canonical" href="https://patens.design/audit" />
	<link rel="alternate" hreflang="en" href="https://patens.design/audit" />
	<link rel="alternate" hreflang="es" href="https://patens.design/es/audit" />
	<link rel="alternate" hreflang="x-default" href="https://patens.design/audit" />
	<meta property="og:title" content="The audit module · Patens" />
	<meta
		property="og:description"
		content="94 codes that teach as you draw. Every code carries plain-English prose, around 30 have one-click fixes. Also runs from the terminal."
	/>
	<meta property="og:image" content="https://patens.design/og/audit" />
	<meta property="og:image:alt" content="Patens — The audit module · 94 codes that teach as you draw · 30 one-click fixes · open source MIT" />
	<meta name="twitter:title" content="The audit module · Patens" />
	<meta
		name="twitter:description"
		content="94 codes that teach as you draw. Plain-English prose, ~30 one-click fixes, CLI integration."
	/>
	<meta name="twitter:image" content="https://patens.design/og/audit" />
	<meta name="twitter:image:alt" content="Patens — The audit module · 94 codes that teach as you draw · 30 one-click fixes · open source MIT" />
	<!-- eslint-disable svelte/no-at-html-tags, no-useless-escape -->
	{@html jsonLd}
	<!-- eslint-enable svelte/no-at-html-tags, no-useless-escape -->
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
	<SiteHeader current="/audit" />

	<a
		href="/"
		class="mb-8 inline-flex items-center gap-1.5 rounded-sm text-[12px] text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:text-fg focus-visible:underline focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
	>
		<ArrowLeft class="size-3" />
		Back to the foundry
	</a>

	<p class="mb-2 text-[13px] uppercase tracking-[0.18em] text-fg-subtle">
		The differentiator
	</p>

	<h1
		class="mb-6 text-[48px] leading-tight tracking-tight text-fg"
		
	>
		An audit module that teaches as you draw.
	</h1>

	<p class="mb-6 text-[15px] leading-relaxed text-fg-muted">
		<strong class="font-semibold text-fg">Every other browser-based type editor checks a font for errors.</strong>
		Patens checks it against <em class="not-italic font-medium text-fg">94 type-design rules</em> — every contour, metric, kern pair, anchor, master, palette, and brief field — and for each finding, hands you plain-English prose that names the rule, explains why it matters, and (for around 30 codes) offers a one-click fix. The audit module is the spine of the editor, not a lint step bolted on at the end.
	</p>

	<p class="mb-6 text-[14px] leading-relaxed text-fg-muted">
		The teaching prose comes from the type-design tradition — the rules that get internalized through years of mentorship, or from a copy of <em class="not-italic font-medium text-fg">Detail in Typography</em>, or by watching a master rep a kerning class until everything snaps into place. Patens encodes those rules into a Web Worker that runs continuously alongside the editor, with a single <code class="font-mono text-fg">describeAuditCode(code)</code> dictionary feeding five teaching surfaces (edit panel, audit page, release pre-flight, family hub, home page) so the same prose appears wherever an audit finding is shown.
	</p>

	<p class="mb-8 text-[14px] leading-relaxed text-fg-muted">
		The 94 codes are stable forever — once shipped, a code's ID never gets reused. If a rule turns out to be wrong, it's deprecated (marked <code class="font-mono text-fg">severity: 'info'</code> + <code class="font-mono text-fg">deprecated: true</code>) rather than recycled. That's the same contract OpenSSF Scorecard, CodeQL, and ESLint use for their check IDs — it makes the codes referenceable from commits, bug reports, tutorials, and downstream tooling without ambiguity.
	</p>

	<h2 class="mt-16 border-t border-border/30 pt-12 mb-4 text-[28px] tracking-tight text-fg"
		
	>
		94 codes across 9 families.
	</h2>

	<p class="mb-6 text-[14px] leading-relaxed text-fg-muted">
		Grouped by what the rule checks. The breakdown:
	</p>

	<div class="mb-10 grid gap-3 sm:grid-cols-2">
		{#each families as fam (fam.name)}
			<div class="border-t border-border/40 pt-3">
				<div class="flex items-baseline justify-between gap-3">
					<span class="text-[15px] font-medium text-fg">{fam.name}</span>
					<span class="font-mono text-[11px] tracking-wider text-fg-subtle" data-numeric>{fam.count} codes</span>
				</div>
				<p class="mt-1 font-mono text-[11px] leading-snug text-fg-muted">
					{fam.example}
				</p>
			</div>
		{/each}
	</div>

	<p class="text-[13px] text-fg-muted">
		Full reference with every code's prose: <a
			href="/learn/audit-codes"
			class="font-medium text-accent-strong underline underline-offset-2 hover:text-accent"
		>/learn/audit-codes</a>.
	</p>

	<h2 class="mt-16 border-t border-border/30 pt-12 mb-4 text-[28px] tracking-tight text-fg"
		
	>
		Six examples, verbatim.
	</h2>

	<p class="mb-8 text-[14px] leading-relaxed text-fg-muted">
		The teaching prose on this page is the exact text users see when they
		hover or click into a finding in the editor. No marketing rewrite — the
		audit-as-teaching promise is that the in-app copy reads like prose, not
		like a linter dump.
	</p>

	<div class="mb-8 grid gap-6 sm:grid-cols-2">
		{#each samples as s (s.code)}
			<article class="flex flex-col gap-3 border-t border-border/40 pt-5">
				<h3 class="font-mono text-[12px] text-accent-strong">{s.code}</h3>
				<p class="text-[14px] leading-relaxed text-fg-muted">{s.description}</p>
				<div class="mt-auto">
					{#if s.fixable}
						<span class="inline-flex items-baseline gap-1.5 rounded bg-accent-soft px-2 py-1 text-[11px] font-medium text-accent-strong">
							<span aria-hidden="true">✓</span>
							One-click Fix
						</span>
					{:else}
						<span class="text-[11px] font-medium text-fg-muted">Designer judgment</span>
					{/if}
				</div>
			</article>
		{/each}
	</div>

	<h2 class="mt-16 border-t border-border/30 pt-12 mb-4 text-[28px] tracking-tight text-fg"
		
	>
		Run it from your terminal.
	</h2>

	<p class="mb-6 text-[14px] leading-relaxed text-fg-muted">
		The same 94-code engine ships as a CLI. Drop it into your CI as a font-design lint step, or batch-audit a directory of project files before a foundry release.
	</p>

	<pre class="mb-6 overflow-x-auto rounded border border-border bg-surface-2/40 p-4 font-mono text-[12px] leading-relaxed text-fg"><code><span class="text-fg-subtle"># Audit a single project</span>
npx patens audit my.font.json

<span class="text-fg-subtle"># Error-severity only, for CI gates</span>
npx patens audit my.font.json --severity=error

<span class="text-fg-subtle"># JSON output for downstream tooling</span>
npx patens audit my.font.json --json | jq '.'

<span class="text-fg-subtle"># PR annotations in GitHub Actions</span>
npx patens audit fonts/*.font.json --github</code></pre>

	<p class="mb-8 text-[13px] text-fg-muted">
		Exit code is <code class="font-mono text-fg">0</code> when no error-severity issues, <code class="font-mono text-fg">1</code> when there are, <code class="font-mono text-fg">2</code> on usage / parse failure. <code class="font-mono text-fg">describe</code> any code by name to get the same prose the editor shows: <code class="font-mono text-fg">npx patens describe self-intersecting</code>.
	</p>

	<h2 class="mt-16 border-t border-border/30 pt-12 mb-4 text-[28px] tracking-tight text-fg"
		
	>
		The Patens Method.
	</h2>

	<p class="mb-6 text-[14px] leading-relaxed text-fg-muted">
		The audit module isn't a lint step. It's a mentor that catches the things every type designer learns by drawing badly, then better, then well. The teaching prose is the difference between <em class="not-italic font-medium text-fg">"warning: cap-height exceeds ascender"</em> and <em class="not-italic font-medium text-fg">"Capital letters will clip when rendered — ascender is the platform-recognised top of the glyph bounding box, caps must fit inside it."</em>
	</p>

	<p class="mb-6 text-[14px] leading-relaxed text-fg-muted">
		The first sentence is true. The second sentence teaches. Patens optimizes for the second.
	</p>

	<p class="mb-12 text-[14px] leading-relaxed text-fg-muted">
		This is the difference that justifies opening Patens instead of one of the four other browser-based type editors. Glyphr Studio, Fontra, typlr.app, and FontStruct all check fonts for errors. Patens is the only one designed to teach you why each error matters.
	</p>

	<h2 class="mt-16 border-t border-border/30 pt-12 mb-4 text-[28px] tracking-tight text-fg"
		
	>
		Common questions.
	</h2>

	<p class="mb-8 text-[14px] leading-relaxed text-fg-muted">
		Answers double as FAQPage structured data so AI engines (ChatGPT, Claude, Perplexity, Gemini) can cite individual answers when asked about the audit module.
	</p>

	<dl class="mb-8 space-y-6">
		{#each faqs as faq (faq.q)}
			<div id={slugify(faq.q)} class="scroll-mt-8 border-t border-border/40 pt-5">
				<dt class="mb-2 text-[15px] font-medium text-fg">{faq.q}</dt>
				<dd class="text-[14px] leading-relaxed text-fg-muted">{faq.a}</dd>
			</div>
		{/each}
	</dl>

	<h2 class="mt-16 border-t border-border/30 pt-12 mb-4 text-[28px] tracking-tight text-fg"
		
	>
		See it in action.
	</h2>

	<p class="mb-8 text-[14px] leading-relaxed text-fg-muted">
		The demo project ships with several audit findings already triggered so you can see the panel live without drawing anything.
	</p>

	<div class="mb-16 flex flex-wrap gap-4">
		<a
			href="/"
			class="group inline-flex items-center gap-2 rounded-md bg-fg px-4 py-2.5 text-[13px] font-medium text-canvas transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:bg-accent-strong focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
		>
			<ArrowRight class="size-4" />
			Request an alpha invite
		</a>
		<a
			href="/learn/audit-codes"
			class="group inline-flex items-center gap-1.5 rounded-sm text-[13px] font-medium text-fg-muted underline-offset-[5px] transition-colors hover:text-fg hover:underline focus-visible:outline-none focus-visible:text-fg focus-visible:underline focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
		>
			<Terminal class="size-3.5" />
			Full reference (all 94 codes) →
		</a>
	</div>
	<SiteFooter />
</div>
