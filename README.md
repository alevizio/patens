# Patens

> A type design tool that teaches as you draw. Sketch glyphs with a pencil, trace to Bézier, ship OpenType — and learn from a 94-code audit module with plain-English fixes for everything from spacing to OpenType invariants.

[**patens.design**](https://patens.design) · *Latin: lying open* — root of *patent*, before lawyers got there.

[![CI](https://github.com/alevizio/patens/actions/workflows/ci.yml/badge.svg)](https://github.com/alevizio/patens/actions/workflows/ci.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/alevizio/patens/badge)](https://scorecard.dev/viewer/?uri=github.com/alevizio/patens)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Version](https://img.shields.io/github/package-json/v/alevizio/patens?label=version)](./package.json)
[![Node](https://img.shields.io/badge/node-%E2%89%A522-brightgreen.svg)](./package.json)
[![Bluesky](https://img.shields.io/badge/Bluesky-%40patens.design-0085ff.svg)](https://bsky.app/profile/patens.design)
[![Sponsor](https://img.shields.io/github/sponsors/alevizio?label=Sponsor)](https://github.com/sponsors/alevizio)

<!-- Hero demo GIF goes here — see docs/launch/demo-gif-storyboard.md
     for the 30-second pre-record blueprint. Once recorded, drop it
     at static/demo/patens-30s.mp4 and replace this with:
     ![Patens — draw, trace, audit, fix, kern, export in 30s](./static/demo/patens-30s.mp4) -->

Patens is a browser-native, open-source SvelteKit app for designing type. Every project lives in the browser's IndexedDB; nothing leaves your machine unless you choose to export. The differentiator isn't *that* it's browser-native — it's that the **audit module is a citizen of the editor**, not an afterthought. Every glyph, every metric, every kern pair has a teaching surface: "your sidebearings drift across the stem class" or "this contour winds the wrong way for OpenType" — with the rule, the why, and a one-click fix where one exists. ([Why audit-as-teaching →](https://patens.design/audit))

The demo project ships 162 drawn glyphs across Latin (uppercase + lowercase, numerals, punctuation, currency, math, brackets, composite ligatures), a partial Cyrillic set (17 look-alike letters reusing Latin builders + bespoke Я Ж Ф), and a partial Greek set (14 uppercase look-alikes) — enough to set a UI, a price table, or a Bulgarian legal footer without falling back to system fonts.

## Try it

- **Marketing site**: [patens.design](https://patens.design) — long-scroll editorial with the audit's worldview, an annotated specimen of the demo OTF, an interface mock of the editing surface, the 94 codes by family, and a comparison vs every other tool in the field (FontLab, Glyphs, Robofont, Fontra, Glyphr Studio, typlr, BirdFont, FontForge, Lipi, Fontish).
- **Compare table**: [patens.design/compare](https://patens.design/compare) — 11 tools × 26 distinguishing features.
- **The Method** (the 94 codes): [patens.design/audit](https://patens.design/audit) — what each family checks, what's plain-English-explained, what's one-click-fixable.
- **Canonical references on every rule page**: [patens.design/audit/self-intersecting](https://patens.design/audit/self-intersecting) — each of the 94 dedicated audit-rule pages now surfaces the primary literature where the rule is established (OpenType spec, TrueType reference, FEA spec, UFO 3 spec, Unicode 16, Adobe Glyph List, Stop Stealing Sheep, OpenType Cookbook, Knuth Metafont papers, variablefonts.io primer). 86 of 94 codes covered in the open MVP corpus per [`docs/research/canonical-library.md`](./docs/research/canonical-library.md); the remaining 8 require licensing the craft canon (Tracy 1986, Smeijers 1996, Noordzij 1985, Cheng 2006).

The app itself is in **private alpha** at an unlisted URL — invitees only. Public launch is scheduled for **TypeCon Portland, August 6–8, 2026**. Sign up for an invite at [patens.design](https://patens.design); the waitlist endpoint persists to Vercel Blob.

## What it does

| Capability | Notes |
|---|---|
| **Audit** | 94 codes covering contour shape, vertical metrics, OpenType invariants, brief completeness, multi-script coverage; teaching prose on every code + one-click fixes for the fixable ones. The headline feature — runs continuously alongside the editor, not as a separate lint step. |
| Pressure-sensitive sketch | Drawn input with stroke weight + pressure; trace to cubic-Bézier contours via boolean union + Schneider curve fitting |
| Direct contour editing | Smooth ↔ corner points, nudge, multi-select, transform |
| Variable fonts | Multiple masters at distinct axis locations + named instances + a 2D variation explorer for ≥2-axis projects |
| OpenType features | Auto-detected from glyph-name suffixes (`.ss01`, `.smcp`, `.onum`); real ligature substitution (`f_i` → fi); live HarfBuzz preview |
| Kerning + classes | Pair editor, class system, silhouette-distance auto-kern, family-wide kerning resolution |
| Color fonts | COLR v0/v1 + CPAL palettes; live color-plan rendering |
| Anchors + composites | Mark-positioning rig (`top` / `_top` anchor convention) + component composites with offset resolution |
| Export | OTF + WOFF2 (in-browser), TTF (Pyodide + ttfautohint), UFO, designer-bundled `.zip`, portable `.font.json` |
| Specimen | Print stylesheet that strips chrome and emits a PDF-ready specimen sheet |
| PWA | Service worker for real offline; manifest + 192/512 icons for install |
| Accessibility | WCAG 2.0 + 2.1 + 2.2 A/AA enforced via axe-core in CI across 31 routes |

## Project status

**`v1.5.2`** — production code-grade, private alpha by invitation. The marketing surface and OG cards are live at [patens.design](https://patens.design); the editor sits at an unlisted URL handed out to alpha invitees. Public launch at TypeCon Portland, August 6–8, 2026 (~10 weeks). Three optional integrations gracefully degrade when not configured:

- **Vercel Blob** — cloud share (recipients in other browsers)
- **GitHub OAuth** — sign-in via GitHub  
- **Anthropic API key** — AI presets (audit explanations, consistency, kerning suggestions; user-provided key, no shared cost surface)

Setup per host (Vercel, Cloudflare Pages, Netlify, self-host): see [`docs/setup.md`](./docs/setup.md).

For what's deferred: [`ROADMAP.md`](./ROADMAP.md). For release history: [`CHANGELOG.md`](./CHANGELOG.md) (also at [patens.design/changelog](https://patens.design/changelog) · [RSS](https://patens.design/changelog/rss.xml)).

## Running locally

```sh
pnpm install
pnpm dev          # http://localhost:5173

pnpm test         # vitest (722 unit tests + 6 perf benches)
pnpm test:e2e     # Playwright + axe-core a11y (66 e2e tests across 7 files)
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
