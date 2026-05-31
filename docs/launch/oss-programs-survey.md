# Open Source Programs — survey for Patens

**Date:** 2026-05-30 · **Launch target:** TypeCon Portland, Aug 6–8, 2026 (~10 weeks).
**Status:** Research-only. Each row is a program Patens could plausibly apply to, with deadline, award, and a one-line fit assessment.

The goal is to convert the ~10-week runway into the smallest set of applications that pay back the most — runway (hosting, model API, storage), money (cash grants), and credibility (badges + maintainer-fellowship status).

---

## TL;DR — apply this week

**Plan as of 2026-05-30:** Submit Vercel only this week (deadline
Wed Jun 3). NLnet is **skipped for the Jun 1 cycle** and re-targeted
at the **Aug 1, 2026 cycle** — that one overlaps TypeCon week and lets
the application lead with real launch data rather than a pre-launch
ask.

**All Tier-2 applications now have paste-ready drafts:**
- `docs/launch/anthropic-application.md` — Startup + Research Credits combined ($50K target)
- `docs/launch/github-secure-oss-application.md` — $10K + structured hardening sprint
- `docs/launch/futo-microgrant-application.md` — $5K cash
- `docs/launch/mozilla-moss-application.md` — $25K–$50K cash

See **§ Submission readiness checklist** at the bottom for the day-of action list.

