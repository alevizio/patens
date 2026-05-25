/**
 * GET /auth/callback/github — OAuth code-exchange landing.
 *
 * GitHub redirects here with ?code=... after the user authorizes the
 * app. We:
 *   1. Validate the `state` round-trip against the signed cookie set in
 *      /auth/login (CSRF defense)
 *   2. Exchange the code for an access_token via GitHub's token endpoint
 *   3. Call GET https://api.github.com/user with that token to learn
 *      who logged in
 *   4. Set the signed session cookie + redirect to returnTo (default /)
 *
 * We DON'T persist the access_token. We only keep the user identity
 * (id + login + name + avatar) in the signed cookie. If we ever need
 * GitHub API access (e.g. to fetch starred repos), the user re-auths.
 */

import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	encodeSession,
	oauthEnabled,
	sessionCookieOptions,
	SESSION_COOKIE,
	type Session
} from '$lib/server/session';
import { createHmac, timingSafeEqual } from 'node:crypto';

const STATE_COOKIE = 'font-studio-oauth-state';

const verifyState = (signed: string | undefined, returned: string, secret: string): boolean => {
	if (!signed) return false;
	const dot = signed.indexOf('.');
	if (dot < 0) return false;
	const original = signed.slice(0, dot);
	const sig = signed.slice(dot + 1);
	if (original !== returned) return false;
	const expected = createHmac('sha256', secret).update(original).digest('hex');
	if (expected.length !== sig.length) return false;
	return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
};

export const GET: RequestHandler = async ({ cookies, url, fetch }) => {
	if (!oauthEnabled()) {
		throw error(503, 'Sign-in not configured for this deployment.');
	}
	const clientId = process.env.GITHUB_CLIENT_ID!;
	const clientSecret = process.env.GITHUB_CLIENT_SECRET!;
	const authSecret = process.env.AUTH_SECRET!;

	const code = url.searchParams.get('code');
	const returnedState = url.searchParams.get('state');
	const returnTo = url.searchParams.get('returnTo') ?? '/';

	if (!code) throw error(400, 'Missing authorization code');
	if (!returnedState) throw error(400, 'Missing state');

	const signedState = cookies.get(STATE_COOKIE);
	if (!verifyState(signedState, returnedState, authSecret)) {
		throw error(400, 'OAuth state mismatch — try signing in again.');
	}
	cookies.delete(STATE_COOKIE, { path: '/' });

	// Exchange code → access_token
	let token: string;
	try {
		const callback = new URL('/auth/callback/github', url.origin);
		callback.searchParams.set('returnTo', returnTo);
		const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
			method: 'POST',
			headers: {
				accept: 'application/json',
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				client_id: clientId,
				client_secret: clientSecret,
				code,
				redirect_uri: callback.toString()
			})
		});
		if (!tokenRes.ok) {
			throw error(502, `GitHub token exchange failed: ${tokenRes.status}`);
		}
		const body = (await tokenRes.json()) as { access_token?: string; error?: string };
		if (!body.access_token) {
			throw error(502, body.error ?? 'GitHub did not return an access_token');
		}
		token = body.access_token;
	} catch (e) {
		if (e instanceof Error && e.message.includes('GitHub')) throw e;
		throw error(502, `Token exchange threw: ${e instanceof Error ? e.message : String(e)}`);
	}

	// Fetch user info
	let user: { id: number; login: string; name: string | null; avatar_url: string };
	try {
		const res = await fetch('https://api.github.com/user', {
			headers: { Authorization: `Bearer ${token}`, accept: 'application/vnd.github+json' }
		});
		if (!res.ok) throw error(502, `GitHub /user fetch failed: ${res.status}`);
		user = await res.json();
	} catch (e) {
		throw error(502, `User fetch threw: ${e instanceof Error ? e.message : String(e)}`);
	}

	const session: Session = {
		id: String(user.id),
		login: user.login,
		name: user.name ?? undefined,
		avatar: user.avatar_url
	};
	cookies.set(SESSION_COOKIE, encodeSession(session, authSecret), sessionCookieOptions);

	throw redirect(302, returnTo);
};
