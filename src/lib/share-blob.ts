/**
 * Shared helpers between /api/share + /api/share/[id] route handlers.
 * Path conventions + token-based auth for cloud-share blobs.
 */

import { list } from '@vercel/blob';
import { error } from '@sveltejs/kit';
import { timingSafeEqual } from 'node:crypto';

/**
 * Constant-time string compare for security-sensitive token comparison.
 * Defends against timing attacks that could leak the token byte-by-byte
 * from response time differences. Returns false (not throws) on length
 * mismatch — Node's timingSafeEqual would throw otherwise.
 */
export const constantTimeEqual = (a: string, b: string): boolean => {
	const aBuf = Buffer.from(a);
	const bBuf = Buffer.from(b);
	if (aBuf.length !== bBuf.length) return false;
	return timingSafeEqual(aBuf, bBuf);
};

export const sharePath = (id: string): string => `shares/${id}.json`;
export const tokenPath = (id: string): string => `shares/${id}.token`;

/**
 * Versioned snapshot path. Each re-share writes a copy to this path
 * alongside the canonical `sharePath(id)`. The canonical path is the
 * "current" version (always the most recent); `historyPath(id, N)` is
 * the immutable version N (1-indexed). Designed so a recipient who
 * bookmarked an old share URL can still load that specific version if
 * the share has since been overwritten — pass `?v=N` to GET.
 *
 * Storage layout for a share with 3 versions:
 *   shares/{id}.json              — current (= v3, written last)
 *   shares/{id}.token             — delete token
 *   shares/{id}/history/v1.json   — first upload
 *   shares/{id}/history/v2.json   — second upload
 *   shares/{id}/history/v3.json   — third upload (= same content as current)
 */
export const historyPath = (id: string, version: number): string =>
	`shares/${id}/history/v${version}.json`;

/** Prefix to `list()` every version for a given share id. */
export const historyPrefix = (id: string): string => `shares/${id}/history/`;

/**
 * Returns the highest existing version number under shares/{id}/history/,
 * or 0 if no history exists yet. Used by POST to compute the next version
 * number before writing the snapshot.
 */
export const latestVersion = async (id: string): Promise<number> => {
	try {
		const listed = await list({ prefix: historyPrefix(id), limit: 1000 });
		let max = 0;
		for (const b of listed.blobs) {
			const m = b.pathname.match(/\/v(\d+)\.json$/);
			if (m) {
				const n = Number(m[1]);
				if (n > max) max = n;
			}
		}
		return max;
	} catch {
		return 0;
	}
};

export const isUuidish = (s: unknown): s is string =>
	typeof s === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(s);

export const requireBlobToken = (): void => {
	if (!process.env.BLOB_READ_WRITE_TOKEN) {
		throw error(
			503,
			'Cloud share not configured for this deployment. Use the .font.json export instead.'
		);
	}
};

/**
 * Returns the delete-token stored alongside a share, or null if no token
 * blob exists (which means no share has ever been uploaded with this id).
 */
export const fetchExistingToken = async (
	id: string,
	fetchFn: typeof fetch
): Promise<string | null> => {
	try {
		const listed = await list({ prefix: tokenPath(id), limit: 1 });
		const url = listed.blobs.find((b) => b.pathname === tokenPath(id))?.url;
		if (!url) return null;
		const res = await fetchFn(url);
		if (!res.ok) return null;
		return (await res.text()).trim();
	} catch {
		return null;
	}
};
