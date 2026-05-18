<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { previewStore } from '$lib/stores/preview.svelte';

	const project = $derived(projectStore.project);

	const drawnGlyphs = $derived.by(() => {
		if (!project) return [];
		return Object.values(project.glyphs)
			.filter((g) => g.contours.length > 0 || (g.components && g.components.length > 0))
			.sort((a, b) => a.codepoint - b.codepoint);
	});

	const PANGRAMS = [
		'The quick brown fox jumps over the lazy dog',
		'Pack my box with five dozen liquor jugs',
		'Sphinx of black quartz, judge my vow',
		'How vexingly quick daft zebras jump'
	];

	const PARAGRAPH = `In typography, a typeface is a design of letters, numbers and other symbols, to be used in printing or for electronic display. Most typefaces include variations in size, weight, slope, width — letting designers express texture, hierarchy, and voice across a single coherent system.`;

	const today = new Date().toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});

	const printPage = () => window.print();
</script>

<svelte:head>
	<title>{project?.metadata.familyName ?? 'Specimen'} — specimen</title>
</svelte:head>

{#if !project}
	<div class="flex h-full items-center justify-center text-fg-muted">Loading…</div>
{:else}
	<div class="h-full overflow-auto bg-canvas">
		<div class="screen-toolbar sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-6 py-2.5">
			<div class="text-[12px] text-fg-muted">
				Specimen — {drawnGlyphs.length} drawn glyphs · {previewStore.sizeKb.toFixed(1)} KB
			</div>
			<button
				type="button"
				onclick={printPage}
				class="rounded-md bg-fg px-3 py-1 text-[12px] font-medium text-canvas hover:bg-fg/90"
			>
				Print / Save as PDF
			</button>
		</div>

		<div class="specimen mx-auto bg-white text-black">
			<!-- Cover -->
			<section class="page">
				<header class="mb-12 flex items-baseline justify-between">
					<div class="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
						{today}
					</div>
					<div class="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
						Font Studio specimen
					</div>
				</header>
				<div class="mt-16">
					<div class="preview-font leading-[0.9]" style="font-size: 180px;">
						{project.metadata.familyName[0] ?? 'A'}{project.metadata.familyName[1]?.toLowerCase() ?? 'a'}
					</div>
				</div>
				<div class="mt-12">
					<h1 class="preview-font text-7xl font-medium leading-tight">
						{project.metadata.familyName}
					</h1>
					<div class="mt-2 text-2xl text-neutral-500 preview-font">{project.metadata.styleName}</div>
				</div>
				<div class="mt-auto grid grid-cols-3 gap-6 text-[11px] text-neutral-500">
					<div>
						<div class="font-semibold text-neutral-900">Designer</div>
						<div>{project.metadata.designer || '—'}</div>
					</div>
					<div>
						<div class="font-semibold text-neutral-900">Version</div>
						<div>{project.metadata.version}</div>
					</div>
					<div>
						<div class="font-semibold text-neutral-900">Glyphs</div>
						<div>{drawnGlyphs.length} drawn</div>
					</div>
				</div>
			</section>

			{#if project.brief?.designNotes?.trim()}
				<!-- Design notes (Hoefler-style essay) -->
				<section class="page">
					<h2 class="mb-6 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
						Design notes
					</h2>
					<div class="max-w-prose whitespace-pre-line text-[15px] leading-[1.65] text-neutral-800">
						{project.brief.designNotes}
					</div>
				</section>
			{/if}

			<!-- Character set -->
			<section class="page">
				<h2 class="mb-6 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
					Character set
				</h2>
				<div class="preview-font flex flex-wrap gap-x-3 gap-y-1 text-4xl leading-snug">
					{#each drawnGlyphs as g (g.codepoint)}
						<span>{String.fromCodePoint(g.codepoint)}</span>
					{/each}
				</div>
			</section>

			<!-- Display block -->
			<section class="page">
				<h2 class="mb-6 text-[10px] uppercase tracking-[0.2em] text-neutral-500">Display</h2>
				<div class="preview-font space-y-6 leading-[0.95]">
					<div class="text-7xl">Type design is system design.</div>
					<div class="text-5xl text-neutral-700">Rhythm, contrast, proportion, weight.</div>
					<div class="text-3xl text-neutral-500">
						Every glyph belongs to a system, not a moment.
					</div>
				</div>
			</section>

			<!-- Waterfall -->
			<section class="page">
				<h2 class="mb-6 text-[10px] uppercase tracking-[0.2em] text-neutral-500">Waterfall</h2>
				<div class="space-y-3">
					{#each [10, 12, 14, 18, 24, 32, 48, 64] as size (size)}
						<div class="flex items-baseline gap-4">
							<span class="w-10 text-right font-mono text-[10px] text-neutral-400" data-numeric>
								{size}px
							</span>
							<span class="preview-font flex-1 leading-[1.3]" style="font-size: {size}px;">
								{PANGRAMS[0]}
							</span>
						</div>
					{/each}
				</div>
			</section>

			<!-- Paragraph -->
			<section class="page">
				<h2 class="mb-6 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
					Paragraph
				</h2>
				<p class="preview-font max-w-prose text-lg leading-[1.6]">
					{PARAGRAPH}
				</p>
				<p class="preview-font mt-4 max-w-prose text-base leading-[1.55] text-neutral-700">
					{PARAGRAPH}
				</p>
				<p class="preview-font mt-4 max-w-prose text-sm leading-[1.5] text-neutral-700">
					{PARAGRAPH}
				</p>
			</section>

			<!-- Pangrams -->
			<section class="page">
				<h2 class="mb-6 text-[10px] uppercase tracking-[0.2em] text-neutral-500">Pangrams</h2>
				<div class="preview-font space-y-4 text-2xl leading-snug">
					{#each PANGRAMS as p (p)}
						<div>{p}</div>
					{/each}
				</div>
			</section>

			<!-- Colophon -->
			<section class="page">
				<h2 class="mb-6 text-[10px] uppercase tracking-[0.2em] text-neutral-500">Colophon</h2>
				<dl class="grid grid-cols-[160px_1fr] gap-y-2 text-[13px]">
					<dt class="text-neutral-500">Family</dt>
					<dd>{project.metadata.familyName}</dd>
					<dt class="text-neutral-500">Style</dt>
					<dd>{project.metadata.styleName}</dd>
					<dt class="text-neutral-500">Version</dt>
					<dd>{project.metadata.version}</dd>
					<dt class="text-neutral-500">Designer</dt>
					<dd>{project.metadata.designer || '—'}</dd>
					<dt class="text-neutral-500">Copyright</dt>
					<dd>{project.metadata.copyright || '—'}</dd>
					<dt class="text-neutral-500">License</dt>
					<dd class="whitespace-pre-line">{project.metadata.license || '—'}</dd>
					<dt class="text-neutral-500">UPM</dt>
					<dd data-numeric>{project.metrics.unitsPerEm}</dd>
					<dt class="text-neutral-500">Cap height / x-height</dt>
					<dd data-numeric>
						{project.metrics.capHeight} / {project.metrics.xHeight}
					</dd>
					<dt class="text-neutral-500">Ascender / descender</dt>
					<dd data-numeric>
						{project.metrics.ascender} / {project.metrics.descender}
					</dd>
					<dt class="text-neutral-500">Glyphs drawn</dt>
					<dd data-numeric>{drawnGlyphs.length}</dd>
					{#if (project.axes ?? []).length > 0}
						<dt class="text-neutral-500">Axes</dt>
						<dd data-numeric>
							{project.axes?.map((a) => `${a.tag} ${a.minimum}..${a.maximum}`).join(', ')}
						</dd>
					{/if}
					{#if (project.instances ?? []).length > 0}
						<dt class="text-neutral-500">Instances</dt>
						<dd>{project.instances?.map((i) => i.styleName).join(', ')}</dd>
					{/if}
				</dl>

				{#if project.changelog && project.changelog.length > 0}
					<h2 class="mt-12 mb-6 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
						Changelog
					</h2>
					<dl class="grid grid-cols-[120px_1fr] gap-y-3 text-[13px]">
						{#each project.changelog as e (e.id)}
							<dt class="font-mono text-neutral-500" data-numeric>
								v{e.version}
								<span class="block text-[10px]">
									{new Date(e.date).toLocaleDateString(undefined, {
										year: 'numeric',
										month: 'short',
										day: 'numeric'
									})}
								</span>
							</dt>
							<dd class="whitespace-pre-line">{e.notes}</dd>
						{/each}
					</dl>
				{/if}
			</section>
		</div>
	</div>
{/if}

<style>
	.specimen {
		max-width: 8.5in;
		padding: 0 0.75in;
	}
	.page {
		min-height: 11in;
		padding: 1in 0;
		display: flex;
		flex-direction: column;
		page-break-after: always;
		break-after: page;
	}
	.page:last-child {
		page-break-after: auto;
		break-after: auto;
	}
	@media print {
		.screen-toolbar {
			display: none !important;
		}
		.specimen {
			max-width: none;
			padding: 0;
		}
		.page {
			padding: 0.75in;
		}
		:global(body) {
			background: #fff !important;
		}
	}
</style>
