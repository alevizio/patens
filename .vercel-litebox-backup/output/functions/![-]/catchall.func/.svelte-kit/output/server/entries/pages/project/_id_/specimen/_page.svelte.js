import { G as escape_html, U as attr, c as ensure_array_like, f as stringify, l as head, n as attr_class, o as derived, r as attr_style } from "../../../../../chunks/dev.js";
import { t as projectStore } from "../../../../../chunks/project.svelte.js";
import { t as previewStore } from "../../../../../chunks/preview.svelte.js";
import { t as LoadingPanel } from "../../../../../chunks/LoadingPanel.js";
//#region src/routes/project/[id]/specimen/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const project = derived(() => projectStore.project);
		const drawnGlyphs = derived(() => {
			if (!project()) return [];
			return Object.values(project().glyphs).filter((g) => g.contours.length > 0 || g.components && g.components.length > 0).sort((a, b) => a.codepoint - b.codepoint);
		});
		const PANGRAMS = [
			"The quick brown fox jumps over the lazy dog",
			"Pack my box with five dozen liquor jugs",
			"Sphinx of black quartz, judge my vow",
			"How vexingly quick daft zebras jump"
		];
		const DEFAULT_PARAGRAPH = `In typography, a typeface is a design of letters, numbers and other symbols, to be used in printing or for electronic display. Most typefaces include variations in size, weight, slope, width — letting designers express texture, hierarchy, and voice across a single coherent system.`;
		const PARAGRAPH = derived(() => projectStore.project?.samples?.paragraph?.trim() || DEFAULT_PARAGRAPH);
		const today = (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric"
		});
		const SECTIONS = [
			{
				id: "cover",
				label: "Cover"
			},
			{
				id: "design-notes",
				label: "Design notes"
			},
			{
				id: "character-set",
				label: "Character set"
			},
			{
				id: "display",
				label: "Display"
			},
			{
				id: "waterfall",
				label: "Waterfall"
			},
			{
				id: "paragraph",
				label: "Paragraph"
			},
			{
				id: "pangrams",
				label: "Pangrams"
			},
			{
				id: "colophon",
				label: "Colophon"
			}
		];
		const isSectionOn = (id) => (projectStore.project?.specimenSections?.[id] ?? true) !== false;
		head("1i3kblf", $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>${escape_html(project()?.metadata.familyName ?? "Specimen")} — specimen</title>`);
			});
		});
		if (!project()) {
			$$renderer.push("<!--[0-->");
			LoadingPanel($$renderer, { label: "Loading specimen" });
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div class="h-full overflow-auto bg-canvas"><div class="screen-toolbar sticky top-0 z-10 flex flex-col gap-2 border-b border-border bg-surface px-6 py-2.5 svelte-1i3kblf"><div class="flex flex-wrap items-center justify-between gap-3"><div class="text-[12px] text-fg-muted">Specimen — ${escape_html(drawnGlyphs().length)} drawn glyphs · ${escape_html(previewStore.sizeKb.toFixed(1))} KB</div> <div class="flex flex-wrap items-center gap-1"><span class="text-[11px] text-fg-subtle">Sections:</span> <!--[-->`);
			const each_array = ensure_array_like(SECTIONS);
			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let s = each_array[$$index];
				const on = isSectionOn(s.id);
				$$renderer.push(`<button type="button"${attr_class(`rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors ${stringify(on ? "border-accent/40 bg-accent-soft text-accent" : "border-border bg-surface-2/40 text-fg-subtle hover:border-border-strong hover:text-fg")}`)}>${escape_html(s.label)}</button>`);
			}
			$$renderer.push(`<!--]--></div> <button type="button" class="rounded-md bg-fg px-3 py-1 text-[12px] font-medium text-canvas hover:bg-fg/90">Print / Save as PDF</button></div> <details class="text-[12px]"><summary class="cursor-pointer text-fg-subtle hover:text-fg">Customise sample paragraph</summary> <textarea${attr("placeholder", DEFAULT_PARAGRAPH)} rows="3" class="mt-2 block w-full resize-y rounded-md border border-border bg-surface-2/40 px-3 py-2 text-[13px] text-fg outline-none focus:border-accent focus:bg-surface">`);
			const $$body = escape_html(project().samples?.paragraph ?? "");
			if ($$body) $$renderer.push(`${$$body}`);
			$$renderer.push(`</textarea> <p class="mt-1 text-[10px] text-fg-subtle">Used here and on the Preview tab's Paragraph panel. Leave empty to fall back
					to the default.</p></details></div> <div class="specimen mx-auto bg-white text-black svelte-1i3kblf">`);
			if (isSectionOn("cover")) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<section class="page svelte-1i3kblf"><header class="mb-12 flex items-baseline justify-between"><div class="text-[10px] uppercase tracking-[0.2em] text-neutral-500">${escape_html(today)}</div> <div class="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Font Studio specimen</div></header> <div class="mt-16"><div class="preview-font leading-[0.9]" style="font-size: 180px;">${escape_html(project().metadata.familyName[0] ?? "A")}${escape_html(project().metadata.familyName[1]?.toLowerCase() ?? "a")}</div></div> <div class="mt-12"><h1 class="preview-font text-7xl font-medium leading-tight">${escape_html(project().metadata.familyName)}</h1> <div class="mt-2 text-2xl text-neutral-500 preview-font">${escape_html(project().metadata.styleName)}</div> `);
				if (project().brief?.intent?.trim()) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<p class="mt-8 max-w-prose text-[15px] italic leading-[1.6] text-neutral-700">“${escape_html(project().brief.intent.trim())}”</p>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--></div> <div class="mt-auto grid grid-cols-3 gap-6 text-[11px] text-neutral-500"><div><div class="font-semibold text-neutral-900">Designer</div> <div>${escape_html(project().metadata.designer || "—")}</div></div> <div><div class="font-semibold text-neutral-900">Version</div> <div>${escape_html(project().metadata.version)}</div></div> <div><div class="font-semibold text-neutral-900">Glyphs</div> <div>${escape_html(drawnGlyphs().length)} drawn</div></div></div></section>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (isSectionOn("design-notes") && project().brief?.designNotes?.trim()) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<section class="page svelte-1i3kblf"><h2 class="mb-6 text-[10px] uppercase tracking-[0.2em] text-neutral-500">Design notes</h2> <div class="max-w-prose whitespace-pre-line text-[15px] leading-[1.65] text-neutral-800">${escape_html(project().brief.designNotes)}</div></section>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (isSectionOn("character-set")) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<section class="page svelte-1i3kblf"><h2 class="mb-6 text-[10px] uppercase tracking-[0.2em] text-neutral-500">Character set</h2> <div class="preview-font flex flex-wrap gap-x-3 gap-y-1 text-4xl leading-snug"><!--[-->`);
				const each_array_1 = ensure_array_like(drawnGlyphs());
				for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
					let g = each_array_1[$$index_1];
					$$renderer.push(`<span>${escape_html(String.fromCodePoint(g.codepoint))}</span>`);
				}
				$$renderer.push(`<!--]--></div></section>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (isSectionOn("display")) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<section class="page svelte-1i3kblf"><h2 class="mb-6 text-[10px] uppercase tracking-[0.2em] text-neutral-500">Display</h2> <div class="preview-font space-y-6 leading-[0.95]"><div class="text-7xl">Type design is system design.</div> <div class="text-5xl text-neutral-700">Rhythm, contrast, proportion, weight.</div> <div class="text-3xl text-neutral-500">Every glyph belongs to a system, not a moment.</div></div></section>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (isSectionOn("waterfall")) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<section class="page svelte-1i3kblf"><h2 class="mb-6 text-[10px] uppercase tracking-[0.2em] text-neutral-500">Waterfall</h2> <div class="space-y-3"><!--[-->`);
				const each_array_2 = ensure_array_like([
					10,
					12,
					14,
					18,
					24,
					32,
					48,
					64
				]);
				for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
					let size = each_array_2[$$index_2];
					$$renderer.push(`<div class="flex items-baseline gap-4"><span class="w-10 text-right font-mono text-[10px] text-neutral-400" data-numeric="">${escape_html(size)}px</span> <span class="preview-font flex-1 leading-[1.3]"${attr_style(`font-size: ${stringify(size)}px;`)}>${escape_html(PANGRAMS[0])}</span></div>`);
				}
				$$renderer.push(`<!--]--></div></section>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (isSectionOn("paragraph")) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<section class="page svelte-1i3kblf"><h2 class="mb-6 text-[10px] uppercase tracking-[0.2em] text-neutral-500">Paragraph</h2> <p class="preview-font max-w-prose text-lg leading-[1.6]">${escape_html(PARAGRAPH())}</p> <p class="preview-font mt-4 max-w-prose text-base leading-[1.55] text-neutral-700">${escape_html(PARAGRAPH())}</p> <p class="preview-font mt-4 max-w-prose text-sm leading-[1.5] text-neutral-700">${escape_html(PARAGRAPH())}</p></section>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (isSectionOn("pangrams")) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<section class="page svelte-1i3kblf"><h2 class="mb-6 text-[10px] uppercase tracking-[0.2em] text-neutral-500">Pangrams</h2> <div class="preview-font space-y-4 text-2xl leading-snug"><!--[-->`);
				const each_array_3 = ensure_array_like(PANGRAMS);
				for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
					let p = each_array_3[$$index_3];
					$$renderer.push(`<div>${escape_html(p)}</div>`);
				}
				$$renderer.push(`<!--]--></div></section>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (isSectionOn("colophon")) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<section class="page svelte-1i3kblf"><h2 class="mb-6 text-[10px] uppercase tracking-[0.2em] text-neutral-500">Colophon</h2> <dl class="grid grid-cols-[160px_1fr] gap-y-2 text-[13px]"><dt class="text-neutral-500">Family</dt> <dd>${escape_html(project().metadata.familyName)}</dd> <dt class="text-neutral-500">Style</dt> <dd>${escape_html(project().metadata.styleName)}</dd> <dt class="text-neutral-500">Version</dt> <dd>${escape_html(project().metadata.version)}</dd> <dt class="text-neutral-500">Designer</dt> <dd>${escape_html(project().metadata.designer || "—")}</dd> <dt class="text-neutral-500">Copyright</dt> <dd>${escape_html(project().metadata.copyright || "—")}</dd> <dt class="text-neutral-500">License</dt> <dd class="whitespace-pre-line">${escape_html(project().metadata.license || "—")}</dd> <dt class="text-neutral-500">UPM</dt> <dd data-numeric="">${escape_html(project().metrics.unitsPerEm)}</dd> <dt class="text-neutral-500">Cap height / x-height</dt> <dd data-numeric="">${escape_html(project().metrics.capHeight)} / ${escape_html(project().metrics.xHeight)}</dd> <dt class="text-neutral-500">Ascender / descender</dt> <dd data-numeric="">${escape_html(project().metrics.ascender)} / ${escape_html(project().metrics.descender)}</dd> <dt class="text-neutral-500">Glyphs drawn</dt> <dd data-numeric="">${escape_html(drawnGlyphs().length)}</dd> `);
				if ((project().axes ?? []).length > 0) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<dt class="text-neutral-500">Axes</dt> <dd data-numeric="">${escape_html(project().axes?.map((a) => `${a.tag} ${a.minimum}..${a.maximum}`).join(", "))}</dd>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--> `);
				if ((project().instances ?? []).length > 0) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<dt class="text-neutral-500">Instances</dt> <dd>${escape_html(project().instances?.map((i) => i.styleName).join(", "))}</dd>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--></dl> `);
				if (project().changelog && project().changelog.length > 0) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<h2 class="mt-12 mb-6 text-[10px] uppercase tracking-[0.2em] text-neutral-500">Changelog</h2> <dl class="grid grid-cols-[120px_1fr] gap-y-3 text-[13px]"><!--[-->`);
					const each_array_4 = ensure_array_like(project().changelog);
					for (let $$index_4 = 0, $$length = each_array_4.length; $$index_4 < $$length; $$index_4++) {
						let e = each_array_4[$$index_4];
						$$renderer.push(`<dt class="font-mono text-neutral-500" data-numeric="">v${escape_html(e.version)} <span class="block text-[10px]">${escape_html(new Date(e.date).toLocaleDateString(void 0, {
							year: "numeric",
							month: "short",
							day: "numeric"
						}))}</span></dt> <dd class="whitespace-pre-line">${escape_html(e.notes)}</dd>`);
					}
					$$renderer.push(`<!--]--></dl>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--></section>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div></div>`);
		}
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
export { _page as default };
