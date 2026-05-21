import { G as escape_html, U as attr, W as clsx, c as ensure_array_like, d as spread_props, f as stringify, n as attr_class, o as derived, r as attr_style } from "../../../../../chunks/dev.js";
import { t as toast } from "../../../../../chunks/toast2.svelte.js";
import { t as Icon } from "../../../../../chunks/Icon.js";
import { C as isClassRef } from "../../../../../chunks/project.js";
import { t as projectStore } from "../../../../../chunks/project.svelte.js";
import { t as contoursToSvgPath } from "../../../../../chunks/path.js";
import { t as SCRIPT_PACKS } from "../../../../../chunks/charsets.js";
import { n as Input, t as Field } from "../../../../../chunks/Field.js";
import { t as Plus } from "../../../../../chunks/plus.js";
import { t as Button } from "../../../../../chunks/Button.js";
import { t as Panel } from "../../../../../chunks/Panel.js";
import { t as Trash_2 } from "../../../../../chunks/trash-2.js";
import { t as Globe } from "../../../../../chunks/globe.js";
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/group.svelte
function Group($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "group" },
		props,
		{ iconNode: [
			["path", { "d": "M3 7V5c0-1.1.9-2 2-2h2" }],
			["path", { "d": "M17 3h2c1.1 0 2 .9 2 2v2" }],
			["path", { "d": "M21 17v2c0 1.1-.9 2-2 2h-2" }],
			["path", { "d": "M7 21H5c-1.1 0-2-.9-2-2v-2" }],
			["rect", {
				"width": "7",
				"height": "5",
				"x": "7",
				"y": "7",
				"rx": "1"
			}],
			["rect", {
				"width": "7",
				"height": "5",
				"x": "10",
				"y": "12",
				"rx": "1"
			}]
		] }
	]));
}
//#endregion
//#region src/routes/project/[id]/spacing/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const project = derived(() => projectStore.project);
		const COMMON_PAIRS = [
			["A", "V"],
			["A", "T"],
			["A", "W"],
			["A", "Y"],
			["T", "a"],
			["T", "o"],
			["T", "e"],
			["T", "r"],
			["V", "a"],
			["V", "o"],
			["V", "e"],
			["W", "a"],
			["W", "o"],
			["W", "e"],
			["L", "T"],
			["L", "V"],
			["L", "Y"],
			["P", "a"],
			["P", "o"],
			["P", "e"],
			["F", "a"],
			["F", "o"],
			["Y", "o"],
			["Y", "a"]
		];
		let leftChar = "A";
		let rightChar = "V";
		let newSbName = "";
		let newSbMembers = "";
		const parseMemberCodepoints = (s) => {
			const result = [];
			for (const ch of s) {
				const cp = ch.codePointAt(0);
				if (cp && cp > 32) result.push(cp);
			}
			return Array.from(new Set(result));
		};
		const createSbClass = () => {
			const cps = parseMemberCodepoints(newSbMembers);
			if (cps.length === 0) {
				toast.warn("Add at least one character.");
				return;
			}
			projectStore.addSidebearingClass(newSbName, cps);
			newSbName = "";
			newSbMembers = "";
		};
		const SB_PRESETS = [
			{
				name: "Vertical stems (upper)",
				chars: "HILMNEFTKBDPR"
			},
			{
				name: "Vertical stems (lower)",
				chars: "hilmnbdpqkfr"
			},
			{
				name: "Rounds (upper)",
				chars: "OCGQUS"
			},
			{
				name: "Rounds (lower)",
				chars: "oceqsbdp"
			},
			{
				name: "Diagonals",
				chars: "AVWXYKMN"
			},
			{
				name: "Figures",
				chars: "0123456789"
			}
		];
		const sbClassAvg = (members) => {
			if (!project() || members.length === 0) return {
				lsb: 0,
				rsb: 0
			};
			let lsb = 0;
			let rsb = 0;
			let n = 0;
			for (const cp of members) {
				const g = project().glyphs[cp];
				if (!g) continue;
				lsb += g.leftSidebearing;
				rsb += g.rightSidebearing;
				n++;
			}
			return n > 0 ? {
				lsb: Math.round(lsb / n),
				rsb: Math.round(rsb / n)
			} : {
				lsb: 0,
				rsb: 0
			};
		};
		let pairsOnlyDrawn = true;
		const visiblePairs = derived(() => {
			if (!project()) return COMMON_PAIRS;
			return COMMON_PAIRS.filter(([l, r]) => {
				const left = project().glyphs[l.codePointAt(0) ?? 0];
				const right = project().glyphs[r.codePointAt(0) ?? 0];
				return left?.contours.length && right?.contours.length;
			});
		});
		let pendingValue = 0;
		let newClassName = "@A_left";
		let newClassMembers = "A Á Â Ä À Å Ã";
		let playgroundText = "Hamburgefonts AVATAR To We La Pa\nQuick brown fox jumps over";
		let playgroundSize = 72;
		let playgroundLineHeight = 1.15;
		let playgroundTracking = 0;
		let referenceFont = "";
		const REFERENCE_PRESETS = [
			{
				id: "",
				label: "Off"
			},
			{
				id: "Inter",
				label: "Inter"
			},
			{
				id: "Helvetica Neue, Helvetica, Arial",
				label: "Helvetica"
			},
			{
				id: "Georgia, Times, serif",
				label: "Georgia"
			},
			{
				id: "ui-monospace, Menlo, monospace",
				label: "Mono"
			},
			{
				id: "-apple-system, system-ui, sans-serif",
				label: "System UI"
			}
		];
		const playgroundFeatures = derived(() => `'kern' 1, 'liga' 1`);
		let analyzerCategory = "lowercase";
		const analyzerGlyphs = derived(() => {
			if (!project()) return [];
			const all = Object.values(project().glyphs).filter((g) => g.contours.length > 0).sort((a, b) => a.codepoint - b.codepoint);
			switch (analyzerCategory) {
				case "uppercase": return all.filter((g) => g.codepoint >= 65 && g.codepoint <= 90);
				case "lowercase": return all.filter((g) => g.codepoint >= 97 && g.codepoint <= 122);
				case "figure": return all.filter((g) => g.codepoint >= 48 && g.codepoint <= 57);
				case "all": return all;
			}
		});
		const analyzerMax = derived(() => analyzerGlyphs().reduce((m, g) => Math.max(m, g.leftSidebearing, g.rightSidebearing), 60));
		const cpOf = (s) => s.codePointAt(0) ?? 0;
		const briefReferenceFamilies = derived(() => (project()?.brief?.references ?? []).map((r) => r.name.trim()).filter((n) => n.length > 0));
		const classSuggestions = derived(() => {
			if (!project()) return [];
			const out = [];
			const existingNames = new Set((project().classes ?? []).map((c) => c.name));
			for (let cp = 65; cp <= 122; cp++) {
				if (cp > 90 && cp < 97) continue;
				if (!project().glyphs[cp]) continue;
				const descendants = Object.values(project().glyphs).filter((g) => (g.components ?? []).some((c) => c.baseCodepoint === cp));
				if (descendants.length === 0) continue;
				const members = [cp, ...descendants.map((d) => d.codepoint)];
				const char = String.fromCodePoint(cp);
				const className = `@${char === char.toUpperCase() ? char : char + "_lc"}_left`;
				if (existingNames.has(className)) continue;
				out.push({
					name: className,
					members,
					basis: `${char} + ${descendants.length} composite variant${descendants.length === 1 ? "" : "s"}`
				});
			}
			return out.slice(0, 12);
		});
		const classExpansionPairs = derived(() => {
			if (!project()) return [];
			const left = parseSide(leftChar);
			const right = parseSide(rightChar);
			const leftIsClass = isClassRef(left);
			const rightIsClass = isClassRef(right);
			if (!leftIsClass && !rightIsClass) return [];
			const resolve = (side) => {
				if (isClassRef(side)) return ((project().classes ?? []).find((c) => c.name === side)?.members ?? []).map((cp) => String.fromCodePoint(cp));
				return [String.fromCodePoint(side)];
			};
			const lefts = resolve(left);
			const rights = resolve(right);
			const out = [];
			for (const l of lefts) for (const r of rights) {
				out.push({
					l,
					r
				});
				if (out.length >= 48) return out;
			}
			return out;
		});
		/** Parse a "side" input — leading @ → class ref, else first char → codepoint */
		const parseSide = (s) => {
			const trimmed = s.trim();
			if (trimmed.startsWith("@")) return trimmed;
			return cpOf(trimmed);
		};
		const currentValue = derived(() => {
			return projectStore.getKerningValue(parseSide(leftChar), parseSide(rightChar));
		});
		const applyKerning = (value) => {
			projectStore.upsertKerningPair({
				left: parseSide(leftChar),
				right: parseSide(rightChar),
				value: Math.round(value)
			});
			pendingValue = value;
		};
		const sideLabel = (side) => {
			if (isClassRef(side)) return side;
			return String.fromCodePoint(side);
		};
		let bulkText = "";
		let bulkResult = null;
		const makeFiguresTabular = () => {
			if (!project()) return;
			const digits = Array.from({ length: 10 }, (_, i) => 48 + i).map((cp) => project().glyphs[cp]).filter((g) => g && g.contours.length > 0);
			if (digits.length === 0) {
				toast.warn("No figures (0–9) drawn yet.");
				return;
			}
			const targetAdvance = Math.max(...digits.map((g) => g.advanceWidth));
			for (const g of digits) {
				const extra = targetAdvance - g.advanceWidth;
				const lsb = g.leftSidebearing + Math.round(extra / 2);
				const rsb = g.rightSidebearing + (extra - Math.round(extra / 2));
				projectStore.updateGlyph(g.codepoint, (gg) => ({
					...gg,
					advanceWidth: targetAdvance,
					leftSidebearing: lsb,
					rightSidebearing: rsb
				}));
			}
			toast.success(`Set ${digits.length} figures to advance ${targetAdvance} units (centred).`);
		};
		const setAllSidebearings = (which, value, category) => {
			if (!project()) return;
			const inRange = (cp) => {
				switch (category) {
					case "upper": return cp >= 65 && cp <= 90;
					case "lower": return cp >= 97 && cp <= 122;
					case "figure": return cp >= 48 && cp <= 57;
					case "all": return true;
				}
			};
			const targets = Object.values(project().glyphs).filter((g) => g.contours.length > 0 && inRange(g.codepoint));
			if (targets.length === 0) {
				toast.warn("No drawn glyphs in this category.");
				return;
			}
			for (const g of targets) projectStore.updateGlyph(g.codepoint, (gg) => {
				const next = { ...gg };
				if (which === "left" || which === "both") next.leftSidebearing = value;
				if (which === "right" || which === "both") next.rightSidebearing = value;
				next.advanceWidth = next.leftSidebearing + (gg.advanceWidth - gg.leftSidebearing - gg.rightSidebearing) + next.rightSidebearing;
				return next;
			});
			toast.success(`Updated ${targets.length} glyph${targets.length === 1 ? "" : "s"}.`);
		};
		let bulkSbCategory = "lower";
		let bulkSbWhich = "both";
		let bulkSbValue = 40;
		const RHYTHM_SETS = {
			"lower-stems": {
				label: "Lowercase stems",
				codepoints: [
					110,
					104,
					109,
					98,
					100,
					107,
					108,
					105,
					112,
					113,
					117,
					114
				]
			},
			"upper-stems": {
				label: "Uppercase stems",
				codepoints: [
					72,
					78,
					73,
					76,
					70,
					69,
					84,
					75,
					77,
					80,
					66,
					68,
					82
				]
			}
		};
		let rhythmSet = "lower-stems";
		let rhythmStemWidths = /* @__PURE__ */ new Map();
		const rhythmDrawn = derived(() => {
			if (!project()) return [];
			return RHYTHM_SETS[rhythmSet].codepoints.map((cp) => project().glyphs[cp]).filter((g) => g && g.contours.length > 0);
		});
		const rhythmMedianStem = derived(() => {
			const widths = [...rhythmStemWidths.values()];
			if (widths.length === 0) return 0;
			widths.sort((a, b) => a - b);
			return widths[Math.floor(widths.length / 2)];
		});
		const importBulkKerning = () => {
			if (!bulkText.trim()) return;
			const lines = bulkText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
			let added = 0;
			let skipped = 0;
			for (const line of lines) {
				const parts = line.split(/[\s,]+/);
				if (parts.length < 3) {
					skipped++;
					continue;
				}
				const value = Number(parts[parts.length - 1]);
				if (!Number.isFinite(value)) {
					skipped++;
					continue;
				}
				const leftRaw = parts[0];
				const rightRaw = parts.slice(1, -1).join("");
				const left = leftRaw.startsWith("@") ? leftRaw : leftRaw.codePointAt(0) ?? 0;
				const right = rightRaw.startsWith("@") ? rightRaw : rightRaw.codePointAt(0) ?? 0;
				if (!left || !right) {
					skipped++;
					continue;
				}
				projectStore.upsertKerningPair({
					left,
					right,
					value: Math.round(value)
				});
				added++;
			}
			bulkResult = `${added} added${skipped > 0 ? `, ${skipped} skipped` : ""}.`;
			if (added > 0) bulkText = "";
		};
		const addClass = () => {
			const name = newClassName.trim();
			if (!name.startsWith("@")) {
				toast.warn("Class name must start with @ (e.g. @A_left)");
				return;
			}
			const members = newClassMembers.trim().split(/\s+/).map((s) => s.codePointAt(0) ?? 0).filter((cp) => cp > 0);
			if (members.length === 0) return;
			projectStore.upsertKerningClass({
				name,
				members
			});
			newClassName = "@class";
			newClassMembers = "";
		};
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			$$renderer.push(`<div class="h-full overflow-auto"><div class="mx-auto flex max-w-5xl flex-col gap-6 p-6"><header><h1 class="text-xl font-semibold tracking-tight">Spacing &amp; kerning</h1> <p class="text-sm text-fg-muted">Per-glyph sidebearings are edited in the glyph editor. Set kerning pairs here.</p></header> `);
			Panel($$renderer, {
				children: ($$renderer) => {
					$$renderer.push(`<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Spacing playground</h2> <p class="mb-3 text-[12px] text-fg-subtle">Type anything, scrub the size, toggle features. This is the fastest way to
			feel your rhythm and find awkward pairs.</p> <div class="mb-3 grid grid-cols-[1fr_180px_auto] items-center gap-3"><input${attr("value", playgroundText)} class="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft" placeholder="Type to test spacing…"/> <label class="flex items-center gap-2 text-[11px] text-fg-muted">Size <input type="range"${attr("min", 24)}${attr("max", 200)}${attr("step", 2)}${attr("value", playgroundSize)} class="h-1 flex-1 accent-accent"/> <span class="w-8 text-right font-mono text-fg" data-numeric="">${escape_html(playgroundSize)}</span></label> <div class="flex items-center gap-1"><button type="button"${attr_class(`rounded-md border px-2 py-1 font-mono text-[11px] ${stringify("border-accent bg-accent-soft text-accent")}`)} title="Toggle kerning">kern</button> <button type="button"${attr_class(`rounded-md border px-2 py-1 font-mono text-[11px] ${stringify("border-accent bg-accent-soft text-accent")}`)} title="Toggle ligatures">liga</button></div></div> <div class="mb-3 grid grid-cols-2 gap-3"><label class="flex items-center gap-2 text-[11px] text-fg-muted">Line height <input type="range"${attr("min", .8)}${attr("max", 2)}${attr("step", .05)}${attr("value", playgroundLineHeight)} class="h-1 flex-1 accent-accent"/> <span class="w-10 text-right font-mono text-fg" data-numeric="">${escape_html(playgroundLineHeight.toFixed(2))}</span></label> <label class="flex items-center gap-2 text-[11px] text-fg-muted">Tracking <input type="range"${attr("min", -50)}${attr("max", 200)}${attr("step", 5)}${attr("value", playgroundTracking)} class="h-1 flex-1 accent-accent"/> <span class="w-12 text-right font-mono text-fg" data-numeric="">${escape_html(playgroundTracking > 0 ? "+" : "")}${escape_html(playgroundTracking)}</span></label></div> <div class="preview-font min-h-[160px] whitespace-pre-wrap rounded-lg border border-border bg-canvas p-6"${attr_style(`font-size: ${stringify(playgroundSize)}px; line-height: ${stringify(playgroundLineHeight)}; letter-spacing: ${stringify(playgroundTracking / 1e3)}em; font-feature-settings: ${stringify(playgroundFeatures())};`)}>${escape_html(playgroundText)}</div> <div class="mt-3 flex flex-wrap items-center gap-1.5"><span class="text-[11px] font-medium text-fg-muted">Compare with:</span> <!--[-->`);
					const each_array = ensure_array_like(REFERENCE_PRESETS);
					for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
						let opt = each_array[$$index];
						$$renderer.push(`<button type="button"${attr_class(`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${stringify(referenceFont === opt.id ? "bg-accent-soft text-accent" : "text-fg-subtle hover:bg-surface-2 hover:text-fg")}`)}>${escape_html(opt.label)}</button>`);
					}
					$$renderer.push(`<!--]--> <!--[-->`);
					const each_array_1 = ensure_array_like(briefReferenceFamilies());
					for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
						let name = each_array_1[$$index_1];
						$$renderer.push(`<button type="button"${attr_class(`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${stringify(referenceFont === name ? "bg-accent-soft text-accent" : "border border-accent/30 text-accent/80 hover:bg-accent-soft/40")}`)} title="From Brief — auto-loaded from Google Fonts">${escape_html(name)}</button>`);
					}
					$$renderer.push(`<!--]--> <input${attr("value", referenceFont)} placeholder="Or any font family…" class="ml-2 rounded-md border border-border bg-surface px-2 py-1 text-[11px] outline-none focus:border-accent"/></div> `);
					$$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]-->`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			Panel($$renderer, {
				children: ($$renderer) => {
					$$renderer.push(`<div class="mb-3 flex items-center justify-between gap-3"><h2 class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Sidebearing analyzer</h2> <div class="flex items-center gap-1"><!--[-->`);
					const each_array_2 = ensure_array_like([
						{
							id: "lowercase",
							label: "a–z"
						},
						{
							id: "uppercase",
							label: "A–Z"
						},
						{
							id: "figure",
							label: "0–9"
						},
						{
							id: "all",
							label: "All drawn"
						}
					]);
					for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
						let opt = each_array_2[$$index_2];
						$$renderer.push(`<button type="button"${attr_class(`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${stringify(analyzerCategory === opt.id ? "bg-accent-soft text-accent" : "text-fg-subtle hover:bg-surface-2 hover:text-fg")}`)}>${escape_html(opt.label)}</button>`);
					}
					$$renderer.push(`<!--]--></div></div> <p class="mb-3 text-[12px] text-fg-subtle">Bars show LSB and RSB to scale. Symmetric round glyphs (o, O, e) should
			look balanced; stems with serifs/finials typically lean asymmetric.</p> `);
					if (analyzerGlyphs().length === 0) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<p class="text-sm text-fg-muted">No drawn glyphs in this category yet.</p>`);
					} else {
						$$renderer.push("<!--[-1-->");
						$$renderer.push(`<ul class="grid gap-1"><!--[-->`);
						const each_array_3 = ensure_array_like(analyzerGlyphs());
						for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
							let g = each_array_3[$$index_3];
							const lsbPct = g.leftSidebearing / analyzerMax() * 100;
							const rsbPct = g.rightSidebearing / analyzerMax() * 100;
							const asymmetric = Math.abs(g.leftSidebearing - g.rightSidebearing) > Math.max(20, Math.min(g.leftSidebearing, g.rightSidebearing) * .4);
							$$renderer.push(`<li class="grid grid-cols-[40px_1fr_30px_1fr_60px] items-center gap-2 rounded-md px-2 py-1.5 text-[12px] hover:bg-surface-2/40"><a${attr("href", `/project/${stringify(project()?.id)}/edit`)} class="preview-font text-center text-xl leading-none hover:text-accent"${attr("title", `Open ${stringify(g.name)}`)}>${escape_html(String.fromCodePoint(g.codepoint))}</a> <div class="flex h-2 justify-end overflow-hidden rounded-full bg-surface-2"><div${attr_class(`h-full ${stringify(asymmetric ? "bg-warn" : "bg-accent/70")}`)}${attr_style(`width: ${stringify(Math.max(2, lsbPct))}%;`)}></div></div> <div class="text-center font-mono text-[10px] text-fg-subtle" data-numeric="">${escape_html(g.leftSidebearing)}</div> <div class="flex h-2 overflow-hidden rounded-full bg-surface-2"><div${attr_class(`h-full ${stringify(asymmetric ? "bg-warn" : "bg-accent/70")}`)}${attr_style(`width: ${stringify(Math.max(2, rsbPct))}%;`)}></div></div> <div class="text-right font-mono text-[10px] text-fg-subtle" data-numeric="">${escape_html(g.rightSidebearing)}</div></li>`);
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
					$$renderer.push(`<h2 class="mb-2 inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">`);
					Group($$renderer, { class: "size-3" });
					$$renderer.push(`<!----> Sidebearing classes (${escape_html(project()?.sidebearingClasses?.length ?? 0)})</h2> <p class="mb-3 text-[12px] text-fg-subtle">Group glyphs that should share LSB/RSB (e.g. H I L M N for vertical stems, O C G Q for rounds).
			Edits to a class propagate to every member, so spacing stays coherent before kerning starts.</p> `);
					if (project()?.sidebearingClasses && project().sidebearingClasses.length > 0) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<ul class="mb-3 grid gap-2"><!--[-->`);
						const each_array_4 = ensure_array_like(project().sidebearingClasses);
						for (let $$index_5 = 0, $$length = each_array_4.length; $$index_5 < $$length; $$index_5++) {
							let cls = each_array_4[$$index_5];
							const avg = sbClassAvg(cls.members);
							$$renderer.push(`<li class="rounded-md border border-border bg-surface-2/40 px-3 py-2"><div class="mb-1.5 flex items-center justify-between gap-2"><input type="text"${attr("value", cls.name)} class="min-w-0 flex-1 border-0 bg-transparent text-[13px] font-medium text-fg outline-none focus:ring-1 focus:ring-accent"/> <button type="button" class="rounded p-1 text-fg-subtle hover:bg-danger/10 hover:text-danger" aria-label="Delete class" title="Delete sidebearing class">`);
							Trash_2($$renderer, { class: "size-3.5" });
							$$renderer.push(`<!----></button></div> <div class="mb-2 flex flex-wrap gap-1"><!--[-->`);
							const each_array_5 = ensure_array_like(cls.members);
							for (let $$index_4 = 0, $$length = each_array_5.length; $$index_4 < $$length; $$index_4++) {
								let cp = each_array_5[$$index_4];
								const g = project().glyphs[cp];
								$$renderer.push(`<button type="button" class="inline-flex items-center gap-0.5 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-fg hover:bg-danger/10 hover:text-danger"${attr("title", `Remove ${stringify(g?.name ?? cp.toString(16))}`)}>`);
								if (cp > 32 && cp < 65536) {
									$$renderer.push("<!--[0-->");
									$$renderer.push(`${escape_html(String.fromCodePoint(cp))}`);
								} else {
									$$renderer.push("<!--[-1-->");
									$$renderer.push(`${escape_html(g?.name ?? cp)}`);
								}
								$$renderer.push(`<!--]--></button>`);
							}
							$$renderer.push(`<!--]--></div> <div class="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2 text-[11px]"><span class="text-fg-muted">LSB</span> <input type="number"${attr("value", avg.lsb)} class="w-full rounded-md border border-border bg-surface px-2 py-1 font-mono text-[11px] text-fg outline-none focus:border-accent"/> <span class="text-fg-muted">RSB</span> <input type="number"${attr("value", avg.rsb)} class="w-full rounded-md border border-border bg-surface px-2 py-1 font-mono text-[11px] text-fg outline-none focus:border-accent"/></div> `);
							if (cls.members.length > 0) {
								$$renderer.push("<!--[0-->");
								const rhythm = cls.members.map((cp) => cp > 32 && cp < 65536 ? String.fromCodePoint(cp) : "").filter(Boolean).flatMap((ch) => [
									"n",
									ch,
									"o",
									ch
								]).join("");
								$$renderer.push(`<div class="preview-font mt-2 overflow-hidden rounded bg-canvas px-2 py-1.5 text-2xl leading-none text-fg" title="Rhythm proof — letters drawn from this class interleaved with n and o so you can eyeball whether spacing produces stable text color">${escape_html(rhythm)}</div>`);
							} else $$renderer.push("<!--[-1-->");
							$$renderer.push(`<!--]--></li>`);
						}
						$$renderer.push(`<!--]--></ul>`);
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]--> <div class="grid grid-cols-[1fr_2fr_auto] gap-2">`);
					Field($$renderer, {
						label: "Name",
						children: ($$renderer) => {
							Input($$renderer, {
								density: "sm",
								placeholder: "Vertical stems",
								get value() {
									return newSbName;
								},
								set value($$value) {
									newSbName = $$value;
									$$settled = false;
								}
							});
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----> `);
					Field($$renderer, {
						label: "Members (paste characters)",
						children: ($$renderer) => {
							Input($$renderer, {
								density: "sm",
								placeholder: "HILMN",
								get value() {
									return newSbMembers;
								},
								set value($$value) {
									newSbMembers = $$value;
									$$settled = false;
								}
							});
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----> `);
					{
						function icon($$renderer) {
							Plus($$renderer, { class: "size-3.5" });
						}
						Button($$renderer, {
							density: "sm",
							onclick: createSbClass,
							disabled: !newSbMembers.trim(),
							icon,
							children: ($$renderer) => {
								$$renderer.push(`<!---->Add class`);
							},
							$$slots: {
								icon: true,
								default: true
							}
						});
					}
					$$renderer.push(`<!----></div> <div class="mt-1.5 flex flex-wrap items-center gap-1 text-[10px]"><span class="text-fg-subtle">Quick presets:</span> <!--[-->`);
					const each_array_6 = ensure_array_like(SB_PRESETS);
					for (let $$index_6 = 0, $$length = each_array_6.length; $$index_6 < $$length; $$index_6++) {
						let preset = each_array_6[$$index_6];
						$$renderer.push(`<button type="button" class="rounded-full border border-border bg-surface px-2 py-0.5 text-fg-muted hover:border-accent hover:text-accent"${attr("title", `Pre-fill: ${stringify(preset.chars)}`)}>${escape_html(preset.name)}</button>`);
					}
					$$renderer.push(`<!--]--></div>`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			Panel($$renderer, {
				children: ($$renderer) => {
					$$renderer.push(`<div class="mb-3 flex items-center justify-between gap-3"><h2 class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Stem rhythm</h2> <div class="flex items-center gap-1"><!--[-->`);
					const each_array_7 = ensure_array_like(Object.entries(RHYTHM_SETS));
					for (let $$index_7 = 0, $$length = each_array_7.length; $$index_7 < $$length; $$index_7++) {
						let [id, set] = each_array_7[$$index_7];
						$$renderer.push(`<button type="button"${attr_class(`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${stringify(rhythmSet === id ? "bg-accent-soft text-accent" : "text-fg-subtle hover:bg-surface-2 hover:text-fg")}`)}>${escape_html(set.label)}</button>`);
					}
					$$renderer.push(`<!--]--></div></div> <p class="mb-3 text-[12px] text-fg-subtle">Scans every drawn stem-bearing glyph and reports its median vertical-stem width.
			Stems should match within ~5 units across the set; outliers highlight in warn.</p> `);
					if (rhythmDrawn().length === 0) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<p class="text-sm text-fg-muted">No drawn glyphs in this set yet.</p>`);
					} else {
						$$renderer.push("<!--[-1-->");
						$$renderer.push(`<div class="flex flex-wrap gap-4 rounded-lg border border-border bg-canvas p-4"><!--[-->`);
						const each_array_8 = ensure_array_like(rhythmDrawn());
						for (let $$index_8 = 0, $$length = each_array_8.length; $$index_8 < $$length; $$index_8++) {
							let g = each_array_8[$$index_8];
							const stem = rhythmStemWidths.get(g.codepoint) ?? 0;
							const diff = stem && rhythmMedianStem() ? stem - rhythmMedianStem() : 0;
							const isOutlier = stem > 0 && Math.abs(diff) > 5;
							$$renderer.push(`<div class="flex flex-col items-center gap-1"><svg${attr("viewBox", `0 0 ${stringify(Math.max(g.advanceWidth, 200))} ${stringify((project()?.metrics.ascender ?? 800) - (project()?.metrics.descender ?? -200))}`)} width="60" height="80" preserveAspectRatio="xMidYMid meet" style="transform: scaleY(-1);"${attr("aria-label", g.name)}><g${attr("transform", `translate(0 ${stringify(-(project()?.metrics.ascender ?? 800))})`)}><path${attr("d", contoursToSvgPath(g.contours))} fill="currentColor" fill-rule="evenodd"></path></g></svg> <div class="flex flex-col items-center text-[10px]"><span class="font-mono text-fg">${escape_html(String.fromCodePoint(g.codepoint))}</span> `);
							if (stem > 0) {
								$$renderer.push("<!--[0-->");
								$$renderer.push(`<span${attr_class(`font-mono ${stringify(isOutlier ? "text-warn" : "text-fg-subtle")}`)} data-numeric="">${escape_html(stem)} `);
								if (isOutlier) {
									$$renderer.push("<!--[0-->");
									$$renderer.push(`(${escape_html(diff > 0 ? "+" : "")}${escape_html(diff)})`);
								} else $$renderer.push("<!--[-1-->");
								$$renderer.push(`<!--]--></span>`);
							} else $$renderer.push("<!--[-1-->");
							$$renderer.push(`<!--]--></div></div>`);
						}
						$$renderer.push(`<!--]--></div> `);
						if (rhythmMedianStem() > 0) {
							$$renderer.push("<!--[0-->");
							$$renderer.push(`<p class="mt-2 text-[11px] text-fg-subtle">Median stem width: <span class="font-mono text-fg" data-numeric="">${escape_html(rhythmMedianStem())}</span> ·
					Outliers marked in warn (${escape_html(rhythmDrawn().filter((g) => {
								const s = rhythmStemWidths.get(g.codepoint);
								return s && Math.abs(s - rhythmMedianStem()) > 5;
							}).length)} of ${escape_html(rhythmDrawn().length)})</p>`);
						} else $$renderer.push("<!--[-1-->");
						$$renderer.push(`<!--]-->`);
					}
					$$renderer.push(`<!--]-->`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			Panel($$renderer, {
				children: ($$renderer) => {
					$$renderer.push(`<h2 class="mb-4 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Kerning pair editor</h2> <div class="grid grid-cols-[1fr_1fr_1fr] gap-3">`);
					Field($$renderer, {
						label: "Left glyph",
						children: ($$renderer) => {
							Input($$renderer, {
								maxlength: 2,
								class: "text-center text-lg",
								get value() {
									return leftChar;
								},
								set value($$value) {
									leftChar = $$value;
									$$settled = false;
								}
							});
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----> `);
					Field($$renderer, {
						label: "Right glyph",
						children: ($$renderer) => {
							Input($$renderer, {
								maxlength: 2,
								class: "text-center text-lg",
								get value() {
									return rightChar;
								},
								set value($$value) {
									rightChar = $$value;
									$$settled = false;
								}
							});
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----> `);
					Field($$renderer, {
						label: "Adjustment (units)",
						children: ($$renderer) => {
							Input($$renderer, {
								type: "number",
								value: pendingValue,
								onchange: (e) => applyKerning(Number(e.currentTarget.value))
							});
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----></div> <div class="mt-5 rounded-lg border border-border bg-canvas p-6 text-center"><div class="preview-font text-7xl leading-none" style="letter-spacing: 0;">${escape_html(leftChar)}${escape_html(rightChar)}</div> <div class="mt-3 text-[11px] text-fg-subtle" data-numeric="">kern(${escape_html(leftChar)}, ${escape_html(rightChar)}) = ${escape_html(currentValue())}</div></div> `);
					if (classExpansionPairs().length > 0) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<div class="mt-3 rounded-lg border border-accent/30 bg-accent-soft/15 px-4 py-3"><div class="mb-2 text-[10px] font-semibold tracking-wider text-accent uppercase">Class expansion (${escape_html(classExpansionPairs().length)} pair${escape_html(classExpansionPairs().length === 1 ? "" : "s")})</div> <div class="preview-font flex flex-wrap gap-x-4 gap-y-1 leading-snug" style="font-size: 32px;"><!--[-->`);
						const each_array_9 = ensure_array_like(classExpansionPairs());
						for (let $$index_9 = 0, $$length = each_array_9.length; $$index_9 < $$length; $$index_9++) {
							let p = each_array_9[$$index_9];
							$$renderer.push(`<span>${escape_html(p.l)}${escape_html(p.r)}</span>`);
						}
						$$renderer.push(`<!--]--></div> <p class="mt-2 text-[10px] text-fg-subtle">The kerning value above applies to every pair shown. Scan for outliers — some
					members may need their own pair override.</p></div>`);
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]--> `);
					if (!isClassRef(parseSide(leftChar)) && !isClassRef(parseSide(rightChar)) && leftChar.length === 1 && rightChar.length === 1) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<div class="mt-3 rounded-lg border border-border bg-canvas px-6 py-4"><div class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">In context</div> <div class="preview-font mt-2 text-3xl leading-snug">${escape_html(`H${leftChar}H${leftChar}${rightChar}H${rightChar}H`)}</div> <div class="preview-font mt-1 text-3xl leading-snug">${escape_html(`n${leftChar}n${leftChar}${rightChar}n${rightChar}n`)}</div> <div class="preview-font mt-1 text-2xl leading-snug text-fg-muted">${escape_html(`The ${leftChar}${rightChar}erage ${leftChar}${rightChar}ailable ${leftChar}${rightChar}ailable`)}</div></div>`);
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]--> <div class="mt-3 flex flex-wrap items-center gap-2"><span class="text-[11px] font-medium text-fg-muted">Nudge:</span> <!--[-->`);
					const each_array_10 = ensure_array_like([
						-30,
						-10,
						-5,
						0,
						5,
						10,
						30
					]);
					for (let $$index_10 = 0, $$length = each_array_10.length; $$index_10 < $$length; $$index_10++) {
						let delta = each_array_10[$$index_10];
						Button($$renderer, {
							density: "sm",
							variant: "secondary",
							onclick: () => applyKerning(currentValue() + delta),
							children: ($$renderer) => {
								$$renderer.push(`<!---->${escape_html(delta > 0 ? "+" : "")}${escape_html(delta)}`);
							},
							$$slots: { default: true }
						});
					}
					$$renderer.push(`<!--]--></div>`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			Panel($$renderer, {
				children: ($$renderer) => {
					$$renderer.push(`<div class="mb-3 flex items-center justify-between gap-3"><h2 class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Common pair suggestions</h2> <label class="flex items-center gap-1.5 text-[11px] text-fg-muted"><input type="checkbox"${attr("checked", pairsOnlyDrawn, true)} class="accent-accent"/> Only pairs both drawn</label></div> <div class="flex flex-wrap gap-1.5"><!--[-->`);
					const each_array_11 = ensure_array_like(visiblePairs());
					for (let $$index_11 = 0, $$length = each_array_11.length; $$index_11 < $$length; $$index_11++) {
						let [l, r] = each_array_11[$$index_11];
						const existing = projectStore.getKerningValue(cpOf(l), cpOf(r));
						const hasKern = existing !== 0;
						$$renderer.push(`<button type="button"${attr_class(`rounded-md border px-2 py-1 font-mono text-[12px] ${stringify(hasKern ? "border-accent/40 bg-accent-soft text-accent" : "border-border bg-surface-2 hover:border-accent hover:bg-accent-soft")}`)}${attr("title", hasKern ? `Current kern: ${existing}` : "Click to load this pair")}>${escape_html(l)}${escape_html(r)} `);
						if (hasKern) {
							$$renderer.push("<!--[0-->");
							$$renderer.push(`<span class="ml-1 text-[10px] text-fg-subtle" data-numeric="">${escape_html(existing)}</span>`);
						} else $$renderer.push("<!--[-1-->");
						$$renderer.push(`<!--]--></button>`);
					}
					$$renderer.push(`<!--]--> `);
					if (visiblePairs().length === 0) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<p class="text-[11px] text-fg-subtle">No common pairs match — draw a couple uppercase letters first, then come back.</p>`);
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]--></div>`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			Panel($$renderer, {
				children: ($$renderer) => {
					$$renderer.push(`<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Bulk spacing</h2> <div class="mb-4 grid gap-3 md:grid-cols-2"><div><div class="mb-1.5 text-[11px] font-medium text-fg-muted">Tabular figures</div> <p class="mb-2 text-[11px] text-fg-subtle">Set every digit to the widest digit's advance, centred — required for
					data tables and most UI.</p> `);
					Button($$renderer, {
						density: "sm",
						variant: "secondary",
						onclick: makeFiguresTabular,
						children: ($$renderer) => {
							$$renderer.push(`<!---->Tabularise 0–9`);
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----></div> <div><div class="mb-1.5 text-[11px] font-medium text-fg-muted">Apply sidebearing</div> <div class="grid grid-cols-[auto_auto_auto_1fr] items-center gap-1.5">`);
					$$renderer.select({
						value: bulkSbWhich,
						class: "rounded border border-border bg-surface px-1.5 py-1 text-[11px] outline-none"
					}, ($$renderer) => {
						$$renderer.option({ value: "both" }, ($$renderer) => {
							$$renderer.push(`LSB + RSB`);
						});
						$$renderer.option({ value: "left" }, ($$renderer) => {
							$$renderer.push(`LSB`);
						});
						$$renderer.option({ value: "right" }, ($$renderer) => {
							$$renderer.push(`RSB`);
						});
					});
					$$renderer.push(` <span class="text-[11px] text-fg-subtle">=</span> <input type="number"${attr("value", bulkSbValue)} class="w-16 rounded border border-border bg-surface px-1.5 py-1 text-right font-mono text-[11px] outline-none"/> `);
					$$renderer.select({
						value: bulkSbCategory,
						class: "rounded border border-border bg-surface px-1.5 py-1 text-[11px] outline-none"
					}, ($$renderer) => {
						$$renderer.option({ value: "upper" }, ($$renderer) => {
							$$renderer.push(`to A–Z`);
						});
						$$renderer.option({ value: "lower" }, ($$renderer) => {
							$$renderer.push(`to a–z`);
						});
						$$renderer.option({ value: "figure" }, ($$renderer) => {
							$$renderer.push(`to 0–9`);
						});
						$$renderer.option({ value: "all" }, ($$renderer) => {
							$$renderer.push(`to all drawn`);
						});
					});
					$$renderer.push(`</div> `);
					Button($$renderer, {
						density: "sm",
						variant: "secondary",
						onclick: () => setAllSidebearings(bulkSbWhich, bulkSbValue, bulkSbCategory),
						class: "mt-2",
						children: ($$renderer) => {
							$$renderer.push(`<!---->Apply`);
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----></div></div>`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			Panel($$renderer, {
				children: ($$renderer) => {
					$$renderer.push(`<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Bulk import kerning</h2> <p class="mb-2 text-[12px] text-fg-subtle">Paste pairs as <code>left right value</code> per line. Comma or whitespace
			separated. Use <code>@classname</code> for class refs. Existing pairs are overwritten.</p> <textarea rows="5"${attr("placeholder", `A V -60\nT a -40\n@upper_left o -20`)} class="block w-full resize-y rounded-md border border-border bg-surface-2/40 px-3 py-2 font-mono text-[12px] text-fg outline-none focus:border-accent focus:bg-surface">`);
					const $$body = escape_html(bulkText);
					if ($$body) $$renderer.push(`${$$body}`);
					$$renderer.push(`</textarea> <div class="mt-2 flex items-center justify-between gap-3"><span class="text-[11px] text-fg-subtle">`);
					if (bulkResult) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`${escape_html(bulkResult)}`);
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]--></span> `);
					{
						function icon($$renderer) {
							Plus($$renderer, { class: "size-3.5" });
						}
						Button($$renderer, {
							density: "sm",
							onclick: importBulkKerning,
							disabled: !bulkText.trim(),
							icon,
							children: ($$renderer) => {
								$$renderer.push(`<!---->Import pairs`);
							},
							$$slots: {
								icon: true,
								default: true
							}
						});
					}
					$$renderer.push(`<!----></div>`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			Panel($$renderer, {
				children: ($$renderer) => {
					$$renderer.push(`<h2 class="mb-3 inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">`);
					Group($$renderer, { class: "size-3" });
					$$renderer.push(`<!----> Kerning classes (${escape_html(project()?.classes?.length ?? 0)})</h2> <p class="mb-3 text-[12px] text-fg-subtle">Group glyphs that share a side (e.g. <code>@A_left = [A Á Â Ä À]</code>).
			Then use the class name (with <code>@</code>) as either side of a kerning pair —
			one rule covers all members.</p> `);
					if (classSuggestions().length > 0) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<div class="mb-4 rounded-md border border-accent/30 bg-accent-soft/20 p-3"><div class="mb-2 text-[11px] font-semibold text-accent">Suggested from composites (${escape_html(classSuggestions().length)})</div> <p class="mb-2 text-[11px] text-fg-muted">Each base letter with composite variants becomes one class — kerning the
					base then automatically covers every accented form.</p> <div class="flex flex-wrap gap-1.5"><!--[-->`);
						const each_array_12 = ensure_array_like(classSuggestions());
						for (let $$index_12 = 0, $$length = each_array_12.length; $$index_12 < $$length; $$index_12++) {
							let s = each_array_12[$$index_12];
							$$renderer.push(`<button type="button" class="rounded-md border border-accent/40 bg-surface px-2 py-1 text-[11px] font-medium text-accent hover:bg-accent-soft"${attr("title", s.basis)}>+ <span class="font-mono">${escape_html(s.name)}</span> <span class="ml-1 text-fg-muted">(${escape_html(s.members.length)})</span></button>`);
						}
						$$renderer.push(`<!--]--></div></div>`);
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]--> `);
					if (project() && (project().classes ?? []).length > 0) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<ul class="mb-3 grid gap-1"><!--[-->`);
						const each_array_13 = ensure_array_like(project().classes ?? []);
						for (let $$index_13 = 0, $$length = each_array_13.length; $$index_13 < $$length; $$index_13++) {
							let cls = each_array_13[$$index_13];
							$$renderer.push(`<li class="flex items-center gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2"><span class="font-mono text-[13px] font-medium text-accent">${escape_html(cls.name)}</span> <span class="text-[12px] text-fg-muted">${escape_html(cls.members.map((cp) => String.fromCodePoint(cp)).join(" "))}</span> <button type="button" class="ml-auto rounded border border-border bg-surface px-2 py-0.5 text-[11px] text-fg-muted hover:border-accent hover:text-accent">Use as left</button> <button type="button" class="rounded border border-border bg-surface px-2 py-0.5 text-[11px] text-fg-muted hover:border-accent hover:text-accent">Use as right</button> <button type="button" class="rounded p-1 text-fg-subtle hover:bg-danger/10 hover:text-danger"${attr("aria-label", `Remove class ${stringify(cls.name)}`)}${attr("title", `Remove class ${stringify(cls.name)}`)}>`);
							Trash_2($$renderer, { class: "size-3.5" });
							$$renderer.push(`<!----></button></li>`);
						}
						$$renderer.push(`<!--]--></ul>`);
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]--> <div class="grid grid-cols-[1fr_2fr_auto] items-end gap-2 rounded-md border border-dashed border-border-strong/50 bg-surface-2/40 p-3">`);
					Field($$renderer, {
						label: "Class name (must start with @)",
						children: ($$renderer) => {
							Input($$renderer, {
								density: "sm",
								placeholder: "@A_left",
								get value() {
									return newClassName;
								},
								set value($$value) {
									newClassName = $$value;
									$$settled = false;
								}
							});
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----> `);
					Field($$renderer, {
						label: "Member glyphs (space-separated)",
						children: ($$renderer) => {
							Input($$renderer, {
								density: "sm",
								placeholder: "A Á Â Ä À Å Ã",
								get value() {
									return newClassMembers;
								},
								set value($$value) {
									newClassMembers = $$value;
									$$settled = false;
								}
							});
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----> `);
					{
						function icon($$renderer) {
							Plus($$renderer, { class: "size-3.5" });
						}
						Button($$renderer, {
							density: "sm",
							onclick: addClass,
							icon,
							children: ($$renderer) => {
								$$renderer.push(`<!---->Add class`);
							},
							$$slots: {
								icon: true,
								default: true
							}
						});
					}
					$$renderer.push(`<!----></div>`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			Panel($$renderer, {
				children: ($$renderer) => {
					$$renderer.push(`<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Pairs in this font (${escape_html(project()?.kerning.length ?? 0)})</h2> `);
					if (!project()?.kerning || project().kerning.length === 0) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<p class="text-sm text-fg-muted">No kerning yet. Add a pair above.</p>`);
					} else {
						$$renderer.push("<!--[-1-->");
						$$renderer.push(`<ul class="grid gap-1"><!--[-->`);
						const each_array_14 = ensure_array_like(project().kerning);
						for (let $$index_14 = 0, $$length = each_array_14.length; $$index_14 < $$length; $$index_14++) {
							let pair = each_array_14[$$index_14];
							$$renderer.push(`<li class="flex items-center gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2"><button type="button" class="flex items-center gap-1 text-2xl font-medium"><span${attr_class(clsx(isClassRef(pair.left) ? "font-mono text-[14px] text-accent" : "preview-font"))}>${escape_html(sideLabel(pair.left))}</span> <span${attr_class(clsx(isClassRef(pair.right) ? "font-mono text-[14px] text-accent" : "preview-font"))}>${escape_html(sideLabel(pair.right))}</span></button> <span class="ml-auto font-mono text-sm text-fg-muted" data-numeric="">${escape_html(pair.value > 0 ? "+" : "")}${escape_html(pair.value)}</span> <button type="button" class="rounded p-1 text-fg-subtle hover:bg-danger/10 hover:text-danger" aria-label="Remove pair" title="Remove kerning pair">`);
							Trash_2($$renderer, { class: "size-3.5" });
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
					$$renderer.push(`<h2 class="mb-3 inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">`);
					Globe($$renderer, { class: "size-3" });
					$$renderer.push(`<!----> Script packs</h2> <p class="mb-3 text-[12px] text-fg-subtle">Extend the default Latin set with Greek, Cyrillic, or Vietnamese. Adding a pack
			creates empty glyph slots — your existing glyphs are untouched.</p> <div class="grid gap-2 md:grid-cols-3"><!--[-->`);
					const each_array_15 = ensure_array_like(SCRIPT_PACKS);
					for (let $$index_15 = 0, $$length = each_array_15.length; $$index_15 < $$length; $$index_15++) {
						let pack = each_array_15[$$index_15];
						const present = project()?.glyphs[pack.glyphs[0]?.codepoint ?? 0] !== void 0;
						$$renderer.push(`<div class="rounded-md border border-border bg-surface-2/40 px-3 py-3"><div class="text-[13px] font-medium text-fg">${escape_html(pack.label)}</div> <div class="mb-2 text-[11px] text-fg-subtle">${escape_html(pack.description)}</div> `);
						{
							function icon($$renderer) {
								Plus($$renderer, { class: "size-3.5" });
							}
							Button($$renderer, {
								density: "sm",
								variant: present ? "ghost" : "secondary",
								onclick: () => projectStore.addScriptPack(pack),
								disabled: present,
								icon,
								children: ($$renderer) => {
									$$renderer.push(`<!---->${escape_html(present ? "Already added" : `Add ${pack.glyphs.length} glyphs`)}`);
								},
								$$slots: {
									icon: true,
									default: true
								}
							});
						}
						$$renderer.push(`<!----></div>`);
					}
					$$renderer.push(`<!--]--></div>`);
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
