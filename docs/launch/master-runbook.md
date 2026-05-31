# Patens — Master Pre-launch Runbook

**Last updated:** 2026-05-30
**Public launch:** TypeCon Portland, August 6–8, 2026
**Show HN target:** Tuesday Aug 4, 2026 (5–8 AM PT)
**Maintainer:** Alejandro Vizio, hi@patens.design

This is the single source of truth for everything that needs to happen between now and launch. Built from the 9 launch-prep docs in `docs/launch/`, the 4 research files in `docs/research/`, and the 9 weeks of execution work already completed.

---

## At a glance — 10-week calendar

| Week | Dates | Focus | Owner |
|---|---|---|---|
| 0 | May 30 – Jun 1 | Polish + research foundation + citation engine MVP (DONE) | Me |
| 1 | Jun 2 – Jun 8 | Vercel OSS submission + demo GIF first cut | YOU |
| 2 | Jun 9 – Jun 15 | Anthropic + GitHub Secure applications | YOU |
| 3 | Jun 16 – Jun 22 | Real-device QA #1 + FUTO + Mozilla MOSS | YOU |
| 4 | Jun 23 – Jun 29 | Citation engine — expand to remaining 45 codes (license-required canon) | TBD |
| 5 | Jun 30 – Jul 6 | Citation engine — UI polish + edit-panel inline integration | TBD |
| 6 | Jul 7 – Jul 13 | Lighthouse run; vision experiment SDK wiring | TBD |
| 7 | Jul 14 – Jul 20 | Vision experiment full run; press outreach T-21; **TypeCon Top-5 emails Tue Jul 15** | TBD/YOU |
| 8 | Jul 21 – Jul 27 | NLnet refresh + submission; real-device QA #2 | YOU |
| 9 | Jul 28 – Aug 3 | Demo polish; press outreach T-7; pre-flight | YOU |
| 10 | Aug 4 – Aug 8 | **LAUNCH** | YOU |

---

## Done — what landed in Weeks 0 (this session)

