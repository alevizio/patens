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
export const load: PageLoad = async ({ params, fetch, url }) => {
	if (params.id === 'demo') {
		// ?fresh=1 rebuilds the demo from source, ignoring any local
		// IndexedDB copy. Same convention as /project/demo/edit?fresh=1.
		const wantsFresh = url.searchParams.get('fresh') === '1';
		const existing = wantsFresh ? null : await loadProject('demo').catch(() => null);
		if (existing) return { project: existing, version: null };
		const demo = { ...createDemoProject(), id: 'demo' };
		await saveProject(demo).catch(() => {
			/* IndexedDB unavailable (private mode, quota errors, etc.) —
			   render the demo anyway from the in-memory build. */
		});
		return { project: demo, version: null };
	}
	// ?v=N selects an immutable version snapshot. Absent = latest.
	// Local IDB always holds the latest, so a version-pinned link must
	// skip the local cache and go directly to the cloud (which has the
	// versioned blob). Without this we'd silently return the latest
	// when the user asked for a specific older version.
	const versionParam = url.searchParams.get('v');
	const hasVersion = versionParam !== null && versionParam !== 'latest';

	// 1. Local IndexedDB (only for the latest case)
	if (!hasVersion) {
		const local = await loadProject(params.id);
		if (local) return { project: local, version: null };
	}

	// 2. Cloud — Vercel Blob via /api/share/{id}[?v=N]
	const cloudUrl = hasVersion
		? `/api/share/${params.id}?v=${encodeURIComponent(versionParam)}`
		: `/api/share/${params.id}`;
	try {
		const res = await fetch(cloudUrl);
		if (res.ok) {
			const project = (await res.json()) as Project;
			// Save locally only when fetching the latest; an old version
			// shouldn't clobber the latest in IDB.
			if (!hasVersion) {
				await saveProject(project).catch(() => {});
			}
			return { project, version: hasVersion ? Number(versionParam) : null };
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
