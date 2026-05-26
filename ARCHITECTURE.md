# Architecture

Patens is a SvelteKit 2 + Svelte 5 application. It runs almost entirely
client-side; a handful of server routes handle cloud share, OG image
rendering, OAuth, and the Anthropic API proxy. This file is the
structural map — read it before working in any unfamiliar area.

For the human-facing contributor workflow, see `CONTRIBUTING.md`.
For the AI-assistant version of the same conventions, see `AGENTS.md`.
For the why-decisions, see `DESIGN_PHILOSOPHY.md`.

---

## Six conceptual layers

```
┌─────────────────────────────────────────────────────────────────┐
│  src/routes/                  Pages + API endpoints              │
│  ────────────                 SvelteKit conventions              │
│   ├── +page.svelte               Home (project list)             │
│   ├── about/ press/ privacy/     Marketing surfaces              │
│   │   security/ compare/         (all prerendered, all SSR'd     │
│   │   changelog/ help/           with JSON-LD for crawlers)      │
│   ├── learn/                     Long-form tutorials             │
│   ├── project/[id]/              Editor (client-only, IDB)       │
│   ├── family/[id]/               Family hub (client-only)        │
│   ├── share/[id]/                Read-only viewer                │
│   └── api/                       Server endpoints                │
│       ├── share/                 Cloud share, versioned          │
│       ├── ai/messages/           Anthropic proxy                 │
│       └── og/[id]/               Per-project OG image            │
├─────────────────────────────────────────────────────────────────┤
│  src/lib/font/                Font model + audit + export        │
│  ─────────────                                                   │
│   ├── types.ts                   Canonical types                 │
│   ├── audit.ts                   94-code audit registry          │
│   ├── audit-compatibility.ts     Master-pair compatibility       │
│   ├── audit-preflight.ts         Release-readiness pass          │
│   ├── path.ts                    Bézier ops, bounds              │
│   ├── path-edit.ts               Boolean / smooth / sample       │
│   ├── export.ts                  buildFont() — OpenType emit     │
│   ├── feature-detect.ts          Glyph-name → OT feature map    │
│   ├── kerning-classes.ts         Class expansion                 │
│   ├── kerning-auto.ts            Silhouette-distance suggester  │
│   ├── kerning-suggest.ts         Anchor-aware adjustments        │
│   ├── family.ts                  Family CRUD                     │
│   ├── family-kerning.ts          resolveKerning / pairOrigin     │
│   ├── family-export.ts           Family bundle .zip              │
│   ├── colr.ts                    COLR/CPAL color font tables     │
│   ├── color-build.ts             Color layer plan                │
│   ├── notdef.ts                  .notdef builder                 │
│   ├── subset.ts                  Codepoint subset                │
│   ├── shape.ts                   HarfBuzz.js shaping             │
│   ├── python.ts                  Pyodide + fontTools (TTF)       │
│   ├── ufo.ts                     UFO export                      │
│   ├── woff2.ts                   WOFF2 wrapper                   │
│   ├── design-md.ts               DESIGN.md generator             │
│   └── glyph-set.ts               Codepoint groupings             │
├─────────────────────────────────────────────────────────────────┤
│  src/lib/glyph/               Glyph-level UI                     │
│  ──────────────                                                  │
│   ├── GlyphBrowser.svelte        Tile grid + bulk select         │
│   ├── GlyphTile.svelte           Single tile rendering           │
│   └── parse-sidebearing-delta.ts ±SB input parser                │
├─────────────────────────────────────────────────────────────────┤
│  src/lib/ui/                  Reusable widgets                   │
│  ───────────                                                     │
│   ├── Panel, Field, Input, Button, Accordion                     │
│   ├── ToastContainer, OfflineIndicator                           │
│   ├── CommandPalette.svelte      Global Cmd-K                    │
│   ├── SettingsDialog, ShortcutsDialog, StorageDialog,            │
│       CreateFontDialog, WelcomeDialog                            │
│   └── LazySection, LoadingPanel, Sparkline, StatsPopover         │
├─────────────────────────────────────────────────────────────────┤
│  src/lib/stores/              Svelte 5 $state classes            │
│  ────────────────                                                │
│   ├── project.svelte.ts          Active project + glyph editing  │
│   ├── audit.svelte.ts            Worker-backed audit results     │
│   ├── preview.svelte.ts          Live FontFace pipeline          │
│   ├── settings.svelte.ts         User preferences (localStorage) │
│   ├── toast.svelte.ts            Notification queue              │
│   ├── palette.svelte.ts          Cmd-K open state (shared)       │
│   └── undo.svelte.ts             Per-glyph snapshot history      │
├─────────────────────────────────────────────────────────────────┤
│  Workers + AI                                                    │
│  ─────────────                                                   │
│   ├── src/lib/audit/audit-worker.ts   Audit pipeline off main    │
│   ├── src/lib/sw/upgrade.ts           SW eviction logic (tested) │
│   ├── src/service-worker.ts           PWA cache + offline        │
│   └── src/lib/ai/                                                │
│       ├── anthropic.ts                API client                 │
│       ├── explain-audit-code.ts       Audit code → plain English │
│       ├── kerning-suggest.ts          Pair suggestion            │
│       └── glyph-suggest.ts            Shape suggestion           │
└─────────────────────────────────────────────────────────────────┘
```

