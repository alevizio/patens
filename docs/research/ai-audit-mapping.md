# AI Audit Mapping — Patens

**Question.** Of Patens's 94 deterministic audit codes, which are most amenable to AI vision-model "second-opinion" augmentation, and which are best served by the existing geometric algorithm alone? This document classifies all 94 codes, identifies the strongest vision-augmented candidates, designs an empirical methodology to measure agreement between AI judgment and the deterministic audit, predicts failure modes, evaluates the 30 fixable codes, and grounds everything in the existing typography-perception and VLM-evaluation literature.

**Audience.** The Patens maintainer (one person, solo). The methodology is runnable on a laptop with Anthropic credits and a weekend.

**Confidence legend.**
- ✅ confirmed — prior research or Patens code validates the claim
- ⚠️ likely — reasoned from first principles, untested
- ❓ uncertain — speculation; flag for the methodology to actually answer

---

## Section 1 — Categorization of all 94 audit codes

Four buckets:

- **Algorithm-Only.** Deterministic check is correct; AI adds noise.
- **Vision-Augmented.** Algorithm finds the issue mechanically; AI confirms whether it is perceptually noticeable.
- **Vision-Primary.** AI vision is genuinely better than the algorithm. Code should be augmented or replaced by perception.
- **LLM-Augmented.** Reasoning is over text/semantics, not pixels — a language model (not necessarily vision) helps.

### Family 1 — Contour shape (9 codes)

