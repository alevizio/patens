# Roadmap

What's deliberately deferred from `v1.4.0` and why.

## M3 — Cloud sharing ✅ SHIPPED in v1.0.0

The share-link recipient story is no longer browser-local. Tier 2 shipped:

- **Vercel Blob backend.** `src/routes/api/share/+server.ts` accepts a project JSON `POST` from the editor and the home page, uploads to `shares/{id}.json` keyed by the project's existing UUID. 5MB cap; payload validation; 503 when `BLOB_READ_WRITE_TOKEN` isn't set.
- **Share page hydration.** `src/routes/share/[id]/+page.ts` tries IndexedDB first, then `GET /api/share/{id}` (Vercel Blob), then surfaces the 404 recovery copy if both miss. The fetched project is saved to IDB so the next view is instant.
- **Link-as-capability auth.** No accounts. The share URL contains the project's existing UUID (already unguessable client-generated). Anyone with the URL can view; no one without it can.
- **Upload-on-share.** Editor header + home-page card "Copy share link" buttons now upload first, then copy. Failure modes handled: 503 (cloud not configured) falls back to local-only with a clear warning; network errors surface as toast errors.

What's still deferred:
- **Re-share versioning.** Re-uploads currently overwrite. A version history (with deep-link to a specific version) is future work.
- **Delete API.** Today a share lives until the Vercel Blob store is wiped. A self-service delete by the originator (key signed by their IndexedDB project record) is future work.
- **Per-project OG image.** Now achievable with cloud — server-render a preview at request time using the uploaded project. ~1 day on top of the cloud arc.

## Per-project OG image ✅ SHIPPED in v1.1.0

`src/routes/og/[id]/+server.ts` renders a 1200×630 PNG via satori + resvg-js. Family name in self-hosted Lora serif, designer + version + glyph count below. Demo OG renders on the fly; uploaded projects render from cloud storage; brand variant at `/og/home` for the home-page unfurl. Font files self-hosted under `static/og-fonts/` (Wave 11) so OG rendering no longer depends on Google Fonts being reachable.

Still deferred: regenerating OG on re-share (today the OG is rendered at request time, so re-shares already pick up new metadata — but a cached-pre-rendered variant for higher hit rate is future work).

## Account system

If cloud storage lands, account boundaries become relevant (deletes, quotas, sharing controls). v1 doesn't have any of this; everything is "if you can guess the URL you can see it."

