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

### 8. Auto-spacing / auto-kerning
The single biggest "Glyphs / FontLab have it, browser editors don't"
gap. Daily-use pro feature.

Research questions:

- The HZ Program (Hermann Zapf, '70s) — still the canonical algorithm?
- Modern alternatives: Tal Leming's "MetricsMachine," Tim Ahrens's
  approaches, "AutoSpacer" (Toshi Omagari), various ML attempts.
- Which one suits browser execution? (Pure JS algorithm preferred — no
  Pyodide hop on every kern-update.)
- UI model — confirm-each pairs, run-the-whole-batch, or interactive
  edit-as-you-go.

Then a multi-commit implementation arc:

1. Sidebearing inference from glyph silhouettes
2. Class-based kerning suggestion
3. Optical pair correction
4. Confirm / reject UX on the Spacing tab

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

### 11. OT layout depth — alternates, swashes, contextual
The features tab currently handles standard ligatures via opentype.js's
`addLigature`. Real OT power is in:

- `salt` / `ss01–ss20` — stylistic alternates and sets
- `swsh` / `cswh` — swashes
- `calt` — contextual alternates (e.g. swap glyph based on neighbors)
- `init` / `medi` / `fina` — position-aware (Latin script alternates)
- `aalt` — all-alternates lookup (referenced by other tags)

Research the FEA syntax for each, then either compile via Pyodide or
add to the JS feature compiler.

### 12. Real-time collaboration (CRDT — Y.js)
Two designers on one font live. The biggest "no one's done it in a
browser" differentiator. Significant lift — needs server presence,
authentication model, conflict resolution. Worth scoping but not soon.

### 13. WebGPU + MSDF glyph preview
Already-researched-not-implemented from earlier session notes. WebGPU
shipped in Chrome 113 and Safari 18. MSDFs would let live previews
scale arbitrarily without re-rasterizing. Performance research; only
worth doing if there's a measured pain point in the current canvas.

---

## Maintenance / quality

Things that aren't features but compound over time.

### Audit / preflight extensions
- Glyph outline auto-issues — open paths, off-curve points outside
  bbox, near-collinear points that should be removed, kink detection.
- Mark anchor coverage — for every base glyph in COMBINING DIACRITICAL
  MARKS range, check `top` / `bottom` anchors exist.
- Hangs of orphan code in the .fea source.

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
