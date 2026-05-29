<script lang="ts">
	// Public teaser — the indexable face of Patens during private alpha.
	// The full app lives at an unguessable URL (/studio-c104c94c) — no
	// passcode, just an unlisted link shared directly with invited testers.
	// This page explains the product and captures invite-list emails.
	import SiteHeader from '$lib/ui/SiteHeader.svelte';
	import SiteFooter from '$lib/ui/SiteFooter.svelte';
	import WaitlistForm from '$lib/ui/WaitlistForm.svelte';
	import { homeTagline } from '$lib/delight';

	const taglineParts = $derived(homeTagline().split('\n'));
</script>

<svelte:head>
	<title>Patens (2026) — a type editor with a method</title>
	<meta
		name="description"
		content="Patens is a type editor with 94 rules running underneath. Each rule explains itself in plain English, and ~30 of them fix the glyph for you. Open source, MIT, in the browser, no install. The Patens Method. Now in private alpha."
	/>
	<!-- OpenGraph / Twitter card meta for link unfurls. -->
	<meta property="og:type" content="website" />
	<meta property="og:title" content="Patens — a type editor with a method" />
	<meta
		property="og:description"
		content="94 rules for drawing a typeface, every one explained in plain English. Open source, MIT, in the browser. The Patens Method. Now in private alpha."
	/>
	<meta property="og:site_name" content="Patens" />
	<meta property="og:image" content="https://patens.design/og/home" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Patens" />
	<meta
		name="twitter:description"
		content="94 rules for drawing a typeface, every one explained in plain English. Open source, MIT, in the browser. The Patens Method."
	/>
	<meta name="twitter:image" content="https://patens.design/og/home" />
	<!-- Preload the hero typeface so the LCP element (the "Type," line set
	     in StudioGeometric) paints as soon as parsing finishes. Tiny file
	     (~2.3KB); fetchpriority outranks chunk-preloads in the queue. -->
	<link
		rel="preload"
		href="/demo-fonts/StudioGeometric-Regular.otf"
		as="font"
		type="font/otf"
		fetchpriority="high"
		crossorigin="anonymous"
	/>
	<style>
		@font-face {
			font-family: 'StudioGeometric';
			src: url('/demo-fonts/StudioGeometric-Regular.otf') format('opentype');
			font-weight: 400;
			font-style: normal;
			font-display: swap;
		}

		/* Hero H1 reveal — clip-path left-to-right wipe staggered across the
		   two H1 lines. The brain reads slow left-to-right reveal as
		   "writing", which matches Patens's sketch→trace pipeline. clip-path
		   animates on the compositor (60fps, no layout). The `to` keyframe is
		   the natural state, so any render before JS hydrates shows the H1
		   already revealed. */
		@keyframes draw-reveal {
			from {
				clip-path: inset(0 100% 0 0);
			}
			to {
				clip-path: inset(0 0 0 0);
			}
		}
		.draw-line {
			clip-path: inset(0 0 0 0);
			animation: draw-reveal var(--draw-duration) cubic-bezier(0.65, 0, 0.35, 1) both;
			animation-delay: var(--draw-delay, 0ms);
		}
		.draw-line-1 {
			--draw-duration: 700ms;
			--draw-delay: 100ms;
		}
		.draw-line-2 {
			--draw-duration: 1800ms;
			--draw-delay: 900ms;
		}
		@media (prefers-reduced-motion: reduce) {
			.draw-line,
			.draw-line-1,
			.draw-line-2 {
				animation: none !important;
				clip-path: inset(0 0 0 0);
			}
		}
	</style>
	<link rel="canonical" href="https://patens.design/" />

	<!-- eslint-disable svelte/no-at-html-tags, no-useless-escape -->
	{@html `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'WebSite',
				'@id': 'https://patens.design/#website',
				url: 'https://patens.design/',
				name: 'Patens',
				description:
					'A type design tool that teaches as you draw. Sketch glyphs, trace to Bézier, audit your work against 94 type-design rules with plain-English fixes, ship real OpenType. Open source MIT, browser-native.',
				inLanguage: ['en', 'es'],
				publisher: { '@id': 'https://patens.design/#organization' }
			},
			{
				'@type': 'Organization',
				'@id': 'https://patens.design/#organization',
				name: 'Patens',
				url: 'https://patens.design/',
				logo: 'https://patens.design/og/brand',
				description:
					'Open-source browser-native type design tool with a 94-code teaching audit module.',
				founder: { '@id': 'https://patens.design/#maintainer' },
				sameAs: [
					'https://github.com/alevizio/patens',
					'https://x.com/patenstype',
					'https://bsky.app/profile/patens.design',
					'https://instagram.com/patens.type'
				]
			},
			{
				'@type': 'Person',
				'@id': 'https://patens.design/#maintainer',
				name: 'Alejandro Vizio',
				url: 'https://github.com/alevizio',
				jobTitle: 'Designer + maintainer',
				sameAs: [
					'https://github.com/alevizio',
					'https://x.com/patenstype',
					'https://bsky.app/profile/patens.design',
					'https://instagram.com/patens.type'
				],
				worksFor: { '@id': 'https://patens.design/#organization' }
			},
			{
				'@type': 'WebApplication',
				'@id': 'https://patens.design/#webapp',
				name: 'Patens',
				alternateName: 'Patens — type design that teaches as you draw',
				description:
					'A type design tool that teaches as you draw. Sketch glyphs, trace to Bézier, audit your work against 94 type-design rules with plain-English fixes, ship real OpenType. The audit module is the spine of the editor — every contour, metric, and kern pair gets checked against rules type designers internalize through years of mentorship, with around 30 codes offering a one-click fix. Open source MIT, browser-native, no installs.',
				applicationCategory: 'DesignApplication',
				applicationSubCategory: 'Font Editor',
				operatingSystem: 'Any (browser-based)',
				browserRequirements:
					'Requires JavaScript. Recommended: a modern Chromium-based browser, Firefox, or Safari 16+. Best on screens 1024px+ wide.',
				url: 'https://patens.design/',
				image: 'https://patens.design/og/brand',
				offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
				license: 'https://opensource.org/licenses/MIT',
				isAccessibleForFree: true,
				softwareVersion: '1.5.2',
				releaseNotes: 'https://patens.design/changelog',
				downloadUrl: 'https://github.com/alevizio/patens',
				author: { '@id': 'https://patens.design/#maintainer' },
				creator: { '@id': 'https://patens.design/#maintainer' },
				publisher: { '@id': 'https://patens.design/#organization' },
				codeRepository: 'https://github.com/alevizio/patens',
				programmingLanguage: ['TypeScript', 'Svelte'],
				inLanguage: ['en', 'es'],
				availableLanguage: ['en', 'es'],
				keywords:
					'type design, font editor, browser-based, open source, OpenType, audit, teaching, variable fonts, multi-script, MIT'
			},
			{
				'@type': 'SoftwareSourceCode',
				'@id': 'https://patens.design/#sourcecode',
				name: 'Patens (source code)',
				codeRepository: 'https://github.com/alevizio/patens',
				url: 'https://github.com/alevizio/patens',
				programmingLanguage: ['TypeScript', 'Svelte', 'JavaScript'],
				runtimePlatform: 'Web Browser',
				license: 'https://opensource.org/licenses/MIT',
				codeSampleType: 'full',
				targetProduct: { '@id': 'https://patens.design/#webapp' },
				author: { '@id': 'https://patens.design/#maintainer' },
				maintainer: { '@id': 'https://patens.design/#maintainer' },
				keywords: 'type design, font editor, sveltekit, svelte 5, open source, MIT'
			}
		]
	}).replace(/<\/script/g, '<\\/script')}<\/script>`}
	<!-- eslint-enable svelte/no-at-html-tags, no-useless-escape -->
