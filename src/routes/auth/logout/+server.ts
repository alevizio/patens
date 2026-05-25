/**
 * POST /auth/logout — clear the signed session cookie + redirect.
 *
 * POST (not GET) to defeat drive-by sign-out via prefetch / linking.
 * Form submission from a button works fine.
 */

import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SESSION_COOKIE, safeReturnTo } from '$lib/server/session';

export const POST: RequestHandler = ({ cookies, url }) => {
	cookies.delete(SESSION_COOKIE, { path: '/' });
	// Sanitize against open redirect — see safeReturnTo doc in session.ts.
	const returnTo = safeReturnTo(url.searchParams.get('returnTo'), url.origin);
	throw redirect(303, returnTo);
};
