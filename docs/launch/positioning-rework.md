# Patens — positioning rework (2026-05-27)

Synthesis of four parallel research arcs on indie tool positioning,
type-design culture, manifesto playbook, and Patens-specific white
space. Full source reports in `/tmp/research-positioning-{A,B,C,D}-*.md`
(not committed).

---

## TL;DR — what changes

1. **The position becomes one sentence:**
   *Patens teaches type design through a continuous audit.*
2. **The 94 rules get a name:** **the Patens Method** — practices, not features.
3. **The voice shifts from "competent + earnest" → "editorial + deadpan + mentor-toned"** — the register of Klim, Dinamo, Sharp Type, not the register of Linear/Cursor/Notion.
4. **The audit becomes the product.** The editor is the *delivery* of the audit; it stops being marketed as a parallel feature.
5. **No manifesto.** Type culture distrusts SV-style worldview-shouting. Ship one strong opinion and let the 94 rules be the de facto manifesto.

If this lands with you, I draft copy variants below for each surface and you pick one per surface.

---

## Why this position

Empty quadrants in the type-tool landscape (per research arc D):

- **Open + browser + craft-first + explicitly pedagogical.** Fontra is *professional-coded*, not teacher-coded. Glyphr Studio is *hobbyist-coded* but doesn't teach. **Nobody owns "the font editor that makes you better at type design."**
- **Audit/linting as a first-class surface.** Every other tool treats validation as a side menu. None of them explain *why* in prose.
- **MIT-licensed serious tooling.** Fontra is Apache, the rest are GPL or commercial — distinct from MIT in ways that matter to foundries who want to embed/fork.

The combination — audit-as-pedagogy, browser, MIT, solo-built, bilingual surface — is genuinely unclaimed. It's defensible against every named competitor because none of them are positioned for it.

**What we cede in exchange:** the "professional power tool" frame. FontLab and Glyphs own that. Trying to win that fight solo is unwinnable; not pretending to is honest.

---

## The voice — five adjectives, three rules, three don'ts

**Adjectives (in priority order):**
1. **Editorial** — long captions over short headlines; body text is where trust is built.
2. **Deadpan** — no exclamation marks, no emoji, no "we're so excited."
3. **Mentor-toned** — the audit teaches; the marketing should sound like the audit.
4. **Materially honest** — name what the tool can't do; type designers respect this.
5. **Quietly opinionated** — strong views, calm delivery.

**Three rules (steal these from Klim/Dinamo/Sharp Type):**
1. **Write captions, not headlines.** A long, plain caption under a screenshot beats a clever H1.
2. **Name the trade-off.** Frame the 94-rule audit as *a second pair of eyes*, not a verdict.
3. **Use first-person singular sparingly.** "I built this" works once, on a colophon. Everywhere else, talk about the *work*, not the maker.

**Three hard don'ts:**
1. **Never** say "AI-powered" or "smart suggestions." Say "rule-based" and "explained in plain English." The audit is leverage precisely *because* it isn't AI.
2. **No emoji, no sparkles, no "Wow!"** Klim, Dinamo, Sharp Type ship zero emoji on product pages. The convention is real.
3. **Don't lead with "browser-native" as identity.** Lead with what it lets you do (share a URL, audit anywhere, no install). Browser-native as identity reads as developer-cosplay; browser-native as affordance reads as craft.

**One-line test for any sentence on the site:**
> If it'd fit on a Y Combinator company page, rewrite it. If it'd fit in a Klim release note or a Dinamo update — ship it.

---

## The naming move — "the Patens Method"

The 94 rules currently read as a *feature*. They are actually a *philosophy of what type-design checking should look like*. Rename them:

> **the Patens Method**
> 94 practices for drawing a typeface — every one explained, every one shipped as code.

Linear did this with "the Linear Method." Figma's blog called Linear out as a worldview-positioned tool, not a feature-positioned one. The 94 audit rules are EXACTLY this — a published, citeable document of what we believe good type drawing demands. Marketed as a method (not a feature), it becomes the de facto manifesto the research says not to publish.

Implementation: a single `/method` page (or a renamed `/audit` page) leads with the philosophy, then enumerates the 94 practices, each with its prose explanation.

---

## Surface-by-surface copy variants

Each variant respects the voice rules above. **You pick one per surface.** I apply once you've chosen — no commits until your call.

### 1. Home hero (the most-seen line)

**Current** (time-of-day variants in `src/lib/delight.ts`):
> Design your own typeface, [one glyph at a time / quietly in the morning / etc.]

The time-of-day taglines are actually good — they're editorial and dry. **Keep them.** What we need to add or change is the *subhead* under them (currently the line below explains the editor functionally).

**Subhead variants (pick one):**

- **A. The audit-method framing:**
  > A type editor with the *Patens Method* built in — 94 practices for drawing type, every one of them explained in plain English.

- **B. The Linear-Method imitation (short, immodest):**
  > The type editor with a method.

- **C. The Klim-deadpan:**
  > A type editor. The audit reads back to you.

- **D. The Future-Fonts in-progress framing:**
  > In progress, like your typeface. That's the point.

My pick: **A** if we commit to renaming the audit to "the Patens Method"; **C** if not. **B** is too clever; **D** is good for /about, not hero.

### 2. /about lead paragraph

**Current** (in `src/routes/about/+page.svelte`, lines ~107):

> Patens is a type design tool that teaches as you draw. The differentiator from FontLab, Glyphs, RoboFont, Fontra, and the rest of the type-editor landscape is a built-in 94-code audit module that runs continuously alongside the editor — every contour, every metric, every kern pair gets checked against the rules type designers internalize through years of mentorship…

