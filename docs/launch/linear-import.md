# Patens — Linear import plan

Comprehensive issue list to push into Linear once the MCP is wired.
Source-synthesized from `master-runbook.md`, `master-plan.md`,
`app-improvements-plan.md`, `handoff-2026-05-27.md`, plus open items
from the current session.

**Target launch:** TypeCon Portland — Aug 6–8, 2026
**Show HN target:** Tuesday Aug 4, 2026 (5–8 AM PT)
**Runway:** ~10 weeks from Jun 2, 2026

---

## Suggested Linear structure

- **Workspace project:** `Patens Launch` (parent)
- **Cycles:** one per week (Week 1 = Jun 2–8 → Week 10 = Aug 4–8)
- **Labels:** `launch-critical`, `grant`, `marketing`, `editor`, `a11y`,
  `perf`, `seo-aio`, `research`, `outreach`, `press`, `content-roadmap`,
  `qa`, `infra`, `animation-polish`, `defer-post-launch`
- **Priorities:** P0 (5 must-not-skip), P1 (improves launch), P2 (nice
  to have), P3 (post-launch / v2)

---

## 1. Critical path — the 5 that cannot slip

| # | Title | Due | Label | Priority |
|---|---|---|---|---|
| 1 | Submit Vercel OSS application | Wed Jun 3 EOD | `grant` `launch-critical` | P0 |
| 2 | Demo GIF first cut shipped | Sat Jun 14 | `marketing` `launch-critical` | P0 |
| 3 | Real-device QA pass complete | Sat Jun 21 | `qa` `launch-critical` | P0 |
| 4 | Submit NLnet Commons application | Thu Jul 31 EOD | `grant` `launch-critical` | P0 |
| 5 | Submit Show HN | Tue Aug 4, 05:30 AM PT | `outreach` `launch-critical` | P0 |

Each is non-fungible. Everything else has a fallback.

---

## 2. Grant applications (6)

| Title | Target | Deadline | Source doc |
|---|---|---|---|
| Submit Vercel OSS application | $3,600 credits | Wed Jun 3 | `vercel-oss-application.md` |
| Submit Anthropic combined application | $25K + $25K | Rolling — submit Week 2 | `anthropic-application.md` |
| Submit GitHub Secure OSS Fund | $10K + sprint | Rolling — submit Week 2 | `github-secure-oss-application.md` |
| Submit FUTO microgrant | $5K | Rolling — submit Week 3 | `futo-microgrant-application.md` |
| Submit Mozilla MOSS | $25K–$50K | Rolling — submit Week 3 | `mozilla-moss-application.md` |
| Submit NLnet Commons (refresh first) | €5K–€50K | Thu Jul 31 EOD | `nlnet-application.md` |

Combined target: **~$100K–$200K mixed credits + cash.**

---

## 3. Weekly cycles (Week 1 → Week 10)

### Week 1 — Jun 2–8 — Vercel OSS + demo GIF first cut

- [ ] Review `vercel-oss-application.md` final pass (10 min)
- [ ] Personalize maintainer-bio paragraph
- [ ] **🔴 SUBMIT Vercel OSS** by EOD Wed Jun 3
- [ ] Log submission timestamp + ref ID in `handoff-2026-06-03.md`
- [ ] Demo GIF first cut per `demo-gif-storyboard.md` (3–4h block)
- [ ] Drop recording at `static/demo/patens-30s.mp4`
- [ ] Update README hero with actual video tag
- [ ] Review demo GIF cold (next-day eyes test) Sun Jun 8

### Week 2 — Jun 9–15 — Anthropic + GitHub Secure + QA prep

- [ ] Submit Anthropic combined application
- [ ] Submit GitHub Secure OSS Fund
- [ ] Verify all routes 200 on `patens.design` post-deploy (curl spot-check)
- [ ] Note any visual regressions from the Swiss pass

### Week 3 — Jun 16–22 — Real-device QA #1 + FUTO + Mozilla

