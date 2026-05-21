<script lang="ts">
	import GlyphTile from '$lib/glyph/GlyphTile.svelte';
	import Eye from '@lucide/svelte/icons/eye';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	let { data } = $props();
	const project = $derived(data.project);

	// Glyph grid: only show drawn glyphs (skip empty placeholders),
	// sorted by codepoint for a stable order.
	const drawnGlyphs = $derived(
		Object.values(project.glyphs)
			.filter((g) => g.contours.length > 0)
			.sort((a, b) => a.codepoint - b.codepoint)
	);

	const ascender = $derived(project.metrics.ascender);
	const descender = $derived(project.metrics.descender);
</script>

<svelte:head>
	<title>{project.metadata.familyName} — Shared view</title>
	<meta name="description" content="Read-only view of {project.metadata.familyName}" />
</svelte:head>

<div class="mx-auto max-w-4xl px-6 py-8">
	<!-- Read-only banner — clarifies what the route is for. -->
	<div
		class="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface-2/60 px-3 py-1 text-[11px] font-semibold tracking-wide uppercase text-fg-muted"
	>
		<Eye class="size-3" />
		<span>Shared view · read-only</span>
	</div>

	<header class="mb-8">
		<h1
			class="text-[36px] leading-tight tracking-tight text-fg"
			style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
		>
			{project.metadata.familyName}
		</h1>
		<p class="mt-1 text-[13px] text-fg-muted">
			{project.metadata.styleName} · designed by {project.metadata.designer || 'Unknown'}
		</p>
		{#if project.description}
			<p class="mt-3 max-w-prose text-[14px] leading-relaxed text-fg">
				{project.description}
			</p>
		{/if}
	</header>

	<!-- Drawn glyph grid. Counts give context for the work-in-progress
	     state without spilling into editor chrome. -->
	<section class="mb-10">
		<h2
			class="mb-3 flex items-baseline justify-between text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"
		>
			<span>Glyphs</span>
			<span class="font-mono normal-case text-fg-subtle" data-numeric>
				{drawnGlyphs.length} drawn · {Object.keys(project.glyphs).length} total
			</span>
		</h2>
		{#if drawnGlyphs.length === 0}
			<p class="rounded border border-border bg-surface-2/40 p-6 text-center text-[13px] text-fg-muted">
				No glyphs drawn yet.
			</p>
		{:else}
			<div class="grid grid-cols-8 gap-1 sm:grid-cols-10 md:grid-cols-12">
				{#each drawnGlyphs as g (g.codepoint)}
					<GlyphTile
						glyph={g}
						size={48}
						showLabel={false}
						{ascender}
						{descender}
					/>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Metadata footer — vendor + license info so the recipient
	     understands the legal context of what they're looking at. -->
	<footer class="border-t border-border pt-6 text-[12px] leading-relaxed text-fg-muted">
		<dl class="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3">
			<div>
				<dt class="text-[10px] font-semibold tracking-wider uppercase text-fg-subtle">
					Version
				</dt>
				<dd class="font-mono text-fg" data-numeric>{project.metadata.version}</dd>
			</div>
			<div>
				<dt class="text-[10px] font-semibold tracking-wider uppercase text-fg-subtle">
					License
				</dt>
				<dd class="text-fg">{project.metadata.license || '—'}</dd>
			</div>
			<div>
				<dt class="text-[10px] font-semibold tracking-wider uppercase text-fg-subtle">
					Vendor
				</dt>
				<dd class="font-mono text-fg" data-numeric>{project.metadata.vendorID || '—'}</dd>
			</div>
		</dl>
		{#if project.metadata.copyright}
			<p class="mt-4 text-fg-muted">{project.metadata.copyright}</p>
		{/if}
	</footer>

	<div class="mt-10">
		<a
			href="/"
			class="inline-flex items-center gap-1.5 text-[12px] text-fg-muted hover:text-fg"
		>
			<ArrowLeft class="size-3" />
			Back to studio
		</a>
	</div>
</div>
