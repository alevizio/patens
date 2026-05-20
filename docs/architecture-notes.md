# Font Studio — Architecture Notes

Last updated: 2026-05-19 · Last covered commit: `5a35e48` (Phase B1 — VF master compatibility checker)

This document captures the state of the codebase after the May 2026 working session
(commits `bc7399d` → `5a35e48`, ~30 commits over one long pass). It is intended as
the single "where are we, what's next" reference; a fresh contributor — or me in a
later session — should be able to read this in 10 minutes and have full context.

---

## Where we are now

- **Tests**: 199 unit · 27 e2e · `svelte-check` clean (561 files)
- **CI**: GitHub Actions green on every push (`.github/workflows/ci.yml`)
- **Stack**: SvelteKit 2 + Svelte 5 runes + Tailwind 4 + Vercel adapter +
  Vitest + Playwright + Pyodide (lazily loaded)

## What shipped in this session — by theme

| Theme | What changed |
|---|---|
| **Test infrastructure** | Vitest set up, GitHub Actions CI, Playwright running 5 a11y + 12 functional + 5 Welcome regression specs |
| **Svelte 5 reactivity bug class** | Fixed two `effect_update_depth_exceeded` crashes (`audit`, `compare`); proactive `untrack` pass on `edit` + `preview` axis state; demoted single-effect `$state` to plain `let` in 2 sites |
| **A11y** | axe-core in CI, fixed `text-fg-subtle` contrast, added `<title>` to `/learn` + `/families`, introduced `-strong` design tokens (`accent-strong`, `warn-strong`, `success-strong`, `danger-strong`), migrated 70+ soft-pill sites, added form labels to inputs/selects/textareas, `role="application"` on the drawing canvas |
| **AI features** | `/ai` glyph completion panel (Claude vision + JSON primitives → vector contours), `/spacing` kerning suggestion panel (Claude text + per-pair confidence + apply UX), retry on failure, NaN/range validation on output |
| **OG image** | Dynamic 1200×630 PNG at `/og.png` via demo OTF + opentype.js + `@resvg/resvg-js`, no Satori dependency |
| **Robustness** | 13 blocking `alert()` calls → toasts, silent `console.warn` on feature compilation now surfaces a toast, IDB save failures surface with `QuotaExceededError` detection, home-page `listProjects()` failures no longer leave the page in permanent "Loading…" |
| **Performance — Pyodide elimination** | OTF export skips Pyodide unless `.fea` source needed (`dc5867d`); WOFF2 native WASM (`d8b5f2c`); UFO 3 export native JS (`b9ab2f4`); standard ligatures via opentype.js (`d4813ff`); mark-to-base positioning native via our own GPOS binary writer + SFNT splicer (`7671e30`) |
| **VF tooling** | Master compatibility checker that fails fast in pure JS before Pyodide loads (`5a35e48`) |
| **Delight** | First-glyph milestone added to the celebration series, `+error.svelte` foundry-themed 404, "Already saved." toast variant when nothing was dirty |

---

## Pyodide reach map

After this session, the only paths that load Pyodide are explicit power-user features:

| Operation | Status | Path |
|---|---|---|
| OTF export, no anchors, no custom `.fea` | ✅ no Pyodide | `buildFont()` writes everything in opentype.js |
| OTF export with anchors (mark feature) | ✅ no Pyodide | `applyMarkPositioning()` builds GPOS + splices via `sfnt-splice.ts` |
| OTF export with custom `.fea` | 🔵 Pyodide | `compileFeaIntoFont` — no JS `.fea` parser exists |
| WOFF2 export | ✅ no Pyodide (native first, Pyodide as fallback) | `woff2-encoder` WASM |
| UFO 3 export | ✅ no Pyodide | `projectToUfoZipNative` |
| UFO import | 🔵 Pyodide | `ufoZipToProject` — parsing arbitrary `.glif` files |
| Family bundle export | ✅ no Pyodide | Already JS-side via `buildFont()` |
| Variable font build (`.ttf`) | 🔵 Pyodide | `buildVariableFont` — `varLib` has no JS equivalent |
| Instances as static family zip | 🔵 Pyodide | `instancesAsStaticZip` — depends on `varLib.instancer` |

**Cold-start cost** that was paid every OTF export before this session: ~15s, ~15MB.
Today: 0 for the common case, ~200ms for WOFF2 via WASM, only on demand for the
remaining Pyodide-dependent paths.

---

## Module-level architecture additions

The Pyodide elimination work added the following new modules. Each has spec-derived
unit tests (188 of the 199 unit tests are in these modules).

