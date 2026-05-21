import { error } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { loadProject } from '$lib/font/project';

// SSR off: project data lives in client-only IndexedDB. Running this
// load server-side throws because `indexedDB` is undefined in Node,
// surfacing as a 500 "internal error" page on Vercel. The client-side
// load works because the browser has IndexedDB.
export const ssr = false;

export const load: LayoutLoad = async ({ params }) => {
	const project = await loadProject(params.id);
	if (!project) throw error(404, 'Project not found');
	return { project };
};
