# TypeCon Portland — launch plan (Aug 6–8, 2026)

Decision: 2026-05-25. Skipped ATypI Stanford (May 27–30) as too soon to ship the
remaining foundation pieces. Targeting TypeCon Portland for the launch moment
— attend in person, propose lightning talk on-site, time Show HN to the
conference week.

10 weeks of runway. See `docs/launch/master-plan.md` for the strategy framework
that this plan operationalizes against the new date.

---

## Phase 1 — Foundation (weeks 1–3, now → mid-June)

These are the artifacts a press/awesome-list/Typographica pitch will look for.
Without them, the Phase 2 outreach has nothing concrete to point at.

- [ ] `/press` page with downloadable brand bundle
      logos (light/dark, PNG + SVG), 6–12 screenshots at 2x retina,
      one-paragraph + one-page descriptions, factsheet sidebar (license,
      version, maintainer, contact), founder photo, MIT badge
- [ ] `/llms-full.txt` — concat of `/learn/*` + `/compare` + `/help` + `/about`
      (Cursor / Claude Desktop / ChatGPT crawl this more than llms.txt as of
      May 2026 — see Otterly + getmint.ai sources in master-plan.md)
- [ ] Year-in-title pass — "2026" in `<title>` and H1 across landing routes
      (Leapd GEO study: +30% citation rate from visible year)
- [ ] 30-second demo GIF for the hero — manual capture, your hand
      Best subject: audit module catching 3 issues + one-click-fixing them
- [ ] `/privacy` + `/security` pages — 1 page each
      "No data leaves your browser. No analytics SDK. No cookies."
- [ ] Awesome-list PRs: `TheComputerM/awesome-svelte`,
      `janosh/awesome-sveltekit`, `goabstract/Awesome-Design-Tools`

## Phase 2 — Reputation (weeks 4–7, mid-June → late July)

Build social proof and the small audience that will react to the launch.

- [ ] Long-form post on dev.to — "How I built a 97-rule font auditor that
      runs in your browser" (cross-post to Hashnode subdomain for link-equity)
- [ ] Buttondown newsletter set up; 1-field email capture on `/` and `/learn/*`
- [ ] TypeDrawers thread in Type Design Software — humble, "feedback wanted"
- [ ] Pitch Typographica (Stephen Coles edits) + Alphabettes News & Notes
- [ ] Maintainer cadence — ship one small Patens improvement per week so
      the commit graph looks alive on launch day

## Phase 3 — Launch week (Aug 3–8)

Coordinate the drops. The order matters: Show HN first, then social, then
forums — so Show HN traffic isn't diluted by upvotes redirected elsewhere.

- [ ] Tue Aug 4 or Wed Aug 5, 8:30 AM ET — Show HN
- [ ] Within 4 hours of Show HN: Bluesky + X thread (already drafted in
      `docs/launch/copy.md`) + Reddit r/typography post
- [ ] Within 24 hours: dev.to post goes live (link to it from Show HN
      thread once the HN frontpage moment is set)
- [ ] Attend TypeCon Portland Aug 6–8 in person — name badge, business
      cards with `patens.design`, propose a lightning talk on-site

## Calendar follow-ons

- Oct 28–31 2026 — ATypI Sharjah (submission still open; secondary moment)
- 2027 — TypeCon + ATypI submissions reopen as primary speaker channels

## What this plan deliberately does not do

- Product Hunt launch as primary moment — saturated, AI-tool biased
- Press wire services — zero ROI for free OSS
- Uptime/status page — 100% client-side, irrelevant
- Discord/Slack community — premature without 500+ active users
- Cold-pitching It's Nice That — they curate visual culture, not tools
