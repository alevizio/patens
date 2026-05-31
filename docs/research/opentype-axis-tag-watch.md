# OpenType axis-tag registry watch

**Status:** Defensive research, last verified 2026-05-31.
**Owner:** Patens single-maintainer.
**Cadence:** Quarterly review of upstream; immediate review on any
new axis-tag registration appearing in the OpenType specification.

---

## Why this document exists

Patens hardcodes axis-tag knowledge in several places:

| File | What's hardcoded |
| --- | --- |
| `src/lib/stores/project.svelte.ts::generateConventionalInstances` | Standard value lists for `wght` (100–900), `wdth` (75/100/125), `ital` (0/1), `slnt` (0/-10). Anything outside this list falls back to the axis default. |
| `src/lib/stores/project.svelte.ts::defaultAxisValueName` | Convention-based STAT axis-value names. |
| `src/lib/font/audit.ts::preflightProject` (axis-range-extreme) | Range thresholds per tag: `wght > 800`, `wdth > 100`, `opsz > 50`, `slnt > 30`. |
| `src/lib/font/audit.ts::preflightProject` (opsz-without-cap-x-divergence) | Special-cases `opsz` as the only axis where "no distinct values across masters" is vacuous. |
| `src/lib/font/audit.ts::preflightProject` (stat-missing & STAT autogen) | Italic axis is special-cased as format-3 with linkedValue. |
| `src/lib/font/designspace.ts` | Round-trips arbitrary axis tags but the 5 registered tags get their convention treatment. |

If a new axis tag is registered upstream — or an existing
unregistered one (e.g. `XOPQ`, `YOPQ`, `XTRA`, `GRAD`, parametric
family) graduates to registered status — the hardcoded knowledge
above goes stale. Without this watch, Patens would silently produce
suboptimal STAT tables and conventional-instance sets for the new
axis until the next time a user notices and files an issue.

## Canonical sources

### Primary: OpenType specification, registered axes table

