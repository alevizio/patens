/**
 * Root layout server load — exposes the decoded session (or null) so
 * client components (account dropdown, share UI) can render auth state
 * without a separate fetch.
 *
 * Note: with prerendering, this would force every page to be server-
 * rendered. We avoid that by checking event.isDataRequest / SSR mode
 * via the load context (SvelteKit handles this transparently — the
 * load only runs when a real request is made; prerendered pages don't
 * carry session state and render as anonymous).
 */

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => ({
	session: locals.session
});