</svelte:head>

<div class="mx-auto max-w-5xl px-4 sm:px-6">
	<SiteHeader current="/" lang="en" />

	<main>
		<!-- Hero — the H1 draws in left-to-right, then the invite capture is
		     the primary action (the app is gated during alpha). -->
		<section class="mb-24 pt-4">
			<p class="mb-6 font-mono text-[11px] tracking-[0.22em] text-fg-subtle uppercase">
				Private alpha · 2026
			</p>

			<h1 class="max-w-4xl text-balance text-[44px] leading-[1.02] tracking-tight sm:text-[80px]">
				<span
					class="draw-line draw-line-1 block text-fg"
					style="font-family: 'Hoefler Text', ui-serif, Georgia, 'Times New Roman', serif;"
				>
					{taglineParts[0]}
				</span>
				<span
					class="draw-line draw-line-2 mt-2 block font-sans text-[0.6em] font-semibold leading-tight text-fg-muted"
				>
					{taglineParts[1]}
				</span>
			</h1>

			<p class="mt-8 max-w-xl text-[15px] leading-relaxed text-fg-muted">
				A type editor with the <em class="font-medium text-fg not-italic">Patens Method</em>
				built in — <span class="font-mono text-fg" data-numeric>94</span> practices for drawing
				type, every one explained in plain English. Sketch, kern, and ship a real
				<span class="font-mono text-fg">.otf</span> — all in your browser, all stored locally.
			</p>

			<div class="mt-10 max-w-md">
				<p class="mb-3 text-[13px] font-medium text-fg">
					It's in private alpha. Get an invite.
				</p>
				<WaitlistForm lang="en" />
			</div>
		</section>

		<!-- Trust band — by-the-numbers credibility. -->
		<section
			aria-label="Patens by the numbers"
			class="mt-20 mb-20 border-y border-border/40 py-10 md:py-12"
		>
			<div class="grid grid-cols-2 gap-y-8 md:grid-cols-4 md:gap-x-8 md:gap-y-0">
				<div class="flex flex-col gap-1">
					<span
						class="text-[36px] leading-none tracking-tight text-fg"
						style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
					>
						94
					</span>
					<span class="text-[10px] tracking-[0.18em] text-fg-subtle uppercase">
						Audit codes · plain-English fixes
					</span>
				</div>
				<div class="flex flex-col gap-1">
					<span
						class="text-[36px] leading-none tracking-tight text-fg"
						style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
					>
						162
					</span>
					<span class="text-[10px] tracking-[0.18em] text-fg-subtle uppercase">
						Demo glyphs · Latin · Cyrillic · Greek
					</span>
				</div>
				<div class="flex flex-col gap-1">
					<span
						class="text-[36px] leading-none tracking-tight text-fg"
						style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
					>
						528
					</span>
					<span class="text-[10px] tracking-[0.18em] text-fg-subtle uppercase">
						Tests passing · 31 a11y routes
					</span>
				</div>
				<div class="flex flex-col gap-1">
					<span
						class="text-[36px] leading-none tracking-tight text-fg"
						style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
					>
						MIT
					</span>
					<span class="text-[10px] tracking-[0.18em] text-fg-subtle uppercase">
						Open source · no paywall · ever
					</span>
				</div>
			</div>
		</section>

		<!-- How the audit teaches — the differentiator, shown with real
		     audit-code prose. This is the marketing the gated app can't do. -->
		<section aria-label="How the audit teaches" class="mb-24">
			<div class="mb-8 flex items-baseline justify-between gap-3">
				<h2
					class="text-[28px] tracking-tight text-fg"
					style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
				>
					How the audit teaches.
				</h2>
				<span class="font-mono text-[10px] tracking-wider text-fg-subtle uppercase">
					Live from <code class="text-fg">describeAuditCode()</code>
				</span>
			</div>

			<div class="grid gap-6 sm:grid-cols-3">
				<article class="flex flex-col gap-3 border-t border-border/40 pt-5">
					<h3 class="font-mono text-[12px] text-accent-strong">self-intersecting</h3>
					<p class="text-[14px] leading-relaxed text-fg-muted">
						A contour crosses itself. Rasterisers fill the overlap unpredictably depending on
						fill-rule (even-odd vs non-zero).
					</p>
					<div class="mt-auto">
						<span
							class="inline-flex items-baseline gap-1.5 rounded bg-accent-soft px-2 py-1 text-[11px] font-medium text-accent-strong"
						>
							<span aria-hidden="true">✓</span>
							One-click Fix
						</span>
					</div>
				</article>

				<article class="flex flex-col gap-3 border-t border-border/40 pt-5">
					<h3 class="font-mono text-[12px] text-accent-strong">xheight-misaligned</h3>
					<p class="text-[14px] leading-relaxed text-fg-muted">
						A lowercase letter that should reach x-height is sitting noticeably below it. Uneven
						tops across letters give text a wobbly rhythm; consistent x-height alignment is what
						makes type read smoothly.
					</p>
					<div class="mt-auto">
						<span class="inline-flex items-baseline gap-1.5 text-[11px] font-medium text-fg-muted">
							Designer judgment
						</span>
					</div>
				</article>

				<article class="flex flex-col gap-3 border-t border-border/40 pt-5">
					<h3 class="font-mono text-[12px] text-accent-strong">sidebearing-class-drift-lsb</h3>
					<p class="text-[14px] leading-relaxed text-fg-muted">
						This glyph's LSB has drifted from the median of its sidebearing-class peers. Either
						re-apply the class or remove this glyph from it.
					</p>
					<div class="mt-auto">
						<span class="inline-flex items-baseline gap-1.5 text-[11px] font-medium text-fg-muted">
							Designer judgment
						</span>
					</div>
				</article>
			</div>

			<p class="mt-8 text-[13px] text-fg-muted">
				<a
					href="/audit"
					class="group inline-flex items-baseline gap-1.5 font-medium text-accent-strong hover:underline"
				>
					Read the Method
					<span class="transition-transform group-hover:translate-x-0.5">→</span>
				</a>
				<span class="ml-3 text-fg-subtle">
					· <a href="/learn/audit-codes" class="hover:text-fg">Full reference (94 codes)</a> · Also
					from the terminal: <code class="font-mono text-fg">npx patens audit</code>
				</span>
			</p>
		</section>
	</main>

	<SiteFooter lang="en" />
</div>
