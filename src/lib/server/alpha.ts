/**
 * Alpha access gate — a single shared passcode protecting the app
 * surface (/alpha, /project, /families, /family) during private alpha.
 *
 * This is soft access control, not a hard security boundary: project
 * data is browser-local, so there's nothing server-side to steal. The
 * gate just keeps the unfinished app off the open web while the
 * marketing teaser at / stays public. One passcode, handed to invited
 * testers alongside the link.
 *
 * Mechanism mirrors session.ts: a signed cookie (HMAC-SHA256 over the
 * passcode using AUTH_SECRET). Because the cookie is *derived from the
 * passcode*, rotating ALPHA_PASSCODE invalidates every existing cookie
 * and forces testers to re-enter — a free "revoke all access" lever.
 *
 * The gate is active only when BOTH ALPHA_PASSCODE and AUTH_SECRET are
 * set. Unconfigured (e.g. local dev with no env) → fail-open, so a
 * forgotten env var never locks the maintainer out of their own deploy.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

export const ALPHA_COOKIE = 'patens-alpha';

// 30-day window — matches the session cookie. Long enough that an
// invited tester enters the code once; short enough to bound a leaked
// cookie's lifetime.
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const b64url = (buf: Buffer): string =>
	buf.toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

const constantTimeEqual = (a: string, b: string): boolean => {
	const ab = Buffer.from(a);
	const bb = Buffer.from(b);
	// timingSafeEqual throws on length mismatch; short-circuit instead.
	if (ab.length !== bb.length) return false;
	return timingSafeEqual(ab, bb);
};

/** The expected cookie value for a given passcode + signing secret. */
export const alphaCookieValue = (passcode: string, secret: string): string =>
	b64url(createHmac('sha256', secret).update(`alpha:${passcode}`).digest());

/** True when the gate is configured (both passcode + signing secret present). */
export const alphaGateEnabled = (): boolean =>
	Boolean(process.env.ALPHA_PASSCODE && process.env.AUTH_SECRET);

/** Verify a presented cookie against the current passcode + secret. */
export const isAlphaCookieValid = (
	cookieValue: string | undefined,
	passcode: string,
	secret: string
): boolean => {
	if (!cookieValue) return false;
	return constantTimeEqual(cookieValue, alphaCookieValue(passcode, secret));
};

/** Constant-time passcode comparison for the unlock form. */
export const checkPasscode = (provided: string, expected: string): boolean =>
	constantTimeEqual(provided, expected);

/**
 * Route prefixes that require the alpha cookie. The public marketing
 * surface (/, /about, /learn, /audit, /es, …) is deliberately absent —
 * those stay indexable. /share/[id] is also public (link-as-capability
 * for recipients who aren't testers).
 */
export const ALPHA_PROTECTED_PREFIXES = ['/alpha', '/project', '/families', '/family'] as const;

/**
 * Whether a pathname falls under the gated app surface. The demo
 * (/project/demo) is gated too: there's no public online demo during the
 * private alpha — invited testers reach it from inside the dashboard.
 */
export const isAlphaProtectedPath = (pathname: string): boolean =>
	ALPHA_PROTECTED_PREFIXES.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
	);

/** Cookie options for the alpha grant. `secure` is set per-request by the caller. */
export const alphaCookieOptions = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax' as const,
	maxAge: MAX_AGE_SECONDS
};
