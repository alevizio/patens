<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	import SiteFooter from '$lib/ui/SiteFooter.svelte';
	import SiteHeader from '$lib/ui/SiteHeader.svelte';
	const jsonLd = `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'WebPage',
				name: 'Security — Patens',
				description:
					'How to report security issues in Patens, what the app does to keep your data safe, and the responsible-disclosure timeline.',
				url: 'https://patens.design/security',
				inLanguage: 'en',
				isPartOf: { '@type': 'WebSite', name: 'Patens', url: 'https://patens.design' }
			},
			{
				'@type': 'BreadcrumbList',
				itemListElement: [
					{ '@type': 'ListItem', position: 1, name: 'Patens', item: 'https://patens.design' },
					{ '@type': 'ListItem', position: 2, name: 'Security', item: 'https://patens.design/security' }
				]
			}
		]
		// Trailing `<\/script>` escape keeps Svelte's parser from misreading
		// the source as the end of this <script> block.
		// eslint-disable-next-line no-useless-escape
	}).replace(/<\/script/g, '<\\/script')}<\/script>`;
</script>

<svelte:head>
	<title>Security (2026) · Patens</title>
	<meta
		name="description"
		content="Reporting security issues in Patens. Email security@patens.design with details; responsible disclosure, public CVE/credit if requested."
	/>
	<link rel="canonical" href="https://patens.design/security" />
	<link rel="alternate" hreflang="en" href="https://patens.design/security" />
	<link rel="alternate" hreflang="es" href="https://patens.design/es/security" />
	<link rel="alternate" hreflang="x-default" href="https://patens.design/security" />
	<meta property="og:title" content="Security · Patens" />
	<meta property="og:description" content="Responsible disclosure: security@patens.design." />
	<meta property="og:image" content="https://patens.design/og/brand" />
	<meta property="og:image:alt" content="Patens — open-source browser-native type design tool with a 99-code audit module" />
	<meta name="twitter:title" content="Security · Patens" />
	<meta name="twitter:description" content="Responsible disclosure: security@patens.design." />
	<meta name="twitter:image" content="https://patens.design/og/brand" />
	<meta name="twitter:image:alt" content="Patens — open-source browser-native type design tool with a 99-code audit module" />
	<!-- eslint-disable svelte/no-at-html-tags, no-useless-escape -->
	{@html jsonLd}
	<!-- eslint-enable svelte/no-at-html-tags, no-useless-escape -->
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
	<SiteHeader current="/security" />

	<a
		href="/"
		class="mb-8 inline-flex items-center gap-1.5 rounded-sm text-[12px] text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:text-fg focus-visible:underline focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
	>
		<ArrowLeft class="size-3" />
		Back to the foundry
	</a>

	<h1 class="mb-6 text-[48px] leading-tight tracking-tight text-fg">
		Security.
	</h1>

	<p class="mb-6 text-[15px] leading-relaxed text-fg-muted">
		<strong class="font-semibold text-fg">Patens is open source under
		the MIT License.</strong>
		If you find a security issue — a way for an attacker to access
		someone else's projects, hijack a share, leak a credential, or
		otherwise compromise the integrity of the app — please report it.
	</p>

	<h2 class="mt-16 border-t border-border/30 pt-12 mb-4 text-[28px] tracking-tight text-fg">
		<span class="mr-3 align-middle font-mono text-[10px] tracking-wider text-fg-subtle tabular-nums" data-numeric>01</span>How to report
	</h2>
	<p class="mb-3 text-[14px] leading-relaxed text-fg-muted">
		Email <a href="mailto:security@patens.design" class="text-accent-strong underline underline-offset-2">security@patens.design</a>
		with the details. Include:
	</p>
	<ul class="mb-8 grid gap-1.5 text-[14px] leading-relaxed text-fg-muted">
		<li>· A short summary of the issue + its impact.</li>
		<li>· Steps to reproduce, or a proof-of-concept.</li>
		<li>· The component / route / file you believe is affected.</li>
		<li>· Whether you'd like public credit on disclosure (CVE, GitHub release notes, X mention — your choice).</li>
	</ul>

	<h2 class="mt-16 border-t border-border/30 pt-12 mb-4 text-[28px] tracking-tight text-fg">
		<span class="mr-3 align-middle font-mono text-[10px] tracking-wider text-fg-subtle tabular-nums" data-numeric>02</span>What I commit to
	</h2>
	<ul class="mb-8 grid gap-2 text-[14px] leading-relaxed text-fg-muted">
		<li>
			<strong class="font-medium text-fg">Acknowledge within 48 hours.</strong>
			You'll get a reply confirming I received the report, even if I'm
			at a conference or in a deep-work block.
		</li>
		<li>
			<strong class="font-medium text-fg">Investigate within 7 days.</strong>
			Sometimes faster, sometimes I'll ask follow-up questions. I'll
			share a triage with severity + scope so you know where it sits.
		</li>
		<li>
			<strong class="font-medium text-fg">Fix + disclose collaboratively.</strong>
			For high-severity issues I'll cut a patch release first, then
			publish a disclosure with credit (if requested). For low-severity,
			I'll fix in the regular release stream + document in the changelog.
		</li>
		<li>
			<strong class="font-medium text-fg">No legal pursuit.</strong>
			Good-faith research that respects responsible-disclosure (you
			don't dump customer data, you don't sit on the issue forever, you
			tell me before going public) won't get you sued.
		</li>
	</ul>

	<h2 class="mt-16 border-t border-border/30 pt-12 mb-4 text-[28px] tracking-tight text-fg">
		<span class="mr-3 align-middle font-mono text-[10px] tracking-wider text-fg-subtle tabular-nums" data-numeric>03</span>In scope
	</h2>
	<ul class="mb-8 grid gap-1.5 text-[14px] leading-relaxed text-fg-muted">
		<li>· The Patens web application at patens.design.</li>
		<li>· The /api/share + /api/share/[id] endpoints (cloud-share auth + token handling).</li>
		<li>· The /api/ai/messages proxy (key handling, header passthrough).</li>
		<li>· The /auth/* OAuth flow (where enabled by self-hosters).</li>
		<li>· Service worker eviction logic (cache poisoning, stale-version attacks).</li>
		<li>· The source code at github.com/alevizio/patens.</li>
	</ul>

	<h2 class="mt-16 border-t border-border/30 pt-12 mb-4 text-[28px] tracking-tight text-fg">
		<span class="mr-3 align-middle font-mono text-[10px] tracking-wider text-fg-subtle tabular-nums" data-numeric>04</span>Out of scope
	</h2>
	<ul class="mb-8 grid gap-1.5 text-[14px] leading-relaxed text-fg-muted">
		<li>· Third-party services Patens depends on (Vercel, Anthropic, Vercel Blob storage). Report those upstream.</li>
		<li>· Self-hosted Patens deployments operated by someone else — talk to them directly.</li>
		<li>· "I can use my own browser DevTools to edit my own projects." That's the design, not a vulnerability.</li>
		<li>· DoS attacks. Vercel handles network-layer abuse; please don't actively flood the deployment.</li>
	</ul>

	<h2 class="mt-16 border-t border-border/30 pt-12 mb-4 text-[28px] tracking-tight text-fg">
		<span class="mr-3 align-middle font-mono text-[10px] tracking-wider text-fg-subtle tabular-nums" data-numeric>05</span>What Patens does to keep your data safe
	</h2>
	<ul class="mb-12 grid gap-2 text-[14px] leading-relaxed text-fg-muted">
		<li>
			<strong class="font-medium text-fg">Constant-time token comparison</strong>
			for share-delete tokens (<code class="rounded-none bg-surface-1 px-1 py-0.5 font-mono text-[12px]">timingSafeEqual</code>),
			to defend against timing attacks on the token value.
		</li>
		<li>
			<strong class="font-medium text-fg">Same-origin redirect validation</strong>
			on the auth flow (<code class="rounded-none bg-surface-1 px-1 py-0.5 font-mono text-[12px]">safeReturnTo</code>),
			to prevent open-redirect from a tampered <code class="rounded-none bg-surface-1 px-1 py-0.5 font-mono text-[12px]">return</code> query param.
		</li>
		<li>
			<strong class="font-medium text-fg">HMAC-SHA256 signed session cookies</strong>
			(when OAuth is enabled), HttpOnly + SameSite=Lax + Secure in production.
		</li>
		<li>
			<strong class="font-medium text-fg">No <code class="rounded-none bg-surface-1 px-1 py-0.5 font-mono text-[12px]">eval()</code> or <code class="rounded-none bg-surface-1 px-1 py-0.5 font-mono text-[12px]">new Function()</code> on user input.</strong>
			Glyph names, kerning class names, brief text — all rendered with
			Svelte's escaping; never executed.
		</li>
		<li>
			<strong class="font-medium text-fg">UUID-only share URLs.</strong>
			Share IDs are <code class="rounded-none bg-surface-1 px-1 py-0.5 font-mono text-[12px]">crypto.randomUUID()</code> — unguessable without
			the link. The capability model: anyone with the URL can read;
			only the originator (who holds the delete-token in their
			browser) can re-share or delete.
		</li>
		<li>
			<strong class="font-medium text-fg">Anthropic API keys never logged.</strong>
			The <code class="rounded-none bg-surface-1 px-1 py-0.5 font-mono text-[12px]">/api/ai/messages</code> proxy forwards the user's own key to
			Anthropic verbatim and discards it from the request lifecycle.
			Patens's server never sees or stores the key.
		</li>
	</ul>

	<p class="mb-4 text-[12px] leading-relaxed text-fg-subtle">
		Last updated: 2026-05-25. The latest version of this policy is
		always at <a href="https://patens.design/security" class="text-accent-strong underline underline-offset-2">patens.design/security</a>.
	</p>
	<SiteFooter />
</div>
