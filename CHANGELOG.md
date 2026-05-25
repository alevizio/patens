# Changelog

All notable changes to Font Studio. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions are tagged as `vX.Y.Z` on the [GitHub repo](https://github.com/alevizio/font-studio).

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
