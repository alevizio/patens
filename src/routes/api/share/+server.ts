/**
 * POST /api/share — upload a project blob to Vercel Blob, return the cloud key
 * + a delete-token. Token-based auth: re-shares + deletes need to present the
 * token; reads are open (link-as-capability for recipients).
 *
 * Re-share semantics:
 *   - First POST: random token generated, project + token blobs stored,
 *     token returned to the originator
 *   - Subsequent POST without matching token: 403
 *   - Subsequent POST with matching token: overwrites both blobs
 *
 * Size guard: 5MB. Above that, .font.json export is the right path.
 */

import { put } from '@vercel/blob';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	sharePath,
	tokenPath,
	historyPath,
	latestVersion,
	isUuidish,
	requireBlobToken,
	fetchExistingToken,
	constantTimeEqual
} from '$lib/share-blob';

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export const POST: RequestHandler = async ({ request, fetch }) => {
	requireBlobToken();

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

	// Re-share auth — if a token already exists for this id, the caller must
	// provide a matching one via the X-Share-Token header.
	const existing = await fetchExistingToken(p.id, fetch);
	const provided = request.headers.get('X-Share-Token');
	let token: string;
	if (existing) {
		if (!provided || !constantTimeEqual(provided, existing)) {
			throw error(
				403,
				'A share already exists for this project; only the originator (who has the delete-token) can re-share.'
			);
		}
		token = existing;
	} else {
		// First upload — mint a fresh random token.
		token = crypto.randomUUID() + '-' + crypto.randomUUID();
	}

	// Version sequencing — read the current highest version under
	// shares/{id}/history/ and bump by one. First upload gets v1; a
	// re-share gets v2, etc. The canonical sharePath() always points
	// at the most recent version's content so GET stays backward-
	// compatible. The versioned snapshot at historyPath(id, N) is
	// immutable — a recipient with a `?v=N` URL can always retrieve it.
	const nextVersion = (await latestVersion(p.id)) + 1;

	try {
		const [blob] = await Promise.all([
			put(sharePath(p.id), body, {
				access: 'public',
				contentType: 'application/json',
				addRandomSuffix: false,
				allowOverwrite: true
			}),
			put(tokenPath(p.id), token, {
				access: 'public',
				contentType: 'text/plain',
				addRandomSuffix: false,
				allowOverwrite: true
			}),
			// Immutable version snapshot. Write in the same Promise.all so
			// the canonical + version blobs land together. allowOverwrite
			// is true defensively — a re-share at the same version number
			// shouldn't happen (latestVersion() reads-before-write), but
			// don't make a duplicate write fail the upload either.
			put(historyPath(p.id, nextVersion), body, {
				access: 'public',
				contentType: 'application/json',
				addRandomSuffix: false,
				allowOverwrite: true
			})
		]);
		return json({ id: p.id, url: blob.url, deleteToken: token, version: nextVersion });
	} catch (e) {
		throw error(500, `Upload failed: ${e instanceof Error ? e.message : String(e)}`);
	}
};