---

## The core flows

### 1. Loading a project

```
URL: /project/<id>/edit
  ↓
+layout.ts (ssr=false) → loadProject(id) from font-studio IDB
  ↓
project = $state<Project | null>(null) in projectStore
  ↓
Routes derive from projectStore.project as $derived
```

A project is a single record under its UUID key in the `font-studio`
IDB database. `loadProject()` reads the JSON, runs `migrate()` to
catch up any schema upgrades, and (if schema actually moved) writes
back the upgraded record. The home page lists every project via
`listProjects()` which reads a parallel index record.

**Family records** live in a separate IDB database (`font-studio-
families`) under `family.id`. The separation is historical — when the
project DB was created in v1 it only had a `projects` store; idb-
keyval can't add a second store to an existing DB without a manual
version bump.

### 2. Editing a glyph

```
User drags a point in the Edit canvas
  ↓
projectStore.updateGlyph(codepoint, updater)
  ↓
project.glyphs[codepoint] mutates (Svelte 5 proxy reactivity)
  ↓
projectStore.dirty = true; debounced flush() to IDB
  ↓
auditStore.request(project) [debounced 80ms]
  ↓
audit-worker.ts runs auditProject + auditCompatibility + preflight
  ↓
postMessage back → auditStore.{perGlyph,compatibility,preflight}
  ↓
/audit and /release pages re-derive their lists
```

The drawing canvas writes through `projectStore.updateGlyph()` which
runs the mutation inside `untrack()` to avoid retriggering its own
listening `$effect`s. The audit runs in a Web Worker (added in
commit `71f1399`) so the main thread stays free for drag-frame
smoothness. Stale-response guard via a monotonic `seq` field so a
slow audit on old state never clobbers fresh results.

### 3. Exporting a font

```
/project/<id>/export button click
  ↓
buildFont(project, { masterId?, family? })
  ↓
expandSubset() if a subset was requested
  ↓
For each glyph:
  → contoursToOpentypeGlyph() (Bézier → opentype.js Path)
  → applyFeatures() (auto-detect from glyph names)
  → resolveKerning(project, family) [project pairs win on collision]
  ↓
font.toArrayBuffer() (opentype.js writes OTF)
  ↓
For TTF: Pyodide + fontTools + ttfautohint (lazy, first run loads ~7MB)
For WOFF2: woff2.ts (in-browser WASM compression)
For UFO: ufo.ts (XML directory + .zip)
For .font.json: JSON.stringify(project)
For bundle .zip: every above + DESIGN.md + LICENSE
  ↓
downloadBlob() (browser-native save dialog)
```

### 4. Cloud share + versioning

```
POST /api/share with project JSON
  ↓
Validate UUID id + 5MB cap
Look up existing token; mint random if none
Compute next version = latestVersion(id) + 1
  ↓
Promise.all([
  put(shares/<id>.json, ...)            // current (= latest)
  put(shares/<id>.token, ...)            // delete-token
  put(shares/<id>/history/v<N>.json)    // immutable snapshot
])
  ↓
Return { id, url, deleteToken, version }
```