This is the worst-offending lame surface. It reads like a competitor matrix dressed as prose. The new lead should be a single short paragraph that signals editorial register immediately.

**Variants:**

- **A. The Klim register:**
  > Patens is a type editor. The thing that makes it different from FontLab or Glyphs or Fontra isn't the canvas — it's the 94 rules running underneath, and the prose attached to each one. We call it the Patens Method.

- **B. The Bold-Decisions register (first-person plural, ownership):**
  > Patens is a type editor with a method. Ninety-four rules check your work as you draw it, and each one ships with a paragraph explaining what's wrong and how the foundries solve it. The audit is the product. The editor is how it's delivered.

- **C. The Dinamo deadpan:**
  > Patens is a type editor. It has 94 opinions about what your glyphs should do, written out in full. Even the warnings are paragraphs.

My pick: **B** — closest to the actual product truth ("the audit is the product"), with the right register.

### 3. Welcome dialog opening line

**Current** (in `src/lib/ui/WelcomeDialog.svelte`):
> Welcome to Patens — a type design tool that teaches as you draw.

**Variants:**

- **A.** Welcome. Patens is a type editor with 94 rules built in. They'll read back to you as you draw.
- **B.** Welcome. Draw a glyph; the audit will tell you what's wrong with it — in plain English.
- **C.** Welcome. Open the demo, draw something rough, let the audit explain itself.

My pick: **B** — it's a promise + an invitation, and it sells the audit-as-teaching angle without using the word "teaches."

### 4. Press one-liner (currently in `/press`)

**Current:**
> Browser-native, open-source type design environment.

**Variants:**

- **A.** A type editor that ships its audit as 94 prose explanations. Open source, MIT, in the browser.
- **B.** The Patens Method: 94 rules for drawing a typeface, every one explained, all shipped as code. Open source, MIT.
- **C.** A type editor with a method. 94 rules, plain English, free forever.

My pick: **C** — shortest, most-quotable for press editors who pull a one-line description.

### 5. Meta description (SEO + AIO)

**Current** (home):
> A type design tool that teaches as you draw. Sketch glyphs, trace to Bézier, audit your work against 94 type-design rules with plain-English fixes, ship real OpenType. Open source MIT, browser-native.

**Variant (one strong rewrite, not three):**
> Patens is a type editor with 94 rules running underneath. Each rule explains itself in plain English, and ~30 of them fix the glyph for you. Open source, MIT, in the browser, no install. The Patens Method.

### 6. Footer micro-copy

**Current** (in `src/lib/ui/SiteFooter.svelte` and the home `<span>`):
> Patens · Type that teaches as you draw
> MIT · Personal type design tool · 2026

**Variants:**

- **A.** Patens · A type editor with a method. Made in [city], one rule at a time. — Alejandro
- **B.** Patens · The Patens Method. MIT · 2026
- **C.** Patens · 94 rules, plain English. MIT · 2026

My pick: **A** for the wordmark row (signed footer is one of the biggest "cool" levers per research A); **C** for the bottom date row.

### 7. CTA labels (across the site)

Replace soft encouragement with imperatives. Research A: cool tools use commands, not invitations.

| Current | Replace with |
|---|---|
| "Try the demo" | "Open the editor" |
| "Get started" | "Draw a glyph" |
| "Learn more" | "Read the source" or "Read the method" |
| "Sign up free" | (n/a — Patens has no signup; this is correct already) |
| "Why Patens?" section heading | "What the audit teaches you" |

### 8. Empty-state copy (canvas, first draw)

**Variant:**
> Draw a glyph. The audit will read back to you — kindly.

This is the line every first-time visitor sees. Sets the tone of the entire product.

---

## What's NOT in this rework (deliberately)

- **No manifesto page.** Research C is clear: in type culture, manifesto-shouting backfires. The "Patens Method" page is the substitute — it's a worldview document disguised as a reference.
- **No tagline change on the home hero itself.** The time-of-day taglines are good. They stay.
- **No visual identity changes.** Hoefler Text + Plex Mono + Swiss layout already match the register. The aesthetic is doing the work.
- **No removal of `/audit/[code]` long-tail pages.** Those are AIO infrastructure; they stay.
- **No renaming the product.** Patens stays Patens.

---

## Application order — if you green-light this

1. **First**: rename the audit to "the Patens Method" in copy (not in code identifiers, not in the audit module name as it lives in `src/lib/font/`). Just the marketing-surface verbiage. This is the single biggest move.
2. **Then**: rewrite the /about lead paragraph (variant B).
3. **Then**: rewrite the home hero subhead (variant A).
4. **Then**: rewrite the welcome dialog opener (variant B).
5. **Then**: rewrite the press one-liner + meta description.
6. **Then**: footer micro-copy + signed wordmark.
7. **Then**: CTA pass across the site.
8. **Then**: empty-state canvas copy.
9. **Last**: parallel Spanish rewrites of every accepted variant (I'll mirror voice to ES — `tú` form, neutral/LATAM, no Castilian-only).

Each step is a single small commit. Reversible if you don't like how it reads in context.

---

## What I need from you to start applying

Three things:

1. **Direction**: green-light on the position itself ("Patens teaches type design through a continuous audit / the Patens Method"), OR a counter-proposal on a different position from research arc D (positions A, C, D, E are the alternatives).
2. **Pick one variant per surface** above (or tell me which is closest and I revise).
3. **Yes/no on the "Patens Method" naming.** It's the load-bearing rename. Without it, the rework becomes "fix the lame copy" instead of "claim white space."

Reply with any combination — even just "all my picks plus go" or "I like B/B/B/C/A/A and yes to the Method name."
