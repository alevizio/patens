import { f as stringify, n as attr_class, o as derived } from "./dev.js";
//#region src/lib/ui/Panel.svelte
function Panel($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { padding = "md", class: extraClass = "", children } = $$props;
		const padClass = derived(() => ({
			none: "",
			sm: "p-3",
			md: "p-5",
			lg: "p-6"
		})[padding]);
		$$renderer.push(`<div${attr_class(`rounded-xl border border-border bg-surface ${stringify(padClass())} ${stringify(extraClass)}`)}>`);
		children($$renderer);
		$$renderer.push(`<!----></div>`);
	});
}
//#endregion
export { Panel as t };
