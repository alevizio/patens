import { n as onDestroy } from "../../../../../chunks/index-server.js";
import { G as escape_html, U as attr, W as clsx, c as ensure_array_like, f as stringify, n as attr_class, o as derived, r as attr_style } from "../../../../../chunks/dev.js";
import { t as projectStore } from "../../../../../chunks/project.svelte.js";
import { t as buildFont } from "../../../../../chunks/export.js";
import { t as Sliders_horizontal } from "../../../../../chunks/sliders-horizontal.js";
import { n as Loader_circle, t as Button } from "../../../../../chunks/Button.js";
import { t as Panel } from "../../../../../chunks/Panel.js";
import { a as getPythonProgress, r as ensurePython, t as buildVariableFont } from "../../../../../chunks/python2.js";
//#region src/routes/project/[id]/preview/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const SAMPLES = [
			"The quick brown fox jumps over the lazy dog",
			"Pack my box with five dozen liquor jugs",
			"Sphinx of black quartz, judge my vow",
			"How vexingly quick daft zebras jump"
		];
		const WATERFALL = [
			12,
			18,
			24,
			32,
			48,
			72,
			96,
			144
		];
		const DEFAULT_PARAGRAPH = `In typography, a typeface is a design of letters, numbers and other symbols, to be used in printing or for electronic display. Most typefaces include variations in size (e.g., 24 point), weight (light, bold), slope (italic, oblique), width (condensed, extended), and so on.`;
		const PROOF_LIBRARY = [
			{
				label: "Typography essay (default)",
				text: DEFAULT_PARAGRAPH
			},
			{
				label: "Wikipedia opening — \"Typeface\"",
				text: `A typeface is a design of letters, numbers and other symbols. Each typeface is a coordinated set of glyphs designed with stylistic unity. A typeface usually comprises an alphabet of letters, numerals, and punctuation marks; it may also include ideograms and symbols, or consist entirely of them.`
			},
			{
				label: "News lead",
				text: `The committee voted 9–2 on Thursday to approve a $4.7 billion budget, ending a three-month impasse and clearing the way for road repairs across all 47 districts before winter sets in. Officials said the first contracts would be awarded by Nov. 15.`
			},
			{
				label: "Novel opening (Calvino)",
				text: `You are about to begin reading Italo Calvino's new novel, If on a winter's night a traveler. Relax. Concentrate. Dispel every other thought. Let the world around you fade. Best to close the door; the TV is always on in the next room.`
			},
			{
				label: "Recipe",
				text: `Preheat the oven to 425°F (220°C). Toss 1½ lb of small potatoes with 3 Tbsp olive oil, 1 tsp salt, and ½ tsp pepper. Roast 25–30 min, shaking the pan halfway, until the skins blister and the centers yield to a fork.`
			},
			{
				label: "Code (TypeScript)",
				text: `// Reverse a string using array methods\nconst reverse = (s: string): string =>\n  [...s].reverse().join('');\n\nconst greeting = 'Hello, world!';\nconsole.log(reverse(greeting)); // "!dlrow ,olleH"`
			},
			{
				label: "Legal / contract",
				text: `IN CONSIDERATION OF the mutual covenants and agreements herein contained, and for other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the parties hereto agree as follows: 1. Definitions. 2. Term. 3. Payment.`
			},
			{
				label: "Numbers + currency",
				text: `Quarterly revenue rose 12.4% to $3,481,902 — up from $3,097,455 in Q2 2025. Operating margin held at 21%, while headcount grew from 184 to 211. The board approved a €0.42 dividend payable on 2026-06-15.`
			}
		];
		let proofIndex = 0;
		let drawnOnly = false;
		let measureCh = 60;
		derived(() => {
			const set = new Set([32, 10]);
			const project = projectStore.project;
			if (!project) return set;
			for (const g of Object.values(project.glyphs)) if (g.contours.length > 0 || (g.components?.length ?? 0) > 0) set.add(g.codepoint);
			return set;
		});
		const PARAGRAPH = derived(() => {
			return projectStore.project?.samples?.paragraph?.trim() || PROOF_LIBRARY[proofIndex]?.text || DEFAULT_PARAGRAPH;
		});
		const proofLabel = derived(() => projectStore.project?.samples?.paragraph?.trim() ? "Custom project sample" : PROOF_LIBRARY[proofIndex]?.label ?? "Default");
		const UI_LABELS = [
			"Settings",
			"Account",
			"Notifications",
			"Search",
			"Download",
			"Share",
			"New project",
			"Sign out"
		];
		let customText = "Hello, world";
		const sample = derived(() => projectStore.project?.metadata.familyName ?? "Sample");
		const proofForUseCases = (useCases) => {
			const rows = [];
			const has = (uc) => useCases?.includes(uc) ?? false;
			if (has("body-text")) rows.push({
				label: "Body / paragraph (11–16px)",
				sizes: [
					11,
					13,
					14,
					16
				],
				text: "In typography, a typeface is a design of letters, numbers and other symbols."
			});
			if (has("web-ui")) rows.push({
				label: "Web UI (12–20px)",
				sizes: [
					12,
					14,
					16,
					20
				],
				text: "Cancel · Save changes · Dashboard · Settings · Sign out"
			});
			if (has("display")) rows.push({
				label: "Display / headlines (48–144px)",
				sizes: [
					48,
					72,
					96,
					144
				],
				text: "Headline"
			});
			if (has("signage")) rows.push({
				label: "Signage / wayfinding (60–144px)",
				sizes: [
					60,
					96,
					144
				],
				text: "EXIT 14 · Platform 9 · Departures"
			});
			if (has("code")) rows.push({
				label: "Code / monospace (12–18px)",
				sizes: [
					12,
					14,
					16,
					18
				],
				text: "const palette = { primary: \"#0066FF\" };",
				mono: true
			});
			if (has("data-tables")) rows.push({
				label: "Data tables (11–14px, tnum)",
				sizes: [
					11,
					12,
					13,
					14
				],
				text: "1,247.50  892.10  71.5%",
				tnum: true
			});
			if (rows.length === 0) rows.push({
				label: "Default proof set",
				sizes: [
					14,
					24,
					48,
					96
				],
				text: "The quick brown fox"
			});
			return rows;
		};
		const proofRows = derived(() => proofForUseCases(projectStore.project?.brief?.useCases));
		const LANGUAGE_SAMPLES = [
			{
				id: "latin",
				label: "Latin",
				text: "The quick brown fox jumps over the lazy dog."
			},
			{
				id: "latin-ext",
				label: "Latin extended",
				text: "Příliš žluťoučký kůň úpěl ďábelské ódy. Æthelred — Œuvre — naïve façade."
			},
			{
				id: "vietnamese",
				label: "Vietnamese",
				text: "Tiếng Việt rất đẹp. Học mãi mới giỏi được những điều khó."
			},
			{
				id: "greek",
				label: "Greek",
				text: "Ξεσκεπάζω την ψυχοφθόρα βδελυγμία. Αθήνα, Θεσσαλονίκη."
			},
			{
				id: "cyrillic",
				label: "Cyrillic",
				text: "Съешь же ещё этих мягких французских булок, да выпей чаю."
			}
		];
		const FEATURES = [
			{
				tag: "kern",
				label: "kern",
				desc: "Kerning",
				long: "Adjusts spacing between specific glyph pairs to even out visual rhythm (GPOS table).",
				default: true
			},
			{
				tag: "liga",
				label: "liga",
				desc: "Standard ligatures",
				long: "Substitutes connected single glyphs for pairs that overlap or collide (fi, fl, ffi).",
				default: true
			},
			{
				tag: "dlig",
				label: "dlig",
				desc: "Discretionary ligatures",
				long: "Decorative ligatures meant for display use (ct, st, sp). Disabled by default in body text.",
				default: false
			},
			{
				tag: "calt",
				label: "calt",
				desc: "Contextual alternates",
				long: "Swaps glyphs based on surrounding characters — used for connecting scripts and avoiding collisions.",
				default: true
			},
			{
				tag: "onum",
				label: "onum",
				desc: "Old-style figures",
				long: "Numerals with ascenders and descenders that sit alongside lowercase in body copy.",
				default: false
			},
			{
				tag: "tnum",
				label: "tnum",
				desc: "Tabular figures",
				long: "Forces all digits to the same advance width — required for data tables and price columns.",
				default: false
			},
			{
				tag: "lnum",
				label: "lnum",
				desc: "Lining figures",
				long: "Capital-height numerals; default in most modern sans serifs.",
				default: false
			},
			{
				tag: "smcp",
				label: "smcp",
				desc: "Small caps",
				long: "Replaces lowercase with custom small-cap glyphs (not algorithmically scaled caps).",
				default: false
			},
			{
				tag: "zero",
				label: "zero",
				desc: "Slashed zero",
				long: "Disambiguates 0 from O in code, monospace, or data contexts.",
				default: false
			},
			{
				tag: "ss01",
				label: "ss01",
				desc: "Stylistic set 1",
				long: "Designer-defined alternate set (e.g., single-storey a, alternate g).",
				default: false
			}
		];
		let featureState = Object.fromEntries(FEATURES.map((f) => [f.tag, f.default]));
		const featureSettings = derived(() => FEATURES.map((f) => `'${f.tag}' ${featureState[f.tag] ? 1 : 0}`).join(", "));
		const project = derived(() => projectStore.project);
		const isVariable = derived(() => project() ? (project().axes?.length ?? 0) > 0 && (project().masters?.length ?? 0) > 0 : false);
		let pythonProgress = getPythonProgress();
		let vfBuilding = false;
		let vfFamily = null;
		let axisValues = {};
		let currentVfFace = null;
		let currentVfUrl = null;
		onDestroy(() => {
			if (currentVfFace) {
				try {
					document.fonts.delete(currentVfFace);
				} catch {}
				currentVfFace = null;
			}
			if (currentVfUrl) {
				URL.revokeObjectURL(currentVfUrl);
				currentVfUrl = null;
			}
		});
		const variationSettings = derived(() => Object.entries(axisValues).map(([tag, value]) => `'${tag}' ${value}`).join(", "));
		const buildVf = async () => {
			if (!project() || !isVariable()) return;
			vfBuilding = true;
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
				const family = `VfPreview_${Date.now()}`;
				const blob = new Blob([vfBuffer], { type: "font/ttf" });
				const url = URL.createObjectURL(blob);
				const face = new FontFace(family, `url(${url}) format("truetype-variations")`);
				await face.load();
				document.fonts.add(face);
				if (currentVfFace) document.fonts.delete(currentVfFace);
				if (currentVfUrl) URL.revokeObjectURL(currentVfUrl);
				currentVfFace = face;
				currentVfUrl = url;
				vfFamily = family;
			} catch (err) {
				alert("VF preview build failed: " + (err instanceof Error ? err.message : String(err)));
			} finally {
				vfBuilding = false;
			}
		};
		$$renderer.push(`<div class="h-full overflow-auto"><div class="mx-auto flex max-w-6xl flex-col gap-6 p-6"><header><h1 class="text-xl font-semibold tracking-tight">Preview</h1> <p class="text-sm text-fg-muted">Live render of <span class="font-mono text-fg">${escape_html(sample())}</span> via <code>@font-face</code>. Updates as you draw.</p></header> `);
		if (isVariable()) {
			$$renderer.push("<!--[0-->");
			Panel($$renderer, {
				children: ($$renderer) => {
					$$renderer.push(`<h2 class="mb-3 inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">`);
					Sliders_horizontal($$renderer, { class: "size-3" });
					$$renderer.push(`<!----> Variable sandbox</h2> `);
					if (!vfFamily) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<p class="mb-3 text-[12px] text-fg-subtle">Compile the variable font once and play with the axes live. First click
						loads Python (~10MB, cached for the session).</p> `);
						{
							function icon($$renderer) {
								Sliders_horizontal($$renderer, { class: "size-4" });
							}
							Button($$renderer, {
								onclick: buildVf,
								loading: vfBuilding,
								icon,
								children: ($$renderer) => {
									$$renderer.push(`<!---->${escape_html(vfBuilding ? "Compiling…" : "Build variable font preview")}`);
								},
								$$slots: {
									icon: true,
									default: true
								}
							});
						}
						$$renderer.push(`<!----> `);
						if (pythonProgress.stage !== "ready" && pythonProgress.stage !== "idle" && vfBuilding) {
							$$renderer.push("<!--[0-->");
							$$renderer.push(`<div class="mt-2 inline-flex items-center gap-1.5 text-[12px] text-fg-muted">`);
							Loader_circle($$renderer, { class: "size-3 animate-spin" });
							$$renderer.push(`<!----> ${escape_html(pythonProgress.message)}</div>`);
						} else $$renderer.push("<!--[-1-->");
						$$renderer.push(`<!--]-->`);
					} else {
						$$renderer.push("<!--[-1-->");
						$$renderer.push(`<div class="grid gap-3"><!--[-->`);
						const each_array = ensure_array_like(project()?.axes ?? []);
						for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
							let axis = each_array[$$index];
							$$renderer.push(`<label class="grid grid-cols-[100px_1fr_60px] items-center gap-3"><span class="text-[12px] font-medium text-fg">${escape_html(axis.name)} <span class="font-mono text-fg-subtle">${escape_html(axis.tag)}</span></span> <input type="range"${attr("min", axis.minimum)}${attr("max", axis.maximum)}${attr("step", (axis.maximum - axis.minimum) / 200 || 1)}${attr("value", axisValues[axis.tag] ?? axis.default)} class="h-1 accent-accent"/> <span class="text-right font-mono text-[12px] text-fg-muted" data-numeric="">${escape_html(Math.round(axisValues[axis.tag] ?? axis.default))}</span></label>`);
						}
						$$renderer.push(`<!--]--></div> `);
						if ((project()?.instances ?? []).length > 0) {
							$$renderer.push("<!--[0-->");
							$$renderer.push(`<div class="mt-3 flex flex-wrap items-center gap-1.5"><span class="text-[11px] font-medium text-fg-muted">Jump to instance:</span> <!--[-->`);
							const each_array_1 = ensure_array_like(project()?.instances ?? []);
							for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
								let inst = each_array_1[$$index_1];
								$$renderer.push(`<button type="button" class="rounded-md border border-border bg-surface-2 px-2 py-0.5 text-[11px] font-medium hover:border-accent hover:text-accent">${escape_html(inst.styleName)}</button>`);
							}
							$$renderer.push(`<!--]--></div>`);
						} else $$renderer.push("<!--[-1-->");
						$$renderer.push(`<!--]--> <div class="mt-4 rounded-lg border border-border bg-canvas p-6 text-center text-7xl leading-none"${attr_style(`font-family: '${stringify(vfFamily)}', sans-serif; font-variation-settings: ${stringify(variationSettings())};`)}>${escape_html(customText)}</div> <div class="mt-2 font-mono text-[11px] text-fg-subtle" data-numeric="">font-variation-settings: ${escape_html(variationSettings())}</div>`);
					}
					$$renderer.push(`<!--]-->`);
				},
				$$slots: { default: true }
			});
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		Panel($$renderer, {
			children: ($$renderer) => {
				$$renderer.push(`<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Custom string</h2> <input${attr("value", customText)} class="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft" placeholder="Type something…"/> <div class="preview-font mt-4 text-6xl leading-tight">${escape_html(customText)}</div>`);
			},
			$$slots: { default: true }
		});
		$$renderer.push(`<!----> `);
		Panel($$renderer, {
			children: ($$renderer) => {
				$$renderer.push(`<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Proof at intended sizes</h2> <p class="mb-3 text-[12px] text-fg-subtle">Auto-generated from the use cases checked on the <a${attr("href", `/project/${stringify(project()?.id)}/brief`)} class="underline hover:text-fg">Brief</a> tab.
				Each row exercises a real reading condition at its real sizes.</p> <div class="grid gap-5"><!--[-->`);
				const each_array_2 = ensure_array_like(proofRows());
				for (let $$index_3 = 0, $$length = each_array_2.length; $$index_3 < $$length; $$index_3++) {
					let row = each_array_2[$$index_3];
					$$renderer.push(`<div><div class="mb-1.5 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">${escape_html(row.label)}</div> <div class="grid gap-1.5"><!--[-->`);
					const each_array_3 = ensure_array_like(row.sizes);
					for (let $$index_2 = 0, $$length = each_array_3.length; $$index_2 < $$length; $$index_2++) {
						let size = each_array_3[$$index_2];
						$$renderer.push(`<div class="flex items-baseline gap-3 border-b border-border/40 py-1"><span class="w-10 shrink-0 text-right font-mono text-[10px] text-fg-subtle" data-numeric="">${escape_html(size)}px</span> <span${attr_class(clsx(row.mono ? "preview-font font-mono leading-[1.4]" : "preview-font leading-[1.4]"))}${attr_style(`font-size: ${stringify(size)}px; font-feature-settings: 'kern' 1, 'liga' 1${stringify(row.tnum ? `, 'tnum' 1` : "")};`)}>${escape_html(row.text)}</span></div>`);
					}
					$$renderer.push(`<!--]--></div></div>`);
				}
				$$renderer.push(`<!--]--></div>`);
			},
			$$slots: { default: true }
		});
		$$renderer.push(`<!----> `);
		Panel($$renderer, {
			children: ($$renderer) => {
				$$renderer.push(`<div class="mb-3 flex flex-wrap items-baseline justify-between gap-2"><h2 class="inline-flex items-baseline gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Paragraph (16/24) <span class="text-fg-subtle/70 normal-case tracking-normal">· ${escape_html(proofLabel())}</span></h2> <div class="flex items-center gap-3"><button type="button"${attr("disabled", !!projectStore.project?.samples?.paragraph?.trim(), true)} class="rounded border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-fg-muted hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"${attr("title", projectStore.project?.samples?.paragraph?.trim() ? "Disabled — clear the custom sample to rotate the proof library" : "Rotate to a different real-text proof")}>Shuffle</button> <label class="inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-fg-muted hover:text-fg"><input type="checkbox"${attr("checked", drawnOnly, true)} class="size-3 rounded border-border accent-accent"/> Drawn glyphs only</label> <label class="inline-flex items-center gap-1.5 text-[11px] text-fg-muted">Measure <input type="range" min="30" max="100" step="1"${attr("value", measureCh)} class="w-24 accent-accent"/> <span class="font-mono text-[10px]" data-numeric="">${escape_html(measureCh)}ch</span></label></div></div> <p class="preview-font text-base leading-[1.5]"${attr_style(`max-width: ${stringify(measureCh)}ch;`)}>${escape_html(PARAGRAPH())}</p> `);
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]-->`);
			},
			$$slots: { default: true }
		});
		$$renderer.push(`<!----> `);
		Panel($$renderer, {
			children: ($$renderer) => {
				$$renderer.push(`<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">UI sample</h2> <div class="grid grid-cols-2 gap-2 sm:grid-cols-4"><!--[-->`);
				const each_array_4 = ensure_array_like(UI_LABELS);
				for (let $$index_4 = 0, $$length = each_array_4.length; $$index_4 < $$length; $$index_4++) {
					let label = each_array_4[$$index_4];
					$$renderer.push(`<div class="preview-font flex items-center justify-center rounded-md border border-border bg-surface-2/40 px-3 py-2 text-[13px]">${escape_html(label)}</div>`);
				}
				$$renderer.push(`<!--]--></div> <div class="preview-font mt-3 grid grid-cols-3 gap-2 text-center"><div class="rounded-md border border-border bg-surface-2/40 px-3 py-3"><div class="text-[11px] text-fg-subtle">Total</div> <div class="mt-1 text-2xl font-medium" data-numeric="">1,247</div></div> <div class="rounded-md border border-border bg-surface-2/40 px-3 py-3"><div class="text-[11px] text-fg-subtle">Active</div> <div class="mt-1 text-2xl font-medium" data-numeric="">892</div></div> <div class="rounded-md border border-border bg-surface-2/40 px-3 py-3"><div class="text-[11px] text-fg-subtle">Rate</div> <div class="mt-1 text-2xl font-medium" data-numeric="">71.5%</div></div></div>`);
			},
			$$slots: { default: true }
		});
		$$renderer.push(`<!----> `);
		Panel($$renderer, {
			children: ($$renderer) => {
				$$renderer.push(`<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Code sample</h2> <pre class="preview-font overflow-x-auto rounded-md border border-border bg-surface-2/40 p-4 text-[13px] leading-[1.55]">const palette = {
  primary:   '#0066FF',
  surface:   '#FAFAFA',
  border:    '#E5E5E5',
};

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) &amp; 0xff, n &amp; 0xff];
}</pre>`);
			},
			$$slots: { default: true }
		});
		$$renderer.push(`<!----> `);
		Panel($$renderer, {
			children: ($$renderer) => {
				$$renderer.push(`<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Waterfall</h2> <div class="grid gap-3"><!--[-->`);
				const each_array_5 = ensure_array_like(WATERFALL);
				for (let $$index_5 = 0, $$length = each_array_5.length; $$index_5 < $$length; $$index_5++) {
					let size = each_array_5[$$index_5];
					const pt = Math.round(size * 72 / 96);
					$$renderer.push(`<div class="flex items-baseline gap-4"><span class="w-20 shrink-0 text-right font-mono text-[11px] text-fg-subtle" data-numeric=""${attr("title", `${stringify(size)}px ≈ ${stringify(pt)}pt at 96 DPI`)}>${escape_html(size)}px <span class="opacity-60">/ ${escape_html(pt)}pt</span></span> <span class="preview-font truncate leading-[1.2]"${attr_style(`font-size: ${stringify(size)}px;`)}>${escape_html(SAMPLES[0])}</span></div>`);
				}
				$$renderer.push(`<!--]--></div> <p class="mt-2 text-[10px] text-fg-subtle">Point sizes computed at 96 DPI (CSS default). Legge's reading research shows print
				size remains a dominant readability variable — proof at the sizes your typeface will
				actually be set.</p>`);
			},
			$$slots: { default: true }
		});
		$$renderer.push(`<!----> `);
		Panel($$renderer, {
			children: ($$renderer) => {
				$$renderer.push(`<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Pangrams</h2> <div class="grid gap-3"><!--[-->`);
				const each_array_6 = ensure_array_like(SAMPLES);
				for (let $$index_6 = 0, $$length = each_array_6.length; $$index_6 < $$length; $$index_6++) {
					let text = each_array_6[$$index_6];
					$$renderer.push(`<div class="preview-font text-2xl leading-snug">${escape_html(text)}</div>`);
				}
				$$renderer.push(`<!--]--></div>`);
			},
			$$slots: { default: true }
		});
		$$renderer.push(`<!----> `);
		Panel($$renderer, {
			children: ($$renderer) => {
				$$renderer.push(`<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Language coverage</h2> <p class="mb-3 text-[12px] text-fg-subtle">Missing glyphs fall back to the system font so you can see what's covered at a glance.</p> <div class="grid gap-3"><!--[-->`);
				const each_array_7 = ensure_array_like(LANGUAGE_SAMPLES);
				for (let $$index_7 = 0, $$length = each_array_7.length; $$index_7 < $$length; $$index_7++) {
					let lang = each_array_7[$$index_7];
					$$renderer.push(`<div><div class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">${escape_html(lang.label)}</div> <div class="preview-font mt-1 text-xl leading-snug">${escape_html(lang.text)}</div></div>`);
				}
				$$renderer.push(`<!--]--></div>`);
			},
			$$slots: { default: true }
		});
		$$renderer.push(`<!----> `);
		Panel($$renderer, {
			children: ($$renderer) => {
				$$renderer.push(`<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">OpenType features</h2> <p class="mb-3 text-[12px] text-fg-subtle">Toggle features at render time via <code class="font-mono">font-feature-settings</code>.
				Compile the font to see them really work.</p> <div class="mb-3 flex flex-wrap gap-1.5"><!--[-->`);
				const each_array_8 = ensure_array_like(FEATURES);
				for (let $$index_8 = 0, $$length = each_array_8.length; $$index_8 < $$length; $$index_8++) {
					let f = each_array_8[$$index_8];
					$$renderer.push(`<button type="button"${attr_class(`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${stringify(featureState[f.tag] ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface-2 text-fg-muted hover:border-fg-subtle")}`)}${attr("title", f.desc)}><span class="font-mono">${escape_html(f.label)}</span></button>`);
				}
				$$renderer.push(`<!--]--></div> `);
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`<div class="mb-3 rounded-md border border-dashed border-border-strong/40 bg-surface-2/40 px-3 py-2 text-[11px] text-fg-subtle">Hover a feature tag above to see what it controls.</div>`);
				$$renderer.push(`<!--]--> <div class="preview-font rounded-lg border border-border bg-canvas p-6 text-3xl leading-snug"${attr_style(`font-feature-settings: ${stringify(featureSettings())};`)}>fi fl 0123 12/34 — Office 1029 — affluent</div> <div class="mt-2 font-mono text-[11px] text-fg-subtle" data-numeric="">font-feature-settings: ${escape_html(featureSettings())}</div>`);
			},
			$$slots: { default: true }
		});
		$$renderer.push(`<!----> `);
		Panel($$renderer, {
			children: ($$renderer) => {
				$$renderer.push(`<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Glyph proof</h2> <div class="preview-font text-3xl leading-snug"><div>HOHOHO HOnono HnHonHonH</div> <div>nonono AVAVAV LATATe</div> <div>0123456789 .,;:!?</div></div>`);
			},
			$$slots: { default: true }
		});
		$$renderer.push(`<!----></div></div>`);
	});
}
//#endregion
export { _page as default };
