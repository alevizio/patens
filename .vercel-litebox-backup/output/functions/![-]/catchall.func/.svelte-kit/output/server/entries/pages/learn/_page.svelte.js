import { G as escape_html, U as attr, c as ensure_array_like, d as spread_props } from "../../../chunks/dev.js";
import { t as Icon } from "../../../chunks/Icon.js";
import { t as Arrow_left } from "../../../chunks/arrow-left.js";
import { t as Pen_tool } from "../../../chunks/pen-tool.js";
import { t as Compass } from "../../../chunks/compass.js";
import { t as Rocket } from "../../../chunks/rocket.js";
import { t as Type } from "../../../chunks/type.js";
import { t as External_link } from "../../../chunks/external-link.js";
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/book-open.svelte
function Book_open($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "book-open" },
		props,
		{ iconNode: [["path", { "d": "M12 7v14" }], ["path", { "d": "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" }]] }
	]));
}
//#endregion
//#region node_modules/.pnpm/@lucide+svelte@1.16.0_svelte@5.55.7/node_modules/@lucide/svelte/dist/icons/wrench.svelte
function Wrench($$renderer, $$props) {
	let { $$slots, $$events, ...props } = $$props;
	Icon($$renderer, spread_props([
		{ name: "wrench" },
		props,
		{ iconNode: [["path", { "d": "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z" }]] }
	]));
}
//#endregion
//#region src/routes/learn/+page.svelte
function _page($$renderer) {
	const TIMELINE = [
		{
			weeks: "Week 1–2",
			phase: "Research + control set",
			tasks: [
				"Write the brief (intent, audience, use cases, reading conditions).",
				"Collect three corpora: functional (real text the font must handle), historical (writing / lettering / print models), competitive (existing solutions to study).",
				"Sketch only the control glyphs: n o H O p d a e v + punctuation + figures."
			]
		},
		{
			weeks: "Week 3–4",
			phase: "Make the glyphs cohere in text",
			tasks: [
				"Refine proportions; lock UPM, cap-height, x-height.",
				"Get spacing right before kerning — proof in HOHnonHo strings, not isolated glyphs.",
				"Add a couple of kerning pairs (AV, To) and prove they help."
			]
		},
		{
			weeks: "Week 5–8",
			phase: "Expand cautiously",
			tasks: [
				"Fill in the rest of basic Latin; add diacritics with composites.",
				"Add the first feature set (kern + liga is enough).",
				"Build static OTF + WOFF2; install in Font Book; type something real."
			]
		},
		{
			weeks: "Week 9–12",
			phase: "Test in real conditions, then release",
			tasks: [
				"Walk the full Release checklist — browser × OS matrix, app proofs, language tests.",
				"Fix the audit issues that actually matter; mark hints as accepted.",
				"Write design notes, version, license; ship trial + full binaries."
			]
		}
	];
	const EXERCISES = [
		{
			title: "Redraw a historical model",
			body: "Pick a typeface you already love and trace its proportion logic. Not to publish — to learn how it was constructed. Cover an alphabet in one weight."
		},
		{
			title: "Build a control set and proof in repeated strings",
			body: "Draw n o H O a e s c p v y f g. Spend a full day spacing them inside HOHnonHnonH strings — single glyphs lie, strings tell the truth."
		},
		{
			title: "Make a serif and a sans that share a proportion model",
			body: "Same UPM, cap-height, x-height, advance widths. The only differences are terminals and contrast. You will learn what structural choices really carry style."
		},
		{
			title: "Test in paragraph text and a browser before calling it finished",
			body: "Compile WOFF2, drop it into a real page, set a paragraph at 14px. Most fonts that look great at 200px collapse in a paragraph."
		}
	];
	const TOOLS = [
		{
			name: "Glyphs",
			role: "Mature all-in-one editor on macOS. Best learning materials.",
			href: "https://glyphsapp.com/learn"
		},
		{
			name: "RoboFont",
			role: "UFO-first, Python-scriptable. Modular for design systems.",
			href: "https://doc.robofont.com/"
		},
		{
			name: "FontLab",
			role: "Cross-platform integrated editor with variable + web support.",
			href: "https://help.fontlab.com/fontlab/8/manual/"
		},
		{
			name: "FontForge",
			role: "Free, open source. Wide format support, modest UI.",
			href: "https://fontforge.org/docs/"
		},
		{
			name: "fontTools",
			role: "ttLib / feaLib / TTX / designspaceLib / varLib / subsetting.",
			href: "https://fonttools.readthedocs.io/en/latest/"
		},
		{
			name: "fontmake",
			role: "Builds static + variable binaries from Glyphs / UFO / designspace.",
			href: "https://github.com/googlefonts/fontmake"
		},
		{
			name: "FontBakery",
			role: "Automated QA checks with Google Fonts / Adobe Fonts profiles.",
			href: "https://fontbakery.readthedocs.io/en/latest/"
		},
		{
			name: "opentype.js",
			role: "Read / write OTF + TTF in the browser. (This app uses it.)",
			href: "https://opentype.js.org/"
		}
	];
	const READING = [
		{
			title: "Designing Type",
			by: "Karen Cheng",
			why: "Practical, shape-specific. Treats optical correction and structural consistency as inseparable.",
			href: "https://yalebooks.yale.edu/book/9780300249927/designing-type/"
		},
		{
			title: "The Stroke",
			by: "Gerrit Noordzij",
			why: "Theoretical. Trains you to think about writing logic, stress, and the white around letters.",
			href: "https://hyphenpress.co.uk/products/books/978-0-907259-30-5/"
		},
		{
			title: "Microsoft OpenType Specification",
			by: "Microsoft",
			why: "The actual format. Authoritative for tables, layout, variation.",
			href: "https://learn.microsoft.com/en-us/typography/opentype/spec/"
		},
		{
			title: "Google Fonts Guide",
			by: "Google Fonts team",
			why: "Strongest public model of open-source workflow, QA, and web deployment.",
			href: "https://googlefonts.github.io/gf-guide/"
		},
		{
			title: "AFDKO Feature File Specification",
			by: "Adobe Type Tools",
			why: "The grammar for .fea — what every modern build pipeline ingests.",
			href: "https://adobe-type-tools.github.io/afdko/OpenTypeFeatureFileSpecification.html"
		},
		{
			title: "WOFF2 (W3C Recommendation)",
			by: "W3C",
			why: "The web baseline. Why @font-face works the way it does.",
			href: "https://www.w3.org/TR/WOFF2/"
		},
		{
			title: "HarfBuzz Manual",
			by: "HarfBuzz authors",
			why: "The shaping engine inside Chrome/Firefox/Android. Read it before debugging OT layout.",
			href: "https://harfbuzz.github.io/"
		}
	];
	const FOUNDRIES = [
		{
			name: "KLIM Type Foundry",
			focus: "Historically informed contemporary families",
			why: "Their design notes (Söhne, The Future) model how to turn references into a concept.",
			href: "https://klim.co.nz/"
		},
		{
			name: "Hoefler&Co",
			focus: "Editorial + institutional systems",
			why: "Strongest public writing on optical sizes, feature depth, and family architecture.",
			href: "https://www.typography.com/"
		},
		{
			name: "Commercial Type",
			focus: "Editorial workhorses",
			why: "Graphik essay explains \"deliberately plain\" as a design position.",
			href: "https://commercialtype.com/"
		},
		{
			name: "TypeTogether",
			focus: "Editorial reading + multiscript",
			why: "Adelle Sans Multiscript: best model for thinking across writing systems.",
			href: "https://www.type-together.com/"
		},
		{
			name: "Dalton Maag",
			focus: "Variable + multiscript systems",
			why: "Aktiv Grotesk: typeface as system with 10 scripts, axes, and product surface.",
			href: "https://www.daltonmaag.com/"
		},
		{
			name: "Adobe Originals",
			focus: "Publishing-grade families",
			why: "Source Serif 4: clearest public story on optical sizes.",
			href: "https://fonts.adobe.com/foundries/adobe"
		}
	];
	const RESEARCH = [{
		title: "Does Print Size Matter for Reading?",
		by: "Gordon E. Legge & Charles A. Bigelow (2011)",
		why: "Why print size remains a dominant readability variable — proof at use sizes.",
		href: "https://jov.arvojournals.org/article.aspx?articleid=2191864"
	}, {
		title: "Crowding is unlike ordinary masking",
		by: "Pelli, Palomares & Majaj (2004)",
		why: "Why local density and neighboring forms constrain reading rate.",
		href: "https://jov.arvojournals.org/article.aspx?articleid=2192859"
	}];
	$$renderer.push(`<div class="mx-auto max-w-6xl px-6 py-8 sm:py-10"><header class="mb-10 flex items-center justify-between gap-3 border-b border-border/50 pb-4"><a href="/" class="group inline-flex items-center gap-2.5"><span class="inline-flex size-7 items-center justify-center rounded-lg bg-fg text-canvas transition-transform group-hover:scale-105">`);
	Type($$renderer, { class: "size-3.5" });
	$$renderer.push(`<!----></span> <span class="text-[13px] font-medium tracking-tight text-fg" style="font-family: ui-monospace, 'SF Mono', Menlo, monospace;">Font Studio</span></a> <a href="/" class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg">`);
	Arrow_left($$renderer, { class: "size-3.5" });
	$$renderer.push(`<!----> Back to projects</a></header> <section class="mb-16 max-w-3xl"><h1 class="text-[40px] leading-[1.05] tracking-tight text-fg" style="font-family: 'Hoefler Text', ui-serif, Georgia, 'Times New Roman', serif;">Learn type design</h1> <p class="mt-4 text-[15px] leading-relaxed text-fg-muted">A pragmatic 8–12 week starter path, exercises that actually teach you to see,
			and the tools, books, and foundries a real practice runs on. Adapted from
			foundry essays and the standards docs that govern the format.</p></section> <section class="mb-16"><div class="mb-6 flex items-baseline gap-3">`);
	Compass($$renderer, { class: "size-5 self-center text-accent" });
	$$renderer.push(`<!----> <h2 class="text-[28px] leading-none tracking-tight text-fg" style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;">Beginner timeline</h2> <span class="text-[12px] text-fg-subtle">8–12 weeks</span></div> <ol class="grid gap-3"><!--[-->`);
	const each_array = ensure_array_like(TIMELINE);
	for (let i = 0, $$length = each_array.length; i < $$length; i++) {
		let phase = each_array[i];
		$$renderer.push(`<li class="grid grid-cols-1 gap-5 rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-accent/40 md:grid-cols-[180px_1fr]"><div class="flex items-baseline gap-3 md:flex-col md:items-start md:gap-1"><div class="text-[44px] leading-none text-accent" style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;" data-numeric="">${escape_html(i + 1)}</div> <div><div class="font-mono text-[11px] text-fg-subtle" data-numeric="">${escape_html(phase.weeks)}</div> <div class="text-[10px] tracking-wider text-fg-subtle uppercase">Phase</div></div></div> <div class="min-w-0"><div class="text-[18px] leading-tight text-fg" style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;">${escape_html(phase.phase)}</div> <ul class="mt-3 grid gap-2 text-[13px] leading-relaxed text-fg-muted"><!--[-->`);
		const each_array_1 = ensure_array_like(phase.tasks);
		for (let $$index = 0, $$length = each_array_1.length; $$index < $$length; $$index++) {
			let t = each_array_1[$$index];
			$$renderer.push(`<li class="flex gap-2.5"><span class="mt-2 size-1 shrink-0 rounded-full bg-fg-subtle"></span> <span>${escape_html(t)}</span></li>`);
		}
		$$renderer.push(`<!--]--></ul></div></li>`);
	}
	$$renderer.push(`<!--]--></ol></section> <section class="mb-16"><div class="mb-5 flex items-baseline gap-3">`);
	Pen_tool($$renderer, { class: "size-4 self-center text-accent" });
	$$renderer.push(`<!----> <h2 class="text-[22px] leading-none tracking-tight text-fg" style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;">Exercises that teach you to see</h2></div> <div class="grid gap-3 sm:grid-cols-2"><!--[-->`);
	const each_array_2 = ensure_array_like(EXERCISES);
	for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
		let ex = each_array_2[$$index_2];
		$$renderer.push(`<div class="rounded-2xl border border-border bg-surface p-5"><div class="text-[15px] leading-tight text-fg" style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;">${escape_html(ex.title)}</div> <p class="mt-2 text-[13px] leading-relaxed text-fg-muted">${escape_html(ex.body)}</p></div>`);
	}
	$$renderer.push(`<!--]--></div></section> <section class="mb-16 grid gap-8 md:grid-cols-[4fr_8fr] md:gap-10"><div><div class="flex items-baseline gap-3">`);
	Wrench($$renderer, { class: "size-4 self-center text-accent" });
	$$renderer.push(`<!----> <h2 class="text-[22px] leading-tight tracking-tight text-fg" style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;">Tools the practice runs on</h2></div> <p class="mt-3 text-[13px] leading-relaxed text-fg-muted">The actual editors and pipelines used in production. Most are
				open source.</p></div> <div class="grid gap-2"><!--[-->`);
	const each_array_3 = ensure_array_like(TOOLS);
	for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
		let t = each_array_3[$$index_3];
		$$renderer.push(`<a${attr("href", t.href)} target="_blank" rel="noopener" class="group flex items-baseline gap-4 rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:border-accent hover:bg-accent-soft/20"><div class="w-[130px] shrink-0 text-[14px] text-fg" style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;">${escape_html(t.name)}</div> <div class="min-w-0 flex-1 text-[12px] leading-snug text-fg-muted">${escape_html(t.role)}</div> `);
		External_link($$renderer, {
			class: "size-3.5 shrink-0 text-fg-subtle/60 group-hover:text-accent",
			"aria-hidden": "true"
		});
		$$renderer.push(`<!----></a>`);
	}
	$$renderer.push(`<!--]--></div></section> <section class="mb-16 grid gap-8 md:grid-cols-[8fr_4fr] md:gap-10"><div class="grid gap-2 md:order-2-NEVER"><!--[-->`);
	const each_array_4 = ensure_array_like(READING);
	for (let $$index_4 = 0, $$length = each_array_4.length; $$index_4 < $$length; $$index_4++) {
		let r = each_array_4[$$index_4];
		$$renderer.push(`<a${attr("href", r.href)} target="_blank" rel="noopener" class="group rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:border-accent hover:bg-accent-soft/20"><div class="flex items-baseline justify-between gap-3"><span class="text-[14px] leading-tight text-fg" style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;">${escape_html(r.title)}</span> `);
		External_link($$renderer, {
			class: "size-3.5 shrink-0 text-fg-subtle/60 group-hover:text-accent",
			"aria-hidden": "true"
		});
		$$renderer.push(`<!----></div> <div class="mt-0.5 font-mono text-[10px] tracking-wide text-fg-subtle" data-numeric="">${escape_html(r.by)}</div> <p class="mt-1.5 text-[12px] leading-snug text-fg-muted">${escape_html(r.why)}</p></a>`);
	}
	$$renderer.push(`<!--]--></div> <div><div class="flex items-baseline gap-3">`);
	Book_open($$renderer, { class: "size-4 self-center text-accent" });
	$$renderer.push(`<!----> <h2 class="text-[22px] leading-tight tracking-tight text-fg" style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;">Reading</h2></div> <p class="mt-3 text-[13px] leading-relaxed text-fg-muted">Books that train the eye, plus the standards docs that govern the
				format on the wire.</p></div></section> <section class="mb-16"><div class="mb-5 flex items-baseline gap-3">`);
	Compass($$renderer, { class: "size-4 self-center text-accent" });
	$$renderer.push(`<!----> <h2 class="text-[22px] leading-none tracking-tight text-fg" style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;">Foundries worth studying</h2></div> <p class="mb-4 max-w-2xl text-[13px] leading-relaxed text-fg-muted">The strongest type-design education isn't in books — it's reading how
			foundries argue for their decisions. These public pages model the rhetoric,
			the system, and the production craft.</p> <div class="grid gap-2 sm:grid-cols-2"><!--[-->`);
	const each_array_5 = ensure_array_like(FOUNDRIES);
	for (let $$index_5 = 0, $$length = each_array_5.length; $$index_5 < $$length; $$index_5++) {
		let f = each_array_5[$$index_5];
		$$renderer.push(`<a${attr("href", f.href)} target="_blank" rel="noopener" class="group rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:border-accent hover:bg-accent-soft/20"><div class="flex items-baseline justify-between gap-2"><span class="text-[15px] leading-tight text-fg" style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;">${escape_html(f.name)}</span> `);
		External_link($$renderer, {
			class: "size-3.5 shrink-0 text-fg-subtle/60 group-hover:text-accent",
			"aria-hidden": "true"
		});
		$$renderer.push(`<!----></div> <div class="mt-1 text-[11px] font-medium text-fg-muted">${escape_html(f.focus)}</div> <p class="mt-1 text-[11px] leading-snug text-fg-subtle">${escape_html(f.why)}</p></a>`);
	}
	$$renderer.push(`<!--]--></div></section> <section class="mb-16"><div class="mb-4 flex items-baseline gap-3">`);
	Book_open($$renderer, { class: "size-4 self-center text-accent" });
	$$renderer.push(`<!----> <h2 class="text-[18px] leading-none tracking-tight text-fg" style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;">Legibility research</h2> <span class="text-[11px] text-fg-subtle">Why proof paragraphs matter more than polished hero glyphs</span></div> <div class="grid gap-2"><!--[-->`);
	const each_array_6 = ensure_array_like(RESEARCH);
	for (let $$index_6 = 0, $$length = each_array_6.length; $$index_6 < $$length; $$index_6++) {
		let r = each_array_6[$$index_6];
		$$renderer.push(`<a${attr("href", r.href)} target="_blank" rel="noopener" class="group flex items-baseline gap-4 rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:border-accent hover:bg-accent-soft/20"><div class="min-w-0 flex-1"><div class="text-[14px] leading-tight text-fg" style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;">${escape_html(r.title)}</div> <div class="mt-0.5 font-mono text-[10px] tracking-wide text-fg-subtle" data-numeric="">${escape_html(r.by)}</div> <p class="mt-1.5 text-[12px] leading-snug text-fg-muted">${escape_html(r.why)}</p></div> `);
		External_link($$renderer, {
			class: "size-3.5 shrink-0 text-fg-subtle/60 group-hover:text-accent",
			"aria-hidden": "true"
		});
		$$renderer.push(`<!----></a>`);
	}
	$$renderer.push(`<!--]--></div></section> <section class="mt-24 flex flex-col items-start gap-5 rounded-2xl border border-accent/40 bg-accent-soft/30 p-8 md:flex-row md:items-center md:gap-8"><div class="flex size-14 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-fg">`);
	Rocket($$renderer, { class: "size-6" });
	$$renderer.push(`<!----></div> <div class="flex-1"><div class="text-[20px] leading-tight text-fg" style="font-family: 'Hoefler Text', ui-serif, Georgia, serif;">Ready to start?</div> <p class="mt-1 text-[13px] leading-relaxed text-fg-muted">Create a project, fill in the Brief tab, draw your control set — <span class="font-mono text-fg-muted" data-numeric="">n o H O a e s c p v y f g</span>.</p></div> <a href="/" class="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-[13px] font-medium text-accent-fg transition-colors hover:bg-accent/90">New project →</a></section></div>`);
}
//#endregion
export { _page as default };
