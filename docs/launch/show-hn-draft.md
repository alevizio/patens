# Show HN — draft

**Status:** Draft for use **at public launch** (TypeCon Portland, Aug 6–8, 2026). Do **not** post during private alpha; HN expects a working public link.

**Timing (per research-notes.md):** Tuesday 5–8 AM PT is the next-best window after the now-saturated 9:30 AM PT peak (~200 daily competitors per King's Apr 2026 188K-post analysis). Submit then, log in, watch the comment queue for the first ~2 hours, then leave the thread to its own gravity.

**Cross-post timing:** TypeDrawers + r/typography go **T+24h** with a link to the HN discussion (per research-notes — pre-warming risks tripping HN's voting-ring detection). See `typedrawers-intro.md` for that post.

---

## Title (one of these — pick on the day based on what's on HN's front page)

### Variant A (positioning-first, recommended)

```
Show HN: Patens – a browser type editor with a 94-rule audit that teaches
```

(80 chars exact — fits HN's title limit cleanly)

### Variant B (mechanism-first)

```
Show HN: Patens – type design in the browser with plain-English audit
```

### Variant C (audience-first, more inviting)

```
Show HN: I built a type editor that explains itself while you draw
```

---

## Post body (paste into the URL+text field; ~210 words)

I'm Alejandro. I've been building Patens — a browser-native type editor (MIT) built around a 94-code audit module that teaches as you draw.

The audit covers contour shape, vertical metrics, sidebearing class drift, OpenType invariants, naming, coverage, anchors, variable masters, and color/brief checks. Each code carries the kind of plain-English explanation type designers usually get from years of mentorship; about 30 ship a one-click fix. Same engine is also a CLI — `npx patens audit your-project.font.json` for CI.

What's new: every rule page now ships canonical references — the primary literature (OpenType spec, TrueType reference, AGL, FEA spec, UFO 3, Unicode 16, Stop Stealing Sheep, Knuth Metafont papers, etc.) where the rule is actually established. 49 of 94 codes covered in the open MVP corpus; the craft canon (Tracy, Smeijers, Noordzij, Cheng) needs licensing — Q3 work. Try `/audit/metrics-cap-above-ascender`.

Toolchain: pressure-sensitive sketch → Bézier trace, kerning, variable fonts, COLR/CPAL color fonts, OTF/WOFF2/TTF/UFO export. Nothing leaves your browser unless you export. PWA, offline. Solo-maintained.

Site: https://patens.design

Comparison vs every other tool: https://patens.design/compare

Happy to talk about: the audit dictionary, the citation engine's licensing posture, Schneider curve fitting for the trace step, kerning classes.

---

## Anticipated comments + draft responses

**"How is this different from Glyphr Studio / Fontra?"**

> Glyphr Studio and Fontra are the two other browser-native editors and both are good — Glyphr Studio is the closest peer (also MIT, also in-browser, also offline). The difference is the audit layer + the citation engine: neither ships a continuous rules-based check with plain-English explanations, and neither links each rule to the primary literature where it's established. Glyphr Studio gives you the tools; Patens gives you the tools plus the mentor in the margin plus the bibliography. Comparison row-by-row at /compare.

**"What's the citation engine?"**

> Each /audit/[code] page surfaces canonical references — the primary literature (OpenType spec, TrueType reference, Adobe Glyph List, FEA spec, UFO 3, Unicode 16, Stop Stealing Sheep, OpenType Cookbook, Knuth Metafont papers) where the rule is established. 49 of 94 codes covered in the open MVP corpus right now. The craft canon (Tracy 1986, Smeijers 1996, Noordzij 1985, Hochuli 1987, Cheng 2006) requires licensing — Q3 2026 publisher-relations work. The licensing matrix is documented at github.com/alevizio/patens/blob/main/docs/research/canonical-library.md.

**"Why not use fontmake / fontTools directly?"**

> Patens does use fontTools (via Pyodide + WASM) for the TTF + autohinting pipeline — the OTF + WOFF2 path is opentype.js because that's faster and works without the Pyodide boot. The audit module is the part that's de novo: it's a Web Worker running 94 deterministic checks against the live project state, with a single `describeAuditCode()` dictionary feeding five UI surfaces.

**"Pricing model?"**

> Free. MIT. There's no paywall on the editor and the goal is to never put one there. I'll sponsor through GitHub Sponsors at some point if running costs warrant it, but the editor + audit + every fix stay open.

**"How do you handle Bézier intersection / boolean union for the trace step?"**

> polygon-clipping for the union, then Schneider's algorithm (1990) for curve fitting against the unioned polygon. The audit module also has self-intersection + winding-collision checks specifically to catch what the trace step occasionally leaves behind.

**"Is the audit module pluggable? Can I add my own rule?"**

> Currently the 94 codes are compiled into the bundle (TypeScript-typed). A pluggable rule API is on the roadmap (`ROADMAP.md` in the repo) but isn't shipped — I want to lock the existing dictionary first before opening the surface. If you want to propose a rule, file an issue with the code name + the plain-English explanation + an example glyph that triggers it.

**"Are the export pipelines audited / tested against existing fonts?"**

> Yes — there's a round-trip suite (`pnpm test`) that imports several reference fonts (Inter, Source Serif, a couple of demo projects), runs them through the export pipeline, and asserts the output matches the input within tolerance. 722 unit tests, 66 e2e + axe-core a11y tests, OpenSSF Scorecard badge in the README.

**"What about the AI tools (Lipi, Fontish)?"**

> They're in the comparison table — different category. Lipi and Fontish lead with "describe a font, AI makes it." Patens leads with "draw it, the audit teaches you why it works." Both have a place; the audit-as-teaching slot is the one nobody else occupies.

**"Why MIT instead of OFL?"**

> The CODE is MIT. The fonts you make with Patens are yours under whatever license you pick. The demo OTF (Studio Geometric) is MIT too because it's part of the codebase, but a font you draw is independent IP.

---

## Pre-flight checklist (the day of)

- [ ] `patens.design` returns 200 with all variants of OG card rendering correctly (curl `/og/brand`, `/og/audit`, `/og/compare` and verify each is a valid PNG)
- [ ] `patens.design/audit` and `patens.design/compare` load fast (< 2s LCP)
- [ ] Waitlist signup works end-to-end (test with a throwaway address, then delete the entry)
- [ ] Repo README's "Try it" links resolve cleanly (no 404, no auth wall on the public surfaces)
- [ ] CHANGELOG entry for the public-launch version is published
- [ ] Bluesky + X + Instagram all have pinned launch posts queued for ~30 min after submit
- [ ] `hi@patens.design` is being checked actively — HN questions can spill there
- [ ] One iced coffee at the ready

---

## After submission

- Save the HN post URL the moment it appears
- Watch the comment queue for the first 2 hours (respond fast on questions, slow on debates — don't feed)
- Don't ask for upvotes anywhere; HN sniffs that out
- Update `docs/launch/handoff-{date}.md` with the post URL + cohort metrics
- T+24h: cross-post to TypeDrawers + r/typography with the HN link (see `typedrawers-intro.md`)
