# Design philosophy

The "why" decisions behind Patens. Reference this file when proposing
features so contributors and reviewers can converge faster on
"yes / no / different shape."

The PR template asks which principle here your change supports. If
none of these principles apply, that's a useful signal — the feature
is probably out of scope, or this document needs to evolve to
include it.

---

## Principle 1 — Teaching-first, not foundry-first

The differentiator. FontLab and Glyphs are deeper, faster, and built
for professionals shipping commercial families across years. Patens
is for the in-between:

- The designer who drew a logo and wants a real font from it.
- The student learning why a kerning pair feels wrong.
- The foundry that wants to share a specimen without making a client
  install software.

**Every Patens feature is also a teaching surface.** The audit module
isn't "things that are broken"; it's "things you might not know to
look for yet, explained in plain language." The Help, Learn, and
Audit pages are first-class citizens, not afterthoughts.

**Implication for contributions**: features that benefit professional
ship-velocity but make the editor feel more opaque should be pushed to
plugins, opt-in modes, or "advanced" panels. The default surface
explains its own ideas.

---

## Principle 2 — Browser-native, no installs

Patens runs entirely in your browser. No download, no account, no
sync setup, no compile step. Every project lives in IndexedDB on the
user's machine; nothing leaves unless they choose to share.

**Implication for contributions**:

- Server-side features are limited to enablers the browser can't do
  (cloud share, OG image rendering, OAuth, AI proxy). Never to the
  core editor flow.
- Heavy assets (Pyodide for TTF export, HarfBuzz.js for shaping) load
  lazy and per-route; never on the home page.
- Offline support via the service worker is table stakes, not a
  premium feature.
- A "log in to use this" gate is incompatible with this principle.

---

## Principle 3 — Open source MIT, sincerely

Patens is MIT-licensed and intends to stay that way. The license is a
commitment, not a configuration. Two consequences:

- **Never paywall the core editor.** The MIT app at patens.design must
  remain freely usable forever. Paid extras (consulting, premium
  templates, hosted family-sharing) are fine; gating the audit module
  or export pipeline behind a subscription is not.
- **The code is portable.** Self-hosters running on their own Vercel,
  Cloudflare, or Netlify deploy should get the same experience.
  Hard-coded `patens.design` strings outside of meta tags or canonical
  URLs are a smell.

**Implication for contributions**: features that require non-MIT
dependencies, paid third-party services without graceful fallback, or
that bury core functionality behind a feature flag — won't merge.

---

## Principle 4 — No AI in the lead

AI features (the "Explain (AI)" button on the audit page, the AI
kerning suggester) exist and are useful. But:

- **They're opt-in.** Activate by adding your own Anthropic API key in
  Settings. No AI runs without that key.
- **They're never the headline.** Patens's product story is the
  audit + teaching surfaces, not the AI layer.
- **They never own the source of truth.** AI suggests; the designer
  decides. No "AI-generated kerning" path that bypasses the audit
  module.

**Implication for contributions**: AI-led features (auto-draw, AI-pick-
better-shape, etc.) are out of scope unless explicitly approved in an
issue first. AI-assist features (explain, summarize, suggest) are
welcome when they fit the opt-in + non-owning model.

---

## Principle 5 — Audit codes are stable contracts

The 94-code audit module's per-code identifiers (`empty`,
`self-intersecting`, `sidebearing-deeply-negative-lsb`, etc.) are
**stable identifiers**. They're referenced in:

- Commit messages
- Bug reports
- The `/learn/audit-codes` reference page
- The `describeAuditCode()` dictionary
- AI-assist prompts

**Renaming an audit code is a breaking change** that ripples through
every surface. New codes are easy; renamed codes are not. New codes
also need: a `describeAuditCode()` entry, an entry on
`/learn/audit-codes`, and a decision about whether it's
auto-fixable.

**Implication for contributions**: when adding an audit check, the
code name is forever. Pick carefully. When removing or renaming,
expect to update five surfaces.

---

## Principle 6 — Type design is the audience

Patens is a tool for type designers. Not "vague typography enthusiasts"
or "developers who want to make pixel fonts" — type designers.

This means:

- The vocabulary is the type-design vocabulary. We say "sidebearings,"
  not "left/right margin." We say "OpenType features," not "font
  options." We say "x-height misaligned," not "height looks off."
- The defaults reflect how type designers actually work. Letter `n`
  is the canonical first letter. Kerning is class-based by default.
  Spacing is calibrated in `nnnonnon`, not in lorem ipsum.
- Power-user shortcuts are first-class. Cmd-K is the command palette;
  `/` focuses search; `?` shows shortcuts. Vim-shaped efficiency
  serves the audience.

**Implication for contributions**: features that would benefit a
generic "creative user" but make the editor feel less precise for a
type designer are pushed to "considered after launch" status.

---

## Principle 7 — Single designer, single machine

Patens is a single-designer-single-machine tool. The implications
cascade:

- No real-time collaboration. Share is a snapshot, not a session.
- No multi-cursor / multi-user state. The editor's reactive model
  assumes one author.
- No account system in the default deployment. Self-hosters can opt
  into OAuth via env vars; that's their choice.
- Cloud share is an unguessable-URL capability model, not an auth
  system. Anyone with the link can read; only the originator (who
  holds the delete-token locally) can re-share or delete.

**Implication for contributions**: features that assume a multi-user
session, server-side state synchronization, or required accounts —
out of scope.

---

## Principle 8 — Costs stay cheap

This is a single-maintainer, side-of-desk project. Infrastructure
costs must stay cheap. Concretely:

- Vercel free tier + Vercel Blob (free tier covers the canonical
  deployment).
- No paid third-party SDKs without a graceful free fallback.
- AI features use the user's own API key — Patens's server doesn't
  pay per call.
- The bundle stays under 5MB (CI gate).
- No external analytics SDK, no marketing pixel, no third-party
  cookie. Vercel's edge logs are the only telemetry.

**Implication for contributions**: features that would bump the
deployment off the free tier, require a new paid integration, or add
a new third-party dependency that calls out from the browser — need
an explicit cost discussion in the issue first.

---

## Anti-principles — things we deliberately don't do

Stated explicitly so you can argue against them in an issue if you
disagree (and so I don't keep relitigating them):

- **Not "the world's most powerful type editor."** That's FontLab.
- **Not "the type editor for everyone."** That's vague enough to
  produce something that suits no one.
- **Not "AI-first."** AI is a layer, not the foundation.
- **Not "growth at all costs."** Sustainability + craft beat scale.
- **Not "mobile-first."** Patens is desktop-first by design.
- **Not "real-time collab."** Single-designer-single-machine.
- **Not "always-on cloud sync."** Local-first; cloud opt-in.
- **Not chasing Figma's WASM-renderer architecture.** Different shape
  of product. Patens has different bottlenecks.

---

## When in doubt

If you're proposing a feature and aren't sure whether it fits — open
an issue first. The conversation will be more useful than a PR I have
to close. I'd rather spend an hour talking about *should this exist*
than have a 200-line diff sit unmerged for a month.

If a principle here is wrong for where Patens is going, this document
should change. PRs to this file are welcome.

---

Last updated: 2026-05-25.
