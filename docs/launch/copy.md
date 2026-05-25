# Launch copy

Drafts. Edit before posting. The goal across every surface: lead with what you can DO with it. The etymology hook ("Patens — Latin for open") is a memorable second-touch — don't waste the first sentence on it.

---

## The one-liner (pick one)

> **Browser-native type design. Open source. Sketch glyphs, kern them, ship OpenType.**

Variants:
- Type design that lives in a tab.
- Foundry-grade type design without leaving the browser.
- Sketch a glyph. Trace to Bézier. Ship an OTF. All in your browser, all open source.

---

## The etymology hook (for second-touch / about page / first reply when someone asks why "Patens")

> *Patens* is Latin for **lying open, accessible** — present participle of *patere* (to lie open). It's the etymological root of *patent*: the same word, before lawyers got to it. Open source positioning made explicit in the name.

---

## X / Bluesky launch thread (5 posts)

Bluesky's 256-char limit is roomier than X's 280; the same text fits both. Attach the OG card (`/og/brand`) to post 1.

**Post 1** — hook:
```
Patens — open-source type design that lives in a browser tab.

Draw glyphs with a pencil. Trace to Bézier. Kern them. Ship real OpenType. No installs, no sign-ups. Your projects stay in your browser.

patens.design
```

**Post 2** — the etymology (this is the line people remember):
```
The name: Patens is Latin for "lying open." It's the root of "patent" — the same word, before lawyers got to it. Open source, but louder.
```

**Post 3** — what the demo ships:
```
The demo project: 128 drawn glyphs across Latin upper/lower, digits, punctuation, currency, math + brackets. 17 Cyrillic + 14 Greek look-alikes (А В Е К М Н О Р С Т Х · Α Β Ε Ζ Η Ι Κ Μ Ν Ο Ρ Τ Υ Χ). Two masters via a slant axis. Six OpenType features live.
```

**Post 4** — the editor loop:
```
Editor loop is four moves:
1. Sketch with a pencil (pressure-sensitive)
2. Trace strokes → cubic Béziers (boolean union + Schneider fitting)
3. Edit nodes
4. Live @font-face preview, ~15ms per change

Plus 94-code audit with one-click fixes.
```

**Post 5** — share + close:
```
Every project gets a foundry-grade specimen page: pangram waterfall, reading specimens at three sizes, master compare, color palettes, glyph inspector with anchor viz, live OT feature toggles. Cmd+P → designer PDF.

MIT. SvelteKit. github.com/alevizio/patens
```

---

## Pinned X tweet (single, paste-ready)

```
Patens — open-source type design that lives in a browser tab.

Draw glyphs with a pencil, trace them to Bézier, kern them, ship real OpenType. No installs, no sign-ups. Latin for "lying open" — root of patent, before lawyers got there.

patens.design
```

(279 chars including the URL)

---

## Show HN

**Title:** Show HN: Patens – browser-native type design, open source (Latin for "open")

**Body:**

I built a type design environment that runs entirely in the browser. Sketch with a pencil (pressure-sensitive on iPad), trace strokes to cubic Bézier contours via boolean union + Schneider fitting, edit points, kern, ship OpenType. Every project lives in your browser's IndexedDB; nothing leaves your machine unless you choose to export (`.font.json`) or upload to the cloud-share path.

Live: https://patens.design  
Demo specimen: https://patens.design/share/demo  
Open the demo editor: https://patens.design/project/demo/edit

The name is Latin for *lying open / accessible* — etymologically the root of *patent*, used here for the opposite. Pronounced PAH-tens.

**What the demo ships:**
- 128 drawn glyphs across Latin upper/lower, digits, punctuation, currency, math, brackets
- 17 Cyrillic look-alikes (А В Е К М Н О Р С Т Х uppercase + а е о р с х lowercase) + bespoke Я Ж Ф
- 14 Greek look-alikes (Α Β Ε Ζ Η Ι Κ Μ Ν Ο Ρ Τ Υ Χ uppercase)
- Two masters (Regular + Italic via a slant axis with per-glyph deviation)
- Six OpenType features wired live (kern, liga, ss01, ss02, onum, case)
- Five composite ligatures (æ, œ, fi, fl, Á)
- Two CPAL palettes for color-font preview
- A populated brief — 6 design decisions with rationale, 5 references

**The spine of the app is the audit module.** 94 codes covering contour shape, vertical metrics, OpenType invariants, naming, brief completeness, multi-script coverage. Every code reaches five teaching surfaces (edit panel, audit page, release pre-flight, family hub, home page) through a single `describeAuditCode()` dictionary. Many issues have one-click "Fix" actions.

