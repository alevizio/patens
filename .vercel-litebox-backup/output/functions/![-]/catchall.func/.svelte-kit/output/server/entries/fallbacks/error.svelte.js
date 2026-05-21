import { G as escape_html } from "../../chunks/dev.js";
import { t as page } from "../../chunks/state.js";
//#region node_modules/.pnpm/@sveltejs+kit@2.60.1_@sveltejs+vite-plugin-svelte@7.1.2_svelte@5.55.7_vite@8.0.13_@type_ae48e6b431ecfd6dbf6bd317f1387b52/node_modules/@sveltejs/kit/src/runtime/components/svelte-5/error.svelte
function Error($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		$$renderer.push(`<h1>${escape_html(page.status)}</h1> <p>${escape_html(page.error?.message)}</p>`);
	});
}
//#endregion
export { Error as default };
