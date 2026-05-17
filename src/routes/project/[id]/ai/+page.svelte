<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { askClaude, glyphsToPng, AnthropicError, type AnthropicMessage } from '$lib/ai/anthropic';
	import Panel from '$lib/ui/Panel.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Tag from '@lucide/svelte/icons/tag';
	import Code from '@lucide/svelte/icons/code-2';
	import ScanSearch from '@lucide/svelte/icons/scan-search';
	import Type from '@lucide/svelte/icons/type';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import Copy from '@lucide/svelte/icons/copy';
	import Loader from '@lucide/svelte/icons/loader-2';

	const project = $derived(projectStore.project);

	type Preset = {
		id: string;
		label: string;
		icon: typeof Sparkles;
		run: () => Promise<{ text: string; system?: string } | null>;
	};

	let running = $state<string | null>(null);
	let lastTitle = $state<string | null>(null);
	let response = $state<string>('');
	let error = $state<string | null>(null);
	let customPrompt = $state('');
	let vibe = $state('');
	let featureBrief = $state('Standard ligatures + tabular figures + small caps');

	const projectContext = (): string => {
		if (!project) return '';
		const drawn = Object.values(project.glyphs).filter((g) => g.contours.length > 0);
		const drawnChars = drawn
			.map((g) => String.fromCodePoint(g.codepoint))
			.filter((s) => s.length === 1 && s.codePointAt(0)! > 0x20);
		return [
			`Project: "${project.metadata.familyName}" / ${project.metadata.styleName}`,
			`Designer: ${project.metadata.designer || 'unspecified'}`,
			`UPM: ${project.metrics.unitsPerEm}, cap height ${project.metrics.capHeight}, x-height ${project.metrics.xHeight}`,
			`Glyphs drawn: ${drawn.length} / ${Object.keys(project.glyphs).length}`,
			`Drawn characters: ${drawnChars.join(' ')}`,
			project.axes && project.axes.length > 0
				? `Variable axes: ${project.axes.map((a) => `${a.tag}(${a.minimum}..${a.maximum})`).join(', ')}`
				: 'Single-master (static).',
			project.masters && project.masters.length > 0
				? `Additional masters: ${project.masters.map((m) => `${m.name} at ${JSON.stringify(m.location)}`).join('; ')}`
				: ''
		]
			.filter(Boolean)
			.join('\n');
	};

	const presets: Preset[] = [
		{
			id: 'names',
			label: 'Brainstorm font names',
			icon: Tag,
			run: async () => {
				if (!project) return null;
				const system = `You are a senior type designer helping name a new typeface. Suggest names that feel intentional, ownable, and not generic. Avoid trademarked names. Return 10 candidates as a markdown numbered list with a one-line rationale each.`;
				const prompt = `Project context:
${projectContext()}

Design vibe / brief: ${vibe || '(designer left this blank — infer from project context)'}

Brainstorm 10 candidate names for this typeface.`;
				return { system, text: prompt };
			}
		},
		{
			id: 'fea',
			label: 'Draft .fea features',
			icon: Code,
			run: async () => {
				if (!project) return null;
				const system = `You are a senior OpenType engineer. Generate clean, valid AFDKO .fea source code. Only use glyphs the user has actually drawn. Use proper feature blocks, lookups, classes where appropriate. Comment briefly. Wrap the .fea in a single fenced code block tagged "fea".`;
				const prompt = `Project context:
${projectContext()}

Features requested: ${featureBrief}

Draft an .fea source for these features. Skip any feature that needs glyphs not in the drawn set; note what would be needed instead.`;
				return { system, text: prompt };
			}
		},
		{
			id: 'audit',
			label: 'Consistency audit (visual)',
			icon: ScanSearch,
			run: async () => {
				if (!project) return null;
				const drawn = Object.values(project.glyphs)
					.filter((g) => g.contours.length > 0)
					.slice(0, 20); // hard cap at 20 to keep the image manageable
				if (drawn.length === 0)
					throw new AnthropicError('No drawn glyphs yet — draw a few and try again.');
				const pngData = glyphsToPng(
					drawn.map((g) => ({ codepoint: g.codepoint, name: g.name, contours: g.contours })),
					project.metrics,
					72
				);
				const system = `You are a senior type design critic. You are given a rendering of glyphs from a single typeface. Look for visual consistency issues: stem widths, terminal shapes, x-height alignment, joins, proportion, overshoots, optical compensation. Be specific (cite glyphs by name). Return a markdown list of observations grouped by severity ("Likely problem" vs "Worth a second look").`;
				const messages: AnthropicMessage[] = [
					{
						role: 'user',
						content: [
							{
								type: 'image',
								source: { type: 'base64', media_type: 'image/png', data: pngData }
							},
							{
								type: 'text',
								text: `Project: ${project.metadata.familyName}. ${drawn.length} drawn glyphs shown. Audit for consistency.`
							}
						]
					}
				];
				const out = await askClaude({ system, messages, maxTokens: 1500 });
				return { text: out.text };
			}
		},
		{
			id: 'teststring',
			label: 'Generate test string',
			icon: Type,
			run: async () => {
				if (!project) return null;
				const drawn = Object.values(project.glyphs)
					.filter((g) => g.contours.length > 0)
					.map((g) => String.fromCodePoint(g.codepoint))
					.filter((s) => s.length === 1)
					.join('');
				if (drawn.length === 0)
					throw new AnthropicError('No drawn glyphs yet — draw a few and try again.');
				const system = `You are a typography proofreader. Generate test text using ONLY the provided characters (case-sensitive, including spaces). Aim for varied combinations exposing stem-stem, stem-round, round-round, and bowl interactions. 8-12 lines of varied content: words, short phrases, partial pangrams. Output plain text only, no markdown.`;
				const prompt = `Allowed characters (use only these, including space): ${drawn}\n\nGenerate proof text.`;
				return { system, text: prompt };
			}
		}
	];

	const runPreset = async (preset: Preset) => {
		if (!project) return;
		if (!settings.hasKey) {
			error = 'Set your Anthropic API key in Settings first.';
			return;
		}
		running = preset.id;
		lastTitle = preset.label;
		response = '';
		error = null;
		try {
			const prepared = await preset.run();
			if (!prepared) {
				running = null;
				return;
			}
			// "Visual audit" already ran askClaude itself; only run again if .text is a prompt
			if (prepared.text.startsWith('Project:') || prepared.system) {
				const out = await askClaude({
					system: prepared.system,
					messages: [{ role: 'user', content: prepared.text }],
					maxTokens: 1500
				});
				response = out.text;
			} else {
				response = prepared.text;
			}
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			running = null;
		}
	};

	const runCustom = async () => {
		if (!customPrompt.trim() || !settings.hasKey) {
			if (!settings.hasKey) error = 'Set your Anthropic API key in Settings first.';
			return;
		}
		running = 'custom';
		lastTitle = 'Custom prompt';
		response = '';
		error = null;
		try {
			const system = `You are an expert type designer + font engineer helping the user with their project.\n${projectContext()}`;
			const out = await askClaude({
				system,
				messages: [{ role: 'user', content: customPrompt }],
				maxTokens: 1500
			});
			response = out.text;
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			running = null;
		}
	};

	const copyResponse = async () => {
		if (!response) return;
		try {
			await navigator.clipboard.writeText(response);
		} catch {
			/* ignore */
		}
	};
