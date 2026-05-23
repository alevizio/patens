<script lang="ts">
	import Button from './Button.svelte';
	import Panel from './Panel.svelte';
	import X from '@lucide/svelte/icons/x';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import { focusTrap } from './focus-trap';

	type Props = { open: boolean; onclose: () => void };
	let { open, onclose }: Props = $props();
</script>

{#if open}
	<div
		use:focusTrap
		class="fixed inset-0 z-50 grid place-items-center bg-fg/40 p-4 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-label="Welcome to Font Studio"
		onclick={(e) => {
			if (e.target === e.currentTarget) onclose();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') onclose();
		}}
		tabindex="-1"
	>
		<Panel
			class="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto"
		>
			<div class="mb-3 flex items-start justify-between gap-3">
				<div>
					<div class="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wider text-accent uppercase">
						<Sparkles class="size-3" /> Welcome to Font Studio
					</div>
					<h2 class="mt-1 text-xl font-semibold tracking-tight">
						Design your own typeface, one glyph at a time.
					</h2>
				</div>
				<button
					type="button"
					onclick={onclose}
					class="rounded p-1 text-fg-muted hover:bg-surface-2 hover:text-fg"
					aria-label="Dismiss"
					title="Dismiss welcome (Esc)"
				>
					<X class="size-4" />
				</button>
			</div>

			<p class="mb-4 text-sm text-fg-muted">
				The core loop is four moves. The whole tool is built around making each one fast.
			</p>

			<ol class="mb-5 divide-y divide-border border-y border-border">
				<li class="grid grid-cols-[2.5rem_1fr] gap-x-3 py-3">
					<div class="font-mono text-[11px] tracking-wider text-fg-subtle" data-numeric>01</div>
					<div>
						<div class="text-[13px] font-semibold text-fg">Sketch</div>
						<div class="mt-0.5 text-[12px] leading-relaxed text-fg-muted">
							Draw any glyph with the pencil (Apple Pencil + pressure works). Start with
							<span class="font-mono" data-numeric>H O n o</span> — the proportion control set.
						</div>
					</div>
				</li>
				<li class="grid grid-cols-[2.5rem_1fr] gap-x-3 py-3">
					<div class="font-mono text-[11px] tracking-wider text-fg-subtle" data-numeric>02</div>
					<div>
						<div class="text-[13px] font-semibold text-fg">Trace</div>
						<div class="mt-0.5 text-[12px] leading-relaxed text-fg-muted">
							Press T (or click &ldquo;Trace&rdquo;). Multi-stroke shapes get union&rsquo;d; outlines get
							smooth cubic curves via Schneider fitting. Edit points with the A tool.
						</div>
					</div>
				</li>
				<li class="grid grid-cols-[2.5rem_1fr] gap-x-3 py-3">
					<div class="font-mono text-[11px] tracking-wider text-fg-subtle" data-numeric>03</div>
					<div>
						<div class="text-[13px] font-semibold text-fg">Preview live</div>
						<div class="mt-0.5 text-[12px] leading-relaxed text-fg-muted">
							Every change re-builds the font in ~15ms via opentype.js + FontFace API.
							Type any string in the strip below the canvas to see it instantly.
						</div>
					</div>
				</li>
				<li class="grid grid-cols-[2.5rem_1fr] gap-x-3 py-3">
					<div class="font-mono text-[11px] tracking-wider text-fg-subtle" data-numeric>04</div>
					<div>
						<div class="text-[13px] font-semibold text-fg">Export</div>
						<div class="mt-0.5 text-[12px] leading-relaxed text-fg-muted">
							OTF for Font Book, WOFF2 for web, UFO for Glyphs/RoboFont/FontLab. The
							Export tab runs a pre-flight check first.
						</div>
					</div>
				</li>
			</ol>

			<p class="mb-5 text-[12px] leading-relaxed text-fg-muted">
				<span class="mr-1 font-mono text-[10px] tracking-wider uppercase text-accent-strong">
					Pro tip ·
				</span>
				You can start from an existing font — paste a GitHub URL, drop a file anywhere on this page,
				or pick from the starter library on the right.
			</p>

			<div class="mb-5 grid grid-cols-1 divide-y divide-border border-y border-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
				<a
					href="/learn"
					onclick={onclose}
					class="group block py-3 pr-4 transition-colors"
				>
					<div class="text-[12px] font-medium text-fg group-hover:text-accent-strong">
						New to type design?
					</div>
					<div class="mt-0.5 text-[11px] leading-relaxed text-fg-muted">
						Read the 8&ndash;12 week beginner path, exercises, and tools →
					</div>
				</a>
				<div class="py-3 sm:pl-4">
					<div class="text-[12px] font-medium text-fg">Already drawing?</div>
					<div class="mt-0.5 text-[11px] leading-relaxed text-fg-muted">
						Start with the Brief tab — define intent, audience, use cases before the first stroke.
					</div>
				</div>
			</div>

			<div class="flex items-center justify-end gap-2">
				<Button density="sm" onclick={onclose}>Got it — let's go</Button>
			</div>
		</Panel>
	</div>
{/if}
