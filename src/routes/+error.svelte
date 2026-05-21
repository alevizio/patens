<script lang="ts">
	import { page } from '$app/state';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';

	const status = $derived(page.status);
	const isNotFound = $derived(status === 404);
	// HTTP status displayed as a Unicode-style label — 404 → "U+0404". Not a
	// real hex conversion; the joke is letting the decimal status sit inside
	// U+ notation so the "404" reads at a glance.
	const asCodepoint = $derived(`U+0${status}`);
</script>

<svelte:head>
	<title>{status} · Font Studio</title>
</svelte:head>

<div class="grid min-h-screen place-items-center bg-canvas px-6">
	<div class="text-center">
		{#if isNotFound}
			<!-- "Tofu" box — what a font renderer shows when a glyph is missing.
			     The page metaphor: this route isn't drawn in the typeface. -->
			<div
				class="mx-auto mb-8 grid size-40 place-items-center rounded-md border-2 border-fg/30 bg-fg/[0.03]"
				aria-hidden="true"
			>
				<span
					class="font-mono text-[12px] tracking-[0.2em] text-fg-subtle"
					data-numeric
				>
					{asCodepoint}
				</span>
			</div>
			<h1
				class="mb-3 text-[36px] leading-tight text-fg"
				style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
			>
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
			<h1
				class="mb-3 text-[32px] leading-tight text-fg"
				style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
			>
				Something's off.
			</h1>
			<p class="mx-auto max-w-md text-sm text-fg-muted">
				{page.error?.message ?? 'An unexpected error.'}
			</p>
			<!-- Diagnostic detail to help report errors. Only the message
			     is shown by default; the stack lives in a details block
			     so the page reads clean for non-developer users. -->
			{#if page.error && JSON.stringify(page.error) !== '{}'}
				<details
					class="mx-auto mt-6 max-w-xl rounded-md border border-border bg-surface-2/40 p-3 text-left"
				>
					<summary class="cursor-pointer text-[11px] font-mono text-fg-muted">
						Diagnostic detail
					</summary>
					<pre
						class="mt-2 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] text-fg-subtle">{JSON.stringify(page.error, null, 2)}</pre>
				</details>
			{/if}
		{/if}

		<a
			href="/"
			class="mt-8 inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3.5 py-2 text-[13px] font-medium text-fg transition-colors hover:border-accent hover:text-accent"
		>
			Back to the foundry
			<ArrowRight class="size-3.5" />
		</a>
	</div>
</div>
