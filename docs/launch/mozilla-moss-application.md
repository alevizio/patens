# Mozilla Open Source Support (MOSS) — Application Copy

**Program:** [mozilla.org/en-US/moss](https://www.mozilla.org/en-US/moss/) — Mozilla Open Source Support
**Track:** Track 1 / Foundational (the general MOSS track for projects that significantly advance Mozilla's mission; revise if the reviewer suggests a more specific track at intake)
**Target ask:** **$25,000 – $50,000** (mid-range request within MOSS's $5K–$150K band)
**Deadline:** Rolling (Mozilla MOSS reviews applications on a rolling basis; expected 6–12 weeks for committee evaluation)
**Maintainer:** Alejandro Vizio · `hi@patens.design`

Drop-in copy for whatever the MOSS application form asks. Three pitch lengths plus per-section answers. For free-form fields, lead with the long version.

---

## Project basics

| Field | Value |
|---|---|
| **Project name** | Patens |
| **Repository** | [github.com/alevizio/patens](https://github.com/alevizio/patens) |
| **License** | MIT |
| **Live URL** | [patens.design](https://patens.design) |
| **Maintainer** | Alejandro Vizio · [@patenstype](https://x.com/patenstype) · `hi@patens.design` |
| **Started** | 2025 (public marketing surface since early 2026) |
| **Stack** | SvelteKit 2 + Svelte 5, TypeScript strict, Tailwind v4, opentype.js, Pyodide + ttfautohint (WASM), Web Workers, IndexedDB via idb-keyval, Service Worker (PWA) |
| **Code of Conduct** | `CODE_OF_CONDUCT.md` — Contributor Covenant |
| **Security policy** | `SECURITY.md` — private disclosure via `security@patens.design` |
| **Accessibility** | WCAG 2.0 + 2.1 + 2.2 A/AA enforced via axe-core in CI across 31 routes |
| **Internationalisation** | EN + ES (Rioplatense voseo); audit module covers Latin + Cyrillic + Greek |

---

## Pitch — three lengths

### Short (50 words)

Patens is the first browser-native, MIT-licensed type editor that ships an entire professional discipline — type design — using only open web standards. Privacy by default (IndexedDB-local, no telemetry), accessible by default (WCAG AA enforced in CI), and multi-script by design (Latin + Cyrillic + Greek today; Arabic, Hebrew, Devanagari on the roadmap).

### Medium (150 words)

Type design has been desktop-only since the 1980s. FontLab, Glyphs, RoboFont — all native installs, mostly macOS-locked, $300–$500 each. Patens proves the open web can host this discipline: a SvelteKit app that runs in a browser tab using Canvas, IndexedDB, WebAssembly (Pyodide + ttfautohint), Web Workers, and a service worker for offline-first PWA behaviour. Every project lives in the user's browser; nothing leaves the machine unless they choose to export.

The audit module — 101 codes covering contour geometry, vertical metrics, OpenType invariants, and multi-script coverage — is the editor's spine. WCAG 2.0 + 2.1 + 2.2 A/AA is enforced via axe-core in CI across 31 routes. The marketing surface ships in English and Rioplatense Spanish. MIT-licensed, solo-maintained, public CHANGELOG, transparent governance. Public launch at **TypeCon Portland, August 6–8, 2026**.

### Long (300 words)

**Patens is the first browser-native type editor that ships in a browser tab using only open web standards.** Type design — the discipline that produces every font you read — has been macOS-only and proprietary since the 1980s. FontLab ($499), Glyphs ($300), and RoboFont ($400) are the industry tools; all three require native installs, two are macOS-only, and none are open source. Patens proves the open web can host a professional discipline that has never lived there before.

The technical foundation is entirely open: Canvas for the drawing surface, IndexedDB (via `idb-keyval`) for project persistence, WebAssembly (Pyodide running ttfautohint) for TTF export, Web Workers for non-blocking audit passes, and a service worker that makes the entire editor offline-first as a PWA. The browser is the runtime; no install, no platform lock, no proprietary dependency.

Patens is MIT-licensed and WCAG AA enforced in CI — `axe-core` runs against 31 routes in Playwright on every push. Privacy is default-on: every project lives in the user's IndexedDB; there is no telemetry, no analytics SDK, no tracking cookies; the optional Anthropic API integration uses user-provided keys that are discarded after each request.

Multi-script tooling already covers Latin (162 glyphs), Cyrillic (17 look-alikes + bespoke Я, Ж, Ф), and Greek (14 uppercase look-alikes). The marketing surface ships in English and Spanish (Rioplatense voseo). Post-launch work targets Arabic, Hebrew, and Devanagari — three writing systems that the existing tool field has historically underserved, grounded by a 692-line research foundation already committed to the repo (`docs/research/multi-script-canon.md`).

Solo-maintained by Alejandro Vizio. Public launch at **TypeCon Portland, August 6–8, 2026**.

---

## Mozilla mission alignment

Patens advances Mozilla's mission on five concrete axes — not as marketing claims, but as architectural decisions already in the shipped codebase:

### 1. Open web

Patens runs in any modern browser using only standards-track web platform APIs: Canvas, IndexedDB, WebAssembly, Web Workers, Service Worker, Web App Manifest, Pointer Events. There is no install, no platform lock, no native SDK. This is the open web hosting a professional discipline — type design — that has been desktop-only since the 1980s. The browser becomes a viable runtime for a category of work it has never reached before, which expands what "the open web" demonstrably can do.

### 2. Privacy by default

Every project lives in the user's local IndexedDB. There is no telemetry, no analytics SDK (no GA, no Plausible, no Posthog), no tracking cookies, no fingerprinting. The cloud-share path is opt-in and uses token-based auth with constant-time comparison; the share page is `ssr=false` and reads from local IndexedDB rather than a server. The optional Anthropic API integration requires the user to supply their own key, which is held in `sessionStorage` and proxied per-request — the server never persists keys. This is privacy-as-architecture, not privacy-as-policy.

### 3. Accessibility

WCAG 2.0 + 2.1 + 2.2 A/AA is enforced via `axe-core` running in Playwright across 31 routes on every push. CI fails on accessibility regressions; the badge is load-bearing. This level of accessibility enforcement is rare in design-tooling — the desktop incumbents (FontLab, Glyphs, RoboFont) ship with no published WCAG conformance at all. Roadmap: a screen-reader-aware contour editing surface for the SVG drawing canvas (currently the most inaccessible surface in the editor).

### 4. Open source / open standards

MIT-licensed since first commit. Public repo with full CHANGELOG, Contributor Covenant CoC, SECURITY.md private-disclosure path, CITATION.cff for academic citation, OpenSSF Scorecard scoring. Every output format is open: OTF and WOFF2 (W3C standards), TTF (open), UFO (open source standard), and a portable `.font.json` source format. No proprietary exchange format anywhere in the pipeline.

### 5. Inclusivity — multi-script and i18n

The audit module already covers Latin + Cyrillic + Greek. The marketing surface ships in English and Spanish (Rioplatense voseo — a deliberate brand choice that respects regional linguistic identity rather than defaulting to "neutral Spanish"). The repo contains a 692-line research foundation (`docs/research/multi-script-canon.md`) that scaffolds the next phase: Arabic, Hebrew, Devanagari — three writing systems serving more than a billion combined readers — built with native-tradition grounding (Huda Smitshuijzen AbiFarès for Arabic, Ismar David and Shani Avni for Hebrew, Mukund Gokhale and Vaibhav Singh for Devanagari) rather than Latin-default pattern matching. Per Mozilla's mission, advancing the open web means non-Latin writing systems get first-class treatment from day one, not as v2 features.

---

## What we'd use the funding for

A $25K–$50K MOSS grant would fund three concrete, scope-bounded work packages, each shippable independently. Mozilla gets a high-visibility production example of all five mission axes advancing in coordinated public work.

### Work package 1 — Multi-script expansion: Arabic, Hebrew, Devanagari starter sets

**~$10K · 2–3 months**

- Finish Greek lowercase coverage (14 glyphs: α β γ δ ε ζ η θ ι κ λ μ ν ξ ο π ρ σ ς τ υ φ χ ψ ω) with single-storey α, open ε, and properly descending ρ — grounded in Gerry Leonidas's primer and Irene Vlachou's anatomy work.
- Finish Cyrillic bespoke shapes (Я, Ж, Ф, Ц, Щ, Ъ, Ы, Ь, Э, Ю) plus cursive italic forms (skoropis-derived, structurally different from a mechanical slant) — grounded in Vladimir Yefimov and Maxim Zhukov.
- Launch Arabic starter set with isolated / initial / medial / final joining behaviour and rhombic-dot proportional anchors (no x-height matching) — grounded in Huda Smitshuijzen AbiFarès and Kristyan Sarkis.
- Launch Hebrew starter set with correct contrast direction (heavy horizontals, thin verticals — the opposite of Latin) and the five final-form letters — grounded in Ismar David and Shani Avni.
- Launch Devanagari starter set with shirorekha-anchored layout (no baseline), seven-level vertical metrics, and basic conjunct support — grounded in Mukund Gokhale and Vaibhav Singh.

Each script ships with a documented audit-code family expansion: shape-specific checks that flag the known anti-patterns (mechanical italic slant for Cyrillic / Greek / Hebrew / Devanagari; x-height matching for Arabic; Latin-shape α for Greek; serif terminations forced onto Hebrew).

### Work package 2 — Screen-reader accessibility for the drawing canvas

**~$10K · 2 months**

The Edit canvas is currently an SVG with pointer-event handlers — it is structurally inaccessible to screen-reader users. This work package designs and implements a keyboard-driven contour-editing mode that exposes contour topology (anchor points, handle vectors, segment relationships) through accessible primitives (ARIA tree, live regions for state changes, semantic labels per anchor). The deliverable is the first screen-reader-aware type-design surface in any tool, desktop or browser-based. Open governance: the spec is drafted publicly in `docs/research/a11y-contour-editing.md` and reviewed by at least one screen-reader-using contributor before implementation lands.

### Work package 3 — WCAG 2.2 AAA criteria where feasible

**~$5K · 1 month**

Beyond the current AA enforcement, target the AAA criteria that meaningfully improve type-design workflows: target-size 44×44 (handle-grabbing on small screens), focus-not-obscured (toolbar overlap on dense edit views), contrast-enhanced (4.5:1 minimum for all UI chrome — currently 3:1 in places per design-token review), and content-on-hover-or-focus criteria for the audit-code tooltip system. Each criterion ships with an `axe-core` rule wired into CI so AAA conformance is enforced, not aspirational.

**Total: ~$25K minimum, ~$50K maximum with extended scope on each work package.**

---

## Open source bona fides

- **License:** MIT (`LICENSE`)
- **Repo:** public on GitHub since first commit ([github.com/alevizio/patens](https://github.com/alevizio/patens))
- **Code of Conduct:** Contributor Covenant (`CODE_OF_CONDUCT.md`)
- **Contributing guide:** `CONTRIBUTING.md`
- **Security policy:** `SECURITY.md` (private disclosure to `security@patens.design`)
- **OpenSSF Scorecard:** badge in README, scored regularly
- **CI:** GitHub Actions — type-check, unit tests (722), Playwright e2e + axe-core a11y (66 tests across 31 routes), production build
- **CITATION.cff** for academic + AI-engine citation
- **Public CHANGELOG** — every release at [patens.design/changelog](https://patens.design/changelog) with RSS
- **Public research foundation** — `docs/research/multi-script-canon.md` (692 lines, native-tradition grounded) ships with the codebase
- **Solo-maintained, signed work** — every footer carries `— Alejandro`; the maintainer is identifiable, contactable, and accountable

---

## Maintainer bio

**Alejandro Vizio** — product designer who also programs. Built Patens as a personal tool because the existing type editors were either expensive (FontLab $499, Glyphs $300, RoboFont $400), platform-locked (Glyphs macOS-only, RoboFont macOS-only, FontLab macOS+Windows-only), rule-stripped (Fontra and Glyphr Studio ship without the audit and teaching layer), or AI-replacement (Lipi and Fontish bypass design judgment altogether).

The repo, the marketing surface, the OG card renderer, the CLI, the test suite, the multi-script research foundation, and the launch plan are all one person's work — by intention. The "foundry-of-one" position is the position from which the typography field has historically evolved, and Patens is intentionally built that way to model what a self-sustaining open-source typography practice can look like.

Contact: `hi@patens.design` · [github.com/alevizio](https://github.com/alevizio) · [@patenstype](https://x.com/patenstype) on X · [@patens.design](https://bsky.app/profile/patens.design) on Bluesky

---

## Why Patens specifically

**An entire professional discipline currently has no browser-native open-source path.** Type design has been macOS-and-proprietary since the 1980s. The browser-based alternatives that exist (Fontra, Glyphr Studio) either depend on a desktop runtime, strip out the pedagogical layer, or both. Patens is alone in the position of being open source, browser-native, accessibility-enforced, and multi-script-grounded simultaneously.

**The multi-script work specifically advances writing-system equity on the open web.** Mozilla has historically funded work that brings non-Latin scripts to parity with Latin on the web platform — fonts, rendering, shaping, layout. Patens extends that principle to the *authoring* layer: the tools that produce the fonts. Funding multi-script tooling means the next generation of Arabic, Devanagari, and Hebrew typefaces can be designed in a browser, by anyone, without paying a $400 Mac-only tax. This is the kind of leverage Mozilla's mission frame is built to fund.

**Transparent, solo-maintained, MIT, with the research foundation already public.** There is no opaque infrastructure to audit, no corporate roadmap to second-guess. The codebase, the audit codes, the research notes, the launch plan, the OG renderer, the CLI, the test suite — every layer is in the public repo. A MOSS reviewer can read everything in an afternoon.

---

## Links to send the reviewer

- **Marketing surface (long-scroll editorial):** [patens.design](https://patens.design)
- **The Method (the 101 audit codes by family):** [patens.design/audit](https://patens.design/audit)
- **Comparison vs the field:** [patens.design/compare](https://patens.design/compare) — 11 tools × 26 features
- **About + tech stack:** [patens.design/about](https://patens.design/about)
- **Repo:** [github.com/alevizio/patens](https://github.com/alevizio/patens)
- **Multi-script research foundation:** `docs/research/multi-script-canon.md` in the repo
- **Architecture deep-dive:** `ARCHITECTURE.md` in the repo
- **CHANGELOG:** [patens.design/changelog](https://patens.design/changelog) · [RSS](https://patens.design/changelog/rss.xml)
- **Spanish mirror (Rioplatense voseo):** [patens.design/es](https://patens.design/es)

---

## After submission

- **Process expectation:** Mozilla's MOSS review process is more involved than Vercel or FUTO — typically multiple rounds over 6–12 weeks. Be prepared for follow-up questions on accessibility specifics (axe-core rule coverage, screen-reader testing matrix), privacy specifics (Anthropic key handling, exact telemetry boundary), and multi-script specifics (which native-tradition sources ground each script's audit codes).
- **Record:** Save the submission timestamp + reference ID in `docs/launch/grants-applied.md`.
- **Timing:** If accepted, funding lands *after* TypeCon Portland (Aug 6–8) — which is actually the more strategic window. Pre-launch funding gets spent on launch noise; post-launch funding can be spent on the documented work packages above with real user feedback in hand.
- **If accepted:** Provision a public "MOSS-funded work" board in the repo so progress against each work package is visible to Mozilla and to the wider community. Open governance on each deliverable.
- **If wait-listed or declined:** Request specific feedback on which mission-alignment axis the committee found least compelling — that signal is more valuable than the grant itself for sharpening the next application (NLnet Aug 1 cycle, Sovereign Tech Q3/Q4 2026, EU-STF if it materialises).
