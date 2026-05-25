# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| `v1.x`  | ✅ Active — security fixes land on `main` |
| `< 1.0` | ❌ Pre-release. Upgrade to `v1.x`. |

## Reporting a vulnerability

If you've found a security issue in Patens, please **don't open a public issue**. Instead:

- **Email**: `security@patens.design` (preferred). Or open a private security advisory at https://github.com/alevizio/patens/security/advisories/new.
- Include the steps to reproduce, the affected route or component, the expected vs actual behavior, and (if relevant) the impact on a user's IndexedDB project data or the cloud-share blob.

## What counts

In scope:

- XSS / HTML injection via project metadata fields (brief, decisions, glyph notes — anywhere user-provided text reaches the rendered DOM).
- Path traversal or unauthorized access via the `/api/share/[id]` endpoint.
- Anything that lets one project's data appear in another project's share view.
- CSRF / clickjacking against the editor's mutation routes.
- Dependencies with known CVEs (`pnpm audit`).

Out of scope (these are intentional design choices):

- "Anyone with a share URL can view it." That's link-as-capability auth by design (documented in [ROADMAP.md](./ROADMAP.md) under M3 — Cloud sharing). If you want non-public projects, don't upload them.
- "The editor accepts pasted SVG paths." The trace + paste flow is meant for designer convenience; we validate but don't sandbox.
- Self-hosted instances with `BLOB_READ_WRITE_TOKEN` exposed in client code. The server-only secret is server-only by design.

## Response

I (the maintainer) read security mail same-day in most cases. Expect:

- Acknowledgment within 48 hours.
- Initial assessment within 5 business days.
- Fix + advisory within 30 days for high-severity, 90 days for lower-severity issues.

## Disclosure

Once a fix is shipped to `main` and tagged, I'll publish a GitHub Security Advisory crediting the reporter (unless they prefer anonymity). The CHANGELOG entry for the affected release will reference the advisory ID.

## Hardening notes (for self-hosters)

If you're running Patens on your own Vercel project:

1. **Set `BLOB_READ_WRITE_TOKEN`** only in the production environment, not in preview deployments — preview URLs are public-accessible by default.
2. **Enable Vercel Deployment Protection** for preview deploys so authenticated reviewers can audit changes before they're shareable.
3. **Pin dependencies.** The repo's `pnpm-lock.yaml` is committed; `pnpm install --frozen-lockfile` (the CI command) is the right invocation for production builds.
4. **Run `pnpm audit` regularly.** Dependabot is enabled on the upstream repo; mirror that on your fork.
