# TypeCon Portland 2026 — Outreach Email Drafts

**Send before:** Tuesday July 15, 2026 (3 weeks pre-conference)
**Goal:** Open conversations with the Top-5 networking targets identified in `typecon-portland-2026.md` Section 5. The 2026 CFP is closed; back-channel outreach is the only path into a 2026 surface beyond booth presence.

**Voice:** human, specific, brief. Each email cites something concrete from the recipient's recent work — these are working type designers, not press; warm and informed > polished and generic.

**Personalization checklist before sending each email:**
- [ ] Verify recipient's current role + foundry (titles change)
- [ ] Update the "I noticed X" hook based on their most recent public post/talk
- [ ] Match the time-zone of your sending day
- [ ] If they reply, follow up within 24 hours

---

## Email 1 — Dave Crossland (Google Fonts)

**Why this conversation:** Google Fonts is a TypeCon Portland 2026 sponsor. Crossland runs the Open Font Program at Google. Patens is open-source, MIT-licensed, browser-native — directly relevant to Google Fonts's mission. A conversation with Dave could open the door to a Google Open Source Programs Office grant on top of the existing Vercel/Anthropic stack.

**Public contact:** [dcrossland@google.com](mailto:dcrossland@google.com) — public on Google Fonts pages.
**Backup:** @davelab6 on Twitter, dcrossland on GitHub.

**Subject:** Patens — browser-native open-source type editor; launching at TypeCon

```
Hi Dave,

I'm launching Patens at TypeCon Portland in August — a browser-native
MIT-licensed type editor with a 101-rule continuous audit module. Built
on opentype.js + Pyodide + ttfautohint, ships OTF/WOFF2/TTF/UFO. The
audit is the differentiator: every code carries plain-English teaching
prose, ~30 ship a one-click fix, and the same engine runs as
`npx patens audit` for CI integration.

The Google Fonts angle is direct: I'd like to talk about (a) whether
Patens fits into your open-source program's broader portfolio, and (b)
how a type designer building a Google-Fonts-bound family could use
Patens through their drafting workflow.

I'll be at TypeCon Aug 6–8. Happy to grab 30 minutes any time during
the conference, or coffee Wednesday morning before the program starts.

Quick links if you want context:
- patens.design — the marketing surface (long-scroll editorial)
- patens.design/audit — the 101-code module
- patens.design/compare — vs FontLab, Glyphs, Fontra, Glyphr Studio,
  typlr, BirdFont, FontForge, Lipi, Fontish

If TypeCon doesn't work, I'm happy to do a video call any time before.

Best,
Alejandro
patens.design · @patenstype · hi@patens.design
```

---

## Email 2 — Glenda Bellarosa (Adobe Fonts / Font Bakery)

**Why this conversation:** Per the TypeCon research, Glenda runs Font Bakery for Type Crit at the conference — the single highest-value technical adjacency to Patens's audit module. A conversation with her validates the "audit-as-pedagogy" positioning against the foundry-tooling expert who's been doing automated font QA for years.

**Public contact:** Adobe Fonts contact form (slower) — better to reach via Bluesky (@glenda.bsky.social if active) or LinkedIn.
**Backup:** Adobe Fonts community spaces.

**Subject:** Patens audit module vs Font Bakery — a technical conversation at TypeCon?

```
Hi Glenda,

I've been following Font Bakery's evolution for years — it's the
canonical font-QA tool. I'm building something adjacent: Patens, a
browser-native type editor with a 101-rule continuous audit that runs
inline alongside the drawing surface (not as a release-time lint step).

The technical question I want to ask you: where does inline-while-
drawing audit cleanly complement Font Bakery, and where does it
overlap unproductively? I've drafted answers based on classifying all
101 codes against AI augmentation potential (75 algorithm-only, 11
vision-augmented, 1 vision-primary, 3 LLM-augmented — research at
github.com/alevizio/patens/blob/main/docs/research/ai-audit-mapping.md)
but the empirical work would benefit enormously from your perspective.

I'd love 20 minutes during TypeCon — happy to meet you wherever's
convenient (after Type Crit, at the Spacebar party, or coffee).

Quick links:
- patens.design
- patens.design/audit (the 101 codes by family)
- patens.design/compare (vs the rest of the field)

Looking forward to seeing Type Crit run again in person.

Best,
Alejandro
patens.design · @patenstype · hi@patens.design
```

