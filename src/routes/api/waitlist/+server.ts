/**
 * POST /api/waitlist — persist a private-alpha invite-list email to
 * Vercel Blob. The store is private (access: 'private'), so the address
 * isn't readable without the read-write token — the right posture for
 * PII. Key is sha256(email): deterministic, so a re-signup overwrites
 * its own record (free dedupe). We never return the blob URL either.
 *
 * Unconfigured (no BLOB_READ_WRITE_TOKEN) → 503, mirroring /api/share.
 */

import { put } from '@vercel/blob';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { normalizeEmail, waitlistKey } from '$lib/server/waitlist';

// Generous ceiling — a JSON {email, locale, company} body is tiny; this
// just stops someone POSTing a megabyte of junk.
const MAX_SIZE_BYTES = 4 * 1024;

export const POST: RequestHandler = async ({ request }) => {
	if (!process.env.BLOB_READ_WRITE_TOKEN) {
		throw error(503, 'Waitlist is not configured for this deployment.');
	}

	const contentLength = Number(request.headers.get('content-length') ?? 0);
	if (contentLength > MAX_SIZE_BYTES) throw error(413, 'Payload too large');

	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}
	if (!payload || typeof payload !== 'object') throw error(400, 'Body must be an object');
	const body = payload as Record<string, unknown>;

	// Honeypot — bots autofill `company`; humans never see it. Accept
	// silently (200) without storing so the bot gets no signal.
	if (typeof body.company === 'string' && body.company.trim()) {
		return json({ ok: true });
	}

	const email = normalizeEmail(body.email);
	if (!email) throw error(400, 'A valid email is required');
	const locale = body.locale === 'es' ? 'es' : 'en';

	const record = JSON.stringify({ email, locale, ts: new Date().toISOString() });
	try {
		await put(waitlistKey(email), record, {
			access: 'private',
			contentType: 'application/json',
			addRandomSuffix: false,
			allowOverwrite: true
		});
	} catch (e) {
		throw error(500, `Could not save: ${e instanceof Error ? e.message : String(e)}`);
	}

	return json({ ok: true });
};
