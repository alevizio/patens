<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { buildFont } from '$lib/font/export';
	import {
		ensurePython,
		otfToWoff2,
		projectToUfoZip,
		compileFeaIntoFont,
		subscribeToPython,
		getPythonProgress
	} from '$lib/font/python';
	import { autoFeaSource } from '$lib/font/fea';
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

	const project = $derived(projectStore.project);

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
		if (fea && fea.trim().length > 0) {
			try {
				await ensurePython();
				buffer = await compileFeaIntoFont(buffer, fea);
			} catch (err) {
				console.warn('Feature compile failed, exporting without:', err);
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
				<Field label="License">
					<Input
						value={project.metadata.license}
						onchange={(e) =>
							projectStore.updateMetadata({ license: e.currentTarget.value })}
					/>
				</Field>
			</div>
		</Panel>

		<Panel>
			<h2 class="mb-4 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				Validation
			</h2>
			{#if validation.ok}
				<div
					class="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success"
				>
					<Sparkles class="size-4" />
					Ready to export — {validation.drawnCount} glyph{validation.drawnCount === 1 ? '' : 's'}{validation.compositeCount ? ` + ${validation.compositeCount} composite${validation.compositeCount === 1 ? '' : 's'}` : ''}.
				</div>
			{:else}
				<ul class="grid gap-1.5">
					{#each validation.issues as issue (issue)}
						<li class="rounded-md bg-warn/10 px-3 py-2 text-[13px] text-warn">{issue}</li>
					{/each}
				</ul>
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
