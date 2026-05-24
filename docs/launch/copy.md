# Launch copy

Drafts. Edit before posting. The goal across all surfaces: lead with the product, not the engineering. Designers care about what they can do with it; engineers will follow.

---

## One-liner

Type design in the browser. Draw glyphs, kern them, ship OpenType fonts — no installs, no sign-ups.

Variants:

- A browser-native type design environment. 1,200 lines of geometry, two masters, six OpenType features, all yours.
- Foundry-grade type design without leaving the tab.
- Sketch a glyph. Trace to Bézier. Ship an OTF. All in your browser.

---

## Tweet / Bluesky thread (5 posts)

**Post 1** (hook + visual):
Type design in the browser.
No installs, no sign-ups. Draw, trace, ship OpenType.

font-studio.vercel.app

[attach: home OG image — 1200×630 "Font Studio" serif card]

**Post 2** (what it can do):
The demo project ships 128 glyphs across Latin upper + lowercase, digits, punctuation, currency (€ £ ¥ $), math (± × ÷ °), brackets, and a ß. Two masters (Regular + Italic via slnt axis). Five composite ligatures. Six live OpenType features.

[attach: in-context mockup screenshot]

**Post 3** (the editor):
The editor's main loop is four moves:
   1. Sketch with a pencil
   2. Trace to cubic Béziers (boolean union + Schneider fitting)
   3. Edit nodes
   4. Live preview through @font-face — every change re-renders in ~15ms

[attach: editor screenshot mid-trace]

**Post 4** (the share story):
Every project gets a foundry-grade specimen page. Pangram waterfall, reading specimens at three sizes, master compare, color palette switcher, glyph inspector with anchor visualizer, live OT feature toggles.

Cmd+P → designer PDF.

[attach: share-page screenshot]

**Post 5** (close):
Open source (MIT). The 88-code audit module, the export pipeline (OTF + WOFF2 in-browser, TTF via Pyodide), and every screenshot in this thread are in:

github.com/alevizio/font-studio

---

## Show HN

**Title:** Show HN: Font Studio – type design in the browser, no installs

**Body:**

I built a browser-native type design environment. The whole thing runs client-side: sketch with a pencil (pressure-sensitive), trace strokes to cubic Bézier contours via boolean union + Schneider fitting, edit points, ship OpenType. Every project lives in your browser's IndexedDB; nothing leaves your machine unless you export it (.font.json) or upload to the cloud-share path (Vercel Blob).

Try it: https://font-studio.vercel.app/project/demo/edit
Specimen view of the demo: https://font-studio.vercel.app/share/demo

What the demo project ships:
- 128 glyphs across Latin upper/lower, digits, punctuation, currency, math, brackets, ß
- Two masters (Regular + Italic via a slnt axis with per-glyph deviation)
- Six OpenType features wired live (kern, liga, ss01, ss02, onum, case)
- Five composite ligatures (æ, œ, fi, fl, Aacute)
- Two CPAL palettes for color font preview
- A populated brief: 6 design decisions with rationale, 5 references

The audit module is the spine of the app — 88+ codes covering contour shape, vertical metrics, OpenType invariants, brief completeness. Every code reaches five teaching surfaces (edit panel, audit page, release pre-flight, family hub, home page) through a single describeAuditCode() dictionary.

Stack: SvelteKit + Svelte 5 runes, Tailwind v4, idb-keyval, opentype.js (OTF/WOFF2 in browser), Pyodide + ttfautohint (TTF), Vercel Blob (cloud share), satori + resvg-js (per-project OG images).

MIT licensed. The repo has a CONTRIBUTING guide and a one-page architecture doc:
https://github.com/alevizio/font-studio

Happy to answer anything.

---

## Reddit r/typography draft

(Lead with the work, not the tool — designers want to see results)

**Title:** I built a type design environment that runs entirely in the browser

I've been working on this for a while. It's a sketch-first editor where you draw glyphs with a pencil (pressure-sensitive on iPad), trace your strokes to vector outlines, then ship OpenType — without installing anything.

The demo project is a 128-glyph geometric sans called Studio Geometric. Two masters (Regular + Italic), six OpenType features, real ligature substitutions (fi, fl). Five composite ligatures, a drawn ß, full currency + math + brackets. The whole thing reads like a real WIP type project, with a populated design brief and a decision journal.

Open source under MIT: github.com/alevizio/font-studio
Try it: font-studio.vercel.app

Would love to hear what's missing, what's broken, what feels off.

---

## Designer-friend DM (text-message friendly)

hey — finally shipped the type editor thing i've been making. demo at font-studio.vercel.app, open it on desktop. type stuff in the "try it" panel, click a glyph to inspect, hit cmd+p to print a specimen. let me know what feels off

---

## Email to a specific person

Subject: A type editor that runs in the browser

[Name],

I just shipped Font Studio — a type design environment that runs entirely in the browser, no installs.

Link: https://font-studio.vercel.app

The example project (https://font-studio.vercel.app/share/demo) is the easiest entry point. It's a 128-glyph geometric sans I built to exercise every feature in the editor.

If you have 10 minutes:
- Open the share view
- Click "Try it" and type a sentence
- Switch the master to Italic
- Click any glyph to inspect it
- Hit Cmd+P for a specimen PDF

I'm specifically looking for two things:
1. What's confusing / where do you get stuck?
2. What's missing that you'd use this for?

The repo is open source (MIT): https://github.com/alevizio/font-studio

Thanks.

---

## Anti-patterns to avoid in copy

- Don't lead with "AI-powered" or "the future of" — designers tune those out instantly.
- Don't compare to Glyphs / FontLab directly. The tool isn't trying to replace them; comparing invites the wrong evaluation.
- Don't say "no code required" — designers don't think they need code; that phrase implies they do.
- Don't say "designed for designers" — circular.
- Don't oversell the multiple-master story; the Italic is a slant axis with per-glyph deviation, not a hand-drawn italic master. Be honest about scope.
