import { LIBRARY, libraryByCategory } from '$lib/library/canon';
import type { PageLoad } from './$types';

/**
 * The 42-source canonical library page is prerendered — the data is
 * static (no per-request input) and stable, so render it at build time.
 * Expanded from 38 → 42 with the Living OFL exemplars category (Bungee,
 * Fit, Amstelvar, Roboto Flex) — production OFL fonts that demonstrate
 * the audit categories in real-world use.
 */
export const prerender = true;

export const load: PageLoad = () => {
	return {
		entries: LIBRARY,
		byCategory: libraryByCategory(),
		totalCount: LIBRARY.length
	};
};
