import { G as escape_html, U as attr, c as ensure_array_like, d as spread_props, f as stringify, o as derived } from "./dev.js";
import { t as Icon } from "./Icon.js";
import { t as X } from "./x.js";
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/keyboard.svelte
function Keyboard($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "keyboard" },
		props,
		{ iconNode: [
			["path", { "d": "M10 8h.01" }],
			["path", { "d": "M12 12h.01" }],
			["path", { "d": "M14 8h.01" }],
			["path", { "d": "M16 12h.01" }],
			["path", { "d": "M18 8h.01" }],
			["path", { "d": "M6 8h.01" }],
			["path", { "d": "M7 16h10" }],
			["path", { "d": "M8 12h.01" }],
			["rect", {
				"width": "20",
				"height": "16",
				"x": "2",
				"y": "4",
				"rx": "2"
			}]
		] }
	]));
}
//#endregion
//#region src/lib/ui/ShortcutsDialog.svelte
function ShortcutsDialog($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { open, onclose } = $$props;
		const groups = [
			{
				title: "Project",
				rows: [
					{
						keys: "⌘S",
						label: "Save now"
					},
					{
						keys: "⌘⇧L",
						label: "Lock / unlock project"
					},
					{
						keys: "⌘⇧B",
						label: "Open Brief"
					},
					{
						keys: "⌘⇧R",
						label: "Open Release"
					},
					{
						keys: "⌘⇧E",
						label: "Quick-export OTF"
					},
					{
						keys: "⌘,",
						label: "Open Settings"
					},
					{
						keys: "⌘P",
						label: "Print specimen (on Specimen page)"
					},
					{
						keys: "⌘K",
						label: "Open command palette"
					},
					{
						keys: "/",
						label: "Open command palette"
					},
					{
						keys: "⌘1..9",
						label: "Jump to nth tab"
					},
					{
						keys: "⌘\\",
						label: "Toggle glyph browser sidebar"
					},
					{
						keys: "⌘M",
						label: "Cycle active master (VF projects)"
					},
					{
						keys: "⌘J",
						label: "Cycle theme (system / light / dark)"
					}
				]
			},
			{
				title: "Editor — tools",
				rows: [
					{
						keys: "P",
						label: "Pencil"
					},
					{
						keys: "E",
						label: "Eraser"
					},
					{
						keys: "A",
						label: "Edit points"
					},
					{
						keys: "T",
						label: "Trace sketch to vector"
					}
				]
			},
			{
				title: "Editor — navigation",
				rows: [
					{
						keys: "[",
						label: "Previous glyph"
					},
					{
						keys: "]",
						label: "Next glyph"
					},
					{
						keys: "/",
						label: "Open glyph palette"
					},
					{
						keys: "⌘K",
						label: "Open glyph palette"
					}
				]
			},
			{
				title: "Editor — points",
				rows: [
					{
						keys: "Alt-click",
						label: "Toggle point: smooth (●) ↔ corner (◆)"
					},
					{
						keys: "Shift-click",
						label: "Add point to selection"
					},
					{
						keys: "↑ ↓ ← →",
						label: "Nudge selected points (Shift = 10 units)"
					},
					{
						keys: "Delete",
						label: "Remove selected points"
					}
				]
			},
			{
				title: "Editor — layers",
				rows: [
					{
						keys: "S",
						label: "Toggle sketch layer"
					},
					{
						keys: "V",
						label: "Toggle vector layer"
					},
					{
						keys: "G",
						label: "Toggle grid"
					},
					{
						keys: "R",
						label: "Toggle reference glyph"
					},
					{
						keys: "⇧R",
						label: "Toggle family-Regular overlay (sibling editor)"
					},
					{
						keys: "O",
						label: "Toggle onion-skin neighbours"
					},
					{
						keys: "X",
						label: "Toggle anchors"
					}
				]
			},
			{
				title: "Editor — history & clipboard",
				rows: [
					{
						keys: "⌘Z",
						label: "Undo"
					},
					{
						keys: "⌘⇧Z",
						label: "Redo"
					},
					{
						keys: "⌘⇧C",
						label: "Copy glyph"
					},
					{
						keys: "⌘⇧V",
						label: "Paste glyph"
					}
				]
			},
			{
				title: "Editor — status",
				rows: [
					{
						keys: "1",
						label: "Mark empty"
					},
					{
						keys: "2",
						label: "Mark sketch"
					},
					{
						keys: "3",
						label: "Mark draft"
					},
					{
						keys: "4",
						label: "Mark final"
					},
					{
						keys: "`",
						label: "Toggle pin"
					},
					{
						keys: "⇧F",
						label: "Toggle flag for review"
					}
				]
			},
			{
				title: "Help",
				rows: [{
					keys: "?",
					label: "Show this dialog"
				}]
			}
		];
		if (open) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<div class="fixed inset-0 z-50 flex items-center justify-center bg-canvas/70 backdrop-blur-sm" role="presentation"><button type="button" class="absolute inset-0 cursor-default" aria-label="Close shortcuts" tabindex="-1"></button> <div role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" class="relative max-h-[80vh] w-[640px] max-w-[90vw] overflow-y-auto rounded-lg border border-border bg-surface shadow-xl"><div class="sticky top-0 flex items-center justify-between border-b border-border bg-surface px-4 py-2.5"><div class="flex items-center gap-2">`);
			Keyboard($$renderer, { class: "size-4 text-fg-muted" });
			$$renderer.push(`<!----> <h2 class="text-[12px] font-semibold tracking-wide text-fg">Keyboard shortcuts</h2></div> <button type="button" class="rounded p-0.5 text-fg-subtle hover:bg-surface-2 hover:text-fg" aria-label="Close" title="Close shortcuts (?)">`);
			X($$renderer, { class: "size-3.5" });
			$$renderer.push(`<!----></button></div> <div class="grid gap-5 p-5 sm:grid-cols-2"><!--[-->`);
			const each_array = ensure_array_like(groups);
			for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
				let g = each_array[$$index_1];
				$$renderer.push(`<div><div class="mb-1.5 text-[10px] font-semibold tracking-wider text-fg-subtle uppercase">${escape_html(g.title)}</div> <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[12px]"><!--[-->`);
				const each_array_1 = ensure_array_like(g.rows);
				for (let $$index = 0, $$length = each_array_1.length; $$index < $$length; $$index++) {
					let r = each_array_1[$$index];
					$$renderer.push(`<dt class="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-fg" data-numeric="">${escape_html(r.keys)}</dt> <dd class="text-fg-muted">${escape_html(r.label)}</dd>`);
				}
				$$renderer.push(`<!--]--></dl></div>`);
			}
			$$renderer.push(`<!--]--></div></div></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
	});
}
//#endregion
//#region src/lib/ui/Sparkline.svelte
function Sparkline($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { values, width = 56, height = 14, label } = $$props;
		const max = derived(() => Math.max(1, ...values));
		const total = derived(() => values.reduce((a, b) => a + b, 0));
		const stepX = derived(() => values.length > 1 ? width / (values.length - 1) : 0);
		const linePath = derived(() => {
			if (values.length === 0) return "";
			return values.map((v, i) => {
				const x = i * stepX();
				const y = height - v / max() * (height - 1) - .5;
				return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
			}).join(" ");
		});
		const fillPath = derived(() => {
			if (values.length === 0) return "";
			return `${linePath()} L${(values.length - 1) * stepX()},${height} L0,${height} Z`;
		});
		const todayValue = derived(() => values[values.length - 1] ?? 0);
		$$renderer.push(`<svg${attr("width", width)}${attr("height", height)}${attr("viewBox", `0 0 ${stringify(width)} ${stringify(height)}`)} role="img"${attr("aria-label", label ?? `${total()} edits in last ${values.length} days, ${todayValue()} today`)} class="overflow-visible"><path${attr("d", fillPath())} fill="hsl(var(--accent) / 0.15)"></path><path${attr("d", linePath())} fill="none" stroke="hsl(var(--accent))" stroke-width="1" stroke-linejoin="round"></path>`);
		if (todayValue() > 0 && values.length > 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<circle${attr("cx", (values.length - 1) * stepX())}${attr("cy", height - todayValue() / max() * (height - 1) - .5)} r="1.4" fill="hsl(var(--accent))"></circle>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></svg>`);
	});
}
//#endregion
export { ShortcutsDialog as n, Sparkline as t };
