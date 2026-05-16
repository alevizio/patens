import { error } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { loadProject } from '$lib/font/project';

export const load: LayoutLoad = async ({ params }) => {
	const project = await loadProject(params.id);
	if (!project) throw error(404, 'Project not found');
	return { project };
};