- [ ] iPad landscape (~1180px) — edit canvas / audit panel / sidebar overlap
- [ ] iPad portrait — banner copy
- [ ] iPhone Safari — marketing surface only; waitlist + theme toggle + lang switcher
- [ ] Real keyboard test on iPad — tab order, focus rings
- [ ] File `responsive` + `device-name` tagged issues for findings
- [ ] Submit FUTO microgrant
- [ ] Submit Mozilla MOSS
- [ ] Log timestamps + ref IDs

### Week 4 — Jun 23–29 — Citation engine corpus ingest (3 sources)

- [ ] Set up `src/lib/citations/` directory + TypeScript types
- [ ] Ingest OpenType Specification 1.9.1 (chapter-by-chapter)
- [ ] Ingest Apple TrueType Reference Manual
- [ ] Ingest Adobe Glyph List + AGLFN
- [ ] Build citation-token schema (source-id, anchor, edition, version, retrieval-date)

### Week 5 — Jun 30–Jul 6 — Citation engine remaining 7 + Lighthouse

- [ ] Ingest Adobe FEA File Specification
- [ ] Ingest UFO 3 specification
- [ ] Ingest Unicode Standard 16.0
- [ ] Ingest Stop Stealing Sheep (CC PDF)
- [ ] Ingest OpenType Cookbook (Tal Leming)
- [ ] Ingest Klim "Design Information" archive (+ archive.org snapshots)
- [ ] Ingest Knuth 1979 Metafont papers
- [ ] Run Lighthouse against production: home / audit / share/demo / project/demo/edit
- [ ] Compare to v1.5.2 baseline in `lighthouse-baseline.md`
- [ ] Close any P0 regressions

### Week 6 — Jul 7–13 — Citation matcher + UI; vision experiment prep

- [ ] Build audit-code → citation matcher (1–3 best citations per code)
- [ ] Wire into edit-panel inline issue list (feature-flag gated)
- [ ] QA against 20 representative audit codes across all 9 families
- [ ] Demo flow ready for TypeCon presentation
- [ ] Select 25 sample fonts (10 canonical, 5 proprietary, 10 novice) per `ai-audit-mapping.md` 3.1
- [ ] Build render pipeline (images at specified zoom levels)
- [ ] Wire claude-opus-4-7 vision API calls
- [ ] First run on 3 candidates: `xheight-misaligned`, `sharp-kink`, `kerning-extreme`

### Week 7 — Jul 14–20 — Vision experiment full run + press T-21 + TypeCon emails

- [ ] All 10 candidate codes × 25 fonts × claude-opus-4-7 baseline
- [ ] Bootstrap CIs (1000 resamples per code)
- [ ] Cohen's kappa per code (algorithm vs vision)
- [ ] Write `docs/research/vision-experiment-results.md`
- [ ] Budget: ~$60–$100 Anthropic credits per `ai-audit-mapping.md` 3.6
- [ ] **Tue Jul 15:** send all 5 TypeCon back-channel emails
  - Dave Crossland (Google Fonts) — open-source program angle
  - Glenda Bellarosa (Adobe Fonts / Font Bakery) — audit-as-pedagogy
  - Lizy Gershenzon + Travis Kochel (Future Fonts) — foundry-as-platform
  - Christopher Slye (SOTA Ex Officio) — Spacebar party lightning slot
  - Neil Summerour (SOTA Treasurer / Positype) — foundry + 2027 CFP intro
- [ ] Log responses in `handoff-2026-07-15.md`
- [ ] Press outreach T-21: send pre-launch heads-up to Tier-1 type pubs per `press-contacts.md`

### Week 8 — Jul 21–27 — NLnet + QA #2 + press T-14

- [ ] Refresh `nlnet-application.md` with vision kappa, citation MVP demo URL, multi-script progress, grant outcomes
- [ ] **🔴 SUBMIT NLnet by Jul 31 EOD**
- [ ] Final iPad + iPhone sweep
- [ ] Verify all pass #1 findings closed
- [ ] Photo doc the demo flow on each device (for press)
- [ ] Press outreach T-14: send to specific journalists per `press-contacts.md` §3

