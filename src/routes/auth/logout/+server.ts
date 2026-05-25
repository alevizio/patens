/**
 * POST /auth/logout — clear the signed session cookie + redirect.
 *
 * POST (not GET) to defeat drive-by sign-out via prefetch / linking.
 * Form submission from a button works fine.
 */

import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SESSION_COOKIE } from '$lib/server/session';

export const POST: RequestHandler = ({ cookies, url }) => {
	cookies.delete(SESSION_COOKIE, { path: '/' });
	const returnTo = url.searchParams.get('returnTo') ?? '/';
	throw redirect(303, returnTo);
};
