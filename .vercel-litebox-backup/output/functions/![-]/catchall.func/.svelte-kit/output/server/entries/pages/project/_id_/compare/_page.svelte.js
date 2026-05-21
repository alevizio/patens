import { n as onDestroy } from "../../../../../chunks/index-server.js";
import { G as escape_html, U as attr, c as ensure_array_like, f as stringify, n as attr_class, o as derived, r as attr_style } from "../../../../../chunks/dev.js";
import "../../../../../chunks/toast2.svelte.js";
import "../../../../../chunks/project.js";
import { t as projectStore } from "../../../../../chunks/project.svelte.js";
import { t as Eye } from "../../../../../chunks/eye.js";
import { t as Layers } from "../../../../../chunks/layers.js";
import { t as Panel } from "../../../../../chunks/Panel.js";
import { t as Eye_off } from "../../../../../chunks/eye-off.js";
import { t as Trash_2 } from "../../../../../chunks/trash-2.js";
import { t as Cloud_upload } from "../../../../../chunks/cloud-upload.js";
import "../../../../../chunks/family.js";
import { t as LoadingPanel } from "../../../../../chunks/LoadingPanel.js";
//#region src/routes/project/[id]/compare/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const project = derived(() => projectStore.project);
		const metrics = derived(() => project()?.metrics);
		let cp = 72;
		let layers = [];
		const codepointHex = derived(() => `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`);
		const charPreview = derived(() => cp > 32 && cp < 65536 ? String.fromCodePoint(cp) : "");
		const targetUpm = derived(() => Math.max(1e3, ...layers.map((l) => l.upm)));
		const viewBox = derived(() => {
			const upm = targetUpm();
			const top = Math.max(...layers.map((l) => l.ascender * (upm / l.upm)), upm * .8);
			const bottom = Math.min(...layers.map((l) => l.descender * (upm / l.upm)), -upm * .2);
			const width = Math.max(...layers.map((l) => l.advanceWidth * (upm / l.upm)), upm);
			const pad = Math.round(width * .1);
			return `${-pad} ${-top} ${width + pad * 2} ${top - bottom}`;
		});
		const guideScale = derived(() => metrics() ? targetUpm() / metrics().unitsPerEm : 1);
		const drawnGlyphs = derived(() => {
			if (!project()) return [];
			return Object.values(project().glyphs).filter((g) => g.contours.length > 0).sort((a, b) => a.codepoint - b.codepoint);
		});
		onDestroy(() => {
			layers = [];
		});
		if (!project() || !metrics()) {
			$$renderer.push("<!--[0-->");
			LoadingPanel($$renderer, { label: "Loading compare" });
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div class="relative h-full overflow-auto" role="application"><div class="mx-auto flex max-w-5xl flex-col gap-6 p-6"><header class="flex items-start gap-3"><div class="mt-1 flex size-9 items-center justify-center rounded-md bg-accent-soft text-accent">`);
			Layers($$renderer, { class: "size-4" });
			$$renderer.push(`<!----></div> <div><h1 class="text-xl font-semibold tracking-tight">Compare</h1> <p class="text-sm text-fg-muted">Overlay glyph outlines across your project, family siblings, and any
						reference font. Drop an <code>.otf</code> / <code>.ttf</code> anywhere on
						this page to add it as a layer.</p></div></header> `);
			Panel($$renderer, {
				children: ($$renderer) => {
					$$renderer.push(`<div class="mb-3 flex items-baseline justify-between gap-3"><h2 class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Glyph</h2> <span class="font-mono text-[11px] text-fg-subtle" data-numeric="">${escape_html(codepointHex())} `);
					if (charPreview()) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`· "${escape_html(charPreview())}"`);
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]--></span></div> <div class="flex flex-wrap gap-1"><!--[-->`);
					const each_array = ensure_array_like(drawnGlyphs());
					for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
						let g = each_array[$$index];
						$$renderer.push(`<button type="button"${attr_class(`size-8 rounded border text-center font-mono text-[12px] transition-colors ${stringify(cp === g.codepoint ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface text-fg-muted hover:border-accent")}`)}${attr("title", `${stringify(g.name)} · ${stringify(`U+${g.codepoint.toString(16).toUpperCase().padStart(4, "0")}`)}`)}>`);
						if (g.codepoint > 32 && g.codepoint < 65536) {
							$$renderer.push("<!--[0-->");
							$$renderer.push(`${escape_html(String.fromCodePoint(g.codepoint))}`);
						} else {
							$$renderer.push("<!--[-1-->");
							$$renderer.push(`·`);
						}
						$$renderer.push(`<!--]--></button>`);
					}
					$$renderer.push(`<!--]--> `);
					if (drawnGlyphs().length === 0) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<span class="text-[12px] text-fg-subtle">No drawn glyphs in this project yet.</span>`);
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]--></div>`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			Panel($$renderer, {
				padding: "none",
				children: ($$renderer) => {
					$$renderer.push(`<div class="relative grid min-h-[480px] grid-cols-[1fr_280px] divide-x divide-border"><div class="overflow-hidden bg-canvas p-6">`);
					if (layers.length === 0) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<div class="flex h-full items-center justify-center text-center text-[12px] text-fg-subtle"><div>Pick a glyph above, or drop a reference <code>.otf</code> / <code>.ttf</code> anywhere on this page.</div></div>`);
					} else {
						$$renderer.push("<!--[-1-->");
						$$renderer.push(`<svg${attr("viewBox", viewBox())} class="h-full w-full" style="transform: scaleY(-1);" preserveAspectRatio="xMidYMid meet" aria-label="Glyph overlay comparison"><line${attr("x1", -1e5)}${attr("x2", 1e5)}${attr("y1", 0)}${attr("y2", 0)} stroke="currentColor" stroke-opacity="0.15" stroke-width="2" vector-effect="non-scaling-stroke"></line><line${attr("x1", -1e5)}${attr("x2", 1e5)}${attr("y1", metrics().capHeight * guideScale())}${attr("y2", metrics().capHeight * guideScale())} stroke="currentColor" stroke-opacity="0.08" stroke-width="1" vector-effect="non-scaling-stroke"></line><line${attr("x1", -1e5)}${attr("x2", 1e5)}${attr("y1", metrics().xHeight * guideScale())}${attr("y2", metrics().xHeight * guideScale())} stroke="currentColor" stroke-opacity="0.08" stroke-width="1" vector-effect="non-scaling-stroke"></line><!--[-->`);
						const each_array_1 = ensure_array_like(layers);
						for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
							let layer = each_array_1[$$index_1];
							if (layer.visible) {
								$$renderer.push("<!--[0-->");
								const s = targetUpm() / layer.upm;
								const ys = layer.yDir === "down" ? -s : s;
								$$renderer.push(`<g${attr("transform", `scale(${stringify(s)} ${stringify(ys)})`)}${attr("opacity", layer.opacity)}><path${attr("d", layer.pathD)}${attr("fill", layer.mode === "stroke" ? "none" : layer.color)}${attr("stroke", layer.mode === "fill" ? "none" : layer.color)} stroke-width="2" vector-effect="non-scaling-stroke" fill-rule="evenodd"></path></g>`);
							} else $$renderer.push("<!--[-1-->");
							$$renderer.push(`<!--]-->`);
						}
						$$renderer.push(`<!--]--></svg>`);
					}
					$$renderer.push(`<!--]--></div> <div class="flex flex-col gap-2 overflow-y-auto p-3"><div class="mb-1 flex items-center justify-between"><span class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Layers (${escape_html(layers.length)})</span> <label class="inline-flex cursor-pointer items-center gap-1 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-fg-muted hover:border-accent hover:text-accent" title="Add a reference font as a comparison layer">`);
					Cloud_upload($$renderer, { class: "size-3" });
					$$renderer.push(`<!----> Add font <input type="file" accept=".otf,.ttf,.woff,.woff2" class="hidden"/></label></div> `);
					if (layers.length === 0) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<p class="text-[11px] text-fg-subtle">Layers appear once you pick a drawn glyph.</p>`);
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]--> <!--[-->`);
					const each_array_2 = ensure_array_like(layers);
					for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
						let layer = each_array_2[$$index_2];
						$$renderer.push(`<div${attr_class(`rounded-md border border-border bg-surface-2/40 transition-colors ${stringify(layer.visible ? "" : "opacity-50")}`)}><div class="flex items-start gap-2 px-2.5 pt-2"><button type="button" class="mt-1 size-3 shrink-0 rounded-sm border transition-transform hover:scale-110"${attr_style(`background-color: ${stringify(layer.mode !== "stroke" ? layer.color : "transparent")}; border-color: ${stringify(layer.color)};`)}${attr("title", `Rendering: ${stringify(layer.mode)}. Click to cycle fill / stroke / both.`)} aria-label="Toggle layer rendering mode"></button> <div class="min-w-0 flex-1 leading-tight"><div class="truncate text-[12px] font-medium text-fg">${escape_html(layer.label)}</div> <div class="truncate text-[10px] text-fg-subtle">${escape_html(layer.sublabel)}</div></div> <button type="button" class="-mr-1 rounded p-1 text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg" aria-label="Toggle visibility"${attr("title", layer.visible ? "Hide this layer" : "Show this layer")}>`);
						if (layer.visible) {
							$$renderer.push("<!--[0-->");
							Eye($$renderer, { class: "size-3.5" });
						} else {
							$$renderer.push("<!--[-1-->");
							Eye_off($$renderer, { class: "size-3.5" });
						}
						$$renderer.push(`<!--]--></button> `);
						if (layer.id.startsWith("ref-")) {
							$$renderer.push("<!--[0-->");
							$$renderer.push(`<button type="button" class="-mr-1 rounded p-1 text-fg-subtle transition-colors hover:bg-danger/10 hover:text-danger" aria-label="Remove reference layer" title="Remove this reference layer">`);
							Trash_2($$renderer, { class: "size-3.5" });
							$$renderer.push(`<!----></button>`);
						} else $$renderer.push("<!--[-1-->");
						$$renderer.push(`<!--]--></div> <div class="flex items-baseline gap-3 px-2.5 pt-1 font-mono text-[10px] text-fg-subtle" data-numeric=""><span>adv <span class="text-fg">${escape_html(layer.advanceWidth)}</span></span> <span>UPM <span class="text-fg">${escape_html(layer.upm)}</span></span></div> <label class="mt-2 flex items-center gap-2 border-t border-border/60 px-2.5 py-1.5 text-[10px] text-fg-subtle"><span class="w-10">opacity</span> <input type="range" min="0.1" max="1" step="0.05"${attr("value", layer.opacity)} class="flex-1 accent-accent"/> <span class="w-6 text-right font-mono" data-numeric="">${escape_html(Math.round(layer.opacity * 100))}</span></label></div>`);
					}
					$$renderer.push(`<!--]--></div></div>`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----></div> `);
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div>`);
		}
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
export { _page as default };