### Week 9 — Jul 28–Aug 3 — Demo polish + press T-7 + pre-flight

- [ ] Final cut on demo GIF (post-feedback iterations)
- [ ] Verify all marketing OG cards (curl all 7 variants; PNG magic + byte size + visual)
- [ ] Pre-launch CHANGELOG sync
- [ ] Tag `v1.6.0` with Swiss + research + citation engine
- [ ] Press outreach T-7: Tier-2 design + tech pubs
- [ ] All routes 200 spot-check
- [ ] Waitlist end-to-end test (test + delete)
- [ ] README "Try it" links resolve
- [ ] CHANGELOG entry for v1.6.0 published
- [ ] Bluesky + X + Instagram pinned posts queued for T+30min
- [ ] `hi@patens.design` inbox cleared
- [ ] Pre-write Tue Aug 4 submission post

### Week 10 — Aug 4–8 — LAUNCH WEEK

#### Mon Aug 3 (T-1)
- [ ] Final pre-flight pass (re-run the checklist)
- [ ] Sleep early — submission window is 5–8 AM PT

#### Tue Aug 4 (T-0) — SHOW HN
- [ ] **05:30 AM PT — submit Show HN** per `show-hn-draft.md`
- [ ] Save HN post URL immediately
- [ ] Watch comment queue first 2h, respond fast
- [ ] Drop pinned posts on Bluesky / X / Instagram T+30min
- [ ] Email press contacts who pre-replied "embargo-ok"
- [ ] Update `handoff-2026-08-04.md` every 2h with cohort metrics

#### Wed Aug 5 (T+1)
- [ ] Cross-post to TypeDrawers per `typedrawers-intro.md`
- [ ] Cross-post to r/typography
- [ ] Continue HN comment engagement
- [ ] Press follow-up: share `/press` + `/audit` + `/compare`

#### Wed–Fri Aug 5–8 — TypeCon Portland
- [ ] If Spacebar lightning slot confirmed: demo citation engine + vision results (5 min, ~3 slides)
- [ ] Hand out printed press-kit cards at booth
- [ ] Seek conversations with the 5 named outreach targets
- [ ] Type Crit attendance Wednesday (Glenda runs Font Bakery)
- [ ] Friday: SOTA Spacebar party (Monotype-sponsored)
- [ ] Saturday closing dinner: foundry director conversations
- [ ] Post photos / live-blog to socials

#### Sat–Sun Aug 9–10 — POST-LAUNCH
- [ ] HN / TypeDrawers / r/typography metric recap in handoff doc
- [ ] First-week analytics review
- [ ] First-press articles tracking
- [ ] Follow-up to non-responding Tier-1 journalists T+7

---

## 4. Animation polish (from this session — deferred)

`animation-polish` label.

- [ ] Apply the "cooler hero animation" workflow synthesis — musicality (triplet + rest in height cascade), climax-release (synchronized convergence moment), possibly wave choreography. Full plan in workflow output `ws25339zv`.
- [ ] Smooth opacity transition for IntersectionObserver-promoted sticky `.hero-cta` (currently snaps from absolute → fixed)
- [ ] Verify the sticky `.hero-cta` doesn't flash during the `hero-chrome-reveal` keyframe at 6450ms
- [ ] Consider whether twist pass probabilities (25% height / 25% width / 50% straight) need rebalancing now that easing is cubicInOut
- [ ] Clean up unused `homeTagline()` / `taglineParts` derived state (H1 now only renders the first line)
- [ ] Clean up unused `.draw-line-2` CSS rule

---

## 5. Marketing surface — copy + content

`marketing` label.

