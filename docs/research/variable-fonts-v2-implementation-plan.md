# Variable Fonts v2 — Implementation Plan

**Companion to** `variable-fonts-deep-dive.md` (the research foundation) **and** `ai-features-roadmap.md` (the AI feature roadmap).

**Goal:** lift Family 8 (variable-font compatibility) from **11 to 17 audit codes pre-launch** and **21 codes post-launch**, plus ship the **STAT editor** + **Designspace v5 round-trip** identified as Ranks 1-2 in the research.

This plan is paste-ready: each new code includes catalogue entry, category, severity, fixability, prose for `describeAuditCode()`, citation mapping ready for `matcher.ts`, and check-function pseudocode.

---

## Sequencing (TypeCon Aug 6-8 horizon)

| Order | Item | Estimated effort | Pre/Post-launch |
|---|---|---|---|
| 1 | 6 new pre-launch audit codes | ~2 days | Pre |
| 2 | STAT editor UI | ~3 days | Pre (stretch) |
| 3 | Designspace v5 round-trip | ~2 days | Pre (stretch) |
| 4 | 4 v2 audit codes | ~1 day each | Post |
| 5 | Master-placement guidance overlay | ~3 days | Post |
| 6 | Instance auto-generation from brief | ~2 days | Post |
| 7 | avar editor | ~3 days | Post |

If the Aug 4 Show HN is the only deadline that matters, prioritize **just the 6 new audit codes**. Each adds a public `/audit/[code]` page; the audit corpus grows 86 → 92 with citations. The STAT editor + Designspace can ship in v1.7 immediately post-launch.

---

## The 6 pre-launch audit codes — paste-ready

### 1. `stat-missing`

**Category:** `Variable-font compatibility` (existing — or new "STAT" category if you want subdivision)
**Severity:** `warn`
**Fixable:** `yes` (auto-generate minimal STAT from fvar instances)

**Catalogue entry:**
```ts
'stat-missing': { title: 'STAT table missing', category: 'Variable-font compatibility' },
```

**describeAuditCode() prose:**
> This variable font has no STAT (Style Attributes) table. OS font menus may display style names incorrectly — Windows will list "Bold Italic" as "Regular Bold Italic". STAT records the canonical names, default values, and italic-linkage for each axis. Patens can auto-generate a minimal STAT from your named instances.

**Citation map (paste into matcher.ts):**
```ts
[
  'stat-missing',
  [
    {
      citationId: 'opentype-spec:stat',
      anchor: '§ STAT — Style Attributes Table',
      gist: 'STAT records the canonical axis-value names and default values needed for proper variable-font display in OS font-pickers. Required for any production variable font.',
      score: 1.0
    }
  ]
],
```

**Check pseudocode (audit.ts):**
```ts
// In auditFamily.ts or new auditStat.ts
export const checkStatMissing = (project: Project): AuditIssue | null => {
  if (!project.familyAxes || project.familyAxes.length === 0) return null;
  if (project.stat && project.stat.designAxes.length > 0) return null;
  return {
    code: 'stat-missing',
    severity: 'warn',
    message: 'Variable font has no STAT table',
    glyph: null
  };
};
```

**Fix function (apply-fixes.ts):**
```ts
export const fixStatMissing = (project: Project): Project => {
  // Auto-generate STAT from familyAxes + namedInstances
  const stat = generateMinimalStatFromInstances(project.familyAxes, project.instances);
  return { ...project, stat };
};
```

---

### 2. `stat-format-mismatch`

**Severity:** `warn` · **Fixable:** `no`

**Catalogue:** `'stat-format-mismatch': { title: 'STAT format inconsistency', category: 'Variable-font compatibility' },`

**Prose:**
> STAT axis-value formats are inconsistent. Format 1 (single value with name), 2 (ranged value), 3 (linked italic-pair), and 4 (multi-axis instance name) have specific use cases. Using format 1 for italic linkage will not produce "Bold Italic" instead of "Regular Bold Italic" on Windows. Patens flags this when it detects italic axis-values without format-3 records.

**Citation:** `opentype-spec:stat` (§ AxisValueTables) — gist about format-specific use cases.

