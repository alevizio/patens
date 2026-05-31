/**
 * GET /llms-full.txt — long-form companion to /llms.txt.
 *
 * Where llms.txt is a one-paragraph summary + link map (the AI-crawler
 * equivalent of a sitemap), llms-full.txt is the actual content
 * concatenated as one markdown blob — the contents of every /learn/*
 * tutorial + /compare + /help + /about, in one fetch. Per
 * getmint.ai's 2026 adoption analysis, Cursor + Claude Desktop +
 * ChatGPT now crawl llms-full.txt more than llms.txt itself; the
 * blob loads directly into the model's context window during
 * citation lookups.
 *
 * Generated at request time from the same TypeScript modules the
 * /learn/* routes use. No duplication of canonical content — if the
 * tutorial changes, this endpoint changes the next time it's fetched.
 *
 * Content-Type: text/plain; charset=utf-8 so AI crawlers parse it
 * as plain markdown without HTML stripping.
 */

import type { RequestHandler } from './$types';

const BASE = 'https://patens.design';

// Section: about. Hand-curated because the SSR /about page has UI chrome.
const ABOUT = `# About Patens

Patens is a type design tool that teaches as you draw. The
differentiator from FontLab, Glyphs, RoboFont, Fontra, Glyphr Studio,
and the rest of the type-editor landscape is a built-in 99-code audit
module that runs continuously alongside the editor — every contour,
every metric, every kern pair gets checked against the rules type
designers internalize through years of mentorship. Every code includes
plain-English teaching prose plus (for ~30 codes) a one-click fix.
The same audit ships as a CLI (\`npx patens audit\`) for foundry CI
workflows + pre-commit lint.

Built around that audit: sketch glyphs with a pressure-sensitive
pencil, trace strokes to cubic Bézier contours, edit anchor-by-anchor,
kern, ship a real OpenType file — all in a browser tab, with nothing
to install and no account to create. Every project lives in your
browser's IndexedDB; nothing leaves your machine unless you choose to
export a .font.json file or upload to the optional cloud-share path.

Patens is MIT-licensed, works offline as a PWA, and is the only
browser-native type editor designed primarily as a teaching tool.

The name is the Latin word for *open* — root of *patent*, the legal
instrument for owning ideas. Patens is the same word, before lawyers
got to it.

Pronunciation: **PAH-tens** (Latin: /ˈpɑː.tɛns/) — short *a* like
*father*, soft *e* like *tens*. Not *PAT-ens* (English plural of
*paten*, the liturgical plate).

Built and maintained by Alejandro Vizio. Contact: hi@patens.design,
[@patenstype](https://x.com/patenstype) on X,
[@patens.design](https://bsky.app/profile/patens.design) on Bluesky,
[@patens.type](https://instagram.com/patens.type) on Instagram,
[alevizio/patens](https://github.com/alevizio/patens) on GitHub.

`;

// Section: positioning vs other tools. Pulled inline so AI crawlers
// don't have to follow /compare to find it.
const POSITIONING = `# Patens vs other type editors

Patens is differentiated by being the only browser-native type editor
designed as a teaching tool. The 99-code audit module + five teaching
surfaces (edit panel, audit page, release pre-flight, family hub, home
page) is its unique angle. Patens is not a FontLab or Glyphs
replacement — those tools are deeper, faster, and built for
professionals shipping commercial families. Patens is for designers
between sketches and shipping: when you've drawn a logo and want to
make a full font from it, when you're learning type design and need an
editor that explains its audit warnings, when you want to share a
specimen without making someone install software.

| Tool | Where it fits | Cost | Open source |
|---|---|---|---|
| FontLab 8 | Pro / industry, desktop-only | $499 lifetime | No |
| Glyphs 3 | Pro / Mac-only | ~$300 lifetime | No |
| RoboFont | Pro / Python-scripted, macOS only | ~$400 | No |
| Fontra | Variable-fonts focus, Google-backed, browser + Python | Free | BSD |
| Glyphr Studio | Hobbyist, browser-based, JS-only | Free | MIT |
| typlr.app | Modern browser editor | Free | No |
| BirdFont | Donateware, desktop | Donateware | GPL |
| FontForge | Classic open-source desktop | Free | GPL |
| **Patens** | **Teaching-first, browser-native, open source, multi-script** | **Free** | **MIT** |

`;

