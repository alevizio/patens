<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	import SiteFooter from '$lib/ui/SiteFooter.svelte';
	import SiteHeader from '$lib/ui/SiteHeader.svelte';
	const jsonLd = `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'WebPage',
				name: 'Privacy — Patens',
				description:
					'Patens is a browser-native app. Project data lives in your browser. Nothing leaves your machine unless you explicitly export or upload to the cloud-share path.',
				url: 'https://patens.design/privacy',
				inLanguage: 'en',
				isPartOf: { '@type': 'WebSite', name: 'Patens', url: 'https://patens.design' }
			},
			{
				'@type': 'BreadcrumbList',
				itemListElement: [
					{ '@type': 'ListItem', position: 1, name: 'Patens', item: 'https://patens.design' },
					{ '@type': 'ListItem', position: 2, name: 'Privacy', item: 'https://patens.design/privacy' }
				]
			}
		]
		// Trailing `<\/script>` escape keeps Svelte's parser from misreading
		// the source as the end of this <script> block.
		// eslint-disable-next-line no-useless-escape
	}).replace(/<\/script/g, '<\\/script')}<\/script>`;
</script>

<svelte:head>
	<title>Privacy (2026) · Patens</title>
	<meta
		name="description"
		content="Patens is browser-native. Project data lives in your browser's IndexedDB. No analytics SDK, no tracking cookies. Cloud share is opt-in per project."
	/>
	<link rel="canonical" href="https://patens.design/privacy" />
	<link rel="alternate" hreflang="en" href="https://patens.design/privacy" />
	<link rel="alternate" hreflang="es" href="https://patens.design/es/privacy" />
	<link rel="alternate" hreflang="x-default" href="https://patens.design/privacy" />
	<meta property="og:title" content="Privacy · Patens" />
	<meta property="og:description" content="No data leaves your browser unless you explicitly send it." />
	<meta property="og:image" content="https://patens.design/og/brand" />
	<meta property="og:image:alt" content="Patens — open-source browser-native type design tool with a 94-code audit module" />
	<meta name="twitter:title" content="Privacy · Patens" />
	<meta name="twitter:description" content="No data leaves your browser unless you explicitly send it." />
	<meta name="twitter:image" content="https://patens.design/og/brand" />
	<meta name="twitter:image:alt" content="Patens — open-source browser-native type design tool with a 94-code audit module" />
	<!-- eslint-disable svelte/no-at-html-tags, no-useless-escape -->
	{@html jsonLd}
	<!-- eslint-enable svelte/no-at-html-tags, no-useless-escape -->
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
	<SiteHeader current="/privacy" />

	<a
		href="/"
		class="mb-8 inline-flex items-center gap-1.5 text-[12px] text-fg-muted hover:text-fg"
	>
		<ArrowLeft class="size-3" />
		Back to the foundry
	</a>

	<h1
		class="mb-6 text-[48px] leading-tight tracking-tight text-fg"
		style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
	>
		Privacy.
	</h1>

	<p class="mb-6 text-[15px] leading-relaxed text-fg-muted">
		<strong class="font-semibold text-fg">Patens runs entirely in your
		browser.</strong>
		Every project you draw lives in your browser's IndexedDB, on your
		machine. There is no Patens-hosted account system. There is no
		analytics SDK. There are no tracking cookies. The server you're
		reading this page from never sees the contents of your fonts.
	</p>

	<h2
		class="mt-16 border-t border-border/30 pt-12 mb-4 text-[28px] tracking-tight text-fg"
		style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
	>
		What stays on your machine
	</h2>
	<ul class="mb-8 grid gap-2 text-[14px] leading-relaxed text-fg-muted">
		<li>
			<strong class="font-medium text-fg">Every project's glyphs, kerning,
			metadata, brief, decisions log, samples</strong> — stored in the
			IndexedDB database named <code class="rounded bg-surface-1 px-1 py-0.5 font-mono text-[12px]">font-studio</code>.
		</li>
		<li>
			<strong class="font-medium text-fg">Family records + family-level
			kerning</strong> — stored in the IndexedDB database named
			<code class="rounded bg-surface-1 px-1 py-0.5 font-mono text-[12px]">font-studio-families</code>.
		</li>
		<li>
			<strong class="font-medium text-fg">Your settings</strong> (theme
			preference, welcome dismissal, editor toggles, optional Anthropic
			API key) — stored in <code class="rounded bg-surface-1 px-1 py-0.5 font-mono text-[12px]">localStorage</code>
			under the <code class="rounded bg-surface-1 px-1 py-0.5 font-mono text-[12px]">font-studio:settings:v1</code> key.
		</li>
		<li>
			<strong class="font-medium text-fg">Per-share delete tokens</strong>
			— if you upload a share, the originator's token is kept locally so
			only you can re-share or delete it later.
		</li>
	</ul>

	<h2
		class="mt-16 border-t border-border/30 pt-12 mb-4 text-[28px] tracking-tight text-fg"
		style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
	>
		What leaves your machine — only when you choose
	</h2>
	<ul class="mb-8 grid gap-2 text-[14px] leading-relaxed text-fg-muted">
		<li>
			<strong class="font-medium text-fg">Cloud share</strong> — when you
			click "Copy share link", the project's JSON is uploaded to Vercel
			Blob storage so the recipient can fetch it. The share URL is
			unguessable (UUID). Anyone with the URL can read; only you can
			delete (via the locally-stored token).
		</li>
		<li>
			<strong class="font-medium text-fg">Exports</strong> — OTF, WOFF2,
			TTF, UFO, .font.json, designer bundle. These are downloads to your
			machine; they don't go to a Patens server. You decide where to send
			them next.
		</li>
		<li>
			<strong class="font-medium text-fg">AI features (opt-in)</strong> —
			"Explain (AI)" on the audit page + AI kerning-suggest send the
			audit code + relevant project metadata to Anthropic's API using
			<em class="not-italic text-fg">your own</em> API key. The key is
			stored in your browser; Patens's server doesn't see it (the
			<code class="rounded bg-surface-1 px-1 py-0.5 font-mono text-[12px]">/api/ai/messages</code>
			proxy forwards verbatim and discards). If you don't add a key in
			Settings, no AI feature is ever called.
		</li>
		<li>
			<strong class="font-medium text-fg">OAuth sign-in</strong> — Patens
			is currently account-free. The deployed instance at patens.design
			never offers sign-in. Self-hosted deployments that opt in to
			GitHub OAuth follow the same minimum-data principle.
		</li>
	</ul>

	<h2
		class="mt-16 border-t border-border/30 pt-12 mb-4 text-[28px] tracking-tight text-fg"
		style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
	>
		Server logs
	</h2>
	<p class="mb-8 text-[14px] leading-relaxed text-fg-muted">
		The deployment is hosted on Vercel. Vercel's edge network keeps
		standard request logs (IP, user agent, path, response code) for the
		duration of their default retention window. Patens itself does not
		collect or process additional logs.
	</p>

	<h2
		class="mt-16 border-t border-border/30 pt-12 mb-4 text-[28px] tracking-tight text-fg"
		style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
	>
		GDPR + CCPA
	</h2>
	<p class="mb-8 text-[14px] leading-relaxed text-fg-muted">
		Patens does not collect personal information. We have no user
		database to export, correct, or delete. To delete your local
		projects, clear your browser's site data for patens.design (Settings
		→ Privacy → Site data). To delete an uploaded share, use the
		"Unshare project" button in the editor header (visible when the
		project has been shared) or contact <a href="mailto:hi@patens.design" class="text-accent-strong underline underline-offset-2">hi@patens.design</a> with the share URL.
	</p>

	<h2
		class="mt-16 border-t border-border/30 pt-12 mb-4 text-[28px] tracking-tight text-fg"
		style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
	>
		Self-hosters
	</h2>
	<p class="mb-12 text-[14px] leading-relaxed text-fg-muted">
		Patens is MIT-licensed. If you run your own instance, this policy
		describes the design intent of the code, but operational responsibility
		is yours — you choose your hosting, your logging policy, and which
		integrations to enable. See
		<a
			href="https://github.com/alevizio/patens/blob/main/docs/setup.md"
			class="text-accent-strong underline underline-offset-2"
		>
			docs/setup.md
		</a>
		for the per-platform instructions.
	</p>

	<p class="mb-4 text-[12px] leading-relaxed text-fg-subtle">
		Last updated: 2026-05-25. Send questions to
		<a href="mailto:hi@patens.design" class="text-accent-strong underline underline-offset-2">hi@patens.design</a>.
	</p>
	<SiteFooter />
</div>
