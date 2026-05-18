<script lang="ts">
	import X from '@lucide/svelte/icons/x';
	import Keyboard from '@lucide/svelte/icons/keyboard';

	type Props = { open: boolean; onclose: () => void };
	let { open, onclose }: Props = $props();

	type Row = { keys: string; label: string };
	type Group = { title: string; rows: Row[] };

	const groups: Group[] = [
		{
			title: 'Project',
			rows: [
				{ keys: '⌘S', label: 'Save now' },
				{ keys: '⌘⇧L', label: 'Lock / unlock project' },
				{ keys: '⌘⇧B', label: 'Open Brief' },
				{ keys: '⌘⇧R', label: 'Open Release' },
				{ keys: '⌘⇧E', label: 'Quick-export OTF' },
				{ keys: '⌘P', label: 'Print specimen (on Specimen page)' },
				{ keys: '⌘K', label: 'Open command palette' },
				{ keys: '/', label: 'Open command palette' }
			]
		},
		{
			title: 'Editor — tools',
			rows: [
				{ keys: 'P', label: 'Pencil' },
				{ keys: 'E', label: 'Eraser' },
				{ keys: 'A', label: 'Edit points' },
				{ keys: 'T', label: 'Trace sketch to vector' }
			]
		},
		{
			title: 'Editor — navigation',
			rows: [
				{ keys: '[', label: 'Previous glyph' },
				{ keys: ']', label: 'Next glyph' },
				{ keys: '/', label: 'Open glyph palette' },
				{ keys: '⌘K', label: 'Open glyph palette' }
			]
		},
		{
			title: 'Editor — layers',
			rows: [
				{ keys: 'S', label: 'Toggle sketch layer' },
				{ keys: 'V', label: 'Toggle vector layer' },
				{ keys: 'G', label: 'Toggle grid' },
				{ keys: 'R', label: 'Toggle reference glyph' },
				{ keys: 'O', label: 'Toggle onion-skin neighbours' },
				{ keys: 'X', label: 'Toggle anchors' }
			]
		},
		{
			title: 'Editor — history & clipboard',
			rows: [
				{ keys: '⌘Z', label: 'Undo' },
				{ keys: '⌘⇧Z', label: 'Redo' },
				{ keys: '⌘⇧C', label: 'Copy glyph' },
				{ keys: '⌘⇧V', label: 'Paste glyph' }
			]
		},
		{
			title: 'Editor — status',
			rows: [
				{ keys: '1', label: 'Mark empty' },
				{ keys: '2', label: 'Mark sketch' },
				{ keys: '3', label: 'Mark draft' },
				{ keys: '4', label: 'Mark final' },
				{ keys: '`', label: 'Toggle pin' },
				{ keys: '⇧F', label: 'Toggle flag for review' }
			]
		},
		{
			title: 'Help',
			rows: [{ keys: '?', label: 'Show this dialog' }]
		}
	];

	const handleKey = (e: KeyboardEvent) => {
		if (open && e.key === 'Escape') {
			e.preventDefault();
			onclose();
		}
	};
</script>

<svelte:window onkeydown={handleKey} />

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-canvas/70 backdrop-blur-sm"
		role="presentation"
	>
		<button
			type="button"
			class="absolute inset-0 cursor-default"
			onclick={onclose}
			aria-label="Close shortcuts"
			tabindex="-1"
		></button>
		<div
			role="dialog"
			aria-modal="true"
			aria-label="Keyboard shortcuts"
			class="relative max-h-[80vh] w-[640px] max-w-[90vw] overflow-y-auto rounded-lg border border-border bg-surface shadow-xl"
		>
			<div
				class="sticky top-0 flex items-center justify-between border-b border-border bg-surface px-4 py-2.5"
			>
				<div class="flex items-center gap-2">
					<Keyboard class="size-4 text-fg-muted" />
					<h2 class="text-[12px] font-semibold tracking-wide text-fg">
						Keyboard shortcuts
					</h2>
				</div>
				<button
					type="button"
					onclick={onclose}
					class="rounded p-0.5 text-fg-subtle hover:bg-surface-2 hover:text-fg"
					aria-label="Close"
				>
					<X class="size-3.5" />
				</button>
			</div>
			<div class="grid gap-5 p-5 sm:grid-cols-2">
				{#each groups as g (g.title)}
					<div>
						<div
							class="mb-1.5 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"
						>
							{g.title}
						</div>
						<dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[12px]">
							{#each g.rows as r (r.keys)}
								<dt
									class="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-fg"
									data-numeric
								>
									{r.keys}
								</dt>
								<dd class="text-fg-muted">{r.label}</dd>
							{/each}
						</dl>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}
