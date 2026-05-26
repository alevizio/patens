import { describe, it, expect } from 'vitest';
import { cachesToEvict, routeFetch } from './upgrade';

describe('cachesToEvict — service worker upgrade path', () => {
	const PREFIX = 'font-studio-';
	const CURRENT = 'font-studio-1.5.2-abc123';

	it('evicts an older Patens cache from a previous deploy', () => {
		const keys = ['font-studio-1.4.0-def456', CURRENT];
		expect(cachesToEvict(keys, CURRENT, PREFIX)).toEqual(['font-studio-1.4.0-def456']);
	});

	it('evicts multiple older caches when several deploys have stacked up', () => {
		const keys = [
			'font-studio-1.3.0-aaa',
			'font-studio-1.4.0-bbb',
			'font-studio-1.5.0-ccc',
			CURRENT
		];
		expect(cachesToEvict(keys, CURRENT, PREFIX).sort()).toEqual([
			'font-studio-1.3.0-aaa',
			'font-studio-1.4.0-bbb',
			'font-studio-1.5.0-ccc'
		]);
	});

	it('never evicts the current cache', () => {
		const keys = [CURRENT];
		expect(cachesToEvict(keys, CURRENT, PREFIX)).toEqual([]);
	});

	it("leaves non-Patens caches alone (someone else's app on the same origin)", () => {
		const keys = ['some-other-app-cache-v1', 'workbox-precache-v2', CURRENT, 'font-studio-1.4.0-old'];
		expect(cachesToEvict(keys, CURRENT, PREFIX)).toEqual(['font-studio-1.4.0-old']);
	});

	it('is a no-op when only foreign caches exist (e.g. fresh-install browser)', () => {
		const keys = ['workbox-precache-v2'];
		expect(cachesToEvict(keys, CURRENT, PREFIX)).toEqual([]);
	});

	it('handles the empty cache list', () => {
		expect(cachesToEvict([], CURRENT, PREFIX)).toEqual([]);
	});

	// The brand-rename gotcha: storage identifiers stay `font-studio-*` for
	// backward compat (users with an existing IDB shouldn't lose their work).
	// A future rename to `patens-*` would orphan every legacy cache. Lock in
	// the convention via this regression test.
	it('uses the `font-studio-` prefix (legacy namespace, never rename)', () => {
		const keys = ['font-studio-old', 'patens-old'];
		expect(cachesToEvict(keys, CURRENT, PREFIX)).toEqual(['font-studio-old']);
		expect(cachesToEvict(keys, CURRENT, PREFIX)).not.toContain('patens-old');
	});
});

describe('routeFetch — request routing', () => {
	const ORIGIN = 'https://patens.design';
	const IMMUTABLE = new Set([
		'/_app/immutable/entry/start.abc.mjs',
		'/_app/immutable/chunks/foo.mjs',
		'/favicon.svg'
	]);

	it('routes immutable build assets cache-first', () => {
		expect(
			routeFetch('GET', new URL(`${ORIGIN}/_app/immutable/entry/start.abc.mjs`), ORIGIN, IMMUTABLE)
		).toBe('cache-first');
	});

	it('routes the home page (HTML) network-first', () => {
		expect(routeFetch('GET', new URL(`${ORIGIN}/`), ORIGIN, IMMUTABLE)).toBe('network-first');
	});

	it('routes /learn/* network-first', () => {
		expect(routeFetch('GET', new URL(`${ORIGIN}/learn/kerning`), ORIGIN, IMMUTABLE)).toBe(
			'network-first'
		);
	});

	it('passes through cross-origin requests (Vercel Blob, Pyodide CDN)', () => {
		expect(
			routeFetch('GET', new URL('https://blob.vercel-storage.com/shares/abc.json'), ORIGIN, IMMUTABLE)
		).toBe('passthrough');
	});

	it('passes through /api/* requests (IDB + Blob are source of truth)', () => {
		expect(routeFetch('GET', new URL(`${ORIGIN}/api/share/demo`), ORIGIN, IMMUTABLE)).toBe(
			'passthrough'
		);
	});

	it('passes through non-GET methods', () => {
		expect(routeFetch('POST', new URL(`${ORIGIN}/api/share`), ORIGIN, IMMUTABLE)).toBe(
			'passthrough'
		);
		expect(routeFetch('DELETE', new URL(`${ORIGIN}/api/share/abc`), ORIGIN, IMMUTABLE)).toBe(
			'passthrough'
		);
	});

	it('falls back to network-first for assets the SW doesn\'t recognise (defensive)', () => {
		// An asset the SW doesn't know about (e.g. a chunk renamed in a deploy
		// the SW was installed before) should still be fetched — never silently
		// passthrough, which would skip the cache update.
		expect(
			routeFetch('GET', new URL(`${ORIGIN}/_app/immutable/chunks/new-after-deploy.mjs`), ORIGIN, IMMUTABLE)
		).toBe('network-first');
	});
});

// Integration scenario — narrative test that mirrors the real upgrade
// flow. Not parameterised because the value is in the named steps.
describe('SW upgrade scenario: v1.4.0 user visits the v1.5.2 site', () => {
	it('evicts the v1.4.0 cache and resolves v1.5.2 chunks via the new policy', () => {
		const PREFIX = 'font-studio-';
		const OLD = 'font-studio-1.4.0-v4hash';
		const NEW = 'font-studio-1.5.2-v5hash';
		const NEW_IMMUTABLE = new Set([
			'/_app/immutable/entry/start.NEWHASH.mjs',
			'/_app/immutable/chunks/Bp.mjs'
		]);

		// 1. Before the activate, both caches exist.
		const cachesBefore = [OLD, NEW];

		// 2. activate evicts OLD.
		const evicted = cachesToEvict(cachesBefore, NEW, PREFIX);
		expect(evicted).toEqual([OLD]);

		// 3. Subsequent fetches for new immutable assets route cache-first.
		expect(
			routeFetch(
				'GET',
				new URL('https://patens.design/_app/immutable/entry/start.NEWHASH.mjs'),
				'https://patens.design',
				NEW_IMMUTABLE
			)
		).toBe('cache-first');

		// 4. Fetches for stale OLD assets (still referenced by an open tab)
		//    route network-first so the browser tries to re-resolve them.
		//    A 404 here is recoverable on next reload.
		expect(
			routeFetch(
				'GET',
				new URL('https://patens.design/_app/immutable/entry/start.OLDHASH.mjs'),
				'https://patens.design',
				NEW_IMMUTABLE
			)
		).toBe('network-first');
	});
});