- [ ] Decide whether to update SEO meta descriptions (currently include "Now in private alpha" — the visible TL;DR no longer uses that framing)
- [ ] H1 across landing routes — audit for "2026" content (titles have it, H1 may not)
- [ ] Welcome dialog rework — taste-driven copy + structure
- [ ] `/about` lead deepen — current may be too short for AI extraction; should be 80–150 words definition-first
- [ ] Add `BreadcrumbList` JSON-LD to `/help`, `/changelog`, `/about` (helps AI engines understand site hierarchy)
- [ ] Add `Organization` or `Person` JSON-LD block to `/about` (entity linking)
- [ ] Take real screenshots; replace README hero placeholder

---

## 6. Editor depth — P1 / P2 / P3

`editor` label.

### P1 (improves launch)
- [ ] 30-sec demo GIF / video for hero (Welcome dialog rework subject)

### P2 (post-launch)
- [ ] Multi-master variation explorer drag UI (~2d) — live interpolation drag across design space
- [ ] Re-share versioning (~1.5d) — server contract ships; UI side at `/share/[id]` v-dropdown + `?v=N` deep-link
- [ ] Bespoke Cyrillic shapes Я Ж Ф (~0.5d) — needs your hand
- [ ] Curve-fit pass on demo geometric glyphs (~1.5d) — visual quality lift across the demo
- [ ] Virtualize GlyphBrowser tile grid (~1d) — closes 35ms cold-mount layout smell
- [ ] Per-device responsive sweep (~1d)
- [ ] Subset OG fonts (Inter 325 → ~20KB, Lora 132 → ~10KB) — needs `subset-font` / `pyftsubset` dev dep
- [ ] Streaming SSR on editor shell (~1d) — IDB project payload as streamed promise

### P3 (v1.6+ / v2)
- [ ] Account system (5d) — OAuth (GitHub, Google), per-account project list, visibility controls, quotas
- [ ] Drawn Italic master (5d) — real italic redraws, not slant axis
- [ ] Full Greek lowercase set (2d) — 14+ glyphs to draw + audit
- [ ] AI explain-audit-code (1.5d) — Claude API + cost guard + UX
- [ ] AI kerning-suggest (3d) — model + API or local distilled
- [ ] i18n (5d) — defer to v2.0

---

## 7. Post-launch content roadmap (3 months)

`content-roadmap` label.

### Month 1 — Foundation content
- [ ] Blog post 1: "How I built a browser-native type editor: lessons from 8 months of solo development"
- [ ] Blog post 2: "How to make your first font in the browser: a 30-minute walkthrough" → `/learn/first-font`
- [ ] Comparison page refresh: `/compare` — honest comparison vs Glyphr Studio, Fontra, FontLab, Glyphs, typlr.app
- [ ] Tutorial blog post 3: "94 audit codes: how Patens teaches type design through error messages" → `/learn/audit-codes`

### Month 2 — Community + amplification
- [ ] YouTube channel: "Patens in 60 seconds" short + "Sketch to OTF in 15 minutes" long
- [ ] Cross-post YouTube short to TikTok / Instagram Reels
- [ ] Guest post / podcast pitch (Type Cast, Letterform Archive Salons, designer-tools podcast)
- [ ] Reddit AMA in r/typography or r/typedesign
- [ ] Submit to Sidebar.io + Indiebase + designer-tool aggregators

### Month 3 — Sustained signal
- [ ] Weekly: one short blog post (300–500 words) on a specific type-design topic
- [ ] Monthly: "what shipped in v1.X" recap post linking the changelog

---

## 8. Tracking + measurement

`infra` label.

### SEO tracking — Day 9 task
- [ ] Submit Google Search Console (sitemap.xml; monitor coverage)
- [ ] Submit Bing Webmaster Tools (also feeds ChatGPT browse-the-web)
- [ ] Set up Plausible or Fathom analytics (privacy-friendly)

