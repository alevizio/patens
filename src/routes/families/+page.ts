import type { PageLoad } from './$types';
import { listFamilies } from '$lib/font/family';

export const load: PageLoad = async () => {
	const families = await listFamilies();
	return { families };
};
