import { G as escape_html, U as attr, d as spread_props, f as stringify, n as attr_class, o as derived, r as attr_style } from "./dev.js";
import { t as Icon } from "./Icon.js";
import { n as glyphBounds, t as contoursToSvgPath } from "./path.js";
import { t as Pin } from "./pin.js";
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/sticky-note.svelte
function Sticky_note($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "sticky-note" },
		props,
		{ iconNode: [["path", { "d": "M21 9a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z" }], ["path", { "d": "M15 3v5a1 1 0 0 0 1 1h5" }]] }
	]));
}
//#endregion
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/link-2.svelte
function Link_2($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "link-2" },
		props,
		{ iconNode: [
			["path", { "d": "M9 17H7A5 5 0 0 1 7 7h2" }],
			["path", { "d": "M15 7h2a5 5 0 1 1 0 10h-2" }],
			["line", {
				"x1": "8",
				"x2": "16",
				"y1": "12",
				"y2": "12"
			}]
		] }
	]));
}
//#endregion
//#region src/lib/glyph/GlyphTile.svelte
function GlyphTile($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { glyph, selected = false, size = 56, showLabel = true, ascender = 800, descender = -200, incompatible = false, onclick, oncontextmenu } = $$props;
		const char = derived(() => glyph.codepoint > 0 && glyph.codepoint < 65536 && glyph.codepoint > 32 ? String.fromCodePoint(glyph.codepoint) : glyph.codepoint === 32 ? "␣" : "");
		const statusColor = derived(() => ({
			empty: "bg-fg-subtle/30",
			sketch: "bg-warn",
			draft: "bg-accent",
			final: "bg-success"
		})[glyph.status]);
		const fontSpan = derived(() => ascender - descender);
		const svgPath = derived(() => {
			if (glyph.contours.length === 0) return "";
			return contoursToSvgPath(glyph.contours);
		});
		const dimsLabel = derived(() => {
			if (glyph.contours.length === 0) return "";
			const b = glyphBounds(glyph.contours);
			return ` · ${Math.round(b.maxX - b.minX)}×${Math.round(b.maxY - b.minY)}`;
		});
		const viewBox = derived(() => {
			const totalHeight = fontSpan();
			const width = Math.max(glyph.advanceWidth, 100);
			return `0 ${-ascender} ${width} ${totalHeight}`;
		});
		const componentCount = derived(() => glyph.components?.length ?? 0);
		const noteSnippet = derived(() => {
			const n = glyph.notes?.trim();
			if (!n) return "";
			const first = n.split("\n")[0] ?? "";
			return first.length > 60 ? ` · "${first.slice(0, 57)}…"` : ` · "${first}"`;
		});
		$$renderer.push(`<button type="button"${attr("aria-pressed", selected)}${attr_class(`group relative flex flex-col items-center gap-1 rounded-md border p-1.5 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${stringify(selected ? "border-accent bg-accent-soft" : "border-transparent bg-transparent hover:border-border hover:bg-surface-2/60")}`)}${attr("title", `${stringify(glyph.name)} · U+${stringify(glyph.codepoint.toString(16).toUpperCase().padStart(4, "0"))}${stringify(dimsLabel())} · adv ${stringify(glyph.advanceWidth)}${stringify(componentCount() > 0 ? ` · ${componentCount()} component${componentCount() === 1 ? "" : "s"}` : "")}${stringify(noteSnippet())}`)}${attr_style(`width: ${stringify(size + 12)}px;`)}><div class="relative flex items-center justify-center overflow-hidden rounded bg-canvas"${attr_style(`width: ${stringify(size)}px; height: ${stringify(size)}px;`)}>`);
		if (svgPath()) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<svg${attr("viewBox", viewBox())}${attr("width", size)}${attr("height", size)} preserveAspectRatio="xMidYMid meet" style="transform: scaleY(-1);" aria-hidden="true"><path${attr("d", svgPath())} fill="currentColor" fill-rule="evenodd"></path></svg>`);
		} else if (char()) {
			$$renderer.push("<!--[1-->");
			$$renderer.push(`<span class="text-2xl font-light text-fg-muted/80" style="font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;">${escape_html(char())}</span>`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<span class="text-[10px] font-mono text-fg-subtle/60" data-numeric="">${escape_html(glyph.codepoint.toString(16).toUpperCase().padStart(4, "0"))}</span>`);
		}
		$$renderer.push(`<!--]--></div> `);
		if (showLabel) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<span class="text-[10px] font-mono text-fg-muted" data-numeric="">${escape_html(glyph.codepoint.toString(16).toUpperCase().padStart(4, "0"))}</span>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <span${attr_class(`absolute right-1 top-1 size-1.5 rounded-full ${stringify(statusColor())}`)}${attr("aria-label", `Status: ${stringify(glyph.status)}`)}></span> `);
		if (glyph.pinned) {
			$$renderer.push("<!--[0-->");
			Pin($$renderer, {
				class: "absolute left-1 top-1 size-2.5 fill-warn text-warn",
				"aria-label": "Pinned"
			});
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		if (glyph.flagged) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<span class="absolute right-2 top-2 size-2 rounded-full bg-warn ring-1 ring-canvas" aria-label="Flagged for review" title="Flagged for review"></span>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		if (glyph.notes?.trim()) {
			$$renderer.push("<!--[0-->");
			Sticky_note($$renderer, {
				class: `absolute bottom-1 right-1 size-2.5 ${stringify(/(?:^|\W)(TODO|FIXME)\b/i.test(glyph.notes) ? "text-warn" : "text-accent")}`,
				"aria-label": /(?:^|\W)(TODO|FIXME)\b/i.test(glyph.notes ?? "") ? "Note contains TODO/FIXME" : "Has notes"
			});
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		if (incompatible) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<span class="absolute bottom-1 left-1 size-1.5 rounded-full bg-danger ring-1 ring-canvas" aria-label="Incompatible with default master" title="Contour or point counts differ from the default master"></span>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		if (componentCount() > 0) {
			$$renderer.push("<!--[0-->");
			Link_2($$renderer, {
				class: "absolute bottom-1 left-1/2 size-2.5 -translate-x-1/2 text-accent",
				"aria-label": `Composite glyph (${stringify(componentCount())} component${stringify(componentCount() === 1 ? "" : "s")})`
			});
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></button>`);
	});
}
//#endregion
export { GlyphTile as t };
