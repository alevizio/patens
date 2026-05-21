/**
 * Server-side error hook. Mirrors hooks.client.ts so server crashes
 * surface real diagnostic info instead of an opaque "Internal error".
 * The SvelteKit server function will log to Vercel's runtime logs
 * AND return the stack to the +error.svelte boundary.
 */

import type { HandleServerError } from '@sveltejs/kit';

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