```
src/lib/font/
├── woff2.ts                # native WOFF2 encoder wrapping woff2-encoder
├── ufo.ts                  # UFO 3 plist + glif writer; uses fflate zipSync
├── gpos-mark.ts            # GPOS binary primitives:
│                           #   ByteBuf · writeAnchorFormat1 · writeCoverageFormat1
│                           #   writeMarkArray · writeBaseArray · writeMarkBasePos
│                           #   writeTag · writeLangSysTable · writeScriptTable
│                           #   writeScriptList · writeFeatureTable
│                           #   writeFeatureList · writeLookupTable
│                           #   writeLookupList · writeGposTable
├── sfnt-splice.ts          # parseSfntDirectory · getTableBytes
│                           # computeTableChecksum · padTable · spliceTable
│                           #   (head.checkSumAdjustment recompute)
├── mark-feature.ts         # applyMarkPositioning(font, project)
│                           #   project anchor data → GPOS binary → SFNT splice
└── vf-compat.ts            # checkMasterCompatibility · summarizeCompatibility

src/lib/ai/
├── glyph-suggest.ts        # Claude vision → JSON primitives (impure)
├── glyph-suggest-core.ts   # parseProposal · proposalToContours · validateStrokes
├── kerning-suggest.ts      # Claude text → kerning JSON (impure)
└── kerning-suggest-core.ts # parseKerningProposal · clampValue · seedPairsFromDrawn
```

All `*-core.ts` files are pure (no Svelte / Claude imports) and unit-testable in Vitest
without SvelteKit globals.

---

## Open architectural decisions

### Decision 1 — Should we build a JS `varLib` replacement (Track B2)?

**Status**: deferred pending data.

**The work** (per `docs/architecture-notes.md` if extracted as a separate plan file):

- Phase B1 (✅ done in this session): master compatibility checker
- Phase B2 (~3 weeks): outline-only VF binary (`fvar` + `gvar` + `STAT`)
- Phase B3 (~1 week): `HVAR` for advance-width variations
- Phase B4 (~3 days): `MVAR` for per-instance metric variations
- Phase B5 (~1 week): `instancesAsStaticZip` rewrite (depends on B2)

**The recommendation** (from my "what I'd actually do" pass during the session):
**don't do it.** With the common-case Pyodide path eliminated, VF export is the
only remaining slow-export case. Users expect VF builds to take 15-30s anywhere
(Glyphs, FontLab, fontmake are equivalent). The 4–6 week cost shadows fontTools'
multi-decade-tested implementation; every edge case fontTools handles becomes a
new bug to fix.

**The gating data**: how many user exports go through `buildVariableFont` vs static
OTF? If >25% — worth it. If <10% — keep Pyodide for VF. **No instrumentation
exists yet.** A one-line counter in `python.ts:buildVariableFont` + a localStorage
or backend log would settle this.

### Decision 2 — Should we add WebGPU rendering for `/preview` + `/specimen`?

**Status**: deferred pending profiling data.

