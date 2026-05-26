# Trademark filing — "Patens" wordmark

Why: MIT covers the code. Trademark covers the **name**. A hostile
fork can use the source, but trademark prevents them calling their
fork "Patens" — protects user trust + community lock-in.

Cost: ~**$250–350** self-filed, ~**$1500–3500** with an attorney.

Recommendation: **self-file** for v1. Patens is a clean, dictionary-
adjacent wordmark with no obvious conflicts. The USPTO has the TEAS Plus
filing system at ~$250 designed for exactly this case.

---

## Pre-filing checks

Before paying USPTO, do five free things:

### 1. USPTO TESS database search

<https://tmsearch.uspto.gov/>

Search exact: `PATENS`. Expected result: a small number of unrelated
registrations (legal-tech, biotech). None should be in class 9
(computer software) — verify yourself.

### 2. EUIPO + UKIPO

<https://euipo.europa.eu/eSearch/> and <https://www.gov.uk/search-for-trademark>

Patens-the-product is a US-resident project at patens.design. If the
ambition is European market presence, a Madrid Protocol filing (one
form, multiple jurisdictions) costs about $400 on top of the US
filing. Defer for v1; revisit if the project takes off in Europe.

### 3. Domain check

You already own patens.design (good). Check the .com, .app, .io
variants — most are either parked or already in use by unrelated
parties; the .design is the canonical home and that's fine.

### 4. Common-law check

Google "Patens type" and "Patens font" — verify no other type-design
project uses the name. (As of May 2026: none.)

### 5. Social handles

You already hold @patenstype on X and @patens.design on Bluesky.
Verify github.com/alevizio/patens is held (it is). Maybe also claim
mastodon.social/@patens for completeness (~5 min).

---

## What to file

### Filing system

**TEAS Plus**, the USPTO's reduced-fee electronic filing system. $250 per
class. Sign in at <https://teas.uspto.gov/>.

Use the regular TEAS form ($350) only if the goods/services don't
match an exact pre-approved description from the USPTO's
ID Manual — for software the standard descriptions cover the
common cases.

### Mark Type

**Standard character mark** (wordmark). This protects "Patens" in
any font / styling. Don't file the logo version yet — wordmark is
broader + cheaper + the right scope for v1.

### International Class

**Class 9** — "downloadable computer software" (the standard tech
class).

Patens is also arguably class 42 (software-as-a-service), but the
distinction is fuzzy and class 9 covers both web + downloadable.
File one class for v1; upgrade if needed.

### Description of goods/services

Use this exact wording (USPTO ID Manual approved phrasing):

> "Downloadable computer software for designing typefaces and fonts;
> downloadable computer software for editing, kerning, and exporting
> OpenType font files; downloadable computer software for type design
> education."

### Specimen

USPTO needs proof you're actually using the mark in commerce. For
software, the canonical specimen is:

1. A screenshot of the live website where the mark appears as a
   product name (e.g. the home page header showing "Patens").
2. A screenshot of the GitHub repo header showing the project name.
3. A screenshot of the editor with the "Patens" wordmark visible.

Take all three. Upload as JPEGs. Three specimens is overkill for a
single class but USPTO never penalizes generosity.

### First-use date

The "date of first use anywhere" should be the earliest publicly
verifiable date the mark was used. Look up:

- Earliest GitHub commit to the repo (use `git log --reverse | head`)
- Earliest patens.design Vercel deploy
- Earliest social-media post under @patenstype

The earliest of those is your "first use in commerce" date.

### Owner

If you're an individual (not an LLC): file as individual. The
trademark stays in your name; assign to an LLC later if you ever
form one.

If you already have a single-member LLC: file in the LLC's name —
cleaner for separation.

---

## After filing

- **0–3 weeks**: USPTO assigns a serial number and an examining
  attorney.
- **3–6 months**: examiner reviews. May issue an "office action"
  asking for clarification (75% of applications get at least one).
  Respond within 6 months. Common asks: minor specimen issues,
  ID Manual wording tweaks. Self-responding is fine.
- **6–9 months**: assuming no rejection, the mark gets published in
  the Official Gazette. 30-day opposition window — anyone can
  oppose. For "Patens" this is unlikely (no obvious conflicts).
- **9–12 months**: trademark registers. You get a registration
  certificate + the ® symbol becomes legal usage.

Between filing + registration, you can use the ™ symbol freely (it's
informal, asserts a claim without registration).

---

## What this gets you

1. **Hostile fork protection**: if someone forks Patens and calls their
   fork "Patens," you can send a cease-and-desist. They keep the MIT
   code; they can't keep the name.
2. **Sponsorship / partnership confidence**: enterprise users + grant
   reviewers see registered TM as a maturity signal.
3. **Domain protection**: registered TMs can take back squatted domains
   via UDRP.
4. **Brand stability**: the name is yours regardless of where the
   code lives in the future.

---

## What this doesn't get you

1. **Doesn't change the MIT code license.** Anyone can still fork the
   code; they just can't call their fork Patens.
2. **Doesn't grant rights internationally.** US-only unless you file
   Madrid or country-by-country.
3. **Doesn't prevent generic-use references.** "Patens" in a magazine
   article remains fair use; only commercial-source-identifying use
   is protected.
4. **Doesn't extend to logo.** Wordmark only; the visual identity
   would need a separate design-mark filing if you want it protected.

---

## Recommended attorneys (if you change your mind)

If you'd rather not self-file:

- **Trademark Engine** (trademarkengine.com) — flat-fee package
  ~$199 + USPTO fee; suitable for clean, no-conflict marks.
- **LegalZoom** — flat-fee ~$199 + USPTO; reasonable but slow.
- **A solo IP attorney** — typically $800–1500 flat for filing.
  Worth it if the TESS search surfaces ANY conflict that needs
  argument.

---

## Quick action list

- [ ] Run the 5 free pre-checks (TESS, EUIPO, UKIPO, domain, social)
- [ ] Take 3 specimen screenshots (home, GitHub, editor)
- [ ] Find earliest first-use date via `git log --reverse | head`
- [ ] Sign in to TEAS Plus at <https://teas.uspto.gov/>
- [ ] File the wordmark in class 9 (~$250)
- [ ] Set a calendar reminder for 6 months out (office-action response window)
- [ ] Update README footer with "Patens™" until registered, then "Patens®"
- [ ] Add registered trademark notice to `/about` once registered

---

Last updated: 2026-05-25.
