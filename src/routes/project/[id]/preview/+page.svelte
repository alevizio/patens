<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { buildFont } from '$lib/font/export';
	import {
		ensurePython,
		buildVariableFont,
		subscribeToPython,
		getPythonProgress
	} from '$lib/font/python';
	import Panel from '$lib/ui/Panel.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Sliders from '@lucide/svelte/icons/sliders-horizontal';
	import Loader from '@lucide/svelte/icons/loader-2';

	const SAMPLES = [
		'The quick brown fox jumps over the lazy dog',
		'Pack my box with five dozen liquor jugs',
		'Sphinx of black quartz, judge my vow',
		'How vexingly quick daft zebras jump'
	];

	const WATERFALL = [12, 18, 24, 32, 48, 72, 96, 144];

	const PARAGRAPH = `In typography, a typeface is a design of letters, numbers and other symbols, to be used in printing or for electronic display. Most typefaces include variations in size (e.g., 24 point), weight (light, bold), slope (italic, oblique), width (condensed, extended), and so on.`;

	const UI_LABELS = ['Settings', 'Account', 'Notifications', 'Search', 'Download', 'Share', 'New project', 'Sign out'];

	const CODE_SAMPLE = `const palette = {
  primary:   '#0066FF',
  surface:   '#FAFAFA',
  border:    '#E5E5E5',
};

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 0xff, n & 0xff];
}`;

	let customText = $state('Hello, world');

	const sample = $derived(projectStore.project?.metadata.familyName ?? 'Sample');

	// ---------- Multi-language samples ----------
	const LANGUAGE_SAMPLES: Array<{ id: string; label: string; text: string }> = [
		{ id: 'latin', label: 'Latin', text: 'The quick brown fox jumps over the lazy dog.' },
		{
			id: 'latin-ext',
			label: 'Latin extended',
			text: 'Příliš žluťoučký kůň úpěl ďábelské ódy. Æthelred — Œuvre — naïve façade.'
		},
		{
			id: 'vietnamese',
			label: 'Vietnamese',
			text: 'Tiếng Việt rất đẹp. Học mãi mới giỏi được những điều khó.'
		},
		{
			id: 'greek',
			label: 'Greek',
			text: 'Ξεσκεπάζω την ψυχοφθόρα βδελυγμία. Αθήνα, Θεσσαλονίκη.'
		},
		{
			id: 'cyrillic',
			label: 'Cyrillic',
			text: 'Съешь же ещё этих мягких французских булок, да выпей чаю.'
		}
	];

	// ---------- OpenType feature toggles (CSS font-feature-settings) ----------
	const FEATURES: Array<{ tag: string; label: string; desc: string; default: boolean }> = [
		{ tag: 'kern', label: 'kern', desc: 'Kerning', default: true },
		{ tag: 'liga', label: 'liga', desc: 'Standard ligatures (fi, fl)', default: true },
		{ tag: 'dlig', label: 'dlig', desc: 'Discretionary ligatures', default: false },
		{ tag: 'calt', label: 'calt', desc: 'Contextual alternates', default: true },
		{ tag: 'onum', label: 'onum', desc: 'Old-style figures (oldstyle nums)', default: false },
		{ tag: 'tnum', label: 'tnum', desc: 'Tabular figures', default: false },
		{ tag: 'lnum', label: 'lnum', desc: 'Lining figures', default: false },
		{ tag: 'smcp', label: 'smcp', desc: 'Small caps', default: false },
		{ tag: 'zero', label: 'zero', desc: 'Slashed zero', default: false },
		{ tag: 'ss01', label: 'ss01', desc: 'Stylistic set 1', default: false }
	];

	let featureState = $state<Record<string, boolean>>(
		Object.fromEntries(FEATURES.map((f) => [f.tag, f.default]))
	);

	const featureSettings = $derived(
		FEATURES.map((f) => `'${f.tag}' ${featureState[f.tag] ? 1 : 0}`).join(', ')
	);

	const FEATURE_SAMPLE = 'fi fl 0123 12/34 — Office 1029 — affluent';

	// ---------- Variable-font sandbox ----------
	const project = $derived(projectStore.project);
	const isVariable = $derived(
		project ? (project.axes?.length ?? 0) > 0 && (project.masters?.length ?? 0) > 0 : false
	);

	let pythonProgress = $state(getPythonProgress());
	$effect(() => subscribeToPython((p) => (pythonProgress = p)));

	let vfBuilding = $state(false);
	let vfFamily = $state<string | null>(null);
	let axisValues = $state<Record<string, number>>({});
	let currentVfFace: FontFace | null = null;
	let currentVfUrl: string | null = null;

	$effect(() => {
		if (!project?.axes) return;
		const next: Record<string, number> = {};
		for (const a of project.axes) {
			next[a.tag] = axisValues[a.tag] ?? a.default;
		}
		axisValues = next;
	});

	const variationSettings = $derived(
		Object.entries(axisValues)
			.map(([tag, value]) => `'${tag}' ${value}`)
			.join(', ')
	);

	const buildVf = async () => {
		if (!project || !isVariable) return;
		vfBuilding = true;
		try {
			await ensurePython();
			const defaultLocation: Record<string, number> = {};
			for (const a of project.axes ?? []) defaultLocation[a.tag] = a.default;
			const allMasters = [
				{
					name: 'Default',
					buffer: buildFont(project).font.toArrayBuffer(),
					location: defaultLocation
				},
				...(project.masters ?? []).map((m) => ({
					name: m.name,
					buffer: buildFont(project, { masterId: m.id }).font.toArrayBuffer(),
					location: m.location
				}))
			];
			const vfBuffer = await buildVariableFont({
				axes: (project.axes ?? []).map((a) => ({
					tag: a.tag,
					name: a.name,
					minimum: a.minimum,
					default: a.default,
					maximum: a.maximum
				})),
				masters: allMasters,
				defaultMasterName: 'Default',
				instances: (project.instances ?? []).map((i) => ({
					familyName: i.familyName ?? project.metadata.familyName,
					styleName: i.styleName,
					location: i.location,
					postScriptName: i.postScriptName
				}))
			});
			const family = `VfPreview_${Date.now()}`;
			const blob = new Blob([vfBuffer], { type: 'font/ttf' });
			const url = URL.createObjectURL(blob);
			const face = new FontFace(family, `url(${url}) format("truetype-variations")`);
			await face.load();
			document.fonts.add(face);
			if (currentVfFace) document.fonts.delete(currentVfFace);
			if (currentVfUrl) URL.revokeObjectURL(currentVfUrl);
			currentVfFace = face;
			currentVfUrl = url;
			vfFamily = family;
		} catch (err) {
			alert('VF preview build failed: ' + (err instanceof Error ? err.message : String(err)));
		} finally {
			vfBuilding = false;
		}
	};
