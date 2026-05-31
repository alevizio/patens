# Variable Fonts — Deep Dive for Patens

**Research compiled:** 2026-05-30
**Scope:** Variable-font foundation research to deepen Patens's VF support beyond the current 11 audit codes, the 2D variation explorer, and the family-level designspace. Pairs with `canonical-library.md` (Family 8) and `ai-audit-mapping.md` (Family 8).
**Audience:** Patens maintainer (solo). Ten-week runway to TypeCon Portland, Aug 6–8 2026.

**Confidence legend.** ✅ confirmed (multi-source) · ⚠️ likely (single reputable source) · ❓ uncertain (verify before shipping prose).

---

## Part 1 — Where Patens currently is

Reading the source as it stands today:

- **Types (`src/lib/font/types.ts`).** Patens already models `Axis` (tag/name/min/default/max — a clean subset of `fvar`), `Master` (id, name, location dict of axis tag → value, glyph overrides keyed by codepoint), `VariableInstance` (familyName, styleName, location, optional PostScript name), and a separate `FamilyAxes` shape for static-family STAT-driving coordinates (wght / wdth / ital / slnt). The data model is already designspace-shaped and is the right foundation for everything in Part 6 below. ✅
- **Audit (`src/lib/font/audit.ts`, lines 620–700, 1062–1210, 1429–1570).** Two passes encode the eleven VF codes: a `glyphCompatibilityChecks` pass on contour count + per-contour point count across all masters, an axis-range pass on `master-axis-unknown / -out-of-range / -missing`, a `master-empty` pass, and the designspace-axes pass (`axis-range-invalid`, `master-orphan-axis`, `master-out-of-range`, `instance-orphan-axis`, `no-instances`). Every code carries describe-prose in the audit catalogue. ✅
- **Catalogue (`src/lib/font/audit-catalogue.ts`).** Codes are grouped under two categories — "Variable-font compatibility" (the per-glyph topology checks) and "Designspace & masters" / "Designspace axes" (the structural checks). The eleven-code count and split is real. ✅
- **Tutorial (`src/routes/learn/variable-fonts/+page.svelte`).** Nine steps covering axes, masters, instances, 2D variation explorer, common gotchas, export. Mentions `font-variation-settings`, registered axes, the wght / wdth canonical first axes, and explicitly references the audit codes from the editor. Already cites variablefonts.io and the fvar chapter. ✅
- **Compare page (`src/routes/compare/+page.svelte`).** Patens already positions itself against FontLab, Glyphs, RoboFont, Fontra, Glyphr Studio, typlr, BirdFont, FontForge, Lipi, Fontish across feature columns. ✅

**What Patens does well today.**

1. The eleven VF codes cover **interpolation safety** at the geometry layer (contour / point count) and **designspace integrity** at the structural layer (axis ranges, master locations, instance references).
2. The 2D variation explorer is genuinely uncommon — Glyphs has a Preview panel and Variation Slider, FontLab has a Variations panel, but a draggable 2D surface with live re-render at any (x, y) in the rectangle is rare outside of Fontra / Skia-Designer-style research tools. ⚠️
3. Patens stores masters as siblings linked through a Family record — this is closer to the designspace `<source>` model than to Glyphs's single-`.glyphs` master list, which gives Patens a cleaner path to designspace v5 import / export later.
4. The catalogue prose explicitly teaches the rules (e.g. "VF interpolation requires identical contour count and order in every master") — every code is already pedagogical.

**Where Patens is thin.**

1. **No STAT modelling at all.** `FamilyAxes` is a shape for STAT, but there's no UI to author STAT records, no axis-value cascade (format 1 / 2 / 3 / 4), no flags (ElidableAxisValueName, OlderSiblingFontAttribute). Result: any VF Patens exports will get a STAT auto-derived from instance names, which is brittle for non-trivial designspaces.
2. **No `avar` editor.** The user-value-to-normalized-value curve is currently linear. There's no UI to bend the wght curve so 400 maps to 0 with a soft elbow rather than a hard 0.5 midpoint.
3. **No intermediate-master inference.** Patens correctly catches missing-axis-value and out-of-range issues, but it doesn't yet flag a "you drew Thin and Black but the Regular midpoint flattens the bowl of /a" semantic interpolation collapse.
4. **No designspace-format import / export.** Patens speaks its own `.font.json` and exports `.otf` / `.woff2`, but doesn't read a Glyphs `.glyphs` or write a `.designspace` v5 file — which is the bridge that lets a designer come from Glyphs / FontLab / RoboFont without re-drawing.
5. **No optical-size validation.** If a designer declares `opsz`, Patens doesn't check that the cap-height, x-height, and stroke contrast actually change across the axis — i.e. it accepts a vacuous `opsz` axis.
6. **Multi-script VF coverage is implicit.** The eleven codes work on Arabic / Devanagari / CJK glyphs the same as Latin — but they don't yet flag script-specific issues like Arabic-joining-glyph contour count changes across masters or CJK ideograph component mismatches.

The rest of this document is research to inform what to add, ranked by leverage at the TypeCon timeline.

---

## Part 2 — The variable-font landscape and history

### 2.1 Origin + history

**The 1990s problem.** TrueType (1991) and PostScript Type 1 stored exactly one outline per glyph. A foundry shipping Thin → Black needed 9 binary files, and tight families (display sans with 14 weights × 3 widths × 2 italics = 84 styles) shipped 84 files. The web (1996 onward) made this a network-traffic problem; on-device font management made it a UI problem. ✅

**Multiple Master fonts (1991–2005).** Adobe's Multiple Master (MM) format, introduced with Adobe Type Manager 3.0, was the first commercial answer. MM stored 2 to N "master designs" and let applications interpolate between them on demand. Adobe shipped about 30 MM faces (Minion MM, Tekton MM, Myriad MM, Adobe Jenson MM). The format failed for four reasons: ✅

1. **No browser support.** The web era began as MM was being deprecated; browsers never implemented MM rendering.
2. **No application support.** Outside Adobe's own apps, MM appeared as a static "default instance" — designers could not vary the font in Microsoft Word.
3. **Font managers couldn't enumerate instances.** OS font menus showed only the master endpoints; users couldn't pick "MyriadMM 565 wt 600 wd."
4. **Adobe abandoned it.** By 2005 Adobe had stopped shipping MM faces. The format was technically functional and conceptually correct, but the surrounding ecosystem never caught up.

**Apple GX Variations (1994–2000).** Apple's parallel attempt, part of QuickDraw GX, bundled font variations into TrueType GX. GX shipped with Skia (Matthew Carter's variable font, 1994 — the first one cut for the format) and never gained third-party adoption. It died when Apple folded GX into Apple Advanced Typography (AAT) and only macOS ever read it. ✅

**The 2016 ATypI Warsaw announcement.** On 14 September 2016, at the ATypI conference in Warsaw, four engineers — **Peter Constable** (Microsoft), **Ned Holbrook** (Apple), **Behdad Esfahbod** (Google), **David Lemon** (Adobe) — jointly announced OpenType 1.8 with variations. The format borrowed Apple's GX `gvar` table structure (intentionally, for backward-compatibility reasons) and merged it with Adobe's MM-derived `fvar` axis schema. The "Four Browsers" framing in the trade press emphasised that the announcement was coordinated specifically to guarantee browser support from all four major engine vendors at once — the failure mode that had killed MM. ✅

