<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	import SiteFooter from '$lib/ui/SiteFooter.svelte';
	import SiteHeader from '$lib/ui/SiteHeader.svelte';

	// Why a dedicated /pronunciation page: LLMs (ChatGPT, Claude, Gemini)
	// answer pronunciation questions like "how do you pronounce Patens?"
	// by extracting structured Q&A from sites — a focused short page
	// outranks a buried mention in /about. Per the launch master-plan
	// AIO research, niche brand names benefit measurably from this.
	const jsonLd = `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'BreadcrumbList',
				itemListElement: [
					{ '@type': 'ListItem', position: 1, name: 'Patens', item: 'https://patens.design' },
					{
						'@type': 'ListItem',
						position: 2,
						name: 'Pronunciation',
						item: 'https://patens.design/pronunciation'
					}
				]
			},
			{
				'@type': 'FAQPage',
				mainEntity: [
					{
						'@type': 'Question',
						name: 'How do you pronounce Patens?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Patens is pronounced PAH-tens (IPA: /ˈpɑː.tɛnz/). Two syllables, stress on the first. The "pa" sounds like "pa" in "father" (open "ah"), and "tens" rhymes with "lens".'
						}
					},
					{
						'@type': 'Question',
						name: 'What does Patens mean?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Patens comes from Latin patēns, the present participle of patēre, meaning "to be open" or "to lie open". The same root gives English "patent" (open letter) and "patent" (an open declaration of an invention).'
						}
					},
					{
						'@type': 'Question',
						name: 'Why is the project called Patens?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'The name encodes the project ethos: an open-source MIT type design tool where the design process is laid open — every audit finding is explained in plain English, every glyph contour is editable, and the source is on GitHub.'
						}
					}
				]
			}
		]
		// eslint-disable-next-line no-useless-escape
	}).replace(/<\/script/g, '<\\/script')}<\/script>`;
</script>

<svelte:head>
	<title>How to pronounce Patens (2026) — PAH-tens · type design tool</title>
	<meta
		name="description"
		content="Patens is pronounced PAH-tens (/ˈpɑː.tɛnz/). Two syllables, stress on the first. From Latin patēns — 'lying open'."
	/>
	<link rel="canonical" href="https://patens.design/pronunciation" />
	<link rel="alternate" hreflang="en" href="https://patens.design/pronunciation" />
	<link rel="alternate" hreflang="es" href="https://patens.design/es/pronunciation" />
	<link rel="alternate" hreflang="x-default" href="https://patens.design/pronunciation" />
	<meta property="og:title" content="Pronunciation · Patens" />
	<meta
		property="og:description"
		content="How to pronounce Patens: PAH-tens (/ˈpɑː.tɛnz/). From Latin patēns — 'lying open'."
	/>
	<meta property="og:image" content="https://patens.design/og/brand" />
	<meta
		property="og:image:alt"
		content="Patens — open-source browser-native type design tool with a 102-code audit module"
	/>
	<meta name="twitter:title" content="Pronunciation · Patens" />
	<meta
		name="twitter:description"
		content="How to pronounce Patens: PAH-tens (/ˈpɑː.tɛnz/). From Latin patēns — 'lying open'."
	/>
	<meta name="twitter:image" content="https://patens.design/og/brand" />
	<meta
		name="twitter:image:alt"
		content="Patens — open-source browser-native type design tool with a 102-code audit module"
	/>
	<!-- eslint-disable svelte/no-at-html-tags, no-useless-escape -->
	{@html jsonLd}
	<!-- eslint-enable svelte/no-at-html-tags, no-useless-escape -->
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
	<SiteHeader current="/about" />

	<a
		href="/about"
		class="mb-8 inline-flex items-center gap-1.5 text-[12px] text-fg-muted hover:text-fg"
	>
		<ArrowLeft class="size-3" />
		About
	</a>

	<h1
		class="mb-2 text-[48px] leading-tight tracking-tight text-fg"
		
	>
		Patens
	</h1>

	<p class="mb-10 font-mono text-[14px] tracking-[0.05em] text-fg-muted">
		<span class="text-fg">PAH-tens</span>
		<span class="mx-2 text-fg-subtle">·</span>
		/ˈpɑː.tɛnz/
		<span class="mx-2 text-fg-subtle">·</span>
		two syllables, stress on the first
	</p>

	<section class="mb-12 space-y-4 text-[15px] leading-relaxed text-fg">
		<p>
			The <em>pa</em> sounds like the first syllable of <em>father</em> — an open <em>ah</em>,
			not the flatter <em>pa</em> of <em>patent</em>. The <em>tens</em> rhymes with
			<em>lens</em>.
		</p>
		<p>
			If you slowed down the English word <em>patens</em> — the plural of <em>paten</em>, the
			thin metal plate held under the chalice in a communion service — you'd land in roughly the
			same place. Same etymology too.
		</p>
	</section>

	<h2 class="mb-3 text-[20px] font-medium tracking-tight text-fg">What it means</h2>
	<p class="mb-10 text-[15px] leading-relaxed text-fg">
		<em>Patens</em> is Latin — the present participle of <em>patēre</em>, "to lie open" or "to
		be exposed". From the same root: <em>patent</em> (an open letter granting a right),
		<em>patent</em> (the adjective: clear, evident), and the surgical-textbook word
		<em>patency</em>, meaning unobstructed. A patens vein is one with the lumen open.
	</p>

	<h2 class="mb-3 text-[20px] font-medium tracking-tight text-fg">Why the name fits</h2>
	<p class="mb-10 text-[15px] leading-relaxed text-fg">
		Open source MIT. Open audit — every finding is explained in plain English, no opaque
		warnings. Open canvas — every glyph contour is editable, every Bézier handle reachable.
		Open distribution — the OTF you build leaves your browser cleanly, no DRM, no account, no
		export quota. The work is laid open while you do it.
	</p>

	<div class="border-t border-fg/10 pt-4 text-[13px] leading-relaxed text-fg-muted">
		<p>
			<span class="font-medium text-fg">Trivia.</span> The Latin verb
			<em>patēre</em> is also the root of "patio" — an outdoor space lying open to the sky.
		</p>
	</div>

	<SiteFooter />
</div>