---

## Email 3 — Lizy Gershenzon + Travis Kochel (Future Fonts)

**Why this conversation:** Future Fonts is a 2026 TypeCon sponsor + runs the "foundry-as-platform" model that's adjacent to where Patens could end up. Lizy and Travis both have direct experience with the build-vs-ship trade-offs of a small platform that serves type designers. Worth pitching as a potential distribution channel for fonts created in Patens.

**Public contact:** Foundry contact form, [hello@futurefonts.xyz](mailto:hello@futurefonts.xyz), Lizy on Twitter/Bluesky.

**Subject:** Patens + Future Fonts — fonts-in-progress published from a browser

```
Hi Lizy + Travis,

Quick note before TypeCon Portland — I'm launching Patens, a browser-
native open-source type editor (MIT, no install, no account). The
audit-as-pedagogy framing (101 rules with plain-English explanations,
~30 with one-click fixes) is what makes it different from Fontra +
Glyphr Studio + the rest of the browser-tier tools.

Where Future Fonts comes in: I see a natural pairing where a designer
drafts in Patens through the early stages, the audit catches the things
that block release on a fonts-in-progress platform, then ships to
Future Fonts when they're ready for first paying users. The browser-
native posture means the export path is friction-free; the audit
catches the OpenType + metadata invariants that would otherwise show
up as bugs in the wild.

I'd love 30 minutes during TypeCon to walk through how the audit module
maps to Future Fonts's release-readiness criteria. Booth or coffee
either works — I'm there Aug 6–8.

Quick links:
- patens.design
- patens.design/audit
- patens.design/compare

Best,
Alejandro
patens.design · @patenstype · hi@patens.design
```

---

## Email 4 — Christopher Slye (SOTA Ex Officio)

**Why this conversation:** SOTA runs TypeCon. Christopher is on the Ex Officio board. A back-channel email here is the highest-probability path to a 5-minute lightning slot at the SOTA Spacebar party (Monotype-sponsored, Friday evening). Even if the lightning slot doesn't materialize, an introduction to the SOTA board is valuable for 2027 CFP positioning.

**Public contact:** Through SOTA's contact channels — typecon.com general inquiry, sota.org board page.

**Subject:** Patens — open-source browser type editor; possible Spacebar party 5-min slot?

```
Hi Christopher,

I'm launching Patens at TypeCon Portland in August — open-source MIT
browser-native type editor with a 101-rule audit module. I missed the
2026 CFP (apologies — first-time presenter), but I'd love to be useful
to the program in some form.

Specifically: if there's a Spacebar party lightning slot, I'd be glad
to do a 5-minute "75 of 94: which audit rules AI can't replace (and
why that's good)" — the audit-as-pedagogy framing is genuinely
distinct from the AI-generative tools (Lipi, Fontish) and I think
the room would find it useful.

If lightning slots aren't available, I'm fully content to just be there
as a booth + 1:1 conversations. Either way, I'd love a brief
introduction to the SOTA board for 2027 CFP positioning — I'd like to
do a proper main-program talk next year.

Quick links if you want context before saying anything:
- patens.design
- patens.design/audit
- github.com/alevizio/patens (MIT, open source)

I'll be in Portland Aug 5 evening through Aug 8.

Best,
Alejandro
patens.design · @patenstype · hi@patens.design
```

---

## Email 5 — Neil Summerour (SOTA Treasurer / Positype)

**Why this conversation:** Treasurer-level board contact + foundry director (Positype is a 2026 TypeCon sponsor). A second board-level relationship for 2027 CFP credibility, plus a foundry-director conversation that could surface partnership opportunities.

