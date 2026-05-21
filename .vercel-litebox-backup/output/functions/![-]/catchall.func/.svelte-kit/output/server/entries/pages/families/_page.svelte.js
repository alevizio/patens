import { G as escape_html, U as attr, c as ensure_array_like, f as stringify } from "../../../chunks/dev.js";
import { t as Arrow_left } from "../../../chunks/arrow-left.js";
import { t as Layers } from "../../../chunks/layers.js";
import { t as formatRelative } from "../../../chunks/format.js";
import { t as Type } from "../../../chunks/type.js";
//#region src/routes/families/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { data } = $$props;
		$$renderer.push(`<div class="mx-auto max-w-6xl px-6 py-8 sm:py-10"><header class="mb-10 flex items-center justify-between gap-3 border-b border-border/50 pb-4"><a href="/" class="group inline-flex items-center gap-2.5"><span class="inline-flex size-7 items-center justify-center rounded-lg bg-fg text-canvas transition-transform group-hover:scale-105">`);
		Type($$renderer, { class: "size-3.5" });
		$$renderer.push(`<!----></span> <span class="text-[13px] font-medium tracking-tight text-fg" style="font-family: ui-monospace, 'SF Mono', Menlo, monospace;">Font Studio</span></a> <a href="/" class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg">`);
		Arrow_left($$renderer, { class: "size-3.5" });
		$$renderer.push(`<!----> Back to projects</a></header> <section class="mb-16 max-w-3xl"><h1 class="text-[40px] leading-[1.05] tracking-tight text-fg" style="font-family: 'Hoefler Text', ui-serif, Georgia, 'Times New Roman', serif;">Families</h1> <p class="mt-4 text-[15px] leading-relaxed text-fg-muted">Each family ties two or more sibling projects — Regular + Italic + Bold + … —
			under one canonical name with shared metadata and a unified release bundle.</p></section> `);
		if (data.families.length === 0) {
			$$renderer.push("<!--[0-->");
			$$renderer.push(`<section class="grid gap-8 md:grid-cols-[5fr_7fr] md:gap-12"><div class="rounded-2xl border border-dashed border-border bg-surface-2/30 p-8"><pre class="block whitespace-pre text-left font-mono text-[11px] leading-[1.2] text-fg-subtle" aria-hidden="true">  Roman      Italic      Bold
  ──────     ──────     ──────
   H  O       H  O       H  O
   n  o       n  o       n  o</pre></div> <div class="flex flex-col justify-center gap-3"><h2 class="text-[22px] leading-tight tracking-tight text-fg" style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;">No families yet</h2> <p class="text-[14px] leading-relaxed text-fg-muted">A family is a set of sibling projects sharing one canonical name.
					Open any project from the home page, right-click it, and choose <span class="font-medium text-fg">Start family from this project…</span> to link siblings.</p> <a href="/" class="mt-2 inline-flex w-fit items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-[12px] font-medium text-fg-muted transition-colors hover:border-accent hover:text-accent">Browse projects →</a></div></section>`);
		} else {
			$$renderer.push("<!--[-1-->");
			$$renderer.push(`<section><div class="mb-5 flex items-baseline justify-between gap-3"><h2 class="text-[24px] leading-none tracking-tight text-fg" style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;">Your families</h2> <span class="font-mono text-[11px] text-fg-subtle" data-numeric="">${escape_html(data.families.length)}</span></div> <ul class="grid gap-2"><!--[-->`);
			const each_array = ensure_array_like(data.families);
			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let f = each_array[$$index];
				$$renderer.push(`<li><a${attr("href", `/family/${stringify(f.id)}`)} class="group flex items-center gap-4 rounded-2xl border border-border bg-surface px-5 py-4 transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-sm"><div class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">`);
				Layers($$renderer, { class: "size-5" });
				$$renderer.push(`<!----></div> <div class="min-w-0 flex-1"><div class="truncate text-[16px] leading-tight text-fg" style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;">${escape_html(f.name)}</div> <div class="mt-1 font-mono text-[11px] text-fg-subtle" data-numeric="">${escape_html(f.siblingCount ?? 0)} style${escape_html(f.siblingCount === 1 ? "" : "s")} ·
									updated ${escape_html(formatRelative(f.updatedAt))}</div></div> <span class="text-fg-subtle transition-all group-hover:translate-x-0.5 group-hover:text-accent">→</span></a></li>`);
			}
			$$renderer.push(`<!--]--></ul></section>`);
		}
		$$renderer.push(`<!--]--></div>`);
	});
}
//#endregion
export { _page as default };
