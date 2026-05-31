import { PROGRAMS, programsByRegion } from '$lib/education/programs';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = () => {
	return {
		programs: PROGRAMS,
		byRegion: programsByRegion(),
		totalCount: PROGRAMS.length
	};
};
