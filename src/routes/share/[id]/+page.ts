import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { loadProject } from '$lib/font/project';

/**
 * Read-only share viewer. Loads the project from local IndexedDB —
 * works when the recipient is the owner (or someone with the same
 * browser). With PartyKit + auth (M2) a remote viewer will hydrate
 * via the network layer instead; for now the route fails with 404
 * if the local DB doesn't have the project.
 */
export const load: PageLoad = async ({ params }) => {
	const project = await loadProject(params.id);
	if (!project) throw error(404, 'Shared project not found in local storage');
	return { project };
};

// Static rendering off — projects only exist client-side.
export const ssr = false;
