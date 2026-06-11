<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Rss from '@lucide/svelte/icons/rss';

	import SiteFooter from '$lib/ui/SiteFooter.svelte';
	import SiteHeader from '$lib/ui/SiteHeader.svelte';
	import { parseReleases } from './rss.xml/parse';

	let { data } = $props();
	const source = $derived(data.source);

	// Reuse the parser that drives /changelog/rss.xml so the structured-
	// data Article entries are guaranteed-consistent with the RSS feed.
	const releases = $derived(parseReleases(source));

	// Build one Article entry per release for AI-engine citation. Each
	// release becomes a discrete entity that can be cited when asked
	// "what changed in Patens v1.5.2?" or "when did Patens add the CLI?"
	const releaseArticles = $derived(
		releases.slice(0, 10).map((r) => ({
			'@type': 'Article',
			'@id': `https://patens.design/changelog#${r.anchor}`,
			headline: `Patens v${r.version}`,
			datePublished: r.date,
			dateModified: r.date,
			author: {
				'@type': 'Person',
				name: 'Alejandro Vizio',
				url: 'https://github.com/alevizio'
			},
			publisher: {
				'@type': 'Organization',
				name: 'Patens',
				url: 'https://patens.design'
			},
			mainEntityOfPage: `https://patens.design/changelog#${r.anchor}`,
			// First ~200 chars of the release body strips markdown markers for
			// a clean description. Doesn't try to be perfect; just provides
			// a citation-friendly summary.
			description: r.body
				.replace(/^###?\s+\S+\s*\n/, '')
				.replace(/[#*`[\]()]/g, '')
				.replace(/\s+/g, ' ')
				.trim()
				.slice(0, 200)
		}))
	);

	/**
	 * Tiny markdown renderer — covers the subset CHANGELOG.md actually
	 * uses (headings, links, code, tables, lists, bold, italic). Not a
	 * general-purpose parser; intentional to avoid adding a markdown
	 * dependency for one consumer.
	 *
	 * Order matters: code spans and links first so their content isn't
	 * touched by the bold/italic regexes that come after.
	 */
	const renderInline = (s: string): string =>
		s
			.replace(/`([^`]+)`/g, '<code>$1</code>')
			.replace(
				/\[([^\]]+)\]\(([^)]+)\)/g,
				'<a href="$2" class="text-accent-strong underline underline-offset-2">$1</a>'
			)
			.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
			.replace(/\*([^*]+)\*/g, '<em>$1</em>');

	const escapeHtml = (s: string): string =>
		s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

	const slugify = (s: string): string =>
		s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

	type Block =
		| { type: 'h1' | 'h2' | 'h3'; text: string }
		| { type: 'p'; text: string }
		| { type: 'ul'; items: string[] }
		| { type: 'hr' };

	const parse = (md: string): Block[] => {
		const lines = md.split('\n');
		const out: Block[] = [];
		let i = 0;
		while (i < lines.length) {
			const line = lines[i];
			if (line.startsWith('# ')) {
				out.push({ type: 'h1', text: line.slice(2) });
				i++;
			} else if (line.startsWith('## ')) {
				out.push({ type: 'h2', text: line.slice(3) });
				i++;
			} else if (line.startsWith('### ')) {
				out.push({ type: 'h3', text: line.slice(4) });
				i++;
			} else if (line.startsWith('---')) {
				out.push({ type: 'hr' });
				i++;
			} else if (line.startsWith('- ')) {
				const items: string[] = [];
				while (i < lines.length && lines[i].startsWith('- ')) {
					items.push(lines[i].slice(2));
					i++;
				}
				out.push({ type: 'ul', items });
			} else if (line.trim() === '') {
				i++;
			} else if (line.startsWith('|')) {
				// Skip tables — CHANGELOG doesn't use them currently.
				while (i < lines.length && lines[i].startsWith('|')) i++;
			} else {
				// Accumulate a paragraph until blank line / next block.
				const chunk: string[] = [line];
				i++;
				while (
					i < lines.length &&
					lines[i].trim() !== '' &&
					!lines[i].startsWith('#') &&
					!lines[i].startsWith('- ') &&
					!lines[i].startsWith('|') &&
					!lines[i].startsWith('---')
				) {
					chunk.push(lines[i]);
					i++;
				}
				out.push({ type: 'p', text: chunk.join(' ') });
			}
		}
		return out;
	};

	const blocks = $derived(parse(source));
</script>

<svelte:head>
	<title>Changelog (2026) · Patens — release history since v0.4</title>
	<meta name="description" content="Patens release history — every version since v0.4. Updated through 2026." />
	<link rel="canonical" href="https://patens.design/changelog" />
	<meta property="og:title" content="Changelog (2026) · Patens" />
	<meta property="og:description" content="Patens release history — every version since v0.4. Updated through 2026." />
	<meta property="og:image" content="https://patens.design/og/brand" />
	<meta property="og:image:alt" content="Patens — open-source browser-native type design tool with a 105-code audit module" />
	<meta name="twitter:title" content="Changelog (2026) · Patens" />
	<meta name="twitter:description" content="Patens release history — every version since v0.4." />
	<meta name="twitter:image" content="https://patens.design/og/brand" />
	<meta name="twitter:image:alt" content="Patens — open-source browser-native type design tool with a 105-code audit module" />
	<!-- RSS autodiscovery — feed readers (Feedly, NetNewsWire, etc.) probe
	     the homepage for <link rel="alternate" type="application/rss+xml">
	     and surface the feed in their subscribe UI. -->
	<link
		rel="alternate"
		type="application/rss+xml"
		title="Patens · Changelog"
		href="/changelog/rss.xml"
	/>
	<!-- BreadcrumbList for AI-engine hierarchy + one Article entry per
	     release (limited to the 10 most recent so the SSR payload doesn't
	     bloat). AI engines (ChatGPT, Claude, Perplexity, Gemini) can cite
	     individual releases as discrete entities when asked "what changed
	     in Patens vX.Y.Z" / "when did Patens ship the CLI" / etc. -->
	<!-- eslint-disable svelte/no-at-html-tags, no-useless-escape -->
	{@html `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'BreadcrumbList',
				itemListElement: [
					{ '@type': 'ListItem', position: 1, name: 'Patens', item: 'https://patens.design' },
					{ '@type': 'ListItem', position: 2, name: 'Changelog', item: 'https://patens.design/changelog' }
				]
			},
			...releaseArticles
		]
	}).replace(/<\/script/g, '<\\/script')}<\/script>`}
	<!-- eslint-enable svelte/no-at-html-tags, no-useless-escape -->
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
	<SiteHeader current="/changelog" />

	<div class="mb-8 flex items-baseline justify-between gap-3">
		<a
			href="/"
			class="inline-flex items-center gap-1.5 text-[12px] text-fg-muted hover:text-fg"
		>
			<ArrowLeft class="size-3" />
			Back to the foundry
		</a>
		<a
			href="/changelog/rss.xml"
			class="inline-flex items-center gap-1.5 text-[12px] text-fg-muted hover:text-fg"
			title="Subscribe to release notes via RSS"
		>
			<Rss class="size-3" />
			RSS
		</a>
	</div>

	<article class="prose-changelog text-fg">
		{#each blocks as block, i (i)}
			{#if block.type === 'h1'}
				<h1
					class="mb-6 text-[48px] leading-tight tracking-tight"
					
				>
					{block.text}
				</h1>
			{:else if block.type === 'h2'}
				<h2
					id={slugify(block.text)}
					class="group mt-12 mb-4 scroll-mt-8 text-[28px] tracking-tight"
					
				>
					<a
						href={`#${slugify(block.text)}`}
						class="inline-flex items-baseline gap-2 hover:text-accent-strong"
					>
						{block.text}
						<span
							class="text-[14px] text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100"
							aria-hidden="true"
						>
							#
						</span>
					</a>
				</h2>
			{:else if block.type === 'h3'}
				<h3 class="mt-5 mb-2 text-[14px] font-semibold uppercase tracking-wider text-fg-subtle">
					{block.text}
				</h3>
			{:else if block.type === 'hr'}
				<hr class="my-8 border-border" />
			{:else if block.type === 'ul'}
				<ul class="mb-4 list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed text-fg-muted">
					{#each block.items as item (item)}
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						<li>{@html renderInline(escapeHtml(item))}</li>
					{/each}
				</ul>
			{:else if block.type === 'p'}
				<p class="mb-4 text-[14px] leading-relaxed text-fg-muted">
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html renderInline(escapeHtml(block.text))}
				</p>
			{/if}
		{/each}
	</article>
	<SiteFooter />
</div>

<style>
	.prose-changelog :global(code) {
		font-family: ui-monospace, 'Menlo', monospace;
		font-size: 0.9em;
		padding: 0.1em 0.35em;
		background: var(--color-surface-2, rgba(0, 0, 0, 0.05));
		border-radius: 4px;
	}
	.prose-changelog :global(strong) {
		font-weight: 600;
		color: var(--color-fg, #111);
	}
	.prose-changelog :global(em) {
		/* Project rule: no italic in UI. Mark emphasis via color + a
		   subtle font-weight bump instead. */
		color: var(--color-fg, #111);
		font-weight: 500;
	}
</style>
