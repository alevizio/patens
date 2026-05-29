<script lang="ts">
	import SiteHeader from '$lib/ui/SiteHeader.svelte';
	import SiteFooter from '$lib/ui/SiteFooter.svelte';
	import type { PageData } from './$types';

	type Props = { data: PageData };
	let { data }: Props = $props();
	const rule = $derived(data.rule);
	const peers = $derived(data.peers);

	// JSON-LD: a single page emits both DefinedTerm (so the rule shows
	// up in glossary-style LLM grounding) and TechArticle (so the
	// description text is indexed as the article body). The two reference
	// each other via @id so a crawler that hits either schema knows the
	// other is on the same page.
	const ruleUrl = $derived(`https://patens.design/audit/${rule.code}`);
	const jsonLd = $derived(
		JSON.stringify({
			'@context': 'https://schema.org',
			'@graph': [
				{
					'@type': 'DefinedTerm',
					'@id': `${ruleUrl}#term`,
					name: rule.title,
					alternateName: rule.code,
					description: rule.description,
					termCode: rule.code,
					inDefinedTermSet: {
						'@type': 'DefinedTermSet',
						'@id': 'https://patens.design/audit#term-set',
						name: 'Patens audit rules',
						description:
							'Plain-English type-design rules surfaced by the Patens audit module.',
						url: 'https://patens.design/audit'
					},
					subjectOf: { '@id': `${ruleUrl}#article` }
				},
				{
					'@type': 'TechArticle',
					'@id': `${ruleUrl}#article`,
					headline: rule.title,
					description: rule.description,
					url: ruleUrl,
					inLanguage: 'en',
					about: { '@id': `${ruleUrl}#term` },
					articleSection: rule.category,
					author: {
						'@type': 'Person',
						name: 'Alejandro Vizio',
						url: 'https://patens.design/about'
					},
					publisher: {
						'@type': 'Organization',
						name: 'Patens',
						url: 'https://patens.design/'
					},
					isPartOf: {
						'@type': 'CollectionPage',
						'@id': 'https://patens.design/audit#collection',
						name: 'Patens audit rules',
						url: 'https://patens.design/audit'
					}
				},
				{
					'@type': 'BreadcrumbList',
					itemListElement: [
						{
							'@type': 'ListItem',
							position: 1,
							name: 'Home',
							item: 'https://patens.design/'
						},
						{
							'@type': 'ListItem',
							position: 2,
							name: 'Audit',
							item: 'https://patens.design/audit'
						},
						{
							'@type': 'ListItem',
							position: 3,
							name: rule.title,
							item: ruleUrl
						}
					]
				}
			]
		})
	);

	// Short SEO description — first sentence + category breadcrumb so
	// SERP snippets read cleanly.
	const seoDescription = $derived(
		`${rule.description} Category: ${rule.category}. One of ${data.totalRules} audit rules in Patens — an open-source, browser-native type design tool.`
	);
</script>

