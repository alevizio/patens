<script lang="ts">
	// SiteFooter — the canonical cross-navigation surface for every
	// marketing page. Patens doesn't have a persistent top-nav (the
	// page-as-document aesthetic means each page has a "Back to the
	// foundry" inline link at the top, not a SaaS nav bar). The
	// footer carries the full sitemap discoverability.
	//
	// 4-column Swiss-aligned grid:
	//   Product  · Learn   · Company · Legal
	// Plus a bottom row for the wordmark, open-source links, and
	// social handles. The whole thing sits in a `border-t` rule for
	// editorial weight; mt-28 above to separate from the page content.
	//
	// Used on every public marketing route. Deliberately NOT used on:
	//   - Editor (/project/[id]/edit) — full-app surface
	//   - Share specimen (/share/[id]) — read-only specimen surface
	//   - Family hub / Families index — app surface
	import { addLocalePrefix, chrome, type Locale } from '$lib/i18n';

	type Props = { lang?: Locale };
	let { lang = 'en' }: Props = $props();

	const t = $derived(chrome[lang].footer);
	const localize = (path: string): string =>
		lang === 'es' && !path.startsWith('http') ? addLocalePrefix(path) : path;

	type LinkGroup = { title: string; items: Array<{ label: string; href: string; external?: boolean }> };

	const groups = $derived<LinkGroup[]>([
		{
			title: t.product.title,
			items: [
				{ label: t.product.items.auditModule, href: localize('/audit') },
				{ label: t.product.items.compare, href: localize('/compare') },
				// /changelog stays English (versioned content, lower SEO value).
				// Footer link from /es/* points at the English /changelog so
				// the prerender doesn't follow a phantom /es/changelog link
				// and 404 the build.
				{ label: t.product.items.changelog, href: '/changelog' }
			]
		},
		{
			title: t.learn.title,
			items: [
				{ label: t.learn.items.all, href: localize('/learn') },
				// /learn/first-font + /learn/audit-codes stay English for now —
				// not yet translated. Footer links to the English versions.
				{ label: t.learn.items.firstFont, href: '/learn/first-font' },
				{ label: t.learn.items.auditCodes, href: '/learn/audit-codes' },
				{ label: t.learn.items.help, href: localize('/help') }
			]
		},
		{
			title: t.company.title,
			items: [
				{ label: t.company.items.about, href: localize('/about') },
				{ label: t.company.items.pronunciation, href: localize('/pronunciation') },
				{ label: t.company.items.press, href: localize('/press') }
			]
		},
		{
			title: t.legal.title,
			items: [
				{ label: t.legal.items.privacy, href: localize('/privacy') },
				{ label: t.legal.items.security, href: localize('/security') }
			]
		}
	]);
</script>

<footer class="mt-28 border-t border-border/60 pt-12 pb-8">
	<div class="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4">
		{#each groups as group (group.title)}
			<div>
				<h2 class="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
					{group.title}
				</h2>
				<ul class="space-y-2.5">
					{#each group.items as link (link.href)}
						<li>
							<a
								href={link.href}
								class="rounded-sm text-[13px] text-fg-muted underline-offset-[5px] transition-colors hover:text-fg hover:underline focus-visible:outline-none focus-visible:text-fg focus-visible:underline focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
								rel={link.external ? 'noopener' : undefined}
							>
								{link.label}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</div>

	<!-- Bottom rule + wordmark/social row -->
	<div class="mt-12 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3 border-t border-border/40 pt-6">
		<a
			href={lang === 'es' ? '/es' : '/'}
			class="group inline-flex items-baseline gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
		>
			<span
				class="text-[20px] tracking-tight text-fg transition-colors group-hover:text-accent-strong"
				style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
			>
				Patens
			</span>
			<span class="font-mono text-[10px] tracking-wider text-fg-subtle uppercase">
				·&nbsp; {lang === 'es'
					? 'Un editor tipográfico con un método. Una regla a la vez. — Alejandro'
					: 'A type editor with a method. Made one rule at a time. — Alejandro'}
			</span>
		</a>
		<nav
			class="flex flex-wrap items-baseline gap-x-5 gap-y-2 text-[12px]"
			aria-label={t.socialLabel}
		>
			<a
				href="https://bsky.app/profile/patens.design"
				class="rounded-sm text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:text-fg focus-visible:underline focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
				rel="noopener me"
			>
				@patens.design
			</a>
			<a
				href="https://x.com/patenstype"
				class="rounded-sm text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:text-fg focus-visible:underline focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
				rel="noopener me"
			>
				@patenstype
			</a>
			<a
				href="https://instagram.com/patens.type"
				class="rounded-sm text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:text-fg focus-visible:underline focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
				rel="noopener me"
			>
				@patens.type
			</a>
		</nav>
		<span class="font-mono text-[10px] tracking-wider text-fg-subtle uppercase">
			MIT &nbsp;·&nbsp; {lang === 'es' ? '94 reglas, en lenguaje claro' : '94 rules, plain English'} &nbsp;·&nbsp; 2026
		</span>
	</div>
</footer>
