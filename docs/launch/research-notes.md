# Research notes — 2026-05-27 four-arc deep dive

Four parallel research arcs commissioned on the launch posture. Full reports
at `/tmp/research-{A,B,C,D}-*.md` (not committed; this doc is the durable
summary + decision flags).

| Arc | Topic | Verdict on existing plan |
|---|---|---|
| A | Show HN 2026 playbook | **Reversal:** flip launch order — Show HN first, TypeDrawers + Reddit at T+24, not pre-warm |
| B | AIO / LLM citation patterns | **Mostly validated**, two surfaces under-leveraged, biggest miss is third-party seeding |
| C | Competitor landscape Dec 2025 – May 2026 | **`/compare` is stale** — Fontra esp.; two new entrants to add |
| D | TypeDrawers + r/typography engagement | **Reframe both posts** — problem-solving framing wins; "Type Design Software" category, not Announcements |

---

## Five decision flags (your call)

### 1. Show HN timing: keep 9:30 AM PT or move to 6:00 AM PT?

The "Tue 9 AM PT" folklore is partially outdated per King's April 2026 analysis of 188 K Show HN posts. The 9 AM slot is now the saturation peak — ~200 daily competitors. Best-by-hit-rate is Monday 00:00 UTC (Sun 5 PM PT, 10.8% hit rate), but **Tue 5–8 AM PT (12–15 UTC)** is the next-best wide window — engineers arriving at desks, lower density, EU still online.

Caveat: King's data also shows "survival rate is flat across hours" — title + first-hour engagement matter more than ±2h of timing.

**Recommendation:** **Move to Tue Jul 28 6:00 AM PT.** Cheap to revise; flag stays open until ~T-1 week.

### 2. Post order: Show HN first (T+24 then TD/Reddit) or pre-warm first?

Our current `typecon-runway.md` has TypeDrawers Day 2 + Reddit Day 3 + Show HN Day 8. Research A says **reverse it**: pre-posting to those communities risks tripping HN's voting-ring detection (Twitter/LinkedIn blasts have done this); also wastes the strongest distribution moment.

**Recommendation:** **Show HN first, then T+24 cross-post the HN thread to TypeDrawers + r/typography for second-wave amplification.** Reverses 3 calendar days in the runway plan.

### 3. `/compare` page — refresh now or T-2 weeks?

Stale on at least 3 tools. **Fontra is on a tear**: 8 releases in 6 months, shaping debugger, conditional substitutions, .woff2 export, designspace rules. Glyphr Studio shipped PWA support + redo with history. Two genuine new entrants: **Lipi.ai Font Studio** + **Fontish** (both AI-assisted, browser-based).

**Recommendation:** **Refresh now.** A stale `/compare` is a credibility hit if reviewers spot it during Show HN. I can prep a diff for review without your judgment calls on opinion lines.

### 4. FAQPage JSON-LD bet — keep, downgrade, or drop?

Research B finding: **LLMs tokenize JSON-LD as raw text — they don't parse it as structured data.** Citation lift comes via (a) Google Knowledge Graph → Gemini, and (b) the on-page visible Q&A mirroring the schema.

**Implication:** our FAQPage on `/audit`, `/help`, `/pronunciation` is only useful if the visible page also contains the Q&A in scannable form. `/audit` ✅ does, `/help` ✅ does, `/pronunciation` ⚠️ has visible Q&A in prose form, not bulleted. Probably fine but worth eyeballing.

**Recommendation:** **Keep all FAQPage** — they're not hurting and the visible Q&A is what does the work. Re-shape `/pronunciation` body to a more scannable Q-then-A bullet pattern if you're polishing it anyway.

### 5. New AIO surfaces worth adding?

Research B's biggest under-leveraged finding: **third-party seeding accounts for ~40% of AI citations**. We've invested in own-site surfaces but not in:

- **AlternativeTo + Slant + Product Hunt** listings (free, ~30min each)
- **CITATION.cff** in the GitHub repo (machine-readable citation format)
- **YouTube indexing** (LLMs increasingly cite YouTube transcripts) — needs your demo video first

Plus: the **DefinedTerm 94 audit pages** are validated as one of the strongest under-leveraged surfaces. Worth doubling down by linking each `/audit/[code]` page from the editor's inline audit panel (so authority flows).

**Recommendation:** AlternativeTo + Slant + Product Hunt listings AFTER Show HN bumps the GitHub star count past 100. CITATION.cff I can ship now.

---

## What I've shipped from this research today

| Action | Status |
|---|---|
| `/pronunciation` link on `/about` (discoverability) | ✅ shipped |
| TBT (Total Blocking Time) in `scripts/profile-cold-load.mjs` | ✅ shipped |
| JSON-LD validation sweep (all pages parse, have @context + @type) | ✅ shipped |
| `CITATION.cff` for the GitHub repo | ⏳ pending your nod |
| `/compare` refresh diff prepared | ⏳ pending your nod |

---

## Source reports (kept in /tmp/, not committed)

- `/tmp/research-A-show-hn.md` — 199 lines, 13 sources, focused on launch tactics
- `/tmp/research-B-aio-patterns.md` — 126 lines, 5 empirical 2026 studies
- `/tmp/research-C-competitive.md` — 153 lines, per-tool release history
- `/tmp/research-D-typedrawers-reddit.md` — 126 lines, 25 TD threads sampled (Reddit blocked; secondary sources)

Each report ships its own sources list with date + ✅/⚠️/❓ trust markings.
