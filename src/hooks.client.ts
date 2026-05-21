/**
 * Client-side error hook. Captures the stack + message for the
 * SvelteKit error boundary so the +error.svelte page can surface
 * actionable diagnostic detail instead of just "Internal error".
 *
 * Without this hook, only `error.message` survives the boundary;
 * the stack gets stripped. With it, the error object the page
 * receives includes both, so users can copy-paste the diagnostic
 * info into a bug report.
 */

import type { HandleClientError } from '@sveltejs/kit';

export const handleError: HandleClientError = ({ error, event, status, message }) => {
	// Console.error in addition to the error page so DevTools also
	// catches the full stack without requiring the user to open the
	// diagnostic detail panel.
	console.error('[handleError]', error);
	const err = error as Error;
	return {
		message: err?.message ?? message ?? 'Unknown client error',
		stack: err?.stack,
		status,
		url: event.url.pathname
	};
};
