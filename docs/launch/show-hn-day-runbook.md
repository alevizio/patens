# Show HN day — hourly runbook for Tuesday August 4, 2026

**Single-purpose doc:** what to do, when, on launch day. Reads like a cockpit checklist; assume sleep-deprived; assume HN traffic landing within minutes of submission.

Time zone: All times in **America/Los_Angeles (PT)** unless otherwise noted. Adjust if you're presenting in a different zone day-of.

---

## The day before — Monday August 3

### Monday 6:00 PM PT — Pre-flight
- [ ] Run `pnpm check && pnpm test && pnpm test:e2e && pnpm build` — all green
- [ ] `curl -I https://patens.design/` returns 200
- [ ] `curl https://patens.design/og/brand` returns image/png, ≥20KB
- [ ] `/audit`, `/compare`, `/learn`, `/press`, `/about` all load < 2s LCP
- [ ] Waitlist sign-up works end-to-end (submit test entry, delete after)
- [ ] CHANGELOG entry for v1.6.0 published + linked
- [ ] RSS feed at `/changelog/rss.xml` validates

### Monday 8:00 PM PT — Mental prep
- [ ] Read `docs/launch/show-hn-draft.md` once cold. Confirm:
  - Title variant chosen (default: A — "Show HN: Patens – a browser type editor with a 94-rule audit that teaches")
  - Body text (~180 words) confirmed final
- [ ] Read the 7 anticipated comments + draft responses in the same file
- [ ] Bookmark these tabs: HN form, HN moderation guidelines, Bluesky, X, Instagram, `hi@patens.design` inbox
- [ ] Phone: charged. Laptop: charged. Iced coffee: ready.

### Monday 9:00 PM PT — Go to bed early
You're submitting at 5:30 AM PT. **No exceptions.**

---

## Tuesday August 4 — Show HN day

### 04:45 AM PT — Wake up
- [ ] Glass of water. Coffee. No phone yet.

### 05:00 AM PT — System check
- [ ] `curl -I https://patens.design/` returns 200 (still up overnight)
- [ ] Open Vercel dashboard — no deploy errors overnight, no error spikes in logs
- [ ] Open HN — confirm the front page isn't already saturated with strong launches today (look for other Show HNs, big YC announcements)
- [ ] If HN front page is saturated → DELAY to 7:00 AM PT (still inside the 5–8 AM window per the research)

### 05:25 AM PT — Title decision
- [ ] Quick gut check on the three title variants in `show-hn-draft.md`:
  - **Variant A** (default): positioning-first. Use unless something on the front page makes it feel redundant.
  - Variant B: mechanism-first. Use if multiple "AI tool" Show HNs are already on the page.
  - Variant C: audience-first. Use if HN feels developer-heavy that morning (most days; this is the safer fallback).

### 05:30 AM PT — **SUBMIT SHOW HN**
- [ ] Open https://news.ycombinator.com/submit
- [ ] URL: `https://patens.design`
- [ ] Title: chosen variant (no edit, no "Show HN:" prefix needed — the form adds it)
- [ ] Text: paste the ~180-word body verbatim from `show-hn-draft.md`
- [ ] Click submit
- [ ] **Save the resulting HN URL immediately** — write it on paper if needed. Hard to find again if HN reorders.

### 05:35 AM PT — First-2-hours monitoring begins
The first 2 hours determine whether the post makes the front page (top 30) or sinks. Stay glued.

- [ ] Save HN URL in `docs/launch/handoff-2026-08-04.md` (top of file)
- [ ] Open HN comment queue in a separate tab (refresh every 5 min)
- [ ] Don't share the HN link anywhere yet — HN sniffs out promo-driven upvotes

### 06:00 AM PT — First comments arrive
- [ ] Respond fast on questions (under 5 min where possible)
- [ ] Respond slow on debates — let other commenters take the lead
- [ ] **DON'T**:
  - Defend against criticism reactively
  - Reply with just emojis or "thanks"
  - Add `Edit:` notes constantly to the post body
  - Ask for upvotes anywhere
- [ ] **DO**:
  - Answer technical questions with specificity
  - Link to specific repo files / docs when relevant (`/audit/[code]` pages are gold here)
  - Acknowledge legitimate concerns ("good point, ROADMAP item")
  - Cite the research files (`docs/research/`) when an "AI vs craft" debate emerges

