# Patens — TypeCon launch plan (the canonical view)

**Window**: 2026-05-27 → 2026-08-06 (TypeCon Portland Aug 6–8)
**Runway**: 10 weeks, ~2 weeks buffer
**Last refreshed**: 2026-05-27 against actual repo state

Supersedes the calendar in `docs/launch/master-plan.md § 6` and the P0/P1
checklists in `docs/launch/app-improvements-plan.md`. Those docs stay as
the deeper background (positioning, SEO research, etc.) — this is the
"what's actually left + who does it + when" view.

**Open decisions surfaced by `docs/launch/research-notes.md` (2026-05-27):**
1. Move Show HN from 9:30 AM PT to ~6:00 AM PT — 9:30 is now the saturation peak
2. Flip post order — Show HN FIRST, then T+24 cross-post to TypeDrawers + r/typography (was: TD/Reddit pre-warm). Pre-warm triggers HN's voting-ring detection.
3. `/compare` page needs Fontra + Glyphr Studio updates + two new entrants section (Lipi.ai Font Studio, Fontish).

Calendar below still reflects the pre-research plan; do NOT execute the
calendar literally until those three decisions are made.

---

## The plan in 60 seconds

1. **Weeks 1–3** (now → Jun 17): UI polish (you) + parallel autonomous
   engineering (me — streaming SSR, GlyphBrowser virtualization).
2. **Weeks 4–5** (Jun 18 – Jul 1): real-device QA, demo video, content
   drafts.
3. **Weeks 6–7** (Jul 2 – 15): stabilize. Soft code-freeze Jul 9.
4. **Weeks 8–9** (Jul 16 – 29): distribution prep + launch arc.
   **Show HN Tue Jul 28 ~9:30 AM PT.**
5. **Week 10** (Jul 30 – Aug 5): launch arc tail + TypeCon travel prep.
6. **Aug 6–8**: TypeCon Portland.

If you only do five things from this plan before launch:
1. Polish the home hero
2. Real-device QA on iPhone + iPad
3. Record a 30-sec demo video
4. Schedule Show HN for Tue Jul 28
5. File the 3 awesome-list PRs (after Show HN bump)

---

## Streams + ownership

| Stream | Owner | Effort | Why this person |
|---|---|---|---|
| Engineering autonomous | Me | ~3.5d | Server-side work, no design judgment |
| UI polish | You | open-ended | Taste call |
| QA | You | ~2d | Physical devices + pattern-matching |
| Content | You | ~2d | Voice + identity |
| Distribution | You | ~1.5d | Identity + judgment |
| Ops/infra | Mix | ~1d | Some need repo admin, some auto |

---

## Calendar

| Wk | Dates | You | Me |
|---|---|---|---|
| 1 | now → Jun 3 | UI polish: home + editor | Streaming SSR (editor shell) |
| 2 | Jun 4–10 | UI polish: audit + share | Virtualize GlyphBrowser |
| 3 | Jun 11–17 | Real-device QA | Re-share versioning UI |
| 4 | Jun 18–24 | a11y manual pass | OG-font subset |
| 5 | Jun 25–Jul 1 | Demo video record | (light touches) |
| 6 | Jul 2–8 | Content drafts | Bug fixes from QA |
| 7 | Jul 9–15 | **Soft code-freeze** | (none) |
| 8 | Jul 16–22 | Distribution prep | Live-fix only |
| 9 | Jul 23–29 | Launch arc days 1–7 — **Show HN Tue Jul 28** | Live-fix |
| 10 | Jul 30–Aug 5 | Launch arc days 8–14 | Live-fix |
| Conference | Aug 6–8 | **TypeCon Portland** | — |

---

## Engineering — autonomous (me, ~3.5d)

| Item | Effort | Payoff | Risk |
|---|---|---|---|
| Streaming SSR on editor shell | 1d | Chrome paints before IDB payload; +200ms perceived | Touches hydration order |
| Virtualize GlyphBrowser tile grid | 1d | Closes 35ms cold-mount; scales w/ glyph count | Must preserve shift-click range select |
| Re-share versioning UI on `/share/[id]` | 0.5d | UX completion; server endpoint already live | Low |
| Subset OG fonts (Inter, Lora) | 1h | Smaller serverless cold-starts | Adds `subset-font` devDep |
| Multi-run Lighthouse for editor LCP | 30min | Confirm/dismiss +346ms watch-item | Low |
| Verify all 94 audit pages render OK | 15min | Catches prerender drift | Low |

**Deferred to post-launch**: multi-master drag explorer UI (2d, design
judgment); account system (5d); drawn italic master (5d); full Greek
lowercase (2d); bespoke Cyrillic Я Ж Ф (needs your hand).

---

## UI polish — yours (open-ended)

Ranked by impact:

1. **Home hero** — every visitor sees it
   - Typography hierarchy (h1 vs subhead vs body)
   - Demo specimen at top (the new 26-glyph Studio Geometric)
   - CTA prominence
   - Above-the-fold rhythm
2. **Editor toolbar + accordion sidebars** — power-user touch
   - Hover/active/focus states on every interactive
   - Tab transitions
   - Accordion expand easing
   - Empty/loading states in side panels
3. **Audit page** — your differentiator
   - Issue card density
   - Bulk-fix flow visibility
   - Code group expand affordance
   - AI explain button discoverability
4. **Share page** — what visitors land on first
   - Specimen presentation hierarchy
   - Version selector design (pairs with re-share UI)
   - Mobile breakpoint
5. **Marketing pages** (lower priority)
   - /about lead — too short for AI extraction
   - /compare card density
   - /pronunciation visual treatment (just shipped, needs eyes)

