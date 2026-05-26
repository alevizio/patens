# Open-source readiness plan — Patens 2026

Companion to `docs/launch/typecon-plan.md` + `docs/launch/app-improvements-plan.md`. This is the OSS-specific track:
the repo polish, governance, funding, and distribution moves the
research pass surfaced as worth doing before TypeCon Portland (Aug 6–8).

**Last updated**: 2026-05-25 (after the OSS research pass)
**Maintenance posture**: solo, single contributor, no co-maintainers yet

---

## Three tiers, by who acts

### Tier 1 — Ship autonomously (me, ~4 hours total)

Concrete repo additions that need no decisions from you. I can do all
8 in one pass and commit each piece individually.

| # | File | Effort | Why |
|---|---|---|---|
| 1 | `AGENTS.md` | 30m | Cross-tool AI-assistant onboarding standard. 60k+ repos adopted since Aug 2025; Linux Foundation backed. Port from existing `CLAUDE.md` content. |
| 2 | `ARCHITECTURE.md` | 1h | Synthesize the project's structural shape (routes, stores, audit pipeline, font pipeline, share contract). Patens is complex enough that contributors stall without it. Referenced from `CONTRIBUTING.md`. |
| 3 | `MAINTAINERS.md` | 30m | Solo-maintainer expectations: response SLA (72h for first PRs, 1wk for issues), triage cadence, what's in scope vs out. Pre-commits to a no-burnout posture. |
| 4 | `DESIGN_PHILOSOPHY.md` | 30m | The "why" behind Patens — teaching-first, audit-as-citizen, no AI-led marketing, never paywall the editor. Referenced from PR template. Filters drive-by PRs in advance. |
| 5 | `.devcontainer/devcontainer.json` | 30m | Codespaces + VS Code dev-container support. Removes Node-version + pnpm-version friction for first-time contributors. Free for casual contribution. |
| 6 | SBOM via CycloneDX in CI | 20m | EU CRA mandates SBOMs for commercial products Dec 2027; non-commercial exempt but ~10min of work future-proofs. Add `cdxgen` step to `.github/workflows/ci.yml`. |
| 7 | Tighten `.github/ISSUE_TEMPLATE/` + `PULL_REQUEST_TEMPLATE.md` | 30m | Add AI-disclosure checkbox, screenshot requirement on UI PRs, "references DESIGN_PHILOSOPHY.md principle" line. |
| 8 | README badge polish | 20m | Cap at 6–8 meaningful badges. Drop "made with love" decoration; add CI status, license, version, Node, Bluesky, GitHub Sponsors placeholder. |

### Tier 2 — I draft, you submit (prep documents)

These need a human signature or account, but I can write the content
so all you do is paste / sign / click.

| # | Deliverable | Effort | What I produce |
|---|---|---|---|
| 9 | NLnet NGI Zero Commons grant application draft | 1h | A `docs/launch/nlnet-application.md` with the full filled-in application body — project description, planned use of funds, milestones, governance, accessibility focus, FOSS commitment. You paste into the form. |
| 10 | OpenSSF Best Practices self-cert answers | 30m | Walk every Passing-level question, fill in answers from the codebase. Save as `docs/launch/openssf-best-practices.md`. You log in + paste. |
| 11 | Trademark filing guidance | 30m | A `docs/launch/trademark.md` with: USPTO class 9 (software) form fields prefilled, specimen requirements, recommended attorney shortlist or self-file walkthrough, $250–$350 cost breakdown. You decide self-file vs attorney + submit. |
| 12 | GitHub Sponsors profile copy + tiers | 20m | Draft `FUNDING.yml` + the Sponsors profile text (about, tiers, what each tier gets). You paste into the GitHub Sponsors onboarding. |
| 13 | Polar setup checklist + creator profile copy | 20m | What products to list (sticker packs, "founding supporter," consulting hour, custom-axis design), what VAT settings to flip. You create the account. |

### Tier 3 — You only (irreducibly human)

No way around these. Listed so the picture's complete.

| # | Action | When | Effort |
|---|---|---|---|
| 14 | File USPTO trademark for "Patens" word mark, class 9 | Pre-launch ideal | ~1h + $250–350 |
| 15 | Open GitHub Sponsors profile (apply, get approved, paste copy) | Pre-launch | 30m + 1–2wk wait |
| 16 | Open Polar creator account, configure payouts | Pre-launch | 1h |
| 17 | Submit NLnet application (next deadline rolling, every 2 months) | Q3 2026 | 30m + waiting period |
| 18 | Show HN — Tue/Wed Aug 5–6, 8:30 AM ET | Launch week | Half a day to reply |
| 19 | Cross-post: Bluesky thread → Mastodon → dev.to → r/sveltejs (organic only) | Launch day | 2h authored, all day on replies |
| 20 | TypeCon Portland Aug 6–8 — physically be there | Launch week | The trip |
| 21 | Awesome-list PRs (drafts at `docs/launch/awesome-prs.md`) | Launch day | 30m of clicking |
| 22 | First-week issue triage + PR review | Launch week | 8–12h |

