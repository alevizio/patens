# App improvements — what's shipped, what's left

Living doc. Last refresh: 2026-05-27 after the demo-font + security-PR arc.
Target: TypeCon Portland Aug 6–8, 2026. ~10 weeks runway.

**Unit**: 1 day = ~5h focused solo-dev. Estimates are honest but soft.

## Update 5 — late-May refresh (2026-05-27)

After auditing the live site against the P0 checklist, most "P0
unshipped" items are actually live in production:

- [x] `/press`, `/privacy`, `/security` — all serving real content.
- [x] `/llms-full.txt` — dynamic route at `src/routes/llms-full.txt/`.
- [x] Year-in-title pass — "2026" in `<title>` on /, /about, /compare,
      /help (updated this commit), /changelog (updated this commit),
      and every /learn/* route.
- [x] `/pronunciation` page (new this commit) — FAQPage JSON-LD entry
      for "how do you pronounce Patens" queries, linked from footer.
- [x] Demo OTF + in-editor demo project — bowls/A/lowercase a
      refined with curves (commits 3a7355b, 086fa94).
- [x] Security PR #8 merged: token sha256 hashing, baseline HTTP
      security headers, error-detail hiding, Anthropic proxy
      hardening with model allowlist.

What's actually left is in the **P0 — Still launch-blocking** section
below, which has been trimmed to the real gaps.

---

## ✅ Shipped this session (18 commits)

Don't redo any of this:

### Foundation + SEO/AIO
- SSR enabled at root (`ccd6741`) — JSON-LD now reaches crawlers
- llms.txt + AI-crawler robots.txt allows (`08a7ec9`)
- IndexNow set up + pinged Bing + Yandex
- Sitemap covers every public route
- `/compare` page vs FontLab / Glyphs / Fontra / Glyphr Studio / typlr.app / BirdFont / FontForge / RoboFont
- 3 new long-form `/learn/*` posts: kerning, variable-fonts, opentype-features (`a98e912`)
- `/learn/audit-codes` reference for all 101 codes
- `/learn/first-font` 10-step HowTo
- `/about` deepened lead + pronunciation guide
- BreadcrumbList on every page, FAQPage on /help, HowTo on /learn tutorials

### A11y
- 31 routes / modals covered by axe (was 19)
- 5 modals audited while open: Welcome, Settings, Shortcuts, Storage, CreateFont
- `/family/[id]` covered (with IDB seeding helper)
- 3 real WCAG violations closed: SettingsDialog 22×22 target, success-on-soft 3.35:1, success-on-white 3.55:1

### Features
- Global Cmd-K via shared CommandPalette (`65afca0`) — works from /, /learn, /about, every project route
- Family-wide kerning wired into `buildFont` (`bd49e71`) — closes a real correctness gap
- Audit "Fix" buttons polished + auto-fixable pill on group headings (`96f2661`)
- Bulk select v2: shift-click range, select-all-visible, ±SB delta, +Suffix rename (`7e5f064`)

### Performance
- Hero LCP preload (`2761f3f`)
- Lazy-load opentype.js on home (`ea979ee`) — ~240KB deferred to first import
- Audit workerized (`71f1399`) — runs in a Web Worker, stale-response guard, sync fallback
- IDB `getMany` batching across backup, restore, family delete, family bundle (`c42f9ba`)
- Audit benchmark for regression guard (`23ddd00`) — 1ms at demo size, 2.6ms at 500 glyphs

### Codebase health
- Lint baseline ratchet 5 → 0 (`1fcfbe5`); CI gate at 0
- Service-worker upgrade-path tested (`4a37115`) — 15 new unit tests
- Tab-nav Designspace flake root-caused + closed (`e3b3db2`)
- Welcome-strip SSR-pre-hydration race fixed (`6473204`)
- 506 vitest + 59 playwright, all green

---

## Update 4 — maintainer-experience polish arc (2026-05-26)

Companion arc to the second OSS-readiness pass logged in
`docs/launch/oss-readiness-plan.md`. App-side wins:

- `de9d451` Pyodide is no longer in the home preload — first-visit
  cost dropped without touching the UFO-import code path.
- `7f80be8` Home page Lighthouse A11y 98 → 100 (added missing
  `<main>` landmark; Drag-drop unchanged).
- `16a9552` Two new perf-regression guards land in CI: buildFont +
  expandKerningClasses. 500-glyph export budgets at 126ms; the
  large kerning-class scenario expands ~360k pairs in 19ms.
- `94ec8f6` CLI distribution path — `npx patens audit` runs the
  full 102-code audit + preflight against any `.font.json` from
  any terminal, with text / json / github-workflow output modes.
  Closes the "audit module is locked inside the editor" critique.

Production build now 3180 KB client (well under the 5120 KB cap),
528 unit + 6 bench tests passing.

Nothing on the P0/P1 list above was touched — this arc was
entirely below-the-waterline maintainer-experience work that
clears the path for external contributors before TypeCon.

---

## Update 3 — eight-piece launch-prep sweep

Picked up the "what's left for ME" list + did all 8 autonomous picks
in order. Commits this arc:

- `ba5c449` /llms-full.txt — 18KB long-form companion to /llms.txt
  (about + positioning + capabilities + tech stack + all 5 /learn/*
  tutorials + export-formats + audit-codes). Per getmint.ai 2026
  adoption analysis, Cursor + Claude Desktop + ChatGPT crawl this
  more than llms.txt itself.
- `cedc212` Year-in-title pass — "2026" suffix on titles across /,
  /about, /compare, /learn/*. +30% citation rate per Leapd GEO study.
- `3eef1bb` /privacy + /security pages — plain-English, GDPR-shaped,
  responsible-disclosure flow. Both prerendered with full JSON-LD.
- `f150000` /press page — factsheet + three-length descriptions
  (one-liner / elevator / technical) + brand assets + screenshots
  placeholder + milestones + further reading.
- `607aa25` Re-share version-picker UI on /share + multi-master
  axis-pair picker on /designspace. Closes the two "server-ready,
  UI pending" items from the previous arc.
- (this commit) Lighthouse baseline doc + awesome-list PR drafts +
  plan refresh.

Lighthouse baseline captured at /docs/launch/lighthouse-baseline.md:
- Home (SSR): Perf 91, A11y 98, BP 100, SEO 100. LCP 2.6s, CLS 0, TBT 0.
- About (prerendered): Perf 97, A11y 98, BP 100, SEO 100.
- Compare (prerendered): Perf 97, A11y 98, BP 100, SEO 100.
- Editor: Perf 77, A11y 93, BP 100, SEO 100. LCP 2.8s, TBT 490ms.

Awesome-list PR drafts at /docs/launch/awesome-prs.md — three PRs
ready to submit (awesome-svelte, awesome-sveltekit, Awesome-Design-
Tools) with title, body, alphabetical insertion, submission order +
strategy.

Footer now links: Help · Compare · Changelog · About · Press ·
Privacy · Security · GitHub · @patenstype. Sitemap covers every
public route at appropriate priority.

Remaining items that genuinely require your hand:
- 30s demo GIF — screen-record the audit-fix flow
- Welcome dialog rework — taste call on first-visit copy
- Real-device responsive (iPhone + iPad)
- Bespoke Cyrillic Я Ж Ф, Drawn Italic master, Greek lowercase,
  curve-fit demo glyphs — all type design work
- Account system — v1.6 deferral, 5-day architectural decision
- i18n — v2 candidate, multi-day rabbit hole

---

## Update 2 — second autonomous arc (P1 + P2 + most of P3)

Picked up the plan and worked top-down through every autonomous-safe
item. New commits since the first refresh:

- `bd6a1d0` /learn/multi-script + /learn/export-formats + inherited-pair
  badges in /spacing + "Fix all N" per-group button on /audit
- `f6d4d86` subset OG fonts (-333KB total) + content-visibility
  virtualization on GlyphBrowser + re-share versioning server-side +
  Playwright traces/screenshots/video upload on CI
- (this commit) AI explain-audit-code via Claude API +
  axis-pair-picker note for variation explorer

ROADMAP closures:
- ✅ Multi-master variation explorer — it was already shipped at
  /designspace, ROADMAP entry was stale; updated.
- ✅ Re-share versioning — server contract shipped (versioned blob
  paths, ?v=N query, /versions endpoint, DELETE-all cascade). UI
  pending but unblocked.

Skipped (honestly, with reasons):
- Welcome dialog rework — taste call, your eye
- 30s demo GIF — your hand, screen-record
- Per-device responsive — needs real iPhone/iPad
- Bespoke Cyrillic / curve-fit demo / Drawn Italic / Greek lowercase —
  glyph design work, your hand
- i18n — multi-day rabbit hole; deferred to v2
- AI kerning-suggest — already-shipped infrastructure exists at
  src/lib/ai/kerning-suggest.ts; further work is taste-driven
- Account system — explicit P3 / v1.6, intentionally deferred

---

## P0 — Still launch-blocking (estimated 1.5d remaining)

### Launch artifacts — SHIPPED in Update 5

All of the launch-artifact tasks are done. The H1 across landing routes
hasn't been audited for "2026" content yet — titles have it, but H1
copy may not. Re-check during the QA pass.

### Final pre-launch QA (1.5d) — needs hand-on-keyboard from Alejandro
- [ ] Lighthouse run against production — capture before/after numbers,
      log any regression > 5 points.
- [ ] Cold-load profile via `scripts/profile-cold-load.mjs` on home,
      `/share/demo`, `/project/demo/edit`. Compare against the ROADMAP
      v1.4.0 numbers.
- [ ] Real-iPhone + real-iPad spot-check (you'll need physical devices).
      Tap targets, scroll, the share menu, the editor's pencil + trace
      flow. Document anything ugly.
- [ ] Manual keyboard-only navigation walkthrough — tab through every
      interactive control on home, editor, audit, share. Fix focus traps
      + tab-order issues axe couldn't see.
- [ ] VoiceOver pass on home + editor + audit page — fix ARIA gaps.

---

## P1 — Strongly improves launch (estimated 3.5d remaining)

These would land the launch with more substance but aren't blocking.

### Demo + outreach prep (1d)
- [ ] 30-second demo GIF / video for the hero — your hand, screen-record.
      Best subject: audit module catching 3 issues + one-click fixing them
      (the differentiator). Storyboard if you want me to write one.
- [ ] Welcome dialog rework — taste-driven copy + structure. The current
      strip is non-blocking and works; opportunity is to tighten what the
      first-time visitor sees in their first 10 seconds.

### Editor polish — both SHIPPED (verified 2026-05-27)
- [x] Inherited-pair badges in `/project/[id]/spacing` — already at
      `src/routes/project/[id]/spacing/+page.svelte:2481-2535`
      ("inherited" badge, family pair count, link to family hub).
- [x] Audit "Apply Fix to all in this group" — `fixCodeGroup()` is wired
      at `src/routes/project/[id]/audit/+page.svelte:215` + the per-group
      button at line 630 + the global `fixAllVisible` at line 554.

### Content gaps — both SHIPPED (verified 2026-05-27)
- [x] `/learn/multi-script` — live at `src/routes/learn/multi-script/`.
- [x] `/learn/export-formats` — live at `src/routes/learn/export-formats/`.

---

## P2 — Post-launch / nice-to-haves (estimated 10d)

Each is its own self-contained ship-or-don't decision.

### Editor depth (~5d)
- [ ] Multi-master variation explorer drag UI (~2d) — "drag through
      design space" surface. Currently the page lists axes + masters
      but lacks the live interpolation drag.
- [ ] Re-share versioning (~1.5d) — per-share upload history under
      `shares/{id}/v{n}.json`. GET defaults to latest, `?v=N` for
      specific. Closes the last open ROADMAP item under M3.
- [ ] Bespoke Cyrillic shapes Я Ж Ф (~0.5d) — needs your hand on the
      glyph design, not autonomous-safe.
- [ ] Curve-fit pass on demo geometric glyphs (~1.5d) — visible visual
      quality lift across the demo. Polygon primitives → hand-tuned
      Béziers. Careful manual work; touches the first thing visitors see.

### Polish + workflow (~3d)
- [ ] Virtualize GlyphBrowser tile grid (~1d) — closes the 35ms cold-mount
      layout that's the one editor-route smell in `profile-cold-load.mjs`.
      Wait until launch is past — would conflict with shift-click range
      select if not designed carefully.
- [ ] Per-device responsive sweep (~1d) — real iPhone/iPad audit, fix
      what looks wrong at real screen sizes.
- [ ] Subset OG fonts (Inter 325KB → ~20KB, Lora 132KB → ~10KB) — needs
      adding `subset-font` or `pyftsubset` to dev deps. Skipped this
      session to avoid the dependency commit.

### Codebase health (~1d)
- [ ] Streaming SSR on the editor shell (~1d) — load IDB project payload
      as a streamed promise; render chrome immediately. Smaller win on
      client-bottlenecked apps (per perf research) but real for first
      project-open after cold load.
- [ ] Re-share versioning UI on `/share/[id]` (~0.5d) — version dropdown
      + "view as of v3" deep-link. Pairs with the server-side P2 above.
- [x] Playwright trace upload to CI on failure — already wired in
      `.github/workflows/ci.yml` (lines 108-124, `if: failure()` +
      7-day retention + playwright-report + test-results) +
      `trace: 'retain-on-failure'` in playwright.config.ts.

---

## P3 — Bigger bets, post-launch or v2 (estimated 21d)

Each 3+ days. Not launch-blocking; v1.6+ candidates.

- **Account system** (5d) — OAuth (GitHub, Google), per-account project
  list, visibility controls (private / unlisted / public), quotas.
- **Drawn Italic master** (5d) — real italic redraws a/e/g/etc., not a
  slant axis. Marked as deferred in the demo's decision log.
- **Full Greek lowercase set** (2d) — 14+ glyphs to draw + audit.
- **AI explain-audit-code** (1.5d) — Claude API + cost guard + UX.
- **AI kerning-suggest** (3d) — model + API or local distilled model.
- **i18n** (5d) — defer to v2.0.

---

## Anti-goals (saying *no* saves more time than estimating well)

- **Mobile editor** — desktop-first by design.
- **Real-time collaboration** — single-designer-single-machine positioning.
- **Server-side font hosting** — fonts you draw are yours; no Patens-hosted serving.
- **PWA push notifications** — no notification story makes sense for a creative tool.
- **Product Hunt as primary launch moment** — saturated in 2026 (per launch research).
- **Catching up to Figma's WASM-renderer arc** — different shape product.
- **Lighthouse-score chasing on the editor route** — won't get enough
  field traffic to move CrUX. Optimise for real-user-felt INP instead.
- **Direct Emscripten ttfautohint replacement** — multi-day C build
  chain for a 7MB save that 95% of users never hit. Gate Pyodide behind
  an explicit "Auto-hint (advanced)" opt-in instead if the size bothers.

---

## Recommended 10-week sequencing → TypeCon

**Weeks 1–2 (now → June 8):** P0 launch artifacts. Press kit makes
Phase 2 outreach concrete; year-in-title is a 30-min win.

**Week 3 (June 8 → June 15):** P0 final QA — Lighthouse, real-device,
keyboard nav, VoiceOver. Capture before/after numbers for the launch
post's "by-the-numbers" sidebar.

**Weeks 4–5 (June 15 → June 29):** P1 picks. Demo video first (you).
Inherited-pair badges + /learn/multi-script can fall into a long week.

**Weeks 6–7 (June 29 → July 13):** P1 finish + reputation. Pitch
Typographica + Alphabettes. dev.to long-form. TypeDrawers thread.
Buttondown newsletter set up.

**Weeks 8–9 (July 13 → July 27):** Stretch + buffer. P2 picks if
ahead. Launches go off the rails when there's no slack — keep this
deliberately under-loaded.

**Week 10 (July 27 → Aug 8):** Launch.
- Tue Aug 4 or Wed Aug 5, 8:30 AM ET — Show HN.
- Within 4 hours: Bluesky + X + Reddit r/typography.
- Within 24 hours: dev.to long-form goes live.
- Aug 6–8 — TypeCon Portland in person. Lightning talk on-site.

---

## How to use this doc

- The categorisation (P0/P1/P2/P3) is what matters. If a P2 item starts
  blocking sleep, promote it. If a P0 item turns out to be a half-day
  fix, the rest of the day is yours.
- Estimates are rangey — pad mentally by 30% for unknowns.
- Anti-goals save more time than estimating well.

Total remaining: **~37d** if you did everything, with **~6d** of P0+P1
that's actually launch-shaped + **~27d** of post-launch and bigger
bets. Plenty of slack against a 10-week window if you stay focused on
P0+P1.
