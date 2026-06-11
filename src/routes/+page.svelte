<script lang="ts">
	// Public teaser — the indexable face of Patens during private alpha.
	// The full app lives at an unguessable URL (/studio-c104c94c) — no
	// passcode, just an unlisted link shared directly with invited testers.
	// This page explains the product and captures invite-list emails.
	//
	// Editorial register, foundry-style: long vertical rhythm, type itself
	// doing the heavy lifting, no card chrome. Sections (top → bottom):
	//   1. Hero        — H1 draw animation + pitch + waitlist
	//   2. Specimen    — what the editor produces (Studio Geometric)
	//   3. The audit   — large 'a' with audit annotations in the margin
	//                    (literalizes "mentor in the margin") + 3 code cards
	//   4. The editor  — stylized 3-column mock of the editing surface
	//   5. The 105     — 9 audit families with <details> expansion
	//   6. Compared    — compact table vs FontLab / Glyphs / Fontra / etc.
	//   7. Closing     — repeat waitlist + signed-by-Alejandro line
	import SiteHeader from '$lib/ui/SiteHeader.svelte';
	import SiteFooter from '$lib/ui/SiteFooter.svelte';
	import WaitlistForm from '$lib/ui/WaitlistForm.svelte';
	import InteractiveHero from '$lib/ui/InteractiveHero.svelte';
	import { hreflangLinks } from '$lib/i18n';
	import { AUDIT_CODE_COUNT } from '$lib/font/audit-count';
	import { fade } from 'svelte/transition';
	import { cubicOut, cubicIn } from 'svelte/easing';
	import { onMount } from 'svelte';

	// Once the hero viewport has scrolled out, the bottom-left .hero-cta
	// promotes itself to a fixed top-left position via the .is-stuck class
	// so the signup follows the user down the page. IntersectionObserver
	// watches the hero — when less than 30% is visible, the cta sticks.
	let ctaStuck = $state(false);

	onMount(() => {
		const hero = document.querySelector('.hero-viewport');
		if (!hero) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				ctaStuck = entry.intersectionRatio < 0.3;
			},
			{ threshold: [0, 0.3, 0.6, 1] }
		);
		observer.observe(hero);
		return () => observer.disconnect();
	});

	// 30-second demo video: autoplay is a courtesy, not a requirement.
	// Reduced-motion visitors get a paused poster with native controls;
	// everyone else gets play/pause tied to viewport visibility so the
	// loop never burns cycles off-screen.
	let demoVideoEl: HTMLVideoElement | undefined;
	let demoReducedMotion = $state(false);
	// WCAG 2.2.2: an autoplaying >5s loop needs a user pause control. A
	// user pause is sticky — the viewport observer must not resume it.
	let demoUserPaused = $state(false);

	const toggleDemoPlayback = () => {
		if (!demoVideoEl) return;
		if (demoVideoEl.paused) {
			demoUserPaused = false;
			demoVideoEl.play().catch(() => {});
		} else {
			demoUserPaused = true;
			demoVideoEl.pause();
		}
	};

	onMount(() => {
		if (!demoVideoEl) return;
		demoReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (demoReducedMotion) {
			demoVideoEl.removeAttribute('autoplay');
			demoVideoEl.pause();
			return;
		}
		const observer = new IntersectionObserver(
			([entry]) => {
				if (!demoVideoEl) return;
				if (entry.isIntersecting && !demoUserPaused) demoVideoEl.play().catch(() => {});
				else demoVideoEl.pause();
			},
			{ threshold: 0.25 }
		);
		observer.observe(demoVideoEl);
		return () => observer.disconnect();
	});

	// Story toggle for the TL;DR section — three depths of the same pitch,
	// each click swaps the body. Order: short / longer / longest. The
	// labels live in font-mono caps to match the existing eyebrow rhythm.
	const stories = [
		{ key: 'tldr', label: 'TL;DR' },
		{ key: 'longer', label: 'The longer version' },
		{ key: 'long', label: 'The long version' }
	] as const;
	let activeStory = $state<(typeof stories)[number]['key']>('tldr');

	// Annotated-glyph callouts (Section 3). Each one corresponds to a real
	// audit code; the prose mirrors describeAuditCode()'s register so the
	// teaser reads in the same voice the editor will.
	const annotations = [
		{
			code: 'xheight-overshoot',
			body: 'The bowl overshoots x-height by 14 units. Healthy — round letters should overshoot — but check that your o and c overshoot too, or this letter will appear taller than the round letters around it.'
		},
		{
			code: 'stem-thickness-inconsistent',
			body: "The downstroke is 8% wider near the bottom. Often a sketch-to-trace artifact. It's also one of the ~30 codes with a one-click Fix; the audit will offer to even it out."
		},
		{
			code: 'aperture-asymmetric',
			body: 'The aperture closes slightly on the right. Subtle in isolation, but at text size, the round-letter rhythm reads visibly uneven against your o and c.'
		},
		{
			code: 'near-collinear-points',
			body: 'Three nodes along this segment lie almost on a line. Delete the middle one and the curve simplifies without losing shape — a smoother contour at every size.'
		}
	] as const;

	// 9 audit families, 105 codes total. Examples + counts come from /audit
	// (the canonical list); descriptions are written for the teaser's
	// editorial register — shorter and more inviting than /audit's prose.
	const families = [
		{
			name: 'Contour shape',
			count: 9,
			examples: 'self-intersecting · winding-collision · sharp-kink · near-collinear-points',
			description:
				'Self-intersection, winding direction, near-collinear nodes, sharp kinks. The geometry that decides how the glyph rasterizes at every size.'
		},
		{
			name: 'Vertical metrics + topology',
			count: 12,
			examples: 'cap-above-ascender · xheight-misaligned · win-clip-top · use-typo-off',
			description:
				'Ascender, descender, cap-height, x-height, baseline. The framework every letter hangs on; drift here breaks reading rhythm before any single letter looks wrong.'
		},
		{
			name: 'Spacing + sidebearings',
			count: 9,
			examples: 'overflows-advance · deeply-negative-lsb · sidebearing-class-drift',
			description:
				'Left + right sidebearings, advance widths, class drift. The optical balance type designers calibrate by eye in strings like nnnonnon — now checked continuously.'
		},
		{
			name: 'OpenType invariants',
			count: 11,
			examples: 'duplicate-glyph-name · pair-orphan-class · feature-kern-disabled-with-pairs',
			description:
				'Duplicate names, orphan classes, empty features, kern enabled with zero pairs. The plumbing that has to be right or the font silently misbehaves in downstream apps.'
		},
		{
			name: 'Naming + metadata',
			count: 13,
			examples: 'naming-family-style · vendor-id-invalid · glyph-name-not-canonical',
			description:
				'Family, style, version, vendor ID, license, glyph-name canonicality. What downstream apps read to identify the font, and what reservation-of-name licenses (OFL) require you to change in derivatives.'
		},
		{
			name: 'Coverage',
			count: 7,
			examples: 'coverage-typo-essentials · coverage-latin-1-supp · coverage-currency · coverage-math',
			description:
				'Latin-1 supplement, typographic essentials, currency, math symbols. Scripts you claim to cover and what those scripts actually require to be useful for setting real text.'
		},
		{
			name: 'Anchors',
			count: 4,
			examples: 'mark-no-prefix · base-with-prefix · anchor-without-partner',
			description:
				'Mark-positioning anchors — base, mark, ligature. The GPOS layer that makes diacritics sit correctly across the alphabet, in every accented language.'
		},
		{
			name: 'Variable fonts',
			count: 9,
			examples: 'master-contour-count · axis-out-of-range · no-instances',
			description:
				'Master contour counts, axis ranges, named instances. The constraints that must hold for a variable font to interpolate cleanly without producing surprise glyphs between masters.'
		},
		{
			name: 'Color · brief · misc',
			count: 23,
			examples: 'palette-length-mismatch · brief-no-intent · figures-non-tabular',
			description:
				'COLR/CPAL palette consistency, project-brief completeness, tabular figures for data tables, and the long tail of practical checks designers internalize over years.'
		}
	] as const;

	// Compact comparison table (Section 6). Subset of /compare's distinctive
	// rows + 6 tools (Patens + 5 of the most-cited alternatives). Each
	// competitor links out to its official site; Patens is unlinked
	// (you're already here).
	const compareTools: ReadonlyArray<{ name: string; url?: string }> = [
		{ name: 'Patens' },
		{ name: 'FontLab', url: 'https://www.fontlab.com/' },
		{ name: 'Glyphs', url: 'https://glyphsapp.com/' },
		{ name: 'Fontra', url: 'https://fontra.xyz/' },
		{ name: 'Robofont', url: 'https://robofont.com/' },
		{ name: 'Glyphr Studio', url: 'https://www.glyphrstudio.com/' },
		{ name: 'Lipi', url: 'https://www.lipi.ai/font-studio' },
		{ name: 'Fontish', url: 'https://fontish.io/' }
	];
	type Cell = true | false | 'partial' | string;
	const compareRows: Array<{ label: string; values: Cell[] }> = [
		{ label: 'Price', values: ['Free', '$499', '$300', 'Free', '$400', 'Free', 'Freemium', '$6.49+/mo'] },
		{ label: 'Open source', values: ['MIT', false, false, 'BSD', false, 'MIT', false, false] },
		{ label: 'Runs in the browser', values: [true, false, false, true, false, true, true, true] },
		{ label: 'Pressure-sensitive sketch', values: [true, false, false, false, false, false, false, false] },
		{ label: '105-code teaching audit', values: [true, 'partial', 'partial', false, 'partial', false, false, false] },
		{ label: 'One-click "Fix" actions', values: [true, false, false, false, false, false, 'partial', 'partial'] },
		{ label: 'Plain-English explanations', values: [true, false, false, false, false, false, false, false] }
	];
