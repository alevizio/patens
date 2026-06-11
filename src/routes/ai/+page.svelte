<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	import SiteFooter from '$lib/ui/SiteFooter.svelte';
	import SiteHeader from '$lib/ui/SiteHeader.svelte';
	import { AUDIT_CODE_COUNT } from '$lib/font/audit-count';
	const jsonLd = `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'WebPage',
				name: 'AI stance — Patens',
				description:
					'Where Patens stands on AI: the audit is deterministic and cites primary sources. Every AI feature is off by default, runs on your own key, and your outlines are never used for training.',
				url: 'https://patens.design/ai',
				inLanguage: 'en',
				isPartOf: { '@type': 'WebSite', name: 'Patens', url: 'https://patens.design' }
			},
			{
				'@type': 'BreadcrumbList',
				itemListElement: [
					{ '@type': 'ListItem', position: 1, name: 'Patens', item: 'https://patens.design' },
					{ '@type': 'ListItem', position: 2, name: 'AI stance', item: 'https://patens.design/ai' }
				]
			}
		]
		// Trailing `<\/script>` escape keeps Svelte's parser from misreading
		// the source as the end of this <script> block.
		// eslint-disable-next-line no-useless-escape
	}).replace(/<\/script/g, '<\\/script')}<\/script>`;
</script>

<svelte:head>
	<title>AI stance (2026) · Patens</title>
	<meta
		name="description"
		content="The Patens audit is deterministic — 105 rules that cite primary sources, no model in the loop. AI features are off by default, run on your own key, and your fonts are never used for training."
	/>
	<link rel="canonical" href="https://patens.design/ai" />
	<meta property="og:title" content="AI stance · Patens" />
	<meta property="og:description" content="Deterministic first. AI opt-in, on your key, never trained on your fonts." />
	<meta property="og:image" content="https://patens.design/og/brand" />
	<meta property="og:image:alt" content="Patens — open-source browser-native type design tool with a 105-code audit module" />
	<meta name="twitter:title" content="AI stance · Patens" />
	<meta name="twitter:description" content="Deterministic first. AI opt-in, on your key, never trained on your fonts." />
	<meta name="twitter:image" content="https://patens.design/og/brand" />
	<meta name="twitter:image:alt" content="Patens — open-source browser-native type design tool with a 105-code audit module" />
	<!-- eslint-disable svelte/no-at-html-tags, no-useless-escape -->
	{@html jsonLd}
	<!-- eslint-enable svelte/no-at-html-tags, no-useless-escape -->
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
	<SiteHeader current="/ai" />

	<a
		href="/"
		class="mb-8 inline-flex items-center gap-1.5 rounded-sm text-[12px] text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:text-fg focus-visible:underline focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
	>
		<ArrowLeft class="size-3" />
		Back to the foundry
	</a>

	<h1 class="mb-6 text-[48px] leading-tight tracking-tight text-fg">
		Where Patens stands on AI.
	</h1>

	<p class="mb-6 text-[15px] leading-relaxed text-fg-muted">
		<strong class="font-semibold text-fg">The thing Patens is known for — the
		audit — has no model in the loop.</strong>
		All {AUDIT_CODE_COUNT} rules are deterministic code: geometry, tables,
		and conventions checked the same way every time, each one citing the
		primary literature it comes from. A rule that can't explain itself
		doesn't ship. That's a deliberate position, not a missing feature.
	</p>

	<h2 class="mt-16 border-t border-border/30 pt-12 mb-4 text-[28px] tracking-tight text-fg">
		<span class="mr-3 align-middle font-mono text-[10px] tracking-wider text-fg-subtle tabular-nums" data-numeric>01</span>Deterministic first
	</h2>
	<p class="mb-8 text-[14px] leading-relaxed text-fg-muted">
		Drawing letters is judgment work, and the tools that check it should be
		auditable themselves. When the audit says a contour self-intersects or a
		sidebearing drifts, that's a measurement you can reproduce — not a
		model's opinion. The auto-kern and auto-space suggestions are the same:
		silhouette geometry, inspectable in the source, applied only when you
		click Apply. Nothing in the core workflow guesses.
	</p>

	<h2 class="mt-16 border-t border-border/30 pt-12 mb-4 text-[28px] tracking-tight text-fg">
		<span class="mr-3 align-middle font-mono text-[10px] tracking-wider text-fg-subtle tabular-nums" data-numeric>02</span>AI is opt-in, on your key
	</h2>
	<ul class="mb-8 grid gap-2 text-[14px] leading-relaxed text-fg-muted">
		<li>
			<strong class="font-medium text-fg">Off by default.</strong> No AI
			feature runs until you add your own Anthropic API key in Settings.
			Without a key, no AI endpoint is ever called.
		</li>
		<li>
			<strong class="font-medium text-fg">Your key, your bill, your
			data path.</strong> The key lives in your browser's localStorage.
			Patens's server proxies the request verbatim and discards it —
			it stores nothing and adds nothing.
		</li>
		<li>
			<strong class="font-medium text-fg">Explicit action, visible
			payload.</strong> AI is invoked per-click ("Explain this finding"),
			never in the background, and sends only what the feature needs.
		</li>
		<li>
			<strong class="font-medium text-fg">Never trained on your
			fonts.</strong> Your outlines live in your browser's IndexedDB.
			Patens has no telemetry pipeline, no dataset, and nothing to train
			— see <a href="/privacy" class="text-accent-strong underline underline-offset-2">Privacy</a>.
		</li>
	</ul>

	<h2 class="mt-16 border-t border-border/30 pt-12 mb-4 text-[28px] tracking-tight text-fg">
		<span class="mr-3 align-middle font-mono text-[10px] tracking-wider text-fg-subtle tabular-nums" data-numeric>03</span>What AI is for here
	</h2>
	<p class="mb-8 text-[14px] leading-relaxed text-fg-muted">
		Teaching, not generating. The opt-in features rephrase and expand —
		"explain this audit finding against my actual glyph" — they don't draw
		letters for you, and they don't move points. Where research suggests
		models could help (vision critique of letterforms, for instance), we
		run the experiment against the deterministic audit as ground truth and
		publish the results before shipping anything. A model that can't beat
		the measurable baseline stays a research note.
	</p>

	<h2 class="mt-16 border-t border-border/30 pt-12 mb-4 text-[28px] tracking-tight text-fg">
		<span class="mr-3 align-middle font-mono text-[10px] tracking-wider text-fg-subtle tabular-nums" data-numeric>04</span>For agents and pipelines
	</h2>
	<p class="mb-12 text-[14px] leading-relaxed text-fg-muted">
		The flip side of deterministic-first: the audit makes a solid grounding
		layer for other people's AI. The CLI
		(<code class="rounded-none bg-surface-1 px-1 py-0.5 font-mono text-[12px]">patens audit</code>)
		and its MCP server expose all {AUDIT_CODE_COUNT} rules to coding agents,
		so an agent editing font sources can check its own work against
		measurements instead of hallucinating QA. Deterministic core, open
		interfaces — that's the trade we think type design deserves.
	</p>

	<p class="mb-4 text-[12px] leading-relaxed text-fg-subtle">
		Last updated: 2026-06-10. Send questions to
		<a href="mailto:hi@patens.design" class="text-accent-strong underline underline-offset-2">hi@patens.design</a>.
	</p>
	<SiteFooter />
</div>