### Marketing surface — Swiss editorial pass complete
- `/audit`, `/press`, `/families`, `/help`, `/privacy`, `/security`, `/audit/[code]`, `/learn`, `/learn/*`, `/about`, `/changelog`, `/`, `/compare`, `/pronunciation`, `+error` — all Swiss-aligned with numbered section spines, rectilinear chrome, focus-visible rings, and editorial border-rule patterns.
- `/share/[id]`, `/studio-c104c94c`, `/family/[id]` — alpha-surface Swiss treatment.
- `/es/*` — chrome cleanup + numbered prefixes on the 5 multi-section pages (audit, press, privacy, security, about).
- Global `max-w-[60ch]` prose width via `app.css` (Swiss spec mandate).
- Font loading async-loaded (~100-300ms LCP improvement) with NoScript fallback.
- WaitlistForm `prefers-reduced-motion` now actually respected (Svelte JS-driven transitions don't auto-respect CSS @media).
- Bidirectional `/` ↔ `/es` hreflang. Sitemap lastmod current.

### Grant applications — paste-ready
| Application | File | Target | Deadline |
|---|---|---|---|
| Vercel OSS | `vercel-oss-application.md` | $3,600 credits | **Wed Jun 3** |
| NLnet Commons | `nlnet-application.md` | €5K–€50K | Jul 31 (Aug 1 cycle) |
| Anthropic combined | `anthropic-application.md` | $25K + $25K | Rolling |
| GitHub Secure OSS | `github-secure-oss-application.md` | $10K + sprint | Rolling |
| FUTO microgrant | `futo-microgrant-application.md` | $5K | Rolling |
| Mozilla MOSS | `mozilla-moss-application.md` | $25K–$50K | Rolling |

**Combined target: ~$100K–$200K mixed credits + cash.**

### Research foundation
| File | Purpose | Lines |
|---|---|---|
| `research/canonical-library.md` | 38 type-design sources; 10-source open-licensed MVP corpus | 526 |
| `research/ai-audit-mapping.md` | All 94 codes classified for AI augmentation | 415 |
| `research/multi-script-canon.md` | 10 scripts with native-tradition citations | 691 |
| `research/ai-features-roadmap.md` | 5-feature product roadmap | 285 |

### Citation engine MVP — LIVE
- `src/lib/citations/` — types + corpus + matcher + 12 tests
- 49 of 94 `/audit/[code]` pages ship "Canonical references" section
- Bibliographic citations only (no body-text ingest)
- 10-source open MVP corpus (OpenType spec, TrueType ref, AGL, FEA, UFO, Unicode 16, Sheep CC, OT Cookbook, Klim, Knuth 1979)
- `scripts/vision-experiment.mjs` — dry-run validated; needs Anthropic SDK wiring when credits land

---

## Week 1 — Jun 2 to Jun 8

### Mon Jun 2
- [ ] Review `docs/launch/vercel-oss-application.md` final pass (10 min)
- [ ] Personalize the maintainer-bio paragraph if any drift

### Tue–Wed Jun 3
- [ ] **🔴 SUBMIT Vercel OSS** by EOD Wed Jun 3 at [vercel.com/open-source-program](https://vercel.com/open-source-program)
- [ ] Save submission timestamp + reference ID in `docs/launch/handoff-2026-06-03.md`

### Thu–Sat Jun 5–7
- [ ] Demo GIF first cut per `docs/launch/demo-gif-storyboard.md` (3-4 hour block)
- [ ] Drop the recording at `static/demo/patens-30s.mp4`
- [ ] Update the README hero comment block with the actual video tag

### Sun Jun 8
- [ ] Review demo GIF cold (next-day-eyes test)
- [ ] Note any cuts/recaptures needed

---

## Week 2 — Jun 9 to Jun 15

### Anthropic + GitHub Secure (both rolling, no deadline, but stack early)
- [ ] **Submit Anthropic combined** via `anthropic-application.md` — apply at both startups portal + mention research track
- [ ] **Submit GitHub Secure OSS Fund** via `github-secure-oss-application.md`
- [ ] Each takes ~30-45 min once you have the docs open

### Real-device QA prep
- [ ] Verify all routes 200 on `patens.design` post-deploy (curl spot-check)
- [ ] Note any visual regressions from the Swiss pass

---

## Week 3 — Jun 16 to Jun 22

### Real-device QA pass #1
- [ ] iPad landscape (~1180px) — Edit canvas, audit panel, sidebar overlap check
- [ ] iPad portrait — banner copy ("some controls won't fit")
- [ ] iPhone Safari — marketing surface only (editor warns < 1024px); waitlist form, theme toggle, lang switcher
- [ ] Real keyboard test on iPad — tab order, focus rings
- [ ] File issues for any findings; tag `responsive` + `device-name`

### FUTO + Mozilla applications
- [ ] **Submit FUTO microgrant** via `futo-microgrant-application.md`
- [ ] **Submit Mozilla MOSS** via `mozilla-moss-application.md`
- [ ] Save timestamps + reference IDs

---

## Week 4 — Jun 23 to Jun 29

### Citation engine MVP — corpus ingest (3 sources)
**Strategic decision needed:** is this on me or you? Implementation roadmap is in `research/ai-features-roadmap.md`. Suggest dispatching me to start the scaffolding (`src/lib/citations/`) while you focus on real-device fixes.

- [ ] Set up `src/lib/citations/` directory + TypeScript types (Citation, Source, AuditCodeCitationMatch)
- [ ] Ingest OpenType Specification 1.9.1 (chapter-by-chapter)
- [ ] Ingest Apple TrueType Reference Manual
- [ ] Ingest Adobe Glyph List + AGLFN
- [ ] Build citation-token schema (source-id, anchor, edition, version, retrieval-date)

---

## Week 5 — Jun 30 to Jul 6

### Citation engine — remaining 7 sources
- [ ] Adobe FEA File Specification
- [ ] UFO 3 specification
- [ ] Unicode Standard 16.0
- [ ] Stop Stealing Sheep (CC PDF)
- [ ] OpenType Cookbook (Tal Leming)
- [ ] Klim "Design Information" archive (with archive.org snapshots)
- [ ] Knuth 1979 Metafont papers

### First Lighthouse run (post-Swiss deploy)
- [ ] Run Lighthouse against production patens.design — home, audit, share/demo, project/demo/edit
- [ ] Compare to v1.5.2 baseline in `docs/launch/lighthouse-baseline.md`
- [ ] Close any P0 regressions

---

## Week 6 — Jul 7 to Jul 13

### Citation engine MVP — matcher + UI
- [ ] Build audit-code → citation matcher (1–3 best citations per code)
- [ ] Wire into edit-panel inline issue list (feature flag gated)
- [ ] QA against 20 representative audit codes across all 9 families
- [ ] Demo flow ready for TypeCon presentation

### Vision experiment prep
- [ ] Per `research/ai-audit-mapping.md` Section 3.1: select 25 sample fonts (10 canonical, 5 proprietary, 10 novice)
- [ ] Build render pipeline that produces images at specified zoom levels
- [ ] Wire up the claude-opus-4-7 vision API calls
- [ ] First run on 3 top candidate codes (`xheight-misaligned`, `sharp-kink`, `kerning-extreme`)

---

## Week 7 — Jul 14 to Jul 20

### Vision experiment full run
- [ ] All 10 candidate codes × 25 fonts × claude-opus-4-7 baseline
- [ ] Bootstrap CIs (1000 resamples per code)
- [ ] Cohen's kappa per code (algorithm vs vision)
- [ ] Write up `docs/research/vision-experiment-results.md`
- [ ] **Budget:** ~$60-$100 of Anthropic credits per `ai-audit-mapping.md` Section 3.6

### Press outreach T-21
- [ ] Per `docs/launch/press-contacts.md` (drafted concurrently this session), send pre-launch heads-up to Tier-1 type-design pubs
- [ ] Include `/press` URL + offer to interview
- [ ] Save responses in handoff doc

---

## Week 8 — Jul 21 to Jul 27

### NLnet application refresh
- [ ] Re-open `docs/launch/nlnet-application.md`
- [ ] Fold in:
  - Vision experiment kappa numbers
  - Citation engine MVP demo URL
  - Multi-script + Cyrillic/Greek/Arabic demo progress
  - Vercel OSS / Anthropic / GitHub Secure outcomes (if any)
- [ ] **🔴 SUBMIT NLnet by Jul 31 EOD** at [nlnet.nl/commonsfund](https://nlnet.nl/commonsfund/)

### Real-device QA pass #2
- [ ] Final iPad + iPhone sweep
- [ ] All findings from pass #1 verified closed
- [ ] Photo doc the demo flow on each device (for press)

### Press outreach T-14
- [ ] Per `press-contacts.md` Section 3, send to specific journalists list

### TypeCon outreach (one-time, 3 weeks pre-conference)
- [ ] **Tue Jul 15:** Send all 5 TypeCon back-channel emails per `typecon-outreach-emails.md`
  - Dave Crossland (Google Fonts) — open-source program angle
  - Glenda Bellarosa (Adobe Fonts / Font Bakery) — audit-as-pedagogy adjacency
  - Lizy Gershenzon + Travis Kochel (Future Fonts) — foundry-as-platform pairing
  - Christopher Slye (SOTA Ex Officio) — Spacebar party 5-min lightning slot ask
  - Neil Summerour (SOTA Treasurer / Positype) — foundry director + 2027 CFP intro
- [ ] Note: **2026 CFP closed Apr 6, 2026.** No main-program slot path remains. Lightning slot at Spacebar (Friday party, Monotype-sponsored) is the realistic 2026 talk surface.
- [ ] Log responses in `handoff-2026-07-15.md`

---

## Week 9 — Jul 28 to Aug 3

### Demo polish
- [ ] Final cut on demo GIF (post-feedback iterations)
- [ ] All marketing OG cards verified (curl all 7 variants; PNG magic + byte size + visual check)
- [ ] Pre-launch CHANGELOG sync
- [ ] Tag `v1.6.0` with the full Swiss + research + citation engine

### Press outreach T-7
- [ ] Per `press-contacts.md`, send to Tier-2 design + tech pubs

### Pre-flight checklist execution per `show-hn-draft.md`
- [ ] All routes 200
- [ ] OG cards rendering with byte sizes verified
- [ ] Waitlist signup works end-to-end (test + delete)
- [ ] README "Try it" links resolve
- [ ] CHANGELOG entry for v1.6.0 published
- [ ] Bluesky + X + Instagram pinned posts queued for T+30min
- [ ] `hi@patens.design` cleared
- [ ] Pre-write the Tue Aug 4 submission tweet/post

---

## Week 10 — Aug 4 to Aug 8 — **LAUNCH WEEK**

### Mon Aug 3 (T-1)
- [ ] Final pre-flight pass (re-run the checklist)
- [ ] Sleep early. The submission window is 5-8 AM PT.

### Tue Aug 4 (T-0) — **SHOW HN**
- [ ] **05:30 AM PT — submit Show HN** via `docs/launch/show-hn-draft.md`
  - Use Variant A title (recommended): "Show HN: Patens – a browser type editor with a 94-rule audit that teaches"
  - Paste 180-word post body verbatim
- [ ] Save HN post URL immediately
- [ ] Watch comment queue for first 2 hours; respond fast on questions
- [ ] Drop pinned posts on Bluesky / X / Instagram T+30min
- [ ] Email press contacts who pre-replied with "embargo-ok"
- [ ] Update `docs/launch/handoff-2026-08-04.md` every 2 hours with cohort metrics

### Wed Aug 5 (T+1)
- [ ] **Cross-post to TypeDrawers** per `docs/launch/typedrawers-intro.md` Section "TypeDrawers"
- [ ] **Cross-post to r/typography** per same file Section "r/typography"
- [ ] Both link back to the HN thread (per voting-ring research)
- [ ] Continue HN comment engagement (now slower; major questions answered)
- [ ] Press follow-up: respond to journalist replies; share `/press` + `/audit` + `/compare`

### Wed–Fri Aug 5–8 — TYPECON PORTLAND
**Important context: 2026 CFP closed Apr 6; you do NOT have a main-program slot. Plan is booth + 1:1 conversations + (if confirmed) SOTA Spacebar party 5-min lightning slot.**

- [ ] In-person at TypeCon Portland conference (Jupiter Next hotel; conference at the convention center per `typecon-portland-2026.md`)
- [ ] **If Spacebar lightning slot confirmed:** demo the citation engine + vision experiment results (5 min, ~3 slides)
- [ ] Hand out printed press-kit cards at booth
- [ ] **Top-5 conversations to seek out (per `typecon-outreach-emails.md`):**
  - Dave Crossland (Google Fonts) — could be at sponsor booth
  - Glenda Bellarosa — find at Type Crit Wednesday
  - Lizy Gershenzon + Travis Kochel (Future Fonts) — Future Fonts booth
  - Christopher Slye (SOTA board) — opening sessions
  - Neil Summerour (Positype booth)
- [ ] Post photos / live-blog moments to socials (drives Show HN return traffic)
- [ ] Type Crit attendance Wednesday (Glenda runs Font Bakery there — closest technical adjacency)
- [ ] Friday evening: SOTA Spacebar party (Monotype-sponsored)
- [ ] Saturday closing dinner: foundry director conversations

### Sat–Sun Aug 9–10 — POST-LAUNCH
- [ ] HN/TD/r/typography metric recap in handoff doc
- [ ] First-week analytics review (waitlist sign-ups, /audit traffic, /compare conversions to repo)
- [ ] First press articles tracking
- [ ] Follow-up to non-responding Tier-1 journalists per `press-contacts.md` T+7

---

## Critical paths — what NOT to skip

These are the load-bearing items. Skip these and the launch arc breaks:

1. **Vercel OSS submission by Wed Jun 3** — without it, no platform credit ramp during launch traffic surge. **You.**
2. **Demo GIF first cut by Jun 14** — without it, Show HN performs at 30-50% of potential reach. **You.**
3. **Real-device QA pass before launch** — without it, mobile bugs surface live in front of HN traffic. **You.**
4. **NLnet submission by Jul 31** — without it, the only cash grant gets deferred to Oct cycle (post-launch, weaker leverage). **You.**
5. **Tue Aug 4 Show HN submission** — fixed window; missing it costs the launch. **You.**

Everything else has fallback paths. These five do not.

---

## Risk mitigations

| Risk | Mitigation |
|---|---|
| Vercel OSS rejected | Apply Cloudflare Pages free-tier as backup deploy at `cf.patens.design`. |
| Demo GIF doesn't ship | Ship with a high-quality static screenshot + screen recording link in README; lower Show HN performance but still works. |
| Real-device QA finds blocker bugs | Defer to post-launch IF the bugs don't affect Show HN landing path (home page → /audit → waitlist signup); ship with known issues if needed. |
| NLnet rejected at Aug cycle | Re-target Oct 1 cycle with launch traction; explicit "rejection feedback" follow-up. |
| Show HN flops | Cross-posts to TypeDrawers + r/typography still go T+24h; longer-tail discovery. The press outreach is independent. |
| TypeCon presentation slot doesn't materialize | Booth presence + 1:1 conversations still produce signal. |
| Citation engine MVP slips | Demo with the 3-source partial corpus; full 10-source post-launch. The research files alone are TypeCon-worthy material. |

---

## Tracking + post-launch

Each submission and milestone logs to `docs/launch/handoff-{YYYY-MM-DD}.md`:
- Timestamp
- Reference ID / URL
- Expected response window
- Cohort metrics (visitors, waitlist signups, repo stars, /audit pageviews)

Week 11+ (post-launch): weekly review of handoff entries to drive prioritization.

---

## Single sentence summary

**Submit Vercel by Wed Jun 3. Demo GIF by Jun 14. Real-device QA by Jun 21. NLnet by Jul 31. Show HN Tue Aug 4 at 5–8 AM PT. TypeCon Portland Aug 6–8. Everything else is in `docs/launch/`.**
