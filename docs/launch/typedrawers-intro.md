# TypeDrawers + r/typography intro — draft

**Status:** Draft for use **T+24h after the Show HN post** (TypeCon launch week, Aug 6–8, 2026). Posting these BEFORE Show HN risks tripping HN's voting-ring detection — flip the order, then cross-link.

**TypeDrawers section:** "New tools & fonts" (or "Type design technique" if a moderator suggests reroute — both fit).

**r/typography:** post as a self-text with the HN link embedded.

**Voice:** TypeDrawers audience knows the craft. Don't explain x-height, sidebearings, or what a kern class is — they'll resent the over-explanation. Lead with respect for the existing tradition (Klim, Dinamo, Type Network, Hoefler), then show what's new. r/typography is a slightly broader audience but same register holds.

---

## Title (TypeDrawers)

```
Patens — a browser-based type editor with a 101-rule continuous audit (MIT, open source)
```

## Title (r/typography)

```
[Show & Tell] Patens — open-source browser type editor with a built-in audit module that explains itself (free, MIT)
```

---

## Post body — TypeDrawers (~450 words, more technical register)

Hi everyone — long-time lurker, first-time poster. I've been building a browser-based type editor called **Patens** for the last while, and after a stretch of private alpha I'm putting it in front of the people who'll actually have opinions worth hearing.