**Public contact:** Positype foundry contact, [neil@positype.com](mailto:neil@positype.com).

**Subject:** Patens at TypeCon Portland — quick intro from a first-time presenter

```
Hi Neil,

I'm Alejandro Vizio — launching Patens at TypeCon Portland this August.
Patens is a browser-native MIT-licensed type editor with a 101-rule
continuous audit module. The audit is the differentiator: it teaches
type-design rules in plain-English alongside catching errors, and the
same engine runs as `npx patens audit` for CI integration.

Reaching out for two reasons:

1. SOTA board context: I missed the 2026 CFP (first-time presenter,
   learning the conference rhythm) and would love an introduction to
   the board for 2027 positioning. I have three talk proposals drafted
   covering different time slots — happy to share for feedback.

2. Positype-the-foundry angle: I'd love your perspective on how a
   working foundry would actually use Patens in production. The audit
   module is built around foundry-grade craft rules (Tracy, Smeijers,
   Cheng, Bringhurst tradition) but I haven't pressure-tested it with
   a working foundry director yet.

I'm in Portland Aug 5 evening through 8. Coffee or beer either works.

Quick links:
- patens.design
- patens.design/audit
- patens.design/compare

Best,
Alejandro
patens.design · @patenstype · hi@patens.design
```

---

## Timing + tracking

### Send schedule (target: Tuesday July 15, 2026)

- **Mon Jul 14:** Final personalization pass (verify roles, hooks, recent posts)
- **Tue Jul 15 — 09:00 AM your local time:** Send all 5 emails in order
  - Why this hour: type designers are mostly working hours; this lands at start-of-day for US Pacific (Future Fonts, SOTA), mid-morning Mountain (foundry-friendly), and afternoon East Coast — none in fly-over inbox-pile time.
- **Wed Jul 16 morning:** Check inbox for any same-day replies; respond within 4 hours.

### Tracking

Log each in `docs/launch/handoff-2026-07-15.md` (per the handoff template):
- Recipient
- Sent timestamp
- Reply received (Y/N + timestamp)
- Outcome (meeting scheduled / asked-to-table / no response / negative)

### Follow-up rules

- **No response after 7 days:** Single polite bump on Aug 1 ("just floating this up before TypeCon — should I find you at the conference?")
- **No response after 14 days:** Don't chase further. Bring the printed press-kit card to the booth as fallback.
- **Soft no ("can't this year"):** Reply with a one-line thanks + ask if you can email them after launch with the post-launch handoff doc + ask for feedback. Most "soft no"s become Q4 conversations.

---

## What NOT to do

- ❌ Don't send these as bcc/group — each is personal
- ❌ Don't include the HN URL until Aug 4 (these emails go pre-launch)
- ❌ Don't pitch a specific partnership / deal in the first email — open the conversation
- ❌ Don't quote the OSS programs survey or grant applications — these are TypeCon-time conversations, not pitch-deck context
- ❌ Don't follow up if they politely decline — type designers are private; respect that

---

## Backup contact list (Tier-2 if Top-5 doesn't respond)

If the Top-5 emails generate < 2 confirmed conversations, dispatch these next:

- **Jess McCarty** — Frere-Jones Type (per press contacts research)
- **Kris Sowersby** — Klim Type Foundry, NZ-based but ATypI regular
- **Indra Kupferschmid** — Reading PhD, type historian; often at TypeCon
- **Stephen Coles** — Typographica editor (also in press contacts)
- **Tom Phinney** — Phinney on Fonts, former Adobe Type product manager

These are the Section 3 journalist + community profiles — they overlap with TypeCon attendees but the relationship is different (press / community, not foundry partnership).

---

## Files referenced

- [TypeCon Portland 2026 intel](./typecon-portland-2026.md) — full conference context
- [Press contacts](./press-contacts.md) — Tier-1/2/3 outreach for the Show HN cycle
- [Show HN draft](./show-hn-draft.md) — what the back-channel emails point at as "what's launching"
- [Handoff template](./handoff-template.md) — log each outreach response
