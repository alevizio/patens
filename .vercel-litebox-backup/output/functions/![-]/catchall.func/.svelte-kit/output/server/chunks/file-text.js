import { d as spread_props } from "./dev.js";
import { t as Icon } from "./Icon.js";
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/file-text.svelte
function File_text($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "file-text" },
		props,
		{ iconNode: [
			["path", { "d": "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" }],
			["path", { "d": "M14 2v5a1 1 0 0 0 1 1h5" }],
			["path", { "d": "M10 9H8" }],
			["path", { "d": "M16 13H8" }],
			["path", { "d": "M16 17H8" }]
		] }
	]));
}
//#endregion
export { File_text as t };
