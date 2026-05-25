#!/usr/bin/env node
/**
 * IndexNow ping — submit current Patens URLs to Bing + Yandex (and any
 * other IndexNow-compatible engine that mirrors the request).
 *
 * Bing-backed surfaces include ChatGPT browse and Microsoft Copilot, so
 * IndexNow is the fastest way to get a new page (e.g. /compare) into
 * the answer-engine pipeline.
 *
 * Run: node scripts/indexnow.mjs
 *
 * Quiet by design — prints status code per engine. Failure modes (key
 * file unreachable, malformed JSON) surface as non-200 returns.
 */

const HOST = 'patens.design';
const KEY = '0a6a8b35a05a484875e37a2b63e1644a';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

const URLS = [
	'https://patens.design/',
	'https://patens.design/about',
	'https://patens.design/help',
	'https://patens.design/compare',
	'https://patens.design/changelog',
	'https://patens.design/learn',
	'https://patens.design/llms.txt',
	'https://patens.design/sitemap.xml',
	'https://patens.design/project/demo/edit',
	'https://patens.design/share/demo'
];

const ENGINES = [
	{ name: 'IndexNow (multi)', endpoint: 'https://api.indexnow.org/IndexNow' },
	{ name: 'Bing', endpoint: 'https://www.bing.com/IndexNow' },
	{ name: 'Yandex', endpoint: 'https://yandex.com/indexnow' }
];

const body = JSON.stringify({
	host: HOST,
	key: KEY,
	keyLocation: KEY_LOCATION,
	urlList: URLS
});

console.log(`Submitting ${URLS.length} URLs from ${HOST}…`);

for (const engine of ENGINES) {
	try {
		const res = await fetch(engine.endpoint, {
			method: 'POST',
			headers: { 'content-type': 'application/json; charset=utf-8' },
			body
		});
		const text = res.status === 204 || res.status === 202 ? '' : await res.text();
		console.log(`  ${engine.name.padEnd(20)} ${res.status} ${text.slice(0, 60)}`);
	} catch (err) {
		console.log(`  ${engine.name.padEnd(20)} ERROR ${err.message}`);
	}
}
