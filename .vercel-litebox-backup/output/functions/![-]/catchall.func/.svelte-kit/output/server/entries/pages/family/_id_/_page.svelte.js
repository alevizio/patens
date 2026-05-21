import { n as onDestroy } from "../../../../chunks/index-server.js";
import { G as escape_html, P as snapshot, U as attr, c as ensure_array_like, d as spread_props, f as stringify, n as attr_class, r as attr_style } from "../../../../chunks/dev.js";
import { t as toast } from "../../../../chunks/toast2.svelte.js";
import { t as Icon } from "../../../../chunks/Icon.js";
import { n as Circle_check, t as Circle_alert } from "../../../../chunks/circle-alert.js";
import { n as Triangle_alert, t as Info } from "../../../../chunks/info.js";
import "../../../../chunks/navigation.js";
import { l as loadProject } from "../../../../chunks/project.js";
import { t as buildFont } from "../../../../chunks/export.js";
import { n as Input, t as Field } from "../../../../chunks/Field.js";
import { t as Plus } from "../../../../chunks/plus.js";
import { t as Arrow_left } from "../../../../chunks/arrow-left.js";
import { t as Download } from "../../../../chunks/download.js";
import { t as Layers } from "../../../../chunks/layers.js";
import { t as Button } from "../../../../chunks/Button.js";
import { t as Panel } from "../../../../chunks/Panel.js";
import { a as propagateFamilyMetadata, c as unloadSiblingFonts, i as loadSiblingFonts, n as listSiblings, o as propagateKerningClasses, r as loadFamily, s as saveFamily } from "../../../../chunks/family.js";
import { t as generateDesignMd } from "../../../../chunks/design-md.js";
import { strToU8, zipSync } from "fflate";
//#region src/lib/font/family-export.ts
/**
* Family bundle export — produces a single ZIP containing every sibling's
* compiled OTF plus a family-level DESIGN.md. Each OTF is patched at write
* time so that OS/2 weight/width/fsSelection align with the sibling's
* `familyAxes`, which is what OS font menus actually use to group styles
* under a single family name.
*
* Full STAT-table generation requires fontTools (Pyodide); for the basic
* static-family case the OS/2 + name-table approach is enough for most apps.
*/
/** Convert family axes into the OS/2 patches needed to identify a static style. */
var os2PatchFromAxes = (axes) => {
	if (!axes) return null;
	const wdthPct = axes.wdth ?? 100;
	const widthClass = Math.max(1, Math.min(9, Math.round(wdthPct / 12.5 - 3)));
	return {
		usWeightClass: axes.wght ?? 400,
		usWidthClass: widthClass,
		italic: axes.ital === 1
	};
};
/** Patch an opentype.js Font's OS/2 + name table for static-family naming. */
var patchFontForFamily = (font, familyName, styleName, axes) => {
	const patch = os2PatchFromAxes(axes);
	const os2 = font.tables?.os2;
	if (os2 && patch) {
		os2.usWeightClass = patch.usWeightClass;
		os2.usWidthClass = patch.usWidthClass;
		let fs = os2.fsSelection ?? 0;
		const ITALIC = 1;
		const BOLD = 32;
		const REGULAR = 64;
		fs = fs & ~(BOLD | 65);
		if (patch.italic) fs |= ITALIC;
		if ((axes?.wght ?? 400) >= 700) fs |= BOLD;
		if (!patch.italic && (axes?.wght ?? 400) === 400) fs |= REGULAR;
		os2.fsSelection = fs;
	}
	const names = font.names ?? void 0;
	if (names) {
		if (names.fontFamily) names.fontFamily.en = familyName;
		if (names.fontSubfamily) names.fontSubfamily.en = styleName;
		if (names.fullName) names.fullName.en = `${familyName} ${styleName}`;
		if (names.postScriptName) names.postScriptName.en = `${familyName}-${styleName}`.replace(/\s+/g, "");
	}
};
var safe = (s) => s.replace(/[^A-Za-z0-9-]+/g, "") || "Untitled";
/**
* Build a single ZIP containing each sibling's OTF (patched for family-wide
* naming + OS/2 classes) plus a family-level DESIGN.md and a flat manifest.
*/
var buildFamilyBundle = async (familyId) => {
	const family = await loadFamily(familyId);
	if (!family) return null;
	const siblings = await listSiblings(familyId);
	const files = {};
	const designLines = [`# ${family.name}\n`];
	if (family.designer) designLines.push(`Designed by ${family.designer}\n`);
	if (family.copyright) designLines.push(`${family.copyright}\n`);
	if (family.license) designLines.push(`Licensed under ${family.license}\n`);
	designLines.push("\n## Styles in this family\n");
	const familySafe = safe(family.name);
	const flattenedVfSiblings = [];
	const failedSiblings = [];
	for (const entry of siblings) {
		const project = await loadProject(entry.id);
		if (!project) continue;
		const styleName = project.metadata.styleName || "Regular";
		try {
			if ((project.axes?.length ?? 0) > 0) flattenedVfSiblings.push(styleName);
			const { font } = buildFont(project, { styleSuffix: void 0 });
			patchFontForFamily(font, family.name, styleName, project.familyAxes);
			const buffer = font.toArrayBuffer();
			const filename = `${familySafe}-${safe(styleName)}.otf`;
			files[filename] = new Uint8Array(buffer);
			designLines.push(`- **${styleName}** · ${(buffer.byteLength / 1024).toFixed(1)} KB · \`${filename}\`${(project.axes?.length ?? 0) > 0 ? " _(VF flattened to default master)_" : ""}`);
		} catch (err) {
			console.error(`buildFamilyBundle: sibling "${styleName}" failed`, err);
			failedSiblings.push(styleName);
			designLines.push(`- **${styleName}** _(build failed — skipped)_`);
		}
	}
	const seedSibling = siblings.find((s) => (s.familyAxes?.wght ?? 400) === 400 && !s.familyAxes?.ital) ?? siblings[0];
	if (seedSibling) {
		const seedProject = await loadProject(seedSibling.id);
		if (seedProject) files[`DESIGN-${familySafe}.md`] = strToU8(`${designLines.join("\n")}\n\n---\n\n${generateDesignMd(seedProject)}`);
		else files[`DESIGN-${familySafe}.md`] = strToU8(designLines.join("\n"));
	} else files[`DESIGN-${familySafe}.md`] = strToU8(designLines.join("\n"));
	return {
		zip: zipSync(files, { level: 6 }),
		familyName: family.name,
		siblingCount: siblings.length,
		flattenedVfSiblings,
		failedSiblings
	};
};
/** Convenience helper for the UI: build + download. Returns the bundle so the
*  caller can surface warnings (e.g. flattened VF siblings) in a toast. */
var downloadFamilyBundle = async (familyId) => {
	const bundle = await buildFamilyBundle(familyId);
	if (!bundle) return null;
	const blob = new Blob([bundle.zip.slice().buffer], { type: "application/zip" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `${safe(bundle.familyName)}-family-${bundle.siblingCount}styles.zip`;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1e3);
	return bundle;
};
//#endregion
//#region src/lib/font/family-audit.ts
var auditFamily = async (familyId) => {
	const family = await loadFamily(familyId);
	if (!family) return [];
	const sibs = await listSiblings(familyId);
	const projects = [];
	for (const s of sibs) {
		const p = await loadProject(s.id);
		if (p) projects.push(p);
	}
	if (projects.length === 0) return [{
		severity: "warn",
		code: "family-empty",
		message: "Family has no siblings — link an existing project or create one."
	}];
	const issues = [];
	const ref = projects[0];
	for (const p of projects.slice(1)) if (p.metrics.unitsPerEm !== ref.metrics.unitsPerEm) issues.push({
		severity: "error",
		code: "family-upm-mismatch",
		message: `"${p.metadata.styleName}" UPM ${p.metrics.unitsPerEm} ≠ "${ref.metadata.styleName}" UPM ${ref.metrics.unitsPerEm}. UPM must match across siblings.`,
		siblingId: p.id
	});
	for (const k of [
		"ascender",
		"descender",
		"capHeight",
		"xHeight"
	]) for (const p of projects.slice(1)) if (p.metrics[k] !== ref.metrics[k]) issues.push({
		severity: "warn",
		code: `family-metrics-mismatch-${k}`,
		message: `"${p.metadata.styleName}" ${k} ${p.metrics[k]} ≠ "${ref.metadata.styleName}" ${ref.metrics[k]}. Line spacing will drift across the family.`,
		siblingId: p.id
	});
	const refClassNames = new Set((ref.classes ?? []).map((c) => c.name));
	for (const p of projects.slice(1)) {
		const myNames = new Set((p.classes ?? []).map((c) => c.name));
		for (const n of refClassNames) if (!myNames.has(n)) issues.push({
			severity: "info",
			code: "family-class-missing",
			message: `"${p.metadata.styleName}" is missing kerning class \`${n}\` (defined in "${ref.metadata.styleName}").`,
			siblingId: p.id
		});
	}
	const ANCHOR_LETTERS = Array.from({ length: 26 }, (_, i) => 97 + i);
	for (const cp of ANCHOR_LETTERS) {
		const refAnchors = new Set((ref.glyphs[cp]?.anchors ?? []).map((a) => a.name));
		for (const p of projects.slice(1)) {
			const myAnchors = new Set((p.glyphs[cp]?.anchors ?? []).map((a) => a.name));
			for (const an of refAnchors) if (!myAnchors.has(an)) {
				issues.push({
					severity: "info",
					code: "family-anchor-missing",
					message: `"${p.metadata.styleName}" glyph "${String.fromCodePoint(cp)}" missing anchor \`${an}\` (present in "${ref.metadata.styleName}").`,
					siblingId: p.id
				});
				break;
			}
		}
	}
	const seen = /* @__PURE__ */ new Map();
	for (const p of projects) {
		const a = p.familyAxes;
		if (!a) continue;
		const key = `${a.wght ?? 400}-${a.ital ?? 0}-${a.wdth ?? 100}-${a.slnt ?? 0}`;
		const dup = seen.get(key);
		if (dup) issues.push({
			severity: "error",
			code: "family-axes-duplicate",
			message: `"${p.metadata.styleName}" and "${dup.metadata.styleName}" both sit at familyAxes ${key}. Adjust one so the family STAT records resolve unambiguously.`,
			siblingId: p.id
		});
		seen.set(key, p);
	}
	if (family.designer) {
		for (const p of projects) if (p.metadata.designer && p.metadata.designer !== family.designer && p.metadata.designer.trim() !== "") issues.push({
			severity: "info",
			code: "family-designer-override",
			message: `"${p.metadata.styleName}" has its own designer "${p.metadata.designer}" — overrides family "${family.designer}".`,
			siblingId: p.id
		});
	}
	return issues;
};
//#endregion
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/unlink.svelte
function Unlink($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "unlink" },
		props,
		{ iconNode: [
			["path", { "d": "m18.84 12.25 1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71" }],
			["path", { "d": "m5.17 11.75-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71" }],
			["line", {
				"x1": "8",
				"x2": "8",
				"y1": "2",
				"y2": "5"
			}],
			["line", {
				"x1": "2",
				"x2": "5",
				"y1": "8",
				"y2": "8"
			}],
			["line", {
				"x1": "16",
				"x2": "16",
				"y1": "19",
				"y2": "22"
			}],
			["line", {
				"x1": "19",
				"x2": "22",
				"y1": "16",
				"y2": "16"
			}]
		] }
	]));
}
//#endregion
//#region src/routes/family/[id]/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { data } = $$props;
		let family = snapshot(data.family);
		let siblings = [...data.siblings];
		let saving = false;
		let issues = [];
		const refreshAudit = async () => {
			issues = await auditFamily(data.family.id);
		};
		const refresh = async () => {
			const f = await loadFamily(data.family.id);
			if (f) family = f;
			siblings = await listSiblings(data.family.id);
			await refreshAudit();
		};
		let designerDraft = data.family.designer ?? "";
		let copyrightDraft = data.family.copyright ?? "";
		let licenseDraft = data.family.license ?? "";
		const saveFamilyEdits = async () => {
			if (saving) return;
			saving = true;
			try {
				family = {
					...family,
					designer: designerDraft.trim() || void 0,
					copyright: copyrightDraft.trim() || void 0,
					license: licenseDraft.trim() || void 0
				};
				await saveFamily(family);
				const result = await propagateFamilyMetadata(family.id);
				const baseMsg = `Family saved · propagated to ${result.updated} sibling${result.updated === 1 ? "" : "s"}.`;
				toast.success(baseMsg);
				if (result.skipped.length > 0) toast.warn(`Skipped locked sibling${result.skipped.length === 1 ? "" : "s"}: ${result.skipped.join(", ")}. Unlock to apply.`);
				await refresh();
			} finally {
				saving = false;
			}
		};
		let newStyleName = "Italic";
		let newWght = 400;
		let newItal = 1;
		let newWdth = 100;
		let templateId = "";
		let newSlantMode = "blank";
		let newSlantDeg = 12;
		const fixableCodes = new Set([
			"family-upm-mismatch",
			"family-metrics-mismatch-ascender",
			"family-metrics-mismatch-descender",
			"family-metrics-mismatch-capHeight",
			"family-metrics-mismatch-xHeight",
			"family-anchor-missing",
			"family-class-missing"
		]);
		const fixLabel = (code) => {
			if (code === "family-upm-mismatch") return "Sync UPM";
			if (code.startsWith("family-metrics-mismatch-")) return "Sync metrics";
			if (code === "family-anchor-missing") return "Copy anchors";
			if (code === "family-class-missing") return "Copy class";
			return "Fix";
		};
		let regularClassCount = 0;
		let propagating = false;
		const handlePropagateClasses = async () => {
			if (propagating) return;
			propagating = true;
			try {
				const updated = await propagateKerningClasses(data.family.id);
				toast.success(updated > 0 ? `Pushed ${regularClassCount} class${regularClassCount === 1 ? "" : "es"} to ${updated} sibling${updated === 1 ? "" : "s"}.` : "No other siblings to update.");
			} finally {
				propagating = false;
			}
		};
		let compareOpen = false;
		let compareLoading = false;
		let siblingFonts = /* @__PURE__ */ new Map();
		let compareText = "Hamburgefonstiv";
		let compareSize = 48;
		const toggleCompare = async () => {
			if (compareLoading) return;
			if (compareOpen) {
				compareOpen = false;
				return;
			}
			compareLoading = true;
			try {
				siblingFonts = await loadSiblingFonts(data.family.id);
				compareOpen = true;
			} finally {
				compareLoading = false;
			}
		};
		onDestroy(() => {
			unloadSiblingFonts();
		});
		let exporting = false;
		const handleExportBundle = async () => {
			if (exporting) return;
			exporting = true;
			try {
				const bundle = await downloadFamilyBundle(data.family.id);
				if (!bundle) {
					toast.error("Family bundle failed.");
					return;
				}
				toast.success(`Family bundle exported (${(bundle.zip.byteLength / 1024).toFixed(1)} KB).`);
				if (bundle.flattenedVfSiblings.length > 0) toast.warn(`Flattened to static: ${bundle.flattenedVfSiblings.join(", ")}. Export those siblings via their project /export route for true VF.`);
				if (bundle.failedSiblings.length > 0) toast.error(`Failed to build: ${bundle.failedSiblings.join(", ")}. These siblings are missing from the ZIP — check their project audit.`);
			} catch (err) {
				toast.error("Export failed: " + (err instanceof Error ? err.message : String(err)));
			} finally {
				exporting = false;
			}
		};
		const axisChips = (a) => {
			if (!a) return [];
			const out = [];
			if (a.wght !== void 0) out.push(`wght ${a.wght}`);
			if (a.wdth !== void 0 && a.wdth !== 100) out.push(`wdth ${a.wdth}`);
			if (a.ital) out.push("italic");
			if (a.slnt !== void 0 && a.slnt !== 0) out.push(`slnt ${a.slnt}°`);
			return out;
		};
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			$$renderer.push(`<div class="mx-auto max-w-5xl px-6 py-12"><a href="/" class="mb-6 inline-flex items-center gap-1.5 text-[12px] text-fg-muted hover:text-fg">`);
			Arrow_left($$renderer, { class: "size-3.5" });
			$$renderer.push(`<!----> Back to projects</a> <header class="mb-8 flex items-start gap-3"><div class="mt-1 flex size-9 items-center justify-center rounded-md bg-accent-soft text-accent">`);
			Layers($$renderer, { class: "size-4" });
			$$renderer.push(`<!----></div> <div class="flex-1"><div class="text-[10px] uppercase tracking-wider text-fg-subtle">Family</div> <input class="block w-full border-0 bg-transparent p-0 text-2xl font-semibold tracking-tight text-fg outline-none focus:ring-1 focus:ring-accent"${attr("value", family.name)}/> <p class="mt-1 text-sm text-fg-muted">${escape_html(siblings.length)} style${escape_html(siblings.length === 1 ? "" : "s")} in this family. Family-level
				designer / license edits fan out to every sibling.</p></div> <div class="flex flex-col items-end gap-1.5">`);
			{
				function icon($$renderer) {
					Download($$renderer, { class: "size-3.5" });
				}
				Button($$renderer, {
					onclick: handleExportBundle,
					disabled: exporting || siblings.length === 0,
					icon,
					children: ($$renderer) => {
						$$renderer.push(`<!---->${escape_html(exporting ? "Bundling…" : `Export family ZIP (${siblings.length})`)}`);
					},
					$$slots: {
						icon: true,
						default: true
					}
				});
			}
			$$renderer.push(`<!----> <button type="button" class="text-[11px] text-fg-subtle hover:text-danger">Delete family</button></div></header> <div class="flex flex-col gap-6">`);
			Panel($$renderer, {
				children: ($$renderer) => {
					$$renderer.push(`<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Family-level metadata</h2> <div class="grid gap-2 md:grid-cols-3">`);
					Field($$renderer, {
						label: "Designer",
						children: ($$renderer) => {
							Input($$renderer, {
								onblur: saveFamilyEdits,
								placeholder: "Your Name",
								get value() {
									return designerDraft;
								},
								set value($$value) {
									designerDraft = $$value;
									$$settled = false;
								}
							});
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----> `);
					Field($$renderer, {
						label: "Copyright",
						children: ($$renderer) => {
							Input($$renderer, {
								onblur: saveFamilyEdits,
								placeholder: "© 2026 …",
								get value() {
									return copyrightDraft;
								},
								set value($$value) {
									copyrightDraft = $$value;
									$$settled = false;
								}
							});
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----> `);
					Field($$renderer, {
						label: "License",
						children: ($$renderer) => {
							Input($$renderer, {
								onblur: saveFamilyEdits,
								placeholder: "SIL OFL 1.1",
								get value() {
									return licenseDraft;
								},
								set value($$value) {
									licenseDraft = $$value;
									$$settled = false;
								}
							});
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----></div> <p class="mt-2 text-[11px] text-fg-subtle">Saved fields propagate to every sibling's name-table metadata on the next blur or
			explicit save.</p>`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			Panel($$renderer, {
				children: ($$renderer) => {
					$$renderer.push(`<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Siblings</h2> `);
					if (siblings.length === 0) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<p class="text-[12px] text-fg-subtle">No siblings yet. Use the form below to clone an existing project into this family,
				or visit any project and link it from its Stats popover (coming next).</p>`);
					} else {
						$$renderer.push("<!--[-1-->");
						$$renderer.push(`<ul class="grid gap-2 md:grid-cols-2"><!--[-->`);
						const each_array = ensure_array_like(siblings);
						for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
							let s = each_array[$$index_1];
							const chips = axisChips(s.familyAxes);
							$$renderer.push(`<li class="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border border-border bg-surface-2/40 p-3"><div class="flex size-12 items-center justify-center overflow-hidden rounded bg-canvas">`);
							if (s.thumbnail) {
								$$renderer.push("<!--[0-->");
								$$renderer.push(`<svg${attr("viewBox", s.thumbnail.viewBox)} width="44" height="44" preserveAspectRatio="xMidYMid meet" style="transform: scaleY(-1);" aria-hidden="true"><path${attr("d", s.thumbnail.path)} fill="currentColor" fill-rule="evenodd"></path></svg>`);
							} else {
								$$renderer.push("<!--[-1-->");
								$$renderer.push(`<span class="text-2xl font-mono text-fg-muted">H</span>`);
							}
							$$renderer.push(`<!--]--></div> <div class="min-w-0"><a${attr("href", `/project/${stringify(s.id)}/edit`)} class="block truncate text-[13px] font-semibold text-fg hover:text-accent">${escape_html(s.name)}</a> <div class="flex flex-wrap gap-1 mt-0.5"><!--[-->`);
							const each_array_1 = ensure_array_like(chips);
							for (let $$index = 0, $$length = each_array_1.length; $$index < $$length; $$index++) {
								let c = each_array_1[$$index];
								$$renderer.push(`<span class="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-fg-muted" data-numeric="">${escape_html(c)}</span>`);
							}
							$$renderer.push(`<!--]--> `);
							if (chips.length === 0) {
								$$renderer.push("<!--[0-->");
								$$renderer.push(`<span class="text-[10px] text-fg-subtle">no familyAxes set</span>`);
							} else $$renderer.push("<!--[-1-->");
							$$renderer.push(`<!--]--> <span class="rounded bg-surface-2/60 px-1.5 py-0.5 font-mono text-[10px] text-fg-subtle" data-numeric="" title="Drawn glyphs · last sealed version">${escape_html(s.glyphCount)} drawn${escape_html(s.lastSealedVersion ? ` · v${s.lastSealedVersion}` : "")}</span> `);
							if ((s.editsToday ?? 0) > 0) {
								$$renderer.push("<!--[0-->");
								$$renderer.push(`<span class="rounded bg-accent/15 px-1.5 py-0.5 font-mono text-[10px] font-medium text-accent" data-numeric="" title="Glyphs edited in last 24h">${escape_html(s.editsToday)} today</span>`);
							} else $$renderer.push("<!--[-1-->");
							$$renderer.push(`<!--]--></div></div> <button type="button" class="rounded p-1 text-fg-subtle hover:bg-warn/10 hover:text-warn" aria-label="Unlink from family" title="Unlink from family">`);
							Unlink($$renderer, { class: "size-3.5" });
							$$renderer.push(`<!----></button></li>`);
						}
						$$renderer.push(`<!--]--></ul>`);
					}
					$$renderer.push(`<!--]-->`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			Panel($$renderer, {
				children: ($$renderer) => {
					$$renderer.push(`<div class="mb-3 flex items-baseline justify-between gap-2"><h2 class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Family audit</h2> `);
					if (issues.length === 0 && siblings.length > 0) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<span class="inline-flex items-center gap-1 text-[11px] text-success">`);
						Circle_check($$renderer, { class: "size-3" });
						$$renderer.push(`<!----> All consistent</span>`);
					} else {
						$$renderer.push("<!--[-1-->");
						$$renderer.push(`<span class="font-mono text-[11px] text-fg-subtle" data-numeric="">${escape_html(issues.filter((i) => i.severity === "error").length)} err ·
					${escape_html(issues.filter((i) => i.severity === "warn").length)} warn ·
					${escape_html(issues.filter((i) => i.severity === "info").length)} info</span>`);
					}
					$$renderer.push(`<!--]--></div> <p class="mb-3 text-[12px] text-fg-subtle">Cross-style consistency checks: UPM, vertical metrics, kerning class structure, anchor
			naming, duplicate familyAxes positions.</p> `);
					if (issues.length > 0) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<ul class="grid gap-1"><!--[-->`);
						const each_array_2 = ensure_array_like(issues.slice(0, 20));
						for (let idx = 0, $$length = each_array_2.length; idx < $$length; idx++) {
							let i = each_array_2[idx];
							$$renderer.push(`<li class="flex items-start gap-2 rounded-md border border-border bg-surface-2/40 px-3 py-2"><span class="mt-0.5">`);
							if (i.severity === "error") {
								$$renderer.push("<!--[0-->");
								Circle_alert($$renderer, { class: "size-3.5 text-danger" });
							} else if (i.severity === "warn") {
								$$renderer.push("<!--[1-->");
								Triangle_alert($$renderer, { class: "size-3.5 text-warn" });
							} else {
								$$renderer.push("<!--[-1-->");
								Info($$renderer, { class: "size-3.5 text-accent" });
							}
							$$renderer.push(`<!--]--></span> <div class="min-w-0 flex-1"><div class="text-[12px] text-fg">${escape_html(i.message)}</div> <div class="mt-0.5 font-mono text-[10px] text-fg-subtle">${escape_html(i.code)}</div></div> `);
							if (i.siblingId && fixableCodes.has(i.code)) {
								$$renderer.push("<!--[0-->");
								$$renderer.push(`<button type="button" class="rounded border border-accent/40 bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent hover:border-accent hover:bg-accent/15" title="Sync the offending field from the Regular sibling">${escape_html(fixLabel(i.code))}</button>`);
							} else $$renderer.push("<!--[-1-->");
							$$renderer.push(`<!--]--> `);
							if (i.siblingId) {
								$$renderer.push("<!--[0-->");
								$$renderer.push(`<a${attr("href", `/project/${stringify(i.siblingId)}/edit`)} class="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-fg-muted hover:border-accent hover:text-accent">Open →</a>`);
							} else $$renderer.push("<!--[-1-->");
							$$renderer.push(`<!--]--></li>`);
						}
						$$renderer.push(`<!--]--> `);
						if (issues.length > 20) {
							$$renderer.push("<!--[0-->");
							$$renderer.push(`<li class="text-[11px] text-fg-subtle">+${escape_html(issues.length - 20)} more issues — fix these first.</li>`);
						} else $$renderer.push("<!--[-1-->");
						$$renderer.push(`<!--]--></ul>`);
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]-->`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			if (siblings.length > 1) {
				$$renderer.push("<!--[0-->");
				Panel($$renderer, {
					children: ($$renderer) => {
						$$renderer.push(`<div class="mb-2 flex items-baseline justify-between gap-2"><h2 class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Kerning class structure</h2> <span class="font-mono text-[11px] text-fg-muted" data-numeric="">${escape_html(regularClassCount)} class${escape_html(regularClassCount === 1 ? "" : "es")} in Regular</span></div> <p class="mb-3 text-[12px] text-fg-subtle">Class <em>definitions</em> (names + members) should match across siblings so kerning
				groups stay aligned. Push the Regular sibling's class structure to every other
				sibling — pair values stay per-style.</p> <div class="flex flex-wrap items-center gap-2">`);
						Button($$renderer, {
							density: "sm",
							variant: "secondary",
							onclick: handlePropagateClasses,
							disabled: propagating || regularClassCount === 0,
							loading: propagating,
							children: ($$renderer) => {
								$$renderer.push(`<!---->${escape_html(propagating ? "Pushing…" : `Push ${regularClassCount} class${regularClassCount === 1 ? "" : "es"} to ${siblings.length - 1} sibling${siblings.length - 1 === 1 ? "" : "s"}`)}`);
							},
							$$slots: { default: true }
						});
						$$renderer.push(`<!----> `);
						$$renderer.push("<!--[-1-->");
						$$renderer.push(`<!--]--></div>`);
					},
					$$slots: { default: true }
				});
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (siblings.length > 1) {
				$$renderer.push("<!--[0-->");
				Panel($$renderer, {
					children: ($$renderer) => {
						$$renderer.push(`<div class="mb-2 flex items-baseline justify-between gap-2"><h2 class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Side-by-side proof</h2> `);
						Button($$renderer, {
							density: "sm",
							variant: "ghost",
							onclick: toggleCompare,
							loading: compareLoading,
							children: ($$renderer) => {
								$$renderer.push(`<!---->${escape_html(compareOpen ? "Hide" : compareLoading ? "Building…" : "Render all siblings")}`);
							},
							$$slots: { default: true }
						});
						$$renderer.push(`<!----></div> <p class="mb-3 text-[12px] text-fg-subtle">Builds every sibling's OTF in-browser and renders the same string in each — the
				canonical foundry proof for evaluating a family's consistency. Updates whenever you
				rebuild a sibling and re-open this panel.</p> `);
						if (compareOpen) {
							$$renderer.push("<!--[0-->");
							$$renderer.push(`<div class="mb-2 flex flex-wrap items-center gap-1 text-[10px]"><span class="text-fg-subtle">Quick proofs:</span> <!--[-->`);
							const each_array_3 = ensure_array_like([
								"Hamburgefonstiv",
								"HOHOHO nonono",
								"AVAVAV ToToTo",
								"The quick brown fox",
								"abcdefghijklmnopqrstuvwxyz",
								"Wafer\xA0pillow\xA0kerning\xA0blot"
							]);
							for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
								let preset = each_array_3[$$index_3];
								$$renderer.push(`<button type="button" class="rounded border border-border bg-surface px-1.5 py-0.5 text-fg-muted hover:border-accent hover:text-accent" title="Replace text with this proof string">${escape_html(preset.length > 24 ? preset.slice(0, 24) + "…" : preset)}</button>`);
							}
							$$renderer.push(`<!--]--></div> <div class="mb-3 grid grid-cols-[1fr_auto] items-center gap-2"><input${attr("value", compareText)} placeholder="Hamburgefonstiv" class="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-[13px] text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"/> <label class="flex items-center gap-2 text-[11px] text-fg-muted"><span>Size</span> <input type="range" min="16" max="120" step="1"${attr("value", compareSize)} class="w-24 accent-accent"/> <span class="w-10 text-right font-mono text-[10px]" data-numeric="">${escape_html(compareSize)}px</span></label></div> <div class="grid gap-3 rounded-md border border-border bg-canvas p-4"><!--[-->`);
							const each_array_4 = ensure_array_like(siblings);
							for (let $$index_4 = 0, $$length = each_array_4.length; $$index_4 < $$length; $$index_4++) {
								let s = each_array_4[$$index_4];
								const family = siblingFonts.get(s.id);
								$$renderer.push(`<div><div class="mb-1 flex items-baseline justify-between gap-2 text-[10px] font-mono text-fg-subtle" data-numeric=""><span>${escape_html(s.name)}</span> <span>`);
								if (s.familyAxes?.wght) {
									$$renderer.push("<!--[0-->");
									$$renderer.push(`wght ${escape_html(s.familyAxes.wght)}`);
								} else $$renderer.push("<!--[-1-->");
								$$renderer.push(`<!--]-->`);
								if (s.familyAxes?.ital) {
									$$renderer.push("<!--[0-->");
									$$renderer.push(`· italic`);
								} else $$renderer.push("<!--[-1-->");
								$$renderer.push(`<!--]--></span></div> <div class="text-fg"${attr_style(`font-family: '${stringify(family)}', sans-serif; font-size: ${stringify(compareSize)}px; line-height: 1.2;`)}>${escape_html(compareText)}</div></div>`);
							}
							$$renderer.push(`<!--]--></div>`);
						} else $$renderer.push("<!--[-1-->");
						$$renderer.push(`<!--]-->`);
					},
					$$slots: { default: true }
				});
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			Panel($$renderer, {
				children: ($$renderer) => {
					$$renderer.push(`<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Add sibling style</h2> <p class="mb-3 text-[12px] text-fg-subtle">Clones an existing sibling to seed the new style — keeps UPM, vertical metrics, kerning
			class structure, and anchors; resets all glyph contours to empty so you draw the new
			style fresh.</p> <div class="mb-3 inline-flex rounded-md border border-border bg-surface p-0.5"><button type="button"${attr_class(`rounded px-2 py-0.5 text-[11px] ${stringify(newSlantMode === "blank" ? "bg-accent-soft text-accent" : "text-fg-muted hover:text-fg")}`)} title="Start from empty glyph contours">Blank clone</button> <button type="button"${attr_class(`rounded px-2 py-0.5 text-[11px] ${stringify(newSlantMode === "slant" ? "bg-accent-soft text-accent" : "text-fg-muted hover:text-fg")}`)} title="Pre-fill outlines by slanting the template — useful for italic siblings">Slant from template</button></div> `);
					if (newSlantMode === "slant") {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<div class="mb-3 rounded-md border border-dashed border-accent/30 bg-accent-soft/30 px-3 py-2 text-[12px]"><label class="flex items-center gap-2"><span class="font-medium text-fg-muted">Slant angle</span> <input type="range" min="6" max="18" step="1"${attr("value", newSlantDeg)} class="flex-1 accent-accent"/> <span class="font-mono text-[11px]" data-numeric="">${escape_html(newSlantDeg)}°</span></label> <p class="mt-1 text-[11px] text-fg-subtle">Shears every contour and anchor by <code>tan(${escape_html(newSlantDeg)}°)</code> ≈ <span data-numeric="">${escape_html(Math.tan(newSlantDeg * Math.PI / 180).toFixed(3))}</span>.
					Glyphs land as drafts so you can refine. Typical italic = 12°.</p></div>`);
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]--> <div class="mb-3 flex flex-wrap gap-1.5"><span class="text-[11px] font-medium text-fg-muted">Preset:</span> <button type="button" class="rounded-md border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium hover:border-accent hover:text-accent">Italic</button> <button type="button" class="rounded-md border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium hover:border-accent hover:text-accent">Bold</button> <button type="button" class="rounded-md border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium hover:border-accent hover:text-accent">Bold Italic</button> <button type="button" class="rounded-md border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium hover:border-accent hover:text-accent">Light</button></div> <form class="grid gap-3"><div class="grid gap-2 md:grid-cols-2">`);
					Field($$renderer, {
						label: "Template (clone from)",
						children: ($$renderer) => {
							$$renderer.select({
								value: templateId,
								class: "w-full rounded-md border border-border bg-surface px-2 py-1.5 text-[12px] text-fg outline-none focus:border-accent"
							}, ($$renderer) => {
								$$renderer.push(`<!--[-->`);
								const each_array_5 = ensure_array_like(siblings);
								for (let $$index_5 = 0, $$length = each_array_5.length; $$index_5 < $$length; $$index_5++) {
									let s = each_array_5[$$index_5];
									$$renderer.option({ value: s.id }, ($$renderer) => {
										$$renderer.push(`${escape_html(s.name)}`);
									});
								}
								$$renderer.push(`<!--]-->`);
								if (siblings.length === 0) {
									$$renderer.push("<!--[0-->");
									$$renderer.option({ value: "" }, ($$renderer) => {
										$$renderer.push(`No siblings — link an existing project first`);
									});
								} else $$renderer.push("<!--[-1-->");
								$$renderer.push(`<!--]-->`);
							});
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----> `);
					Field($$renderer, {
						label: "Style name",
						children: ($$renderer) => {
							Input($$renderer, {
								placeholder: "Italic",
								get value() {
									return newStyleName;
								},
								set value($$value) {
									newStyleName = $$value;
									$$settled = false;
								}
							});
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----></div> <div class="grid gap-2 md:grid-cols-[1fr_1fr_1fr]">`);
					Field($$renderer, {
						label: "wght (100–900)",
						children: ($$renderer) => {
							Input($$renderer, {
								type: "number",
								get value() {
									return newWght;
								},
								set value($$value) {
									newWght = $$value;
									$$settled = false;
								}
							});
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----> `);
					Field($$renderer, {
						label: "wdth (% normal)",
						children: ($$renderer) => {
							Input($$renderer, {
								type: "number",
								get value() {
									return newWdth;
								},
								set value($$value) {
									newWdth = $$value;
									$$settled = false;
								}
							});
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----> `);
					Field($$renderer, {
						label: "ital",
						children: ($$renderer) => {
							$$renderer.select({
								value: newItal,
								class: "w-full rounded-md border border-border bg-surface px-2 py-1.5 text-[12px] text-fg outline-none focus:border-accent"
							}, ($$renderer) => {
								$$renderer.option({ value: 0 }, ($$renderer) => {
									$$renderer.push(`0 — upright`);
								});
								$$renderer.option({ value: 1 }, ($$renderer) => {
									$$renderer.push(`1 — italic`);
								});
							});
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----></div> <div>`);
					{
						function icon($$renderer) {
							Plus($$renderer, { class: "size-3.5" });
						}
						Button($$renderer, {
							type: "submit",
							density: "sm",
							disabled: true,
							icon,
							children: ($$renderer) => {
								$$renderer.push(`<!---->Create sibling`);
							},
							$$slots: {
								icon: true,
								default: true
							}
						});
					}
					$$renderer.push(`<!----></div></form>`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----></div></div>`);
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
export { _page as default };
