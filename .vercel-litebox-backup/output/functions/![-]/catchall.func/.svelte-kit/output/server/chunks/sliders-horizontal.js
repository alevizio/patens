import { d as spread_props } from "./dev.js";
import { t as Icon } from "./Icon.js";
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/sliders-horizontal.svelte
function Sliders_horizontal($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "sliders-horizontal" },
		props,
		{ iconNode: [
			["path", { "d": "M10 5H3" }],
			["path", { "d": "M12 19H3" }],
			["path", { "d": "M14 3v4" }],
			["path", { "d": "M16 17v4" }],
			["path", { "d": "M21 12h-9" }],
			["path", { "d": "M21 19h-5" }],
			["path", { "d": "M21 5h-7" }],
			["path", { "d": "M8 10v4" }],
			["path", { "d": "M8 12H3" }]
		] }
	]));
}
//#endregion
export { Sliders_horizontal as t };
