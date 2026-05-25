# Post-deploy QA checklist

Run after every production deploy. The goal: catch the things automated CI can't see — runtime-only failures, environment-specific bugs, asset bundling issues.

Two of these (1 + 2) were missed by CI in v1.4.0's first deploy and broke OG image rendering for everyone. Both are now in this checklist.

## 1. Smoke-test every public URL

Returns 200 + correct Content-Type:

```sh
for url in / /help /changelog /about /sitemap.xml /changelog/rss.xml \
           /health /manifest.json /icon-192.png /icon-512.png \
           /og/brand /og/demo /og/home /share/demo /share/nonexistent-404; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://patens.design$url")
  ctype=$(curl -s -I "https://patens.design$url" | grep -i "^content-type:" | head -1 | tr -d '\r')
  printf "%-32s %s %s\n" "$url" "$code" "$ctype"
done
```

Expected:
- `/`, `/help`, `/changelog`, `/about`, `/share/demo` — `200 text/html`
- `/share/nonexistent-404` — `200 text/html` (renders the share-link 404 page)
- `/sitemap.xml` — `200 application/xml`
- `/changelog/rss.xml` — `200 application/rss+xml`
- `/health` — `200 application/json`
- `/manifest.json` — `200 application/json`
- `/icon-192.png`, `/icon-512.png` — `200 image/png`
- `/og/brand`, `/og/demo`, `/og/home` — `200 image/png` ← these depend on native bindings + bundled fonts; first thing to fail when serverless function build changes

## 2. OG image renders an actual image, not a 200-with-error-body

OG endpoints can return 200 with a JSON error payload if the catchall function fails late (the error gets serialised after headers go out). Verify the body is a PNG, not text:

```sh
curl -s "https://patens.design/og/brand" | wc -c
# expect: ~30,000 bytes (a real PNG)
# if: < 1000 bytes, fetch the body and inspect — likely a JSON error
```

If it's a JSON error, the most common causes (in order seen):
- Native binding missing — `@resvg/resvg-js-linux-x64-gnu`. Fix: deploy without `--prebuilt` so Vercel builds on Linux + installs the right native bindings.
- Static asset path missing — fonts in `static/` aren't bundled with serverless functions. Fix: keep fonts under `src/lib/og-fonts/` and read via `$app/server`'s `read()` (Vite embeds them in the function bundle).

## 3. Health endpoint reports the right version

```sh
curl -s https://patens.design/health | jq
```

The `version` field should match `package.json`'s version. If it lags behind, the drift fix from v1.4.0 (commits `83f0744` + `520acf6`) regressed.

## 4. Open the demo project end-to-end

In a real browser:
1. Visit `https://patens.design/`
2. Click "Open the example project"
3. Lands on `/project/{uuid}/edit` with 128 glyphs visible in the left strip
4. Click a few glyph tiles — each loads in the canvas
5. Tab through Spacing, Audit, Features, Preview, Specimen, Compare, Release, Export — every tab mounts without crashing
6. Cmd+P from /share/demo — print preview renders the specimen

If any tab crashes or a glyph fails to draw, the editor regression coverage missed something. Check the browser console.

## 5. Share + cloud upload (if `BLOB_READ_WRITE_TOKEN` is configured)

1. From the editor or home page, click "Copy share link"
2. Open the copied URL in an Incognito window (no IndexedDB carry-over)
3. The project loads from cloud blob
4. OG image preview unfurls correctly when pasting the URL into Slack / Twitter / Bluesky

## 6. RSS feed parses

```sh
curl -s https://patens.design/changelog/rss.xml | xmllint --noout -
# expect: no output (valid XML)
```

Each `<item>`'s `<link>` should land on the right `/changelog#1-4-0-2026-05-24` anchor when clicked.

## 7. Cold-load profile (perf sanity check)

```sh
pnpm profile                                      # home
pnpm profile https://patens.design/share/demo
pnpm profile https://patens.design/project/demo/edit
```

The script (`scripts/profile-cold-load.mjs`) drives headless Chromium against the URL, captures the CDP Performance trace, and digests:

- **FCP / LCP / DOMContentLoaded** — should be < 1500ms on prod for `/` and `/share/demo`; the editor allows up to ~1700ms because of bigger bundles.
- **Long tasks (≥50ms)** — drive `max-potential-fid` in Lighthouse. Should be 0; if any appear, the JS bundle is doing more work on cold load than it should.
- **Layout events (≥4ms)** — drive `forced-reflow-insight`. Initial layout is fine; multiple ≥20ms passes after FCP indicate `$effect`s reading + writing DOM in the same frame.

Full trace dumped to `/tmp/font-studio-trace.json` — open in `chrome://tracing` or DevTools → Performance → Load profile for a graphical view.

Baseline (v1.4.0, commit `d335121`):
- `/`: 1319ms FCP, 0 long tasks, 20ms initial layout
- `/share/demo`: 823ms FCP, 0 long tasks, 11.6ms initial layout
- `/project/demo/edit`: 874ms FCP, 0 long tasks, 35ms layout at glyph-browser mount

## 8. Lighthouse + axe-core (deferred-but-tracked)

CI runs both:
- `axe-core` via Playwright on /home, /learn, /families, /help, /changelog, /about, /share/demo + every project tab. Fails on critical/serious violations.
- `lighthouse-ci` via `treosh/lighthouse-ci-action` against `patens.design/`, `/share/demo`, `/project/demo/edit`. Category scores capped via `lighthouserc.json`.

After deploy, watch the Lighthouse action — it triggers on `ci` workflow_run success, waits 90s for Vercel to roll, then runs. Failures here often surface AFTER the smoke test passes.

## 9. CI status

```sh
gh run list --branch main --limit 3 --json status,conclusion,name
```

All three should be `success`. If `ci` is `failure`, all subsequent Dependabot PRs are also blocked.

---

## What to do if QA fails

1. **Capture the error.** `curl -s URL | jq` or `curl -sI URL`. The function logs surface via `vercel logs URL`.
2. **Reproduce locally if possible.** `pnpm dev` + hit the same URL. If the bug doesn't reproduce, it's environment-specific (Vercel runtime, Linux-only, edge function constraints).
3. **Fix forward, don't revert.** A revert ships the same regression to anyone who already pulled. A fix-forward commit + redeploy is faster and clearer.
4. **Add the failure mode to this checklist.** The checklist exists because *this category of bug already escaped CI once*. If you found a new one, the next person needs to know.