</script>

<div class="h-full overflow-auto">
	<div class="mx-auto flex max-w-6xl flex-col gap-6 p-6">
		<header>
			<h1 class="text-xl font-semibold tracking-tight">Preview</h1>
			<p class="text-sm text-fg-muted">
				Live render of <span class="font-mono text-fg">{sample}</span> via
				<code>@font-face</code>. Updates as you draw.
			</p>
		</header>

		{#if isVariable}
			<Panel>
				<h2 class="mb-3 inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					<Sliders class="size-3" /> Variable sandbox
				</h2>
				{#if !vfFamily}
					<p class="mb-3 text-[12px] text-fg-subtle">
						Compile the variable font once and play with the axes live. First click
						loads Python (~10MB, cached for the session).
					</p>
					<Button onclick={buildVf} loading={vfBuilding}>
						{#snippet icon()}<Sliders class="size-4" />{/snippet}
						{vfBuilding ? 'Compiling…' : 'Build variable font preview'}
					</Button>
					{#if pythonProgress.stage !== 'ready' && pythonProgress.stage !== 'idle' && vfBuilding}
						<div class="mt-2 inline-flex items-center gap-1.5 text-[12px] text-fg-muted">
							<Loader class="size-3 animate-spin" />
							{pythonProgress.message}
						</div>
					{/if}
				{:else}
					<div class="grid gap-3">
						{#each project?.axes ?? [] as axis (axis.tag)}
							<label class="grid grid-cols-[100px_1fr_60px] items-center gap-3">
								<span class="text-[12px] font-medium text-fg">
									{axis.name} <span class="font-mono text-fg-subtle">{axis.tag}</span>
								</span>
								<input
									type="range"
									min={axis.minimum}
									max={axis.maximum}
									step={(axis.maximum - axis.minimum) / 200 || 1}
									value={axisValues[axis.tag] ?? axis.default}
									oninput={(e) =>
										(axisValues = {
											...axisValues,
											[axis.tag]: Number(e.currentTarget.value)
										})}
									class="h-1 accent-accent"
								/>
								<span class="text-right font-mono text-[12px] text-fg-muted" data-numeric>
									{Math.round(axisValues[axis.tag] ?? axis.default)}
								</span>
							</label>
						{/each}
					</div>
					{#if (project?.instances ?? []).length > 0}
						<div class="mt-3 flex flex-wrap items-center gap-1.5">
							<span class="text-[11px] font-medium text-fg-muted">Jump to instance:</span>
							{#each project?.instances ?? [] as inst (inst.id)}
								<button
									type="button"
									onclick={() => (axisValues = { ...axisValues, ...inst.location })}
									class="rounded-md border border-border bg-surface-2 px-2 py-0.5 text-[11px] font-medium hover:border-accent hover:text-accent"
								>
									{inst.styleName}
								</button>
							{/each}
						</div>
					{/if}
					<div
						class="mt-4 rounded-lg border border-border bg-canvas p-6 text-center text-7xl leading-none"
						style="font-family: '{vfFamily}', sans-serif; font-variation-settings: {variationSettings};"
					>
						{customText || 'Variable'}
					</div>
					<div class="mt-2 font-mono text-[11px] text-fg-subtle" data-numeric>
						font-variation-settings: {variationSettings}
					</div>
				{/if}
			</Panel>
		{/if}

		<Panel>
			<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				Custom string
			</h2>
			<input
				bind:value={customText}
				class="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
				placeholder="Type something…"
			/>
			<div class="preview-font mt-4 text-6xl leading-tight">{customText}</div>
		</Panel>

		<Panel>
			<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				Paragraph (16/24)
			</h2>
			<p class="preview-font max-w-prose text-base leading-[1.5]">{PARAGRAPH}</p>
		</Panel>

		<Panel>
			<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				UI sample
			</h2>
			<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
				{#each UI_LABELS as label (label)}
					<div
						class="preview-font flex items-center justify-center rounded-md border border-border bg-surface-2/40 px-3 py-2 text-[13px]"
					>
						{label}
					</div>
				{/each}
			</div>
			<div class="preview-font mt-3 grid grid-cols-3 gap-2 text-center">
				<div class="rounded-md border border-border bg-surface-2/40 px-3 py-3">
					<div class="text-[11px] text-fg-subtle">Total</div>
					<div class="mt-1 text-2xl font-medium" data-numeric>1,247</div>
				</div>
				<div class="rounded-md border border-border bg-surface-2/40 px-3 py-3">
					<div class="text-[11px] text-fg-subtle">Active</div>
					<div class="mt-1 text-2xl font-medium" data-numeric>892</div>
				</div>
				<div class="rounded-md border border-border bg-surface-2/40 px-3 py-3">
					<div class="text-[11px] text-fg-subtle">Rate</div>
					<div class="mt-1 text-2xl font-medium" data-numeric>71.5%</div>
				</div>
			</div>
		</Panel>

		<Panel>
			<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				Code sample
			</h2>
			<pre class="preview-font overflow-x-auto rounded-md border border-border bg-surface-2/40 p-4 text-[13px] leading-[1.55]">{CODE_SAMPLE}</pre>
		</Panel>

		<Panel>
			<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				Waterfall
			</h2>
			<div class="grid gap-3">
				{#each WATERFALL as size (size)}
					<div class="flex items-baseline gap-4">
						<span
							class="w-10 shrink-0 text-right font-mono text-[11px] text-fg-subtle"
							data-numeric
						>
							{size}px
						</span>
						<span class="preview-font truncate leading-[1.2]" style="font-size: {size}px;">
							{SAMPLES[0]}
						</span>
					</div>
				{/each}
			</div>
		</Panel>

		<Panel>
			<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				Pangrams
			</h2>
			<div class="grid gap-3">
				{#each SAMPLES as text (text)}
					<div class="preview-font text-2xl leading-snug">{text}</div>
				{/each}
			</div>
		</Panel>

		<Panel>
			<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				Language coverage
			</h2>
			<p class="mb-3 text-[12px] text-fg-subtle">
				Missing glyphs fall back to the system font so you can see what's covered at a glance.
			</p>
			<div class="grid gap-3">
				{#each LANGUAGE_SAMPLES as lang (lang.id)}
					<div>
						<div class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
							{lang.label}
						</div>
						<div class="preview-font mt-1 text-xl leading-snug">{lang.text}</div>
					</div>
				{/each}
			</div>
		</Panel>

		<Panel>
			<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				OpenType features
			</h2>
			<p class="mb-3 text-[12px] text-fg-subtle">
				Toggle features at render time via <code class="font-mono">font-feature-settings</code>.
				Compile the font to see them really work.
			</p>
			<div class="mb-4 flex flex-wrap gap-1.5">
				{#each FEATURES as f (f.tag)}
					<button
						type="button"
						onclick={() => (featureState = { ...featureState, [f.tag]: !featureState[f.tag] })}
						class="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors {featureState[
							f.tag
						]
							? 'border-accent bg-accent-soft text-accent'
							: 'border-border bg-surface-2 text-fg-muted hover:border-fg-subtle'}"
						title={f.desc}
					>
						<span class="font-mono">{f.label}</span>
					</button>
				{/each}
			</div>
			<div
				class="preview-font rounded-lg border border-border bg-canvas p-6 text-3xl leading-snug"
				style="font-feature-settings: {featureSettings};"
			>
				{FEATURE_SAMPLE}
			</div>
			<div class="mt-2 font-mono text-[11px] text-fg-subtle" data-numeric>
				font-feature-settings: {featureSettings}
			</div>
		</Panel>

		<Panel>
			<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				Glyph proof
			</h2>
			<div class="preview-font text-3xl leading-snug">
				<div>HOHOHO HOnono HnHonHonH</div>
				<div>nonono AVAVAV LATATe</div>
				<div>0123456789 .,;:!?</div>
			</div>
		</Panel>
	</div>
</div>
