import { LIBRARY, libraryByCategory } from '$lib/library/canon';
import type { PageLoad } from './$types';

/**
 * The 38-source canonical library page is prerendered — the data is
 * static (no per-request input) and stable, so render it at build time.
 */
export const prerender = true;

export const load: PageLoad = () => {
	return {
		entries: LIBRARY,
		byCategory: libraryByCategory(),
		totalCount: LIBRARY.length
	};
};
