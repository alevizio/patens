import "./index-server.js";
import { G as escape_html, f as stringify, n as attr_class, o as derived, r as attr_style } from "./dev.js";
//#region src/lib/ui/LoadingPanel.svelte
function LoadingPanel($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		/** What's loading (e.g. "glyph", "specimen"). Used in the primary line. */
		/** What's loading (e.g. "glyph", "specimen"). Used in the primary line. */
		/** Rotating sub-messages — set this for slow ops (Python boot, family build). */
		/** How long each rotating sub-message is shown, ms. */
		/** Fill the parent height. */
		let { label = "Loading", messages, rotateMs = 1800, fill = true } = $$props;
		const TYPE_STYLES = [
			{
				name: "Sans",
				font: "ui-sans-serif, system-ui, sans-serif",
				weight: 400,
				style: "normal"
			},
			{
				name: "Serif",
				font: "ui-serif, Georgia, \"Times New Roman\", serif",
				weight: 400,
				style: "normal"
			},
			{
				name: "Mono",
				font: "ui-monospace, Menlo, \"Courier New\", monospace",
				weight: 400,
				style: "normal"
			},
			{
				name: "Italic",
				font: "ui-serif, Georgia, serif",
				weight: 400,
				style: "italic"
			},
			{
				name: "Bold",
				font: "ui-sans-serif, system-ui, sans-serif",
				weight: 800,
				style: "normal"
			},
			{
				name: "Light",
				font: "ui-sans-serif, system-ui, sans-serif",
				weight: 200,
				style: "normal"
			},
			{
				name: "Black",
				font: "ui-sans-serif, system-ui, sans-serif",
				weight: 900,
				style: "normal"
			},
			{
				name: "Display",
				font: "\"Times New Roman\", \"Hoefler Text\", serif",
				weight: 900,
				style: "normal"
			},
			{
				name: "Oblique",
				font: "ui-sans-serif, system-ui, sans-serif",
				weight: 600,
				style: "italic"
			}
		];
		let styleIdx = 0;
		let messageIdx = 0;
		const currentStyle = derived(() => TYPE_STYLES[styleIdx]);
		const currentMessage = derived(() => messages?.[messageIdx]);
		const loadingWord = derived(() => label.toLowerCase().replace(/[…\.]+$/, ""));
		$$renderer.push(`<div${attr_class(`flex ${stringify(fill ? "h-full" : "")} flex-col items-center justify-center gap-3 text-fg-muted`, "svelte-1w5yjno")} role="status" aria-live="polite" aria-busy="true"><div class="text-3xl leading-none tracking-tight text-fg motion-reduce:[animation:none]"${attr_style(`font-family: ${stringify(currentStyle().font)}; font-weight: ${stringify(currentStyle().weight)}; font-style: ${stringify(currentStyle().style)};`)} aria-hidden="true">${escape_html(loadingWord())}</div> <div class="flex flex-col items-center gap-0.5 text-center"><div class="font-mono text-[10px] tracking-wider text-fg-subtle uppercase tabular-nums" data-numeric="" aria-hidden="true">${escape_html(currentStyle().name)}</div> `);
		if (currentMessage()) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="mt-1 text-[11px] text-fg-subtle">${escape_html(currentMessage())}</div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></div> <span class="sr-only">${escape_html(label)}</span></div>`);
	});
}
//#endregion
export { LoadingPanel as t };