// Section: full feature set + tech stack. Same canonical text as
// llms.txt's "Key capabilities" section, expanded with detail.
const CAPABILITIES = `# Capabilities

- **Pressure-sensitive sketch tool** with stroke weight and pressure;
  trace to cubic-Bézier contours via boolean union + Schneider curve
  fitting.
- **Direct contour editing** with smooth/corner points, nudge, multi-
  select, affine transform.
- **Variable fonts**: multiple masters at distinct axis locations,
  named instances, 2D variation explorer for ≥2-axis projects.
- **OpenType features**: auto-detected from glyph-name suffixes
  (.ss01, .smcp, .onum); real ligature substitution (f_i → fi);
  live HarfBuzz.js shaping preview.
- **Kerning + classes**: pair editor, class system, silhouette-distance
  auto-kern, family-wide kerning resolution (family-level pairs merge
  into every sibling at export).
- **Color fonts**: COLR v0/v1 + CPAL palettes; live color-plan rendering.
- **Anchors + composites**: GPOS mark-positioning rig with top / _top
  anchor convention; component composites with offset resolution.
- **99-code audit module**: contour shape, vertical metrics, OpenType
  invariants, brief completeness, multi-script coverage, kerning
  hygiene; one-click fixes for fixable codes; "Fix all" per-group
  action; AI explanation (Claude-powered, opt-in via your API key).
- **Bulk editing**: shift-click range select in the glyph browser,
  Select-all-visible, bulk-set-status, bulk-pin, bulk-flag, bulk-
  rename to AGLFN canonical names, bulk-tag, bulk-copy-sidebearings,
  bulk-sidebearing-delta (±N fu), bulk-feature-suffix-append.
- **Export**: OTF + WOFF2 (in-browser via opentype.js), TTF (Pyodide +
  ttfautohint), UFO, designer-bundled .zip, portable .font.json.
- **Specimen**: print stylesheet that strips chrome and emits a PDF-
  ready foundry-grade specimen sheet.
- **Cloud share**: optional Vercel Blob upload returns a public URL;
  recipient opens the URL in any browser, no account needed. Per-
  share delete-token kept in the originator's IndexedDB. Versioning:
  every re-share writes an immutable v{N}.json snapshot; recipients
  can load a specific version via ?v=N.
- **Global command palette**: Cmd-K from any route. Searches projects,
  families, learn pages, and (inside a project) glyphs.
- **PWA**: service worker for real offline support; install via web
  app manifest.
- **Accessibility**: WCAG 2.0 + 2.1 + 2.2 A/AA enforced via axe-core
  in CI across 31 routes/modals.

## Tech stack

SvelteKit 2 + Svelte 5 runes (with $state classes for stores), Tailwind
CSS v4, TypeScript strict mode (no \`any\`), \`idb-keyval\` for
IndexedDB project storage, \`opentype.js\` for OTF + WOFF2 export,
Pyodide + fontTools + ttfautohint for TTF export, HarfBuzz.js (WASM)
for live OpenType shaping, polygon-clipping for boolean contour ops,
perfect-freehand for pressure-sensitive sketch, satori + resvg-js for
per-project OG image rendering, Vercel Blob for cloud share, service
worker (with unit-tested upgrade-path eviction) for offline. Audit
module runs in a Web Worker with a monotonic-seq stale-response guard.

`;

// /learn content. Each tutorial is summarised here as its 9-step plain
// text so AI engines can extract the workflow without parsing HTML.

