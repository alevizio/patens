/**
 * GET /auth/login — redirect to GitHub's OAuth authorize endpoint.
 *
 * Generates a random state value, signs it into a short-lived cookie,
 * and asks GitHub to bounce back to /auth/callback/github with the same
 * state. The callback verifies the state matches to defeat CSRF.
 *
 * When `oauthEnabled()` is false, 503s with a clear message — the UI
 * uses this signal to hide / disable the Sign-in button on builds
 * without OAuth credentials.
 */

import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { oauthEnabled } from '$lib/server/session';
import { createHmac, randomBytes } from 'node:crypto';

const STATE_COOKIE = 'font-studio-oauth-state';

export const GET: RequestHandler = ({ cookies, url }) => {
	if (!oauthEnabled()) {
		throw error(503, 'Sign-in not configured for this deployment.');
	}
	const clientId = process.env.GITHUB_CLIENT_ID!;
	const secret = process.env.AUTH_SECRET!;

	const state = randomBytes(24).toString('hex');
	// Sign the state so a hostile callback can't substitute its own.
	const signed = `${state}.${createHmac('sha256', secret).update(state).digest('hex')}`;
	cookies.set(STATE_COOKIE, signed, {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: 600 // 10 minutes — OAuth round-trip should take seconds
	});

	const returnTo = url.searchParams.get('returnTo') ?? '/';
	const callback = new URL('/auth/callback/github', url.origin);
	callback.searchParams.set('returnTo', returnTo);

	const authorize = new URL('https://github.com/login/oauth/authorize');
	authorize.searchParams.set('client_id', clientId);
	authorize.searchParams.set('scope', 'read:user');
	authorize.searchParams.set('state', state);
	authorize.searchParams.set('redirect_uri', callback.toString());

	throw redirect(302, authorize.toString());
};
