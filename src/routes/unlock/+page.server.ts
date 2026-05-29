/**
 * /unlock — the single passcode door to the private alpha. The server
 * hook bounces gated routes here with ?next=<path>; once the tester
 * enters the right code we set the signed alpha cookie and send them on.
 *
 * Public + noindex (see +page.svelte head). The page degrades to a
 * plain "already in / nothing to unlock" redirect when the gate is off.
 */

import { fail, redirect } from '@sveltejs/kit';
import { safeReturnTo } from '$lib/server/session';
import {
	ALPHA_COOKIE,
	alphaCookieOptions,
	alphaCookieValue,
	alphaGateEnabled,
	checkPasscode,
	isAlphaCookieValid
} from '$lib/server/alpha';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url, cookies }) => {
	const next = safeReturnTo(url.searchParams.get('next'), url.origin) || '/alpha';
	// Gate disabled (local dev / unconfigured) → there's nothing to
	// unlock; send them straight into the app.
	if (!alphaGateEnabled()) throw redirect(303, next === '/' ? '/alpha' : next);
	// Already holding a valid grant → skip the form.
	const secret = process.env.AUTH_SECRET!;
	const passcode = process.env.ALPHA_PASSCODE!;
	if (isAlphaCookieValid(cookies.get(ALPHA_COOKIE), passcode, secret)) {
		throw redirect(303, next === '/' ? '/alpha' : next);
	}
	return { next };
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const next = safeReturnTo(url.searchParams.get('next'), url.origin) || '/alpha';
		if (!alphaGateEnabled()) throw redirect(303, next === '/' ? '/alpha' : next);

		const data = await request.formData();
		const provided = String(data.get('passcode') ?? '');
		const secret = process.env.AUTH_SECRET!;
		const passcode = process.env.ALPHA_PASSCODE!;

		if (!provided || !checkPasscode(provided, passcode)) {
			// Don't echo the attempt back — just a generic miss.
			return fail(401, { error: "That code didn't match. Check it and try again." });
		}

		cookies.set(ALPHA_COOKIE, alphaCookieValue(passcode, secret), {
			...alphaCookieOptions,
			secure: url.protocol === 'https:'
		});
		throw redirect(303, next === '/' ? '/alpha' : next);
	}
};