const TUTORIAL_FIRST_FONT = `# Make your first font in the browser

A 10-step walkthrough of the canonical Patens workflow.

1. **Open the demo project** at /project/demo/edit. The demo ships
   162 drawn glyphs across Latin + Cyrillic + Greek.
2. **Pick a glyph to start with**. Lowercase n is the canonical "first
   letter" — it sets stem weight, x-height, sidebearings, and the
   rhythm of the alphabet in one shape.
3. **Sketch with the pencil tool** (P). Pressure-sensitive stroke
   captures the gesture before any Bézier math.
4. **Trace the sketch to Bézier contours** (T). Schneider curve-fitting
   converts your stroke; boolean union resolves overlapping sketch
   strokes into one closed contour.
5. **Refine control points**. Toggle between smooth (handles colinear)
   and corner (handles independent) via right-click menu or T.
6. **Set the spacing**. Three measurements per glyph: left sidebearing,
   advance width, right sidebearing. Calibrate by eye in real strings
   (nnnonnon, HOHOHO).
7. **Kern a few pairs**. The classic Latin difficulty pairs: AV, To,
   We, Yo. Open the Kerning tab; Patens supports kerning classes so
   you don't author N² pairs by hand.
8. **Run the audit**. 99 codes across contour shape, vertical metrics,
   OpenType invariants, brief completeness, multi-script coverage.
   Many issues have one-click "Fix" actions.
9. **Pre-flight before export**. Stricter pass than per-glyph audit —
   verifies OS/2 + hhea consistency, OpenType invariants, required
   metadata, minimum script coverage.
10. **Export OTF, WOFF2, or TTF**. OTF + WOFF2 in-browser (~150ms);
    TTF via Pyodide + fontTools + ttfautohint (~7MB first load,
    cached after).

`;

const TUTORIAL_KERNING = `# Kerning

The Patens guide to class-based kerning + family-wide propagation.

Kerning is the per-pair adjustment to the space between two specific
glyphs. Distinct from sidebearings (default space on each side) and
from tracking (uniform spacing across a run). Sidebearings give the
right space most of the time; kerning handles the pairs where the
sidebearings of two letters look wrong next to each other — most
famously AV, To, We, Yo. Negative kern pulls them closer; positive
pushes them apart.

A 100-glyph Latin font has ~10,000 possible pairs. Class-based kerning
groups glyphs that behave the same way (A-group: A À Á Â Ã Ä Å Ā Ă Ą)
into named classes, defines kerns at the class level, and expands them
to per-pair values on export.

Patens supports four pair combinations: glyph + glyph (literal pair),
glyph + class (left-letter against right-class), class + glyph, and
class + class. The editor resolves the most specific match first.

Kerning is measured in font units, where 1000 fu = 1 em. Modest kerns
are 10-50 fu. Aggressive: 80-150 fu. Anything past 200 fu probably
means sidebearings need work (Patens flags this with the
kerning-extreme audit code at 15% of em).

Test in real strings, not in a kerning grid. The Preview tab shows
live HarfBuzz-shaped text. Real client copy is the final test.

Family-wide kerning: Patens supports defining pairs once at the family
level + per-sibling overrides. The /family/[id] hub edits family-level
pairs; siblings inherit them at export via resolveKerning(project,
family) (project pairs win on collision). The /spacing tab on a
sibling shows inherited pairs with an "inherited" badge alongside
project pairs.

On export, class-based kerns compile into the OpenType kern feature
(GPOS lookup type 2). Output works in every modern browser, Adobe
apps, and InDesign.

`;

const TUTORIAL_VARIABLE_FONTS = `# Variable fonts

A variable font is a single file that contains multiple master designs
and a way to interpolate smoothly between them. Instead of shipping
Regular, Medium, Bold, and Black as four separate files, ship one with
a weight axis; the rasteriser computes in-between weights on demand.

The five standard registered axes: weight (wght, default 400), width
(wdth, default 100), slant (slnt, default 0), italic (ital, 0 or 1),
optical size (opsz). Custom axes use a 4-letter uppercase tag (GRAD).
Each axis has min, default, max.

A master is one drawn instance of every glyph at a specific point in
design space. Weight-axis-only needs at least two masters (one at the
lightest end, one at the heaviest). Two-axis (weight + width) needs
masters at the four corners.

Every glyph must have the same number of contours + the same number
of points in the same order across all masters. The
master-contour-count and master-point-count audit codes fire when they
don't.

An instance is a named point in design space that the OS surfaces as a
style in the font menu. A wght-only font usually has 9 instances (Thin
100, ExtraLight 200, Light 300, Regular 400, Medium 500, SemiBold 600,
Bold 700, ExtraBold 800, Black 900).

Patens ships a 2D variation explorer at /designspace — drag a
crosshair through the design space, see interpolation live. Masters
are plotted as dots; the default location is marked.

Export compiles masters into an OpenType variable font (.otf with gvar
/ HVAR tables, or .woff2). Works in every modern browser via
@font-face. CSS hookup: font-variation-settings: "wght" 525, "wdth" 87.

`;