- Sign-in via OAuth (GitHub, Google) — no email/password.
- Per-account project list page (separate from the home page's IndexedDB list).
- Project visibility: private / unlisted (link-only) / public.

Estimated effort: 3-5 days.

## Editor — features we haven't drawn

Bullets, not estimates — each is its own discovery + design + build cycle:

- **Real curve-fitting on existing geometric glyphs.** The polygon primitives that built the demo letters are honest but rough. Replacing them with hand-tuned Béziers (or with a curve-fit pass over the polygon data) would lift visual quality across the whole demo.
- **Drawn Italic master** (vs the slant-axis shear). A real italic redraws specific glyphs (a, e, g especially) rather than transforming the upright. Marked as future work in the demo's decision log.
- **Cyrillic / Greek glyph sets — partial.** v1.2.0 added 17 Cyrillic look-alike glyphs (А В Е К М Н О Р С Т Х uppercase + а е о р с х lowercase) and 14 Greek look-alike glyphs (Α Β Ε Ζ Η Ι Κ Μ Ν Ο Ρ Τ Υ Χ uppercase) — all reuse Latin builders where the geometric-sans shape is identical. Bespoke Cyrillic shapes (Я Ж Ф) and the entire Greek lowercase set remain explicit future work.
- **AI features.** "Explain this audit code in plain language" with an LLM; "Suggest a kerning value for this pair" via a learned model. Both need an API key + cost handling.

## Editor — features we've made progress on but haven't shipped

- **Family-wide kerning propagation.** Today each sibling kerns independently. A family-level kerning store with per-sibling overrides would match how foundries actually work.
- **Multi-master variation explorer.** Designspace page lists axes + masters; doesn't yet have a "drag through the design space" surface.

## Polish we deliberately deferred

- **Per-device responsive test.** I (the maintainer) audited the share page at common breakpoints in CSS, but haven't tested on a real iPhone / iPad. PRs reporting issues with screenshots welcome.
- ~~**Real bundle-size budgets in CI.**~~ ✅ Shipped in v1.2.0 Wave 7 — `ci.yml` now has a "Bundle size budget" step that fails PRs exceeding 5120 KB of client output. Inspect the breakdown locally via `pnpm run analyze`.
- **Accessibility audit beyond focus traps + accordion ARIA.** axe-core runs in Playwright E2E for the home + welcome + tab-nav routes; full audit across every route + every modal is future work.

## Known issues (v1.4.0)

Tracked here so future readers see them without re-discovering. Each links to the surface where it shows up:

- **`tab-nav.spec.ts` Designspace timing.** When the project-tab nav runs through tabs rapidly in sequence (Brief → Edit → Spacing → Designspace → ...), the Spacing-to-Designspace click occasionally races SvelteKit's CSR teardown and the URL update doesn't fire. v1.0.0-beta added `waitForLoadState('networkidle')` before each click to make the test deterministic; if the flake returns, the underlying nav probably needs a guard against rapid-fire clicks.

- **`harfbuzz.wasm` 404 in dev mode.** Vite's dep-optimisation pre-bundles `harfbuzzjs` but loses the wasm reference, then the SSR handler 404s on `/node_modules/.vite/deps/harfbuzz.wasm`. v1.0.0-beta added `optimizeDeps.exclude: ['harfbuzzjs']` to route the wasm via its natural path; if the error returns, check whether `harfbuzzjs` was upgraded and now needs a different exclusion.

- **Pre-existing a11y warnings (moderate / minor).** axe-core reports a small number of moderate / minor violations (color contrast on tinted backgrounds, sparse landmarks on some routes). These don't block CI but are logged via `[a11y minor/moderate]` lines in the test output. Each is small; future PRs should tighten as they touch the affected components.

- **Lint warning baseline.** 22 pre-existing ESLint warnings as of `v1.5.0` — ratcheted down from 52 → 47 → 30 (CI gate). Mostly `no-useless-mustaches`, `no-useless-escape`, `no-useless-assignment`, plus a handful of `no-empty` and `@typescript-eslint/no-unused-vars` in function-body locals. New code should add zero new warnings; the baseline is intentionally tolerated to ship the tooling.

- ~~**43 audit codes without descriptions.**~~ ✅ Closed — `describeAuditCode()` now covers all 94 emitted codes. New descriptions span brief completeness, coverage subsets, glyph count, UPM, naming top-level fields, OS/2 metadata, vertical-metric mismatches, designspace orphans, kerning classes, and anchor coverage.

- ~~**WCAG 2.2 target-size (2.5.8) on editor filter chips.**~~ ✅ Closed — `min-h-[24px]` on each GlyphBrowser status chip lifts every target to the WCAG 2.5.8 baseline. Visual change is +6px height per chip; padding kept at `py-0.5` so the chip still reads as compact and the row height adjusts gracefully. A11y test suite now includes `wcag22aa`, so any regression on this rule blocks CI.

- **Lighthouse insights — 4 still surfacing as warnings.** Triaged from the production lighthouse audit at v1.4.0. Each is now `warn` (not `error`) in `lighthouserc.json` so CI doesn't block, but they're real and needs profiling to address:
	- ~~**`forced-reflow-insight`**~~ ✅ Closed in profile run after `030f78f`. The `scripts/profile-cold-load.mjs` CDP trace shows the home page has only 2 layout events (20ms initial + 4.8ms post-mount), `/share/demo` has 1 (11.6ms), and `/project/demo/edit` has 3 (35ms / 8.8ms / 4ms — the 35ms is the GlyphBrowser tile grid mounting). All within normal first-render territory — the lighthouse warning came from the chained-modulepreload waterfall that `preload-mjs` already eliminated.
	- ~~**`network-dependency-tree-insight`**~~ ✅ Closed in commit `030f78f`. Switched `kit.output.preloadStrategy` from the default `'modulepreload'` (emitted inside the inline bootstrap, so blocking) to `'preload-mjs'` which puts the link tags in `<head>`. Home page went from 0 preload tags → 45 (the full chunk graph fetches in parallel with HTML parsing).
	- ~~**`max-potential-fid`**~~ ✅ Closed in profile run after `030f78f`. CDP trace shows **0 long tasks (≥50ms)** across the home, share, and editor cold loads. Total `EvaluateScript` time on the home page is 9.6ms. The lighthouse warning was a chained-fetch artifact; with parallel preload, the main thread stays clear throughout cold load.
	- ~~**`uses-rel-preconnect`**~~ ⚪ False positive confirmed. The home-page HTML is fully same-origin (zero external refs); the warning came from Vercel's auto-injected analytics scripts. Documenting as known-noise rather than chasing.

	Two related insights were already closed in commit `31f3ef4`: `uses-passive-event-listeners` (EditorTour scroll listener → passive) and `label-content-name-mismatch` (4 toolbar buttons → moved aria-label to title). All 6 lighthouse insights surfaced in the v1.4.0 audit are now closed or confirmed non-issues.

## Anti-goals

The things we explicitly don't want:

- **A FontLab / Glyphs competitor.** Patens is a specific bet: browser-native, single-designer, share-friendly. Trying to match desktop-grade type-design tools feature-for-feature would dilute the bet.
- **A multi-user collaborative editor.** Type design is mostly solo work; the collaboration story we want is async share + comment, not Figma-style co-editing.
- **An npm package.** This is an app, not a library. The reusable bits (audit module, opentype.js wrapper) might one day ship as packages, but not by default.
