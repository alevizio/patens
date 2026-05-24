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
import { list } from '@vercel/blob';
import type { RequestHandler } from './$types';

const isUuidish = (s: string): boolean => /^[a-zA-Z0-9_-]{8,64}$/.test(s);

export const GET: RequestHandler = async ({ params, setHeaders }) => {
	const id = params.id;
	if (!id || !isUuidish(id)) {
		throw error(400, 'Invalid share id');
	}

	if (!process.env.BLOB_READ_WRITE_TOKEN) {
		throw error(404, 'Cloud share not configured');
	}

	const prefix = `shares/${id}.json`;
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
		throw error(404, 'Share not found');
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
