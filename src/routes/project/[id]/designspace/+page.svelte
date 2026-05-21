<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { STANDARD_AXES } from '$lib/font/types';
	import { computeMasterWeights, interpolateGlyph } from '$lib/font/interpolate';
	import { contoursToSvgPath } from '$lib/font/path';
	import { checkMasterCompatibility } from '$lib/font/vf-compat';
	import Panel from '$lib/ui/Panel.svelte';
	import Button from '$lib/ui/Button.svelte';
	import LoadingPanel from '$lib/ui/LoadingPanel.svelte';
	import Field from '$lib/ui/Field.svelte';
	import Input from '$lib/ui/Input.svelte';
	import GlyphTile from '$lib/glyph/GlyphTile.svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Sliders from '@lucide/svelte/icons/sliders-horizontal';
	import Layers from '@lucide/svelte/icons/layers';
	import Tag from '@lucide/svelte/icons/tag';
	import Play from '@lucide/svelte/icons/play';

	const project = $derived(projectStore.project);

	// Live interpolation preview — drag axis sliders, see the selected
	// glyph morph between masters in real time. Uses the same
	// `computeMasterWeights` + `interpolateGlyph` helpers that power
	// the variable-font export pipeline so the preview is exact, not
	// an approximation.
	let previewLocation = $state<Record<string, number>>({});
	$effect(() => {
		// Initialise / reset the preview location whenever axes change.
		const next: Record<string, number> = {};
		for (const a of project?.axes ?? []) {
			next[a.tag] = previewLocation[a.tag] ?? a.default;
		}
		previewLocation = next;
	});
	const previewWeights = $derived.by(() => {
		if (!project || (project.axes?.length ?? 0) === 0) return [];
		const defaultLoc: Record<string, number> = {};
		for (const a of project.axes ?? []) defaultLoc[a.tag] = a.default;
		return computeMasterWeights(
			previewLocation,
			defaultLoc,
			(project.masters ?? []).map((m) => ({ id: m.id, location: m.location }))
		);
	});
	const previewContours = $derived.by(() => {
		if (!project) return null;
		const cp = projectStore.selectedCodepoint;
		const defaultGlyph = project.glyphs[cp];
		if (!defaultGlyph || defaultGlyph.contours.length === 0) return null;
		// Snap to default if no masters / no axes
		if (previewWeights.length <= 1) return defaultGlyph.contours;
		// Build the Sample[] for interpolateGlyph from the weights.
		const samples = previewWeights
			.map((w) => {
				const g = w.id
					? (project.masters ?? []).find((m) => m.id === w.id)?.glyphs?.[cp] ?? defaultGlyph
					: defaultGlyph;
				return { glyph: g, weight: w.weight };
			})
			.filter((s) => s.weight > 0);
		const out = interpolateGlyph(samples);
		return out ?? defaultGlyph.contours;
	});
	const previewGlyph = $derived(project?.glyphs[projectStore.selectedCodepoint] ?? null);
	const previewPath = $derived(previewContours ? contoursToSvgPath(previewContours) : '');

	// Sample-word preview: typesets a designer-controlled string at
	// the same axis location, so the designer can see how multiple
	// glyphs interpolate together (kerning + side-by-side rhythm,
	// not just one glyph in isolation).
	let sampleText = $state('Hello');
	const interpolateGlyphAt = (cp: number): { path: string; advance: number } | null => {
		if (!project) return null;
		const defaultGlyph = project.glyphs[cp];
		if (!defaultGlyph || defaultGlyph.contours.length === 0) return null;
		if (previewWeights.length <= 1) {
			return {
				path: contoursToSvgPath(defaultGlyph.contours),
				advance: defaultGlyph.advanceWidth
			};
		}
		const samples = previewWeights
			.map((w) => {
				const g = w.id
					? (project.masters ?? []).find((m) => m.id === w.id)?.glyphs?.[cp] ?? defaultGlyph
					: defaultGlyph;
				return { glyph: g, weight: w.weight };
			})
			.filter((s) => s.weight > 0);
		const out = interpolateGlyph(samples);
		return {
			path: contoursToSvgPath(out ?? defaultGlyph.contours),
			advance: defaultGlyph.advanceWidth
		};
	};
	const sampleTypeset = $derived.by(() => {
		if (!project) return { glyphs: [], width: 0 };
		const out: Array<{ char: string; path: string; x: number; w: number }> = [];
		let x = 0;
		for (const ch of [...sampleText]) {
			const cp = ch.codePointAt(0) ?? 0;
			const g = interpolateGlyphAt(cp);
			if (!g) {
				// Missing glyph — render a hollow box at half-em width.
				const w = Math.round(project.metrics.unitsPerEm * 0.5);
				out.push({ char: ch, path: '', x, w });
				x += w;
				continue;
			}
			out.push({ char: ch, path: g.path, x, w: g.advance });
			x += g.advance;
		}
		return { glyphs: out, width: x };
	});

	// Compatibility detail report — runs across every drawn glyph in
	// every master, returning specific reasons for any incompatibility
	// (contour-count, point-count, point-type, missing-in-master).
	// Surfaces the diagnostic info that the binary "incompatible" flag
	// in the glyph browser doesn't expose.
	const compatReport = $derived.by(() => {
		if (!project) return null;
		if ((project.masters?.length ?? 0) === 0) return null;
		return checkMasterCompatibility(project);
	});
	// Group issues by codepoint so the panel shows "1 issue on Á"
	// instead of N rows for one glyph with N master mismatches.
	const compatIssuesByCp = $derived.by(() => {
		const map = new Map<number, Array<{ master: string; message: string; code: string }>>();
		if (!compatReport) return map;
		for (const issue of compatReport.issues) {
			const arr = map.get(issue.codepoint) ?? [];
			arr.push({ master: issue.masterName, message: issue.message, code: issue.code });
			map.set(issue.codepoint, arr);
		}
		return map;
	});

	let newMasterName = $state('Bold');
	let newMasterLocation = $state<Record<string, number>>({});

	const defaultLocation = $derived.by(() => {
		const loc: Record<string, number> = {};
		for (const a of project?.axes ?? []) loc[a.tag] = a.default;
		return loc;
	});

	// Current selected glyph rendered across every master — quick visual sanity
	// check that interpolation is structurally compatible.
	const selectedCp = $derived(projectStore.selectedCodepoint);
	const masterGlyphCells = $derived.by(() => {
		if (!project || !selectedCp) return [];
		const defaultGlyph = project.glyphs[selectedCp];
		if (!defaultGlyph) return [];
		const cells: Array<{ label: string; loc: string; glyph: typeof defaultGlyph }> = [
			{ label: 'Default', loc: 'axis defaults', glyph: defaultGlyph }
		];
		for (const m of project.masters ?? []) {
			const override = m.glyphs?.[selectedCp];
			cells.push({
				label: m.name,
				loc: Object.entries(m.location)
					.map(([t, v]) => `${t}=${v}`)
					.join(' · '),
				glyph: override ?? defaultGlyph
			});
		}
		return cells;
	});

	$effect(() => {
		// Pre-populate new-master location with axis defaults, except for the
		// first axis which gets the max value (the typical "Bold" target).
		const axes = project?.axes ?? [];
		const next: Record<string, number> = {};
		for (let i = 0; i < axes.length; i++) {
			next[axes[i].tag] = i === 0 ? axes[i].maximum : axes[i].default;
		}
		newMasterLocation = next;
	});

	const handleAddAxis = (tag: string) => projectStore.addAxis(tag);

	const setupOpticalSizes = () => {
		// Add the axis (no-op if already there) then add the 4 canonical optical-size instances.
		if (!(project?.axes ?? []).some((a) => a.tag === 'opsz')) {
			projectStore.addAxis('opsz');
		}
		for (const preset of OPSZ_INSTANCES) {
			const exists = (projectStore.project?.instances ?? []).some(
				(i) => i.styleName === preset.styleName
			);
			if (!exists) handleAddInstance(preset.styleName, { opsz: preset.opsz });
		}
	};

	const handleAddMaster = async () => {
		const trimmed = newMasterName.trim();
		if (!trimmed || (project?.axes ?? []).length === 0) return;
		await projectStore.addMaster(trimmed, { ...newMasterLocation });
		newMasterName = 'Master';
	};

	const COMMON_INSTANCES = [
		{ styleName: 'Thin', wght: 100 },
		{ styleName: 'Light', wght: 300 },
		{ styleName: 'Regular', wght: 400 },
		{ styleName: 'Medium', wght: 500 },
		{ styleName: 'SemiBold', wght: 600 },
		{ styleName: 'Bold', wght: 700 },
		{ styleName: 'Black', wght: 900 }
	];

	/**
	 * Optical-size named instances follow the convention popularised by
	 * Adobe Originals (Source Serif 4, Source Sans 3) and reaffirmed in
	 * Google Fonts' opsz guidance: distinct cuts for 8pt captions, 14pt
	 * text, 28pt subheads, and 72pt display. Caption widens and opens up
	 * counters; Display tightens and refines.
	 */
	const OPSZ_INSTANCES = [
		{ styleName: 'Caption', opsz: 8, description: '6–10pt, very small UI text or footnotes' },
		{ styleName: 'Text', opsz: 14, description: '11–18pt, paragraph reading' },
		{ styleName: 'Subhead', opsz: 28, description: '20–40pt, intro lines and quotes' },
		{ styleName: 'Display', opsz: 72, description: '50pt+, headlines and posters' }
	];

	const hasOpsz = $derived((project?.axes ?? []).some((a) => a.tag === 'opsz'));
	const hasWght = $derived((project?.axes ?? []).some((a) => a.tag === 'wght'));

	const handleAddInstance = (styleName: string, baseLocation: Record<string, number>) => {
		if (!project) return;
		// Fill in any unspecified axes with their defaults
		const loc: Record<string, number> = {};
		for (const a of project.axes ?? []) {
			loc[a.tag] = baseLocation[a.tag] ?? a.default;
		}
		projectStore.upsertInstance({
			id: crypto.randomUUID(),
			familyName: project.metadata.familyName,
			styleName,
			location: loc
		});
	};
