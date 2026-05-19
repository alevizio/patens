<script lang="ts">
	import { KIND_PRESETS, type ProjectKind } from '$lib/font/project';
	import { SCRIPT_PACKS } from '$lib/font/charsets';
	import { STARTER_FONTS } from '$lib/font/url-import';
	import Panel from './Panel.svelte';
	import Button from './Button.svelte';
	import Field from './Field.svelte';
	import Input from './Input.svelte';
	import X from '@lucide/svelte/icons/x';
	import Plus from '@lucide/svelte/icons/plus';
	import UploadCloud from '@lucide/svelte/icons/upload-cloud';
	import FileText from '@lucide/svelte/icons/file-text';
	import Link from '@lucide/svelte/icons/link';
	import Library from '@lucide/svelte/icons/library';

	type Mode = 'blank' | 'file' | 'url';

	type BlankInput = {
		name: string;
		familyName: string;
		kind: ProjectKind | undefined;
		scriptPacks: Set<string>;
	};

	type Props = {
		open: boolean;
		onclose: () => void;
		creating: boolean;
		importing: boolean;
		ufoImporting: boolean;
		urlImporting: boolean;
		importError: string | null;
		oncreate: (input: BlankInput) => void;
		onfile: (file: File) => void;
		onufo: (file: File) => void;
		onurl: (url: string) => void;
	};

	let {
		open,
		onclose,
		creating,
		importing,
		ufoImporting,
		urlImporting,
		importError,
		oncreate,
		onfile,
		onufo,
		onurl
	}: Props = $props();

	let mode = $state<Mode>('blank');

	let name = $state('');
	let familyName = $state('');
	let kind = $state<ProjectKind | undefined>(undefined);
	let scriptPacks = $state<Set<string>>(new Set());
	let urlInput = $state('');

	$effect(() => {
		if (open) {
			name = '';
			familyName = '';
			kind = undefined;
			scriptPacks = new Set();
			urlInput = '';
			mode = 'blank';
		}
	});

	const submitBlank = (e: SubmitEvent) => {
		e.preventDefault();
		if (!name.trim()) return;
		oncreate({ name, familyName, kind, scriptPacks });
	};
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 grid place-items-center bg-fg/40 p-4 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-labelledby="create-font-title"
		onclick={(e) => {
			if (e.target === e.currentTarget) onclose();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') onclose();
		}}
		tabindex="-1"
	>
		<Panel class="w-full max-w-xl">
			<div class="mb-5 flex items-start justify-between gap-4">
				<div>
					<h2
						id="create-font-title"
						class="text-xl tracking-tight text-fg"
						style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"
					>
						Start a new font
					</h2>
					<p class="mt-1 text-[12px] text-fg-subtle">
						Blank canvas, an existing file, or a public URL.
					</p>
				</div>
				<button
					type="button"
					onclick={onclose}
					class="rounded p-1 text-fg-muted hover:bg-surface-2 hover:text-fg"
					aria-label="Close"
					title="Close (Esc)"
				>
					<X class="size-4" />
				</button>
			</div>

			<!-- Mode picker — three flat tabs across the top of the dialog. -->
			<div class="mb-5 inline-flex w-full gap-1 rounded-lg bg-surface-2 p-1">
				{#each [
					{ id: 'blank', label: 'Blank', icon: Plus },
					{ id: 'file', label: 'From file', icon: UploadCloud },
					{ id: 'url', label: 'From URL', icon: Link }
				] as opt (opt.id)}
					{@const Icon = opt.icon}
					<button
						type="button"
						onclick={() => (mode = opt.id as Mode)}
						class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors {mode ===
						opt.id
							? 'bg-surface text-fg shadow-sm'
							: 'text-fg-muted hover:text-fg'}"
					>
						<Icon class="size-3.5" />
						{opt.label}
					</button>
				{/each}
			</div>

			{#if mode === 'blank'}
				<form onsubmit={submitBlank} class="grid gap-4">
					<Field label="Project name" required>
						<Input bind:value={name} placeholder="e.g. Personal Sans" required maxlength={60} />
					</Field>
					<Field label="Font family name" hint="Defaults to project name">
						<Input bind:value={familyName} placeholder="e.g. Personal Sans" maxlength={60} />
					</Field>
					<div>
						<div class="mb-1.5 text-[13px] font-medium text-fg-muted">Kind</div>
						<div class="grid grid-cols-4 gap-1.5">
							{#each Object.entries(KIND_PRESETS) as [id, preset] (id)}
								<button
									type="button"
									onclick={() => (kind = kind === id ? undefined : (id as ProjectKind))}
									class="rounded-md border px-2 py-1.5 text-[12px] font-medium transition-colors {kind ===
									id
										? 'border-accent bg-accent-soft text-accent-strong'
										: 'border-border bg-surface-2/40 text-fg-muted hover:border-border-strong hover:text-fg'}"
									title={preset.description}
								>
									{preset.label}
								</button>
							{/each}
						</div>
						{#if kind}
							<div class="mt-1.5 text-[11px] text-fg-subtle">
								{KIND_PRESETS[kind].description}
							</div>
						{/if}
					</div>
					<div>
						<div class="mb-1.5 text-[13px] font-medium text-fg-muted">
							Scripts
							<span class="ml-1 text-[11px] font-normal text-fg-subtle">
								Latin Basic always included.
							</span>
						</div>
						<div class="flex flex-wrap gap-1.5">
							{#each SCRIPT_PACKS as pack (pack.id)}
								{@const selected = scriptPacks.has(pack.id)}
								<button
									type="button"
									onclick={() => {
										const next = new Set(scriptPacks);
										if (next.has(pack.id)) next.delete(pack.id);
										else next.add(pack.id);
										scriptPacks = next;
									}}
									class="rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors {selected
										? 'border-accent bg-accent-soft text-accent-strong'
										: 'border-border bg-surface-2/40 text-fg-muted hover:border-border-strong hover:text-fg'}"
									title={pack.description}
								>
									+ {pack.label}
								</button>
							{/each}
						</div>
					</div>
					<div class="flex items-center justify-end gap-2 border-t border-border pt-4">
						<Button variant="ghost" density="sm" onclick={onclose} type="button">Cancel</Button>
						<Button type="submit" loading={creating} disabled={!name.trim()}>
							{#snippet icon()}<Plus class="size-4" />{/snippet}
							{creating ? 'Creating…' : 'Create font'}
						</Button>
					</div>
				</form>
			{:else if mode === 'file'}
				<div class="grid gap-3">
					<label
						class="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong/50 bg-surface-2/40 px-3 py-4 text-sm font-medium text-fg-muted transition-colors hover:border-accent hover:bg-accent-soft/40 hover:text-accent-strong"
					>
						<UploadCloud class="size-4" />
						{importing ? 'Importing…' : 'Choose .otf / .ttf'}
						<input
							type="file"
							accept=".otf,.ttf,font/otf,font/ttf,application/font-sfnt"
							class="sr-only"
							onchange={(e) => {
								const f = e.currentTarget.files?.[0];
								if (f) onfile(f);
								e.currentTarget.value = '';
							}}
							disabled={importing}
						/>
					</label>
					<label
						class="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong/50 bg-surface-2/40 px-3 py-4 text-sm font-medium text-fg-muted transition-colors hover:border-accent hover:bg-accent-soft/40 hover:text-accent-strong"
					>
						<FileText class="size-4" />
						{ufoImporting ? 'Loading Python…' : 'Choose .ufo.zip'}
						<input
							type="file"
							accept=".zip,application/zip"
							class="sr-only"
							onchange={(e) => {
								const f = e.currentTarget.files?.[0];
								if (f) onufo(f);
								e.currentTarget.value = '';
							}}
							disabled={ufoImporting}
						/>
					</label>
					<p class="text-[11px] text-fg-subtle">
						OTF/TTF imports drop into the editor instantly. UFO 3 archives are unpacked via
						Pyodide so you can round-trip with Glyphs / RoboFont / FontLab.
					</p>
					{#if importError}
						<div class="rounded-md bg-danger/10 px-3 py-2 text-[12px] text-danger-strong">
							{importError}
						</div>
					{/if}
				</div>
			{:else}
				<div class="grid gap-4">
					<form
						class="flex items-center gap-2"
						onsubmit={(e) => {
							e.preventDefault();
							if (urlInput.trim()) onurl(urlInput);
						}}
					>
						<div class="relative flex-1">
							<Link
								class="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-fg-subtle"
							/>
							<Input
								bind:value={urlInput}
								placeholder="GitHub URL or direct .otf/.ttf/.woff2/.ufo.zip"
								class="pl-8"
								disabled={urlImporting}
							/>
						</div>
						<Button
							type="submit"
							loading={urlImporting}
							disabled={!urlInput.trim() || urlImporting}
						>
							{urlImporting ? 'Fetching…' : 'Fetch'}
						</Button>
					</form>

					<div class="grid gap-2">
						<div
							class="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wider text-fg-subtle uppercase"
						>
							<Library class="size-3" /> Starter library
						</div>
						<div class="grid grid-cols-2 gap-1.5">
							{#each STARTER_FONTS as starter (starter.id)}
								<button
									type="button"
									class="group rounded-md border border-border bg-surface-2/40 px-2.5 py-2 text-left transition-colors hover:border-accent hover:bg-accent-soft/40 disabled:opacity-60"
									disabled={urlImporting}
									onclick={() => onurl(starter.url)}
									title={starter.url}
								>
									<div class="text-[12px] font-medium text-fg">{starter.label}</div>
									<div class="truncate text-[10px] text-fg-subtle">{starter.description}</div>
								</button>
							{/each}
						</div>
					</div>

					{#if importError}
						<div class="rounded-md bg-danger/10 px-3 py-2 text-[12px] text-danger-strong">
							{importError}
						</div>
					{/if}
				</div>
			{/if}
		</Panel>
	</div>
{/if}
