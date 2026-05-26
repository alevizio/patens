<script lang="ts">
	// SiteHeader — slim top-nav for every marketing page. Carries the
	// Patens wordmark (links to /) + 4 primary destinations (Audit ·
	// Learn · Compare · Help) + GitHub. Matches the editorial-document
	// aesthetic — not a SaaS nav bar, just an editorial header rule.
	//
	// Used on every public marketing route. Pages also still have their
	// inline "Back to the foundry" link below this header for redundancy
	// + screen-reader contexts where the wordmark-as-link is less obvious.
	//
	// Deliberately NOT used on:
	//   - Home (/) — already has its own custom hero + branding
	//   - Editor (/project/[id]/edit) — full-app chrome
	//   - Share specimen (/share/[id]) — read-only specimen surface
	//   - Family hub / Families index — app surface
	import Type from '@lucide/svelte/icons/type';

	type Props = { current?: string };
	let { current = '' }: Props = $props();

	const nav: Array<{ label: string; href: string }> = [
		{ label: 'The audit', href: '/audit' },
		{ label: 'Learn', href: '/learn' },
		{ label: 'Compare', href: '/compare' },
		{ label: 'Help', href: '/help' }
	];

	// Path-prefix match — /learn/first-font should highlight "Learn"
	// alongside /learn itself. Exact "/" wouldn't match every page, so
	// only the prefix check matters here.
	const isActive = (href: string): boolean =>
		href === current || (href !== '/' && current.startsWith(href + '/')) || href === current;
</script>

<!-- Sticky on scroll for long-form pages (/audit, /privacy, /security,
     /learn/*, /changelog). Solid bg-canvas (no glassmorphism — Swiss
     aesthetic forbids the blur shortcut); the bottom border keeps the
     editorial-rule weight. The negative top margin on the parent
     wrapper would normally bleed content through, but pages set their
     own `py-8` / `pt-8` which absorbs the sticky-overlap correctly. -->
<header
	class="sticky top-0 z-20 -mx-4 mb-12 flex items-center justify-between gap-4 border-b border-border/50 bg-canvas px-4 py-4 sm:-mx-6 sm:px-6"
>
	<a
		href="/"
		class="group inline-flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
	>
		<span
			class="inline-flex size-7 items-center justify-center rounded-lg bg-fg text-canvas transition-transform duration-150 ease-out group-hover:scale-105 group-active:scale-95"
			aria-hidden="true"
		>
			<Type class="size-3.5" />
		</span>
		<span
			class="text-[13px] font-medium tracking-tight text-fg"
			style="font-family: ui-monospace, 'SF Mono', Menlo, monospace;"
		>
			Patens
		</span>
	</a>

	<nav
		aria-label="Primary"
		class="hidden flex-wrap items-baseline gap-x-5 gap-y-2 text-[12px] sm:flex"
	>
		{#each nav as item (item.href)}
			<a
				href={item.href}
				class="rounded-sm text-fg-muted underline-offset-[5px] transition-colors hover:text-fg hover:underline focus-visible:outline-none focus-visible:text-fg focus-visible:underline focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
				aria-current={isActive(item.href) ? 'page' : undefined}
				class:text-fg={isActive(item.href)}
				class:font-medium={isActive(item.href)}
			>
				{item.label}
			</a>
		{/each}
		<a
			href="https://github.com/alevizio/patens"
			class="rounded-sm text-fg-muted underline-offset-[5px] transition-colors hover:text-fg hover:underline focus-visible:outline-none focus-visible:text-fg focus-visible:underline focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
			rel="noopener"
		>
			GitHub
		</a>
	</nav>
</header>
