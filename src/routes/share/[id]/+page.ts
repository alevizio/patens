import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { loadProject, saveProject } from '$lib/font/project';
import { createDemoProject } from '$lib/font/demo-project';

/**
 * Read-only share viewer. Loads the project from local IndexedDB —
 * works when the recipient is the owner (or someone with the same
 * browser). With PartyKit + auth (M3) a remote viewer will hydrate
 * via the network layer instead; for now the route fails with 404
 * if the local DB doesn't have the project.
 *
 * Exception: /share/demo always works — builds the demo project on
 * the fly (same special-case as /project/demo/edit) so the public
 * specimen URL never 404s for first-time visitors. This is also the
 * recovery link from the share-404 error page.
 */
export const load: PageLoad = async ({ params }) => {
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
	const project = await loadProject(params.id);
	if (!project) throw error(404, 'Shared project not found in local storage');
	return { project };
};

// Static rendering off — projects only exist client-side.
export const ssr = false;
