# Maintainers

Patens is a **solo-maintainer project**. This file is the pre-commit
to a sustainable posture — the bus-factor risk is real (the 2026
industry average is a ~36% chance per year of losing a solo
maintainer to burnout or job change), and being honest about scope
+ cadence is the only defense.

---

## Current maintainer

**Alejandro Vizio**
- GitHub: [@alevizio](https://github.com/alevizio)
- X / Bluesky: [@patenstype](https://x.com/patenstype) · [@patens.design](https://bsky.app/profile/patens.design)
- Email: hi@patens.design (general) · security@patens.design (security)
- Time zone: typically responsive in US Eastern business hours

---

## Response SLA — what to expect

This is what I'll aim for, calibrated to be sustainable on top of the
day job.

| You sent | I'll respond by |
|---|---|
| **First-time-contributor PR** | 72 hours (the dropout point in PR-conversion data) |
| Repeat-contributor PR | 1 week |
| Bug report (issue) | 1 week (faster if it's a regression you can repro) |
| Feature request (issue) | 2 weeks (or "out of scope" / "added to roadmap" in 1 week) |
| Security report (security@) | 48 hours, then triage within 7 days — see `SECURITY.md` |
| Question (Discussion) | Best-effort, 1–2 weeks |

If I'm at a conference, on vacation, or in a deep-work block, I'll
say so in a pinned issue. Don't read silence as rudeness — read it as
solo-maintainer reality.

---

## Triage cadence

I aim to clear the inbox **once a week**, typically Monday mornings.
Triage means: label, route to milestone, ask clarifying questions,
or close with a polite explanation. It does not mean every issue gets
fixed in that pass — many will sit in `help wanted` or `good first
issue` for a contributor to pick up.

---

## What's in scope

Things I will personally work on or actively review:

- The core editor (drawing, contour editing, audit, kerning, export).
- The 94-code audit module — both new codes and the per-code teaching surfaces.
- Type designer workflow polish (anything in the `enhancement / editor` label).
- Multi-script support: Latin, Cyrillic, Greek as already shipped; extending coverage.
- Variable-font workflow + the 2D variation explorer.
- Cloud share + the versioning contract.
- Accessibility (WCAG 2.0 + 2.1 + 2.2 A/AA — the bar I've held).
- Performance regressions (the audit-worker arc + IDB batching baseline).
- SEO / AIO foundation (the JSON-LD + llms.txt machinery already shipped).

---

## What's out of scope

Things I won't merge or maintain, even from a good PR. Listed so we
don't burn each other's time:

- **Mobile editor.** Desktop-first by design.
- **Real-time collaboration.** Single-designer-single-machine positioning.
- **Required-account flows.** Patens is account-free; OAuth is opt-in for self-hosters.
- **Paywalled editor features.** MIT core stays free forever.
- **Server-side font hosting.** Fonts you draw are yours; no Patens-hosted serving tier.
- **PWA push notifications.** No notification story makes sense for a creative tool.
- **Replacing the SvelteKit framework.** Patens is a SvelteKit 2 + Svelte 5 codebase.
- **Switching the license away from MIT.** The license is a commitment, not a configuration.
- **AI features that aren't opt-in.** Anthropic API integration requires the user's own key.
- **Renaming the storage identifiers** (`font-studio-*`) — that would orphan every existing user's data.

If your contribution is in one of these zones, please open an issue
*before* coding. I'll explain the reasoning, and we can find an
adjacent path that fits.

---

## Decision-making

For now: I'm the single decision-maker. This is unhealthy in the
abstract (bus factor of 1) but realistic for a v1.x project. The
explicit plan is:

1. **v1.x**: I make all calls. Document decisions in commit messages
   + `ROADMAP.md` + `docs/decisions/*.md` so a future maintainer
   inherits context, not folklore.
2. **v2.0 onward**: if active external contributors emerge (define:
   3+ merged PRs over 6+ months from someone who isn't me), invite
   them as co-maintainers with merge rights.
3. **Eventually**: a `STEERING.md` if we ever need a council. Not now.

Until then: this is a [BDFL](https://en.wikipedia.org/wiki/Benevolent_dictator_for_life)-shaped
project run with a permissive license. If you don't like a decision,
the recourse is fork — that's MIT working as intended.

---

## What I won't do, ever

- **Run a Discord server alone.** I'd burn out moderating. GitHub
  Discussions is the canonical community surface; if/when a Discord
  arrives, it needs a co-moderator first.
- **Accept paid feature priority above 20% of roadmap.** When the
  funding model stabilizes (Sponsors + Polar + grants), the cap is
  set in `FUNDING.md`.
- **Sign a CLA.** DCO (`Signed-off-by:`) is the contributor
  attribution mechanism. CLAs read corporate; we're not.
- **Strip `Co-Authored-By:` trailers from AI-assisted commits.**
  The Linux Foundation Agentic AI Foundation's 2026 norm is
  preservation; I follow it.

---

## Releases

Tagged releases at least monthly during active development. Release
notes go in GitHub Releases + mirrored to `CHANGELOG.md`. Format:

```
## v1.5.x — short headline

### Highlights
- Bullets a designer would care about

### Under the hood
- Bullets a developer would care about

### Bug fixes
- Bullets a bug-affected user would search for
```

---

## Burnout firebreak

Pre-committed escape-valves so I don't blow up at a stressful moment:

- **Hard weekly cap**: 12 hours of Patens work outside the day job.
  When I hit the cap, I stop. The codebase will still be here next
  Monday.
- **Pinned issue if I'll be slow**: I'll post one to the issues list
  if I expect a 2+ week gap. Don't read silence as anger.
- **The "I can't" prerogative**: I reserve the right to say "I can't
  ship this" to any specific request, even a polite one, without an
  essay-length defense. The roadmap is a guide, not a contract.
- **Forking is fine**: Patens is MIT. If you need it to do something
  I won't ship, fork it and run with the new ideas. That's how
  open source is supposed to work.

---

## How to be helpful

Ranked by what actually moves the needle for a solo maintainer:

1. **Open issues with clear repro + screenshots.** Saves me 80% of the
   triage work.
2. **PR a `good first issue` after reading `DESIGN_PHILOSOPHY.md` +
   `ARCHITECTURE.md`.** Shows you've done the homework.
3. **Star the repo.** Trivial cost, real impact on GitHub Trending +
   downstream discoverability.
4. **Sponsor on GitHub Sponsors** (link in `FUNDING.yml`). Even $5/mo
   is meaningful; the median active sponsor count for a 500-star
   project is ~3 in 2026.
5. **Tell one type designer about Patens.** Word-of-mouth in the type
   community is how this thing breaks past the dev-tool ceiling.

I'll never ask for stars or sponsors as a condition of anything.

---

Last updated: 2026-05-25.