</script>

<svelte:head>
	<title>Patens (2026) — a type editor with a method</title>
	<meta
		name="description"
		content="Patens is a type editor with 105 rules running underneath. Each rule explains itself in plain English, and ~30 of them fix the glyph for you. Open source, MIT, in the browser, no install. The Patens Method. Now in private alpha."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:title" content="Patens — a type editor with a method" />
	<meta
		property="og:description"
		content="105 rules for drawing a typeface, every one explained in plain English. Open source, MIT, in the browser. The Patens Method. Now in private alpha."
	/>
	<meta property="og:site_name" content="Patens" />
	<meta property="og:image" content="https://patens.design/og/home" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Patens" />
	<meta
		name="twitter:description"
		content="105 rules for drawing a typeface, every one explained in plain English. Open source, MIT, in the browser. The Patens Method."
	/>
	<meta name="twitter:image" content="https://patens.design/og/home" />
	<!-- Preload hero typefaces: Fit (the interactive specimen) + StudioGeometric
	     (the lower "Patens" specimen). Fit.woff2 is gitignored — licensed for
	     FotM Club subscribers, used locally for prototyping. -->
	<link
		rel="preload"
		href="/fonts/Fit.woff2"
		as="font"
		type="font/woff2"
		fetchpriority="high"
		crossorigin="anonymous"
	/>
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
			font-family: 'Fit Local';
			src:
				url('/fonts/Fit.woff2') format('woff2'),
				local('Fit Variable'),
				local('Fit Variable Normal'),
				local('FitVariable'),
				local('FitVariableNormal-Normal'),
				local('Fit'),
				local('Fit Normal');
			font-display: block;
			font-stretch: 100% 3600%;
			font-weight: 400;
		}
		@font-face {
			font-family: 'StudioGeometric';
			src: url('/demo-fonts/StudioGeometric-Regular.otf') format('opentype');
			font-weight: 400;
			font-style: normal;
			font-display: swap;
		}

		/* Home-only nav tweaks. SiteHeader now ships the glass background
		   across the whole site, so this block only adjusts what's unique
		   to the home page:
		     1. mb-12 → 0 so the hero starts right below the nav.
		     2. The negative -mx-4/-mx-6 from SiteHeader is what lets the
		        nav span edge-to-edge from inside a padded wrapper; we
		        keep that and just zero the margin-bottom. */
		.home-nav-wrapper > header {
			margin-bottom: 0 !important;
		}

		/* When the hero viewport has scrolled mostly out (Intersection-
		   Observer flips ctaStuck in onMount), the .hero-cta promotes
		   itself from absolute-bottom-of-hero to fixed-top-of-viewport.
		   Same form, same component instance — just a position swap with
		   an opacity transition for visual smoothness. */
		.hero-cta.is-stuck {
			position: fixed !important;
			top: calc(4rem + 0.75rem) !important;
			left: 1rem !important;
			right: auto !important;
			bottom: auto !important;
			z-index: 15;
		}

		@media (min-width: 640px) {
			.hero-cta.is-stuck {
				top: calc(4rem + 0.75rem) !important;
				left: 1.5rem !important;
			}
		}

		.hero-cta {
			transition: opacity 200ms cubic-bezier(0.22, 1, 0.36, 1);
		}

		/* Hero-chrome reveal. The type animation in InteractiveHero runs
		   for ~2.2s on load (width 0–1400ms + height 1100–2200ms). The
		   nav, the signup CTA, and the controls fab all fade in just
		   AFTER the type settles, so the scene reads as the type
		   composing first and the chrome arriving as a follow-up.

		   prefers-reduced-motion gates the animation off so the elements
		   are visible at default opacity:1 for visitors who don't want
		   motion. */
		/* visibility rides along so the nav + waitlist form are NOT
		   keyboard-focusable while invisible (WCAG 2.4.7 — focus must be
		   visible). visibility animates discretely: hidden until the
		   keyframe starts, visible from the first opacity frame on. */
		@keyframes hero-chrome-reveal {
			from {
				opacity: 0;
				visibility: hidden;
			}
			to {
				opacity: 1;
				visibility: visible;
			}
		}

		@media (prefers-reduced-motion: no-preference) {
			.home-nav-wrapper > header,
			.hero-cta,
			.controls-fab {
				animation: hero-chrome-reveal 1400ms cubic-bezier(0.22, 1, 0.36, 1) 6450ms both;
			}
		}

		/* Total animation timeline (matches InteractiveHero's onMount):
		     0 – 650ms      INTRO_HOLD (chars visible at random intro sizes)
		     650 – 3300ms   width cascade (random per-char start, intro → 380)
		     3300 – 3700ms  PHASE_GAP
		     3700 – 6350ms  height cascade (separately random, intro → 142)
		     6450ms+        chrome reveals (nav, signup, controls fab) */

		/* The nav is now sticky (in flow, takes 4rem of vertical space)
		   instead of fixed (overlay). The hero no longer needs a
		   margin-top to avoid being hidden behind a fixed nav — sticky
		   sits above the hero naturally. As the user scrolls, the nav
		   sticks to top:0 and the type passes behind its glass background,
		   preserving the "type going under glass" effect. */
		.hero-viewport {
			position: relative;
			display: grid;
			height: calc(100svh - 4rem);
			min-height: 28rem;
		}

		/* Above-the-fold CTA. Anchored at bottom-left of hero — opposite
		   the controls fab at bottom-right. Just the input + button, no
		   panel chrome around it (no background, no border, no padding,
		   no rounded corners on the form fields). */
		.hero-cta {
			position: absolute;
			bottom: 1rem;
			left: 1rem;
			z-index: 4;
			width: min(22rem, calc(100vw - 5rem));
		}

		/* Square the WaitlistForm's rounded-md (input + submit). Plain
		   CSS in <svelte:head><style> is global, so descendant selectors
		   reach into the component. */
		.hero-cta input,
		.hero-cta button {
			border-radius: 0 !important;
		}

		/* Form layout. column-reverse + gap: 0 so the error message <p>
		   (rendered AFTER the input/button div in DOM order) appears
		   ABOVE the input visually, flush against its top edge. */
		.hero-cta form {
			flex-direction: column-reverse !important;
			gap: 0 !important;
		}

		/* Button-inside-input layout. The form's inner wrapper becomes a
		   positioned context; the email input takes the full width with
		   extra right padding to clear the button's footprint; the submit
		   button absolute-positions flush inside the input's right edge. */
		.hero-cta form > div {
			display: block !important;
			position: relative;
			width: 100%;
		}

		.hero-cta input[type='email'] {
			width: 100%;
			padding-right: 9rem !important;
			min-height: 2.75rem;
			/* Force a solid background. bg-surface alone can read as
			   transparent over the glass-blurred hero behind it. */
			background: hsl(var(--canvas)) !important;
		}

		/* Chrome autofill suppression. When the browser autofills a saved
		   email, it applies a yellow box-shadow inset that overrides the
		   visible bg. Re-applying the canvas color as an inset shadow
		   neutralises it; the giant transition delay prevents Chrome from
		   re-asserting its style after focus. */
		.hero-cta input[type='email']:-webkit-autofill,
		.hero-cta input[type='email']:-webkit-autofill:hover,
		.hero-cta input[type='email']:-webkit-autofill:focus,
		.hero-cta input[type='email']:-webkit-autofill:active {
			-webkit-box-shadow: 0 0 0 30px hsl(var(--canvas)) inset !important;
			-webkit-text-fill-color: var(--fg) !important;
			transition: background-color 5000s ease-in-out 0s;
			caret-color: var(--fg);
		}

		.hero-cta button[type='submit'] {
			position: absolute;
			top: 1px;
			right: 1px;
			bottom: 1px;
		}

		/* Error state. aria-invalid="true" is set on the input when the
		   submission fails. Only the button colour and the alert strip
		   above change — the input's border stays the same neutral stroke
		   as default, so the outline reads as a consistent frame in
		   every state. */
		.hero-cta:has(input[type='email'][aria-invalid='true']) button[type='submit'] {
			background: hsl(var(--danger-strong, 0 65% 45%)) !important;
			color: #fff !important;
		}

		/* Keep the input's border neutral even on focus — the focus ring
		   from Tailwind's focus:ring-2 still signals focus, but the
		   stroke colour stays consistent. */
		.hero-cta input[type='email']:focus,
		.hero-cta input[type='email']:focus-visible {
			border-color: hsl(var(--border)) !important;
		}

		/* Error message — appears ABOVE the input as a flush-top red strip
		   thanks to the column-reverse on the form. Border uses the same
		   neutral stroke as the input (NOT red), so the outline reads as
		   one continuous frame around both the strip and the input. */
		.hero-cta p[role='alert'] {
			margin: 0 !important;
			margin-bottom: -1px !important;
			padding: 0.45rem 0.85rem !important;
			background: hsl(var(--danger-strong, 0 65% 45%)) !important;
			border: 1px solid hsl(var(--border)) !important;
			color: #fff !important;
			font-size: 0.78rem !important;
			font-weight: 500 !important;
			line-height: 1.3 !important;
		}

		/* Success state. WaitlistForm replaces the <form> with a <p> at
		   status==='done'. Same neutral stroke as the default input —
		   only the inside colour signals success. */
		.hero-cta p[role='status'] {
			display: flex !important;
			align-items: center;
			min-height: 2.75rem;
			margin: 0 !important;
			padding: 0.5rem 0.95rem !important;
			border: 1px solid hsl(var(--border)) !important;
			background: hsl(var(--canvas)) !important;
			color: hsl(var(--accent-strong, 142 60% 38%)) !important;
			font-size: 0.92rem !important;
			line-height: 1.3 !important;
		}

		/* Mobile: full-width and slightly above the controls fab. */
		@media (max-width: 640px) {
			.hero-cta {
				bottom: 4rem;
				left: 0.75rem;
				right: 0.75rem;
				width: auto;
			}
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

		/* Disclosure chevron for the audit-families list. Default closed,
		   rotates 90° on open. Tailwind doesn't ship a built-in for
		   [open] state on <details>, so it lives here as scoped CSS. */
		.disclosure-chevron {
			display: inline-block;
			transition: transform 0.2s ease-out;
		}
		details[open] .disclosure-chevron {
			transform: rotate(90deg);
		}
		/* Remove the default marker on all browsers so our chevron is the
		   only indicator (some browsers render the disclosure triangle). */
		.disclosure summary {
			list-style: none;
		}
		.disclosure summary::-webkit-details-marker {
			display: none;
		}
	</style>
	<link rel="canonical" href="https://patens.design/" />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html hreflangLinks('/')}

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
					'A type design tool that teaches as you draw. Sketch glyphs, trace to Bézier, audit your work against 102 type-design rules with plain-English fixes, ship real OpenType. Open source MIT, browser-native.',
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
					'Open-source browser-native type design tool with a 105-code teaching audit module.',
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
					'A type design tool that teaches as you draw. Sketch glyphs, trace to Bézier, audit your work against 102 type-design rules with plain-English fixes, ship real OpenType. The audit module is the spine of the editor — every contour, metric, and kern pair gets checked against rules type designers internalize through years of mentorship, with around 30 codes offering a one-click fix. Open source MIT, browser-native, no installs.',
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

