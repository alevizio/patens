<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	import SiteFooter from '$lib/ui/SiteFooter.svelte';
	import SiteHeader from '$lib/ui/SiteHeader.svelte';
	type Format = {
		ext: string;
		name: string;
		audience: string;
		pipeline: string;
		size: string;
		good: string[];
		bad: string[];
	};

	const formats: Format[] = [
		{
			ext: 'OTF',
			name: 'OpenType (CFF)',
			audience: 'Print, design apps, install-on-machine workflows',
			pipeline: 'opentype.js, in-browser, ~150ms for Latin',
			size: '~80–200 KB for a Latin font',
			good: [
				'Universal: Adobe apps, Office, system installs, every modern browser',
				'Compact CFF outlines (smaller than TTF for the same shapes)',
				'No autohinting pipeline needed — print + design apps don\'t use it'
			],
			bad: [
				'Larger than WOFF2 over the wire (~30% bigger)',
				'No built-in font compression in HTTP transports'
			]
		},
		{
			ext: 'WOFF2',
			name: 'Web Open Font Format 2',
			audience: 'Web @font-face — production websites',
			pipeline: 'OTF first, then woff2 compression in-browser via WASM, ~200ms',
			size: '~30–80 KB for a Latin font',
			good: [
				'Brotli-compressed: typically 30% smaller than the source OTF',
				'Universal browser support since 2017',
				'CDN-friendly — most CDNs ship .woff2 with the right Content-Type',
				'CSS font-display: swap works out of the box'
			],
			bad: [
				'Web-only — Adobe + Office still want OTF/TTF',
				'Some legacy proxies strip the brotli header; serve uncompressed as fallback'
			]
		},
		{
			ext: 'TTF',
			name: 'TrueType + autohinting',
			audience: 'Small-size screen rendering, Windows-first, embedded',
			pipeline: 'Pyodide + fontTools + ttfautohint, first run ~7MB Pyodide load, then ~2s',
			size: '~120–280 KB for a Latin font (TT outlines + hinting tables)',
			good: [
				'Built-in autohinting via ttfautohint — sharper at body text sizes on Windows',
				'Mandatory on some platforms (older Windows + embedded contexts)',
				'Variable fonts ship as TTF with gvar/HVAR tables'
			],
			bad: [
				'TT outlines are quadratic; Patens converts cubic → quadratic on export (lossy at extreme curves)',
				'First export pays the Pyodide download cost (~7MB, cached after)',
				'95% of users never need autohinting'
			]
		},
		{
			ext: 'UFO',
			name: 'Unified Font Object',
			audience: 'Designers handing off to FontLab / Glyphs / RoboFont',
			pipeline: 'XML-based directory tree, packaged as .zip by Patens',
			size: '~50–500 KB depending on glyph count',
			good: [
				'The lingua franca for type design tool interop',
				'Round-trips cleanly between FontLab 8, Glyphs 3, RoboFont, Fontra',
				'Human-readable XML — diffable in git',
				'Separates source design from binary export'
			],
			bad: [
				'Not directly installable — must compile to OTF/TTF first',
				'No web/app usage'
			]
		},
		{
			ext: '.font.json',
			name: 'Patens source format',
			audience: 'Backup, hand-off to another Patens user, version control',
			pipeline: 'Single JSON file — entire project schema',
			size: '~50–500 KB depending on glyph count',
			good: [
				'Lossless: every project field round-trips (kerning, classes, palettes, brief, decisions)',
				'Drop on patens.design home page to import',
				'Diffable in git — works as a real source of truth for the project',
				'Tiny dependency surface — just the Patens schema',
				'Includes design intent (brief, decisions, samples) that UFO doesn\'t carry'
			],
			bad: [
				'Patens-specific — other tools won\'t open it directly (export UFO first)',
				'Schema can evolve; old .font.json files migrate forward on import'
			]
		},
		{
			ext: '.zip bundle',
			name: 'Designer bundle',
			audience: 'Sending a finished font to a client / collaborator',
			pipeline: 'OTF + WOFF2 + .font.json + DESIGN.md + LICENSE in one .zip',
			size: '~200 KB – 2 MB',
			good: [
				'One file with every artifact a designer / dev / lawyer needs',
				'DESIGN.md captures the project brief + decisions log alongside the binaries',
				'LICENSE file ensures distribution terms travel with the font',
				'A foundry would call this "the deliverable"'
			],
			bad: [
				'Larger than any single format — overkill for casual sharing'
			]
		}
	];

	const jsonLd = `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'TechArticle',
				name: 'Font export formats — OTF vs WOFF2 vs TTF vs UFO vs .font.json',
				description:
					'When to use each Patens export format. OTF for design apps. WOFF2 for web. TTF + autohinting for Windows screens. UFO for tool interop. .font.json for backup. Designer-bundle .zip for handoff.',
				url: 'https://patens.design/learn/export-formats',
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
						name: 'Export formats',
						item: 'https://patens.design/learn/export-formats'
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
	<title>Font export formats (2026) — OTF vs WOFF2 vs TTF vs UFO · Patens guide</title>
	<meta
		name="description"
		content="Which format to export from Patens — OTF for design apps, WOFF2 for web, TTF + autohinting for Windows screens, UFO for tool interop, .font.json for backup, designer-bundle .zip for handoff."
	/>
	<link rel="canonical" href="https://patens.design/learn/export-formats" />
	<meta property="og:title" content="OTF vs WOFF2 vs TTF vs UFO — Patens export formats guide" />
	<meta
		property="og:description"
		content="When to use each export format Patens ships."
	/>
	<meta property="og:image" content="https://patens.design/og/brand" />
	<meta property="og:image:alt" content="Patens — open-source browser-native type design tool with a 94-code audit module" />
	<meta name="twitter:title" content="Font export formats — Patens guide" />
	<meta name="twitter:description" content="Which format for which audience." />
	<meta name="twitter:image" content="https://patens.design/og/brand" />
	<meta name="twitter:image:alt" content="Patens — open-source browser-native type design tool with a 94-code audit module" />
	<!-- eslint-disable svelte/no-at-html-tags, no-useless-escape -->
	{@html jsonLd}
	<!-- eslint-enable svelte/no-at-html-tags, no-useless-escape -->
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
	<SiteHeader current="/learn/export-formats" />

	<a
		href="/learn"
		class="mb-8 inline-flex items-center gap-1.5 text-[12px] text-fg-muted hover:text-fg"
	>
		<ArrowLeft class="size-3" />
		Back to learn
	</a>

	<p class="mb-2 text-[13px] uppercase tracking-[0.18em] text-fg-subtle">
		Reference · 6 formats
	</p>

	<h1
		class="mb-6 text-[36px] leading-tight tracking-tight text-fg"
		
	>
		Export formats.
	</h1>

	<p class="mb-6 text-[15px] leading-relaxed text-fg-muted">
		<strong class="font-semibold text-fg">Patens exports six formats.</strong>
		Each maps to a specific downstream audience — design apps, web,
		Windows-first screen rendering, type-tool interop, backup,
		collaborator handoff. This page is the canonical reference for
		which format to pick when.
	</p>

	<p class="mb-12 text-[14px] leading-relaxed text-fg-muted">
		Open the export panel at <code class="rounded-none bg-surface-1 px-1 py-0.5 font-mono text-[13px]">/project/[id]/export</code>
		(Cmd+Shift+E from anywhere in the editor). Pick the format that
		matches your downstream consumer.
	</p>

	<div class="space-y-12">
		{#each formats as f (f.ext)}
			<section>
				<div class="mb-2 flex items-baseline gap-3">
					<h2
						class="text-[24px] tracking-tight text-fg"
						
					>
						{f.ext}
					</h2>
					<span class="text-[13px] text-fg-muted">{f.name}</span>
				</div>
				<dl class="mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13px]">
					<dt class="text-fg-subtle">Audience</dt>
					<dd class="text-fg">{f.audience}</dd>
					<dt class="text-fg-subtle">Pipeline</dt>
					<dd class="text-fg-muted">{f.pipeline}</dd>
					<dt class="text-fg-subtle">Typical size</dt>
					<dd class="text-fg-muted">{f.size}</dd>
				</dl>
				<div class="grid gap-4 sm:grid-cols-2">
					<div>
						<div class="mb-1.5 text-[11px] uppercase tracking-[0.14em] text-success-strong">
							Good for
						</div>
						<ul class="space-y-1.5 text-[13px] leading-relaxed text-fg-muted">
							{#each f.good as point (point)}
								<li class="grid grid-cols-[auto_1fr] gap-x-2">
									<span class="mt-1 size-1 shrink-0 bg-success-strong"></span>
									<span>{point}</span>
								</li>
							{/each}
						</ul>
					</div>
					<div>
						<div class="mb-1.5 text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
							Trade-offs
						</div>
						<ul class="space-y-1.5 text-[13px] leading-relaxed text-fg-muted">
							{#each f.bad as point (point)}
								<li class="grid grid-cols-[auto_1fr] gap-x-2">
									<span class="mt-1 size-1 shrink-0 bg-fg-subtle"></span>
									<span>{point}</span>
								</li>
							{/each}
						</ul>
					</div>
				</div>
			</section>
		{/each}
	</div>

	<h2
		class="mt-16 mb-3 text-[20px] tracking-tight text-fg"
		
	>
		Quick recipes
	</h2>
	<dl class="mb-12 grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-[14px] leading-relaxed">
		<dt class="font-medium text-fg">Just shipping a website</dt>
		<dd class="text-fg-muted">WOFF2. Done.</dd>
		<dt class="font-medium text-fg">Client wants to install + use in Word</dt>
		<dd class="text-fg-muted">OTF. Send TTF too if the client is on older Windows.</dd>
		<dt class="font-medium text-fg">Hand-off to a foundry for finishing</dt>
		<dd class="text-fg-muted">UFO + .font.json. The UFO is the tool-portable source; the .font.json preserves your design brief + decisions.</dd>
		<dt class="font-medium text-fg">Backing up your work</dt>
		<dd class="text-fg-muted">.font.json. Drop it on the home page to restore.</dd>
		<dt class="font-medium text-fg">Sending a finished font to a stranger</dt>
		<dd class="text-fg-muted">Designer bundle .zip. Has the file, the brief, and the license in one place.</dd>
	</dl>

	<h2
		class="mt-12 mb-3 text-[20px] tracking-tight text-fg"
		
	>
		Related
	</h2>
	<p class="mb-3 text-[14px] leading-relaxed text-fg-muted">
		The <a href="/learn/first-font" class="text-accent-strong underline underline-offset-2">first-font tutorial</a>
		covers the workflow that ends at export. The
		<a href="/learn/opentype-features" class="text-accent-strong underline underline-offset-2">OpenType features guide</a>
		explains what the export pipeline emits in the GSUB + GPOS tables.
	</p>

	<p class="mt-12 text-[14px] text-fg-muted">
		Patens is in private alpha.
		<a href="/" class="text-accent-strong underline underline-offset-2">Request an invite →</a>
	</p>
	<SiteFooter />
</div>
