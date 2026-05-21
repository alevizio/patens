import "../../../../chunks/index-server.js";
import { G as escape_html, U as attr, c as ensure_array_like, d as spread_props, f as stringify, n as attr_class, o as derived, r as attr_style } from "../../../../chunks/dev.js";
import "../../../../chunks/toast2.svelte.js";
import { t as Icon } from "../../../../chunks/Icon.js";
import { n as Circle_check, t as Circle_alert } from "../../../../chunks/circle-alert.js";
import { n as Triangle_alert, t as Info } from "../../../../chunks/info.js";
import { t as X } from "../../../../chunks/x.js";
import { t as page } from "../../../../chunks/state.js";
import "../../../../chunks/navigation.js";
import { _ as CATEGORY_ORDER, g as CATEGORY_LABELS } from "../../../../chunks/project.js";
import { t as projectStore } from "../../../../chunks/project.svelte.js";
import { t as previewStore } from "../../../../chunks/preview.svelte.js";
import { t as settings } from "../../../../chunks/settings.svelte.js";
import "../../../../chunks/charsets.js";
import { t as GlyphTile } from "../../../../chunks/GlyphTile.js";
import { n as Input, t as Field } from "../../../../chunks/Field.js";
import { n as Search, t as List_checks } from "../../../../chunks/list-checks.js";
import { t as Plus } from "../../../../chunks/plus.js";
import { t as Arrow_left } from "../../../../chunks/arrow-left.js";
import { t as Pen_tool } from "../../../../chunks/pen-tool.js";
import { i as Ruler, n as Circle_question_mark, r as Lock_open, t as Chevron_down } from "../../../../chunks/chevron-down.js";
import { t as Eye } from "../../../../chunks/eye.js";
import { t as Download } from "../../../../chunks/download.js";
import { n as Code_xml, t as Key_round } from "../../../../chunks/key-round.js";
import { t as Sliders_horizontal } from "../../../../chunks/sliders-horizontal.js";
import { t as Layers } from "../../../../chunks/layers.js";
import { t as Sparkles } from "../../../../chunks/sparkles.js";
import { t as File_text } from "../../../../chunks/file-text.js";
import { t as Compass } from "../../../../chunks/compass.js";
import { t as Rocket } from "../../../../chunks/rocket.js";
import { t as Lock } from "../../../../chunks/lock.js";
import { i as preflightProject, r as auditProject, t as auditCompatibility } from "../../../../chunks/audit.js";
import { n as Loader_circle, t as Button } from "../../../../chunks/Button.js";
import { t as Panel } from "../../../../chunks/Panel.js";
import { t as Eye_off } from "../../../../chunks/eye-off.js";
import { t as Trash_2 } from "../../../../chunks/trash-2.js";
import { n as ShortcutsDialog, t as Sparkline } from "../../../../chunks/Sparkline.js";
//#region src/lib/glyph/GlyphBrowser.svelte
function GlyphBrowser($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let query = "";
		let statusFilter = "all";
		const STATUS_OPTIONS = [
			{
				id: "all",
				label: "All",
				title: "Show every glyph"
			},
			{
				id: "drawn",
				label: "Drawn",
				title: "Glyphs with at least one contour"
			},
			{
				id: "undrawn",
				label: "Empty",
				title: "Glyphs with no contours yet"
			},
			{
				id: "sketch",
				label: "Sketch",
				title: "Status = sketch"
			},
			{
				id: "draft",
				label: "Draft",
				title: "Status = draft"
			},
			{
				id: "final",
				label: "Final",
				title: "Status = final"
			},
			{
				id: "flagged",
				label: "Flagged",
				title: "Flagged for review (Shift+F)"
			},
			{
				id: "recent",
				label: "Recent",
				title: "Edited in the last 24 hours"
			}
		];
		const matchesStatus = (g) => {
			switch (statusFilter) {
				case "all": return true;
				case "drawn": return g.contours.length > 0 || (g.components?.length ?? 0) > 0;
				case "undrawn": return g.contours.length === 0 && (g.components?.length ?? 0) === 0;
				case "flagged": return !!g.flagged;
				case "recent": {
					const t = Date.parse(g.updatedAt);
					return Number.isFinite(t) && t >= Date.now() - 24 * 3600 * 1e3;
				}
				default: return g.status === statusFilter;
			}
		};
		const grouped = derived(() => {
			if (!projectStore.project) return /* @__PURE__ */ new Map();
			const m = /* @__PURE__ */ new Map();
			for (const cat of CATEGORY_ORDER) m.set(cat, []);
			const lowerQuery = query.trim().toLowerCase();
			for (const g of Object.values(projectStore.activeGlyphs)) {
				if (!matchesStatus(g)) continue;
				if (lowerQuery) {
					const char = String.fromCodePoint(g.codepoint).toLowerCase();
					const hex = g.codepoint.toString(16).toLowerCase();
					const notes = (g.notes ?? "").toLowerCase();
					if (!(g.name.toLowerCase().includes(lowerQuery) || char === lowerQuery || hex.includes(lowerQuery) || notes.includes(lowerQuery))) continue;
				}
				const cat = categoryOf(g);
				m.get(cat)?.push(g);
			}
			for (const [, list] of m) list.sort((a, b) => a.codepoint - b.codepoint);
			return m;
		});
		const filteredTotal = derived(() => {
			let n = 0;
			for (const [, list] of grouped()) n += list.length;
			return n;
		});
		const recents = derived(() => {
			return Object.values(projectStore.activeGlyphs).filter((g) => g.contours.length > 0 || g.components && g.components.length > 0).sort((a, b) => a.updatedAt < b.updatedAt ? 1 : -1).slice(0, 8);
		});
		const showRecents = derived(() => !query.trim() && statusFilter === "all" && recents().length > 0);
		const pinnedGlyphs = derived(() => {
			return Object.values(projectStore.activeGlyphs).filter((g) => g.pinned).sort((a, b) => a.codepoint - b.codepoint);
		});
		const showPinned = derived(() => !query.trim() && statusFilter === "all" && pinnedGlyphs().length > 0);
		const totalGlyphs = derived(() => projectStore.project ? Object.keys(projectStore.project.glyphs).length : 0);
		const totalDrawn = derived(() => {
			return Object.values(projectStore.activeGlyphs).filter((g) => g.contours.length > 0).length;
		});
		const drawnPct = derived(() => totalGlyphs() > 0 ? Math.round(totalDrawn() / totalGlyphs() * 100) : 0);
		const incompatibleCodepoints = derived(() => {
			const out = /* @__PURE__ */ new Set();
			if (!projectStore.project) return out;
			const masters = projectStore.project.masters ?? [];
			if (masters.length === 0) return out;
			for (const [cpStr, def] of Object.entries(projectStore.project.glyphs)) {
				if (def.contours.length === 0) continue;
				const baseSig = def.contours.map((c) => c.commands.length).join("/");
				const cp = Number(cpStr);
				for (const m of masters) {
					const g = m.glyphs[cp];
					if (!g || g.contours.length === 0) continue;
					if (g.contours.map((c) => c.commands.length).join("/") !== baseSig) {
						out.add(cp);
						break;
					}
				}
			}
			return out;
		});
		const categoryStats = derived(() => {
			const out = /* @__PURE__ */ new Map();
			for (const cat of CATEGORY_ORDER) out.set(cat, {
				drawn: 0,
				total: 0
			});
			if (!projectStore.project) return out;
			for (const g of Object.values(projectStore.activeGlyphs)) {
				const c = categoryOf(g);
				const cell = out.get(c);
				if (!cell) continue;
				cell.total++;
				if (g.contours.length > 0 || (g.components?.length ?? 0) > 0) cell.drawn++;
			}
			return out;
		});
		function categoryOf(g) {
			if (g.codepoint >= 65 && g.codepoint <= 90) return "uppercase";
			if (g.codepoint >= 97 && g.codepoint <= 122) return "lowercase";
			if (g.codepoint >= 48 && g.codepoint <= 57) return "figure";
			if (g.components && g.components.length > 0) return "composite";
			if (g.codepoint >= 768 && g.codepoint <= 879) return "mark";
			if (g.codepoint >= 33 && g.codepoint <= 47 || g.codepoint >= 58 && g.codepoint <= 64 || g.codepoint >= 91 && g.codepoint <= 96 || g.codepoint >= 123 && g.codepoint <= 126 || g.codepoint >= 8208 && g.codepoint <= 8287) return "punctuation";
			return "symbol";
		}
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			$$renderer.push(`<aside class="flex h-full flex-col border-r border-border bg-surface"><div class="border-b border-border p-3"><div class="relative">`);
			Search($$renderer, { class: "pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-fg-subtle" });
			$$renderer.push(`<!----> `);
			Input($$renderer, {
				placeholder: "Filter glyphs…",
				density: "sm",
				class: "pl-8",
				get value() {
					return query;
				},
				set value($$value) {
					query = $$value;
					$$settled = false;
				}
			});
			$$renderer.push(`<!----></div> <div class="mt-2 -mx-0.5 flex flex-wrap gap-0.5"><!--[-->`);
			const each_array = ensure_array_like(STATUS_OPTIONS);
			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let opt = each_array[$$index];
				$$renderer.push(`<button type="button"${attr_class(`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${stringify(statusFilter === opt.id ? "bg-accent-soft text-accent" : "text-fg-subtle hover:bg-surface-2 hover:text-fg")}`)}${attr("title", opt.title)}>${escape_html(opt.label)}</button>`);
			}
			$$renderer.push(`<!--]--></div> <div class="mt-2 flex items-center justify-between gap-2"><div class="flex-1 min-w-0"><div class="flex items-baseline justify-between text-[11px] text-fg-subtle" data-numeric=""><span>`);
			if (statusFilter === "all") {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`${escape_html(totalDrawn())} / ${escape_html(totalGlyphs())} drawn`);
			} else {
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`${escape_html(filteredTotal())} shown`);
			}
			$$renderer.push(`<!--]--></span> `);
			if (statusFilter === "all" && totalGlyphs() > 0) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<span class="text-fg-subtle/70">${escape_html(drawnPct())}%</span>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div> `);
			if (statusFilter === "all" && totalGlyphs() > 0) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div class="mt-1 h-0.5 w-full overflow-hidden rounded-full bg-surface-2"><div class="h-full bg-accent transition-all duration-500"${attr_style(`width: ${stringify(drawnPct())}%;`)}></div></div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div> <button type="button"${attr_class(`inline-flex h-6 items-center gap-1 rounded-md border px-1.5 text-[11px] font-medium transition-colors ${stringify("border-border bg-surface text-fg-muted hover:border-accent hover:text-accent")}`)} aria-label="Toggle bulk-select mode" title="Toggle bulk-select mode">Bulk</button> <button type="button" class="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-surface px-1.5 text-[11px] font-medium text-fg-muted transition-colors hover:border-accent hover:text-accent" aria-label="Add custom glyph" title="Add custom codepoint">`);
			Plus($$renderer, { class: "size-3" });
			$$renderer.push(`<!----> Add</button></div> `);
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div> <div class="min-h-0 flex-1 overflow-y-auto p-2">`);
			if (showPinned()) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<section class="mb-3"><h3 class="mb-1.5 px-1.5 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Pinned <span class="ml-1 text-fg-subtle/70" data-numeric="">${escape_html(pinnedGlyphs().length)}</span></h3> <div class="grid grid-cols-4 gap-0.5"><!--[-->`);
				const each_array_3 = ensure_array_like(pinnedGlyphs());
				for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
					let g = each_array_3[$$index_3];
					GlyphTile($$renderer, {
						glyph: g,
						size: 44,
						showLabel: false,
						selected: g.codepoint === projectStore.selectedCodepoint,
						ascender: projectStore.project?.metrics.ascender ?? 800,
						descender: projectStore.project?.metrics.descender ?? -200,
						incompatible: incompatibleCodepoints().has(g.codepoint),
						onclick: () => projectStore.selectGlyph(g.codepoint),
						oncontextmenu: (ev) => {
							ev.preventDefault();
							projectStore.toggleGlyphPin(g.codepoint);
						}
					});
				}
				$$renderer.push(`<!--]--></div></section>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (showRecents()) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<section class="mb-3"><h3 class="mb-1.5 px-1.5 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Recently edited <span class="ml-1 text-fg-subtle/70" data-numeric="">${escape_html(recents().length)}</span></h3> <div class="grid grid-cols-4 gap-0.5"><!--[-->`);
				const each_array_4 = ensure_array_like(recents());
				for (let $$index_4 = 0, $$length = each_array_4.length; $$index_4 < $$length; $$index_4++) {
					let g = each_array_4[$$index_4];
					GlyphTile($$renderer, {
						glyph: g,
						size: 44,
						showLabel: false,
						selected: g.codepoint === projectStore.selectedCodepoint,
						ascender: projectStore.project?.metrics.ascender ?? 800,
						descender: projectStore.project?.metrics.descender ?? -200,
						incompatible: incompatibleCodepoints().has(g.codepoint),
						onclick: () => projectStore.selectGlyph(g.codepoint),
						oncontextmenu: (ev) => {
							ev.preventDefault();
							projectStore.toggleGlyphPin(g.codepoint);
						}
					});
				}
				$$renderer.push(`<!--]--></div></section>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (filteredTotal() === 0) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div class="px-2 py-6 text-center text-[11px] text-fg-subtle">${escape_html(query.trim() ? "No glyphs match the search." : "No glyphs match this filter.")}</div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> <!--[-->`);
			const each_array_5 = ensure_array_like(CATEGORY_ORDER);
			for (let $$index_6 = 0, $$length = each_array_5.length; $$index_6 < $$length; $$index_6++) {
				let cat = each_array_5[$$index_6];
				const list = grouped().get(cat) ?? [];
				const stats = categoryStats().get(cat) ?? {
					drawn: 0,
					total: 0
				};
				if (list.length > 0) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<section class="mb-3"><h3 class="mb-1.5 flex items-baseline justify-between gap-2 px-1.5 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"><span>${escape_html(CATEGORY_LABELS[cat])} <span class="ml-1 text-fg-subtle/70" data-numeric="">${escape_html(list.length)}</span></span> <span class="font-mono normal-case text-fg-subtle/60" data-numeric="">${escape_html(stats.drawn)}/${escape_html(stats.total)}</span></h3> <div class="grid grid-cols-4 gap-0.5"><!--[-->`);
					const each_array_6 = ensure_array_like(list);
					for (let $$index_5 = 0, $$length = each_array_6.length; $$index_5 < $$length; $$index_5++) {
						let g = each_array_6[$$index_5];
						GlyphTile($$renderer, {
							glyph: g,
							size: 44,
							showLabel: false,
							selected: g.codepoint === projectStore.selectedCodepoint,
							ascender: projectStore.project?.metrics.ascender ?? 800,
							descender: projectStore.project?.metrics.descender ?? -200,
							incompatible: incompatibleCodepoints().has(g.codepoint),
							onclick: () => projectStore.selectGlyph(g.codepoint),
							oncontextmenu: (ev) => {
								ev.preventDefault();
								projectStore.toggleGlyphPin(g.codepoint);
							}
						});
					}
					$$renderer.push(`<!--]--></div></section>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]-->`);
			}
			$$renderer.push(`<!--]--></div> `);
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></aside>`);
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
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/settings.svelte
function Settings($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "settings" },
		props,
		{ iconNode: [["path", { "d": "M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" }], ["circle", {
			"cx": "12",
			"cy": "12",
			"r": "3"
		}]] }
	]));
}
//#endregion
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/undo-2.svelte
function Undo_2($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "undo-2" },
		props,
		{ iconNode: [["path", { "d": "M9 14 4 9l5-5" }], ["path", { "d": "M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" }]] }
	]));
}
//#endregion
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/redo-2.svelte
function Redo_2($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "redo-2" },
		props,
		{ iconNode: [["path", { "d": "m15 14 5-5-5-5" }], ["path", { "d": "M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13" }]] }
	]));
}
//#endregion
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/sun.svelte
function Sun($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "sun" },
		props,
		{ iconNode: [
			["circle", {
				"cx": "12",
				"cy": "12",
				"r": "4"
			}],
			["path", { "d": "M12 2v2" }],
			["path", { "d": "M12 20v2" }],
			["path", { "d": "m4.93 4.93 1.41 1.41" }],
			["path", { "d": "m17.66 17.66 1.41 1.41" }],
			["path", { "d": "M2 12h2" }],
			["path", { "d": "M20 12h2" }],
			["path", { "d": "m6.34 17.66-1.41 1.41" }],
			["path", { "d": "m19.07 4.93-1.41 1.41" }]
		] }
	]));
}
//#endregion
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/moon.svelte
function Moon($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "moon" },
		props,
		{ iconNode: [["path", { "d": "M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" }]] }
	]));
}
//#endregion
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/monitor.svelte
function Monitor($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "monitor" },
		props,
		{ iconNode: [
			["rect", {
				"width": "20",
				"height": "14",
				"x": "2",
				"y": "3",
				"rx": "2"
			}],
			["line", {
				"x1": "8",
				"x2": "16",
				"y1": "21",
				"y2": "21"
			}],
			["line", {
				"x1": "12",
				"x2": "12",
				"y1": "17",
				"y2": "21"
			}]
		] }
	]));
}
//#endregion
//#region src/lib/ui/SettingsDialog.svelte
function SettingsDialog($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { open, onclose } = $$props;
		let draftKey = settings.anthropicApiKey;
		let draftModel = settings.preferredModel;
		const save = () => {
			settings.setApiKey(draftKey);
			settings.setPreferredModel(draftModel);
			onclose();
		};
		const clear = () => {
			if (confirm("Remove the saved API key from this browser?")) {
				settings.clear();
				draftKey = "";
			}
		};
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (open) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div class="fixed inset-0 z-50 grid place-items-center bg-fg/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" tabindex="-1">`);
				Panel($$renderer, {
					class: "w-full max-w-lg",
					children: ($$renderer) => {
						$$renderer.push(`<div class="mb-4 flex items-center justify-between"><h2 class="text-lg font-semibold tracking-tight">Settings</h2> <button type="button" class="rounded p-1 text-fg-muted hover:bg-surface-2 hover:text-fg" aria-label="Close" title="Close settings (Esc)">`);
						X($$renderer, { class: "size-4" });
						$$renderer.push(`<!----></button></div> <div class="grid gap-4"><div><h3 class="mb-2 inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">`);
						Sun($$renderer, { class: "size-3" });
						$$renderer.push(`<!----> Appearance</h3> <div class="grid grid-cols-3 gap-1.5"><!--[-->`);
						const each_array = ensure_array_like([
							{
								id: "system",
								label: "System",
								icon: Monitor
							},
							{
								id: "light",
								label: "Light",
								icon: Sun
							},
							{
								id: "dark",
								label: "Dark",
								icon: Moon
							}
						]);
						for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
							let opt = each_array[$$index];
							const Icon = opt.icon;
							$$renderer.push(`<button type="button"${attr_class(`inline-flex items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-[12px] font-medium transition-colors ${stringify(settings.theme === opt.id ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface-2/40 text-fg-muted hover:border-border-strong hover:text-fg")}`)}>`);
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
						$$renderer.push(`<!--]--></div></div> <div class="border-t border-border pt-4"><h3 class="mb-2 inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">`);
						Key_round($$renderer, { class: "size-3" });
						$$renderer.push(`<!----> Anthropic API key</h3> `);
						Field($$renderer, {
							label: "API key",
							hint: "Used only to call Claude on your behalf. Sent through our serverless proxy because Anthropic blocks direct browser calls. Never stored on the server. Lives in this browser's localStorage.",
							children: ($$renderer) => {
								$$renderer.push(`<div class="relative">`);
								Input($$renderer, {
									type: "password",
									placeholder: "sk-ant-…",
									class: "pr-10 font-mono",
									get value() {
										return draftKey;
									},
									set value($$value) {
										draftKey = $$value;
										$$settled = false;
									}
								});
								$$renderer.push(`<!----> <button type="button" class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-fg-subtle hover:text-fg" aria-label="Toggle visibility"${attr("title", "Show API key")}>`);
								$$renderer.push("<!--[-1-->");
								Eye_off($$renderer, { class: "size-3.5" });
								$$renderer.push(`<!--]--></button></div>`);
							},
							$$slots: { default: true }
						});
						$$renderer.push(`<!----> `);
						Field($$renderer, {
							label: "Model",
							children: ($$renderer) => {
								$$renderer.select({
									value: draftModel,
									class: "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
								}, ($$renderer) => {
									$$renderer.option({ value: "claude-opus-4-7" }, ($$renderer) => {
										$$renderer.push(`Claude Opus 4.7 (smartest)`);
									});
									$$renderer.option({ value: "claude-sonnet-4-6" }, ($$renderer) => {
										$$renderer.push(`Claude Sonnet 4.6 (balanced)`);
									});
									$$renderer.option({ value: "claude-haiku-4-5-20251001" }, ($$renderer) => {
										$$renderer.push(`Claude Haiku 4.5 (fastest)`);
									});
								});
							},
							$$slots: { default: true }
						});
						$$renderer.push(`<!----></div> <div class="flex items-center justify-between gap-2 border-t border-border pt-4">`);
						if (settings.hasKey) {
							$$renderer.push("<!--[0-->");
							{
								function icon($$renderer) {
									Trash_2($$renderer, { class: "size-3.5" });
								}
								Button($$renderer, {
									variant: "ghost",
									density: "sm",
									onclick: clear,
									icon,
									children: ($$renderer) => {
										$$renderer.push(`<!---->Remove saved key`);
									},
									$$slots: {
										icon: true,
										default: true
									}
								});
							}
						} else {
							$$renderer.push("<!--[-1-->");
							$$renderer.push(`<span class="text-[12px] text-fg-subtle">No key saved yet.</span>`);
						}
						$$renderer.push(`<!--]--> <div class="flex items-center gap-2">`);
						Button($$renderer, {
							variant: "ghost",
							density: "sm",
							onclick: onclose,
							children: ($$renderer) => {
								$$renderer.push(`<!---->Cancel`);
							},
							$$slots: { default: true }
						});
						$$renderer.push(`<!----> `);
						Button($$renderer, {
							density: "sm",
							onclick: save,
							disabled: !draftKey.trim(),
							children: ($$renderer) => {
								$$renderer.push(`<!---->Save`);
							},
							$$slots: { default: true }
						});
						$$renderer.push(`<!----></div></div></div>`);
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
//#region src/lib/font/unicode-blocks.ts
var RELEVANT_BLOCKS = [
	{
		name: "Basic Latin",
		from: 32,
		to: 126
	},
	{
		name: "Latin-1 Supplement",
		from: 160,
		to: 255
	},
	{
		name: "Latin Extended-A",
		from: 256,
		to: 383
	},
	{
		name: "Latin Extended-B",
		from: 384,
		to: 591
	},
	{
		name: "IPA Extensions",
		from: 592,
		to: 687
	},
	{
		name: "Spacing Modifier Letters",
		from: 688,
		to: 767
	},
	{
		name: "Combining Diacritical Marks",
		from: 768,
		to: 879
	},
	{
		name: "Greek and Coptic",
		from: 880,
		to: 1023
	},
	{
		name: "Cyrillic",
		from: 1024,
		to: 1279
	},
	{
		name: "Cyrillic Supplement",
		from: 1280,
		to: 1327
	},
	{
		name: "Armenian",
		from: 1328,
		to: 1423
	},
	{
		name: "Hebrew",
		from: 1424,
		to: 1535
	},
	{
		name: "Arabic",
		from: 1536,
		to: 1791
	},
	{
		name: "Devanagari",
		from: 2304,
		to: 2431
	},
	{
		name: "Thai",
		from: 3584,
		to: 3711
	},
	{
		name: "Vietnamese (Latin Extended Additional)",
		from: 7680,
		to: 7935
	},
	{
		name: "General Punctuation",
		from: 8192,
		to: 8303
	},
	{
		name: "Superscripts and Subscripts",
		from: 8304,
		to: 8351
	},
	{
		name: "Currency Symbols",
		from: 8352,
		to: 8399
	},
	{
		name: "Letterlike Symbols",
		from: 8448,
		to: 8527
	},
	{
		name: "Number Forms",
		from: 8528,
		to: 8591
	},
	{
		name: "Arrows",
		from: 8592,
		to: 8703
	},
	{
		name: "Mathematical Operators",
		from: 8704,
		to: 8959
	},
	{
		name: "Box Drawing",
		from: 9472,
		to: 9599
	},
	{
		name: "Geometric Shapes",
		from: 9632,
		to: 9727
	},
	{
		name: "Emoji (Misc Symbols/Pictographs)",
		from: 127744,
		to: 128767
	}
];
/**
* Counts drawn vs. project-defined glyphs per Unicode block. "Total" is the
* block's full codepoint range (a theoretical max); "defined" is how many of
* those codepoints exist in the project at all; "drawn" is how many of those
* defined glyphs have outlines or components.
*/
var computeBlockCoverage = (glyphs) => {
	const codepoints = Object.keys(glyphs).map((k) => Number(k));
	return RELEVANT_BLOCKS.map((block) => {
		const inBlock = codepoints.filter((cp) => cp >= block.from && cp <= block.to);
		return {
			block,
			drawn: inBlock.filter((cp) => {
				const g = glyphs[cp];
				return (g.contours?.length ?? 0) > 0 || (g.components?.length ?? 0) > 0;
			}).length,
			defined: inBlock.length,
			total: block.to - block.from + 1
		};
	}).filter((c) => c.defined > 0);
};
//#endregion
//#region src/lib/ui/GlyphStatusHeatmap.svelte
function GlyphStatusHeatmap($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { glyphs, cols = 32, cellSize = 8, onpick } = $$props;
		const sorted = derived(() => [...glyphs].sort((a, b) => a.codepoint - b.codepoint));
		const colorFor = (g) => {
			if (g.status === "final") return "hsl(var(--success))";
			if (g.status === "draft") return "hsl(var(--accent))";
			if (g.status === "sketch") return "hsl(var(--warn))";
			return "hsl(var(--fg-subtle) / 0.25)";
		};
		$$renderer.push(`<div class="grid gap-px overflow-hidden rounded"${attr_style(`grid-template-columns: repeat(${stringify(cols)}, ${stringify(cellSize)}px);`)}><!--[-->`);
		const each_array = ensure_array_like(sorted());
		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let g = each_array[$$index];
			$$renderer.push(`<button type="button" class="block transition-transform hover:scale-150 hover:z-10"${attr_style(`width: ${stringify(cellSize)}px; height: ${stringify(cellSize)}px; background-color: ${stringify(colorFor(g))};`)}${attr("title", `${stringify(g.name)} · U+${stringify(g.codepoint.toString(16).toUpperCase().padStart(4, "0"))} · ${stringify(g.status)}`)}${attr("aria-label", `${stringify(g.name)} (${stringify(g.status)})`)}></button>`);
		}
		$$renderer.push(`<!--]--></div>`);
	});
}
//#endregion
//#region src/lib/ui/StatsPopover.svelte
function StatsPopover($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { open, onclose } = $$props;
		const project = derived(() => projectStore.project);
		const drawn = derived(() => project() ? Object.values(project().glyphs).filter((g) => g.contours.length > 0).length : 0);
		const total = derived(() => project() ? Object.keys(project().glyphs).length : 0);
		const drawnPct = derived(() => total() > 0 ? Math.round(drawn() / total() * 100) : 0);
		const auditCounts = derived(() => {
			if (!project()) return {
				error: 0,
				warn: 0,
				info: 0
			};
			const issues = preflightProject(project());
			return {
				error: issues.filter((i) => i.severity === "error").length,
				warn: issues.filter((i) => i.severity === "warn").length,
				info: issues.filter((i) => i.severity === "info").length
			};
		});
		const composites = derived(() => project() ? Object.values(project().glyphs).filter((g) => (g.components?.length ?? 0) > 0).length : 0);
		const anchorsTotal = derived(() => project() ? Object.values(project().glyphs).reduce((n, g) => n + (g.anchors?.length ?? 0), 0) : 0);
		const pinnedCount = derived(() => project() ? Object.values(project().glyphs).filter((g) => g.pinned).length : 0);
		const notesCount = derived(() => project() ? Object.values(project().glyphs).filter((g) => g.notes?.trim()).length : 0);
		const flaggedCount = derived(() => project() ? Object.values(project().glyphs).filter((g) => g.flagged).length : 0);
		derived(() => project() ? Object.values(project().glyphs).find((g) => g.flagged)?.codepoint : void 0);
		const editsToday = derived(() => {
			if (!project()) return 0;
			const dayAgo = Date.now() - 24 * 3600 * 1e3;
			return Object.values(project().glyphs).filter((g) => {
				const t = Date.parse(g.updatedAt);
				return Number.isFinite(t) && t >= dayAgo;
			}).length;
		});
		const editsThisWeek = derived(() => {
			if (!project()) return 0;
			const weekAgo = Date.now() - 168 * 3600 * 1e3;
			return Object.values(project().glyphs).filter((g) => {
				const t = Date.parse(g.updatedAt);
				return Number.isFinite(t) && t >= weekAgo;
			}).length;
		});
		const editsByDay = derived(() => {
			if (!project()) return new Array(14).fill(0);
			const DAY_MS = 24 * 3600 * 1e3;
			const todayMid = /* @__PURE__ */ new Date();
			todayMid.setHours(0, 0, 0, 0);
			const todayMidMs = todayMid.getTime();
			const buckets = new Array(14).fill(0);
			for (const g of Object.values(project().glyphs)) {
				const t = Date.parse(g.updatedAt);
				if (!Number.isFinite(t)) continue;
				const dayOffset = Math.floor((todayMidMs - t) / DAY_MS);
				if (dayOffset >= 0 && dayOffset < 14) buckets[13 - dayOffset]++;
			}
			return buckets;
		});
		const editsByDayTotal = derived(() => editsByDay().reduce((a, b) => a + b, 0));
		const recentEdits = derived(() => {
			if (!project()) return [];
			const dayAgo = Date.now() - 24 * 3600 * 1e3;
			return Object.values(project().glyphs).filter((g) => {
				const t = Date.parse(g.updatedAt);
				return Number.isFinite(t) && t >= dayAgo;
			}).sort((a, b) => a.updatedAt < b.updatedAt ? 1 : -1).slice(0, 8);
		});
		const currentTags = derived(() => project()?.tags ?? []);
		const suggestedTags = derived(() => {
			if (!project()) return [];
			const set = /* @__PURE__ */ new Set();
			const useCases = project().brief?.useCases ?? [];
			if (useCases.includes("body-text")) set.add("body");
			if (useCases.includes("display")) set.add("display");
			if (useCases.includes("code")) set.add("mono");
			if (useCases.includes("web-ui")) set.add("ui");
			if (useCases.includes("editorial")) set.add("editorial");
			if (useCases.includes("branding")) set.add("branding");
			if (useCases.includes("print")) set.add("print");
			const family = project().metadata.familyName.toLowerCase();
			if (/serif/.test(family)) set.add("serif");
			if (/sans/.test(family)) set.add("sans");
			if (/mono/.test(family)) set.add("mono");
			if (/script/.test(family)) set.add("script");
			return [...set].filter((t) => !currentTags().includes(t));
		});
		const blockCoverage = derived(() => project() ? computeBlockCoverage(project().glyphs) : []);
		const projectFileSizeKb = derived(() => {
			if (!project()) return 0;
			try {
				return JSON.stringify(project()).length / 1024;
			} catch {
				return 0;
			}
		});
		const briefCompleteness = derived(() => {
			if (!project()) return {
				filled: 0,
				total: 6,
				pct: 0
			};
			const b = project().brief ?? {};
			const checks = [
				!!b.intent?.trim(),
				!!b.audience?.trim(),
				(b.useCases?.length ?? 0) > 0,
				!!b.readingConditions?.trim(),
				!!b.differentiation?.trim(),
				(b.references?.length ?? 0) > 0
			];
			const filled = checks.filter(Boolean).length;
			return {
				filled,
				total: checks.length,
				pct: Math.round(filled / checks.length * 100)
			};
		});
		if (open && project()) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div role="dialog" aria-modal="false" aria-label="Project stats" class="absolute right-2 top-full z-40 mt-1.5 w-80 rounded-lg border border-border bg-surface shadow-xl"><div class="flex items-center justify-between border-b border-border px-4 py-2.5"><h2 class="text-[12px] font-semibold tracking-wide text-fg">${escape_html(project().metadata.familyName)}</h2> <button type="button" class="rounded p-0.5 text-fg-subtle hover:bg-surface-2 hover:text-fg" aria-label="Close" title="Close stats (Esc)">`);
			X($$renderer, { class: "size-3.5" });
			$$renderer.push(`<!----></button></div> <div class="grid gap-3 p-4"><div><div class="flex items-baseline justify-between text-[11px]" data-numeric=""><span class="font-medium text-fg-muted">Coverage</span> <span class="font-mono text-fg">${escape_html(drawn())} / ${escape_html(total())} drawn · ${escape_html(drawnPct())}%</span></div> <div class="mt-1 h-1 overflow-hidden rounded-full bg-surface-2"><div class="h-full bg-accent transition-all duration-500"${attr_style(`width: ${stringify(drawnPct())}%;`)}></div></div></div> `);
			if (editsByDayTotal() > 0) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div><div class="flex items-baseline justify-between text-[11px]" data-numeric=""><span class="font-medium text-fg-muted">Edits, last 14 days</span> <span class="font-mono text-fg">${escape_html(editsByDayTotal())} total</span></div> <div class="mt-1">`);
				Sparkline($$renderer, {
					values: editsByDay(),
					width: 272,
					height: 28,
					label: "Edits per day, last 14 days"
				});
				$$renderer.push(`<!----></div></div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> <div><div class="mb-1 flex items-baseline justify-between text-[11px]"><span class="font-medium text-fg-muted">Status map</span> <span class="flex items-center gap-2 font-mono text-[10px] text-fg-subtle" data-numeric=""><span class="inline-flex items-center gap-1"><span class="size-1.5 rounded-full bg-success"></span>final</span> <span class="inline-flex items-center gap-1"><span class="size-1.5 rounded-full bg-accent"></span>draft</span> <span class="inline-flex items-center gap-1"><span class="size-1.5 rounded-full bg-warn"></span>sketch</span></span></div> `);
			GlyphStatusHeatmap($$renderer, {
				glyphs: Object.values(project().glyphs),
				cols: 32,
				cellSize: 8,
				onpick: (cp) => {
					projectStore.selectGlyph(cp);
					onclose();
				}
			});
			$$renderer.push(`<!----></div> `);
			if (blockCoverage().length > 0) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div><div class="mb-1 flex items-baseline justify-between text-[11px]"><span class="font-medium text-fg-muted">Coverage by Unicode block</span> <span class="font-mono text-[10px] text-fg-subtle" data-numeric="">${escape_html(blockCoverage().length)} blocks</span></div> <ul class="grid gap-1"><!--[-->`);
				const each_array = ensure_array_like(blockCoverage());
				for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
					let c = each_array[$$index];
					const pct = c.defined > 0 ? Math.round(c.drawn / c.defined * 100) : 0;
					$$renderer.push(`<li><div class="flex items-baseline justify-between gap-2 text-[11px]" data-numeric=""><span class="min-w-0 truncate text-fg-muted">${escape_html(c.block.name)}</span> <span class="font-mono text-fg-subtle">${escape_html(c.drawn)}/${escape_html(c.defined)} `);
					if (c.defined < c.total) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<span class="opacity-50">· ${escape_html(c.total - c.defined)} not in project</span>`);
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]--></span></div> <div class="mt-0.5 h-1 overflow-hidden rounded-full bg-surface-2"><div${attr_class(`h-full ${stringify(pct === 100 ? "bg-success" : pct >= 50 ? "bg-accent" : "bg-warn")}`)}${attr_style(`width: ${stringify(pct)}%;`)}></div></div></li>`);
				}
				$$renderer.push(`<!--]--></ul></div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (recentEdits().length > 0) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div><div class="mb-1 text-[11px] font-medium text-fg-muted">Edited today</div> <div class="flex flex-wrap gap-1"><!--[-->`);
				const each_array_1 = ensure_array_like(recentEdits());
				for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
					let g = each_array_1[$$index_1];
					$$renderer.push(`<a${attr("href", `/project/${stringify(project().id)}/edit`)} class="inline-flex items-center gap-1 rounded bg-surface-2/60 px-1.5 py-0.5 font-mono text-[10px] text-fg hover:bg-surface-2" data-numeric=""${attr("title", `${stringify(g.name)} · U+${stringify(g.codepoint.toString(16).toUpperCase().padStart(4, "0"))}`)}><span>`);
					if (g.codepoint > 32 && g.codepoint < 65536) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`${escape_html(String.fromCodePoint(g.codepoint))}`);
					} else {
						$$renderer.push("<!--[-1-->");
						$$renderer.push(`${escape_html(g.name)}`);
					}
					$$renderer.push(`<!--]--></span> <span class="text-fg-subtle">${escape_html(g.codepoint.toString(16).toUpperCase().padStart(4, "0"))}</span></a>`);
				}
				$$renderer.push(`<!--]--></div></div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> <div><label class="block text-[10px] font-semibold tracking-wider text-fg-subtle uppercase" for="proj-tags">Tags</label> <div class="mt-1 flex flex-wrap items-center gap-1"><!--[-->`);
			const each_array_2 = ensure_array_like(currentTags());
			for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
				let t = each_array_2[$$index_2];
				$$renderer.push(`<span class="inline-flex items-center gap-0.5 rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent">${escape_html(t)} <button type="button" class="rounded-full p-0.5 hover:bg-accent/15"${attr("aria-label", `Remove tag ${stringify(t)}`)}>`);
				X($$renderer, { class: "size-2.5" });
				$$renderer.push(`<!----></button></span>`);
			}
			$$renderer.push(`<!--]--> <input id="proj-tags" type="text" placeholder="Add tag…" class="min-w-[80px] flex-1 border-0 bg-transparent text-[11px] text-fg outline-none placeholder:text-fg-subtle"/></div> `);
			if (suggestedTags().length > 0) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div class="mt-1 flex flex-wrap items-center gap-1 text-[10px]"><span class="text-fg-subtle">Suggested:</span> <!--[-->`);
				const each_array_3 = ensure_array_like(suggestedTags());
				for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
					let s = each_array_3[$$index_3];
					$$renderer.push(`<button type="button" class="rounded-full border border-dashed border-border px-1.5 py-0.5 text-fg-muted hover:border-accent hover:text-accent">+ ${escape_html(s)}</button>`);
				}
				$$renderer.push(`<!--]--></div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div> <div><label class="block text-[10px] font-semibold tracking-wider text-fg-subtle uppercase" for="proj-desc">Description</label> <textarea id="proj-desc" placeholder="Project brief, goals, references…" rows="2" class="mt-1 block w-full resize-y rounded-md border border-border bg-surface-2/40 px-2 py-1.5 text-[12px] text-fg outline-none focus:border-accent focus:bg-surface">`);
			const $$body = escape_html(project().description ?? "");
			if ($$body) $$renderer.push(`${$$body}`);
			$$renderer.push(`</textarea></div> <dl class="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]"><dt class="text-fg-muted">Composites</dt> <dd class="text-right font-mono text-fg" data-numeric="">${escape_html(composites())}</dd> <dt class="text-fg-muted">Anchors total</dt> <dd class="text-right font-mono text-fg" data-numeric="">${escape_html(anchorsTotal())}</dd> <dt class="text-fg-muted">Kerning pairs</dt> <dd class="text-right font-mono text-fg" data-numeric="">${escape_html(project().kerning.length)}</dd> <dt class="text-fg-muted">Kerning classes</dt> <dd class="text-right font-mono text-fg" data-numeric="">${escape_html(project().classes?.length ?? 0)}</dd> <dt class="text-fg-muted">Masters</dt> <dd class="text-right font-mono text-fg" data-numeric="">${escape_html(1 + (project().masters?.length ?? 0))}</dd> <dt class="text-fg-muted">Axes</dt> <dd class="text-right font-mono text-fg" data-numeric="">${escape_html(project().axes?.length ?? 0)}</dd> <dt class="text-fg-muted">Instances</dt> <dd class="text-right font-mono text-fg" data-numeric="">${escape_html(project().instances?.length ?? 0)}</dd> <dt class="text-fg-muted">Pinned</dt> <dd class="text-right font-mono text-fg" data-numeric="">${escape_html(pinnedCount())}</dd> <dt class="text-fg-muted">With notes</dt> <dd class="text-right font-mono text-fg" data-numeric="">${escape_html(notesCount())}</dd> <dt class="text-fg-muted">Decisions logged</dt> <dd class="text-right font-mono text-fg" data-numeric="">${escape_html(project().decisions?.length ?? 0)}</dd> <dt class="text-fg-muted">Edited today</dt> <dd class="text-right font-mono text-fg" data-numeric="">${escape_html(editsToday())}</dd> <dt class="text-fg-muted">Edited this week</dt> <dd class="text-right font-mono text-fg" data-numeric="">${escape_html(editsThisWeek())}</dd> <dt class="text-fg-muted">Flagged</dt> <dd class="text-right font-mono text-fg" data-numeric="">`);
			if (flaggedCount() > 0) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<a${attr("href", `/project/${stringify(project().id)}/edit`)} class="text-warn hover:underline" title="Jump to the first flagged glyph">${escape_html(flaggedCount())} →</a>`);
			} else {
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`${escape_html(flaggedCount())}`);
			}
			$$renderer.push(`<!--]--></dd> <dt class="text-fg-muted">Last build</dt> <dd class="text-right font-mono text-fg" data-numeric="">${escape_html(previewStore.sizeKb.toFixed(1))} KB · ${escape_html(previewStore.lastBuildMs.toFixed(0))}ms</dd> <dt class="text-fg-muted">Project file</dt> <dd class="text-right font-mono text-fg" data-numeric="">${escape_html(projectFileSizeKb().toFixed(1))} KB JSON</dd> `);
			if (project().familyId) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<dt class="text-fg-muted">Family</dt> <dd class="text-right font-mono text-fg" data-numeric=""><a${attr("href", `/family/${stringify(project().familyId)}`)} class="text-accent hover:underline">${escape_html(project().familyAxes?.wght ?? 400)}${escape_html(project().familyAxes?.ital ? "i" : "")} →</a></dd>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></dl> <div class="border-t border-border pt-3"><a${attr("href", `/project/${stringify(project().id)}/brief`)} class="block rounded-md border border-border bg-surface-2/40 px-2 py-1.5 hover:border-accent"><div class="flex items-baseline justify-between text-[11px]"><span class="font-medium text-fg-muted">Brief completeness</span> <span class="font-mono text-fg" data-numeric="">${escape_html(briefCompleteness().filled)}/${escape_html(briefCompleteness().total)} · ${escape_html(briefCompleteness().pct)}%</span></div> <div class="mt-1 h-1 overflow-hidden rounded-full bg-surface-2"><div class="h-full bg-accent transition-all duration-500"${attr_style(`width: ${stringify(briefCompleteness().pct)}%;`)}></div></div></a></div> <div class="border-t border-border pt-3"><div class="mb-1.5 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Pre-flight</div> `);
			if (auditCounts().error === 0 && auditCounts().warn === 0 && auditCounts().info === 0) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<div class="inline-flex items-center gap-1.5 rounded-md bg-success/10 px-2 py-1 text-[11px] font-medium text-success">`);
				Circle_check($$renderer, { class: "size-3" });
				$$renderer.push(`<!----> All checks pass</div>`);
			} else {
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`<div class="flex flex-wrap gap-1.5">`);
				if (auditCounts().error > 0) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<span class="inline-flex items-center gap-1 rounded-md bg-danger/10 px-2 py-1 text-[11px] font-medium text-danger">`);
					Circle_alert($$renderer, { class: "size-3" });
					$$renderer.push(`<!----> ${escape_html(auditCounts().error)} error${escape_html(auditCounts().error === 1 ? "" : "s")}</span>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--> `);
				if (auditCounts().warn > 0) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<span class="inline-flex items-center gap-1 rounded-md bg-warn/10 px-2 py-1 text-[11px] font-medium text-warn">`);
					Triangle_alert($$renderer, { class: "size-3" });
					$$renderer.push(`<!----> ${escape_html(auditCounts().warn)} warning${escape_html(auditCounts().warn === 1 ? "" : "s")}</span>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--> `);
				if (auditCounts().info > 0) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`<span class="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-1 text-[11px] font-medium text-accent">`);
					Info($$renderer, { class: "size-3" });
					$$renderer.push(`<!----> ${escape_html(auditCounts().info)} hint${escape_html(auditCounts().info === 1 ? "" : "s")}</span>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--></div> <a${attr("href", `/project/${stringify(project().id)}/export`)} class="mt-2 inline-block text-[11px] text-accent hover:underline">See details on Export →</a>`);
			}
			$$renderer.push(`<!--]--></div></div></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