The current registered axes are defined in
[OpenType STAT spec § Axis tag registrations](https://learn.microsoft.com/en-us/typography/opentype/spec/dvaraxisreg)
(Microsoft Learn). The currently-registered axes are:

| Tag | Name | Patens convention values |
| --- | --- | --- |
| `ital` | Italic | 0, 1 |
| `opsz` | Optical Size | (no standard values — axis-range-driven) |
| `slnt` | Slant | 0, -10 |
| `wdth` | Width | 75, 100, 125 |
| `wght` | Weight | 100, 200, 300, 400, 500, 600, 700, 800, 900 |

**Last verified:** 2026-05-31. Microsoft's registered-axis table has
not added a new entry since the original 5.

### Secondary: Microsoft axis-tag proposal discussion repo

[microsoft/OpenTypeDesignVariationAxisTags](https://github.com/microsoft/OpenTypeDesignVariationAxisTags)
(45★). This is the **discussion / staging ground for proposed
registrations**. Last pushed 2023-06-02; the repo is dormant but the
issues thread has a 2025-05-30 update on the long-standing
"ital vs slnt" question.

#### Pending proposals as of 2026-05-31

These have been formally proposed but not registered. If any of these
register, Patens needs to update the hardcoded knowledge table above.

| Proposal | Tag | Status | What it affects |
| --- | --- | --- | --- |
| Type Network parametric axes | `XOPQ`, `YOPQ`, `XTRA`, `XTAS`, `XTDE`, `XTLC`, `XTUC`, `YTAS`, `YTDE`, `YTLC`, `YTUC` | Proposed 2018-07. **Not registered.** Used in production by Roboto Flex, Amstelvar. | `axis-range-extreme` thresholds; conventional-instance values; STAT axis-value generation. |
| Grade | `GRAD` | Proposed; appears in Roboto Flex despite non-registered status. | `defaultAxisValueName`; conventional-instance values (typically -200/0/200). |
| Height | `hght` | Proposed 2018-05. **Not registered.** | `defaultAxisValueName`; conventional-instance values. |
| Spacing | `spac` | Proposed 2018-05. **Not registered.** | `defaultAxisValueName`; range thresholds. |
| Glyph-Extension | `glex` | Proposed 2018-04. **Not registered.** | Range thresholds. |
| PPEM | `ppem` | Proposed 2017-12. Discussion stalled on UI/integer-range. **Not registered.** | Would require special-casing similar to `opsz`. |

The dormancy of the discussion repo (~5 years since most issues) is
itself a signal: the registered-axis set is **stable** for the
foreseeable future. New registrations are unlikely. But Roboto Flex
and Amstelvar's success has normalized using the parametric tags
*as if registered*, so Patens should treat the Type Network
parametric set as the most likely "next promotion."

### Tertiary: Roboto Flex + Amstelvar precedent

The two canonical parametric-axis fonts are:
- **Roboto Flex** — google/roboto-flex (Google Fonts).
- **Amstelvar** — TypeNetwork/Amstelvar; DJR maintains a fork at
  djrrb/AmstelvarNew with both Roman and Italic designspace files.

These ship with the parametric axes in production. Studying their
designspace files is the practical reference for what a
parametric-axis-aware Patens needs to support.

## What Patens should do

### Now (already done in shipped Patens)

1. ✅ Accept arbitrary axis tags at import (designspace round-trip).
2. ✅ Fall back to axis default when no convention is known.
3. ✅ Audit `axis-range-extreme` only fires on registered tags
   (custom axes are silent — Type Network parametrics correctly
   don't false-positive).
4. ✅ `generateConventionalInstances` falls back gracefully.

### When a new tag registers (defensive watchlist)

1. Add convention values to `standardValues` in
   `generateConventionalInstances`.
2. Add a range threshold to the `axis-range-extreme` check.
3. Add convention names to `defaultAxisValueName`.
4. Add an axis-tag entry to STAT autogen.
5. Bump `AUDIT_CATALOGUE.length` if a new tag-specific check ships
   with it.

### Review cadence

- **Quarterly:** check
  [microsoft/OpenTypeDesignVariationAxisTags/issues](https://github.com/microsoft/OpenTypeDesignVariationAxisTags/issues)
  + the [Microsoft Learn axis tag registry page](https://learn.microsoft.com/en-us/typography/opentype/spec/dvaraxisreg)
  for new entries.
- **On Roboto Flex update:** if Google Fonts ships a new axis on
  Roboto Flex, treat as de-facto registered for Patens purposes.

## Related Patens work

- `src/lib/font/audit.ts::preflightProject` — axis-range-extreme,
  opsz-without-cap-x-divergence, stat-missing, stat-format-mismatch,
  stat-instance-name-mismatch checks.
- `src/lib/stores/project.svelte.ts::generateConventionalInstances` —
  the new (2026-05-30) instance auto-generation method this watch
  was created to defend.
- `docs/research/variable-fonts-deep-dive.md` — the broader VF
  research artifact.
- `docs/research/variable-fonts-v2-implementation-plan.md` — the
  implementation backlog tracking what comes after the 102-code
  audit.

## Why DJR is in this picture

David Jonathan Ross maintains a 2018-vintage fork of the original
axis-tag proposal repo at
[djrrb/OpenTypeDesignVariationAxisTags](https://github.com/djrrb/OpenTypeDesignVariationAxisTags).
The fork is stale (no commits since 2018-07), but the fact that DJR
forked it at all reflects his historical involvement in the axis-tag
registration discussion — which is part of why he's listed as a
tier-1 outreach contact in `docs/launch/press-contacts.md` Section 3.
His Amstelvar fork (djrrb/AmstelvarNew) is one of two
production-quality references for parametric-axis fonts and a useful
benchmark for Patens designspace-import compatibility.
