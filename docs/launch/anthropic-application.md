# Anthropic — Application Copy

**Programs targeted:**
- [Anthropic for Startups](https://www.anthropic.com/startups) — credits program for early-stage builders shipping with Claude
- [Anthropic Research Credits](https://www.anthropic.com/research) — separate research / education / pedagogy track

**Target ask:** $25K startup credits **+** $25K research credits (cumulative $50K, applied as a single coordinated pitch).

**Deadline:** Rolling cohorts, no hard deadline. Target submission: week of June 7, 2026, after the Vercel OSS submission lands (June 3).

**Maintainer:** Alejandro Vizio · `hi@patens.design` · [github.com/alevizio](https://github.com/alevizio) · [@patenstype](https://x.com/patenstype)

This file is paste-ready for either portal. Lead with the **research framing** (which is the distinctive wedge) and stack the startup angle below. The same copy serves both applications; tweak only the top-level "why this program" question per submission.

---

## Project basics

| Field | Value |
|---|---|
| **Project name** | Patens |
| **Repository** | [github.com/alevizio/patens](https://github.com/alevizio/patens) |
| **License** | MIT |
| **Live URL** | [patens.design](https://patens.design) |
| **Maintainer** | Alejandro Vizio · `hi@patens.design` |
| **Funding stage** | Self-funded, pre-revenue, solo-maintained. No VC. No outside capital. |
| **Stack** | SvelteKit 2 + Svelte 5, TypeScript strict, Tailwind v4, opentype.js, Pyodide + ttfautohint (WASM), Vercel Blob, Anthropic Messages API via BYOK proxy |
| **Current Claude usage** | `/api/ai/messages` BYOK proxy → `claude-opus-4-7` for audit-code explanations, kerning suggestions, brief coherence pass (alpha-gated) |
| **Launch context** | Private alpha now; public launch at **TypeCon Portland, August 6–8, 2026** |
| **Research artifacts** | `docs/research/canonical-library.md`, `docs/research/ai-audit-mapping.md`, `docs/research/multi-script-canon.md`, `docs/research/ai-features-roadmap.md` |

---

## Pitch — three lengths

### Short (50 words)

Patens is the first browser-native MIT type editor with a 94-code audit module that uses AI to *deepen* type-design discipline rather than bypass it. We are publishing the first empirical study of vision-model agreement with deterministic type-design audit across the full code set. Launches at TypeCon Portland, August 2026.

### Medium (150 words)

Patens is a browser-native type design tool with an audit module built into its spine — 94 codes spanning contour geometry, vertical metrics, sidebearings, OpenType invariants, naming, coverage, anchors, variable fonts, and color/brief checks, each with a plain-English explanation of the underlying type-design principle.

We have classified all 94 codes against AI augmentation: **75 algorithm-only, 11 vision-augmented, 1 vision-primary, 3 LLM-augmented**. Our research methodology designs the first empirical experiment measuring vision-language-model agreement with a deterministic type-design audit across the full code set — no prior baseline exists in the literature.

Anthropic credits would fund (a) the published vision-audit kappa-numbers experiment, (b) a RAG citation engine over a 10-source open canonical-typography corpus, (c) a shared-key demo tier on patens.design so first-visit users experience audit-as-teaching without configuring an API key. Public launch at **TypeCon Portland, August 6–8, 2026**.

### Long (300 words) — research-led

Patens is the first browser-native type editor with a 94-code audit module that uses AI to *deepen* type-design discipline rather than bypass it. Our research has classified all 94 codes against AI augmentation: **75 are algorithm-only, 11 are vision-augmented, 1 is vision-primary, 3 are LLM-augmented** (see `docs/research/ai-audit-mapping.md` §1). We are publishing the first empirical study of vision-model agreement vs deterministic geometric audit across the full code set — methodology fully specified in our research docs (`ai-audit-mapping.md` §3, "Methodology for empirical measurement").

The wedge is **audit-as-pedagogy**. Every existing AI tool in the type-design market (Lipi, Fontish) *bypasses* the discipline by generating fonts. Patens does the inverse: the deterministic audit fires, Claude provides a second layer (historical citation, perceptual confirmation, multi-script grounding, brief coherence, adversarial review), and the designer reads both and makes the call. We stay on the designer's side of the canvas.

Three research tracks underpin the work, all already drafted as living docs in the repo:
1. **Canonical Library** (`docs/research/canonical-library.md`) — 38 primary sources, licensing matrix, 10-source open-licensed MVP starter corpus covering all 9 audit families
2. **AI-Audit Mapping** (`docs/research/ai-audit-mapping.md`) — the 75/11/1/3 classification, top-10 vision-augmented candidates, ~$100 weekend experiment design with Cohen's-kappa methodology
3. **Multi-Script Canon** (`docs/research/multi-script-canon.md`) — Cyrillic, Greek, Arabic, Hebrew, Devanagari, CJK with native-tradition citations, addressing documented colonialist VLM bias in non-Latin extension

Anthropic credits fund the empirical work and the shared-key demo at **TypeCon Portland, August 6–8, 2026**. MIT-licensed, public repo, 722 tests, OpenSSF Scorecard, CodeQL SAST in CI. Solo-maintained. Credits go directly to product and research, not headcount.

---

## Why this is research-grade

This is the load-bearing section for the **research credits** track. Audit-as-teaching is *literally* a pedagogy claim — Patens is not a "Claude wrapper looking for a use case," it is a measurable craft pedagogy system with publishable research artifacts.

### Four research claims, each grounded in a real document

**Claim 1 — The 94-code audit module is the first systematic dictionary of type-design rules with stable IDs and plain-English explanations.**

The Patens audit catalogue (`src/lib/font/audit-catalogue.ts` in the repo, surfaced at [patens.design/audit](https://patens.design/audit)) gives every type-design rule a stable code, a plain-English summary, and a teaching-prose explanation of *why* the rule exists. No prior tool has done this: Font Bakery and Fontspector are deterministic linters with internal check-IDs but no pedagogical layer. The Patens dictionary is *itself* a research artifact — citable, versionable, and the input substrate for everything downstream.

**Claim 2 — The vision-augmentation methodology is novel; no prior baseline exists for VLM agreement with type-design audit tools.**

`docs/research/ai-audit-mapping.md` §6 ("Existing research") establishes this gap explicitly. Prior VLM benchmarks measure font *recognition* ([Reading ≠ Seeing](https://arxiv.org/pdf/2603.08497); [Texture or Semantics?](https://arxiv.org/pdf/2503.23768) — frontier VLMs score 15–40% on family recognition). The Patens experiment measures *judgment*: given a rendered glyph plus ground-truth audit findings, can the VLM perceptually confirm or dissent? §3 of the same doc specifies the full empirical protocol — 25-font sample across canonical/proprietary/novice tiers, 3-model comparison (claude-opus-4-7 primary, Gemini-3-Flash and GPT-5.2 secondaries), Cohen's-kappa statistics with bootstrap CIs, stratified breakdown by text-face vs display-face. Output: a citable kappa-numbers report, the first of its kind.

**Claim 3 — The citation engine is the first RAG-based type-design pedagogy system grounded in primary sources.**

`docs/research/canonical-library.md` §4 lists the 10-source open-licensed starter corpus: OpenType Specification 1.9.1, Apple TrueType Reference Manual, Adobe Glyph List + AGLFN, Adobe FEA File Specification, UFO 3 specification, Unicode Standard 16.0, Spiekermann's *Stop Stealing Sheep* (CC-licensed PDF), Tal Leming's *OpenType Cookbook*, Klim Type Foundry's "Design Information" essays (with archive.org snapshots per §3.5), and Knuth's 1979 "Mathematical Typography" + "Metafont" papers. Together they cover all 9 audit families. The retrieval target is the 94-code audit dictionary; the citation is the output. No existing tool does this — type-design literature has been transmitted orally and through apprenticeship (`canonical-library.md` Preamble); the citation engine is the first attempt to surface that tacit-craft knowledge as explicit, citeable signal at the moment of error.

**Claim 4 — The multi-script grounding work addresses documented colonialist bias in LLMs when extending Latin typefaces to non-Latin scripts.**

`docs/research/multi-script-canon.md` §1 (Cyrillic) and §2 (Greek) name the specific failure modes — Cyrillic К imported as Latin K, Greek α proposed as Latin two-storey a, Helvetica Greek as the cautionary "Latin-ised Greek" lineage Leonidas critiques — and ground the LLM prompts in native-tradition designers (Yefimov, Zhukov, Korolkova for Cyrillic; Leonidas, Vlachou for Greek). The corpus design is deliberately anti-default: AI surfaces what the *script's own tradition's masters did*, not what a Latin-centric pattern-match would propose.

### Citable deliverables tied to credits

- A **publishable kappa-numbers report** on vision-vs-audit agreement across the 10 top vision-augmented codes (target: κ > 0.6 substantial agreement on ≥5 codes, honest negative results on the rest — `ai-audit-mapping.md` §3.5 commits to the methodology, §4 lists predicted failure modes, §6 commits to honest exploratory framing).
- An **open-source citation engine demo** at [patens.design/audit](https://patens.design/audit) — every audit code page surfaces a primary-source citation via RAG over the 10-source corpus.
- A **TypeCon Portland presentation** (August 6–8, 2026) showcasing both deliverables to the working type-design community — the first audience that can validate or falsify the research at scale.

Each deliverable is a checkable artifact, not a marketing claim. Reviewers should click through to the research docs and verify the work is real.

---

## What we'd use credits for — startup track

Patens currently runs Anthropic on a BYOK (bring-your-own-key) basis: users paste their own key into the app and Claude responses are proxied through `/api/ai/messages`. This is the right default for power users but a friction wall for first-visit traffic. Startup credits would fund a **shared-key demo tier on the marketing site** so the audit-as-teaching experience is reachable without configuration.

### Specific features waiting on credits

| Feature | Status | Credits unlock |
|---|---|---|
| **"Explain (AI)" on every audit code page** at `/audit` | Live for BYOK users today | Shared-key demo for first-visit users (~30 codes worth of cached explanations + on-demand for the rest) |
| **AI kerning suggestions UI** in the editor | Designed; pre-launch shippable | Shared-key tier for alpha invitees so we get real usage data before TypeCon |
| **Brief-to-glyph coherence check** (`ai-features-roadmap.md` Feature 4) | Methodology drafted | Shared-key tier for the release pre-flight surface |

### Monthly burn estimate

- **Current** (private alpha, BYOK only): **~$200/month** Anthropic spend on the maintainer's own key for development + manual QA across the audit catalogue.
- **TypeCon launch surge** (Aug 4 Show HN → Aug 6–8 conference → Aug 9–30 inbound press): projected **~$2,000–$5,000/month** for the shared-key demo absorbing first-visit traffic. Modeled on a Show HN front page + TypeDrawers thread + a sympathetic write-up driving 50K–200K monthly visitors with ~5% engaging the AI surfaces.
- **Steady state Q4 2026**: projected **~$1,000–$3,000/month** as launch surge settles into organic adoption and BYOK uptake reduces shared-key dependency.

$25K startup credits buys roughly 6–12 months of runway at launch-surge burn — exactly the window we need to validate the shared-key tier without it becoming a permanent cost surface.

### Architectural note: BYOK preserved

The existing `/api/ai/messages` proxy supports a fallback chain (`env.SHARED_KEY` → user key → 401). Credits would enable the `SHARED_KEY` path for the demo; user-supplied keys still take precedence. No re-architecture required, and BYOK remains the documented default. See `ai-features-roadmap.md` "Cross-cutting concerns" → "BYOK preserved across all features."

---

## What we'd use credits for — research track

Research credits fund the empirical work that makes Patens publishable, not just usable.

### Three experiments, sized and specified

**Experiment 1 — Vision-model vs deterministic-audit agreement.**
Per `ai-audit-mapping.md` §3 methodology (§3.1 sample selection, §3.2 model selection, §3.3 prompt engineering, §3.4 gold-standard labelling, §3.5 statistical methodology, §3.6 cost estimation). Budget: ~$100 for the exploratory weekend run (maintainer-only labelling, Tier C novice fonts), **$300 for publishable rigor** with the 1-external-designer panel and the full 3-tier sample. Output: per-code kappa numbers with 80% bootstrap CIs, stratified text-face vs display-face, multiple-comparison-corrected.

**Experiment 2 — Citation-engine RAG over the 10-source open corpus.**
Per `canonical-library.md` §4 sprint plan (4–6 weeks of solo work). Budget: API costs for retrieval QA + generation evaluation across the ingestion pipeline. Estimated **$500–$1,500** depending on how many retrieval evaluation runs we do per audit code. Output: an open-source matcher (94 audit codes → 1–3 best citations each) live at [patens.design/audit](https://patens.design/audit).

**Experiment 3 — Multi-script grounding evaluation.**
Per `multi-script-canon.md` §1 (Cyrillic) + §2 (Greek) + §3 (Arabic). Budget: cost of comparing prompt-grounded vs unground baseline LLM suggestions across a 30-glyph extension test set per script, scored against the native-tradition design pitfalls catalogued in each section's "Common pitfalls when adapting Latin designs." Estimated **$1,000–$3,000** for a publishable cross-script comparison. Output: a measurable demonstration that prompt-grounding reduces the colonialist-default failure rate.

### Citable deliverables (restated against credits)

- **Kappa-numbers report**, published as `docs/research/ai-audit-experiment-results.md` and submitted to ATypI / Journal of the Letterform / Typographica.
- **Open-source citation engine demo** at [patens.design/audit](https://patens.design/audit), with the matcher code and corpus index in the public repo.
- **Multi-script grounding paper**, framing AI-augmented type design through the documented native traditions (per `multi-script-canon.md`'s LLM prompt-grounding seeds) rather than Latin-as-default.
- **TypeCon Portland presentation**, August 6–8, 2026 — the working type-design community as the validation surface.

### Total research-track ask: $25K

$25K research credits funds Experiment 1 at publishable rigor, Experiments 2 and 3 in full, plus the API budget for an iterative ATypI submission cycle and an extension of the corpus into 2–3 more audit families. Anthropic gets a high-visibility example of Claude used for measurable craft pedagogy with publishable methodology — not a generic LLM-wrap.

---

## Why Patens is a uniquely good fit

- **MIT-licensed, open-source, public repo.** Everything is auditable: code, research docs, audit catalogue, marketing surface, citation index. No black-box claims.
- **722 tests, 66 Playwright + axe-core e2e tests across 31 routes, OpenSSF Scorecard badge, CodeQL SAST in CI.** Engineering rigor matches the research rigor; the project is built to be inspected.
- **Solo-maintained.** Credits go directly to product work and research artifacts — there is no marketing or sales layer to fund.
- **Pedagogical positioning is core to the brand, not bolted on.** The 94-code audit is the spine of the editor — five teaching surfaces (edit panel, audit page, release pre-flight, family hub, home page) all flow through a single `describeAuditCode()` dictionary. There is no "AI mode" — Claude is the second layer on top of an existing pedagogical substrate.
- **We are publishing the research as part of the work.** `docs/research/` already contains four draft documents (canonical library, AI-audit mapping, multi-script canon, AI features roadmap). The grant funds completing the experiments and writing the papers; the foundations are already there.
- **Anthropic gets a high-visibility example of Claude used for measurable craft pedagogy** — not a generic LLM-wrap. Type design is a 500-year-old discipline with a literate, opinionated community; landing well here means landing in a space that prizes rigor.

---

## Open source bona fides

- **License:** MIT (`LICENSE`)
- **Repo:** public on GitHub since first commit — [github.com/alevizio/patens](https://github.com/alevizio/patens)
- **Code of Conduct:** Contributor Covenant (`CODE_OF_CONDUCT.md`)
- **Contributing guide:** `CONTRIBUTING.md`
- **Security policy:** `SECURITY.md` (private disclosure to `security@patens.design`)
- **OpenSSF Scorecard:** badge in README, scored regularly
- **CI:** GitHub Actions — type-check, unit tests (722), Playwright e2e + axe-core a11y (66 tests across 31 routes), production build, CodeQL SAST
- **CITATION.cff** for academic + AI-engine citation
- **Solo-maintained, signed work** — every footer carries `— Alejandro`; the maintainer is identifiable, contactable, and accountable.

---

## Maintainer

**Alejandro Vizio** — product designer who also programs. Built Patens as a personal tool because the existing type editors were either expensive (FontLab $499, Glyphs $300, RoboFont $400), platform-locked (Glyphs macOS-only, RoboFont macOS-only, FontLab macOS+Windows-only), or rule-stripped (Fontra/Glyphr ship without the audit + teaching layer). Solo-maintained; the entire repo, the marketing surface, the OG card renderer, the CLI, the test suite, the research foundations, and the launch plan are all one person's work, by intention — a foundry-of-one position that matches how the typography field actually evolves.

Currently publishing the canonical research foundation for AI-augmented type design at [github.com/alevizio/patens](https://github.com/alevizio/patens) — see `docs/research/`.

Contact: `hi@patens.design` · [github.com/alevizio](https://github.com/alevizio) · [@patenstype](https://x.com/patenstype) on X · [@patens.design](https://bsky.app/profile/patens.design) on Bluesky · [@patens.type](https://instagram.com/patens.type) on Instagram

---

## Links to send the reviewer

- **Marketing surface:** [patens.design](https://patens.design)
- **The Method (the 94 codes by family):** [patens.design/audit](https://patens.design/audit)
- **Comparison vs the field:** [patens.design/compare](https://patens.design/compare)
- **About + tech stack:** [patens.design/about](https://patens.design/about)
- **Repo:** [github.com/alevizio/patens](https://github.com/alevizio/patens)
- **Research foundations:** `docs/research/` in the repo (4 docs: canonical-library, ai-audit-mapping, multi-script-canon, ai-features-roadmap)
- **Architecture deep-dive:** `ARCHITECTURE.md` in the repo
- **CHANGELOG:** [patens.design/changelog](https://patens.design/changelog) · [RSS](https://patens.design/changelog/rss.xml)

---

## After submission — internal notes

- Save the submission timestamp + reference ID for **both portals** (startup + research) in `docs/launch/grant-submissions-log.md`.
- If **both accepted**: research portion takes priority (more strategic — citable artifacts compound over time); startup portion provides operational runway for the shared-key demo through TypeCon and the first quarter post-launch.
- If **only one accepted**: take whichever and apply to the other one in 6 months with traction data (TypeCon engagement metrics, kappa-numbers report views, GitHub stars, foundry adoption).
- If **neither accepted**: ask for specific feedback. The research docs are durable assets either way; they unlock NLnet, Mozilla MOSS, Sovereign Tech Fund, GitHub Secure Open Source Fund applications in parallel. See `docs/launch/oss-programs-survey.md` for the full pipeline.
- **Submission timing:** week of June 7, 2026 (after Vercel OSS Jun 3 lands). Anthropic rolling cohorts mean no calendar pressure; the constraint is research-doc readiness, which is now met.
