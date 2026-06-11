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
	// %lang% in app.html: Spanish routes must declare lang="es" — a
	// hardcoded "en" mislabels them for screen readers + search engines.
	const path = event.url.pathname;
	const lang = path === '/es' || path.startsWith('/es/') ? 'es' : 'en';
	// /share/[id] renders client-side (ssr=false — projects live in
	// IndexedDB), so its per-project <svelte:head> OG tags never reach
	// crawlers. Inject them server-side from the URL alone: the
	// /og/{id} card endpoint renders without needing the project here.
	// Id charset is restricted so nothing user-controlled is echoed.
	const share = path.match(/^\/share\/([A-Za-z0-9-]{1,64})\/?$/);
	const shareMeta = share
		? [
				`<meta name="description" content="A typeface shared from Patens — view the live specimen, glyph set, and audit in your browser. Nothing to install." />`,
				`<meta property="og:title" content="Shared typeface · Patens" />`,
				`<meta property="og:description" content="View the live specimen, glyph set, and audit in your browser." />`,
				`<meta property="og:image" content="https://patens.design/og/${share[1]}" />`,
				`<meta property="og:image:width" content="1200" />`,
				`<meta property="og:image:height" content="630" />`,
				`<meta name="twitter:image" content="https://patens.design/og/${share[1]}" />`
			].join('\n\t\t')
		: null;
	const response = await resolve(event, {
		transformPageChunk: ({ html }) => {
			let out = html.replaceAll('%lang%', lang);
			if (shareMeta) out = out.replace('</head>', `\t${shareMeta}\n\t</head>`);
			return out;
		}
	});
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
