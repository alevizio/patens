# GitHub Secure Open Source Fund — Application Copy

**Program:** [github.com/security/secure-open-source-fund](https://github.com/security/secure-open-source-fund) — rolling cohorts
**Deadline:** Rolling (next cohort window per the GitHub blog announcement)
**Award:** ~$10K maintainer stipend + a structured security-hardening sprint (OpenSSF Scorecard tuning, SAST review, dependency audit, supply-chain controls, threat-model writeup)

Drop-in copy for whatever the application form asks. Three pitch lengths plus per-question answers. Use the version that fits each field; for free-form fields, lead with the long version.

---

## Project basics

| Field | Value |
|---|---|
| **Project name** | Patens |
| **Repository** | [github.com/alevizio/patens](https://github.com/alevizio/patens) |
| **License** | MIT |
| **Live URL** | [patens.design](https://patens.design) |
| **Maintainer** | Alejandro Vizio · [github.com/alevizio](https://github.com/alevizio) · `security@patens.design` (security) · `hi@patens.design` (general) |
| **Started** | 2025 (current public marketing surface since early 2026) |
| **Stack** | SvelteKit 2 + Svelte 5, TypeScript strict, Tailwind v4, opentype.js, Pyodide + ttfautohint (WASM), Vercel Blob, Vercel Edge OG (Satori + resvg) |
| **CLI distribution** | `npx patens audit` — single bundled ESM (esbuild), Node ≥ 22 |
| **Code of Conduct** | `CODE_OF_CONDUCT.md` — Contributor Covenant |
| **Security policy** | `SECURITY.md` — RFC 9116 `security.txt` at `/.well-known/security.txt`, private disclosure to `security@patens.design` |

---

## Pitch — three lengths

### Short (50 words — for one-line "what is this" fields)

Patens is a browser-native, MIT-licensed type editor whose 97-code audit module also ships as a CLI (`npx patens audit`) that font foundries are positioning into client-deliverable CI pipelines. That makes the binary supply-chain-adjacent. The hardening sprint would land *before* TypeCon Portland public launch.

### Medium (150 words — for project-description fields)

Patens is a browser-native type design tool with a 97-code audit module at its spine. The same audit module also ships as a CLI — `npx patens audit your-project.font.json` — designed for type foundries to lint client deliverables in GitHub Actions. That positioning is the supply-chain story: a compromised `patens` binary running inside a foundry's CI pipeline could tamper with outbound `.font.json` artifacts, alter audit verdicts, or exfiltrate proprietary client work.

Patens already runs OpenSSF Scorecard, CodeQL SAST, dependency review, CycloneDX SBOM, and signed commits + signed tags. The sponsored hardening sprint would close the specific remaining gaps — SLSA provenance for the npm release, fuzz testing beyond the existing property-test invariants, reproducible builds for the WOFF2/OTF export pipeline, and CLI-surface hardening — *before* public launch at TypeCon Portland, August 6–8, 2026.

### Long (300 words — for "tell us about your project" fields)

Patens is an MIT-licensed, browser-native type design tool. The differentiator is the **97-code audit module** — a teaching layer that runs continuously alongside the editor, explaining type-design rules in plain English with one-click fixes where applicable. That same audit module is shipped as a CLI: `npx patens audit your-project.font.json` returns machine-readable JSON, severity-filtered exit codes, or GitHub Actions PR annotations.

The CLI is the supply-chain story. Type foundries running Patens in CI to lint client deliverables — auditing every PR against the same 97 codes the editor uses interactively — create a real attack surface. A compromised `patens` npm package could silently tamper with outbound `.font.json` artifacts, alter audit verdicts to mask defects, or exfiltrate proprietary glyph data from the foundry's pipeline. Type design hasn't had a supply-chain incident yet; getting ahead of one before Patens has meaningful CI install volume is exactly the kind of pre-emptive hardening this fund exists for.

Patens is *not* starting from zero on security. The current posture: OpenSSF Scorecard, CodeQL SAST + Dependency Review in CI, CycloneDX SBOM via cdxgen, signed commits + signed tags, 722 unit tests + 900 property-test invariants via fast-check, 66 e2e tests via Playwright + axe-core, a sandboxed AI proxy with strict request validation, constant-time token comparison, open-redirect defense, and HTTP security headers via the SvelteKit handle hook. About 85% of OpenSSF Best Practices Silver-tier criteria are already satisfied.

What the sponsored sprint would close: SLSA provenance for the npm CLI, deeper fuzz testing on the audit parser, reproducible builds for the export pipeline, CLI-surface hardening (path traversal, prototype pollution defense on user-provided JSON), and a published threat model. Public launch at **TypeCon Portland, August 6–8, 2026** — the hardening would land *before* public traffic arrives.

---

## Current security posture

Patens already runs the controls most candidate projects are applying to *establish*. This sprint targets the next layer, not the baseline.

### CI + supply chain

- **OpenSSF Scorecard** — badge in README; scored on every push to main; current score is publicly verifiable via the [Scorecard viewer](https://scorecard.dev/viewer/?uri=github.com/alevizio/patens).
- **CodeQL SAST** — GitHub-native static analysis workflow on every push + PR.
- **Dependency Review** — `actions/dependency-review-action` gates PRs against vulnerable / license-incompatible dependency changes.
- **CycloneDX SBOM** — generated in CI via cdxgen; positions Patens for EU CRA disclosure requirements when those land.
- **Release Drafter** — automated changelog drafting, reduces release-process drift.
- **Frozen lockfile** — CI uses `pnpm install --frozen-lockfile`; no floating versions in production builds.
- **Dependabot** — enabled on the upstream repo; mirrored guidance for self-hosters in SECURITY.md.

### Code signing + provenance

- **Signed commits** — every commit on `main` is SSH-signed by the maintainer (`git config commit.gpgsign true`, SSH-format).
- **Signed tags** — every release tag is signed (`git config tag.gpgsign true`, same SSH key); documented setup + consumer-verification path in `docs/release-process.md`.

### Application-level hardening

- **HTTP security headers via SvelteKit `handle` hook** — `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`, `Strict-Transport-Security` gated on HTTPS so local dev still works. Verified in production via `curl -I`.
- **Production error sanitization** — stack traces + internal paths no longer reach the client in production; dev-overlay XSS surface closed (now uses DOM + `textContent`, not `innerHTML`).
- **Sandboxed Anthropic AI proxy** at `/api/ai/messages` — 256 KB body cap, max 8 messages, max 24 K chars per text block, max 12 K chars in `system`, max 4 096 `max_tokens`, model allowlist (`claude-opus-4-7` / `claude-sonnet-4-6` / `claude-haiku-4-5`), upstream error bodies sanitized to `{ error, status }`.
- **Constant-time token comparison** — `constantTimeEqual` in `src/lib/share-blob.ts` for share POST + DELETE; defense-in-depth against timing attacks.
- **SHA-256 delete-token digests** — public-readable share metadata no longer contains raw delete-tokens; only `sha256:` digests are stored, with automatic migration on re-share.
- **Open-redirect defense** — `safeReturnTo()` helper validates the `?returnTo` redirect target on `/auth/login`, `/auth/callback/github`, `/auth/logout`; off-origin / scheme-relative / `javascript:` / `data:` URLs fall back to `/`. 13 unit tests cover the helper + encode/decode/tamper paths.
- **HMAC-signed session cookies** — sign-in uses signed cookies, not encrypted secrets; `HttpOnly`, `Secure`, `SameSite=Lax`.
- **No share-version Blob URLs leak** — `/api/share/[id]/versions` returns a slimmer shape that routes through `/api/share/[id]?v=N` so future access controls don't get bypassed.
- **No telemetry, no analytics SDK** — zero client-side beacons, zero third-party tracking. Every project lives in the user's IndexedDB; nothing leaves the browser unless the user chooses to export.

### Test coverage as a security control

- **722 unit tests** via Vitest, including `session.test.ts` (13 tests for signed-cookie + open-redirect defense) and dedicated tests for the CLI formatters.
- **900 randomized invariants per run** — `fast-check` property tests on the audit module: 9 invariants × 100 random inputs each. Asserts `auditGlyph` never throws, returns a well-shaped array, codes are kebab-case, severities are within the enum, audit is deterministic, etc. Closes the OpenSSF Silver "fuzz testing on parsers" criterion.
- **66 e2e tests** via Playwright + axe-core across 31 routes — including `e2e/api-smoke.spec.ts` for share endpoints 503/404 paths, auth gates, and manifest PWA shape.

### Disclosure + transparency

- **SECURITY.md** — in-scope / out-of-scope matrix, 48-hour acknowledgment SLA, 30-day fix window for high-severity, public advisory on disclosure.
- **RFC 9116 `security.txt`** — at `/.well-known/security.txt`, canonical patens.design URL.
- **CHANGELOG Security section** — every fix gets its own bullet under a release's `Security` heading; signed-by `Alejandro` on the commit + tag.

This is the foundation. The fund's sponsored sprint targets *the next layer*, not the baseline.

---

## What the sponsored hardening would close

Each item below is scoped as a concrete sprint deliverable — not a wishlist. Estimated effort assumes the GitHub Security team's sprint cadence + a maintainer who already understands the codebase.

### 1. SLSA provenance for the npm CLI release

Currently: signed tags + repo verification only.

Target: SLSA Level 3 provenance attestations published alongside each `patens` npm release via the [slsa-framework/slsa-github-generator](https://github.com/slsa-framework/slsa-github-generator) workflow. Foundries pulling `npx patens` in CI can verify the binary they're executing was built from the tagged commit by the documented GitHub Actions runner — not tampered with in transit and not built from a sideloaded branch.

Deliverable: `.github/workflows/release.yml` emitting attestations to `npm provenance` + a `docs/security/verifying-provenance.md` walk-through for foundry consumers.

### 2. Fuzz testing on `audit.ts` deeper than current property tests

Currently: 900 invariants per CI run (9 × 100) via `fast-check`. Random `.font.json` inputs are well-formed but shallow.

Target: structure-aware fuzzing on the `.font.json` parser surface using `jsfuzz` or a libFuzzer-style harness. The current property tests cover *output* invariants (every issue has the right shape, codes are kebab-case, audit is deterministic). What's missing is *input* fuzzing — malformed JSON, deeply nested glyph composites, pathological cubic-Bézier coordinate clouds, integer overflows in metrics fields. The audit module is the load-bearing surface; if a malicious `.font.json` can crash the CLI or trigger pathological CPU, foundry CI grinds.

Deliverable: a `fuzz/` directory with a corpus + harness + a CI workflow that runs the fuzzer on every PR with a budget cap. Document findings + fixes in CHANGELOG `Security`.

### 3. Reproducible builds for the WOFF2/OTF export pipeline

Currently: in-browser export via `opentype.js` (OTF/WOFF2) + Pyodide-WASM (TTF + ttfautohint). Bit-for-bit determinism not verified.

Target: a reproducible-build harness that runs the export twice against the same `.font.json` and asserts byte-for-byte identical output. This matters for the CLI use case too — foundries want a font binary they can verify is *exactly* the artifact their `.font.json` would have produced from the editor, with no ambient-state contamination.

Deliverable: a `scripts/verify-reproducible-build.mjs` harness that the release-process docs reference + a CI job that catches drift on PRs touching the export pipeline.

### 4. CLI execution-surface hardening

The `npx patens audit` CLI accepts user-provided `.font.json` files. Current hardening: JSON.parse with try/catch, exit code 2 on parse failure. Not yet hardened:

- **Path traversal** — the CLI accepts glob patterns (`fonts/*.font.json`). A malicious pattern can in principle escape the intended directory. Current mitigation is *the operating system*; we want explicit canonicalization + a documented allowlist root.
- **Prototype pollution defense** — `.font.json` is structured user input. A malicious payload with `__proto__` / `constructor.prototype` keys could in principle poison the audit module's runtime if any downstream code uses `Object.assign` carelessly. Current mitigation is "the codebase tries to use `Map` and explicit destructuring." We want this *guaranteed* via a freezing helper at the JSON-parse boundary.
- **Resource limits** — no explicit CPU / memory cap on the audit pass. A pathological `.font.json` with millions of contours could DoS a foundry's CI runner. We want a documented + enforced ceiling.

Deliverable: hardening patches + a `docs/security/cli-threat-model.md` writeup of the CLI execution surface with the documented mitigations.

### 5. Threat model + SLSA + supply-chain writeup

SECURITY.md today documents what's in/out of scope for vulnerability disclosure. It does *not* publish a threat model. The sprint deliverable is:

- A documented STRIDE-style threat model for both the web app (editor + share + auth) and the CLI (foundry CI integration).
- A published SLSA framework alignment doc.
- A documented supply-chain story including build-time integrity, distribution-time integrity, and consumer-side verification.

Deliverable: `docs/security/threat-model.md` + `docs/security/slsa-alignment.md`, both linked from SECURITY.md and the `/security` marketing page.

---

## Why now

Public launch is at **TypeCon Portland, August 6–8, 2026** — approximately 10 weeks from this application. The sponsored hardening sprint, if accepted, would land *before* that launch.

The framing matters: if the sprint lands post-launch, it's incident-response posture (hardening under pressure, after attention has arrived). If it lands pre-launch, it's pre-emptive posture (the public-traffic and CI-install-volume curves start *with* the maximum-defensible binary, not retrofitted later).

Type design is a small enough field that the supply-chain blast radius is contained — but it's also a field that hasn't yet had a supply-chain incident. The pre-launch window is the right moment to harden, not after a major foundry has wired `patens` into a release pipeline.

---

## Open source bona fides

- **License:** MIT (`LICENSE`)
- **Repo:** public on GitHub since first commit
- **Code of Conduct:** Contributor Covenant (`CODE_OF_CONDUCT.md`)
- **Contributing guide:** `CONTRIBUTING.md`
- **Security policy:** `SECURITY.md` (private disclosure to `security@patens.design`)
- **Maintainers guide:** `MAINTAINERS.md` — solo-maintainer SLA, triage cadence, scope
- **Architecture deep-dive:** `ARCHITECTURE.md` — six-layer map + core flows (cold-load, audit, share-write, export) + SSR posture rationale
- **Design philosophy:** `DESIGN_PHILOSOPHY.md` — teaching-first, audit-as-citizen, no AI-led marketing, never paywall the editor
- **10 Architecture Decision Records** under `docs/decisions/` (Michael Nygard format)
- **Release process:** `docs/release-process.md` — solo-maintainer playbook with semver rules (audit-code IDs are stable forever)
- **OpenSSF Scorecard:** badge in README, scored regularly
- **OpenSSF Best Practices Silver-tier self-assessment** — ~85% satisfied; written up in `docs/launch/openssf-best-practices.md`
- **CI:** GitHub Actions — type-check, unit tests (722), Playwright e2e + axe-core a11y (66 tests across 31 routes), production build, CodeQL, Scorecard, Dependency Review, SBOM, Lighthouse
- **CITATION.cff** for academic + AI-engine citation
- **`SUPPORT.md` + Discussions enabled** — channel routing for bugs / ideas / Q&A / security
- **Solo-maintained, signed work** — every footer carries `— Alejandro`; the maintainer is identifiable, contactable, and accountable; every commit + tag SSH-signed

---

## Why Patens specifically (vs other candidates in the cohort)

- **Critical-OSS-adjacent today, with a credible path to critical-OSS-tomorrow.** The CLI is built and shipped; foundries adopting it for client-deliverable CI is the explicit Q3 2026 plan. The fund's "critical OSS" criterion is interpreted broadly to include solo maintainers + niche tools with active use — Patens fits the spirit of that interpretation cleanly.
- **Tooling for an industry that hasn't had supply-chain incidents yet.** Type foundries have never had to think about npm-supply-chain attacks because their tools have historically been desktop apps (FontLab, Glyphs, RoboFont) installed once and updated rarely. Patens *is* the first browser-and-CLI tool the field is taking seriously. The right time to harden a category is *before* the first incident, not after.
- **Solo-maintained with full transparency.** Every signed-by Alejandro; every commit + tag SSH-signed; SECURITY.md publishes a real SLA. The maintainer accountability fund-evaluators look for is in place.
- **Active development, public roadmap, public CHANGELOG.** CHANGELOG `[Unreleased] § Security` documents every recent hardening commit. ROADMAP.md is public.
- **Already running ~85% of OpenSSF Silver-tier criteria.** The sponsored sprint pushes Patens to full Silver + partial Gold (SLSA provenance, threat model, reproducible builds). Most candidates apply to *reach* Silver; Patens applies to *exceed* it.
- **The funded $10K stipend is meaningful but not the headline.** The structured hardening sprint with the GitHub Security team is the headline — that's what closes the specific gaps a solo maintainer can't close as cleanly alone.

---

## Honest caveats

A few things the application should not oversell:

- **Patens is not critical infrastructure today.** Install volume is essentially zero (private alpha by invitation). The "foundries running it in CI" scenario is a credible Q3 2026 plan, not a current reality. The hardening case is *pre-emptive*, not *responsive*.
- **The CLI has shipped but is not yet load-bearing.** It runs in our own CI as a smoke test. The bullets about "foundries linting client deliverables" describe positioning + intent, not deployed customer footprint.
- **The maintainer is solo.** Bus-factor = 1. OpenSSF Gold (which requires bus-factor ≥ 2) is *not* a sprint goal; it's a post-launch question once Patens has a contributor base.

Putting these in the application directly because the fund's evaluators are smart enough to spot them anyway, and naming them as part of the framing strengthens the credible-pre-launch-hardening case rather than weakening it.

---

## Maintainer

**Alejandro Vizio** — product designer who also programs. Built Patens as a personal tool because the existing type editors were either expensive (FontLab $499, Glyphs $300, RoboFont $400), platform-locked (Glyphs macOS-only, RoboFont macOS-only, FontLab macOS+Windows-only), or rule-stripped (Fontra/Glyphr ship without the audit + teaching layer). Solo-maintained; the entire repo, the marketing surface, the OG card renderer, the CLI, the test suite, the security posture, and the launch plan are all one person's work, by intention — a foundry-of-one position that matches how the typography field actually evolves.

Security contact: `security@patens.design`
General contact: `hi@patens.design` · [github.com/alevizio](https://github.com/alevizio) · [@patenstype](https://x.com/patenstype) on X · [@patens.design](https://bsky.app/profile/patens.design) on Bluesky

---

## Links to send the reviewer

- **Repo:** [github.com/alevizio/patens](https://github.com/alevizio/patens)
- **OpenSSF Scorecard report:** [scorecard.dev/viewer/?uri=github.com/alevizio/patens](https://scorecard.dev/viewer/?uri=github.com/alevizio/patens)
- **SECURITY.md:** [github.com/alevizio/patens/blob/main/SECURITY.md](https://github.com/alevizio/patens/blob/main/SECURITY.md)
- **`security.txt`:** [patens.design/.well-known/security.txt](https://patens.design/.well-known/security.txt)
- **`/security` marketing page:** [patens.design/security](https://patens.design/security)
- **CHANGELOG (Security entries under `[Unreleased]`):** [patens.design/changelog](https://patens.design/changelog) · [RSS](https://patens.design/changelog/rss.xml)
- **Architecture deep-dive:** `ARCHITECTURE.md` in the repo
- **CLI walk-through (the supply-chain surface):** README § "CLI — `patens audit` from the terminal"
- **Compare table (positions Patens vs the field):** [patens.design/compare](https://patens.design/compare)
- **The Method (the 97 codes):** [patens.design/audit](https://patens.design/audit)

---

## After submission

- Save application timestamp + reference ID; log in `docs/launch/oss-programs-survey.md` next to the GitHub Secure OSS Fund row.
- If accepted: the security hardening sprint slots into the existing TypeCon launch timeline; the five deliverables above become the sprint backlog. Publish the threat model, SLSA alignment doc, and reproducible-build harness as PRs against `main` so the work is visible in the public CHANGELOG.
- If wait-listed: ask for specific feedback on which criteria to address first solo. The fund's evaluator notes (even if it's "needs more install volume to be considered critical OSS") are useful regardless of outcome.
- If declined: the five-item gap list above is the next solo-execution backlog anyway. SLSA provenance + the threat model writeup are the highest-leverage two; tackle those first.
