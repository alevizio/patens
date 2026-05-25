# Patens

> A browser-based type design environment. Draw glyphs, kern them, ship OpenType fonts — no server required.

Patens is a self-contained SvelteKit app for designing type. Every project lives in the browser's IndexedDB; nothing leaves your machine unless you choose to export. The demo project ships 119 glyphs across Latin uppercase + lowercase, numerals, punctuation, currency, math, brackets, ligatures, and two stylistic-alternate slots — enough to set a UI, a price table, or a legal footer without falling back to system fonts.

## Try it

- **Live demo:** [patens.design](https://font-studio-2ix8myy64-alevizio.vercel.app/project/demo/edit)
- **Demo specimen:** [patens.design/share/demo](https://font-studio-2ix8myy64-alevizio.vercel.app/share/demo)

The share view is a designer-grade specimen sheet: pangram waterfall at five sizes, multi-line reading specimens at three tiers, in-context mockups (button, headline, paragraph, stat), CPAL palette switcher, master compare, glyph coverage heatmap, glyph inspector with metric guides + sidebearings + anchor visualizer, deep-linkable glyph URLs, and a one-click print → PDF specimen.

## What it does

| Capability | Notes |
|---|---|
| Pressure-sensitive sketch | Drawn input with stroke weight + pressure; trace to cubic-Bézier contours via boolean union + Schneider curve fitting |
| Direct contour editing | Edit-tool with smooth ↔ corner points, nudge, multi-select, transform |
| Variable fonts | Multiple masters at distinct axis locations; named instances |
| OpenType features | Auto-detected from glyph-name suffixes (`.ss01`, `.smcp`, `.onum`), real ligature substitution (`f_i` → fi) |
| Kerning + classes | Pair editor, class system, silhouette-distance auto-kern |
| Color fonts | COLR v0/v1 + CPAL palettes; live color-plan rendering |
| Anchors + composites | Mark-positioning rig (`top` / `_top` anchor convention) + component composites with offset resolution |
| Audit | 88+ codes covering contour shape, vertical metrics, naming, OpenType invariants, brief completeness; one-click fixes for the fixable ones |
| Export | OTF + TTF (Pyodide + ttfautohint) + WOFF2 (in-browser), `.font.json` portable project file |
| Specimen | Print stylesheet that strips chrome and emits a PDF-ready specimen sheet |

## Project status

**`v1.4.0`** — production-grade. Cloud share works for recipients in any browser when the deployment has `BLOB_READ_WRITE_TOKEN` set (Vercel Blob); without it, share URLs work in the originator's browser only (the `.font.json` export remains the cross-machine option). See [ROADMAP.md](./ROADMAP.md) for what's deferred.

### Optional integrations

Patens runs fully in the browser by default. Three integrations are optional and gracefully degrade when not configured:

- **Vercel Blob** — cloud share (recipients in other browsers)
- **GitHub OAuth** — sign-in via GitHub
- **Anthropic API key** — AI presets (audit-explain, consistency, etc.)

See [`docs/setup.md`](./docs/setup.md) for per-platform setup instructions (Vercel, Cloudflare Pages, Netlify, self-host) including OAuth app registration, env var matrix, and local-dev `.env.local` template.

## Running locally

```sh
pnpm install
pnpm dev
```

Then open `http://localhost:5173`.

```sh
pnpm test          # vitest unit tests
pnpm test:e2e      # Playwright (axe-core a11y included)
pnpm check         # svelte-check / TypeScript
pnpm build         # production build
```

## Architecture (one paragraph)

Every project is a single JSON blob (typed as `Project` in `src/lib/font/types.ts`) stored under a UUID key in IndexedDB via `idb-keyval`. The editor reads through a `projectStore` reactive store; mutations re-emit + auto-save. The share page is `ssr=false` and loads from the local IndexedDB — its only network dependency is the static SvelteKit build itself. Export is dual-path: OTF/WOFF2 via `opentype.js` in the browser, TTF + ttfautohint via Pyodide. The audit module is the spine: 88+ codes feeding five teaching surfaces (edit-page accordion, audit page, release pre-flight, family hub, home page) through a single `describeAuditCode()` dictionary.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). PRs welcome. Run `pnpm check && pnpm test && pnpm test:e2e` before submitting.

## License

[MIT](./LICENSE). The demo project's glyph data is part of the codebase under the same license; export an OTF and use it however you'd license your own work.
