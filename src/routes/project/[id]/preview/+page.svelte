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

	const DEFAULT_PARAGRAPH = `In typography, a typeface is a design of letters, numbers and other symbols, to be used in printing or for electronic display. Most typefaces include variations in size (e.g., 24 point), weight (light, bold), slope (italic, oblique), width (condensed, extended), and so on.`;
	let drawnOnly = $state(false);
	let measureCh = $state(60);
	const drawnCodepoints = $derived.by(() => {
		const set = new Set<number>([0x20, 0x0a]); // include space + newline
		const project = projectStore.project;
		if (!project) return set;
		for (const g of Object.values(project.glyphs)) {
			if (g.contours.length > 0 || (g.components?.length ?? 0) > 0) {
				set.add(g.codepoint);
			}
		}
		return set;
	});
	const filterToDrawn = (text: string): string => {
		let out = '';
		for (const ch of text) {
			const cp = ch.codePointAt(0);
			if (cp === undefined) continue;
			if (drawnCodepoints.has(cp)) out += ch;
		}
		// Collapse runs of >1 spaces (left after removed chars) for readability.
		return out.replace(/[ \t]{2,}/g, ' ').replace(/\s+([,.!?;:])/g, '$1');
	};
	const PARAGRAPH = $derived.by(() => {
		const base =
			projectStore.project?.samples?.paragraph?.trim() || DEFAULT_PARAGRAPH;
		return drawnOnly ? filterToDrawn(base) : base;
	});

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

	// ---------- Proof at intended sizes (driven by Brief use cases) ----------
	type ProofRow = { sizes: number[]; label: string; text: string; mono?: boolean; tnum?: boolean };
	const proofForUseCases = (useCases: string[] | undefined): ProofRow[] => {
		const rows: ProofRow[] = [];
		const has = (uc: string) => useCases?.includes(uc) ?? false;
		if (has('body-text')) {
			rows.push({
				label: 'Body / paragraph (11–16px)',
				sizes: [11, 13, 14, 16],
				text: 'In typography, a typeface is a design of letters, numbers and other symbols.'
			});
		}
		if (has('web-ui')) {
			rows.push({
				label: 'Web UI (12–20px)',
				sizes: [12, 14, 16, 20],
				text: 'Cancel · Save changes · Dashboard · Settings · Sign out'
			});
		}
		if (has('display')) {
			rows.push({
				label: 'Display / headlines (48–144px)',
				sizes: [48, 72, 96, 144],
				text: 'Headline'
			});
		}
		if (has('signage')) {
			rows.push({
				label: 'Signage / wayfinding (60–144px)',
				sizes: [60, 96, 144],
				text: 'EXIT 14 · Platform 9 · Departures'
			});
		}
		if (has('code')) {
			rows.push({
				label: 'Code / monospace (12–18px)',
				sizes: [12, 14, 16, 18],
				text: 'const palette = { primary: "#0066FF" };',
				mono: true
			});
		}
		if (has('data-tables')) {
			rows.push({
				label: 'Data tables (11–14px, tnum)',
				sizes: [11, 12, 13, 14],
				text: '1,247.50  892.10  71.5%',
				tnum: true
			});
		}
		if (rows.length === 0) {
			rows.push({
				label: 'Default proof set',
				sizes: [14, 24, 48, 96],
				text: 'The quick brown fox'
			});
		}
		return rows;
	};
	const proofRows = $derived(proofForUseCases(projectStore.project?.brief?.useCases));

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
	// Descriptions are paraphrased from the Microsoft OpenType Layout tag registry
	// — useful inline hints for designers learning what each feature actually does.
	const FEATURES: Array<{
		tag: string;
		label: string;
		desc: string;
		long: string;
		default: boolean;
	}> = [
		{
			tag: 'kern',
			label: 'kern',
			desc: 'Kerning',
			long: 'Adjusts spacing between specific glyph pairs to even out visual rhythm (GPOS table).',
			default: true
		},
		{
			tag: 'liga',
			label: 'liga',
			desc: 'Standard ligatures',
			long: 'Substitutes connected single glyphs for pairs that overlap or collide (fi, fl, ffi).',
			default: true
		},
		{
			tag: 'dlig',
			label: 'dlig',
			desc: 'Discretionary ligatures',
			long: 'Decorative ligatures meant for display use (ct, st, sp). Disabled by default in body text.',
			default: false
		},
		{
			tag: 'calt',
			label: 'calt',
			desc: 'Contextual alternates',
			long: 'Swaps glyphs based on surrounding characters — used for connecting scripts and avoiding collisions.',
			default: true
		},
		{
			tag: 'onum',
			label: 'onum',
			desc: 'Old-style figures',
			long: 'Numerals with ascenders and descenders that sit alongside lowercase in body copy.',
			default: false
		},
		{
			tag: 'tnum',
			label: 'tnum',
			desc: 'Tabular figures',
			long: 'Forces all digits to the same advance width — required for data tables and price columns.',
			default: false
		},
		{
			tag: 'lnum',
			label: 'lnum',
			desc: 'Lining figures',
			long: 'Capital-height numerals; default in most modern sans serifs.',
			default: false
		},
		{
			tag: 'smcp',
			label: 'smcp',
			desc: 'Small caps',
			long: 'Replaces lowercase with custom small-cap glyphs (not algorithmically scaled caps).',
			default: false
		},
		{
			tag: 'zero',
			label: 'zero',
			desc: 'Slashed zero',
			long: 'Disambiguates 0 from O in code, monospace, or data contexts.',
			default: false
		},
		{
			tag: 'ss01',
			label: 'ss01',
			desc: 'Stylistic set 1',
			long: 'Designer-defined alternate set (e.g., single-storey a, alternate g).',
			default: false
		}
	];

	let featureState = $state<Record<string, boolean>>(
		Object.fromEntries(FEATURES.map((f) => [f.tag, f.default]))
	);
	let focusedFeature = $state<string | null>(null);

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
		// Only re-assign axisValues when an axis is missing — avoid a reactive
		// loop where the effect reads + writes the same $state object each tick.
		const existingTags = new Set(Object.keys(axisValues));
		const projectTags = new Set(project.axes.map((a) => a.tag));
		let needsUpdate = false;
		for (const a of project.axes) if (!existingTags.has(a.tag)) needsUpdate = true;
		for (const k of existingTags) if (!projectTags.has(k)) needsUpdate = true;
		if (!needsUpdate) return;
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
				Proof at intended sizes
			</h2>
			<p class="mb-3 text-[12px] text-fg-subtle">
				Auto-generated from the use cases checked on the
				<a href="/project/{project?.id}/brief" class="underline hover:text-fg">Brief</a> tab.
				Each row exercises a real reading condition at its real sizes.
			</p>
			<div class="grid gap-5">
				{#each proofRows as row (row.label)}
					<div>
						<div class="mb-1.5 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
							{row.label}
						</div>
						<div class="grid gap-1.5">
							{#each row.sizes as size (size)}
								<div class="flex items-baseline gap-3 border-b border-border/40 py-1">
									<span class="w-10 shrink-0 text-right font-mono text-[10px] text-fg-subtle" data-numeric>
										{size}px
									</span>
									<span
										class={row.mono ? 'preview-font font-mono leading-[1.4]' : 'preview-font leading-[1.4]'}
										style="font-size: {size}px; font-feature-settings: 'kern' 1, 'liga' 1{row.tnum
											? `, 'tnum' 1`
											: ''};"
									>
										{row.text}
									</span>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</Panel>

		<Panel>
			<div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
				<h2 class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					Paragraph (16/24)
				</h2>
				<div class="flex items-center gap-3">
					<label
						class="inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-fg-muted hover:text-fg"
					>
						<input
							type="checkbox"
							bind:checked={drawnOnly}
							class="size-3 rounded border-border accent-accent"
						/>
						Drawn glyphs only
					</label>
					<label class="inline-flex items-center gap-1.5 text-[11px] text-fg-muted">
						Measure
						<input
							type="range"
							min="30"
							max="100"
							step="1"
							bind:value={measureCh}
							class="w-24 accent-accent"
						/>
						<span class="font-mono text-[10px]" data-numeric>{measureCh}ch</span>
					</label>
				</div>
			</div>
			<p
				class="preview-font text-base leading-[1.5]"
				style="max-width: {measureCh}ch;"
			>
				{PARAGRAPH}
			</p>
			{#if drawnOnly && PARAGRAPH.length < 80}
				<p class="mt-2 text-[11px] text-fg-subtle">
					Filtered to drawn glyphs only — draw more letters to see a fuller paragraph.
				</p>
			{/if}
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
			<div class="mb-3 flex flex-wrap gap-1.5">
				{#each FEATURES as f (f.tag)}
					<button
						type="button"
						onclick={() => {
							featureState = { ...featureState, [f.tag]: !featureState[f.tag] };
							focusedFeature = f.tag;
						}}
						onmouseenter={() => (focusedFeature = f.tag)}
						onfocus={() => (focusedFeature = f.tag)}
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
			{#if focusedFeature}
				{@const f = FEATURES.find((x) => x.tag === focusedFeature)}
				{#if f}
					<div class="mb-3 rounded-md border border-border bg-surface-2/40 px-3 py-2 text-[11px] text-fg-muted">
						<span class="font-mono text-fg">{f.tag}</span>
						·
						<span class="font-medium text-fg">{f.desc}</span>
						<span class="block">{f.long}</span>
					</div>
				{/if}
			{:else}
				<div class="mb-3 rounded-md border border-dashed border-border-strong/40 bg-surface-2/40 px-3 py-2 text-[11px] text-fg-subtle">
					Hover a feature tag above to see what it controls.
				</div>
			{/if}
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
