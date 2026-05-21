import { d as spread_props } from "./dev.js";
import { t as Icon } from "./Icon.js";
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/type.svelte
function Type($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "type" },
		props,
		{ iconNode: [
			["path", { "d": "M12 4v16" }],
			["path", { "d": "M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2" }],
			["path", { "d": "M9 20h6" }]
		] }
	]));
}
//#endregion
export { Type as t };
