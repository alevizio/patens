<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	let { data } = $props();
	const source = $derived(data.source);

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
				'<a href="$2" class="text-accent-strong underline-offset-2 hover:underline">$1</a>'
			)
			.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
			.replace(/\*([^*]+)\*/g, '<em>$1</em>');

	const escapeHtml = (s: string): string =>
		s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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
	<title>Changelog · Font Studio</title>
	<meta name="description" content="Font Studio release history — every version since v0.4." />
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
	<a
		href="/"
		class="mb-8 inline-flex items-center gap-1.5 text-[12px] text-fg-muted hover:text-fg"
	>
		<ArrowLeft class="size-3" />
		Back to the foundry
	</a>

	<article class="prose-changelog text-fg">
		{#each blocks as block, i (i)}
			{#if block.type === 'h1'}
				<h1
					class="mb-6 text-[36px] leading-tight tracking-tight"
					style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
				>
					{block.text}
				</h1>
			{:else if block.type === 'h2'}
				<h2
					class="mt-10 mb-3 text-[24px] tracking-tight"
					style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
				>
					{block.text}
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
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				<p class="mb-4 text-[14px] leading-relaxed text-fg-muted">
					{@html renderInline(escapeHtml(block.text))}
				</p>
			{/if}
		{/each}
	</article>
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
