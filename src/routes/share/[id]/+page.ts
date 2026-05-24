import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { loadProject, saveProject } from '$lib/font/project';
import { createDemoProject } from '$lib/font/demo-project';
import type { Project } from '$lib/font/types';

/**
 * Read-only share viewer. Three load paths in order:
 *
 *  1. /share/demo — always works. Builds the demo project on the
 *     fly so the public specimen URL never 404s for first-time
 *     visitors. This is also the recovery link on the share-404 page.
 *
 *  2. Local IndexedDB — fastest when the recipient IS the originator
 *     (or the same browser). loadProject() returns null on miss.
 *
 *  3. Cloud fetch — Tier 2 hydration. When local misses, GET
 *     /api/share/{id} to try Vercel Blob storage. If hit, save to
 *     local IndexedDB so the next view is instant, then return.
 *     If the API is unconfigured (no BLOB_READ_WRITE_TOKEN) or the
 *     project was never uploaded, the API returns 404 and we
 *     surface the standard share-404 recovery copy.
 */
export const load: PageLoad = async ({ params, fetch }) => {
	if (params.id === 'demo') {
		const existing = await loadProject('demo').catch(() => null);
		if (existing) return { project: existing };
		const demo = { ...createDemoProject(), id: 'demo' };
		await saveProject(demo).catch(() => {
			/* IndexedDB unavailable (private mode, quota errors, etc.) —
			   render the demo anyway from the in-memory build. */
		});
		return { project: demo };
	}
	// 1. Local IndexedDB
	const local = await loadProject(params.id);
	if (local) return { project: local };

	// 2. Cloud — Vercel Blob via /api/share/{id}
	try {
		const res = await fetch(`/api/share/${params.id}`);
		if (res.ok) {
			const project = (await res.json()) as Project;
			// Save locally so repeat views (and the editor, if the recipient
			// opens it) don't re-fetch from cloud. Failure to save is
			// non-fatal (private-mode quota, etc.) — we still render.
			await saveProject(project).catch(() => {});
			return { project };
		}
		// 404 / 503 from /api/share — fall through to the local 404
		// recovery page with its own copy.
	} catch {
		// Network error reaching the API — same fall-through.
	}
	throw error(404, 'Shared project not found in local storage or cloud');
};

// Static rendering off — projects only exist client-side.
export const ssr = false;
