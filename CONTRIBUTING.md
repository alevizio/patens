# Contributing to Font Studio

Thanks for your interest. Font Studio is a single-author project at the moment, but PRs are welcome — especially around the type-design surfaces (audits, OpenType features, glyph editing) and the share-page polish. This guide covers the basics; for "what does this code do," see [`docs/architecture.md`](./docs/architecture.md).

## Getting set up

```sh
git clone https://github.com/alevizio/font-studio.git
cd font-studio
pnpm install
pnpm dev
```

The dev server runs at `http://localhost:5173`. Open `/project/demo/edit` to land in the editor with the example project loaded.

### Before you push

```sh
pnpm lint              # ESLint — must add no new errors
pnpm check             # svelte-check / TypeScript strict — must pass
pnpm test              # Vitest unit tests (~450 tests)
pnpm test:e2e          # Playwright + axe-core a11y
```

CI runs all four on every PR. The lint baseline has 47 known warnings (ratcheted from 52 in v1.2.x); new code should add zero. CI also enforces a 5120 KB client-bundle budget — inspect locally via `pnpm run analyze`.

## Branch model

- `main` is the trunk; deploys to production on push (Vercel).
- Feature branches: short-lived, named like `feat/share-coverage-fix` or `fix/cmd-shift-v-conflict`.
- No long-running release branches — releases are tags.

## Commit messages

Conventional Commits, short subject + a body that explains *why*:

```
feat(share): glyph inspector master-overlay toggle

When a project has multiple masters, the inspector can now show
every master's version of the same codepoint as a stroke overlay
on top of the default fill. Designers see the slant or weight
delta on a single drawing instead of jumping between renders.

  - M key inside the inspector toggles
  - Legend names the colors back to their masters
  - Stroke weight scales with fontSpan/120 so it stays readable
    across UPM scales
```

The body should describe the problem the change solves, not just the code.

## Pull requests

1. Fork + branch.
2. Make your change. Add or update tests where the change has clear behaviour.
3. Run the four checks above locally.
4. Open a PR against `main`. The PR template will ask for: problem, solution, screenshots (if UI), test plan.
5. CI must be green before review.

## Where things live

```
src/
├── lib/
│   ├── font/         # Type-design domain: glyphs, contours, audit, export
│   ├── ui/           # Reusable UI primitives (Button, Panel, Dialog, etc.)
│   ├── glyph/        # Glyph-specific UI (GlyphTile, GlyphBrowser)
│   ├── drawing/      # Canvas + drawing tools
│   └── stores/       # Reactive stores (project, settings, toast)
├── routes/           # SvelteKit routes
│   ├── +page.svelte  # Home — project list
│   ├── project/[id]/ # Editor + spacing + audit + features + ...
│   ├── share/[id]/   # Read-only specimen view
│   └── family/[id]/  # Multi-style family hub
e2e/                  # Playwright tests
scripts/              # Build helpers (demo-font generation)
```

Mutation flow: every glyph / kerning / metadata write goes through `projectStore` (`src/lib/stores/project.svelte.ts`), which re-emits the reactive project + auto-saves to IndexedDB.

## Areas where help is wanted

- **More audit codes.** The audit module is the spine; new checks land cleanly. See `src/lib/font/audit.ts` and the five-surface contract in `docs/architecture.md`.
- **Curve fitting refinements.** The Schneider trace is competent but doesn't handle every sketch shape well. Real type designers have opinions; PRs welcome.
- **Bespoke Cyrillic / Greek glyph builders.** v1.2.0 shipped 17 Cyrillic + 14 Greek look-alike glyphs that reuse Latin builders. The script-specific shapes (Я Ж Ф for Cyrillic; entire Greek lowercase) need real type-design work. Real type designers have opinions here; PRs welcome.
- **More audit code descriptions** — `describeAuditCode()` covers all 94 codes today (closed in v1.4.0), but tightening copy for clarity + adding fix-action hints in the audit panel UI would be a polish win.

## Anti-goals

- We don't accept changes that introduce a new framework / state library / styling system. Font Studio is SvelteKit + Tailwind + Svelte 5 runes; stay inside that.
- No new third-party fonts in the repo — the demo project's "font" is its own SVG path data. (The 2 fonts under `static/og-fonts/` are exceptions: Lora + Inter used only for server-rendered OG cards.)
- No new backend services. Cloud sharing went through Vercel Blob in v1.1.0 — additional cloud features (delete API, per-share versioning, account systems) need explicit roadmap buy-in before PRs.

## Code of conduct

See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md). TL;DR: be kind, be specific, assume good faith. Disagreements are about the work, not the people. The maintainer has final say but will explain reasoning.

## License

By contributing, you agree your contributions are released under the [MIT License](./LICENSE).
