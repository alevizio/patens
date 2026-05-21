import { error } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { loadProject, saveProject } from '$lib/font/project';
import { createDemoProject } from '$lib/font/demo-project';

// SSR off: project data lives in client-only IndexedDB. Running this
// load server-side throws because `indexedDB` is undefined in Node,
// surfacing as a 500 "internal error" page on Vercel. The client-side
// load works because the browser has IndexedDB.
export const ssr = false;

export const load: LayoutLoad = async ({ params }) => {
	// Demo fast path: /project/demo/edit always works, even on first
	// visit with empty IndexedDB. Build the demo project on the fly
	// and (best-effort) persist it so reloading the page picks the
	// same instance. The persistence failure is non-fatal — the
	// project is returned regardless so the editor renders.
	if (params.id === 'demo') {
		const existing = await loadProject('demo').catch(() => null);
		if (existing) return { project: existing };
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
