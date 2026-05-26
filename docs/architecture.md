# Patens — architecture

One page. The intent is "load this in your head before reading code."

## The shape of a project

Everything is one JSON blob. The top-level type is `Project` in `src/lib/font/types.ts`:

```ts
type Project = {
  id: string;
  metadata: FontMetadata;       // familyName, styleName, designer, version, ...
  metrics: FontMetrics;         // UPM, ascender, descender, cap-height, x-height
  glyphs: Record<number, Glyph>; // keyed by Unicode codepoint
  kerning: KerningPair[];
  classes?: KerningClass[];
  sidebearingClasses?: SidebearingClass[];
  axes?: VariableAxis[];
  masters?: Master[];           // per-master glyph overrides
  instances?: VariableInstance[];
  palettes?: ColorPalette[];    // CPAL
  brief?: BriefFields;
  decisions?: DesignDecision[];
  changelog?: ChangelogEntry[];
  features?: ProjectFeatures;
  // ... and ~20 more optional fields
};
```

Every glyph has `contours: BezierContour[]` (and optionally `components: GlyphReference[]` for composites). Contours are arrays of `PathCommand` (M / L / Q / C / Z).

## Storage

`idb-keyval`. One key per project, value is the JSON blob. There's also an INDEX_KEY that stores a `ProjectIndexEntry[]` so the home page can list projects without loading their full payloads.

There's no server (in the traditional CRUD sense). No accounts. No sync. **Cloud share is the one cross-browser path**: when `BLOB_READ_WRITE_TOKEN` is set, the editor can upload a project to Vercel Blob via `POST /api/share/{id}`, and any recipient hitting `/share/{id}` gets the project from the cloud blob. Auth is link-as-capability for reads (anyone with the UUID can view); the originator gets a delete-token sidechannel for `DELETE /api/share/{id}` (constant-time compared in `src/lib/share-blob.ts`). When Vercel Blob isn't configured, share gracefully degrades to local-only and the 404 page surfaces the recovery flow (open the demo, or ask the originator for a `.font.json`).

The portable interchange format is `.font.json` — `JSON.stringify(project, null, 2)` with `id` stripped. Drop one on the home page to import.

## Reactive layer

`projectStore` (`src/lib/stores/project.svelte.ts`) is a `class` with `$state` fields. Mutations go through methods like `setGlyphContours`, `setKerningValue`, `saveProject`. Every mutation re-emits + schedules an auto-save (debounced).

Other stores in `src/lib/stores/`:
- `settings.svelte.ts` — theme, panel layouts, dismissed welcomes
- `toast.svelte.ts` — global toast queue
- `preview.svelte.ts` — live preview state (last typed text, font-face URL)
- `clipboard.svelte.ts` — copy/paste of glyphs across projects

## The audit module — the spine

`src/lib/font/audit.ts` is the most-load-bearing module. **94 codes** covering:

- Contour shape (`self-intersecting`, `duplicate-points`, `near-collinear-points`, `tiny-contour`, `contour-winding-collision`, `off-grid-points`, `sharp-kink`, `open-contour`, `empty`)
- Vertical metrics + topology (`metrics-asc-mismatch`, `metrics-use-typo-off`, `metrics-win-clip-top`, `metrics-cap-above-ascender`, `metrics-x-above-cap`, `metrics-descender-nonnegative`, `metrics-zero-height`)
- Spacing + sidebearings (`zero-advance`, `overflows-advance`, `sidebearing-deeply-negative-lsb/rsb`, `sidebearing-class-drift-lsb/rsb`, `sidebearings-no-classes`)
- OpenType invariants (`palette-length-mismatch`, `pair-orphan-class`, `kerning-class-singleton`, `axis-range-invalid`, `master-out-of-range`, `feature-kern-disabled-with-pairs`, `duplicate-glyph-name`)
- Naming + metadata (`naming-family`, `naming-style`, `naming-family-chars`, `glyph-name-not-canonical`, `glyph-name-empty/invalid/too-long`, `meta-no-copyright/designer/license/vendor-id`, `meta-vendor-id-invalid`)
- Brief completeness (`brief-no-intent`, `brief-no-design-notes`)
- Coverage (`coverage-typo-essentials`, `coverage-latin-1-supp`, `coverage-currency`, `coverage-math`, `glyph-count-low`, `control-glyphs-missing`, `figures-non-tabular`)
- Anchors (`anchor-naming-mark-no-prefix`, `anchor-naming-base-with-prefix`, `anchor-without-partner`, `anchors-missing`)
- Variable-font compatibility (`master-contour-count`, `master-point-count`, `master-axis-unknown/out-of-range/missing`, `master-empty`, `master-orphan-axis`, `instance-orphan-axis`, `no-instances`)
- Kerning classes (`class-empty`, `class-missing-member`, `class-name-format`, `pair-missing-glyph`, `kerning-no-classes`, `kerning-extreme`, `kerning-pair-self`)
- Color fonts (`color-layer-no-palette`, `color-layer-out-of-range`)
- Notes / flags (`notes-todo`, `flagged-for-review`)

