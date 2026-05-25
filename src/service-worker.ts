/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

/**
 * Service worker — turns Patens into a real offline-capable PWA.
 *
 * Strategy:
 *  - Install: pre-cache `build/` (immutable hashed chunks) + `files/`
 *    (static assets like favicon, manifest, og-fonts won't be here
 *    because static/ wasn't the source; the og-fonts now live in
 *    src/lib so they're inside the build bundle).
 *  - Activate: drop old caches so a deploy doesn't pin the previous
 *    build's chunks forever.
 *  - Fetch: cache-first for immutable assets (anything in `build`),
 *    network-first-with-cache-fallback for HTML + everything else.
 *  - /api/ is always network — IndexedDB + Vercel Blob are the source
 *    of truth, not the SW cache.
 *
 * SvelteKit auto-registers this file because it sits at src/service-worker.ts.
 * The version constant updates per build so a fresh deploy invalidates
 * the old cache automatically.
 */

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE_NAME = `font-studio-${version}`;
const PRECACHE = [...build, ...files];

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => cache.addAll(PRECACHE))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys.filter((k) => k !== CACHE_NAME && k.startsWith('font-studio-')).map((k) => caches.delete(k))
				)
			)
			.then(() => sw.clients.claim())
	);
});

sw.addEventListener('fetch', (event) => {
	const req = event.request;

	// Don't cache non-GET (POST to /api/share, etc).
	if (req.method !== 'GET') return;

	const url = new URL(req.url);

	// Never cache /api/ — IndexedDB / blob storage is the source of truth.
	if (url.pathname.startsWith('/api/')) return;

	// Different-origin requests (Vercel Blob downloads, Pyodide CDN, etc) —
	// let the browser handle. We don't want to cache 50MB Pyodide locally
	// unless explicitly designed to.
	if (url.origin !== sw.location.origin) return;

	// Cache-first for immutable hashed assets in /build/ or /files/
	const isImmutable = build.includes(url.pathname) || files.includes(url.pathname);

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE_NAME);

			if (isImmutable) {
				const hit = await cache.match(req);
				if (hit) return hit;
				const res = await fetch(req);
				if (res.ok) cache.put(req, res.clone());
				return res;
			}

			// Network-first for HTML routes + dynamic pages. Update the
			// cache on success; fall back to cache on offline.
			try {
				const res = await fetch(req);
				if (res.ok) cache.put(req, res.clone());
				return res;
			} catch {
				const hit = await cache.match(req);
				if (hit) return hit;
				// Last-resort fallback: try the home page from cache so
				// users at least see something instead of the browser's
				// "no internet" page.
				return (await cache.match('/')) ?? Response.error();
			}
		})()
	);
});