[patens.design](https://patens.design) — long-scroll editorial. The repo: [github.com/alevizio/patens](https://github.com/alevizio/patens) (MIT).

The pitch is short: every browser-based type tool that's shipped so far either (a) gives you the drawing surface and trusts you to remember the rules — Fontra, Glyphr Studio, typlr — or (b) skips the rules entirely and asks an LLM to do the work — Lipi, Fontish. Patens is the editor that runs a 102-code audit module continuously alongside the drawing surface, with a plain-English explanation on every code, sourced from the type-design tradition (the kind of reading you do in Detail in Typography, the conversations on this forum, watching someone like Tobias Frere-Jones rep a kerning class in a workshop). Around 30 of the 94 ship a one-click fix; the rest are surfaced as designer-judgment matters with prose context — `xheight-misaligned`, `sidebearing-class-drift-lsb`, `aperture-asymmetric`, etc.

The audit module isn't an afterthought — it's the spine. A single `describeAuditCode()` dictionary feeds five UI surfaces (edit panel, audit page, release pre-flight, family hub, home page) so the same prose appears wherever a finding shows up. The same engine is also a CLI — `npx patens audit your-project.font.json` — so foundries can lint-check client deliverables in CI with GitHub Actions PR annotations.

Each of the 94 rule pages now also surfaces **canonical references** — the primary literature where the rule is established. 89 of 101 codes cite the open MVP corpus (OpenType spec, TrueType reference, AGL, FEA spec, UFO 3, Unicode 16, Stop Stealing Sheep, OpenType Cookbook, Knuth's Metafont papers, variablefonts.io primer). The 8 remaining codes are the ones whose authority sits squarely in the in-copyright craft canon — Tracy 1986, Smeijers 1996, Noordzij 1985, Hochuli 1987, Cheng 2006 — which need publisher relations before body-text ingestion. Try `/audit/metrics-cap-above-ascender` for a rule with a clean spec citation, or `/audit/sharp-kink` to see the honest license-required note. Full licensing matrix at [docs/research/canonical-library.md](https://github.com/alevizio/patens/blob/main/docs/research/canonical-library.md).

The rest of the toolchain is what you'd expect:

- Pressure-sensitive sketch → trace-to-cubic-Bézier (polygon-clipping union + Schneider curve fitting against the unioned polygon)
- Direct anchor editing, smooth ↔ corner, multi-select transforms
- Variable fonts with multiple masters, named instances, 2D variation explorer for ≥2-axis projects
- OpenType features auto-detected from AGLFN-style glyph-name suffixes, live HarfBuzz shaping preview, custom .fea merged with auto-generated rules
- Kerning + classes with silhouette-distance auto-kern, family-wide resolution at export
- COLR v0/v1 + CPAL color fonts with live color-plan rendering
- Mark-positioning anchors with the `top` / `_top` convention + component composites
- Export: OTF + WOFF2 via opentype.js (browser), TTF + ttfautohint via Pyodide WASM, UFO via the same Pyodide route, portable `.font.json` source, designer-bundled `.zip`
- Real PWA — works offline once the bundle's cached
- Specimen sheet (Cmd+P → PDF) — pangram waterfall, reading specimens, in-context mockups, glyph inspector with metric guides + sidebearings + anchor viz

Where I'd value feedback specifically:

1. **The 101 codes themselves** — are there checks you've internalized over the years that aren't on the list? `patens.design/audit` walks through them by family. I want this dictionary to read as the canonical inventory of "things a mentor would point out," which means the omissions matter as much as the inclusions.

2. **The trace step.** It's Schneider's algorithm from 1990 running against a polygon-clipping union of the sketch strokes. Mostly fine, but there are edge cases — extreme weight contrast, sharp serifs, pinched apertures — where the curve fit drops points that I'd have kept. Curious whether anyone here has used a different fit and has opinions on tolerance + control-point density.

3. **The "designer judgment" codes vs the one-click "Fix" codes.** Right now the boundary is mechanical — codes with a clear deterministic resolution get a fix button, codes that depend on the typeface's overall character don't. I'm not sure that's the right line.

The comparison page at [patens.design/compare](https://patens.design/compare) walks through 26 distinguishing features across 11 tools (FontLab, Glyphs, RoboFont, Fontra, Glyphr Studio, typlr, BirdFont, FontForge, Lipi, Fontish) — happy to debate any cell that looks wrong from where you sit.

Hacker News discussion (if you want the broader-tech angle): [HN link]

Thanks for reading. Patens stays free, stays MIT, stays browser-native. The goal is the mentor in the margin — that's the foundry-of-one position.

— Alejandro Vizio
[patens.design](https://patens.design) · [@patenstype](https://x.com/patenstype) · `hi@patens.design`

---

## Post body — r/typography (~280 words, slightly broader register)

Hi r/typography — I'm Alejandro, and I've been building **Patens**, a browser-native open-source type editor (MIT). After a stretch of private alpha it's public today.

The headline feature is an audit module built into the editor's spine — 102 rules covering contour shape, vertical metrics, sidebearings, OpenType invariants, naming, script coverage, anchors, variable masters, and color/brief checks. Each one carries a plain-English explanation of the underlying principle, and around 30 ship a one-click fix. The rest are surfaced as matters of designer judgment with prose context.

The audit-as-teaching layer is what's novel — the existing browser editors (Fontra, Glyphr Studio, typlr) don't have it, and the new AI tools (Lipi, Fontish) sidestep the design judgment entirely. Patens sits in the middle: the editor does the drawing, the audit teaches the rules.

Toolchain underneath:

- Pressure-sensitive sketch + trace-to-Bézier
- Direct contour editing, kerning + classes, variable fonts, OpenType features, COLR/CPAL color fonts, anchors, components
- Live HarfBuzz shaping preview
- OTF + WOFF2 in-browser, TTF + autohinting via Pyodide WASM
- The same audit engine as a CLI: `npx patens audit your-project.font.json` for CI integration
- Real PWA, works offline, projects live in IndexedDB — nothing leaves the browser unless you choose to export

The marketing page is long-scroll editorial — annotated specimen of the demo font, an interface mock of the editing surface, the 101 codes by family, and a comparison vs every other tool in the field. The /audit page is the canonical reference for the codes.

- Site: [patens.design](https://patens.design)
- Repo (MIT): [github.com/alevizio/patens](https://github.com/alevizio/patens)
- Hacker News discussion: [HN link]

Happy to answer anything. The goal is for the editor to teach as it goes — let me know if it does.

— Alejandro

---

## Pre-flight (T+24h, before posting)

- [ ] HN link is live and copy-able
- [ ] HN thread is alive (some comments, not buried)
- [ ] Marketing site still 200, no overnight regression
- [ ] CHANGELOG up to date so a clicker from these forums sees current work
- [ ] `hi@patens.design` cleared — TypeDrawers DMs occasionally route there

## After posting

- TypeDrawers community is small + opinionated — engage quickly on technical questions, slowly on stylistic ones
- r/typography is broader — answer the "how do I try this" questions fast and link to /audit for the rules-list
- Save both URLs into `handoff-{date}.md` so the analytics dashboard tracks them