### AIO tracking
- [ ] Bi-weekly: ask ChatGPT / Claude / Perplexity / Gemini "what's a good browser-based font editor?" → note mention + framing
- [ ] Monitor brand mentions in repo traffic (ChatGPT shows as `chatgpt.com` referrer)
- [ ] Track GitHub stars-over-time (sudden spikes correlate with AI citations)

### Community signal
- [ ] Track TypeDrawers thread replies + reply latency
- [ ] Track Reddit upvote-to-comment ratio
- [ ] Track Bluesky reposts + replies

---

## 9. Handoff items (from 2026-05-27 — still open)

`outreach` label.

- [ ] Native-review the 10 `/es/*` pages (tú form, neutral/LATAM, no vosotros). One voseo instance on `/es` hero ("dibujás") — flip to `dibujas` for pure tuteo, or keep per voseo memory
- [ ] Triage PR #9 (Dependabot dev-deps × 6)
- [ ] Repo Settings → Code security and analysis → enable Dependency Graph
- [ ] Repo Settings → Social preview → upload `static/github-social.png`
- [ ] Google Workspace setup for `hi@patens.design` + `security@patens.design`
- [ ] OpenSSF Best Practices → Silver application (Passing already done)
- [ ] Awesome-list PRs (file AFTER Show HN bumps star count past 50)

---

## 10. Decisions awaiting call

Tag: `decision-needed`.

- [ ] Show HN timing — 9:30 AM PT (folklore) vs 6:00 AM PT (King 2026 analysis). Recommendation: 6:00 AM PT Tue Aug 4.
- [ ] Post order — Show HN first then T+24 cross-post (vs simultaneous). Recommendation: Show HN first to avoid HN voting-ring detection.
- [ ] `/compare` opinion lines (Spanish version) — "Vs Patens —" framings need your eyes
- [ ] FAQPage JSON-LD on `/pronunciation` — re-shape as visible Q&A
- [ ] AlternativeTo + Slant + Product Hunt listings — file AFTER Show HN gets you above ≥50 stars

---

## 11. Anti-goals — do NOT do

Tag: `wontdo`. Document so they don't drift back.

- ❌ Buy backlinks
- ❌ Write fake reviews
- ❌ Pay for Product Hunt boosts
- ❌ Run ads
- ❌ Keyword stuffing
- ❌ Submit to 100 SaaS directories
- ❌ TikTok strategy unless you naturally make TikToks
- ❌ Compare to Glyphs / FontLab head-to-head
- ❌ Auto-DM on X / Bluesky
- ❌ Paywall the core editor
- ❌ Press releases
- ❌ Pitch It's Nice That / Sidebar before 3+ designers ship fonts with Patens
- ❌ Mobile editor (desktop-first by design)
- ❌ Real-time collaboration
- ❌ Server-side font hosting
- ❌ PWA push notifications
- ❌ Product Hunt as primary launch (saturated 2026)
- ❌ Catch up to Figma's WASM-renderer arc
- ❌ Lighthouse-score chasing on the editor route
- ❌ Direct Emscripten ttfautohint replacement

---

## Risk register

| Risk | Mitigation |
|---|---|
| Vercel OSS rejected | Cloudflare Pages free-tier backup at `cf.patens.design` |
| Demo GIF doesn't ship | High-quality static screenshot + screen recording link in README |
| Real-device QA finds blocker bugs | Defer post-launch IF not on Show HN landing path |
| NLnet rejected at Aug cycle | Re-target Oct 1 with launch traction |
| Show HN flops | Cross-posts to TypeDrawers + r/typography at T+24h still go |
| TypeCon slot doesn't materialize | Booth + 1:1 still produce signal |
| Citation engine MVP slips | Demo with 3-source partial corpus; research files alone are TypeCon-worthy |

---

## Single-sentence summary

> **Submit Vercel by Wed Jun 3. Demo GIF by Jun 14. Real-device QA by Jun 21. NLnet by Jul 31. Show HN Tue Aug 4 at 5–8 AM PT. TypeCon Portland Aug 6–8. Everything else is in `docs/launch/`.**
