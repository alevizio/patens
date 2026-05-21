import { G as escape_html, U as attr, c as ensure_array_like, f as stringify, n as attr_class, o as derived } from "../../../../../chunks/dev.js";
import "../../../../../chunks/toast2.svelte.js";
import { S as USE_CASE_LABELS } from "../../../../../chunks/project.js";
import { t as projectStore } from "../../../../../chunks/project.svelte.js";
import { n as Input, t as Field } from "../../../../../chunks/Field.js";
import { t as Plus } from "../../../../../chunks/plus.js";
import { t as File_text } from "../../../../../chunks/file-text.js";
import { t as Button } from "../../../../../chunks/Button.js";
import { t as Panel } from "../../../../../chunks/Panel.js";
import { t as Trash_2 } from "../../../../../chunks/trash-2.js";
import { t as External_link } from "../../../../../chunks/external-link.js";
import { t as LoadingPanel } from "../../../../../chunks/LoadingPanel.js";
//#region src/routes/project/[id]/brief/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const project = derived(() => projectStore.project);
		const brief = derived(() => project()?.brief ?? {});
		const selectedUseCases = derived(() => brief().useCases ?? []);
		const countWords = (s) => {
			const trimmed = (s ?? "").trim();
			if (!trimmed) return 0;
			return trimmed.split(/\s+/).length;
		};
		let newRefName = "";
		let newRefUrl = "";
		let newRefKind = "competitive";
		let newRefNotes = "";
		const KIND_LABELS = {
			functional: "Functional",
			historical: "Historical",
			competitive: "Competitive"
		};
		const KIND_COLORS = {
			functional: "bg-success/15 text-success",
			historical: "bg-warn/15 text-warn",
			competitive: "bg-accent/15 text-accent"
		};
		const COMMON_REFS = [
			{
				name: "Inter",
				url: "https://rsms.me/inter/",
				kind: "competitive",
				notes: "Reference UI sans — high x-height, generous apertures."
			},
			{
				name: "IBM Plex Sans",
				url: "https://www.ibm.com/plex/",
				kind: "competitive",
				notes: "System-style with distinctive humanist details."
			},
			{
				name: "Source Serif",
				url: "https://github.com/adobe-fonts/source-serif",
				kind: "competitive",
				notes: "Open-source workhorse serif from Adobe."
			},
			{
				name: "JetBrains Mono",
				url: "https://www.jetbrains.com/lp/mono/",
				kind: "competitive",
				notes: "Reference mono — tall lowercase, ligature-friendly."
			},
			{
				name: "Recursive",
				url: "https://www.recursive.design/",
				kind: "competitive",
				notes: "Variable, casual/proportional axes — modern range example."
			}
		];
		const ESSAY_OPENINGS = derived(() => {
			const family = project()?.metadata.familyName ?? "This typeface";
			const familyAlt = project()?.metadata.familyName ?? "This family";
			return [
				{
					label: "Reference-as-argument (KLIM cadence)",
					text: `${family} began as a memory of [reference], framed through the practical reality of [adjacent reference]. Where [reference] is [observation], we wanted [intentional departure]. The result reads as [intended tone] without losing [intended craft quality].`
				},
				{
					label: "Optical-size logic (Hoefler cadence)",
					text: `${familyAlt} exists because one outline does not survive both small-text reading and large-display setting. At caption sizes the counters open and the joins soften; at display sizes the proportions tighten and the terminals sharpen. The middle weights are tuned for the sizes most copy actually runs at.`
				},
				{
					label: "Editorial workhorse (Commercial Type cadence)",
					text: `${family} is deliberately plain. Its goal is to carry [editorial context] without calling attention to itself — the kind of face you stop noticing on the second page. Every choice was made in service of [reading condition]; the personality lives in [specific micro-detail], not in any single dramatic gesture.`
				}
			];
		});
		let newDecisionTitle = "";
		let newDecisionRationale = "";
		const formatDecisionDate = (iso) => {
			const d = new Date(iso);
			if (!Number.isFinite(d.getTime())) return iso;
			return d.toLocaleDateString(void 0, {
				year: "numeric",
				month: "short",
				day: "numeric"
			});
		};
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (!project()) {
				$$renderer.push("<!--[0-->");
				LoadingPanel($$renderer, { label: "Loading brief" });
			} else {
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`<div class="h-full overflow-auto"><div class="mx-auto flex max-w-5xl flex-col gap-6 p-6"><header class="flex items-start gap-3"><div class="mt-1 flex size-9 items-center justify-center rounded-md bg-accent-soft text-accent">`);
				File_text($$renderer, { class: "size-4" });
				$$renderer.push(`<!----></div> <div><h1 class="text-xl font-semibold tracking-tight">Brief</h1> <p class="text-sm text-fg-muted">Type design is system design. Defining the problem before drawing keeps
						scope, audience, and use cases honest as the family grows.</p></div></header> `);
				Panel($$renderer, {
					children: ($$renderer) => {
						$$renderer.push(`<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Intent</h2> `);
						Field($$renderer, {
							label: "What is this typeface for?",
							hint: "One sentence is enough. What problem does it solve, what voice does it carry?",
							children: ($$renderer) => {
								$$renderer.push(`<textarea placeholder="e.g., A sturdy contemporary geometric sans for product UI at 12–32px, optimised for small data tables and dashboards." rows="3" class="block w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft">`);
								const $$body = escape_html(brief().intent ?? "");
								if ($$body) $$renderer.push(`${$$body}`);
								$$renderer.push(`</textarea> <div class="text-right font-mono text-[10px] text-fg-subtle" data-numeric="">${escape_html(countWords(brief().intent))} words · ${escape_html((brief().intent ?? "").length)} chars</div>`);
							},
							$$slots: { default: true }
						});
						$$renderer.push(`<!----> `);
						Field($$renderer, {
							label: "Audience / typical user",
							hint: "Designers? Engineers? Newspaper readers? Drives a lot of downstream decisions.",
							children: ($$renderer) => {
								$$renderer.push(`<textarea placeholder="e.g., Product designers and engineers building B2B SaaS dashboards." rows="2" class="block w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft">`);
								const $$body_1 = escape_html(brief().audience ?? "");
								if ($$body_1) $$renderer.push(`${$$body_1}`);
								$$renderer.push(`</textarea> <div class="text-right font-mono text-[10px] text-fg-subtle" data-numeric="">${escape_html(countWords(brief().audience))} words · ${escape_html((brief().audience ?? "").length)} chars</div>`);
							},
							$$slots: { default: true }
						});
						$$renderer.push(`<!----> `);
						Field($$renderer, {
							label: "Reading conditions",
							hint: "Sizes, distances, screens vs. print, foreground/background contrast.",
							children: ($$renderer) => {
								$$renderer.push(`<textarea placeholder="e.g., 12–16px on 1× and 2× displays; mostly dark mode; long sessions; no large display use." rows="2" class="block w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft">`);
								const $$body_2 = escape_html(brief().readingConditions ?? "");
								if ($$body_2) $$renderer.push(`${$$body_2}`);
								$$renderer.push(`</textarea> <div class="text-right font-mono text-[10px] text-fg-subtle" data-numeric="">${escape_html(countWords(brief().readingConditions))} words · ${escape_html((brief().readingConditions ?? "").length)} chars</div>`);
							},
							$$slots: { default: true }
						});
						$$renderer.push(`<!---->`);
					},
					$$slots: { default: true }
				});
				$$renderer.push(`<!----> `);
				Panel($$renderer, {
					children: ($$renderer) => {
						$$renderer.push(`<h2 class="mb-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Use cases</h2> <p class="mb-3 text-[12px] text-fg-subtle">Tag every context this family must serve. Affects axis choices, feature set,
					hinting effort, and naming.</p> <div class="flex flex-wrap gap-1.5"><!--[-->`);
						const each_array = ensure_array_like(Object.entries(USE_CASE_LABELS));
						for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
							let [uc, label] = each_array[$$index];
							const active = selectedUseCases().includes(uc);
							$$renderer.push(`<button type="button"${attr_class(`rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors ${stringify(active ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface-2/40 text-fg-muted hover:border-border-strong hover:text-fg")}`)}>${escape_html(label)}</button>`);
						}
						$$renderer.push(`<!--]--></div>`);
					},
					$$slots: { default: true }
				});
				$$renderer.push(`<!----> `);
				Panel($$renderer, {
					children: ($$renderer) => {
						$$renderer.push(`<h2 class="mb-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Differentiation</h2> `);
						Field($$renderer, {
							label: "What's the angle vs comparable families?",
							hint: "If you could only state one design decision a competitor wouldn't make, what is it?",
							children: ($$renderer) => {
								$$renderer.push(`<textarea placeholder="e.g., Slightly higher x-height than Inter, with shorter ascenders — tighter line spacing in dashboards without losing aperture clarity." rows="3" class="block w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft">`);
								const $$body_3 = escape_html(brief().differentiation ?? "");
								if ($$body_3) $$renderer.push(`${$$body_3}`);
								$$renderer.push(`</textarea> <div class="text-right font-mono text-[10px] text-fg-subtle" data-numeric="">${escape_html(countWords(brief().differentiation))} words · ${escape_html((brief().differentiation ?? "").length)} chars</div>`);
							},
							$$slots: { default: true }
						});
						$$renderer.push(`<!---->`);
					},
					$$slots: { default: true }
				});
				$$renderer.push(`<!----> `);
				Panel($$renderer, {
					children: ($$renderer) => {
						$$renderer.push(`<h2 class="mb-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Design notes</h2> <p class="mb-3 text-[12px] text-fg-subtle">The editorial story behind the typeface — the kind of essay that lives at the
					top of a foundry's specimen page. Markdown-light, kept whole.</p> <textarea${attr("placeholder", `e.g., A digital-first reading face whose proportions were derived from… The italic was drawn first and informed the upright via shared stress angles… Vietnamese diacritics use a single shared shape across two-storey marks…`)} rows="6" class="block w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm leading-[1.55] text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft">`);
						const $$body_4 = escape_html(brief().designNotes ?? "");
						if ($$body_4) $$renderer.push(`${$$body_4}`);
						$$renderer.push(`</textarea> <div class="mt-1 flex items-baseline justify-between gap-3 text-[11px] text-fg-subtle"><span>Appears in the Specimen between Cover and Character set when set.</span> <span class="font-mono text-[10px]" data-numeric="">${escape_html(countWords(brief().designNotes))} words · ${escape_html((brief().designNotes ?? "").length)} chars</span></div> `);
						if (!brief().designNotes?.trim()) {
							$$renderer.push("<!--[0-->");
							$$renderer.push(`<div class="mt-3 rounded-md border border-dashed border-border-strong/50 bg-surface-2/40 p-3"><div class="mb-2 text-[11px] font-medium text-fg-muted">Stuck on the opening? Drop in a foundry-style template and rewrite over
							it:</div> <div class="flex flex-wrap gap-1.5"><!--[-->`);
							const each_array_1 = ensure_array_like(ESSAY_OPENINGS());
							for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
								let opening = each_array_1[$$index_1];
								$$renderer.push(`<button type="button" class="rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-medium text-fg-muted hover:border-accent hover:text-accent"${attr("title", `Insert ${stringify(opening.label)} into design notes`)}>+ ${escape_html(opening.label)}</button>`);
							}
							$$renderer.push(`<!--]--></div></div>`);
						} else $$renderer.push("<!--[-1-->");
						$$renderer.push(`<!--]-->`);
					},
					$$slots: { default: true }
				});
				$$renderer.push(`<!----> `);
				Panel($$renderer, {
					children: ($$renderer) => {
						$$renderer.push(`<h2 class="mb-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Decision log (${escape_html(project().decisions?.length ?? 0)})</h2> <p class="mb-3 text-[12px] text-fg-subtle">Capture each meaningful decision while the context is fresh. Different from the
					changelog — these are <em>per-decision</em> not per-version, and they're what makes
					a foundry's specimens worth reading. They flow into the exported <code>DESIGN.md</code>.</p> `);
						if (project().decisions && project().decisions.length > 0) {
							$$renderer.push("<!--[0-->");
							$$renderer.push(`<ul class="mb-3 grid gap-2"><!--[-->`);
							const each_array_2 = ensure_array_like(project().decisions);
							for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
								let d = each_array_2[$$index_2];
								$$renderer.push(`<li class="grid grid-cols-[1fr_auto] items-start gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2"><div class="min-w-0"><div class="flex items-baseline gap-2"><span class="text-[13px] font-semibold text-fg">${escape_html(d.decision)}</span> <span class="text-[10px] font-mono text-fg-subtle" data-numeric="">${escape_html(formatDecisionDate(d.date))}</span></div> <div class="mt-0.5 whitespace-pre-line text-[12px] text-fg-muted">${escape_html(d.rationale)}</div></div> <button type="button" class="rounded p-1 text-fg-subtle hover:bg-danger/10 hover:text-danger" aria-label="Remove decision" title="Remove decision">`);
								Trash_2($$renderer, { class: "size-3.5" });
								$$renderer.push(`<!----></button></li>`);
							}
							$$renderer.push(`<!--]--></ul>`);
						} else $$renderer.push("<!--[-1-->");
						$$renderer.push(`<!--]--> <form class="rounded-md border border-dashed border-border-strong/50 bg-surface-2/40 p-3"><div class="grid gap-2">`);
						Field($$renderer, {
							label: "What did you decide?",
							children: ($$renderer) => {
								Input($$renderer, {
									density: "sm",
									placeholder: "e.g. tighten default sidebearing from 50 to 40 units",
									get value() {
										return newDecisionTitle;
									},
									set value($$value) {
										newDecisionTitle = $$value;
										$$settled = false;
									}
								});
							},
							$$slots: { default: true }
						});
						$$renderer.push(`<!----> `);
						Field($$renderer, {
							label: "Why?",
							children: ($$renderer) => {
								$$renderer.push(`<textarea placeholder="What problem did this solve? What's the trade-off you accepted?" rows="3" class="block w-full resize-y rounded-md border border-border bg-surface px-2 py-1.5 text-[12px] text-fg outline-none focus:border-accent">`);
								const $$body_5 = escape_html(newDecisionRationale);
								if ($$body_5) $$renderer.push(`${$$body_5}`);
								$$renderer.push(`</textarea>`);
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
								type: "submit",
								disabled: !newDecisionTitle.trim() || !newDecisionRationale.trim(),
								icon,
								children: ($$renderer) => {
									$$renderer.push(`<!---->Log decision`);
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
				$$renderer.push(`<!----> `);
				Panel($$renderer, {
					children: ($$renderer) => {
						$$renderer.push(`<h2 class="mb-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Reference corpus (${escape_html(brief().references?.length ?? 0)})</h2> <p class="mb-3 text-[12px] text-fg-subtle">Track three kinds of references: <strong class="text-success">functional</strong> (real text this font must handle), <strong class="text-warn">historical</strong> (writing/lettering/print models), and <strong class="text-accent">competitive</strong> (existing solutions to study).</p> `);
						if (brief().references && brief().references.length > 0) {
							$$renderer.push("<!--[0-->");
							$$renderer.push(`<ul class="mb-4 grid gap-1.5"><!--[-->`);
							const each_array_3 = ensure_array_like(brief().references);
							for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
								let r = each_array_3[$$index_3];
								$$renderer.push(`<li class="grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2"><span${attr_class(`rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${stringify(KIND_COLORS[r.kind ?? "competitive"])}`)}>${escape_html(KIND_LABELS[r.kind ?? "competitive"])}</span> <div class="min-w-0"><div class="flex items-center gap-1.5"><span class="truncate text-[13px] font-medium text-fg">${escape_html(r.name)}</span> `);
								if (r.url) {
									$$renderer.push("<!--[0-->");
									$$renderer.push(`<a${attr("href", r.url)} target="_blank" rel="noopener" class="text-fg-subtle hover:text-accent" aria-label="Open reference URL">`);
									External_link($$renderer, { class: "size-3" });
									$$renderer.push(`<!----></a>`);
								} else $$renderer.push("<!--[-1-->");
								$$renderer.push(`<!--]--></div> `);
								if (r.notes) {
									$$renderer.push("<!--[0-->");
									$$renderer.push(`<div class="text-[11px] text-fg-muted">${escape_html(r.notes)}</div>`);
								} else $$renderer.push("<!--[-1-->");
								$$renderer.push(`<!--]--></div> <button type="button" class="rounded p-1 text-fg-subtle hover:bg-danger/10 hover:text-danger"${attr("aria-label", `Remove reference ${stringify(r.name)}`)}${attr("title", `Remove reference ${stringify(r.name)}`)}>`);
								Trash_2($$renderer, { class: "size-3.5" });
								$$renderer.push(`<!----></button></li>`);
							}
							$$renderer.push(`<!--]--></ul>`);
						} else $$renderer.push("<!--[-1-->");
						$$renderer.push(`<!--]--> <div class="mb-3 flex flex-wrap items-center gap-1.5"><span class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Quick add</span> <!--[-->`);
						const each_array_4 = ensure_array_like(COMMON_REFS);
						for (let $$index_4 = 0, $$length = each_array_4.length; $$index_4 < $$length; $$index_4++) {
							let preset = each_array_4[$$index_4];
							$$renderer.push(`<button type="button" class="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-fg-muted transition-colors hover:border-accent hover:text-accent"${attr("title", preset.notes)}>${escape_html(preset.name)}</button>`);
						}
						$$renderer.push(`<!--]--></div> <form class="rounded-md border border-dashed border-border-strong/50 bg-surface-2/40 p-3"><div class="mb-2 grid grid-cols-[1fr_1fr_auto] gap-2">`);
						Field($$renderer, {
							label: "Name",
							children: ($$renderer) => {
								Input($$renderer, {
									density: "sm",
									placeholder: "e.g., Inter, Söhne, Caslon 1722",
									get value() {
										return newRefName;
									},
									set value($$value) {
										newRefName = $$value;
										$$settled = false;
									}
								});
							},
							$$slots: { default: true }
						});
						$$renderer.push(`<!----> `);
						Field($$renderer, {
							label: "URL (optional)",
							children: ($$renderer) => {
								Input($$renderer, {
									density: "sm",
									placeholder: "https://…",
									type: "url",
									get value() {
										return newRefUrl;
									},
									set value($$value) {
										newRefUrl = $$value;
										$$settled = false;
									}
								});
							},
							$$slots: { default: true }
						});
						$$renderer.push(`<!----> `);
						Field($$renderer, {
							label: "Kind",
							children: ($$renderer) => {
								$$renderer.select({
									value: newRefKind,
									class: "h-8 rounded-md border border-border bg-surface px-2 text-[13px] outline-none focus:border-accent"
								}, ($$renderer) => {
									$$renderer.option({ value: "functional" }, ($$renderer) => {
										$$renderer.push(`Functional`);
									});
									$$renderer.option({ value: "historical" }, ($$renderer) => {
										$$renderer.push(`Historical`);
									});
									$$renderer.option({ value: "competitive" }, ($$renderer) => {
										$$renderer.push(`Competitive`);
									});
								});
							},
							$$slots: { default: true }
						});
						$$renderer.push(`<!----></div> `);
						Field($$renderer, {
							label: "Notes (optional)",
							children: ($$renderer) => {
								Input($$renderer, {
									density: "sm",
									placeholder: "What you're studying about it",
									get value() {
										return newRefNotes;
									},
									set value($$value) {
										newRefNotes = $$value;
										$$settled = false;
									}
								});
							},
							$$slots: { default: true }
						});
						$$renderer.push(`<!----> <div class="mt-2 flex justify-end">`);
						{
							function icon($$renderer) {
								Plus($$renderer, { class: "size-3.5" });
							}
							Button($$renderer, {
								type: "submit",
								density: "sm",
								disabled: !newRefName.trim(),
								icon,
								children: ($$renderer) => {
									$$renderer.push(`<!---->Add reference`);
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
