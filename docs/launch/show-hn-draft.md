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

## Post body (paste into the URL+text field; ~180 words)

I'm Alejandro. I've been building Patens — a browser-native type editor (MIT) that does the usual things (pressure-sensitive sketch, trace-to-Bézier, kerning, variable fonts, OpenType features, color fonts, OTF + WOFF2 + TTF + UFO export) but is built around an audit module that runs continuously alongside the editor.

The audit has 94 codes: contour shape, vertical metrics, sidebearing class drift, OpenType invariants, naming, coverage, anchors, variable masters, and color/brief checks. Each one carries the kind of plain-English explanation type designers usually get from years of mentorship, and about 30 ship a one-click fix. Same engine is also a CLI — `npx patens audit your-project.font.json` for CI.

Nothing leaves the browser unless you choose to export. Works offline (PWA). Solo-maintained.

Site (long-scroll, with the editor mock + the 94 codes by family + comparison vs every other tool in the field): https://patens.design

Comparison: https://patens.design/compare

Happy to talk about: how the audit dictionary is structured, why Schneider curve fitting for the trace step, why opentype.js + Pyodide instead of native fontmake, what's hard about kerning classes.

---

## Anticipated comments + draft responses

**"How is this different from Glyphr Studio / Fontra?"**

> Glyphr Studio and Fontra are the two other browser-native editors and both are good — Glyphr Studio is the closest peer (also MIT, also in-browser, also offline). The difference is the audit layer: neither ships a continuous rules-based check with explanations. Glyphr Studio gives you the tools; Patens gives you the tools plus the mentor in the margin. Comparison row-by-row at /compare.

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
