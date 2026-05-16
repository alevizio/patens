<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { buildFont } from '$lib/font/export';
	import {
		ensurePython,
		otfToWoff2,
		projectToUfoZip,
		finalizeFont,
		subscribeToPython,
		getPythonProgress
	} from '$lib/font/python';
	import { autoFeaSource } from '$lib/font/fea';
	import { resolveVerticalMetrics } from '$lib/font/types';
	import Panel from '$lib/ui/Panel.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Field from '$lib/ui/Field.svelte';
	import Input from '$lib/ui/Input.svelte';
	import Download from '@lucide/svelte/icons/download';
	import FileJson from '@lucide/svelte/icons/file-json';
	import FileText from '@lucide/svelte/icons/file-text';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Globe from '@lucide/svelte/icons/globe';
	import Loader from '@lucide/svelte/icons/loader-2';

	import { preflightProject } from '$lib/font/audit';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';

	const project = $derived(projectStore.project);
	const preflightIssues = $derived(project ? preflightProject(project) : []);

	let pythonProgress = $state(getPythonProgress());
	let woff2Busy = $state(false);
	let ufoBusy = $state(false);

	$effect(() => subscribeToPython((p) => (pythonProgress = p)));

	const validation = $derived.by(() => {
		if (!project) return { ok: false, issues: ['No project loaded'] };
		const issues: string[] = [];
		if (!project.metadata.familyName.trim()) issues.push('Family name is empty');
		if (!project.metadata.version.trim()) issues.push('Version is empty');
		const drawn = Object.values(project.glyphs).filter((g) => g.contours.length > 0);
		const composites = Object.values(project.glyphs).filter(
			(g) => g.contours.length === 0 && g.components && g.components.length > 0
		);
		const composedFromDrawn = composites.filter((g) =>
			g.components!.some((c) => (project.glyphs[c.baseCodepoint]?.contours.length ?? 0) > 0)
		);
		if (drawn.length === 0) issues.push('No glyphs drawn yet');
		return {
			ok: issues.length === 0,
			issues,
			drawnCount: drawn.length,
			compositeCount: composedFromDrawn.length
		};
	});

	const downloadBlob = (blob: Blob, filename: string) => {
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		a.remove();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	};

	const safeFilename = (s: string) => s.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');

	const buildOtfBuffer = async (): Promise<ArrayBuffer> => {
		if (!project) throw new Error('No project');
		const { font } = buildFont(project);
		let buffer = font.toArrayBuffer();
		const fea = project.features.feaSource ?? autoFeaSource(project);
		const vm = resolveVerticalMetrics(project.metrics);
		const needsFinalize = (fea && fea.trim().length > 0) || true;
		if (needsFinalize) {
			try {
				await ensurePython();
				buffer = await finalizeFont(buffer, {
					feaSource: fea && fea.trim().length > 0 ? fea : undefined,
					verticalMetrics: vm
				});
			} catch (err) {
				console.warn('Finalize step failed, exporting without:', err);
			}
		}
		return buffer;
	};

	const exportOtf = async () => {
		if (!project) return;
		const buffer = await buildOtfBuffer();
		downloadBlob(
			new Blob([buffer], { type: 'font/otf' }),
			`${safeFilename(project.metadata.familyName) || 'Untitled'}-${safeFilename(project.metadata.styleName)}.otf`
		);
	};

	const exportWoff2 = async () => {
		if (!project) return;
		woff2Busy = true;
		try {
			const otfBuffer = await buildOtfBuffer();
			const woff2 = await otfToWoff2(otfBuffer);
			downloadBlob(
				new Blob([woff2], { type: 'font/woff2' }),
				`${safeFilename(project.metadata.familyName) || 'Untitled'}-${safeFilename(project.metadata.styleName)}.woff2`
			);
		} catch (err) {
			alert('WOFF2 export failed: ' + (err instanceof Error ? err.message : String(err)));
		} finally {
			woff2Busy = false;
		}
	};

	const exportUfo = async () => {
		if (!project) return;
		ufoBusy = true;
		try {
			await ensurePython();
			const zip = await projectToUfoZip(JSON.stringify(project), project.metadata.familyName);
			downloadBlob(
				new Blob([zip], { type: 'application/zip' }),
				`${safeFilename(project.metadata.familyName) || 'Untitled'}.ufo.zip`
			);
		} catch (err) {
			alert('UFO export failed: ' + (err instanceof Error ? err.message : String(err)));
		} finally {
			ufoBusy = false;
		}
	};

	const exportProjectJson = () => {
		if (!project) return;
		const json = JSON.stringify(project, null, 2);
		downloadBlob(
			new Blob([json], { type: 'application/json' }),
			`${safeFilename(project.name)}.font.json`
		);
	};

	const exportSvgArchive = () => {
		if (!project) return;
		const lines: string[] = [
			'<?xml version="1.0" encoding="UTF-8"?>',
			'<svg xmlns="http://www.w3.org/2000/svg">',
			'  <defs>'
		];
		for (const g of Object.values(project.glyphs)) {
			if (g.contours.length === 0) continue;
			const id = `g${g.codepoint.toString(16).padStart(4, '0')}`;
			lines.push(`    <g id="${id}" data-name="${g.name}">`);
			const dParts: string[] = [];
			for (const c of g.contours) {
				for (const cmd of c.commands) {
					if (cmd.type === 'M') dParts.push(`M ${cmd.x} ${cmd.y}`);
					else if (cmd.type === 'L') dParts.push(`L ${cmd.x} ${cmd.y}`);
					else if (cmd.type === 'Q')
						dParts.push(`Q ${cmd.x1} ${cmd.y1} ${cmd.x} ${cmd.y}`);
					else if (cmd.type === 'C')
						dParts.push(`C ${cmd.x1} ${cmd.y1} ${cmd.x2} ${cmd.y2} ${cmd.x} ${cmd.y}`);
					else if (cmd.type === 'Z') dParts.push('Z');
				}
			}
			lines.push(`      <path d="${dParts.join(' ')}" />`);
			lines.push(`    </g>`);
		}
		lines.push('  </defs>');
		lines.push('</svg>');
		downloadBlob(
			new Blob([lines.join('\n')], { type: 'image/svg+xml' }),
			`${safeFilename(project.name)}.glyphs.svg`
		);
	};

	const importProjectJson = async (ev: Event) => {
		const input = ev.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const text = await file.text();
		const data = JSON.parse(text);
		projectStore.load(data);
		input.value = '';
	};

	const LICENSE_PRESETS: Record<string, { license: string; copyright?: (designer: string) => string }> = {
		ofl: {
			license:
				'This Font Software is licensed under the SIL Open Font License, Version 1.1. ' +
				'This license is copied below, and is also available with a FAQ at: ' +
				'https://openfontlicense.org. Reserved Font Names must be changed in derivative work.',
			copyright: (d) => `Copyright (c) ${new Date().getFullYear()} ${d || 'the Designer'}, with Reserved Font Names.`
		},
		proprietary: {
			license:
				'All rights reserved. This font is proprietary and may not be redistributed, ' +
				'modified, or used outside of the licensed scope without written permission.',
			copyright: (d) => `Copyright (c) ${new Date().getFullYear()} ${d || 'the Designer'}. All rights reserved.`
		},
		personal: {
			license:
				'For personal use only. Not licensed for redistribution, commercial use, or ' +
				'embedding in software products without permission.'
		}
	};

	const applyLicensePreset = (id: string) => {
		const preset = LICENSE_PRESETS[id];
		if (!preset || !project) return;
		const designer = project.metadata.designer ?? '';
		projectStore.updateMetadata({
			license: preset.license,
			...(preset.copyright ? { copyright: preset.copyright(designer) } : {})
		});
	};
