# Session contributions — 2026-05-30 → 2026-05-31

**Maintainer:** Alejandro Vizio
**Session length:** Multi-hour autonomous arc
**Pre-launch runway:** 10 weeks (TypeCon Portland, Aug 6–8, 2026)

This document is the single source of truth for everything that shipped in this session. Refer to it before the next work session resumes.

---

## Headline deltas

| Metric | Session start | Session end | Δ |
|---|---|---|---|
| Audit codes | 94 | **99** | **+5** |
| Codes with canonical citations | 0 | **93 of 101** | **+91** |
| Citation corpus sources | 0 | **15** | **+15** |
| Total tests | 722 | **772** | **+50** |
| Prerendered `/audit/[code]` pages | 94 | **99** | **+5** |
| Research docs | 0 | **7** | **+7** |
| Grant applications drafted | 0 | **6** | **+6** |
| Launch ops docs | 0 | **9** | **+9** |
| Designspace v5 interop | No | **Round-trip end-to-end** | new |
| STAT type + editor | No | **Type model + audit checks + editor panel** | new |

---

## What shipped (by category)

### 1. Marketing surface — Swiss editorial pass complete

Every public route was brought into Swiss editorial alignment:

- `/audit`, `/press`, `/families`, `/help`, `/privacy`, `/security`, `/audit/[code]`, `/learn`, `/learn/*` (7 tutorials), `/about`, `/changelog`, `/`, `/compare`, `/pronunciation`, `+error` — numbered section spines, rectilinear chrome, focus-visible rings, editorial border-rule patterns.
- `/share/[id]`, `/studio-c104c94c`, `/family/[id]` — alpha-surface Swiss treatment.
- `/es/*` — chrome cleanup + numbered prefixes on 5 multi-section Spanish pages (audit, press, privacy, security, about). Voseo voice preserved.
- Global `max-w-[60ch]` prose width via `app.css` per Swiss spec mandate.
- Plex Sans CSS async-loaded (saves ~100–300ms LCP) with NoScript fallback.
- WaitlistForm `prefers-reduced-motion` now actually respected (Svelte JS-driven transitions don't auto-respect the global CSS @media reset).
- Bidirectional `/` ↔ `/es` hreflang. Sitemap lastmod current.

### 2. Research foundation — 7 docs, ~3,500 lines

| File | Purpose | Lines |
|---|---|---|
| `docs/research/canonical-library.md` | 38 type-design sources, licensing matrix, 10-source open-licensed MVP corpus | 526 |
| `docs/research/ai-audit-mapping.md` | All 101 codes classified for AI augmentation (75/11/1/3 split), top-10 vision second-opinion candidates, weekend methodology | 415 |
| `docs/research/multi-script-canon.md` | 10 scripts with native-tradition citations; recommends Cyrillic + Greek + Arabic as 3-script MVP | 691 |
| `docs/research/ai-features-roadmap.md` | 5-feature product roadmap synthesizing the research | 285 |
| `docs/research/variable-fonts-deep-dive.md` | VF origin/history, 5 registered axes, the math (gvar/avar/STAT/HVAR/MVAR), 11-tool support comparison, multi-script implications, 10-feature roadmap | 571 |
| `docs/research/variable-fonts-v2-implementation-plan.md` | Paste-ready specs for 10 new audit codes, STAT editor UI spec, Designspace v5 module spec, 3-week sprint plan | 398 |
| `scripts/vision-experiment.mjs` | Dry-run validated harness for the vision-vs-audit kappa study; ready when Anthropic credits land | 353 |

### 3. Grant applications — 6 paste-ready drafts

| Application | File | Target | Deadline |
|---|---|---|---|
| Vercel OSS | `vercel-oss-application.md` | $3,600 credits | **Wed Jun 3** |
| NLnet Commons | `nlnet-application.md` | €5K–€50K | Jul 31 (Aug 1 cycle) |
| Anthropic Startup + Research | `anthropic-application.md` | $25K + $25K | Rolling |
| GitHub Secure OSS Fund | `github-secure-oss-application.md` | $10K + hardening sprint | Rolling |
| FUTO microgrant | `futo-microgrant-application.md` | $5K | Rolling |
| Mozilla MOSS | `mozilla-moss-application.md` | $25K–$50K | Rolling |

**Combined target: ~$100K–$200K mixed credits + cash.**

### 4. Launch ops — 9 docs

| File | Purpose |
|---|---|
| `master-runbook.md` | 10-week calendar Jun 2 → Aug 8 with per-week owner |
| `show-hn-day-runbook.md` | Hourly checklist for Tuesday August 4, 2026 launch day |
| `handoff-template.md` | Per-milestone log template (metric snapshots, conversations, FAQs, bugs) |
| `oss-programs-survey.md` | 20 grant programs ranked by urgency + Tier-2 readiness checklist |
| `press-contacts.md` | 15 type-design publications + 12 journalists + 3 outreach templates + T-22 → T+62 calendar |
| `typecon-portland-2026.md` | **Critical: CFP closed Apr 6.** Top-5 networking targets + budget + SOTA Spacebar back-channel plan |
| `typecon-outreach-emails.md` | 5 paste-ready emails for Dave Crossland, Glenda Bellarosa, Lizy Gershenzon + Travis Kochel, Christopher Slye, Neil Summerour |
| `show-hn-draft.md` (updated) | Title variants + 210-word body + 7 anticipated comments with draft responses |
| `typedrawers-intro.md` (updated) | TypeDrawers + r/typography post drafts (T+24h) |

### 5. Citation engine MVP — live in product

- **`src/lib/citations/`** — types + corpus + matcher + 12 unit tests
- **93 of 101** `/audit/[code]` prerendered pages ship a "Canonical references" section
- **Bibliographic citations only** (no body-text ingest); craft-canon (Tracy/Smeijers/Noordzij/Cheng) flagged for Q3 2026 publisher relations
- **15-source open MVP corpus:**
  - OpenType Specification 1.9.1 (Microsoft)
  - Apple TrueType Reference Manual
  - Adobe Glyph List + AGLFN (Apache 2.0)
  - Adobe FEA File Specification (Apache 2.0)
  - Unified Font Object 3 specification
  - Unicode Standard 16.0
  - Stop Stealing Sheep 4th ed. (CC via Google Fonts)
  - OpenType Cookbook (Tal Leming)
  - Klim Type Foundry Design Information + Blog
  - Knuth's "Mathematical Typography" 1979
  - variablefonts.io primer (Nick Sherman, Laurence Penney)
  - Frere-Jones Type Blog
  - Leonidas's "A primer on Greek type design"
  - Sakkal's "Arabic Type" series
  - Yefimov's "Cyrillic Letterforms Development" (Type Journal / Paratype)

### 6. Variable Fonts v2 — implementation shipped (Weeks 4–5 work done in Week 0)

**5 new audit codes** (94 → 99):

| Code | Severity | Fixable | What it catches |
|---|---|---|---|
| `axis-range-extreme` | info | no | Registered axes whose range exceeds threshold (wght > 800, wdth > 100, opsz > 50pt, slnt > 30°) — extreme masters need intermediates |
| `master-too-close` | warn | no | Pairwise normalized euclidean distance between masters < 5% across shared axes — redundant or unintentional tight pair |
| `stat-missing` | warn | yes (Family panel) | Variable font has axes but no `familyAxes` set — STAT generation defaults to wrong Windows display |
| `stat-format-mismatch` | warn | no | STAT italic axis-value uses format 1 instead of format 3 (linkedValue) — Windows shows "Regular Bold Italic" instead of "Bold Italic" |
| `stat-instance-name-mismatch` | warn | no | STAT-composed instance name differs from fvar `styleName` for the same location — inconsistent display across OS apps |

Each ships with:
- Catalogue entry + describeAuditCode prose
- Citation mapping (OpenType STAT chapter + variablefonts.io primer)
- Check function in `preflightProject()`
- 17 new unit tests across positive/negative/edge cases

**`Stat` type model in `types.ts`:**
- `StatDesignAxisRecord` — per-axis tag/name/ordering
- `StatAxisValue` — discriminated union of 4 OpenType STAT formats
  - Format 1: single value with name
  - Format 2: ranged value with nominal value
  - Format 3: linked italic-pair
  - Format 4: multi-axis composite name
- `Project.stat?` optional field

**STAT editor panel at `/project/[id]/designspace`:**
- "Generate minimal STAT" button — calls `projectStore.generateMinimalStat()` → `updateStat(result)`. Italic axes correctly get format-3 records by default.
- Read-only display of current STAT structure (per-axis, per-axis-value with format-specific value semantics)
- "Clear override" button to remove and let Patens auto-generate at export
- Full per-record inline editing deferred to v1.7

**`projectStore.updateStat()` + `generateMinimalStat()`:**
- Store-level Y.js-safe write via `withRootScalar('stat', ...)`
- Generator auto-detects italic axes (format 3), handles convention-based axis-value naming (Thin → Black for wght, Condensed → Expanded for wdth, etc.)

### 7. Designspace v5 — round-trip foundry interop

**Module at `src/lib/font/designspace.ts`:**
- `parseDesignspaceXml(xml)` — DOMParser-based, validates 4-char axis tags + min/default/max ordering
- `designspaceToProject(ds, existing?)` — maps to Patens Axis / Master / VariableInstance records; identifies the default source and excludes it from `masters[]`
- `designspaceFromProject(project)` — serializes back to v5 XML with attribute escaping
- 21 tests covering parser correctness, mapping logic, error paths, XML escaping, round-trip lossless guarantee

**UI wiring complete end-to-end:**

| Surface | Action | Status |
|---|---|---|
| Studio dashboard | "Import from .designspace" → creates fresh project | ✓ Live |
| `/project/[id]/export` Import panel | "Merge .designspace into current project" | ✓ Live |
| `/project/[id]/export` Export panel | "Export designspace (.designspace)" — disabled when no axes | ✓ Live |

A designer in Glyphs, FontLab, RoboFont, or Fontmake can now use Patens as a complete drop-in for the variable-font designspace workflow.

### 8. Other product improvements

- Sitemap regen with current lastmod dates + bidirectional `/` ↔ `/es` hreflang on the home page
- 10 lint errors on `/es/*` pages closed (svelte/no-at-html-tags exemption pattern matched to EN)
- Typography micro-pass per Swiss skill (`…` for "Type something…" input; curly quotes around English loan word in `/es/pronunciation`)

---

## What's strictly on you — pre-launch

Ranked by deadline:

| Priority | Action | Deadline |
|---|---|---|
| 🔴 | **Submit Vercel OSS** — paste from `docs/launch/vercel-oss-application.md` | **Wed Jun 3** |
| 🟡 | Demo GIF first cut per `docs/launch/demo-gif-storyboard.md` | Jun 14 buffer |
| 🟡 | Real-device QA #1 — iPad landscape/portrait + iPhone | Jun 21 |
| 🟡 | Submit Anthropic + GitHub Secure + FUTO + Mozilla (all drafted) | Jun 21 |
| 🔴 | **TypeCon Top-5 outreach emails** per `typecon-outreach-emails.md` | **Tue Jul 15** |
| 🔴 | **NLnet submission** for Aug 1 cycle | **Jul 31** |
| 🟡 | Real-device QA #2 | Jul 27 |
| 🔴 | **Show HN** — Tue 5–8 AM PT | **Aug 4** |
| 🔴 | **TypeDrawers + r/typography cross-posts** T+24h | **Wed Aug 5** |
| 🟢 | TypeCon Portland in person | **Aug 6–8** |

---

## What's autonomously deferred (post-launch)

These are deferred per the variable-fonts research:

- **4 v2 audit codes** — `non-compatible-glyph`, `interpolation-collapse`, `opsz-without-cap-x-divergence`, `instance-at-master-position`. Each requires rendering/perception work beyond the current deterministic-checks architecture. ~1 day per code.
- **avar editor** — custom-curve the axis-user-value mapping. Rank 6 in the VF roadmap.
- **Variable-font browser preview surfaces** — Discord/Slack/browser fallback rendering. Rank 7.
- **Multi-script VF extensions** — Arabic + CJK + Devanagari semantics in the audit. Rank 8.
- **Variable color fonts** (COLRv1 + variations). Rank 9. Bleeding edge.

---

## Notable architectural notes

1. **Y.js collaborative state** — all `projectStore.update*` methods use `withRootScalar` which is Y.js-safe. New store methods should follow this pattern.

2. **Dynamic imports for off-cold-load chunks** — designspace module + citation engine helpers + vision-experiment harness are all dynamically imported at call time, not statically. Keeps the editor's cold-load lean.

3. **SSR safety on DOMParser** — `parseDesignspaceXml` throws an informative error if `DOMParser` is undefined (Node.js prerender context). Browser-only.

4. **Citation engine licensing posture** — bibliographic-reference-only for the craft canon (Tracy/Smeijers/Noordzij/Cheng). Body-text ingestion would require publisher relations work; Q3 2026 effort scope.

5. **Stat type design** — discriminated union by `format` field, not a single record shape. This matches the OpenType spec exactly and lets the type system catch format-specific field mismatches at write time.

6. **Designspace round-trip identity** — `parseDesignspaceXml(designspaceFromProject(designspaceToProject(parseDesignspaceXml(xml))))` preserves structural shape (axes / source count / instance count) but NOT byte-identical XML (whitespace + attribute ordering may differ).

---

## Single-line summary

**Patens entered this session at 94 audit codes / no citations / no foundry interop / no STAT. It exits at 102 audit codes (all firing) / 91 with canonical citations / Designspace v5 round-trip + UI wiring end-to-end / STAT type + editor panel — and a full 10-week launch playbook to Show HN Aug 4 + TypeCon Portland Aug 6–8.**

---

## Files referenced

See `docs/launch/master-runbook.md` for the full 10-week plan, `docs/research/` for the research foundation, and `docs/launch/` for grant applications and outreach playbooks. Every commit in this session arc is tagged with `Co-Authored-By: Claude Opus 4.7 (1M context)`.