**Check pseudocode:**
```ts
export const checkStatFormatMismatch = (project: Project): AuditIssue[] => {
  if (!project.stat) return [];
  const italAxis = project.stat.designAxes.find((a) => a.tag === 'ital');
  if (!italAxis) return [];
  const italValues = project.stat.axisValues.filter((v) => v.axisIndex === italAxis.axisIndex);
  // Check: italic axis values should use format 3 (linkedValue)
  const wrongFormat = italValues.filter((v) => v.format !== 3);
  return wrongFormat.map((v) => ({
    code: 'stat-format-mismatch',
    severity: 'warn',
    message: `Italic STAT value uses format ${v.format} instead of format 3 (linked)`,
    glyph: null
  }));
};
```

---

### 3. `stat-instance-name-mismatch`

**Severity:** `warn` · **Fixable:** `yes` (rename instance)

**Catalogue:** `'stat-instance-name-mismatch': { title: 'STAT name does not match fvar instance name', category: 'Variable-font compatibility' },`

**Prose:**
> A STAT axis-value name doesn't match the corresponding fvar named-instance style name. Result: the OS may display the STAT-derived name in some apps and the fvar-derived name in others. Convention: keep them identical. Patens can apply the fvar names to the STAT records (or vice versa).

**Citation:** `opentype-spec:stat` (§ STAT/fvar coordination — see OT 1.8.2 spec note).

