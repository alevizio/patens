# ADR-006 — Share URLs as capability tokens (no auth)

**Status**: Accepted (2026-01, refined 2026-05)

## Context

The cloud-share feature lets a Patens user upload their project to
Vercel Blob; the recipient opens the share URL in any browser, sees
a read-only specimen page, can export the font, etc.

The auth question: who gets to view, re-upload, or delete a share?

Alternatives considered:

1. **Account-based** — require sign-in; shares are owned by an
   account; permissions per share. Conventional SaaS model.
   - Pro: clear ownership, revocable, scales to teams.
   - Con: requires an account system (anti-goal per ADR-001).
2. **Capability-based** — the share URL itself IS the access token.
   Anyone with the URL can read; only the originator (who holds a
   secondary delete-token in their local IDB) can re-share or delete.
3. **Open shares + originator email** — uploads are public; deletes
   require email confirmation. Common but high-friction.

Capability-based fits the architecture (no accounts, browser-native)
and matches well-established patterns (Dropbox link-share, Loom
video URLs, Stripe checkout sessions).

## Decision

Share URLs are public capability tokens:

- The share ID is a `crypto.randomUUID()` — unguessable
  (122 bits of entropy).
- The URL `https://patens.design/share/<uuid>` reads from Vercel
  Blob via `GET /api/share/<uuid>`. No auth required.
- A separate **delete-token** is generated server-side on first
  upload, stored in the originator's IDB project record + as a
  `shares/<uuid>.token` blob on Vercel.
- `POST /api/share` with a matching `X-Share-Token` header
  re-uploads (overwrites the canonical + writes a new version).
- `DELETE /api/share/<uuid>` with a matching `X-Share-Token` header
  deletes all blobs.
- Token comparison uses `constantTimeEqual` (node:crypto's
  timingSafeEqual) to prevent timing-attack token recovery.

Versioning (added in 2026-05): each upload also writes
`shares/<uuid>/history/v<N>.json`. The recipient can pass
`?v=<N>` to load a specific historical version. The delete token
also covers the entire version history.

## Consequences

**Positive**:
- Zero auth friction. Recipients open + use shares immediately.
- No account system needed. Aligns with ADR-001 (browser-native).
- Cost stays low. Vercel Blob's free tier covers thousands of
  shares; no per-user pricing tier to manage.
- Recipient privacy. We don't know who viewed a share, only that
  someone fetched the blob URL.
- Capability is naturally revocable. Originator deletes; the URL
  404s; recipient who bookmarked sees the standard recovery copy.

**Negative / constraint**:
- **No "I forgot the delete token" recovery path.** If a user
  clears their browser data, they lose the ability to re-share or
  delete that project. Documented in `/help`. The mitigation:
  export `.font.json` for any project you care about; the share is
  a publication, not a backup.
- **The UUID is the secret.** If someone leaks the share URL, the
  share is leaked. We mitigate via:
  - URLs unguessable (UUID v4, not sequential).
  - Originator can rotate by re-uploading (which keeps the same
    UUID — the rotation is on the canonical pointer; old version
    URLs still work for previous-version recipients).
- **No multi-user editing.** A share is a snapshot, not a session.
  This aligns with ADR-001's single-designer-single-machine
  constraint.

**Commits us to**:
- **The UUID contract is stable.** Existing share URLs must keep
  working. We can extend (add `?v=N`) but never break the
  base URL.
- **Token storage is the originator's responsibility.** No
  server-side mapping from "user identity" → "shares I own."
  This is what makes the system zero-auth + zero-account.
- **No abuse-reporting back-channel.** A bad-faith share's only
  remediation is the originator deleting it (which they may not)
  or an upstream Vercel Blob takedown (which requires legal
  process). For a v1.x type-design tool, this is acceptable.

## Related

- ADR-001 (browser-native) — drives the no-account choice.
- `src/lib/share-blob.ts` — `constantTimeEqual` + `historyPath`
  + `latestVersion`.
- Commit `f6d4d86` — the versioning extension.
- `SECURITY.md` — the disclosure path for share-related issues.
