# Release process

The solo-maintainer release playbook. Patens ships semver releases
as git tags + GitHub Releases; there's no separate release branch
or staging environment beyond Vercel's deploy previews.

This doc exists so future-me (or a co-maintainer if that ever
happens) can run a release without reconstructing the steps. It's
prescriptive on purpose — every step is here because forgetting
it has bitten someone before.

> **Audience.** Anyone with push access to the `main` branch + the
> `npm publish` rights (not yet used — Patens ships from source,
> the CLI is bundled in `cli/dist/` and run via `npx patens`).
> Most external contributors don't need to read this; for the
> contribution workflow see [`CONTRIBUTING.md`](../CONTRIBUTING.md).

---

## Cadence

There's no fixed release cadence. The pattern that's emerged:

- **Patch (`1.5.x`)** — one or more times per week when bug fixes
  land. Often same-day as the fix.
- **Minor (`1.x.0`)** — when a coherent feature batch is ready
  (typically 2–4 weeks of work, sometimes more for big arcs like
  v1.5's OSS-readiness pass).
- **Major (`x.0.0`)** — reserved for breaking changes. None
  shipped to date. If the storage namespace `font-studio-*` ever
  needed to change, that's a 2.0.0.

Releases happen when the work is ready, not on a calendar. Solo
maintainer; deadline-driven releases are a known burnout vector.

---

## Versioning rules

Semantic versioning, with these project-specific clarifications:

- **Breaking** = anything that requires a user to take action
  before their existing project file or saved state continues to
  work. Examples: changing the storage namespace, removing an
  audit code that a project file references, changing the public
  CLI flag surface in `cli/`.
- **Minor** = new features, new audit codes, new export options,
  new UI surfaces — anything additive.
- **Patch** = bug fixes, copy edits, perf improvements, internal
  refactors, dependency bumps, doc updates.

Audit-code numeric IDs are **stable forever** once shipped. If a
code is wrong, deprecate (mark `severity: 'info'` + add
`deprecated: true` to the description) rather than reuse the
number. This is the same contract OpenSSF Scorecard and CodeQL
use for their check IDs.

---

## Pre-release checklist

Run this checklist before tagging. Each item is here because
skipping it once produced a bad release.

### 1. Working tree clean

```sh
git status            # must be clean
git pull --rebase     # in case of upstream changes
```

### 2. Quality gates green

The same gates CI runs, but locally — faster feedback than
waiting for the PR.

```sh
pnpm lint             # 0 errors. Warnings ratcheted, no new ones.
pnpm check            # svelte-check strict — 0 errors, 0 warnings.
pnpm test             # vitest unit (~450 tests + 6 benches).
pnpm test:e2e         # Playwright + axe-core a11y across 31 routes.
pnpm build            # vite build — must succeed.
```

If any gate fails, **stop and fix**. Never skip with `--no-verify`
or by commenting tests out — the gates exist because they catch
real regressions (see ADR-009).

### 3. Bundle budget under cap

```sh
pnpm run analyze      # Opens rollup-plugin-visualizer in browser.
```

Check the **client** bundle (`dist/_app/`) total under the 5120 KB
cap. If it's over, the release is blocked. Common offenders:
accidentally pulled fontTools / Pyodide into the editor preload
(see ADR-010), or a heavy dep was added without lazy-loading.

### 4. Smoke test the editor

```sh
pnpm dev
```

Open the demo project. Touch the surfaces that are most likely
to silently break:

- Draw a glyph. Trace it. Save.
- Open the audit panel. Confirm codes still describe correctly.
- Export OTF + WOFF2. Open the OTF in FontGoggles or a similar
  external tool.
- Open a share link from a previous release in a private window.
  Capability-token auth must still work; project must render.

This is 10 minutes and catches the kind of regression that unit
tests don't (Worker postMessage shape changes, IndexedDB schema
drift, SvelteKit route boundary changes).

### 5. Changelog draft

Release Drafter (configured in
`.github/workflows/release-drafter.yml`) keeps a draft at the top
of the Releases page, rebuilt on every push to `main`. Open it:

```sh
gh release view --json url -q .url
```

Verify the draft groups commits sensibly. If commits were merged
without conventional-commit prefixes, Release Drafter will dump
them into "Other changes" — clean that up before publishing.

---

## Tagging + publishing

Tags are **cryptographically signed** starting v1.6.0 — closes the
OpenSSF Best Practices Silver-tier criterion
`tag_signed_releases`. Commits are already SSH-signed via the global
`commit.gpgsign = true` git config (GitHub shows the green "Verified"
badge); tag signing extends the same trust chain to release markers.

### One-time setup (per machine)

