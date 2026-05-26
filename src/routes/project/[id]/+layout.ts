import { error } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { loadProject, saveProject } from '$lib/font/project';

// SSR off: project data lives in client-only IndexedDB. Running this
// load server-side throws because `indexedDB` is undefined in Node,
// surfacing as a 500 "internal error" page on Vercel. The client-side
// load works because the browser has IndexedDB.
export const ssr = false;

export const load: LayoutLoad = async ({ params, url }) => {
	// Demo fast path: /project/demo/edit always works, even on first
	// visit with empty IndexedDB. Build the demo project on the fly
	// and (best-effort) persist it so reloading the page picks the
	// same instance. The persistence failure is non-fatal — the
	// project is returned regardless so the editor renders.
	//
	// ?fresh=1 forces a rebuild — useful when a designer-friend has
	// edited the demo (deleted glyphs, changed metadata) and wants
	// to start from a pristine state without clearing IndexedDB.
	if (params.id === 'demo') {
		const wantsFresh = url.searchParams.get('fresh') === '1';
		const existing = wantsFresh ? null : await loadProject('demo').catch(() => null);
		if (existing) return { project: existing };
		// createDemoProject() lazy-imported only on the demo path. The
		// demo-project module is 3665 lines (~113KB) of glyph data — for
		// user-created projects (UUID ids) this load function never
		// touches it, so the static import would just bloat the editor's
		// cold-load chunk for nothing.
		const { createDemoProject } = await import('$lib/font/demo-project');
		const demo = { ...createDemoProject(), id: 'demo' };
		await saveProject(demo).catch(() => {
			/* IDB may be unavailable (private mode, quota, etc) —
			   render the demo anyway from the in-memory build. */
		});
		return { project: demo };
	}

	const project = await loadProject(params.id);
	if (!project) throw error(404, 'Project not found');
	return { project };
};
