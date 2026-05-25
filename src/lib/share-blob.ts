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
