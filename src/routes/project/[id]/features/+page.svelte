<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { autoFeaSource } from '$lib/font/fea';
	import { buildFont } from '$lib/font/export';
	import {
		ensurePython,
		compileFeaIntoFont,
		subscribeToPython,
		getPythonProgress
	} from '$lib/font/python';
	import Panel from '$lib/ui/Panel.svelte';
	import Button from '$lib/ui/Button.svelte';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Wand from '@lucide/svelte/icons/wand-sparkles';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import Loader from '@lucide/svelte/icons/loader-2';

	const project = $derived(projectStore.project);

	let pythonProgress = $state(getPythonProgress());
	$effect(() => subscribeToPython((p) => (pythonProgress = p)));

	let buffer = $state('');
	let dirty = $state(false);
	let testResult = $state<{ ok: boolean; message: string; sizeBefore?: number; sizeAfter?: number } | null>(null);
	let testing = $state(false);

	const autoSource = $derived(project ? autoFeaSource(project) : '');
	const effectiveSource = $derived(project?.features.feaSource ?? autoSource);

	$effect(() => {
		// Reset buffer when project or auto-source changes (unless user has unsaved edits)
		if (!dirty) buffer = effectiveSource;
	});

	const save = () => {
		if (!project) return;
		projectStore.updateFeatures({ feaSource: buffer });
		dirty = false;
	};

	const resetToAuto = () => {
		if (!project) return;
		projectStore.updateFeatures({ feaSource: undefined });
		buffer = autoSource;
		dirty = false;
	};

	const testCompile = async () => {
		if (!project) return;
		testing = true;
		testResult = null;
		try {
			await ensurePython();
			const { font } = buildFont(project);
			const otf = font.toArrayBuffer();
			const out = await compileFeaIntoFont(otf, buffer);
			testResult = {
				ok: true,
				message: 'Features compiled successfully.',
				sizeBefore: otf.byteLength,
				sizeAfter: out.byteLength
			};
		} catch (err) {
			testResult = {
				ok: false,
				message: err instanceof Error ? err.message : String(err)
			};
		} finally {
			testing = false;
		}
	};
</script>

{#if !project}
	<div class="flex h-full items-center justify-center text-fg-muted">Loading…</div>
{:else}
	<div class="h-full overflow-auto">
		<div class="mx-auto flex max-w-5xl flex-col gap-6 p-6">
			<header>
				<h1 class="text-xl font-semibold tracking-tight">OpenType features</h1>
				<p class="text-sm text-fg-muted">
					Edit the <code>.fea</code> source compiled into the font at export. Generated from your
					kerning + ligature settings; customize as needed.
				</p>
			</header>

			<Panel padding="none">
				<div class="flex items-center justify-between border-b border-border px-4 py-2.5">
					<div class="flex items-center gap-2">
						<span class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
							features.fea
						</span>
						{#if dirty}
							<span class="rounded-full bg-warn/20 px-2 py-0.5 text-[10px] font-medium text-warn">
								Unsaved
							</span>
						{:else if project.features.feaSource}
							<span class="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">
								Custom
							</span>
						{:else}
							<span class="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success">
								Auto-generated
							</span>
						{/if}
					</div>
					<div class="flex items-center gap-1.5">
						<Button density="sm" variant="ghost" onclick={resetToAuto}>
							{#snippet icon()}<RotateCcw class="size-3.5" />{/snippet}
							Reset to auto
						</Button>
						<Button density="sm" variant="secondary" onclick={testCompile} loading={testing} disabled={testing}>
							{#snippet icon()}<Wand class="size-3.5" />{/snippet}
							{testing ? 'Compiling…' : 'Test compile'}
						</Button>
						<Button density="sm" onclick={save} disabled={!dirty}>
							Save
						</Button>
					</div>
				</div>
				<textarea
					bind:value={buffer}
					oninput={() => (dirty = true)}
					class="block h-[60vh] w-full resize-none border-0 bg-canvas px-4 py-3 font-mono text-[12px] leading-[1.6] text-fg outline-none"
					spellcheck="false"
				></textarea>
			</Panel>

			{#if testResult}
				<Panel>
					<div class="flex items-start gap-2">
						{#if testResult.ok}
							<CheckCircle2 class="mt-0.5 size-4 text-success" />
						{:else}
							<AlertCircle class="mt-0.5 size-4 text-danger" />
						{/if}
						<div class="grid gap-1">
							<div class="text-sm font-medium {testResult.ok ? 'text-success' : 'text-danger'}">
								{testResult.message}
							</div>
							{#if testResult.ok && testResult.sizeBefore && testResult.sizeAfter}
								<div class="text-[12px] text-fg-muted" data-numeric>
									{(testResult.sizeBefore / 1024).toFixed(1)} KB → {(
										testResult.sizeAfter / 1024
									).toFixed(1)} KB after features
								</div>
							{/if}
						</div>
					</div>
				</Panel>
			{/if}

			<Panel>
				<h2 class="mb-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					Quick reference
				</h2>
				<div class="grid grid-cols-2 gap-3 text-[12px]">
					<div>
						<div class="mb-1 font-medium text-fg">Substitution (GSUB)</div>
						<pre class="rounded bg-surface-2/40 p-2 text-[11px] text-fg-muted">feature liga {'{'}
    sub f i by fi;
{'}'} liga;</pre>
					</div>
					<div>
						<div class="mb-1 font-medium text-fg">Positioning (GPOS)</div>
						<pre class="rounded bg-surface-2/40 p-2 text-[11px] text-fg-muted">feature kern {'{'}
    pos A V -90;
{'}'} kern;</pre>
					</div>
					<div>
						<div class="mb-1 font-medium text-fg">Glyph classes</div>
						<pre class="rounded bg-surface-2/40 p-2 text-[11px] text-fg-muted">{'@A_left = [A Á Â Ä];'}
{'feature kern {'}
    {'pos @A_left V -80;'}
{'}'} kern;</pre>
					</div>
					<div>
						<div class="mb-1 font-medium text-fg">Stylistic alternates</div>
						<pre class="rounded bg-surface-2/40 p-2 text-[11px] text-fg-muted">feature ss01 {'{'}
    sub a by a.alt;
{'}'} ss01;</pre>
					</div>
				</div>
				<p class="mt-3 text-[11px] text-fg-subtle">
					Full grammar:
					<a
						href="https://adobe-type-tools.github.io/afdko/OpenTypeFeatureFileSpecification.html"
						target="_blank"
						rel="noopener"
						class="text-accent hover:underline"
					>
						AFDKO Feature File Specification
					</a>
				</p>
			</Panel>

			{#if pythonProgress.stage !== 'ready' && pythonProgress.stage !== 'idle' && pythonProgress.stage !== 'error'}
				<div class="flex items-center gap-2 rounded-md bg-surface-2 px-3 py-2 text-[12px] text-fg-muted">
					<Loader class="size-3.5 animate-spin" />
					{pythonProgress.message}
				</div>
			{/if}
		</div>
	</div>
{/if}