Every code has a `message` (the short flag) and a `describeAuditCode(code)` entry (the longer "what does this mean and how do I fix it" copy) — 94/94 coverage as of v1.5.0, the missing-description gap was closed in that release. The same 94-code engine ships as a CLI (`npx patens audit`) for CI pipelines.

The audit is consumed on **five teaching surfaces**:

1. **Editor right-sidebar Audit accordion** — issues for the current glyph; one-click fixes for the fixable codes
2. **Audit page (`/project/[id]/audit`)** — every issue across the project, filterable by severity + by code, deep-linkable via `?code=X`
3. **Release pre-flight** — same audit filtered to error severity, gates a release
4. **Family hub (`/family/[id]`)** — per-sibling audit roll-up (error / warn / clean)
5. **Home page** — per-project audit chip in the card

All five read from `auditProject(project)` + `describeAuditCode(code)`. Adding a new code = update audit.ts + add a describe entry; the five surfaces pick it up automatically.

## Export pipeline

Two paths:

**OTF + WOFF2 — in-browser via opentype.js.** `src/lib/font/export.ts` builds the font object from the project, writes glyph outlines via `opentype.path` operations, attaches kern + GPOS + GSUB tables, serialises. WOFF2 compression happens via a wasm module. No server, ~150ms for the demo font.

**TTF + ttfautohint — Pyodide.** When the user asks for hinted TTF, we load Pyodide (~7MB, cached) + fontTools + ttfautohint and pipe the OTF through. ~5-10 seconds first time, ~2 seconds on subsequent calls.

The share page's Download buttons use the in-browser path only; the editor's Export tab offers both.

## Share page

`src/routes/share/[id]/+page.svelte` is one of the longest single-file components (~2600 lines). It does a lot:

- Foundry-style tester (master switch + size + tracking + features + palette + sample-text presets, all URL-synced)
- Reading specimens at three sizes
- In-context mockups (button, headline, stat, body)
- Master compare (when masters > 1)
- OT features chip list (grouped)
- Coverage heatmap
- Glyph grid with filter + categories
- Glyph inspector with metric guides, master overlay, anchor visualizer
- CSS embed snippet with copy
- Dual-format download with master picker
- Print specimen sheet (Cmd+P → PDF)

Renders client-only (`ssr=false`). Lazy-mounts the heaviest sections via `LazySection.svelte` so cold load doesn't pay for all ~80 GlyphTile SVGs at once.

## Composite resolution

Some glyphs (Aacute, æ, œ, fi, fl) have empty `contours` but non-empty `components`. The share page's `resolveContours(g)` walks components, applies their offsets, concatenates the resolved contours of each base. Recursion is depth-limited (6) to guard against cycles. The same logic is what makes the demo's drawn ß + composite ligatures both visible everywhere.

## Variable fonts

`Project.masters[]` carries per-master glyph overrides (just the deltas, indexed by codepoint). The default master is implicit in `Project.glyphs`. The Italic master in the demo applies a `slnt`-axis shear with per-glyph-class deviation (caps 8°, lowercase 9-11°, digits 0°, punctuation 4°) so the result reads as drawn rather than as a uniform CSS transform.

## OpenType features

Detected via glyph-name suffixes. Glyphs named `a.ss01`, `c.smcp`, `zero.onum` get auto-emitted as substitutions in the corresponding feature at export time. Ligature substitutions use underscore-joined names: `f_i` → `fi` for the `liga` feature. See `src/lib/font/feature-detect.ts`.

The share page's tester applies the substitutions live in the typeset loop — toggle `ss01` and the `a` morphs, toggle `liga` and `fi` collapses.

## Things that aren't here yet

See [ROADMAP.md](../ROADMAP.md).
