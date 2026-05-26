# ADR-003 — SSR enabled at the root layout

**Status**: Accepted (2026-05, after a partial-SSR debugging arc)

## Context

The project started with `ssr = false` at the root SvelteKit layout
(`src/routes/+layout.ts`). The reasoning at the time: the editor
needs IndexedDB + FontFace API + Pointer Events, all browser-only;
better to disable SSR globally + opt into it per-route.

This worked for v1.x but masked a serious SEO/AIO problem we
discovered in May 2026:

- With `ssr = false` everywhere, the SvelteKit prerender output is a
  ~7KB JS-only shell.
- `<svelte:head>` content (titles, meta, JSON-LD) only renders after
  client-side hydration.
- Crawlers (Google, ChatGPT, Claude, Perplexity, Bing) read the
  HTML before running JS — they saw zero meta, zero JSON-LD, zero
  title. patens.design effectively didn't exist to AI engines.

The user-visible report ("patens.design is blank") cemented the
diagnosis: real visitors with weak networks also saw the empty
shell.

Alternatives considered:

1. **Keep `ssr = false` + manually inject JSON-LD via the SvelteKit
   `handle` hook** — fragile, doubles the source of truth for meta
   tags.
2. **Migrate per-route to `prerender = true`** — works for static
   marketing pages but doesn't help the home page (which has
   dynamic project listing) or the editor.
3. **Flip `ssr = true` at root + opt out per-route** — the canonical
   SvelteKit pattern. Editor / family / share / project routes
   already have their own `ssr = false` for IndexedDB reasons.

## Decision

`src/routes/+layout.ts` exports `ssr = true`.

Routes that depend on browser-only APIs (IndexedDB, FontFace, Pointer
Events) opt back out explicitly:

```ts
// src/routes/project/[id]/+layout.ts
export const ssr = false;

// src/routes/family/[id]/+page.ts
export const ssr = false;

// src/routes/share/[id]/+page.ts
export const ssr = false;
```

Everything else (home, about, compare, learn/*, help, changelog,
press, privacy, security) renders server-side, with full meta + JSON-LD
in the prerendered or SSR'd HTML.

## Consequences

**Positive**:
- Every public route ships meta tags + JSON-LD in the HTML.
  Crawlers see real content. AI engines can extract and cite.
- The Lighthouse SEO score on landing pages is 100/100.
- The /llms-full.txt + /llms.txt + sitemap.xml + JSON-LD pipeline
  works as designed.

**Negative / constraint**:
- The home page now SSRs every request (it has a dynamic project
  list, so it can't be prerendered). Vercel handles this fine but
  it's a non-trivial responsibility.
- A few client-only patterns surfaced during the SSR flip:
  - The welcome strip pre-renders into HTML before its onclick
    handler attaches; tests were racing the hydration. Fixed via
    a hydration sentinel + addInitScript pattern. See
    `e2e/a11y.spec.ts` and `e2e/welcome.spec.ts`.
  - The home page's `refresh()` call (which reads IndexedDB) had to
    be wrapped in `if (browser)`.
  - `$state.snapshot()` is required when posting a project to the
    audit worker — proxies aren't structured-cloneable. See ADR-004.
- The SBOM + bundle-budget gate need to consider the SSR build
  output. Not blocking but worth tracking.

**Commits us to**:
- **The `ssr = true` at root is load-bearing.** Flipping it back
  would re-introduce the blank-HTML problem + break every
  crawler-facing surface.
- Any future route that needs `ssr = false` (anything touching IDB)
  must opt out explicitly. Don't move the opt-out to the root.

## Related

- ADR-004 (audit worker) — needed $state.snapshot() because of this
  decision.
- ADR-010 (demo project) — works with both SSR and CSR because the
  IDB-seed happens client-side in `+layout.ts`'s load() function on
  the editor route (which is `ssr=false`).
