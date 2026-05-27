# Launch copy

Drafts. Edit before posting. The goal across every surface: **lead with audit-as-teaching** — the one thing no other type editor has. The etymology hook ("Patens — Latin for open") is a memorable second-touch. The browser-native + open-source positioning is third-touch context, not the headline.

---

## The one-liner (pick one)

> **A type design tool that teaches as you draw. 94 audit codes, one-click fixes, real OpenType — open source, in your browser.**

Variants:
- Patens — type design that teaches. Draw, trace, audit, ship OpenType — in your browser.
- Open-source type design with a 94-code teaching audit. Browser-native, MIT.
- A type design tool where the audit module *is* the teacher. Sketch, trace, ship OpenType.

---

## The etymology hook (for second-touch / about page / first reply when someone asks why "Patens")

> *Patens* is Latin for **lying open, accessible** — present participle of *patere* (to lie open). It's the etymological root of *patent*: the same word, before lawyers got to it. Open source positioning made explicit in the name.

---

## X / Bluesky launch thread (5 posts)

Bluesky's 256-char limit is roomier than X's 280; the same text fits both. Attach the OG card (`/og/brand`) to post 1.

**Post 1** — hook (audit-led):
```
Patens — a type design tool that teaches as you draw.

Sketch glyphs with a pencil, trace to Bézier, audit your work against 94 type-design rules with plain-English fixes, ship real OpenType. Open source, MIT, lives in your browser.

patens.design
```

**Post 2** — the etymology (this is the line people remember):
```
The name: Patens is Latin for "lying open." It's the root of "patent" — the same word, before lawyers got to it. Open source positioning baked into the name.
```

**Post 3** — what the demo ships:
```
The demo project: 162 drawn glyphs across Latin (uppercase + lowercase + digits + punctuation + currency + math), 17 Cyrillic look-alikes + bespoke Я Ж Ф, and 14 Greek uppercase. Two masters via slant axis. Six OpenType features live. CPAL palette switching.
```

**Post 4** — the audit module is the spine:
```
The 94-code audit module is the differentiator. Every glyph, every metric, every kern pair gets checked: "sidebearings drift across the stem class" or "this contour winds wrong for OpenType." With the rule, the why, and a one-click fix where one exists.

Audit-as-teaching, not audit-as-lint.
```

**Post 5** — share + close:
```
Every project gets a foundry-grade specimen page: pangram waterfall, reading specimens at three sizes, master compare, color palettes, glyph inspector with anchor viz, live OT feature toggles. Cmd+P → designer PDF.

MIT. SvelteKit. github.com/alevizio/patens
```

---

## Pinned X tweet (single, paste-ready)

```
Patens — a type design tool that teaches as you draw.

Sketch glyphs, trace to Bézier, audit your work against 94 type-design rules with plain-English fixes, ship real OpenType. Open source, MIT, in your browser. Latin for "lying open."

patens.design
```

(278 chars including the URL)

---

## Show HN

**Title:** Show HN: Patens – a type design tool with a 94-code audit that teaches as you draw (MIT)

**Body:**

I built a type design environment that runs entirely in the browser, with one twist that makes it different from the other 4–5 browser-based type editors: **the audit module is a first-class citizen of the editor, not an afterthought**. Every glyph, every metric, every kern pair gets checked against ~94 type-design rules — and every code carries plain-English teaching prose, often with a one-click fix.

Sketch with a pencil (pressure-sensitive on iPad), trace strokes to cubic Bézier contours via boolean union + Schneider fitting, edit points, kern, ship OpenType. Every project lives in your browser's IndexedDB; nothing leaves your machine unless you choose to export (`.font.json`) or upload to the cloud-share path.

Live: https://patens.design  
Demo specimen: https://patens.design/share/demo  
Open the demo editor: https://patens.design/project/demo/edit

The name is Latin for *lying open / accessible* — etymologically the root of *patent*, used here for the opposite. Pronounced PAH-tens.

**The audit module — the headline:**

- 94 codes covering contour shape, vertical metrics, OpenType invariants, brief completeness, multi-script coverage, kerning classes, anchor naming, designspace orphans.
- Every code reaches five teaching surfaces (edit panel, audit page, release pre-flight, family hub, home page) through a single `describeAuditCode()` dictionary.
- ~30 codes have one-click "Fix" actions (sidebearing nudges, kern-class adjustments, contour reversal, name normalization).
- Also shipped as a CLI: `npx patens audit my.font.json` — same engine, terminal output, JSON / GitHub Actions formats. Drop-in CI lint.

**What the demo project ships:**

