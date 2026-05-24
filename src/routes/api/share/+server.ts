/**
 * POST /api/share — upload a project blob to Vercel Blob, return the cloud key
 * so the originator's "Copy share link" button can produce a URL that works
 * for recipients in different browsers.
 *
 * Auth model: link-as-capability. The returned ID is an unguessable UUID,
 * stored as the blob's filename. Anyone who has the URL can read the blob;
 * no one without the URL can. Matches Font Studio's "browser-local first"
 * philosophy — no signup, no sessions, just opaque links.
 *
 * Size guard: project JSON for the 119-glyph demo is ~250KB. We cap at
 * 5MB which is generous (a project with thousands of glyphs + color layers
 * + many masters would still fit). Above that we 413 — the .font.json
 * download path is the right way to ship larger projects.
 *
 * Re-share semantics: the client passes its own project.id as the cloud
 * key. Re-shares from the same browser overwrite the existing blob (the
 * project moved forward; recipients should see the latest). Different
 * browsers that happen to know the same project.id can read it — that's
 * fine; project.id is itself an unguessable UUID generated client-side.
 */

import { put } from '@vercel/blob';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const isUuidish = (s: unknown): s is string =>
	typeof s === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(s);

export const POST: RequestHandler = async ({ request }) => {
	const contentLength = Number(request.headers.get('content-length') ?? 0);
	if (contentLength > MAX_SIZE_BYTES) {
		throw error(413, 'Project too large for share — use the .font.json export instead');
	}

	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}

	if (!payload || typeof payload !== 'object') {
		throw error(400, 'Payload must be a project object');
	}
	const p = payload as Record<string, unknown>;
	if (!isUuidish(p.id)) {
		throw error(400, 'Project missing valid id');
	}
	if (!p.metadata || typeof p.metadata !== 'object') {
		throw error(400, 'Project missing metadata');
	}

	const body = JSON.stringify(payload);
	if (body.length > MAX_SIZE_BYTES) {
		throw error(413, 'Project too large for share — use the .font.json export instead');
	}

	// Vercel Blob requires BLOB_READ_WRITE_TOKEN at runtime. If it's not
	// set (local dev without env vars, or self-hosted deploy without the
	// service), surface a clear error instead of an opaque crash.
	if (!process.env.BLOB_READ_WRITE_TOKEN) {
		throw error(
			503,
			'Cloud share not configured for this deployment. Use the .font.json export instead.'
		);
	}

	try {
		const blob = await put(`shares/${p.id}.json`, body, {
			access: 'public',
			contentType: 'application/json',
			addRandomSuffix: false,
			allowOverwrite: true
		});
		return json({ id: p.id, url: blob.url });
	} catch (e) {
		throw error(500, `Upload failed: ${e instanceof Error ? e.message : String(e)}`);
	}
};
