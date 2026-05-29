/**
 * Waitlist helpers — pure functions shared with the /api/waitlist route
 * so validation + key derivation can be unit-tested without touching
 * Vercel Blob.
 *
 * Storage key is sha256(email): deterministic, so a re-signup overwrites
 * its own record (free dedupe). The blob itself is written to a private
 * store (see +server.ts), so the address isn't publicly readable.
 */

import { createHash } from 'node:crypto';

// Pragmatic shape check, not RFC 5322 — we just want to reject obvious
// junk before persisting. The real bounce/verify happens when we email.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// RFC 5321 caps an address at 254 chars; anything longer is malformed.
const MAX_EMAIL_LEN = 254;

/** Trim + lowercase + validate. Returns the normalized email, or null. */
export const normalizeEmail = (raw: unknown): string | null => {
	if (typeof raw !== 'string') return null;
	const email = raw.trim().toLowerCase();
	if (email.length === 0 || email.length > MAX_EMAIL_LEN) return null;
	if (!EMAIL_RE.test(email)) return null;
	return email;
};

/** Blob storage path for a (already-normalized) email. */
export const waitlistKey = (email: string): string =>
	`waitlist/${createHash('sha256').update(email).digest('hex')}.json`;
