# ADR-008 — Anthropic API key in user's localStorage (BYOK)

**Status**: Accepted (2026-02)

## Context

Patens has two opt-in AI features:
- "Explain (AI)" button on the `/audit` page (`src/lib/ai/explain-audit-code.ts`)
- AI kerning suggester (`src/lib/ai/kerning-suggest.ts`)

Both call the Anthropic API to generate text. We need a way for users
to authenticate to Anthropic without:
- Patens paying per-call (we're MIT + free, not VC-backed SaaS)
- Patens collecting user identities (anti-goal per ADR-006)
- Building a credit system + billing (out of scope)

Alternatives considered:

1. **Patens-paid pool with per-user rate limits** — common SaaS
   pattern. Requires an auth system, payment integration, abuse
   prevention. Anti-goal.
2. **Patens-hosted proxy with shared API key** — easy to deploy.
   Every call costs us. Doesn't scale even at small adoption.
3. **BYOK ("bring your own key")** — the user pastes their own
   Anthropic API key in Patens Settings. Patens stores the key
   in their browser's localStorage. Calls go through the Patens
   serverless proxy at `/api/ai/messages` which forwards verbatim
   to Anthropic + discards the key.

## Decision

BYOK. The user supplies their own Anthropic API key. Patens stores
it in localStorage and forwards it to Anthropic on demand.

Specifically:

- Key lives at `settings.anthropicApiKey` in
  `src/lib/stores/settings.svelte.ts`, persisted to localStorage
  under the `font-studio:settings:v1` key.
- AI features only render their UI when `settings.hasKey` is true.
  No key = no AI surface visible.
- API calls go via `POST /api/ai/messages` (a proxy at
  `src/routes/api/ai/messages/+server.ts`). The proxy takes the
  key from the request body, forwards to Anthropic, returns the
  response. **Never logs the key. Never stores the key.**
- Each AI feature has a cost guard:
  - `max_tokens` capped per call (400 for explain, ~600 for kerning
    suggester).
  - In-memory caching per session so re-clicks don't re-charge.
  - Rate-limit deliberately absent — the user is paying with their
    own key, so their Anthropic rate limit IS the rate limit.

## Consequences

**Positive**:
- **Zero cost to Patens.** Each user pays for their own AI usage.
- **Privacy by construction.** Patens never sees the AI prompts at
  scale (the proxy is stateless; the per-request key handling is
  minimal).
- **User-controlled.** The user can revoke their key in Anthropic's
  console; that immediately disables Patens's AI features for them.
- **MIT-friendly.** No bundled API credits that would create a
  license-incompatibility surface with Anthropic's terms.
- **Aligned with ADR-001 + ADR-002.** Browser-native + MIT + no
  required accounts.

**Negative / constraint**:
- **UX friction.** A user has to create an Anthropic account, get
  a key, paste it in Settings before any AI feature works. ~90%
  of users will never bother. Documented in `/help`.
- **The Patens proxy IS a trust point.** A user is sending their
  API key through Patens's server every call. Mitigated by:
  - The proxy is open source; the user can audit the code.
  - The proxy never logs the key (see `src/routes/api/ai/messages/+server.ts`).
  - HTTPS-only.
  - Users who don't trust the proxy can run Patens locally + point
    the AI features at `localhost` if they wanted (no code change
    needed; the proxy is just a CORS shim around Anthropic).
- **No graceful degradation if Anthropic goes down.** AI features
  fail with the Anthropic error verbatim. Acceptable for opt-in
  features.

**Commits us to**:
- **No first-party AI features that don't require BYOK.** No "free
  trial" credits, no "first 10 explanations are on us." Every AI
  call requires the user's key.
- **No telemetry on AI usage.** We don't know which prompts are
  popular; we don't know who uses the AI features. Both are
  features, not bugs.
- **The proxy stays minimal.** Adding caching, rate-limiting on our
  side, or any other "value-add" turns the proxy into a stateful
  service that has to be operated. The proxy's job is to forward
  and discard. That's it.

## Related

- ADR-002 (MIT license) — BYOK keeps the license clean.
- ADR-006 (capability tokens for share) — both decisions reflect
  the "no account system" stance.
- DESIGN_PHILOSOPHY.md Principle 4 — "No AI in the lead."
- Constraint from `CLAUDE.md` / `AGENTS.md`: "never lead with AI
  features in marketing."
