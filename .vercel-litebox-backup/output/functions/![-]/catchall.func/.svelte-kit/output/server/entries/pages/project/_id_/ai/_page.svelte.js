import { G as escape_html, U as attr, c as ensure_array_like, d as spread_props, o as derived } from "../../../../../chunks/dev.js";
import { t as Icon } from "../../../../../chunks/Icon.js";
import { t as projectStore } from "../../../../../chunks/project.svelte.js";
import { t as settings } from "../../../../../chunks/settings.svelte.js";
import { n as Code_xml, t as Key_round } from "../../../../../chunks/key-round.js";
import { t as Sparkles } from "../../../../../chunks/sparkles.js";
import { n as Loader_circle, t as Button } from "../../../../../chunks/Button.js";
import { t as Panel } from "../../../../../chunks/Panel.js";
import { t as Copy } from "../../../../../chunks/copy.js";
import { t as Type } from "../../../../../chunks/type.js";
import { t as LoadingPanel } from "../../../../../chunks/LoadingPanel.js";
import { t as Tag } from "../../../../../chunks/tag.js";
//#region src/lib/ai/anthropic.ts
/**
* Browser-side helper for calling our /api/ai/messages proxy.
* The proxy forwards to Anthropic with the user's own API key.
*/
var AnthropicError = class extends Error {
	status;
	constructor(message, status) {
		super(message);
		this.status = status;
		this.name = "AnthropicError";
	}
};
var askClaude = async (input) => {
	if (!settings.hasKey) throw new AnthropicError("No Anthropic API key configured. Add one in Settings.");
	const res = await fetch("/api/ai/messages", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			apiKey: settings.anthropicApiKey,
			model: settings.preferredModel,
			max_tokens: input.maxTokens ?? 1024,
			system: input.system,
			messages: input.messages
		})
	});
	if (!res.ok) {
		const body = await res.text();
		let message = body;
		try {
			const j = JSON.parse(body);
			message = j.error?.message ?? j.error ?? body;
		} catch {}
		throw new AnthropicError(`Claude error (${res.status}): ${message}`, res.status);
	}
	const raw = await res.json();
	return {
		text: raw.content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n"),
		raw
	};
};
/** Render the current glyph contours to a small PNG for visual audit. */
var glyphsToPng = (contoursList, metrics, size = 64) => {
	if (contoursList.length === 0) return "";
	const cellsPerRow = Math.min(8, contoursList.length);
	const rows = Math.ceil(contoursList.length / cellsPerRow);
	const W = cellsPerRow * size;
	const H = rows * size;
	const canvas = document.createElement("canvas");
	canvas.width = W;
	canvas.height = H;
	const ctx = canvas.getContext("2d");
	ctx.fillStyle = "#ffffff";
	ctx.fillRect(0, 0, W, H);
	ctx.fillStyle = "#000000";
	const fontHeight = metrics.ascender - metrics.descender;
	const scale = size * .85 / fontHeight;
	contoursList.forEach((g, idx) => {
		const col = idx % cellsPerRow;
		const row = Math.floor(idx / cellsPerRow);
		const x0 = col * size + size * .07;
		const y0 = row * size + size * .92;
		ctx.beginPath();
		for (const contour of g.contours) for (const cmd of contour.commands) if (cmd.type === "M" && cmd.x !== void 0 && cmd.y !== void 0) ctx.moveTo(x0 + cmd.x * scale, y0 - cmd.y * scale);
		else if (cmd.type === "L" && cmd.x !== void 0 && cmd.y !== void 0) ctx.lineTo(x0 + cmd.x * scale, y0 - cmd.y * scale);
		else if (cmd.type === "C" && cmd.x1 !== void 0 && cmd.y1 !== void 0 && cmd.x2 !== void 0 && cmd.y2 !== void 0 && cmd.x !== void 0 && cmd.y !== void 0) ctx.bezierCurveTo(x0 + cmd.x1 * scale, y0 - cmd.y1 * scale, x0 + cmd.x2 * scale, y0 - cmd.y2 * scale, x0 + cmd.x * scale, y0 - cmd.y * scale);
		else if (cmd.type === "Q" && cmd.x1 !== void 0 && cmd.y1 !== void 0 && cmd.x !== void 0 && cmd.y !== void 0) ctx.quadraticCurveTo(x0 + cmd.x1 * scale, y0 - cmd.y1 * scale, x0 + cmd.x * scale, y0 - cmd.y * scale);
		else if (cmd.type === "Z") ctx.closePath();
		ctx.fill("evenodd");
	});
	return canvas.toDataURL("image/png").split(",")[1];
};
//#endregion
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/scan-search.svelte
function Scan_search($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "scan-search" },
		props,
		{ iconNode: [
			["path", { "d": "M3 7V5a2 2 0 0 1 2-2h2" }],
			["path", { "d": "M17 3h2a2 2 0 0 1 2 2v2" }],
			["path", { "d": "M21 17v2a2 2 0 0 1-2 2h-2" }],
			["path", { "d": "M7 21H5a2 2 0 0 1-2-2v-2" }],
			["circle", {
				"cx": "12",
				"cy": "12",
				"r": "3"
			}],
			["path", { "d": "m16 16-1.9-1.9" }]
		] }
	]));
}
//#endregion
//#region src/routes/project/[id]/ai/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const project = derived(() => projectStore.project);
		let running = null;
		let lastTitle = null;
		let response = "";
		let error = null;
		let customPrompt = "";
		let vibe = "";
		let featureBrief = "Standard ligatures + tabular figures + small caps";
		const projectContext = () => {
			if (!project()) return "";
			const drawn = Object.values(project().glyphs).filter((g) => g.contours.length > 0);
			const drawnChars = drawn.map((g) => String.fromCodePoint(g.codepoint)).filter((s) => s.length === 1 && s.codePointAt(0) > 32);
			const b = project().brief ?? {};
			const briefLines = [];
			if (b.intent?.trim()) briefLines.push(`- Intent: ${b.intent.trim()}`);
			if (b.audience?.trim()) briefLines.push(`- Audience: ${b.audience.trim()}`);
			if (b.useCases?.length) briefLines.push(`- Use cases: ${b.useCases.join(", ")}`);
			if (b.readingConditions?.trim()) briefLines.push(`- Reading conditions: ${b.readingConditions.trim()}`);
			if (b.differentiation?.trim()) briefLines.push(`- Differentiation: ${b.differentiation.trim()}`);
			if (b.references?.length) briefLines.push(`- References studied: ${b.references.map((r) => `${r.kind ?? "ref"}: ${r.name}`).join("; ")}`);
			return [
				`Project: "${project().metadata.familyName}" / ${project().metadata.styleName}`,
				`Designer: ${project().metadata.designer || "unspecified"}`,
				`UPM: ${project().metrics.unitsPerEm}, cap height ${project().metrics.capHeight}, x-height ${project().metrics.xHeight}`,
				`Glyphs drawn: ${drawn.length} / ${Object.keys(project().glyphs).length}`,
				`Drawn characters: ${drawnChars.join(" ")}`,
				project().axes && project().axes.length > 0 ? `Variable axes: ${project().axes.map((a) => `${a.tag}(${a.minimum}..${a.maximum})`).join(", ")}` : "Single-master (static).",
				project().masters && project().masters.length > 0 ? `Additional masters: ${project().masters.map((m) => `${m.name} at ${JSON.stringify(m.location)}`).join("; ")}` : "",
				briefLines.length > 0 ? `Brief:\n${briefLines.join("\n")}` : ""
			].filter(Boolean).join("\n");
		};
		const presets = [
			{
				id: "names",
				label: "Brainstorm font names",
				icon: Tag,
				run: async () => {
					if (!project()) return null;
					return {
						system: `You are a senior type designer helping name a new typeface. Suggest names that feel intentional, ownable, and not generic. Avoid trademarked names. Return 10 candidates as a markdown numbered list with a one-line rationale each.`,
						text: `Project context:
${projectContext()}

Design vibe / brief: (designer left this blank — infer from project context)

Brainstorm 10 candidate names for this typeface.`
					};
				}
			},
			{
				id: "fea",
				label: "Draft .fea features",
				icon: Code_xml,
				run: async () => {
					if (!project()) return null;
					return {
						system: `You are a senior OpenType engineer. Generate clean, valid AFDKO .fea source code. Only use glyphs the user has actually drawn. Use proper feature blocks, lookups, classes where appropriate. Comment briefly. Wrap the .fea in a single fenced code block tagged "fea".`,
						text: `Project context:
${projectContext()}

Features requested: ${featureBrief}

Draft an .fea source for these features. Skip any feature that needs glyphs not in the drawn set; note what would be needed instead.`
					};
				}
			},
			{
				id: "audit",
				label: "Consistency audit (visual)",
				icon: Scan_search,
				run: async () => {
					if (!project()) return null;
					const drawn = Object.values(project().glyphs).filter((g) => g.contours.length > 0).slice(0, 20);
					if (drawn.length === 0) throw new AnthropicError("No drawn glyphs yet — draw a few and try again.");
					return { text: (await askClaude({
						system: `You are a senior type design critic. You are given a rendering of glyphs from a single typeface. Look for visual consistency issues: stem widths, terminal shapes, x-height alignment, joins, proportion, overshoots, optical compensation. Be specific (cite glyphs by name). Return a markdown list of observations grouped by severity ("Likely problem" vs "Worth a second look").`,
						messages: [{
							role: "user",
							content: [{
								type: "image",
								source: {
									type: "base64",
									media_type: "image/png",
									data: glyphsToPng(drawn.map((g) => ({
										codepoint: g.codepoint,
										name: g.name,
										contours: g.contours
									})), project().metrics, 72)
								}
							}, {
								type: "text",
								text: `Project: ${project().metadata.familyName}. ${drawn.length} drawn glyphs shown. Audit for consistency.`
							}]
						}],
						maxTokens: 1500
					})).text };
				}
			},
			{
				id: "critique",
				label: "Critique selected glyph",
				icon: Scan_search,
				run: async () => {
					if (!project()) return null;
					const glyph = project().glyphs[projectStore.selectedCodepoint];
					if (!glyph || glyph.contours.length === 0) throw new AnthropicError("Select a glyph with at least one contour, then retry.");
					const pngData = glyphsToPng([{
						codepoint: glyph.codepoint,
						name: glyph.name,
						contours: glyph.contours
					}], project().metrics, 200);
					const drawnPeers = Object.values(project().glyphs).filter((g) => g.codepoint !== glyph.codepoint && g.contours.length > 0).slice(0, 10).map((g) => g.name).join(", ");
					return { text: (await askClaude({
						system: `You are a senior type designer giving a craft-focused critique on a single glyph. Be specific and actionable. Cover: proportion (stem widths, bowl size, counter shape), overshoot, optical alignment, curve quality (handles, transitions), terminal shape, joins. Suggest two concrete changes the designer should consider next. Return concise markdown with sections.`,
						messages: [{
							role: "user",
							content: [{
								type: "image",
								source: {
									type: "base64",
									media_type: "image/png",
									data: pngData
								}
							}, {
								type: "text",
								text: `Glyph: "${glyph.name}" (U+${glyph.codepoint.toString(16).toUpperCase().padStart(4, "0")}) in "${project().metadata.familyName}". Sibling glyphs in this family: ${drawnPeers || "none yet"}. Cap height ${project().metrics.capHeight}, x-height ${project().metrics.xHeight}.`
							}]
						}],
						maxTokens: 1200
					})).text };
				}
			},
			{
				id: "design-notes",
				label: "Draft design-notes essay",
				icon: Tag,
				run: async () => {
					if (!project()) return null;
					const b = project().brief ?? {};
					const drawnCount = Object.values(project().glyphs).filter((g) => g.contours.length > 0).length;
					const useCaseLabels = (b.useCases ?? []).join(", ");
					const refs = (b.references ?? []).map((r) => `${r.kind ?? "ref"}: ${r.name}`).join("; ");
					return {
						system: `You are a senior type designer writing the editorial "design notes" essay that opens a foundry specimen. Tone: confident, plain, no marketing fluff. 180–260 words. Cover (1) the brief in one line, (2) the typographic decision you most want to defend, (3) one observation about a specific glyph or feature, (4) when to use the family. Return plain prose only, no markdown headings.`,
						text: `Family: ${project().metadata.familyName}
Style: ${project().metadata.styleName}
Glyphs drawn: ${drawnCount}
UPM: ${project().metrics.unitsPerEm}; cap ${project().metrics.capHeight}; x-height ${project().metrics.xHeight}

Brief:
- Intent: ${b.intent || "(not stated)"}
- Audience: ${b.audience || "(not stated)"}
- Use cases: ${useCaseLabels || "(not stated)"}
- Reading conditions: ${b.readingConditions || "(not stated)"}
- Differentiation: ${b.differentiation || "(not stated)"}
- References studied: ${refs || "(none listed)"}

Write the design-notes essay.`
					};
				}
			},
			{
				id: "teststring",
				label: "Generate test string",
				icon: Type,
				run: async () => {
					if (!project()) return null;
					const drawn = Object.values(project().glyphs).filter((g) => g.contours.length > 0).map((g) => String.fromCodePoint(g.codepoint)).filter((s) => s.length === 1).join("");
					if (drawn.length === 0) throw new AnthropicError("No drawn glyphs yet — draw a few and try again.");
					return {
						system: `You are a typography proofreader. Generate test text using ONLY the provided characters (case-sensitive, including spaces). Aim for varied combinations exposing stem-stem, stem-round, round-round, and bowl interactions. 8-12 lines of varied content: words, short phrases, partial pangrams. Output plain text only, no markdown.`,
						text: `Allowed characters (use only these, including space): ${drawn}\n\nGenerate proof text.`
					};
				}
			}
		];
		const runCustom = async () => {
			if (!customPrompt.trim()) {
				if (!settings.hasKey) error = "Set your Anthropic API key in Settings first.";
				return;
			}
			running = "custom";
			lastTitle = "Custom prompt";
			response = "";
			error = null;
			try {
				response = (await askClaude({
					system: `You are an expert type designer + font engineer helping the user with their project.\n${projectContext()}`,
					messages: [{
						role: "user",
						content: customPrompt
					}],
					maxTokens: 1500
				})).text;
			} catch (e) {
				error = e instanceof Error ? e.message : String(e);
			} finally {
				running = null;
			}
		};
		const copyResponse = async () => {
			if (!response) return;
			try {
				await navigator.clipboard.writeText(response);
			} catch {}
		};
		const saveToCurrentGlyphNotes = () => {
			if (!response || !project()) return;
			const g = project().glyphs[projectStore.selectedCodepoint];
			if (!g) return;
			const prefix = `[${lastTitle ?? "AI"}]`;
			const next = g.notes?.trim() ? `${g.notes.trim()}\n\n${prefix}\n${response}` : `${prefix}\n${response}`;
			projectStore.updateGlyph(g.codepoint, (gg) => ({
				...gg,
				notes: next
			}));
		};
		const saveToBriefDesignNotes = () => {
			if (!response) return;
			projectStore.updateBrief({ designNotes: response });
		};
		if (!project()) {
			$$renderer.push("<!--[0-->");
			LoadingPanel($$renderer, { label: "Loading AI presets" });
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<div class="h-full overflow-auto"><div class="mx-auto flex max-w-5xl flex-col gap-6 p-6"><header><h1 class="text-xl font-semibold tracking-tight">AI assistant</h1> <p class="text-sm text-fg-muted">Claude helps with naming, drafting <code>.fea</code> source, auditing consistency
					across drawn glyphs, and generating proof text scoped to your character set.</p></header> `);
			if (!settings.hasKey) {
				$$renderer.push("<!--[0-->");
				Panel($$renderer, {
					children: ($$renderer) => {
						$$renderer.push(`<div class="flex items-start gap-3">`);
						Key_round($$renderer, { class: "mt-0.5 size-5 text-warn" });
						$$renderer.push(`<!----> <div class="flex-1"><div class="text-sm font-medium text-fg">No API key configured</div> <p class="mt-1 text-[13px] text-fg-muted">Add an Anthropic API key in Settings (header → gear icon). Your key
								lives in this browser's localStorage and is only sent through our
								serverless proxy because Anthropic blocks direct browser calls.</p></div></div>`);
					},
					$$slots: { default: true }
				});
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			Panel($$renderer, {
				children: ($$renderer) => {
					$$renderer.push(`<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Prompt inputs</h2> <div class="grid gap-3 sm:grid-cols-2"><label class="grid gap-1.5"><span class="text-[11px] font-medium text-fg-muted">Design vibe (used by "Brainstorm font names")</span> <input${attr("value", vibe)} placeholder="e.g. editorial serif with sharp wedge terminals" class="h-10 rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"/></label> <label class="grid gap-1.5"><span class="text-[11px] font-medium text-fg-muted">Features brief (used by ".fea draft")</span> <input${attr("value", featureBrief)} placeholder="e.g. fractions + small caps + locl Polish" class="h-10 rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"/></label></div>`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			Panel($$renderer, {
				children: ($$renderer) => {
					$$renderer.push(`<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Presets</h2> <div class="grid grid-cols-2 gap-2"><!--[-->`);
					const each_array = ensure_array_like(presets);
					for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
						let preset = each_array[$$index];
						const Icon = preset.icon;
						$$renderer.push(`<button type="button"${attr("disabled", running !== null || !settings.hasKey, true)} class="group flex items-center gap-3 rounded-md border border-border bg-surface-2/40 px-3 py-3 text-left transition-colors hover:border-accent hover:bg-accent-soft/40 disabled:opacity-50">`);
						if (running === preset.id) {
							$$renderer.push("<!--[0-->");
							Loader_circle($$renderer, { class: "size-4 animate-spin text-accent" });
						} else {
							$$renderer.push("<!--[-1-->");
							if (Icon) {
								$$renderer.push("<!--[-->");
								Icon($$renderer, { class: "size-4 text-fg-muted group-hover:text-accent" });
								$$renderer.push("<!--]-->");
							} else {
								$$renderer.push("<!--[!-->");
								$$renderer.push("<!--]-->");
							}
						}
						$$renderer.push(`<!--]--> <span class="text-[13px] font-medium text-fg">${escape_html(preset.label)}</span></button>`);
					}
					$$renderer.push(`<!--]--></div>`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			Panel($$renderer, {
				children: ($$renderer) => {
					$$renderer.push(`<h2 class="mb-3 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">Custom prompt</h2> <textarea placeholder="Ask Claude anything about this project…" class="block h-24 w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft">`);
					const $$body = escape_html(customPrompt);
					if ($$body) $$renderer.push(`${$$body}`);
					$$renderer.push(`</textarea> <div class="mt-2 flex items-center justify-end">`);
					{
						function icon($$renderer) {
							Sparkles($$renderer, { class: "size-3.5" });
						}
						Button($$renderer, {
							density: "sm",
							onclick: runCustom,
							disabled: !customPrompt.trim(),
							loading: running === "custom",
							icon,
							children: ($$renderer) => {
								$$renderer.push(`<!---->Ask Claude`);
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
			if (error) {
				$$renderer.push("<!--[0-->");
				Panel($$renderer, {
					children: ($$renderer) => {
						$$renderer.push(`<div class="rounded-md bg-danger/10 px-3 py-2 text-[13px] text-danger">${escape_html(error)}</div>`);
					},
					$$slots: { default: true }
				});
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (response) {
				$$renderer.push("<!--[0-->");
				Panel($$renderer, {
					children: ($$renderer) => {
						$$renderer.push(`<div class="mb-3 flex items-center justify-between gap-2"><h2 class="inline-flex items-center gap-2 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">`);
						Sparkles($$renderer, { class: "size-3" });
						$$renderer.push(`<!----> ${escape_html(lastTitle ?? "Response")}</h2> <div class="flex items-center gap-1">`);
						if (lastTitle === "Draft design-notes essay") {
							$$renderer.push("<!--[0-->");
							{
								function icon($$renderer) {
									Copy($$renderer, { class: "size-3.5" });
								}
								Button($$renderer, {
									density: "sm",
									variant: "ghost",
									onclick: saveToBriefDesignNotes,
									icon,
									children: ($$renderer) => {
										$$renderer.push(`<!---->Save to Brief design notes`);
									},
									$$slots: {
										icon: true,
										default: true
									}
								});
							}
						} else $$renderer.push("<!--[-1-->");
						$$renderer.push(`<!--]--> `);
						{
							function icon($$renderer) {
								Copy($$renderer, { class: "size-3.5" });
							}
							Button($$renderer, {
								density: "sm",
								variant: "ghost",
								onclick: saveToCurrentGlyphNotes,
								icon,
								children: ($$renderer) => {
									$$renderer.push(`<!---->Save to glyph notes`);
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
								Copy($$renderer, { class: "size-3.5" });
							}
							Button($$renderer, {
								density: "sm",
								variant: "ghost",
								onclick: copyResponse,
								icon,
								children: ($$renderer) => {
									$$renderer.push(`<!---->Copy`);
								},
								$$slots: {
									icon: true,
									default: true
								}
							});
						}
						$$renderer.push(`<!----></div></div> <pre class="whitespace-pre-wrap break-words rounded-md bg-surface-2/40 p-4 text-[13px] leading-[1.55] text-fg">${escape_html(response)}</pre>`);
					},
					$$slots: { default: true }
				});
			} else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div></div>`);
		}
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
export { _page as default };
