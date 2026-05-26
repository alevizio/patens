# AGENTS.md

Instructions for AI coding assistants (Cursor, Claude Code, Copilot,
Codex, Gemini CLI, Devin, Jules, Amp, Factory, etc.) working in this
repo. Standard format per [agents.md](https://agents.md/), backed
by the Linux Foundation's Agentic AI Foundation alongside MCP + A2A.

Human contributors: read `CONTRIBUTING.md` first; this file is the
machine-readable subset of the same conventions.

---

## Project shape

**Patens** is a browser-native, open-source type design environment.
SvelteKit 2 + Svelte 5 runes, Tailwind CSS v4, TypeScript strict
mode. Production at <https://patens.design>.

The codebase has six conceptual layers — see `ARCHITECTURE.md` for the
full map.

```
src/routes/                  pages + API endpoints
src/lib/font/                font model, audit module, OpenType pipeline
src/lib/glyph/               glyph-level UI (browser, tile)
src/lib/ui/                  reusable widgets (Panel, Dialog, etc.)
src/lib/stores/              Svelte 5 $state-class stores
src/lib/audit/               audit Web Worker + entry
src/lib/ai/                  Anthropic API client + AI features
```

---

## Run before claiming work is complete

These commands gate every commit. Run them locally; the CI runs the
same set.

```sh
pnpm exec eslint . --max-warnings 0        # lint MUST be at 0 warnings
pnpm exec svelte-check --tsconfig ./tsconfig.json
pnpm exec vitest run --reporter=dot
pnpm exec playwright test --reporter=line
```

The `vite build` step is also part of CI but takes ~10s — run when
you've touched route configuration or build-time prerenders.

---

## Conventions

### TypeScript

- **Strict mode is on.** No `any`, no `as any`, no `// @ts-ignore`.
- Prefer named exports: `export const Foo = ...` over `export default`.
- File names: `kebab-case.ts` for modules, `kebab-case.svelte` for
  components; the component class itself is PascalCase.

### Svelte 5

- Use `$state` for reactive state, `$derived` for computed values,
  `$effect` for side effects. The legacy `<script>` reactivity (`$:`)
  is forbidden — this is a clean Svelte 5 codebase.
- Stores are `$state` classes in `src/lib/stores/*.svelte.ts`. Export
  a singleton instance, not the class.
- When passing state across a Web Worker boundary, **`$state.snapshot()`
  the value first** — proxies aren't structured-cloneable. The audit
  worker (`src/lib/audit/`) is the reference pattern.
- `<svelte:head>` content needs SSR enabled at the root to reach
  crawlers. Don't add `ssr = false` at the root layout.

### Styling

- **Tailwind utility-first.** Never use inline `style={{}}` or CSS-in-JS.
- Colors / spacing / typography use **design tokens** (CSS custom
  properties under `--color-*`, `--space-*`). Never hardcode hex.
- `text-success` / `text-warn` / `text-danger` carry contrast risk on
  tinted backgrounds — use the `-strong` variants there.
- The `class:` directive is the right form for conditional classes.
  Use the project's `cn()` utility for complex compositions.

### Accessibility

- Every interactive element needs an accessible name (`aria-label`,
  `title`, or visible text). The a11y suite in `e2e/a11y.spec.ts`
  enforces WCAG 2.0 + 2.1 + 2.2 A/AA via axe-core across 31 routes
  and 5 modals.
- Touch targets: min 24×24 (WCAG 2.5.8). Use `inline-flex` + a `size-*`
  container around small icons to satisfy the target-size without
  enlarging the icon itself.
- Run the suite before committing UI changes. A serious or critical
  violation fails CI.

### Tests

- Unit tests: `*.test.ts` next to source. Vitest.
- E2E: `e2e/*.spec.ts`. Playwright.
- New routes need an a11y test in `e2e/a11y.spec.ts`.
- Benchmarks: `*.bench.test.ts` for perf regression guards.
- **Mock external APIs.** Never call real endpoints in tests.

### Comments

- **Default to writing no comments.** A well-named identifier is the
  documentation.
- Write a comment only when the **why** is non-obvious — a hidden
  constraint, a subtle invariant, a workaround for a specific bug, a
  defensive pattern that would surprise a reader.
- Don't explain *what* code does. Don't reference the current task
  ("added for the audit-worker fix") — that belongs in the commit
  message.
- Keep comments tight; one line is usually enough. Multi-paragraph
  prose belongs in `docs/` or a `.md` file, not source.

### Git

- Conventional commits: `feat:`, `fix:`, `refactor:`, `perf:`,
  `polish:`, `chore:`, `docs:`, `test:`.
- Commit messages explain *why* in the body. Leading line under 70
  characters.
- One logical change per commit.
- Branch off `main`; PR back to `main`.
- **DCO** (`Signed-off-by:` trailer) preferred. No CLA.

---

## AI-assistant disclosure

If you (the AI assistant) substantively wrote the code in a PR, the
human author should:

1. Mention this in the PR description ("AI-assisted with [tool]").
2. Preserve the `Co-Authored-By: <Tool> <noreply@vendor.com>` trailer
   in commit messages. Do not strip it.
3. Apply the standard PR checklist (tests pass, lint at 0,
   svelte-check clean, manual screenshot of any UI change).

This isn't legally required, but it's the 2026 OSS norm and it lets
maintainers calibrate review depth. AI-generated code carries 15–18%
more security vulnerabilities and 4.6× longer review time per industry
data — so the screenshot + test requirements are stricter than for
human-only changes.

---

## File-system conventions

### Where things live

| Path | Contents |
|---|---|
| `src/routes/` | Pages + API endpoints. SvelteKit conventions. |
| `src/routes/api/share/` | Cloud-share endpoints. Token auth. |
| `src/routes/api/ai/` | Anthropic API proxy (user supplies their own key). |
| `src/routes/learn/` | Long-form `/learn/*` tutorials. Prerendered. |
| `src/lib/font/` | Font model + 94-code audit + OpenType pipeline. |
| `src/lib/font/audit.ts` | Audit code registry + `describeAuditCode()`. |
| `src/lib/audit/audit-worker.ts` | Web Worker entry — audit runs off main thread. |
| `src/lib/stores/` | Svelte 5 `$state`-class stores. |
| `src/lib/og-fonts/` | Subsetted Inter + Lora for OG image rendering. |
| `static/` | Public root: `llms.txt`, `robots.txt`, demo OTF, OG-key. |
| `e2e/` | Playwright specs. |
| `docs/` | Design docs, architecture notes, launch plans. |
| `scripts/` | One-shot Node scripts (IndexNow ping, OG-font subset). |

### Files NOT to edit without explicit ask

- `src/lib/og-fonts/*.ttf` — already subsetted via
  `scripts/subset-og-fonts.mjs`; regenerate via that script if needed.
- `static/demo-fonts/*.otf` — the demo project's actual font; treat
  as a build artifact.
- `static/<uuid>.txt` — IndexNow site verification key.
- `.svelte-kit/` — build output.

---

## Constraints to honor

- **Never paywall the core editor.** The MIT-licensed Patens app at
  patens.design must remain freely usable forever.
- **Never lead with AI features in marketing.** AI is helpful inside
  the editor (opt-in via API key), but the product story is the
  audit + teaching surfaces.
- **Storage identifiers stay `font-studio-*`** (legacy from pre-
  rename). Migrating would orphan every existing user's data —
  IndexedDB database names, localStorage keys, service-worker cache,
  PartyKit room name, session cookie. Never rename without an explicit
  migration arc.
- **Open-source MIT positioning** is explicit on every surface (home,
  /about, /press, /compare, README). Don't add features that quietly
  depend on closed-source services.
- **Single maintainer.** "Keep it cheap" infra constraint: no
  surprise multi-thousand-dollar bills. Vercel free tier + Vercel
  Blob + Anthropic API key (user-supplied) are the canonical
  dependencies.

---

## Things to read before working in specific areas

| Touching... | Read first |
|---|---|
| The audit module | `src/lib/font/audit.ts` first 50 lines + `src/lib/audit/audit-worker.ts` |
| Font export pipeline | `src/lib/font/export.ts` `buildFont()` signature |
| The share + versioning contract | `src/lib/share-blob.ts` + `src/routes/api/share/+server.ts` |
| Service worker | `src/service-worker.ts` + `src/lib/sw/upgrade.ts` |
| Project store | `src/lib/stores/project.svelte.ts` |
| `/spacing` kerning UI | `src/lib/font/family-kerning.ts` for the resolve pattern |
| Anything routing-shaped | `src/routes/+layout.ts` (`ssr = true` at root) |

---

## Out of scope

If your task touches any of these, stop and ask the human maintainer:

- Renaming storage identifiers (`font-studio-*` → anything else)
- Changing the license (MIT) or relicensing
- Removing the MIT-only positioning from any surface
- Paywalling any editor feature
- Adding required-account flows (the project is account-free)
- Changing the SSR posture at the root layout
- Anything affecting `BLOB_READ_WRITE_TOKEN`, `ANTHROPIC_API_KEY`,
  or session cookie HMAC keys

---

## Quick orientation for first contact

1. Read `README.md` for the human-facing pitch.
2. Read `ARCHITECTURE.md` for the structural map.
3. Read `CONTRIBUTING.md` for the human-facing workflow.
4. Read `DESIGN_PHILOSOPHY.md` for the "why" decisions.
5. Run `pnpm install` then `pnpm dev` — confirm <http://localhost:5173>
   loads cleanly.
6. Run the test suites once to capture the baseline:
   `pnpm exec vitest run` + `pnpm exec playwright test`.

The codebase rewards reading. There's a `describeAuditCode()`
dictionary, a `buildFont()` contract, a `resolveKerning()` rule. Find
the canonical function first; the call sites usually fall into place.
