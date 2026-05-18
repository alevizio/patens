<script lang="ts">
	import X from '@lucide/svelte/icons/x';

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
				{ keys: '⌘P', label: 'Print specimen (on Specimen page)' }
			]
		},
		{
			title: 'Editor',
			rows: [
				{ keys: '[ / ]', label: 'Previous / next glyph' },
				{ keys: 'S', label: 'Toggle sketch layer' },
				{ keys: 'V', label: 'Toggle vector layer' },
				{ keys: '⇧F', label: 'Flag glyph for review' }
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
			class="relative w-[480px] max-w-[90vw] rounded-lg border border-border bg-surface shadow-xl"
		>
			<div
				class="flex items-center justify-between border-b border-border px-4 py-2.5"
			>
				<h2 class="text-[12px] font-semibold tracking-wide text-fg">
					Keyboard shortcuts
				</h2>
				<button
					type="button"
					onclick={onclose}
					class="rounded p-0.5 text-fg-subtle hover:bg-surface-2 hover:text-fg"
					aria-label="Close"
				>
					<X class="size-3.5" />
				</button>
			</div>
			<div class="grid gap-4 p-4">
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
