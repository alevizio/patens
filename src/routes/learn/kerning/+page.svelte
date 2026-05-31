<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	import SiteFooter from '$lib/ui/SiteFooter.svelte';
	import SiteHeader from '$lib/ui/SiteHeader.svelte';
	type Step = { n: number; title: string; body: string; hint?: string };

	const steps: Step[] = [
		{
			n: 1,
			title: 'What kerning is, and what it isn\'t',
			body: 'Kerning is the per-pair adjustment to the space between two specific glyphs. It\'s distinct from sidebearings (the default space on each side of a glyph) and from tracking (uniform spacing applied across a run of text). Sidebearings give you the right space most of the time; kerning handles the pairs where the sidebearings of two letters happen to look wrong next to each other — most famously AV, To, We, Yo. A negative kern pulls the pair closer; a positive kern pushes them apart.',
			hint: 'The mental model: sidebearings are the bulk of your spacing work. Kerning is the local repair shop.'
		},
		{
			n: 2,
			title: 'Why class-based kerning matters',
			body: 'A 100-glyph Latin font has ~10,000 possible pairs. Authoring every pair by hand is hours of work and produces a brittle table. Class-based kerning groups glyphs that behave the same way into named classes (e.g. "A-group" contains A À Á Â Ã Ä Å Ā Ă Ą), defines kerns at the class level, and lets the editor expand them to per-pair values on export. Edit the class kern once, every member inherits.',
			hint: 'Patens audit code kerning-no-classes fires when a project has pairs but no classes — it\'s rarely the right shape for a real shipping font.'
		},
		{
			n: 3,
			title: 'Setting up your first classes',
			body: 'Open the Spacing tab → Kerning panel. Create a class with a descriptive name (uppercase A-group, lowercase o-group, period-group). Add the glyphs that share the same kerning behavior — for uppercase, that\'s usually the base letter plus all its accented variants. The class is "left-side" if it sits to the left of a kern pair (Ax) and "right-side" if it sits to the right (xA). Many letters belong to both kinds of classes; that\'s expected.',
			hint: 'A class with only one member (kerning-class-singleton) usually means you meant to add more glyphs but stopped. Either delete it or fill it in.'
		},
		{
			n: 4,
			title: 'Writing the pairs',
			body: 'A pair is two sides — a left glyph or class, a right glyph or class — and a kerning value in font units. Patens supports four combinations: glyph + glyph (literal pair), glyph + class (left-letter against right-class), class + glyph, and class + class. The editor resolves the most specific match first, so a literal-pair kern always wins over a class-class fallback.',
			hint: 'Use class-class for the bulk of your kerning. Reach for literal-pair kerns only when one specific combination needs a different value than its class would imply.'
		},
		{
			n: 5,
			title: 'How much to kern',
			body: 'Kerning is measured in font units, where 1000 fu = 1 em. Modest kerns are 10-50 fu. Aggressive kerns are 80-150 fu. Anything past 200 fu is almost certainly a sign your sidebearings need work, not a kern. Patens flags this with the kerning-extreme audit code — when a kern is more than 15% of the em, the editor surfaces it so you can decide whether it\'s really needed.',
			hint: 'If you find yourself wanting to kern a pair by 300 fu, look at the sidebearings of both glyphs first. The fix is usually upstream.'
		},
		{
			n: 6,
			title: 'Test in real strings, not in a kerning grid',
			body: 'Kerning grids (a/b/c… × a/b/c…) are great for systematic coverage but terrible for visual calibration. Kerning lives in the rhythm of real words. Patens\'s Preview tab shows live HarfBuzz-shaped text — type the words your font will actually set, look at the joins, kern by eye. Foundry-grade pangrams (Hamburgefonts, "The quick brown fox") are starting points; real client copy is the final test.',
			hint: 'Cmd+Shift+P opens Preview. Try the strings you suspect will be hard first (To, AV, We) — many kerns reveal themselves in 30 seconds of real text.'
		},
		{
			n: 7,
			title: 'Family-wide kerning',
			body: 'In a multi-style family, kerning often holds across siblings: if Te kerns by -45 in Regular, Te in Italic probably wants -45 too. Patens supports family-wide kerning (defined once at the family level, inherited by every sibling) with per-sibling overrides where needed. The Family hub at /family/[id] shows the family-wide table; opening a sibling shows the inherited value alongside any local override.',
			hint: 'Start at the family level. Override only when a sibling\'s spacing differs enough that the family-wide value reads wrong.'
		},
		{
			n: 8,
			title: 'When the kerning panel is empty but feature-kern is on',
			body: 'OpenType supports a kerning feature (kern) that\'s enabled by default in browsers. If feature-kern is on in your project but the kerning table is empty, the file ships an "intent to kern" with no actual data. Patens flags this with feature-kern-disabled-with-pairs (the inverse — pairs present but the feature toggled off — also fires). Either disable feature-kern explicitly for the project, or add the pairs you intended.',
			hint: 'The pre-flight check on the Release tab runs both directions of this audit before export.'
		},
		{
			n: 9,
			title: 'Exporting kerning',
			body: 'On export, Patens compiles class-based kerns into the OpenType kern feature. The output table preserves your classes as GPOS lookup type 2 (pair adjustment) with class definitions in the format the rest of the OT pipeline expects. Browser renderers, Adobe apps, and InDesign all honor the kerning correctly. macOS Font Book\'s preview is the one place that occasionally renders kerning oddly — that\'s a Font Book bug, not yours.',
			hint: 'Test the exported OTF in the actual target app (browser, InDesign) before assuming a kern doesn\'t work. Font Book is not the ground truth.'
		}
	];

	const jsonLd = `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'HowTo',
				name: 'How to kern a font in the browser with Patens',
				description:
					'A 9-step walkthrough of kerning in Patens — sidebearings vs kerning, class-based kerning, family-wide kerning, the audit codes that catch common mistakes.',
				step: steps.map((s) => ({
					'@type': 'HowToStep',
					position: s.n,
					name: s.title,
					text: s.body
				})),
				totalTime: 'PT30M',
				supply: [{ '@type': 'HowToSupply', name: 'A drawn typeface in Patens' }],
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
						name: 'Kerning',
						item: 'https://patens.design/learn/kerning'
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
	<title>How to kern a font in the browser (2026) — Patens tutorial</title>
	<meta
		name="description"
		content="The Patens guide to kerning — sidebearings vs kerning, class-based kerning, when to use class-class vs literal-pair, family-wide kerning, the audit codes that catch common mistakes. Browser-native, no installs."
	/>
	<link rel="canonical" href="https://patens.design/learn/kerning" />
	<meta property="og:title" content="How to kern a font in the browser — Patens tutorial" />
	<meta
		property="og:description"
		content="A 9-step walkthrough of kerning in Patens — sidebearings vs kerning, class-based kerning, family-wide propagation."
	/>
	<meta property="og:image" content="https://patens.design/og/brand" />
	<meta property="og:image:alt" content="Patens — open-source browser-native type design tool with a 99-code audit module" />
	<meta name="twitter:title" content="How to kern a font in the browser" />
	<meta name="twitter:description" content="9-step Patens guide to class-based kerning." />
	<meta name="twitter:image" content="https://patens.design/og/brand" />
	<meta name="twitter:image:alt" content="Patens — open-source browser-native type design tool with a 99-code audit module" />
	<!-- eslint-disable svelte/no-at-html-tags, no-useless-escape -->
	{@html jsonLd}
	<!-- eslint-enable svelte/no-at-html-tags, no-useless-escape -->
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
	<SiteHeader current="/learn/kerning" />

	<a
		href="/learn"
		class="mb-8 inline-flex items-center gap-1.5 text-[12px] text-fg-muted hover:text-fg"
	>
		<ArrowLeft class="size-3" />
		Back to learn
	</a>

	<p class="mb-2 text-[13px] uppercase tracking-[0.18em] text-fg-subtle">
		Guide · 9 steps · ~30 min
	</p>

	<h1
		class="mb-6 text-[36px] leading-tight tracking-tight text-fg"
		
	>
		Kerning.
	</h1>

	<p class="mb-6 text-[15px] leading-relaxed text-fg-muted">
		<strong class="font-semibold text-fg">Kerning is the per-pair adjustment to the
		space between two specific glyphs.</strong>
		Distinct from sidebearings (the default space on each side of a glyph)
		and from tracking (uniform spacing across a run). This guide covers
		Patens's class-based kerning system, what makes a good pair vs a bad
		pair, and the audit codes that catch common mistakes.
	</p>

	<p class="mb-12 text-[14px] leading-relaxed text-fg-muted">
		Patens supports class-based kerning, family-wide kerning, and the
		full OpenType kern feature on export. The editor's Spacing tab is
		where you'll spend most of this work; the Preview tab is where you'll
		check that it reads right.
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
		The <a href="/learn/audit-codes#opentype-features" class="text-accent-strong underline underline-offset-2">audit-codes reference</a>
		documents the eleven kerning-related codes Patens emits. The
		<a href="/learn/first-font" class="text-accent-strong underline underline-offset-2">first-font tutorial</a>
		covers the broader workflow that kerning sits inside. And the
		<a href="/learn/opentype-features" class="text-accent-strong underline underline-offset-2">OpenType features guide</a>
		explains how the kern feature interacts with the other features your
		font may ship.
	</p>

	<p class="mt-12 text-[14px] text-fg-muted">
		Patens is in private alpha.
		<a href="/" class="text-accent-strong underline underline-offset-2">Request an invite →</a>
	</p>
	<SiteFooter />
</div>
