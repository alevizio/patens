<script lang="ts">
	import { page } from '$app/state';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import SiteFooter from '$lib/ui/SiteFooter.svelte';

	const status = $derived(page.status);
	const isNotFound = $derived(status === 404);
	// Share-link 404s have a specific cause (the project lives in the
	// originator's IndexedDB, not in any cloud) that deserves a different
	// message + recovery path than a generic missing page.
	const isShareLink = $derived(page.url.pathname.startsWith('/share/') && status === 404);
	// HTTP status displayed as a Unicode-style label — 404 → "U+0404". Not a
	// real hex conversion; the joke is letting the decimal status sit inside
	// U+ notation so the "404" reads at a glance.
	const asCodepoint = $derived(`U+0${status}`);
</script>

<svelte:head>
	<title>{status} · Patens</title>
</svelte:head>

<!-- Centered tofu-box hero — intentional focus. SiteFooter sits below
     the fold so visitors who scroll get the full sitemap to recover
     from. Header omitted (the U+0XXX codepoint badge IS the
     orientation cue here). -->
<div class="flex min-h-screen flex-col bg-canvas">
<div class="grid flex-1 place-items-center px-6">
	<div class="text-center">
		{#if isShareLink}
			<!-- Share-link 404: the project lives in the originator's
			     IndexedDB, not in any cloud. Explain + offer two paths
			     forward: the public demo, or asking the originator for a
			     .font.json file (the async-share workflow). -->
			<div
				class="mx-auto mb-8 grid size-40 place-items-center rounded-none border-2 border-fg/30 bg-fg/[0.03]"
				aria-hidden="true"
			>
				<span
					class="font-mono text-[12px] tracking-[0.2em] text-fg-subtle"
					data-numeric
				>
					{asCodepoint}
				</span>
			</div>
			<h1 class="mb-3 text-[32px] leading-tight text-fg">
				Project not found.
			</h1>
			<p class="mx-auto max-w-lg text-[14px] leading-relaxed text-fg-muted">
				The share URL was either never uploaded to the cloud, or this
				deployment doesn't have cloud sharing configured.
			</p>
			<div class="mx-auto mt-6 flex max-w-md flex-col gap-3 text-left">
				<a
					href="/"
					class="group flex items-baseline gap-3 rounded-none border border-border bg-surface px-4 py-3 transition-colors hover:border-accent"
				>
					<span class="flex-1">
						<span class="block text-[14px] text-fg group-hover:text-accent-strong">
							Back to patens.design
						</span>
						<span class="block text-[12px] text-fg-muted">
							Patens is in private alpha — request an invite from the home page
						</span>
					</span>
					<ArrowRight class="size-4 shrink-0 text-fg-subtle group-hover:text-accent-strong" />
				</a>
			</div>
		{:else if isNotFound}
			<!-- "Tofu" box — what a font renderer shows when a glyph is missing.
			     The page metaphor: this route isn't drawn in the typeface. -->
			<div
				class="mx-auto mb-8 grid size-40 place-items-center rounded-none border-2 border-fg/30 bg-fg/[0.03]"
				aria-hidden="true"
			>
				<span
					class="font-mono text-[12px] tracking-[0.2em] text-fg-subtle"
					data-numeric
				>
					{asCodepoint}
				</span>
			</div>
			<h1 class="mb-3 text-[36px] leading-tight text-fg">
				Not in this typeface.
			</h1>
			<p class="mx-auto max-w-md text-sm text-fg-muted">
				The page you're looking for isn't part of the design. Either the URL
				is off by a glyph, or this route was never drawn.
			</p>
		{:else}
			<div
				class="mx-auto mb-8 font-mono text-[11px] tracking-[0.2em] text-fg-subtle"
				data-numeric
			>
				{asCodepoint}
			</div>
			<h1 class="mb-3 text-[32px] leading-tight text-fg">
				Something's off.
			</h1>
			<p class="mx-auto max-w-md text-sm text-fg-muted">
				{page.error?.message ?? 'An unexpected error.'}
			</p>
			<!-- Diagnostic detail — always shown so users can see what
			     went wrong without opening DevTools. JSON.stringify is
			     wrapped in try/catch to survive cyclic / non-serialisable
			     payloads (otherwise the error page itself would crash and
			     fall back to the Vercel generic 500). -->
			<details
				class="mx-auto mt-6 max-w-xl rounded-none border border-border bg-surface-2/40 p-3 text-left"
				open
			>
				<summary class="cursor-pointer text-[11px] font-mono text-fg-muted">
					Diagnostic detail (status {status})
				</summary>
				<pre
					class="mt-2 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] text-fg-subtle">{(() => {
						try {
							return JSON.stringify(page.error, null, 2);
						} catch {
							return String(page.error ?? '(no error payload)');
						}
					})()}</pre>
				<p class="mt-2 font-mono text-[10px] text-fg-subtle">URL: {page.url.pathname}</p>
			</details>
		{/if}

		{#if !isShareLink}
			<a
				href="/"
				class="mt-8 inline-flex items-center gap-1.5 rounded-none border border-border bg-surface px-3.5 py-2 text-[13px] font-medium text-fg transition-colors hover:border-accent hover:text-accent"
			>
				Back to the foundry
				<ArrowRight class="size-3.5" />
			</a>
		{/if}
	</div>
</div>
<div class="mx-auto w-full max-w-5xl px-4 sm:px-6">
	<SiteFooter />
</div>
</div>
