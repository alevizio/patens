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
</script>

<header
	class="mb-12 flex items-center justify-between gap-4 border-b border-border/50 pb-4"
>
	<a href="/" class="group inline-flex items-center gap-2.5">
		<span
			class="inline-flex size-7 items-center justify-center rounded-lg bg-fg text-canvas transition-transform group-hover:scale-105"
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

	<nav aria-label="Primary" class="hidden flex-wrap items-baseline gap-x-5 gap-y-2 text-[12px] sm:flex">
		{#each nav as item (item.href)}
			<a
				href={item.href}
				class="text-fg-muted underline-offset-[5px] transition-colors hover:text-fg hover:underline"
				aria-current={current === item.href ? 'page' : undefined}
				class:text-fg={current === item.href}
				class:font-medium={current === item.href}
			>
				{item.label}
			</a>
		{/each}
		<a
			href="https://github.com/alevizio/patens"
			class="text-fg-muted underline-offset-[5px] transition-colors hover:text-fg hover:underline"
			rel="noopener"
		>
			GitHub
		</a>
	</nav>
</header>
