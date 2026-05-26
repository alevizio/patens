# ADR-009 — TypeScript strict + lint at 0 warnings

**Status**: Accepted (2026-05)

## Context

The project ratcheted lint warnings down across the v1.x cycle: 52 →
47 → 30 → 5 → 0. TypeScript was strict from the beginning. By
v1.5.2, both gates are at zero — any new warning blocks CI.

The question is whether to keep them there forever, or to allow a
small budget for warnings as the project scales.

Alternatives considered:

1. **0 warnings, always.** Any new warning blocks CI; contributors
   must address before merging.
2. **Small budget (5 warnings).** Allows in-progress refactors
   without per-commit pressure.
3. **Per-file budgets.** Allow N warnings per file; new files start
   at 0.
4. **Ratchet down only.** Each release can raise the gate but never
   lower it.

## Decision

**Lint at 0 warnings + TypeScript strict, both as CI gates that
fail builds.**

Specifically:

- `pnpm exec eslint . --max-warnings 0` is the CI gate command.
- `pnpm exec svelte-check --tsconfig ./tsconfig.json` is the type
  gate.
- `tsconfig.json` has `"strict": true` + no exceptions.
- No `any` types in production code (test code may have rare
  exceptions when typing third-party return values; tests are
  reviewed but not perfection-required).
- No `@ts-ignore`. Use `@ts-expect-error` with a comment if you
  must — that surfaces when the underlying error goes away.

When an emerging lint rule legitimately needs an exception, the
pattern is **inline disable comments with rationale**:

```ts
// Trailing `<\/script>` escape keeps Svelte's parser from misreading
// the source as the end of this <script> block.
// eslint-disable-next-line no-useless-escape
```

This commits the *reason* into the source. Future readers see why
the rule was overridden, not just that it was.

## Consequences

**Positive**:
- **The codebase is small + reads cleanly.** No silently-stale code
  rotting under the warning threshold.
- **Refactors stay surgical.** A contributor can't ship a PR that
  adds 3 warnings "for now" — they fix or they explain.
- **TypeScript errors block merge.** No `any` creep; no implicit
  `null` bugs.
- **CI signal stays meaningful.** A red CI build means *something
  real broke*, not "lint baseline shifted."

**Negative / constraint**:
- **Library upgrades that introduce new rules** force an immediate
  triage pass. The Svelte 5 plugin adds rules per release; we've
  had to suppress a few (`svelte/prefer-writable-derived` for a
  pre-Svelte-5.25 pattern that's intentionally not refactored
  yet). Each suppression has a comment + a future-cleanup link.
- **Aggressive AI-assisted PRs sometimes introduce warnings.**
  Caught at CI; sent back for fix. Standard PR-review friction.

**Commits us to**:
- **Never raise the gate.** If we hit a warning we can't fix
  immediately, suppress inline with a comment, not raise the
  global threshold.
- **No "tech-debt bankruptcy" exception.** Future maintainers
  inherit a 0-warning baseline; they keep it.
- **Inline disable comments are a code smell that must justify
  themselves in the comment.** A disable comment without a
  reason is a CR comment.

## Related

- Commit `1fcfbe5` — the 5 → 0 ratchet that landed this state.
- `.github/workflows/ci.yml` — the gate at `--max-warnings 0`.
- `eslint.config.mjs` — the active rules.
