# ADR-002 — MIT License, no relicensing path

**Status**: Accepted (2026-01)

## Context

Patens needs an open-source license. The candidates in 2026:

- **MIT** — permissive, OSI-approved, ubiquitous in the JS/TS world.
- **Apache 2.0** — permissive + explicit patent grant + trademark
  non-grant. Heavier text.
- **BSD-2 / BSD-3** — basically MIT with slight wording differences.
- **GPLv3 / AGPLv3** — strong copyleft. Forces derivative works to
  also be open. Common in tools, rare in browser apps.
- **Business Source License (BSL)** — source-available, time-bombs
  to OSS after N years. Used by HashiCorp, Sentry, Elastic. Common
  for VC-backed infra.

We need:
- Free use forever (per the teaching-first principle).
- Permissive enough that downstream forks + integrations don't
  require sign-off.
- No patent surface to worry about (we don't ship patentable
  algorithms; the audit module is engineering, not invention).

## Decision

MIT License. Codified in `LICENSE` at the repo root. **Pre-committed
to never relicense.**

The MIT license covers the *code*. The Patens *name* is protected
separately via USPTO trademark (see `docs/launch/trademark.md`).

## Consequences

**Positive**:
- Maximum permissiveness. Anyone can use Patens, fork it,
  commercialize it, embed it in a closed-source product.
- Frictionless contributor onboarding — MIT is what JS/TS
  contributors expect.
- No legal review required for sponsors / downstream integrators.

**Negative / constraint**:
- No copyleft protection. A company could fork Patens and ship a
  closed-source variant; we can't compel them to share back.
- No patent grant. If we ever ship a patentable algorithm, an
  Apache 2.0 license would have been the right choice — but we
  don't expect to.

**Commits us to**:
- **Never relicense**. A future maintainer can't switch to BSL or
  AGPL. The MIT grant is one-way: every contributor since v1.0 has
  contributed under MIT terms, and a license change would require
  unanimous reconsent.
- **Trademark protects the name**, license protects the code.
  Hostile forks can use the code; they can't call themselves
  "Patens" once the USPTO mark registers.

## Related

- ADR-001 (browser-native) — together these define the product shape.
- ADR-008 (BYOK AI) — the AI features stay opt-in partly because
  bundling Anthropic API access would create a license-incompatibility
  surface we don't want.
