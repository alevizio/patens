/**
 * Server-side error hook. Mirrors hooks.client.ts so server crashes
 * surface real diagnostic info instead of an opaque "Internal error".
 * The SvelteKit server function logs to Vercel's runtime logs. Stack
 * details are returned only in dev so production users don't see internals.
 */

import type { Handle, HandleServerError } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { decodeSession, SESSION_COOKIE } from '$lib/server/session';
import { applySecurityHeaders, serverErrorPayload } from '$lib/server/http-security';

/**
 * Per-request hook: decode the signed session cookie (if present + valid)
 * and stash the user on `event.locals.session`. Pages read this via
 * +layout.server.ts → +layout.svelte → account dropdown.
 *
 * Tampering or missing AUTH_SECRET → null, no session. Routes that need
 * to gate on auth check `locals.session` and respond accordingly.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const cookie = event.cookies.get(SESSION_COOKIE);
	const secret = process.env.AUTH_SECRET;
	event.locals.session = secret ? decodeSession(cookie, secret) : null;
	const response = await resolve(event);
	applySecurityHeaders(response.headers, event.url.protocol === 'https:');
	return response;
};

export const handleError: HandleServerError = ({ error, event, status, message }) => {
	if (status >= 500) {
		console.error('[SSR handleError]', error);
	}
	return serverErrorPayload({
		error,
		message,
		status,
		url: event.url.pathname,
		exposeDetails: dev
	});
};
