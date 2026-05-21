import { G as escape_html, U as attr, c as ensure_array_like, f as stringify, n as attr_class, o as derived, r as attr_style } from "../../../../../chunks/dev.js";
import "../../../../../chunks/toast2.svelte.js";
import { n as Circle_check, t as Circle_alert } from "../../../../../chunks/circle-alert.js";
import { n as Triangle_alert, t as Info } from "../../../../../chunks/info.js";
import { t as goto } from "../../../../../chunks/client.js";
import "../../../../../chunks/navigation.js";
import { t as projectStore } from "../../../../../chunks/project.svelte.js";
import { t as GlyphTile } from "../../../../../chunks/GlyphTile.js";
import { n as Input, t as Field } from "../../../../../chunks/Field.js";
import { t as Plus } from "../../../../../chunks/plus.js";
import { t as Rocket } from "../../../../../chunks/rocket.js";
import { i as preflightProject, r as auditProject, t as auditCompatibility } from "../../../../../chunks/audit.js";
import { t as Button } from "../../../../../chunks/Button.js";
import { t as Panel } from "../../../../../chunks/Panel.js";
import { t as Trash_2 } from "../../../../../chunks/trash-2.js";
import { t as LoadingPanel } from "../../../../../chunks/LoadingPanel.js";
//#region src/routes/project/[id]/release/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const project = derived(() => projectStore.project);
		const checks = derived(() => project()?.releaseChecks ?? {});
		const preflight = derived(() => project() ? preflightProject(project()) : []);
		const compatibility = derived(() => project() ? auditCompatibility(project()) : []);
		const perGlyph = derived(() => project() ? auditProject(project()) : []);
		const errors = derived(() => [
			...preflight(),
			...compatibility(),
			...perGlyph()
		].filter((i) => i.severity === "error").length);
		const warnings = derived(() => [
			...preflight(),
			...compatibility(),
			...perGlyph()
		].filter((i) => i.severity === "warn").length);
		const infos = derived(() => [
			...preflight(),
			...compatibility(),
			...perGlyph()
		].filter((i) => i.severity === "info").length);
		const drawn = derived(() => project() ? Object.values(project().glyphs).filter((g) => g.contours.length > 0).length : 0);
		const GROUPS = [
			{
				title: "Rendering matrix",
				items: [
					{
						id: "render-win-blink",
						label: "Windows · Edge or Chrome",
						hint: "Small UI text, hinting, clipping, style linking, numerals (DirectWrite + ClearType)"
					},
					{
						id: "render-win-firefox",
						label: "Windows · Firefox",
						hint: "GSUB/GPOS behavior, fallback, second engine on the same OS"
					},
					{
						id: "render-mac-safari",
						label: "macOS · Safari",
						hint: "Text sizes, optical sizes, menu naming, line spacing (Core Text + WebKit)"
					},
					{
						id: "render-mac-blink",
						label: "macOS · Chrome or Firefox",
						hint: "Webfont loading, CSS feature access, paragraph color (Blink/Gecko on Apple stack)"
					},
					{
						id: "render-linux-android",
						label: "Linux or Android sanity pass",
						hint: "Shaping-sensitive strings, WOFF2 loading, fallback (FreeType + HarfBuzz)"
					}
				]
			},
			{
				title: "Application proofing",
				items: [
					{
						id: "app-figma",
						label: "Figma — UI labels + paragraphs"
					},
					{
						id: "app-office",
						label: "MS Word / Google Docs — body text"
					},
					{
						id: "app-indesign",
						label: "Adobe InDesign — print proof"
					},
					{
						id: "app-terminal",
						label: "Terminal / code editor (if mono)"
					}
				]
			},
			{
				title: "Linguistic + script",
				items: [
					{
						id: "lang-latin-ext",
						label: "Latin Extended diacritics (á à ä â ã å …)"
					},
					{
						id: "lang-vietnamese",
						label: "Vietnamese stacked diacritics"
					},
					{
						id: "lang-greek-cyrillic",
						label: "Greek / Cyrillic (if shipping)"
					},
					{
						id: "lang-numerals-currency",
						label: "Numerals + currency symbols"
					},
					{
						id: "lang-punct-quotes",
						label: "Quote marks (curly + straight) + dashes"
					}
				]
			},
			{
				title: "Features + variations",
				items: [
					{
						id: "feat-kern",
						label: "Kerning visibly works in real software"
					},
					{
						id: "feat-liga",
						label: "Standard ligatures (fi, fl, ffi) activate"
					},
					{
						id: "feat-tnum",
						label: "Tabular figures align in data tables"
					},
					{
						id: "feat-vf-axes",
						label: "VF axes scrub smoothly across extremes"
					},
					{
						id: "feat-vf-instances",
						label: "Named instances show in OS font menu"
					}
				]
			},
			{
				title: "Metrics + naming",
				items: [
					{
						id: "meta-line-height",
						label: "Line spacing matches across Windows/macOS"
					},
					{
						id: "meta-no-clipping",
						label: "No descender/ascender clipping in any test"
					},
					{
						id: "meta-style-linking",
						label: "Regular/Bold/Italic style linking correct"
					},
					{
						id: "meta-family-naming",
						label: "Family name unique + matches license requirements"
					}
				]
			},
			{
				title: "Packaging + release",
				items: [
					{
						id: "pkg-specimen",
						label: "Specimen PDF exported and reviewed"
					},
					{
						id: "pkg-css-snippet",
						label: "CSS snippet copied + tested on a real page"
					},
					{
						id: "pkg-license-set",
						label: "License text + copyright filled in"
					},
					{
						id: "pkg-version",
						label: "Version number set in metadata"
					},
					{
						id: "pkg-changelog",
						label: "Release notes written for this version"
					}
				]
			}
		];
		const totalChecks = derived(() => GROUPS.reduce((n, g) => n + g.items.length, 0));
		const passedChecks = derived(() => GROUPS.reduce((n, g) => n + g.items.filter((it) => checks()[it.id]).length, 0));
		const manualPct = derived(() => totalChecks() > 0 ? Math.round(passedChecks() / totalChecks() * 100) : 0);
		const autoPasses = derived(() => errors() === 0 && drawn() >= 26);
		const readyToShip = derived(() => autoPasses() && manualPct() === 100);
		const gfChecks = derived(() => {
			if (!project()) return [];
			const md = project().metadata;
			const drawnGlyphs = Object.values(project().glyphs).filter((g) => g.contours.length > 0 || (g.components?.length ?? 0) > 0);
			const hasFullBasicLatin = (() => {
				const required = [32];
				for (let cp = 48; cp <= 57; cp++) required.push(cp);
				for (let cp = 65; cp <= 90; cp++) required.push(cp);
				for (let cp = 97; cp <= 122; cp++) required.push(cp);
				const drawnCps = new Set(drawnGlyphs.map((g) => g.codepoint));
				return required.every((cp) => drawnCps.has(cp));
			})();
			return [
				{
					label: "License is SIL OFL 1.1",
					ok: /SIL Open Font License|OFL\s*1\.1/i.test(md.license ?? ""),
					hint: "Google Fonts requires OFL 1.1 for the library."
				},
				{
					label: "fsType is Installable (0)",
					ok: (md.fsType ?? 0) === 0,
					hint: "Libre fonts must allow installable embedding (OS/2.fsType=0)."
				},
				{
					label: "Copyright filled in",
					ok: !!md.copyright?.trim(),
					hint: "Copyright string is required in the name table."
				},
				{
					label: "Version >= 1.000",
					ok: parseFloat(md.version ?? "0") >= 1,
					hint: "GF expects production-grade releases."
				},
				{
					label: "Designer attribution",
					ok: !!md.designer?.trim(),
					hint: "Name table needs a designer / manufacturer."
				},
				{
					label: "Full Basic Latin (A–Z, a–z, 0–9, space)",
					ok: hasFullBasicLatin,
					hint: "Minimum viable Latin coverage for the library."
				},
				{
					label: "No audit errors",
					ok: errors() === 0,
					hint: "Pre-flight + structural checks must pass."
				}
			];
		});
		const gfPassed = derived(() => gfChecks().filter((c) => c.ok).length);
		const gfReady = derived(() => gfChecks().length > 0 && gfPassed() === gfChecks().length);
		let newChangelogVersion = "";
		let newChangelogNotes = "";
		const formatDate = (iso) => new Date(iso).toLocaleDateString(void 0, {
			year: "numeric",
			month: "short",
			day: "numeric"
		});
		const lastSeal = derived(() => project()?.changelog?.[0]);
		const changedSinceLastSeal = derived(() => {
			if (!project() || !lastSeal()) return [];
			const sealTime = Date.parse(lastSeal().date);
			if (!Number.isFinite(sealTime)) return [];
			return Object.values(project().glyphs).filter((g) => {
				const t = Date.parse(g.updatedAt);
				return Number.isFinite(t) && t > sealTime;
			}).sort((a, b) => a.updatedAt < b.updatedAt ? 1 : -1);
		});
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (!project()) {
				$$renderer.push("<!--[0-->");
				LoadingPanel($$renderer, { label: "Loading release readiness" });
			} else {
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`<div class="h-full overflow-auto"><div class="mx-auto flex max-w-5xl flex-col gap-6 p-6"><header class="flex items-start gap-3"><div class="mt-1 flex size-9 items-center justify-center rounded-md bg-accent-soft text-accent">`);
				Rocket($$renderer, { class: "size-4" });
				$$renderer.push(`<!----></div> <div><h1 class="text-xl font-semibold tracking-tight">Release readiness</h1> <p class="text-sm text-fg-muted">Cross-platform rendering and proofing checks. The most common reason fonts
						fail in production is testing too late or too narrowly — these are the
						things to do <em>before</em> release, not after.</p></div></header> `);
				Panel($$renderer, {
					children: ($$renderer) => {
						$$renderer.push(`<div class="grid grid-cols-2 gap-4 md:grid-cols-4"><div><div class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Auto-checks</div> <div class="mt-1 flex items-baseline gap-2">`);
						if (autoPasses()) {
							$$renderer.push("<!--[0-->");
							Circle_check($$renderer, { class: "size-5 text-success" });
							$$renderer.push(`<!----> <span class="text-[14px] font-medium text-success">Passing</span>`);
						} else if (errors() > 0) {
							$$renderer.push("<!--[1-->");
							Circle_alert($$renderer, { class: "size-5 text-danger" });
							$$renderer.push(`<!----> <span class="text-[14px] font-medium text-danger">${escape_html(errors())} errors</span>`);
						} else {
							$$renderer.push("<!--[-1-->");
							Triangle_alert($$renderer, { class: "size-5 text-warn" });
							$$renderer.push(`<!----> <span class="text-[14px] font-medium text-warn">Coverage low</span>`);
						}
						$$renderer.push(`<!--]--></div></div> <div><div class="flex items-baseline justify-between gap-2"><div class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Manual checks</div> `);
						if (passedChecks() > 0) {
							$$renderer.push("<!--[0-->");
							$$renderer.push(`<button type="button" class="text-[10px] text-fg-subtle hover:text-warn">Reset all</button>`);
						} else $$renderer.push("<!--[-1-->");
						$$renderer.push(`<!--]--></div> <div class="mt-1 flex items-baseline gap-2"><span class="text-[14px] font-medium text-fg" data-numeric="">${escape_html(passedChecks())}/${escape_html(totalChecks())}</span> <span class="text-[12px] text-fg-subtle" data-numeric="">${escape_html(manualPct())}%</span></div> <div class="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-2"><div class="h-full bg-accent transition-all duration-500"${attr_style(`width: ${stringify(manualPct())}%;`)}></div></div></div> <div><div class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Glyphs drawn</div> <div class="mt-1 text-[14px] font-medium text-fg" data-numeric="">${escape_html(drawn())}</div> <div class="text-[11px] text-fg-subtle">≥26 recommended</div></div> <div><div class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Ready?</div> <div class="mt-1 flex items-baseline gap-2">`);
						if (readyToShip()) {
							$$renderer.push("<!--[0-->");
							Circle_check($$renderer, { class: "size-5 text-success" });
							$$renderer.push(`<!----> <span class="text-[14px] font-medium text-success">Ship it</span>`);
						} else {
							$$renderer.push("<!--[-1-->");
							Info($$renderer, { class: "size-5 text-fg-subtle" });
							$$renderer.push(`<!----> <span class="text-[14px] font-medium text-fg-muted">Not yet</span>`);
						}
						$$renderer.push(`<!--]--></div></div></div>`);
					},
					$$slots: { default: true }
				});
				$$renderer.push(`<!----> `);
				if (errors() > 0 || warnings() > 0 || infos() > 0) {
					$$renderer.push("<!--[0-->");
					Panel($$renderer, {
						children: ($$renderer) => {
							$$renderer.push(`<div class="mb-3 flex items-center justify-between"><h2 class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Pre-flight summary</h2> `);
							Button($$renderer, {
								density: "sm",
								variant: "ghost",
								onclick: () => goto(`/project/${project().id}/export`),
								children: ($$renderer) => {
									$$renderer.push(`<!---->View on Export →`);
								},
								$$slots: { default: true }
							});
							$$renderer.push(`<!----></div> <div class="flex flex-wrap gap-1.5">`);
							if (errors() > 0) {
								$$renderer.push("<!--[0-->");
								$$renderer.push(`<span class="inline-flex items-center gap-1 rounded-md bg-danger/10 px-2 py-1 text-[11px] font-medium text-danger">`);
								Circle_alert($$renderer, { class: "size-3" });
								$$renderer.push(`<!----> ${escape_html(errors())} error${escape_html(errors() === 1 ? "" : "s")}</span>`);
							} else $$renderer.push("<!--[-1-->");
							$$renderer.push(`<!--]--> `);
							if (warnings() > 0) {
								$$renderer.push("<!--[0-->");
								$$renderer.push(`<span class="inline-flex items-center gap-1 rounded-md bg-warn/10 px-2 py-1 text-[11px] font-medium text-warn">`);
								Triangle_alert($$renderer, { class: "size-3" });
								$$renderer.push(`<!----> ${escape_html(warnings())} warning${escape_html(warnings() === 1 ? "" : "s")}</span>`);
							} else $$renderer.push("<!--[-1-->");
							$$renderer.push(`<!--]--> `);
							if (infos() > 0) {
								$$renderer.push("<!--[0-->");
								$$renderer.push(`<span class="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-1 text-[11px] font-medium text-accent">`);
								Info($$renderer, { class: "size-3" });
								$$renderer.push(`<!----> ${escape_html(infos())} hint${escape_html(infos() === 1 ? "" : "s")}</span>`);
							} else $$renderer.push("<!--[-1-->");
							$$renderer.push(`<!--]--></div>`);
						},
						$$slots: { default: true }
					});
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--> <!--[-->`);
				const each_array = ensure_array_like(GROUPS);
				for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
					let group = each_array[$$index_1];
					Panel($$renderer, {
						children: ($$renderer) => {
							const passedInGroup = group.items.filter((it) => checks()[it.id]).length;
							$$renderer.push(`<h2 class="mb-3 flex items-center justify-between text-[10px] font-semibold tracking-wider text-fg-subtle uppercase"><span>${escape_html(group.title)}</span> <span class="font-mono normal-case text-fg-subtle/60" data-numeric="">${escape_html(passedInGroup)}/${escape_html(group.items.length)}</span></h2> <ul class="grid gap-1"><!--[-->`);
							const each_array_1 = ensure_array_like(group.items);
							for (let $$index = 0, $$length = each_array_1.length; $$index < $$length; $$index++) {
								let it = each_array_1[$$index];
								const done = !!checks()[it.id];
								$$renderer.push(`<li><button type="button"${attr_class(`flex w-full items-start gap-3 rounded-md border px-3 py-2 text-left transition-colors ${stringify(done ? "border-success/30 bg-success/5" : "border-border bg-surface-2/40 hover:border-border-strong")}`)}><span${attr_class(`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded ${stringify(done ? "bg-success text-canvas" : "border border-border bg-surface")}`)}>`);
								if (done) {
									$$renderer.push("<!--[0-->");
									Circle_check($$renderer, { class: "size-3" });
								} else $$renderer.push("<!--[-1-->");
								$$renderer.push(`<!--]--></span> <span class="flex-1"><span${attr_class(`block text-[12px] font-medium ${stringify(done ? "text-fg" : "text-fg")}`)}>${escape_html(it.label)}</span> `);
								if (it.hint) {
									$$renderer.push("<!--[0-->");
									$$renderer.push(`<span class="block text-[11px] text-fg-subtle">${escape_html(it.hint)}</span>`);
								} else $$renderer.push("<!--[-1-->");
								$$renderer.push(`<!--]--></span></button></li>`);
							}
							$$renderer.push(`<!--]--></ul>`);
						},
						$$slots: { default: true }
					});
				}
				$$renderer.push(`<!--]--> `);
				if (lastSeal() && changedSinceLastSeal().length > 0) {
					$$renderer.push("<!--[0-->");
					Panel($$renderer, {
						children: ($$renderer) => {
							$$renderer.push(`<div class="mb-2 flex items-baseline justify-between gap-2"><h2 class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Changed since v${escape_html(lastSeal().version)}</h2> <span class="font-mono text-[11px] text-fg-muted" data-numeric="">${escape_html(changedSinceLastSeal().length)} glyph${escape_html(changedSinceLastSeal().length === 1 ? "" : "s")} · sealed ${escape_html(formatDate(lastSeal().date))}</span></div> <p class="mb-3 text-[12px] text-fg-subtle">These glyphs have been edited since the last sealed version. Use this list
						to seed the next changelog entry.</p> <div class="flex flex-wrap gap-1"><!--[-->`);
							const each_array_2 = ensure_array_like(changedSinceLastSeal().slice(0, 60));
							for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
								let g = each_array_2[$$index_2];
								$$renderer.push(`<a${attr("href", `/project/${stringify(project().id)}/edit`)} class="block"${attr("title", `${stringify(g.name)} · U+${stringify(g.codepoint.toString(16).toUpperCase().padStart(4, "0"))} · edited ${stringify(formatDate(g.updatedAt))}`)}>`);
								GlyphTile($$renderer, {
									glyph: g,
									size: 36,
									showLabel: false,
									ascender: project().metrics.ascender,
									descender: project().metrics.descender
								});
								$$renderer.push(`<!----></a>`);
							}
							$$renderer.push(`<!--]--> `);
							if (changedSinceLastSeal().length > 60) {
								$$renderer.push("<!--[0-->");
								$$renderer.push(`<span class="self-center rounded bg-surface-2/40 px-2 py-1 text-[11px] text-fg-subtle" data-numeric="">+${escape_html(changedSinceLastSeal().length - 60)} more</span>`);
							} else $$renderer.push("<!--[-1-->");
							$$renderer.push(`<!--]--></div>`);
						},
						$$slots: { default: true }
					});
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--> `);
				Panel($$renderer, {
					children: ($$renderer) => {
						$$renderer.push(`<div class="mb-2 flex items-baseline justify-between gap-2"><h2 class="text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Google Fonts onboarding</h2> <span${attr_class(`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${stringify(gfReady() ? "bg-success/15 text-success" : "bg-fg-subtle/10 text-fg-subtle")}`)} data-numeric="">${escape_html(gfPassed())}/${escape_html(gfChecks().length)}</span></div> <p class="mb-3 text-[12px] text-fg-subtle">Approximate readiness for Google Fonts' onboarding (their <code>check-googlefonts</code> profile is the source of truth — run <code>fontbakery</code> locally before submitting).</p> <ul class="grid gap-1.5"><!--[-->`);
						const each_array_3 = ensure_array_like(gfChecks());
						for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
							let c = each_array_3[$$index_3];
							$$renderer.push(`<li class="flex items-start gap-2 rounded-md border border-border bg-surface-2/40 px-3 py-2">`);
							if (c.ok) {
								$$renderer.push("<!--[0-->");
								Circle_check($$renderer, { class: "mt-0.5 size-3.5 shrink-0 text-success" });
							} else {
								$$renderer.push("<!--[-1-->");
								Circle_alert($$renderer, { class: "mt-0.5 size-3.5 shrink-0 text-warn" });
							}
							$$renderer.push(`<!--]--> <div class="min-w-0 flex-1"><div class="text-[12px] text-fg">${escape_html(c.label)}</div> <div class="mt-0.5 text-[11px] text-fg-subtle">${escape_html(c.hint)}</div></div></li>`);
						}
						$$renderer.push(`<!--]--></ul>`);
					},
					$$slots: { default: true }
				});
				$$renderer.push(`<!----> `);
				Panel($$renderer, {
					children: ($$renderer) => {
						$$renderer.push(`<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Changelog (${escape_html(project().changelog?.length ?? 0)})</h2> <p class="mb-3 text-[12px] text-fg-subtle">Versioned release notes. Add one per shipped version — what changed, what
					was fixed, what's still open. Appears in the Specimen colophon.</p> `);
						if (project().changelog && project().changelog.length > 0) {
							$$renderer.push("<!--[0-->");
							$$renderer.push(`<ul class="mb-4 grid gap-2"><!--[-->`);
							const each_array_4 = ensure_array_like(project().changelog);
							for (let $$index_4 = 0, $$length = each_array_4.length; $$index_4 < $$length; $$index_4++) {
								let e = each_array_4[$$index_4];
								$$renderer.push(`<li class="grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-2"><span class="rounded bg-accent/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-accent" data-numeric="">v${escape_html(e.version)}</span> <div class="min-w-0"><div class="text-[11px] text-fg-subtle" data-numeric="">${escape_html(formatDate(e.date))}</div> <div class="mt-0.5 whitespace-pre-wrap text-[12px] text-fg">${escape_html(e.notes)}</div></div> <button type="button" class="rounded p-1 text-fg-subtle hover:bg-danger/10 hover:text-danger"${attr("aria-label", `Remove changelog entry v${stringify(e.version)}`)}${attr("title", `Remove v${stringify(e.version)}`)}>`);
								Trash_2($$renderer, { class: "size-3.5" });
								$$renderer.push(`<!----></button></li>`);
							}
							$$renderer.push(`<!--]--></ul>`);
						} else $$renderer.push("<!--[-1-->");
						$$renderer.push(`<!--]--> <form class="rounded-md border border-dashed border-border-strong/50 bg-surface-2/40 p-3"><div class="grid grid-cols-[100px_1fr] gap-2">`);
						Field($$renderer, {
							label: "Version",
							children: ($$renderer) => {
								Input($$renderer, {
									density: "sm",
									placeholder: "1.000",
									get value() {
										return newChangelogVersion;
									},
									set value($$value) {
										newChangelogVersion = $$value;
										$$settled = false;
									}
								});
							},
							$$slots: { default: true }
						});
						$$renderer.push(`<!----> `);
						Field($$renderer, {
							label: "Notes",
							children: ($$renderer) => {
								$$renderer.push(`<textarea${attr("placeholder", `- Added X\n- Fixed Y kerning\n- Bumped UPM`)} rows="3" class="block w-full resize-y rounded-md border border-border bg-surface px-2.5 py-2 text-[13px] text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft">`);
								const $$body = escape_html(newChangelogNotes);
								if ($$body) $$renderer.push(`${$$body}`);
								$$renderer.push(`</textarea>`);
							},
							$$slots: { default: true }
						});
						$$renderer.push(`<!----></div> <div class="mt-2 flex justify-end">`);
						{
							function icon($$renderer) {
								Plus($$renderer, { class: "size-3.5" });
							}
							Button($$renderer, {
								type: "submit",
								density: "sm",
								disabled: !newChangelogNotes.trim(),
								icon,
								children: ($$renderer) => {
									$$renderer.push(`<!---->Log this version`);
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
						$$renderer.push(`<div class="flex items-center justify-between gap-3"><div><div class="text-[13px] font-medium text-fg">Ready to ship?</div> <div class="text-[12px] text-fg-subtle">${escape_html(readyToShip() ? "All gates green. Head to Export and ship the binaries." : `${totalChecks() - passedChecks()} manual check${totalChecks() - passedChecks() === 1 ? "" : "s"} still open${errors() > 0 ? `, ${errors()} pre-flight error${errors() === 1 ? "" : "s"} to fix` : ""}.`)}</div></div> <div class="flex items-center gap-2">`);
						if (readyToShip()) {
							$$renderer.push("<!--[0-->");
							$$renderer.push(`<button type="button" class="inline-flex items-center gap-1.5 rounded-md border border-warn bg-warn/15 px-3 py-1.5 text-[12px] font-medium text-warn hover:bg-warn/25">Seal v${escape_html(project().metadata.version)}</button>`);
						} else $$renderer.push("<!--[-1-->");
						$$renderer.push(`<!--]--> `);
						{
							function icon($$renderer) {
								Rocket($$renderer, { class: "size-4" });
							}
							Button($$renderer, {
								onclick: () => goto(`/project/${project().id}/export`),
								disabled: !readyToShip(),
								icon,
								children: ($$renderer) => {
									$$renderer.push(`<!---->Go to Export`);
								},
								$$slots: {
									icon: true,
									default: true
								}
							});
						}
						$$renderer.push(`<!----></div></div>`);
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