<svelte:head>
	<title>{rule.title} · Patens audit</title>
	<meta name="description" content={seoDescription} />
	<link rel="canonical" href={ruleUrl} />
	<meta property="og:title" content={`${rule.title} · Patens audit`} />
	<meta property="og:description" content={rule.description} />
	<meta property="og:url" content={ruleUrl} />
	<meta property="og:type" content="article" />
	<meta property="article:section" content={rule.category} />
	<meta name="twitter:title" content={`${rule.title} · Patens audit`} />
	<meta name="twitter:description" content={rule.description} />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags, no-useless-escape -->
	{@html `<script type="application/ld+json">${jsonLd}<\/script>`}
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-6 sm:px-6">
	<SiteHeader current="/audit" />

	<nav aria-label="Breadcrumb" class="mt-2 font-mono text-[11px] text-fg-subtle">
		<a
			href="/audit"
			class="rounded-sm underline-offset-[5px] hover:text-fg hover:underline focus-visible:outline-none focus-visible:text-fg focus-visible:underline"
		>
			Audit
		</a>
		<span aria-hidden="true" class="px-1.5">/</span>
		<span class="text-fg-muted">{rule.category}</span>
	</nav>

	<article class="mt-6">
		<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
			<h1
				class="text-[clamp(28px,5vw,44px)] leading-[1.1] tracking-tight text-fg"
				style="font-family: 'Hoefler Text', ui-serif, Georgia, 'Times New Roman', serif;"
			>
				{rule.title}
			</h1>
			{#if rule.fixable}
				<span
					class="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent-soft px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent-strong"
					title="Patens has a one-click Fix button for this rule in the editor"
				>
					Auto-fix
				</span>
			{/if}
		</div>

		<p class="mt-3 font-mono text-[12px] text-fg-subtle">
			Audit code:
			<code class="rounded bg-surface-2 px-1.5 py-0.5 text-fg">{rule.code}</code>
		</p>

		<section class="mt-8">
			<h2
				class="text-[11px] font-semibold tracking-[0.18em] text-fg-subtle uppercase"
			>
				Definition
			</h2>
			<p class="mt-3 text-[17px] leading-relaxed text-fg">
				{rule.description}
			</p>
		</section>

		<section class="mt-10">
			<h2
				class="text-[11px] font-semibold tracking-[0.18em] text-fg-subtle uppercase"
			>
				How Patens surfaces this
			</h2>
			<p class="mt-3 text-[15px] leading-relaxed text-fg-muted">
				The Patens audit module checks for
				<code class="font-mono text-fg">{rule.code}</code>
				across five teaching surfaces: the edit-panel inline issue list, the
				project-wide audit page, the release pre-flight check, the family hub,
				and the home-page project tile. Every surface shows the same plain-English
				explanation and links back to this page.
				{#if rule.fixable}
					This rule has a one-click <strong class="text-fg">Fix</strong> button in
					the editor — the audit module both detects the issue and applies a
					deterministic correction with a labelled snapshot, so the
					<kbd
						class="rounded border border-border bg-surface px-1 font-mono text-[11px]"
						>⌘Z</kbd
					>
					path back is preserved.
				{:else}
					This rule is detection-only — there's no automatic fix because the
					correction is design-dependent (it requires a judgment call about the
					glyph's intended shape or the font's intended behaviour). The audit
					message links to the specific glyph or field that needs attention.
				{/if}
			</p>
		</section>

		<section class="mt-10">
			<h2
				class="text-[11px] font-semibold tracking-[0.18em] text-fg-subtle uppercase"
			>
				Run this check yourself
			</h2>
			<p class="mt-3 text-[15px] leading-relaxed text-fg-muted">
				Patens runs every audit rule live as you draw — including this one.
				The editor (in private alpha) shows <code class="font-mono text-fg">{rule.code}</code> firing on real
				glyphs, or check your own work from the CLI:
			</p>
			<pre
				class="mt-3 overflow-x-auto rounded-lg border border-border bg-surface-2/40 px-4 py-3 font-mono text-[12px] text-fg"><code>npx patens audit your-project.font.json</code></pre>
		</section>

		{#if peers.length > 0}
			<section class="mt-10">
				<h2
					class="text-[11px] font-semibold tracking-[0.18em] text-fg-subtle uppercase"
				>
					Related rules in {rule.category}
				</h2>
				<ul class="mt-4 grid gap-2">
					{#each peers as peer (peer.code)}
						<li>
							<a
								href={`/audit/${peer.code}`}
								class="group flex items-baseline gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-surface-2/40 focus-visible:outline-none focus-visible:bg-surface-2/40"
							>
								<code
									class="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-fg-muted group-hover:text-fg"
									>{peer.code}</code
								>
								<span class="text-[14px] text-fg group-hover:underline">
									{peer.title}
								</span>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<section class="mt-12 border-t border-border pt-6">
			<a
				href="/audit"
				class="inline-flex items-center gap-1.5 rounded-sm text-[13px] text-fg-muted underline-offset-[5px] hover:text-fg hover:underline focus-visible:outline-none focus-visible:text-fg focus-visible:underline"
			>
				← All {data.totalRules} audit rules
			</a>
		</section>
	</article>

	<SiteFooter />
</div>
