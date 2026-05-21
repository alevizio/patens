<script lang="ts">
	import GlyphTile from '$lib/glyph/GlyphTile.svelte';
	import { contoursToSvgPath } from '$lib/font/path';
	import { defaultPalette } from '$lib/font/color';
	import Eye from '@lucide/svelte/icons/eye';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	let { data } = $props();
	const project = $derived(data.project);
	// Pass the project's default palette so color/gradient layers
	// render in the glyph tiles. When no palette exists, tiles fall
	// back to monochrome outlines.
	const palette = $derived(defaultPalette(project.palettes));

	// Glyph grid: only show drawn glyphs (skip empty placeholders),
	// sorted by codepoint for a stable order.
	const drawnGlyphs = $derived(
		Object.values(project.glyphs)
			.filter((g) => g.contours.length > 0)
			.sort((a, b) => a.codepoint - b.codepoint)
	);

	const ascender = $derived(project.metrics.ascender);
	const descender = $derived(project.metrics.descender);

	// Live typesetting — visitor types any text, we render it inline
	// using the project's own SVG paths. Kerning pairs from the
	// project apply automatically so visitors see the font as the
	// designer intended (not as system-fallback substitutes).
	let typeText = $state('Type something here');
	const kerningLookup = $derived.by(() => {
		const map = new Map<string, number>();
		for (const k of project.kerning) {
			if (typeof k.left !== 'number' || typeof k.right !== 'number') continue;
			map.set(`${k.left},${k.right}`, k.value);
		}
		return map;
	});
	const typeset = $derived.by(() => {
		const out: Array<{ char: string; path: string; advance: number; x: number }> = [];
		let x = 0;
		const codepoints = [...typeText];
		for (let i = 0; i < codepoints.length; i++) {
			const ch = codepoints[i];
			const cp = ch.codePointAt(0) ?? 0;
			const g = project.glyphs[cp];
			if (!g || g.contours.length === 0) {
				// Missing glyph — render as a hollow box at half-em width.
				const w = Math.round(project.metrics.unitsPerEm * 0.5);
				out.push({ char: ch, path: '', advance: w, x });
				x += w;
				continue;
			}
			out.push({ char: ch, path: contoursToSvgPath(g.contours), advance: g.advanceWidth, x });
			x += g.advanceWidth;
			// Apply kerning if there's a next character
			if (i + 1 < codepoints.length) {
				const nextCp = codepoints[i + 1].codePointAt(0) ?? 0;
				const kv = kerningLookup.get(`${cp},${nextCp}`);
				if (kv !== undefined) x += kv;
			}
		}
		return { glyphs: out, totalWidth: x };
	});

	const fontSpan = $derived(ascender - descender);
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

	<!-- Live typeset preview. Renders typed text using the project's
	     own SVG paths + kerning data, so visitors see the WIP font
	     as the designer intended. -->
	<section class="mb-10">
		<h2
			class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"
		>
			Try it
		</h2>
		<input
			type="text"
			bind:value={typeText}
			placeholder="Type something..."
			class="w-full rounded-md border border-border bg-surface px-3 py-2 text-[14px] text-fg outline-none focus:border-accent"
		/>
		<div
			class="mt-3 overflow-x-auto rounded-md border border-border bg-canvas px-4 py-6"
			style="--font-baseline: {ascender}px;"
		>
			<svg
				viewBox="0 {descender} {Math.max(typeset.totalWidth, 100)} {fontSpan}"
				preserveAspectRatio="xMinYMid meet"
				style="height: 96px; width: auto; transform: scaleY(-1); display: block;"
				aria-label="Typeset preview of {project.metadata.familyName}"
			>
				{#each typeset.glyphs as g, i (i + '-' + g.char)}
					{#if g.path}
						<path
							d={g.path}
							transform="translate({g.x} 0)"
							fill="currentColor"
							fill-rule="evenodd"
							class="text-fg"
						/>
					{:else}
						<rect
							x={g.x + 20}
							y={descender + 20}
							width={g.advance - 40}
							height={fontSpan - 40}
							fill="none"
							stroke="currentColor"
							stroke-width="20"
							stroke-dasharray="40 40"
							class="text-fg-subtle"
						/>
					{/if}
				{/each}
			</svg>
		</div>
		<p class="mt-2 text-[11px] text-fg-subtle">
			Live render with the project's kerning applied. Dashed boxes mark
			glyphs the designer hasn't drawn yet — system font won't substitute.
		</p>
	</section>

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
						colorPalette={palette}
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
