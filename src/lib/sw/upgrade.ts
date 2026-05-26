/**
 * Pure helpers extracted from src/service-worker.ts so the upgrade and
 * routing logic can be unit-tested without spinning up a real
 * ServiceWorkerGlobalScope.
 *
 * The service worker imports these and wires them to the lifecycle
 * events. Anything that touches `self`, `caches`, or `fetch` stays in
 * service-worker.ts; anything that's a function over inputs lives here.
 */

/**
 * Decide which cache names should be evicted when a new service-worker
 * activates. Returns every key under our namespace that ISN'T the
 * current build's cache.
 *
 * @param allKeys - every cache name on the Cache Storage API
 * @param currentCacheName - the name of *this* build's cache
 * @param prefix - the namespace shared by every Patens cache (legacy
 *                 history means it stays `font-studio-` regardless of
 *                 the user-facing brand rename)
 */
export const cachesToEvict = (
	allKeys: string[],
	currentCacheName: string,
	prefix: string
): string[] => allKeys.filter((k) => k !== currentCacheName && k.startsWith(prefix));

/**
 * Decide how the SW should respond to a fetch event. Pure decision —
 * the actual cache/network operations stay in the SW.
 *
 *   'cache-first'   — immutable hashed asset; serve from cache, only
 *                     fall back to network on miss
 *   'network-first' — HTML / dynamic page; try network, fall back to
 *                     cache on offline
 *   'passthrough'   — don't touch (cross-origin, non-GET, or /api/)
 *
 * @param method        - HTTP method
 * @param url           - the request URL
 * @param swOrigin      - the SW's own origin (so cross-origin can be
 *                        detected without leaking host into the helper)
 * @param immutableSet  - the set of `[...build, ...files]` paths the
 *                        Vite plugin emits at build time
 */
export type RouteDecision = 'cache-first' | 'network-first' | 'passthrough';

export const routeFetch = (
	method: string,
	url: URL,
	swOrigin: string,
	immutableSet: ReadonlySet<string>
): RouteDecision => {
	if (method !== 'GET') return 'passthrough';
	if (url.origin !== swOrigin) return 'passthrough';
	if (url.pathname.startsWith('/api/')) return 'passthrough';
	if (immutableSet.has(url.pathname)) return 'cache-first';
	return 'network-first';
};
