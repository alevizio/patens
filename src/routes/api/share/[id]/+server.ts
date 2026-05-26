/**
 * GET /api/share/[id] — fetch a previously-uploaded project blob from
 * Vercel Blob. Called by the share-page loader when the recipient's
 * IndexedDB doesn't have the project (i.e. anyone other than the
 * originator's browser).
 *
 * Returns the project JSON directly with cache headers tuned for
 * "rarely-edited" content (long browser cache, short edge cache).
 *
 * 404s on miss so the share-page loader can surface its standard
 * recovery copy ("This link is browser-local" + demo + .font.json
 * import).
 */

import { error } from '@sveltejs/kit';
import { list, del } from '@vercel/blob';
import type { RequestHandler } from './$types';
import {
	sharePath,
	tokenPath,
	historyPath,
	historyPrefix,
	fetchExistingToken,
	requireBlobToken,
	constantTimeEqual
} from '$lib/share-blob';

const isUuidish = (s: string): boolean => /^[a-zA-Z0-9_-]{8,64}$/.test(s);

export const GET: RequestHandler = async ({ params, url, setHeaders }) => {
	const id = params.id;
	if (!id || !isUuidish(id)) {
		throw error(400, 'Invalid share id');
	}

	// ?v=N returns the immutable snapshot at version N; absent or "latest"
	// returns the canonical (most-recent) share. Stays backward-compatible
	// with every existing share link. Validation fires before the
	// cloud-config check so malformed requests fail fast regardless of
	// deploy state.
	const versionParam = url.searchParams.get('v');
	let prefix: string;
	if (versionParam && versionParam !== 'latest') {
		const v = Number(versionParam);
		if (!Number.isInteger(v) || v < 1 || v > 10_000) {
			throw error(400, 'Invalid version number');
		}
		prefix = historyPath(id, v);
	} else {
		prefix = sharePath(id);
	}

	if (!process.env.BLOB_READ_WRITE_TOKEN) {
		throw error(404, 'Cloud share not configured');
	}

	let blobUrl: string | undefined;
	try {
		// Vercel Blob doesn't expose a direct "get by pathname" yet; list
		// with the exact prefix to find it. Result is at most 1 item.
		const listed = await list({ prefix, limit: 1 });
		blobUrl = listed.blobs.find((b) => b.pathname === prefix)?.url;
	} catch (e) {
		throw error(500, `Lookup failed: ${e instanceof Error ? e.message : String(e)}`);
	}

	if (!blobUrl) {
		throw error(404, versionParam ? `Version ${versionParam} not found` : 'Share not found');
	}

	// Fetch the blob's content from its public URL. Vercel Blob's public
	// URLs are CDN-fronted so this is fast + cheap on repeat hits.
	const res = await fetch(blobUrl);
	if (!res.ok) {
		throw error(502, `Upstream blob fetch failed: ${res.status}`);
	}
	const body = await res.text();

	setHeaders({
		// Aggressive cache: projects rarely change, but if a re-share lands
		// it'd overwrite the blob and the URL stays the same. 60s SWR on
		// the edge means redeploys + updates propagate within a minute
		// without breaking the share-on-paste experience.
		'cache-control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=600',
		'content-type': 'application/json'
	});
	return new Response(body, { status: 200 });
};

/**
 * DELETE /api/share/[id] — remove a previously-shared project + its
 * delete-token blob. Requires the originator's X-Share-Token header.
 *
 * Why a token: the share URL is public (link-as-capability for reads),
 * so anyone with the URL could otherwise delete the sender's work. The
 * token sits in the originator's IndexedDB project record alongside
 * the cloud URL; recipients never see it.
 */
export const DELETE: RequestHandler = async ({ params, request, fetch }) => {
	requireBlobToken();

	const id = params.id;
	if (!id || !isUuidish(id)) {
		throw error(400, 'Invalid share id');
	}

	const provided = request.headers.get('X-Share-Token');
	if (!provided) {
		throw error(401, 'Delete requires X-Share-Token header');
	}

	const existing = await fetchExistingToken(id, fetch);
	if (!existing) {
		// No token blob — nothing to delete (or never uploaded). Idempotent 204.
		return new Response(null, { status: 204 });
	}

	if (!constantTimeEqual(provided, existing)) {
		throw error(403, 'Token does not match');
	}

	try {
		// Look up the current + token + every version blob, then pass them
		// all to del() in one transaction. limit=1000 caps the version
		// count per share — far beyond anything a real designer would
		// re-share, and Vercel Blob's list paginates if you exceed it.
		const [shareList, tokenList, historyList] = await Promise.all([
			list({ prefix: sharePath(id), limit: 1 }),
			list({ prefix: tokenPath(id), limit: 1 }),
			list({ prefix: historyPrefix(id), limit: 1000 })
		]);
		const urls = [
			shareList.blobs.find((b) => b.pathname === sharePath(id))?.url,
			tokenList.blobs.find((b) => b.pathname === tokenPath(id))?.url,
			...historyList.blobs.map((b) => b.url)
		].filter((u): u is string => typeof u === 'string');
		if (urls.length > 0) await del(urls);
		return new Response(null, { status: 204 });
	} catch (e) {
		throw error(500, `Delete failed: ${e instanceof Error ? e.message : String(e)}`);
	}
};