```sh
# 1. Check current signing config (you should already see
#    user.signingkey + gpg.format=ssh for commits).
git config --get user.signingkey
git config --get gpg.format

# 2. Turn ON automatic tag signing — git tag will use the same
#    SSH key as your commits.
git config --global tag.gpgsign true

# 3. Verify the GitHub allowed-signers file is set up. The same
#    file commits use:
git config --get gpg.ssh.allowedSignersFile
# If empty: create one at ~/.config/git/allowed-signers with the
# public key, prefixed with your committer email:
#   alejandro@example.com ssh-ed25519 AAAA... <comment>
git config --global gpg.ssh.allowedSignersFile ~/.config/git/allowed-signers
```

### Release flow

```sh
# 1. Bump version in package.json. Follow semver.
#    pnpm version creates the commit + signs the tag automatically
#    once tag.gpgsign is on.
pnpm version patch    # or minor / major

# 2. Verify the tag is signed before pushing — GitHub rejects
#    unsigned tags only if branch-protection requires verified
#    signatures, but verifying locally catches setup drift early.
git tag --verify "v$(node -p 'require(\"./package.json\").version')"
# Expected: "Good signature from <your email>"

# 3. Push the commit + the signed tag.
git push origin main --follow-tags

# 4. Promote the Release Drafter draft to published.
gh release edit "v$(node -p 'require(\"./package.json\").version')" --draft=false
```

Vercel auto-deploys on push to `main` — the production deploy
will be live within ~3 minutes. There's no separate "deploy"
step; the tag is a marker, not a trigger.

### Verifying signatures (consumers / auditors)

Anyone cloning the repo can confirm a release tag came from the
declared maintainer:

```sh
git fetch --tags
git tag --verify v1.6.0
# Expected output line:
#   Good "git" signature for alejandro@... with ED25519 key SHA256:...
```

The `Verified` badge on the corresponding GitHub Release page is
the equivalent online check.

### SLSA / provenance (future)

Full SLSA Level 3 provenance attestation for releases is on the
post-launch roadmap (closes the OpenSSF Best Practices Gold-tier
ambition if we ever decide to attempt Gold — currently scoped out
because Gold requires bus-factor ≥ 2). The infrastructure piece:
adopt `actions/attest-build-provenance` in CI to mint signed
SLSA-format attestations alongside each release. Not blocking
v1.6 launch.

---

## Post-release

### Verify production

```sh
curl -sS https://patens.design/api/health
# Then open https://patens.design in a private window and:
# - Confirm the version footer matches the new tag
# - Open a saved project from prior release (storage namespace
#   `font-studio-*` must still work — see ADR-007)
# - Run an audit, export an OTF
```

### Update the in-app changelog (if user-visible)

If the release added a user-visible feature, the editor's
"What's new" surface lives at `src/lib/data/changelog.ts`. Add an
entry with the version, date, and 1–3 bullet points. Keep it
short — this is read by users mid-task, not browsed for fun.

### Announce (only for minor + major)

Patch releases ship silently. For minor and major:

- Post to Bluesky + X via the `@patenstype` accounts. Lead with
  one concrete user benefit, not a feature list. Link to the
  GitHub release for the full notes.
- If the release ships a new audit code or a new export option,
  cross-post to TypeDrawers + r/typography.

Don't announce every patch. The signal-to-noise ratio matters —
followers tune out a maintainer who posts every dependency bump.

### Backfill memory

If the release exposed something surprising (a regression that
slipped past the gates, a new contributor pattern, a deploy
quirk), drop a note in the relevant memory file under
`~/.claude/projects/-Users-alevizio-font/memory/` so the next
release benefits from it.

---

## Hotfix flow

A bug bad enough to need an out-of-band release (data loss, hard
crash on a common surface, security issue): same flow as above,
but compressed. The hotfix branch convention:

```sh
git checkout -b hotfix/share-token-bypass  main
# fix + tests on the branch
git push -u origin hotfix/share-token-bypass
gh pr create --base main --fill --label hotfix
# After CI green + self-review, merge to main, then run the
# normal tagging flow as a PATCH release.
```

Security hotfixes follow the disclosure timeline in
[`SECURITY.md`](../SECURITY.md) — coordinate the release with the
reporter where possible.

---

## Rollback

Vercel keeps the previous deployments addressable. If a release
ships a critical regression:

```sh
# 1. Identify the bad deploy.
vercel ls patens

# 2. Promote the last good deploy to production.
vercel promote <deployment-url>

# 3. Open a `revert: ...` PR against main.
git revert <bad-commit-sha>
gh pr create --fill --label hotfix
```

The git tag stays — don't delete published tags, even bad ones.
Cut a new patch release with the revert + the actual fix.

---

## See also

- [`CONTRIBUTING.md`](../CONTRIBUTING.md) — contribution workflow.
- [`MAINTAINERS.md`](../MAINTAINERS.md) — maintainer scope + SLA.
- [`AGENTS.md`](../AGENTS.md) — conventions for AI-assisted work.
- [`SECURITY.md`](../SECURITY.md) — security disclosure timeline.
- [`docs/decisions/`](./decisions/) — ADRs explaining the
  load-bearing choices a release should never silently break.
