/**
 * Server-side error hook. Mirrors hooks.client.ts so server crashes
 * surface real diagnostic info instead of an opaque "Internal error".
 * The SvelteKit server function will log to Vercel's runtime logs
 * AND return the stack to the +error.svelte boundary.
 */

import type { Handle, HandleServerError } from '@sveltejs/kit';
import { decodeSession, SESSION_COOKIE } from '$lib/server/session';

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
	return resolve(event);
};

export const handleError: HandleServerError = ({ error, event, status, message }) => {
	console.error('[SSR handleError]', error);
	const err = error as Error;
	return {
		message: err?.message ?? message ?? 'Unknown server error',
		stack: err?.stack,
		status,
		url: event.url.pathname
	};
};