- 162 drawn glyphs across Latin (uppercase + lowercase, digits, punctuation, currency, math, brackets, composite ligatures), 17 Cyrillic look-alikes reusing Latin builders + bespoke Я Ж Ф, and 14 Greek uppercase look-alikes
- Two masters (Regular + Italic via a slant axis with per-glyph deviation)
- Six OpenType features wired live (kern, liga, ss01, ss02, onum, case)
- Two CPAL palettes for color-font preview
- A populated brief — design decisions with rationale + references

**Stack:** SvelteKit 2 + Svelte 5 runes, Tailwind v4, TypeScript strict. idb-keyval for project storage. opentype.js for OTF + WOFF2 export (in-browser). Pyodide + fontTools + ttfautohint for TTF export. HarfBuzz.js for the live OpenType preview. polygon-clipping for boolean ops. perfect-freehand for the sketch tool. satori + resvg-js for per-project OG images. Service worker for real offline.

**v1.6.0 (current line) includes:**

- Full WCAG 2.0/2.1/2.2 A/AA test coverage via axe-core in Playwright across 31 routes
- Editor cold-load down 17.9% via lazy-mount of dialogs + sidebar panels
- Token-based share auth: link-as-capability for reads, delete-token required for re-share + DELETE
- GitHub OAuth scaffold (env-gated)
- 2D variation explorer in the designspace tab
- Family-wide kerning resolution
- 10 Architecture Decision Records explaining the load-bearing choices
- AI presets via user-provided Anthropic key (no shared cost surface — opt-in side door, not the front)

MIT licensed. The repo has CONTRIBUTING, SECURITY, ROADMAP, AGENTS.md (for AI-assisted contributors), and a six-layer architecture doc:  
https://github.com/alevizio/patens

I'd particularly love feedback on:
1. The audit panel — does the teaching copy on each code land for non-type designers?
2. The share specimen — does it feel like a real foundry artifact?
3. The audit CLI — would you drop it into your CI?

Happy to answer anything. (This is a solo MIT project; no paywall on the editor, ever — see DESIGN_PHILOSOPHY.md.)

---

## Reddit r/typography draft

**Title:** I built a type design environment with a 94-code audit module that teaches as you draw — open source

I've been working on Patens for a while. It's a sketch-first editor where you draw glyphs with a pencil (pressure-sensitive on iPad), trace your strokes to vector outlines, audit the result against the rules type designers internalize through years of mentorship, then ship OpenType — all without installing anything. Open source under MIT.

The differentiator is the **audit module**. 94 codes covering contour shape, sidebearing classes, vertical metrics, OpenType invariants, multi-script coverage. Every code includes plain-English teaching prose — *why* the rule exists, what visual symptom it produces — and many include one-click fixes. It's the teacher I wish I'd had when I started.

The demo project ships a 162-glyph geometric sans across three scripts (Latin uppercase + lowercase + digits + punctuation + currency + math + brackets, 17 Cyrillic look-alikes reusing Latin builders + bespoke Я Ж Ф, 14 Greek uppercase look-alikes). Two masters via a slant axis. Six OpenType features wired live. Real ligature substitutions (fi, fl, Á composite). Reads like an actual WIP type project — populated brief, decision journal, audit panel.

The name Patens is Latin for *lying open* — the root of *patent*, used here for the opposite. Open source positioning in the name itself.

Try it: https://patens.design  
Demo specimen: https://patens.design/share/demo  
Source: https://github.com/alevizio/patens

Would love to hear what's missing, what's broken, what feels off. The audit panel especially — does the teaching copy land for working type designers? Does it sound right, or does it read like a non-designer wrote it?

---

## Designer-friend DM (text-message friendly)

```
hey — finally shipped the type editor thing. it's at patens.design (open on desktop). there's an "example project" button on the home page that drops you into a 162-glyph WIP sans across latin + cyrillic + greek. click a glyph, edit it, open the audit panel and see if the teaching copy lands for you — that's the bit i'm most curious about. hit cmd+p from the share view for a specimen PDF. open source. name is latin for "open"
```

---

## Email pitch (warm intro)

**Subject:** A type editor with a 94-code teaching audit — would love your eye

[Name],

I just shipped Patens — a type design environment with a 94-code audit module that teaches as you draw. Runs entirely in the browser, no installs. The name is Latin for *lying open*, which fits the open-source positioning.

Link: https://patens.design

