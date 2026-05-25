/**
 * Minimal signed-cookie session — pure Node crypto, no database.
 *
 * The session is a small JSON blob (user id + login + name + avatar)
 * signed with HMAC-SHA256 using AUTH_SECRET. Tampering invalidates
 * the signature so a hostile client can't forge a session. The user's
 * actual identity comes from GitHub's OAuth flow; we just persist what
 * GitHub told us.
 *
 * Why no database: project data stays browser-local (IndexedDB) by
 * design. Accounts initially give us *identity* — for the UI dropdown,
 * for future per-account share lists, for permission-gating destructive
 * actions on shared blobs. The session itself is stateless: signed
 * cookie in, signed cookie out.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

export type Session = {
	id: string; // GitHub user id (numeric, as string)
	login: string; // GitHub handle
	name?: string; // Display name
	avatar?: string; // GitHub avatar URL
};

const SESSION_COOKIE = 'font-studio-session';
// 30-day session window. Long enough to be useful, short enough that
// stolen cookies have a bounded blast radius.
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const b64url = (buf: Buffer | string): string => {
	const s = (typeof buf === 'string' ? Buffer.from(buf) : buf).toString('base64');
	return s.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
};

const b64urlDecode = (s: string): string => {
	const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice(0, (4 - (s.length % 4)) % 4);
	return Buffer.from(padded, 'base64').toString('utf8');
};

const sign = (payload: string, secret: string): string =>
	b64url(createHmac('sha256', secret).update(payload).digest());

/** Encode a session as a cookie value (payload.signature). */
export const encodeSession = (session: Session, secret: string): string => {
	const payload = b64url(JSON.stringify(session));
	return `${payload}.${sign(payload, secret)}`;
};

/** Decode + verify a cookie value. Returns null on missing / tampered. */
export const decodeSession = (cookieValue: string | undefined, secret: string): Session | null => {
	if (!cookieValue) return null;
	const dot = cookieValue.lastIndexOf('.');
	if (dot < 0) return null;
	const payload = cookieValue.slice(0, dot);
	const sig = cookieValue.slice(dot + 1);
	const expected = sign(payload, secret);
	// timingSafeEqual requires same-length buffers; bail early on mismatch.
	if (expected.length !== sig.length) return null;
	if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
	try {
		return JSON.parse(b64urlDecode(payload)) as Session;
	} catch {
		return null;
	}
};

export const sessionCookieOptions = {
	path: '/',
	httpOnly: true,
	secure: true,
	sameSite: 'lax' as const,
	maxAge: MAX_AGE_SECONDS
};

export { SESSION_COOKIE };

/**
 * Returns true when all three env vars needed for GitHub OAuth are set.
 * Without these, every /auth route gracefully 503s and the UI shows
 * "Sign in unavailable" rather than crashing.
 */
export const oauthEnabled = (): boolean =>
	Boolean(
		process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET && process.env.AUTH_SECRET
	);

/**
 * Sanitize a returnTo URL param so it can't be used as an open redirect
 * to an attacker-controlled host. We accept only same-origin paths:
 *   - resolves the input against our origin
 *   - if the resolved URL's origin matches ours, returns the path + query + hash
 *   - otherwise falls back to "/"
 *
 * Defeats `?returnTo=https://evil.com`, `?returnTo=//evil.com`,
 * `?returnTo=/\evil.com`, and any other scheme-relative trick.
 */
export const safeReturnTo = (raw: string | null | undefined, origin: string): string => {
	if (!raw) return '/';
	try {
		const u = new URL(raw, origin);
		if (u.origin !== origin) return '/';
		return u.pathname + u.search + u.hash;
	} catch {
		return '/';
	}
};
