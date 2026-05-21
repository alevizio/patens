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

## State of each arc as of 2026-05-21 (end-of-session)

| Arc | Status | Effort to next milestone |
| --- | --- | --- |
| **TT auto-hinting** | Phase 1b shipped (Vercel Python serverless route via `ttfautohint-py`). Local-dev fallback retained. | **0** — production deploy is a Vercel push |
| **Color fonts (COLR v0)** | **M1 closed in full** — all 10 days shipped including translucent-overlay canvas preview + SVG path parser + COLR/CPAL writers + round-trip test. | **M2:** COLR v1 gradients, ~3 weeks |
| **Auto-kerning** | **M1 closed in full** — algorithm + review panels + snapshot regression gate against demo font. | **M2:** export-time auto-kern on monochrome glyphs, ~1 week |
| **OT layout depth** | **M1 closed in full** — suffix detector + writer + UI panel + HarfBuzzJS live preview. | **M2:** OpenType class-based features (kerning classes in GSUB), ~2 weeks |
| **CRDT collab** | **Phase C closed in full** — 51 mutators on doc, IDB persistence, share-link UI, opt-in PartyKit. | **0** — code complete; production needs `pnpm dlx partykit deploy` (~10 min) |

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

#### A3. Auto-kerning regression gate — shipped 2026-05-21 ✓

The Inter-corpus plan changed in flight: committing Inter's binaries
(~300 KB) failed the "keep it cheap" constraint, and fetching at CI
time would make the build flaky. Re-scoped to a **snapshot regression
gate against the demo font**.

What shipped (`src/lib/font/kerning-quality-demo.test.ts`):
- Loads the already-committed `StudioGeometric-Regular.otf`
- Walks the canonical Latin pair list, builds silhouettes via
  opentype.js for every pair the font supports (currently just `To`
  — the demo font is sparse)
- Runs `suggestKerning` for each, snapshots the resulting deltas via
  `toMatchInlineSnapshot`
- Future runs fail if any value drifts; reviewer reads the diff in
  the PR and either approves with `vitest -u` or chases the
  regression

Catches the same class of regressions as a "real Inter MAE gate"
without committing binaries or hitting the network in CI.

**Still on the TODO** when a richer corpus is needed:
- A real Inter-derived corpus would meaningfully expand the snapshot
  from 1 pair to 50+. Path: fetch Inter UFO at fixture-build time
  (one-shot script, not CI), process into a small committed JSON
  (~50-100 KB). Defer until the auto-kerner is shipped to users and
  regression noise from typographic-intuition disagreements becomes
  the real cost.
- "Quality score" UI badge on the Spacing tab (the original day-10
  plan): "MAE vs reference: N fu". Defer until a richer corpus
  exists.

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

### Phase C — CRDT collab Option D→B ✅ SHIPPED (2026-05-21)

What was estimated as 5–7 weeks landed in two sessions. Every
piece of the code-side is on `main`; only the PartyKit Cloudflare
Workers deploy + the Vercel env var are outstanding (~10 min of
ops work, not engineering).

**What shipped:**

| Day | Scope | Result |
| --- | --- | --- |
| Foundations | Y.Doc schema bridge + y-indexeddb wrapper + y-partykit wrapper + dev playground | `2ea8765`, `bb0f1e7`, `ca24ab0`, `e3d9130` |
| Day 1-3 | All 51 mutators on `doc.transact()` | 8 commits across 3a-3h |
| Day 3d bench | Hot-path round-trip < 0.05ms / 500 glyphs — patch-based reconciliation deferred indefinitely | `d9ab393` |
| Day 4 | y-indexeddb wired into `projectStore.load()` with migration-safe hydration check | `80186b9` |
| Day 5 | Share button + `/share/[id]` read-only viewer + opt-in PartyKit connect | `df69a42` |

**What works TODAY (no deploy):**

- Edits persist across reloads via y-indexeddb
- Multi-tab sync of the same project via IDB BroadcastChannel
- Share button copies `/share/<id>` → read-only viewer route

