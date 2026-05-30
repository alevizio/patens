# Vercel OSS Program — Application Copy

**Program:** [vercel.com/open-source-program](https://vercel.com/open-source-program) — Spring 2026 cohort
**Deadline:** June 3, 2026
**Award:** $3,600 Vercel platform credits over 12 months + OSS Starter Pack + priority community support

Drop-in copy for whatever the application form asks. Three pitch lengths plus per-question answers. Use the version that fits each field; for free-form fields, lead with the long version.

---

## Project basics

| Field | Value |
|---|---|
| **Project name** | Patens |
| **Repository** | [github.com/alevizio/patens](https://github.com/alevizio/patens) |
| **License** | MIT |
| **Live URL** | [patens.design](https://patens.design) |
| **Maintainer** | Alejandro Vizio · [@patenstype](https://x.com/patenstype) · `hi@patens.design` |
| **Started** | 2025 (current public marketing surface since early 2026) |
| **Stack** | SvelteKit 2 + Svelte 5, TypeScript strict, Tailwind v4, opentype.js, Pyodide + ttfautohint (WASM), Vercel Blob, Vercel Edge OG (Satori + resvg) |
| **Hosting** | Vercel (Production + Preview) |
| **Code of Conduct** | `CODE_OF_CONDUCT.md` — Contributor Covenant |
| **Security policy** | `SECURITY.md` — disclosure via `security@patens.design` |

---

## Pitch — three lengths

### Short (50 words — for one-line "what is this" fields)

Patens is a browser-native, MIT-licensed type editor with a 94-rule audit module built in. Every rule is explained in plain English; about 30 ship one-click fixes. The audit module *is* the editor's spine — it teaches type design as you draw, which is positioning no other browser editor occupies.

### Medium (150 words — for project-description fields)

Patens is a browser-native type design tool with an audit module built into its spine. The 94 codes — covering contour geometry, vertical metrics, sidebearings, OpenType invariants, naming, coverage, anchors, variable fonts, and color/brief checks — run continuously alongside the editor, each with a plain-English explanation of the underlying type-design principle. Around 30 ship a one-click fix; the rest are surfaced as designer-judgment matters.

The audit doubles as a CLI (`npx patens audit your-project.font.json`) so the same checks run in CI against client deliverables. Every project lives in IndexedDB, nothing leaves the browser unless the user chooses to export. MIT-licensed, no installs, no accounts. Solo-maintained by [Alejandro Vizio](https://github.com/alevizio), shipping toward public launch at **TypeCon Portland, August 6–8, 2026**.

### Long (300 words — for "tell us about your project" fields)

Patens is a browser-native, open-source type design tool. The differentiator isn't *that* it runs in a browser — Fontra and Glyphr Studio do that too. It's that the **audit module is a first-class citizen of the editor**, not a separate lint step. Every contour, every metric, every kern pair is checked continuously against a library of 94 codes spanning contour geometry, vertical metrics, sidebearing class drift, OpenType invariants, naming, script coverage, anchor placement, variable-font master constraints, and color/brief completeness. Each finding carries a plain-English explanation of the underlying type-design principle — the kind of knowledge type designers internalize through years of mentorship — and around 30 codes ship a one-click fix.

The same 94 codes are also available as a CLI: `npx patens audit your-project.font.json` runs the engine against any `.font.json` from the terminal, returning machine-readable JSON, severity-filtered exit codes (CI-friendly), or GitHub Actions PR annotations. Type foundries can lint-check client deliverables; CI can gate releases on the same checks the editor runs interactively.

The full toolchain — pressure-sensitive sketch → cubic-Bézier trace, direct contour editing, variable fonts with 2D variation explorer, OpenType features with live HarfBuzz preview, COLR/CPAL color fonts, kerning + classes, OTF/WOFF2 (in-browser) and TTF + ttfautohint (Pyodide WASM) export, designer-bundled `.zip` and portable `.font.json` source — works offline as a PWA. Projects live in IndexedDB; nothing leaves the browser unless the user chooses to export.

Solo-maintained by Alejandro Vizio. Currently in private alpha by invitation; public launch at **TypeCon Portland, August 6–8, 2026**.

---

## Why this matters / what's novel

No other browser-based type editor positions itself around **audit-as-pedagogy**. The comparison table at [patens.design/compare](https://patens.design/compare) walks through 26 distinguishing features across 11 tools (FontLab, Glyphs, Fontra, RoboFont, Glyphr Studio, typlr, BirdFont, FontForge, Lipi, Fontish). Three rows are unique to Patens:

1. **94-code teaching audit module** with plain-English explanations
2. **One-click "Fix" actions** on around 30 of those codes
3. **Plain-English explanations** for every issue surfaced

That positioning matters because type design has a steep learning curve, and the existing tools either assume you already know the rules (FontLab, Glyphs, RoboFont) or strip the rules out entirely (Fontra, Glyphr Studio, AI-first tools like Lipi and Fontish that bypass design judgment altogether). Patens is the editor that teaches the rules *while* you're using it — a category the existing field doesn't serve.

---

## Open source bona fides

- **License:** MIT (`LICENSE`)
- **Repo:** public on GitHub since first commit
- **Code of Conduct:** Contributor Covenant (`CODE_OF_CONDUCT.md`)
- **Contributing guide:** `CONTRIBUTING.md`
- **Security policy:** `SECURITY.md` (private disclosure to `security@patens.design`)
- **OpenSSF Scorecard:** badge in README, scored regularly
- **CI:** GitHub Actions — type-check, unit tests (722), Playwright e2e + axe-core a11y (66 tests across 31 routes), production build
- **CITATION.cff** for academic + AI-engine citation
- **Solo-maintained, signed work** — every footer carries `— Alejandro`; the maintainer is identifiable, contactable, and accountable

---

## Plans for the credits

Patens is a Vercel-native project — the entire production stack is Vercel:

- **Production + Preview deploys** of the SvelteKit app
- **Vercel Blob** for the private-alpha waitlist (key = `sha256(email)`, deduped) and for cloud-share blobs (with token-based auth, `constantTimeEqual` for the token compare)
- **Edge Functions** for the per-page Satori OG image renderer (7 marketing variants + per-project specimen cards) — currently rendering against a single Inter TTF in a Swiss-design layout
- **Static prerendered marketing surface** — 19 EN routes + 10 ES mirrors
- **Per-deploy preview URLs** for design review with alpha testers

The $3,600 over 12 months would cover (a) the ramp from private-alpha traffic to public-launch traffic at TypeCon — currently ~zero to projected thousands of monthly visitors during launch week, (b) Blob storage as the waitlist + cloud-share corpus grows, (c) Edge Function invocations for OG cards as Show HN / TypeDrawers / r/typography / Bluesky traffic compounds. No marketplace providers required.

---

## Maintainer

**Alejandro Vizio** — product designer who also programs. Built Patens as a personal tool because the existing type editors were either expensive (FontLab $499, Glyphs $300, RoboFont $400), platform-locked (Glyphs macOS-only, RoboFont macOS-only, FontLab macOS+Windows-only), or rule-stripped (Fontra/Glyphr ship without the audit + teaching layer). Solo-maintained; the entire repo, the marketing surface, the OG card renderer, the CLI, the test suite, and the launch plan are all one person's work, by intention — a foundry-of-one position that matches how the typography field actually evolves.

Contact: `hi@patens.design` · [github.com/alevizio](https://github.com/alevizio) · [@patenstype](https://x.com/patenstype) on X · [@patens.design](https://bsky.app/profile/patens.design) on Bluesky · [@patens.type](https://instagram.com/patens.type) on Instagram

---

## Links to send the reviewer

- **Marketing surface (long-scroll editorial):** [patens.design](https://patens.design)
- **The Method (the 94 codes by family):** [patens.design/audit](https://patens.design/audit)
- **Comparison vs the field:** [patens.design/compare](https://patens.design/compare)
- **About + tech stack:** [patens.design/about](https://patens.design/about)
- **Repo:** [github.com/alevizio/patens](https://github.com/alevizio/patens)
- **CHANGELOG:** [patens.design/changelog](https://patens.design/changelog) · [RSS](https://patens.design/changelog/rss.xml)
- **Architecture deep-dive:** `ARCHITECTURE.md` in the repo

---

## After submission

- Save the application timestamp + submission ID
- If accepted: provision Blob storage with extra headroom, enable OG rendering at Edge tier, document the credit utilization in `docs/launch/vercel-credit-burn.md` for the eventual graduation handoff
- If wait-listed: ask for specific feedback to strengthen the next cohort application
