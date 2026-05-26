<script lang="ts">
	// Three stacked onboarding hint banners shown above the canvas:
	//
	//  1) "Before you draw" — appears when totalDrawn === 0 and the
	//     Brief is empty. Nudges to write the brief first.
	//  2) "Start here" — appears when totalDrawn < 13. Lists the
	//     remaining control glyphs (n o H O a e s c p v y f g) so the
	//     designer hits the proportion/texture set before scattering.
	//  3) "Suggested next" — appears once at least one glyph is drawn
	//     and replaces (2). Brief-driven priority picks.
	//
	// Each banner short-circuits as soon as its condition stops applying.
	import { projectStore } from '$lib/stores/project.svelte';

	type Props = {
		projectId: string;
		briefUseCases: string[];
		showBriefHint: boolean;
		showControlHint: boolean;
		showSuggestedNext: boolean;
		controlMissing: number[];
		suggestedNext: number[];
	};
	let {
		projectId,
		briefUseCases,
		showBriefHint,
		showControlHint,
		showSuggestedNext,
		controlMissing,
		suggestedNext
	}: Props = $props();
</script>

{#if showBriefHint}
	<div
		class="flex items-center gap-3 border-b border-border bg-warn-soft/30 bg-warn/5 px-4 py-2 text-[12px] text-fg-muted"
	>
		<span class="font-medium text-warn">Before you draw →</span>
		<span>
			Type design is system design. Write a one-line intent and pick a use case or
			two — it'll guide every decision below.
		</span>
		<a
			href="/project/{projectId}/brief"
			class="ml-auto rounded border border-warn/40 bg-warn/10 px-2 py-0.5 text-[11px] font-medium text-warn-strong hover:bg-warn/15"
		>
			Open Brief →
		</a>
	</div>
{/if}

{#if showControlHint}
	<div
		class="flex items-center gap-3 border-b border-border bg-accent-soft/30 px-4 py-2 text-[12px] text-fg-muted"
	>
		<span class="font-medium text-accent">Start here →</span>
		<span
			>Draw these {controlMissing.length} first; they set proportion + texture for everything
			else.</span
		>
		<div class="ml-auto flex flex-wrap items-center gap-1">
			{#each controlMissing as cp (cp)}
				<button
					type="button"
					onclick={() => projectStore.selectGlyph(cp)}
					class="flex h-6 min-w-6 items-center justify-center rounded border border-border bg-surface px-1 text-[13px] font-medium transition-all duration-100 ease-out hover:border-accent hover:bg-accent-soft active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
					title="Jump to {String.fromCodePoint(cp)}"
				>
					{String.fromCodePoint(cp)}
				</button>
			{/each}
		</div>
	</div>
{:else if showSuggestedNext}
	<div
		class="flex items-center gap-3 border-b border-border bg-accent-soft/20 px-4 py-2 text-[12px] text-fg-muted"
	>
		<span class="font-medium text-accent">Suggested next →</span>
		<span>
			Priority picks based on your Brief use cases ({briefUseCases.join(', ') ||
				'defaults'}).
		</span>
		<div class="ml-auto flex flex-wrap items-center gap-1">
			{#each suggestedNext as cp (cp)}
				{@const ch = cp > 0x20 && cp < 0x10000 ? String.fromCodePoint(cp) : '?'}
				<button
					type="button"
					onclick={() => projectStore.selectGlyph(cp)}
					class="flex h-6 min-w-6 items-center justify-center rounded border border-border bg-surface px-1 text-[13px] font-medium transition-all duration-100 ease-out hover:border-accent hover:bg-accent-soft active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
					title="Jump to U+{cp.toString(16).toUpperCase().padStart(4, '0')}"
				>
					{ch}
				</button>
			{/each}
		</div>
	</div>
{/if}
