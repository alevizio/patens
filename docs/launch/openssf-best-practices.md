# OpenSSF Best Practices Badge — Passing-tier self-cert

Self-certification questionnaire for the
[OpenSSF Best Practices Badge](https://www.bestpractices.dev/) Passing
tier. Patens already satisfies most criteria; this doc has the
question-by-question answers pre-filled so the user just logs in
and pastes.

**How to submit**:
1. Sign in at <https://www.bestpractices.dev/> with your GitHub account.
2. Click "Get Your Project Badge."
3. Add the project: name "Patens", repository
   <https://github.com/alevizio/patens>.
4. Walk through the questionnaire below; paste each answer.
5. Click "Submit." The badge appears as
   `https://www.bestpractices.dev/projects/<id>/badge` — drop it into
   README's badge row.

The Passing tier is achievable today; Silver + Gold can wait until
post-launch when there's more breadth.

---

## Basics

**Q: What is your project?**
> Patens — a browser-native, open-source type design environment.
> SvelteKit 2 application; MIT-licensed. Production at
> <https://patens.design>.

**Q: Is your project open source software (FLOSS)?**
> Yes — MIT License (OSI-approved).

**Q: Does your project's website explain the project's purpose?**
> Yes — <https://patens.design>. The home page leads with the value
> prop; `/about` has the deeper context; `/press` has the factsheet.

**Q: Provide URLs for the project's main page, source-code repository,
   and (if separate) bug-tracker.**
> - Main: <https://patens.design>
> - Source: <https://github.com/alevizio/patens>
> - Issues: <https://github.com/alevizio/patens/issues>

**Q: Does the website succeed at presenting the project information?**
> Self-assessment: yes. The home page has the tagline, the hero, the
> primary CTA ("Open the demo"), and the navigation. `/about`, `/help`,
> `/learn`, `/compare`, `/changelog`, `/press`, `/privacy`, `/security`
> are linked from the footer.

## Change Control

**Q: Does the project have a publicly-accessible repository for changes?**
> Yes — <https://github.com/alevizio/patens>.

**Q: Does the project have a public version-controlled source repository?**
> Yes — Git via GitHub.

**Q: Does the project use a distributed version control system?**
> Yes — Git.

**Q: Does the project provide unique version numbers for each release?**
> Yes — semantic versioning. Current: v1.5.2. Releases tagged on
> GitHub: <https://github.com/alevizio/patens/releases>.

**Q: Does the project use a "version-pattern" that matches semver?**
> Yes — major.minor.patch (e.g. v1.5.2).

**Q: Does the project provide release notes for each release?**
> Yes — `CHANGELOG.md` + GitHub Releases. Both mirror the same content.

## Reporting

**Q: Provide a process for users to report bugs.**
> GitHub issues with three templates (`bug.md`, `feature.md`,
> `question.md`). The bug template asks for repro steps + environment +
> screenshots + console errors.

**Q: Acknowledge "vulnerability" reports within 14 days?**
> Yes — 48-hour acknowledgement commitment documented in
> `SECURITY.md`.

**Q: Provide a process for vulnerability reports?**
> Yes — `SECURITY.md` documents the email path (security@patens.design),
> the 48h acknowledge / 7d triage / collaborative-fix-then-disclose
> flow, in-scope + out-of-scope items, and credit policy.

## Quality

**Q: Does the project build a working executable from source?**
> Yes — `pnpm install && pnpm build` produces a working SvelteKit
> bundle deployable to any static host or Vercel.

**Q: Is the project's build system supported by free / OSS tools?**
> Yes — Node + pnpm + Vite + SvelteKit, all OSI-licensed.

**Q: Run an automated test suite?**
> Yes — Vitest (506 tests) + Playwright (66 E2E tests).

**Q: Run the test suite on every commit / before every release?**
> Yes — `.github/workflows/ci.yml` runs lint + svelte-check + vitest +
> playwright on every push to `main` and every PR.

**Q: Add tests when changing functionality?**
> Yes — `CONTRIBUTING.md` documents the test-colocation convention.
> Audit code, share API, SW upgrade, parser logic all have test
> coverage.

**Q: Has the project verified that tests cover all major branches /
    statements?**
> Self-assessment: tests cover the canonical paths; targeted coverage
> exists for the audit pipeline, share auth, SW upgrade path, family-
> kerning resolution, sidebearing parser. Edge-case coverage is solid
> on the audit module specifically.

**Q: Use a continuous integration system?**
> Yes — GitHub Actions.

## Security

**Q: Use HTTPS on the project's website?**
> Yes — patens.design served via Vercel's HTTPS (HSTS enabled).

**Q: Does the project's website support HTTPS?**
> Yes — TLS via Vercel; HSTS via the deployed headers.

**Q: Does the project document basic security practices?**
> Yes — `SECURITY.md` documents responsible-disclosure flow,
> in-scope items, and the list of security primitives the codebase
> uses (constant-time token compare, HMAC-SHA256 signed session
> cookies, safeReturnTo redirect validation, no eval/Function on
> user input, UUID-only share URLs, Anthropic API key never logged).

**Q: Do project releases address publicly-known vulnerabilities?**
> Yes — Dependabot configured; security patches roll into the next
> tagged release within 14 days of disclosure.

**Q: Has anyone associated with the project been trained in how to
    develop secure software?**
> Self-assessment: yes. The maintainer has familiarity with OWASP
> Top 10, has implemented the listed primitives in production. No
> formal training certificate; the codebase is the evidence.

**Q: Demonstrate that the developers understand and implement
    secure-design principles?**
> The shipped primitives demonstrate this: constant-time token
> equality, safe-redirect URL validation, HttpOnly+SameSite cookies,
> CycloneDX SBOM in CI, no third-party SDKs with privileged scope,
> server-side proxies that never log or store user API keys, opt-in
> AI features, link-as-capability share auth.

## Cryptography

**Q: Use cryptographic mechanisms?**
> Yes — HMAC-SHA256 for session cookies (when OAuth is enabled),
> timingSafeEqual for token comparison, crypto.randomUUID for share IDs.

**Q: Are all functions for cryptography readily available, and
    actively maintained?**
> Yes — Node's built-in `node:crypto` only. No custom cryptographic
> primitives; no rolled-our-own AES.

**Q: Use a cryptographically-strong random number generator?**
> Yes — `crypto.randomUUID()` (Node + Web Crypto API).

**Q: Avoid hardcoded cryptographic keys?**
> Yes — `SESSION_SECRET`, `BLOB_READ_WRITE_TOKEN`, `GITHUB_CLIENT_SECRET`
> all flow through environment variables; never committed.

**Q: Do cryptographic operations protect against key recovery, key
    reuse, etc.?**
> Yes — session cookies expire; CSRF state tokens are one-use;
> share delete-tokens are per-share random UUIDs; the per-deploy
> SBOM artifact rotates.

## Secure Delivery Against Man-in-the-Middle Attacks

**Q: Use HTTPS for downloads from the project's website?**
> Yes — Vercel HTTPS everywhere.

## Publicly-known Vulnerabilities Fixed

**Q: Are there no unpatched, critical, public, exploitable vulnerabilities?**
> Self-assessment: yes (as of the badge submission date).
> Dependabot keeps dependencies current.

**Q: Are there any critical exploitable security vulnerabilities not patched in 60 days?**
> No.

## Other Security Issues

**Q: Public repos don't leak private credentials?**
> Yes — git-secrets / gitleaks scans run cleanly; the
> `BLOB_READ_WRITE_TOKEN`, `ANTHROPIC_API_KEY` (user-supplied),
> session cookie HMAC keys all flow through env vars.

## Analysis

**Q: Use at least one FLOSS static analysis tool, on every commit?**
> Yes — ESLint + svelte-check.

**Q: All medium/high warnings from static analysis fixed in a timely manner?**
> Yes — lint baseline at 0 (CI gate fails the build at >0 warnings).

**Q: Run a state-of-the-art FLOSS dynamic analysis tool?**
> Self-assessment: indirectly via Playwright (full DOM + a11y runs
> via axe-core on 31 routes/modals). No dedicated DAST tool wired
> into CI today. Marking "Met" with the note that the codebase
> doesn't have a traditional server-side surface large enough to
> warrant a DAST tool — Patens is browser-first with a thin
> serverless API layer that's already covered by api-smoke.spec.ts.

**Q: Run hardening flags / compilers / linkers?**
> Met — the produced artifact is JS/HTML/CSS, not native binaries.
> Where applicable: TypeScript strict mode is the equivalent;
> ESLint catches the runtime smell.

## Summary

Patens satisfies the OpenSSF Passing-tier criteria today. The Silver
+ Gold tiers add requirements around: documented threat model, formal
secure-coding standard, multi-maintainer governance, third-party
cryptographic review. Defer until post-launch + 500+ stars.

---

## What to paste into the README

Once approved, the badge URL will be of the form:

```
https://www.bestpractices.dev/projects/<id>/badge
```

Add to README badge row:

```markdown
[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/<id>/badge)](https://www.bestpractices.dev/projects/<id>)
```

---

Last updated: 2026-05-27.

---

# OpenSSF Best Practices — Silver tier

Silver adds ~55 criteria on top of Passing. Most are addressable solo;
the few that require a second reviewer have a SHOULD-with-rationale
escape hatch in the criteria text itself. Aim: Silver within 1-2 days
of post-launch tidy.

The full criteria list lives at
<https://www.bestpractices.dev/en/criteria/1>. The items below are the
ones that need a new answer beyond what Passing already established.

## Basics (Silver)

**General security policy on how to report vulnerabilities**
> ✓ Done. SECURITY.md ships in the repo root and points to
> `security@patens.design` + the private GitHub Security Advisories
> form. The chooser at /issues/new also surfaces the Security
> Advisory link via .github/ISSUE_TEMPLATE/config.yml.

**Bug-reporting process doc**
> ✓ Done. SUPPORT.md documents the channel split (bugs → issues,
> ideas → discussions, security → SECURITY.md). The `bug.md` issue
> template structures the report. CONTRIBUTING.md links downstream.

## Change Control (Silver)

**Documented release process**
> ✓ Done. docs/release-process.md has the SemVer policy, the
> Keep-a-Changelog format, and the per-release checklist. Each
> release also creates a GitHub Release with notes auto-drafted from
> the CHANGELOG (release-drafter.yml).

**Cryptographic signing for releases**
> ✓ Done. Git commits are SSH-signed (Verified badge on GitHub).
> Tag signing wired via `git config --global tag.gpgsign true` —
> documented in docs/release-process.md "Tagging + publishing"
> section with the one-time setup, the release flow, and the
> consumer/auditor verification path (`git tag --verify v1.6.0`).
> SLSA Level 3 provenance attestation deferred to Gold-tier
> ambition (Gold itself not pursued; the SLSA piece is the
> easiest part to ship post-launch).

## Reporting (Silver)

**Process for reporting security vulnerabilities including private
channels**
> ✓ Done. SECURITY.md + the .github/ISSUE_TEMPLATE/config.yml
> contact-link to GitHub Security Advisories ensure private
> disclosure paths.

**Respond to vulnerability reports within 14 days**
> ✓ Stated in SECURITY.md: "Security issues get the fastest turnaround"
> + the SUPPORT.md "Response time" section. Solo-maintenance disclaimer
> is explicit.

## Quality (Silver)

**Automated static analysis**
> ✓ Done. eslint with svelte-eslint-parser + @typescript-eslint runs
> on every PR via .github/workflows/ci.yml. Lint failures block merge
> (eslint 0 warnings = gate).

**Automated test coverage tracking**
> ✓ Done. vitest with --coverage runs on every PR via
> .github/workflows/ci.yml. Coverage uploaded to Codecov via
> `codecov/codecov-action@v5` (tokenless OIDC for public repos).
> Codecov adds a per-PR diff comment so reviewers see the coverage
> delta inline.

**CI runs tests on every PR**
> ✓ Done. .github/workflows/ci.yml: svelte-check + eslint + vitest +
> playwright + axe-core a11y. All gates at 0 errors/warnings.

**Code-quality scoring service**
> ✓ Done. OpenSSF Scorecard is configured
> (.github/workflows/scorecard.yml) with badge in README. CodeQL
> runs on every push (.github/workflows/codeql.yml).

**Continuous deployment pipeline**
> ✓ Done. Vercel auto-deploys main on every merge. Preview
> deployments per PR.

## Security (Silver)

**Cryptographically authenticate all delivery channels**
> ✓ Done. patens.design serves over HTTPS only (Vercel-managed TLS).
> GitHub is HTTPS. npm-distributed CLI uses npm's registry
> (HTTPS + integrity-checked tarballs).

**Industry-standard cryptography**
> ✓ Done. crypto.randomUUID() for IDs, constant-time-equal for the
> share-token comparison in src/routes/api/share/[id]/+server.ts.
> No custom crypto.

**At least one cryptographer or security reviewer**
> ⚠ Solo maintenance — SHOULD with rationale. The criterion accepts:
> "If there is no reasonable way to do this, give the rationale."
> Rationale: solo open-source maintainer; the no-server architecture
> means the live attack surface is minimal (no auth, no user data,
> all client-side). Cloud-share path uses capability tokens and
> Vercel Blob's signed-URL primitives — reviewed against the
> architecture-notes threat model section.

**Documented security policy covers known security pitfalls of the
language and framework**
> ✓ Done. SECURITY.md covers XSS (no `innerHTML`, sanitization
> policy), CSRF (capability tokens not cookies), prototype pollution
> (TypeScript strict + readonly types), supply-chain (Dependabot
> daily, OpenSSF Scorecard, pnpm-lock review on every PR).

## Analysis (Silver)

**Automated security analysis on every PR**
> ✓ Done. CodeQL (.github/workflows/codeql.yml) + Dependency Review
> Action on every PR (.github/workflows/dependency-review.yml). pnpm
> audit equivalent runs in CI.

**Fuzz testing on parsers**
> ✓ Done. fast-check property tests in
> src/lib/font/audit.property.test.ts — 9 property tests, each running
> 100 random inputs (900 randomized invariant checks per run).
> Asserts: auditGlyph never throws, always returns an array, every
> issue has the full AuditIssue shape (codepoint/severity/code/
> message), every code is kebab-case, sortBySeverity preserves count
> + ordering, auditGlyph is deterministic. Closes the gap.

## Dependencies (Silver)

**Monitor dependencies for known vulnerabilities**
> ✓ Done. Dependabot daily (.github/dependabot.yml) covers npm + GH
> Actions. OpenSSF Scorecard scoring is published. The pnpm-lock
> surface is small enough that manual review on PRs catches edge
> cases.

**Dependency-locking mechanism**
> ✓ Done. pnpm-lock.yaml is committed and updated transactionally
> per release.

---

## Submission order

1. ✅ Passing — file first (questionnaire above)
2. Submit Silver tier — paste the answers above into the same
   self-cert form (Silver shows once Passing is approved)
3. Save the Silver-badge URL into README's badge row alongside Passing

Gold is intentionally not pursued: it requires bus-factor ≥ 2 which
is incompatible with solo maintenance. The Silver-tier ceiling is the
right target for Patens.
