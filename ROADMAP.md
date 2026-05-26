# Roadmap

What's deliberately deferred from the current line (v1.5.2 → v1.6.0) and why. Sections are tagged with the version where each item was last touched; ✅ marks items that shipped since the original deferral.

## M3 — Cloud sharing ✅ SHIPPED in v1.0.0

The share-link recipient story is no longer browser-local. Tier 2 shipped:

- **Vercel Blob backend.** `src/routes/api/share/+server.ts` accepts a project JSON `POST` from the editor and the home page, uploads to `shares/{id}.json` keyed by the project's existing UUID. 5MB cap; payload validation; 503 when `BLOB_READ_WRITE_TOKEN` isn't set.
- **Share page hydration.** `src/routes/share/[id]/+page.ts` tries IndexedDB first, then `GET /api/share/{id}` (Vercel Blob), then surfaces the 404 recovery copy if both miss. The fetched project is saved to IDB so the next view is instant.
- **Link-as-capability auth.** No accounts. The share URL contains the project's existing UUID (already unguessable client-generated). Anyone with the URL can view; no one without it can.
- **Upload-on-share.** Editor header + home-page card "Copy share link" buttons now upload first, then copy. Failure modes handled: 503 (cloud not configured) falls back to local-only with a clear warning; network errors surface as toast errors.

What's still deferred:
- **Re-share versioning.** Re-uploads currently overwrite. A version history (with deep-link to a specific version) is future work.
- ~~**Delete API.**~~ ✅ Shipped (was already in `src/routes/api/share/[id]/+server.ts:73` — `DELETE` accepts an `X-Share-Token` header, constant-time-compares against the originator's token blob, and `del()`s both the share + token blobs idempotently. Wired into the project layout's "Unshare project" Trash button — visible only when `hasShareToken` is true, with a confirm dialog. The ROADMAP entry was just stale.)
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

- ~~**Family-wide kerning propagation.**~~ ✅ Core path shipped. `family-kerning.ts` (`resolveKerning` + `resolveClasses`) was always in place; the missing piece was the export pipeline calling it. `buildFont(project, { family })` now merges family-level pairs + classes onto the project before generating the kern feature — project pairs win on (left, right) collision, family-only pairs are inherited. Wired into `/project/[id]/export` so the family kerning a user edited at `/family/[id]` actually reaches the exported file. Still deferred: inherited-pair badges in the per-project spacing UI (today the user has to switch to /family/[id] to see family pairs).
- ~~**Multi-master variation explorer.**~~ ✅ Shipped — the /designspace page has a 200×200 SVG 2D explorer that plots every master + the default location, lets the designer drag a crosshair through the design space to set `previewLocation`, and live-renders the sample text via the FontFace interpolation. Pointer handlers harden against pointercancel + lostpointercapture in commit `5ed873`. Beyond 2 axes the explorer still shows axes[0]×axes[1]; an axis-pair picker for 3+ axis fonts is a small follow-up but no longer roadmap-blocking.

## Polish we deliberately deferred

- **Per-device responsive test.** Code-level audit shipped in v1.6.0 at `docs/launch/responsive-audit.md` (covers iOS Safari input-zoom risk, touch-target findings, viewport-meta verification, editor mobile-gate). The remaining iPhone + iPad device-test sign-off list is documented in that doc; needs real hardware in hand and is tagged as Tier-3 (human-only) on the launch plan. PRs reporting issues with screenshots welcome — match against the sign-off checklist for the route.
- ~~**Real bundle-size budgets in CI.**~~ ✅ Shipped in v1.2.0 Wave 7 — `ci.yml` now has a "Bundle size budget" step that fails PRs exceeding 5120 KB of client output. Inspect the breakdown locally via `pnpm run analyze`.
- **Accessibility audit beyond focus traps + accordion ARIA.** axe-core runs in Playwright E2E for the home + welcome + tab-nav routes; full audit across every route + every modal is future work.

## Known issues

Tracked here so future readers see them without re-discovering. Each links to the surface where it shows up:

- ~~**`tab-nav.spec.ts` Designspace timing.**~~ ✅ Closed in v1.5.x SSR work. The rapid-fire tab-nav flake traced to the welcome-strip flicker during route transitions, not a SvelteKit CSR race. With SSR enabled the strip landed in the SSR'd HTML and got removed by hydration milliseconds later — the DOM repaint during that window competed for the click event with the URL update. Seeding `welcomeDismissed=true` via `addInitScript` (commit `6473204`) means the strip never renders, the flicker doesn't happen, and the `networkidle` workaround was removed in favour of `assertTabMounted` as the natural sync point. 5/5 consecutive runs ~7s each (was ~11s with the wait).

- **`harfbuzz.wasm` 404 in dev mode.** Vite's dep-optimisation pre-bundles `harfbuzzjs` but loses the wasm reference, then the SSR handler 404s on `/node_modules/.vite/deps/harfbuzz.wasm`. v1.0.0-beta added `optimizeDeps.exclude: ['harfbuzzjs']` to route the wasm via its natural path; if the error returns, check whether `harfbuzzjs` was upgraded and now needs a different exclusion.

- **Pre-existing a11y warnings (moderate / minor).** axe-core reports a small number of moderate / minor violations (color contrast on tinted backgrounds, sparse landmarks on some routes). These don't block CI but are logged via `[a11y minor/moderate]` lines in the test output. Each is small; future PRs should tighten as they touch the affected components.

- ~~**Lint warning baseline.**~~ ✅ Closed — 0 warnings / 0 errors as of the v1.6.0 prep pass. Ratchet: 52 → 47 → 30 → 22 → 2 → 0 across v1.4.x → v1.5.2 → v1.6.0. CI gate remains at 5 to absorb future drift without immediate failure; new code must continue adding zero new warnings.

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