### 06:30 AM PT — Pinned social posts go live
Set these up Monday night; release at T+1hr from HN submission:
- [ ] **Bluesky**: pre-written post (with HN link as quote) → publish
- [ ] **X**: same pattern
- [ ] **Instagram**: short video clip of demo (recorded earlier) + caption + HN link in bio
- [ ] **All three**: pin the post

These post-T+30min social pushes drive return-traffic to the HN thread, which boosts HN scores via legitimate referral clicks (not via upvote brigading).

### 07:00 AM PT — First metrics check
- [ ] HN post position: track in handoff doc
- [ ] HN upvote count
- [ ] HN comment count
- [ ] patens.design realtime traffic (Vercel dashboard)
- [ ] Waitlist signups (check Blob count)
- [ ] GitHub repo stars + new issues

### 08:00 AM PT — Two-hour mark
By now you know if you're climbing or sinking.

**If front page (top 30):**
- Stay in the comment thread for another 1-2 hours
- Slow down comment-response pace; quality over speed
- Email Tier-1 press contacts who said "embargo-ok" with the HN URL
- Don't broadcast the news widely yet — let HN do its work

**If middle of new page (not top 30 after 2 hours):**
- The post probably won't make front page on its own
- Don't repost or delete-and-resubmit (HN bans this)
- Continue answering comments at slower pace
- Pivot to the TypeDrawers + r/typography plan but EXECUTE TODAY instead of T+24h (since HN didn't compound)

### 09:00 AM PT — Stretch + coffee #2
- [ ] Stand up. Walk for 10 min. Look at something non-screen.
- [ ] Quick CHANGELOG check on any "I noticed X" issues mentioned in HN comments

### 09:00 AM – 12:00 PM PT — Mid-morning monitoring
- [ ] Keep responding to HN comments
- [ ] Respond to early `hi@patens.design` press inquiries
- [ ] Note any unexpected questions worth adding to the FAQ on `/help`

### 12:00 PM PT — Noon check-in
- [ ] HN position: log in handoff doc
- [ ] Total upvote / comment / visit metrics
- [ ] Decide: is the thread still active enough to merit afternoon presence?

### 13:00 – 15:00 PM PT — Afternoon
- [ ] Slower-pace HN engagement (responses every 20-30 min)
- [ ] Eat real food. Lunch break.
- [ ] Email follow-up to press contacts who replied morning-of
- [ ] Check Bluesky / X / Instagram engagement; respond to type-design community there

### 15:00 – 17:00 PM PT — Late afternoon
- [ ] HN traffic naturally slows post-noon PT
- [ ] If position holds: respond to any threads that have grown
- [ ] Update `docs/launch/handoff-2026-08-04.md` with the 4-hour and 6-hour metric snapshots

### 17:00 PM PT — End of workday window
- [ ] HN should be settled in its final position by now (top 30 or not)
- [ ] If top 30: light evening monitoring; respond every 1-2 hours
- [ ] If not top 30: thread will tail off naturally; check comments every 3-4 hours

### 19:00 PM PT — Evening status
- [ ] Final HN metric snapshot for day 1
- [ ] Final patens.design traffic snapshot
- [ ] Final waitlist signup count
- [ ] First-day repo stars
- [ ] All entries logged to handoff doc

### 20:00 PM PT — Pre-T+24h prep
- [ ] Read `docs/launch/typedrawers-intro.md` — confirm the TypeDrawers + r/typography posts ready to go tomorrow
- [ ] Update the HN-link placeholder in both posts with the actual HN URL
- [ ] Set tomorrow's alarm

### 21:00 PM PT — Hard stop
- [ ] Phone away. HN comments will be there in the morning.
- [ ] Note: people on the East Coast (UTC-5) and Europe (UTC) will be commenting overnight. That's fine. Reply in the morning.

---

## Wednesday August 5 — T+24h

### 08:00 AM PT — Wake + morning catch-up
- [ ] Read overnight HN comments (East Coast + Europe traffic)
- [ ] Respond to anything substantive
- [ ] Note final HN position

### 09:00 AM PT — TypeDrawers cross-post
- [ ] Per `docs/launch/typedrawers-intro.md` Section "TypeDrawers"
- [ ] Title: "Patens — a browser-based type editor with a 94-rule continuous audit (MIT, open source)"
- [ ] Post body: paste verbatim (with HN URL filled in)
- [ ] Save the TypeDrawers thread URL

### 10:00 AM PT — r/typography cross-post
- [ ] Per `docs/launch/typedrawers-intro.md` Section "r/typography"
- [ ] Title: "[Show & Tell] Patens — open-source browser type editor with a built-in audit module that explains itself (free, MIT)"
- [ ] Post body: paste verbatim (with HN URL filled in)
- [ ] Save the Reddit thread URL

### 10:30 AM PT – Aug 5 ongoing
- [ ] Engage TypeDrawers thread — small community, opinionated, deep questions; reply thoughtfully and slowly
- [ ] Engage r/typography thread — broader audience, "how do I try this" questions, link to `/audit` for the rules
- [ ] Continue HN comments at slower pace

---

## Press kit + outreach checklist (concurrent with launch day)

### Pre-launch (T-7 to T-1)
- [ ] Pre-warm Tier-1 type-design publications with the embargo-ok pre-launch heads-up per `docs/launch/press-contacts.md`
- [ ] Confirm `/press` is rendering correctly
- [ ] Confirm OG card unfurl on shared links (Twitter card validator, Slack preview)

### Launch day (T-0, Aug 4)
- [ ] Once HN URL is live, email Tier-1 journalists who confirmed embargo-ok
- [ ] Subject line: "Patens is live on Show HN — open-source browser type editor"
- [ ] One-paragraph: HN URL + `/press` link + interview availability
- [ ] Set up Gmail filter: any reply to that email → priority inbox

### T+24h (Aug 5)
- [ ] Email Tier-2 design + tech pubs with the now-public HN thread + early traction (upvote count, comment count)
- [ ] Email specific journalists (Section 3 of press-contacts.md)

### T+48h (Aug 6 — TypeCon day 1)
- [ ] Continue press follow-up between TypeCon sessions
- [ ] Hand journalists at TypeCon physical press-kit cards

---

## What to NOT do on launch day

- ❌ Don't tweet "Hey HN, my Show HN is live, please upvote" — instant ban
- ❌ Don't ask anyone to upvote
- ❌ Don't make controversial edits to the post body
- ❌ Don't argue with critics in HN comments — let other commenters defend, you stay neutral
- ❌ Don't promise features you haven't built ("AI fix module shipping next week")
- ❌ Don't quote engagement metrics in the thread (looks like bragging)
- ❌ Don't link to the HN thread from Patens itself
- ❌ Don't email coworkers / friends "go upvote my HN" — HN tracks IP origins of upvotes; one geographic cluster sinks the post
- ❌ Don't worry if you don't make front page — TypeDrawers + r/typography + press still works

---

## Mental model

The HN front page is not the goal. **The goal is signal for TypeCon Portland Aug 6–8.** HN is the megaphone; TypeCon is the audience. Even a moderately successful HN (not top 10 but top 200) generates:
- 500-2000 new visitors to patens.design
- 10-50 waitlist signups
- 5-20 GitHub repo stars
- 3-5 press contacts (some will write up)
- 1-3 foundry director conversations at TypeCon

A best-case top-5 HN generates 10× those numbers. Either way, the conversation moves to TypeCon by Aug 6.

---

## Single-line summary for the morning

**Submit at 5:30 AM PT. Watch comments for 2 hours. Pinned socials at 6:30 AM. Press email at 8:00 AM. TypeDrawers + r/typography Aug 5 morning. Then go to TypeCon Aug 6–8.**

---

## Files referenced

- [Show HN draft](./show-hn-draft.md) — title variants, body text, anticipated comments
- [TypeDrawers + r/typography drafts](./typedrawers-intro.md) — Wed Aug 5 posts
- [Press contacts](./press-contacts.md) — journalist list, outreach templates, timing
- [Master runbook](./master-runbook.md) — the 10-week calendar this is the climax of
- [Handoff template](./handoff-2026-08-04.md) — log every metric snapshot here