**Stack:** SvelteKit 2 + Svelte 5 runes, Tailwind v4, TypeScript strict. idb-keyval for project storage. opentype.js for OTF + WOFF2 export (in-browser). Pyodide + fontTools + ttfautohint for TTF export. HarfBuzz.js for the live OpenType preview. polygon-clipping for boolean ops. perfect-freehand for the sketch tool. satori + resvg-js for per-project OG images. Service worker for real offline. v1.5.2 includes:

- Full WCAG 2.0/2.1/2.2 A/AA test coverage via axe-core in Playwright
- Cold-load profiler (`pnpm profile`) with v1.5.2 baselines: home FCP 1057ms, editor 906ms, share 1356ms; 0 long tasks anywhere
- Token-based share auth: link-as-capability for reads, delete-token required for re-share + DELETE
- GitHub OAuth scaffold (env-gated)
- 2D variation explorer in the designspace tab
- Family-wide kerning resolution
- AI presets via user-provided Anthropic key (no shared cost surface)

MIT licensed. The repo has CONTRIBUTING, SECURITY, ROADMAP, and a one-page architecture doc:  
https://github.com/alevizio/patens

I'd particularly love feedback on:
1. The audit panel — does the explanation copy land for non-type designers?
2. The share specimen — does it feel like a real foundry artifact, or like a generated PDF?

Happy to answer anything.

---

## Reddit r/typography draft

**Title:** I built a type design environment that runs entirely in the browser — and made it open source

I've been working on Patens for a while. It's a sketch-first editor where you draw glyphs with a pencil (pressure-sensitive on iPad), trace your strokes to vector outlines, then ship OpenType — without installing anything. Open source under MIT.

The demo project ships a 128-glyph geometric sans plus partial Cyrillic + Greek coverage (look-alike letters reuse Latin builders where the shape is identical in a geometric sans; Я Ж Ф are bespoke). Two masters via a slant axis. Six OpenType features wired live. Real ligature substitutions (fi, fl, Á composite). It reads like an actual WIP type project — populated brief, decision journal, audit panel that flags 94+ kinds of issue with one-click fixes for the fixable ones.

The name Patens is Latin for *lying open* — the root of *patent*, used here for the opposite. Open source positioning in the name itself.

Try it: https://patens.design  
Demo specimen: https://patens.design/share/demo  
Source: https://github.com/alevizio/patens

Would love to hear what's missing, what's broken, what feels off. The audit panel especially — does the explanation copy land for non-type designers?

---

## Designer-friend DM (text-message friendly)

```
hey — finally shipped the type editor thing. it's at patens.design (open on desktop). there's an "example project" button on the home page that drops you into a 128-glyph WIP sans. click a glyph, edit it, hit cmd+p from the share view for a specimen PDF. open source so go nuts. name is latin for "open"
```

---

## Email pitch (warm intro)

**Subject:** A type editor that runs in the browser — would love your eye

[Name],

I just shipped Patens — a type design environment that runs entirely in the browser, no installs. The name is Latin for *lying open*, which fits the open-source positioning.

Link: https://patens.design

The demo project (https://patens.design/share/demo) is the easiest entry point — a 128-glyph geometric sans I built to exercise every feature in the editor.

If you have 10 minutes, the path I'd suggest:
1. Open the share view above
2. Click "Try it" and type a real word
3. Switch the master to Italic (slant axis)
4. Click any glyph to inspect — anchors, sidebearings, metric guides all visible
5. Hit Cmd+P for the specimen PDF

I'm looking for two specific kinds of feedback:
1. **What's confusing.** Where do you get stuck or lose the thread?
2. **What's missing.** What would you reach for that isn't there?

Source: https://github.com/alevizio/patens (MIT)

Thanks for any time you can give it.

---

## Anti-patterns to avoid

- **Don't lead with "AI-powered" or "the future of."** Designers tune those out instantly. Patens has AI presets, but they're a side door, not the front.
- **Don't compare to Glyphs / FontLab head-on.** Patens isn't trying to replace them. Direct comparison invites the wrong evaluation ("but it doesn't have X feature from FontLab 8...").
- **Don't say "no code required."** Designers don't think they need code; the phrase implies they do.
- **Don't say "designed for designers."** Circular. Show, don't tell.
- **Don't oversell the multi-master story.** The Italic is a slant axis with per-glyph deviation, not a hand-drawn italic master. Be honest about scope — it's on the roadmap, not shipping.
- **Don't pronounce it for people in writing.** "Pronounced PAH-tens" reads as defensive. Let X-mention pronunciation explain itself naturally in replies.
- **Don't oversell the AI features.** They're user-key-gated, so most visitors won't experience them. Lead with the deterministic features (sketch → vector, audit, OpenType export); AI is a footnote.
