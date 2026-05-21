# Next 90 days — improvement plan

Synthesises the five research arcs run in this session (2026-05-20→21)
into a single prioritised sequence. Read alongside
[`roadmap.md`](./roadmap.md) for inventory + per-arc detail.

The principle: **finish what's started before opening new fronts**.
Three of the five arcs already have shipped code on `main`; the
remaining two have ship-ready M1 plans. Sequence below front-loads
the work with the highest impact-per-day and the lowest first-time
risk.

---

## State of each arc as of 2026-05-21

| Arc | Status | Effort to next milestone |
| --- | --- | --- |
| **TT auto-hinting** | Phase 1 shipped (UI + Cu2Qu OTF→TTF + server route + gasp + range presets). Production deploy gated on ops decision. | **1–3 hours** of ops work + binary deploy |
| **Color fonts (COLR v0)** | M1 days 1–5 shipped (types / store / render-plan / binary writers / SFNT splice). | **~2 weeks** to close M1 (layer-glyph construction + UI + round-trip) |
| **Auto-kerning** | M1 closed in full — 4 algorithm modules + 5 review panels + quality harness + ~45 unit tests. | **1 week** to wire real Inter corpus into the quality gate |
| **OT layout depth** | Researched. opentype.js exposes `addSingle/addAlternate/addMultiple` for any feature tag (load-bearing finding). | **9.5 dev-days** for M1 |
| **CRDT collab** | Researched. Yjs + PartyKit picked; hybrid model recommended; ICP-mismatch flagged. | **5–7 weeks** for Option D→B (internal Yjs refactor + read-only share links) |

---

## The plan — three phases, ~13 weeks total

### Phase A (weeks 1–3) — finish what's started

**Why first:** every one of these is high-confidence, low-risk work
that lands a feature that's already 80–95 % done. Best ratio of
"polished thing on the user's screen" to "engineering hours."

#### A1. Hinting Phase 1b — production deploy (1–3 hours, ops decision)

Pick one of the three options in [`auto-hinting.md`](./auto-hinting.md):

- **(a) bundle Linux binary in repo** — fastest, ~3 MB to git
- **(b) Python serverless via `ttfautohint-py`** — no binary in git, mixes runtimes
- **(c) separate Fly.io worker** — cleanest separation, more moving parts

**Recommended: (b)** for the indie scale — `ttfautohint-py` (PyPI,
August 2024 release) ships the binary inside the wheel, Vercel
supports Python runtimes out of the box, no git-binary smell. Migrate
to (c) only if hinting load grows enough to want isolation.

#### A2. Color-fonts M1 days 6–10 (~2 weeks)

The remaining algorithmic + UI work:

1. **Layer-glyph construction in export pipeline** (3 d). Turn each
   `ColorLayer.contours` into a synthetic opentype.js Glyph appended
   to the font's glyf table. Returns `{ syntheticGlyphs[], baseGlyphRecords[] }`
   that the existing `applyColorFontTables` consumes.
2. **CPAL palette editor UI** (2 d). New panel on the Edit tab right
   sidebar: list of palettes (default / light / dark), per-cell
   colour picker (use existing `hexToRgba` / `rgbaToCss`), add /
   remove / rename palette controls. Resize-all-palettes button
   surfaces the CPAL same-length invariant.
3. **Layer panel** (3 d). Per-glyph stack of `ColorLayer`s — drag
   to reorder, visibility toggle, palette-index picker (drop-down
   that previews the actual swatches), add layer → opens the existing
   contour editor scoped to the new layer.
4. **Canvas2D preview** (1 d). Wire `planColorRender` +
   `applyColorRenderToCanvas` into the glyph editor — when a glyph
   has color layers, show the composite instead of monochrome.
5. **Twemoji-shape round-trip test** (2 d). Fetch a small Twemoji
   subset (Apache-2.0), import it into a Font Studio project,
   export, verify Chromium renders our COLR table identically. Save
   as a vitest+playwright fixture.

Closes color-fonts M1. Users can ship layered color fonts.

#### A3. Auto-kerning Inter corpus integration (1 week)

The auto-kern quality harness ships with synthetic test data;
gating regressions in CI requires a real Inter corpus.

1. **Fixture script** (2 d). Node script that processes Inter's UFO
   (cloned at build time, not committed) into `kerning-quality-inter.json`:
   silhouettes + advance widths for ~80 representative glyphs + Inter's
   shipped kerning for the top-200 Latin pairs. JSON ≤ 100 KB,
   committed.
2. **CI test** (1 d). New vitest test loads the fixture, runs
   `evaluateKerningSuggester`, gates `mae ≤ 20 % of mean(|expected|)`
   per the research target.
3. **Quality-score UI surface** (2 d). On the Spacing tab, "Quality
   score" badge: when the user applies auto-kern suggestions, show
   "MAE vs Inter reference: N fu" so they have a sense of how their
   kerning compares to a foundry's. Memoised; doesn't recompute
   every keystroke.

Wraps the auto-kerning milestone-1 from a *built* to a *gated* state.

---

### Phase B (weeks 4–5) — OT layout depth M1

