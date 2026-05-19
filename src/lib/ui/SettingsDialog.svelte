<script lang="ts">
	import { settings } from '$lib/stores/settings.svelte';
	import Button from './Button.svelte';
	import Input from './Input.svelte';
	import Field from './Field.svelte';
	import Panel from './Panel.svelte';
	import X from '@lucide/svelte/icons/x';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';
	import Monitor from '@lucide/svelte/icons/monitor';

	type Props = { open: boolean; onclose: () => void };
	let { open, onclose }: Props = $props();

	let draftKey = $state(settings.anthropicApiKey);
	let showKey = $state(false);
	let draftModel = $state(settings.preferredModel);

	$effect(() => {
		if (open) {
			draftKey = settings.anthropicApiKey;
			draftModel = settings.preferredModel;
		}
	});

	const save = () => {
		settings.setApiKey(draftKey);
		settings.setPreferredModel(draftModel);
		onclose();
	};

	const clear = () => {
		if (confirm('Remove the saved API key from this browser?')) {
			settings.clear();
			draftKey = '';
		}
	};
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
		<Panel class="w-full max-w-lg">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-lg font-semibold tracking-tight">Settings</h2>
				<button
					type="button"
					onclick={onclose}
					class="rounded p-1 text-fg-muted hover:bg-surface-2 hover:text-fg"
					aria-label="Close"
					title="Close settings (Esc)"
				>
					<X class="size-4" />
				</button>
			</div>

			<div class="grid gap-4">
				<div>
					<h3 class="mb-2 inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
						<Sun class="size-3" /> Appearance
					</h3>
					<div class="grid grid-cols-3 gap-1.5">
						{#each [{ id: 'system', label: 'System', icon: Monitor }, { id: 'light', label: 'Light', icon: Sun }, { id: 'dark', label: 'Dark', icon: Moon }] as opt (opt.id)}
							{@const Icon = opt.icon}
							<button
								type="button"
								onclick={() => settings.setTheme(opt.id as 'system' | 'light' | 'dark')}
								class="inline-flex items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-[12px] font-medium transition-colors {settings.theme ===
								opt.id
									? 'border-accent bg-accent-soft text-accent-strong'
									: 'border-border bg-surface-2/40 text-fg-muted hover:border-border-strong hover:text-fg'}"
							>
								<Icon class="size-3.5" />
								{opt.label}
							</button>
						{/each}
					</div>
				</div>

				<div class="border-t border-border pt-4">
					<h3 class="mb-2 inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
						<KeyRound class="size-3" /> Anthropic API key
					</h3>
					<Field
						label="API key"
						hint="Used only to call Claude on your behalf. Sent through our serverless proxy because Anthropic blocks direct browser calls. Never stored on the server. Lives in this browser's localStorage."
					>
						<div class="relative">
							<Input
								type={showKey ? 'text' : 'password'}
								bind:value={draftKey}
								placeholder="sk-ant-…"
								class="pr-10 font-mono"
							/>
							<button
								type="button"
								onclick={() => (showKey = !showKey)}
								class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-fg-subtle hover:text-fg"
								aria-label="Toggle visibility"
								title={showKey ? 'Hide API key' : 'Show API key'}
							>
								{#if showKey}<Eye class="size-3.5" />{:else}<EyeOff class="size-3.5" />{/if}
							</button>
						</div>
					</Field>

					<Field label="Model">
						<select
							bind:value={draftModel}
							class="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
						>
							<option value="claude-opus-4-7">Claude Opus 4.7 (smartest)</option>
							<option value="claude-sonnet-4-6">Claude Sonnet 4.6 (balanced)</option>
							<option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (fastest)</option>
						</select>
					</Field>
				</div>

				<div class="flex items-center justify-between gap-2 border-t border-border pt-4">
					{#if settings.hasKey}
						<Button variant="ghost" density="sm" onclick={clear}>
							{#snippet icon()}<Trash2 class="size-3.5" />{/snippet}
							Remove saved key
						</Button>
					{:else}
						<span class="text-[12px] text-fg-subtle">No key saved yet.</span>
					{/if}
					<div class="flex items-center gap-2">
						<Button variant="ghost" density="sm" onclick={onclose}>Cancel</Button>
						<Button density="sm" onclick={save} disabled={!draftKey.trim()}>Save</Button>
					</div>
				</div>
			</div>
		</Panel>
	</div>
{/if}
