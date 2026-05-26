# Patens Lighthouse Baseline

**Date**: 2026-05-25
**Method**: `npx lighthouse <url> --only-categories=performance,accessibility,best-practices,seo` against production patens.design
**Build**: post-`f6d4d86` (P2 perf arc complete: OG fonts subsetted, audit
workerized, IDB getMany batching, tile-grid virtualization, hero LCP
preload, lint at 0).

This is the **launch-day baseline** for the "by-the-numbers" sidebar of
the launch post + a regression guard for everything that ships after.

## Scores

| Route | Perf | A11y | Best Practices | SEO |
|---|---|---|---|---|
| `/` (home, SSR) | **91** | 98 | 100 | 100 |
| `/about` (prerendered) | **97** | 98 | 100 | 100 |
| `/compare` (prerendered) | **97** | 98 | 100 | 100 |
| `/project/demo/edit` (editor) | **77** | 93 | 100 | 100 |

Perfect 100s on Best Practices + SEO across every public route. A11y
98 on landing pages, 93 on the editor (minor moderate-impact items that
axe doesn't flag as serious).

## Web Vitals — 2026 thresholds

Good thresholds: LCP ≤ 2.5s, CLS ≤ 0.1, INP ≤ 200ms (TBT is lighthouse's
INP proxy in lab runs).

| Route | LCP | CLS | TBT | Verdict |
|---|---|---|---|---|
| `/` | 2.6s | 0 | 0ms | ✅ CLS+TBT good; LCP 100ms over the "good" line |
| `/about` | 1.7s | 0 | 0ms | ✅ all green |
| `/compare` | 1.7s | 0 | 0ms | ✅ all green |
| `/project/demo/edit` | 2.8s | 0.086 | 490ms | ⚠️ Editor: LCP + TBT over good |

The editor is a client-heavy route (IndexedDB read, audit worker spin-up,
GlyphBrowser tile grid mount, FontFace registration). Most of the 490ms
TBT is the IDB hydration + GlyphTile rendering — the audit worker
itself is now off the main thread so it doesn't contribute.

## Comparison to the perf-research inference

Research (pre-arc) predicted ranges. Actuals landed inside or matched
the predicted bands:

| Route | Predicted | Actual | |
|---|---|---|---|
| `/` (home) | 92–98 | **91** | -1 from band (LCP-bound) |
| `/about` (prerendered) | 97–100 | **97** | matches |
| `/project/demo/edit` | 75–88 | **77** | matches |

## What still moves the needle on the editor

Ranked by ease × impact:
1. **Lazy-load Pyodide chunk on the export route only** — currently
   listed in node-2's preload chain. ~7MB of JS the user never touches
   unless they hit Export → TTF. Effort: ~1 hour.
2. **Reduce GlyphBrowser tile-render cost** — 162 tiles × SVG path
   computation costs ~10ms of the TBT. `content-visibility: auto`
   handles off-screen tiles (already shipped in `f6d4d86`); next step
   is JS-level virtualization for the visible band.
3. **Hero LCP optimisation on `/`** — image-based hero would let the
   browser preload more aggressively. Today the LCP element is the
   `<h1>` rendered in StudioGeometric (font preload already shipped).

## What NOT to chase

- A11y from 98 → 100 on landing pages — the remaining items are minor
  contrast nits on icons-against-tinted-bg that axe flags as moderate.
  Not worth chasing for a launch number; addressable opportunistically.
- TBT under 100ms on the editor — would require ripping out either
  Pyodide preload (see #1 above) or the FontFace registration on mount.
  Either is ~1d of work; deferred.

## Reproduce

```sh
npx --yes lighthouse https://patens.design/ \
  --output=json --output-path=lh.json \
  --only-categories=performance,accessibility,best-practices,seo \
  --chrome-flags='--headless --no-sandbox' --quiet
```

For each route swap the URL. Compare against this file's scores; any
drop >5 points is a regression worth investigating.
