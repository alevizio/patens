<script lang="ts">
	// Non-blocking welcome strip — appears at the top of the home page on
	// first visit, doesn't hide the actual product behind a modal. Reads
	// in three seconds, dismissible with one click. The deeper "what is
	// this tool" story lives in /learn for visitors who want it; this is
	// the quick orientation that gets a designer-friend straight to the
	// glyph grid.
	import X from '@lucide/svelte/icons/x';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';

	type Props = { open: boolean; onclose: () => void };
	let { open, onclose }: Props = $props();
</script>

{#if open}
	<div
		role="region"
		aria-label="Welcome to Patens"
		class="mb-6 flex items-start gap-3 rounded-lg border border-accent/30 bg-accent-soft/30 px-4 py-3 text-[13px]"
	>
		<Sparkles class="mt-0.5 size-4 shrink-0 text-accent-strong" aria-hidden="true" />
		<div class="min-w-0 flex-1">
			<div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
				<span class="font-medium text-fg">Welcome to Patens — a type design tool that teaches as you draw.</span>
				<span class="text-fg-muted">
					Sketch glyphs with a pencil. Patens traces them to vectors, audits your work
					against 94 type-design rules with plain-English fixes, and ships a real
					OpenType font when you're ready.
				</span>
			</div>
			<!-- Mono-uppercase metadata strip — reinforces the audit-led
			     positioning at a glance + matches the trust-band rhythm
			     further down the page. -->
			<div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
				<span>94 audit codes</span>
				<span aria-hidden="true">·</span>
				<span>30 one-click fixes</span>
				<span aria-hidden="true">·</span>
				<span>MIT open source</span>
				<span aria-hidden="true">·</span>
				<span>no installs</span>
			</div>
			<div class="mt-3 flex flex-wrap items-center gap-3 text-[12px]">
				<a
					href="/project/demo/edit"
					onclick={onclose}
					class="group inline-flex items-center gap-1 font-medium text-accent-strong hover:underline"
				>
					Open the example project
					<ArrowRight class="size-3 transition-transform group-hover:translate-x-0.5" />
				</a>
				<a
					href="/audit"
					onclick={onclose}
					class="text-fg-muted hover:text-fg-strong"
				>
					Why audit-as-teaching →
				</a>
				<a
					href="/learn"
					onclick={onclose}
					class="text-fg-muted hover:text-fg-strong"
				>
					New to type design? Start here →
				</a>
			</div>
		</div>
		<button
			type="button"
			onclick={onclose}
			class="shrink-0 rounded p-1 text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
			aria-label="Dismiss welcome"
			title="Dismiss"
		>
			<X class="size-3.5" />
		</button>
	</div>
{/if}