The canonical path stays `shares/<id>.json` so every old share link
still works. Versioned snapshots live alongside; `?v=N` on the share
URL returns the immutable historical version. DELETE clears all
versions in one `del()` batch.

### 5. Service worker upgrade

```
New deploy lands → user opens patens.design
  ↓
SW install: cache PRECACHE under name `font-studio-${version}`
  ↓
SW activate:
  caches.keys()
    → cachesToEvict(keys, currentName, 'font-studio-')
    → delete every match (old version caches)
  → sw.clients.claim()
  ↓
SW fetch:
  routeFetch(method, url, swOrigin, IMMUTABLE)
    → 'cache-first'   for build/* (immutable hashed assets)
    → 'network-first' for HTML routes
    → 'passthrough'   for cross-origin + /api/ + non-GET
```

The two pure decisions (`cachesToEvict`, `routeFetch`) live in
`src/lib/sw/upgrade.ts` and are unit-tested. The SW itself imports
them; the rest of the file is event listener glue.

---

## Where SSR is on vs off

| Surface | SSR | Why |
|---|---|---|
| Root layout (`src/routes/+layout.ts`) | **on** | Crawlers need JSON-LD + meta tags in HTML |
| Home (`/`) | on | SSR'd at request time (project list is dynamic per visitor) |
| Marketing pages (`/about`, `/press`, etc.) | on + prerendered | Static at build, served from CDN |
| `/learn/*` | on + prerendered | Same |
| `/changelog`, `/help`, `/compare` | on + prerendered | Same |
| `/project/[id]/*` (editor) | **off** | IndexedDB is browser-only |
| `/family/[id]` | **off** | IndexedDB |
| `/share/[id]` | **off** | Pulls from IDB first, cloud fallback |

The root layout's `ssr = true` is **load-bearing**. Flipping it would
strip every page's `<title>`, meta tags, and JSON-LD from the HTML —
crawlers would see a JS shell. Tests for the welcome strip + tab nav
both depend on SSR being on; flipping would re-introduce the
pre-hydration races that took a session to debug.

---

## Stores — quick reference

| Store | Type | Where used | Notes |
|---|---|---|---|
| `projectStore` | $state class | Editor, audit, spacing, family | Single source of truth for the active project |
| `auditStore` | $state class | /audit, /release | Worker-backed; reactive arrays of issues |
| `previewStore` | $state class | Editor, preview tab | Builds FontFace on debounced project changes |
| `settings` | $state class | Everywhere | User prefs, persisted to localStorage |
| `toast` | function-call API | Everywhere | Auto-dismissing notifications |
| `palette` | $state class | CommandPalette mount + project layout | Shared open/closed flag |
| `undo` | $state class | Editor | Per-glyph snapshot history (Cmd-Z) |

---

## Audit module

The structural spine of Patens. `src/lib/font/audit.ts` exports:

- **`auditProject(project): AuditIssue[]`** — per-glyph checks (contour
  shape, metrics, OpenType invariants, names, etc.)
- **`auditCompatibility(project): AuditIssue[]`** — cross-master
  variable-font compatibility (contour-count, point-count, axis
  range).
- **`preflightProject(project): AuditIssue[]`** — release-readiness
  (vertical metrics consistency, feature integrity, metadata
  completeness, coverage minimums).
- **`describeAuditCode(code: string): string | undefined`** — the
  single canonical dictionary that maps every code identifier to its
  plain-language explanation. Surfaces: Edit-tab audit panel, /audit
  page, /release pre-flight, /learn/audit-codes reference, the AI
  "Explain" feature.

**Audit codes are stable identifiers** (see `DESIGN_PHILOSOPHY.md`
Principle 5). Renaming any code is a breaking change that ripples
through 5+ surfaces. Adding codes is easy; pick the name carefully.

**Fixable codes** (the `FIXABLE_CODES` set in
`src/routes/project/[id]/audit/+page.svelte`) have one-click "Fix"
buttons. Per-issue and per-group bulk fixes are both wired up.

---

## Type pipelines summary

### Drawing → font binary
```
User draws contour
  → BezierContour { commands: PathCommand[] }
  → opentype.js Path via contoursToOpentypeGlyph
  → opentype.js Glyph
  → opentype.js Font.toArrayBuffer()
  → ArrayBuffer (OTF)
```