//#region src/lib/ui/CommandPalette.svelte
function CommandPalette($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { open, onclose } = $$props;
		let query = "";
		let cursor = 0;
		const allGlyphs = derived(() => Object.values(projectStore.activeGlyphs));
		const results = derived(() => {
			query.trim();
			return allGlyphs().filter((g) => g.contours.length > 0).sort((a, b) => a.updatedAt < b.updatedAt ? 1 : -1).slice(0, 12);
		});
		const labelFor = (g) => {
			return (g.codepoint > 32 && g.codepoint < 65536 ? String.fromCodePoint(g.codepoint) : "") || g.name;
		};
		if (open) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<button type="button" class="fixed inset-0 z-40 cursor-default bg-canvas/60 backdrop-blur-sm" aria-label="Close palette" tabindex="-1"></button> <div role="dialog" aria-modal="true" aria-label="Glyph search" class="fixed left-1/2 top-[20%] z-50 w-[min(540px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"><div class="relative border-b border-border">`);
			Search($$renderer, { class: "pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" });
			$$renderer.push(`<!----> <input${attr("value", query)} placeholder="Search glyph by character, name, or U+XXXX…" class="w-full bg-transparent py-3.5 pl-11 pr-4 text-[14px] text-fg outline-none"/></div> <ul class="max-h-[420px] overflow-y-auto py-1">`);
			if (results().length === 0) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<li class="px-4 py-6 text-center text-[12px] text-fg-subtle">No glyphs match "${escape_html(query)}".</li>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> <!--[-->`);
			const each_array = ensure_array_like(results());
			for (let i = 0, $$length = each_array.length; i < $$length; i++) {
				let g = each_array[i];
				$$renderer.push(`<li><button type="button"${attr_class(`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors ${stringify(cursor === i ? "bg-accent-soft/40" : "hover:bg-surface-2")}`)}><span class="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-surface-2 text-lg" style="font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;">${escape_html(labelFor(g))}</span> <span class="min-w-0 flex-1"><span class="block truncate text-[13px] font-medium text-fg">${escape_html(g.name)}</span> <span class="block truncate text-[11px] text-fg-subtle" data-numeric="">U+${escape_html(g.codepoint.toString(16).toUpperCase().padStart(4, "0"))} `);
				if (g.contours.length === 0) {
					$$renderer.push("<!--[0-->");
					$$renderer.push(`· empty`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--></span></span> <span class="font-mono text-[10px] uppercase text-fg-subtle">${escape_html(g.status)}</span></button></li>`);
			}
			$$renderer.push(`<!--]--></ul> <div class="border-t border-border bg-surface-2/40 px-4 py-1.5 text-[10px] text-fg-subtle"><span class="font-mono">↑↓</span> navigate · <span class="font-mono">↵</span> select · <span class="font-mono">esc</span> close</div></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/chart-column.svelte
function Chart_column($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "chart-column" },
		props,
		{ iconNode: [
			["path", { "d": "M3 3v16a2 2 0 0 0 2 2h16" }],
			["path", { "d": "M18 17V9" }],
			["path", { "d": "M13 17V5" }],
			["path", { "d": "M8 17v-3" }]
		] }
	]));
}
//#endregion
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/save.svelte
function Save($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "save" },
		props,
		{ iconNode: [
			["path", { "d": "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" }],
			["path", { "d": "M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" }],
			["path", { "d": "M7 3v4a1 1 0 0 0 1 1h7" }]
		] }
	]));
}
//#endregion
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/check.svelte
function Check($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "check" },
		props,
		{ iconNode: [["path", { "d": "M20 6 9 17l-5-5" }]] }
	]));
}
//#endregion
//#region src/routes/project/[id]/+layout.svelte
function _layout($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { data, children } = $$props;
		const id = derived(() => page.params.id);
		const currentPath = derived(() => page.url.pathname);
		let sidebarWidth = 260;
		let settingsOpen = false;
		let statsOpen = false;
		let shortcutsOpen = false;
		let paletteOpen = false;
		let nowTick = Date.now();
		const savedAgoLabel = derived(() => {
			const ts = projectStore.lastSavedAt;
			if (!ts) return "Saved";
			const sec = Math.max(0, Math.floor((nowTick - ts) / 1e3));
			if (sec < 5) return "Saved just now";
			if (sec < 60) return `Saved ${sec}s ago`;
			const min = Math.floor(sec / 60);
			if (min < 60) return `Saved ${min}m ago`;
			return `Saved ${Math.floor(min / 60)}h ago`;
		});
		const auditErrorCount = derived(() => {
			const p = projectStore.project;
			if (!p) return 0;
			let n = 0;
			for (const i of auditProject(p)) if (i.severity === "error") n++;
			for (const i of auditCompatibility(p)) if (i.severity === "error") n++;
			for (const i of preflightProject(p)) if (i.severity === "error") n++;
			return n;
		});
		const fourLayers = derived(() => {
			const p = projectStore.project;
			if (!p) return [];
			const b = p.brief ?? {};
			const briefChecks = [
				!!b.intent?.trim(),
				!!b.audience?.trim(),
				(b.useCases?.length ?? 0) > 0,
				!!b.readingConditions?.trim(),
				!!b.differentiation?.trim(),
				(b.references?.length ?? 0) > 0
			];
			const briefPct = Math.round(briefChecks.filter(Boolean).length / 6 * 100);
			const total = Object.keys(p.glyphs).length;
			const drawn = Object.values(p.glyphs).filter((g) => g.contours.length > 0 || (g.components?.length ?? 0) > 0).length;
			const drawingPct = total > 0 ? Math.round(drawn / total * 100) : 0;
			const compiledOk = auditErrorCount() === 0 && drawn >= 26;
			const businessChecks = [
				!!p.metadata.license?.trim(),
				!!p.metadata.copyright?.trim(),
				!!p.metadata.version?.trim(),
				(p.changelog?.length ?? 0) > 0
			];
			const businessPct = Math.round(businessChecks.filter(Boolean).length / 4 * 100);
			return [
				{
					key: "brief",
					label: "Brief",
					pct: briefPct,
					href: `/project/${p.id}/brief`
				},
				{
					key: "drawing",
					label: "Drawing",
					pct: drawingPct,
					href: `/project/${p.id}/edit`
				},
				{
					key: "compiled",
					label: "Compiled",
					pct: compiledOk ? 100 : drawn >= 26 ? 50 : 0,
					href: `/project/${p.id}/audit`
				},
				{
					key: "business",
					label: "Business",
					pct: businessPct,
					href: `/project/${p.id}/release`
				}
			];
		});
		const tabs = derived(() => [
			{
				href: `/project/${id()}/brief`,
				label: "Brief",
				icon: Compass,
				shortcut: "⌘⇧B"
			},
			{
				href: `/project/${id()}/edit`,
				label: "Edit",
				icon: Pen_tool
			},
			{
				href: `/project/${id()}/spacing`,
				label: "Spacing",
				icon: Ruler
			},
			{
				href: `/project/${id()}/designspace`,
				label: "Designspace",
				icon: Sliders_horizontal
			},
			{
				href: `/project/${id()}/features`,
				label: "Features",
				icon: Code_xml
			},
			{
				href: `/project/${id()}/ai`,
				label: "AI",
				icon: Sparkles
			},
			{
				href: `/project/${id()}/preview`,
				label: "Preview",
				icon: Eye
			},
			{
				href: `/project/${id()}/specimen`,
				label: "Specimen",
				icon: File_text
			},
			{
				href: `/project/${id()}/compare`,
				label: "Compare",
				icon: Layers
			},
			{
				href: `/project/${id()}/audit`,
				label: "Audit",
				icon: List_checks,
				badge: auditErrorCount()
			},
			{
				href: `/project/${id()}/release`,
				label: "Release",
				icon: Rocket,
				shortcut: "⌘⇧R"
			},
			{
				href: `/project/${id()}/export`,
				label: "Export",
				icon: Download
			}
		]);
		const isActive = (href) => currentPath() === href || currentPath().startsWith(href + "/");
		const nameInput = derived(() => projectStore.project?.name ?? "");
		$$renderer.push(`<div class="flex h-screen flex-col"><header class="border-b border-border bg-surface"><div class="flex h-[52px] items-center gap-3 border-b border-border/60 px-4"><a href="/" class="inline-flex size-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg" aria-label="Back to projects" title="Back to projects">`);
		Arrow_left($$renderer, { class: "size-4" });
		$$renderer.push(`<!----></a> <div class="h-5 w-px bg-border" aria-hidden="true"></div> <div class="relative flex min-w-0 items-center gap-2">`);
		if (projectStore.selectedGlyph && projectStore.project) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<a${attr("href", `/project/${stringify(projectStore.project.id)}/edit`)} class="shrink-0"${attr("title", `Open ${stringify(projectStore.selectedGlyph.name)} in editor`)}>`);
			GlyphTile($$renderer, {
				glyph: projectStore.selectedGlyph,
				size: 28,
				showLabel: false,
				ascender: projectStore.project.metrics.ascender,
				descender: projectStore.project.metrics.descender
			});
			$$renderer.push(`<!----></a>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <input type="text"${attr("value", nameInput())} class="min-w-0 max-w-[14rem] truncate border-0 bg-transparent px-1 text-[15px] text-fg outline-none focus:ring-1 focus:ring-accent" style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;" aria-label="Project name"/> <button type="button" class="inline-flex size-6 items-center justify-center rounded text-fg-subtle hover:bg-surface-2 hover:text-fg" aria-label="Switch project" title="Switch project">`);
		Chevron_down($$renderer, { class: "size-3.5" });
		$$renderer.push(`<!----></button> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></div> <div class="hidden items-center gap-3 border-l border-border pl-3 lg:flex"><div class="font-mono text-[11px] text-fg-subtle" data-numeric="">${escape_html(projectStore.project?.metadata.familyName)} <span class="mx-1 text-fg-subtle/50">·</span> <span class="text-fg-muted">v${escape_html(projectStore.project?.metadata.version)}</span></div> `);
		if (projectStore.project && (projectStore.project.masters?.length ?? 0) > 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<label class="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2 py-1">`);
			Layers($$renderer, { class: "size-3 text-fg-muted" });
			$$renderer.push(`<!----> `);
			$$renderer.select({
				value: projectStore.selectedMasterId ?? "",
				onchange: (e) => projectStore.selectMaster(e.currentTarget.value || void 0),
				class: "bg-transparent text-[11px] font-medium text-fg outline-none",
				"aria-label": "Master"
			}, ($$renderer) => {
				$$renderer.option({ value: "" }, ($$renderer) => {
					$$renderer.push(`Default`);
				});
				$$renderer.push(`<!--[-->`);
				const each_array_1 = ensure_array_like(projectStore.project.masters ?? []);
				for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
					let m = each_array_1[$$index_1];
					$$renderer.option({ value: m.id }, ($$renderer) => {
						$$renderer.push(`${escape_html(m.name)}`);
					});
				}
				$$renderer.push(`<!--]-->`);
			});
			$$renderer.push(`</label>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		if (projectStore.project?.familyId) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<a${attr("href", `/family/${stringify(projectStore.project.familyId)}`)} class="inline-flex items-center gap-1 rounded bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent hover:bg-accent hover:text-accent-fg" title="Open family hub">`);
			Layers($$renderer, { class: "size-2.5" });
			$$renderer.push(`<!----> Family `);
			if (projectStore.project.familyAxes?.wght || projectStore.project.familyAxes?.ital) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<span class="font-mono" data-numeric="">${escape_html(projectStore.project.familyAxes?.wght ?? 400)}${escape_html(projectStore.project.familyAxes?.ital ? "i" : "")}</span>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></a>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></div> <div class="flex-1"></div> <div class="hidden items-center gap-1.5 rounded-md bg-surface-2/60 px-2.5 py-1 font-mono text-[11px] text-fg-muted md:inline-flex" data-numeric=""${attr("title", projectStore.saving ? "Saving project to local storage" : projectStore.dirty ? "Unsaved changes will autosave shortly" : "Saved to local storage")}>`);
		if (projectStore.saving) {
			$$renderer.push("<!--[0-->");
			Loader_circle($$renderer, { class: "size-3 animate-spin" });
			$$renderer.push(`<!----> <span>Saving…</span>`);
		} else if (projectStore.dirty) {
			$$renderer.push("<!--[1-->");
			Save($$renderer, { class: "size-3" });
			$$renderer.push(`<!----> <span>Unsaved</span>`);
		} else {
			$$renderer.push("<!--[-1-->");
			Check($$renderer, { class: "size-3 text-success" });
			$$renderer.push(`<!----> <span>${escape_html(savedAgoLabel())}</span>`);
		}
		$$renderer.push(`<!--]--></div> <div class="flex items-center gap-0.5 rounded-md border border-border/60 bg-surface-2/30 p-0.5"><div class="relative"><button type="button" class="inline-flex size-7 items-center justify-center rounded text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg" aria-label="Project stats" title="Project stats">`);
		Chart_column($$renderer, { class: "size-3.5" });
		$$renderer.push(`<!----></button> `);
		StatsPopover($$renderer, {
			open: statsOpen,
			onclose: () => statsOpen = false
		});
		$$renderer.push(`<!----></div> <button type="button"${attr_class(`inline-flex size-7 items-center justify-center rounded transition-colors hover:bg-surface-2 ${stringify(projectStore.project?.locked ? "text-warn" : "text-fg-muted hover:text-fg")}`)}${attr("aria-label", projectStore.project?.locked ? "Unlock project" : "Lock project (read-only)")}${attr("title", projectStore.project?.locked ? "Project is locked — unlock to edit (⌘⇧L)" : "Lock — seal as read-only (⌘⇧L)")}>`);
		if (projectStore.project?.locked) {
			$$renderer.push("<!--[0-->");
			Lock($$renderer, { class: "size-3.5" });
		} else {
			$$renderer.push("<!--[-1-->");
			Lock_open($$renderer, { class: "size-3.5" });
		}
		$$renderer.push(`<!--]--></button> <button type="button" class="inline-flex size-7 items-center justify-center rounded text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg" aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)">`);
		Circle_question_mark($$renderer, { class: "size-3.5" });
		$$renderer.push(`<!----></button> <button type="button" class="inline-flex size-7 items-center justify-center rounded text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg" aria-label="Settings" title="Settings (API key, etc.)">`);
		Settings($$renderer, { class: "size-3.5" });
		$$renderer.push(`<!----></button></div></div> <div class="flex h-[38px] items-center gap-3 px-4"><nav class="flex flex-1 items-center gap-0.5 overflow-x-auto"><!--[-->`);
		const each_array_2 = ensure_array_like(tabs());
		for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
			let tab = each_array_2[$$index_2];
			const Icon = tab.icon;
			$$renderer.push(`<a${attr("href", tab.href)}${attr("title", "shortcut" in tab ? `${tab.label} (${tab.shortcut})` : tab.label)}${attr_class(`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${stringify(isActive(tab.href) ? "bg-surface-2 text-fg" : "text-fg-muted hover:text-fg")}`)}>`);
			if (Icon) {
				$$renderer.push("<!--[-->");
				Icon($$renderer, { class: "size-3.5" });
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
			$$renderer.push(` ${escape_html(tab.label)} `);
			if ("badge" in tab && (tab.badge ?? 0) > 0) {
				$$renderer.push("<!--[0-->");
				$$renderer.push(`<span class="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 font-mono text-[9px] font-semibold text-canvas" data-numeric=""${attr("aria-label", `${stringify(tab.badge)} errors`)}>${escape_html(tab.badge)}</span>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></a>`);
		}
		$$renderer.push(`<!--]--></nav> <div class="flex items-center gap-0.5"><button type="button"${attr("disabled", !projectStore.canUndo, true)} class="inline-flex size-7 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent" aria-label="Undo" title="Undo (⌘Z)">`);
		Undo_2($$renderer, { class: "size-3.5" });
		$$renderer.push(`<!----></button> <button type="button"${attr("disabled", !projectStore.canRedo, true)} class="inline-flex size-7 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent" aria-label="Redo" title="Redo (⌘⇧Z)">`);
		Redo_2($$renderer, { class: "size-3.5" });
		$$renderer.push(`<!----></button></div> `);
		if (fourLayers().length > 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="hidden items-center gap-2 border-l border-border pl-3 lg:flex" title="font5.md's four-layer model: brief → drawing → compiled → business" aria-label="Project layer progress"><!--[-->`);
			const each_array_3 = ensure_array_like(fourLayers());
			for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
				let layer = each_array_3[$$index_3];
				$$renderer.push(`<a${attr("href", layer.href)} class="group flex flex-col items-center gap-0.5"${attr("title", `${stringify(layer.label)}: ${stringify(layer.pct)}%`)}><div class="h-[3px] w-9 overflow-hidden rounded-full bg-surface-2"><div${attr_class(`h-full ${stringify(layer.pct === 100 ? "bg-success" : layer.pct >= 50 ? "bg-accent" : "bg-warn")}`)}${attr_style(`width: ${stringify(layer.pct)}%;`)}></div></div> <span class="text-[9px] tracking-wider text-fg-subtle uppercase group-hover:text-fg">${escape_html(layer.label)}</span></a>`);
			}
			$$renderer.push(`<!--]--></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <div class="hidden items-center gap-1.5 lg:flex">`);
		if (projectStore.project?.changelog?.[0]) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<a${attr("href", `/project/${stringify(projectStore.project.id)}/release`)} class="rounded bg-surface-2/60 px-1.5 py-0.5 font-mono text-[10px] text-fg-muted hover:bg-surface-2 hover:text-fg" title="Last sealed version (jump to Release)" data-numeric="">v${escape_html(projectStore.project.changelog[0].version)}</a>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		if (previewStore.sizeKb > 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<a${attr("href", `/project/${stringify(projectStore.project?.id)}/export`)} class="rounded bg-surface-2/60 px-1.5 py-0.5 font-mono text-[10px] text-fg-muted hover:bg-surface-2 hover:text-fg"${attr("title", `Last preview build size · ${stringify(previewStore.lastBuildMs.toFixed(0))}ms — jump to Export`)} data-numeric="">${escape_html(previewStore.sizeKb.toFixed(1))} KB</a>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></div></div></header> `);
		SettingsDialog($$renderer, {
			open: settingsOpen,
			onclose: () => settingsOpen = false
		});
		$$renderer.push(`<!----> `);
		ShortcutsDialog($$renderer, {
			open: shortcutsOpen,
			onclose: () => shortcutsOpen = false
		});
		$$renderer.push(`<!----> `);
		CommandPalette($$renderer, {
			open: paletteOpen,
			onclose: () => paletteOpen = false
		});
		$$renderer.push(`<!----> `);
		if (projectStore.project?.locked) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="flex items-center gap-2 border-b border-warn/40 bg-warn/10 px-4 py-1.5 text-[12px] text-warn">`);
			Lock($$renderer, { class: "size-3.5" });
			$$renderer.push(`<!----> <span class="font-medium">Project is locked.</span> <span class="text-fg-muted">All edits are blocked until you unlock it.</span></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <div class="flex min-h-0 flex-1">`);
		$$renderer.push("<!--[0-->");
		$$renderer.push(`<div class="shrink-0"${attr_style(`width: ${stringify(sidebarWidth)}px;`)}>`);
		GlyphBrowser($$renderer, {});
		$$renderer.push(`<!----></div> <div role="separator" aria-orientation="vertical" aria-label="Resize sidebar"${attr_class(`group flex w-1 shrink-0 cursor-col-resize items-center justify-center bg-border transition-colors hover:bg-accent ${stringify("")}`)}><span class="h-8 w-px bg-border-strong group-hover:bg-accent"></span></div>`);
		$$renderer.push(`<!--]--> <main class="min-h-0 min-w-0 flex-1 overflow-hidden bg-canvas">`);
		children($$renderer);
		$$renderer.push(`<!----></main></div></div>`);
	});
}
//#endregion
export { _layout as default };