---

## QA — yours (~2d)

- iPhone real-device: tap targets, scroll, share menu, editor pencil + trace
- iPad real-device: same
- Keyboard-only walkthrough: home → editor → audit → share. Tab order, focus rings, skip-to-content
- VoiceOver pass: home + editor + audit at minimum
- Lighthouse from clean Chrome: home + editor + share, 3 cold runs each
- `node scripts/profile-cold-load.mjs` against production, same 3 routes
- Spot-check 5 random `/audit/[code]` pages for JSON-LD validity
- Hard-reload `/project/demo/edit` and visually verify curved letterforms (today's commit)

---

## Content — yours (~2d)

- 30-sec demo GIF/video — best subject: audit catching 3 issues + one-click fixing them
- TypeDrawers post draft (template in `docs/launch/copy.md`)
- Show HN title + ~150-word body
- Reddit r/typography post (~200 words, no link in title)
- Bluesky launch thread (5–8 posts)
- X mirror (single thread)
- Blog post 1: "Lessons from N months of building Patens" (~1500 words)
- Welcome dialog copy refresh
- 5–10 warm DMs to designers you know

Drafts already in `docs/launch/copy.md`, `docs/launch/master-plan.md § 6`.

---

## Distribution — yours (~1.5d)

| Action | Where | When | Effort |
|---|---|---|---|
| Triage 3 Dependabot PRs | GitHub | This week | 15min |
| Enable Dependency Graph | Repo Settings → Security | This week | 1min |
| Upload `github-social.png` | Repo Settings → Social preview | This week | 1min |
| Claim Bluesky `@patens.design` (TXT at `_atproto.patens.design`) | Bluesky + DNS | Week 2 | 30min |
| Claim X `@patenstype` | X | Week 2 | 5min |
| Google Workspace for `hi@` + `security@` | Google Admin | Week 4 | 1h |
| Google Search Console + Bing Webmaster | console.cloud + bing | Week 8 | 30min |
| OpenSSF Best Practices → Silver | bestpractices.coreinfrastructure.org | Week 4 | 1h |
| File 3 awesome-list PRs | awesome-typography, awesome-svelte, awesome-design-tools | Week 8 (after Show HN bump) | 30min |
| Submit to Sidebar.io + Indiebase | sidebar.io + indiebase.io | Week 10 | 10min |

Awesome-list PR drafts already in `docs/launch/awesome-prs.md` and `docs/launch/awesome-list-submissions.md`.

---

## Ops / infra

- Vercel uptime monitoring: standing (free Vercel monitoring)
- DNS for patens.design: auto-renew on; verify SPF + DKIM if you start sending email
- Repo description + topics: filled (verify before launch)
- LICENSE / SECURITY.md / CONTRIBUTING.md / SUPPORT.md: ✓ shipped
- Auto-merge Dependabot security PRs: consider enabling
- Branch protection on `main`: optional (you're solo)

---

## Risks + mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Editor LCP +346ms is real regression | medium | medium | Multi-run cold-load in week 1 |
| Real-device issues surface late | medium | high | Front-load QA to week 3 |
| Show HN doesn't gain traction | medium | medium | TypeDrawers + r/typography pre-warmed |
| Dependency CVE during launch week | low | high | Auto-merge Dependabot security |
| Vercel outage on launch day | low | very high | No realistic fallback; bookmark status page |
| Editor breaks on a browser version | low | very high | Test Chrome+Safari+Firefox before code-freeze |
| Domain/DNS issue | low | very high | Auto-renew on; verify 30 days out |
| Show HN account flagged as spam | low | high | Post from established account, not fresh |

---

## Decision points (six things you'll need to call)

1. **Streaming SSR — ship or skip?**
   - Ship if editor LCP turns out to be a real regression
   - Skip if it's noise and we're tight
   - Recommendation: schedule for week 1, decide end of week 2

2. **Multi-master drag explorer UI — launch or post?**
   - Recommendation: **POST.** Too much design judgment for this arc.

3. **Welcome dialog rework — when?**
   - Recommendation: week 5, alongside demo video record (same headspace)

4. **Show HN — Tue Jul 28 or push to Aug 4?**
   - Recommendation: **Tue Jul 28.** Aug 4 too close to TypeCon travel.

5. **Awesome-list PRs — before or after Show HN?**
   - Recommendation: **AFTER.** Stars from Show HN unblock the ≥50-stars rule.

6. **Code freeze — when?**
   - Recommendation: soft Jul 9 (T-4), hard Jul 22 (T-2).

---

## Definition of done for launch

Must:
- [x] All P0 launch artifacts shipped (verified)
- [ ] Curve-refined demo project verified visually in the editor
- [ ] Demo GIF/video on hero
- [ ] Real-device QA complete
- [ ] Keyboard-only nav + VoiceOver pass
- [ ] Repo: description + topics + social preview uploaded
- [ ] Bluesky + X handles claimed
- [ ] Show HN copy drafted + posted Tue Jul 28
- [ ] At least 1 blog post live
- [ ] No CVEs in latest build
- [ ] Lighthouse green on / + /project/demo/edit + /share/demo

Nice-to-have:
- [ ] Awesome-list PRs filed (Aug 1 ish)
- [ ] OpenSSF Best Practices Silver application submitted
- [ ] Welcome dialog refreshed
- [ ] Streaming SSR shipped
- [ ] Virtualized GlyphBrowser shipped

Deferred:
- Account system; italic master; Greek lowercase; multi-master drag UI.

---

## When in doubt

Ask: does this help a TypeCon attendee discover Patens, or have a good
first 60 seconds with it? If no → defer to post-launch.
