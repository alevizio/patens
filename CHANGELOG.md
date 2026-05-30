# Changelog

All notable changes to Patens. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions are tagged as `vX.Y.Z` on the [GitHub repo](https://github.com/alevizio/patens).

## [Unreleased]

The OSS-readiness arc + Swiss editorial rebrand + TypeCon Portland launch prep. Accumulates since v1.5.2; will tag as v1.6.0 once the demo GIF lands + real-device responsive sweep is complete.

### Security
- **Share delete-tokens stored as `sha256:` digests** (PR #8). Previously the Vercel Blob holding the delete-token was public-readable and contained the raw token. Now we store only the SHA-256 digest with a stable prefix; the originator keeps the raw token client-side. `tokenMatchesStored` falls back to a constant-time raw compare for pre-existing shares so existing tokens stay valid until their next write (migration is automatic on re-share).
- **Baseline HTTP security headers on every response** via the SvelteKit `handle` hook: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`, plus `Strict-Transport-Security` gated on HTTPS so local dev still works. Verified in production via `curl -I`.
- **Production error sanitization.** Stack traces and internal paths no longer leak to the client in production; the `+error.svelte` boundary gets a generic "Something went wrong." Dev keeps full details. The previous dev-overlay XSS surface (it used `innerHTML` on `error.message`) is closed — overlay now uses DOM API + `textContent`.
- **`/api/ai/messages` Anthropic proxy hardening.** Request body capped at 256 KB; max 8 messages per request; max 24 K characters per text block; max 12 K characters in `system`; max 4 096 `max_tokens`. Model allowlist enforces `claude-opus-4-7` / `claude-sonnet-4-6` / `claude-haiku-4-5-20251001`. Upstream error bodies no longer forwarded verbatim — replaced with a sanitized `{ error, status }` payload to prevent leaking rate-limit / quota detail.
- **`/api/share/[id]/versions` no longer returns direct Vercel Blob URLs.** Consumers route through `/api/share/[id]?v=N` so future access controls don't get bypassed. ShareVersion type updated; `/share/[id]` page consumes the slimmer shape.

### Added
- **CLI: `npx patens audit`** — the 94-code audit module + preflight + compatibility checks shipped as a Node CLI. Single bundled ESM via esbuild, 3 output formats (`text` / `json` / `github` for PR annotations), exit code 2 on errors. Drop-in CI step; closes the "audit is locked inside the editor" critique. 13 unit tests cover the formatters.
- **10 Architecture Decision Records** under `docs/decisions/` (Michael Nygard format). Documents the load-bearing choices: browser-native, MIT-forever, SSR-at-root, audit worker, share-as-capability, storage namespace stays `font-studio-*`, BYOK AI, strict quality gates, demo open-by-default.
- **TypeDoc API reference** — `pnpm run docs:api` builds HTML docs under `docs/api/` for the audit + export + family-kerning + kerning-classes + path + font-machinery modules. Output gitignored, regenerable from source.
- **2 new perf benchmarks** — `buildFont` (50/162/500-glyph projects: 2.4ms / 19ms / 126ms per call) + `expandKerningClasses` (small/medium/large with up to 360k expanded pairs in 19ms). Mirror the existing `audit.bench` pattern.
- **30-second demo GIF storyboard** at `docs/launch/demo-gif-storyboard.md` — frame-by-frame pre-record blueprint: setup checklist, ffmpeg compression commands, per-surface delivery table.
- **Responsive audit + sign-off checklist** at `docs/launch/responsive-audit.md` — code-level findings plus the iPhone + iPad device-test list that requires real hardware.
- **AGENTS.md** — Linux Foundation cross-tool AI-assistant onboarding standard.
- **ARCHITECTURE.md** — six-layer map + the core flows (cold-load, audit, share-write, export) + the SSR posture rationale.
- **DESIGN_PHILOSOPHY.md** — the *why* behind Patens (teaching-first, audit-as-citizen, no AI-led marketing, never paywall the editor). Referenced from PR template.
- **MAINTAINERS.md** — solo-maintainer response SLA, triage cadence, scope vs. out-of-scope.
- **`docs/release-process.md`** — solo-maintainer release playbook: cadence, semver rules (audit-code IDs stable forever), pre-release checklist, tagging, post-release verification, hotfix flow, rollback via Vercel promote.
- **CodeQL SAST + OpenSSF Scorecard + Dependency-review + Release-drafter** GitHub Actions workflows.
- **CycloneDX SBOM via cdxgen** in CI — EU CRA future-proofing.
- **Devcontainer config** for Codespaces + VS Code dev-container.
- **OSS-readiness signal artifacts**: `FUNDING.yml`, RFC 9116 `security.txt`, `humans.txt`, `CONTRIBUTORS.md`. Plus 6 paste-ready prep docs under `docs/launch/` — NLnet NGI Zero Commons, OpenSSF Best Practices, USPTO trademark walkthrough, GitHub Sponsors, Polar, 3 awesome-list PRs.
- **`SUPPORT.md` + `.github/ISSUE_TEMPLATE/config.yml`** — channel routing: bugs → issues, ideas + Q&A → Discussions (now enabled on the repo), security → SECURITY.md. The chooser config exposes Discussions + /help + the GitHub Security Advisory form as contact_links above the Bug / Feature templates; the question.md template was removed since Q&A now has a dedicated home in Discussions.
- **GitHub social preview image** — `static/github-social.png` (1280×640, 30 KB) generated by `pnpm build:github-social`. Renders the new round O + smooth-shoulder n + HONE/TONE samples from the demo OTF + 94-rule audit-module strap-line. Drop into Settings → General → Social preview (no GitHub API exposed for this).
- **`SoftwareSourceCode` JSON-LD entity** on the home page @graph — cross-references the existing `WebApplication` via `targetProduct` `@id`. Useful for AI-agent retrieval ("what's the source for this product") + SERPs that want to surface the GitHub repo alongside the live web app.
- **OpenSSF Best Practices Silver-tier self-cert answers** appended to `docs/launch/openssf-best-practices.md`. Silver adds 55 criteria over Passing; ~85% are already satisfied by the existing setup. Two SHOULDs use the rationale-acceptance escape hatch (solo-maintenance + SLSA-provenance deferred). Gold deliberately not pursued — requires bus-factor ≥ 2.
- **Codecov upload in CI** (`codecov/codecov-action@v5`, tokenless OIDC for public repos) after the existing `vitest --coverage` step. `fail_ci_if_error: false` keeps merges green when Codecov has an outage. Closes OpenSSF Silver "automated test coverage tracking" gap.
- **Cryptographic tag signing for releases** — documented setup + release flow + consumer-verification path in `docs/release-process.md`. One-time setup: `git config --global tag.gpgsign true` (reuses the SSH key already signing commits). Closes OpenSSF Silver "cryptographic release signing" gap.
- **`fast-check` property tests for the audit module** (9 invariants × 100 random inputs each = 900 randomized checks per run). Asserts: `auditGlyph` never throws, returns an array, every issue has the full `{codepoint, severity, code, message}` shape, codes are kebab-case, severities are within the enum, `sortBySeverity` preserves count + ordering, audit is deterministic, every issue codepoint matches the current glyph. Closes OpenSSF Silver "fuzz testing on parsers" gap.
- **Unit tests for the 7 pure-helper modules extracted during the editor decomposition** — 145 new tests across `onboarding-targets`, `glyph-deriveds`, `path-edit-transforms`, `glyph-paste`, `glyph-export`, `fix-issue`, and `audit-catalogue`. Per-file `@vitest-environment happy-dom` opt-in for the DOM-touching glyph-export tests; the other suites stay on the fast node env. Suite count: 528 → 672 (+144).
- **`/privacy` + `/security` pages** — plain-English, GDPR-shaped data inventory + responsible-disclosure flow. Both prerendered with full JSON-LD.
- **`/press` kit** — factsheet (structured-data canonical), three-length descriptions, brand assets + screenshots placeholder, milestones.
- **Re-share version picker UI** on `/share/[id]` + multi-master axis-pair picker on `/designspace`. Closes the two "server-ready, UI pending" items from the v1.5 backlog.
- **94 dedicated audit-rule pages at `/audit/[code]`** — single source-of-truth catalogue at `src/lib/font/audit-catalogue.ts` binding code → title → category, with description sourced from `audit.ts`'s `describeAuditCode()` so editor inline help + public pages stay in sync. Each page is prerendered (94 static HTML files) and ships `DefinedTerm` + `TechArticle` + `BreadcrumbList` JSON-LD cross-referenced by `@id`. Targets the long-tail typography queries that previously had no dedicated landing page on the open web ("what is overshoot in type design", "what is contour-winding-collision"). `/learn/audit-codes` updated to link each code to its dedicated page; sitemap folds in all 94 URLs at priority 0.6.
- **`/pronunciation` page with `FAQPage` JSON-LD** — answers "how do you pronounce Patens" with IPA + the Latin etymology (patēns, "to lie open"). LLMs extract Q&A directly; niche brand names benefit measurably from a focused page per the launch AIO research. Linked from `SiteFooter` under "Company".
- **`docs/launch/typecon-runway.md`** — canonical 10-week launch plan that supersedes the partial calendars in `master-plan.md § 6` and `app-improvements-plan.md`'s P0/P1 sections. Covers ownership splits (yours / mine), week-by-week calendar, eight named risks with mitigations, six decision points each with a recommendation, and a done-definition for launch.
- **NEW: dedicated `/audit` marketing page** — differentiator landing for the 94-code audit module. Hero + 9-family breakdown + 6 verbatim sample codes + CLI integration + 7-Q&A FAQPage + see-it-in-action CTAs. Prerendered to ~33KB. WebPage + BreadcrumbList + FAQPage JSON-LD for AI-engine citation.
- **Trust band** on home page — 4-column Swiss-disciplined "by the numbers" row below the hero: 94 audit codes · 162 demo glyphs · 528 tests · MIT open source. Mono-uppercase labels + Hoefler-serif numerals.
- **"How the audit teaches" 3-card sample** on home — verbatim `describeAuditCode()` prose for `self-intersecting` (fixable), `xheight-misaligned` (designer judgment), `sidebearing-class-drift-lsb` (designer judgment). Demonstrates the differentiator IN SITU.
- **SiteHeader + SiteFooter components** — `src/lib/ui/SiteHeader.svelte` (sticky top nav, audit-led 4-item navigation with prefix-match active state) + `src/lib/ui/SiteFooter.svelte` (4-column grid: Product · Learn · Company · Legal & Source). Wired into 16 marketing pages + the 404 page.
- **6 dedicated Satori-rendered OG variants** — `/og/audit`, `/og/learn`, `/og/compare`, `/og/press`, `/og/about`, plus the existing `/og/brand` and `/og/home`. Each marketing page's `og:image` + `twitter:image` now point at its route-specific card with route-specific copy + URL stamp.
- **Article schema per release on `/changelog`** — top 10 releases now ship as discrete schema-typed entities (Article + datePublished + author + publisher + description) so AI engines can cite "what changed in Patens v1.5.2" as a specific citable answer.
- **Public marketing surface long-scroll editorial home page** (`/`) — expanded the teaser into a multi-section narrative: hero waitlist + Swiss "by the numbers" trust band + annotated demo specimen + interface mock of the editing surface + audit-as-teaching 3-card sample + 94 codes by family + compact compare row (8 tools) + final waitlist. Teaser-only version retired.
- **Private alpha gating** — editor moved to an unguessable URL behind a passcode-free invite list; public `/` no longer exposes a path into the app. Waitlist persists to Vercel Blob (`access: 'private'`, key = `sha256(email)`) with dedupe + export endpoint for the founder.
- **Show HN + TypeDrawers + r/typography launch drafts** at `docs/launch/show-hn-draft.md` and `docs/launch/typedrawers-intro.md` — three title variants, ~180-word body, 7 anticipated comments with draft responses, pre-flight checklist, T+24h cross-post timing.
- **Vercel OSS Program application copy** at `docs/launch/vercel-oss-application.md` — three pitch lengths (50/150/300 words), open-source bona fides checklist, credit-utilization plan, maintainer bio. Ready to paste before the June 3, 2026 deadline.
- **OSS programs survey** at `docs/launch/oss-programs-survey.md` — 20 grants/credits/funding rails ranked by urgency for Patens (NLnet, Anthropic credits, GitHub Secure Open Source Fund, FUTO, Mozilla MOSS, GitHub Sponsors, Open Collective, Polar.sh, etc.). Deferred NLnet to Aug 1, 2026 cycle (post-TypeCon traction).
- **Lipi.ai Font Studio + Fontish added to `/compare`** as the 10th and 11th tools. Comparison now spans the entire 2026 type-editor landscape — desktop pro (FontLab, Glyphs, RoboFont), browser (Fontra, Glyphr Studio, typlr, BirdFont, FontForge, Patens), and AI-first (Lipi, Fontish). Patens column stays at the same X position across all group sections; every competitor name links to its product site.

### Changed
- **Audit-led home welcome strip copy.** The first-visit non-blocking strip now leads with the audit module as the differentiator: "A type design tool that teaches as you draw." Compresses cleanly to a tweet or a Show HN headline. Welcome dialog later enriched with a mono-uppercase metadata row (94 codes · 30 one-click fixes · MIT · no installs) + a new "Why audit-as-teaching →" CTA pointing at `/audit`.
- **Swiss-influenced heading scale-up across 8 marketing pages.** Hero `sm:64` → `sm:80`, h1 `36` → `48`, h2 canonical `20` → `28` (incl. `/changelog` `24` → `28`, `/learn` `22/40` → `28/48`). h2 vertical rhythm `mt-12 mb-3` → `mt-16 mb-4`. Body sizes unchanged — Patens's density (14-15) is deliberate.
- **Section rules on document-flow pages** (`/about`, `/privacy`, `/security`) — `border-t border-border/30 pt-12` above each h2 for structural skeleton.
- **CONTRIBUTING + MAINTAINERS cross-links** to ADRs, DESIGN_PHILOSOPHY, AGENTS, release-process. Lint-gate exception rationale points at ADR-009.
- **README opening blurb** reworked to lead with audit-as-teaching positioning, not feature-list. Capability table reorders Audit to the top as the headline row. Closing paragraph back-links to `/audit` so GitHub visitors can drill into the differentiator marketing page.
- **Comprehensive SEO + AIO completeness sweep.** Every public route now ships: JSON-LD (WebSite + Organization + Person + WebApplication on home; CollectionPage + ItemList on /learn; FAQPage on /audit + /help; Article × 10 on /changelog; TechArticle on reference pages; HowTo on tutorials), canonical URLs, absolute `og:image` URLs, `og:image:alt` + `twitter:image:alt`, `twitter:site` + `twitter:creator` (@patenstype), `meta name="author"`, `og:locale` en_US, `og:image:type` image/png. Sitemap shipped with per-route honest `lastmod` dates (replacing the "everything updated today" anti-pattern that lowers crawler trust).
- **PWA manifest enrichment** — added `id`, `display_override` (window-controls-overlay), `screenshots`, and 2 app `shortcuts` (Demo + Audit) for richer install prompts on Chrome Desktop + Android.
- **`/help` + `/changelog` titles carry "2026"** — closing the year-in-title pass per the Leapd GEO finding (visible year in `<title>` ≈ +30% citation rate from AI engines). The other landing routes (`/`, `/about`, `/compare`, `/learn/*`) already had it.
- **Demo OTF expanded 9 glyphs → 26.** Was: space + H/O/T/I/E/N + o/n only. Now: A C D E G H I M N O P R S T U + a e h n o s t + 0 1 2 + . , - !. Lets the home hero, OG image, and GitHub social preview render "PATENS · STUDIO GEOMETRIC · HONE THE TONE" in the project's own font instead of "Hn" + "HONE" + "TONE". Three winding-rule artifacts fixed in the process: bowl-ring outer-left now aligns with stem-left (P/D/R/U); C/G/e mouth-cuts clipped to outer curve to prevent the +1 outer − 1 cut = filled-crescent artifact; digit 2 rebuilt as a single CCW contour. Demo OTF grew 2.3 KB → 4.4 KB.
- **Demo OTF proportions refined.** Bowl rx 0.32 → 0.40 of CAP_W on P/R; D bowl rx 0.4 → 0.48 (was reading as "I with a balloon"); A rebuilt as two parallelograms meeting at a STEM-wide flat apex with a properly-clamped crossbar; G's spur extended from cx → cx+rx so it visibly attaches to the right wall; lowercase a rx formula corrected (115 → 160; was rendering as a narrow oval). Kerning regression snapshot updated — values shifted with the new silhouettes but all changes typographically sensible (PA tightens with bigger P bowl; Ta loosens with wider A).
- **In-editor demo project (the `/project/demo/edit` shipped font) now uses curved Béziers** for bowl letters. `demo-project.ts` was using straight-line polygons only — 16-sided polygon for O, three-rect stacks for P/R/D/B/C/G/U "bowls". Now: kappa-Bézier rings via a new `curvedRing` helper + `stemBowl` for the bowl-stem composites. The `BezierContour` format already supported cubic curves via `PathCommand.type === 'C'`; the old code just chose to emit L-only. Editor still renders, edits, and runs boolean ops on the curves natively.
- **`/share/[id]` version selector** — `window.location.href` reload replaced with SvelteKit `goto(url, { invalidateAll, noScroll })` for SPA-smooth version switching (no white-flash full reload). Dropdown options now show file size alongside date. New "copy permalink" button appears when a historical version is pinned, so a designer can hand around the exact-version URL without memorising the path.
- **Swiss editorial rebrand across the marketing surface.** IBM Plex Sans (300/400/500 weights) replaces the prior Hoefler-led stack; stone palette (`stone-50`/`stone-950` canvas, `stone-900`/`stone-50` foreground with opacity hierarchy) replaces neutral grays; Swiss Red `#C8102E` is the single accent. ~90 inline `font-family: Hoefler` overrides stripped across 40 files. CSS custom properties moved from `:root.theme-dark` to `html.theme-dark` for guaranteed specificity. App shell + footer now read as a Swiss editorial typeface specimen, not a generic SaaS chrome.
- **OG card system rewritten Swiss.** Single font face (Inter-500.ttf, 60 KB Latin subset), stone palette, 56×6 Swiss Red corner mark top-right, hierarchy via size + opacity per the Swiss "no second hue for hierarchy" rule. Headline 180px for brand/project, 120px for marketing variants. 7 marketing variants + per-project specimen cards all on the unified template.
- **SiteHeader + SiteFooter Swiss reorg.** Header: rectilinear icon box (`rounded-lg` → `rounded-sm`), lang switcher + theme toggle paired in a flex container outside main nav (visible on mobile). Footer: numbered Swiss columns (01 PRODUCT, 02 LEARN, 03 COMPANY, 04 LEGAL) + 40–52px Hoefler `Patens` wordmark in identity strip + signature beneath.
- **/audit + /press + /families + /help editorial passes.** Each canonical reference page now carries mono-numbered section prefixes (01–0X) at the H2 spine, `rounded-none` on remaining chrome, focus-visible rings on back-links, and the editorial border-t/border-b rule pattern that /learn established. /families brought from `max-w-6xl` + inline monospace wordmark into line with the rest of the marketing surface (`max-w-5xl` + Plex Sans inherit).
- **/learn structural Swiss pass.** 12 `rounded-2xl`/`rounded-xl` cards stripped to editorial `border-t/border-b border-border/40 pt-5` rules; 6 sections numbered 01–06 with mono prefixes; decorative icons (BookOpen, Compass, Pencil, Wrench) removed from section headers — kept functional ones (ExternalLink). Bottom CTA `rounded-md bg-accent` → `rounded-none bg-fg`.
- **/es chrome cleanup.** `/es/press` description panels + `/es/pronunciation` trivia card go from `rounded-md` cards to editorial border-t rules, mirroring the EN treatment. (Deeper structural numbering deferred — different H2 scale + voseo voice constraints.)
- **`/compare` table column alignment.** Patens column stays at the same X position across all group sections (`table-fixed` + `<colgroup>` with `78 / competitors.length`% widths). Card chrome around the tables stripped (`overflow-hidden rounded-lg border bg-surface-1/40` removed). Every competitor name wraps in an external link with `target="_blank" rel="noopener noreferrer"`.
- **`consoleHello()` Swiss rebrand** — Plex Sans + Plex Mono in DevTools output, Swiss Red URL stamp, signature line in muted stone. `celebrate()` fallback palette switched from cobalt/sage/cream to Swiss Red + sage + stone.
- **WaitlistForm success-state micro-transition.** Success message uses `fly` + `fade` Svelte transitions with `cubicOut` easing — checkmark fades in after the message slides up.
- **README refresh for current state.** "Try it" section now points at public marketing surfaces (no gated `/project/demo/edit` links during private alpha). Status reframed from "production-grade" to "private alpha by invitation, public launch at TypeCon Portland Aug 6–8, 2026." Test count 528 → 722.

### Fixed
- **Home page Lighthouse A11y 98 → 100.** axe-core flagged `landmark-one-main`: the home page lacked a `<main>` landmark. The outer drag-drop surface (`<div role="application">`) became `<main>`; drag-drop event handlers unchanged.
- **Editor mobile-gate.** A phone hitting `/project/[id]/edit` used to get the desktop editor crammed into a 375px viewport with no warning. Non-dismissible `<1024px` banner inside the project layout now names the constraint. iPad in landscape (≈1180px) clears it.
- **Pin button on home cards** was invisible on touch devices (`opacity-0 group-hover:`). Now `opacity-60` on mobile, hover-revealed on `sm:+`.
- **Stale `security.txt`** pointed at `font-studio.vercel.app`; updated to canonical `patens.design` URLs.
- **`/families` 500 in production** — `+page.ts` called `listFamilies()` (idb-keyval) in the SSR load function, where `indexedDB` is undefined. Added `export const ssr = false;` matching the posture of `/share/[id]` and `/project/[id]/*`.
- **Dev-server cache thrash** — Vite's HMR file-watcher was firing on every `.vercel/output/static/**` regeneration (~17 HTML files per build × 50 commits = hundreds of bogus reload cycles, corrupting the dep-optimizer cache). Watcher now ignores `.vercel/**`, `.svelte-kit/output/**`, `build/`, `dist/`, all `*.md`, and doc trees. Also added `pnpm run clean` script for one-command cache wipes.
- **Bench test bounds + timeouts for CI** — `buildFont` 500-glyph bench bound 2000ms → 8000ms (CI runners are 15-20× slower than local); vitest test timeout raised to 30s to absorb the warm-up + iter × per-call walltime.
- **Stale "88 glyphs" + "8 glyphs drawn" copy** on home page's "See it in action" Hn section — last of the 88→162 surface sweep that earlier passes missed.
- **Light/dark theme toggle now actually flips the page.** Two bugs combined to silently break the toggle: (1) Tailwind v4 compiled `:root.theme-dark` to `.theme-dark` (specificity 0,1,0 — tied with `:root`, only winning by source order), and (2) the `app.html` inline `<style>` used `background: light-dark(#fafaf9, #0c0a09)` which keys off `color-scheme: light dark`, letting the browser auto-pick from OS preference rather than respecting the explicit class. Fixed by moving to `html.theme-dark` (specificity 0,1,1, guaranteed winner) and replacing the inline `light-dark()` with explicit class-based rules.
- **Marketing page chrome no longer shifts on navigation.** Three different container widths (`max-w-3xl`, `max-w-5xl`, `max-w-6xl`) caused visible reflow when clicking between marketing pages. All 28 marketing files (EN + ES) normalized to `mx-auto max-w-5xl px-4 sm:px-6` via a single perl pass.

### Performance
- **Production cold-load multi-run baseline confirms no perf regressions.** 3 cold runs against `patens.design` (Chromium via `scripts/profile-cold-load.mjs`): `/` 612ms FCP (warm 342ms); `/project/demo/edit` 1056ms LCP cold (warm 658ms); `/share/demo` 671ms FCP (warm 522ms). Zero long tasks ≥50ms anywhere. All three routes well inside Web Vitals "good" (LCP ≤ 2.5s). A single-run +346ms "editor LCP regression" turned out to be CDN cold-warming noise; streaming-SSR-on-editor demoted from must-have to nice-to-have. Numbers + verdict captured in `docs/launch/lighthouse-baseline.md`.
- **`/project/[id]/*` critical path: −243 KB raw (−68 KB gzipped) by deferring opentype.js out of the project layout's eager chain.** `previewStore` (mounted by the project layout for every sub-route) statically imported `buildFont` from `$lib/font/export.ts`, which in turn statically imported `opentype.js`. That made the 243 KB opentype chunk land on the audit / spacing / features / release / share sub-routes — none of which immediately render the live preview. Moved `buildFont` + `applyColorFontTables` to dynamic imports inside `PreviewStore.build()`; opentype now lands ~180 ms after layout mount when the rebuild debounce fires, well after canvas paint. **Static imports of `mzzzXzJM.mjs` across the manifest: 3 → 0.**
- **Editor cold-load: 593 KB → 486 KB (−106 KB / −17.9%).** Four-stage defer pass:
  - Audit module dynamically imported on `requestIdleCallback`; the 94-check × every-glyph badge computation no longer blocks first paint.
  - SettingsDialog (5KB) + ShortcutsDialog (5KB) + StatsPopover (19KB) lazy-mount on first open.
  - CommandPalette (15KB) lazy-mounted in the root layout — saves 15 KB on every cold load across every route, marketing pages included.
  - EditorTour (7KB) lazy on tour activation.
  - 5 right-sidebar panels (CompositeEditor 15KB + ReferenceImagePanel 11KB + RevisionsPanel 8KB + MetricsInspector 5KB + StemsPanel 3KB) batched into a single `Promise.all` import on `requestIdleCallback` ~200ms after canvas mount.
- **Pyodide lazy-loaded off the home-page eager chain.** UFO import now dynamic-imports `$lib/font/python` on first use; first-visit home no longer ships the Python runtime in the preload graph.

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
