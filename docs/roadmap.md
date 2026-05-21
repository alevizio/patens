# Roadmap

Snapshot of what's left after the 2026-05-20 push toward
"most professional typography creation software possible."
Read alongside [`architecture-notes.md`](./architecture-notes.md) for current
state and [`auto-hinting.md`](./auto-hinting.md) for hinting specifics.

## Now (one-session items, ordered by impact ÷ effort)

These are concrete, scoped, and ship-ready as soon as someone picks them up.

### 1. gasp table on static TTFs · ~30 min
Currently the static TTF export ships without a `gasp` table. Browsers
and Windows then use heuristic defaults that may not match the design
intent. Modern recommendation (Google Fonts, ttfautohint default):

```
gasp v1, one range:
  rangeMaxPPEM = 0xFFFF
  rangeGaspBehavior = GASP_DOGRAY | GASP_GRIDFIT
                    | GASP_SYMMETRIC_SMOOTHING | GASP_SYMMETRIC_GRIDFIT
```

Add to `compileStaticTtf` in `python.ts`; verify on Linux via
`ttx -t gasp out.ttf`.

### 2. CFF subroutinization on OTF export · ~45 min
fontTools' subset optimizer can dedupe repeated CharString subroutines
in CFF tables — 5–10 % size reduction for free. Add a final
`optimize_charstrings`-equivalent pass in `buildOtfBuffer()`. Pure win
for any user shipping fonts at scale.

### 3. Unicode-coverage audit · ~1 hour
The Audit page already catches missing control glyphs. Extend to
recommended character sets:

- **Latin baseline (~95 glyphs)** — already loosely covered
- **Adobe Latin 1 / 2 / 3** — graduated targets
- **Typographic essentials** — en-dash, em-dash, ellipsis, smart quotes
  (' ' " "), bullet (•), section (§), pilcrow (¶), inferior/superior
  figures
- **Currency completeness** — €, £, ¥, etc. for any modern release

Each as `info`-level nudges, grouped under a new "Coverage" section.

### 4. STAT v1.1 axis-ordering for VFs · ~1 hour
The Python `buildStatTable` call emits v1.0 records. Modern OS font
menus use v1.1's `AxisValueArray` + `axisOrdering` field to group
instances correctly. Specifically affects how named instances appear in
Office / macOS Font Book / CSS instance pickers when the VF has more
than one axis. Visible-difference fix for `wght`+`wdth` fonts.

### 5. Hinting Phase 1b — production deploy · ~1–3 hours, ops decision required
Three options documented in [`auto-hinting.md`](./auto-hinting.md):

| Option | Effort | Tradeoff |
| --- | --- | --- |
| **a.** Bundle Linux binary + `vercel.json` `includeFiles` | ~1 h | Adds ~3 MB to the repo, simplest |
| **b.** Convert route to Vercel Python function via `ttfautohint-py` | ~2 h | No binary in git, mixes runtimes |
| **c.** Separate Fly.io / Cloud Run worker | ~3 h | Cleanest separation, more moving parts |

User picks the path; implementation follows the doc.

### 6. Missing typographic feature surfaces · ~1 hour each
Small UI polish items that surfaced during the recent work but weren't
addressed:

- **Designer / foundry display in the OG image for per-project routes**
  (currently only the site-level OG card exists)
- **Family detail page metadata** — show the new fields once user fills them
- **AI tab project briefing** — include the new metadata fields in the
  system prompt context for better suggestions
- **Manual hint range UI** — let users pick the PPM range for
  ttfautohint (currently hard-coded 8-50) on the Export page

---

## Next (multi-session — start with research, then implement)

Each of these is a flagship feature on the level of the existing
variable-font support. Plan: spawn a research agent on each topic to
get a sourced report with a recommended approach, then a separate
implementation arc.

### 7. Color fonts (COLR v0 / COLR v1 / CPAL) — researched 2026-05-21

**Verdict from research:** build it, but as Milestone 2 — after core
features (auto-kerning, hinting production deploy) stabilize.

