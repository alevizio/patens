<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { autoFeaSource } from '$lib/font/fea';
	import { buildFont } from '$lib/font/export';
	import { detectFeatures, featureLabel } from '$lib/font/feature-detect';
	import {
		createDefaultPalette,
		hexToRgba,
		rgbaToHex,
		palettesAgreeOnLength
	} from '$lib/font/color';
	import type { ColorPalette, RGBA } from '$lib/font/types';
	import {
		ensurePython,
		compileFeaIntoFont,
		subscribeToPython,
		getPythonProgress
	} from '$lib/font/python';
	import Panel from '$lib/ui/Panel.svelte';
	import Button from '$lib/ui/Button.svelte';
	import LoadingPanel from '$lib/ui/LoadingPanel.svelte';
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

	// Auto-detected features from glyph name suffixes. Sub-millisecond
	// per call (pure TS, no Pyodide); recomputed reactively when the
	// glyph set changes.
	const detectedFeatures = $derived(project ? detectFeatures(project.glyphs) : []);
	const autoFeaturesEnabled = $derived(project?.features.autoFeatures !== false);
	const disabledSet = $derived(
		new Set<string>(project?.features.disabledAutoFeatures ?? [])
	);
	const toggleAutoFeature = (tag: string) => {
		if (!project) return;
		const current = new Set<string>(project.features.disabledAutoFeatures ?? []);
		if (current.has(tag)) current.delete(tag);
		else current.add(tag);
		projectStore.updateFeatures({ disabledAutoFeatures: Array.from(current).sort() });
	};
	const toggleAutoFeaturesMaster = () => {
		if (!project) return;
		projectStore.updateFeatures({ autoFeatures: !autoFeaturesEnabled });
	};

	// ---------- CPAL palette editor ----------
	const palettes = $derived<ColorPalette[]>(project?.palettes ?? []);
	const palettesLength = $derived(palettesAgreeOnLength(palettes) ?? 0);

	const addPalette = () => {
		if (!project) return;
		// New palette inherits the existing length so the CPAL invariant
		// (all palettes same size) is maintained automatically.
		const referenceLength = palettesLength > 0 ? palettesLength : 4;
		const fresh = createDefaultPalette(
			`Palette ${palettes.length + 1}`,
			palettes.length === 0 ? 'default' : undefined
		);
		// Pad / truncate the default to match.
		if (fresh.colors.length > referenceLength) {
			fresh.colors = fresh.colors.slice(0, referenceLength);
		} else while (fresh.colors.length < referenceLength) {
			fresh.colors.push({ r: 26, g: 26, b: 26, a: 1 });
		}
		projectStore.addPalette(fresh);
	};
	const removePalette = (id: string) => {
		projectStore.removePalette(id);
	};
	const renamePalette = (id: string, name: string) => {
		projectStore.updatePalette(id, (p) => ({ ...p, name }));
	};
	const setPaletteVariant = (id: string, variant: ColorPalette['variant'] | '') => {
		projectStore.updatePalette(id, (p) => ({
			...p,
			variant: variant === '' ? undefined : variant
		}));
	};
	const setSlotColor = (paletteId: string, index: number, hex: string) => {
		const c = hexToRgba(hex);
		projectStore.setPaletteColor(paletteId, index, c);
	};
	const addColorSlot = () => {
		projectStore.resizePalettes(palettesLength + 1);
	};
	const removeColorSlot = () => {
		if (palettesLength <= 1) return;
		projectStore.resizePalettes(palettesLength - 1);
	};

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

	type Snippet = { tag: string; label: string; body: string };
	const SNIPPETS: Snippet[] = [
		{
			tag: 'smcp',
			label: 'Small caps',
			body: `feature smcp {\n    sub [a b c d e f g h i j k l m n o p q r s t u v w x y z] by [A.sc B.sc C.sc D.sc E.sc F.sc G.sc H.sc I.sc J.sc K.sc L.sc M.sc N.sc O.sc P.sc Q.sc R.sc S.sc T.sc U.sc V.sc W.sc X.sc Y.sc Z.sc];\n} smcp;`
		},
		{
			tag: 'c2sc',
			label: 'Caps to small caps',
			body: `feature c2sc {\n    sub [A B C D E F G H I J K L M N O P Q R S T U V W X Y Z] by [A.sc B.sc C.sc D.sc E.sc F.sc G.sc H.sc I.sc J.sc K.sc L.sc M.sc N.sc O.sc P.sc Q.sc R.sc S.sc T.sc U.sc V.sc W.sc X.sc Y.sc Z.sc];\n} c2sc;`
		},
		{
			tag: 'onum',
			label: 'Old-style figures',
			body: `feature onum {\n    sub [zero one two three four five six seven eight nine] by [zero.osf one.osf two.osf three.osf four.osf five.osf six.osf seven.osf eight.osf nine.osf];\n} onum;`
		},
		{
			tag: 'lnum',
			label: 'Lining figures',
			body: `feature lnum {\n    sub [zero.osf one.osf two.osf three.osf four.osf five.osf six.osf seven.osf eight.osf nine.osf] by [zero one two three four five six seven eight nine];\n} lnum;`
		},
		{
			tag: 'tnum',
			label: 'Tabular figures',
			body: `feature tnum {\n    sub [zero one two three four five six seven eight nine] by [zero.tab one.tab two.tab three.tab four.tab five.tab six.tab seven.tab eight.tab nine.tab];\n} tnum;`
		},
		{
			tag: 'pnum',
			label: 'Proportional figures',
			body: `feature pnum {\n    sub [zero.tab one.tab two.tab three.tab four.tab five.tab six.tab seven.tab eight.tab nine.tab] by [zero one two three four five six seven eight nine];\n} pnum;`
		},
		{
			tag: 'frac',
			label: 'Fractions',
			body: `feature frac {\n    sub [one two three four] slash [two three four] by onehalf;\n    # Custom mapping per fraction. Replace with your fraction glyph names.\n} frac;`
		},
		{
			tag: 'ordn',
			label: 'Ordinals (1st, 2nd)',
			body: `feature ordn {\n    sub [a o]' [s t] by [ordfeminine ordmasculine];\n} ordn;`
		},
		{
			tag: 'case',
			label: 'Case-sensitive forms',
			body: `feature case {\n    sub [hyphen endash emdash parenleft parenright] by [hyphen.case endash.case emdash.case parenleft.case parenright.case];\n} case;`
		},
		{
			tag: 'salt',
			label: 'Stylistic alternates',
			body: `feature salt {\n    sub a by a.alt;\n    sub g by g.alt;\n} salt;`
		},
		{
			tag: 'sups',
			label: 'Superscript',
			body: `feature sups {\n    sub [zero one two three four five six seven eight nine] by [zero.sups one.sups two.sups three.sups four.sups five.sups six.sups seven.sups eight.sups nine.sups];\n} sups;`
		},
		{
			tag: 'sinf',
			label: 'Subscript / scientific inferior',
			body: `feature sinf {\n    sub [zero one two three four five six seven eight nine] by [zero.sinf one.sinf two.sinf three.sinf four.sinf five.sinf six.sinf seven.sinf eight.sinf nine.sinf];\n} sinf;`
		},
		{
			tag: 'numr',
			label: 'Numerator',
			body: `feature numr {\n    sub [zero one two three four five six seven eight nine] by [zero.numr one.numr two.numr three.numr four.numr five.numr six.numr seven.numr eight.numr nine.numr];\n} numr;`
		},
		{
			tag: 'dnom',
			label: 'Denominator',
			body: `feature dnom {\n    sub [zero one two three four five six seven eight nine] by [zero.dnom one.dnom two.dnom three.dnom four.dnom five.dnom six.dnom seven.dnom eight.dnom nine.dnom];\n} dnom;`
		},
		{
			tag: 'locl',
			label: 'Localized forms (Catalan ŀ·l)',
			body: `feature locl {\n    script latn;\n        language CAT;\n            sub l periodcentered l by l_l.locl_cat;\n} locl;`
		}
	];

	const insertSnippet = (s: Snippet) => {
		const sep = buffer.endsWith('\n') ? '\n' : '\n\n';
		buffer = `${buffer}${sep}${s.body}\n`;
		dirty = true;
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
	<LoadingPanel label="Loading features" />
{:else}
	<div class="h-full overflow-auto">
		<div class="mx-auto flex max-w-5xl flex-col gap-6 p-6">
			<header>
				<h1 class="text-xl font-semibold tracking-tight">OpenType features</h1>
				<p class="text-sm text-fg-muted">
					Glyph name suffixes auto-detect features at export. Edit the raw
					<code>.fea</code> source below for anything beyond declarative tags.
				</p>
			</header>

			<!-- Auto-detected features. Sourced from glyph name conventions
			     (.sc / .ss01 / .osf / etc.) via detectFeatures. Each tag has a
			     toggle; disabled tags are stored in features.disabledAutoFeatures
			     and skipped at export. -->
			<Panel>
				<div class="mb-3 flex flex-wrap items-center gap-2">
					<h2 class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
						Detected features
					</h2>
					<span
						class="rounded-full bg-success/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-wider text-success-strong uppercase"
					>
						Local
					</span>
					<label
						class="ml-auto inline-flex items-center gap-1.5 text-[12px] text-fg-muted"
						title="Master switch — when off, no auto-detected feature is emitted at export."
					>
						<input
							type="checkbox"
							checked={autoFeaturesEnabled}
							onchange={toggleAutoFeaturesMaster}
							class="size-3.5 accent-accent"
						/>
						Enable auto-features
					</label>
				</div>
				<p class="mb-3 text-[12px] leading-snug text-fg-muted">
					Glyphs ending in <span class="font-mono">.sc</span>,
					<span class="font-mono">.ss01–.ss20</span>,
					<span class="font-mono">.osf</span>,
					<span class="font-mono">.salt</span>, etc. auto-produce GSUB
					substitutions. Toggle to exclude any tag from the export.
				</p>

				{#if detectedFeatures.length === 0}
					<div class="rounded-md border border-dashed border-border bg-surface-2/30 px-3 py-2.5 text-[12px] text-fg-subtle">
						No suffixed glyphs detected. Draw a glyph like
						<span class="font-mono text-fg-muted">a.sc</span> or
						<span class="font-mono text-fg-muted">A.ss01</span> alongside its base
						(<span class="font-mono text-fg-muted">a</span>,
						<span class="font-mono text-fg-muted">A</span>) and the corresponding
						feature appears here.
					</div>
				{:else}
					<div class="overflow-hidden rounded-md border border-border">
						<table class="w-full text-[12px]">
							<thead>
								<tr class="border-b border-border bg-surface-2/40 text-fg-subtle">
									<th
										class="px-3 py-1.5 text-left font-mono text-[10px] tracking-wider uppercase"
									>
										Tag
									</th>
									<th
										class="px-3 py-1.5 text-left font-mono text-[10px] tracking-wider uppercase"
									>
										Feature
									</th>
									<th
										class="px-3 py-1.5 text-left font-mono text-[10px] tracking-wider uppercase"
									>
										Members
									</th>
									<th
										class="px-3 py-1.5 text-right font-mono text-[10px] tracking-wider uppercase"
									>
										Enabled
									</th>
								</tr>
							</thead>
							<tbody>
								{#each detectedFeatures as f (f.feature)}
									{@const enabled = autoFeaturesEnabled && !disabledSet.has(f.feature)}
									<tr class="border-b border-border last:border-b-0">
										<td class="px-3 py-1.5">
											<span class="font-mono text-[12px] text-fg">{f.feature}</span>
										</td>
										<td class="px-3 py-1.5 text-fg-muted">
											{featureLabel(f.feature)}
										</td>
										<td class="px-3 py-1.5">
											<div class="flex flex-wrap gap-1 font-mono text-[11px] text-fg-subtle">
												{#each f.subs as s (s.from)}
													<span title="{s.from} → {s.to}">
														{s.from}<span class="opacity-40">→</span>{s.to}
													</span>
												{/each}
											</div>
										</td>
										<td class="px-3 py-1.5 text-right">
											<input
												type="checkbox"
												checked={enabled}
												disabled={!autoFeaturesEnabled}
												onchange={() => toggleAutoFeature(f.feature)}
												class="size-3.5 accent-accent disabled:opacity-30"
												aria-label="Enable {f.feature}"
											/>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</Panel>

			<!-- CPAL palette editor — color-fonts M1 day-7. Each palette is
			     an ordered RGBA list; `ColorLayer.paletteIndex` references
			     into it. All palettes share length (CPAL invariant). -->
			<Panel>
				<div class="mb-3 flex flex-wrap items-center gap-2">
					<h2 class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
						Color palettes
					</h2>
					<span
						class="rounded-full bg-success/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-wider text-success-strong uppercase"
					>
						CPAL v0
					</span>
					{#if palettes.length > 0}
						<span class="font-mono text-[10px] text-fg-subtle" data-numeric>
							{palettes.length} palette{palettes.length === 1 ? '' : 's'} · {palettesLength}
							colour{palettesLength === 1 ? '' : 's'}
						</span>
					{/if}
					<div class="ml-auto flex items-center gap-1.5">
						{#if palettes.length > 0}
							<Button
								density="sm"
								variant="ghost"
								onclick={removeColorSlot}
								disabled={palettesLength <= 1}
							>
								−
							</Button>
							<Button density="sm" variant="ghost" onclick={addColorSlot}>
								+ colour
							</Button>
						{/if}
						<Button density="sm" onclick={addPalette}>+ palette</Button>
					</div>
				</div>
				<p class="mb-3 text-[12px] leading-snug text-fg-muted">
					Palettes drive color-font (COLR v0) layered glyph rendering. Tag a
					palette as <span class="font-mono">light</span> or
					<span class="font-mono">dark</span>
					to drive the CSS <code>font-palette</code> selector. All palettes
					share length — adding a colour adds it to every palette.
				</p>

				{#if palettes.length === 0}
					<div
						class="rounded-md border border-dashed border-border bg-surface-2/30 px-3 py-3 text-[12px] text-fg-subtle"
					>
						No palettes yet. Click <span class="font-mono">+ palette</span> to
						start a default 4-colour palette (ink, paper, accent, warm).
					</div>
				{:else}
					<div class="grid gap-3">
						{#each palettes as p (p.id)}
							<div class="rounded-md border border-border bg-surface-2/30 p-3">
								<div class="mb-2 flex flex-wrap items-center gap-2">
									<input
										type="text"
										value={p.name}
										onchange={(e) => renamePalette(p.id, e.currentTarget.value)}
										class="flex-1 rounded border border-border bg-surface px-2 py-0.5 text-[12px] text-fg outline-none focus:border-accent"
										aria-label="Palette name"
									/>
									<select
										value={p.variant ?? ''}
										onchange={(e) =>
											setPaletteVariant(
												p.id,
												e.currentTarget.value as ColorPalette['variant'] | ''
											)}
										class="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px] text-fg outline-none focus:border-accent"
										aria-label="Palette variant"
									>
										<option value="">(no variant)</option>
										<option value="default">default</option>
										<option value="light">light</option>
										<option value="dark">dark</option>
										<option value="brand">brand</option>
									</select>
									<button
										type="button"
										onclick={() => removePalette(p.id)}
										class="rounded p-1 text-fg-subtle hover:bg-warn/10 hover:text-warn-strong"
										aria-label="Remove palette"
										title="Remove palette"
									>
										<span class="font-mono text-[14px]">×</span>
									</button>
								</div>
								<div class="flex flex-wrap gap-1.5">
									{#each p.colors as c, idx (idx)}
										{@const hex = rgbaToHex(c).slice(0, 7)}
										<label
											class="group flex flex-col items-center gap-0.5"
											title="Index {idx} · {rgbaToHex(c)}"
										>
											<input
												type="color"
												value={hex}
												onchange={(e) => setSlotColor(p.id, idx, e.currentTarget.value)}
												class="size-7 cursor-pointer rounded border border-border bg-transparent"
												aria-label="Palette colour {idx}"
											/>
											<span
												class="font-mono text-[9px] text-fg-subtle group-hover:text-fg-muted"
												data-numeric
											>
												{idx}
											</span>
										</label>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</Panel>

			<Panel padding="none">
				<div class="flex items-center justify-between border-b border-border px-4 py-2.5">
					<div class="flex items-center gap-2">
						<span class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
							features.fea
						</span>
						{#if dirty}
							<span class="rounded-full bg-warn/20 px-2 py-0.5 text-[10px] font-medium text-warn-strong">
								Unsaved
							</span>
						{:else if project.features.feaSource}
							<span class="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent-strong">
								Custom
							</span>
						{:else}
							<span class="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success-strong">
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
					aria-label="OpenType feature source (.fea)"
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
					Snippet library
				</h2>
				<p class="mb-3 text-[12px] text-fg-subtle">
					Click to append a starter block. Edit the glyph names afterwards to match your project.
				</p>
				<div class="flex flex-wrap gap-1.5">
					{#each SNIPPETS as s (s.tag)}
						<button
							type="button"
							onclick={() => insertSnippet(s)}
							class="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2/40 px-2 py-1 text-[11px] font-medium text-fg-muted hover:border-accent hover:text-accent"
							title="Append {s.tag} starter to features.fea"
						>
							<span class="font-mono text-accent">{s.tag}</span>
							<span class="text-fg-subtle">{s.label}</span>
						</button>
					{/each}
				</div>
			</Panel>

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
				{@const pct = pythonProgress.stage === 'loading-script' ? 25 : pythonProgress.stage === 'starting-runtime' ? 55 : 85}
				<div class="rounded-md bg-surface-2 px-3 py-2.5">
					<div class="mb-1.5 flex items-center justify-between gap-2 text-[12px] text-fg-muted">
						<span class="flex items-center gap-2">
							<Loader class="size-3.5 animate-spin" />
							{pythonProgress.message}
						</span>
						<span class="font-mono text-[10px] text-fg-subtle" data-numeric>{pct}%</span>
					</div>
					<div class="h-1 overflow-hidden rounded-full bg-surface" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100">
						<div
							class="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
							style="width: {pct}%"
						></div>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