**Adoption curve.** Browser support shipped: Edge late 2016, Chrome 62 (Oct 2017), Safari 11 (Sep 2017), Firefox 62 (Sep 2018). Google Fonts shipped its first variable font (Recursive, by Stephen Nixon) in 2019; the catalogue migration to "variable by default" completed in 2022. By 2026, the canonical free families (Inter, Noto Sans, Source Sans, Public Sans, JetBrains Mono, Recursive, Roboto Flex) all ship as variable. ✅

### 2.2 The five registered axes

The OpenType spec reserves five **registered** axis tags. Renderers know their semantics natively; CSS exposes them via `font-weight`, `font-stretch`, `font-style`, and `font-optical-sizing`. ✅

**`wght` — weight.** Range 1–1000 by spec, conventionally 100 (Thin) to 900 (Black) to match the OS/2 weight class. Default 400 (Regular). The CSS `font-weight` property maps directly. ✅

- *What designers get wrong:* drawing Thin and Black masters at extremes that don't actually interpolate cleanly through Regular. Thin's stroke contrast and Black's bowl proportions diverge so far that the linear midpoint is wrong for both. The fix is an intermediate Regular master, but designers often skip it to save weeks of work.
- *Common range mistakes:* shipping wght 100–900 when the design only really lives 300–700 — every interpolated point in 100–299 and 701–900 is geometric extrapolation, not designed.

**`wdth` — width.** Range 1–1000 by spec; conventional usage 50 (UltraCondensed) to 200 (UltraExpanded), with 100 as default Regular. Maps to CSS `font-stretch`. ⚠️

- *What designers get wrong:* the difference between "condensed" (narrow apertures, tight terminals) and "compressed" (narrow body, wider counters). Renderers don't know what you meant; designers conflate them.
- *Common: shipping wdth 75–100 ("Normal to Condensed") without a wider master, then claiming the font has a width axis. Single-direction width axes are valid but the brief should say so.

**`slnt` — slant.** Degrees. Range conventionally `-15` to `0` (an italic-style oblique). Default `0`. The negative sign matches typographic convention: in `slnt`, **negative values lean right** (forward-slanting). Distinct from `ital` — `slnt` is continuous, italic-as-oblique. ✅

- *Common mistake:* shipping `slnt 0 .. 12` with positive values. Many tools mis-handle this.
- *What designers get wrong:* using `slnt` when the design is actually a cursive italic. Cursive italics have structurally different letterforms (single-storey `a`, looped `f`, etc.) — those are `ital 0..1` plus a separate set of contour definitions, not a slant.

**`ital` — italic.** Boolean: 0 (upright) or 1 (italic). Maps to CSS `font-style: italic`. A correctly-built upright-and-italic VF uses `ital` with two masters at 0 and 1, not `slnt` with a slope. ✅

- *Common mistake:* exposing `ital` as a continuous 0..1 axis when the two endpoints aren't drawn-compatible (e.g. lowercase `a` is two-storey at `ital 0` and one-storey at `ital 1`). The OT spec allows this as a discrete axis; renderers will show a slider but the in-between is visually broken.

**`opsz` — optical size.** Points. Range conventionally 6 to 144. Default usually 14 (body text). Maps to CSS `font-optical-sizing: auto` (which sets `opsz` to the rendered `font-size`). ✅

- The original commercial use case: Adobe's Minion Pro Caption / Regular / Subhead / Display were four cuts at four point sizes; `opsz` collapses these into one continuous axis.
- *Design-time discipline:* Ahrens & Mugikura's *Size-specific Adjustments to Type Designs* (2007) is the canonical reference. The classic working-method advice: draw the caption master late at night in dim light, draw the display master in full sunlight — you adjust contrast, x-height, and stroke proportions for actual reading conditions.
- *What designers get wrong:* declaring an `opsz` axis without actually varying the design across it. If cap-height and stroke contrast don't change across `opsz`, the axis is vacuous and the rasteriser does nothing useful. This is a *semantic* check Patens currently doesn't enforce — proposed as `opsz-without-cap-x-divergence` in Part 8.

### 2.3 Custom axes

The OT 1.8 spec permits user-defined axes with **uppercase four-character tags** (registered axes are lowercase; this is the spec-mandated way to distinguish them). The CSS spec exposes them only via `font-variation-settings` — no CSS shorthand maps to custom axes. ✅

**Notable custom axes in production.**

- **`GRAD` (Grade).** First popularised by Frank Grießhammer's work at Adobe, then mainstreamed by Google Fonts' Roboto Flex and Recursive. Grade is a weight-change that does *not* change the advance width — useful for "weight-up on dark mode" without reflowing the line. The wght axis changes both color and width; GRAD changes only color. Roboto Flex's GRAD ranges -200 to 150. ✅
- **`XOPQ` / `YOPQ` (Extra-Opaque, X and Y).** Roboto Flex's parametric axes: XOPQ controls horizontal stroke weight, YOPQ vertical. These were designed by David Berlow as part of TypeNetwork's parametric axis proposal, which would have registered them in the spec but never made it (the proposal sits in OT-spec-discussions). XOPQ / YOPQ remain custom but conventional. ⚠️
- **`YTAS` / `YTDE` / `YTUC` / `YTLC` / `YTFI` (Y-Transparent axes).** More Roboto Flex / TypeNetwork parametric axes — controlling ascender, descender, uppercase, lowercase, and figure heights independently. The `YTAS` tag is widely cited as a name disaster ("Y-Transparent ASCender" — opaque, not the year). ⚠️
- **`MONO` (Recursive).** Stephen Nixon's Recursive has a monospace axis that linearly slides between proportional sans (0) and monospace (1). Used heavily in code editors. ✅
- **`CASL` (Recursive Casual).** Recursive's "casualness" axis — from constructed-geometric to brush-letter informality. ✅
- **`CRSV` (Recursive Cursive).** Italic-like cursive forms continuously dialled in. ✅
- **`softness` / `slant` lowercase custom variants** appear sporadically; conventions are messy.

**Designer-side decision: when to add a custom axis.**