</script>

{#if !project}
	<div class="flex h-full items-center justify-center text-fg-muted">Loading…</div>
{:else}
	<div class="h-full overflow-auto">
	<div class="mx-auto flex max-w-3xl flex-col gap-6 p-6">
		<header>
			<h1 class="text-xl font-semibold tracking-tight">Export</h1>
			<p class="text-sm text-fg-muted">
				Download an OTF for design apps, a JSON file to back up the project, or an SVG archive
				of all glyphs.
			</p>
		</header>

		<Panel>
			<h2 class="mb-4 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				Metadata
			</h2>
			<div class="grid grid-cols-2 gap-3">
				<Field label="Family name" required>
					<Input
						value={project.metadata.familyName}
						onchange={(e) =>
							projectStore.updateMetadata({ familyName: e.currentTarget.value })}
					/>
				</Field>
				<Field label="Style name">
					<Input
						value={project.metadata.styleName}
						onchange={(e) =>
							projectStore.updateMetadata({ styleName: e.currentTarget.value })}
					/>
				</Field>
				<Field label="Designer">
					<Input
						value={project.metadata.designer}
						onchange={(e) =>
							projectStore.updateMetadata({ designer: e.currentTarget.value })}
					/>
				</Field>
				<Field label="Version">
					<Input
						value={project.metadata.version}
						onchange={(e) =>
							projectStore.updateMetadata({ version: e.currentTarget.value })}
					/>
				</Field>
				<Field label="Copyright">
					<Input
						value={project.metadata.copyright}
						onchange={(e) =>
							projectStore.updateMetadata({ copyright: e.currentTarget.value })}
					/>
				</Field>
				<Field label="License" hint="Use a preset or write your own">
					<Input
						value={project.metadata.license}
						onchange={(e) =>
							projectStore.updateMetadata({ license: e.currentTarget.value })}
					/>
				</Field>
			</div>
			<div class="mt-3 flex flex-wrap items-center gap-2">
				<span class="text-[11px] font-medium text-fg-muted">License preset:</span>
				<button
					type="button"
					onclick={() => applyLicensePreset('ofl')}
					class="rounded-md border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium hover:border-accent hover:text-accent"
				>
					SIL OFL 1.1
				</button>
				<button
					type="button"
					onclick={() => applyLicensePreset('proprietary')}
					class="rounded-md border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium hover:border-accent hover:text-accent"
				>
					Proprietary
				</button>
				<button
					type="button"
					onclick={() => applyLicensePreset('personal')}
					class="rounded-md border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium hover:border-accent hover:text-accent"
				>
					Personal use only
				</button>
			</div>
		</Panel>

		<Panel>
			{@const vm = resolveVerticalMetrics(project.metrics)}
			<h2 class="mb-4 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				Vertical metrics
			</h2>
			<p class="mb-3 text-[12px] text-fg-subtle">
				Cross-platform line spacing depends on OS/2 typo + win + hhea triple matching.
				Leave these defaulted unless you know you need to override.
			</p>
			<div class="grid grid-cols-4 gap-2">
				<Field label="OS/2 typo asc">
					<Input
						type="number"
						density="sm"
						value={project.metrics.typoAscender ?? vm.typoAscender}
						onchange={(e) => projectStore.updateMetrics({ typoAscender: Number(e.currentTarget.value) })}
					/>
				</Field>
				<Field label="OS/2 typo desc">
					<Input
						type="number"
						density="sm"
						value={project.metrics.typoDescender ?? vm.typoDescender}
						onchange={(e) => projectStore.updateMetrics({ typoDescender: Number(e.currentTarget.value) })}
					/>
				</Field>
				<Field label="OS/2 line gap">
					<Input
						type="number"
						density="sm"
						value={project.metrics.typoLineGap ?? vm.typoLineGap}
						onchange={(e) => projectStore.updateMetrics({ typoLineGap: Number(e.currentTarget.value) })}
					/>
				</Field>
				<Field label="hhea asc">
					<Input
						type="number"
						density="sm"
						value={project.metrics.hheaAscender ?? vm.hheaAscender}
						onchange={(e) => projectStore.updateMetrics({ hheaAscender: Number(e.currentTarget.value) })}
					/>
				</Field>
				<Field label="hhea desc">
					<Input
						type="number"
						density="sm"
						value={project.metrics.hheaDescender ?? vm.hheaDescender}
						onchange={(e) => projectStore.updateMetrics({ hheaDescender: Number(e.currentTarget.value) })}
					/>
				</Field>
				<Field label="hhea line gap">
					<Input
						type="number"
						density="sm"
						value={project.metrics.hheaLineGap ?? vm.hheaLineGap}
						onchange={(e) => projectStore.updateMetrics({ hheaLineGap: Number(e.currentTarget.value) })}
					/>
				</Field>
				<Field label="win ascent">
					<Input
						type="number"
						density="sm"
						value={project.metrics.winAscent ?? vm.winAscent}
						onchange={(e) => projectStore.updateMetrics({ winAscent: Number(e.currentTarget.value) })}
					/>
				</Field>
				<Field label="win descent">
					<Input
						type="number"
						density="sm"
						value={project.metrics.winDescent ?? vm.winDescent}
						onchange={(e) => projectStore.updateMetrics({ winDescent: Number(e.currentTarget.value) })}
					/>
				</Field>
			</div>
			<label class="mt-3 flex items-center gap-2 rounded-md bg-surface-2 px-3 py-2">
				<input
					type="checkbox"
					checked={vm.useTypoMetrics}
					onchange={(e) =>
						projectStore.updateMetrics({ useTypoMetrics: e.currentTarget.checked })}
					class="size-4 accent-fg"
				/>
				<span class="text-[12px] font-medium text-fg">USE_TYPO_METRICS (recommended on)</span>
			</label>
		</Panel>

		<Panel>
			<h2 class="mb-4 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				Pre-flight check
			</h2>
			{#if validation.ok && preflightIssues.length === 0}
				<div
					class="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success"
				>
					<Sparkles class="size-4" />
					All checks pass — {validation.drawnCount} glyph{validation.drawnCount === 1 ? '' : 's'}{validation.compositeCount ? ` + ${validation.compositeCount} composite${validation.compositeCount === 1 ? '' : 's'}` : ''}.
				</div>
			{:else}
				<div class="grid gap-1.5">
					{#if !validation.ok}
						{#each validation.issues as issue (issue)}
							<li class="flex items-start gap-2 rounded-md bg-danger/10 px-3 py-2 text-[13px] text-danger">
								<AlertCircle class="mt-0.5 size-3.5 shrink-0" />
								<span>{issue}</span>
							</li>
						{/each}
					{/if}
					{#each preflightIssues as issue (issue.code)}
						<div
							class="flex items-start gap-2 rounded-md px-3 py-2 text-[12px] {issue.severity ===
							'error'
								? 'bg-danger/10 text-danger'
								: issue.severity === 'warn'
									? 'bg-warn/10 text-warn'
									: 'bg-surface-2 text-fg-muted'}"
						>
							{#if issue.severity === 'info'}
								<CheckCircle2 class="mt-0.5 size-3.5 shrink-0" />
							{:else}
								<AlertCircle class="mt-0.5 size-3.5 shrink-0" />
							{/if}
							<span>{issue.message}</span>
						</div>
					{/each}
				</div>
			{/if}
		</Panel>

		<Panel>
			<h2 class="mb-4 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				Download
			</h2>
			<div class="grid gap-2">
				<div class="flex items-center gap-3">
					<Button onclick={exportOtf} disabled={!validation.ok}>
						{#snippet icon()}<Download class="size-4" />{/snippet}
						Export OTF
					</Button>
					<span class="text-[12px] text-fg-subtle">
						Standard OpenType file for design apps and Font Book.
					</span>
				</div>
				<div class="flex items-center gap-3">
					<Button
						variant="secondary"
						onclick={exportWoff2}
						disabled={!validation.ok || woff2Busy}
						loading={woff2Busy}
					>
						{#snippet icon()}<Globe class="size-4" />{/snippet}
						{woff2Busy ? 'Compressing…' : 'Export WOFF2'}
					</Button>
					<span class="text-[12px] text-fg-subtle">
						{#if pythonProgress.stage === 'ready'}
							Brotli-compressed web font (~30% of OTF size).
						{:else if pythonProgress.stage === 'idle'}
							Brotli-compressed web font. First click downloads Python (~10MB, cached).
						{:else if pythonProgress.stage === 'error'}
							<span class="text-danger">Python: {pythonProgress.message}</span>
						{:else}
							<span class="inline-flex items-center gap-1">
								<Loader class="size-3 animate-spin" />
								{pythonProgress.message}
							</span>
						{/if}
					</span>
				</div>
				<div class="flex items-center gap-3">
					<Button
						variant="secondary"
						onclick={exportUfo}
						disabled={!validation.ok || ufoBusy}
						loading={ufoBusy}
					>
						{#snippet icon()}<FileText class="size-4" />{/snippet}
						{ufoBusy ? 'Packing UFO…' : 'Export UFO 3 (zip)'}
					</Button>
					<span class="text-[12px] text-fg-subtle">
						Industry-standard editable source. Open in Glyphs, RoboFont, FontLab.
					</span>
				</div>
				<div class="flex items-center gap-3">
					<Button variant="secondary" onclick={exportProjectJson}>
						{#snippet icon()}<FileJson class="size-4" />{/snippet}
						Export project (.font.json)
					</Button>
					<span class="text-[12px] text-fg-subtle">
						Round-trippable backup including sketches and metadata.
					</span>
				</div>
				<div class="flex items-center gap-3">
					<Button variant="secondary" onclick={exportSvgArchive}>
						{#snippet icon()}<FileText class="size-4" />{/snippet}
						Export SVG archive
					</Button>
					<span class="text-[12px] text-fg-subtle">
						One SVG with each glyph as a labeled <code>&lt;path&gt;</code>.
					</span>
				</div>
			</div>
		</Panel>

		<Panel>
			<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				Import
			</h2>
			<label
				class="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-border-strong/50 bg-surface-2/40 px-4 py-3 text-sm text-fg-muted hover:border-accent hover:bg-accent-soft/50"
			>
				<Download class="size-4 rotate-180" />
				<span>Replace current project with .font.json file</span>
				<input
					type="file"
					accept="application/json,.json"
					class="sr-only"
					onchange={importProjectJson}
				/>
			</label>
		</Panel>
	</div>
	</div>
{/if}
