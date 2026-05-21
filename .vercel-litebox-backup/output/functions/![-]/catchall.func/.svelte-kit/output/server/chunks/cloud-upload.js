import { d as spread_props } from "./dev.js";
import { t as Icon } from "./Icon.js";
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/cloud-upload.svelte
function Cloud_upload($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "cloud-upload" },
		props,
		{ iconNode: [
			["path", { "d": "M12 13v8" }],
			["path", { "d": "M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" }],
			["path", { "d": "m8 17 4-4 4 4" }]
		] }
	]));
}
//#endregion
export { Cloud_upload as t };