- Add a custom axis when the variation is **orthogonal** to all registered axes (you can't express the design difference as a combination of wght + wdth + opsz). Grade is orthogonal to weight (weight changes both contrast and advance; grade changes only contrast). Recursive's MONO is orthogonal because no combination of wght / wdth / opsz produces monospace.
- Don't add a custom axis when the variation is **already covered** by a registered axis. A "thickness" axis duplicating wght just confuses the OS font menu.
- Every custom axis multiplies the master count. 1 axis = 2 corners minimum; 2 axes = 4 corners; 3 axes = 8 corners. Adding a fourth axis is rarely justified.

### 2.4 The mathematics

**`fvar` — Font Variations table.** Declares axes (tag, min, default, max, name ID) and named instances (location, name ID, optional PostScript name ID). Required for any variable font. ✅

**`gvar` — Glyph Variations table.** Stores per-glyph **deltas** at non-default axis locations. The deltas are applied to the default-master outline; intermediate locations are computed by interpolating between the closest deltas. The interpolation is piecewise-linear in the normalized axis space. ✅

**Designspace coordinates.** Two coordinate systems coexist: ✅

- **User values:** what designers and CSS speak (wght 100 to 900, opsz 6pt to 144pt).
- **Normalized values:** what the gvar interpolator uses internally (always -1 to 0 to +1, with 0 = default). The mapping from user to normalized is linear by default.

**`avar` — Axis Variations table.** Bends the user-to-normalized mapping with a piecewise-linear curve. This lets a designer say "user value 700 should map to normalized 0.5, not 0.6" — useful when the designed-Bold is closer to designed-Regular than the linear default would suggest. Without `avar`, the curve is just `(user - default) / (max - default)`. ✅

- *Common avar use case:* the wght axis defaults to a linear mapping where 700 (Bold) sits at normalized 0.6. If the designed Bold master actually sits two-thirds of the way to Black perceptually, an avar curve mapping 700 → 0.5 keeps the rendered Bold visually correct without re-cutting the master.
- *What designers get wrong:* over-curving the avar mapping until intermediate weights collapse (every weight between Regular and Bold looks identical). The avar curve is for tuning; for structural changes, add a master.

**`STAT` — Style Attributes Table.** Required (per OT 1.8.2 onward) for a "well-formed" variable font and also for correct family-naming on Windows. STAT declares: ✅

- The axis order in the font's identity (e.g. wght comes before wdth in the name).
- The named axis-values: every named location on every axis (e.g. wght 400 is "Regular," wght 700 is "Bold").
- Flags: `ElidableAxisValueName` (this axis-value is the default and should be elided from style names — "Regular" is elided, not "Bold Regular"), `OlderSiblingFontAttribute` (legacy-naming exception for italic).
- Format 1 / 2 / 3 / 4: 1 is a single named value; 2 is a ranged value (this name covers a range); 3 is a single value that links to another axis (Regular → Italic); 4 (added 1.8.4) is a multi-axis named instance (this name covers a specific point in 2+ axes).

STAT is the table that makes OS font menus show "Inter Bold Italic" instead of "Inter Regular Bold Italic 1". Patens does not currently model STAT records. This is the largest missing piece. ✅

**`HVAR` / `VVAR` — Horizontal / Vertical Variations.** Store per-glyph advance-width deltas across axes. Required so the OS can compute the line-break width of `"hello"` at any axis location without rasterising. Without HVAR, the OS falls back to gvar-derived deltas, which is slower and sometimes incorrect for hinted fonts. ✅

**`MVAR` — Metrics Variations.** Stores deltas for font-wide metrics (ascender, descender, x-height, cap-height, underline position, etc.) across axis locations. So a font with `opsz` can have ascender 800 at opsz 6 and ascender 750 at opsz 144 — and the OS respects the change. Without MVAR, those values are fixed at the default-master values. ✅

**Self-intersection at axis extremes.** The most common variable-font geometry bug. When a glyph is drawn correctly at master A (Thin) and master B (Black), it's possible for the *interpolated midpoint* to self-intersect because the linear path between point positions crosses an adjacent contour. The lowercase `a` bowl crossing the stem is the textbook example. Discovered late; fixed with an intermediate master at the midpoint to anchor the interpolation. ✅

**The compatibility-of-paths rule.** Every glyph must have the same number of contours, in the same order, with the same number of on-curve and off-curve points, in the same direction, with components matching, across every master. Patens enforces contour count and per-contour point count today; it does **not** enforce direction or component order. The Glyphs / FontLab industry-standard rule is stricter: even the *connection between corner and curve points* must match. ⚠️

### 2.5 Designspace concept

**`.designspace` XML (Erik van Blokland, ~2010).** A small XML format that describes axes, masters (called `<source>`), and instances. Originally tied to RoboFab / RoboFont; now the standard interchange format between Glyphs, FontLab, RoboFont, and Fontmake. ✅

**Designspace v4 (the long-stable version):** axes, masters with `<location>` records, named instances, default master flag.

**Designspace v5 (2022, fontmake / fonttools):** adds STAT records, allows discrete axes, supports distinct masters per axis location with `<rules>` for substitution (so `g.alt` can be the design at wght 700+ even if base `g` is at wght 100). v5 is the modern interchange format and is what Fontra is built around. ✅

**How designspace differs from Glyphs / FontLab native formats.**

- **Glyphs `.glyphs`:** one big text file with masters inline. Designspace is **separate sources**, which is closer to git-friendly architecture but harder to keep in sync.
- **FontLab `.vfb` / `.vfc`:** binary; designspace is text. v5 designspace is now the canonical text format both can export.
- **RoboFont `.ufo` + `.designspace`:** RoboFont *is* designspace + UFO; no native multi-master format.

For Patens, the relevant point: the family-of-sibling-projects model maps almost 1:1 to designspace v5 `<source>` records. Adding designspace import / export is a relatively small lift compared to writing a Glyphs `.glyphs` parser.

---

## Part 3 — Tooling landscape

Variable-font support across the eleven editors on Patens's /compare page. Confidence per claim varies; treat as a snapshot to verify before publishing publicly.

| Editor | Defines VF | DS import | DS export | Multi-master edit | Axis editor | Named instances | 2D explorer | STAT | avar editor | Non-master preview |
|---|---|---|---|---|---|---|---|---|---|---|
| **FontLab 8** | ✅ | ✅ v4/v5 | ✅ v5 | ✅ native | ✅ | ✅ | ⚠️ slider-based | ✅ explicit STAT editor | ✅ | ✅ |
| **Glyphs 3** | ✅ | ✅ | ✅ | ✅ native | ✅ | ✅ | ⚠️ 2D preview panel | ✅ via plugin and built-in | ⚠️ via plugin | ✅ |
| **RoboFont** | ✅ | ✅ designspace v5 | ✅ | ✅ via designspace | ✅ | ✅ | ❓ via extensions | ⚠️ STAT via extensions | ⚠️ extensions | ✅ |
| **Fontra** | ✅ | ✅ DS v5 native | ✅ | ✅ native | ✅ | ✅ | ✅ "designspace navigator" | ✅ | ✅ | ✅ |
| **Glyphr Studio** | ✅ (basic) | ❌ | ⚠️ limited | ⚠️ limited (2 masters typical) | ✅ | ⚠️ basic | ❌ | ❌ | ❌ | ⚠️ |
| **typlr** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **BirdFont** | ⚠️ MM-style | ❌ | ❌ | ⚠️ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ⚠️ |
| **FontForge** | ✅ | ✅ designspace | ⚠️ limited | ✅ via CID/MM | ✅ | ✅ | ❌ | ⚠️ scripted | ❌ | ✅ |
| **Lipi** | ⚠️ basic | ❌ | ❌ | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ | ❌ | ⚠️ |
| **Fontish** | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ |
| **Patens** | ✅ | ❌ | ❌ | ✅ siblings | ✅ | ✅ | ✅ native 2D | ❌ (not yet) | ❌ (not yet) | ✅ |

**Patens's distinctive strengths today.**

1. **2D variation explorer is best-in-class for free editors.** Fontra has it, FontLab and Glyphs have closer to slider-grid panels. Glyphr Studio doesn't have one. ⚠️
2. **Sibling-per-master architecture maps cleanly to designspace v5.** Adding DS import / export is a smaller jump for Patens than for Glyphs (which has the inverse problem — one file, many masters).
3. **94-code audit module runs continuously.** The eleven VF codes already fire as the designer draws; no equivalent in FontLab / Glyphs (Font Bakery runs as a post-export step).
4. **Browser-native.** No install, no platform lock-in. Glyphr Studio is the only other browser-native peer; Fontra is web-native but server-backed.

**Patens's gaps vs. competition.**

1. **STAT editor.** FontLab, Glyphs, and Fontra all expose STAT records as editable; Patens does not.
2. **Designspace import / export.** Patens can't open a Glyphs / FontLab project; this is the largest barrier to adoption-from-existing-designers.
3. **avar editor.** Only FontLab and Fontra have first-class avar curve editors. Glyphs needs a plugin.
4. **Per-glyph master overrides (sparse masters).** Glyphs's "brace-trick" and FontLab's intermediate masters let a designer add a master that only overrides specific glyphs. Patens stores per-codepoint overrides on each master — the data model already supports this; the UI to author it is the gap.

---

## Part 4 — Designer-side considerations

### 4.1 Axis selection

The decision tree most designers actually use:

- **Text serif (Garamond-, Caslon-, Times-style):** wght (almost always) + opsz (sometimes) + occasionally wdth. Italic = `ital 0/1` discrete. Custom axes essentially never. Example: Source Serif 4 — wght + opsz.
- **Display sans (geometric or humanist):** wght + wdth + sometimes GRAD or opsz. Custom axes occasionally. Example: Roboto Flex — wght + wdth + opsz + 11 custom parametric axes.
- **Script / brush:** wght only (and even then, often awkward). Brush/script geometry resists interpolation because stroke contrast varies non-linearly. Most successful script VFs ship as wght-only with 3+ masters along the axis to keep the brush stroke believable.
- **Monospace (code-ed):** wght + slnt (oblique italic, not cursive — code editors expect compatible advance widths). Sometimes a custom axis for "casualness" or "cursive-on-italic." Examples: JetBrains Mono — wght only; Recursive Mono — wght + slnt + MONO + CASL + CRSV.
- **Multi-script unified:** wght + wdth typically. Adding opsz multiplies work across N scripts. The Source Han series ships wght-only for this reason.

### 4.2 Master placement

**Corner-master vs. intermediate-master.** A 2-axis font needs the four corner masters at minimum. Intermediate masters are added when:

- The interpolated midpoint is structurally wrong (Thin and Black masters don't blend into a convincing Regular without a Regular master in between).
- An optical-size axis needs visible discontinuities between caption, body, and display drawings — `opsz` benefits from 3+ masters: caption, body, subhead, display.
- A wdth axis crosses zero crossings — the Condensed master's leg of `R` may diverge from the Wide master's leg by enough that the midpoint loses a junction.

**How many masters.** Practical guidance for a Latin VF: ⚠️

- **1 axis (wght-only):** 2 corner masters typical; 3 if Thin / Regular / Black are all distinctive.
- **2 axes (wght + wdth):** 4 corner masters typical; 6 if Regular needs anchoring; 8 if all four wdth corners are over-distinctive.
- **3 axes (wght + wdth + opsz):** 8 corners theoretical; in practice, designers ship 4–6 sparse masters and trust avar + intermediate-glyph overrides.

**The compatibility-of-paths rule.** Already noted — every glyph must have the same number of contours, in the same order, with matching components, across every master. Patens enforces count today; the per-glyph manual fix is to add an off-curve point to one master that doesn't visually change the shape but matches the other master's point count.

### 4.3 Named instances

**Why they matter.** ✅

- **CSS:** `font-variation-settings: "wght" 525;` is verbose. `font-weight: 500` is what designers actually write. The CSS mapping from `font-weight: 500` to the VF's wght-axis value is *via the named instance with style name "Medium"*. No named instance = the OS picks a fallback, often wrong.
- **OS font pickers:** macOS Font Book, Adobe apps, Word, every font picker reads the instance list. No instances = "Regular" is the only choice.
- **Designer testing:** the named instances are the documented "designed weights" the designer claims are visually correct. Auto-generated instances at 100, 200, …, 900 commit the designer to nine designed weights; if some of them collapse, that's a bug the named-instance shape exposes.

**Standard names from STAT.** The canonical wght name table: Thin (100), ExtraLight (200), Light (300), Regular (400), Medium (500), SemiBold (600), Bold (700), ExtraBold (800), Black (900). For wdth: UltraCondensed (50), ExtraCondensed (62.5), Condensed (75), SemiCondensed (87.5), Normal (100), SemiExpanded (112.5), Expanded (125), ExtraExpanded (150), UltraExpanded (200). ✅

**Custom-named instances.** A family can ship custom names ("Mono Sans Display Light") for distinctive positions. The STAT format-4 record handles this — a name covering a specific (wght 300, MONO 0) point.

### 4.4 STAT axis values

STAT format briefly: ✅

- **Format 1:** single value with single name. "wght 400 = Regular." Most common.
- **Format 2:** ranged value. "wght 350–449 = Regular." Useful when an axis covers a continuous range but renderers should display a single name. Less common in shipped fonts.
- **Format 3:** linked value. "wght 400 = Regular, links to ital 1 → wght 400 = Italic." This is how STAT correctly produces "Bold Italic" instead of "Bold Regular Italic." Critical for any italic-having family.
- **Format 4:** multi-axis named instance. "wght 700 + wdth 75 = Bold Condensed." Added in 1.8.4. Used heavily in Roboto Flex.

**Common STAT mistakes.**

1. **Missing format-3 italic linkage.** Result: OS shows "Bold Italic Italic" or "Bold Regular." Diagnosable from STAT alone.
2. **Wrong elision flags.** Regular should have `ElidableAxisValueName = true` so the OS displays "Bold" not "Bold Regular." If not flagged, every style name carries a redundant "Regular."
3. **STAT axis count mismatch with fvar axis count.** Every fvar axis must have a STAT record. Otherwise font-pickers fall back to fvar instance names, which are less correct.

### 4.5 Hinting variable fonts

**`cvar` — CVT Variations.** Stores deltas to TrueType `cvt` (Control Value Table) entries across axes. Required if a font is TT-hinted *and* the hinted values should change across the axis (e.g. x-height shifts on opsz). Without cvar, the hints apply the default-master `cvt` values everywhere. ✅

**Current state of the art for variable-font hinting.** ⚠️

- **ttfautohint** does not currently produce cvar deltas — it hints the default master only.
- **VTT (Microsoft Visual TrueType)** supports cvar manually but very few designers use it.
- **The practical advice for screen text:** don't TT-hint a variable font. Use the default-master hints if the static fallback needs them; let modern rasterisers (DirectWrite, CoreText, FreeType post-2.7) render the variable forms via grayscale antialiasing.
- **The Pyodide question.** ttfautohint compiled to WebAssembly via Emscripten exists (used by Font Bakery online); ttfautohint-for-VF specifically would need either (a) running ttfautohint per-instance on a generated static font, then storing the hints — clumsy, or (b) a new tool that computes cvar deltas — doesn't exist as of 2026-05-30.

For Patens, the practical recommendation: ship variable-font hinting as a v2 feature post-launch. The honest version of "should I hint a VF?" answer for the help text is *"For most screen contexts: no. The rasteriser handles it. For print or for legacy renderers: yes, hint the default master only."*

---

## Part 5 — Multi-script variable fonts

Cross-referenced with `multi-script-canon.md`.

**General principle.** Variable fonts are harder for non-Latin scripts for two structural reasons:

1. **More glyphs per script** = more masters to draw. Latin: ~250 glyphs (basic). Cyrillic adds ~100. Greek adds ~120. CJK ideographs: 6,000–20,000+. A two-master CJK VF doubles the disk-and-RAM footprint that's already an order of magnitude larger than Latin.
2. **More complex shaping** = more cross-master compatibility constraints. Arabic joining, Devanagari stacking, Hebrew vowel-pointing all require that the master designs agree on contour count and order even when the glyphs themselves shape-shift.

### 5.1 Arabic + variable fonts

- **DecoType / Thomas Milo** has been experimenting with parametric Arabic for decades — the Arabic Calligraphic Engine in their Tasmeem InDesign plugin was the conceptual ancestor of variable Arabic, though not OT-spec-shaped. ⚠️
- **Joining + axes.** Arabic's four positional forms (isolated / initial / medial / final) each need their own master interpolation. A wght axis multiplies by 4 the per-glyph master count. The fix is structural: ship `liga`-substituted base forms with the positional-form variants computed via GSUB rather than carrying four masters per axis-position.
- **Specific axis trickiness.** wght works cleanly for Naskh and Kufic. wdth is awkward — Arabic doesn't have a strong "width" tradition the way Latin does. opsz works conceptually but is rarely shipped.
- **Examples worth grounding the corpus in:**
  - **Amiri** (Khaled Hosny) — open-source Naskh, not variable but designspace-ready.
  - **Cairo** (Google Fonts) — variable wght-only Arabic.
  - **Reem Kufi** (Khaled Hosny) — variable wght Kufic.
  - **Greta Arabic** (Kristyan Sarkis / TPTQ) — commercial, but documented in Khatt publications.
  - **Noto Naskh Arabic** (Google Fonts) — variable wght, widely deployed.

### 5.2 CJK + variable fonts

- **Master file size.** A static CJK font is 6–20 MB. A two-master variable CJK font is roughly 2×. Three masters: ~3×. This is the binding constraint on shipping a variable CJK font for the web — even with WOFF2 compression, a 12 MB face is unrealistic for most pages.
- **The Source Han series** (Adobe + Google, 2014) is the canonical open-source CJK font family. Source Han Sans VF (released 2021) is wght-only with 7 weights and ships at ~10–14 MB compressed per CJK locale — large but feasible.
- **Component decomposition.** Many CJK ideographs are built from radicals via composite glyphs. A variable CJK font must keep component links consistent across masters; the Patens audit codes `composite-missing-base` and `composite-cycle` already address this, but the *cross-master* version (same composite uses the same base across all masters) is not yet checked.

### 5.3 Devanagari + variable fonts

- **Stacking marks** (vowel signs above and below the base) interpolate cleanly within a master but require the base-mark anchor positions in the GPOS `mark` feature to vary across axes. There is no `MVAR`-equivalent for anchor positions in the spec; the practical approach is to ship per-axis-location anchor deltas via `GVAR`-derived motion. ⚠️
- **The Hind family** (Indian Type Foundry, Google Fonts) is the most-deployed open variable Devanagari, wght-only.
- **Specific interpolation gotchas:** the `ka` consonant's stem and the headstroke (`shirorekha`) must remain compatible across masters. Designers occasionally split the head into a separate contour at Thin and merge at Black; the master-contour-count audit catches this.

### 5.4 Hebrew + variable fonts

- **RTL + STAT.** STAT records work the same way RTL as LTR — the OS-level direction doesn't affect axis values. The trap is the **postScriptName** field, which by convention uses Latin characters; for Hebrew families, the convention is `FamilyName-StyleName` with Latin style names ("Regular" not "רגיל").
- **Frank Ruhl Libre** (Yanek Iontef, Google Fonts) — variable wght Hebrew, widely deployed.

### 5.5 Multi-script implications for Patens

The current eleven VF codes don't distinguish Latin from non-Latin. Specific gaps that matter:

1. **`master-contour-count` mismatch on Arabic positional forms.** Patens audits per-codepoint, but Arabic's initial / medial / final / isolated forms are stored as separate glyph entries linked via GSUB. The current check should be extended to iterate the *output of GSUB substitution* per master, not just the codepoint table.
2. **CJK composite-base cross-master consistency.** New audit code needed (see Part 8).
3. **Devanagari anchor-position drift across masters.** GPOS anchors are not currently checked for VF compatibility; this is a script-agnostic gap that manifests most painfully on Devanagari + Arabic.

---

## Part 6 — Recommended Patens VF features, prioritised

Ranked for the ten-week TypeCon runway. **Pre-launch** = ship before Aug 6. **Post-launch** = ship after TypeCon, as v2 features.

### Rank 1 — STAT table editor (pre-launch)

- **What it does.** UI in `/family/[id]/designspace` to author STAT axis-value records (format 1, 2, 3, 4) with elision flags, axis-ordering, and the italic-linkage relation.
- **Why it matters.** Without STAT, every VF Patens exports has subtly-wrong style names in OS font menus. This is the highest-leverage gap.
- **Implementation difficulty.** Medium. Data model is mostly there (`FamilyAxes`); needs a `StatRecord[]` shape and a UI surface. Export pipeline needs the STAT-builder logic.
- **Audit-code integration.** Three new codes (Part 8): `stat-missing`, `stat-format-mismatch`, `stat-instance-name-mismatch`. Existing eleven untouched.
- **Multi-script implications.** Hebrew + RTL postScriptName quirk to document; otherwise script-agnostic.
- **Citation engine.** OpenType STAT spec chapter (Microsoft), Adobe's "Designing a multi-axis variable font" docs, Behdad's spec-discussion archive.
- **Timing.** Should ship 3–4 weeks before launch so beta users hit it on Inter-class families.

### Rank 2 — Designspace v5 import + export (pre-launch)

- **What it does.** Read and write `.designspace` v5 XML to map sibling-projects ↔ `<source>` records, axes ↔ `<axes>`, instances ↔ `<instances>`.
- **Why it matters.** This is the on-ramp for designers coming from Glyphs / FontLab / RoboFont. Without it, Patens is "draw a font from scratch only," which limits the addressable user base.
- **Implementation difficulty.** Medium. The data model is mostly compatible; the XML round-trip is well-documented and the `fontmake` / `fonttools` source can be referenced. Per-glyph deltas (sparse masters) are the wrinkle.
- **Audit-code integration.** None new; existing checks fire against imported designspaces unchanged.
- **Multi-script.** Round-trip should preserve any script-specific glyph naming; AGLFN check fires post-import.
- **Citation engine.** Designspace v5 spec (fonttools docs), Erik van Blokland's original `.designspace` writeup.
- **Timing.** 4 weeks before launch.

### Rank 3 — Six new semantic-variation audit codes (pre-launch)

- **What it does.** Adds the codes detailed in Part 8: `stat-missing`, `stat-format-mismatch`, `stat-instance-name-mismatch`, `axis-range-extreme`, `master-too-close`, `non-compatible-glyph` (extends master-contour-count with direction + component checks), `interpolation-collapse`, `opsz-without-cap-x-divergence`.
- **Why it matters.** Lifts coverage from syntax to semantics. Today Patens checks "is the file well-formed"; these check "is the design good."
- **Implementation difficulty.** Small to medium. Most extend existing audit passes; `interpolation-collapse` and `opsz-without-cap-x-divergence` need a render-at-midpoint + measure step that re-uses the export pipeline's interpolator.
- **Audit-code integration.** Six to eight new codes; brings the VF family from 11 to 17–19 codes.
- **Multi-script.** Two of the new codes (`non-compatible-glyph` direction-aware, `master-empty-cross-script`) help non-Latin.
- **Citation engine.** Existing canonical-library Family 8 sources cover all eight.
- **Timing.** 2 weeks before launch; can ship per-code as they're built.

### Rank 4 — Master-placement guidance overlay (pre-launch, stretch)

- **What it does.** In the 2D variation explorer, render an overlay showing every named instance as a dot, every master as a square, and shaded "coverage rings" indicating how far the interpolator extrapolates from the nearest master. Designers can spot uncovered regions or wasted overlap visually.
- **Why it matters.** Master placement is the single most consequential decision in VF design and currently has no visual tooling outside of Fontra's research builds.
- **Implementation difficulty.** Small. The explorer already renders dots; this is overlay + coverage-shading math.
- **Audit-code integration.** Feeds `master-too-close` (Part 8) and a new informational `master-uncovered-region` code.
- **Multi-script.** Neutral.
- **Citation engine.** Frere-Jones blog "Mark Making" essays, Klim "Designing Tiempos" essays, Recursive's master-placement documentation.
- **Timing.** Stretch — ship after STAT editor.

### Rank 5 — Instance auto-generation from brief (post-launch v2)

- **What it does.** Given a project brief ("a body-text serif for editorial reading at 12pt+"), auto-generate the named-instance set the brief implies — for that brief, probably Regular + Italic + Bold + Bold Italic at one opsz value.
- **Why it matters.** Most designers ship over- or under-instanced VFs because they don't know the convention. LLM-driven inference from brief intent is genuinely useful.
- **Implementation difficulty.** Small (LLM call + insertion); the prompt-engineering is the work.
- **Audit-code integration.** Feeds `no-instances`, which becomes "no instances + here are the four we'd auto-add for your brief."
- **Multi-script.** Should respect the multi-script canon — Arabic gets no "Italic" instance, CJK rarely takes wdth.
- **Citation engine.** Pulls from brief + the multi-script-canon corpus to constrain suggestions.
- **Timing.** Post-launch v2 feature.

### Rank 6 — avar editor (post-launch v2)

- **What it does.** A spline editor for each axis where the designer can drag normalized-value control points. Live preview re-renders at named instances as the curve bends.
- **Why it matters.** Lets a designer correct interpolation-collapse without re-cutting masters. FontLab and Fontra have this; Glyphs requires a plugin.
- **Implementation difficulty.** Medium. UI is the work; the data model fits in `Axis` as an optional `avarCurve?: [number, number][]`.
- **Audit-code integration.** New `avar-discontinuous` code (curve must be monotonic).
- **Multi-script.** Neutral.
- **Citation engine.** OT `avar` spec chapter; Roboto Flex documentation.
- **Timing.** Post-launch v2.

### Rank 7 — Variable-font browser preview surfaces (post-launch v2)

- **What it does.** Discord / Slack share embeds, OG image with the actual VF rendered at three axis-locations, downloadable "specimen-as-HTML" pages with `font-variation-settings` sliders. Patens already has SiteFooter / og infrastructure to extend.
- **Why it matters.** Marketing fuel — every VF Patens exports gets a sharable "play with my variable font" page. Drives top-of-funnel.
- **Implementation difficulty.** Small.
- **Audit-code integration.** None.
- **Multi-script.** Neutral.
- **Citation engine.** N/A.
- **Timing.** Post-launch.

### Rank 8 — Multi-script VF check extensions (post-launch v2)

- **What it does.** Iterate GSUB-substituted glyphs per master and check that Arabic positional forms, Devanagari conjuncts, and CJK composite-base references stay compatible across masters.
- **Why it matters.** Today the eleven codes are script-agnostic in name but Latin-centric in practice. Non-Latin designers hit cross-master shaping bugs that Patens currently doesn't catch.
- **Implementation difficulty.** Medium. Requires running the GSUB engine at audit time (harfbuzz-js or in-house Harfbuzz-Worker).
- **Audit-code integration.** Three to four new codes in a `vf-multiscript` subfamily.
- **Multi-script.** This is the multi-script feature.
- **Citation engine.** Khatt + Vlachou + Lunde sources from `multi-script-canon.md`.
- **Timing.** Post-launch v2.

### Rank 9 — Variable hinting (Pyodide + cvar) (post-launch v3)

- **What it does.** Run ttfautohint on the default master, lift its TT-hints, then generate cvar deltas by computing per-axis-location displacements.
- **Why it matters.** Niche. Most modern rasterisers don't need TT-hints; this is for Windows-legacy and print workflows.
- **Implementation difficulty.** Large. Requires net-new cvar-derivation code; no existing OSS tool produces this.
- **Audit-code integration.** New `hint-vf-not-supported` and `cvar-missing-for-tt-hinted` codes.
- **Multi-script.** Neutral; mostly impacts Latin / CJK because Arabic / Devanagari hinting was always limited.
- **Citation engine.** Apple TT Reference Manual cvar chapter; ttfautohint docs.
- **Timing.** Post-launch v3 — likely never if Patens stays browser-first.

### Rank 10 — Custom-axis registry + convention check (post-launch v2)

- **What it does.** Maintain a registry of known custom-axis conventions (GRAD, XOPQ, MONO, CASL, CRSV, …) and flag when a project declares a custom axis tag without conforming to the convention (e.g. GRAD outside the canonical -200..150 range).
- **Why it matters.** Custom axes proliferate; today there's no central list. Patens could become the editorial authority by maintaining one.
- **Implementation difficulty.** Small.
- **Audit-code integration.** New `axis-custom-tag-convention-drift` warning.
- **Multi-script.** Neutral.
- **Citation engine.** Roboto Flex documentation, Recursive documentation, fonttools axis-registry repo.
- **Timing.** Post-launch v2.

**Intentionally deprioritised: variable color fonts (COLRv1 + variations).** The spec supports it; the literature on designing them is essentially nonexistent; the user base is too small to justify pre-launch attention. Park for v3.

**Intentionally deprioritised: GitHub Actions `npx patens audit --vf`.** CLI exists; deep VF flag can wait. Most beta users will run the audit in-app.

---

## Part 7 — Open-licensed VF corpus for the citation engine

Building on `canonical-library.md` Family 8. Specific sources to ingest, with licensing posture and audit-code mapping.

| Source | Licensing | Ingest now? | Supports codes |
|---|---|---|---|
| **OpenType 1.9.1 — fvar chapter** ([Microsoft Learn](https://learn.microsoft.com/en-us/typography/opentype/spec/fvar)) | Open (royalty-free reference) | ✅ Already in MVP plan | all current eleven, plus `axis-range-extreme`, `axis-default-not-at-master` |
| **OpenType 1.9.1 — gvar chapter** ([MS Learn](https://learn.microsoft.com/en-us/typography/opentype/spec/gvar)) | Open | ✅ | `master-contour-count`, `master-point-count`, `non-compatible-glyph`, `interpolation-collapse` |
| **OpenType 1.9.1 — STAT chapter** ([MS Learn](https://learn.microsoft.com/en-us/typography/opentype/spec/stat)) | Open | ✅ | `stat-missing`, `stat-format-mismatch`, `stat-instance-name-mismatch` |
| **OpenType 1.9.1 — avar / HVAR / VVAR / MVAR chapters** | Open | ✅ | future `avar-discontinuous`, `hvar-missing` |
| **OpenType variable-fonts overview (Adobe)** ([Adobe Type Tools blog](https://blog.typekit.com/2016/09/14/variable-fonts-a-new-kind-of-font-for-flexible-design/)) | Fair use | ⚠️ excerpt | historical context |
| **Variable Fonts primer — variablefonts.io** (Nick Sherman, Laurence Penney) | Fair use | ⚠️ — already added to corpus per note | designer-facing teaching prose; all codes |
| **Google Fonts — Variable Fonts API docs** ([fonts.google.com/knowledge/glossary/variable_font](https://fonts.google.com/knowledge/glossary/variable_font)) | Apache-2-style permissive | ✅ | `no-instances`, axis-range conventions |
| **Google Fonts — Recursive documentation + design notes** ([recursive.design](https://www.recursive.design/) + [github.com/arrowtype/recursive](https://github.com/arrowtype/recursive)) | OFL + open repo | ✅ | custom axis design (MONO, CASL, CRSV), master placement |
| **Roboto Flex documentation** ([github.com/TypeNetwork/Roboto-Flex](https://github.com/TypeNetwork/Roboto-Flex)) | OFL + open repo | ✅ | parametric custom axes, STAT, avar |
| **2016 ATypI Warsaw — Constable, Holbrook, Esfahbod, Lemon** | Mixed; video on ATypI YouTube ✅ | ⚠️ via transcript | historical context; cite at the family-overview level |
| **Ahrens & Mugikura — Size-specific Adjustments** ([JAF](https://justanotherfoundry.com/size-specific-adjustments-to-type-designs)) | Fair use | ⚠️ excerpt | `opsz-without-cap-x-divergence` |
| **Phinney on Fonts — variable-fonts tag** ([thomasphinney.com](https://www.thomasphinney.com/category/variable-fonts/)) | Fair use (open web) | ✅ snapshot to archive.org | designer-facing context |
| **John Hudson — "Introducing OpenType Font Variations"** ([Tiro Typeworks](https://medium.com/@tiro/introducing-opentype-font-variations-12ba6cd2369)) | Fair use | ⚠️ excerpt | historical, multi-script |
| **Frank Grießhammer — Adobe blog on Source Han VF** | Fair use | ⚠️ excerpt | CJK + VF |
| **Khatt Foundation — Arabic VF essays** ([khtt.net](https://www.khtt.net/)) | Open web | ✅ snapshot | Arabic VF (sparse but real) |
| **DecoType / Thomas Milo — parametric Arabic notes** ([decotype.com](https://decotype.com/)) | Fair use | ⚠️ excerpt | Arabic VF historical |
| **Type Network — parametric-axes proposal** ([typenetwork.com/news/](https://typenetwork.com/news/)) | Fair use | ⚠️ excerpt | custom-axis registry |
| **fonttools axis-registry** ([github.com/fonttools/fonttools](https://github.com/fonttools/fonttools)) | MIT | ✅ | `axis-custom-tag-convention-drift` |
| **Designspace v5 specification** ([fonttools docs](https://fonttools.readthedocs.io/en/latest/designspaceLib/xml.html)) | MIT-style permissive | ✅ | designspace import/export semantics |

**Ingestion priority for pre-launch:** the four MS Learn chapters (fvar / gvar / STAT / avar) plus the Recursive + Roboto Flex repos cover ~80% of the new code coverage. Add JAF (Ahrens & Mugikura) as a fair-use excerpt for opsz prose.

---

## Part 8 — Proposed new audit codes

Lifting Patens from syntax-of-VF to semantics-of-VF. Each code with severity, fixability, prose template, and canonical reference.

### `stat-missing`
- **Severity:** warn
- **Fixable:** yes (auto-generate STAT from instances)
- **Prose:** "This variable font has no STAT (Style Attributes) table. OS font menus may display style names incorrectly — Windows will list 'Bold Italic' as 'Regular Bold Italic'. STAT records the canonical names, default values, and italic-linkage for each axis. Patens can auto-generate a minimal STAT from your named instances."
- **Reference:** [OpenType STAT chapter](https://learn.microsoft.com/en-us/typography/opentype/spec/stat) §STAT Table

### `stat-format-mismatch`
- **Severity:** warn
- **Fixable:** no
- **Prose:** "STAT axis-value formats are inconsistent. Format 1 (single value with name), 2 (ranged value), 3 (linked italic-pair), and 4 (multi-axis instance name) have specific use cases. Using format 1 for italic linkage will not produce 'Bold Italic' instead of 'Regular Bold Italic' on Windows."
- **Reference:** OT STAT §AxisValueTables; Behdad's STAT explainer.

### `stat-instance-name-mismatch`
- **Severity:** warn
- **Fixable:** yes (rename instance)
- **Prose:** "A STAT axis-value name doesn't match the corresponding fvar named-instance style name. Result: the OS may display the STAT-derived name in some apps and the fvar-derived name in others. Convention: keep them identical."
- **Reference:** OT 1.8.2 spec note on STAT/fvar coordination.

### `axis-range-extreme`
- **Severity:** info
- **Fixable:** no
- **Prose:** "The {tag} axis range spans more than {threshold} units (wght > 800, wdth > 100, opsz > 50pt). Designers commonly draw extreme masters that don't interpolate cleanly through the middle of the range. Consider whether you have a designed master near the midpoint, or whether intermediate weights are extrapolation."
- **Reference:** Ahrens & Mugikura on range trade-offs; Recursive documentation on weight-axis decisions.

### `master-too-close`
- **Severity:** warn
- **Fixable:** no (designer decision)
- **Prose:** "Master '{a}' and master '{b}' sit within {percent}% of each other in designspace. Either one master is redundant, or you have a deliberately tight intermediate-master pair — confirm intent. Tight master pairs increase file size and rarely change rendered output."
- **Reference:** Designspace docs on master placement; foundry blog posts.

### `master-not-at-named-instance`
- **Severity:** info
- **Fixable:** yes (add instance at master location)
- **Prose:** "Master '{name}' at ({location}) has no corresponding named instance. Designers often want every drawn master exposed as a pickable style. Either add an instance at this location or confirm the master is intermediate-only."
- **Reference:** OT fvar chapter on named instances.

### `non-compatible-glyph` (extends `master-contour-count`)
- **Severity:** error
- **Fixable:** no (manual outline fix)
- **Prose:** "Glyph U+{cp} differs in contour direction or component reference across masters. VF interpolation requires identical contour order AND direction (clockwise vs. counterclockwise) AND matching component glyph references in composites. Existing checks catch count mismatches; this catches the rarer direction-and-component case."
- **Reference:** OT gvar §Variations and contour compatibility.

### `interpolation-collapse`
- **Severity:** warn
- **Fixable:** no (add intermediate master)
- **Prose:** "Glyph U+{cp} interpolated at axis midpoint has fewer-than-expected visible features. Detected: the rendered bowl of '{glyph}' has perceptual area ≤ {threshold} compared to the {endpoint} master. Likely the path between Thin and Black flattens. Fix: add an intermediate master that anchors the design."
- **Reference:** Frere-Jones "Designing Type" essay on interpolation; Phinney on Fonts.

### `axis-default-not-at-master`
- **Severity:** warn
- **Fixable:** yes (add master at default location)
- **Prose:** "The default location ({tag}={default}) has no drawn master. The font's identity at the default location is computed by interpolation rather than designed. Convention: place at least one master at the default location of every axis."
- **Reference:** OT fvar §Default location requirements.

### `opsz-without-cap-x-divergence`
- **Severity:** warn
- **Fixable:** no (designer decision)
- **Prose:** "The opsz axis is declared but cap-height, x-height, and stroke contrast measure within {threshold}% across the axis range. Optical-size axes should produce visible compensation: caption masters typically have larger x-height and thicker thinnest strokes than display masters. If your design doesn't compensate, the opsz axis is vacuous."
- **Reference:** Ahrens & Mugikura, *Size-specific Adjustments*; Adobe Optical Size whitepapers.

### `instance-at-master-position` (informational, complement to master-not-at-named-instance)
- **Severity:** info
- **Fixable:** no
- **Prose:** "Named instance '{name}' is at the exact location of master '{master}'. This is the recommended pattern (every master exposed as a style), but worth noting for designers who intended to expose only certain masters."

**Total addition:** 10 new codes, lifting Family 8 from 11 to 21 codes. Six are pre-launch (`stat-missing`, `stat-format-mismatch`, `stat-instance-name-mismatch`, `axis-range-extreme`, `master-too-close`, `axis-default-not-at-master`); four are v2 (`non-compatible-glyph`, `interpolation-collapse`, `opsz-without-cap-x-divergence`, `instance-at-master-position`).

---

## Sources

- [OpenType 1.9.1 — fvar table chapter](https://learn.microsoft.com/en-us/typography/opentype/spec/fvar)
- [OpenType 1.9.1 — gvar table chapter](https://learn.microsoft.com/en-us/typography/opentype/spec/gvar)
- [OpenType 1.9.1 — STAT table chapter](https://learn.microsoft.com/en-us/typography/opentype/spec/stat)
- [OpenType 1.9.1 — avar table chapter](https://learn.microsoft.com/en-us/typography/opentype/spec/avar)
- [OpenType 1.9.1 — HVAR table chapter](https://learn.microsoft.com/en-us/typography/opentype/spec/hvar)
- [OpenType 1.9.1 — MVAR table chapter](https://learn.microsoft.com/en-us/typography/opentype/spec/mvar)
- [OpenType 1.9.1 — cvar table chapter](https://learn.microsoft.com/en-us/typography/opentype/spec/cvar)
- [OpenType 1.8 announcement — Microsoft Typography blog](https://learn.microsoft.com/en-us/typography/opentype/spec/otverview)
- [Introducing OpenType Font Variations — Google Open Source Blog](https://opensource.googleblog.com/2016/09/introducing-opentype-font-variations.html)
- [Variations fonts and OpenType 1.8 — LWN.net](https://lwn.net/Articles/701158/)
- [John Hudson — Introducing OpenType Font Variations (Medium)](https://medium.com/@tiro/introducing-opentype-font-variations-12ba6cd2369)
- [Adobe Typekit blog — Variable fonts, a new kind of font for flexible design](https://blog.typekit.com/2016/09/14/variable-fonts-a-new-kind-of-font-for-flexible-design/)
- [variablefonts.io — Variable Fonts primer (Nick Sherman, Laurence Penney)](https://variablefonts.io/)
- [v-fonts.com — variable-font specimens directory](https://v-fonts.com/)
- [Axis-Praxis — variable-font playground](https://www.axis-praxis.org/)
- [Google Fonts — Variable Fonts glossary](https://fonts.google.com/knowledge/glossary/variable_font)
- [Google Fonts — Introduction to variable fonts on the web](https://fonts.google.com/knowledge/introducing_type/introducing_variable_fonts)
- [Recursive — design site](https://www.recursive.design/)
- [Recursive — github source repository](https://github.com/arrowtype/recursive)
- [Roboto Flex — github source repository](https://github.com/TypeNetwork/Roboto-Flex)
- [TypeNetwork — parametric axes proposal](https://variationsguide.typenetwork.com/)
- [fonttools — axis registry](https://github.com/googlefonts/axisregistry)
- [fonttools — designspaceLib documentation](https://fonttools.readthedocs.io/en/latest/designspaceLib/index.html)
- [fontmake — github](https://github.com/googlefonts/fontmake)
- [Erik van Blokland — original .designspace writeup](https://letterror.com/code/designspace.html)
- [Phinney on Fonts — variable-fonts category](https://www.thomasphinney.com/category/variable-fonts/)
- [Frere-Jones Type — blog](https://frerejones.com/blog)
- [Klim Type Foundry — blog](https://klim.co.nz/blog/)
- [Just Another Foundry — Size-specific Adjustments to Type Designs](https://justanotherfoundry.com/size-specific-adjustments-to-type-designs)
- [FontLab 8 — variable fonts documentation](https://help.fontlab.com/fontlab/8/manual/Variations-Designspace/)
- [Glyphs — variable-fonts handbook chapter](https://glyphsapp.com/learn/creating-a-variable-font)
- [Fontra — homepage](https://fontra.xyz/)
- [Fontra — github](https://github.com/googlefonts/fontra)
- [Khatt Foundation — homepage](https://www.khtt.net/)
- [DecoType — homepage](https://decotype.com/)
- [Source Han Sans VF — github](https://github.com/adobe-fonts/source-han-sans)
- [Noto Sans (variable) — Google Fonts](https://fonts.google.com/specimen/Noto+Sans)
- [Hind family — Google Fonts](https://fonts.google.com/?query=hind)
- [Frank Ruhl Libre — Google Fonts](https://fonts.google.com/specimen/Frank+Ruhl+Libre)
- [Amiri — github](https://github.com/aliftype/amiri)
- [Cairo (variable Arabic) — Google Fonts](https://fonts.google.com/specimen/Cairo)
- [Reem Kufi — Google Fonts](https://fonts.google.com/specimen/Reem+Kufi)
- [Apple TrueType Reference Manual — cvar chapter](https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6cvar.html)
- [ttfautohint — homepage](https://www.freetype.org/ttfautohint/)
- [ATypI Warsaw 2016 — variable fonts announcement (talk on YouTube)](https://www.youtube.com/watch?v=L8p7ms9zsbo)
