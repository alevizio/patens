/**
 * GET /changelog/rss.xml — RSS 2.0 feed of every released version.
 *
 * Parses the same CHANGELOG.md the /changelog page reads from. Each
 * "## [X.Y.Z] — YYYY-MM-DD" heading becomes one <item>; the body of
 * each section becomes its <description>.
 *
 * Prerendered at build time so the feed is a static file served from
 * the edge — readers polling daily don't hit the SvelteKit handler.
 */

import type { RequestHandler } from './$types';
import changelogSource from '../../../../CHANGELOG.md?raw';
import { parseReleases } from './parse';

export const prerender = true;

const BASE = 'https://patens.design';

const escapeXml = (s: string): string =>
	s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');

export const GET: RequestHandler = ({ setHeaders }) => {
	const releases = parseReleases(changelogSource);
	const items = releases
		.map((r) => {
			const link = `${BASE}/changelog#${r.anchor}`;
			// RFC 822 date — the standard RSS 2.0 expects this format.
			// Parsing YYYY-MM-DD as a UTC date avoids the local-timezone
			// shift that new Date('2026-05-24') would otherwise produce
			// in some runtimes.
			const pubDate = new Date(`${r.date}T00:00:00Z`).toUTCString();
			return `		<item>
			<title>v${escapeXml(r.version)}</title>
			<link>${link}</link>
			<guid isPermaLink="true">${link}</guid>
			<pubDate>${pubDate}</pubDate>
			<description>${escapeXml(r.body)}</description>
		</item>`;
		})
		.join('\n');

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
	<channel>
		<title>Patens · Changelog</title>
		<link>${BASE}/changelog</link>
		<atom:link href="${BASE}/changelog/rss.xml" rel="self" type="application/rss+xml" />
		<description>Release notes for Patens — browser-native, open-source type design.</description>
		<language>en</language>
${items}
	</channel>
</rss>
`;

	setHeaders({
		'content-type': 'application/rss+xml; charset=utf-8',
		// Static file via prerender — cache aggressively at edge. Feed
		// readers commonly poll daily; 1h s-maxage matches that cadence
		// without making the file stale when a release lands.
		'cache-control': 'public, max-age=3600, s-maxage=3600'
	});
	return new Response(xml, { status: 200 });
};