The demo project (https://patens.design/share/demo) is the easiest entry point — a 162-glyph geometric sans across Latin + Cyrillic + Greek that I built to exercise every feature in the editor.

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

- **Don't lead with "AI-powered" or "the future of."** Designers tune those out instantly. Patens has AI presets, but they're a user-key-gated side door, not the front.
- **Don't lead with "browser-native" as the headline.** It's true and important context, but it doesn't differentiate — Glyphr Studio, Fontra, typlr.app, FontStruct are all browser-native too. The audit-as-teaching framing is what nobody else has.
- **Don't lead with "sketch glyphs with a pencil"** either — same reason, all browser editors have a sketch input. The audit is the lever.
- **Don't compare to Glyphs / FontLab head-on.** Patens isn't trying to replace them. Direct comparison invites the wrong evaluation ("but it doesn't have X feature from FontLab 8...").
- **Don't say "no code required."** Designers don't think they need code; the phrase implies they do.
- **Don't say "designed for designers."** Circular. Show, don't tell.
- **Don't oversell the multi-master story.** The Italic is a slant axis with per-glyph deviation, not a hand-drawn italic master. Be honest about scope — it's on the roadmap, not shipping.
- **Don't pronounce it for people in writing.** "Pronounced PAH-tens" reads as defensive. Let X-mention pronunciation explain itself naturally in replies.
- **Don't oversell the AI features.** They're user-key-gated, so most visitors won't experience them. Lead with the deterministic features (audit teaching + sketch → vector + OpenType export); AI is a footnote in everything except the privacy doc (where it must be explicit).

---

## TypeDrawers introduction thread

TypeDrawers is the type-design community centroid (Shift, Fontra, et al. were introduced here). Strict mods + sharp readers — don't post until v1.6 has the audit module polished and demo project ready.

**Forum category**: Open Source

**Title**: `Patens — browser-native open-source type design tool with a 94-rule audit module`

**Body**:

```
Hello TypeDrawers,

I've been building a browser-native type design tool called Patens
(Latin for "lying open", root of "patent"). Source on GitHub at
github.com/alevizio/patens (MIT), live at patens.design.

The differentiator I'd like feedback on is the audit module. Every
contour, metric, kerning pair, and OpenType invariant gets checked
against 94 type-design rules — each explained in plain English, with
one-click Fix on ~30 of them. Each rule has its own page at
patens.design/audit/[code] — they grew out of realising that the only
place on the open web where you can find plain-English explanations
of rules like "contour-winding-collision" or "anchor-naming-mark-no-
prefix" is inside Glyphs's tooltips. Now they're a public reference.

The demo project ships 162 drawn glyphs across Latin / Cyrillic /
Greek. patens.design/project/demo/edit to fiddle. The audit also
distributes as a CLI (`npx patens audit my.font.json`) for CI lint.

Explicitly NOT positioning Patens as a Glyphs/FontLab replacement —
those tools are deeper, faster, built for professionals shipping
commercial families. Patens is for designers between sketches and
shipping: when you've drawn a logo and want a full font from it,
when you're learning type design and need an editor that explains
its warnings, when you want to share a specimen without making
someone install software.

Looking for feedback on:
1. Rules I'm missing — particularly advanced typographic-detail
   ones (cursive joins, ink-traps, optical correction at small sizes).
2. Auto-fix actions — which feel reliable vs which feel like
   they'd make wrong calls?
3. The Brief feature — useful start-of-project structure or
   just overhead?
4. The CLI audit's output format — useful for CI lint, or
   integration patterns I'm not seeing?

Roadmap at github.com/alevizio/patens/blob/main/ROADMAP.md.

— Alejandro
```

**Tips**:
- Reply patiently + concretely. TypeDrawers values precision.
- Don't dodge criticism with feature-roadmap promises. Acknowledge limitations honestly.
- Link rule pages (patens.design/audit/<code>) when conversation lands on a specific topic.
- Cross-post screenshots — visual evidence carries weight.

---

## dev.to / Hashnode cross-posts (3 articles)

dev.to + Hashnode heavily weighted in LLM training corpora. **Always** set `rel=canonical` to patens.design so Google doesn't penalise duplicate content.

### Article 1 — "I built a font editor in SvelteKit 2 — what I learned"

**Angle**: technical / framework. SvelteKit audience, not typography.

**Outline**:
1. Hook — 162 glyphs, 94 audit rules, 0 servers, 9 months in SvelteKit 2 + Svelte 5.
2. State model: `$state` proxies + JSON-deep-clone is load-bearing (structuredClone surprise).
3. Yjs CRDT for real-time multiplayer kerning. PartyKit + Yjs for this.
4. Web Worker for audit module — monotonic-seq trick to skip stale results.
5. Pyodide in browser for ttfautohint (C in browser, ~25MB, lazy).
6. SSR=true at root + per-route `ssr=false` opt-outs for IndexedDB routes.
7. Bundle: 3180 KB client under 5120 KB cap. How: per-route manualChunks, conditional HarfBuzz/Pyodide, lazy-mounted sidebar panels.
8. Wrap: source on GitHub, MIT.

**Canonical**: `https://patens.design/` (or a dedicated dev-blog page if you have one)

### Article 2 — "94 rules of type design, explained"

**Angle**: typography-educational. The most evergreen of the three.

**Outline**:
1. Hook — I shipped a font editor that's also a type-design tutor. Here are the 94 rules.
2. Why these matter — Glyphs/FontLab hide them in tooltips; here they're public.
3. Walk the categories (Contour shape, Metric alignment, Variable-font compatibility, Anchor naming, Vertical metrics, Kerning, etc.).
4. Per category, 1-2 rules that catch beginners. Canvas screenshots.
5. Auto-fix philosophy: 30 deterministic, 64 detection-only (designer judgment).
6. Catalogue is live at patens.design/audit/[code].

**Canonical**: `https://patens.design/learn/audit-codes`

### Article 3 — "Why type-design tools should be browser-native"

**Angle**: opinion. Most viral of the three.

**Outline**:
1. Hook — Glyphs $300, FontLab $469, RoboFont $580. Barrier to learning isn't talent — it's price of admission.
2. "But pro tools are deep" — agreed. Point isn't replacement; it's that browser-native should be the on-ramp.
3. Browser-native specifics: no install/account, IndexedDB persistence, service worker offline, capability-token cloud share.
4. Teaching angle: rule pages, not tooltips.
5. Open-source angle: MIT, no paywall on core editor ever. Cite FUNDING.yml + ROADMAP commitment.
6. Wrap: this is what I wanted when I was learning. Free. Use, contribute, or don't.

**Canonical**: `https://patens.design/about`

---

## Typographica / I Love Typography pitch (gatekept publications)

Highest-authority type-design publications. Don't pitch as review — pitch a contribution that USES Patens as case study. Wikipedia notability unlocks downstream.

### Email to Stephen Coles (Typographica)

**Subject**: `Case study: open-source type design tools in 2026`

```
Hi Stephen,

I've been a Typographica reader since the Avenir 95 retrospective and
appreciate the long-form approach — particularly the Foundry profiles
+ "Our Favorite Typefaces of YYYY" round-ups.

Reaching out because I built something I think might fit a case study
or essay: Patens, a browser-native, open-source type design tool
(patens.design). It's not a foundry release — it's an editor, MIT-
licensed. The angle that might interest you isn't "another font editor
exists" but the role of explanation in type-design tooling: Patens
audits every contour, metric, and OpenType invariant against 94 rules,
each explained in plain English. The closest analogue is Lucas de
Groot's lectures, except built into the editor.

This connects to a broader thesis: most type-design knowledge sits in
tribal-knowledge places (Glyphs tooltips, RoboFont Slack, TypeDrawers
threads). Surfacing it explicitly — and making it browser-native and
free — might lower the barrier enough that the next generation has a
different on-ramp than "buy Glyphs at 17."

I'd be open to:
1. Guest essay on the explanation-as-tooling thesis, Patens as the
   concrete example.
2. Case study / profile (interview, screenshots, sample run).
3. Just an introduction — publish only if interesting.

Repo: github.com/alevizio/patens. Roadmap + brief + audit catalogue
(patens.design/learn/audit-codes) all read as positioning.

No deadline pressure — happy to wait for an opening on your editorial
calendar.

Best,
Alejandro Vizio
patens.design · alevizio on GitHub
```

### Email to John Boardley (I Love Typography)

Same body, adjusted for ILT's more visual/historical editorial — emphasise the live editor + demo project as "come look at this" rather than essay-pitch.

**Tips**:
- Don't pitch "a review of Patens." Pitch a contribution that uses Patens as case study.
- Don't follow up within 2 weeks. Chasing kills the shot.
- Demo polished, hero crisp, /audit pages indexable before pitching. 60-second judgment.

---

## Cross-channel timing strategy

Order for maximum velocity into the v1.6 launch:

| Day | Channel | Why first |
|---|---|---|
| Week -2 | dev.to article 1 (SvelteKit-technical) | Catches framework audience early; builds initial star momentum |
| Week -1 | TypeDrawers introduction | Gives community a week to discover/form opinions before broader launch |
| Day 0 (Tue/Wed/Thu, 8-10am PT) | Show HN — audit-module angle. dev.to article 2 ("94 rules…") same day, linked from top-comment | Show HN is highest single-event LLM-citation driver; CC re-scrapes within days |
| Day +2 | Reddit r/typography — polished GIF of audit catching a real issue | Reddit deal with Google + CC inclusion |
| Day +5 | dev.to article 3 ("Why browser-native") — the opinion piece | Viral if launch worked |
| Week +2 | Typographica + ILT pitches | Don't pitch DURING launch — they hate momentum-chasers |

3 weeks total. Don't compress — each surface needs the others to have happened for the citation graph to form.