**Check pseudocode:** for each named instance, walk STAT and check if the constructed instance name (by combining the STAT axis-value names at the instance's location) equals the fvar name.

---

### 4. `axis-range-extreme`

**Severity:** `info` · **Fixable:** `no`

**Catalogue:** `'axis-range-extreme': { title: 'Axis range is very wide', category: 'Variable-font compatibility' },`

**Prose:**
> The {tag} axis range spans more than {threshold} units (wght > 800, wdth > 100, opsz > 50pt). Designers commonly draw extreme masters that don't interpolate cleanly through the middle of the range. Consider whether you have a designed master near the midpoint, or whether intermediate weights are extrapolation.

**Citation:** `opentype-spec:fvar` + `variablefonts-io-primer:designing` (already in corpus).

**Check pseudocode:**
```ts
const THRESHOLDS = { wght: 800, wdth: 100, opsz: 50, slnt: 30 };
export const checkAxisRangeExtreme = (project: Project): AuditIssue[] => {
  return project.familyAxes.flatMap((axis) => {
    const threshold = THRESHOLDS[axis.tag];
    if (!threshold) return [];
    const range = axis.maximum - axis.minimum;
    if (range <= threshold) return [];
    return [{
      code: 'axis-range-extreme',
      severity: 'info',
      message: `${axis.tag} axis spans ${range} units (recommended ≤ ${threshold})`,
      glyph: null
    }];
  });
};
```

---

### 5. `master-too-close`

**Severity:** `warn` · **Fixable:** `no`

**Catalogue:** `'master-too-close': { title: 'Two masters at nearly-identical locations', category: 'Variable-font compatibility' },`

**Prose:**
> Master '{a}' and master '{b}' sit within {percent}% of each other in designspace. Either one master is redundant, or you have a deliberately tight intermediate-master pair — confirm intent. Tight master pairs increase file size and rarely change rendered output.

**Citation:** New entry needed — best fit is `ufo-3-spec:designspace` (the designspace master-placement docs) or add the relevant Klim blog post as a `fair-use` source.

**Check pseudocode:**
```ts
const PROXIMITY_PERCENT = 5;
export const checkMasterTooClose = (project: Project): AuditIssue[] => {
  const masters = project.masters ?? [];
  const issues: AuditIssue[] = [];
  for (let i = 0; i < masters.length; i++) {
    for (let j = i + 1; j < masters.length; j++) {
      const distance = euclideanDistance(masters[i].location, masters[j].location);
      const maxRange = computeMaxAxisRange(project.familyAxes);
      if (distance / maxRange < PROXIMITY_PERCENT / 100) {
        issues.push({
          code: 'master-too-close',
          severity: 'warn',
          message: `Master ${masters[i].name} and ${masters[j].name} are within ${PROXIMITY_PERCENT}% of each other`,
          glyph: null
        });
      }
    }
  }
  return issues;
};
```

---

### 6. `axis-default-not-at-master`

**Severity:** `warn` · **Fixable:** `yes` (add master at default location)

**Catalogue:** `'axis-default-not-at-master': { title: 'Default location has no master', category: 'Variable-font compatibility' },`

**Prose:**
> The default location ({tag}={default}) has no drawn master. The font's identity at the default location is computed by interpolation rather than designed. Convention: place at least one master at the default location of every axis.

**Citation:** `opentype-spec:fvar` (§ Default location requirements).

**Check pseudocode:**
```ts
export const checkAxisDefaultNotAtMaster = (project: Project): AuditIssue | null => {
  if (!project.familyAxes || project.familyAxes.length === 0) return null;
  const defaultLocation = Object.fromEntries(
    project.familyAxes.map((a) => [a.tag, a.default])
  );
  const masters = project.masters ?? [];
  const hasDefaultMaster = masters.some((m) =>
    project.familyAxes.every((axis) => m.location[axis.tag] === axis.default)
  );
  if (hasDefaultMaster) return null;
  return {
    code: 'axis-default-not-at-master',
    severity: 'warn',
    message: 'No master at default location',
    glyph: null
  };
};
```

**Fix function:**
```ts
export const fixAxisDefaultNotAtMaster = (project: Project): Project => {
  const defaultLocation = Object.fromEntries(
    project.familyAxes.map((a) => [a.tag, a.default])
  );
  // Find closest existing master, duplicate it at default location
  const closest = findClosestMaster(project.masters, defaultLocation);
  const newMaster: Master = {
    ...closest,
    name: 'Default',
    location: defaultLocation
  };
  return { ...project, masters: [...project.masters, newMaster] };
};
```

---

## The 4 post-launch audit codes (v2)

### 7. `non-compatible-glyph`

Extends `master-contour-count` to also catch direction-and-component mismatches. Same family/category.

### 8. `interpolation-collapse`

Detects glyphs whose interpolated midpoint has fewer-than-expected visible features. Requires rendering the midpoint and computing the perceptual area — heavy, post-launch.

### 9. `opsz-without-cap-x-divergence`

Detects opsz axes that don't actually produce visible optical-size compensation across the axis range. Requires comparing cap-height + x-height + stroke contrast across masters.

### 10. `instance-at-master-position` (informational)

Complement to `master-not-at-named-instance`. Informational only — no action needed.

---

## STAT editor UI (Rank 2, pre-launch stretch)

**Goal:** UI for editing the STAT table that Patens already shapes (`project.stat`).

**Surface:** `/project/[id]/designspace` — add a new panel "STAT" below the existing axes editor.

**Components:**
- Per-axis: a row showing the axis tag + default value editor + axis-values list
- Per-axis-value: row showing format (1/2/3/4 select), name, value, linked-value (if format 3)
- "Generate from instances" button — auto-creates minimal STAT from the fvar instances
- "Validate" button — runs the 3 STAT audit codes (stat-missing, stat-format-mismatch, stat-instance-name-mismatch)

**Implementation pattern:** Mirror the existing `FvarAxesPanel.svelte` component. New `StatPanel.svelte`. State managed via `projectStore.updateStat(updater)`.

**Time estimate:** 2-3 days, including the STAT type definitions if they don't exist yet.

---

## Designspace v5 import + export (Rank 3, pre-launch stretch)

**Goal:** Round-trip with .designspace XML files used by Glyphs, FontLab, RoboFont, Fontmake.

**Surface:**
- Home page: "Import .designspace" alongside the existing "Import .font.json"
- Export panel: "Designspace v5 (XML)" as a new export format

**Implementation:**
- New module `src/lib/font/designspace.ts`
- Use `xml-parser` (already a dependency) or `fast-xml-parser` (lightweight)
- Map: `<axis>` → `FamilyAxis`, `<source>` → `Master` (with `location` → `VariationLocation`), `<instance>` → `VariableInstance`
- Designspace v5 adds `<discreteAxis>`, `<rules>`, `<stat>` — translate STAT records to/from Patens's `FamilyAxes`

**Test:**
- Round-trip the Inter v4 designspace (open-source, widely used)
- Round-trip the Recursive designspace
- Round-trip a 2-axis test fixture

**Time estimate:** 2 days. Patens's architecture maps almost 1:1 to designspace v5.

---

## Files that need updating

For the 6 pre-launch audit codes:

1. `src/lib/font/audit-catalogue.ts` — add 6 catalogue entries
2. `src/lib/font/audit.ts` — add 6 check functions to the `auditProject()` switchboard
3. `src/lib/font/audit.ts` — add 6 entries to `describeAuditCode()`
4. `src/lib/font/apply-fixes.ts` — add 4 fix functions (stat-missing, stat-instance-name-mismatch, axis-default-not-at-master, plus one more if 3rd has a fix)
5. `src/lib/citations/matcher.ts` — add 6 CITATION_MAP entries (citations already documented above)
6. `src/lib/font/audit.test.ts` — add tests for the 6 new check functions
7. Update the audit-codes count from 94 → 100 in:
   - `README.md`
   - `src/routes/audit/+page.svelte`
   - `src/routes/learn/audit-codes/+page.svelte`
   - `static/llms.txt`
   - `docs/launch/show-hn-draft.md`
   - `docs/launch/typedrawers-intro.md`

For the STAT editor:
- `src/lib/font/types.ts` — STAT type definitions if not already
- `src/routes/project/[id]/designspace/+page.svelte` — wire in the new panel
- New component `src/lib/ui/StatPanel.svelte`

For Designspace round-trip:
- `src/lib/font/designspace.ts` — new module
- `src/lib/font/designspace.test.ts` — test
- `src/routes/+page.svelte` (home) — wire import
- `src/routes/project/[id]/export/+page.svelte` — wire export

---

## Order of operations if all 3 ship pre-launch

**Week 4 (Jun 23-29):**
- Day 1-2: 6 new audit codes (catalogue + describeAuditCode + matcher + tests, no check functions yet)
- Day 3-4: 4 deterministic check functions (stat-missing, axis-range-extreme, master-too-close, axis-default-not-at-master)
- Day 5: 2 STAT-dependent check functions + STAT type definitions

**Week 5 (Jun 30-Jul 6):**
- Day 1-3: STAT editor UI panel
- Day 4-5: Designspace v5 import/export module + tests

**Week 6 (Jul 7-13):**
- Day 1-2: round-trip testing (Inter v4 designspace, Recursive designspace)
- Day 3: marketing surface updates (94 → 100 audit codes, STAT editor docs)
- Day 4-5: Lighthouse run + buffer

This is ~3 weeks of focused work. Achievable if the user prioritizes variable-fonts v2 over other items in the master runbook.

---

## Tradeoff if NOT all 3 ship pre-launch

**Minimum pre-launch:** the 6 new audit codes (just catalogue + describeAuditCode + matcher entries, NO check functions yet — flagged as "v1.7" in the code). This bumps the audit-codes-count from 94 → 100 visibly without any actual audit firing. **This is misleading and not recommended** unless paired with at least the 4 deterministic check functions.

**Realistic pre-launch:** 6 audit codes + 4 check functions implemented + tests. The 2 STAT-dependent checks marked as `// TODO: requires STAT editor` in code. Marketing surface stays at "94 codes" — the new 6 don't get a public count claim until the check fires.

**Stretch pre-launch:** + STAT editor UI. Now the 6 codes can all fire. Marketing claim becomes "100 audit codes".

**Realistic v1.7 (Q4 2026):** + Designspace v5 + remaining post-launch codes + master-placement overlay.

---

## Sources

See `variable-fonts-deep-dive.md` Sources section (~50 URLs).

Critical for implementation:
- [OpenType STAT chapter](https://learn.microsoft.com/en-us/typography/opentype/spec/stat)
- [OpenType fvar chapter](https://learn.microsoft.com/en-us/typography/opentype/spec/fvar)
- [OpenType gvar chapter](https://learn.microsoft.com/en-us/typography/opentype/spec/gvar)
- [Designspace v5 spec](https://fonttools.readthedocs.io/en/latest/designspaceLib/index.html)
- [Erik van Blokland's original designspace writeup](https://letterror.com/code/designspace.html)
- [Behdad's STAT explainer](https://github.com/behdad/font-engineering/blob/main/STAT.md) (find current location)
- [variablefonts.io primer](https://variablefonts.io/) (in Patens citation corpus already)

---

## Status of this plan

- ✅ Research complete (`variable-fonts-deep-dive.md`)
- ✅ Implementation plan written (this doc)
- ⏳ 6 pre-launch audit codes — paste-ready in this doc, not yet in code
- ⏳ STAT editor UI — design specified, not yet implemented
- ⏳ Designspace v5 round-trip — module structure specified, not yet implemented
- ⏳ 4 post-launch audit codes — designed, deferred to v2

The plan is paste-ready. The 6 audit codes can be added in a single ~2-day sprint by following the per-code patterns above. STAT editor + designspace round-trip are clean additions that match Patens's existing architecture.
