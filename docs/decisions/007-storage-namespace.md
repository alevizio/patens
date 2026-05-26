# ADR-007 — Storage namespace stays `font-studio-*` (legacy)

**Status**: Accepted (2026-04, when the rename happened)

## Context

Patens shipped its first production version under the name "Font
Studio" in v1.0.0 (Jan 2026). In April 2026, the project rebranded
to "Patens" — the editor became `https://patens.design`, the domain
became `patens.design`, the package name became `patens`.

The rename was straightforward for *display* — every visible
"Font Studio" string became "Patens" (commit `e5de022` and
`f98ed0d`, the latter covering paths that the original `sed` glob
missed because of bracketed-route literal-character-class expansion).

The rename was **not** straightforward for *storage identifiers*:

| Identifier | What it is |
|---|---|
| `font-studio` IDB database name | Holds the user's projects |
| `font-studio-families` IDB database name | Holds family records |
| `font-studio:settings:v1` localStorage key | User preferences |
| `font-studio:share-token:*` localStorage keys | Per-share delete tokens |
| `font-studio-${version}` Service Worker cache name | PWA cache |
| `font-studio-session` cookie name | OAuth session (when enabled) |
| `font-studio` PartyKit room name | Future-collab placeholder |

Each of these names was hardcoded into client code that ran in users'
browsers. If we'd rebranded them too, every existing Patens user
would have opened the new app to find a *blank dashboard* — their
projects still exist in the `font-studio` IDB database, but the new
code looks in a `patens` database that doesn't exist for them. From
their perspective: data loss.

Migrating in code is possible but expensive: per-user migration
hook on first new-version load, copy from old IDB to new IDB,
delete old. Bug-prone (private mode, quota errors, partial copies,
service worker cache invalidation).

## Decision

**Storage identifiers stay `font-studio-*`. Forever.**

The user-facing brand is "Patens." The on-disk storage names are
"font-studio." These don't have to match.

Documented in:
- `AGENTS.md` (the AI-assistant onboarding file)
- `DESIGN_PHILOSOPHY.md` (the constraints section)
- `MAINTAINERS.md` (the "things I won't do, ever" section)
- This ADR (the canonical reasoning)
- The git commit `f98ed0d` (which made the rename explicit + listed
  the storage exceptions)

## Consequences

**Positive**:
- Zero user data loss across the rename.
- Zero migration code to maintain.
- The "right" semantic name for these identifiers is "the canonical
  project store," not the brand. The legacy name has fossilized but
  it isn't *wrong* — it just isn't pretty.

**Negative / constraint**:
- A new contributor reading the code sees `font-studio` everywhere
  and wonders if there's a rename in flight. There isn't. This ADR
  + the inline code comments explain why.
- IDE find-and-replace operations on "font-studio" are dangerous.
  Any refactor must explicitly preserve storage identifiers.
- If we ever rebrand again, we'll either inherit this constraint
  forward (the names become "patens-legacy-font-studio" or similar
  triple-nested) or finally bite the migration cost.

**Commits us to**:
- **Never rename storage identifiers without a migration arc.** If
  we do migrate someday, it needs:
  - Detection (does the user have a legacy IDB?)
  - Copy with progress UI (could be 100MB of font data)
  - Atomic switch (don't delete legacy until copy verifies)
  - Error recovery (quota, private mode, partial copy)
  - Rollback path
  - At least 6 months of dual-read so older clients keep working
- That's a multi-week arc. Not worth doing pre-emptively.

## Related

- Commit `f98ed0d` — the rebrand commit that codified the exceptions.
- `src/lib/font/family.ts` line 21 — `createStore('font-studio-families', 'families')`.
- `src/lib/stores/settings.svelte.ts` line 10 — `const KEY = 'font-studio:settings:v1'`.
- `src/service-worker.ts` — `CACHE_NAME = \`font-studio-${version}\``.
