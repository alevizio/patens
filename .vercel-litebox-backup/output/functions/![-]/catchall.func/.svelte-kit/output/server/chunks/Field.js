import { G as escape_html, a as bind_props, f as stringify, i as attributes, o as derived } from "./dev.js";
//#region src/lib/ui/Input.svelte
function Input($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { density = "md", value = void 0, class: extraClass = "", $$slots, $$events, ...rest } = $$props;
		const sizeClass = derived(() => density === "sm" ? "h-8 px-2.5 text-[13px] rounded-md" : "h-10 px-3 text-sm rounded-lg");
		$$renderer.push(`<input${attributes({
			...rest,
			value,
			class: `block w-full border border-border bg-surface text-fg outline-none transition-[border-color,box-shadow] focus:border-accent focus:ring-2 focus:ring-accent-soft placeholder:text-fg-subtle disabled:opacity-50 ${stringify(sizeClass())} ${stringify(extraClass)}`
		}, void 0, void 0, void 0, 4)}/>`);
		bind_props($$props, { value });
	});
}
//#endregion
//#region src/lib/ui/Field.svelte
function Field($$renderer, $$props) {
	let { label, hint, error, required = false, children } = $$props;
	$$renderer.push(`<label class="flex flex-col gap-1.5"><span class="flex items-center gap-1 text-[13px] font-medium text-fg-muted">${escape_html(label)} `);
	if (required) {
		$$renderer.push("<!--[0-->");
		$$renderer.push(`<span class="text-danger" aria-hidden="true">*</span>`);
	} else $$renderer.push("<!--[-1-->");
	$$renderer.push(`<!--]--></span> `);
	children($$renderer);
	$$renderer.push(`<!----> `);
	if (error) {
		$$renderer.push("<!--[0-->");
		$$renderer.push(`<span class="text-[12px] text-danger">${escape_html(error)}</span>`);
	} else if (hint) {
		$$renderer.push("<!--[1-->");
		$$renderer.push(`<span class="text-[12px] text-fg-subtle">${escape_html(hint)}</span>`);
	} else $$renderer.push("<!--[-1-->");
	$$renderer.push(`<!--]--></label>`);
}
//#endregion
export { Input as n, Field as t };
