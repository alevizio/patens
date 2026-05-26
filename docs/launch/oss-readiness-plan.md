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
| 18 | **Flip the GitHub repo from private → public** + enable Code Scanning at github.com/alevizio/patens/settings/security_analysis. Unblocks codeql + scorecard + dependency-review (currently bridged with `continue-on-error: true`). Once flipped, remove the bridge lines from the three workflow files in a single follow-up commit. | T-7 days before launch (announce-ready, no longer in-progress) | 5 minutes |
| 19 | Show HN — Tue/Wed Aug 5–6, 8:30 AM ET | Launch week | Half a day to reply |
| 20 | Cross-post: Bluesky thread → Mastodon → dev.to → r/sveltejs (organic only) | Launch day | 2h authored, all day on replies |
| 21 | TypeCon Portland Aug 6–8 — physically be there | Launch week | The trip |
| 22 | Awesome-list PRs (drafts at `docs/launch/awesome-prs.md`) | Launch day | 30m of clicking |
| 23 | First-week issue triage + PR review | Launch week | 8–12h |

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

## ✅ Update — Tier 1 + Tier 2 shipped (2026-05-25)

All 13 picks landed. Commits this arc:

**Tier 1 — 8 repo additions:**

- `5bf5375` docs: AGENTS.md — Linux Foundation cross-tool standard
- `9b7105c` docs: MAINTAINERS.md — solo-maintainer SLA + burnout firebreak
- `92ed0b7` docs: DESIGN_PHILOSOPHY.md — referenced from PR template
- `107a9b9` chore(oss): devcontainer + PR/feature templates + SBOM CI + README badges
- `d244341` docs: ARCHITECTURE.md — six-layer map, core flows, SSR posture
- (templates updated in `107a9b9`; SBOM via cdxgen step added; 6 badges live)

**Tier 2 — 5 paste-ready prep docs (this commit):**

- `docs/launch/nlnet-application.md` — NLnet NGI Zero Commons (~€20k, rolling deadline)
- `docs/launch/openssf-best-practices.md` — Passing-tier self-cert question-by-question
- `docs/launch/trademark.md` — USPTO class 9 self-file walkthrough (~$250)
- `docs/launch/sponsors-profile.md` — GitHub Sponsors bio + 3-tier structure + FUNDING.yml
- `docs/launch/polar-setup.md` — Polar account, 5 products, issue-funding wiring

**Verification**: svelte-check 0 errors, eslint 0 warnings (gate at 0), vitest 506 tests passing, playwright 66 e2e passing.

The remaining items in the plan above are all Tier 3 (you-only): file
the USPTO trademark, set up Sponsors + Polar accounts, submit NLnet,
run the Show HN launch, attend TypeCon Portland. Each is documented
to paste-ready depth in the corresponding `docs/launch/*.md` file.

---

## ✅ Update — Maintainer-experience polish arc (2026-05-26)

A second autonomous arc landed nine more OSS-readiness items the
research pass had on the wishlist. All shipped, all gates green.

**Commits (9):**

- `94ec8f6` feat(cli): `npx patens audit` — terminal audit engine. Single bundled ESM via esbuild, 3 output formats (text / json / github), exit code 2 on any errors. Lets the audit module reach CI pipelines + pre-commit hooks without booting the editor.
- `de9d451` perf(home): lazy-load Pyodide off the home-page eager chain. UFO import now dynamic-imports `$lib/font/python` on first use, so first-visit home no longer ships the Python runtime in the preload graph.
- `c6084d5` docs(adr): 10 Architecture Decision Records under `docs/decisions/` (Nygard format). Locks in the load-bearing decisions — browser-native, MIT-forever, SSR-at-root, audit worker, share-as-capability, storage namespace stays `font-studio-*`, BYOK AI, strict quality gates, demo open-by-default.
- `27367f1` docs: TypeDoc setup. `pnpm run docs:api` generates HTML reference for the audit / export / family-kerning / kerning-classes / path / font-machinery surfaces. Output gitignored.
- `7f80be8` a11y(home): wrap home content in `<main>` landmark. Closes the Lighthouse 98→100 a11y gap (axe `landmark-one-main`). Drag-drop handlers unchanged.
- `16a9552` test(bench): two new perf-regression guards — `buildFont` (50/162/500 glyphs: 2.4ms / 19ms / 126ms) and `expandKerningClasses` (small/medium/large: 0.08ms / 1.1ms / 19ms).
- `ad06f1d` docs: `docs/release-process.md` (solo-maintainer playbook) + CONTRIBUTING cross-links to DESIGN_PHILOSOPHY, ADRs, MAINTAINERS, AGENTS, release-process, and ADR-009 for the gates rationale.

**Verification this arc**: lint 0/0, svelte-check 0/0, vitest 528 passing across 44 files, production build 3180 KB client (under the 5120 KB cap).

**Skipped after re-evaluation**: per-tutorial OG image variants (1.5h work for unfurl polish 99% of social readers won't click through — diminishing returns).

The remaining open work is unchanged from the prior arc — all Tier 3 (you-only): USPTO trademark, Sponsors + Polar accounts, NLnet submission, Show HN launch, TypeCon Portland.