---

## Sequencing

```
Week of May 26 (now)
├── Tier 1 (autonomous, 8 items) — I ship in one arc
│   └── Push triggers Vercel deploy; IndexNow re-pings
└── Tier 2 (drafts) — I write the 5 prep docs

Week of June 2
├── You — file USPTO trademark
├── You — apply to GitHub Sponsors + Polar (run parallel; both take ~1wk approval)
└── You — review Tier 2 drafts, edit voice as needed

Weeks of June 9–23
├── You — submit NLnet application (next rolling deadline check)
├── You — Sponsors profile goes live, FUNDING.yml committed
└── Continue P0/P1 launch work from app-improvements-plan.md

Week of July 27 — pre-launch polish
├── You — final OpenSSF Best Practices self-cert submission
└── You — sticker print order (for TypeCon)

Aug 4–8 — launch week
├── Tue Aug 4, 8:30 AM ET: Show HN
├── Within 4h: Bluesky/Mastodon/X threads
├── Within 24h: dev.to long-form
├── Within 48h: 3 awesome-list PRs
└── Aug 6–8: TypeCon Portland in person
```

---

## Deliberately deferred until 500+ stars

- Discord / Slack community (silo trap before that scale)
- Stale-bot (reads as hostile at small scale in 2026)
- Apache 2.0 relicensing conversation
- Sponsored-feature policy (only after the funding pipe is real)
- Open Collective fiscal hosting (multi-team optimized; not solo)
- Trademark licensing program (no one's forked yet)
- Translations / i18n (v2 work)

---

## What this plan deliberately does not include

- **CLA** — DCO is the 2026 default for solo maintainers; CLAs signal corporate aspirations and scare contributors.
- **Discord** — premature for a 50-star project; commits you to a moderation tax you can't afford solo.
- **"AI training prohibited" license clause** — unenforceable, reads as performative. Use AGENTS.md to invite *quality* AI contributions instead.
- **Stripping AI co-author trailers from PRs** — community norm in 2026 is to keep `Co-Authored-By: Claude` etc.

---

## Success metrics (6 months post-launch)

Calibrated against the 2026 solo-OSS baselines from the research. None
of these are "growth at all costs" — they're survival + healthy-cadence
signals.

- **Stars**: 500–1500 (HN front page ≈ 1000+; without HN, 200–500)
- **Non-author commits**: > 0 / month, ideally 2–5
- **Issue close rate**: > 60% (the bar to keep contributors engaged)
- **Release cadence**: at least one tagged release per month
- **Bus-factor**: still 1 — that's fine for year 1, plan to address in year 2
- **Income**: $0–$200/mo from Sponsors + Polar is realistic; NLnet grant if it lands changes the math entirely
- **CrUX field data**: editor route INP < 200 ms p75 for real users (validates the audit-worker shipped in `71f1399`)
- **No abandonment signal**: no week without a commit, no issue older than 30d without a triage response

---

## Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Maintainer burnout from issue volume after HN spike | Medium | Hard cap on weekly hours; auto-reply on issues; "see ROADMAP.md" + `good-first-issue` labels |
| Drive-by PRs that drain review hours | Medium | DESIGN_PHILOSOPHY.md gate; PR template requires "principle" line |
| Hostile fork after monetization moves | Low-medium | USPTO trademark; community lives on patens.design (your turf) |
| AI-generated PRs with subtle bugs | Medium | PR template requires test pass + manual screenshot + AI-disclosure; CI runs audit/lint/a11y on every PR |
| Sponsored-feature capture | Low (no sponsors yet) | Pre-commit to ≤20% of roadmap in `FUNDING.md` if/when sponsors arrive |
| Single-platform dependency (Vercel) | Low | Source is portable; setup.md documents Cloudflare Pages + Netlify alternatives |

---

## What I'll do if you say "ship Tier 1 + Tier 2"

In one autonomous arc, ~5 hours of my time but ~zero of yours:

1. Write all 8 Tier-1 files; commit each piece individually
2. Verify svelte-check, lint, vitest, playwright all stay green
3. Push each commit
4. Write all 5 Tier-2 drafts to `docs/launch/*.md`; commit + push
5. Refresh `docs/launch/app-improvements-plan.md` with the OSS arc closing
6. Hand back with a TL;DR + the specific actions you'll need to do
   yourself (with the prep docs ready to paste).