Format consolidation: **COLR v0 + CPAL is universal** (Chrome / Edge /
Firefox / Safari all platforms, plus DirectWrite, Core Text, Android).
**COLR v1 ships everywhere except Safari** (Chrome 98+, Firefox 108+,
Edge 98+, Win11 DirectWrite native, Android Skia; WebKit
[standards-positions #415](https://github.com/WebKit/standards-positions/issues/415)
still open as of May 2026). OT-SVG is Adobe-stronghold and declining;
sbix is Apple-emoji-only legacy; CBDT/CBLC is effectively deprecated.

Production users in 2026: Google Noto Color Emoji (COLRv1+SVG fallback),
Microsoft Fluent (hybrid v0+v1+monochrome), expressive display foundries
(Nabla, Foldit, Plakato Color), Material Icons two-tone. Apple still
ships sbix bitmaps. Glyphs 3 and FontLab 8 both have full COLR v1
editors — Font Studio enters as a follower, not a pioneer.

Free wins already in the codebase:
- **opentype.js can read + write COLR v0 + CPAL** since PR #490 (2022).
  Milestone 1 export is essentially free.
- **fontTools.colorLib.builder** (Pyodide-runnable) handles COLR v1
  paint trees + `COLRVariationMerger` for variable color. Milestone 2
  builds on the same Pyodide infrastructure we already use for VF.

**Milestone 1** (3–5 weeks) — "Layered color, flat fills":
1. Project schema: `glyph.colorLayers: Array<{ path, paletteIndex }>`
   + `palettes: CPAL[]` with `default | light | dark` flags.
2. UI: layer panel (z-order, visibility, palette-index picker), CPAL
   editor.
3. Preview: iterate layers via opentype.js → Canvas2D fill.
4. Export: COLR v0 + CPAL v0 via opentype.js.
5. Round-trip test against a Twemoji-shape font.

**Milestone 2** (8–12 weeks) — "COLR v1 paints":
1. Paint-tree schema (`PaintLinearGradient`, `PaintTransform`,
   `PaintComposite`, etc.).
2. Gradient editor UI (linear + radial) + affine handles.
3. Pyodide + `fontTools.colorLib.builder` export.
4. Safari fallback: auto-emit PNG/SVG alongside COLR v1 (mirrors Noto).
5. CSS preview pane with `font-palette: light/dark` toggle.

**Milestone 3** (later) — variable color, blend modes, sbix/OT-SVG
exporters for Apple/Adobe interop.

**Skip:** building our own paint compiler. Lean on `paintcompiler` and
`fontTools.colorLib.builder` instead. UFO has no canonical color-layer
convention — invent or borrow, but expect that to be sticky.

**Dominant risk:** Safari WYSIWYG. Until WebKit ships COLR v1, the
editor preview must either accept Safari users seeing a static fallback
or we build a Skia-WASM / canvas paint-tree interpreter (weeks of work).

Sources: [caniuse COLR v1](https://caniuse.com/colr-v1) ·
[Chrome COLRv1 blog](https://developer.chrome.com/blog/colrv1-fonts) ·
[Glyphs handbook — layered color](https://handbook.glyphsapp.com/color-fonts/layered/) ·
[FontLab 8 — what's new color](https://help.fontlab.com/fontlab/8/whats-new/whats-new-09-color/) ·
[fontTools colorLib.builder](https://fonttools.readthedocs.io/en/stable/colorLib/index.html) ·
[opentype.js PR #490](https://github.com/opentypejs/opentype.js/pull/490).

### 8. Auto-spacing / auto-kerning — researched 2026-05-21

**Verdict from research:** tractable for milestone-1 if scoped as
*"optical/silhouette-based suggestions with a confirm-each-pair UX,"*
not as a black-box solver. Pure TypeScript, no Pyodide hop for the
inner loop. Single biggest "Glyphs / FontLab have it, browser editors
don't" gap to close.

**Key landscape findings:**

- **HZ Program is a justification engine, not a kerning generator** —
  frequently mis-cited. Patent expired July 2010 anyway. Skip.
- **ML kerning fails in practice.** Simon Cozens' multi-year retrospective
  ([atokern](https://simoncozens.github.io/neural-kerning-log/)): "even
  98% accuracy on 300×300 pairs = 1800 errors, too many to verify
  manually." Don't pursue for milestone-1.
- **HTLetterSpacer** ([Huerta Tipográfica, GPL-3.0](https://github.com/huertatipografica/HTLetterspacer)) is
  the best implementable starting point. Pure Python ~500 LOC; samples
  glyph outlines at scan-line heights between reference zones,
  normalises to a reference glyph (`H` and `o`), assigns sidebearings.
  Authors claim ~95-98% acceptable on Latin / Cyrillic / Greek / Devanagari.
  **GPL caveat** — port via clean-room re-implementation from the
  documented method (algorithmic ideas aren't copyrightable, expression
  is) rather than copying code.
- **BubbleKern** ([Tosche, Apache-2.0](https://github.com/Tosche/BubbleKern))
  for silhouette-distance kerning: walks scan-heights, finds first
  contact between two glyph silhouettes, kerns by that distance.
- **CounterSpace** ([Cozens, Apache-2.0](https://github.com/simoncozens/CounterSpace))
  — author labels experimental; useful reference, not for shipping.
- **Kern On** ([Tim Ahrens, proprietary](https://kern-on.com/manual/))
  is the dominant pro UX: designer sets 30-100 "model pairs," engine
  extrapolates. Algorithm closed; UX is the model to imitate.

**Pure-JS feasibility: confirmed.** Silhouette-distance per pair is
`O(N)` with `N ≈ 128` scan-heights. Sub-1ms per pair on a 2024-era
laptop — three orders of magnitude under the 50ms target. Inputs come
from opentype.js path data we already have. Pyodide-via-fontTools is
optional for a "deep audit" batch pass (milestone-2).

**Reference data**: Inter ships its kerning publicly
([rsms/inter](https://github.com/rsms/inter), with `kernsample.py`).
Run our auto-kerner against an unkerned copy of Inter, diff against
shipped kerning, target ≤20% mean absolute error on top-200 pairs.

**Milestone 1** (1-2 weeks) — "Optical auto-space + suggest queue":

Week 1 (algorithm, pure TS):
1. Contour-sampling utility: 128 scan-heights between descender and
   ascender per glyph side; cache on glyph save.
2. Port HTLetterSpacer's auto-spacing logic (clean-room) — reference
   glyph normalisation, assign left/right sidebearings. ~400-600 LOC.
3. Silhouette-distance kerning: given two glyph IDs, return suggested
   kern delta in <10ms. Drive from existing kerning-pair data model.
4. Sidebearing-class auto-suggest: cluster glyphs with sidebearings
   within ±5 units AND same script/category.

Week 2 (UX + integration):
1. "Auto-space" button on glyph view → preview overlay → apply.
2. "Suggest kerning" queue panel: pair-of-the-moment, current vs
   suggested value, ±slider, **Apply / Skip / Apply-to-class**.
3. Audit-kerning view: flag pairs with distance < 1% UPM in red.
4. Hook into existing kerning-class model: when a pair is approved,
   offer to apply to all glyph pairs sharing class membership.
5. Quality score: run against unkerned Inter on commit, gate
   regressions.

**Data model changes** (minimal):
- per-glyph `autoSidebearings: { l, r, confidence }` (optional)
- per-pair "suggestion" entity `{ pair, current, suggested, source, status }`

No schema break.

**Risks**:
- **GPL contamination** — clean-room only, no code copy from HTLetterSpacer.
- **Italics / obliques** — silhouette methods need shear correction; punt
  to milestone-2.
- **VF cross-master divergence** — warn when same-pair kerning differs
  >50 units between masters after auto-suggest.
- **Uncanny-valley UX** — auto-suggestions that are 90% right but
  visibly wrong frustrate beginners more than no suggestions. Mitigate
  with explicit confidence scores; only surface when measurement
  variance is low.
- **Non-Latin scripts** — gate auto-spacing behind a script-category
  check, show "experimental" badge for unsupported scripts.

**Milestone 2** (later):
- Kern On-style model-pair extrapolation (user defines ~30-50 reference
  pairs; nearest-neighbour fit in contour-feature space).
- Per-master kerning + design-space interpolation (mirrors fontmake).
- Pyodide-backed "deep audit" — full-font HTLetterSpacer batch +
  CounterSpace cross-check, surfaced as pre-export QA pass.
- Stem-rhythm-driven sidebearing classes wired into the existing
  Spacing-tab rhythm view ("see the rhythm → click 'make consistent'").

Sources: [HTLetterSpacer](https://github.com/huertatipografica/HTLetterspacer) ·
[BubbleKern](https://github.com/Tosche/BubbleKern) ·
[CounterSpace](https://github.com/simoncozens/CounterSpace) ·
[Kern On manual](https://kern-on.com/manual/) ·
[Cozens — neural-kerning retrospective](https://simoncozens.github.io/neural-kerning-log/) ·
[Learning to Kern (arXiv 2024)](https://arxiv.org/abs/2402.14313) ·
[FontLab 8 metrics & kerning](https://help.fontlab.com/fontlab/8/whats-new/whats-new-06-metrics-kerning/) ·
[Inter font + kerning data](https://github.com/rsms/inter) ·
[kernall research survey](https://github.com/n8willis/kernall).

### 9. Manual TT hint editor
Glyphs has it; FontLab has it. Niche but real for pros. After Phase
1's auto-hint works in production, designers may want to override
specific glyphs.

Research questions:

- TT bytecode primer (MDAP, MIAP, IUP, DELTAP) — what's the minimum
  vocabulary?
- Visual editor patterns — Glyphs' point-by-point hint panel vs
  FontLab's overlay arrows.
- Round-trip with ttfautohint — the user's manual hints survive
  re-running the autohinter, or do they?

### 10. CFF/PostScript hinting (Adobe `otfautohint`)
For users who ship OTF (not TTF). Python-only at the moment; running
in browser via Pyodide is feasible. AFDKO 4.0 ships `otfautohint`.

### 11. OT layout depth — researched 2026-05-21

**Verdict from research:** tractable as a next major direction.
Milestone-1 ships in ~1.5 weeks if scoped to 10 declarative features
plus a HarfBuzzJS live preview. Closes a real "Glyphs / FontLab have
it, browser editors don't" gap for daily-use professional Latin work.

**Headline finding** (load-bearing for M1): **opentype.js's write API
is bigger than its README admits.** Bundle introspection confirms
`font.substitution.addSingle` / `addAlternate` / `addMultiple` /
`addLigature` accept ANY feature tag, not just `liga`/`rlig`. This
eliminates the Pyodide hop for ~85 % of feature work. Type 6
(contextual / `calt`) is the only common feature still requiring
feaLib via Pyodide until we ship the M2 visual rule builder.

**Pattern from pro tools — declarative suffix detection:** Glyphs and
FontLab both auto-generate features from glyph naming conventions.
Mirror that in Font Studio:

  `.sc` / `.smcp` → `smcp` lookup
  `.c2sc`        → `c2sc`
  `.ss01–.ss20`  → `ss01`–`ss20` (with optional `featureNames` block)
  `.salt` / `.alt` / `.cvNN` → `salt` / `cv01`–`cv99`
  `.osf` / `.tf` / `.tosf`   → `onum` / `tnum` / `tosf`
  `.numr` / `.dnom` / `.sups` / `.subs` → fractions + super/subscript
  `.swsh`        → `swsh` (non-contextual only — contextual is `calt`)
  `.init/.medi/.fina/.isol` → Arabic positional (M1 stretch)

**Live preview MUST use HarfBuzzJS, not opentype.js's renderer** —
opentype.js's `font.draw()` only applies `liga`/`rlig` at draw time.
Fontra (browser-based editor, closest analog to us) uses the same
HarfBuzzJS path; it's ~1 MB gzipped (vs Pyodide's 10–15 MB cold
start). Required.

**Milestone 1** (~1.5 weeks) — "Declarative features + live preview":

1. **Suffix detector** (1 d). Scans `project.glyphs`, returns
   `{ feature → [{ from, to }] }` map by glyph-name pattern. Accepts
   Glyphs / Adobe / AGL suffix dialects.
2. **Features tab UI** (3 d). Replace freeform textarea with a
   detected-features list: one card per discovered feature with a
   toggle, plain-English label ("Small caps — replaces lowercase with
   shorter capital forms"), member-glyph chips, collapsible localized-
   name editor for `ss##`. The current `.fea` textarea moves under a
   "Custom FEA" disclosure (preserves the existing escape hatch).
3. **Hybrid compile path** (2 d). For the 9 declarative features,
   write directly via opentype.js `font.substitution.addSingle` /
   `addAlternate` / `addLigature` — instant, zero Pyodide cost. For
   `calt` + custom FEA, keep the existing Pyodide+feaLib route. Single
   export pipeline merges both.
   **Smoke test landed (`a6b8c…` to be assigned): `addSingle` works
   for `salt` / `smcp` / `c2sc`; `addAlternate` works for `aalt`;
   features survive save → reparse round-trip cleanly.** One
   constraint surfaced — opentype.js requires features be added in
   alphabetical order between distinct tags. The M1 compile path MUST
   sort the detected-features list by tag before calling the writers.
   Pinned in the smoke test so a future refactor that drops sorting
   fails loudly there instead of in the export path.
4. **Live preview via HarfBuzzJS** (3 d). Add `harfbuzzjs` dep,
   shape the test string against the in-memory font, feature toggles
   above the preview drive per-call shaping. Render shaped glyph IDs
   through the existing canvas pipeline.
5. **`aalt` aggregator** (0.5 d). At export, auto-build the all-
   alternates feature from sibling features. Designer-invisible.

**Deliverable**: a beginner who draws `A.ss01`, `a.sc`, `one.osf`
sees three feature cards auto-appear, toggles them in a live preview,
and exports a working OTF — with no Pyodide cold start unless they
hit the "Custom FEA" escape hatch or use `calt`.

**Milestone 2:**

- **Arabic positional builder** — same suffix model (`.init`, `.medi`,
  `.fina`, `.isol`), auto-classify glyphs by Unicode joining type.
- **Visual contextual-rule builder** for `calt` — row-based UI:
  "before [X]", "match [Y]", "after [Z]", "replace with [Y.alt]";
  compiles to FEA.
- **FontBakery-compatible feature test fixtures** — JSON shaping
  tests + "Run tests" button driven by HarfBuzzJS.
- **`featureNames` table editor** for `ss##` — per-language localized
  names.
- **Variable-font `rvrn`** — required substitution variations.

**Explicitly out of scope:** Devanagari shaping (M2+ standalone
project), CJK OT features (shaped at the engine level), OpenType
MATH (separate spec, tiny audience), vertical writing.

**Risks:**

- **opentype.js write-path quality is the load-bearing assumption.**
  Verify with the round-trip smoke test on day 1.
- **HarfBuzzJS ~1 MB gzipped** — material, but acceptable vs Pyodide.
  Lazy-load on first Features-tab visit.
- **`calt` punted to raw FEA in M1** is the most-asked-about feature
  by serious designers. M2 visual builder is the answer.
- **Glyph-naming dialect conflicts** (Adobe vs Glyphs vs AGL on edge
  cases like `oldstyle` vs `osf`). M1 accepts multiple dialects.

Sources: [Microsoft OT spec p–t](https://learn.microsoft.com/en-us/typography/opentype/spec/features_pt) ·
[Microsoft OT spec f–j](https://learn.microsoft.com/en-us/typography/opentype/spec/features_fj) ·
[Adobe AFDKO FEA spec](http://adobe-type-tools.github.io/afdko/OpenTypeFeatureFileSpecification.html) ·
[Glyphs auto feature generation](https://handbook.glyphsapp.com/automatic-feature-generation/) ·
[FontLab 8 release notes](https://help.fontlab.com/fontlab/8/whats-new/release-notes/8.4.0.8898/) ·
[Fontra OT/HarfBuzz blog](https://blog.fontra.xyz/blog/opentype-harfbuzz/) ·
[harfbuzzjs](https://github.com/harfbuzz/harfbuzzjs) ·
[opentype.js](https://github.com/opentypejs/opentype.js) ·
[Simon Cozens — feature tag DB](https://simoncozens.github.io/feature-tags/) ·
[FontBakery](https://github.com/fonttools/fontbakery) ·
[shaperglot](https://github.com/googlefonts/shaperglot).

### 12. Real-time collaboration (CRDT) — researched 2026-05-21

**Verdict from research:** yes — but stage it carefully. Tractable
tech-wise; the open question is ICP fit (collab sells to teams; our
ICP is solo designers). Recommendation: ship as a positioning play
("share your font WIP like a Figma link") more than a daily-utility
play.

**Stack choices:**
- **Yjs** (most ecosystem, smallest bundle ~30 KB, fastest in
  benchmarks). Automerge 3.0 (Aug 2025, ~10× memory cut) is the
  realistic Plan B if Yjs's single-maintainer bus factor materialises.
  Loro and diamond-types currently rule out (latter is dormant since
  2022).
- **PartyKit on Cloudflare** for sync transport (cheapest at indie
  scale, Yjs-native, what tldraw ships in production). Liveblocks is
  fastest TTM but expensive at scale. Vercel does not host stateful
  WebSocket itself.
- **Supabase magic-link + JWT bridge** for auth. Anonymous +
  link-based access for the read-only viewer pattern (Figma-style
  "anyone with the link").
- **y-indexeddb** for client-side persistence — replicates the Y.Doc
  to IndexedDB so offline + reconnect works without a server hop.

**Critical design call — bezier contour conflict model:** do NOT
model contour geometry as a true CRDT. Use Figma's own pattern —
server-authoritative LWW per-property — with an "active editor lock
per glyph" via Yjs awareness. Two designers on the same glyph: one
grabs the soft lock, the second enters viewer mode for that glyph
until released. The rest of the project (notes, kerning, palettes,
.fea source) uses proper Y.Text / Y.Map / Y.Array semantics. No
prior art is fully satisfying for vector-graphics conflict — plan a
1-week prototype spike before committing M2 scope.

**No browser-based font editor ships multiplayer today.** Fontra
explicitly lists "peer-to-peer collaboration" as future research
([Fontra docs](https://docs.fontra.xyz/introduction/)). Real
defensible moat.

**Four milestone-1 options compared:**

| Option | Scope | Effort | Wow factor |
|---|---|---|---|
| A. Full multiplayer | Auth + sync + presence + hybrid CRDT + share UI | 10-14 wk | 10/10 |
| **B. Read-only share links** | Anon JWT + WS broadcast of owner's Y.Doc | 3-4 wk | 6/10 |
| C. Async via Git / Drive | File-format sync, no realtime | 2-3 wk | 3/10 |
| **D. Internal Yjs refactor only** | Move state to Y.Doc, ship single-user | 4-6 wk | 2/10 (10/10 as foundation) |

**Recommended: D → B in one release.** 5–7 weeks total. Refactors
state to Yjs internally AND ships the read-only share link. Lays
foundation for full multiplayer (M2) without rework.

**Milestone 2** (Q4 2026 or later, depending on M1 signal):
Promote read-only links to read-write; per-glyph soft locks; hybrid
CRDT from the recommendation above; awareness cursors on the canvas;
"active on this glyph" sidebar indicators. ~8–10 wk on top of M1.
Run a closed beta with 5–10 type-design pairs.

**Risks:**
- **CRDT history GC** for years-long projects — Yjs has partial
  tombstone collapse but text-CRDTs only grow. Mitigation: periodic
  server-side compaction snapshots. Pattern is documented but rarely
  benchmarked at 10-year horizons.
- **Yjs maintainer bus factor** — Kevin Jahns is one person.
  Mitigation: sponsor him, plan an eventual Automerge-3 migration
  path.
- **ICP mismatch** — multiplayer mostly sells to teams. The Option B
  share-link framing is the way to get marketing value without
  betting on full multiplayer demand.
- **Bezier conflict semantics** — no prior art is fully satisfying.
  1-week spike before locking M2 scope.

Sources: [Yjs GitHub](https://github.com/yjs/yjs) ·
[Automerge 3.0 blog](https://automerge.org/blog/automerge-3/) ·
[Figma multiplayer blog](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/) ·
[tldraw sync](https://tldraw.dev/blog/announcing-tldraw-sync) ·
[PartyKit docs](https://docs.partykit.io/how-partykit-works/) ·
[Liveblocks pricing](https://liveblocks.io/pricing) ·
[Y-Sweet docs](https://docs.jamsocket.com/y-sweet) ·
[crdt-benchmarks](https://github.com/dmonad/crdt-benchmarks) ·
[Fontra docs](https://docs.fontra.xyz/introduction/) ·
[SyncroState (Svelte 5)](https://github.com/relm-us/svelt-yjs).

### 13. WebGPU + MSDF glyph preview
Already-researched-not-implemented from earlier session notes. WebGPU
shipped in Chrome 113 and Safari 18. MSDFs would let live previews
scale arbitrarily without re-rasterizing. Performance research; only
worth doing if there's a measured pain point in the current canvas.

---

## M2 ships log (2026-05-21 session)

Per-feature shipping log, in order, with telemetry. Sourced from
`git log --oneline` between Phase C close (31f7b36) and end of M2
sweep. All commits on `main`.

| Commit | Feature | Tests added |
| --- | --- | --- |
| `dbf345c` | Auto-kern M2 — silhouette-driven kerning at export | 6 |
| `11bd4b3` | OT layout M2 — class-based kerning ships at export | 7 |
| `55d8e1b` | Audit M2 — off-grid + duplicate + tiny-contour checks | 4 |
| `e2feec0` | Kerning preview panel in Export tab | 0 (UI) |
| `bf2417f` | Live typeset preview on `/share/<id>` route | 0 (UI) |
| `39e0ed1` | Designspace live interpolation slider | 0 (UI) |
| `d13467c` | NFD-based auto-compose for accented glyphs | 8 |
| `e66fc0e` | Bulk auto-compose action in glyph browser | 0 (UI) |

**Cumulative session telemetry:** 397 vitest tests pass, 33 test
files, svelte-check clean on 660 files. 25 net new tests across
the M2 sweep.

**Cross-cutting design moves:**

- Every export-time pipeline now layers `manual → class-expanded →
  algorithmic` for kerning, with the user-set-wins invariant
  preserved at every layer. Designers tune the high-signal pairs
  manually; classes expand them across siblings; auto-kern fills
  the rest. Three layers, one consistent rule.
- The auto-suggest UX vocabulary (wand-sparkles icon +
  accent-soft styling + count-of-candidates label) is now
  established across NFD compose + auto-kern + auto-features —
  consistent visual language for "the algorithm thinks it can
  help here."
- Round-trip cost profiling (d9ab393) is now load-bearing: it
  unblocked Day 3d, and the same approach is the playbook for
  future "is this safe to wire to the hot path?" questions.

---

## Maintenance / quality

Things that aren't features but compound over time.

### Audit / preflight extensions
- ~~Glyph outline auto-issues — open paths, off-curve points outside
  bbox, near-collinear points that should be removed, kink detection.~~
  Partial: off-grid + duplicate + tiny-contour shipped (55d8e1b).
  Kink detection + near-collinear still open.
- Mark anchor coverage — for every base glyph in COMBINING DIACRITICAL
  MARKS range, check `top` / `bottom` anchors exist.
- Hangs of orphan code in the .fea source.
- Composable-via-NFD as info-level suggestion (the bulk-compose
  surface is in the glyph browser; an audit hint on the per-glyph
  panel would help discovery).

### Test coverage gaps
- The new `compileStaticTtf` function has no vitest unit tests.
- The new `hintTtf` client has no test (would require a stub `/api`
  endpoint mock).
- The new metadata fields aren't covered by an end-to-end "round-trip"
  test (write metadata → export → re-import via ufoZipToProject →
  verify metadata preserved).

### Documentation
- The `architecture-notes.md` predates the auto-hinting and metadata
  work — refresh.
- An ONBOARDING for new contributors / future sessions: where does the
  build live, what's Pyodide doing, what's the dev workflow.

---

## Out of scope (intentionally)

For clarity on what we've ruled out:

- Native desktop app — Font Studio is browser-first by design.
- Built-in bitmap-glyph editor — bitmap fonts are a niche; modern fonts
  are vector + hinting.
- Server-side rendering of the editor canvas itself — local-only is the
  privacy stance.
- GitHub Marketplace-style font marketplace integration — that's a
  product direction call, not a tool feature.

---

## How to pick the next thing

Default heuristic for a session: **one tractable item from the "Now"
list** (#1–#6) plus **a research agent spawned in parallel** on one of
the multi-session topics (#7–#13). The research returns asynchronously
and lays groundwork for the next session.

When in doubt, the highest-leverage "professional-tool" gap right now
is **#5 (production hinting deploy)** + **#8 (auto-kerning research)** —
between them they cover both export-quality and daily-use polish.
