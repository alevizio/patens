/**
 * GET /api/share/[id]/versions — list the immutable version snapshots
 * for a shared project. Recipients use this to find historical versions
 * after the originator has re-shared; the canonical /api/share/[id]
 * always returns the most recent.
 *
 * Returns: { id, versions: [{ v, uploadedAt, sizeBytes, url }] }
 *
 * Open read (link-as-capability — same model as GET /api/share/[id]).
 * Empty result when no history exists yet; never 404s because the
 * existence of an old-style share without versioning is also a valid
 * state (the canonical blob may exist even though history doesn't).
 */

import { error } from '@sveltejs/kit';
import { list } from '@vercel/blob';
import type { RequestHandler } from './$types';
import { historyPrefix } from '$lib/share-blob';

const isUuidish = (s: string): boolean => /^[a-zA-Z0-9_-]{8,64}$/.test(s);

export const GET: RequestHandler = async ({ params, setHeaders }) => {
	const id = params.id;
	if (!id || !isUuidish(id)) {
		throw error(400, 'Invalid share id');
	}

	if (!process.env.BLOB_READ_WRITE_TOKEN) {
		throw error(404, 'Cloud share not configured');
	}

	const versions: Array<{ v: number; uploadedAt: string; sizeBytes: number; url: string }> = [];
	try {
		const listed = await list({ prefix: historyPrefix(id), limit: 1000 });
		for (const b of listed.blobs) {
			const m = b.pathname.match(/\/v(\d+)\.json$/);
			if (!m) continue;
			versions.push({
				v: Number(m[1]),
				uploadedAt: b.uploadedAt.toISOString(),
				sizeBytes: b.size,
				url: b.url
			});
		}
		versions.sort((a, b) => b.v - a.v); // newest first
	} catch (e) {
		throw error(500, `Version list failed: ${e instanceof Error ? e.message : String(e)}`);
	}

	setHeaders({
		'cache-control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=600',
		'content-type': 'application/json'
	});
	return new Response(JSON.stringify({ id, versions }), { status: 200 });
};
