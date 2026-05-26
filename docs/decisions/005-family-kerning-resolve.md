# ADR-005 — Family-wide kerning resolves at export, not edit

**Status**: Accepted (2026-05)

## Context

A multi-style font family (Regular, Italic, Bold, Black) often shares
kerning pairs — the AV gap in Bold needs roughly the same negative
kern as in Regular, in proportion. Today's foundry workflow: kern
once at the family level, override per-sibling where the spacing
actually differs.

Patens supports this via a `Family` record at
`src/lib/font/family.ts`. The Family record holds:
- `kerning: KerningPair[]` — family-wide pairs that every sibling
  inherits.
- `classes: KerningClass[]` — class definitions shared across
  siblings.

A sibling Project keeps its own `kerning + classes`. The question
is: when does the merge happen?

Alternatives considered:

1. **Eager merge at edit time** — when a project loads, copy every
   family-level pair into the project's kerning array. Editor sees a
   flat list; export reads it as-is.
   - Pro: simplest mental model in the editor.
   - Con: every sibling has a stale copy of family pairs. Edit the
     family record, every sibling needs re-sync. Storage doubles.
2. **Lazy merge in every consumer** — preview, audit, export, share
   all call `resolveKerning(project, family)` at their entry point.
   - Pro: single source of truth, no sync.
   - Con: every consumer has to remember to call resolveKerning.
3. **Merge at export only** — the canonical place. Edit-time UI
   shows the merged view via a derived; export bakes the result
   into the OTF binary.

We chose option 3, with a wrinkle (the edit-time spacing UI shows
inherited pairs via a derived, but doesn't write them).

## Decision

`resolveKerning(project, family): KerningPair[]` at
`src/lib/font/family-kerning.ts` is the canonical merge.

The function is called by:
- `buildFont(project, { family })` in the export pipeline. Family
  pairs land in the OTF binary.
- The `/spacing` tab's "Pairs in this font" panel. Family pairs
  render with an "inherited" badge alongside project pairs.

Project pairs win on `(left, right)` collision. Family-only pairs
are appended. The function is pure: no IDB read, no mutation.

A symmetric `resolveClasses(project, family)` follows the same
pattern for class definitions.

## Consequences

**Positive**:
- Single source of truth. Edit the family record, every sibling's
  export picks up the change immediately. No sync step.
- Storage is minimal. Family pairs live once in the family record,
  not duplicated per-sibling.
- Diff-friendly. The project's IDB record only holds pairs the user
  specifically authored at the project level.
- Backward-compatible. Old projects with no familyId pass through
  unchanged.

**Negative / constraint**:
- The edit-time UI on `/spacing` has to handle two pair-origin
  types. Closed via the `pairOrigin()` helper + the "inherited"
  badge UX (commit `bd6a1d0`).
- A consumer that forgets to pass `family` gets project-only
  kerning. Solved in `buildFont` by accepting `family` as an
  optional opt-in; the export tab loads + passes it. The CLI
  doesn't (yet) — see future work.
- Family records live in a separate IDB database (`font-studio-families`).
  See ADR-007 for the history.

**Commits us to**:
- The resolve contract: project pairs win on collision, family-only
  pairs are inherited, no other priority semantics. Changing this
  later would silently change exports of every family-using project.
- `pairOrigin()` is a stable API. The "inherited" badge depends on
  it; future UIs that surface origin will too.

## Related

- ADR-007 (storage namespace) — explains why family records live in
  a separate IDB database.
- Commit `bd49e71` — wired family kerning into buildFont (closed
  the "stored but never exported" gap).
- Commit `bd6a1d0` — inherited-pair badges in /spacing.
