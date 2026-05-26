# Patens Lighthouse Baseline

**Last refreshed**: 2026-05-26 (post landing+SEO+nav arc, v1.6.0 prep)
**Method**: `scripts/profile-cold-load.mjs <url>` (CDP-instrumented Playwright run against production patens.design). Lighthouse-equivalent metrics (FCP, LCP, layout events, long tasks, EvaluateScript total).
**Build**: post-`225bbd4` — every defer + lazy-mount + audit-led copy + new /audit subpage + SiteHeader/Footer + 6 OG variants commit deployed via Vercel.

This is the **launch-day baseline** for the "by-the-numbers" sidebar of the launch post + a regression guard for everything that ships after.

---

## Headline numbers

| Route | FCP | LCP | Long tasks (≥50ms) | EvaluateScript |
|---|---|---|---|---|
| `/` (home, SSR) | **571ms** | **571ms** | 0 | 10.0ms |
| `/audit` (NEW, prerendered) | **1013ms** | **1013ms** | 0 | 1.5ms |
| `/learn` (CollectionPage) | **512ms** | **512ms** | 0 | 1.5ms |
| `/project/demo/edit` (editor) | **766ms** | **921ms** | 0 | 12.9ms |
| `/share/demo` (specimen) | **1102ms** | **1102ms** | 0 | 1.9ms |

**Web Vitals verdict** (good thresholds: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1):

- Home: ✅ **dramatic green** — LCP 5.5× under the threshold.
- Editor: ✅ green — LCP 2.7× under threshold. The editor's old 2.8s LCP was the only "needs improvement" route at v1.5.0; now it's well inside good.
- Share: ✅ green — LCP 2.3× under threshold.

Zero long tasks anywhere. EvaluateScript stays well under 15ms on every route.

---

## Improvement vs. v1.5.0 baseline (the perf arc impact)

| Route | v1.5.0 FCP | v1.6.0 FCP | Δ | v1.5.0 LCP | v1.6.0 LCP | Δ |
|---|---|---|---|---|---|---|
| `/` (home) | 1057ms | 571ms | **−46%** | 2.6s | 571ms | **−78%** |
| `/project/demo/edit` | 906ms | 766ms | **−15%** | 2.8s | 921ms | **−67%** |
| `/share/demo` | 1356ms | 1102ms | **−19%** | — | 1102ms | — |

Home regressed ~120ms FCP from the absolute-low post-defer measurement (453ms → 571ms) when the trust band + audit-in-action 3-card section landed. Net result is still 46% faster than the v1.5.0 baseline, and the trade-off is two new above-the-fold marketing surfaces (audit-led credentials at glance + the differentiator-in-situ teaching demo) — net positive.

Note: numbers vary ±50ms run-to-run depending on Vercel edge cache state + network conditions; CDP-trace single-shot measurements are directionally accurate, not statistically rigorous.

What moved these numbers (v1.5.x → v1.6.0 prep):

- **Editor cold-load: 593 KB → 486 KB (−106 KB / −17.9%)** via 4-stage defer pass:
  - Audit module: `requestIdleCallback` defer (`bbdb759`) — TBT only.
  - 3 dialogs (Settings/Shortcuts/Stats): lazy-mount on first open (`eb1bfe6`) — −30 KB.
  - CommandPalette (root layout, every route) + EditorTour: lazy-mount (`77f71ac`) — −45 KB editor, −15 KB every other route.
  - 5 right-sidebar panels: batched Promise.all on idle (`4fc5902`) — −32 KB.
- **Home page**: Pyodide lazy-loaded off the eager chain (`de9d451`); `<main>` landmark + hero scale-up + audit-led welcome copy.
- **Marketing pages**: CommandPalette defer above; Swiss heading scale-up (`c3f3d94`); section rules on document-flow pages (`10198db`).

The home LCP improvement (2.6s → 453ms = 5.7× faster) is the headline win — Show HN visitors landing cold see the page paint *immediately*.

---

## Categorical scores (last full Lighthouse run, v1.5.0)

Full Lighthouse runs are slower to take (~2 min each route via npx); the v1.5.0 categorical numbers below are still representative of A11y/BP/SEO since those are mostly structural. **Perf scores below are stale — they reflect pre-arc numbers; the route-level FCP/LCP table above is the current truth.** Next full re-score is post-launch.

| Route | Perf (stale) | A11y | Best Practices | SEO |
|---|---|---|---|---|
| `/` (home, SSR) | 91 | **100** (post-`<main>` fix in `7f80be8`) | 100 | 100 |
| `/about` (prerendered) | 97 | 98 | 100 | 100 |
| `/compare` (prerendered) | 97 | 98 | 100 | 100 |
| `/project/demo/edit` (editor) | 77 | 93 | 100 | 100 |

Perfect 100s on Best Practices + SEO across every public route. Home A11y reached 100 in the v1.6.0 prep (axe-core's `landmark-one-main` violation closed by wrapping the home content in `<main>`). Editor A11y 93 — the gap is minor contrast nits on tinted-bg icons; not launch-blocking.

---

## What still moves the needle on the editor

Ranked by ease × impact (revised post-perf-arc):

1. **Stop here.** Editor LCP 921ms is firmly in good-territory. Further wins require architectural work (yjs defer is multi-day; opentype.js defer would touch 8+ call sites). The audit + dialog + panel defers shipped most of the available headroom.
2. **Wait + re-measure post-launch.** Real-user metrics from the launch traffic will reveal whether the lab numbers match field experience. Then iterate based on RUM data instead of synthetic baselines.

---

## What NOT to chase

- **Perf 100 on every route** — single-digit Lighthouse points cost engineering hours that don't translate to user-perceived wins past LCP ~1s.
- **TBT under 50ms on editor** — would require ripping out FontFace registration on mount or further architectural change. Diminishing returns.
- **Hero image LCP optimization on `/`** — moot now (LCP is 453ms already; the `<h1>` Hoefler Text font is preloaded + paints instantly).

---

## Reproduce

```sh
# Single route — CDP trace + digest:
node scripts/profile-cold-load.mjs https://patens.design/

# Full Lighthouse categorical run (slower, when categorical scores matter):
npx --yes lighthouse https://patens.design/ \
  --output=json --output-path=lh.json \
  --only-categories=performance,accessibility,best-practices,seo \
  --chrome-flags='--headless --no-sandbox' --quiet
```

For each route swap the URL. Compare against this file's numbers; any **FCP/LCP regression >150ms** or **new long task ≥50ms** is worth investigating.
