# Changelog

All notable changes to Patens. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions are tagged as `vX.Y.Z` on the [GitHub repo](https://github.com/alevizio/patens).

## [1.5.2] — 2026-05-25

### Security
- **Closed open-redirect via `?returnTo` on `/auth/login`, `/auth/callback/github`, `/auth/logout`.** `safeReturnTo()` helper validates the redirect target resolves to the same origin; off-origin / scheme-relative / `javascript:` / `data:` URLs fall back to `/`. 13 unit tests cover the helper + the encode/decode/tamper paths.
- **Replaced `===` token comparison with `timingSafeEqual`** in share POST + DELETE (`constantTimeEqual` in `src/lib/share-blob.ts`). Defense-in-depth against timing attacks.

### Fixed
- **Pointer-listener leak in the 2D variation explorer.** Inline-template handler was recreated on every reactive update + added new listeners on every pointerdown with no cleanup if pointerup was missed (pointercancel / lostpointercapture / ESC during drag). Hoisted to script block; added re-entrancy guard + listens for all drag-end events.

### Added
- **Family kerning UI panel on `/family/[id]`** — completes the v1.5.0 Day 9 data-only work. Table of family-wide pairs (left + right + value + delete) + inline add form. Pairs apply to every sibling at resolution time via `resolveKerning()`.
- **e2e API smoke tests** (`e2e/api-smoke.spec.ts`) — 12 tests covering health version, sitemap + RSS XML validity, OG byte size with PNG magic-number check, manifest PWA shape, share endpoints 503/404 paths, auth gates. Catches the regression classes that `docs/qa-checklist.md` exists for, in CI instead of post-deploy.
- **`session.test.ts`** — 13 unit tests for the signed-cookie session helpers + the new `safeReturnTo` open-redirect defense.

### Changed
- **Lint baseline ratcheted 22 → 2** (CI gate at 5). Cleaned vestigial vars across `svg-path.ts` (cx/cy/startX/startY current-point trackers that were never read), `audit.ts` (unused depth counter), `path.ts` (dead pts[] + last in reverseContour), `export.ts` (orphan effectiveContours wrapper), `GlyphBrowser.svelte` (orphan handleDelete), and a few placeholder/escape-character tightenings.
- **Cold-load baseline refresh** at `patens.design` (post-rebrand + post-preload-mjs): home FCP **1057ms** (was 1319ms in v1.4.0 — 20% faster), editor FCP **906ms**, share FCP **1356ms**. 0 long tasks anywhere.

## [1.5.1] — 2026-05-25

### Changed
- **Rebrand: Font Studio → Patens.** Canonical domain `patens.design`. Latin for "lying open, accessible" — root of *patent*, the word for openness before lawyers got to it. Open-source positioning made explicit in the name.
- **Canonical-domain 301 redirects** in `vercel.json` — `patens.app` / `patens.studio` / `font-studio.vercel.app` all permanently redirect to `patens.design`. One source of truth for SEO + OG previews.
- **Storage namespaces deliberately preserved** as `font-studio-*` (IndexedDB, localStorage, cookies, service-worker cache, PartyKit room) — backward compatibility with existing browser data.

## [1.5.0] — 2026-05-25

### Added
- **WCAG 2.0 + 2.1 + 2.2 A/AA test coverage.** axe-core via Playwright now runs the full WCAG A/AA tag set across 19 routes. Caught + fixed: scrollable-region-focusable on /share, link-in-text-block on 6 files (13 sites), label-content-name-mismatch on 4 editor toolbar buttons, and target-size on the 9 GlyphBrowser filter chips (now `min-h-[24px]`).
- **Cold-load profiler.** `scripts/profile-cold-load.mjs` drives headless Chromium via CDP, captures the Performance trace, and digests long tasks + layout events + FCP/LCP markers. Wired as `pnpm profile [url]`. v1.4.0 baselines documented in `docs/qa-checklist.md`.
- **Post-deploy QA checklist.** `docs/qa-checklist.md` — 9 sections covering URL smoke tests, OG image byte verification, health version drift, end-to-end editor walk, share + cloud, RSS validation, perf profile, lighthouse + axe, and CI status. Triggered by 2 production bugs caught during v1.4.0 deploy that the checklist now catches in 30 seconds.
- **CODE_OF_CONDUCT.md** — Contributor Covenant 2.1, linked from CONTRIBUTING.

### Fixed
- **`/og/[id]` 500 in production** — `@resvg/resvg-js-linux-x64-gnu` native binding wasn't bundled when prebuilt-deploying from Mac. Fix: `pnpm.supportedArchitectures` config + deploy without `--prebuilt` so Vercel installs the right native bindings on Linux.
- **`/og/[id]` 500 after first fix** — Lora + Inter fonts under `static/og-fonts/` aren't bundled with serverless functions. Moved to `src/lib/og-fonts/` and read via `$app/server`'s `read()` so the binaries embed in the function bundle.
- **Lighthouse CI broken on every push** — the `lighthouse:no-pwa` preset's strict insight assertions were erroring on `forced-reflow-insight`, `network-dependency-tree-insight`, `target-size`, `uses-passive-event-listeners`, `uses-rel-preconnect`, `bf-cache`. Relaxed to `warn`; ratcheted category-score thresholds (perf 0.85, a11y 0.90) to `error` to gate on real regressions.

### Changed
- **Network preload strategy** → `preload-mjs`. Default `'modulepreload'` only emits inside the inline bootstrap script; switched to `'preload-mjs'` which puts `<link rel="preload" as="script">` in `<head>`. Home page went from 0 → 45 preload tags; the full chunk graph fetches in parallel with HTML parsing. Closes `network-dependency-tree-insight` + transitively eliminates the long-task waterfall behind `max-potential-fid`.
- **EditorTour scroll listener** → passive (`{ capture: true, passive: true }`). Closes `uses-passive-event-listeners`.
- **Editor toolbar buttons** — moved descriptive aria-label text to `title=` so the visible button text becomes the accessible name. Voice-control users can now say "click Undo stroke" / "click Copy path" / etc. Closes `label-content-name-mismatch`.
- **describeAuditCode()** — added the 43 missing descriptions; full 94-code coverage. New entries span brief completeness, coverage subsets, glyph count, UPM, naming, OS/2 metadata, vertical-metric mismatches, designspace orphans, kerning classes, and anchor coverage.
- **/changelog** — RSS 2.0 feed at `/changelog/rss.xml` (autodiscovered + visible link); h2 deep-link anchors; visible Subscribe-via-RSS affordance.
- **/help** — h2 deep-link anchors on each section; FAQPage schema.org JSON-LD for Google rich results; per-page OG + Twitter meta with `og:image=/og/brand`.
- **/about** — per-page OG + Twitter meta + `og:image=/og/brand`. Version read from `package.json` so it can't drift.
- **/health** — version read from `package.json` (was hardcoded).
- **Home page footer** — Help / Changelog / About / GitHub nav added.
- **Sitemap** — adds /help, /changelog, /about, /changelog/rss.xml.
- **`docs/next-90-days.md` + `docs/phase-c-sprint-plan.md`** — frozen as archival snapshots.

### Deferred
- `forced-reflow-insight` — closed via profiler measurement (max 35ms layout on editor cold-load, all normal first-render territory).
- `max-potential-fid` — closed via profiler measurement (0 long tasks ≥50ms across all profiled routes).
- `uses-rel-preconnect` — false positive (Vercel auto-injected analytics, not site code).

## [1.4.0] — 2026-05-24

### Added
- **PWA install support.** `static/manifest.json` with name, short_name, description, start_url, scope, display: standalone, theme + background colors, 3 icons (svg + 192/512 PNG, "any maskable" purpose), categories. Linked from `app.html`. Installable on Chrome/Edge desktop and iOS home-screen "Add to Home Screen".
- **Favicon variants.** Rasterized `static/icon-192.png` and `icon-512.png` from the favicon.svg (light-mode H-on-#fafaf9), wired as `<link rel="icon" type="image/png">` and `apple-touch-icon`.
- **/help page.** FAQ across six sections (getting started, sharing, export, editor, performance, broken). 17 questions answered. Static, prerendered.

### Fixed
- **Share page JSON-LD parsing.** Escaped the inline `</script>` literal in the `{@html}` block as `<\/script>` so the svelte-eslint-parser doesn't terminate the script context prematurely. Functionally identical at runtime.
- **Changelog `{@html}` lint.** Moved the eslint-disable-next-line comment to the same block as the actual `{@html}` paragraph render.

## [1.2.0] — 2026-05-24

### Added
- **Multi-script starter set.** 17 Cyrillic look-alike glyphs (А В Е К М Н О Р С Т Х uppercase + а е о р с х lowercase) and 14 Greek look-alike glyphs (Α Β Ε Ζ Η Ι Κ Μ Ν Ο Ρ Τ Υ Χ uppercase). All reuse Latin builders where the shape is identical in a geometric sans; bespoke Cyrillic/Greek shapes (Я Ж Ф + entire Greek lowercase) are explicit future work.
- **5 new audit codes:** `color-layer-no-palette`, `color-layer-out-of-range`, `kerning-pair-self`, `master-empty`, `feature-kern-disabled-with-pairs`. Audit code count: 88 → 93.
- Demo `brief.differentiation` + `decisions` updated to acknowledge the multi-script starter and frame the trade-off honestly.

## [1.1.0] — 2026-05-24

### Added
- **Cloud share.** New `POST /api/share` + `GET /api/share/[id]` endpoints back by Vercel Blob; share URLs now work for recipients in any browser (not just the originator's). Link-as-capability auth — the share URL contains an unguessable UUID. Upload-on-share wired into the editor header + home-page card Share buttons; clear 503 fallback when `BLOB_READ_WRITE_TOKEN` isn't configured.
- **Per-project OG image.** `/og/[id]` route renders a 1200×630 PNG via satori + resvg-js. Family name in Lora serif, designer + version + glyph count below. Demo OG renders on the fly; uploaded projects render from cloud storage; brand variant at `/og/home` for the home-page unfurl.
- **Launch copy drafts.** `docs/launch/copy.md` with Show HN, Twitter/Bluesky thread, Reddit, DM, and email templates. Anti-patterns section to avoid in launch copy.

### Changed
- Share-404 page copy: "This link is browser-local" → "Project not found" (cloud sharing exists; the 404 now means the upload didn't happen or this deployment doesn't have cloud configured).
- README "Project status" bumped from `v1.0.0-beta` to `v1.0.0` with a "Configuring cloud share" section.
- ROADMAP M3 section marked ✅ SHIPPED with the precise list of what landed.

## [1.0.0] — 2026-05-24

### Added
- v1.0.0 milestone. Production-grade.

### Fixed
- **Critical: app.html slot bug.** The literal string `%sveltekit.body%` inside an HTML comment was substituted by SvelteKit's templating, breaking the actual body slot. Every E2E test that interacted with the page failed because the JS bundle never loaded.
- **designspace infinite `$effect` loop.** The previewLocation initializer effect read AND wrote `previewLocation`. Wrapped the write in `untrack()` so the effect tracks only the axes array. This was the root cause of the entire 16-test CI failure cliff.
- **Cmd+Shift+V paste-glyph regression.** The bare-V key handler in the editor's keydown chain caught Cmd+Shift+V before the paste-glyph branch. Added `!metaKey && !ctrlKey` guards. Found by ESLint's no-dupe-else-if rule on first run.
- **Vercel Lighthouse false positives.** Vercel's audit was running against per-deployment URLs behind Deployment Protection, scoring an auth wall page. Documented the fix in ROADMAP known-issues section.

### Changed
- **Welcome dialog → non-blocking strip.** First-visit modal blocking the home page replaced with an inline strip at the top. Visitors see the actual product immediately.
- **Microcopy sweep.** "Copied path (1842 chars)" → "Copied SVG path for {name}"; "Clipboard write failed." → "Could not copy — try Cmd+Shift+C"; "[ ] navigation" tooltip spelled out.
- **Pre-hydration shim.** `app.html` paints html/body backgrounds in canvas-token colors before SvelteKit hydrates so the cold-load flash matches the eventual theme.
- **Share-404 detects share links** and shows specific recovery copy (open demo + import `.font.json`).
- **Brand serif consistency.** All home-page section headers use Hoefler Text.
- **LoadingPanel italics rule.** Removed `italic` entries from the type-flicker cycle per project's no-italics-in-UI rule.

### Repository hygiene
- Real README replacing the SvelteKit boilerplate.
- LICENSE (MIT) added.
- `package.json` metadata: name → `font-studio`, description, author, license, homepage, repository, bugs, keywords.
- `CONTRIBUTING.md` with setup, branch model, commit conventions, PR flow.
- `docs/architecture.md` — one-page mental-model loading.
- `ROADMAP.md` — deferred M3 work + known issues.
- GitHub `ISSUE_TEMPLATE` (bug / feature / question) and `pull_request_template.md`.

### Engineering
- **ESLint flat config** with typescript-eslint + eslint-plugin-svelte. Real-bug rules at error (caught the Cmd+Shift+V conflict on first run). Stylistic rules at warn (52-warning baseline).
- **Vitest coverage** (`@vitest/coverage-v8`). Baseline: 77.58% statements, 79.16% lines, 80.46% functions, 64.56% branches. CI uploads as artifact.
- **Bundle analyzer** (`rollup-plugin-visualizer`). `pnpm run analyze` writes `bundle-report.html` to repo root.
- **WAI-ARIA disclosure** on Accordion (the right-sidebar collapsible sections). Header + region linked via aria-controls + aria-labelledby.
- **Focus traps** on all major modals (ShortcutsDialog, Settings, Storage, Welcome, CreateFont).

## [0.6.0] — content-complete

13 new glyphs ($, ©, ®, ™, §, [, ], {, }, °, ±, ×, ÷), 10 `.onum` digits, 2 `.case` parens, `g.ss02` alternate. Liga ligatures (fi, fl). Demo project at 119 glyphs.

## [0.5.0] — finished

ß as drawn shape, fi/fl ligature GSUB, focus traps, accordion a11y, math glyphs, denser kerning.

## [0.4.0] — share-complete

Foundry-style tester (master pills + size + tracking sliders), live OpenType feature toggles, reading specimens (Display / Body / Caption), glyph inspector with metric guides + sidebearings + anchors + master overlay, deep-linkable inspector, glyph grid filter, shareable tester URL, palette switcher, print specimen sheet, sample-text presets, OT features grouped, in-context mockups, coverage heatmap, anchor visualizer.

## Earlier

See [git history](https://github.com/alevizio/font-studio/commits/main) for prior 153 commits. The pre-0.4.0 commits built out the foundational editor (sketch + trace pipeline, opentype.js export, audit module, IndexedDB project store, COLR + variable font support, harfbuzz live shaping).
