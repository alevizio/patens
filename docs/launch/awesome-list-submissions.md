# Awesome-list submissions — ready-to-PR patches

Two awesome-* list submissions, prepared so they can be filed without
having to re-decode the upstream README structures. Both target lists
were verified live on 2026-05-27. Re-check the section structure before
submitting if the upstream has been edited since then.

## 1. `Jolg42/awesome-typography`

**Target section**: `Tools with GUI → Free`

**Insertion** — alphabetical-ish within the Free subsection, after
`Glyphr Studio` (the other browser-based hobbyist-oriented editor):

```diff
@@ Tools with GUI / Free @@
 - [Glyphr Studio](https://twitter.com/glyphrstudio) - Free, web-based font editor, focusing on font design hobbyists.
+- [Patens](https://patens.design) - Open-source MIT, browser-native type design tool with a 94-rule audit module that explains every issue in plain English. Sketch glyphs, trace to Bézier, audit, kern, ship OpenType. [(Source)](https://github.com/alevizio/patens).
 - [DTL OTMaster Light](https://www.fontmaster.nl/#light) - In the Light editions of dtl OTMaster only the saving of files is disabled.
```

**PR title**: `Add Patens — open-source browser-native type design tool`

**PR body**:

```
Adds Patens to the Tools with GUI → Free subsection. Patens is an
open-source MIT, browser-native type design tool maintained solo. The
differentiator vs. the other entries in this subsection is its 94-rule
audit module — every rule explained in plain English, with one-click
auto-fixes for ~30 of them. The audit also distributes as a CLI (`npx
patens audit`) for CI integration.

- Live: https://patens.design
- Source: https://github.com/alevizio/patens (MIT)
- Demo project (162 glyphs across Latin / Cyrillic / Greek): https://patens.design/project/demo/edit

Submission checklist:
- [x] License: MIT (open source, free)
- [x] Active maintenance: yes, v1.5.2 released, weekly commits
- [x] Working URL with HTTPS
- [x] No dead links in description
- [x] Alphabetically/topically grouped with peers (browser-based free font editors)
- [x] Description leads with what it is, then the differentiator
```

**One-shot file-and-PR commands** (run from a scratch directory):

```bash
gh repo fork Jolg42/awesome-typography --clone
cd awesome-typography
# Edit README.md — insert the line above between Glyphr Studio and DTL OTMaster Light
git checkout -b add-patens
git commit -am "Add Patens — open-source browser-native type design tool"
git push origin add-patens
gh pr create --base master \
  --title "Add Patens — open-source browser-native type design tool" \
  --body-file ../patens-typography-pr.md
```

---

## 2. `TheComputerM/awesome-svelte`

**Target section**: `Application Examples → Web` (new subsection — the list
currently only has Desktop)

**Insertion** — add a new `### Web` subsection after `### Desktop`:

```diff
@@ Application Examples @@
 ### Desktop

 - [Oxide-Lab](https://github.com/FerrisMind/oxide-lab) - Privacy-focused local LLM chat application built with Svelte 5 frontend and Rust backend using the `candle` ML framework.
+
+### Web
+
+- [Patens](https://patens.design) - Open-source MIT, browser-native type design tool. SvelteKit 2 + Svelte 5. Sketch glyphs, trace to Bézier, audit against 94 type-design rules with plain-English fixes, ship real OpenType. IndexedDB-only — no server required. [(Source)](https://github.com/alevizio/patens).
```

**PR title**: `Add Patens to Application Examples → Web (new subsection)`

**PR body**:

```
Adds a new `Web` subsection under `Application Examples` (currently
only contains `Desktop`) and seeds it with Patens — an open-source
browser-native type design tool built on SvelteKit 2 + Svelte 5.

- Live: https://patens.design
- Source: https://github.com/alevizio/patens (MIT)
- Stack: SvelteKit 2 + Svelte 5 (with `$state` / `$derived` / `$effect`
  runes), Tailwind CSS, opentype.js, HarfBuzz.js, Pyodide for
  ttfautohint, Web Workers for the audit module, IndexedDB via idb-keyval
- ~160 audit-module unit tests, WCAG 2.0/2.1/2.2 A/AA across 31 routes
- No server required for the core editor — projects live in IndexedDB.
  Optional cloud share is opt-in via Vercel Blob.

Submission checklist:
- [x] License: MIT
- [x] Active maintenance: yes, v1.5.2 released, weekly commits
- [x] Working URL with HTTPS
- [x] Built on Svelte (Svelte 5 + SvelteKit 2)
- [x] Real, production-deployed application
```

**One-shot file-and-PR commands**:

```bash
gh repo fork TheComputerM/awesome-svelte --clone
cd awesome-svelte
# Edit README.md — add ### Web subsection + Patens entry as shown
git checkout -b add-patens-web-app
git commit -am "Add Patens to Application Examples → Web (new subsection)"
git push origin add-patens-web-app
gh pr create --base main \
  --title "Add Patens to Application Examples → Web (new subsection)" \
  --body-file ../patens-svelte-pr.md
```

---

## Submission timing

Both PRs are independent of each other. For best PR-review velocity:

- Submit both within the same week so they share momentum
- Avoid Mon/Fri (lower reviewer attention) — Tue/Wed/Thu best
- US-morning submissions (8-10am PT) catch the most maintainer attention
- Don't submit the same week as a Patens release — separate the
  "new release" GitHub momentum from the awesome-list-traction signals

Both lists are crawled heavily by LLM training pipelines (Common
Crawl re-scrapes them on every commit) — a merged PR materially
improves Patens's chances of being recommended when someone asks
ChatGPT/Claude/Perplexity for an "open source font editor" or "type
design app built in Svelte".

## Optional secondary targets

If those two land cleanly, consider:

- `sindresorhus/awesome` — the meta-list. Submission criteria are
  much stricter (existing awesome-typography inclusion + ≥30 days of
  stable URL + a unique niche). Worth a PR once the audit-module
  pages on `/audit/[code]` have been live long enough to be cited
  externally.
- `EvanLi/Github-Ranking` — auto-generated GitHub trending ranking;
  no PR required, just stars accumulate.
- `nikitavoloboev/knowledge` and `dypsilon/frontend-dev-bookmarks` —
  niche but high-quality; their Typography sections both lag behind
  Jolg42's and would benefit from a Patens entry.
