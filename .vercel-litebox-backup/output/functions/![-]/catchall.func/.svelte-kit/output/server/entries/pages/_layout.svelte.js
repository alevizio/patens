import { n as onDestroy } from "../../chunks/index-server.js";
import { G as escape_html, c as ensure_array_like, f as stringify, l as head, n as attr_class } from "../../chunks/dev.js";
import { t as toast } from "../../chunks/toast2.svelte.js";
import { n as Circle_check, t as Circle_alert } from "../../chunks/circle-alert.js";
import { n as Triangle_alert, t as Info } from "../../chunks/info.js";
import { t as X } from "../../chunks/x.js";
import "../../chunks/delight2.js";
//#region src/lib/ui/ToastContainer.svelte
function ToastContainer($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const iconFor = (kind) => kind === "success" ? Circle_check : kind === "error" ? Circle_alert : kind === "warn" ? Triangle_alert : Info;
		const colorFor = (kind) => kind === "success" ? "border-success/40 bg-success/10 text-success" : kind === "error" ? "border-danger/40 bg-danger/10 text-danger" : kind === "warn" ? "border-warn/40 bg-warn/10 text-warn" : "border-accent/40 bg-accent/10 text-accent";
		$$renderer.push(`<div class="pointer-events-none fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col gap-2"><!--[-->`);
		const each_array = ensure_array_like(toast.items);
		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let t = each_array[$$index];
			const Icon = iconFor(t.kind);
			$$renderer.push(`<div role="status" aria-live="polite"${attr_class(`pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2 text-[12px] font-medium shadow-lg backdrop-blur-sm ${stringify(colorFor(t.kind))}`)}>`);
			if (Icon) {
				$$renderer.push("<!--[-->");
				Icon($$renderer, { class: "mt-0.5 size-3.5 shrink-0" });
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
			$$renderer.push(` <span class="flex-1">${escape_html(t.message)}</span> <button type="button" class="ml-1 rounded p-0.5 opacity-60 hover:opacity-100" aria-label="Dismiss notification" title="Dismiss">`);
			X($$renderer, { class: "size-3" });
			$$renderer.push(`<!----></button></div>`);
		}
		$$renderer.push(`<!--]--></div>`);
	});
}
//#endregion
//#region src/routes/+layout.svelte
function _layout($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { children } = $$props;
		let cleanupKonami = null;
		onDestroy(() => {
			cleanupKonami?.();
		});
		head("12qhfyh", $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>Font Studio</title>`);
			});
			$$renderer.push(`<meta name="description" content="Sketch-first personal type design tool. Draw, vectorize, space, kern, and export OTF in the browser."/>`);
		});
		$$renderer.push(`<div class="min-h-screen">`);
		children($$renderer);
		$$renderer.push(`<!----></div> `);
		ToastContainer($$renderer, {});
		$$renderer.push(`<!---->`);
	});
}
//#endregion
export { _layout as default };
