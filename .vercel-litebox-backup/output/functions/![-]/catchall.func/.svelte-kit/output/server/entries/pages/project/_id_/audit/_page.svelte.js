import { G as escape_html, U as attr, c as ensure_array_like, f as stringify, n as attr_class, o as derived } from "../../../../../chunks/dev.js";
import "../../../../../chunks/toast2.svelte.js";
import { n as Circle_check, t as Circle_alert } from "../../../../../chunks/circle-alert.js";
import { n as Triangle_alert, t as Info } from "../../../../../chunks/info.js";
import "../../../../../chunks/navigation.js";
import { t as projectStore } from "../../../../../chunks/project.svelte.js";
import { n as Search, t as List_checks } from "../../../../../chunks/list-checks.js";
import { a as sortBySeverity, i as preflightProject, r as auditProject, t as auditCompatibility } from "../../../../../chunks/audit.js";
import { t as Panel } from "../../../../../chunks/Panel.js";
import { t as Wand_sparkles } from "../../../../../chunks/wand-sparkles.js";
import { t as LoadingPanel } from "../../../../../chunks/LoadingPanel.js";
//#region src/routes/project/[id]/audit/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const project = derived(() => projectStore.project);
		const allIssues = derived(() => {
			if (!project()) return [];
			const out = [];
			out.push(...auditProject(project()));
			out.push(...auditCompatibility(project()));
			out.push(...preflightProject(project()));
			const seen = /* @__PURE__ */ new Set();
			const dedup = [];
			for (const i of out) {
				const k = `${i.codepoint}:${i.code}:${i.message}`;
				if (seen.has(k)) continue;
				seen.add(k);
				dedup.push(i);
			}
			return sortBySeverity(dedup);
		});
		let query = "";
		let severityFilter = "all";
		let groupMode = "code";
		const filtered = derived(() => {
			const q = query.trim().toLowerCase();
			return allIssues().filter((i) => {
				if (severityFilter !== "all" && i.severity !== severityFilter) return false;
				if (!q) return true;
				return i.message.toLowerCase().includes(q) || i.code.toLowerCase().includes(q) || i.codepoint > 0 && i.codepoint.toString(16).toLowerCase().includes(q);
			});
		});
		const counts = derived(() => ({
			all: allIssues().length,
			error: allIssues().filter((i) => i.severity === "error").length,
			warn: allIssues().filter((i) => i.severity === "warn").length,
			info: allIssues().filter((i) => i.severity === "info").length
		}));
		const grouped = derived(() => {
			const map = /* @__PURE__ */ new Map();
			for (const i of filtered()) {
				const list = map.get(i.code) ?? [];
				list.push(i);
				map.set(i.code, list);
			}
			return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
		});
		const groupedByGlyph = derived(() => {
			const map = /* @__PURE__ */ new Map();
			for (const i of filtered()) {
				const key = i.codepoint;
				const list = map.get(key) ?? [];
				list.push(i);
				map.set(key, list);
			}
			return [...map.entries()].sort((a, b) => {
				if (a[0] === 0 && b[0] !== 0) return -1;
				if (b[0] === 0 && a[0] !== 0) return 1;
				return b[1].length - a[1].length;
			});
		});
		const FIXABLE_CODES = new Set([
			"open-contour",
			"overflows-advance",
			"zero-advance",
			"naming-version",
			"metrics-asc-mismatch",
			"metrics-desc-mismatch",
			"metrics-gap-mismatch",
			"metrics-use-typo-off",
			"glyph-name-invalid",
			"glyph-name-empty",
			"glyph-name-too-long"
		]);
		const nextToFix = derived(() => {
			const score = (i) => {
				let s = 0;
				if (i.severity === "error") s += 100;
				else if (i.severity === "warn") s += 50;
				else s += 20;
				if (FIXABLE_CODES.has(i.code)) s += 30;
				return s;
			};
			return [...allIssues()].sort((a, b) => score(b) - score(a)).slice(0, 3);
		});
		const fixableInList = derived(() => filtered().filter((i) => FIXABLE_CODES.has(i.code)));
		const labelFor = (cp) => {
			if (cp === 0) return "Project";
			const g = project()?.glyphs[cp];
			if (!g) return `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
			const char = cp > 32 && cp < 65536 ? String.fromCodePoint(cp) : "";
			return char ? `${char} (${g.name})` : g.name;
		};
		if (!project()) {
			$$renderer.push("<!--[0-->");
			LoadingPanel($$renderer, { label: "Running audit" });
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div class="h-full overflow-auto"><div class="mx-auto flex max-w-5xl flex-col gap-6 p-6"><header class="flex items-start gap-3"><div class="mt-1 flex size-9 items-center justify-center rounded-md bg-accent-soft text-accent">`);
			List_checks($$renderer, { class: "size-4" });
			$$renderer.push(`<!----></div> <div><h1 class="text-xl font-semibold tracking-tight">Audit</h1> <p class="text-sm text-fg-muted">Every per-glyph issue, master compatibility break, and pre-flight check
						aggregated into one sortable view. Click any glyph to jump in and fix it.</p></div></header> `);
			if (nextToFix().length > 0) {
				$$renderer.push("<!--[0-->");
				Panel($$renderer, {
					children: ($$renderer) => {
						$$renderer.push(`<div class="mb-2 flex items-baseline justify-between gap-2"><h2 class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Next to fix</h2> <span class="text-[10px] font-mono text-fg-subtle" data-numeric="">top ${escape_html(nextToFix().length)} of ${escape_html(allIssues().length)}</span></div> <ul class="grid gap-1"><!--[-->`);
						const each_array = ensure_array_like(nextToFix());
						for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
							let i = each_array[$$index];
							$$renderer.push(`<li class="flex items-start gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2"><span class="mt-0.5">`);
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
							$$renderer.push(`<!--]--></span> <div class="min-w-0 flex-1"><div class="text-[12px] text-fg">${escape_html(i.message)}</div> <div class="mt-0.5 font-mono text-[10px] text-fg-subtle" data-numeric="">${escape_html(i.code)} `);
							if (i.codepoint > 0) {
								$$renderer.push("<!--[0-->");
								$$renderer.push(`· ${escape_html(labelFor(i.codepoint))}`);
							} else $$renderer.push("<!--[-1-->");
							$$renderer.push(`<!--]--></div></div> `);
							if (FIXABLE_CODES.has(i.code)) {
								$$renderer.push("<!--[0-->");
								$$renderer.push(`<button type="button" class="inline-flex items-center gap-1 rounded border border-accent/40 bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent hover:border-accent hover:bg-accent/15" title="Apply automatic fix">`);
								Wand_sparkles($$renderer, { class: "size-2.5" });
								$$renderer.push(`<!----> Fix</button>`);
							} else $$renderer.push("<!--[-1-->");
							$$renderer.push(`<!--]--> `);
							if (i.codepoint > 0 && project().glyphs[i.codepoint]) {
								$$renderer.push("<!--[0-->");
								$$renderer.push(`<button type="button" class="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-fg-muted hover:border-accent hover:text-accent" title="Open this glyph in the editor">Open →</button>`);
							} else $$renderer.push("<!--[-1-->");
							$$renderer.push(`<!--]--></li>`);
						}
						$$renderer.push(`<!--]--></ul>`);
					},
					$$slots: { default: true }
				});
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			Panel($$renderer, {
				children: ($$renderer) => {
					$$renderer.push(`<div class="mb-3 flex flex-wrap items-center gap-2"><!--[-->`);
					const each_array_1 = ensure_array_like([
						{
							id: "all",
							label: "All",
							n: counts().all,
							color: "text-fg"
						},
						{
							id: "error",
							label: "Errors",
							n: counts().error,
							color: "text-danger"
						},
						{
							id: "warn",
							label: "Warnings",
							n: counts().warn,
							color: "text-warn"
						},
						{
							id: "info",
							label: "Hints",
							n: counts().info,
							color: "text-accent"
						}
					]);
					for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
						let opt = each_array_1[$$index_1];
						$$renderer.push(`<button type="button"${attr_class(`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${stringify(severityFilter === opt.id ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface-2/40 hover:border-border-strong")}`)}>${escape_html(opt.label)} <span${attr_class(`font-mono ${stringify(opt.color)}`)} data-numeric="">${escape_html(opt.n)}</span></button>`);
					}
					$$renderer.push(`<!--]--> `);
					if (fixableInList().length > 0) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<button type="button" class="inline-flex items-center gap-1 rounded-md border border-accent bg-accent text-accent-fg px-2.5 py-1 text-[11px] font-medium hover:bg-accent/90" title="Apply automatic fixes to every mechanically-fixable issue in the visible list">`);
						Wand_sparkles($$renderer, { class: "size-3" });
						$$renderer.push(`<!----> Fix ${escape_html(fixableInList().length)} applicable</button>`);
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]--> <div class="ml-auto flex items-center gap-2"><div class="inline-flex rounded-md border border-border bg-surface p-0.5"><button type="button"${attr_class(`rounded px-2 py-0.5 text-[11px] ${stringify(groupMode === "code" ? "bg-accent-soft text-accent" : "text-fg-muted hover:text-fg")}`)} title="Group issues by check">By check</button> <button type="button"${attr_class(`rounded px-2 py-0.5 text-[11px] ${stringify(groupMode === "glyph" ? "bg-accent-soft text-accent" : "text-fg-muted hover:text-fg")}`)} title="Group issues by glyph">By glyph</button></div> <div class="relative">`);
					Search($$renderer, { class: "pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-fg-subtle" });
					$$renderer.push(`<!----> <input${attr("value", query)} placeholder="Search by message, code, hex…" class="w-64 rounded-md border border-border bg-surface px-3 py-1.5 pl-8 text-[12px] text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"/></div></div></div> `);
					if (filtered().length === 0) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<div class="rounded-lg border border-dashed border-success/40 bg-success/5 p-10 text-center">`);
						Circle_check($$renderer, { class: "mx-auto mb-2 size-6 text-success" });
						$$renderer.push(`<!----> `);
						if (counts().all === 0) {
							$$renderer.push("<!--[0-->");
							$$renderer.push(`<div class="text-[13px] font-medium text-success">All checks pass</div> <div class="mt-1 text-[12px] text-fg-muted">No errors, warnings, or hints reported on the current state.</div>`);
						} else {
							$$renderer.push("<!--[-1-->");
							$$renderer.push(`<div class="text-[13px] font-medium text-fg">No issues match this filter.</div>`);
						}
						$$renderer.push(`<!--]--></div>`);
					} else if (groupMode === "code") {
						$$renderer.push("<!--[1-->");
						$$renderer.push(`<div class="grid gap-4"><!--[-->`);
						const each_array_2 = ensure_array_like(grouped());
						for (let $$index_3 = 0, $$length = each_array_2.length; $$index_3 < $$length; $$index_3++) {
							let [code, issues] = each_array_2[$$index_3];
							$$renderer.push(`<div><div class="mb-1.5 flex items-baseline justify-between gap-2"><h3 class="font-mono text-[11px] font-semibold text-fg">${escape_html(code)}</h3> <span class="text-[10px] font-mono text-fg-subtle" data-numeric="">${escape_html(issues.length)} occurrence${escape_html(issues.length === 1 ? "" : "s")}</span></div> <ul class="grid gap-1"><!--[-->`);
							const each_array_3 = ensure_array_like(issues);
							for (let $$index_2 = 0, $$length = each_array_3.length; $$index_2 < $$length; $$index_2++) {
								let i = each_array_3[$$index_2];
								$$renderer.push(`<li class="flex items-start gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2"><span class="mt-0.5">`);
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
								$$renderer.push(`<!--]--></span> <div class="min-w-0 flex-1"><div class="text-[12px] text-fg">${escape_html(i.message)}</div></div> `);
								if (FIXABLE_CODES.has(i.code)) {
									$$renderer.push("<!--[0-->");
									$$renderer.push(`<button type="button" class="inline-flex items-center gap-1 rounded border border-accent/40 bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent hover:border-accent hover:bg-accent/15" title="Apply automatic fix">`);
									Wand_sparkles($$renderer, { class: "size-2.5" });
									$$renderer.push(`<!----> Fix</button>`);
								} else $$renderer.push("<!--[-1-->");
								$$renderer.push(`<!--]--> `);
								if (i.codepoint > 0 && project().glyphs[i.codepoint]) {
									$$renderer.push("<!--[0-->");
									$$renderer.push(`<button type="button" class="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-fg-muted hover:border-accent hover:text-accent" title="Open this glyph in the editor">${escape_html(labelFor(i.codepoint))} →</button>`);
								} else {
									$$renderer.push("<!--[-1-->");
									$$renderer.push(`<span class="text-[10px] text-fg-subtle">${escape_html(labelFor(i.codepoint))}</span>`);
								}
								$$renderer.push(`<!--]--></li>`);
							}
							$$renderer.push(`<!--]--></ul></div>`);
						}
						$$renderer.push(`<!--]--></div>`);
					} else {
						$$renderer.push("<!--[-1-->");
						$$renderer.push(`<div class="grid gap-4"><!--[-->`);
						const each_array_4 = ensure_array_like(groupedByGlyph());
						for (let $$index_5 = 0, $$length = each_array_4.length; $$index_5 < $$length; $$index_5++) {
							let [cp, issues] = each_array_4[$$index_5];
							$$renderer.push(`<div><div class="mb-1.5 flex items-baseline justify-between gap-2"><h3 class="text-[12px] font-semibold text-fg">`);
							if (cp === 0) {
								$$renderer.push("<!--[0-->");
								$$renderer.push(`Project-level`);
							} else if (project().glyphs[cp]) {
								$$renderer.push("<!--[1-->");
								$$renderer.push(`<button type="button" class="font-mono text-fg hover:text-accent" title="Open this glyph in the editor">${escape_html(labelFor(cp))} <span class="text-fg-subtle" data-numeric="">· U+${escape_html(cp.toString(16).toUpperCase().padStart(4, "0"))}</span></button>`);
							} else {
								$$renderer.push("<!--[-1-->");
								$$renderer.push(`<span class="font-mono">${escape_html(labelFor(cp))}</span>`);
							}
							$$renderer.push(`<!--]--></h3> <span class="text-[10px] font-mono text-fg-subtle" data-numeric="">${escape_html(issues.length)} issue${escape_html(issues.length === 1 ? "" : "s")}</span></div> <ul class="grid gap-1"><!--[-->`);
							const each_array_5 = ensure_array_like(issues);
							for (let $$index_4 = 0, $$length = each_array_5.length; $$index_4 < $$length; $$index_4++) {
								let i = each_array_5[$$index_4];
								$$renderer.push(`<li class="flex items-start gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2"><span class="mt-0.5">`);
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
								if (FIXABLE_CODES.has(i.code)) {
									$$renderer.push("<!--[0-->");
									$$renderer.push(`<button type="button" class="inline-flex items-center gap-1 rounded border border-accent/40 bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent hover:border-accent hover:bg-accent/15" title="Apply automatic fix">`);
									Wand_sparkles($$renderer, { class: "size-2.5" });
									$$renderer.push(`<!----> Fix</button>`);
								} else $$renderer.push("<!--[-1-->");
								$$renderer.push(`<!--]--></li>`);
							}
							$$renderer.push(`<!--]--></ul></div>`);
						}
						$$renderer.push(`<!--]--></div>`);
					}
					$$renderer.push(`<!--]-->`);
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
