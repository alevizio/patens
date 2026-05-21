import { G as escape_html, U as attr, c as ensure_array_like, f as stringify, o as derived } from "../../../../../chunks/dev.js";
import "../../../../../chunks/toast2.svelte.js";
import { x as STANDARD_AXES } from "../../../../../chunks/project.js";
import { t as projectStore } from "../../../../../chunks/project.svelte.js";
import { t as GlyphTile } from "../../../../../chunks/GlyphTile.js";
import { n as Input, t as Field } from "../../../../../chunks/Field.js";
import { t as Plus } from "../../../../../chunks/plus.js";
import { t as Sliders_horizontal } from "../../../../../chunks/sliders-horizontal.js";
import { t as Layers } from "../../../../../chunks/layers.js";
import { t as Button } from "../../../../../chunks/Button.js";
import { t as Panel } from "../../../../../chunks/Panel.js";
import { t as Trash_2 } from "../../../../../chunks/trash-2.js";
import { t as LoadingPanel } from "../../../../../chunks/LoadingPanel.js";
import { t as Tag } from "../../../../../chunks/tag.js";
//#region src/routes/project/[id]/designspace/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const project = derived(() => projectStore.project);
		let newMasterName = "Bold";
		let newMasterLocation = {};
		derived(() => {
			const loc = {};
			for (const a of project()?.axes ?? []) loc[a.tag] = a.default;
			return loc;
		});
		const selectedCp = derived(() => projectStore.selectedCodepoint);
		const masterGlyphCells = derived(() => {
			if (!project() || !selectedCp()) return [];
			const defaultGlyph = project().glyphs[selectedCp()];
			if (!defaultGlyph) return [];
			const cells = [{
				label: "Default",
				loc: "axis defaults",
				glyph: defaultGlyph
			}];
			for (const m of project().masters ?? []) {
				const override = m.glyphs?.[selectedCp()];
				cells.push({
					label: m.name,
					loc: Object.entries(m.location).map(([t, v]) => `${t}=${v}`).join(" · "),
					glyph: override ?? defaultGlyph
				});
			}
			return cells;
		});
		const handleAddMaster = async () => {
			const trimmed = newMasterName.trim();
			if (!trimmed || (project()?.axes ?? []).length === 0) return;
			await projectStore.addMaster(trimmed, { ...newMasterLocation });
			newMasterName = "Master";
		};
		const COMMON_INSTANCES = [
			{
				styleName: "Thin",
				wght: 100
			},
			{
				styleName: "Light",
				wght: 300
			},
			{
				styleName: "Regular",
				wght: 400
			},
			{
				styleName: "Medium",
				wght: 500
			},
			{
				styleName: "SemiBold",
				wght: 600
			},
			{
				styleName: "Bold",
				wght: 700
			},
			{
				styleName: "Black",
				wght: 900
			}
		];
		/**
		* Optical-size named instances follow the convention popularised by
		* Adobe Originals (Source Serif 4, Source Sans 3) and reaffirmed in
		* Google Fonts' opsz guidance: distinct cuts for 8pt captions, 14pt
		* text, 28pt subheads, and 72pt display. Caption widens and opens up
		* counters; Display tightens and refines.
		*/
		const OPSZ_INSTANCES = [
			{
				styleName: "Caption",
				opsz: 8,
				description: "6–10pt, very small UI text or footnotes"
			},
			{
				styleName: "Text",
				opsz: 14,
				description: "11–18pt, paragraph reading"
			},
			{
				styleName: "Subhead",
				opsz: 28,
				description: "20–40pt, intro lines and quotes"
			},
			{
				styleName: "Display",
				opsz: 72,
				description: "50pt+, headlines and posters"
			}
		];
		const hasOpsz = derived(() => (project()?.axes ?? []).some((a) => a.tag === "opsz"));
		const hasWght = derived(() => (project()?.axes ?? []).some((a) => a.tag === "wght"));
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (!project()) {
				$$renderer.push("<!--[0-->");
				LoadingPanel($$renderer, { label: "Loading designspace" });
			} else {
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`<div class="h-full overflow-auto"><div class="mx-auto flex max-w-5xl flex-col gap-6 p-6"><header><h1 class="text-xl font-semibold tracking-tight">Designspace</h1> <p class="text-sm text-fg-muted">Define axes and masters to make this a variable font. Each additional master is
					interpolated against the default at its axis location.</p></header> `);
				Panel($$renderer, {
					children: ($$renderer) => {
						$$renderer.push(`<h2 class="mb-3 inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">`);
						Sliders_horizontal($$renderer, { class: "size-3" });
						$$renderer.push(`<!----> Axes</h2> `);
						if (!project().axes || project().axes.length === 0) {
							$$renderer.push("<!--[0-->");
							$$renderer.push(`<p class="mb-3 text-sm text-fg-muted">No axes yet. Start with Weight or Width — the most widely supported axes.</p> <div class="mb-3 rounded-md border border-dashed border-accent/30 bg-accent-soft/30 px-3 py-2 text-[12px]"><div class="flex items-center justify-between gap-3"><span class="text-fg-muted">Want optical sizing like Source Serif 4 or Helvetica Now?</span> <button type="button" class="rounded border border-accent bg-accent text-accent-fg px-2.5 py-1 text-[11px] font-medium hover:bg-accent/90">Set up opsz axis + 4 cuts</button></div> <div class="mt-1 text-[10px] text-fg-subtle">Adds an Optical Size axis and four named instances: Caption · Text · Subhead · Display.</div></div>`);
						} else {
							$$renderer.push("<!--[-1-->");
							$$renderer.push(`<div class="mb-3 grid gap-2"><!--[-->`);
							const each_array = ensure_array_like(project().axes);
							for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
								let axis = each_array[$$index];
								$$renderer.push(`<div class="grid grid-cols-[1fr_auto_auto_auto_auto] items-end gap-2 rounded-md border border-border bg-surface-2/40 px-3 py-2.5"><div><div class="text-[13px] font-medium text-fg">${escape_html(axis.name)}</div> <div class="font-mono text-[11px] text-fg-subtle">${escape_html(axis.tag)}</div></div> `);
								Field($$renderer, {
									label: "Min",
									children: ($$renderer) => {
										Input($$renderer, {
											type: "number",
											density: "sm",
											value: axis.minimum,
											onchange: (e) => projectStore.updateAxis(axis.tag, { minimum: Number(e.currentTarget.value) })
										});
									},
									$$slots: { default: true }
								});
								$$renderer.push(`<!----> `);
								Field($$renderer, {
									label: "Default",
									children: ($$renderer) => {
										Input($$renderer, {
											type: "number",
											density: "sm",
											value: axis.default,
											onchange: (e) => projectStore.updateAxis(axis.tag, { default: Number(e.currentTarget.value) })
										});
									},
									$$slots: { default: true }
								});
								$$renderer.push(`<!----> `);
								Field($$renderer, {
									label: "Max",
									children: ($$renderer) => {
										Input($$renderer, {
											type: "number",
											density: "sm",
											value: axis.maximum,
											onchange: (e) => projectStore.updateAxis(axis.tag, { maximum: Number(e.currentTarget.value) })
										});
									},
									$$slots: { default: true }
								});
								$$renderer.push(`<!----> <button type="button" class="self-end rounded p-1.5 text-fg-subtle hover:bg-danger/10 hover:text-danger"${attr("aria-label", `Remove axis ${stringify(axis.tag)}`)}${attr("title", `Remove axis ${stringify(axis.tag)}`)}>`);
								Trash_2($$renderer, { class: "size-3.5" });
								$$renderer.push(`<!----></button></div>`);
							}
							$$renderer.push(`<!--]--></div>`);
						}
						$$renderer.push(`<!--]--> <div class="flex flex-wrap items-center gap-2"><span class="text-[11px] font-medium text-fg-muted">Add standard axis:</span> <!--[-->`);
						const each_array_1 = ensure_array_like(Object.entries(STANDARD_AXES));
						for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
							let [tag, def] = each_array_1[$$index_1];
							const present = (project().axes ?? []).some((a) => a.tag === tag);
							$$renderer.push(`<button type="button"${attr("disabled", present, true)} class="rounded-md border border-dashed border-border-strong/50 bg-transparent px-2 py-1 font-mono text-[11px] text-fg-muted hover:border-accent hover:text-accent disabled:opacity-40">+ ${escape_html(tag)} (${escape_html(def.name)})</button>`);
						}
						$$renderer.push(`<!--]--></div>`);
					},
					$$slots: { default: true }
				});
				$$renderer.push(`<!----> `);
				Panel($$renderer, {
					children: ($$renderer) => {
						$$renderer.push(`<h2 class="mb-3 inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">`);
						Layers($$renderer, { class: "size-3" });
						$$renderer.push(`<!----> Masters</h2> <div class="mb-3 grid gap-2"><div class="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border border-accent/30 bg-accent-soft/30 px-3 py-2.5"><div><div class="text-[13px] font-medium text-fg">Default <span class="text-fg-muted">— anchored at axis defaults</span></div> <div class="font-mono text-[11px] text-fg-subtle" data-numeric="">${escape_html((project().axes ?? []).length === 0 ? "No axes defined" : (project().axes ?? []).map((a) => `${a.tag}=${a.default}`).join(" · "))}</div></div> <span class="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">${escape_html(Object.keys(project().glyphs).filter((cp) => project().glyphs[Number(cp)].contours.length > 0).length)} drawn</span></div> <!--[-->`);
						const each_array_2 = ensure_array_like(project().masters ?? []);
						for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
							let m = each_array_2[$$index_2];
							$$renderer.push(`<div class="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2.5"><div><input type="text"${attr("value", m.name)} class="w-full border-0 bg-transparent text-[13px] font-medium text-fg outline-none focus:ring-1 focus:ring-accent"/> <div class="font-mono text-[11px] text-fg-subtle" data-numeric="">${escape_html(Object.entries(m.location).map(([k, v]) => `${k}=${v}`).join(" · "))}</div></div> <span class="rounded-full bg-fg/10 px-2 py-0.5 text-[10px] font-medium text-fg-muted">${escape_html(Object.keys(m.glyphs).filter((cp) => m.glyphs[Number(cp)].contours.length > 0).length)} drawn</span> <button type="button" class="rounded border border-border bg-surface px-2 py-1 text-[11px] font-medium text-fg-muted hover:border-accent hover:text-accent" title="Copy every drawn default glyph into this master (skips glyphs already drawn here)">Fill from Default</button> <button type="button" class="rounded p-1.5 text-fg-subtle hover:bg-danger/10 hover:text-danger"${attr("aria-label", `Remove master ${stringify(m.name)}`)}>`);
							Trash_2($$renderer, { class: "size-3.5" });
							$$renderer.push(`<!----></button></div>`);
						}
						$$renderer.push(`<!--]--></div> `);
						if ((project().axes ?? []).length > 0) {
							$$renderer.push("<!--[0-->");
							$$renderer.push(`<div class="rounded-md border border-dashed border-border-strong/50 bg-surface-2/40 p-3"><div class="mb-2 text-[11px] font-medium text-fg-muted">Add master</div> <div class="grid grid-cols-[1fr_auto_auto] items-end gap-2">`);
							Field($$renderer, {
								label: "Name",
								children: ($$renderer) => {
									Input($$renderer, {
										density: "sm",
										placeholder: "e.g. Bold",
										get value() {
											return newMasterName;
										},
										set value($$value) {
											newMasterName = $$value;
											$$settled = false;
										}
									});
								},
								$$slots: { default: true }
							});
							$$renderer.push(`<!----> <!--[-->`);
							const each_array_3 = ensure_array_like(project().axes ?? []);
							for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
								let axis = each_array_3[$$index_3];
								Field($$renderer, {
									label: axis.tag,
									children: ($$renderer) => {
										Input($$renderer, {
											type: "number",
											density: "sm",
											value: newMasterLocation[axis.tag] ?? axis.default,
											onchange: (e) => newMasterLocation = {
												...newMasterLocation,
												[axis.tag]: Number(e.currentTarget.value)
											}
										});
									},
									$$slots: { default: true }
								});
							}
							$$renderer.push(`<!--]--> `);
							{
								function icon($$renderer) {
									Plus($$renderer, { class: "size-3.5" });
								}
								Button($$renderer, {
									density: "sm",
									onclick: handleAddMaster,
									icon,
									children: ($$renderer) => {
										$$renderer.push(`<!---->Add master`);
									},
									$$slots: {
										icon: true,
										default: true
									}
								});
							}
							$$renderer.push(`<!----></div> <div class="mt-2 text-[11px] text-fg-subtle">New masters start as a copy of the default master, so they're
							interpolation-compatible from day one.</div></div>`);
						} else {
							$$renderer.push("<!--[-1-->");
							$$renderer.push(`<p class="text-sm text-fg-muted">Add an axis above before creating additional masters.</p>`);
						}
						$$renderer.push(`<!--]-->`);
					},
					$$slots: { default: true }
				});
				$$renderer.push(`<!----> `);
				if ((project().masters ?? []).length > 0 && masterGlyphCells().length > 0) {
					$$renderer.push("<!--[0-->");
					Panel($$renderer, {
						children: ($$renderer) => {
							$$renderer.push(`<div class="mb-2 flex items-baseline justify-between gap-2"><h2 class="inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">`);
							Layers($$renderer, { class: "size-3" });
							$$renderer.push(`<!----> Selected glyph across masters</h2> <a${attr("href", `/project/${stringify(project().id)}/edit`)} class="text-[11px] text-fg-muted hover:text-accent">${escape_html(masterGlyphCells()[0].glyph.name)} →</a></div> <p class="mb-3 text-[12px] text-fg-subtle">Quick visual check that the current glyph stays structurally compatible
						across every master. A red incompatibility dot in the editor browser means
						contour or point counts differ.</p> <div class="flex flex-wrap gap-3"><!--[-->`);
							const each_array_4 = ensure_array_like(masterGlyphCells());
							for (let i = 0, $$length = each_array_4.length; i < $$length; i++) {
								let cell = each_array_4[i];
								$$renderer.push(`<div class="flex flex-col items-center gap-1">`);
								GlyphTile($$renderer, {
									glyph: cell.glyph,
									size: 72,
									showLabel: false,
									ascender: project().metrics.ascender,
									descender: project().metrics.descender
								});
								$$renderer.push(`<!----> <div class="text-center text-[11px] font-medium text-fg">${escape_html(cell.label)}</div> `);
								if (i > 0) {
									$$renderer.push("<!--[0-->");
									$$renderer.push(`<div class="font-mono text-[10px] text-fg-subtle" data-numeric="">${escape_html(cell.loc)}</div>`);
								} else $$renderer.push("<!--[-1-->");
								$$renderer.push(`<!--]--></div>`);
							}
							$$renderer.push(`<!--]--></div>`);
						},
						$$slots: { default: true }
					});
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--> `);
				if ((project().axes ?? []).length > 0) {
					$$renderer.push("<!--[0-->");
					Panel($$renderer, {
						children: ($$renderer) => {
							$$renderer.push(`<h2 class="mb-2 inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">`);
							Tag($$renderer, { class: "size-3" });
							$$renderer.push(`<!----> Named instances</h2> <p class="mb-3 text-[12px] text-fg-subtle">Preset axis positions baked into the variable font's <code>fvar</code> table —
						these appear as selectable styles in OS font menus.</p> `);
							if ((project().instances ?? []).length > 0) {
								$$renderer.push("<!--[0-->");
								$$renderer.push(`<ul class="mb-3 grid gap-1"><!--[-->`);
								const each_array_5 = ensure_array_like(project().instances ?? []);
								for (let $$index_5 = 0, $$length = each_array_5.length; $$index_5 < $$length; $$index_5++) {
									let inst = each_array_5[$$index_5];
									$$renderer.push(`<li class="flex items-center gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2"><div class="flex-1"><div class="text-[13px] font-medium text-fg">${escape_html(inst.styleName)}</div> <div class="font-mono text-[11px] text-fg-subtle" data-numeric="">${escape_html(Object.entries(inst.location).map(([k, v]) => `${k}=${v}`).join(" · "))}</div></div> <button type="button" class="rounded p-1 text-fg-subtle hover:bg-danger/10 hover:text-danger"${attr("aria-label", `Remove instance ${stringify(inst.styleName)}`)}${attr("title", `Remove instance ${stringify(inst.styleName)}`)}>`);
									Trash_2($$renderer, { class: "size-3.5" });
									$$renderer.push(`<!----></button></li>`);
								}
								$$renderer.push(`<!--]--></ul>`);
							} else $$renderer.push("<!--[-1-->");
							$$renderer.push(`<!--]--> `);
							if (hasWght()) {
								$$renderer.push("<!--[0-->");
								$$renderer.push(`<div class="flex flex-wrap items-center gap-1.5"><span class="text-[11px] font-medium text-fg-muted">Add common weight:</span> <!--[-->`);
								const each_array_6 = ensure_array_like(COMMON_INSTANCES);
								for (let $$index_6 = 0, $$length = each_array_6.length; $$index_6 < $$length; $$index_6++) {
									let preset = each_array_6[$$index_6];
									const present = (project().instances ?? []).some((i) => i.styleName === preset.styleName);
									$$renderer.push(`<button type="button"${attr("disabled", present, true)} class="rounded-md border border-dashed border-border-strong/50 bg-transparent px-2 py-1 text-[11px] font-medium text-fg-muted hover:border-accent hover:text-accent disabled:opacity-40">+ ${escape_html(preset.styleName)} (${escape_html(preset.wght)})</button>`);
								}
								$$renderer.push(`<!--]--></div>`);
							} else $$renderer.push("<!--[-1-->");
							$$renderer.push(`<!--]--> `);
							if (hasOpsz()) {
								$$renderer.push("<!--[0-->");
								$$renderer.push(`<div class="mt-2 flex flex-wrap items-center gap-1.5"><span class="text-[11px] font-medium text-fg-muted">Add optical size:</span> <!--[-->`);
								const each_array_7 = ensure_array_like(OPSZ_INSTANCES);
								for (let $$index_7 = 0, $$length = each_array_7.length; $$index_7 < $$length; $$index_7++) {
									let preset = each_array_7[$$index_7];
									const present = (project().instances ?? []).some((i) => i.styleName === preset.styleName);
									$$renderer.push(`<button type="button"${attr("disabled", present, true)} class="rounded-md border border-dashed border-border-strong/50 bg-transparent px-2 py-1 text-[11px] font-medium text-fg-muted hover:border-accent hover:text-accent disabled:opacity-40"${attr("title", preset.description)}>+ ${escape_html(preset.styleName)} (${escape_html(preset.opsz)}pt)</button>`);
								}
								$$renderer.push(`<!--]--></div> <p class="mt-1 text-[10px] text-fg-subtle">Convention from Adobe Originals (Source Serif / Source Sans). Caption
							widens counters for small sizes; Display tightens for large sizes.</p>`);
							} else $$renderer.push("<!--[-1-->");
							$$renderer.push(`<!--]--> `);
							if (!hasWght() && !hasOpsz()) {
								$$renderer.push("<!--[0-->");
								$$renderer.push(`<div class="flex flex-wrap items-center gap-1.5"><span class="text-[11px] font-medium text-fg-muted">Add common weight:</span> <!--[-->`);
								const each_array_8 = ensure_array_like(COMMON_INSTANCES);
								for (let $$index_8 = 0, $$length = each_array_8.length; $$index_8 < $$length; $$index_8++) {
									let preset = each_array_8[$$index_8];
									const present = (project().instances ?? []).some((i) => i.styleName === preset.styleName);
									$$renderer.push(`<button type="button"${attr("disabled", present, true)} class="rounded-md border border-dashed border-border-strong/50 bg-transparent px-2 py-1 text-[11px] font-medium text-fg-muted hover:border-accent hover:text-accent disabled:opacity-40">+ ${escape_html(preset.styleName)} (${escape_html(preset.wght)})</button>`);
								}
								$$renderer.push(`<!--]--></div>`);
							} else $$renderer.push("<!--[-1-->");
							$$renderer.push(`<!--]-->`);
						},
						$$slots: { default: true }
					});
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--></div></div>`);
			}
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
export { _page as default };
