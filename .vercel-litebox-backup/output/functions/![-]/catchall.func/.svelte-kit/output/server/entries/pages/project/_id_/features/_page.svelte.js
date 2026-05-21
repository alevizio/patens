import { G as escape_html, U as attr, c as ensure_array_like, f as stringify, n as attr_class, o as derived, r as attr_style } from "../../../../../chunks/dev.js";
import { n as Circle_check, t as Circle_alert } from "../../../../../chunks/circle-alert.js";
import { t as projectStore } from "../../../../../chunks/project.svelte.js";
import { t as buildFont } from "../../../../../chunks/export.js";
import { n as Loader_circle, t as Button } from "../../../../../chunks/Button.js";
import { t as Panel } from "../../../../../chunks/Panel.js";
import { a as getPythonProgress, n as compileFeaIntoFont, r as ensurePython } from "../../../../../chunks/python2.js";
import { t as Wand_sparkles } from "../../../../../chunks/wand-sparkles.js";
import { t as LoadingPanel } from "../../../../../chunks/LoadingPanel.js";
import { t as Rotate_ccw } from "../../../../../chunks/rotate-ccw.js";
import { t as autoFeaSource } from "../../../../../chunks/fea.js";
//#region src/routes/project/[id]/features/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const project = derived(() => projectStore.project);
		let pythonProgress = getPythonProgress();
		let buffer = "";
		let dirty = false;
		let testResult = null;
		let testing = false;
		const autoSource = derived(() => project() ? autoFeaSource(project()) : "");
		derived(() => project()?.features.feaSource ?? autoSource());
		const save = () => {
			if (!project()) return;
			projectStore.updateFeatures({ feaSource: buffer });
			dirty = false;
		};
		const resetToAuto = () => {
			if (!project()) return;
			projectStore.updateFeatures({ feaSource: void 0 });
			buffer = autoSource();
			dirty = false;
		};
		const SNIPPETS = [
			{
				tag: "smcp",
				label: "Small caps",
				body: `feature smcp {\n    sub [a b c d e f g h i j k l m n o p q r s t u v w x y z] by [A.sc B.sc C.sc D.sc E.sc F.sc G.sc H.sc I.sc J.sc K.sc L.sc M.sc N.sc O.sc P.sc Q.sc R.sc S.sc T.sc U.sc V.sc W.sc X.sc Y.sc Z.sc];\n} smcp;`
			},
			{
				tag: "c2sc",
				label: "Caps to small caps",
				body: `feature c2sc {\n    sub [A B C D E F G H I J K L M N O P Q R S T U V W X Y Z] by [A.sc B.sc C.sc D.sc E.sc F.sc G.sc H.sc I.sc J.sc K.sc L.sc M.sc N.sc O.sc P.sc Q.sc R.sc S.sc T.sc U.sc V.sc W.sc X.sc Y.sc Z.sc];\n} c2sc;`
			},
			{
				tag: "onum",
				label: "Old-style figures",
				body: `feature onum {\n    sub [zero one two three four five six seven eight nine] by [zero.osf one.osf two.osf three.osf four.osf five.osf six.osf seven.osf eight.osf nine.osf];\n} onum;`
			},
			{
				tag: "lnum",
				label: "Lining figures",
				body: `feature lnum {\n    sub [zero.osf one.osf two.osf three.osf four.osf five.osf six.osf seven.osf eight.osf nine.osf] by [zero one two three four five six seven eight nine];\n} lnum;`
			},
			{
				tag: "tnum",
				label: "Tabular figures",
				body: `feature tnum {\n    sub [zero one two three four five six seven eight nine] by [zero.tab one.tab two.tab three.tab four.tab five.tab six.tab seven.tab eight.tab nine.tab];\n} tnum;`
			},
			{
				tag: "pnum",
				label: "Proportional figures",
				body: `feature pnum {\n    sub [zero.tab one.tab two.tab three.tab four.tab five.tab six.tab seven.tab eight.tab nine.tab] by [zero one two three four five six seven eight nine];\n} pnum;`
			},
			{
				tag: "frac",
				label: "Fractions",
				body: `feature frac {\n    sub [one two three four] slash [two three four] by onehalf;\n    # Custom mapping per fraction. Replace with your fraction glyph names.\n} frac;`
			},
			{
				tag: "ordn",
				label: "Ordinals (1st, 2nd)",
				body: `feature ordn {\n    sub [a o]' [s t] by [ordfeminine ordmasculine];\n} ordn;`
			},
			{
				tag: "case",
				label: "Case-sensitive forms",
				body: `feature case {\n    sub [hyphen endash emdash parenleft parenright] by [hyphen.case endash.case emdash.case parenleft.case parenright.case];\n} case;`
			},
			{
				tag: "salt",
				label: "Stylistic alternates",
				body: `feature salt {\n    sub a by a.alt;\n    sub g by g.alt;\n} salt;`
			},
			{
				tag: "sups",
				label: "Superscript",
				body: `feature sups {\n    sub [zero one two three four five six seven eight nine] by [zero.sups one.sups two.sups three.sups four.sups five.sups six.sups seven.sups eight.sups nine.sups];\n} sups;`
			},
			{
				tag: "sinf",
				label: "Subscript / scientific inferior",
				body: `feature sinf {\n    sub [zero one two three four five six seven eight nine] by [zero.sinf one.sinf two.sinf three.sinf four.sinf five.sinf six.sinf seven.sinf eight.sinf nine.sinf];\n} sinf;`
			},
			{
				tag: "numr",
				label: "Numerator",
				body: `feature numr {\n    sub [zero one two three four five six seven eight nine] by [zero.numr one.numr two.numr three.numr four.numr five.numr six.numr seven.numr eight.numr nine.numr];\n} numr;`
			},
			{
				tag: "dnom",
				label: "Denominator",
				body: `feature dnom {\n    sub [zero one two three four five six seven eight nine] by [zero.dnom one.dnom two.dnom three.dnom four.dnom five.dnom six.dnom seven.dnom eight.dnom nine.dnom];\n} dnom;`
			},
			{
				tag: "locl",
				label: "Localized forms (Catalan ŀ·l)",
				body: `feature locl {\n    script latn;\n        language CAT;\n            sub l periodcentered l by l_l.locl_cat;\n} locl;`
			}
		];
		const testCompile = async () => {
			if (!project()) return;
			testing = true;
			testResult = null;
			try {
				await ensurePython();
				const { font } = buildFont(project());
				const otf = font.toArrayBuffer();
				const out = await compileFeaIntoFont(otf, buffer);
				testResult = {
					ok: true,
					message: "Features compiled successfully.",
					sizeBefore: otf.byteLength,
					sizeAfter: out.byteLength
				};
			} catch (err) {
				testResult = {
					ok: false,
					message: err instanceof Error ? err.message : String(err)
				};
			} finally {
				testing = false;
			}
		};
		if (!project()) {
			$$renderer.push("<!--[0-->");
			LoadingPanel($$renderer, { label: "Loading features" });
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div class="h-full overflow-auto"><div class="mx-auto flex max-w-5xl flex-col gap-6 p-6"><header><h1 class="text-xl font-semibold tracking-tight">OpenType features</h1> <p class="text-sm text-fg-muted">Edit the <code>.fea</code> source compiled into the font at export. Generated from your
					kerning + ligature settings; customize as needed.</p></header> `);
			Panel($$renderer, {
				padding: "none",
				children: ($$renderer) => {
					$$renderer.push(`<div class="flex items-center justify-between border-b border-border px-4 py-2.5"><div class="flex items-center gap-2"><span class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">features.fea</span> `);
					if (dirty) {
						$$renderer.push("<!--[0-->");
						$$renderer.push(`<span class="rounded-full bg-warn/20 px-2 py-0.5 text-[10px] font-medium text-warn">Unsaved</span>`);
					} else if (project().features.feaSource) {
						$$renderer.push("<!--[1-->");
						$$renderer.push(`<span class="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">Custom</span>`);
					} else {
						$$renderer.push("<!--[-1-->");
						$$renderer.push(`<span class="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success">Auto-generated</span>`);
					}
					$$renderer.push(`<!--]--></div> <div class="flex items-center gap-1.5">`);
					{
						function icon($$renderer) {
							Rotate_ccw($$renderer, { class: "size-3.5" });
						}
						Button($$renderer, {
							density: "sm",
							variant: "ghost",
							onclick: resetToAuto,
							icon,
							children: ($$renderer) => {
								$$renderer.push(`<!---->Reset to auto`);
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
							Wand_sparkles($$renderer, { class: "size-3.5" });
						}
						Button($$renderer, {
							density: "sm",
							variant: "secondary",
							onclick: testCompile,
							loading: testing,
							disabled: testing,
							icon,
							children: ($$renderer) => {
								$$renderer.push(`<!---->${escape_html(testing ? "Compiling…" : "Test compile")}`);
							},
							$$slots: {
								icon: true,
								default: true
							}
						});
					}
					$$renderer.push(`<!----> `);
					Button($$renderer, {
						density: "sm",
						onclick: save,
						disabled: !dirty,
						children: ($$renderer) => {
							$$renderer.push(`<!---->Save`);
						},
						$$slots: { default: true }
					});
					$$renderer.push(`<!----></div></div> <textarea class="block h-[60vh] w-full resize-none border-0 bg-canvas px-4 py-3 font-mono text-[12px] leading-[1.6] text-fg outline-none" spellcheck="false">`);
					const $$body = escape_html(buffer);
					if ($$body) $$renderer.push(`${$$body}`);
					$$renderer.push(`</textarea>`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			if (testResult) {
				$$renderer.push("<!--[0-->");
				Panel($$renderer, {
					children: ($$renderer) => {
						$$renderer.push(`<div class="flex items-start gap-2">`);
						if (testResult.ok) {
							$$renderer.push("<!--[0-->");
							Circle_check($$renderer, { class: "mt-0.5 size-4 text-success" });
						} else {
							$$renderer.push("<!--[-1-->");
							Circle_alert($$renderer, { class: "mt-0.5 size-4 text-danger" });
						}
						$$renderer.push(`<!--]--> <div class="grid gap-1"><div${attr_class(`text-sm font-medium ${stringify(testResult.ok ? "text-success" : "text-danger")}`)}>${escape_html(testResult.message)}</div> `);
						if (testResult.ok && testResult.sizeBefore && testResult.sizeAfter) {
							$$renderer.push("<!--[0-->");
							$$renderer.push(`<div class="text-[12px] text-fg-muted" data-numeric="">${escape_html((testResult.sizeBefore / 1024).toFixed(1))} KB → ${escape_html((testResult.sizeAfter / 1024).toFixed(1))} KB after features</div>`);
						} else $$renderer.push("<!--[-1-->");
						$$renderer.push(`<!--]--></div></div>`);
					},
					$$slots: { default: true }
				});
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			Panel($$renderer, {
				children: ($$renderer) => {
					$$renderer.push(`<h2 class="mb-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Snippet library</h2> <p class="mb-3 text-[12px] text-fg-subtle">Click to append a starter block. Edit the glyph names afterwards to match your project.</p> <div class="flex flex-wrap gap-1.5"><!--[-->`);
					const each_array = ensure_array_like(SNIPPETS);
					for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
						let s = each_array[$$index];
						$$renderer.push(`<button type="button" class="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2/40 px-2 py-1 text-[11px] font-medium text-fg-muted hover:border-accent hover:text-accent"${attr("title", `Append ${stringify(s.tag)} starter to features.fea`)}><span class="font-mono text-accent">${escape_html(s.tag)}</span> <span class="text-fg-subtle">${escape_html(s.label)}</span></button>`);
					}
					$$renderer.push(`<!--]--></div>`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			Panel($$renderer, {
				children: ($$renderer) => {
					$$renderer.push(`<h2 class="mb-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Quick reference</h2> <div class="grid grid-cols-2 gap-3 text-[12px]"><div><div class="mb-1 font-medium text-fg">Substitution (GSUB)</div> <pre class="rounded bg-surface-2/40 p-2 text-[11px] text-fg-muted">feature liga {
    sub f i by fi;
} liga;</pre></div> <div><div class="mb-1 font-medium text-fg">Positioning (GPOS)</div> <pre class="rounded bg-surface-2/40 p-2 text-[11px] text-fg-muted">feature kern {
    pos A V -90;
} kern;</pre></div> <div><div class="mb-1 font-medium text-fg">Glyph classes</div> <pre class="rounded bg-surface-2/40 p-2 text-[11px] text-fg-muted">@A_left = [A Á Â Ä];
feature kern {
    pos @A_left V -80;
} kern;</pre></div> <div><div class="mb-1 font-medium text-fg">Stylistic alternates</div> <pre class="rounded bg-surface-2/40 p-2 text-[11px] text-fg-muted">feature ss01 {
    sub a by a.alt;
} ss01;</pre></div></div> <p class="mt-3 text-[11px] text-fg-subtle">Full grammar: <a href="https://adobe-type-tools.github.io/afdko/OpenTypeFeatureFileSpecification.html" target="_blank" rel="noopener" class="text-accent hover:underline">AFDKO Feature File Specification</a></p>`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			if (pythonProgress.stage !== "ready" && pythonProgress.stage !== "idle" && pythonProgress.stage !== "error") {
				$$renderer.push("<!--[0-->");
				const pct = pythonProgress.stage === "loading-script" ? 25 : pythonProgress.stage === "starting-runtime" ? 55 : 85;
				$$renderer.push(`<div class="rounded-md bg-surface-2 px-3 py-2.5"><div class="mb-1.5 flex items-center justify-between gap-2 text-[12px] text-fg-muted"><span class="flex items-center gap-2">`);
				Loader_circle($$renderer, { class: "size-3.5 animate-spin" });
				$$renderer.push(`<!----> ${escape_html(pythonProgress.message)}</span> <span class="font-mono text-[10px] text-fg-subtle" data-numeric="">${escape_html(pct)}%</span></div> <div class="h-1 overflow-hidden rounded-full bg-surface" role="progressbar"${attr("aria-valuenow", pct)} aria-valuemin="0" aria-valuemax="100"><div class="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"${attr_style(`width: ${stringify(pct)}%`)}></div></div></div>`);
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div></div>`);
		}
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
export { _page as default };