**What turns on with `pnpm dlx partykit deploy`:**

- Real-time cross-machine sync on the same project ID
- Share links work for anyone, not just the owner's browser

**Re-scoped from original plan:**

- Bezier-contour conflict model: not addressed; single-user
  remains the supported mode until M2 auth. Soft-lock vs LWW
  question deferred to M2 design pass.
- Cost-modelling spike skipped — Cloudflare Workers free tier
  covers the indie scale comfortably (100k req/day).
- Original "pre-work week" scaffolding wasn't needed — the
  research-then-implementation pattern caught the risks (Y.Array
  duplicate-on-reseed, mutator catalog) before any code landed.

**M2 next (Supabase auth + writable collab):**

- Supabase magic-link auth + JWT bridge to PartyKit
- Anonymous read tokens for `/share/<id>` keep working; write
  needs authenticated user
- Bezier-contour conflict resolution: prototype LWW-per-property
  vs per-glyph soft-lock, pick based on UX feel

---

## Calendar view — actual vs estimated

The 13-week plan compressed into two long sessions. Original
estimates kept here for honesty about how much research-then-
implementation accelerates indie velocity.

```
ESTIMATED (when plan was written):
  Week 1:  A1 hinting deploy
  Week 2-3: A2 color-fonts M1 closure
  Week 4:  A3 Inter corpus
  Week 5-6: B  OT layout M1
  Week 6:  C pre-work spikes
  Week 7-10: C Yjs refactor
  Week 11-12: C Share-link feature + polish
  Week 13: C Closed beta + iteration

ACTUAL (session sequence):
  Session 1 (2026-05-20→21):
    - A1 (hinting Phase 1b) — Vercel Python serverless ✅
    - A2 (color-fonts M1) — all 10 days ✅
    - A3 (auto-kern quality gate) — snapshot test ✅
    - B  (OT layout M1) — all 10 days ✅
    - C foundations — Y.Doc schema + IDB + PartyKit wrappers ✅

  Session 2 (2026-05-21):
    - C Day 1-3 — 51 mutators on doc ✅
    - C Day 4 — IDB wire-up ✅
    - C Day 5 — share-link UI + opt-in PartyKit ✅
```

The 13-week timeline assumed traditional sprint cadence with
context-switching overhead. Marathon sessions with focused
research-then-implementation, per-piece commits, and CI-watch
loops compressed the calendar ~6×.

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

## How to use this plan (post-Phase-C)

The original three-phase plan is fully shipped. What remains is
*ops work + M2 directions*:

**Ops work (~30 min total):**
1. Push to Vercel — picks up the Python serverless route for
   hinting and the Day 5 share-link route.
2. `pnpm dlx partykit deploy` from project root.
3. Add `PUBLIC_PARTYKIT_HOST` to Vercel env vars pointing at the
   `*.partykit.dev` URL from step 2.
4. Redeploy Vercel; real-time cross-machine sync turns on.

**M2 directions (pick by appetite):**
- **Color fonts M2** — COLR v1 gradients, paint trees
- **CRDT M2** — Supabase auth + writable multiplayer
- **OT layout M2** — class-based features (kerning classes in
  GSUB, contextual lookups)
- **Auto-kern M2** — export-time auto-kern on monochrome glyphs
- **Hinting Phase 2** — manual hint editor for the niche 5% of
  cases auto-hinting misses

Each is ~1-3 weeks. None is gated on the others — pick by the
designer-feedback signal once production is live.

---

## Open questions — all answered (2026-05-21)

1. **Hinting deploy target** — **(b)** Python serverless via
   `ttfautohint-py`. ✅
2. **Auth provider for Phase C** — **Supabase** (deferred to M2;
   Phase C M1 uses room-token access via the project ID slug). ✅
3. **Twemoji licensing comfort** — **Twemoji shapes without the
   name** is fine. ✅
4. **ICP confirmation for Phase C** — **Greenlit as positioning
   play.** ICP-mismatch concern parked; foundry-tier pricing
   evolution deferred to post-launch. ✅
