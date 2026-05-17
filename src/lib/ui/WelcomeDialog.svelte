<script lang="ts">
	import Button from './Button.svelte';
	import Panel from './Panel.svelte';
	import X from '@lucide/svelte/icons/x';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Wand from '@lucide/svelte/icons/wand-sparkles';
	import Eye from '@lucide/svelte/icons/eye';
	import Download from '@lucide/svelte/icons/download';
	import Sparkles from '@lucide/svelte/icons/sparkles';

	type Props = { open: boolean; onclose: () => void };
	let { open, onclose }: Props = $props();
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 grid place-items-center bg-fg/40 p-4 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		onclick={(e) => {
			if (e.target === e.currentTarget) onclose();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') onclose();
		}}
		tabindex="-1"
	>
		<Panel class="w-full max-w-xl">
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
				>
					<X class="size-4" />
				</button>
			</div>

			<p class="mb-4 text-sm text-fg-muted">
				The core loop is four moves. The whole tool is built around making each one fast.
			</p>

			<ol class="mb-4 grid gap-2.5">
				<li class="flex items-start gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2.5">
					<div class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-warn/15 text-warn">
						<Pencil class="size-3.5" />
					</div>
					<div>
						<div class="text-[13px] font-semibold text-fg">1. Sketch</div>
						<div class="text-[12px] text-fg-muted">
							Draw any glyph with the pencil (Apple Pencil + pressure works). Start with
							<span class="font-mono">H O n o</span> — the proportion control set.
						</div>
					</div>
				</li>
				<li class="flex items-start gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2.5">
					<div class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent">
						<Wand class="size-3.5" />
					</div>
					<div>
						<div class="text-[13px] font-semibold text-fg">2. Trace</div>
						<div class="text-[12px] text-fg-muted">
							Press T (or click "Trace"). Multi-stroke shapes get union'd; outlines get
							smooth cubic curves via Schneider fitting. Edit points with the A tool.
						</div>
					</div>
				</li>
				<li class="flex items-start gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2.5">
					<div class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-success/15 text-success">
						<Eye class="size-3.5" />
					</div>
					<div>
						<div class="text-[13px] font-semibold text-fg">3. Preview live</div>
						<div class="text-[12px] text-fg-muted">
							Every change re-builds the font in ~15ms via opentype.js + FontFace API.
							Type any string in the strip below the canvas to see it instantly.
						</div>
					</div>
				</li>
				<li class="flex items-start gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2.5">
					<div class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-fg/10 text-fg">
						<Download class="size-3.5" />
					</div>
					<div>
						<div class="text-[13px] font-semibold text-fg">4. Export</div>
						<div class="text-[12px] text-fg-muted">
							OTF for Font Book, WOFF2 for web, UFO for Glyphs/RoboFont/FontLab. The
							Export tab runs a pre-flight check first.
						</div>
					</div>
				</li>
			</ol>

			<div class="mb-4 rounded-md border border-accent/30 bg-accent-soft/30 px-3 py-2 text-[12px] text-fg-muted">
				<span class="font-medium text-accent">Pro tip:</span> you can start from an existing
				font — paste a GitHub URL, drop a file anywhere on this page, or pick from the
				starter library on the right.
			</div>

			<div class="flex items-center justify-end gap-2">
				<Button density="sm" onclick={onclose}>Got it — let's go</Button>
			</div>
		</Panel>
	</div>
{/if}
