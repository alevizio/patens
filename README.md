# Patens

> Browser-native, open-source type design. Draw glyphs, kern them, ship OpenType — no installs, no sign-ups.

[**patens.design**](https://patens.design) · *Latin: lying open* — root of *patent*, before lawyers got there.

[![CI](https://github.com/alevizio/patens/actions/workflows/ci.yml/badge.svg)](https://github.com/alevizio/patens/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Version](https://img.shields.io/github/package-json/v/alevizio/patens?label=version)](./package.json)
[![Node](https://img.shields.io/badge/node-%E2%89%A522-brightgreen.svg)](./package.json)
[![Bluesky](https://img.shields.io/badge/Bluesky-%40patens.design-0085ff.svg)](https://bsky.app/profile/patens.design)
[![Sponsor](https://img.shields.io/github/sponsors/alevizio?label=Sponsor)](https://github.com/sponsors/alevizio)

<!--
  Hero screenshot — replace this comment block with an actual image
  when you have one. Recommended: 1920×960 PNG/WebP showing the
  editor mid-trace with a glyph in progress + the right sidebar
  audit panel visible. Stored under static/hero.png.

  Example markup once the file is in place:
  ![Patens editor — mid-trace on a lowercase g with the audit panel open](./static/hero.png)
-->

Patens is a self-contained SvelteKit app for designing type. Every project lives in the browser's IndexedDB; nothing leaves your machine unless you choose to export. The demo project ships 162 drawn glyphs across Latin (uppercase + lowercase, numerals, punctuation, currency, math, brackets, composite ligatures), a partial Cyrillic set (17 look-alike letters reusing Latin builders + bespoke Я Ж Ф), and a partial Greek set (14 uppercase look-alikes) — enough to set a UI, a price table, or a Bulgarian legal footer without falling back to system fonts.

## Try it

- **Live editor**: [patens.design/project/demo/edit](https://patens.design/project/demo/edit)
- **Demo specimen**: [patens.design/share/demo](https://patens.design/share/demo)

The share view is a designer-grade specimen sheet: pangram waterfall at five sizes, reading specimens at three tiers, in-context mockups (button, headline, paragraph, stat), CPAL palette switcher, master compare, glyph coverage heatmap, glyph inspector with metric guides + sidebearings + anchor viz, deep-linkable glyph URLs, and a one-click print → PDF specimen.

## What it does

| Capability | Notes |
|---|---|
| Pressure-sensitive sketch | Drawn input with stroke weight + pressure; trace to cubic-Bézier contours via boolean union + Schneider curve fitting |
| Direct contour editing | Smooth ↔ corner points, nudge, multi-select, transform |
| Variable fonts | Multiple masters at distinct axis locations + named instances + a 2D variation explorer for ≥2-axis projects |
| OpenType features | Auto-detected from glyph-name suffixes (`.ss01`, `.smcp`, `.onum`); real ligature substitution (`f_i` → fi); live HarfBuzz preview |
| Kerning + classes | Pair editor, class system, silhouette-distance auto-kern, family-wide kerning resolution |
| Color fonts | COLR v0/v1 + CPAL palettes; live color-plan rendering |
| Anchors + composites | Mark-positioning rig (`top` / `_top` anchor convention) + component composites with offset resolution |
| Audit | 94 codes covering contour shape, vertical metrics, OpenType invariants, brief completeness, multi-script coverage; one-click fixes for the fixable ones |
| Export | OTF + WOFF2 (in-browser), TTF (Pyodide + ttfautohint), UFO, designer-bundled `.zip`, portable `.font.json` |
| Specimen | Print stylesheet that strips chrome and emits a PDF-ready specimen sheet |
| PWA | Service worker for real offline; manifest + 192/512 icons for install |
| Accessibility | WCAG 2.0 + 2.1 + 2.2 A/AA enforced via axe-core in CI across 19 routes |

## Project status

**`v1.5.2`** — production-grade. Live at [patens.design](https://patens.design). Three optional integrations gracefully degrade when not configured:

- **Vercel Blob** — cloud share (recipients in other browsers)
- **GitHub OAuth** — sign-in via GitHub  
- **Anthropic API key** — AI presets (audit explanations, consistency, kerning suggestions; user-provided key, no shared cost surface)

Setup per host (Vercel, Cloudflare Pages, Netlify, self-host): see [`docs/setup.md`](./docs/setup.md).

For what's deferred: [`ROADMAP.md`](./ROADMAP.md). For release history: [`CHANGELOG.md`](./CHANGELOG.md) (also at [patens.design/changelog](https://patens.design/changelog) · [RSS](https://patens.design/changelog/rss.xml)).

## Running locally

```sh
pnpm install
pnpm dev          # http://localhost:5173

pnpm test         # vitest (489 unit tests)
pnpm test:e2e     # Playwright + axe-core a11y (42 e2e tests)
pnpm check        # svelte-check / TypeScript strict
pnpm build        # production build
pnpm profile      # cold-load CDP trace (any URL)
```

## CLI — `patens audit` from the terminal

Audit a `.font.json` project without opening the editor — useful for
CI, foundries lint-checking client deliverables, or scripted batch
work. The CLI is a thin shell around the same 94-code audit module
the editor uses, packaged for Node 22+.

```sh
pnpm run cli:build           # bundles cli/dist/index.mjs (one-time)
pnpm patens audit my.font.json
pnpm patens audit my.font.json --severity=error  # CI-friendly
pnpm patens audit my.font.json --json | jq '.'   # machine output
pnpm patens audit my.font.json --github          # PR annotations
pnpm patens describe self-intersecting           # explain a code
pnpm patens help
```

Exit code is `0` when no error-severity issues, `1` when there are,
`2` on usage / parse failure. Drop-in CI:

```yaml
- run: pnpm run cli:build
- run: pnpm patens audit fonts/*.font.json --github --severity=warn
```

## Architecture (one paragraph)

Every project is a single JSON blob (typed as `Project` in `src/lib/font/types.ts`) stored under a UUID key in IndexedDB via `idb-keyval`. The editor reads through a `projectStore` reactive store; mutations re-emit + auto-save. The share page is `ssr=false` and loads from the local IndexedDB — its only network dependency is the static SvelteKit build itself. Export is dual-path: OTF/WOFF2 via `opentype.js` in the browser, TTF + ttfautohint via Pyodide running as WASM. The audit module is the spine: **94 codes** feeding five teaching surfaces (edit panel, audit page, release pre-flight, family hub, home page) through a single `describeAuditCode()` dictionary. Cloud share uses Vercel Blob with token-based auth (`constantTimeEqual` for token comparison); sign-in uses HMAC-signed session cookies (`safeReturnTo` against open-redirect). Full setup details in [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). PRs welcome. Run `pnpm check && pnpm test && pnpm test:e2e` before submitting.

For security issues: see [SECURITY.md](./SECURITY.md) or email `security@patens.design`.

## License

[MIT](./LICENSE). The demo project's glyph data is part of the codebase under the same license; export an OTF and use it however you'd license your own work.

---

*Made by [Alejandro Vizio](https://github.com/alevizio) — [@patenstype](https://x.com/patenstype) on X, [@patens.design](https://bsky.app/profile/patens.design) on Bluesky, `hi@patens.design` for everything else.*