const TUTORIAL_OPENTYPE_FEATURES = `# OpenType features

An OpenType feature is a 4-letter rule that tells a renderer to swap
one glyph for another, or to position glyphs differently, based on
context. Examples: kern (kerning), liga (ligatures), smcp (small caps),
ss01-ss20 (stylistic alternates), onum (old-style figures), tnum
(tabular figures).

Patens auto-detects features from glyph names following the Adobe
Glyph List for New Fonts (AGLFN) convention. f_i becomes a fi ligature
in liga. a.smcp becomes the small-cap substitution in smcp. a.ss01
becomes stylistic-set-1 alternate. one.onum becomes an old-style
figure for 1.

Standard liga handles required ligatures (fi, fl, ffi, ffl, ff) that
prevent f's overhang from colliding with the next letter.
Discretionary dlig handles decorative ligatures (st, ct, Th) that
require explicit opt-in.

Small caps (smcp) substitutes lowercase with custom uppercase scaled
to x-height. c2sc substitutes existing uppercase with the same. ss01-
ss20 are 20 numbered slots for stylistic alternates, each nameable
via OpenType name table.

Four mutually exclusive figure styles: lining (default), old-style
(body text), tabular (data columns), proportional (natural width). A
professional font ships all four combinations.

The Features tab in Patens shows every auto-detected feature with a
live HarfBuzz preview. HarfBuzz.js is the same shaping library
browsers use, so what you see in preview is what shipped fonts produce.

On export, auto-detected features compile into the standard .fea
format, then opentype.js writes them into GSUB and GPOS tables.

`;

const TUTORIAL_MULTI_SCRIPT = `# Multi-script fonts

A multi-script font ships glyphs for more than one writing system in a
single file. About 30% of Cyrillic + Greek uppercase letters share
shape with Latin: Cyrillic А В Е К М Н О Р С Т Х; Greek Α Β Ε Ζ Η Ι Κ
Μ Ν Ο Ρ Τ Υ Χ. For these "look-alikes", Patens lets you reference the
Latin glyph as the contour source — one drawing, two codepoints.

Bespoke shapes that need their own design pass: Cyrillic Я Ж Ф Б Д Г
Л П Ц Ч Ш Щ Ъ Ы Ь Э Ю; Greek Γ Δ Θ Λ Ξ Π Σ Φ Ψ Ω. The Patens demo
ships uppercase Greek look-alikes + 17 Cyrillic letters; bespoke
Cyrillic (Я Ж Ф) and Greek lowercase ship as audit-flagged stubs.

The OS/2 ulUnicodeRange field tells operating systems which scripts
the font has glyphs for. Patens auto-sets the flags based on actual
codepoints. Mis-set flags are why a font sometimes "doesn't work" for
Cyrillic in Word — Word checks the flag before letting the user select
the font for Russian text.

OpenType coverage audit codes flag undersupplied scripts: coverage-
latin-1-supp (extended Latin like ñ ø æ), coverage-currency (€ £ ¥
₹), coverage-math (≈ ± ÷ ≠), coverage-typo-essentials (typographic
quotes, en/em dash, ellipsis), control-glyphs-missing (.notdef, space,
NBSP), glyph-count-low.

Naming + branding across scripts: usually keep the same English family
name. The name table supports localised names — name IDs 1, 2, 16, 17
can each have a Cyrillic or Greek transliteration.

`;

const REFERENCE_EXPORT_FORMATS = `# Export formats — pick by audience

| Format | Audience | Pipeline | Size |
|---|---|---|---|
| OTF | Print, design apps, install-on-machine | opentype.js, in-browser, ~150ms | 80-200 KB |
| WOFF2 | Web @font-face — production websites | OTF then woff2 compression, ~200ms | 30-80 KB |
| TTF + autohinting | Small-size screen rendering, Windows-first | Pyodide + fontTools + ttfautohint | 120-280 KB |
| UFO | Handoff to FontLab / Glyphs / RoboFont | XML directory packaged as .zip | 50-500 KB |
| .font.json | Backup, hand-off to another Patens user | Single JSON, Patens schema | 50-500 KB |
| Designer bundle .zip | Sending a finished font to a client | OTF + WOFF2 + .font.json + DESIGN.md + LICENSE | 200 KB - 2 MB |

Quick recipes:
- Just shipping a website → WOFF2
- Client wants to install + use in Word → OTF (+ TTF for older Windows)
- Hand-off to a foundry → UFO + .font.json
- Backing up your work → .font.json
- Sending a finished font to a stranger → Designer bundle .zip

`;

