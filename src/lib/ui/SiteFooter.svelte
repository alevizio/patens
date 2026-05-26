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
	type LinkGroup = { title: string; items: Array<{ label: string; href: string; external?: boolean }> };

	const groups: LinkGroup[] = [
		{
			title: 'Product',
			items: [
				{ label: 'The audit module', href: '/audit' },
				{ label: 'Compare with alternatives', href: '/compare' },
				{ label: 'Changelog', href: '/changelog' }
			]
		},
		{
			title: 'Learn',
			items: [
				{ label: 'All tutorials', href: '/learn' },
				{ label: 'Your first font', href: '/learn/first-font' },
				{ label: 'Audit codes reference', href: '/learn/audit-codes' },
				{ label: 'Help · FAQ', href: '/help' }
			]
		},
		{
			title: 'Company',
			items: [
				{ label: 'About', href: '/about' },
				{ label: 'Press kit', href: '/press' }
			]
		},
		{
			title: 'Legal · Source',
			items: [
				{ label: 'Privacy', href: '/privacy' },
				{ label: 'Security', href: '/security' },
				{ label: 'GitHub repo', href: 'https://github.com/alevizio/patens', external: true },
				{ label: 'MIT license', href: 'https://github.com/alevizio/patens/blob/main/LICENSE', external: true }
			]
		}
	];
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
								class="text-[13px] text-fg-muted underline-offset-[5px] transition-colors hover:text-fg hover:underline"
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
			href="/"
			class="group inline-flex items-baseline gap-2"
		>
			<span
				class="text-[20px] tracking-tight text-fg transition-colors group-hover:text-accent-strong"
				style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
			>
				Patens
			</span>
			<span class="font-mono text-[10px] tracking-wider text-fg-subtle uppercase">
				·&nbsp; Type that teaches as you draw
			</span>
		</a>
		<nav
			class="flex flex-wrap items-baseline gap-x-5 gap-y-2 text-[12px]"
			aria-label="Social + source"
		>
			<a
				href="https://bsky.app/profile/patens.design"
				class="text-fg-muted hover:text-fg"
				rel="noopener me"
			>
				@patens.design
			</a>
			<a
				href="https://x.com/patenstype"
				class="text-fg-muted hover:text-fg"
				rel="noopener me"
			>
				@patenstype
			</a>
			<a
				href="https://github.com/alevizio/patens"
				class="text-fg-muted hover:text-fg"
				rel="noopener me"
			>
				github.com/alevizio/patens
			</a>
		</nav>
		<span class="font-mono text-[10px] tracking-wider text-fg-subtle uppercase">
			MIT &nbsp;·&nbsp; Personal type design tool &nbsp;·&nbsp; 2026
		</span>
	</div>
</footer>
