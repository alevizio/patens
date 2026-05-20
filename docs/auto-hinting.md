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

### Production (Vercel deploy)

Three options, listed easiest → most flexible:

#### Option 1 — bundle the binary in the repo *(simple, ~3 MB)*

1. Download a Linux x86_64 build from
   [source-foundry/ttfautohint-build releases](https://github.com/source-foundry/ttfautohint-build/releases)
   (latest stable: `v1.8.3.2`, Sep 2019).
2. Place at `bin/ttfautohint` and `chmod +x bin/ttfautohint`.
3. Add a `vercel.json` with:

   ```json
   {
   	"functions": {
   		"src/routes/api/hint-font/+server.ts": {
   			"includeFiles": "bin/ttfautohint"
   		}
   	}
   }
   ```

4. Set the env var in the Vercel dashboard:

   ```
   TTFAUTOHINT_BIN = bin/ttfautohint
   ```

#### Option 2 — Python serverless function *(no binary in git)*

Replace the route with a Vercel Python function under
`api/hint-font.py` using
[`ttfautohint-py`](https://pypi.org/project/ttfautohint-py/) (PyPI,
last release Aug 2024). The wrapper ships the binary internally;
`requirements.txt` is enough.

#### Option 3 — separate worker service

Deploy a small Fly.io / Cloud Run / Workers container with the binary,
have the SvelteKit route proxy to it. More moving parts but isolates
the GPL'd binary from the closed-source app artifact.

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