### OTF → other formats
```
OTF buffer
  ├─→ woff2.ts (WASM compression) → WOFF2
  ├─→ python.ts (Pyodide + fontTools + ttfautohint) → TTF
  ├─→ ufo.ts (XML serializer) → UFO directory → .zip
  └─→ JSON.stringify(project) → .font.json
```

### Variable font
```
Multiple buildFont(project, { masterId })
  → Array of (masterName, location, OTF buffer)
  → buildVariableFont() in python.ts
  → VF .ttf with gvar + HVAR tables
```

### Live preview
```
project changes
  → projectStore mutates (debounced 180ms)
  → previewStore.requestRebuild()
  → buildFont() → register as FontFace via FontFace API
  → CSS rules referring to "PreviewFont_<seq>" pick up the new face
```

---

## Things to read before working in specific areas

| Touching... | Read first |
|---|---|
| Audit module | `src/lib/font/audit.ts` (top 50 lines) + this doc §5 |
| Font export | `src/lib/font/export.ts` `buildFont()` signature + JSDoc |
| Share + versioning | `src/lib/share-blob.ts` + `src/routes/api/share/+server.ts` |
| Service worker | `src/lib/sw/upgrade.ts` (pure helpers) + `src/service-worker.ts` (glue) |
| Project store | `src/lib/stores/project.svelte.ts` |
| Family kerning | `src/lib/font/family-kerning.ts` for the resolve pattern |
| Anything routing-shaped | `src/routes/+layout.ts` (the `ssr = true` posture is load-bearing) |
| AI features | `src/lib/ai/anthropic.ts` for the client; `/api/ai/messages` for the proxy |

---

## Build + test gates

| Gate | Command | What it catches |
|---|---|---|
| Lint | `pnpm exec eslint . --max-warnings 0` | Style + unused vars + Svelte conventions |
| Type-check | `pnpm exec svelte-check --tsconfig ./tsconfig.json` | TS strict, no any, no @ts-ignore |
| Unit + bench | `pnpm exec vitest run` | 506 tests across font model + audit + sync + AI |
| E2E | `pnpm exec playwright test` | 66 specs: a11y (31 routes/modals), tab-nav, welcome, audit-diag, api-smoke, command-palette |
| Bundle | `pnpm run analyze` | Visualize chunk graph; CI gate at 5MB total |
| Build | `pnpm run build` | Production bundle + prerendered routes |

All five run on every CI push. Lint at 0 is enforced; a11y serious
or critical violations fail.

---

## File-system inventory of non-obvious files

| Path | What it is |
|---|---|
| `static/<uuid>.txt` | IndexNow site-verification key |
| `static/llms.txt` | AI-crawler one-paragraph + link map |
| `src/routes/llms-full.txt/+server.ts` | Long-form AI-crawler content (~18KB markdown) |
| `static/demo-fonts/*.otf` | The font the home + share + editor actually render |
| `src/lib/og-fonts/*.ttf` | Subsetted Inter + Lora for OG image generation |
| `static/0a6a8b35...txt` | IndexNow API key file (legitimate, public on purpose) |
| `scripts/subset-og-fonts.mjs` | Regenerates the subsetted OG fonts |
| `scripts/indexnow.mjs` | Pings IndexNow + Bing + Yandex with current URLs |
| `partykit/font-studio.ts` | PartyKit room name (legacy storage namespace) |

---

## Glossary

A few terms used heavily in code + commit messages:

- **Audit code** — stable identifier for a check the audit module
  emits. Example: `self-intersecting`.
- **Composite glyph** — a glyph built from references to other glyphs
  + offsets (Á = A + acute, positioned).
- **Master** — one drawn instance of every glyph at a specific
  designspace location. Variable fonts need ≥2.
- **Instance** — a named point in designspace surfaced as a style
  ("Bold") in OS font menus.
- **Sidebearing** — the space between a glyph's bbox and its advance.
  Left + right.
- **Kerning pair** — adjustment to default sidebearings between two
  specific glyphs / classes.
- **Specimen** — the printable / shareable presentation of a typeface.
- **PreviewFont** — the suffix-versioned FontFace registered by
  previewStore so CSS rules update each rebuild.

---

Last updated: 2026-05-25.
