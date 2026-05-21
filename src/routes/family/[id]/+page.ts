import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { loadFamily, listSiblings } from '$lib/font/family';

// SSR off — family data lives in client-only IndexedDB.
export const ssr = false;

export const load: PageLoad = async ({ params }) => {
	const family = await loadFamily(params.id);
	if (!family) throw error(404, 'Family not found');
	const siblings = await listSiblings(family.id);
	return { family, siblings };
};
