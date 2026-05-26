<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import { describeAuditCode } from '$lib/font/audit';

	// Hand-curated grouping — the dictionary in describeAuditCode is the
	// source of truth for descriptions. This array adds taxonomy + order
	// for the reference page. Order matches the dictionary file so it's
	// easy to keep in sync.
	const families: Array<{ title: string; intro: string; codes: string[] }> = [
		{
			title: 'Contour shape',
			intro:
				'Issues with the geometry of a glyph\'s outlines — control points, segments, intersections. These are catchable by the editor without any context about the font as a whole.',
			codes: [
				'empty',
				'open-contour',
				'duplicate-points',
				'off-grid-points',
				'near-collinear-points',
				'sharp-kink',
				'self-intersecting',
				'contour-winding-collision',
				'tiny-contour'
			]
		},
		{
			title: 'Metric alignment',
			intro:
				'Whether letters that should reach the x-height, cap-height, ascender, or descender actually do. Inconsistent metric alignment is the most common reason a typeface reads as "wobbly" at body size.',
			codes: [
				'xheight-misaligned',
				'capheight-misaligned',
				'extends-above-ascender',
				'extends-below-descender'
			]
		},
		{
			title: 'Spacing & sidebearings',
			intro:
				'The horizontal layout of glyphs — advance widths, left and right sidebearings. These checks catch accidental overlaps, zero-width glyphs, and the negative sidebearings that creep in from mass-spacing passes.',
			codes: [
				'zero-advance',
				'overflows-advance',
				'sidebearing-deeply-negative-lsb',
				'sidebearing-deeply-negative-rsb',
				'sidebearing-class-drift-lsb',
				'sidebearing-class-drift-rsb',
				'sidebearings-no-classes'
			]
		},
		{
			title: 'Composites & references',
			intro:
				'Composite glyphs are built from component references — Á is A plus the acute mark. These checks catch broken references and infinite-loop component cycles.',
			codes: ['composite-cycle', 'composite-missing-base']
		},
		{
			title: 'Anchors & mark positioning',
			intro:
				'GPOS mark positioning relies on named anchors — base glyphs declare anchor names (top, bottom), marks declare matching partner names (_top, _bottom). These checks enforce the naming contract and the partner requirement.',
			codes: [
				'anchors-missing',
				'anchor-without-partner',
				'anchor-naming-base-with-prefix',
				'anchor-naming-mark-no-prefix'
			]
		},
		{
			title: 'OpenType features',
			intro:
				'Auto-detected OpenType feature integrity — kerning, classes, pair coverage.',
			codes: [
				'feature-kern-disabled-with-pairs',
				'figures-non-tabular',
				'kerning-no-classes',
				'kerning-class-singleton',
				'kerning-extreme',
				'kerning-pair-self',
				'pair-missing-glyph',
				'pair-orphan-class',
				'class-empty',
				'class-missing-member',
				'class-name-format'
			]
		},
		{
			title: 'Glyph naming',
			intro:
				'Glyph names follow specific rules (production names per Adobe glyph list, length limits, character restrictions). Renderers and font shells fall back to .notdef when names are malformed.',
			codes: [
				'glyph-name-empty',
				'glyph-name-invalid',
				'glyph-name-not-canonical',
				'glyph-name-too-long',
				'duplicate-glyph-name'
			]
		},
		{
			title: 'Vertical metrics',
			intro:
				'OS/2 and hhea tables hold the vertical metrics renderers use. These two tables must agree or text reflows inconsistently between OS/browser combinations.',
			codes: [
				'metrics-asc-mismatch',
				'metrics-desc-mismatch',
				'metrics-gap-mismatch',
				'metrics-use-typo-off',
				'metrics-cap-above-ascender',
				'metrics-x-above-cap',
				'metrics-descender-nonnegative',
				'metrics-win-clip-top',
				'metrics-win-clip-bottom',
				'metrics-zero-height'
			]
		},
		{
			title: 'Font metadata',
			intro:
				'The OS/2 + name-table fields a real shippable font needs — designer, manufacturer, license, vendor ID, version string, copyright.',
			codes: [
				'meta-no-designer',
				'meta-no-designer-url',
				'meta-no-manufacturer',
				'meta-no-license',
				'meta-no-license-url',
				'meta-no-copyright',
				'meta-no-vendor-id',
				'meta-vendor-id-invalid',
				'meta-version-format',
				'naming-family',
				'naming-family-chars',
				'naming-family-long',
				'naming-style',
				'naming-version',
				'naming-copyright-missing',
				'naming-designer-missing',
				'naming-license-missing'
			]
		},
		{
			title: 'Design brief',
			intro:
				'Brief completeness — design intent, audience, motivation. The brief drives later editorial decisions and is what makes audit results contextual ("this typeface\'s brief says \'large display\', so a too-thin hairline matters here").',
			codes: ['brief-no-intent', 'brief-no-design-notes', 'notes-todo', 'flagged-for-review']
		},
		{
			title: 'Variable fonts & axes',
			intro:
				'Designspace integrity for variable fonts — axes, masters, instances. These checks fire when an axis is declared but unused, a master is out of range, or an instance points at an axis that no longer exists.',
			codes: [
				'axis-range-invalid',
				'master-axis-missing',
				'master-axis-unknown',
				'master-axis-out-of-range',
				'master-orphan-axis',
				'master-out-of-range',
				'master-empty',
				'master-contour-count',
				'master-point-count',
				'instance-orphan-axis',
				'no-instances'
			]
		},
		{
			title: 'Multi-script coverage',
			intro:
				'Whether a project that declares a script has enough glyphs to be useful in that script. Patens has bulk-coverage codes for Latin-1, currency, math, typographic essentials, and control glyphs.',
			codes: [
				'coverage-latin-1-supp',
				'coverage-currency',
				'coverage-math',
				'coverage-typo-essentials',
				'control-glyphs-missing',
				'glyph-count-low'
			]
		},
		{
			title: 'Color fonts',
			intro: 'COLR / CPAL integrity — palette indices in COLR layers must exist in CPAL.',
			codes: ['color-layer-no-palette', 'color-layer-out-of-range', 'palette-length-mismatch']
		},
		{
			title: 'UPM',
			intro: 'Units per em — the font\'s coordinate grid. Unusual values cause rendering edge cases.',
			codes: ['upm-unusual']
		}
	];

	const all = families.flatMap((f) =>
		f.codes
			.map((code) => ({ code, family: f.title, description: describeAuditCode(code) }))
			.filter((c) => c.description)
	);

	const jsonLd = `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'TechArticle',
				name: 'Patens audit codes — reference',
				description:
					'Every audit code Patens emits, grouped by family, with a plain-language explanation of what triggers it and why it matters.',
				url: 'https://patens.design/learn/audit-codes',
				datePublished: '2026-05-25',
				author: { '@type': 'Person', name: 'Alejandro Vizio', url: 'https://github.com/alevizio' }
			},
			{
				'@type': 'BreadcrumbList',
				itemListElement: [
					{ '@type': 'ListItem', position: 1, name: 'Patens', item: 'https://patens.design' },
					{ '@type': 'ListItem', position: 2, name: 'Learn', item: 'https://patens.design/learn' },
					{
						'@type': 'ListItem',
						position: 3,
						name: 'Audit codes',
						item: 'https://patens.design/learn/audit-codes'
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
	<title>Patens audit codes (2026) — reference of every warning the editor emits</title>
	<meta
		name="description"
		content="Reference for all {all.length} audit codes in Patens, grouped by family — contour shape, metric alignment, OpenType invariants, vertical metrics, naming, multi-script coverage, color fonts. What each code means, why it matters, how to fix."
	/>
	<link rel="canonical" href="https://patens.design/learn/audit-codes" />
	<meta property="og:title" content="Patens audit codes — full reference" />
	<meta
		property="og:description"
		content="Every audit code Patens emits, grouped by family, with a plain-language explanation."
	/>
	<meta property="og:image" content="/og/brand" />
	<meta name="twitter:title" content="Patens audit codes — reference" />
	<meta name="twitter:description" content="Every audit code with a plain-language explanation." />
	<meta name="twitter:image" content="/og/brand" />
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
		Reference · {all.length} codes
	</p>

	<h1
		class="mb-6 text-[36px] leading-tight tracking-tight text-fg"
		style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
	>
		Audit codes.
	</h1>

	<p class="mb-6 text-[15px] leading-relaxed text-fg-muted">
		Patens runs a built-in audit module against every project. Each issue
		it finds is reported with a stable code (e.g. <code
			class="rounded bg-surface-1 px-1 py-0.5 font-mono text-[13px]"
		>sidebearing-deeply-negative-lsb</code>) so it's referenceable in commits,
		bug reports, and tutorials. This page is the canonical reference for
		what every code means.
	</p>

	<p class="mb-12 text-[14px] leading-relaxed text-fg-muted">
		Codes are grouped by family. Each code in the editor links here, and
		many issues have a one-click <em class="not-italic text-fg">Fix</em>
		action available inline.
	</p>

	<!-- TOC -->
	<nav
		aria-label="Families"
		class="mb-12 rounded-lg border border-border/40 bg-surface-1/40 p-4 text-[13px]"
	>
		<div
			class="mb-3 text-[11px] uppercase tracking-[0.14em] text-fg-muted"
		>
			Contents
		</div>
		<ul class="grid gap-x-6 gap-y-2 sm:grid-cols-2">
			{#each families as fam (fam.title)}
				<li>
					<a
						href={`#${fam.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
						class="text-fg-muted hover:text-fg"
					>
						{fam.title}
						<span class="text-fg-subtle">({fam.codes.filter((c) => describeAuditCode(c)).length})</span>
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	{#each families as fam (fam.title)}
		{@const sectionId = fam.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
		{@const codes = fam.codes
			.map((code) => ({ code, description: describeAuditCode(code) }))
			.filter((c) => c.description)}
		{#if codes.length > 0}
			<section id={sectionId} class="mb-12 scroll-mt-16">
				<h2
					class="mb-2 text-[24px] tracking-tight text-fg"
					style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
				>
					{fam.title}
				</h2>
				<p class="mb-6 text-[14px] leading-relaxed text-fg-muted">
					{fam.intro}
				</p>
				<dl class="space-y-5">
					{#each codes as { code, description } (code)}
						<div class="grid grid-cols-[auto_1fr] gap-x-4 border-b border-border/30 pb-5">
							<dt class="font-mono text-[12px] text-accent-strong">
								<a
									href={`#code-${code}`}
									id={`code-${code}`}
									class="hover:underline"
								>
									{code}
								</a>
							</dt>
							<dd class="text-[14px] leading-relaxed text-fg-muted">
								{description}
							</dd>
						</div>
					{/each}
				</dl>
			</section>
		{/if}
	{/each}

	<p class="mt-16 mb-4 text-[13px] leading-relaxed text-fg-muted">
		If a code is missing or its description doesn't match what you see in
		the editor, file an
		<a
			href="https://github.com/alevizio/patens/issues/new"
			class="text-accent-strong underline underline-offset-2"
		>
			issue
		</a>. Accuracy here is the difference between the audit module
		feeling like a teaching tool and feeling like noise.
	</p>
</div>