**The research** (deep dive in this session) concluded: MSDF (multi-channel signed
distance field) atlas-based rendering would give real-time multi-glyph rendering
at any zoom on the surfaces where SVG actually struggles. Figma migrated to
WebGPU in production (Sept 2025), Safari 26 / iOS 26 / iPadOS 26 ship WebGPU, the
canonical [WebGPU MSDF text sample](https://webgpu.github.io/webgpu-samples/?sample=textRenderingMsdf)
gives a known-good starting implementation, and [msdfgen](https://github.com/Chlumsky/msdfgen)
has mature WASM builds.

**The gating data**: is SVG actually slow on those surfaces? Not measured. A
Playwright-driven profiling pass on `/preview`, `/specimen`, `/compare`, and the
`/edit` canvas (single complex glyph) would produce a frame-time table and
settle the question with data instead of inference.

**Honest recommendation**: don't rewrite the `/edit` canvas under any conditions
— SVG already handles single-glyph editing fine, and MSDF can't help with
live-editing geometry anyway (atlas would need to regenerate per drag).

### Decision 3 — Should we build a JS `.fea` parser?

**Status**: deferred indefinitely.

**The case**: would unblock Pyodide for users who edit `.fea` by hand
(`compileFeaIntoFont` is the last common Pyodide trigger). Auto-generated `.fea`
no longer triggers Pyodide as of Track A.

**The case against**: `.fea` parsing is non-trivial. Full AFDKO grammar has 50+
token types, supports chaining contexts, mark-to-mark, cursive attachment.
Real user-edited `.fea` could use any of it. opentype.js v2's GPOS writer is
empty for all lookup types — would need binary writers for GSUB Types 1-6 +
GPOS Types 1-8 to match fontTools' coverage.

**Honest recommendation**: don't. Users who hand-edit `.fea` are already pro
users with desktop-tool fallbacks. The cost-to-impact ratio is the worst of
the three open decisions.

### Decision 4 — Stale remote branch

`origin/font-studio/auto-improvements` exists with 38 unique commits but is
strictly behind `main` by 9,543 lines (verified via `git diff --shortstat`).
Every feature title in its history was reimplemented better on main between
sessions. User opted to keep it for now; safe to delete whenever.

---

## Research delivered in this session — condensed

Four deep-research passes documented for reference. Full reports are session
artifacts; condensed findings below.

### Svelte 5 `$effect` / `$state` pitfalls

- `effect_update_depth_exceeded` is *intended* behavior per maintainer
  `brunnerh` in Svelte discussion #11551. Don't expect framework changes.
- Common cause: `$effect` reads + writes the same `$state`. Fix priority:
  (1) demote unused `$state` to plain `let`, (2) wrap reads in `untrack()`,
  (3) refactor as `$derived`.
- The async-read-then-async-write trap: synchronous reads before an `await`
  inside an effect are tracked as dependencies, even when the writeback
  happens after the await. This was the `compare/+page.svelte` bug.
- `$derived` declarations must precede consumers in script-block order
  (Svelte 5 eagerly evaluates derived chains; below-declaration use is TDZ).
- Native `Set` / `Map` / `Date` / `URL` inside `$state` silently fail to
  trigger reactivity. Use `SvelteSet` / `SvelteMap` / etc. from
  `svelte/reactivity`.

### WebAssembly font-tooling alternatives to Pyodide

- `woff2-encoder` (itskyedo, MIT) — TypeScript + WASM, ~1.3MB total, browser-
  native. Shipped in `5a93e31`.
- `hb-subset-wasm` (kyosuke) — HarfBuzz-based subsetting WASM. Would be the
  replacement for `pyftsubset`, but `subsetFont` was unused dead code (removed).
- `wasm-ttf2woff` — WOFF (not WOFF2) — not relevant.
- opentype.js v2.0.0 (May 2026): full ligature support via `font.substitution
  .addLigature`, GPOS writer is empty for all lookup types (had to build the
  full GPOS binary ourselves).

### In-browser font editor landscape (2026)

- Glyphr Studio v2 is the only direct browser-based competitor at Font
  Studio's scope. Open source, hobbyist-focused, **does not support variable
  fonts** as of this writing.
- All other in-browser tools are inspectors (FontDrop, Wakamai Fondue) or
  format converters (Webfont Generator).
- Font Studio's differentiators: VF editing, designspace, AI assistance,
  sketch-first input. The first three are share-of-mind unique to Font Studio
  in the browser space.
- Strategic note: optimize for first-time designers, not pros switching from
  Glyphs / FontLab. Pros stay on desktop tools; new designers don't have
  existing workflows to abandon.

### AI-assisted glyph design — what's available in 2026

- Few-shot completion research is mature (TCN 2018, DeepVecFont-v2 CVPR 2023,
  VecFusion arXiv 2024) but **none have browser-deployable ONNX weights**.
  Repos ship training code, not inference weights.
- Neural kerning has open-source prior art: Simon Cozens' atokern (DNN over
  letter image pairs). Small enough to deploy via Transformers.js. Future
  work.
- Browser ML stack (Transformers.js v3 + ONNX Runtime Web + WebGPU) is
  production-ready: 3-5× speedup over WASM-only.
- Honest path today: Claude vision + structured output, with output
  validation against geometry-sanity rules (shipped in `5e3a8e8`).
- Glyphs forum sentiment: pros want AI as *assist*, hate AI as *replacement*.
  Bitmap-output approaches are dealbreakers; vector output is required.
- The "/ai" feature category is uniquely Font Studio's — no other browser
  editor surfaces it. Highest-ceiling differentiator.

### WebGPU + GPU font rendering

- WebGPU ships by default in Chrome 113+ (since 2023), Safari 26+ (Sept 2025),
  Edge, and Firefox Nightly. **Production-ready.**
- Figma migrated their renderer to WebGPU in September 2025 — production proof.
- Three GPU font rendering algorithms with distinct use cases:
  - **Loop-Blinn 2005** — resolution-independent triangulated mesh + fragment
    shader. Static rendering.
  - **MSDF** (Multi-channel SDF) — atlas-based, fast at any zoom, doesn't
    help editing because atlases would need per-frame regen.
  - **Slug** (Lengyel, public domain March 2026) — modern SOTA, banded curve
    data, GPU evaluation. Reference impl is research-quality.
- Vello (Linebender, Rust + wgpu) is the most production-ready library but
  alpha-state, no JS bindings, Safari support uncertain.
- **The editor canvas is not the bottleneck.** Single-glyph editing in SVG
  is fine; the surfaces that would benefit are multi-glyph display:
  `/preview`, `/specimen`, `/compare`, the home page thumbnail grid.

---

## Recommended next moves — ranked

Each row scoped to roughly one focused session of work, ordered by ROI given
the current state.

| Move | Effort | Why it's high-ROI now |
|---|---|---|
| 🟢 **Watch a non-designer use the app for 15 min** | 15 min + writeup | Single biggest unknown about Font Studio. Likely re-prioritizes everything below. No code can answer this. |
| 🟢 **Profile `/preview` + `/specimen` + `/compare` render times** | 3 hours | Empirically settles "is WebGPU worth it?" Playwright-driven, frame-time table. Either justifies an MSDF spike or kills the WebGPU thread. |
| 🟢 **Verify Track A against 5-10 real OFL fonts** | 1 day | The GPOS splice has 83 spec tests but hasn't seen Inter, Source Serif, Noto, Recursive in production. Find edge cases before users do. |
| 🟢 **Instrument `buildVariableFont` usage** | 30 min | Single counter + 7 days of data settles the B2 decision. |
| 🟡 **iPad / Apple Pencil hardware test** | 1 day with hardware | Sketch-first is the marquee differentiator; never been tested on real Pencil + Safari 26. |
| 🟡 **AI feature empirical eval** | 1 week of real font work | Both `/ai` panels are unverified at production scale. Need designer judgment on output quality. |
| 🟡 **MSDF spike for `/preview` (skipping profiling)** | 1 week | Only if profiling didn't happen and you want forward motion regardless. Real visible win but premature without data. |
| 🔴 **Phase B2 — JS varLib** | 4-6 weeks | Don't, unless instrumentation shows >25% of users export VFs. |
| 🔴 **Custom `.fea` parser in JS** | Multi-week | Don't. Users who hand-edit `.fea` are already on desktop tools. |
| 🔴 **Rewrite `/edit` canvas with WebGPU** | 2 months | Don't. SVG handles single-glyph editing fine. |

**Top recommendation**: do the user observation first. Everything below it is
predicated on assumptions about user behavior that we don't have data on.

---

## What I'd want this session's successor to know

Things that are easy to forget on a fresh read of the codebase:

1. **The `head.checkSumAdjustment` math.** `sfnt-splice.ts` recomputes it
   correctly per spec (whole-file checksum + adjustment = `0xB1B0AFBA`). If
   you splice a table without recomputing this, the font installs but
   FontBakery / strict OS validators reject it. Test
   `sfnt-splice.test.ts:"updates head.checkSumAdjustment"` pins this.

2. **`untrack` is load-bearing in `compare/+page.svelte`.** The rebuilds-on-
   cp-change effect previously crashed mounting `/audit` via an async-write
   cycle. Don't remove the `untrack()` wrapper around `layers.filter(...)`
   without understanding the bug class.

3. **`-strong` design tokens** were added specifically for text on tinted
   backgrounds (`bg-X-soft`, `bg-X/10/15/20`). Bare `text-X` on white is fine
   only for icons (3:1 non-text contrast threshold). For body text on white
   or tinted bg, use `text-X-strong`. The a11y suite enforces this on every
   project tab.

4. **AI features depend on the Anthropic key in `settings`.** Both `/ai` and
   `/spacing` AI panels disable their CTAs when `settings.hasKey` is false
   and show "Set an Anthropic API key in Settings first." Don't add a new
   AI surface without that gate.

5. **The Pyodide-trigger logic in `export/+page.svelte:buildOtfBuffer()`** is
   the keystone. If any future refactor changes the condition that decides
   when to load Pyodide, it will silently regress the common-case export
   speed. The condition is: `hasCustomFea` (and only that — anchors no
   longer trigger it as of Track A).

6. **`projectStore.dirty` + `saveErrorActive`** form the save-feedback state
   machine. The toast-on-quota-exceeded behavior depends on the latter flag
   resetting on successful save. Don't bypass `flush()` for project writes.

7. **The `/og.png` endpoint uses opentype.js to outline-trace text** instead
   of asking resvg to render font text (would need font registration
   matching the demo OTF's name table; brittle). All text in the OG image
   is rendered as SVG `<path>` elements, never `<text>`.

8. **The 38-commit stale branch** (`origin/font-studio/auto-improvements`)
   is BEHIND `main`, not ahead. Verified via `git diff --shortstat`. Safe
   to delete whenever; kept by explicit user request.
