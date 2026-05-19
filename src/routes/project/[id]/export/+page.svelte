<script lang="ts">
	import { projectStore } from '$lib/stores/project.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { buildFont, hasMarkAnchors } from '$lib/font/export';
	import { applyMarkPositioning } from '$lib/font/mark-feature';
	import {
		ensurePython,
		finalizeFont,
		buildVariableFont,
		instancesAsStaticZip,
		subscribeToPython,
		getPythonProgress
	} from '$lib/font/python';
	import { otfToWoff2 } from '$lib/font/woff2';
	import { projectToUfoZipNative } from '$lib/font/ufo';
	import { autoFeaSource } from '$lib/font/fea';
	import { generateDesignMd } from '$lib/font/design-md';
	import { zipSync, strToU8 } from 'fflate';
	import { resolveVerticalMetrics, FS_TYPE_OPTIONS } from '$lib/font/types';
	import Panel from '$lib/ui/Panel.svelte';
	import Button from '$lib/ui/Button.svelte';
	import LoadingPanel from '$lib/ui/LoadingPanel.svelte';
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
	let vfBusy = $state(false);
	let staticFamilyBusy = $state(false);

	$effect(() => subscribeToPython((p) => (pythonProgress = p)));

	const isVariable = $derived(
		project ? (project.axes?.length ?? 0) > 0 && (project.masters?.length ?? 0) > 0 : false
	);

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

	let cssCopied = $state(false);
	const cssSnippet = $derived.by(() => {
		if (!project) return '';
		const family = project.metadata.familyName || project.name;
		const fileBase = `${safeFilename(family) || 'Untitled'}-${safeFilename(project.metadata.styleName)}`;
		const id = safeFilename(family).toLowerCase() || 'custom';
		const m = project.metrics;
		return `@font-face {
	font-family: '${family}';
	src: url('/fonts/${fileBase}.woff2') format('woff2'),
	     url('/fonts/${fileBase}.otf') format('opentype');
	font-weight: normal;
	font-style: normal;
	font-display: swap;
}

:root {
	--font-${id}: '${family}', system-ui, sans-serif;
	/* Design tokens — ratios of the em (so they scale with font-size) */
	--${id}-upm: ${m.unitsPerEm};
	--${id}-cap-em: ${(m.capHeight / m.unitsPerEm).toFixed(3)};
	--${id}-x-em: ${(m.xHeight / m.unitsPerEm).toFixed(3)};
	--${id}-ascender-em: ${(m.ascender / m.unitsPerEm).toFixed(3)};
	--${id}-descender-em: ${(m.descender / m.unitsPerEm).toFixed(3)};
}

body {
	font-family: var(--font-${id});
	font-feature-settings: 'kern' 1, 'liga' 1;
}`;
	});
	const copyCss = async () => {
		if (!cssSnippet) return;
		try {
			await navigator.clipboard.writeText(cssSnippet);
			cssCopied = true;
			setTimeout(() => (cssCopied = false), 1500);
		} catch {
			toast.error('Copy failed — select and copy manually.');
		}
	};

	const buildOtfBuffer = async (): Promise<ArrayBuffer> => {
		if (!project) throw new Error('No project');
		// buildFont() now handles vertical metrics + standard ligatures via
		// opentype.js. Anchor-based mark positioning is spliced in via
		// applyMarkPositioning (native binary writer + SFNT splice — no
		// Pyodide). Pyodide is only needed for a user-edited custom .fea
		// with features beyond the auto-generated set.
		const { font, indexByCodepoint } = buildFont(project);
		let buffer = font.toArrayBuffer();

		// Native GPOS mark feature — splice anchor positioning straight into
		// the binary if the project has matched base+mark anchor pairs.
		if (hasMarkAnchors(project)) {
			const original = new Uint8Array(buffer);
			const spliced = applyMarkPositioning(original, project, indexByCodepoint);
			buffer = spliced.buffer.slice(
				spliced.byteOffset,
				spliced.byteOffset + spliced.byteLength
			) as ArrayBuffer;
		}

		const customFea = project.features.feaSource?.trim();
		const hasCustomFea = !!customFea && customFea.length > 0;

		if (hasCustomFea) {
			// User-authored custom .fea — full feaLib compilation path. Pyodide
			// is unavoidable here without a JS .fea parser (a future Phase B).
			try {
				await ensurePython();
				buffer = await finalizeFont(buffer, { feaSource: customFea! });
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				toast.warn(`Features didn't compile — exporting without them. (${msg})`);
				console.warn('Feature compilation failed, exporting without:', err);
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

	// ---------- Trial / restricted subset export ----------
	let trialChars = $state('HELO WORLD');
	let trialBusy = $state(false);
	const exportTrialOtf = async () => {
		if (!project || trialBusy) return;
		trialBusy = true;
		try {
			const allowed = new Set<number>();
			for (const ch of trialChars) {
				const cp = ch.codePointAt(0);
				if (cp && project.glyphs[cp]) allowed.add(cp);
			}
			if (allowed.size === 0) {
				toast.warn('No characters in the trial subset match drawn glyphs.');
				return;
			}
			// Build a stripped-down project clone
			const subsetGlyphs: typeof project.glyphs = {};
			for (const cp of allowed) subsetGlyphs[cp] = project.glyphs[cp];
			const trialProject: typeof project = {
				...project,
				glyphs: subsetGlyphs,
				kerning: project.kerning.filter(
					(p) =>
						(typeof p.left !== 'number' || allowed.has(p.left)) &&
						(typeof p.right !== 'number' || allowed.has(p.right))
				),
				metadata: {
					...project.metadata,
					familyName: `${project.metadata.familyName} Trial`
				}
			};
			const { font } = buildFont(trialProject);
			const buffer = font.toArrayBuffer();
			downloadBlob(
				new Blob([buffer], { type: 'font/otf' }),
				`${safeFilename(project.metadata.familyName) || 'Untitled'}-Trial-${allowed.size}gl.otf`
			);
			toast.success(`Trial OTF exported (${allowed.size} glyphs).`);
		} catch (err) {
			toast.error('Trial export failed: ' + (err instanceof Error ? err.message : String(err)));
		} finally {
			trialBusy = false;
		}
	};

	let trialWoff2Busy = $state(false);
	const exportTrialWoff2 = async () => {
		if (!project || trialWoff2Busy) return;
		trialWoff2Busy = true;
		try {
			const allowed = new Set<number>();
			for (const ch of trialChars) {
				const cp = ch.codePointAt(0);
				if (cp && project.glyphs[cp]) allowed.add(cp);
			}
			if (allowed.size === 0) {
				toast.warn('No characters in the trial subset match drawn glyphs.');
				return;
			}
			const subsetGlyphs: typeof project.glyphs = {};
			for (const cp of allowed) subsetGlyphs[cp] = project.glyphs[cp];
			const trialProject: typeof project = {
				...project,
				glyphs: subsetGlyphs,
				kerning: project.kerning.filter(
					(p) =>
						(typeof p.left !== 'number' || allowed.has(p.left)) &&
						(typeof p.right !== 'number' || allowed.has(p.right))
				),
				metadata: {
					...project.metadata,
					familyName: `${project.metadata.familyName} Trial`
				}
			};
			const { font } = buildFont(trialProject);
			const otf = font.toArrayBuffer();
			const woff2 = await otfToWoff2(otf);
			downloadBlob(
				new Blob([woff2], { type: 'font/woff2' }),
				`${safeFilename(project.metadata.familyName) || 'Untitled'}-Trial-${allowed.size}gl.woff2`
			);
			toast.success(
				`Trial WOFF2 exported (${allowed.size} glyphs, ${(woff2.byteLength / 1024).toFixed(1)} KB).`
			);
		} catch (err) {
			toast.error('Trial WOFF2 export failed: ' + (err instanceof Error ? err.message : String(err)));
		} finally {
			trialWoff2Busy = false;
		}
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
			toast.error('WOFF2 export failed: ' + (err instanceof Error ? err.message : String(err)));
		} finally {
			woff2Busy = false;
		}
	};

	let bundleBusy = $state(false);
	/**
	 * Export the full release bundle in one go: OTF + WOFF2 + HTML test page +
	 * .font.json. Sequential downloads — most browsers allow multiple downloads
	 * after the user explicitly clicks the bundle button.
	 */
	const exportAll = async () => {
		if (!project || bundleBusy) return;
		bundleBusy = true;
		try {
			await exportOtf();
			await new Promise((r) => setTimeout(r, 350));
			await exportWoff2();
			await new Promise((r) => setTimeout(r, 350));
			await exportTestPage();
			await new Promise((r) => setTimeout(r, 350));
			exportProjectJson();
			await new Promise((r) => setTimeout(r, 350));
			exportFeaSource();
			await new Promise((r) => setTimeout(r, 350));
			exportDesignMd();
			toast.success('Release bundle: 6 files downloaded.');
		} catch (err) {
			toast.error('Bundle export failed: ' + (err instanceof Error ? err.message : String(err)));
		} finally {
			bundleBusy = false;
		}
	};

	const exportVf = async () => {
		if (!project || !isVariable) return;
		vfBusy = true;
		try {
			await ensurePython();
			// Build a static OTF for every master (default + extras)
			const allMasters: Array<{ name: string; buffer: ArrayBuffer; location: Record<string, number> }> = [];
			// Default master at axis defaults
			const defaultLocation: Record<string, number> = {};
			for (const a of project.axes ?? []) defaultLocation[a.tag] = a.default;
			const defaultBuild = buildFont(project);
			allMasters.push({
				name: 'Default',
				buffer: defaultBuild.font.toArrayBuffer(),
				location: defaultLocation
			});
			for (const m of project.masters ?? []) {
				const b = buildFont(project, { masterId: m.id });
				allMasters.push({
					name: m.name,
					buffer: b.font.toArrayBuffer(),
					location: m.location
				});
			}
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
			downloadBlob(
				new Blob([vfBuffer], { type: 'font/ttf' }),
				`${safeFilename(project.metadata.familyName) || 'Untitled'}-VF.ttf`
			);
		} catch (err) {
			toast.error('Variable font build failed: ' + (err instanceof Error ? err.message : String(err)));
		} finally {
			vfBusy = false;
		}
	};

	const exportStaticFamily = async () => {
		if (!project || !isVariable) return;
		if ((project.instances ?? []).length === 0) {
			toast.warn('Add named instances on the Designspace tab first.');
			return;
		}
		staticFamilyBusy = true;
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
			const zip = await instancesAsStaticZip({
				axes: (project.axes ?? []).map((a) => ({
					tag: a.tag,
					name: a.name,
					minimum: a.minimum,
					default: a.default,
					maximum: a.maximum
				})),
				masters: allMasters,
				defaultMasterName: 'Default',
				familyName: project.metadata.familyName,
				instances: (project.instances ?? []).map((i) => ({
					familyName: i.familyName ?? project.metadata.familyName,
					styleName: i.styleName,
					location: i.location,
					postScriptName: i.postScriptName
				}))
			});
			downloadBlob(
				new Blob([zip], { type: 'application/zip' }),
				`${safeFilename(project.metadata.familyName) || 'Untitled'}-static-family.zip`
			);
		} catch (err) {
			toast.error(
				'Static family export failed: ' + (err instanceof Error ? err.message : String(err))
			);
		} finally {
			staticFamilyBusy = false;
		}
	};

	const exportUfo = async () => {
		if (!project) return;
		ufoBusy = true;
		try {
			// Native UFO 3 writer — no Pyodide round-trip. Synchronous; the
			// `await` would be redundant but we keep the busy state for the
			// brief moment fflate spends zipping a large project.
			const zip = projectToUfoZipNative(project, project.metadata.familyName);
			downloadBlob(
				new Blob([zip], { type: 'application/zip' }),
				`${safeFilename(project.metadata.familyName) || 'Untitled'}.ufo.zip`
			);
		} catch (err) {
			toast.error('UFO export failed: ' + (err instanceof Error ? err.message : String(err)));
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

	const exportFeaSource = () => {
		if (!project) return;
		// Prefer user-customized .fea; otherwise serialize the auto-generated source.
		const text = project.features.feaSource?.trim() || autoFeaSource(project);
		downloadBlob(
			new Blob([text], { type: 'text/plain' }),
			`${safeFilename(project.name)}.fea`
		);
	};

	const exportDesignMd = () => {
		if (!project) return;
		const md = generateDesignMd(project);
		downloadBlob(
			new Blob([md], { type: 'text/markdown' }),
			`DESIGN-${safeFilename(project.name)}.md`
		);
	};

	let zipBundleBusy = $state(false);
	const exportZipBundle = async () => {
		if (!project || zipBundleBusy) return;
		zipBundleBusy = true;
		try {
			const familyId = safeFilename(project.metadata.familyName) || 'Untitled';
			const styleId = safeFilename(project.metadata.styleName) || 'Regular';
			const otfBuffer = await buildOtfBuffer();
			const otfBytes = new Uint8Array(otfBuffer);
			const woff2 = await otfToWoff2(otfBuffer);
			const woff2Bytes = woff2 instanceof Uint8Array ? woff2 : new Uint8Array(woff2);
			const projectJson = JSON.stringify(project, null, 2);
			const fea = project.features.feaSource?.trim() || autoFeaSource(project);
			const designMd = generateDesignMd(project);
			// Minimal browser test page that embeds the OTF via base64 so the .zip
			// is self-contained and can be opened from any web folder.
			const base64 = bufferToBase64(otfBuffer);
			const testHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<title>${familyId} ${styleId} — Test page</title>
<style>
@font-face { font-family: '${familyId}'; src: url(data:font/otf;base64,${base64}) format('opentype'); }
body { font-family: '${familyId}', system-ui, sans-serif; max-width: 60ch; margin: 4em auto; padding: 0 1em; line-height: 1.5; color: #111; background: #fafafa; }
h1 { font-size: 4em; line-height: 1; margin: 0 0 0.5em; }
.size { font-size: 1em; opacity: 0.5; font-family: ui-monospace, monospace; }
.row { margin: 0.5em 0; }
.row span:first-child { display: inline-block; width: 4ch; color: #888; font-family: ui-monospace, monospace; }
</style></head><body>
<h1>${project.metadata.familyName}</h1>
<p class="size">${project.metadata.styleName} · v${project.metadata.version} · ${project.metadata.designer || '—'}</p>
${[12, 18, 24, 36, 48, 72]
	.map(
		(s) =>
			`<div class="row"><span>${s}px</span><span style="font-size:${s}px">The quick brown fox jumps over the lazy dog</span></div>`
	)
	.join('\n')}
<p style="margin-top: 3em; font-size: 12px; color: #888;">Generated by Font Studio · ${new Date().toISOString().slice(0, 10)}</p>
</body></html>`;
			const files: Record<string, Uint8Array> = {
				[`${familyId}-${styleId}.otf`]: otfBytes,
				[`${familyId}-${styleId}.woff2`]: woff2Bytes,
				[`${familyId}.features.fea`]: strToU8(fea),
				[`${familyId}.font.json`]: strToU8(projectJson),
				['DESIGN.md']: strToU8(designMd),
				['test-page.html']: strToU8(testHtml)
			};
			const zipped = zipSync(files, { level: 6 });
			downloadBlob(
				new Blob([zipped], { type: 'application/zip' }),
				`${familyId}-${styleId}-release.zip`
			);
			toast.success(
				`Release zip: 6 files in ${(zipped.byteLength / 1024).toFixed(1)} KB`
			);
		} catch (err) {
			toast.error('Zip bundle failed: ' + (err instanceof Error ? err.message : String(err)));
		} finally {
			zipBundleBusy = false;
		}
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

	let testPageBusy = $state(false);
	const escapeHtml = (s: string): string =>
		s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	const bufferToBase64 = (buf: ArrayBuffer): string => {
		const bytes = new Uint8Array(buf);
		let bin = '';
		const chunk = 0x8000;
		for (let i = 0; i < bytes.length; i += chunk) {
			bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
		}
		return btoa(bin);
	};
	const exportTestPage = async () => {
		if (!project) return;
		testPageBusy = true;
		try {
			const otfBuffer = await buildOtfBuffer();
			const base64 = bufferToBase64(otfBuffer);
			const family = project.metadata.familyName || project.name;
			const familyId = safeFilename(family) || 'TestFont';
			const designer = escapeHtml(project.metadata.designer || '—');
			const drawn = Object.values(project.glyphs).filter((g) => g.contours.length > 0);
			const charset = drawn
				.map((g) => String.fromCodePoint(g.codepoint))
				.filter((s) => s.length === 1 && s.codePointAt(0)! > 0x20)
				.join('');
			const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(family)} — Test page</title>
<style>
@font-face {
	font-family: '${familyId}';
	src: url(data:font/otf;base64,${base64}) format('opentype');
	font-display: block;
}
:root {
	color-scheme: light dark;
	--bg: #fafafa;
	--fg: #111;
	--muted: #666;
	--border: #ddd;
	--accent: #0066ff;
}
@media (prefers-color-scheme: dark) {
	:root { --bg: #111; --fg: #fafafa; --muted: #888; --border: #2a2a2a; --accent: #6ea8ff; }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 14px/1.5 -apple-system, system-ui, sans-serif; }
header { padding: 48px 32px 24px; border-bottom: 1px solid var(--border); }
header h1 { margin: 0 0 6px; font-size: 28px; font-weight: 600; }
header p { margin: 0; color: var(--muted); font-size: 13px; }
main { padding: 32px; max-width: 1200px; margin: 0 auto; }
section { margin: 0 0 48px; }
section h2 { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin: 0 0 12px; font-weight: 600; }
.t { font-family: '${familyId}', sans-serif; font-feature-settings: 'kern' 1, 'liga' 1; }
.huge { font-size: 96px; line-height: 1; margin: 0; }
.large { font-size: 48px; line-height: 1.05; margin: 0; }
.medium { font-size: 24px; line-height: 1.3; margin: 0; }
.body { font-size: 16px; line-height: 1.55; max-width: 65ch; margin: 0; }
.row { display: flex; align-items: baseline; gap: 16px; padding: 8px 0; border-bottom: 1px dashed var(--border); }
.row span:first-child { width: 48px; text-align: right; color: var(--muted); font-size: 11px; font-variant-numeric: tabular-nums; }
textarea, input { width: 100%; padding: 12px 14px; background: transparent; color: var(--fg); border: 1px solid var(--border); border-radius: 8px; font-family: '${familyId}', sans-serif; font-size: 28px; line-height: 1.3; }
textarea:focus, input:focus { outline: 2px solid var(--accent); border-color: var(--accent); }
.charset { font-size: 32px; line-height: 1.4; word-break: break-all; max-width: 64ch; }
.controls { display: flex; gap: 6px; flex-wrap: wrap; margin: 0 0 12px; }
.controls button { cursor: pointer; padding: 4px 8px; border: 1px solid var(--border); background: transparent; color: var(--muted); border-radius: 4px; font: 11px monospace; }
.controls button[aria-pressed="true"] { background: var(--accent); color: #fff; border-color: var(--accent); }
footer { padding: 24px 32px; border-top: 1px solid var(--border); color: var(--muted); font-size: 11px; text-align: center; }
</style>
</head>
<body>
<header>
	<h1 class="t">${escapeHtml(family)}</h1>
	<p>${escapeHtml(project.metadata.styleName)} · v${escapeHtml(project.metadata.version)} · ${drawn.length} glyphs · Designed by ${designer}</p>
</header>
<main>
	<section>
		<h2>Display</h2>
		<p class="t huge">${escapeHtml(family)}</p>
		<p class="t large" style="color: var(--muted); margin-top: 12px;">Type design is system design.</p>
	</section>
	<section>
		<h2>Type your own</h2>
		<textarea class="t" rows="2" oninput="this.style.height='auto'; this.style.height=this.scrollHeight+'px';">${escapeHtml(family)}</textarea>
	</section>
	<section>
		<h2>OpenType features</h2>
		<div class="controls">
			<button data-feat="kern" aria-pressed="true">kern</button>
			<button data-feat="liga" aria-pressed="true">liga</button>
			<button data-feat="dlig" aria-pressed="false">dlig</button>
			<button data-feat="calt" aria-pressed="true">calt</button>
			<button data-feat="onum" aria-pressed="false">onum</button>
			<button data-feat="tnum" aria-pressed="false">tnum</button>
			<button data-feat="smcp" aria-pressed="false">smcp</button>
		</div>
		<p class="t large" id="feat-sample">fi fl 0123 Office 1029 — affluent</p>
	</section>
	<section>
		<h2>Waterfall</h2>
		<div>
			<div class="row"><span>12</span><span class="t" style="font-size:12px;">The quick brown fox jumps over the lazy dog</span></div>
			<div class="row"><span>16</span><span class="t" style="font-size:16px;">The quick brown fox jumps over the lazy dog</span></div>
			<div class="row"><span>24</span><span class="t" style="font-size:24px;">The quick brown fox jumps over the lazy dog</span></div>
			<div class="row"><span>32</span><span class="t" style="font-size:32px;">The quick brown fox jumps over the lazy dog</span></div>
			<div class="row"><span>48</span><span class="t" style="font-size:48px;">The quick brown fox</span></div>
			<div class="row"><span>72</span><span class="t" style="font-size:72px;">Hamburge</span></div>
		</div>
	</section>
	<section>
		<h2>Paragraph</h2>
		<p class="t body">In typography, a typeface is a design of letters, numbers and other symbols, to be used in printing or for electronic display. Most typefaces include variations in size, weight, slope, width — letting designers express texture, hierarchy, and voice across a coherent system.</p>
	</section>
	<section>
		<h2>Character set</h2>
		<div class="t charset">${escapeHtml(charset)}</div>
	</section>
</main>
<footer>Generated by Font Studio · @font-face data URL · drop this file anywhere to share.</footer>
<script>
const sample = document.getElementById('feat-sample');
document.querySelectorAll('.controls button').forEach((b) => {
	b.addEventListener('click', () => {
		const pressed = b.getAttribute('aria-pressed') === 'true';
		b.setAttribute('aria-pressed', String(!pressed));
		const parts = [];
		document.querySelectorAll('.controls button').forEach((bb) => {
			parts.push("'" + bb.dataset.feat + "' " + (bb.getAttribute('aria-pressed') === 'true' ? 1 : 0));
		});
		sample.style.fontFeatureSettings = parts.join(', ');
	});
});
<\/script>
</body>
</html>`;
			downloadBlob(
				new Blob([html], { type: 'text/html;charset=utf-8' }),
				`${safeFilename(family)}-test.html`
			);
		} catch (err) {
			toast.error('Test page export failed: ' + (err instanceof Error ? err.message : String(err)));
		} finally {
			testPageBusy = false;
		}
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
	<LoadingPanel label="Loading export" />
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

			{@const currentFsType = project.metadata.fsType ?? 0}
			<div class="mt-4 grid gap-2 border-t border-border pt-3">
				<div class="flex items-baseline justify-between gap-2">
					<span class="text-[12px] font-medium text-fg-muted">
						OS/2 <span class="font-mono">fsType</span> (embedding permissions)
					</span>
					<a
						href="https://learn.microsoft.com/en-us/typography/opentype/spec/os2#fstype"
						target="_blank"
						rel="noopener"
						class="text-[10px] text-fg-subtle hover:text-accent"
					>
						spec ↗
					</a>
				</div>
				<select
					value={currentFsType}
					onchange={(e) =>
						projectStore.updateMetadata({
							fsType: Number(e.currentTarget.value) as 0 | 2 | 4 | 8
						})}
					aria-label="Embedding restrictions (fsType)"
					class="rounded-md border border-border bg-surface px-2.5 py-1.5 text-[12px] text-fg outline-none focus:border-accent"
				>
					{#each FS_TYPE_OPTIONS as opt (opt.value)}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>
				<p class="text-[11px] text-fg-subtle">
					{FS_TYPE_OPTIONS.find((o) => o.value === currentFsType)?.hint}
				</p>
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
					class="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success-strong"
				>
					<Sparkles class="size-4" />
					All checks pass — {validation.drawnCount} glyph{validation.drawnCount === 1 ? '' : 's'}{validation.compositeCount ? ` + ${validation.compositeCount} composite${validation.compositeCount === 1 ? '' : 's'}` : ''}.
				</div>
			{:else}
				<div class="grid gap-1.5">
					{#if !validation.ok}
						{#each validation.issues as issue (issue)}
							<li class="flex items-start gap-2 rounded-md bg-danger/10 px-3 py-2 text-[13px] text-danger-strong">
								<AlertCircle class="mt-0.5 size-3.5 shrink-0" />
								<span>{issue}</span>
							</li>
						{/each}
					{/if}
					{#each preflightIssues as issue (issue.code)}
						<div
							class="flex items-start gap-2 rounded-md px-3 py-2 text-[12px] {issue.severity ===
							'error'
								? 'bg-danger/10 text-danger-strong'
								: issue.severity === 'warn'
									? 'bg-warn/10 text-warn-strong'
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
			<div class="mb-2 flex items-center gap-3 rounded-md border border-accent/30 bg-accent-soft/30 px-3 py-2">
				<Button
					onclick={exportZipBundle}
					disabled={!validation.ok || zipBundleBusy}
					loading={zipBundleBusy}
				>
					{#snippet icon()}<Download class="size-4" />{/snippet}
					{zipBundleBusy ? 'Zipping…' : 'Download release ZIP (one file)'}
				</Button>
				<span class="text-[12px] text-fg-muted">
					Single .zip with OTF + WOFF2 + .fea + .font.json + DESIGN.md + test-page.html.
					Best for sharing a release with one click.
				</span>
			</div>
			<div class="mb-3 flex items-center gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2">
				<Button
					variant="secondary"
					onclick={exportAll}
					disabled={!validation.ok || bundleBusy}
					loading={bundleBusy}
				>
					{#snippet icon()}<Download class="size-4" />{/snippet}
					{bundleBusy ? 'Bundling…' : 'Or, 6 separate downloads'}
				</Button>
				<span class="text-[12px] text-fg-muted">
					Same files, downloaded one-by-one (use if your browser blocks zip downloads).
				</span>
			</div>
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
				{#if isVariable}
					<div class="flex items-center gap-3">
						<Button
							variant="primary"
							onclick={exportVf}
							disabled={!validation.ok || vfBusy}
							loading={vfBusy}
						>
							{#snippet icon()}<Download class="size-4" />{/snippet}
							{vfBusy ? 'Compiling VF…' : 'Export variable font (.ttf)'}
						</Button>
						<span class="text-[12px] text-fg-subtle">
							{(project.masters?.length ?? 0) + 1} masters · {project.axes?.map((a) => a.tag).join(' + ')}
						</span>
					</div>
					<div class="flex items-center gap-3">
						<Button
							variant="secondary"
							onclick={exportStaticFamily}
							disabled={!validation.ok || staticFamilyBusy || (project.instances?.length ?? 0) === 0}
							loading={staticFamilyBusy}
						>
							{#snippet icon()}<Download class="size-4" />{/snippet}
							{staticFamilyBusy ? 'Instantiating…' : 'Export static family (.zip)'}
						</Button>
						<span class="text-[12px] text-fg-subtle">
							{#if (project.instances?.length ?? 0) > 0}
								{project.instances?.length} instance{(project.instances?.length ?? 0) === 1 ? '' : 's'} → one
								static TTF each, bundled
							{:else}
								Add named instances on the Designspace tab first
							{/if}
						</span>
					</div>
				{/if}
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
						Brotli-compressed web font (~30% of OTF size).
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
						Industry-standard editable source. Open in Glyphs, RoboFont, FontLab — or
						compile from a terminal with
						<code class="font-mono text-fg">fontmake -u {safeFilename(project.metadata.familyName) || 'Untitled'}.ufo -o otf ttf</code>.
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
					<Button variant="secondary" onclick={exportFeaSource}>
						{#snippet icon()}<FileText class="size-4" />{/snippet}
						Export features (.fea)
					</Button>
					<span class="text-[12px] text-fg-subtle">
						AFDKO-style feature file with current kerning, classes, and OT features —
						edit alongside any tool that speaks <code>.fea</code> (Glyphs, FontLab,
						fontmake).
					</span>
				</div>
				<div class="flex items-center gap-3">
					<Button variant="secondary" onclick={exportDesignMd}>
						{#snippet icon()}<FileText class="size-4" />{/snippet}
						Export DESIGN.md
					</Button>
					<span class="text-[12px] text-fg-subtle">
						Foundry-style markdown summarizing the brief, features, axes, and changelog
						— ready to commit alongside your sources.
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
				<div class="flex items-center gap-3">
					<Button variant="secondary" onclick={exportTestPage} loading={testPageBusy}>
						{#snippet icon()}<FileText class="size-4" />{/snippet}
						{testPageBusy ? 'Building…' : 'Export HTML test page'}
					</Button>
					<span class="text-[12px] text-fg-subtle">
						Single self-contained <code>.html</code> with the font embedded as a data URL — share or drop on a server.
					</span>
				</div>
			</div>
		</Panel>

		<Panel>
			<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				Trial / restricted subset
			</h2>
			<p class="mb-3 text-[12px] text-fg-subtle">
				Build a marketing trial: only the characters you list are kept, the family name
				gets a "Trial" suffix, and kerning pairs that reference dropped glyphs are
				removed. Useful for previewing without giving away the full set.
			</p>
			<div class="flex flex-col gap-2 sm:flex-row sm:items-end">
				<div class="flex-1">
					<label
						for="trial-chars"
						class="mb-1 block text-[11px] font-medium text-fg-muted"
					>
						Characters to include
					</label>
					<input
						id="trial-chars"
						bind:value={trialChars}
						placeholder="e.g., HELO WORLD"
						class="w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
					/>
				</div>
				<div class="flex flex-col gap-1.5">
					<Button variant="secondary" onclick={exportTrialOtf} loading={trialBusy}>
						{#snippet icon()}<Download class="size-4" />{/snippet}
						{trialBusy ? 'Building…' : 'Export trial OTF'}
					</Button>
					<Button
						variant="secondary"
						onclick={exportTrialWoff2}
						loading={trialWoff2Busy}
					>
						{#snippet icon()}<Globe class="size-4" />{/snippet}
						{trialWoff2Busy ? 'Building…' : 'Export trial WOFF2'}
					</Button>
				</div>
			</div>
			<p class="mt-2 text-[11px] text-fg-subtle">
				Each character in the field maps to a glyph. Spaces, line breaks, and
				duplicates are ignored. Family becomes <code>{project.metadata.familyName} Trial</code>.
				WOFF2 is the web baseline — share it for online evaluation.
			</p>
		</Panel>

		<Panel>
			<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				What format should I ship?
			</h2>
			<p class="mb-3 text-[12px] text-fg-subtle">
				Pick by deployment context, not fashion. Most projects ship two or three of these.
			</p>
			<dl class="grid gap-2.5 text-[12px]">
				<div class="grid grid-cols-[100px_1fr] gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2">
					<dt class="font-mono text-fg">Static OTF</dt>
					<dd class="text-fg-muted">
						Print, desktop publishing, broad desktop delivery. Strong traditional support;
						CFF outlines.
					</dd>
				</div>
				<div class="grid grid-cols-[100px_1fr] gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2">
					<dt class="font-mono text-fg">Static TTF</dt>
					<dd class="text-fg-muted">
						UI, desktop, TrueType-oriented rendering workflows. Best fit when the user
						may add manual hinting later.
					</dd>
				</div>
				<div class="grid grid-cols-[100px_1fr] gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2">
					<dt class="font-mono text-fg">WOFF2</dt>
					<dd class="text-fg-muted">
						Web delivery. Best compression, broad browser support — the W3C web standard
						in 2026. Default for any site / app.
					</dd>
				</div>
				{#if (project.axes?.length ?? 0) > 0}
					<div class="grid grid-cols-[100px_1fr] gap-3 rounded-md border border-accent/30 bg-accent-soft/30 px-3 py-2">
						<dt class="font-mono text-accent">Variable TTF</dt>
						<dd class="text-fg-muted">
							Many styles in one file — responsive families, UI systems with weight/width
							sliders. Pair with WOFF2 for web. Compatible with this project's
							{(project.axes ?? []).map((a) => a.tag).join(' / ')} axes.
						</dd>
					</div>
				{/if}
				<div class="grid grid-cols-[100px_1fr] gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2">
					<dt class="font-mono text-fg">UFO 3</dt>
					<dd class="text-fg-muted">
						Editable source — round-trip with Glyphs / RoboFont / FontLab. Always keep this
						archive even if you only ship binaries.
					</dd>
				</div>
				<div class="grid grid-cols-[100px_1fr] gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2">
					<dt class="font-mono text-fg">.font.json</dt>
					<dd class="text-fg-muted">
						This app's native source — sketches, notes, references, snapshots all in one
						file. Versionable.
					</dd>
				</div>
			</dl>
			<p class="mt-3 text-[11px] text-fg-subtle">
				Heuristic: web-only product → WOFF2 + (optional) Variable TTF. Editorial / print →
				OTF + TTF. Open-source release → all four binaries + UFO + license + specimen.
			</p>
		</Panel>

		<Panel>
			<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">
				CSS snippet
			</h2>
			<p class="mb-3 text-[12px] text-fg-subtle">
				Copy-paste ready CSS for self-hosting the WOFF2 export. Drop the
				downloaded font into a <code>fonts/</code> folder and you're done.
			</p>
			<pre class="overflow-x-auto rounded-lg border border-border bg-surface-2/40 p-3 text-[12px] leading-relaxed text-fg"><code>{cssSnippet}</code></pre>
			<button
				type="button"
				onclick={copyCss}
				class="mt-2 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-[12px] font-medium text-fg-muted hover:border-accent hover:text-accent"
			>
				{cssCopied ? 'Copied ✓' : 'Copy to clipboard'}
			</button>
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