| Code | Bucket | Why |
|---|---|---|
| `empty` | Algorithm-Only | Boolean: zero contours. No perceptual content. ✅ |
| `off-grid-points` | Algorithm-Only | Coordinate `% 1 !== 0`. Sub-pixel — VLMs cannot see this; literally below their input resolution. ✅ ([Texture or Semantics?](https://arxiv.org/pdf/2503.23768)) |
| `duplicate-points` | Algorithm-Only | Sub-fu distance. Invisible. ✅ |
| `self-intersecting` | **Vision-Augmented** | Geometric test catches every crossing; VLM confirms whether the overlap is rendered as a visible artefact at body-text size (some self-intersections are aesthetic, e.g. ampersand crossings — false positive in `audit.ts`). ⚠️ |
| `contour-winding-collision` | **Vision-Augmented** | The geometric check is correct, but the rendered output (counter fills as black instead of hole) is the actual user-visible bug. VLM can confirm the rendered counter is filled. ⚠️ |
| `near-collinear-points` | Algorithm-Only | 1fu distance — sub-pixel for any sane display. ✅ |
| `sharp-kink` | **Vision-Primary** | 5–25° turn angle is a heuristic proxy for "looks wrong." Whether a 12° turn reads as a kink or as a deliberate flat-spot depends on stroke weight, surrounding contour curvature, and intended style (sans-serif terminal vs. broken-nib calligraphic). Type designers judge this perceptually; geometric threshold has many false positives in display faces. ⚠️ |
| `open-contour` | Algorithm-Only | Topological. Boolean: last point connects to first or it doesn't. ✅ |
| `tiny-contour` | **Vision-Augmented** | Geometric flag (8fu bbox) is fine, but distinguishing artefact-from-boolean vs. intentional dot/tittle requires interpretation — VLM can confirm whether the contour looks like part of the design (e.g. the tittle on `i`) or like junk. ⚠️ |

### Family 2 — Vertical metrics + topology (10 codes)

The Patens catalogue calls this "Vertical metrics" plus the related "Metric alignment" group. Combined: cap-above-ascender, x-above-cap, descender-nonnegative, zero-height, asc/desc/gap mismatch (×3), use-typo-off, win-clip-top, win-clip-bottom.

| Code | Bucket | Why |
|---|---|---|
| `metrics-cap-above-ascender` | Algorithm-Only | Integer comparison in the head/OS-2 tables. ✅ |
| `metrics-x-above-cap` | Algorithm-Only | Same. ✅ |
| `metrics-descender-nonnegative` | Algorithm-Only | Sign check. ✅ |
| `metrics-zero-height` | Algorithm-Only | `== 0`. ✅ |
| `metrics-asc-mismatch` | Algorithm-Only | Integer equality between OS/2 and hhea. ✅ |
| `metrics-desc-mismatch` | Algorithm-Only | Same. ✅ |
| `metrics-gap-mismatch` | Algorithm-Only | Same. ✅ |
| `metrics-use-typo-off` | Algorithm-Only | Bit flag. ✅ |
| `metrics-win-clip-top` | **Vision-Augmented** | Algorithm finds the head-table inequality; VLM can render text and confirm whether ascenders actually clip on a Windows rasterisation simulation. ⚠️ |
| `metrics-win-clip-bottom` | **Vision-Augmented** | Same as top. ⚠️ |

Note: `xheight-misaligned` and `capheight-misaligned` (sit in "Metric alignment" in the catalogue) are the most interesting **vision-augmented** candidates in this neighbourhood — see Section 2.

### Family 3 — Spacing + sidebearings (8 codes)

| Code | Bucket | Why |
|---|---|---|
| `zero-advance` | Algorithm-Only | `== 0`. ✅ |
| `overflows-advance` | **Vision-Augmented** | Geometric overlap test finds every overflow; VLM confirms whether the overlap is visibly disruptive in running text vs. a benign 2fu graze. ⚠️ |
| `extends-above-ascender` / `extends-below-descender` | **Vision-Augmented** | Same logic as the win-clip codes. ⚠️ |
| `sidebearing-deeply-negative-lsb/rsb` | Algorithm-Only | `< -100`. The catalogue copy already documents legitimate use cases; the issue is the threshold, not vision. ✅ |
| `sidebearing-class-drift-lsb/rsb` | Algorithm-Only | Median deviation. Statistical, not perceptual. ✅ |
| `kerning-extreme` | **Vision-Augmented** | Algorithm finds `|pair| > advance/2`; VLM rendering "AV" or "Ty" confirms the spacing is broken vs. intentionally extreme (display headlines). ⚠️ |

### Family 4 — OpenType invariants (11 codes)

OpenType invariants in Patens map to: composite-missing-base, composite-cycle, feature-kern-disabled-with-pairs, kerning-pair-self, kerning-class-singleton, class-empty, class-missing-member, class-name-format, pair-missing-glyph, pair-orphan-class, duplicate-glyph-name.

All 11 are **Algorithm-Only** — they are reference-integrity checks, graph topology, string-equality, or feature-flag bits. AI cannot improve any of them. ✅

### Family 5 — Naming + metadata (13 codes)

| Code | Bucket | Why |
|---|---|---|
| `naming-family`, `naming-style`, `naming-version` | Algorithm-Only | Empty-string check. ✅ |
| `naming-family-long`, `naming-family-chars` | Algorithm-Only | Length / regex. ✅ |
| `naming-designer-missing`, `naming-copyright-missing`, `naming-license-missing` | Algorithm-Only | Presence check. ✅ |
| `meta-no-copyright`, `meta-no-designer`, `meta-no-designer-url`, `meta-no-license`, `meta-no-license-url`, `meta-no-manufacturer` | Algorithm-Only | Presence. ✅ |
| `meta-no-vendor-id`, `meta-vendor-id-invalid` | Algorithm-Only | Length / charset. ✅ |
| `meta-version-format` | Algorithm-Only | Regex. ✅ |
| `glyph-name-empty`, `glyph-name-invalid`, `glyph-name-too-long` | Algorithm-Only | String. ✅ |
| `duplicate-glyph-name` | Algorithm-Only | Set-equality. ✅ |
| `glyph-name-not-canonical` | **LLM-Augmented** | The AGLFN mapping is a lookup table — but proposing a canonical name for a glyph the table doesn't cover (e.g. a stylistic alternate, a non-Latin glyph the user added) is a naming-policy judgment call. LLM can suggest `a.alt` vs `a.salt` vs `a.cv01` consistently with the rest of the project's naming scheme. ⚠️ |

### Family 6 — Coverage (7 codes)

The catalogue has 7 coverage-adjacent codes: typo-essentials, latin-1-supp, currency, math, glyph-count-low, control-glyphs-missing, figures-non-tabular.

| Code | Bucket | Why |
|---|---|---|
| `coverage-typo-essentials`, `coverage-latin-1-supp`, `coverage-currency`, `coverage-math` | Algorithm-Only | Set membership against fixed codepoint lists. ✅ |
| `glyph-count-low`, `control-glyphs-missing` | Algorithm-Only | Count + set check. ✅ |
| `figures-non-tabular` | **Vision-Augmented** | Algorithm finds the unequal advances; VLM rendering a column of numbers confirms the misalignment is visible at table scale. (Mostly the algorithm is sufficient; VLM only adds value for an "explain why this matters" pass.) ⚠️ |

### Family 7 — Anchors (4 codes)

mark-no-prefix, base-with-prefix, anchor-without-partner, anchors-missing.

All 4 are **Algorithm-Only** — string-prefix checks and set-membership against `_name` partners. ✅

### Family 8 — Variable fonts (9 codes)

master-contour-count, master-point-count, master-axis-unknown, master-axis-out-of-range, master-axis-missing, master-empty, axis-range-invalid, master-orphan-axis, master-out-of-range, instance-orphan-axis, no-instances.

| Code | Bucket | Why |
|---|---|---|
| Contour/point count, axis-unknown, axis-out-of-range, axis-missing, master-empty, axis-range-invalid, orphan-axis (×2), out-of-range, no-instances | Algorithm-Only | Topological / set / numeric. ✅ |
| `master-contour-count` (when masters disagree visually) | **Vision-Augmented** | The count mismatch is mechanical; but for diagnostic UX, VLM can render the broken interpolation midpoint and show the user what's wrong, not just report a count. ⚠️ |

### Family 9 — Color fonts · brief · misc (23 codes)

This bucket pools: palette-length-mismatch, color-layer-no-palette, color-layer-out-of-range, brief-no-intent, brief-no-design-notes, upm-unusual, notes-todo, flagged-for-review, plus the unique remaining codes from kerning-classes (`kerning-no-classes`, `sidebearings-no-classes`), plus the 4 coverage codes already covered above.

| Code | Bucket | Why |
|---|---|---|
| `palette-length-mismatch`, `color-layer-no-palette`, `color-layer-out-of-range` | Algorithm-Only | Counts, presence, range. ✅ |
| `brief-no-intent`, `brief-no-design-notes` | **LLM-Augmented** | Presence is binary; *quality* of the brief is what the designer cares about. An LLM can read the intent ("a geometric sans for product UI at 14px+") and check whether downstream decisions (UPM, x-height, contour direction) are coherent with it. ⚠️ |
| `upm-unusual` | Algorithm-Only | Range. ✅ |
| `notes-todo`, `flagged-for-review` | Algorithm-Only | Substring / boolean flag. ✅ |
| `kerning-no-classes`, `sidebearings-no-classes` | Algorithm-Only | Count threshold. ✅ |

**Family-level summary:**

| Family | Algorithm-Only | Vision-Aug | Vision-Primary | LLM-Aug |
|---|---|---|---|---|
| Contour shape | 5 | 3 | 1 | 0 |
| Vertical metrics + topology | 8 | 2 | 0 | 0 |
| Spacing + sidebearings | 4 | 4 | 0 | 0 |
| OpenType invariants | 11 | 0 | 0 | 0 |
| Naming + metadata | 18 | 0 | 0 | 1 |
| Coverage | 6 | 1 | 0 | 0 |
| Anchors | 4 | 0 | 0 | 0 |
| Variable fonts | 10 | 1 | 0 | 0 |
| Color · brief · misc | 9 | 0 | 0 | 2 |
| **Total** | **75** | **11** | **1** | **3** |

(Code counts skew toward 94 in the prompt vs. 92 enumerated in `audit-catalogue.ts` because two metric-alignment codes and `anchor-without-partner` are sometimes counted as siblings. Adjust the totals when the catalogue stabilises.)

---

## Section 2 — Top 10 vision-model second-opinion candidates

Ranked by "value added × frequency of fire × deterministic-noise-rate." Higher rank = where AI confirmation most helps a designer.

### 1. `xheight-misaligned` (Metric alignment)

- **Why vision is complementary.** Algorithm flags any lowercase whose top falls below x-height by > N units. But what matters is *perceptual* drift: a 6fu drop on a high-contrast roman is invisible; the same 6fu on a low-contrast sans is conspicuous. Designers literally trust their eyes ([FontForge — Trusting Your Eyes](http://designwithfontforge.com/en-US/Trusting_Your_Eyes.html)). ✅
- **Prompt template.**
  > Here is a rendered word using the typeface in question. The lowercase letter `{glyph}` has been measured as sitting `{delta}fu` below the project's stated x-height of `{xheight}` (UPM `{upm}`). Looking at the rendered word at body-text size (14px), does the top of `{glyph}` look misaligned relative to its neighbours? Answer: visible / borderline / invisible, then one sentence why.
- **Disagreement modes.** AI confirms most "visible" calls but dissents on display-italic, x-height-deliberate-rough faces, and faces where overshoot policy varies by letter.
- **Agreement metric.** Cohen's kappa against a 3-designer panel (κ > 0.6 = substantial, target). Plus precision@`visible` since the deterministic audit's false-positive rate on display faces is the actual designer pain.

### 2. `sharp-kink` (Contour shape)

- **Why vision is complementary.** A 5–25° turn threshold has high precision on text faces and high false-positive rate on broken-nib, calligraphic, and intentionally-faceted display faces.
- **Prompt template.**
  > Here is a zoomed render of glyph `{glyph}` with the suspect angle highlighted in red. Is this corner a designed feature or an unintended kink? Answer: feature / kink / ambiguous, then one sentence.
- **Disagreement modes.** AI will say "feature" for any face that reads as deliberately rough (Cooper Hewitt-style, blackletter, brush). Algorithm fires regardless.
- **Agreement metric.** Cohen's kappa + per-category breakdown (text vs. display).

### 3. `kerning-extreme` (Kerning)

- **Why vision is complementary.** Algorithm flag is `|pair| > advance/2`. Display headline kerning legitimately uses these values (e.g. negative letter-spacing in a logotype). VLM rendering `{left}{right}` at 96px confirms the result.
- **Prompt template.**
  > Here is the kerning pair `{L}{R}` rendered at 96px using its actual kerning value `{value}fu`. Does the spacing look broken (letters touching, overlap, awkward gap) or intentional (tight display setting)? Answer: broken / intentional / borderline.
- **Disagreement modes.** AI will dissent on display projects where extreme kerning is the design.
- **Agreement metric.** Precision against designer ground truth, broken out by `project.intent` keyword (display vs. text).

### 4. `overflows-advance` (Spacing)

- **Why vision is complementary.** A 2fu overflow on a `j` descender that tucks under the next glyph's space is fine. A 30fu overflow is a bug. VLM judges the rendered text.
- **Prompt template.**
  > Here is `{glyph}` followed by a typical neighbour `{neighbour}` rendered at 24px. Does the right edge of `{glyph}` collide with `{neighbour}`? Answer: collision / clearance / borderline.

### 5. `capheight-misaligned` (Metric alignment)

- Same shape as `xheight-misaligned`, applied to uppercase. Often more forgiving perceptually because the eye is less attuned to caps-line evenness in mixed-case text. Worth the second opinion to suppress noise on borderline cases.

### 6. `contour-winding-collision` (Contour shape)

- **Why vision is complementary.** The mechanical check is correct, but designers benefit from seeing the *rendered* failure (counter fills black). VLM acts as a confirmation rasteriser: "Yes, the rendered glyph has a filled counter — here's the screenshot."
- This is more "vision-as-renderer" than "vision-as-judge," but it elevates the audit message from "winding wrong" to "your `o` will look like a blob."

### 7. `self-intersecting` (Contour shape)

- **Why vision is complementary.** Some glyphs (`&`, decorative ligatures, swashes) legitimately self-intersect by design. VLM can distinguish "the crossing is the design" vs. "the crossing is an artefact." ⚠️
- Prompt: render at 64px, ask whether the intersection looks like a design feature or a bug.

### 8. `extends-above-ascender` / `extends-below-descender` (Spacing)

- **Why vision is complementary.** Diacritics on capital letters routinely extend above the OS/2 ascender; the question is whether the chosen ascender value will cause real clipping in target apps. VLM can simulate the clipping by rendering at a known line-height.

### 9. `figures-non-tabular` (Glyph count)

- **Why vision is complementary.** Algorithm finds the advance-width variance; VLM rendering a 3-column number table makes the misalignment legible to the designer. Useful for the explain pass, not for changing the verdict.

### 10. `tiny-contour` (Contour shape)

- **Why vision is complementary.** Distinguishes "stray artefact" (the typical case) from "this is the tittle on `i`" or "this is a deliberate decorative dot." Reduces false positives on already-finished glyphs.

**Aggregate methodology note.** For all 10 candidates, the agreement metric should be **Cohen's kappa against a 3-designer panel ground truth, with precision/recall reported separately so the maintainer can see the *direction* of the disagreement** (false positives vs. false negatives) — not just the joint number. Kappa thresholds: κ > 0.6 substantial, κ > 0.8 excellent ([Number Analytics — Cohen's Kappa](https://www.numberanalytics.com/blog/cohens-kappa-explained-inter-rater-analysis)).

---

## Section 3 — Methodology for empirical measurement

A protocol Patens can run solo with ~$50 of Anthropic credits and a weekend.

### 3.1 Sample selection

Three tiers (small `N` to keep the cost realistic):

- **Tier A — Canonical (10 fonts).** Inter, Source Sans, IBM Plex, Roboto, Recursive, Public Sans, Noto Sans, Cooper Hewitt, Adobe Source Serif, JetBrains Mono. Open-source, high-quality, well-reviewed. Expected vision-audit agreement: very high on the few real issues these contain (they pass Font Bakery cleanly). Use these to bound the false-positive rate.
- **Tier B — Proprietary "good" (5 fonts).** Whatever the maintainer can legally include — Söhne, GT America, Mona Sans, Untitled Sans, ABC Diatype. Tests whether vision models recognise foundry-grade quality.
- **Tier C — Novice / WIP (10 fonts).** Patens-built projects from early users, Google Fonts review-rejects, intentional broken-by-design test fixtures. This is where the audit actually earns its keep — and where VLM judgment matters most.

Total: 25 fonts × 94 codes × N triggered findings.

### 3.2 Vision model selection

Run claude-opus-4-7 as the primary; comparison with **Gemini-3-Flash** and **GPT-5.2** as secondaries. On the FRB font-recognition benchmark, Gemini-3-Flash leads at 40.5%, Claude-Sonnet-4.6 at 22.9%, GPT-5.2 at 20.8% ([Texture or Semantics?](https://arxiv.org/pdf/2503.23768)). Opus 4.7 has not been on FRB but its 2576px input ([Claude Vision docs](https://platform.claude.com/docs/en/build-with-claude/vision)) gives it an advantage on dense glyph imagery.

Three-model comparison lets the maintainer report:

- Per-code accuracy per model
- Inter-model agreement (Fleiss' kappa)
- Whether disagreement between models is itself a signal of "this is genuinely a perceptual edge case"

### 3.3 Prompt engineering

- **Zero-shot baseline.** Run each candidate code with the prompt template from Section 2.
- **Few-shot type-designer-style.** Add 3 worked examples per code: one clear pass, one clear fail, one borderline. Examples should be drawn from canonical typefaces (e.g. the `a` from Inter Regular as the "x-height aligned" exemplar).
- **Chain-of-thought.** For codes where prior VLM benchmarks show CoT helps (contour shape, kerning). Note: the [Texture or Semantics? paper](https://arxiv.org/pdf/2503.23768) found CoT *does not* significantly help font recognition. Apply CoT only where the task is judgment, not recognition.

### 3.4 Gold-standard labelling

The bottleneck. Three options, ordered by realism:

1. **The maintainer alone (Tier C only).** Self-label the novice fonts. Fast, biased, but enough to bound the agreement metric on the codes that fire. Realistic for a weekend.
2. **One external designer.** Recruit one type designer (e.g. from the TypeCon network) to label 50 findings across the 10 vision-augmented codes. Pay $200 for an evening. Compute kappa against the maintainer.
3. **3-designer panel (aspirational).** Three designers, 100 findings each, majority vote = ground truth. Compute kappa for each pair; report Fleiss' kappa. This is the "real" version of the experiment. ⚠️

Recommend: start with (1) on Tier C, then if results look promising, do (2) before public claims.

### 3.5 Statistical methodology

- **Per-code agreement.** Cohen's kappa between deterministic audit and VLM, then between each rater pair on the ground-truth panel.
- **Confidence intervals.** Bootstrap (1000 resamples) at the per-code level. Report median + 80% CI. With ~50 findings per code, CIs will be wide — be honest. ⚠️
- **Multiple-comparison problem.** 94 codes × 25 fonts × 3 models = 7,050 cells. Don't claim "this code is significantly better than the others" without Bonferroni or Benjamini-Hochberg correction. For an exploratory writeup, simply report all kappas with CIs and let the reader judge.
- **Stratify.** Always break results out by "text-face vs. display-face" — the prior literature ([Tim Ahrens, Size-specific adjustments](https://justanotherfoundry.com/size-specific-adjustments-to-type-designs)) suggests perceptual judgments split sharply on this axis.

### 3.6 Cost estimation

- **Vision calls.** ~50 findings per candidate code × 10 vision-augmented codes × 3 models = 1,500 calls. At Claude Opus 4.7 vision ($0.015 input + $0.075 output for ~500-token responses) ≈ $0.04 per call → **~$60** for the primary model. Gemini Flash + GPT-5.2 are cheaper; whole comparison fits in **~$100**.
- **Image generation.** Render PNGs locally via `harfbuzz-shaped` outlines + `resvg`. Zero cost, ~2 hours to script. Patens already has an SVG render pipeline in `src/lib/font/`. ✅
- **Time.** Weekend 1 — pipeline + canonical fonts. Weekend 2 — proprietary + novice + analysis. Total: 4 days elapsed, ~16 hours active.

---

## Section 4 — Edge cases AI is likely to hallucinate

Per family, the predicted failure modes for VLMs. These are the things the methodology in §3 must actively look for, not assume away.

### Contour shape

- ⚠️ VLMs will report "sharp kink" on intentionally faceted display faces. CoT does not save them ([Texture or Semantics?](https://arxiv.org/pdf/2503.23768)).
- ⚠️ VLMs will mark **designed-in overshoot** (round letters extending below baseline) as `extends-below-descender`. This is the most predictable failure — overshoot is a 500-year-old convention ([Wikipedia, Overshoot](https://en.wikipedia.org/wiki/Overshoot_(typography))) but vision models, trained on rasterised images, infer from pixels, not from baseline metadata. The prompt MUST include the baseline as an annotation in the rendered image, or VLMs will routinely confuse correction for bug.
- ❓ VLMs will probably confuse **alternates** (`a.alt`, `g.ss01`) with the base glyph and report them as "x-height misaligned" because they don't share the body shape. Mitigation: pass glyph name in the prompt, instruct the model to expect alternates.

### Vertical metrics + topology

- ⚠️ VLMs cannot read OS/2 vs. hhea tables — they see only rendered images. Asking them about `metrics-asc-mismatch` is a category error; keep these algorithm-only.
- ⚠️ Win-clip codes: VLMs will hallucinate clipping that isn't there because their rasteriser is not Windows GDI. Mitigation: render with a known clipping mask, ask only "is there clipping in *this* image?"

### Spacing + sidebearings

- ⚠️ VLMs will report `kerning-extreme` on pairs that have wide natural sidebearings but no kerning (e.g. `Vo` in many text faces). The optical gap looks the same as a kerning bug. Prompt must include the actual kerning value, not just the rendered pair.
- ❓ VLMs may confuse italic side-bearings (modestly negative) with bugs. Mitigation: pass `slant` / style in the prompt.

### OpenType invariants

- All algorithm-only — VLMs cannot read the tables. Don't run vision here.

### Naming + metadata

- ⚠️ LLM (not vision) on `glyph-name-not-canonical` will hallucinate canonical names. Constrain to AGLFN + the project's existing naming convention; reject suggestions outside.
- ⚠️ LLM on `brief-no-intent` will write generic intents ("a typeface for modern use"). Mitigation: ask the LLM to *evaluate* an intent the user writes, not to write one from scratch.

### Coverage

- ⚠️ VLMs will misclassify visually-similar codepoints (e.g. `ƒ` vs `f`, `μ` vs `µ`). Coverage is best left to set membership.

### Anchors

- Algorithm-only — VLMs cannot see anchor positions absent annotation.

### Variable fonts

- ⚠️ When asked to compare two masters visually, VLMs may report differences that come from *intentional* axis interpolation (e.g. weight axis changes contour count for ink traps). Mitigation: only render at compatible axis locations.

### Color fonts · brief · misc

- ⚠️ VLMs will mis-grade brief quality, biased toward "more is better" — they prefer long intents to terse ones, but a terse "a geometric sans for product UI at 14px+" is *better* than a flowery paragraph. Calibrate with type-designer examples in few-shot.

---

## Section 5 — The 30 fixable codes: should AI propose fixes?

Patens currently surfaces one-click Fix buttons on a curated subset of codes. From `audit-catalogue.ts`, the explicit fixable set is:

```
self-intersecting, duplicate-points, near-collinear-points,
contour-winding-collision, off-grid-points, open-contour,
zero-advance, overflows-advance, anchor-naming-mark-no-prefix,
anchor-naming-base-with-prefix, tiny-contour
```

That's 11 in the current build. The prompt's "30 fixable codes" likely includes the in-progress metadata/naming auto-fixes (insert AGLFN name, set vendor ID to `NONE`, snap version to `M.mmm`, populate empty fields). Below evaluates the full plausible set:

### Deterministic fix is correct; AI should NOT propose alternatives

- `off-grid-points` — round to integer. One right answer. ✅
- `duplicate-points` — remove the duplicate. One right answer. ✅
- `open-contour` — close the path. One right answer (insert `Z` at the end). ✅
- `near-collinear-points` — remove the middle. One right answer. ✅
- `zero-advance` — set to the bbox width + default sidebearings. Deterministic. ✅
- `duplicate-glyph-name` — append `.alt` until unique. Deterministic naming policy. ✅
- `anchor-naming-*` — add/remove `_` prefix. Deterministic. ✅
- `glyph-name-invalid` — strip disallowed characters. Deterministic. ✅
- `class-name-format` — prepend `@`. Deterministic. ✅

### Deterministic fix is right but AI alternatives are valuable

- `self-intersecting` — deterministic fix runs a boolean union, which *removes* the design feature in cases where the intersection is intended. AI alternative: "Keep the intersection as design (no fix), or split into two contours, or boolean-union." Surface as a 3-way choice. ⚠️
- `contour-winding-collision` — deterministic fix reverses the inner contour. AI alternative: confirm which contour the designer *wants* to be the counter (visual diff). Worth a confirmation step on glyphs with > 2 contours.
- `tiny-contour` — deterministic fix deletes. AI alternative: "Is this a tittle? Keep. Stray? Delete." 2-way choice with vision confirmation.
- `overflows-advance` — deterministic fix bumps the advance. AI alternative: "Pull the right edge in (preserves spacing), or bump the advance (preserves shape)." Designer choice.
- `kerning-extreme` (if it becomes fixable) — deterministic fix clamps to threshold; AI alternative: "Was this a typo (suggest `-50` not `-500`), or intentional display kern (keep)?" Worth asking.
- `xheight-misaligned` (if fixable) — deterministic fix nudges to x-height; AI alternative: "Snap to x-height, or add an overshoot (round shapes), or keep (designed-in low x-height)." Three-way.
- `figures-non-tabular` — current "Tabularise 0–9" is correct. AI alternative: which digit width to target (max, median, custom). LLM can read brief intent and suggest.

### AI fixes would be dangerous

- `composite-cycle` — fixing requires knowing the designer's intent for the cycle. AI guess could lose work. Keep manual. ✅
- `master-axis-out-of-range` — AI fix could silently re-locate masters in designspace; user-facing data loss. Keep manual. ✅
- Any vertical-metric mismatch — Windows vs. Mac line-height implications make this a designer-policy choice, not an AI choice. Keep manual. ✅
- License / copyright auto-fill — never. Legal text must be user-written. ✅

**Rule of thumb.** AI alternatives are valuable where the deterministic fix is **lossy** (boolean union, tabularise, snap). They are dangerous where the deterministic fix is **invariant-preserving** (close path, dedupe points).

---

## Section 6 — Existing research

What the prior literature actually says, and where Patens's contribution would be novel.

### What the literature has settled

- **VLMs have a "typography gap."** Two recent papers ([Reading ≠ Seeing](https://arxiv.org/pdf/2603.08497); [Texture or Semantics?](https://arxiv.org/pdf/2503.23768)) document that even frontier VLMs (Gemini-3-Flash, Claude-Sonnet-4.6, GPT-5.2) score 15–40% on font *recognition*. They are markedly better at color and size than at family or style, and CoT does not help. Implication for Patens: don't expect VLMs to *identify* the typeface family, but the task here is different — *judging local geometry* given the rendered image and ground-truth values — which is closer to chart-perception than family-classification. ✅
- **Type-design judgment is irreducibly perceptual.** Karen Cheng, *Designing Type* ([Yale](https://yalebooks.yale.edu/book/9780300111507/designing-type/)) and Tim Ahrens / Shoko Mugikura, *Size-specific Adjustments* ([Just Another Foundry](https://justanotherfoundry.com/size-specific-adjustments-to-type-designs)) both emphasise that algorithmic checks must be combined with trained-eye judgment. The FontForge handbook chapter [Trusting Your Eyes](http://designwithfontforge.com/en-US/Trusting_Your_Eyes.html) explicitly frames overshoot as "what looks right beats what is mathematically right." ✅
- **Existing automated QA = Font Bakery / Fontspector.** ([fonttools/fontbakery](https://github.com/fonttools/fontbakery), [ATypI presentation](https://atypi.org/presentation/font-bakery-automated-quality-assurance-checks-for-fonts/)) These are purely deterministic. There is no vision-augmented font-QA tool in production. Patens's 94-code module is the closest peer; vision augmentation would be genuinely novel. ✅
- **Inter-rater agreement methodology.** Cohen's kappa, Fleiss' kappa, Krippendorff's alpha — well-established for two-rater (kappa) vs. multi-rater (Fleiss/Krippendorff). ([Number Analytics](https://www.numberanalytics.com/blog/cohens-kappa-explained-inter-rater-analysis); [StatsTest](https://www.statstest.com/inter-rater-reliability-cohen-kappa-krippendorff-alpha); [Galileo](https://galileo.ai/blog/cohens-kappa-metric)). Confidence intervals via bootstrap.
- **AI-driven type generation exists but is separate from QA.** [Learning Perceptual Manifold of Fonts](https://arxiv.org/pdf/2106.09198), [AI-Driven Typography MDPI paper](https://www.mdpi.com/2078-2489/17/2/150), [Deep Factorization of Style and Structure](https://arxiv.org/pdf/1910.00748), [Scalable Font Reconstruction with Dual Latent Manifolds](https://arxiv.org/pdf/2109.06627). These are generative; none audit existing fonts.

### What is unknown (and what Patens's experiment would establish)

- ❓ Whether VLMs given **rendered glyph + ground-truth metric** can judge perceptual issues at designer-grade accuracy. Prior benchmarks test recognition (what font is this?), not judgment (is this x-height misaligned?).
- ❓ Whether the typography gap closes when the VLM is given a *narrow, well-bounded* task (e.g. compare two rendered glyphs side-by-side at body-text size).
- ❓ Whether three frontier models disagreeing is itself a useful signal for borderline cases.

### Adjacent work worth tracking

- **Aesthetic assessment of Chinese handwriting** ([arxiv 2603.26768](https://arxiv.org/pdf/2603.26768)) — closest prior art for "VLM judges typographic quality." Worth reading before running Patens's experiment.
- **Perception of Qualities in Typefaces** ([data review](https://www.researchgate.net/publication/373512460_The_Perception_of_Qualities_in_Typefaces_A_Data_Review)) — 34 studies on perceived typeface qualities; baseline for what dimensions designers actually judge on.

### Acknowledged gaps

- **No prior baseline on VLM agreement with type-design audits.** Patens's measurement would be first-of-kind, which means there's no prior expected-value to set a "this is acceptable" threshold against. Recommend: report raw kappas, leave threshold to the reader, and explicitly say "this is exploratory."
- **Sub-pixel measurement is below VLM resolution.** ✅ Confirmed across all current frontier models. Never delegate sub-pixel checks (`off-grid-points`, `duplicate-points`, `near-collinear-points`) to vision.
- **Optical correction recognition.** ⚠️ Strong reason to expect VLMs will mistake intentional overshoot for bugs. Mitigation in the prompt (annotate the baseline) is untested but plausible.

---

## Sources

- [Reading ≠ Seeing: Diagnosing and Closing the Typography Gap in Vision-Language Models](https://arxiv.org/pdf/2603.08497)
- [Texture or Semantics? Vision-Language Models Get Lost in Font Recognition](https://arxiv.org/pdf/2503.23768)
- [Aesthetic Assessment of Chinese Handwritings Based on Vision Language Models](https://arxiv.org/pdf/2603.26768)
- [Learning Perceptual Manifold of Fonts](https://arxiv.org/pdf/2106.09198)
- [AI-Driven Typography: A Human-Centered Framework (MDPI)](https://www.mdpi.com/2078-2489/17/2/150)
- [Few-shot Font Generation by Learning Style Difference and Similarity](https://arxiv.org/pdf/2301.10008)
- [A Deep Factorization of Style and Structure in Fonts](https://arxiv.org/pdf/1910.00748)
- [Scalable Font Reconstruction with Dual Latent Manifolds](https://arxiv.org/pdf/2109.06627)
- [Font Bakery — fonttools/fontbakery](https://github.com/fonttools/fontbakery)
- [Font Bakery ATypI presentation](https://atypi.org/presentation/font-bakery-automated-quality-assurance-checks-for-fonts/)
- [Fontspector (Font Bakery successor)](http://fontbakery.com/)
- [Karen Cheng, *Designing Type*, Yale University Press](https://yalebooks.yale.edu/book/9780300111507/designing-type/)
- [Tim Ahrens & Shoko Mugikura, *Size-specific Adjustments to Type Designs*](https://justanotherfoundry.com/size-specific-adjustments-to-type-designs)
- [Tim Ahrens — Typographica review](https://typographica.org/typography-books/size-specific-adjustments-to-type-designs/)
- [Design With FontForge — Trusting Your Eyes](http://designwithfontforge.com/en-US/Trusting_Your_Eyes.html)
- [Overshoot (typography) — Wikipedia](https://en.wikipedia.org/wiki/Overshoot_(typography))
- [Optical illusions and eye trickery in geometric font design — MyFonts](https://www.myfonts.com/a/font/content/optical-illusions-and-eye-trickery-in-geometric-font-design)
- [Why All Typefaces Are Optical Illusions — Fast Company](https://www.fastcompany.com/3042391/why-all-typefaces-are-optical-illusions)
- [The Perception of Qualities in Typefaces: A Data Review](https://www.researchgate.net/publication/373512460_The_Perception_of_Qualities_in_Typefaces_A_Data_Review)
- [Evaluating the quality of a typeface — Fontstand](https://fontstand.com/news/knowledge/evaluating-the-quality-of-a-typeface/)
- [Cohen's Kappa Explained — Number Analytics](https://www.numberanalytics.com/blog/cohens-kappa-explained-inter-rater-analysis)
- [Inter-Rater Reliability: Cohen's Kappa and Krippendorff's Alpha — StatsTest](https://www.statstest.com/inter-rater-reliability-cohen-kappa-krippendorff-alpha)
- [Enhancing AI Evaluation with Cohen's Kappa Metric — Galileo](https://galileo.ai/blog/cohens-kappa-metric)
- [Claude API — Vision documentation](https://platform.claude.com/docs/en/build-with-claude/vision)
- [Claude API — Models overview](https://platform.claude.com/docs/en/about-claude/models/overview)
- [Multimodal AI Face-Off: Claude, GPT-4V, Gemini in 2026](https://claude5.com/news/multimodal-ai-face-off-claude-gpt-4v-and-gemini-in-2026)
- [Vision Language Models Survey — arxiv 2501.02189](https://arxiv.org/html/2501.02189v3)
- [Benchmark Evaluations, Applications, and Challenges of Large VLMs (survey)](https://arxiv.org/html/2501.02189v3)