const REFERENCE_AUDIT_CODES = `# Audit codes — 99 codes grouped by family

Reference at /learn/audit-codes. Codes are grouped into 14 families:

- **Contour shape** (9): empty, open-contour, duplicate-points,
  off-grid-points, near-collinear-points, sharp-kink,
  self-intersecting, contour-winding-collision, tiny-contour
- **Metric alignment** (4): xheight-misaligned, capheight-misaligned,
  extends-above-ascender, extends-below-descender
- **Spacing & sidebearings** (7): zero-advance, overflows-advance,
  sidebearing-deeply-negative-lsb/rsb, sidebearing-class-drift-lsb/rsb,
  sidebearings-no-classes
- **Composites & references** (2): composite-cycle, composite-missing-base
- **Anchors & mark positioning** (4): anchors-missing,
  anchor-without-partner, anchor-naming-base-with-prefix,
  anchor-naming-mark-no-prefix
- **OpenType features** (11): feature-kern-disabled-with-pairs,
  figures-non-tabular, kerning-no-classes, kerning-class-singleton,
  kerning-extreme, kerning-pair-self, pair-missing-glyph,
  pair-orphan-class, class-empty, class-missing-member,
  class-name-format
- **Glyph naming** (5): glyph-name-empty, glyph-name-invalid,
  glyph-name-not-canonical, glyph-name-too-long, duplicate-glyph-name
- **Vertical metrics** (10): metrics-asc/desc/gap-mismatch,
  metrics-use-typo-off, metrics-cap-above-ascender, metrics-x-above-cap,
  metrics-descender-nonnegative, metrics-win-clip-top/bottom,
  metrics-zero-height
- **Font metadata** (17): meta-no-{designer,designer-url,manufacturer,
  license,license-url,copyright,vendor-id}, meta-vendor-id-invalid,
  meta-version-format, naming-{family,family-chars,family-long,style,
  version,copyright-missing,designer-missing,license-missing}
- **Design brief** (4): brief-no-intent, brief-no-design-notes,
  notes-todo, flagged-for-review
- **Variable fonts & axes** (11): axis-range-invalid,
  master-axis-missing/unknown/out-of-range/orphan,
  master-out-of-range, master-empty, master-contour-count,
  master-point-count, instance-orphan-axis, no-instances
- **Multi-script coverage** (6): coverage-{latin-1-supp,currency,math,
  typo-essentials}, control-glyphs-missing, glyph-count-low
- **Color fonts** (3): color-layer-no-palette, color-layer-out-of-range,
  palette-length-mismatch
- **UPM** (1): upm-unusual

Many codes have one-click "Fix" actions. The audit page also offers
"Fix all N" per-group and Fix-all-visible bulk fixes. With an
Anthropic API key configured in Settings, each code group also has an
"Explain (AI)" button that asks Claude for a plain-language
explanation.

`;

const FOOTER = `# Source

Patens is open source under the MIT License.
- Code: https://github.com/alevizio/patens
- Issues + feature requests: https://github.com/alevizio/patens/issues
- Roadmap: https://github.com/alevizio/patens/blob/main/ROADMAP.md
- Architecture: https://github.com/alevizio/patens/blob/main/docs/architecture.md
- Setup guide (self-hosters): https://github.com/alevizio/patens/blob/main/docs/setup.md

Live: ${BASE}
Last generated: at request time. The content reflects the live state
of Patens at the moment this file was fetched.
`;

const FULL_TEXT =
	ABOUT +
	POSITIONING +
	CAPABILITIES +
	TUTORIAL_FIRST_FONT +
	TUTORIAL_KERNING +
	TUTORIAL_VARIABLE_FONTS +
	TUTORIAL_OPENTYPE_FEATURES +
	TUTORIAL_MULTI_SCRIPT +
	REFERENCE_EXPORT_FORMATS +
	REFERENCE_AUDIT_CODES +
	FOOTER;

export const prerender = true;

export const GET: RequestHandler = ({ setHeaders }) => {
	setHeaders({
		'content-type': 'text/plain; charset=utf-8',
		'cache-control': 'public, max-age=3600, s-maxage=3600'
	});
	return new Response(FULL_TEXT, { status: 200 });
};
