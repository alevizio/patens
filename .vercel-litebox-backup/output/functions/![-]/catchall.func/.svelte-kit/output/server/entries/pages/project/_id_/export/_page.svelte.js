import { G as escape_html, U as attr, c as ensure_array_like, d as spread_props, f as stringify, n as attr_class, o as derived } from "../../../../../chunks/dev.js";
import { t as toast } from "../../../../../chunks/toast2.svelte.js";
import { t as Icon } from "../../../../../chunks/Icon.js";
import { n as Circle_check, t as Circle_alert } from "../../../../../chunks/circle-alert.js";
import { b as FS_TYPE_OPTIONS, w as resolveVerticalMetrics } from "../../../../../chunks/project.js";
import { t as projectStore } from "../../../../../chunks/project.svelte.js";
import { t as buildFont } from "../../../../../chunks/export.js";
import { n as Input, t as Field } from "../../../../../chunks/Field.js";
import { t as Download } from "../../../../../chunks/download.js";
import { t as Sparkles } from "../../../../../chunks/sparkles.js";
import { t as File_text } from "../../../../../chunks/file-text.js";
import { i as preflightProject } from "../../../../../chunks/audit.js";
import { n as Loader_circle, t as Button } from "../../../../../chunks/Button.js";
import { t as Panel } from "../../../../../chunks/Panel.js";
import { a as getPythonProgress, c as projectToUfoZip, i as finalizeFont, o as instancesAsStaticZip, r as ensurePython, s as otfToWoff2, t as buildVariableFont } from "../../../../../chunks/python2.js";
import { t as generateDesignMd } from "../../../../../chunks/design-md.js";
import { t as LoadingPanel } from "../../../../../chunks/LoadingPanel.js";
import { t as autoFeaSource } from "../../../../../chunks/fea.js";
import { t as Globe } from "../../../../../chunks/globe.js";
import { strToU8, zipSync } from "fflate";
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/file-braces.svelte
function File_braces($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "file-braces" },
		props,
		{ iconNode: [
			["path", { "d": "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" }],
			["path", { "d": "M14 2v5a1 1 0 0 0 1 1h5" }],
			["path", { "d": "M10 12a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1 1 1 0 0 1 1 1v1a1 1 0 0 0 1 1" }],
			["path", { "d": "M14 18a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1 1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1" }]
		] }
	]));
}
//#endregion
//#region src/routes/project/[id]/export/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const project = derived(() => projectStore.project);
		const preflightIssues = derived(() => project() ? preflightProject(project()) : []);
		let pythonProgress = getPythonProgress();
		let woff2Busy = false;
		let ufoBusy = false;
		let vfBusy = false;
		let staticFamilyBusy = false;
		const isVariable = derived(() => project() ? (project().axes?.length ?? 0) > 0 && (project().masters?.length ?? 0) > 0 : false);
		const validation = derived(() => {
			if (!project()) return {
				ok: false,
				issues: ["No project loaded"]
			};
			const issues = [];
			if (!project().metadata.familyName.trim()) issues.push("Family name is empty");
			if (!project().metadata.version.trim()) issues.push("Version is empty");
			const drawn = Object.values(project().glyphs).filter((g) => g.contours.length > 0);
			const composedFromDrawn = Object.values(project().glyphs).filter((g) => g.contours.length === 0 && g.components && g.components.length > 0).filter((g) => g.components.some((c) => (project().glyphs[c.baseCodepoint]?.contours.length ?? 0) > 0));
			if (drawn.length === 0) issues.push("No glyphs drawn yet");
			return {
				ok: issues.length === 0,
				issues,
				drawnCount: drawn.length,
				compositeCount: composedFromDrawn.length
			};
		});
		const downloadBlob = (blob, filename) => {
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			a.remove();
			setTimeout(() => URL.revokeObjectURL(url), 1e3);
		};
		const safeFilename = (s) => s.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
		const cssSnippet = derived(() => {
			if (!project()) return "";
			const family = project().metadata.familyName || project().name;
			const fileBase = `${safeFilename(family) || "Untitled"}-${safeFilename(project().metadata.styleName)}`;
			const id = safeFilename(family).toLowerCase() || "custom";
			const m = project().metrics;
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
		const buildOtfBuffer = async () => {
			if (!project()) throw new Error("No project");
			const { font } = buildFont(project());
			let buffer = font.toArrayBuffer();
			const fea = project().features.feaSource ?? autoFeaSource(project());
			const vm = resolveVerticalMetrics(project().metrics);
			if (fea && fea.trim().length > 0 || true) try {
				await ensurePython();
				buffer = await finalizeFont(buffer, {
					feaSource: fea && fea.trim().length > 0 ? fea : void 0,
					verticalMetrics: vm
				});
			} catch (err) {
				console.warn("Finalize step failed, exporting without:", err);
			}
			return buffer;
		};
		const exportOtf = async () => {
			if (!project()) return;
			const buffer = await buildOtfBuffer();
			downloadBlob(new Blob([buffer], { type: "font/otf" }), `${safeFilename(project().metadata.familyName) || "Untitled"}-${safeFilename(project().metadata.styleName)}.otf`);
		};
		let trialChars = "HELO WORLD";
		let trialBusy = false;
		const exportTrialOtf = async () => {
			if (!project() || trialBusy) return;
			trialBusy = true;
			try {
				const allowed = /* @__PURE__ */ new Set();
				for (const ch of trialChars) {
					const cp = ch.codePointAt(0);
					if (cp && project().glyphs[cp]) allowed.add(cp);
				}
				if (allowed.size === 0) {
					toast.warn("No characters in the trial subset match drawn glyphs.");
					return;
				}
				const subsetGlyphs = {};
				for (const cp of allowed) subsetGlyphs[cp] = project().glyphs[cp];
				const { font } = buildFont({
					...project(),
					glyphs: subsetGlyphs,
					kerning: project().kerning.filter((p) => (typeof p.left !== "number" || allowed.has(p.left)) && (typeof p.right !== "number" || allowed.has(p.right))),
					metadata: {
						...project().metadata,
						familyName: `${project().metadata.familyName} Trial`
					}
				});
				const buffer = font.toArrayBuffer();
				downloadBlob(new Blob([buffer], { type: "font/otf" }), `${safeFilename(project().metadata.familyName) || "Untitled"}-Trial-${allowed.size}gl.otf`);
				toast.success(`Trial OTF exported (${allowed.size} glyphs).`);
			} catch (err) {
				toast.error("Trial export failed: " + (err instanceof Error ? err.message : String(err)));
			} finally {
				trialBusy = false;
			}
		};
		let trialWoff2Busy = false;
		const exportTrialWoff2 = async () => {
			if (!project() || trialWoff2Busy) return;
			trialWoff2Busy = true;
			try {
				const allowed = /* @__PURE__ */ new Set();
				for (const ch of trialChars) {
					const cp = ch.codePointAt(0);
					if (cp && project().glyphs[cp]) allowed.add(cp);
				}
				if (allowed.size === 0) {
					toast.warn("No characters in the trial subset match drawn glyphs.");
					return;
				}
				const subsetGlyphs = {};
				for (const cp of allowed) subsetGlyphs[cp] = project().glyphs[cp];
				const { font } = buildFont({
					...project(),
					glyphs: subsetGlyphs,
					kerning: project().kerning.filter((p) => (typeof p.left !== "number" || allowed.has(p.left)) && (typeof p.right !== "number" || allowed.has(p.right))),
					metadata: {
						...project().metadata,
						familyName: `${project().metadata.familyName} Trial`
					}
				});
				const woff2 = await otfToWoff2(font.toArrayBuffer());
				downloadBlob(new Blob([woff2], { type: "font/woff2" }), `${safeFilename(project().metadata.familyName) || "Untitled"}-Trial-${allowed.size}gl.woff2`);
				toast.success(`Trial WOFF2 exported (${allowed.size} glyphs, ${(woff2.byteLength / 1024).toFixed(1)} KB).`);
			} catch (err) {
				toast.error("Trial WOFF2 export failed: " + (err instanceof Error ? err.message : String(err)));
			} finally {
				trialWoff2Busy = false;
			}
		};
		const exportWoff2 = async () => {
			if (!project()) return;
			woff2Busy = true;
			try {
				const woff2 = await otfToWoff2(await buildOtfBuffer());
				downloadBlob(new Blob([woff2], { type: "font/woff2" }), `${safeFilename(project().metadata.familyName) || "Untitled"}-${safeFilename(project().metadata.styleName)}.woff2`);
			} catch (err) {
				alert("WOFF2 export failed: " + (err instanceof Error ? err.message : String(err)));
			} finally {
				woff2Busy = false;
			}
		};
		let bundleBusy = false;
		/**
		* Export the full release bundle in one go: OTF + WOFF2 + HTML test page +
		* .font.json. Sequential downloads — most browsers allow multiple downloads
		* after the user explicitly clicks the bundle button.
		*/
		const exportAll = async () => {
			if (!project() || bundleBusy) return;
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
				toast.success("Release bundle: 6 files downloaded.");
			} catch (err) {
				toast.error("Bundle export failed: " + (err instanceof Error ? err.message : String(err)));
			} finally {
				bundleBusy = false;
			}
		};
		const exportVf = async () => {
			if (!project() || !isVariable()) return;
			vfBusy = true;
			try {
				await ensurePython();
				const allMasters = [];
				const defaultLocation = {};
				for (const a of project().axes ?? []) defaultLocation[a.tag] = a.default;
				const defaultBuild = buildFont(project());
				allMasters.push({
					name: "Default",
					buffer: defaultBuild.font.toArrayBuffer(),
					location: defaultLocation
				});
				for (const m of project().masters ?? []) {
					const b = buildFont(project(), { masterId: m.id });
					allMasters.push({
						name: m.name,
						buffer: b.font.toArrayBuffer(),
						location: m.location
					});
				}
				const vfBuffer = await buildVariableFont({
					axes: (project().axes ?? []).map((a) => ({
						tag: a.tag,
						name: a.name,
						minimum: a.minimum,
						default: a.default,
						maximum: a.maximum
					})),
					masters: allMasters,
					defaultMasterName: "Default",
					instances: (project().instances ?? []).map((i) => ({
						familyName: i.familyName ?? project().metadata.familyName,
						styleName: i.styleName,
						location: i.location,
						postScriptName: i.postScriptName
					}))
				});
				downloadBlob(new Blob([vfBuffer], { type: "font/ttf" }), `${safeFilename(project().metadata.familyName) || "Untitled"}-VF.ttf`);
			} catch (err) {
				alert("Variable font build failed: " + (err instanceof Error ? err.message : String(err)));
			} finally {
				vfBusy = false;
			}
		};
		const exportStaticFamily = async () => {
			if (!project() || !isVariable()) return;
			if ((project().instances ?? []).length === 0) {
				alert("Add named instances on the Designspace tab first.");
				return;
			}
			staticFamilyBusy = true;
			try {
				await ensurePython();
				const defaultLocation = {};
				for (const a of project().axes ?? []) defaultLocation[a.tag] = a.default;
				const allMasters = [{
					name: "Default",
					buffer: buildFont(project()).font.toArrayBuffer(),
					location: defaultLocation
				}, ...(project().masters ?? []).map((m) => ({
					name: m.name,
					buffer: buildFont(project(), { masterId: m.id }).font.toArrayBuffer(),
					location: m.location
				}))];
				const zip = await instancesAsStaticZip({
					axes: (project().axes ?? []).map((a) => ({
						tag: a.tag,
						name: a.name,
						minimum: a.minimum,
						default: a.default,
						maximum: a.maximum
					})),
					masters: allMasters,
					defaultMasterName: "Default",
					familyName: project().metadata.familyName,
					instances: (project().instances ?? []).map((i) => ({
						familyName: i.familyName ?? project().metadata.familyName,
						styleName: i.styleName,
						location: i.location,
						postScriptName: i.postScriptName
					}))
				});
				downloadBlob(new Blob([zip], { type: "application/zip" }), `${safeFilename(project().metadata.familyName) || "Untitled"}-static-family.zip`);
			} catch (err) {
				alert("Static family export failed: " + (err instanceof Error ? err.message : String(err)));
			} finally {
				staticFamilyBusy = false;
			}
		};
		const exportUfo = async () => {
			if (!project()) return;
			ufoBusy = true;
			try {
				await ensurePython();
				const zip = await projectToUfoZip(JSON.stringify(project()), project().metadata.familyName);
				downloadBlob(new Blob([zip], { type: "application/zip" }), `${safeFilename(project().metadata.familyName) || "Untitled"}.ufo.zip`);
			} catch (err) {
				alert("UFO export failed: " + (err instanceof Error ? err.message : String(err)));
			} finally {
				ufoBusy = false;
			}
		};
		const exportProjectJson = () => {
			if (!project()) return;
			const json = JSON.stringify(project(), null, 2);
			downloadBlob(new Blob([json], { type: "application/json" }), `${safeFilename(project().name)}.font.json`);
		};
		const exportFeaSource = () => {
			if (!project()) return;
			const text = project().features.feaSource?.trim() || autoFeaSource(project());
			downloadBlob(new Blob([text], { type: "text/plain" }), `${safeFilename(project().name)}.fea`);
		};
		const exportDesignMd = () => {
			if (!project()) return;
			const md = generateDesignMd(project());
			downloadBlob(new Blob([md], { type: "text/markdown" }), `DESIGN-${safeFilename(project().name)}.md`);
		};
		let zipBundleBusy = false;
		const exportZipBundle = async () => {
			if (!project() || zipBundleBusy) return;
			zipBundleBusy = true;
			try {
				const familyId = safeFilename(project().metadata.familyName) || "Untitled";
				const styleId = safeFilename(project().metadata.styleName) || "Regular";
				const otfBuffer = await buildOtfBuffer();
				const otfBytes = new Uint8Array(otfBuffer);
				const woff2 = await otfToWoff2(otfBuffer);
				const woff2Bytes = woff2 instanceof Uint8Array ? woff2 : new Uint8Array(woff2);
				const projectJson = JSON.stringify(project(), null, 2);
				const fea = project().features.feaSource?.trim() || autoFeaSource(project());
				const designMd = generateDesignMd(project());
				const testHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<title>${familyId} ${styleId} — Test page</title>
<style>
@font-face { font-family: '${familyId}'; src: url(data:font/otf;base64,${bufferToBase64(otfBuffer)}) format('opentype'); }
body { font-family: '${familyId}', system-ui, sans-serif; max-width: 60ch; margin: 4em auto; padding: 0 1em; line-height: 1.5; color: #111; background: #fafafa; }
h1 { font-size: 4em; line-height: 1; margin: 0 0 0.5em; }
.size { font-size: 1em; opacity: 0.5; font-family: ui-monospace, monospace; }
.row { margin: 0.5em 0; }
.row span:first-child { display: inline-block; width: 4ch; color: #888; font-family: ui-monospace, monospace; }
</style></head><body>
<h1>${project().metadata.familyName}</h1>
<p class="size">${project().metadata.styleName} · v${project().metadata.version} · ${project().metadata.designer || "—"}</p>
${[
					12,
					18,
					24,
					36,
					48,
					72
				].map((s) => `<div class="row"><span>${s}px</span><span style="font-size:${s}px">The quick brown fox jumps over the lazy dog</span></div>`).join("\n")}
<p style="margin-top: 3em; font-size: 12px; color: #888;">Generated by Font Studio · ${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}</p>
</body></html>`;
				const zipped = zipSync({
					[`${familyId}-${styleId}.otf`]: otfBytes,
					[`${familyId}-${styleId}.woff2`]: woff2Bytes,
					[`${familyId}.features.fea`]: strToU8(fea),
					[`${familyId}.font.json`]: strToU8(projectJson),
					["DESIGN.md"]: strToU8(designMd),
					["test-page.html"]: strToU8(testHtml)
				}, { level: 6 });
				downloadBlob(new Blob([zipped], { type: "application/zip" }), `${familyId}-${styleId}-release.zip`);
				toast.success(`Release zip: 6 files in ${(zipped.byteLength / 1024).toFixed(1)} KB`);
			} catch (err) {
				toast.error("Zip bundle failed: " + (err instanceof Error ? err.message : String(err)));
			} finally {
				zipBundleBusy = false;
			}
		};
		const exportSvgArchive = () => {
			if (!project()) return;
			const lines = [
				"<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
				"<svg xmlns=\"http://www.w3.org/2000/svg\">",
				"  <defs>"
			];
			for (const g of Object.values(project().glyphs)) {
				if (g.contours.length === 0) continue;
				const id = `g${g.codepoint.toString(16).padStart(4, "0")}`;
				lines.push(`    <g id="${id}" data-name="${g.name}">`);
				const dParts = [];
				for (const c of g.contours) for (const cmd of c.commands) if (cmd.type === "M") dParts.push(`M ${cmd.x} ${cmd.y}`);
				else if (cmd.type === "L") dParts.push(`L ${cmd.x} ${cmd.y}`);
				else if (cmd.type === "Q") dParts.push(`Q ${cmd.x1} ${cmd.y1} ${cmd.x} ${cmd.y}`);
				else if (cmd.type === "C") dParts.push(`C ${cmd.x1} ${cmd.y1} ${cmd.x2} ${cmd.y2} ${cmd.x} ${cmd.y}`);
				else if (cmd.type === "Z") dParts.push("Z");
				lines.push(`      <path d="${dParts.join(" ")}" />`);
				lines.push(`    </g>`);
			}
			lines.push("  </defs>");
			lines.push("</svg>");
			downloadBlob(new Blob([lines.join("\n")], { type: "image/svg+xml" }), `${safeFilename(project().name)}.glyphs.svg`);
		};
		let testPageBusy = false;
		const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
		const bufferToBase64 = (buf) => {
			const bytes = new Uint8Array(buf);
			let bin = "";
			const chunk = 32768;
			for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
			return btoa(bin);
		};
		const exportTestPage = async () => {
			if (!project()) return;
			testPageBusy = true;
			try {
				const base64 = bufferToBase64(await buildOtfBuffer());
				const family = project().metadata.familyName || project().name;
				const familyId = safeFilename(family) || "TestFont";
				const designer = escapeHtml(project().metadata.designer || "—");
				const drawn = Object.values(project().glyphs).filter((g) => g.contours.length > 0);
				const charset = drawn.map((g) => String.fromCodePoint(g.codepoint)).filter((s) => s.length === 1 && s.codePointAt(0) > 32).join("");
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
	<p>${escapeHtml(project().metadata.styleName)} · v${escapeHtml(project().metadata.version)} · ${drawn.length} glyphs · Designed by ${designer}</p>
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
				downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), `${safeFilename(family)}-test.html`);
			} catch (err) {
				alert("Test page export failed: " + (err instanceof Error ? err.message : String(err)));
			} finally {
				testPageBusy = false;
			}
		};
		if (!project()) {
			$$renderer.push("<!--[0-->");
			LoadingPanel($$renderer, { label: "Loading export" });
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div class="h-full overflow-auto"><div class="mx-auto flex max-w-3xl flex-col gap-6 p-6"><header><h1 class="text-xl font-semibold tracking-tight">Export</h1> <p class="text-sm text-fg-muted">Download an OTF for design apps, a JSON file to back up the project, or an SVG archive
				of all glyphs.</p></header> `);
			Panel($$renderer, {
				children: ($$renderer) => {
					const currentFsType = project().metadata.fsType ?? 0;
					$$renderer.push(`<h2 class="mb-4 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Metadata</h2> <div class="grid grid-cols-2 gap-3">`);
					Field($$renderer, {
						label: "Family name",
						required: true,
						children: ($$renderer) => {
							Input($$renderer, {
								value: project().metadata.familyName,
								onchange: (e) => projectStore.updateMetadata({ familyName: e.currentTarget.value })
							});
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----> `);
					Field($$renderer, {
						label: "Style name",
						children: ($$renderer) => {
							Input($$renderer, {
								value: project().metadata.styleName,
								onchange: (e) => projectStore.updateMetadata({ styleName: e.currentTarget.value })
							});
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----> `);
					Field($$renderer, {
						label: "Designer",
						children: ($$renderer) => {
							Input($$renderer, {
								value: project().metadata.designer,
								onchange: (e) => projectStore.updateMetadata({ designer: e.currentTarget.value })
							});
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----> `);
					Field($$renderer, {
						label: "Version",
						children: ($$renderer) => {
							Input($$renderer, {
								value: project().metadata.version,
								onchange: (e) => projectStore.updateMetadata({ version: e.currentTarget.value })
							});
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----> `);
					Field($$renderer, {
						label: "Copyright",
						children: ($$renderer) => {
							Input($$renderer, {
								value: project().metadata.copyright,
								onchange: (e) => projectStore.updateMetadata({ copyright: e.currentTarget.value })
							});
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----> `);
					Field($$renderer, {
						label: "License",
						hint: "Use a preset or write your own",
						children: ($$renderer) => {
							Input($$renderer, {
								value: project().metadata.license,
								onchange: (e) => projectStore.updateMetadata({ license: e.currentTarget.value })
							});
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----></div> <div class="mt-3 flex flex-wrap items-center gap-2"><span class="text-[11px] font-medium text-fg-muted">License preset:</span> <button type="button" class="rounded-md border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium hover:border-accent hover:text-accent">SIL OFL 1.1</button> <button type="button" class="rounded-md border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium hover:border-accent hover:text-accent">Proprietary</button> <button type="button" class="rounded-md border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium hover:border-accent hover:text-accent">Personal use only</button></div> <div class="mt-4 grid gap-2 border-t border-border pt-3"><div class="flex items-baseline justify-between gap-2"><span class="text-[12px] font-medium text-fg-muted">OS/2 <span class="font-mono">fsType</span> (embedding permissions)</span> <a href="https://learn.microsoft.com/en-us/typography/opentype/spec/os2#fstype" target="_blank" rel="noopener" class="text-[10px] text-fg-subtle hover:text-accent">spec ↗</a></div> `);
					$$renderer.select({
						value: currentFsType,
						onchange: (e) => projectStore.updateMetadata({ fsType: Number(e.currentTarget.value) }),
						class: "rounded-md border border-border bg-surface px-2.5 py-1.5 text-[12px] text-fg outline-none focus:border-accent"
					}, ($$renderer) => {
						$$renderer.push(`<!--[-->`);
						const each_array = ensure_array_like(FS_TYPE_OPTIONS);
						for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
							let opt = each_array[$$index];
							$$renderer.option({ value: opt.value }, ($$renderer) => {
								$$renderer.push(`${escape_html(opt.label)}`);
							});
						}
						$$renderer.push(`<!--]-->`);
					});
					$$renderer.push(` <p class="text-[11px] text-fg-subtle">${escape_html(FS_TYPE_OPTIONS.find((o) => o.value === currentFsType)?.hint)}</p></div>`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			Panel($$renderer, {
				children: ($$renderer) => {
					const vm = resolveVerticalMetrics(project().metrics);
					$$renderer.push(`<h2 class="mb-4 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Vertical metrics</h2> <p class="mb-3 text-[12px] text-fg-subtle">Cross-platform line spacing depends on OS/2 typo + win + hhea triple matching.
				Leave these defaulted unless you know you need to override.</p> <div class="grid grid-cols-4 gap-2">`);
					Field($$renderer, {
						label: "OS/2 typo asc",
						children: ($$renderer) => {
							Input($$renderer, {
								type: "number",
								density: "sm",
								value: project().metrics.typoAscender ?? vm.typoAscender,
								onchange: (e) => projectStore.updateMetrics({ typoAscender: Number(e.currentTarget.value) })
							});
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----> `);
					Field($$renderer, {
						label: "OS/2 typo desc",
						children: ($$renderer) => {
							Input($$renderer, {
								type: "number",
								density: "sm",
								value: project().metrics.typoDescender ?? vm.typoDescender,
								onchange: (e) => projectStore.updateMetrics({ typoDescender: Number(e.currentTarget.value) })
							});
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----> `);
					Field($$renderer, {
						label: "OS/2 line gap",
						children: ($$renderer) => {
							Input($$renderer, {
								type: "number",
								density: "sm",
								value: project().metrics.typoLineGap ?? vm.typoLineGap,
								onchange: (e) => projectStore.updateMetrics({ typoLineGap: Number(e.currentTarget.value) })
							});
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----> `);
					Field($$renderer, {
						label: "hhea asc",
						children: ($$renderer) => {
							Input($$renderer, {
								type: "number",
								density: "sm",
								value: project().metrics.hheaAscender ?? vm.hheaAscender,
								onchange: (e) => projectStore.updateMetrics({ hheaAscender: Number(e.currentTarget.value) })
							});
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----> `);
					Field($$renderer, {
						label: "hhea desc",
						children: ($$renderer) => {
							Input($$renderer, {
								type: "number",
								density: "sm",
								value: project().metrics.hheaDescender ?? vm.hheaDescender,
								onchange: (e) => projectStore.updateMetrics({ hheaDescender: Number(e.currentTarget.value) })
							});
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----> `);
					Field($$renderer, {
						label: "hhea line gap",
						children: ($$renderer) => {
							Input($$renderer, {
								type: "number",
								density: "sm",
								value: project().metrics.hheaLineGap ?? vm.hheaLineGap,
								onchange: (e) => projectStore.updateMetrics({ hheaLineGap: Number(e.currentTarget.value) })
							});
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----> `);
					Field($$renderer, {
						label: "win ascent",
						children: ($$renderer) => {
							Input($$renderer, {
								type: "number",
								density: "sm",
								value: project().metrics.winAscent ?? vm.winAscent,
								onchange: (e) => projectStore.updateMetrics({ winAscent: Number(e.currentTarget.value) })
							});
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----> `);
					Field($$renderer, {
						label: "win descent",
						children: ($$renderer) => {
							Input($$renderer, {
								type: "number",
								density: "sm",
								value: project().metrics.winDescent ?? vm.winDescent,
								onchange: (e) => projectStore.updateMetrics({ winDescent: Number(e.currentTarget.value) })
							});
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----></div> <label class="mt-3 flex items-center gap-2 rounded-md bg-surface-2 px-3 py-2"><input type="checkbox"${attr("checked", vm.useTypoMetrics, true)} class="size-4 accent-fg"/> <span class="text-[12px] font-medium text-fg">USE_TYPO_METRICS (recommended on)</span></label>`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			Panel($$renderer, {
				children: ($$renderer) => {
					$$renderer.push(`<h2 class="mb-4 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Pre-flight check</h2> `);
					if (validation().ok && preflightIssues().length === 0) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<div class="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">`);
						Sparkles($$renderer, { class: "size-4" });
						$$renderer.push(`<!----> All checks pass — ${escape_html(validation().drawnCount)} glyph${escape_html(validation().drawnCount === 1 ? "" : "s")}${escape_html(validation().compositeCount ? ` + ${validation().compositeCount} composite${validation().compositeCount === 1 ? "" : "s"}` : "")}.</div>`);
					} else {
						$$renderer.push("<!--[-1-->");
						$$renderer.push(`<div class="grid gap-1.5">`);
						if (!validation().ok) {
							$$renderer.push("<!--[0-->");
							$$renderer.push(`<!--[-->`);
							const each_array_1 = ensure_array_like(validation().issues);
							for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
								let issue = each_array_1[$$index_1];
								$$renderer.push(`<li class="flex items-start gap-2 rounded-md bg-danger/10 px-3 py-2 text-[13px] text-danger">`);
								Circle_alert($$renderer, { class: "mt-0.5 size-3.5 shrink-0" });
								$$renderer.push(`<!----> <span>${escape_html(issue)}</span></li>`);
							}
							$$renderer.push(`<!--]-->`);
						} else $$renderer.push("<!--[-1-->");
						$$renderer.push(`<!--]--> <!--[-->`);
						const each_array_2 = ensure_array_like(preflightIssues());
						for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
							let issue = each_array_2[$$index_2];
							$$renderer.push(`<div${attr_class(`flex items-start gap-2 rounded-md px-3 py-2 text-[12px] ${stringify(issue.severity === "error" ? "bg-danger/10 text-danger" : issue.severity === "warn" ? "bg-warn/10 text-warn" : "bg-surface-2 text-fg-muted")}`)}>`);
							if (issue.severity === "info") {
								$$renderer.push("<!--[0-->");
								Circle_check($$renderer, { class: "mt-0.5 size-3.5 shrink-0" });
							} else {
								$$renderer.push("<!--[-1-->");
								Circle_alert($$renderer, { class: "mt-0.5 size-3.5 shrink-0" });
							}
							$$renderer.push(`<!--]--> <span>${escape_html(issue.message)}</span></div>`);
						}
						$$renderer.push(`<!--]--></div>`);
					}
					$$renderer.push(`<!--]-->`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			Panel($$renderer, {
				children: ($$renderer) => {
					$$renderer.push(`<h2 class="mb-4 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Download</h2> <div class="mb-2 flex items-center gap-3 rounded-md border border-accent/30 bg-accent-soft/30 px-3 py-2">`);
					{
						function icon($$renderer) {
							Download($$renderer, { class: "size-4" });
						}
						Button($$renderer, {
							onclick: exportZipBundle,
							disabled: !validation().ok || zipBundleBusy,
							loading: zipBundleBusy,
							icon,
							children: ($$renderer) => {
								$$renderer.push(`<!---->${escape_html(zipBundleBusy ? "Zipping…" : "Download release ZIP (one file)")}`);
							},
							$$slots: {
								icon: true,
								default: true
							}
						});
					}
					$$renderer.push(`<!----> <span class="text-[12px] text-fg-muted">Single .zip with OTF + WOFF2 + .fea + .font.json + DESIGN.md + test-page.html.
					Best for sharing a release with one click.</span></div> <div class="mb-3 flex items-center gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2">`);
					{
						function icon($$renderer) {
							Download($$renderer, { class: "size-4" });
						}
						Button($$renderer, {
							variant: "secondary",
							onclick: exportAll,
							disabled: !validation().ok || bundleBusy,
							loading: bundleBusy,
							icon,
							children: ($$renderer) => {
								$$renderer.push(`<!---->${escape_html(bundleBusy ? "Bundling…" : "Or, 6 separate downloads")}`);
							},
							$$slots: {
								icon: true,
								default: true
							}
						});
					}
					$$renderer.push(`<!----> <span class="text-[12px] text-fg-muted">Same files, downloaded one-by-one (use if your browser blocks zip downloads).</span></div> <div class="grid gap-2"><div class="flex items-center gap-3">`);
					{
						function icon($$renderer) {
							Download($$renderer, { class: "size-4" });
						}
						Button($$renderer, {
							onclick: exportOtf,
							disabled: !validation().ok,
							icon,
							children: ($$renderer) => {
								$$renderer.push(`<!---->Export OTF`);
							},
							$$slots: {
								icon: true,
								default: true
							}
						});
					}
					$$renderer.push(`<!----> <span class="text-[12px] text-fg-subtle">Standard OpenType file for design apps and Font Book.</span></div> `);
					if (isVariable()) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<div class="flex items-center gap-3">`);
						{
							function icon($$renderer) {
								Download($$renderer, { class: "size-4" });
							}
							Button($$renderer, {
								variant: "primary",
								onclick: exportVf,
								disabled: !validation().ok || vfBusy,
								loading: vfBusy,
								icon,
								children: ($$renderer) => {
									$$renderer.push(`<!---->${escape_html(vfBusy ? "Compiling VF…" : "Export variable font (.ttf)")}`);
								},
								$$slots: {
									icon: true,
									default: true
								}
							});
						}
						$$renderer.push(`<!----> <span class="text-[12px] text-fg-subtle">${escape_html((project().masters?.length ?? 0) + 1)} masters · ${escape_html(project().axes?.map((a) => a.tag).join(" + "))}</span></div> <div class="flex items-center gap-3">`);
						{
							function icon($$renderer) {
								Download($$renderer, { class: "size-4" });
							}
							Button($$renderer, {
								variant: "secondary",
								onclick: exportStaticFamily,
								disabled: !validation().ok || staticFamilyBusy || (project().instances?.length ?? 0) === 0,
								loading: staticFamilyBusy,
								icon,
								children: ($$renderer) => {
									$$renderer.push(`<!---->${escape_html(staticFamilyBusy ? "Instantiating…" : "Export static family (.zip)")}`);
								},
								$$slots: {
									icon: true,
									default: true
								}
							});
						}
						$$renderer.push(`<!----> <span class="text-[12px] text-fg-subtle">`);
						if ((project().instances?.length ?? 0) > 0) {
							$$renderer.push("<!--[0-->");
							$$renderer.push(`${escape_html(project().instances?.length)} instance${escape_html((project().instances?.length ?? 0) === 1 ? "" : "s")} → one
								static TTF each, bundled`);
						} else {
							$$renderer.push("<!--[-1-->");
							$$renderer.push(`Add named instances on the Designspace tab first`);
						}
						$$renderer.push(`<!--]--></span></div>`);
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]--> <div class="flex items-center gap-3">`);
					{
						function icon($$renderer) {
							Globe($$renderer, { class: "size-4" });
						}
						Button($$renderer, {
							variant: "secondary",
							onclick: exportWoff2,
							disabled: !validation().ok || woff2Busy,
							loading: woff2Busy,
							icon,
							children: ($$renderer) => {
								$$renderer.push(`<!---->${escape_html(woff2Busy ? "Compressing…" : "Export WOFF2")}`);
							},
							$$slots: {
								icon: true,
								default: true
							}
						});
					}
					$$renderer.push(`<!----> <span class="text-[12px] text-fg-subtle">`);
					if (pythonProgress.stage === "ready") {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`Brotli-compressed web font (~30% of OTF size).`);
					} else if (pythonProgress.stage === "idle") {
						$$renderer.push("<!--[1-->");
						$$renderer.push(`Brotli-compressed web font. First click downloads Python (~10MB, cached).`);
					} else if (pythonProgress.stage === "error") {
						$$renderer.push("<!--[2-->");
						$$renderer.push(`<span class="text-danger">Python: ${escape_html(pythonProgress.message)}</span>`);
					} else {
						$$renderer.push("<!--[-1-->");
						$$renderer.push(`<span class="inline-flex items-center gap-1">`);
						Loader_circle($$renderer, { class: "size-3 animate-spin" });
						$$renderer.push(`<!----> ${escape_html(pythonProgress.message)}</span>`);
					}
					$$renderer.push(`<!--]--></span></div> <div class="flex items-center gap-3">`);
					{
						function icon($$renderer) {
							File_text($$renderer, { class: "size-4" });
						}
						Button($$renderer, {
							variant: "secondary",
							onclick: exportUfo,
							disabled: !validation().ok || ufoBusy,
							loading: ufoBusy,
							icon,
							children: ($$renderer) => {
								$$renderer.push(`<!---->${escape_html(ufoBusy ? "Packing UFO…" : "Export UFO 3 (zip)")}`);
							},
							$$slots: {
								icon: true,
								default: true
							}
						});
					}
					$$renderer.push(`<!----> <span class="text-[12px] text-fg-subtle">Industry-standard editable source. Open in Glyphs, RoboFont, FontLab — or
						compile from a terminal with <code class="font-mono text-fg">fontmake -u ${escape_html(safeFilename(project().metadata.familyName) || "Untitled")}.ufo -o otf ttf</code>.</span></div> <div class="flex items-center gap-3">`);
					{
						function icon($$renderer) {
							File_braces($$renderer, { class: "size-4" });
						}
						Button($$renderer, {
							variant: "secondary",
							onclick: exportProjectJson,
							icon,
							children: ($$renderer) => {
								$$renderer.push(`<!---->Export project (.font.json)`);
							},
							$$slots: {
								icon: true,
								default: true
							}
						});
					}
					$$renderer.push(`<!----> <span class="text-[12px] text-fg-subtle">Round-trippable backup including sketches and metadata.</span></div> <div class="flex items-center gap-3">`);
					{
						function icon($$renderer) {
							File_text($$renderer, { class: "size-4" });
						}
						Button($$renderer, {
							variant: "secondary",
							onclick: exportFeaSource,
							icon,
							children: ($$renderer) => {
								$$renderer.push(`<!---->Export features (.fea)`);
							},
							$$slots: {
								icon: true,
								default: true
							}
						});
					}
					$$renderer.push(`<!----> <span class="text-[12px] text-fg-subtle">AFDKO-style feature file with current kerning, classes, and OT features —
						edit alongside any tool that speaks <code>.fea</code> (Glyphs, FontLab,
						fontmake).</span></div> <div class="flex items-center gap-3">`);
					{
						function icon($$renderer) {
							File_text($$renderer, { class: "size-4" });
						}
						Button($$renderer, {
							variant: "secondary",
							onclick: exportDesignMd,
							icon,
							children: ($$renderer) => {
								$$renderer.push(`<!---->Export DESIGN.md`);
							},
							$$slots: {
								icon: true,
								default: true
							}
						});
					}
					$$renderer.push(`<!----> <span class="text-[12px] text-fg-subtle">Foundry-style markdown summarizing the brief, features, axes, and changelog
						— ready to commit alongside your sources.</span></div> <div class="flex items-center gap-3">`);
					{
						function icon($$renderer) {
							File_text($$renderer, { class: "size-4" });
						}
						Button($$renderer, {
							variant: "secondary",
							onclick: exportSvgArchive,
							icon,
							children: ($$renderer) => {
								$$renderer.push(`<!---->Export SVG archive`);
							},
							$$slots: {
								icon: true,
								default: true
							}
						});
					}
					$$renderer.push(`<!----> <span class="text-[12px] text-fg-subtle">One SVG with each glyph as a labeled <code>&lt;path></code>.</span></div> <div class="flex items-center gap-3">`);
					{
						function icon($$renderer) {
							File_text($$renderer, { class: "size-4" });
						}
						Button($$renderer, {
							variant: "secondary",
							onclick: exportTestPage,
							loading: testPageBusy,
							icon,
							children: ($$renderer) => {
								$$renderer.push(`<!---->${escape_html(testPageBusy ? "Building…" : "Export HTML test page")}`);
							},
							$$slots: {
								icon: true,
								default: true
							}
						});
					}
					$$renderer.push(`<!----> <span class="text-[12px] text-fg-subtle">Single self-contained <code>.html</code> with the font embedded as a data URL — share or drop on a server.</span></div></div>`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			Panel($$renderer, {
				children: ($$renderer) => {
					$$renderer.push(`<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Trial / restricted subset</h2> <p class="mb-3 text-[12px] text-fg-subtle">Build a marketing trial: only the characters you list are kept, the family name
				gets a "Trial" suffix, and kerning pairs that reference dropped glyphs are
				removed. Useful for previewing without giving away the full set.</p> <div class="flex flex-col gap-2 sm:flex-row sm:items-end"><div class="flex-1"><label for="trial-chars" class="mb-1 block text-[11px] font-medium text-fg-muted">Characters to include</label> <input id="trial-chars"${attr("value", trialChars)} placeholder="e.g., HELO WORLD" class="w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"/></div> <div class="flex flex-col gap-1.5">`);
					{
						function icon($$renderer) {
							Download($$renderer, { class: "size-4" });
						}
						Button($$renderer, {
							variant: "secondary",
							onclick: exportTrialOtf,
							loading: trialBusy,
							icon,
							children: ($$renderer) => {
								$$renderer.push(`<!---->${escape_html(trialBusy ? "Building…" : "Export trial OTF")}`);
							},
							$$slots: {
								icon: true,
								default: true
							}
						});
					}
					$$renderer.push(`<!----> `);
					{
						function icon($$renderer) {
							Globe($$renderer, { class: "size-4" });
						}
						Button($$renderer, {
							variant: "secondary",
							onclick: exportTrialWoff2,
							loading: trialWoff2Busy,
							icon,
							children: ($$renderer) => {
								$$renderer.push(`<!---->${escape_html(trialWoff2Busy ? "Building…" : "Export trial WOFF2")}`);
							},
							$$slots: {
								icon: true,
								default: true
							}
						});
					}
					$$renderer.push(`<!----></div></div> <p class="mt-2 text-[11px] text-fg-subtle">Each character in the field maps to a glyph. Spaces, line breaks, and
				duplicates are ignored. Family becomes <code>${escape_html(project().metadata.familyName)} Trial</code>.
				WOFF2 is the web baseline — share it for online evaluation.</p>`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			Panel($$renderer, {
				children: ($$renderer) => {
					$$renderer.push(`<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">What format should I ship?</h2> <p class="mb-3 text-[12px] text-fg-subtle">Pick by deployment context, not fashion. Most projects ship two or three of these.</p> <dl class="grid gap-2.5 text-[12px]"><div class="grid grid-cols-[100px_1fr] gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2"><dt class="font-mono text-fg">Static OTF</dt> <dd class="text-fg-muted">Print, desktop publishing, broad desktop delivery. Strong traditional support;
						CFF outlines.</dd></div> <div class="grid grid-cols-[100px_1fr] gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2"><dt class="font-mono text-fg">Static TTF</dt> <dd class="text-fg-muted">UI, desktop, TrueType-oriented rendering workflows. Best fit when the user
						may add manual hinting later.</dd></div> <div class="grid grid-cols-[100px_1fr] gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2"><dt class="font-mono text-fg">WOFF2</dt> <dd class="text-fg-muted">Web delivery. Best compression, broad browser support — the W3C web standard
						in 2026. Default for any site / app.</dd></div> `);
					if ((project().axes?.length ?? 0) > 0) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<div class="grid grid-cols-[100px_1fr] gap-3 rounded-md border border-accent/30 bg-accent-soft/30 px-3 py-2"><dt class="font-mono text-accent">Variable TTF</dt> <dd class="text-fg-muted">Many styles in one file — responsive families, UI systems with weight/width
							sliders. Pair with WOFF2 for web. Compatible with this project's
							${escape_html((project().axes ?? []).map((a) => a.tag).join(" / "))} axes.</dd></div>`);
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]--> <div class="grid grid-cols-[100px_1fr] gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2"><dt class="font-mono text-fg">UFO 3</dt> <dd class="text-fg-muted">Editable source — round-trip with Glyphs / RoboFont / FontLab. Always keep this
						archive even if you only ship binaries.</dd></div> <div class="grid grid-cols-[100px_1fr] gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2"><dt class="font-mono text-fg">.font.json</dt> <dd class="text-fg-muted">This app's native source — sketches, notes, references, snapshots all in one
						file. Versionable.</dd></div></dl> <p class="mt-3 text-[11px] text-fg-subtle">Heuristic: web-only product → WOFF2 + (optional) Variable TTF. Editorial / print →
				OTF + TTF. Open-source release → all four binaries + UFO + license + specimen.</p>`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			Panel($$renderer, {
				children: ($$renderer) => {
					$$renderer.push(`<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">CSS snippet</h2> <p class="mb-3 text-[12px] text-fg-subtle">Copy-paste ready CSS for self-hosting the WOFF2 export. Drop the
				downloaded font into a <code>fonts/</code> folder and you're done.</p> <pre class="overflow-x-auto rounded-lg border border-border bg-surface-2/40 p-3 text-[12px] leading-relaxed text-fg"><code>${escape_html(cssSnippet())}</code></pre> <button type="button" class="mt-2 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-[12px] font-medium text-fg-muted hover:border-accent hover:text-accent">${escape_html("Copy to clipboard")}</button>`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			Panel($$renderer, {
				children: ($$renderer) => {
					$$renderer.push(`<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Import</h2> <label class="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-border-strong/50 bg-surface-2/40 px-4 py-3 text-sm text-fg-muted hover:border-accent hover:bg-accent-soft/50">`);
					Download($$renderer, { class: "size-4 rotate-180" });
					$$renderer.push(`<!----> <span>Replace current project with .font.json file</span> <input type="file" accept="application/json,.json" class="sr-only"/></label>`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----></div></div>`);
		}
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
export { _page as default };