<!-- SiteHeader at the top in its own padded wrapper, full-bleed line. -->
<div class="home-nav-wrapper px-4 sm:px-6 lg:px-8">
	<SiteHeader current="/" lang="en" />
</div>

<!-- Fullwidth hero — type spans viewport edges, sits directly below nav.
     Above-the-fold CTA pinned at bottom-left so visitors can join the
     waitlist without scrolling. Once the user scrolls past the hero the
     same .hero-cta promotes itself to a fixed top-left position via the
     `is-stuck` class (toggled by an IntersectionObserver in onMount),
     so the form is always reachable without ever showing two copies. -->
<section class="hero-viewport">
	<!-- The visible wordmark is drawn by InteractiveHero as SVG animation;
	     screen readers + the document outline need a real h1. -->
	<h1 class="sr-only">Patens — browser-native type design tool with a teaching audit</h1>
	<InteractiveHero />

	<aside
		class="hero-cta"
		class:is-stuck={ctaStuck}
		aria-label="Join the waitlist"
	>
		<WaitlistForm lang="en" />
	</aside>
</section>

<div class="mx-auto max-w-5xl px-4 sm:px-6">

	<main>
		<!-- ====================================================== -->
		<!-- 0. TL;DR — plain-English explainer, sits directly below  -->
		<!--    the hero so the first thing a reader does after the  -->
		<!--    type intro is read what the app actually IS.         -->
		<!-- ====================================================== -->
		<section class="mb-24 pt-16">
			<!-- Story-depth toggle. Each button rewrites the same pitch at a
			     different depth — short / longer / longest. The active one
			     is full-fg; the inactive ones are subtle, hover to muted. -->
			<!-- Plain buttons with aria-pressed, NOT role=tablist/tab: the full
			     tabs pattern requires roving tabindex + arrow keys + linked
			     tabpanels, and a half-implemented tablist reads worse to
			     assistive tech than honest toggle buttons. -->
			<div
				class="mb-6 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[11px] tracking-[0.22em] uppercase"
				role="group"
				aria-label="Pick a depth"
			>
				{#each stories as story (story.key)}
					<button
						type="button"
						aria-pressed={activeStory === story.key}
						onclick={() => (activeStory = story.key)}
						class="cursor-pointer rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
						class:text-fg={activeStory === story.key}
						class:text-fg-subtle={activeStory !== story.key}
						class:hover:text-fg-muted={activeStory !== story.key}
					>
						{story.label}
					</button>
				{/each}
			</div>

			<!-- Story body wrapper. Positioned relative + given a min-height
			     so the swapped paragraphs can sit absolute and cross-fade
			     in place without shifting the sections below. min-h tuned
			     to the longest version at each breakpoint. -->
			<div class="relative min-h-[320px] sm:min-h-[260px]">
				{#key activeStory}
					<div
						class="absolute inset-x-0 top-0"
						in:fade={{ duration: 280, delay: 80, easing: cubicOut }}
						out:fade={{ duration: 200, easing: cubicIn }}
					>
						{#if activeStory === 'tldr'}
							<p
								class="max-w-3xl text-balance text-[22px] leading-[1.4] text-fg sm:text-[30px] sm:leading-[1.3]"
							>
								Patens is a design tool for designing beautiful typefaces
								— with some assistance.
							</p>
						{:else if activeStory === 'longer'}
							<p
								class="max-w-3xl text-balance text-[22px] leading-[1.4] text-fg sm:text-[30px] sm:leading-[1.3]"
							>
								Patens is a type editor with the
								<span class="font-medium text-fg">Patens Method</span>
								built in —
								<span class="font-mono text-fg" data-numeric>{AUDIT_CODE_COUNT}</span>
								practices in plain English, a third with one-click fixes —
								so you can draw, kern, and ship a real
								<span class="font-mono text-fg-muted" data-numeric>.otf</span>
								without an account or an upload.
							</p>
						{:else}
							<p
								class="max-w-3xl text-balance text-[22px] leading-[1.4] text-fg sm:text-[30px] sm:leading-[1.3]"
							>
								A type editor that runs in your browser, with the
								<span class="font-medium text-fg">Patens Method</span>
								built in:
								<span class="font-mono text-fg" data-numeric>{AUDIT_CODE_COUNT}</span>
								typographic practices type designers usually learn the hard
								way, each explained in plain English, about a third with
								one-click fixes. Draw your glyphs, kern your pairs, ship a
								real
								<span class="font-mono text-fg-muted" data-numeric>.otf</span>.
								No account, no upload — every project lives on your machine.
							</p>
						{/if}
					</div>
				{/key}
			</div>
		</section>

		<!-- ====================================================== -->
		<!-- 1. Thirty seconds — the whole pitch, in motion. One     -->
		<!--    unbroken take in the real editor (recorded by        -->
		<!--    scripts/record-demo.mjs per the launch storyboard).  -->
		<!-- ====================================================== -->
		<section class="mb-32 border-t border-border/40 pt-16">
			<div class="mb-12 grid gap-4 sm:grid-cols-[1fr_2fr] sm:items-baseline sm:gap-12">
				<div>
					<p class="font-mono text-[10px] tracking-[0.22em] text-fg-subtle uppercase">
						Proof · 30 seconds
					</p>
					<h2 class="mt-3 text-[28px] tracking-tight text-fg">Watch a glyph happen.</h2>
				</div>
				<p class="text-[15px] leading-relaxed text-fg-muted">
					One unbroken take in the editor: draw a lowercase <span class="font-mono">a</span>,
					trace it to Béziers, let the audit read the result, apply a one-click fix, kern the
					new letter against <span class="font-mono">V</span>, and export an OTF you could
					install right now. No cuts, no speed-ups.
				</p>
			</div>

			<!-- Full-bleed breakout: the prose stays in the max-w-5xl column,
			     the take escapes it. Width is min(almost-viewport-width,
			     the width where an 16:9 frame still fits in ~85% of the
			     viewport HEIGHT) — so it nearly fills the screen on any
			     display without ever cropping. svh, not vh, per mobile
			     browser chrome. -->
			<div class="mx-[calc(50%-50vw)]">
				<figure class="mx-auto w-[min(96vw,calc(85svh*16/9))]">
				<div class="relative overflow-hidden rounded-lg border border-border bg-surface">
					<video
						bind:this={demoVideoEl}
						autoplay
						muted
						loop
						playsinline
						controls={demoReducedMotion}
						preload="metadata"
						poster="/demo/patens-30s-poster.jpg"
						aria-label="Thirty-second screen capture of the Patens editor: drawing, tracing, auditing, kerning, and exporting a glyph"
						class="block aspect-video w-full"
					>
						<source src="/demo/patens-30s.webm" type="video/webm" />
						<source src="/demo/patens-30s.mp4" type="video/mp4" />
						<track kind="captions" src="/demo/patens-30s.en.vtt" srclang="en" label="English" />
					</video>
					{#if !demoReducedMotion}
						<button
							type="button"
							onclick={toggleDemoPlayback}
							class="absolute right-3 bottom-3 rounded-md border border-border bg-canvas/90 px-2.5 py-1.5 font-mono text-[10px] tracking-[0.18em] text-fg-muted uppercase backdrop-blur-sm transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
							aria-pressed={demoUserPaused}
						>
							{demoUserPaused ? 'Play' : 'Pause'}
						</button>
					{/if}
				</div>
				<figcaption
					class="mt-5 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t border-border/40 pt-5 font-mono text-[10px] tracking-[0.18em] text-fg-subtle uppercase"
				>
					<span>One take · 30s · silent</span>
					<span>·</span>
					<span>Draw → trace → audit → fix → kern → export</span>
					<span>·</span>
					<a
						href="/demo/patens-30s.mp4"
						download
						class="text-fg-muted underline decoration-border underline-offset-4 transition-colors hover:text-fg"
					>
						Download MP4
					</a>
				</figcaption>
				</figure>
			</div>
		</section>

		<!-- ====================================================== -->
		<!-- 2. Specimen — what the editor produces                  -->
		<!-- ====================================================== -->
		<section class="mb-32 border-t border-border/40 pt-16">
			<div class="mb-12 grid gap-4 sm:grid-cols-[1fr_2fr] sm:items-baseline sm:gap-12">
				<div>
					<p class="font-mono text-[10px] tracking-[0.22em] text-fg-subtle uppercase">
						Proof · Specimen
					</p>
					<h2
						class="mt-3 text-[28px] tracking-tight text-fg"
						
					>
						What it makes.
					</h2>
				</div>
				<p class="text-[15px] leading-relaxed text-fg-muted">
					Studio Geometric — drawn in Patens, exported by Patens, shipped as the editor's
					demo OTF. It's not a marketing typeface; it's the kind of work the editor produces
					end to end, from a blank canvas to an installable file.
				</p>
			</div>

			<figure class="text-fg">
				<!-- Display word — uses the actual demo OTF. Sticks to letters
				     confirmed in StudioGeometric's charset (P,a,t,e,n,s — same
				     letters the H1 hero uses) so there's no mid-word fallback
				     to a fallback face. The caption stays in mono so its
				     readability doesn't depend on what the OTF ships. -->
				<div
					class="text-[120px] leading-[0.85] tracking-tight sm:text-[180px] md:text-[220px]"
					style="font-family: 'StudioGeometric', ui-serif, Georgia, serif;"
				>
					Patens
				</div>

				<div
					class="mt-8 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t border-border/40 pt-5 font-mono text-[10px] tracking-[0.18em] text-fg-subtle uppercase"
				>
					<span>Studio Geometric · Regular</span>
					<span>·</span>
					<span>162 glyphs · Latin / Cyrillic / Greek</span>
					<span>·</span>
					<span>Drawn in Patens · 2026</span>
				</div>
			</figure>
		</section>

		<!-- ====================================================== -->
		<!-- 3. The audit, in the margin — the showpiece visual      -->
		<!-- ====================================================== -->
		<section class="mb-32 border-t border-border/40 pt-16">
			<div class="mb-12 max-w-3xl">
				<p class="font-mono text-[10px] tracking-[0.22em] text-fg-subtle uppercase">
					The Method · Mentor in the margin
				</p>
				<h2
					class="mt-3 text-[28px] tracking-tight text-fg sm:text-[34px]"
					
				>
					Every glyph gets a margin reading.
				</h2>
				<p class="mt-5 text-[15px] leading-relaxed text-fg-muted">
					Patens runs all 105 rules continuously. When a contour crosses itself, when an
					x-height drifts, when a sidebearing wanders from its class — the audit notes it
					in plain English, beside the glyph, while you draw. Around 30 codes also offer a
					one-click fix; the rest are matters of judgment.
				</p>
			</div>

			<!-- The annotated glyph. On large screens, annotations sit in left
			     + right margins with thin dashed connectors. On small screens
			     the connectors hide and annotations stack below the glyph. -->
			<figure class="relative mx-auto max-w-3xl">
				<!-- Connector lines, large-screen only. viewBox is a fixed 600×500
				     box; the absolute positioning matches the grid below. -->
				<svg
					class="pointer-events-none absolute inset-0 hidden h-full w-full text-fg-subtle sm:block"
					viewBox="0 0 600 500"
					preserveAspectRatio="none"
					aria-hidden="true"
				>
					<line
						x1="170"
						y1="80"
						x2="280"
						y2="200"
						stroke="currentColor"
						stroke-width="0.5"
						stroke-dasharray="2,3"
						opacity="0.55"
					/>
					<line
						x1="430"
						y1="80"
						x2="320"
						y2="200"
						stroke="currentColor"
						stroke-width="0.5"
						stroke-dasharray="2,3"
						opacity="0.55"
					/>
					<line
						x1="170"
						y1="420"
						x2="280"
						y2="320"
						stroke="currentColor"
						stroke-width="0.5"
						stroke-dasharray="2,3"
						opacity="0.55"
					/>
					<line
						x1="430"
						y1="420"
						x2="320"
						y2="320"
						stroke="currentColor"
						stroke-width="0.5"
						stroke-dasharray="2,3"
						opacity="0.55"
					/>
				</svg>

				<div class="grid grid-cols-1 gap-8 sm:grid-cols-[1fr_2fr_1fr] sm:gap-6">
					<!-- Top-left annotation -->
					<aside class="sm:text-right">
						<p class="mb-1 font-mono text-[10px] tracking-wider text-accent-strong uppercase">
							{annotations[0].code}
						</p>
						<p class="text-[12px] leading-snug text-fg-muted">{annotations[0].body}</p>
					</aside>

					<!-- Center glyph — spans both rows on desktop -->
					<div class="grid place-items-center sm:row-span-2">
						<span
							class="text-[260px] leading-[0.85] text-fg sm:text-[320px]"
							style="font-family: 'StudioGeometric', ui-serif, Georgia, serif;"
							aria-label="The letter a, the example glyph being audited"
						>
							a
						</span>
					</div>

					<!-- Top-right annotation -->
					<aside class="sm:text-left">
						<p class="mb-1 font-mono text-[10px] tracking-wider text-accent-strong uppercase">
							{annotations[1].code}
						</p>
						<p class="text-[12px] leading-snug text-fg-muted">{annotations[1].body}</p>
					</aside>

					<!-- Bottom-left annotation -->
					<aside class="sm:text-right">
						<p class="mb-1 font-mono text-[10px] tracking-wider text-accent-strong uppercase">
							{annotations[2].code}
						</p>
						<p class="text-[12px] leading-snug text-fg-muted">{annotations[2].body}</p>
					</aside>

					<!-- Bottom-right annotation -->
					<aside class="sm:text-left">
						<p class="mb-1 font-mono text-[10px] tracking-wider text-accent-strong uppercase">
							{annotations[3].code}
						</p>
						<p class="text-[12px] leading-snug text-fg-muted">{annotations[3].body}</p>
					</aside>
				</div>

				<figcaption class="mt-10 text-center font-mono text-[10px] tracking-[0.18em] text-fg-subtle uppercase">
					Live from <code class="text-fg">describeAuditCode()</code> — one dictionary, five surfaces
				</figcaption>
			</figure>

			<!-- The systematic backup: 3 audit-code cards (kept from the
			     previous teaser, retitled). The annotated glyph is the
			     visual; these are the system underneath. -->
			<div class="mt-20 grid gap-6 sm:grid-cols-3">
				<article class="flex flex-col gap-3 border-t border-border/40 pt-5">
					<h3 class="font-mono text-[12px] text-accent-strong">self-intersecting</h3>
					<p class="text-[14px] leading-relaxed text-fg-muted">
						A contour crosses itself. Rasterisers fill the overlap unpredictably depending
						on fill-rule (even-odd vs non-zero).
					</p>
					<div class="mt-auto">
						<span
							class="inline-flex items-baseline gap-1.5 rounded-none bg-accent-soft px-2 py-1 text-[11px] font-medium text-accent-strong"
						>
							<span aria-hidden="true">✓</span>
							One-click Fix
						</span>
					</div>
				</article>

				<article class="flex flex-col gap-3 border-t border-border/40 pt-5">
					<h3 class="font-mono text-[12px] text-accent-strong">xheight-misaligned</h3>
					<p class="text-[14px] leading-relaxed text-fg-muted">
						A lowercase letter that should reach x-height is sitting noticeably below it.
						Uneven tops across letters give text a wobbly rhythm; consistent x-height
						alignment is what makes type read smoothly.
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
						This glyph's LSB has drifted from the median of its sidebearing-class peers.
						Either re-apply the class or remove this glyph from it.
					</p>
					<div class="mt-auto">
						<span class="inline-flex items-baseline gap-1.5 text-[11px] font-medium text-fg-muted">
							Designer judgment
						</span>
					</div>
				</article>
			</div>

			<p class="mt-10 text-[13px] text-fg-muted">
				<a
					href="/audit"
					class="group inline-flex items-baseline gap-1.5 font-medium text-accent-strong hover:underline"
				>
					Read the Method
					<span class="transition-transform group-hover:translate-x-0.5">→</span>
				</a>
				<span class="ml-3 text-fg-subtle">
					· <a href="/learn/audit-codes" class="hover:text-fg">Full reference (105 codes)</a> · Also
					from the terminal:
					<code class="font-mono text-fg">npx patens audit</code>
				</span>
			</p>
		</section>

		<!-- ====================================================== -->
		<!-- 4. The editor — stylized mock of the editing surface    -->
		<!-- ====================================================== -->
		<section class="mb-32 border-t border-border/40 pt-16">
			<div class="mb-10 grid gap-4 sm:grid-cols-[1fr_2fr] sm:items-baseline sm:gap-12">
				<div>
					<p class="font-mono text-[10px] tracking-[0.22em] text-fg-subtle uppercase">
						Interface · Where you'll work
					</p>
					<h2
						class="mt-3 text-[28px] tracking-tight text-fg"
						
					>
						One tab. No install. No account.
					</h2>
				</div>
				<p class="text-[15px] leading-relaxed text-fg-muted">
					Patens runs entirely in the browser. Projects live in your IndexedDB; nothing
					leaves the machine unless you choose to share. The audit panel sits to the right
					of the canvas and updates as you draw.
				</p>
			</div>

			<!-- Stylized editor mock. Three columns: glyph browser · canvas ·
			     audit panel. Monochrome, rule-based, no shadows — matches the
			     real editor's restrained chrome. -->
			<div
				class="overflow-hidden rounded-none border border-border/60 bg-surface"
				aria-label="Stylized editor interface"
			>
				<!-- Top chrome -->
				<div
					class="flex items-baseline justify-between border-b border-border/60 px-4 py-2.5 text-[11px]"
				>
					<div class="flex items-baseline gap-3">
						<span class="font-mono font-medium text-fg">patens</span>
						<span class="text-fg-subtle">·</span>
						<span
							class="text-fg"
							
						>
							Studio Geometric
						</span>
						<span class="hidden text-fg-subtle sm:inline">· saved 2 min ago</span>
					</div>
					<div class="flex items-baseline gap-3 font-mono uppercase tracking-wider text-fg-subtle text-[10px]">
						<span class="hidden sm:inline">brief</span>
						<span class="hidden sm:inline">spacing</span>
						<span class="hidden sm:inline">features</span>
						<span class="hidden sm:inline">release</span>
						<span>export</span>
					</div>
				</div>

				<!-- Body: 3 columns -->
				<div class="grid min-h-[300px] grid-cols-[88px_1fr_180px] sm:min-h-[360px] sm:grid-cols-[120px_1fr_240px]">
					<!-- Glyph browser strip -->
					<div class="border-r border-border/60 p-3">
						<p class="mb-3 font-mono text-[9px] uppercase tracking-wider text-fg-subtle">
							Glyphs · 162
						</p>
						<div class="grid grid-cols-3 gap-1 text-[14px] text-fg-muted font-mono">
							{#each ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'] as ch (ch)}
								<div
									class="grid aspect-square place-items-center rounded-none {ch === 'a'
										? 'bg-accent-soft text-accent-strong font-medium'
										: ''}"
								>
									{ch}
								</div>
							{/each}
						</div>
					</div>

					<!-- Canvas -->
					<div class="relative grid place-items-center bg-canvas">
						<!-- Faint baseline + x-height rules for the type-grid feel -->
						<div
							class="absolute inset-x-8 top-[18%] border-t border-dashed border-fg-subtle/15"
							aria-hidden="true"
						></div>
						<div
							class="absolute inset-x-8 top-[34%] border-t border-dashed border-fg-subtle/15"
							aria-hidden="true"
						></div>
						<div
							class="absolute inset-x-8 bottom-[18%] border-t border-fg-subtle/25"
							aria-hidden="true"
						></div>
						<span
							class="relative z-10 text-[140px] leading-[0.85] text-fg sm:text-[200px]"
							style="font-family: 'StudioGeometric', ui-serif, Georgia, serif;"
						>
							a
						</span>
					</div>

					<!-- Audit panel -->
					<div class="border-l border-border/60 p-3 text-[11px]">
						<p class="mb-3 flex items-baseline justify-between font-mono uppercase tracking-wider">
							<span class="text-fg-subtle">Audit</span>
							<span class="text-fg-subtle">4</span>
						</p>
						<ul class="space-y-3">
							<li>
								<div class="flex items-center gap-1.5">
									<span class="size-1.5 bg-accent" aria-hidden="true"></span>
									<span class="font-mono text-fg">near-collinear-points</span>
								</div>
								<p class="ml-3 mt-0.5 text-fg-muted">contour 1, points 4–6</p>
							</li>
							<li>
								<div class="flex items-center gap-1.5">
									<span class="size-1.5 bg-fg-subtle" aria-hidden="true"></span>
									<span class="font-mono text-fg">xheight-overshoot</span>
								</div>
								<p class="ml-3 mt-0.5 text-fg-muted">+14u above x-height</p>
							</li>
							<li>
								<div class="flex items-center gap-1.5">
									<span class="size-1.5 bg-accent" aria-hidden="true"></span>
									<span class="font-mono text-fg">aperture-asymmetric</span>
								</div>
								<p class="ml-3 mt-0.5 text-fg-muted">right side −6u</p>
							</li>
							<li>
								<div class="flex items-center gap-1.5">
									<span class="size-1.5 bg-accent" aria-hidden="true"></span>
									<span class="font-mono text-fg">stem-thickness</span>
								</div>
								<p class="ml-3 mt-0.5 text-fg-muted">+8% bottom downstroke</p>
							</li>
						</ul>
						<button
							type="button"
							disabled
							class="mt-5 w-full cursor-default rounded-none border border-border bg-canvas py-1.5 font-mono text-[9px] uppercase tracking-wider text-fg"
						>
							Fix · 3 of 4
						</button>
					</div>
				</div>
			</div>

			<p class="mt-4 font-mono text-[10px] tracking-[0.18em] text-fg-subtle uppercase">
				Editor surface — actual layout. Findings are real audit codes.
			</p>
		</section>

		<!-- ====================================================== -->
		<!-- 5. The 105 — 9 families with <details> expansion         -->
		<!-- ====================================================== -->
		<section class="mb-32 border-t border-border/40 pt-16">
			<div class="mb-10 max-w-3xl">
				<p class="font-mono text-[10px] tracking-[0.22em] text-fg-subtle uppercase">
					What the audit checks · 9 families, 105 rules
				</p>
				<h2
					class="mt-3 text-[28px] tracking-tight text-fg"
					
				>
					Contour to brief, everything reads.
				</h2>
				<p class="mt-5 text-[15px] leading-relaxed text-fg-muted">
					The 105 codes group into nine families. Each one runs continuously; each one has
					plain-English prose attached. Click to expand a family — the codes inside are the
					actual checks running against every glyph as you draw.
				</p>
			</div>

			<ul class="border-t border-border/40">
				{#each families as f, i (f.name)}
					<li class="border-b border-border/40">
						<details class="disclosure group">
							<summary
								class="flex cursor-pointer items-baseline gap-4 py-5 transition-colors hover:bg-surface-2/40"
							>
								<span
									class="font-mono text-[11px] tracking-wider text-fg-subtle tabular-nums"
									data-numeric
								>
									{String(i + 1).padStart(2, '0')}
								</span>
								<span
									class="flex-1 text-[18px] tracking-tight text-fg sm:text-[20px]"
									
								>
									{f.name}
								</span>
								<span class="font-mono text-[11px] text-fg-subtle tabular-nums" data-numeric>
									{f.count} codes
								</span>
								<span
									class="disclosure-chevron font-mono text-[12px] text-fg-subtle"
									aria-hidden="true"
								>
									›
								</span>
							</summary>
							<div class="pb-6 pl-10 pr-4 sm:pl-14">
								<p class="text-[13px] leading-relaxed text-fg-muted">{f.description}</p>
								<p class="mt-3 font-mono text-[11px] text-accent-strong">
									{f.examples}
								</p>
							</div>
						</details>
					</li>
				{/each}
			</ul>

			<p class="mt-8 text-[13px] text-fg-muted">
				<a
					href="/learn/audit-codes"
					class="font-medium text-accent-strong hover:underline"
				>
					Full reference — every code, every description →
				</a>
			</p>
		</section>

		<!-- ====================================================== -->
		<!-- 6. Compared to the field                                -->
		<!-- ====================================================== -->
		<section class="mb-32 border-t border-border/40 pt-16">
			<div class="mb-10 grid gap-4 sm:grid-cols-[1fr_2fr] sm:items-baseline sm:gap-12">
				<div>
					<p class="font-mono text-[10px] tracking-[0.22em] text-fg-subtle uppercase">
						Compared · Where Patens fits
					</p>
					<h2
						class="mt-3 text-[28px] tracking-tight text-fg"
						
					>
						Among the rest of the field.
					</h2>
				</div>
				<p class="text-[15px] leading-relaxed text-fg-muted">
					Most rows in a font-editor comparison are tied — every modern editor draws
					Béziers and exports OpenType. These are the rows where Patens is different.
				</p>
			</div>

			<div class="-mx-4 overflow-x-auto sm:mx-0">
				<table class="min-w-full border-y border-border/40 text-left text-[13px]">
					<thead>
						<tr class="border-b border-border/40">
							<th class="py-4 pr-4 font-mono text-[10px] uppercase tracking-wider text-fg-subtle font-normal">
								Feature
							</th>
							{#each compareTools as t (t.name)}
								<th
									class="px-3 py-4 text-center font-mono text-[10px] uppercase tracking-wider font-normal whitespace-nowrap {t.name ===
									'Patens'
										? 'text-fg'
										: 'text-fg-subtle'}"
								>
									{#if t.url}
										<a
											href={t.url}
											target="_blank"
											rel="noopener noreferrer"
											class="underline-offset-4 hover:text-fg hover:underline focus-visible:underline"
										>
											{t.name}
										</a>
									{:else}
										{t.name}
									{/if}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each compareRows as row (row.label)}
							<tr class="border-b border-border/40 last:border-b-0">
								<th
									class="py-4 pr-4 text-left font-medium text-fg font-normal align-baseline whitespace-nowrap"
									scope="row"
								>
									{row.label}
								</th>
								{#each row.values as cell, i (i)}
									<td
										class="px-3 py-4 text-center align-baseline whitespace-nowrap {i === 0
											? 'text-fg font-medium'
											: 'text-fg-muted'}"
									>
										{#if cell === true}
											<span class="text-accent-strong" aria-label="yes">✓</span>
										{:else if cell === false}
											<span class="text-fg-subtle" aria-label="no">—</span>
										{:else if cell === 'partial'}
											<span
												class="font-mono text-[10px] uppercase tracking-wider text-fg-subtle"
												aria-label="partial"
											>
												partial
											</span>
										{:else}
											<span class="font-mono text-[12px]">{cell}</span>
										{/if}
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<p class="mt-6 text-[13px] text-fg-muted">
				<a href="/compare" class="font-medium text-accent-strong hover:underline">
					Read the full comparison — 26 rows, 9 tools →
				</a>
			</p>
		</section>

		<!-- ====================================================== -->
		<!-- 7. Closing — signed-off line only. The repeat waitlist  -->
		<!--    CTA that used to live here is gone; the sticky       -->
		<!--    hero-cta (top-left after scroll) carries the signup. -->
		<!-- ====================================================== -->
		<section class="mb-24 border-t border-border/40 pt-16">
			<p class="max-w-xl text-[13px] leading-relaxed text-fg-muted">
				— Alejandro, maker · with audit notes
				<span class="text-fg-subtle"> · </span>
				<a href="/about" class="underline-offset-4 hover:text-fg hover:underline">
					more about who, why, and what's under the hood
				</a>
			</p>
		</section>
	</main>

	<SiteFooter lang="en" />
</div>
