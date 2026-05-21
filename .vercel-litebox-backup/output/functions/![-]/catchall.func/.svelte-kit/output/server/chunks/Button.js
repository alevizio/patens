import { d as spread_props, f as stringify, i as attributes } from "./dev.js";
import { t as Icon } from "./Icon.js";
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/loader-circle.svelte
function Loader_circle($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "loader-circle" },
		props,
		{ iconNode: [["path", { "d": "M21 12a9 9 0 1 1-6.219-8.56" }]] }
	]));
}
//#endregion
//#region src/lib/ui/Button.svelte
function Button($$renderer, $$props) {
	let { variant = "primary", density = "md", fullWidth = false, loading = false, disabled, class: extraClass = "", children, icon, $$slots, $$events, ...rest } = $$props;
	const variantClass = {
		primary: "bg-fg text-canvas hover:bg-fg/90 active:bg-fg",
		secondary: "bg-surface-2 text-fg hover:bg-surface-2/80 border border-border",
		ghost: "bg-transparent text-fg hover:bg-surface-2",
		danger: "bg-danger text-canvas hover:bg-danger/90"
	};
	const densityClass = {
		sm: "h-8 px-3 text-[13px] gap-1.5 rounded-md",
		md: "h-10 px-4 text-sm gap-2 rounded-lg",
		lg: "h-12 px-5 text-[15px] gap-2 rounded-xl"
	};
	const spinnerSize = {
		sm: "size-3.5",
		md: "size-4",
		lg: "size-[18px]"
	};
	$$renderer.push(`<button${attributes({
		...rest,
		disabled: disabled || loading,
		"aria-busy": loading || void 0,
		class: `inline-flex items-center justify-center font-medium transition-[background-color,color,border-color,opacity] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${stringify(variantClass[variant])} ${stringify(densityClass[density])} ${stringify(fullWidth ? "w-full" : "")} ${stringify(extraClass)}`
	})}>`);
	if (loading) {
		$$renderer.push("<!--[0-->");
		Loader_circle($$renderer, {
			class: `${stringify(spinnerSize[density])} animate-spin`,
			"aria-hidden": "true"
		});
	} else if (icon) {
		$$renderer.push("<!--[1-->");
		icon($$renderer);
		$$renderer.push(`<!---->`);
	} else $$renderer.push("<!--[-1-->");
	$$renderer.push(`<!--]--> `);
	if (children) {
		$$renderer.push("<!--[0-->");
		children($$renderer);
		$$renderer.push(`<!---->`);
	} else $$renderer.push("<!--[-1-->");
	$$renderer.push(`<!--]--></button>`);
}
//#endregion
export { Loader_circle as n, Button as t };
