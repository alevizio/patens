import { d as spread_props } from "./dev.js";
import { t as Icon } from "./Icon.js";
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/wand-sparkles.svelte
function Wand_sparkles($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "wand-sparkles" },
		props,
		{ iconNode: [
			["path", { "d": "m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72" }],
			["path", { "d": "m14 7 3 3" }],
			["path", { "d": "M5 6v4" }],
			["path", { "d": "M19 14v4" }],
			["path", { "d": "M10 2v2" }],
			["path", { "d": "M7 8H3" }],
			["path", { "d": "M21 16h-4" }],
			["path", { "d": "M11 3H9" }]
		] }
	]));
}
//#endregion
export { Wand_sparkles as t };
