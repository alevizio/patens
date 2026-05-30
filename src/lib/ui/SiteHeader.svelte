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
	import Globe from '@lucide/svelte/icons/globe';
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';
	import { addLocalePrefix, chrome, switchLocalePath, type Locale } from '$lib/i18n';
	import { settings } from '$lib/stores/settings.svelte';

	type Props = { current?: string; lang?: Locale };
	let { current = '', lang = 'en' }: Props = $props();

	const t = $derived(chrome[lang].nav);
	const switcher = $derived(chrome[lang].langSwitcher);

	// In Spanish mode every nav href gets prefixed; same href list, just
	// rewritten through addLocalePrefix. Keeps the "active" detection
	// honest because `current` is already the full pathname.
	const nav = $derived<Array<{ label: string; href: string }>>(
		lang === 'es'
			? [
					{ label: t.audit, href: addLocalePrefix('/audit') },
					{ label: t.learn, href: addLocalePrefix('/learn') },
					{ label: t.compare, href: addLocalePrefix('/compare') },
					{ label: t.help, href: addLocalePrefix('/help') }
				]
			: [
					{ label: t.audit, href: '/audit' },
					{ label: t.learn, href: '/learn' },
					{ label: t.compare, href: '/compare' },
					{ label: t.help, href: '/help' }
				]
	);

	// Locale-switch target — flip to the OTHER locale's version of the
	// current page. Server doesn't re-render, just an <a href> with the
	// alternate path.
	const otherLocale: Locale = $derived(lang === 'es' ? 'en' : 'es');
	const switchTarget = $derived(switchLocalePath(current, otherLocale));

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
		href={lang === 'es' ? '/es' : '/'}
		class="group inline-flex items-center gap-2.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
	>
		<span
			class="inline-flex size-7 items-center justify-center bg-fg text-canvas transition-transform duration-150 ease-out motion-safe:group-hover:scale-105 motion-safe:group-active:scale-95"
			aria-hidden="true"
		>
			<Type class="size-3.5" />
		</span>
		<span class="text-[14px] font-normal tracking-tight text-fg">Patens</span>
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
	</nav>

	<!-- Lang switcher + theme toggle. Live outside the main <nav> so they
	     stay visible on mobile when the rest of the nav (Audit/Learn/
	     Compare/Help) collapses. -->
	<div class="flex items-center gap-1">
		<a
			href={switchTarget}
			hreflang={otherLocale}
			class="inline-flex h-7 items-center gap-1 rounded-sm px-1.5 text-[12px] text-fg-muted underline-offset-[5px] transition-colors hover:text-fg hover:underline focus-visible:outline-none focus-visible:text-fg focus-visible:underline focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
			aria-label={switcher.ariaLabel}
			title={switcher.switchTo}
		>
			<Globe class="size-3" aria-hidden="true" />
			{otherLocale === 'es' ? 'ES' : 'EN'}
		</a>
		<button
			type="button"
			onclick={() => settings.setTheme(settings.theme === 'dark' ? 'light' : 'dark')}
			class="inline-flex size-7 items-center justify-center rounded-sm text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:text-fg focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
			aria-label={settings.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
			title={settings.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
		>
			{#if settings.theme === 'dark'}
				<Sun class="size-3.5" aria-hidden="true" />
			{:else}
				<Moon class="size-3.5" aria-hidden="true" />
			{/if}
		</button>
	</div>
</header>
