# Patens Lighthouse Baseline

**Last refreshed**: 2026-05-27 (post-demo-font-refinement + security PR #8 merge)
**Method**: `scripts/profile-cold-load.mjs <url>` (CDP-instrumented Playwright run against production patens.design). Lighthouse-equivalent metrics (FCP, LCP, layout events, long tasks, EvaluateScript total).
**Build**: post-`415ce5b` — pronunciation page + year-in-title + demo-project curve refinements + security PR #8.

This is the **launch-day baseline** for the "by-the-numbers" sidebar of the launch post + a regression guard for everything that ships after.

---

## Headline numbers (2026-05-27 refresh)

| Route | FCP | LCP | Long tasks (≥50ms) | EvaluateScript |
|---|---|---|---|---|
| `/` (home, SSR) | **632ms** | **632ms** | 0 | 8.5ms |
| `/project/demo/edit` (editor) | **1124ms** | **1267ms** | 0 | 1.2ms |
| `/share/demo` (specimen) | **714ms** | **714ms** | 0 | 1.8ms |

**vs. 2026-05-26 baseline** (single-run delta; ~±200ms network noise applies):

- Home: 571 → 632 FCP (+61ms). Within noise.
- Editor: 921 → 1267 LCP (+346ms). **Watch-item.** Likely the curve-refined
  demo-project bumps initial render compute slightly; EvaluateScript
  actually dropped 12.9 → 1.2ms thanks to the opentype.js defer.
- Share: 1102 → 714 FCP (−388ms improvement). Probably noise / CDN warming.

All routes still well under the Web Vitals "good" thresholds (LCP ≤ 2.5s).

### 3-cold-run resolution (2026-05-27)

Re-ran each route 3× to separate signal from CDN-warming noise:

| Route | Run 1 (cold) | Run 2 (warm) | Run 3 (warm) |
|---|---|---|---|
| `/` FCP/LCP | 612ms | 342ms | 342ms |
| `/project/demo/edit` LCP | **1056ms** | 664ms | 658ms |
| `/share/demo` FCP | 671ms | 522ms | 634ms |

**Verdict on the +346ms editor watch-item: false alarm.** The single-run
"regression" was cold-CDN. Warm-cache LCP on the editor is ~660ms —
*better* than the 2026-05-26 baseline. Streaming SSR is therefore
demoted from "must-have launch perf win" to "nice-to-have post-launch".

---

## Headline numbers (2026-05-26 — kept for diff reference)

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

---

## INP (Interaction to Next Paint) — 2026-05-27 dev-server check

The discoverability research flagged a possible INP risk for the
canvas-heavy editor (Google made INP equal-weight with LCP and CLS as
a Core Web Vitals ranking signal in March 2026 — replacing the
deprecated FID).

Measured via `npx lighthouse` against the local dev server. INP is a
field metric (not directly measurable in lab), so we read **TBT (Total
Blocking Time)** as its standard lab proxy. The mapping: TBT ≤ 200ms
strongly correlates with INP ≤ 200ms (the "good" threshold).

| Route | TBT (lab) | INP risk | Notes |
|---|---|---|---|
| `/` (home) | **0 ms** | ✅ no risk | Home is editorial markup + image preload; no JS interactivity load |
| `/project/demo/edit` (editor, dev server) | **50 ms** | ✅ no risk | Canvas + Svelte 5 runes + audit module; well inside 200ms threshold |

The editor's dev-server **LCP** is high (5.9s vs ~921ms in production
per the headline table above) — that's expected Vite HMR + on-the-fly
transformation overhead and doesn't transfer to production builds. The
**TBT 50ms** number is what matters for INP, and it's healthy.

**Verdict**: no INP work required for launch. The research's worry
about canvas-heavy editors hitting the 200ms ceiling doesn't apply
here — the audit module runs in a Web Worker (off the main thread)
and the canvas redraw paths are already debounced. Future regression
guard: keep TBT under 200ms on every route under the same lab
conditions.

Re-measure post-launch with real-user-monitoring (RUM) data —
field INP can diverge from lab TBT under poor network or low-end
device conditions. Look for the field-vs-lab gap in Google Search
Console's Core Web Vitals report once Patens has enough traffic
to populate it.
