import type { PageLoad } from './$types';

/**
 * /changelog — reads CHANGELOG.md from the repo at build time and
 * passes the raw markdown to the page component for rendering.
 *
 * Resolved via Vite's ?raw import so the markdown source lands in
 * the bundle as a string. This means every deploy ships with the
 * exact CHANGELOG snapshot at that commit — no fetch, no failure
 * mode, no auth surface.
 */
import changelogSource from '../../../CHANGELOG.md?raw';

export const load: PageLoad = () => ({ source: changelogSource });

export const prerender = true;
