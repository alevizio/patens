import type { PageLoad } from './$types';
import { listFamilies } from '$lib/font/family';

// /families reads from IndexedDB via idb-keyval. The root layout has
// `ssr = true` so without this opt-out the load function runs in the
// Vercel serverless context where `indexedDB` is undefined — production
// returns 500 with "ReferenceError: indexedDB is not defined." Same
// posture as /share/[id] and /project/[id]/* — these are client-only
// surfaces over IndexedDB.
export const ssr = false;

export const load: PageLoad = async () => {
	const families = await listFamilies();
	return { families };
};
