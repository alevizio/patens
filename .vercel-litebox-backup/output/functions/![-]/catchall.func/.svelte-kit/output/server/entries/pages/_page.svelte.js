import { G as escape_html, U as attr, c as ensure_array_like, d as spread_props, f as stringify, n as attr_class, o as derived, r as attr_style } from "../../chunks/dev.js";
import { t as Icon } from "../../chunks/Icon.js";
import { t as X } from "../../chunks/x.js";
import { o as continueGreeting, s as homeTagline } from "../../chunks/delight2.js";
import { t as goto } from "../../chunks/client.js";
import "../../chunks/navigation.js";
import { a as createProject, c as listProjects, f as saveProject, i as addScriptPack, o as deleteProject, p as toggleProjectArchive, s as duplicateProject, t as KIND_PRESETS, v as DEFAULT_GLYPH_SET, y as DEFAULT_FEATURES } from "../../chunks/project.js";
import { t as settings } from "../../chunks/settings.svelte.js";
import { t as SCRIPT_PACKS } from "../../chunks/charsets.js";
import { t as Pin } from "../../chunks/pin.js";
import { n as Input, t as Field } from "../../chunks/Field.js";
import { t as Plus } from "../../chunks/plus.js";
import { t as Pen_tool } from "../../chunks/pen-tool.js";
import { t as Eye } from "../../chunks/eye.js";
import { t as Download } from "../../chunks/download.js";
import { t as Layers } from "../../chunks/layers.js";
import { t as Sparkles } from "../../chunks/sparkles.js";
import { t as File_text } from "../../chunks/file-text.js";
import { t as Lock } from "../../chunks/lock.js";
import { t as Button } from "../../chunks/Button.js";
import { t as Panel } from "../../chunks/Panel.js";
import { t as Trash_2 } from "../../chunks/trash-2.js";
import { n as ShortcutsDialog, t as Sparkline } from "../../chunks/Sparkline.js";
import { l as ufoZipToProject, r as ensurePython } from "../../chunks/python2.js";
import { t as Pencil } from "../../chunks/pencil.js";
import { t as Wand_sparkles } from "../../chunks/wand-sparkles.js";
import { t as Cloud_upload } from "../../chunks/cloud-upload.js";
import { t as Copy } from "../../chunks/copy.js";
import { t as formatRelative } from "../../chunks/format.js";
import { t as Type } from "../../chunks/type.js";
import opentype from "opentype.js";
//#region src/lib/font/import.ts
/**
* Import an existing OTF/TTF file and produce a Font Studio Project.
* Adopts the source font's UPM, metrics, naming, and glyph outlines.
*/
var newId = () => crypto.randomUUID();
var now = () => (/* @__PURE__ */ new Date()).toISOString();
/** Convert an opentype.js path's commands to one BezierContour per subpath. */
var splitIntoContours = (commands) => {
	const out = [];
	let current = [];
	for (const cmd of commands) if (cmd.type === "M") {
		if (current.length > 0) out.push({
			closed: true,
			winding: "ccw",
			commands: current
		});
		current = [{
			type: "M",
			x: cmd.x,
			y: cmd.y
		}];
	} else if (cmd.type === "L") current.push({
		type: "L",
		x: cmd.x,
		y: cmd.y
	});
	else if (cmd.type === "C") current.push({
		type: "C",
		x1: cmd.x1,
		y1: cmd.y1,
		x2: cmd.x2,
		y2: cmd.y2,
		x: cmd.x,
		y: cmd.y
	});
	else if (cmd.type === "Q") current.push({
		type: "Q",
		x1: cmd.x1,
		y1: cmd.y1,
		x: cmd.x,
		y: cmd.y
	});
	else if (cmd.type === "Z") {
		current.push({ type: "Z" });
		out.push({
			closed: true,
			winding: "ccw",
			commands: current
		});
		current = [];
	}
	if (current.length > 0) out.push({
		closed: true,
		winding: "ccw",
		commands: current
	});
	return out.filter((c) => c.commands.length >= 2);
};
var safeStr = (v, fallback) => {
	if (typeof v === "string") return v.trim() || fallback;
	if (v && typeof v === "object" && "en" in v) {
		const en = v.en;
		if (typeof en === "string") return en.trim() || fallback;
	}
	return fallback;
};
var importFromOtf = async (file) => {
	const buffer = await file.arrayBuffer();
	const font = opentype.parse(buffer);
	const upm = font.unitsPerEm || 1e3;
	const asc = font.ascender || 800;
	const desc = font.descender || -200;
	const os2 = font.tables.os2 ?? void 0;
	const capHeight = os2?.sCapHeight && os2.sCapHeight > 0 ? os2.sCapHeight : Math.round(asc * .85);
	const xHeight = os2?.sxHeight && os2.sxHeight > 0 ? os2.sxHeight : Math.round(asc * .6);
	const metrics = {
		unitsPerEm: upm,
		ascender: asc,
		descender: desc,
		capHeight,
		xHeight,
		defaultSidebearing: Math.round(upm * .05)
	};
	const byUnicode = /* @__PURE__ */ new Map();
	for (let i = 0; i < font.glyphs.length; i++) {
		const g = font.glyphs.get(i);
		if (typeof g.unicode === "number" && g.unicode > 0) byUnicode.set(g.unicode, g);
		if (Array.isArray(g.unicodes)) {
			for (const u of g.unicodes) if (u > 0) byUnicode.set(u, g);
		}
	}
	const fileBase = file.name.replace(/\.(otf|ttf)$/i, "");
	const cleanFamily = (s) => s.replace(/\s*\[[^\]]+\]\s*$/, "").trim() || s;
	const familyName = cleanFamily(safeStr(font.names.fontFamily, fileBase));
	const styleName = safeStr(font.names.fontSubfamily, "Regular");
	const designer = safeStr(font.names.designer, "");
	const copyright = safeStr(font.names.copyright, "");
	const license = safeStr(font.names.license, "");
	const version = safeStr(font.names.version, "1.000");
	const glyphs = {};
	const importedNames = /* @__PURE__ */ new Map();
	let matched = 0;
	let extras = 0;
	for (const spec of DEFAULT_GLYPH_SET) {
		const otg = byUnicode.get(spec.codepoint);
		if (otg) {
			const contours = splitIntoContours(otg.path.commands);
			glyphs[spec.codepoint] = {
				codepoint: spec.codepoint,
				name: otg.name || spec.name,
				status: contours.length > 0 ? "final" : "empty",
				advanceWidth: otg.advanceWidth,
				leftSidebearing: metrics.defaultSidebearing,
				rightSidebearing: metrics.defaultSidebearing,
				contours,
				updatedAt: now()
			};
			if (contours.length > 0) matched += 1;
			importedNames.set(spec.codepoint, otg.name || spec.name);
		} else glyphs[spec.codepoint] = {
			codepoint: spec.codepoint,
			name: spec.name,
			status: "empty",
			advanceWidth: spec.composite ? Math.round(upm * .6) : 0,
			leftSidebearing: metrics.defaultSidebearing,
			rightSidebearing: metrics.defaultSidebearing,
			contours: [],
			components: spec.composite ? [{
				baseCodepoint: spec.composite.base,
				offsetX: 0,
				offsetY: 0
			}, {
				baseCodepoint: spec.composite.mark,
				offsetX: 0,
				offsetY: xHeight
			}] : void 0,
			updatedAt: now()
		};
	}
	for (const [cp, otg] of byUnicode.entries()) {
		if (glyphs[cp]) continue;
		const g = otg;
		const contours = splitIntoContours(g.path.commands);
		glyphs[cp] = {
			codepoint: cp,
			name: g.name || `uni${cp.toString(16).toUpperCase().padStart(4, "0")}`,
			status: contours.length > 0 ? "final" : "empty",
			advanceWidth: g.advanceWidth,
			leftSidebearing: metrics.defaultSidebearing,
			rightSidebearing: metrics.defaultSidebearing,
			contours,
			updatedAt: now()
		};
		if (contours.length > 0) extras += 1;
	}
	const ts = now();
	return {
		project: {
			id: newId(),
			name: `${fileBase} (imported)`,
			metadata: {
				familyName,
				styleName,
				designer,
				copyright,
				license,
				version
			},
			metrics,
			glyphs,
			kerning: [],
			features: { ...DEFAULT_FEATURES },
			createdAt: ts,
			updatedAt: ts
		},
		stats: {
			totalGlyphs: byUnicode.size,
			matchedGlyphs: matched,
			extraGlyphs: extras
		}
	};
};
//#endregion
//#region src/lib/font/url-import.ts
/**
* Fetch a font from any URL and dispatch to the OTF/UFO importer.
*
* Handles URL rewriting so common GitHub references just work in the browser:
*   - github.com/owner/repo/blob/branch/path → cdn.jsdelivr.net/gh/...
*   - github.com/owner/repo/raw/branch/path → cdn.jsdelivr.net/gh/...
*   - raw.githubusercontent.com/owner/repo/branch/path → cdn.jsdelivr.net/gh/...
*
* jsdelivr is CDN-cached, CORS-clean, and the canonical mirror for npm + GH.
*/
/**
* Curated OFL-licensed starter fonts pulled from google/fonts via jsdelivr.
* Every URL HEAD-checks 200 at commit time; google/fonts is the most stable
* open-font repo on GitHub.
*/
var gfBase = "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl";
var gf = (slug, file) => `${gfBase}/${slug}/${encodeURIComponent(file)}`;
var STARTER_FONTS = [
	{
		id: "inter",
		label: "Inter",
		family: "Inter",
		description: "Rasmus Andersson · neutral UI sans",
		url: gf("inter", "Inter[opsz,wght].ttf")
	},
	{
		id: "recursive",
		label: "Recursive",
		family: "Recursive",
		description: "Arrow Type · variable code/UI",
		url: gf("recursive", "Recursive[CASL,CRSV,MONO,slnt,wght].ttf")
	},
	{
		id: "ibm-plex-sans",
		label: "IBM Plex Sans",
		family: "IBM Plex Sans",
		description: "IBM · corporate humanist sans",
		url: gf("ibmplexsans", "IBMPlexSans[wdth,wght].ttf")
	},
	{
		id: "jetbrains-mono",
		label: "JetBrains Mono",
		family: "JetBrains Mono",
		description: "JetBrains · code-oriented monospace",
		url: gf("jetbrainsmono", "JetBrainsMono[wght].ttf")
	},
	{
		id: "fira-code",
		label: "Fira Code",
		family: "Fira Code",
		description: "Tonsky · Fira Mono with ligatures",
		url: gf("firacode", "FiraCode[wght].ttf")
	},
	{
		id: "space-grotesk",
		label: "Space Grotesk",
		family: "Space Grotesk",
		description: "Florian Karsten · proportional grotesque",
		url: gf("spacegrotesk", "SpaceGrotesk[wght].ttf")
	},
	{
		id: "dm-sans",
		label: "DM Sans",
		family: "DM Sans",
		description: "Colophon · low-contrast geometric",
		url: gf("dmsans", "DMSans[opsz,wght].ttf")
	},
	{
		id: "manrope",
		label: "Manrope",
		family: "Manrope",
		description: "Mikhail Sharanda · open-source sans",
		url: gf("manrope", "Manrope[wght].ttf")
	},
	{
		id: "work-sans",
		label: "Work Sans",
		family: "Work Sans",
		description: "Wei Huang · grotesque sans-serif",
		url: gf("worksans", "WorkSans[wght].ttf")
	},
	{
		id: "public-sans",
		label: "Public Sans",
		family: "Public Sans",
		description: "US Web Design System · neutral sans",
		url: gf("publicsans", "PublicSans[wght].ttf")
	},
	{
		id: "playfair",
		label: "Playfair Display",
		family: "Playfair Display",
		description: "Claus Eggers Sørensen · transitional serif",
		url: gf("playfairdisplay", "PlayfairDisplay[wght].ttf")
	},
	{
		id: "lora",
		label: "Lora",
		family: "Lora",
		description: "Cyreal · contemporary serif",
		url: gf("lora", "Lora[wght].ttf")
	}
];
/** Rewrite a github.com URL into the equivalent jsdelivr URL when possible. */
var rewriteGithubUrl = (url) => {
	const trimmed = url.trim();
	const ghBlob = trimmed.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|raw)\/([^/]+)\/(.+)$/);
	if (ghBlob) {
		const [, owner, repo, branch, path] = ghBlob;
		return `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${path}`;
	}
	const rawGh = trimmed.match(/^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/);
	if (rawGh) {
		const [, owner, repo, branch, path] = rawGh;
		return `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${path}`;
	}
	return trimmed;
};
var filenameFromUrl = (url) => {
	try {
		const last = new URL(url).pathname.split("/").pop() || "font.otf";
		return decodeURIComponent(last);
	} catch {
		return "font.otf";
	}
};
/**
* Convert a WOFF2 buffer to OTF via the Pyodide+fontTools harness so opentype.js
* (which doesn't ship brotli) can parse it.
*/
var woff2ToOtfIfNeeded = async (buffer, filename) => {
	const lower = filename.toLowerCase();
	if (!lower.endsWith(".woff2") && !lower.endsWith(".woff")) return buffer;
	const runtime = await (await import("../../chunks/python.js")).ensurePython();
	runtime.FS.writeFile("/tmp/in.web", new Uint8Array(buffer));
	await runtime.runPythonAsync(`
from fontTools.ttLib import TTFont
font = TTFont('/tmp/in.web')
font.flavor = None
font.save('/tmp/out.otf')
	`);
	const out = runtime.FS.readFile("/tmp/out.otf");
	const buf = new ArrayBuffer(out.byteLength);
	new Uint8Array(buf).set(out);
	return buf;
};
var importFromUrl = async (rawUrl) => {
	const url = rewriteGithubUrl(rawUrl);
	const filename = filenameFromUrl(url);
	const res = await fetch(url, { mode: "cors" });
	if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
	const raw = await res.arrayBuffer();
	if (filename.toLowerCase().endsWith(".zip") || filename.toLowerCase().endsWith(".ufo.zip")) {
		const py = await import("../../chunks/python.js");
		await py.ensurePython();
		const json = await py.ufoZipToProject(raw);
		const parsed = JSON.parse(json);
		const ts = (/* @__PURE__ */ new Date()).toISOString();
		return {
			project: {
				...parsed,
				id: crypto.randomUUID(),
				name: `${parsed.metadata?.familyName ?? filename} (UFO)`,
				createdAt: ts,
				updatedAt: ts
			},
			sourceUrl: url
		};
	}
	const otfBuffer = await woff2ToOtfIfNeeded(raw, filename);
	return {
		project: (await importFromOtf(new File([otfBuffer], filename.replace(/\.(woff2?|webfont)$/i, ".otf"), { type: "font/otf" }))).project,
		sourceUrl: url
	};
};
//#endregion
//#region src/lib/ui/WelcomeDialog.svelte
function WelcomeDialog($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { open, onclose } = $$props;
		if (open) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="fixed inset-0 z-50 grid place-items-center bg-fg/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" tabindex="-1">`);
			Panel($$renderer, {
				class: "w-full max-w-xl",
				children: ($$renderer) => {
					$$renderer.push(`<div class="mb-3 flex items-start justify-between gap-3"><div><div class="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wider text-accent uppercase">`);
					Sparkles($$renderer, { class: "size-3" });
					$$renderer.push(`<!----> Welcome to Font Studio</div> <h2 class="mt-1 text-xl font-semibold tracking-tight">Design your own typeface, one glyph at a time.</h2></div> <button type="button" class="rounded p-1 text-fg-muted hover:bg-surface-2 hover:text-fg" aria-label="Dismiss" title="Dismiss welcome (Esc)">`);
					X($$renderer, { class: "size-4" });
					$$renderer.push(`<!----></button></div> <p class="mb-4 text-sm text-fg-muted">The core loop is four moves. The whole tool is built around making each one fast.</p> <ol class="mb-4 grid gap-2.5"><li class="flex items-start gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2.5"><div class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-warn/15 text-warn">`);
					Pencil($$renderer, { class: "size-3.5" });
					$$renderer.push(`<!----></div> <div><div class="text-[13px] font-semibold text-fg">1. Sketch</div> <div class="text-[12px] text-fg-muted">Draw any glyph with the pencil (Apple Pencil + pressure works). Start with <span class="font-mono">H O n o</span> — the proportion control set.</div></div></li> <li class="flex items-start gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2.5"><div class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent">`);
					Wand_sparkles($$renderer, { class: "size-3.5" });
					$$renderer.push(`<!----></div> <div><div class="text-[13px] font-semibold text-fg">2. Trace</div> <div class="text-[12px] text-fg-muted">Press T (or click "Trace"). Multi-stroke shapes get union'd; outlines get
							smooth cubic curves via Schneider fitting. Edit points with the A tool.</div></div></li> <li class="flex items-start gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2.5"><div class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-success/15 text-success">`);
					Eye($$renderer, { class: "size-3.5" });
					$$renderer.push(`<!----></div> <div><div class="text-[13px] font-semibold text-fg">3. Preview live</div> <div class="text-[12px] text-fg-muted">Every change re-builds the font in ~15ms via opentype.js + FontFace API.
							Type any string in the strip below the canvas to see it instantly.</div></div></li> <li class="flex items-start gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2.5"><div class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-fg/10 text-fg">`);
					Download($$renderer, { class: "size-3.5" });
					$$renderer.push(`<!----></div> <div><div class="text-[13px] font-semibold text-fg">4. Export</div> <div class="text-[12px] text-fg-muted">OTF for Font Book, WOFF2 for web, UFO for Glyphs/RoboFont/FontLab. The
							Export tab runs a pre-flight check first.</div></div></li></ol> <div class="mb-4 rounded-md border border-accent/30 bg-accent-soft/30 px-3 py-2 text-[12px] text-fg-muted"><span class="font-medium text-accent">Pro tip:</span> you can start from an existing
				font — paste a GitHub URL, drop a file anywhere on this page, or pick from the
				starter library on the right.</div> <div class="mb-4 grid gap-2 sm:grid-cols-2"><a href="/learn" class="rounded-md border border-border bg-surface-2/40 px-3 py-2 text-[12px] hover:border-accent hover:bg-accent-soft/30"><div class="font-medium text-fg">New to type design?</div> <div class="mt-0.5 text-fg-muted">Read the 8-12 week beginner path, exercises, and tools →</div></a> <div class="rounded-md border border-border bg-surface-2/40 px-3 py-2 text-[12px]"><div class="font-medium text-fg">Already drawing?</div> <div class="mt-0.5 text-fg-muted">Start with the Brief tab — define intent, audience, use cases before
						the first stroke.</div></div></div> <div class="flex items-center justify-end gap-2">`);
					Button($$renderer, {
						density: "sm",
						onclick: onclose,
						children: ($$renderer) => {
							$$renderer.push(`<!---->Got it — let's go`);
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----></div>`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/link.svelte
function Link($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "link" },
		props,
		{ iconNode: [["path", { "d": "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" }], ["path", { "d": "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" }]] }
	]));
}
//#endregion
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/library.svelte
function Library($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "library" },
		props,
		{ iconNode: [
			["path", { "d": "m16 6 4 14" }],
			["path", { "d": "M12 6v14" }],
			["path", { "d": "M8 8v12" }],
			["path", { "d": "M4 4v16" }]
		] }
	]));
}
//#endregion
//#region src/lib/ui/CreateFontDialog.svelte
function CreateFontDialog($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { open, onclose, creating, importing, ufoImporting, urlImporting, importError, oncreate, onfile, onufo, onurl } = $$props;
		let mode = "blank";
		let name = "";
		let familyName = "";
		let kind = void 0;
		let scriptPacks = /* @__PURE__ */ new Set();
		let urlInput = "";
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (open) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div class="fixed inset-0 z-50 grid place-items-center bg-fg/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="create-font-title" tabindex="-1">`);
				Panel($$renderer, {
					class: "w-full max-w-xl",
					children: ($$renderer) => {
						$$renderer.push(`<div class="mb-5 flex items-start justify-between gap-4"><div><h2 id="create-font-title" class="text-xl tracking-tight text-fg" style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;">Start a new font</h2> <p class="mt-1 text-[12px] text-fg-subtle">Blank canvas, an existing file, or a public URL.</p></div> <button type="button" class="rounded p-1 text-fg-muted hover:bg-surface-2 hover:text-fg" aria-label="Close" title="Close (Esc)">`);
						X($$renderer, { class: "size-4" });
						$$renderer.push(`<!----></button></div> <div class="mb-5 inline-flex w-full gap-1 rounded-lg bg-surface-2 p-1"><!--[-->`);
						const each_array = ensure_array_like([
							{
								id: "blank",
								label: "Blank",
								icon: Plus
							},
							{
								id: "file",
								label: "From file",
								icon: Cloud_upload
							},
							{
								id: "url",
								label: "From URL",
								icon: Link
							}
						]);
						for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
							let opt = each_array[$$index];
							const Icon = opt.icon;
							$$renderer.push(`<button type="button"${attr_class(`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${stringify(mode === opt.id ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg")}`)}>`);
							if (Icon) {
								$$renderer.push("<!--[-->");
								Icon($$renderer, { class: "size-3.5" });
								$$renderer.push("<!--]-->");
							} else {
								$$renderer.push("<!--[!-->");
								$$renderer.push("<!--]-->");
							}
							$$renderer.push(` ${escape_html(opt.label)}</button>`);
						}
						$$renderer.push(`<!--]--></div> `);
						if (mode === "blank") {
							$$renderer.push("<!--[0-->");
							$$renderer.push(`<form class="grid gap-4">`);
							Field($$renderer, {
								label: "Project name",
								required: true,
								children: ($$renderer) => {
									Input($$renderer, {
										placeholder: "e.g. Personal Sans",
										required: true,
										maxlength: 60,
										get value() {
											return name;
										},
										set value($$value) {
											name = $$value;
											$$settled = false;
										}
									});
								},
								$$slots: { default: true }
							});
							$$renderer.push(`<!----> `);
							Field($$renderer, {
								label: "Font family name",
								hint: "Defaults to project name",
								children: ($$renderer) => {
									Input($$renderer, {
										placeholder: "e.g. Personal Sans",
										maxlength: 60,
										get value() {
											return familyName;
										},
										set value($$value) {
											familyName = $$value;
											$$settled = false;
										}
									});
								},
								$$slots: { default: true }
							});
							$$renderer.push(`<!----> <div><div class="mb-1.5 text-[13px] font-medium text-fg-muted">Kind</div> <div class="grid grid-cols-4 gap-1.5"><!--[-->`);
							const each_array_1 = ensure_array_like(Object.entries(KIND_PRESETS));
							for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
								let [id, preset] = each_array_1[$$index_1];
								$$renderer.push(`<button type="button"${attr_class(`rounded-md border px-2 py-1.5 text-[12px] font-medium transition-colors ${stringify(kind === id ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface-2/40 text-fg-muted hover:border-border-strong hover:text-fg")}`)}${attr("title", preset.description)}>${escape_html(preset.label)}</button>`);
							}
							$$renderer.push(`<!--]--></div> `);
							$$renderer.push("<!--[-1-->");
							$$renderer.push(`<!--]--></div> <div><div class="mb-1.5 text-[13px] font-medium text-fg-muted">Scripts <span class="ml-1 text-[11px] font-normal text-fg-subtle">Latin Basic always included.</span></div> <div class="flex flex-wrap gap-1.5"><!--[-->`);
							const each_array_2 = ensure_array_like(SCRIPT_PACKS);
							for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
								let pack = each_array_2[$$index_2];
								const selected = scriptPacks.has(pack.id);
								$$renderer.push(`<button type="button"${attr_class(`rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors ${stringify(selected ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface-2/40 text-fg-muted hover:border-border-strong hover:text-fg")}`)}${attr("title", pack.description)}>+ ${escape_html(pack.label)}</button>`);
							}
							$$renderer.push(`<!--]--></div></div> <div class="flex items-center justify-end gap-2 border-t border-border pt-4">`);
							Button($$renderer, {
								variant: "ghost",
								density: "sm",
								onclick: onclose,
								type: "button",
								children: ($$renderer) => {
									$$renderer.push(`<!---->Cancel`);
								},
								$$slots: { default: true }
							});
							$$renderer.push(`<!----> `);
							{
								function icon($$renderer) {
									Plus($$renderer, { class: "size-4" });
								}
								Button($$renderer, {
									type: "submit",
									loading: creating,
									disabled: !name.trim(),
									icon,
									children: ($$renderer) => {
										$$renderer.push(`<!---->${escape_html(creating ? "Creating…" : "Create font")}`);
									},
									$$slots: {
										icon: true,
										default: true
									}
								});
							}
							$$renderer.push(`<!----></div></form>`);
						} else if (mode === "file") {
							$$renderer.push("<!--[1-->");
							$$renderer.push(`<div class="grid gap-3"><label class="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong/50 bg-surface-2/40 px-3 py-4 text-sm font-medium text-fg-muted transition-colors hover:border-accent hover:bg-accent-soft/40 hover:text-accent">`);
							Cloud_upload($$renderer, { class: "size-4" });
							$$renderer.push(`<!----> ${escape_html(importing ? "Importing…" : "Choose .otf / .ttf")} <input type="file" accept=".otf,.ttf,font/otf,font/ttf,application/font-sfnt" class="sr-only"${attr("disabled", importing, true)}/></label> <label class="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong/50 bg-surface-2/40 px-3 py-4 text-sm font-medium text-fg-muted transition-colors hover:border-accent hover:bg-accent-soft/40 hover:text-accent">`);
							File_text($$renderer, { class: "size-4" });
							$$renderer.push(`<!----> ${escape_html(ufoImporting ? "Loading Python…" : "Choose .ufo.zip")} <input type="file" accept=".zip,application/zip" class="sr-only"${attr("disabled", ufoImporting, true)}/></label> <p class="text-[11px] text-fg-subtle">OTF/TTF imports drop into the editor instantly. UFO 3 archives are unpacked via
						Pyodide so you can round-trip with Glyphs / RoboFont / FontLab.</p> `);
							if (importError) {
								$$renderer.push("<!--[0-->");
								$$renderer.push(`<div class="rounded-md bg-danger/10 px-3 py-2 text-[12px] text-danger">${escape_html(importError)}</div>`);
							} else $$renderer.push("<!--[-1-->");
							$$renderer.push(`<!--]--></div>`);
						} else {
							$$renderer.push("<!--[-1-->");
							$$renderer.push(`<div class="grid gap-4"><form class="flex items-center gap-2"><div class="relative flex-1">`);
							Link($$renderer, { class: "pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-fg-subtle" });
							$$renderer.push(`<!----> `);
							Input($$renderer, {
								placeholder: "GitHub URL or direct .otf/.ttf/.woff2/.ufo.zip",
								class: "pl-8",
								disabled: urlImporting,
								get value() {
									return urlInput;
								},
								set value($$value) {
									urlInput = $$value;
									$$settled = false;
								}
							});
							$$renderer.push(`<!----></div> `);
							Button($$renderer, {
								type: "submit",
								loading: urlImporting,
								disabled: !urlInput.trim() || urlImporting,
								children: ($$renderer) => {
									$$renderer.push(`<!---->${escape_html(urlImporting ? "Fetching…" : "Fetch")}`);
								},
								$$slots: { default: true }
							});
							$$renderer.push(`<!----></form> <div class="grid gap-2"><div class="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wider text-fg-subtle uppercase">`);
							Library($$renderer, { class: "size-3" });
							$$renderer.push(`<!----> Starter library</div> <div class="grid grid-cols-2 gap-1.5"><!--[-->`);
							const each_array_3 = ensure_array_like(STARTER_FONTS);
							for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
								let starter = each_array_3[$$index_3];
								$$renderer.push(`<button type="button" class="group rounded-md border border-border bg-surface-2/40 px-2.5 py-2 text-left transition-colors hover:border-accent hover:bg-accent-soft/40 disabled:opacity-60"${attr("disabled", urlImporting, true)}${attr("title", starter.url)}><div class="text-[12px] font-medium text-fg">${escape_html(starter.label)}</div> <div class="truncate text-[10px] text-fg-subtle">${escape_html(starter.description)}</div></button>`);
							}
							$$renderer.push(`<!--]--></div></div> `);
							if (importError) {
								$$renderer.push("<!--[0-->");
								$$renderer.push(`<div class="rounded-md bg-danger/10 px-3 py-2 text-[12px] text-danger">${escape_html(importError)}</div>`);
							} else $$renderer.push("<!--[-1-->");
							$$renderer.push(`<!--]--></div>`);
						}
						$$renderer.push(`<!--]-->`);
					},
					$$slots: { default: true }
				});
				$$renderer.push(`<!----></div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]-->`);
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
	});
}
//#endregion
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/archive.svelte
function Archive($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "archive" },
		props,
		{ iconNode: [
			["rect", {
				"width": "20",
				"height": "5",
				"x": "2",
				"y": "3",
				"rx": "1"
			}],
			["path", { "d": "M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" }],
			["path", { "d": "M10 12h4" }]
		] }
	]));
}
//#endregion
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/archive-restore.svelte
function Archive_restore($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "archive-restore" },
		props,
		{ iconNode: [
			["rect", {
				"width": "20",
				"height": "5",
				"x": "2",
				"y": "3",
				"rx": "1"
			}],
			["path", { "d": "M4 8v11a2 2 0 0 0 2 2h2" }],
			["path", { "d": "M20 8v11a2 2 0 0 1-2 2h-2" }],
			["path", { "d": "m9 15 3-3 3 3" }],
			["path", { "d": "M12 12v9" }]
		] }
	]));
}
//#endregion
//#region src/lib/font/demo-project.ts
var CAP_HEIGHT = 700;
var X_HEIGHT = 500;
var STEM = 90;
var BAR = 80;
var CAP_W = 560;
var LC_W = 480;
/** Closed polygon from a list of [x, y] vertices (Y-up font space). */
var poly = (verts, winding = "cw") => {
	return {
		closed: true,
		winding,
		commands: [
			{
				type: "M",
				x: verts[0][0],
				y: verts[0][1]
			},
			...verts.slice(1).map(([x, y]) => ({
				type: "L",
				x,
				y
			})),
			{ type: "Z" }
		]
	};
};
var buildH = () => [
	poly([
		[80, 0],
		[80 + STEM, 0],
		[80 + STEM, CAP_HEIGHT],
		[80, CAP_HEIGHT]
	]),
	poly([
		[CAP_W - STEM - 80, 0],
		[CAP_W - 80, 0],
		[CAP_W - 80, CAP_HEIGHT],
		[CAP_W - STEM - 80, CAP_HEIGHT]
	]),
	poly([
		[80, CAP_HEIGHT / 2 - BAR / 2],
		[CAP_W - 80, CAP_HEIGHT / 2 - BAR / 2],
		[CAP_W - 80, CAP_HEIGHT / 2 + BAR / 2],
		[80, CAP_HEIGHT / 2 + BAR / 2]
	])
];
var buildT = () => [poly([
	[CAP_W / 2 - STEM / 2, 0],
	[CAP_W / 2 + STEM / 2, 0],
	[CAP_W / 2 + STEM / 2, CAP_HEIGHT - BAR],
	[CAP_W / 2 - STEM / 2, CAP_HEIGHT - BAR]
]), poly([
	[60, CAP_HEIGHT - BAR],
	[CAP_W - 60, CAP_HEIGHT - BAR],
	[CAP_W - 60, CAP_HEIGHT],
	[60, CAP_HEIGHT]
])];
var buildI = () => [poly([
	[CAP_W / 2 - STEM / 2, 0],
	[CAP_W / 2 + STEM / 2, 0],
	[CAP_W / 2 + STEM / 2, CAP_HEIGHT],
	[CAP_W / 2 - STEM / 2, CAP_HEIGHT]
])];
var buildE = () => [
	poly([
		[80, 0],
		[80 + STEM, 0],
		[80 + STEM, CAP_HEIGHT],
		[80, CAP_HEIGHT]
	]),
	poly([
		[80, CAP_HEIGHT - BAR],
		[CAP_W - 60, CAP_HEIGHT - BAR],
		[CAP_W - 60, CAP_HEIGHT],
		[80, CAP_HEIGHT]
	]),
	poly([
		[80, CAP_HEIGHT / 2 - BAR / 2],
		[CAP_W - 100, CAP_HEIGHT / 2 - BAR / 2],
		[CAP_W - 100, CAP_HEIGHT / 2 + BAR / 2],
		[80, CAP_HEIGHT / 2 + BAR / 2]
	]),
	poly([
		[80, 0],
		[CAP_W - 60, 0],
		[CAP_W - 60, BAR],
		[80, BAR]
	])
];
var buildN = () => [
	poly([
		[80, 0],
		[80 + STEM, 0],
		[80 + STEM, CAP_HEIGHT],
		[80, CAP_HEIGHT]
	]),
	poly([
		[CAP_W - STEM - 80, 0],
		[CAP_W - 80, 0],
		[CAP_W - 80, CAP_HEIGHT],
		[CAP_W - STEM - 80, CAP_HEIGHT]
	]),
	poly([
		[80 + STEM, CAP_HEIGHT],
		[CAP_W - 80, 0],
		[CAP_W - STEM - 80, 0],
		[80, CAP_HEIGHT]
	])
];
/** O — ring approximated by 12-sided outer polygon with inner counter (ccw). */
var buildO = () => {
	const cx = CAP_W / 2;
	const cy = CAP_HEIGHT / 2;
	const rx = CAP_W / 2 - 80;
	const ry = CAP_HEIGHT / 2;
	const t = STEM;
	const sides = 16;
	const ring = (radX, radY, ccw = false) => {
		const pts = [];
		for (let i = 0; i < sides; i++) {
			const angle = i / sides * Math.PI * 2 * (ccw ? -1 : 1);
			pts.push([cx + Math.cos(angle) * radX, cy + Math.sin(angle) * radY]);
		}
		return pts;
	};
	return [poly(ring(rx, ry), "cw"), poly(ring(rx - t, ry - t, true), "ccw")];
};
var buildO_lc = () => {
	const cx = LC_W / 2;
	const cy = X_HEIGHT / 2;
	const rx = LC_W / 2 - 80;
	const ry = X_HEIGHT / 2;
	const t = STEM - 10;
	const sides = 16;
	const ring = (radX, radY, ccw = false) => {
		const pts = [];
		for (let i = 0; i < sides; i++) {
			const angle = i / sides * Math.PI * 2 * (ccw ? -1 : 1);
			pts.push([cx + Math.cos(angle) * radX, cy + Math.sin(angle) * radY]);
		}
		return pts;
	};
	return [poly(ring(rx, ry), "cw"), poly(ring(rx - t, ry - t, true), "ccw")];
};
var buildN_lc = () => [
	poly([
		[80, 0],
		[80 + STEM, 0],
		[80 + STEM, X_HEIGHT - STEM],
		[80, X_HEIGHT - STEM]
	]),
	poly([
		[80, X_HEIGHT - STEM],
		[LC_W - 80, X_HEIGHT - STEM],
		[LC_W - 80, X_HEIGHT],
		[80, X_HEIGHT]
	]),
	poly([
		[LC_W - STEM - 80, 0],
		[LC_W - 80, 0],
		[LC_W - 80, X_HEIGHT - STEM],
		[LC_W - STEM - 80, X_HEIGHT - STEM]
	])
];
buildH(), buildO(), buildT(), buildI(), Math.round(CAP_W * .6), buildE(), buildN(), CAP_W + 20, buildO_lc(), buildN_lc();
//#endregion
//#region src/routes/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const taglineParts = derived(() => homeTagline().split("\n"));
		const OFL_RESERVED_FAMILIES = [
			"Inter",
			"Roboto",
			"Open Sans",
			"Source Sans",
			"Source Code",
			"Source Serif",
			"Noto",
			"Public Sans",
			"JetBrains Mono",
			"Fira Sans",
			"Fira Code",
			"IBM Plex",
			"Work Sans",
			"Lato",
			"Montserrat",
			"Recursive"
		];
		let projects = [];
		let projectQuery = "";
		let projectSort = "updated";
		let activeTag = null;
		let loading = true;
		let shortcutsOpen = false;
		const archivedCount = derived(() => projects.filter((p) => p.archived).length);
		const allTags = derived(() => {
			const counts = /* @__PURE__ */ new Map();
			for (const p of projects) {
				if (!p.tags) continue;
				for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
			}
			return [...counts.entries()].sort((a, b) => b[1] - a[1]);
		});
		const recentReleases = derived(() => projects.filter((p) => p.lastSealedVersion && p.lastSealedAt).sort((a, b) => a.lastSealedAt < b.lastSealedAt ? 1 : -1).slice(0, 5));
		const todayTotals = derived(() => {
			const visible = projects.filter((p) => !p.archived);
			let activeProjects = 0;
			let editedToday = 0;
			let editedThisWeek = 0;
			for (const p of visible) {
				if ((p.editsToday ?? 0) > 0) activeProjects++;
				editedToday += p.editsToday ?? 0;
				editedThisWeek += p.editsThisWeek ?? 0;
			}
			return {
				activeProjects,
				editedToday,
				editedThisWeek
			};
		});
		const lastVisitedSlug = (id) => {
			if (typeof localStorage === "undefined") return "edit";
			try {
				return localStorage.getItem(`font-studio:last-tab:${id}`) || "edit";
			} catch {
				return "edit";
			}
		};
		const continueCandidate = derived(() => {
			const visible = projects.filter((p) => !p.archived);
			if (visible.length === 0) return null;
			const top = [...visible].sort((a, b) => a.updatedAt < b.updatedAt ? 1 : -1)[0];
			if (!top) return null;
			return {
				...top,
				slug: lastVisitedSlug(top.id)
			};
		});
		const filteredProjects = derived(() => {
			const q = projectQuery.trim().toLowerCase();
			let filtered = q ? projects.filter((p) => p.name.toLowerCase().includes(q) || p.familyName.toLowerCase().includes(q)) : [...projects];
			filtered = filtered.filter((p) => !p.archived);
			let sorted;
			switch (projectSort) {
				case "name":
					sorted = filtered.sort((a, b) => a.name.localeCompare(b.name));
					break;
				case "brief":
					sorted = filtered.sort((a, b) => (b.briefPct ?? 0) - (a.briefPct ?? 0));
					break;
				case "glyphs":
					sorted = filtered.sort((a, b) => b.glyphCount - a.glyphCount);
					break;
				default: sorted = filtered.sort((a, b) => a.updatedAt < b.updatedAt ? 1 : -1);
			}
			return sorted.sort((a, b) => {
				return (a.pinned ? 0 : 1) - (b.pinned ? 0 : 1);
			});
		});
		let creating = false;
		let importing = false;
		let ufoImporting = false;
		let urlImporting = false;
		let importError = null;
		let createDialogOpen = false;
		let openingDemo = false;
		let importWarning = null;
		const refresh = async () => {
			projects = await listProjects();
			loading = false;
		};
		refresh();
		const handleToggleArchive = async (id) => {
			await toggleProjectArchive(id);
			await refresh();
		};
		derived(() => void 0);
		const handleCreate = async (input) => {
			const trimmed = input.name.trim();
			if (!trimmed || creating) return;
			creating = true;
			const isFirstProject = projects.length === 0;
			try {
				let project = createProject({
					name: trimmed,
					familyName: input.familyName.trim() || trimmed,
					kind: input.kind
				});
				for (const pack of SCRIPT_PACKS) if (input.scriptPacks.has(pack.id)) project = addScriptPack(project, pack);
				await saveProject(project);
				createDialogOpen = false;
				if (isFirstProject) {
					const { toast } = await import("../../chunks/toast.svelte.js");
					const { celebrate } = await import("../../chunks/delight.js");
					toast.success(`Welcome to your foundry. Start with the letter H — it sets the proportion for everything else.`);
					celebrate("small");
				}
				await goto(`/project/${project.id}/edit`);
			} finally {
				creating = false;
			}
		};
		const QUICK_PRESETS = [
			{
				id: "web-ui",
				label: "Web UI sans",
				kind: "ui",
				intent: "A neutral geometric sans for product UI at 12–28px, with strong digit + punctuation legibility.",
				useCases: ["web-ui", "body-text"]
			},
			{
				id: "display",
				label: "Display",
				kind: "display",
				intent: "A high-contrast display face for headlines, posters, and brand moments.",
				useCases: ["display", "branding"]
			},
			{
				id: "mono",
				label: "Code monospace",
				kind: "mono",
				intent: "A monospaced face for editors and terminals; equal advance widths, disambiguated 0/O and 1/l/I.",
				useCases: ["code", "data-tables"]
			},
			{
				id: "editorial",
				label: "Editorial serif",
				kind: "text",
				intent: "A reading-first serif for long-form editorial — balanced contrast, comfortable rhythm at 14–18px.",
				useCases: ["body-text", "editorial"]
			}
		];
		let presetBusy = null;
		const handleDuplicate = async (id) => {
			await duplicateProject(id);
			await refresh();
		};
		const handleDelete = async (entry) => {
			if (!confirm(`Delete "${entry.name}"? This cannot be undone.`)) return;
			await deleteProject(entry.id);
			await refresh();
		};
		const checkReservedName = (family) => {
			const trimmed = family.trim();
			const hit = OFL_RESERVED_FAMILIES.find((name) => trimmed.toLowerCase().includes(name.toLowerCase()));
			if (!hit) return null;
			return `"${trimmed}" looks like a derivative of the OFL-licensed "${hit}" family. The OFL requires you to change the family name in derivative work before redistributing. Rename the project in Export → Metadata before sharing.`;
		};
		const handleUrlImport = async (url) => {
			if (!url.trim() || urlImporting) return;
			urlImporting = true;
			importError = null;
			importWarning = null;
			try {
				const { project } = await importFromUrl(url);
				importWarning = checkReservedName(project.metadata.familyName);
				await saveProject(project);
				if (importWarning) alert(importWarning);
				await goto(`/project/${project.id}/edit`);
			} catch (err) {
				importError = err instanceof Error ? err.message : "Could not fetch font from URL";
			} finally {
				urlImporting = false;
			}
		};
		/**
		* Route a dropped or picked File to the right importer based on extension.
		* Same code path the home-page upload buttons use.
		*/
		const importFile = async (file) => {
			const name = file.name.toLowerCase();
			importError = null;
			importWarning = null;
			try {
				if (name.endsWith(".zip") || name.endsWith(".ufo.zip")) {
					ufoImporting = true;
					await ensurePython();
					const projectJson = await ufoZipToProject(await file.arrayBuffer());
					const parsed = JSON.parse(projectJson);
					const ts = (/* @__PURE__ */ new Date()).toISOString();
					const project = {
						...parsed,
						id: crypto.randomUUID(),
						name: `${parsed.metadata?.familyName ?? "Untitled"} (UFO)`,
						createdAt: ts,
						updatedAt: ts
					};
					importWarning = checkReservedName(project.metadata.familyName);
					await saveProject(project);
					if (importWarning) alert(importWarning);
					await goto(`/project/${project.id}/edit`);
				} else {
					importing = true;
					const { project } = await importFromOtf(file);
					importWarning = checkReservedName(project.metadata.familyName);
					await saveProject(project);
					if (importWarning) alert(importWarning);
					await goto(`/project/${project.id}/edit`);
				}
			} catch (err) {
				importError = err instanceof Error ? err.message : "Could not read this file.";
			} finally {
				importing = false;
				ufoImporting = false;
			}
		};
		$$renderer.push(`<div class="relative mx-auto max-w-6xl px-6 py-8 sm:py-10" role="application"><header class="mb-10 flex items-center justify-between gap-3 border-b border-border/50 pb-4"><a href="/" class="group inline-flex items-center gap-2.5"><span class="inline-flex size-7 items-center justify-center rounded-lg bg-fg text-canvas transition-transform group-hover:scale-105">`);
		Type($$renderer, { class: "size-3.5" });
		$$renderer.push(`<!----></span> <span class="text-[13px] font-medium tracking-tight text-fg" style="font-family: ui-monospace, 'SF Mono', Menlo, monospace;">Font Studio</span> `);
		if (todayTotals().editedToday > 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<span class="ml-2 hidden items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[10px] font-medium text-accent sm:inline-flex" data-numeric="" title="Glyphs edited today across all projects"><span class="size-1 rounded-full bg-accent"></span> ${escape_html(todayTotals().editedToday)} today</span>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></a> <nav class="flex items-center gap-1"><a href="/families" class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg">`);
		Layers($$renderer, { class: "size-3.5" });
		$$renderer.push(`<!----> Families</a> <a href="/learn" class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg">Learn the craft</a> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></nav></header>  <section class="mb-16"><h1 class="max-w-3xl text-3xl leading-[1.05] tracking-tight text-balance sm:text-[44px]"><span class="block text-fg" style="font-family: 'Hoefler Text', ui-serif, Georgia, 'Times New Roman', serif;">${escape_html(taglineParts()[0])}</span> <span class="mt-1 block font-sans font-semibold text-fg-muted">${escape_html(taglineParts()[1])}</span></h1> <p class="mt-4 max-w-xl text-[15px] leading-relaxed text-fg-muted">Sketch, vectorize, space, kern, and export a real OTF — all in your browser. Every
			project is saved locally.</p> <div class="mt-10 grid gap-3 md:grid-cols-4"><button type="button" class="group relative flex items-center gap-5 overflow-hidden rounded-2xl border border-accent/60 bg-accent-soft/40 p-6 text-left text-fg transition-all hover:-translate-y-0.5 hover:border-accent hover:bg-accent-soft/60 hover:shadow-md md:col-span-2"><div class="flex size-14 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-fg">`);
		Plus($$renderer, { class: "size-6" });
		$$renderer.push(`<!----></div> <div class="min-w-0 flex-1"><div class="text-[18px] leading-tight text-fg" style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;">Start a new font</div> <div class="mt-1.5 text-[12px] leading-snug text-fg-muted">Blank canvas, named &amp; ready in seconds</div></div> <span class="text-accent transition-transform group-hover:translate-x-0.5">→</span></button> `);
		if (continueCandidate()) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<a${attr("href", `/project/${stringify(continueCandidate().id)}/${stringify(continueCandidate().slug)}`)} class="group flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-md"><div class="flex size-10 items-center justify-center rounded-lg bg-accent-soft text-accent">`);
			Pen_tool($$renderer, { class: "size-4" });
			$$renderer.push(`<!----></div> <div class="min-w-0 flex-1"><div class="truncate text-[14px] leading-tight text-fg" style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;">${escape_html(continueGreeting(continueCandidate().updatedAt))}</div> <div class="mt-1 truncate text-[11px] leading-snug text-fg-muted">${escape_html(continueCandidate().name)} · <span class="font-mono" data-numeric="">${escape_html(formatRelative(continueCandidate().updatedAt))}</span></div></div></a>`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<a href="#quick-start" class="group flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-md"><div class="flex size-10 items-center justify-center rounded-lg bg-accent-soft text-accent">`);
			Sparkles($$renderer, { class: "size-4" });
			$$renderer.push(`<!----></div> <div class="min-w-0 flex-1"><div class="text-[14px] leading-tight text-fg" style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;">Pick a style</div> <div class="mt-1 text-[11px] leading-snug text-fg-muted">UI · Display · Mono · Editorial</div></div></a>`);
		}
		$$renderer.push(`<!--]--> <button type="button" class="group flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 text-left transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-md"><div class="flex size-10 items-center justify-center rounded-lg bg-accent-soft text-accent">`);
		Cloud_upload($$renderer, { class: "size-4" });
		$$renderer.push(`<!----></div> <div class="min-w-0 flex-1"><div class="text-[14px] leading-tight text-fg" style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;">Import a font</div> <div class="mt-1 text-[11px] leading-snug text-fg-muted">.otf · .ttf · .ufo.zip · URL</div></div></button></div></section> `);
		if (projects.length > 0 || !loading) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<section id="quick-start" class="mb-16 scroll-mt-8"><div class="mb-4 flex items-baseline justify-between gap-3"><div class="flex items-baseline gap-3"><h2 class="text-[18px] tracking-tight text-fg" style="font-family: ui-serif, Georgia, serif;">Quick start</h2> <span class="text-[11px] text-fg-subtle">Pre-fills the Brief with intent + use cases</span></div></div> <div class="grid grid-cols-2 gap-3 md:grid-cols-4"><!--[-->`);
			const each_array = ensure_array_like(QUICK_PRESETS);
			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let p = each_array[$$index];
				const previewStyle = p.kind === "display" ? "font-family: 'Helvetica Neue', Impact, 'Arial Black', sans-serif; font-weight: 900; letter-spacing: -0.02em;" : p.kind === "mono" ? "font-family: ui-monospace, Menlo, 'Courier New', monospace; font-weight: 500;" : p.kind === "text" ? "font-family: ui-serif, Georgia, 'Times New Roman', serif;" : "font-family: ui-sans-serif, system-ui, sans-serif; font-weight: 600;";
				$$renderer.push(`<button type="button"${attr("disabled", presetBusy !== null, true)} class="group flex flex-col gap-3 rounded-2xl border border-transparent bg-surface-2/40 px-5 py-5 text-left transition-all hover:-translate-y-0.5 hover:border-border hover:bg-surface hover:shadow-sm disabled:translate-y-0 disabled:opacity-60"${attr("title", p.intent)}><div class="text-[28px] leading-none text-fg transition-colors group-hover:text-accent"${attr_style(previewStyle)}>Aa</div> <div><div class="text-[13px] font-medium text-fg">${escape_html(p.label)}</div> <div class="mt-1 line-clamp-2 text-[11px] leading-snug text-fg-subtle">${escape_html(p.intent)}</div></div></button>`);
			}
			$$renderer.push(`<!--]--></div></section>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <div class="grid gap-8"><section><div class="mb-5 flex items-baseline justify-between gap-3"><h2 class="text-[28px] leading-none tracking-tight text-fg" style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;">Your fonts</h2> `);
		if (!loading) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<span class="text-[12px] text-fg-subtle" data-numeric="">${escape_html(filteredProjects().length)} of ${escape_html(projects.length)}</span>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></div> `);
		if (projects.length > 6) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="mb-3 flex flex-wrap gap-2"><input${attr("value", projectQuery)} placeholder="Filter by name or family… (/)" class="min-w-[160px] flex-1 rounded-md border border-border bg-surface px-3 py-1.5 text-[13px] text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"/> <button type="button"${attr_class(`rounded-md border px-2 py-1.5 text-[12px] font-medium transition-colors ${stringify("border-border bg-surface text-fg-muted hover:border-border-strong")}`)}>Today</button> `);
			if (archivedCount() > 0) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<button type="button"${attr_class(`rounded-md border px-2 py-1.5 text-[12px] font-medium transition-colors ${stringify("border-border bg-surface text-fg-muted hover:border-border-strong")}`)}${attr("title", "Show archived projects")}>`);
				Archive($$renderer, { class: "inline size-3 align-[-2px]" });
				$$renderer.push(`<!----> ${escape_html("Show")} archived <span data-numeric="">(${escape_html(archivedCount())})</span></button> `);
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]-->`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			$$renderer.select({
				value: projectSort,
				class: "rounded-md border border-border bg-surface px-2 py-1.5 text-[12px] text-fg-muted outline-none focus:border-accent",
				title: "Sort by"
			}, ($$renderer) => {
				$$renderer.option({ value: "updated" }, ($$renderer) => {
					$$renderer.push(`Recent`);
				});
				$$renderer.option({ value: "name" }, ($$renderer) => {
					$$renderer.push(`Name`);
				});
				$$renderer.option({ value: "brief" }, ($$renderer) => {
					$$renderer.push(`Brief %`);
				});
				$$renderer.option({ value: "glyphs" }, ($$renderer) => {
					$$renderer.push(`Glyphs`);
				});
			});
			$$renderer.push(` `);
			if (projectSort !== "updated") {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<button type="button" class="rounded-md border border-border bg-surface px-2 py-1.5 text-[11px] font-medium text-fg-muted hover:border-danger hover:text-danger" title="Reset every filter and sort">Reset</button>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div> `);
			if (allTags().length > 0) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div class="mb-2 flex flex-wrap items-center gap-1.5"><span class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Tags</span> <!--[-->`);
				const each_array_1 = ensure_array_like(allTags());
				for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
					let [t, n] = each_array_1[$$index_1];
					$$renderer.push(`<button type="button"${attr_class(`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${stringify(activeTag === t ? "border-accent bg-accent text-accent-fg" : "border-border bg-surface text-fg-muted hover:border-accent hover:text-accent")}`)}${attr("title", activeTag === t ? `Clear ${t} filter` : `Show only ${t}`)}>${escape_html(t)} <span class="font-mono text-[9px] opacity-70" data-numeric="">${escape_html(n)}</span></button>`);
				}
				$$renderer.push(`<!--]--> `);
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--></div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]-->`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		if (loading) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<ul class="grid gap-2" aria-busy="true" aria-label="Loading projects"><!--[-->`);
			const each_array_2 = ensure_array_like([
				0,
				1,
				2,
				3
			]);
			for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
				let i = each_array_2[$$index_2];
				$$renderer.push(`<li class="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-3 motion-safe:animate-[skel-shimmer_1.4s_ease-in-out_infinite]"${attr_style(`animation-delay: ${stringify(i * 120)}ms`)}><div class="size-12 shrink-0 rounded-md bg-surface-2"></div> <div class="flex-1 space-y-1.5"><div class="h-3 w-2/5 rounded bg-surface-2"></div> <div class="h-2 w-3/5 rounded bg-surface-2/70"></div></div> <div class="h-2 w-16 rounded bg-surface-2/60"></div></li>`);
			}
			$$renderer.push(`<!--]--></ul>`);
		} else if (projects.length === 0) {
			$$renderer.push("<!--[1-->");
			$$renderer.push(`<div class="rounded-lg border border-dashed border-border-strong/50 bg-surface-2/50 p-10 text-center"><pre class="mx-auto mb-3 inline-block whitespace-pre text-left font-mono text-[10px] leading-[1.15] text-fg-subtle" aria-hidden="true">     ╱ ╲
    ╱   ╲      H  O  n  o
   ╱     ╲     ──────────
  ╱───────╲    your control set
 ╱         ╲   draws this whole
╱           ╲  family.</pre> <p class="text-sm text-fg-muted">No fonts yet. Create one to begin.</p></div>`);
		} else if (filteredProjects().length === 0) {
			$$renderer.push("<!--[2-->");
			$$renderer.push(`<div class="rounded-lg border border-dashed border-border-strong/50 bg-surface-2/50 p-6 text-center text-[12px] text-fg-muted">No projects match "${escape_html(projectQuery)}".</div>`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<ul class="grid gap-2"><!--[-->`);
			const each_array_3 = ensure_array_like(filteredProjects());
			for (let $$index_4 = 0, $$length = each_array_3.length; $$index_4 < $$length; $$index_4++) {
				let p = each_array_3[$$index_4];
				$$renderer.push(`<li${attr_class(`group flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2/40 px-4 py-3 transition-colors hover:border-border-strong hover:bg-surface-2 ${stringify(p.archived ? "opacity-60" : "")}`)}><a${attr("href", `/project/${stringify(p.id)}/edit`)} class="flex min-w-0 flex-1 items-center gap-4"><div class="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-fg/5 font-mono text-xl font-semibold text-fg">`);
				if (p.thumbnail) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<svg${attr("viewBox", p.thumbnail.viewBox)} width="44" height="44" preserveAspectRatio="xMidYMid meet" style="transform: scaleY(-1);" aria-hidden="true"><path${attr("d", p.thumbnail.path)} fill="currentColor" fill-rule="evenodd"></path></svg>`);
				} else {
					$$renderer.push("<!--[-1-->");
					$$renderer.push(`${escape_html((p.familyName[0] ?? "A").toUpperCase())}`);
				}
				$$renderer.push(`<!--]--></div> <div class="min-w-0 flex-1"><div class="flex items-center gap-2"><div class="truncate text-sm font-medium text-fg">${escape_html(p.name)}</div> `);
				if (p.locked) {
					$$renderer.push("<!--[0-->");
					Lock($$renderer, {
						class: "size-3 text-warn",
						"aria-label": "Locked"
					});
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--> `);
				if ((p.briefPct ?? 0) > 0) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<span${attr_class(`rounded px-1.5 py-0.5 font-mono text-[10px] font-medium ${stringify((p.briefPct ?? 0) >= 67 ? "bg-success/15 text-success" : (p.briefPct ?? 0) >= 33 ? "bg-warn/15 text-warn" : "bg-fg/10 text-fg-subtle")}`)}${attr("title", (p.briefMissing ?? []).length === 0 ? "Brief complete" : `Missing: ${(p.briefMissing ?? []).join(", ")}`)} data-numeric="">Brief ${escape_html(p.briefPct)}%</span>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--> `);
				if ((p.editsToday ?? 0) > 0) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<span class="rounded bg-accent/15 px-1.5 py-0.5 font-mono text-[10px] font-medium text-accent"${attr("title", `Glyphs edited in last 24h${stringify((p.editsThisWeek ?? 0) > (p.editsToday ?? 0) ? ` · ${p.editsThisWeek} this week` : "")}`)} data-numeric="">${escape_html(p.editsToday)} today</span>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--> `);
				if ((p.editsByDay ?? []).some((n) => n > 0)) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<span class="inline-flex items-center"${attr("title", `Edits per day, last 14d · ${stringify(p.editsByDay?.reduce((a, b) => a + b, 0) ?? 0)} total`)}>`);
					Sparkline($$renderer, {
						values: p.editsByDay ?? [],
						width: 56,
						height: 14,
						label: "Edits per day, last 14d"
					});
					$$renderer.push(`<!----></span>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--></div> <div class="truncate text-[12px] text-fg-muted" data-numeric="">${escape_html(p.familyName)} · ${escape_html(p.glyphCount)} drawn · updated ${escape_html(formatRelative(p.updatedAt))}${escape_html(p.lastSealedVersion ? ` · sealed v${p.lastSealedVersion} ${formatRelative(p.lastSealedAt ?? p.updatedAt)}` : "")}</div> `);
				if (p.tagline) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<div class="mt-0.5 truncate text-[11px] italic text-fg-subtle">${escape_html(p.tagline)}</div>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--> `);
				if (p.tags && p.tags.length > 0) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<div class="mt-1 flex flex-wrap gap-1"><!--[-->`);
					const each_array_4 = ensure_array_like(p.tags);
					for (let $$index_3 = 0, $$length = each_array_4.length; $$index_3 < $$length; $$index_3++) {
						let t = each_array_4[$$index_3];
						$$renderer.push(`<button type="button" class="rounded-full bg-surface-2/80 px-1.5 py-0.5 text-[10px] font-medium text-fg-muted hover:bg-accent-soft hover:text-accent"${attr("title", activeTag === t ? `Clear ${t} filter` : `Show only ${t}`)}>${escape_html(t)}</button>`);
					}
					$$renderer.push(`<!--]--></div>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--> `);
				if (p.familyId) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<div class="mt-1"><button type="button" class="inline-flex items-center gap-1 rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent hover:bg-accent hover:text-accent-fg" title="Open family hub">`);
					Layers($$renderer, { class: "size-2.5" });
					$$renderer.push(`<!----> Family `);
					if (p.familyAxes) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<span class="font-mono" data-numeric="">`);
						if (p.familyAxes.wght) {
							$$renderer.push("<!--[0-->");
							$$renderer.push(`${escape_html(p.familyAxes.wght)}`);
						} else $$renderer.push("<!--[-1-->");
						$$renderer.push(`<!--]-->`);
						if (p.familyAxes.ital) {
							$$renderer.push("<!--[0-->");
							$$renderer.push(`i`);
						} else $$renderer.push("<!--[-1-->");
						$$renderer.push(`<!--]--></span>`);
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]--></button></div>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--></div></a> <div class="flex shrink-0 gap-1"><button type="button"${attr_class(`inline-flex size-7 items-center justify-center rounded-md transition-colors hover:bg-surface-2 ${stringify(p.pinned ? "text-warn opacity-100" : "text-fg-subtle opacity-0 group-hover:opacity-100 hover:text-fg")}`)}${attr("aria-label", p.pinned ? "Unpin from top" : "Pin to top")}${attr("title", p.pinned ? "Unpin from top" : "Pin to top")}>`);
				if (p.pinned) {
					$$renderer.push("<!--[0-->");
					Pin($$renderer, { class: "size-3.5 fill-warn" });
				} else {
					$$renderer.push("<!--[-1-->");
					Pin($$renderer, { class: "size-3.5" });
				}
				$$renderer.push(`<!--]--></button> <div class="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">`);
				{
					function icon($$renderer) {
						Copy($$renderer, { class: "size-3.5" });
					}
					Button($$renderer, {
						variant: "ghost",
						density: "sm",
						onclick: () => handleDuplicate(p.id),
						"aria-label": "Duplicate",
						title: "Duplicate project",
						icon,
						$$slots: { icon: true }
					});
				}
				$$renderer.push(`<!----> `);
				{
					function icon($$renderer) {
						if (p.archived) {
							$$renderer.push("<!--[0-->");
							Archive_restore($$renderer, { class: "size-3.5" });
						} else {
							$$renderer.push("<!--[-1-->");
							Archive($$renderer, { class: "size-3.5" });
						}
						$$renderer.push(`<!--]-->`);
					}
					Button($$renderer, {
						variant: "ghost",
						density: "sm",
						onclick: () => handleToggleArchive(p.id),
						"aria-label": p.archived ? "Unarchive" : "Archive",
						title: p.archived ? "Unarchive project" : "Archive project",
						icon,
						$$slots: { icon: true }
					});
				}
				$$renderer.push(`<!----> `);
				{
					function icon($$renderer) {
						Trash_2($$renderer, { class: "size-3.5" });
					}
					Button($$renderer, {
						variant: "ghost",
						density: "sm",
						onclick: () => handleDelete(p),
						"aria-label": "Delete",
						title: "Delete project",
						icon,
						$$slots: { icon: true }
					});
				}
				$$renderer.push(`<!----></div></div></li>`);
			}
			$$renderer.push(`<!--]--></ul>`);
		}
		$$renderer.push(`<!--]--></section> <section class="mt-10 grid gap-4">`);
		if (recentReleases().length > 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="rounded-2xl border border-border bg-surface p-5"><h2 class="mb-3 text-[15px] tracking-tight text-fg" style="font-family: ui-serif, Georgia, serif;">Recent releases</h2> <ul class="grid gap-1.5"><!--[-->`);
			const each_array_5 = ensure_array_like(recentReleases());
			for (let $$index_5 = 0, $$length = each_array_5.length; $$index_5 < $$length; $$index_5++) {
				let r = each_array_5[$$index_5];
				$$renderer.push(`<a${attr("href", `/project/${stringify(r.id)}/release`)} class="flex items-center justify-between gap-2 rounded-md border border-border bg-surface-2/40 px-2.5 py-1.5 text-[12px] transition-colors hover:border-accent hover:bg-accent-soft/40"><span class="min-w-0 truncate text-fg">${escape_html(r.name)}</span> <span class="flex shrink-0 items-baseline gap-1.5 font-mono text-[11px] text-fg-muted" data-numeric=""><span class="text-accent">v${escape_html(r.lastSealedVersion)}</span> <span class="text-fg-subtle">${escape_html(formatRelative(r.lastSealedAt))}</span></span></a>`);
			}
			$$renderer.push(`<!--]--></ul></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></section></div> <section class="mt-24 grid gap-8 md:grid-cols-[5fr_7fr] md:gap-10"><div><h2 class="text-[22px] leading-tight tracking-tight text-fg" style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;">See it in action</h2> <p class="mt-3 text-[13px] leading-relaxed text-fg-muted">Open the example project to explore a font mid-design — eight drawn
				glyphs across uppercase + lowercase, with the Brief, metrics, and
				release notes already set. Edit any point, run a boolean op, ship
				the OTF.</p> <p class="mt-3 font-mono text-[10px] tracking-wide text-fg-subtle uppercase">Example project + two demo .otf files</p></div> <div class="grid gap-3"><button type="button"${attr("disabled", openingDemo, true)} class="group flex items-center gap-5 overflow-hidden rounded-2xl border border-accent/60 bg-accent-soft/40 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-accent hover:bg-accent-soft/60 hover:shadow-md disabled:opacity-70"><div class="flex size-16 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-fg" style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;"><span class="text-[28px] leading-none">Hn</span></div> <div class="min-w-0 flex-1"><div class="flex items-center gap-2"><div class="text-[16px] leading-tight text-fg" style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;">${escape_html("Open the example project")}</div> <span class="rounded-full bg-accent/15 px-2 py-0.5 font-mono text-[9px] font-semibold tracking-wider text-accent uppercase">Try it</span></div> <div class="mt-1 text-[12px] leading-snug text-fg-muted">A font mid-design — opens in the editor, fully wired</div> <div class="mt-1.5 font-mono text-[10px] tracking-wide text-fg-subtle" data-numeric="">8 glyphs drawn · Brief filled · v0.1.0-demo</div></div> <span class="text-accent transition-transform group-hover:translate-x-0.5">→</span></button> <div class="grid gap-2 sm:grid-cols-2"><a href="/demo-fonts/StudioGeometric-Regular.otf" download="" class="group flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 transition-colors hover:border-accent" title="Download Studio Geometric Regular (.otf)"><div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-fg/5 text-[18px] leading-none text-fg group-hover:text-accent" style="font-family: ui-sans-serif, system-ui, sans-serif;">Hn</div> <div class="min-w-0 flex-1"><div class="truncate text-[12px] font-medium text-fg">Studio Geometric</div> <div class="truncate font-mono text-[10px] text-fg-subtle" data-numeric="">2.3 KB · .otf</div></div> `);
		Download($$renderer, {
			class: "size-3.5 shrink-0 text-fg-subtle group-hover:text-accent",
			"aria-hidden": "true"
		});
		$$renderer.push(`<!----></a> <a href="/demo-fonts/StudioSlab-Regular.otf" download="" class="group flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 transition-colors hover:border-accent" title="Download Studio Slab Regular (.otf)"><div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-fg/5 text-[18px] leading-none text-fg group-hover:text-accent" style="font-family: ui-serif, Georgia, serif;">Tn</div> <div class="min-w-0 flex-1"><div class="truncate text-[12px] font-medium text-fg">Studio Slab</div> <div class="truncate font-mono text-[10px] text-fg-subtle" data-numeric="">2.4 KB · .otf</div></div> `);
		Download($$renderer, {
			class: "size-3.5 shrink-0 text-fg-subtle group-hover:text-accent",
			"aria-hidden": "true"
		});
		$$renderer.push(`<!----></a></div></div></section> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		WelcomeDialog($$renderer, {
			open: !settings.welcomeDismissed,
			onclose: () => settings.dismissWelcome()
		});
		$$renderer.push(`<!----> `);
		ShortcutsDialog($$renderer, {
			open: shortcutsOpen,
			onclose: () => shortcutsOpen = false
		});
		$$renderer.push(`<!----> `);
		CreateFontDialog($$renderer, {
			open: createDialogOpen,
			onclose: () => createDialogOpen = false,
			creating,
			importing,
			ufoImporting,
			urlImporting,
			importError,
			oncreate: (input) => handleCreate(input),
			onfile: (file) => importFile(file),
			onufo: (file) => importFile(file),
			onurl: (url) => handleUrlImport(url)
		});
		$$renderer.push(`<!----> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></div>`);
	});
}
//#endregion
export { _page as default };
