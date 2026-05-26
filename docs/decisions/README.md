# Architecture Decision Records

Why specific decisions were made — the kind of context that goes
stale + forgettable, recorded so a future maintainer (or you, in
six months) doesn't have to reconstruct it from commit archaeology.

Format follows the Michael Nygard pattern:

> **Title**: Short, action-shaped ("Run audit in a Web Worker").
> **Status**: Accepted / Superseded by [link] / Deprecated.
> **Context**: What forced the decision?
> **Decision**: What was chosen.
> **Consequences**: What this lets us do; what this prevents.

ADRs are immutable once accepted. To change a decision, open a new
ADR that supersedes the old one — the audit trail matters more than
the readability of any one file.

---

## Index

- [001 — Browser-native, no installs](./001-browser-native.md)
- [002 — MIT License, no relicensing path](./002-mit-license.md)
- [003 — SSR enabled at the root layout](./003-ssr-at-root.md)
- [004 — Audit module runs in a Web Worker](./004-audit-worker.md)
- [005 — Family-wide kerning resolves at export, not edit](./005-family-kerning-resolve.md)
- [006 — Share URLs as capability tokens (no auth)](./006-share-as-capability.md)
- [007 — Storage namespace stays `font-studio-*` (legacy)](./007-storage-namespace.md)
- [008 — Anthropic API key in user's localStorage (BYOK)](./008-byok-ai.md)
- [009 — TypeScript strict + lint at 0 warnings](./009-strict-quality-gates.md)
- [010 — Demo project ships open + IDB-seeded](./010-demo-open.md)

---

## When to write an ADR

- A decision that constrains future contributors ("never X").
- A decision that's load-bearing for multiple surfaces ("SSR at root").
- A decision whose rationale would be opaque to a reader of the code.
- A decision that's been re-litigated more than once.

Not every decision needs an ADR. Code-style choices, named constants,
small refactors — those live in commit messages. ADRs are for the
shape-of-the-product decisions.

---

## How to write one

Copy the template below, drop into a new file, fill in the four
sections. The number is the next free integer (don't skip numbers).
Add an Index entry above.

```markdown
# ADR-NNN — Title

**Status**: Accepted (YYYY-MM-DD)

## Context

What forced the decision? What were the alternatives? What couldn't
be assumed away?

## Decision

What was chosen, in one sentence.

## Consequences

What this lets us do (positive).
What this prevents (negative).
What this commits us to (constraint).
```