</script>

{#if !project}
	<div class="flex h-full items-center justify-center text-fg-muted">Loading…</div>
{:else}
	<div class="h-full overflow-auto">
		<div class="mx-auto flex max-w-5xl flex-col gap-6 p-6">
			<header>
				<h1 class="text-xl font-semibold tracking-tight">AI assistant</h1>
				<p class="text-sm text-fg-muted">
					Claude helps with naming, drafting <code>.fea</code> source, auditing consistency
					across drawn glyphs, and generating proof text scoped to your character set.
				</p>
			</header>

			{#if !settings.hasKey}
				<Panel>
					<div class="flex items-start gap-3">
						<KeyRound class="mt-0.5 size-5 text-warn" />
						<div class="flex-1">
							<div class="text-sm font-medium text-fg">No API key configured</div>
							<p class="mt-1 text-[13px] text-fg-muted">
								Add an Anthropic API key in Settings (header → gear icon). Your key
								lives in this browser's localStorage and is only sent through our
								serverless proxy because Anthropic blocks direct browser calls.
							</p>
						</div>
					</div>
				</Panel>
			{/if}

			<Panel>
				<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					Prompt inputs
				</h2>
				<div class="grid gap-3 sm:grid-cols-2">
					<label class="grid gap-1.5">
						<span class="text-[11px] font-medium text-fg-muted">
							Design vibe (used by "Brainstorm font names")
						</span>
						<input
							bind:value={vibe}
							placeholder="e.g. editorial serif with sharp wedge terminals"
							class="h-10 rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
						/>
					</label>
					<label class="grid gap-1.5">
						<span class="text-[11px] font-medium text-fg-muted">
							Features brief (used by ".fea draft")
						</span>
						<input
							bind:value={featureBrief}
							placeholder="e.g. fractions + small caps + locl Polish"
							class="h-10 rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
						/>
					</label>
				</div>
			</Panel>

			<Panel>
				<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					Presets
				</h2>
				<div class="grid grid-cols-2 gap-2">
					{#each presets as preset (preset.id)}
						{@const Icon = preset.icon}
						<button
							type="button"
							onclick={() => runPreset(preset)}
							disabled={running !== null || !settings.hasKey}
							class="group flex items-center gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-3 text-left transition-colors hover:border-accent hover:bg-accent-soft/40 disabled:opacity-50"
						>
							{#if running === preset.id}
								<Loader class="size-4 animate-spin text-accent" />
							{:else}
								<Icon class="size-4 text-fg-muted group-hover:text-accent" />
							{/if}
							<span class="text-[13px] font-medium text-fg">{preset.label}</span>
						</button>
					{/each}
				</div>
			</Panel>

			<Panel>
				<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					Custom prompt
				</h2>
				<textarea
					bind:value={customPrompt}
					placeholder="Ask Claude anything about this project…"
					class="block h-24 w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
				></textarea>
				<div class="mt-2 flex items-center justify-end">
					<Button
						density="sm"
						onclick={runCustom}
						disabled={!customPrompt.trim() || running !== null || !settings.hasKey}
						loading={running === 'custom'}
					>
						{#snippet icon()}<Sparkles class="size-3.5" />{/snippet}
						Ask Claude
					</Button>
				</div>
			</Panel>

			{#if error}
				<Panel>
					<div class="rounded-md bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</div>
				</Panel>
			{/if}

			{#if response}
				<Panel>
					<div class="mb-3 flex items-center justify-between">
						<h2 class="inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
							<Sparkles class="size-3" /> {lastTitle ?? 'Response'}
						</h2>
						<Button density="sm" variant="ghost" onclick={copyResponse}>
							{#snippet icon()}<Copy class="size-3.5" />{/snippet}
							Copy
						</Button>
					</div>
					<pre class="whitespace-pre-wrap break-words rounded-md bg-surface-2/40 p-4 text-[13px] leading-[1.55] text-fg">{response}</pre>
				</Panel>
			{/if}
		</div>
	</div>
{/if}
