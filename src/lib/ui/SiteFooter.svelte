<script lang="ts">
	// SiteFooter — the canonical cross-navigation surface for every
	// marketing page. Patens doesn't have a persistent top-nav (the
	// page-as-document aesthetic means each page has a "Back to the
	// foundry" inline link at the top, not a SaaS nav bar). The
	// footer carries the full sitemap discoverability.
	//
	// Swiss-aligned 4-column link grid (Product · Learn · Company · Legal)
	// with numerical 01/02/03/04 section prefixes. Closes with a tall
	// wordmark + tight identity strip — editorial document, not SaaS.
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
				// /library is the public 38-canonical-reference page. Stays
				// English (the references themselves are mostly English-
				// language; non-English entries are still cited in English
				// metadata for now).
				{ label: 'The library', href: '/library' },
				// /education is the type-design programs map (Reading, KABK,
				// Plantin, etc.). Stays English — program pages are mostly
				// English-language.
				{ label: 'The schools', href: '/education' },
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

<footer class="mt-28 border-t border-border/60 pt-14 pb-10">
	<!-- 4-column link grid. Each column carries a Swiss-style 01/02/03/04
	     section prefix in tabular-nums mono, a thin rule under the heading,
	     and the link list below. -->
	<div class="grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-4">
		{#each groups as group, i (group.title)}
			<div>
				<div class="mb-5 flex items-baseline gap-3 border-b border-border/40 pb-3">
					<span
						class="font-mono text-[10px] tracking-wider text-fg-subtle tabular-nums"
						data-numeric
					>
						{String(i + 1).padStart(2, '0')}
					</span>
					<h2
						class="font-mono text-[10px] uppercase tracking-[0.18em] text-fg"
					>
						{group.title}
					</h2>
				</div>
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

	<!-- Identity strip. Big serif wordmark + tagline on the left; social
	     row + MIT/year mono identifier on the right. Asymmetric, restrained,
	     plenty of negative space — the document's colophon. -->
	<div
		class="mt-16 grid gap-y-8 gap-x-12 border-t border-border/60 pt-10 md:grid-cols-[1fr_auto] md:items-end"
	>
		<a
			href={lang === 'es' ? '/es' : '/'}
			class="group block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
		>
			<span
				class="block text-[40px] leading-none tracking-tight text-fg transition-colors group-hover:text-accent-strong sm:text-[52px]"
				
			>
				Patens
			</span>
			<span class="mt-3 block font-mono text-[10px] tracking-[0.18em] text-fg-subtle uppercase">
				{lang === 'es'
					? 'Un editor tipográfico con un método. Una regla a la vez. — Alejandro'
					: 'A type editor with a method. Made one rule at a time. — Alejandro'}
			</span>
		</a>
		<div class="flex flex-col gap-3 md:items-end md:text-right">
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
			<span class="font-mono text-[10px] tracking-[0.18em] text-fg-subtle uppercase">
				MIT &nbsp;·&nbsp; {lang === 'es' ? '94 reglas, en lenguaje claro' : '102 rules, plain English'} &nbsp;·&nbsp; 2026
			</span>
		</div>
	</div>
</footer>
