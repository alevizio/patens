# ADR-010 — Demo project ships open + IDB-seeded

**Status**: Accepted (2026-01, revisited 2026-05)

## Context

The home page leads with the demo project — a working font with 162
glyphs across Latin + Cyrillic + Greek. Visitors who click "Open the
example project" land in `/project/demo/edit` and can immediately
edit, audit, share, export.

Two design choices needed making:

1. **Where does the demo's data come from?** The home page is SSR'd
   for SEO, but the editor is `ssr=false` (IndexedDB needed). On
   first visit, the user's IDB is empty.
2. **What can they do with the demo?** Edit + audit + export at
   will, or read-only?

Alternatives considered for #1:
- **Bundle a static JSON in the build, serve over a route, load
  client-side on first edit-page mount.** Network-dependent; large
  payload (~150KB).
- **Build the demo from a TypeScript source at runtime, seed IDB.**
  Zero network. Demo can use shared builder utilities for glyph
  shapes. Each component reuses the audit/export pipeline normally.

Alternatives for #2:
- **Read-only demo.** Visitor sees but can't edit. Defeats the
  "click and try" experience.
- **Editable demo.** Visitor can edit, audit, export, share. Their
  edits persist locally; cloud share works.

We chose runtime IDB seeding + fully editable demo.

## Decision

The demo project is built at runtime by `createDemoProject()` in
`src/lib/font/demo-project.ts`. On `/project/demo/edit` first load:

1. The route's `+layout.ts` load() function checks IndexedDB for a
   project with `id === 'demo'`.
2. If absent (or if `?fresh=1` is in the URL), it calls
   `createDemoProject()` to build the project in-memory, then
   `saveProject(demo)` to persist to IDB.
3. The editor mounts normally.

The user can:
- Edit the demo glyphs in-place (their edits persist in their IDB)
- Reset to a pristine demo via `/project/demo/edit?fresh=1`
- Share the demo via the cloud-share flow
- Export the demo via the standard /export route
- Fork the demo by exporting as `.font.json` + re-importing

The demo's glyph shapes are defined as polygon primitives in
`src/lib/font/demo-glyphs/`. Each glyph is a hand-tuned outline.
The demo's audit-flagged stubs (the bespoke Cyrillic Я Ж Ф and
the Greek lowercase set) ship with `flagged-for-review` notes so
they're discoverable via the audit's `flagged-for-review` code.

## Consequences

**Positive**:
- **Zero-network experience.** A visitor on a slow connection
  doesn't wait for a 150KB JSON to load before the editor mounts.
- **The demo lives in code.** Updating the demo means editing
  TypeScript + opening a PR; no separate asset pipeline.
- **The demo is the canonical reference.** Tutorials, audit-code
  references, and the "first font" tutorial all point at
  `/project/demo/edit`. The on-page experience matches the docs.
- **Forkable.** A designer can export `.font.json`, re-import,
  rename, and have a personal starting point.
- **Audit module gets exercised on real data.** The demo's
  audit-flagged stubs (Я Ж Ф, Greek lowercase) demonstrate the
  `flagged-for-review` code on every visit.

**Negative / constraint**:
- **The demo's design decisions are now part of the codebase.**
  Changing the demo's stroke contrast or x-height means a PR with
  a code review burden. This is fine for v1.x where the maintainer
  is the type designer too, but ramps into a "should the demo be
  a separate repo?" question later.
- **Demo file size is bundle weight.** Every visitor pays the
  demo-glyph-source-code cost on first load. Mitigated by
  Vite tree-shaking the builder code if the demo route isn't
  visited, and by the demo's polygon primitives compressing well
  in the bundle.

**Commits us to**:
- **`createDemoProject()` is a stable API.** The audit module + the
  e2e tests + the home-page CTA all assume `/project/demo/edit`
  works.
- **The demo ships its own decisions log.** The
  `flagged-for-review` notes in the demo are part of the teaching
  material; removing them silently would degrade the example.
- **`?fresh=1` is part of the URL contract.** It's used by the
  test suite and documented as the "reset" affordance.

## Related

- ADR-001 (browser-native) — runtime IDB seeding is consistent.
- ADR-003 (SSR at root) — `/project/demo/edit` opts out (ssr=false)
  because of IDB; the demo seeding happens client-side.
- `src/lib/font/demo-project.ts` — the canonical builder.
- `e2e/a11y.spec.ts` — the test suite uses the demo on every editor-
  route assertion.