| # | Program | Deadline | Award | Status |
|---|---|---|---|---|
| 1 | [Vercel OSS Program](https://vercel.com/open-source-program) | **2026-06-03** (Wed) | $3,600 platform credits / 12 mo + OSS Starter Pack + priority support | Application copy drafted at `docs/launch/vercel-oss-application.md` — needs link sweep + submit |
| 2 | [NLnet NGI Zero Commons Fund](https://nlnet.nl/commonsfund/) | ~~2026-06-01~~ → **2026-08-01** (deferred) | €5K – €50K cash grant, scalable per scope | Application template at `docs/launch/nlnet-application.md` — re-target for Aug cycle with launch traction folded in |

After Vercel, the next cluster (1–3 weeks out) is **AI credits + funding-platform setup** so the editor's AI presets and the maintainer-funding rail are live by launch.

---

## Tier 1 — Apply this week (urgent)

### 1. Vercel OSS Program — $3,600 in platform credits — **DEADLINE JUNE 3**

- **URL:** [vercel.com/open-source-program](https://vercel.com/open-source-program)
- **What it is:** Spring 2026 cohort. $3,600 Vercel credits over 12 months + OSS Starter Pack + priority community support. Covers Production + Preview deploys, Vercel Blob, Edge Functions for OG cards.
- **Eligibility:** MIT/Apache/BSD/similar permissive license, public repo, active development, CoC + SECURITY.md — Patens checks all boxes.
- **Fit:** **High.** The entire stack already runs on Vercel; credits absorb the ramp from private alpha to TypeCon launch week without forcing a pricing decision before the launch is over.
- **Move:** Open `docs/launch/vercel-oss-application.md`, paste copy into the form, submit.

### 2. NLnet NGI Zero Commons Fund — €5K – €50K — *deferred to Aug 1, 2026 cycle*

- **URL:** [nlnet.nl/commonsfund](https://nlnet.nl/commonsfund/)
- **Why deferred:** The Jun 1, 2026 cycle conflicts with launch prep + a pre-launch application has weaker traction signal. The Aug 1, 2026 cycle overlaps TypeCon Portland week and lets the application lead with real launch data + early-user feedback.
- **What it is:** EU-funded €21.6M pool through 2027 for open-source digital commons. Individual grants are scoped per project — €5K (small focused work package) to €50K (multi-stage R&D). Patens fits "open digital commons" cleanly: MIT, browser-native, no lock-in, accessible PWA, audit pedagogy as public good.
- **Eligibility:** Open source, public benefit, EU-aligned (Patens qualifies; not residency-gated — NLnet funds globally).
- **Fit:** **High at Aug cycle.** Cash grant + EU credibility + the timing lets the application cite specific cohort metrics from launch.
- **Move:** Re-open `docs/launch/nlnet-application.md` in mid-July, fold in launch-week data + first-cohort feedback, submit by 2026-07-31 EOD.

---

## Tier 2 — Apply within 2 weeks (high-leverage, no hard deadline)

### 3. Anthropic Startup Credits — $25K – $100K+

- **URL:** [anthropic.com/startups](https://www.anthropic.com/startups) — credits program for early-stage builders. Note: this is the *startup* program; the *research* program below is separate and stackable.
- **What it provides:** Claude API credits used to power the audit explanations, AI-assisted kerning suggestions, consistency checks. Patens already requires a user-provided key, so credits would fund a built-in shared key tier for the published demo.
- **Eligibility:** Building with Claude, pre-Series A or self-funded. No VC requirement.
- **Fit:** **High.** The editor's AI presets currently degrade to "bring your own key" — credits unlock a frictionless first experience.

### 4. Anthropic Research Credits — $500 – $25K

- **URL:** Apply via the same startup program portal (separate research track).
- **What it provides:** Smaller credit grants for research, education, and pedagogy-focused projects. The audit-as-teaching angle is *literally* a pedagogy claim — this is the most natural fit Patens has.
- **Fit:** **High** specifically because the application can lead with "the audit module is a teaching surface; we want to study how AI explanations of type-design rules compare to deterministic prose." That's a research framing the Anthropic team explicitly wants.

### 5. OpenAI Codex Open Source Fund — $25K

- **URL:** Codex-branded OSS fund (rolling cohorts, ~$25K per project for OSS maintainers using OpenAI APIs for dev tooling).
- **What it provides:** API credits + maintainer-of-record badge.
- **Fit:** **Medium.** Only relevant if Patens adds an OpenAI-backed alternative to the Claude integration. Worth a stub application even if not actively used — establishes a relationship for later. Apply only after Anthropic, since they're the primary integration.

### 6. DigitalOcean Open Source Sponsorships — 12-month credits

- **URL:** [digitalocean.com/open-source](https://www.digitalocean.com/open-source)
- **What it provides:** 12 months of platform credits (covers droplets, spaces, managed Postgres). Useful for the future cloud-share blob + the upcoming `patens.design/share/[id]` shared-link backend.
- **Eligibility:** Public repo, active dev, MIT-compatible license.
- **Fit:** **Medium.** Patens is Vercel-native, so DO is *redundant* unless we add a long-running service (audit CLI as managed worker, share-link backend with PostgreSQL persistence). Apply only if there's a concrete plan.

### 7. GitHub Secure Open Source Fund — $10K + dedicated security time

- **URL:** [github.com/security/secure-open-source-fund](https://github.com/security/secure-open-source-fund) (search GitHub blog for current cohort URL)
- **What it provides:** $10K to maintainers + a structured security-hardening sprint (Scorecard, SAST, dep review, supply chain). Patens already runs OpenSSF Scorecard but a sponsored hardening pass = lower CVE risk before launch traffic arrives.
- **Eligibility:** Critical OSS (interpreted loosely — solo maintainers + niche tools with active use have been accepted).
- **Fit:** **Medium-high.** $10K + a security badge that font foundries who lint client deliverables in CI will recognize as load-bearing. Apply as soon as the public launch is announced.

### 8. Mozilla Open Source Support (MOSS) — variable grants

- **URL:** [mozilla.org/moss](https://www.mozilla.org/en-US/moss/)
- **What it provides:** Cash grants to projects that advance the open web. Patens advances the open web on multiple axes: browser-native (no native install needed), client-side compute (privacy-by-default), accessible (axe-core enforced).
- **Eligibility:** Open web alignment, public benefit, OSS license.
- **Fit:** **Medium.** Application is involved but the privacy-by-default angle is strong (no telemetry, no server roundtrip for font data, PWA offline).

---

## Tier 3 — Set up before launch (funding platforms, not grants)

These are *donation rails*, not grant programs. Set them up before Show HN so people who like the tool have a fast path to support it without you needing to chase them.

### 9. GitHub Sponsors — already linked in README badge

- **URL:** [github.com/sponsors/alevizio](https://github.com/sponsors/alevizio)
- **Setup time:** 30 min (already partially set up — confirm tiers + welcome message).
- **Fit:** **Required.** The Show HN comment "Pricing model?" already has a draft response pointing here. Tiers should be simple: $5/mo (a coffee), $20/mo (a font lover), $100/mo (a foundry).

### 10. Open Collective — fiscal hosting

- **URL:** [opencollective.com](https://opencollective.com)
- **Setup time:** 1–2 hours.
- **What it provides:** Transparent budget, fiscal sponsorship for corporate sponsorships that GitHub Sponsors can't accept, expense tracking for refundable receipts (hosting, conference attendance).
- **Fit:** **Optional.** Worth setting up if any foundry contacts you wanting to sponsor via PO/invoice — that path doesn't exist on GitHub Sponsors. Skip if you're solo and don't want bookkeeping.

### 11. Polar.sh — sponsorship + paid-issue layer

- **URL:** [polar.sh](https://polar.sh)
- **What it provides:** Bountied issues, recurring sponsorship, monetization for premium features without forking the MIT codebase. Could be the right surface for "font foundries pay $X/mo for a private-issue lane on the audit codes."
- **Fit:** **Optional.** Watch how Polar evolves through Q3 2026 before committing.

### 12. thanks.dev — donation routing

- **URL:** [thanks.dev](https://thanks.dev)
- **What it provides:** Routes a portion of corporate budgets to dependency maintainers. Patens uses opentype.js, Pyodide, Satori — each upstream gets a slice. Useful as a *consumer* (Patens routes some of its grant money downstream) more than as a beneficiary (the audit module is too niche to attract corporate dep-budgets).
- **Fit:** **Low (as recipient), medium (as good citizen).** Skip for now.

---

## Tier 4 — Out of scope or wait

### 13. Sovereign Tech Fund (Germany) — €50K minimum

- **URL:** [sovereign.tech/programs/fund](https://www.sovereign.tech/programs/fund)
- **Deadline:** **2026-05-19 (passed for 2026)**. Next round Q3 or Q4.
- **What it provides:** Funding for "open digital base technologies." Patens is borderline — it's a *tool* on top of the open web, not a *base technology*. opentype.js or HarfBuzz would be a more natural fit.
- **Fit:** **Low.** Skip the 2026 round. Re-evaluate when the EU-STF (proposed) materializes — Patens could plausibly fit the *teaching/audit infrastructure* angle there.

### 14. Sovereign Tech Fellowship (Maintainer-in-Residence) — stipend

- **URL:** [sovereign.tech/programs/fellowship](https://www.sovereign.tech/programs/fellowship)
- **What it provides:** Sustained financial support for individual maintainers of critical codebases. Looks more like a salary than a grant.
- **Fit:** **Low (today), medium (post-launch).** Patens isn't yet "critical infrastructure" — apply after 12+ months of user data + cited use by foundries.

### 15. FUTO Microgrants — $1K – $5K

- **URL:** [futo.tech/grants](https://futo.tech/grants)
- **What it provides:** Small cash grants for early-stage OSS projects. Light application, fast turnaround.
- **Fit:** **Medium.** Easy win for $1K–$5K. The selection criteria lean toward privacy + anti-surveillance + user freedom — the "nothing leaves the browser" + IndexedDB-local + no-telemetry positioning of Patens lines up cleanly.

### 16. FLOSS/fund (Zerodha) — $1M annual pool

- **URL:** [floss.fund](https://floss.fund) (Zerodha-backed)
- **What it provides:** Annual grants from a $1M pool, primarily to FOSS in India + global commons.
- **Fit:** **Low** — biased toward India-based projects + commercial OSS that's a clear infrastructure dependency.

### 17. Cloudflare Pages — unlimited bandwidth, 500 builds/mo

- **URL:** [pages.cloudflare.com](https://pages.cloudflare.com)
- **What it provides:** Not a grant — a free tier so generous it functions like one. Useful as a *fallback host* (deploy a mirror at `cf.patens.design`) for the public marketing surface if Vercel ever throttles or for redundancy on launch day.
- **Fit:** **Setup-only.** Worth a 30-min mirror config; don't apply, just deploy.

### 18. Netlify Open Source Plan — credits/month

- **URL:** [netlify.com/legal/open-source-policy](https://www.netlify.com/legal/open-source-policy)
- **What it provides:** ~300 build minutes/month free for OSS (new model). Patens deploys faster than this allows once preview deploys ramp up.
- **Fit:** **Low.** Skip.

### 19. Linux Foundation LFX Mentorship — stipend for mentees

- **URL:** [mentorship.lfx.linuxfoundation.org](https://mentorship.lfx.linuxfoundation.org/)
- **What it provides:** 12-week full-time or 24-week part-time mentorship + stipend. For *mentees joining a project*, not for the project maintainer.
- **Fit:** **Medium (for Patens-as-mentoring-org), low (for Alejandro).** Worth registering Patens as a hosting project for the next round if there's a Patens issue an LFX mentee could own (e.g., the pluggable audit-rule API). Otherwise skip.

### 20. EU Sovereign Tech Fund (EU-STF) — proposed, not yet active

- **URL:** [eu-stf.openforumeurope.org](https://eu-stf.openforumeurope.org/)
- **Status:** Proposed for the 2028–2034 EU budget. Currently in advocacy phase, not accepting applications.
- **Fit:** **Watch.** If launched, Patens would fit the "open digital infrastructure with public-good pedagogy" framing well. Bookmark.

---

## Synthesis — sequenced action plan

### This week (urgent, ~3 hours of work)
1. **Mon–Tue:** Polish `docs/launch/vercel-oss-application.md`, submit by Wednesday EOD (deadline June 3).
2. *(NLnet deferred to Aug 1 cycle — re-open mid-July with launch data folded in.)*

### Next 2 weeks
3. Apply to **Anthropic Startup Credits + Research Credits** (single coordinated pitch, lead with audit-as-pedagogy + Claude-powered explanations).
4. Apply to **GitHub Secure Open Source Fund** — frame as "pre-launch hardening for a foundry-trusted CI tool."
5. Apply to **FUTO Microgrants** — fast, $1K–$5K, low-friction.

### Pre-launch setup (no application needed)
6. Verify **GitHub Sponsors** tiers + welcome message.
7. Set up a **Cloudflare Pages** mirror at `cf.patens.design` as redundancy for launch day.
8. Decide on **Open Collective** — only if you want a PO/invoice rail for foundry sponsorships.

### Post-launch (90+ days)
9. Reapply to **Sovereign Tech Fund** for Q3/Q4 2026 round.
10. Watch **EU-STF** advocacy status.
11. Consider Patens as a hosting project for **LFX Mentorship** if there's a discrete issue a mentee could own.

### Expected stack if all Tier 1+2 land
- $25K – $100K+ Anthropic credits (model API)
- $25K Anthropic Research credits (audit-as-pedagogy)
- $25K OpenAI Codex (optional alt model integration)
- €5K – €50K NLnet cash (general operations + dedicated work packages)
- $10K GitHub Secure (security hardening)
- $3,600 Vercel credits (hosting through year-1)
- $5K FUTO (cash)
- 12 months DigitalOcean credits (backup hosting if needed)
- + GitHub Sponsors recurring (variable)

That's enough runway to take Patens from TypeCon launch through end-of-year-1 *without* needing to introduce a paywall, validate the audit-as-teaching positioning with real users, and decide a sustainable monetization model from a position of strength — exactly the foundry-of-one position the README claims.

---

## Submission readiness checklist

All Tier-1 + Tier-2 applications are drafted. The submission-day workflow:

### Tier 1 (this week — Wed Jun 3 deadline)
- [ ] **Vercel OSS** — open `docs/launch/vercel-oss-application.md`, paste copy into [vercel.com/open-source-program](https://vercel.com/open-source-program) form, submit. **~1 hour total.**

### Tier 2 (apply within 2 weeks — no hard deadline)
- [ ] **Anthropic combined** — open `docs/launch/anthropic-application.md`. Two submissions: [Anthropic for Startups](https://www.anthropic.com/startups) + Anthropic Research Credits (apply via startup portal, mention research track in cover note). ~45 min total.
- [ ] **GitHub Secure Open Source Fund** — open `docs/launch/github-secure-oss-application.md`. Apply at [github.com/security/secure-open-source-fund](https://github.com/security/secure-open-source-fund). ~30 min.
- [ ] **FUTO microgrant** — open `docs/launch/futo-microgrant-application.md`. Apply at [futo.tech/grants](https://futo.tech/grants). ~20 min.
- [ ] **Mozilla MOSS** — open `docs/launch/mozilla-moss-application.md`. Apply at [mozilla.org/moss](https://www.mozilla.org/en-US/moss/). ~40 min.

### Tier 3 (deferred to Aug 1, 2026 — strategic timing)
- [ ] **NLnet NGI Zero Commons** — `docs/launch/nlnet-application.md` ready. Re-open mid-July, fold in launch traction data, submit by 2026-07-31 EOD.

### Tier 4 (no-application — set up the rails)
- [ ] **GitHub Sponsors** — verify tiers + welcome message (already partially set up). ~30 min.
- [ ] **Open Collective** — only if you want a PO/invoice rail for foundry sponsorships. ~1-2 hours.
- [ ] **Polar.sh** — watch through Q3 2026; commit later.
- [ ] **Cloudflare Pages mirror** — 30-min deploy of marketing site at `cf.patens.design` as launch-day redundancy.

### Total submission time investment
Tier 1: 1 hour
Tier 2: 2.5 hours
Tier 3 (mid-July): 1 hour refresh + 1 hour submit
Tier 4: 1-3 hours optional

**~5–6 hours of your time over the next 9 weeks unlocks up to ~$50K–$150K in mixed credits + cash.**

### After each submission
- Save the submission timestamp + reference ID in `docs/launch/handoff-{date}.md`
- Note expected response window
- Set a calendar reminder for the response window + 7 days

---

## Sources

- [Vercel Open Source Program](https://vercel.com/open-source-program) — official program page
- [NLnet Commons Fund](https://nlnet.nl/commonsfund/) — official call page (€21.6M through 2027)
- [DigitalOcean Open Source Sponsorships](https://www.digitalocean.com/open-source) — official program
- [Anthropic for Startups](https://www.anthropic.com/startups) — startup credits program
- [OpenAI Codex Open Source Fund](https://openai.com) — search "Codex OSS Fund" for current cohort
- [GitHub Secure Open Source Fund](https://github.com/security/secure-open-source-fund) — see GitHub blog announcement
- [Mozilla Open Source Support (MOSS)](https://www.mozilla.org/en-US/moss/) — grants program
- [Sovereign Tech Fund](https://www.sovereign.tech/programs/fund) — Germany, BMWi-backed
- [Sovereign Tech Fellowship](https://www.sovereign.tech/programs/fellowship) — Maintainer-in-Residence
- [FUTO Grants](https://futo.tech/grants) — microgrants $1K–$5K + larger grants
- [FLOSS/fund (Zerodha)](https://floss.fund) — $1M annual pool
- [GitHub Sponsors](https://github.com/sponsors) — recurring donation platform
- [Open Collective](https://opencollective.com) — fiscal hosting
- [Polar.sh](https://polar.sh) — sponsorship + paid-issue layer
- [thanks.dev](https://thanks.dev) — donation routing for dependencies
- [Cloudflare Pages](https://pages.cloudflare.com) — unlimited bandwidth free tier
- [Netlify Open Source Plan](https://www.netlify.com/legal/open-source-policy) — build minutes
- [Linux Foundation LFX Mentorship](https://mentorship.lfx.linuxfoundation.org/) — mentee stipend
- [EU Sovereign Tech Fund (proposed)](https://eu-stf.openforumeurope.org/) — advocacy phase