Highest leverage per day of any remaining work. Closes the biggest
"Glyphs / FontLab have it, browser editors don't" gap for daily-use
Latin. Plan detailed in [roadmap §11](./roadmap.md).

**Critical day-1 task: smoke-test opentype.js's non-`liga` write paths**
before committing the 9-day plan. Round-trip `salt`+`smcp` through
`font.substitution.addSingle` / `addAlternate` → save → reparse → verify
HarfBuzzJS shapes correctly. If the API has bugs for tags other than
`liga`/`rlig`, we discover them on day 1, not day 9.

**Stretch goal at the end of M1:** Arabic positional forms
(`init`/`medi`/`fina`/`isol`) via the same suffix detector. Mechanical
add given the underlying machinery. Opens an entire script.

---

### Phase C (weeks 6–13) — CRDT collab Option D→B

Five to seven weeks for the **internal Yjs refactor + read-only
share links** combo. Recommended single deliverable per CRDT research
section 8: gets the engineering investment AND a shippable marketing
win in one go, without committing to full multiplayer before
validating demand.

Pick **Yjs + PartyKit on Cloudflare Workers**. Bezier-contour model
is server-authoritative LWW per-property (Figma's pattern); Y.Text
for notes / `.fea` / brief / design-notes; Y.Map / Y.Array for the
structured collections (kerning, palettes, instances).

Auth: **Supabase magic links + JWT bridge to PartyKit**. Anonymous
share-link tokens for the read-only viewer pattern.

**Pre-work week (week 6) before the 5–7 implementation weeks:**

- 2-day prototype spike on the bezier-contour conflict model.
  Decide LWW-per-property vs per-glyph soft-lock before week 7.
- 1-day cost-modelling spike on PartyKit / Cloudflare unit
  economics at projected scale.

If the prototype week surfaces a blocker, regroup before committing
to the full 5–7 weeks.

---

## Calendar view (cumulative weeks from start)

```
Week 1:  ████ A1 hinting deploy
Week 2:  ██████████████ A2 color-fonts M1 closure (start)
Week 3:  ██████████████ A2 color-fonts M1 closure (finish)
Week 4:  ██████████ A3 Inter corpus
Week 5:  ████████ B  OT layout M1 (start)
Week 6:  ████████ B  OT layout M1 (finish) + C pre-work spikes
Week 7:  ██████████████████ C  Yjs refactor (start)
Week 8:  ██████████████████ C  Yjs refactor
Week 9:  ██████████████████ C  Yjs refactor
Week 10: ██████████████████ C  Yjs refactor (finish)
Week 11: ████████ C  Share-link feature
Week 12: ████████ C  Share-link feature + polish
Week 13: ████████ C  Closed beta + iteration
```

(Weeks 5–6 overlap intentionally — B's M1 and C's pre-work are
non-conflicting because the Yjs refactor doesn't touch the
spacing / kerning / features modules.)

---

## What's intentionally NOT in the plan

These appear in [`roadmap.md`](./roadmap.md) but don't make the
90-day cut:

- **Color-fonts M2** (COLR v1 gradients + paint trees) — defer until
  M1 ships and we have a real designer-feedback signal.
- **CRDT M2** (full read-write multiplayer) — same logic, gate on M1
  share-link adoption.
- **Manual TT hint editor** — niche; auto-hinting covers ~95 % of
  real shipping fonts.
- **WebGPU + MSDF preview** — performance polish without a measured
  pain point; revisit when the canvas feels slow.
- **CFF subroutinization** — flagged earlier but `cffsubr` doesn't
  load in Pyodide; needs a different approach. Park.
- **CFF/PostScript hinting** (`otfautohint`) — for users shipping OTF;
  lower priority than TTF hinting which we already have.
- **Devanagari / CJK shaping** — multi-month engine work; out of
  scope for the 90 days.

---

## How to use this plan

- **If you have one week**: do Phase A1 (hinting deploy). One
  decision, one afternoon, finishes a half-done feature.
- **If you have one month**: complete Phase A end-to-end. By end of
  the month, color fonts work, hinting ships in production, auto-kern
  has a real quality gate.
- **If you have three months**: the whole plan. By end, Font Studio
  is a credible Glyphs / FontLab alternative for solo type designers,
  AND has the "share your font WIP like a Figma link" headline.

Pick the slice that matches the calendar. Don't take items out of
order without flagging the trade-offs — each phase de-risks the
next.

---

## Open questions for the user

These need your input before Phase A starts:

1. **Hinting deploy target** — option (a), (b), or (c)? (Default
   recommendation: (b) Python serverless via `ttfautohint-py`.)
2. **Auth provider for Phase C** — Supabase, Clerk, or build-our-own
   on top of magic links? (Default: Supabase — free tier covers
   indie usage; magic-link UI is built-in.)
3. **Twemoji licensing comfort** — Apache 2.0 is permissive but the
   Twemoji name is Twitter-trademarked. The Phase A2 round-trip test
   uses Twemoji *shapes* without the name. Acceptable, or use Noto
   Color Emoji instead?
4. **ICP confirmation for Phase C** — research flagged that collab
   sells to teams, but Font Studio's stated ICP is solo designers.
   Is the share-link feature the right framing, or does the foundry-
   tier pricing strategy need to evolve first?
