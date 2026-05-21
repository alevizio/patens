# TrueType auto-hinting

The Export tab offers a static **TTF** download (TrueType outlines, `glyf`
table) alongside the OTF. When the server-side hinter is configured, that
TTF can be auto-hinted via `ttfautohint` (Werner Lemberg) for sharper
rendering on Windows GDI / Office / sub-150% DPI displays. Hinting is
harmless on retina and modern macOS / iOS — those platforms ignore the
bytecode in favor of grayscale AA.

## Pipeline shape

```
opentype.js (CFF/OTF)
        │
        ▼   Pyodide + fontTools (Cu2Qu, max_err = 1.0)
TTF / glyf
        │
        ▼   POST /api/hint-font  →  ttfautohint binary
Hinted TTF
```

- **Cu2Qu** converts cubic Bézier curves (CFF format) to quadratic
  Béziers (TT format) with max-error of 1 EM unit — the de-facto
  standard used by Glyphs and FontLab.
- **`ttfautohint`** auto-detects stems / serifs / blue zones and emits
  TrueType bytecode + a CVT (control value table). Default hinting
  range is 8–50 PPM, matching Google Fonts' webfont recommendation.

## Installing the hinter

### Local dev (macOS)

```sh
brew install ttfautohint
```

That's it. The API route at `/api/hint-font` shells out to the binary on
`PATH`. Restart `pnpm dev` after install — the GET health check is
memoised per page-load.

### Local dev (Linux)

```sh
apt-get install ttfautohint    # Debian / Ubuntu
dnf install ttfautohint        # Fedora
```

### Production (Vercel deploy) — **shipped: option 2 (Python serverless)**

Decision made 2026-05-21 to optimise for indie hosting cost: ship as a
Vercel Python serverless function via
[`ttfautohint-py`](https://pypi.org/project/ttfautohint-py/) (PyPI,
Aug 2024). The wheel ships the hinter binary internally; no separate
install step, no binary committed to git, free-tier Vercel Python
runtime covers indie scale.

**What's on `main`:**

- `api/hint-font.py` — Vercel Python function. GET = health check;
  POST = hint TTF. Mirrors the previous Node route's URL + query
  contract so the client (`src/lib/font/hint.ts`) is unchanged.
- `api/requirements.txt` — pins `ttfautohint-py==0.6.0`.
- `src/routes/api/hint-font/+server.ts` — kept as a local-dev
  fallback. In `pnpm dev` Vercel's Python runtime isn't running, so
  SvelteKit handles the URL via the Node route; install
  `ttfautohint` system-wide (brew / apt) to exercise hinting in dev.
  In Vercel production, the Python file at the same URL path takes
  precedence per Vercel's `/api/*.py` routing.

**Deploy steps (one-time, dashboard click each):**

1. Push to a Vercel-connected branch.
2. Vercel auto-detects `api/requirements.txt` and installs the
   Python runtime + ttfautohint-py for the function.
3. Verify the GET health check responds at `/api/hint-font` returning
   `{"available": true, "version": "..."}`.

No env vars required.

**Other options we ruled out:**

- Option 1 — bundling the Linux binary in the repo (~3 MB to git,
  plus `vercel.json` `includeFiles`). Works but uglier than letting
  pip handle the binary install.
- Option 3 — separate Fly.io / Cloud Run worker. Cleanest separation
  but adds infrastructure cost + complexity. Revisit if Vercel's
  Python runtime ever caps out (10-second cold start currently fine
  for hinting workloads).

## License note

`ttfautohint` is **GPLv2 / FreeType dual-licensed**. Running it as a
separate process and consuming its output (the hinted font) is the
"classic firewall" pattern and is the same arrangement Glyphs, FontLab,
and Google Fonts use. Bundling the binary in a closed-source npm
package would be murkier. Consult a lawyer if shipping commercially.

## What if the hinter is unavailable?

The Export UI's "Hint for Windows" checkbox is disabled when the GET
`/api/hint-font` health-check reports `available: false`. Users can
still export an unhinted static TTF; the toggle is purely opt-in. If
hinting is requested but the call fails at runtime, the export falls
back to the unhinted TTF and surfaces a toast.

## What this does NOT cover

- **Variable fonts.** ttfautohint can't hint VFs (the bytecode would
  fight the axis interpolation). The Variable TTF export path bypasses
  hinting by design.
- **CFF/PostScript hinting.** OTF/CFF uses a different hint system.
  `psautohint` was archived in July 2024; Adobe consolidated on
  `otfautohint` (in AFDKO). Not currently wired up.
- **Manual hint editing.** The professional workflow has a dedicated UI
  for manual TT hints (stem deltas, alignment zones). Not in scope for
  Phase 1.

## Long-term direction

[Skrifa](https://github.com/googlefonts/fontations) (Rust) is replacing
FreeType in Chrome. It currently *executes* hints but doesn't generate
them — [issue #1215](https://github.com/googlefonts/fontations/issues/1215).
When that lands, the right answer is a Rust→wasm port we can run
client-side, eliminating the server hop entirely. Until then,
server-side `ttfautohint` is the pragmatic choice.