</script>

{#if !project}
	<LoadingPanel label="Loading designspace" />
{:else}
	<div class="h-full overflow-auto">
		<div class="mx-auto flex max-w-5xl flex-col gap-6 p-6">
			<header>
				<h1 class="text-xl font-semibold tracking-tight">Designspace</h1>
				<p class="text-sm text-fg-muted">
					Define axes and masters to make this a variable font. Each additional master is
					interpolated against the default at its axis location.
				</p>
			</header>

			<!-- Interactive interpolation preview. Drag axis sliders to
			     see the currently selected glyph morph in real time
			     between the default + masters. -->
			{#if (project.axes?.length ?? 0) > 0 && (project.masters?.length ?? 0) > 0 && previewGlyph}
				<Panel>
					<h2 class="mb-3 inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
						<Play class="size-3" /> Live preview
					</h2>
					<div class="grid grid-cols-[auto_1fr] gap-6">
						<div
							class="flex items-center justify-center rounded-md bg-canvas px-4 py-4"
							style="min-width: 180px; min-height: 180px;"
						>
							<svg
								viewBox="0 {project.metrics.descender} {Math.max(previewGlyph.advanceWidth, 100)} {project.metrics.ascender - project.metrics.descender}"
								preserveAspectRatio="xMidYMid meet"
								style="height: 160px; width: auto; transform: scaleY(-1);"
								aria-label="Interpolated preview of glyph at U+{projectStore.selectedCodepoint.toString(16).toUpperCase().padStart(4, '0')}"
							>
								{#if previewPath}
									<path d={previewPath} fill="currentColor" fill-rule="evenodd" class="text-fg" />
								{:else}
									<text
										x="50%"
										y="50%"
										text-anchor="middle"
										class="fill-fg-subtle"
										transform="scale(1 -1)"
									>—</text>
								{/if}
							</svg>
						</div>
						<div class="space-y-3">
							{#each project.axes ?? [] as axis (axis.tag)}
								<div>
									<div class="mb-1 flex items-baseline justify-between gap-2">
										<label
											for="preview-{axis.tag}"
											class="text-[12px] font-medium text-fg"
										>
											{axis.name}
											<span class="ml-1 font-mono text-[10px] text-fg-subtle">{axis.tag}</span>
										</label>
										<span class="font-mono text-[12px] text-fg" data-numeric>
											{Math.round(previewLocation[axis.tag] ?? axis.default)}
										</span>
									</div>
									<input
										id="preview-{axis.tag}"
										type="range"
										min={axis.minimum}
										max={axis.maximum}
										step="1"
										value={previewLocation[axis.tag] ?? axis.default}
										oninput={(ev) => {
											previewLocation = {
												...previewLocation,
												[axis.tag]: Number(ev.currentTarget.value)
											};
										}}
										class="w-full accent-accent"
									/>
									<div class="mt-0.5 flex justify-between font-mono text-[10px] text-fg-subtle">
										<span data-numeric>{axis.minimum}</span>
										<span data-numeric>{axis.maximum}</span>
									</div>
								</div>
							{/each}
							<details class="text-[12px] text-fg-muted">
								<summary class="cursor-pointer text-fg hover:text-fg-strong">
									Master weights
								</summary>
								<div class="mt-2 space-y-1 font-mono text-[11px]">
									{#each previewWeights as w (w.id ?? 'default')}
										{@const masterName = w.id
											? (project.masters ?? []).find((m) => m.id === w.id)?.name ?? '?'
											: 'Default'}
										<div class="flex items-center gap-2">
											<span class="w-24 truncate text-fg">{masterName}</span>
											<div class="relative h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
												<div
													class="absolute inset-y-0 left-0 bg-accent"
													style="width: {(w.weight * 100).toFixed(1)}%;"
												></div>
											</div>
											<span class="w-12 text-right text-fg-subtle" data-numeric>
												{(w.weight * 100).toFixed(1)}%
											</span>
										</div>
									{/each}
								</div>
							</details>
						</div>
					</div>
					<!-- Sample-word preview: same axis location as the slider
					     above, but typesets a full string so the designer can
					     see how multiple glyphs interpolate together (rhythm,
					     side-by-side spacing) rather than just one in isolation. -->
					<div class="mt-4 border-t border-border pt-4">
						<div class="mb-2 flex items-baseline justify-between gap-2">
							<label
								for="sample-text"
								class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"
							>
								Sample word
							</label>
							<input
								id="sample-text"
								type="text"
								bind:value={sampleText}
								maxlength="40"
								placeholder="Type to preview…"
								class="rounded-md border border-border bg-surface px-2 py-0.5 text-[12px] outline-none focus:border-accent"
								style="width: 16ch;"
							/>
						</div>
						{#if sampleTypeset.glyphs.length > 0}
							<div
								class="overflow-x-auto rounded-md border border-border bg-canvas px-3 py-3"
							>
								<svg
									viewBox="0 {project.metrics.descender} {Math.max(sampleTypeset.width, 100)} {project.metrics.ascender - project.metrics.descender}"
									preserveAspectRatio="xMinYMid meet"
									style="height: 80px; width: auto; transform: scaleY(-1); display: block;"
									aria-label="Interpolated sample word: {sampleText}"
								>
									{#each sampleTypeset.glyphs as g, i (i + '-' + g.char)}
										{#if g.path}
											<path
												d={g.path}
												transform="translate({g.x} 0)"
												fill="currentColor"
												class="text-fg"
											/>
										{:else}
											<rect
												x={g.x + 20}
												y={project.metrics.descender + 20}
												width={g.w - 40}
												height={project.metrics.ascender - project.metrics.descender - 40}
												fill="none"
												stroke="currentColor"
												stroke-width="20"
												stroke-dasharray="40 40"
												class="text-fg-subtle"
											/>
										{/if}
									{/each}
								</svg>
							</div>
						{/if}
					</div>
				</Panel>
			{/if}

			<!-- Compatibility detail panel. Surfaces specific reasons for any
			     glyph that fails interpolation compatibility — the binary
			     "incompatible" flag in the glyph browser doesn't say WHY.
			     Hidden when there are no issues or no masters. -->
			{#if compatReport && compatReport.issues.length > 0}
				<Panel>
					<h2 class="mb-3 inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
						<Layers class="size-3" /> Compatibility issues
						<span
							class="rounded-full bg-warn/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-wider text-warn-strong uppercase"
						>
							{compatIssuesByCp.size}
						</span>
					</h2>
					<p class="mb-3 text-[12px] leading-snug text-fg-muted">
						These glyphs differ structurally between default and one or more
						masters. The variable-font export will skip interpolation for them
						and fall back to the default master's shape. Fix by editing the
						mismatched master to match the default's contour + point count.
					</p>
					<ul class="grid gap-2">
						{#each [...compatIssuesByCp.entries()] as [cp, issues] (cp)}
							{@const ch = cp > 0x20 && cp < 0x10000 ? String.fromCodePoint(cp) : ''}
							<li class="rounded-md border border-warn/30 bg-warn/5 p-2">
								<div class="mb-1 flex items-baseline gap-2">
									<span class="font-mono text-[13px] text-warn-strong">
										{ch || `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`}
									</span>
									<span class="font-mono text-[10px] text-fg-subtle" data-numeric>
										U+{cp.toString(16).toUpperCase().padStart(4, '0')}
									</span>
								</div>
								<ul class="grid gap-0.5 pl-1 text-[11px] text-fg-muted">
									{#each issues as iss (iss.master + iss.code)}
										<li class="flex items-start gap-2">
											<span class="mt-0.5 inline-block size-1 shrink-0 rounded-full bg-warn-strong/60"></span>
											<span>
												<span class="font-medium text-fg">{iss.master}:</span>
												{iss.message}
											</span>
										</li>
									{/each}
								</ul>
							</li>
						{/each}
					</ul>
				</Panel>
			{/if}

			<Panel>
				<h2 class="mb-3 inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					<Sliders class="size-3" /> Axes
				</h2>
				{#if !project.axes || project.axes.length === 0}
					<p class="mb-3 text-sm text-fg-muted">
						No axes yet. Start with Weight or Width — the most widely supported axes.
					</p>
					<div class="mb-3 rounded-md border border-dashed border-accent/30 bg-accent-soft/30 px-3 py-2 text-[12px]">
						<div class="flex items-center justify-between gap-3">
							<span class="text-fg-muted">
								Want optical sizing like Source Serif 4 or Helvetica Now?
							</span>
							<button
								type="button"
								onclick={setupOpticalSizes}
								class="rounded border border-accent bg-accent text-accent-fg px-2.5 py-1 text-[11px] font-medium hover:bg-accent/90"
							>
								Set up opsz axis + 4 cuts
							</button>
						</div>
						<div class="mt-1 text-[10px] text-fg-subtle">
							Adds an Optical Size axis and four named instances: Caption · Text · Subhead · Display.
						</div>
					</div>
				{:else}
					<div class="mb-3 grid gap-2">
						{#each project.axes as axis (axis.tag)}
							<div
								class="grid grid-cols-[1fr_auto_auto_auto_auto] items-end gap-2 rounded-md border border-border bg-surface-2/40 px-3 py-2.5"
							>
								<div>
									<div class="text-[13px] font-medium text-fg">{axis.name}</div>
									<div class="font-mono text-[11px] text-fg-subtle">{axis.tag}</div>
								</div>
								<Field label="Min">
									<Input
										type="number"
										density="sm"
										value={axis.minimum}
										onchange={(e) =>
											projectStore.updateAxis(axis.tag, { minimum: Number(e.currentTarget.value) })}
									/>
								</Field>
								<Field label="Default">
									<Input
										type="number"
										density="sm"
										value={axis.default}
										onchange={(e) =>
											projectStore.updateAxis(axis.tag, { default: Number(e.currentTarget.value) })}
									/>
								</Field>
								<Field label="Max">
									<Input
										type="number"
										density="sm"
										value={axis.maximum}
										onchange={(e) =>
											projectStore.updateAxis(axis.tag, { maximum: Number(e.currentTarget.value) })}
									/>
								</Field>
								<button
									type="button"
									onclick={() => projectStore.removeAxis(axis.tag)}
									class="self-end rounded p-1.5 text-fg-subtle hover:bg-danger/10 hover:text-danger-strong"
									aria-label="Remove axis {axis.tag}"
									title="Remove axis {axis.tag}"
								>
									<Trash2 class="size-3.5" />
								</button>
							</div>
						{/each}
					</div>
				{/if}
				<div class="flex flex-wrap items-center gap-2">
					<span class="text-[11px] font-medium text-fg-muted">Add standard axis:</span>
					{#each Object.entries(STANDARD_AXES) as [tag, def] (tag)}
						{@const present = (project.axes ?? []).some((a) => a.tag === tag)}
						<button
							type="button"
							onclick={() => handleAddAxis(tag)}
							disabled={present}
							class="rounded-md border border-dashed border-border-strong/50 bg-transparent px-2 py-1 font-mono text-[11px] text-fg-muted hover:border-accent hover:text-accent disabled:opacity-40"
						>
							+ {tag} ({def.name})
						</button>
					{/each}
				</div>
			</Panel>

			<Panel>
				<h2 class="mb-3 inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
					<Layers class="size-3" /> Masters
				</h2>
				<div class="mb-3 grid gap-2">
					<div
						class="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border border-accent/30 bg-accent-soft/30 px-3 py-2.5"
					>
						<div>
							<div class="text-[13px] font-medium text-fg">
								Default <span class="text-fg-muted">— anchored at axis defaults</span>
							</div>
							<div class="font-mono text-[11px] text-fg-subtle" data-numeric>
								{(project.axes ?? []).length === 0
									? 'No axes defined'
									: (project.axes ?? []).map((a) => `${a.tag}=${a.default}`).join(' · ')}
							</div>
						</div>
						<span class="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent-strong">
							{Object.keys(project.glyphs).filter((cp) => project.glyphs[Number(cp)].contours.length > 0).length} drawn
						</span>
					</div>
					{#each project.masters ?? [] as m (m.id)}
						<div
							class="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2.5"
						>
							<div>
								<input
									type="text"
									value={m.name}
									oninput={(e) =>
										projectStore.updateMaster(m.id, (mm) => ({
											...mm,
											name: e.currentTarget.value
										}))}
									class="w-full border-0 bg-transparent text-[13px] font-medium text-fg outline-none focus:ring-1 focus:ring-accent"
								/>
								<div class="font-mono text-[11px] text-fg-subtle" data-numeric>
									{Object.entries(m.location).map(([k, v]) => `${k}=${v}`).join(' · ')}
								</div>
							</div>
							<span class="rounded-full bg-fg/10 px-2 py-0.5 text-[10px] font-medium text-fg-muted">
								{Object.keys(m.glyphs).filter((cp) => m.glyphs[Number(cp)].contours.length > 0).length} drawn
							</span>
							<button
								type="button"
								onclick={() => {
									const n = projectStore.syncAllEmptyFromDefault(m.id);
									if (n > 0) toast.success(`Copied ${n} glyph${n === 1 ? '' : 's'} from Default into ${m.name}`);
									else toast.info(`${m.name} already has all the default's drawn glyphs`);
								}}
								class="rounded border border-border bg-surface px-2 py-1 text-[11px] font-medium text-fg-muted hover:border-accent hover:text-accent"
								title="Copy every drawn default glyph into this master (skips glyphs already drawn here)"
							>
								Fill from Default
							</button>
							<button
								type="button"
								onclick={() => {
									if (confirm(`Remove master "${m.name}"? This deletes its glyph data.`))
										projectStore.removeMaster(m.id);
								}}
								class="rounded p-1.5 text-fg-subtle hover:bg-danger/10 hover:text-danger-strong"
								aria-label="Remove master {m.name}"
							>
								<Trash2 class="size-3.5" />
							</button>
						</div>
					{/each}
				</div>

				{#if (project.axes ?? []).length > 0}
					<div class="rounded-md border border-dashed border-border-strong/50 bg-surface-2/40 p-3">
						<div class="mb-2 text-[11px] font-medium text-fg-muted">Add master</div>
						<div class="grid grid-cols-[1fr_auto_auto] items-end gap-2">
							<Field label="Name">
								<Input density="sm" bind:value={newMasterName} placeholder="e.g. Bold" />
							</Field>
							{#each project.axes ?? [] as axis (axis.tag)}
								<Field label={axis.tag}>
									<Input
										type="number"
										density="sm"
										value={newMasterLocation[axis.tag] ?? axis.default}
										onchange={(e) =>
											(newMasterLocation = {
												...newMasterLocation,
												[axis.tag]: Number(e.currentTarget.value)
											})}
									/>
								</Field>
							{/each}
							<Button density="sm" onclick={handleAddMaster}>
								{#snippet icon()}<Plus class="size-3.5" />{/snippet}
								Add master
							</Button>
						</div>
						<div class="mt-2 text-[11px] text-fg-subtle">
							New masters start as a copy of the default master, so they're
							interpolation-compatible from day one.
						</div>
					</div>
				{:else}
					<p class="text-sm text-fg-muted">Add an axis above before creating additional masters.</p>
				{/if}
			</Panel>

			{#if (project.masters ?? []).length > 0 && masterGlyphCells.length > 0}
				<Panel>
					<div class="mb-2 flex items-baseline justify-between gap-2">
						<h2 class="inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
							<Layers class="size-3" /> Selected glyph across masters
						</h2>
						<a
							href="/project/{project.id}/edit"
							class="text-[11px] text-fg-muted hover:text-accent"
						>
							{masterGlyphCells[0].glyph.name} →
						</a>
					</div>
					<p class="mb-3 text-[12px] text-fg-subtle">
						Quick visual check that the current glyph stays structurally compatible
						across every master. A red incompatibility dot in the editor browser means
						contour or point counts differ.
					</p>
					<div class="flex flex-wrap gap-3">
						{#each masterGlyphCells as cell, i (cell.label)}
							<div class="flex flex-col items-center gap-1">
								<GlyphTile
									glyph={cell.glyph}
									size={72}
									showLabel={false}
									ascender={project.metrics.ascender}
									descender={project.metrics.descender}
								/>
								<div class="text-center text-[11px] font-medium text-fg">{cell.label}</div>
								{#if i > 0}
									<div class="font-mono text-[10px] text-fg-subtle" data-numeric>
										{cell.loc}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</Panel>
			{/if}

			{#if (project.axes ?? []).length > 0}
				<Panel>
					<h2 class="mb-2 inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
						<Tag class="size-3" /> Named instances
					</h2>
					<p class="mb-3 text-[12px] text-fg-subtle">
						Preset axis positions baked into the variable font's <code>fvar</code> table —
						these appear as selectable styles in OS font menus.
					</p>
					{#if (project.instances ?? []).length > 0}
						<ul class="mb-3 grid gap-1">
							{#each project.instances ?? [] as inst (inst.id)}
								<li
									class="flex items-center gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2"
								>
									<div class="flex-1">
										<div class="text-[13px] font-medium text-fg">{inst.styleName}</div>
										<div class="font-mono text-[11px] text-fg-subtle" data-numeric>
											{Object.entries(inst.location).map(([k, v]) => `${k}=${v}`).join(' · ')}
										</div>
									</div>
									<button
										type="button"
										onclick={() => projectStore.removeInstance(inst.id)}
										class="rounded p-1 text-fg-subtle hover:bg-danger/10 hover:text-danger-strong"
										aria-label="Remove instance {inst.styleName}"
										title="Remove instance {inst.styleName}"
									>
										<Trash2 class="size-3.5" />
									</button>
								</li>
							{/each}
						</ul>
					{/if}
					{#if hasWght}
						<div class="flex flex-wrap items-center gap-1.5">
							<span class="text-[11px] font-medium text-fg-muted">Add common weight:</span>
							{#each COMMON_INSTANCES as preset (preset.styleName)}
								{@const present = (project.instances ?? []).some(
									(i) => i.styleName === preset.styleName
								)}
								<button
									type="button"
									onclick={() => handleAddInstance(preset.styleName, { wght: preset.wght })}
									disabled={present}
									class="rounded-md border border-dashed border-border-strong/50 bg-transparent px-2 py-1 text-[11px] font-medium text-fg-muted hover:border-accent hover:text-accent disabled:opacity-40"
								>
									+ {preset.styleName} ({preset.wght})
								</button>
							{/each}
						</div>
					{/if}
					{#if hasOpsz}
						<div class="mt-2 flex flex-wrap items-center gap-1.5">
							<span class="text-[11px] font-medium text-fg-muted">Add optical size:</span>
							{#each OPSZ_INSTANCES as preset (preset.styleName)}
								{@const present = (project.instances ?? []).some(
									(i) => i.styleName === preset.styleName
								)}
								<button
									type="button"
									onclick={() => handleAddInstance(preset.styleName, { opsz: preset.opsz })}
									disabled={present}
									class="rounded-md border border-dashed border-border-strong/50 bg-transparent px-2 py-1 text-[11px] font-medium text-fg-muted hover:border-accent hover:text-accent disabled:opacity-40"
									title={preset.description}
								>
									+ {preset.styleName} ({preset.opsz}pt)
								</button>
							{/each}
						</div>
						<p class="mt-1 text-[10px] text-fg-subtle">
							Convention from Adobe Originals (Source Serif / Source Sans). Caption
							widens counters for small sizes; Display tightens for large sizes.
						</p>
					{/if}
					{#if !hasWght && !hasOpsz}
						<div class="flex flex-wrap items-center gap-1.5">
							<span class="text-[11px] font-medium text-fg-muted">Add common weight:</span>
							{#each COMMON_INSTANCES as preset (preset.styleName)}
								{@const present = (project.instances ?? []).some(
									(i) => i.styleName === preset.styleName
								)}
								<button
									type="button"
									onclick={() => handleAddInstance(preset.styleName, { wght: preset.wght })}
									disabled={present}
									class="rounded-md border border-dashed border-border-strong/50 bg-transparent px-2 py-1 text-[11px] font-medium text-fg-muted hover:border-accent hover:text-accent disabled:opacity-40"
								>
									+ {preset.styleName} ({preset.wght})
								</button>
							{/each}
						</div>
					{/if}
				</Panel>
			{/if}
		</div>
	</div>
{/if}
