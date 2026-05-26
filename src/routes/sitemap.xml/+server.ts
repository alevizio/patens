/**
 * GET /sitemap.xml — public route map for search engines.
 *
 * Lists every public, indexable URL with its last-modified date.
 * Per-project share URLs aren't enumerated (we don't list cloud-
 * uploaded projects; they're discovery-via-link by design) — only
 * the demo's share URL is included so Google has a concrete
 * "specimen view" example to crawl.
 */

import type { RequestHandler } from './$types';

const BASE = 'https://patens.design';

// Per-route lastmod. Bump the route-specific date when you make a
// substantive content change to that route (new section, copy
// rewrite, new feature surface). Cosmetic changes (typo fix, single-
// word tweak) don't need a bump — crawlers learn to distrust a site
// that claims "everything changed" every day, so honesty matters.
// Format: 'YYYY-MM-DD'.
const ROUTES: Array<{
	path: string;
	changefreq: string;
	priority: number;
	lastmod: string;
}> = [
	{ path: '/', changefreq: 'weekly', priority: 1.0, lastmod: '2026-05-26' },
	{ path: '/audit', changefreq: 'monthly', priority: 0.9, lastmod: '2026-05-26' },
	{ path: '/learn', changefreq: 'monthly', priority: 0.8, lastmod: '2026-05-26' },
	{ path: '/learn/first-font', changefreq: 'monthly', priority: 0.8, lastmod: '2026-05-25' },
	{ path: '/learn/kerning', changefreq: 'monthly', priority: 0.8, lastmod: '2026-05-25' },
	{ path: '/learn/variable-fonts', changefreq: 'monthly', priority: 0.8, lastmod: '2026-05-25' },
	{ path: '/learn/opentype-features', changefreq: 'monthly', priority: 0.8, lastmod: '2026-05-25' },
	{ path: '/learn/multi-script', changefreq: 'monthly', priority: 0.7, lastmod: '2026-05-25' },
	{ path: '/learn/export-formats', changefreq: 'monthly', priority: 0.7, lastmod: '2026-05-25' },
	{ path: '/learn/audit-codes', changefreq: 'monthly', priority: 0.7, lastmod: '2026-05-26' },
	{ path: '/families', changefreq: 'monthly', priority: 0.5, lastmod: '2026-05-25' },
	{ path: '/help', changefreq: 'monthly', priority: 0.7, lastmod: '2026-05-26' },
	{ path: '/compare', changefreq: 'monthly', priority: 0.7, lastmod: '2026-05-26' },
	{ path: '/changelog', changefreq: 'weekly', priority: 0.6, lastmod: '2026-05-26' },
	{ path: '/changelog/rss.xml', changefreq: 'weekly', priority: 0.3, lastmod: '2026-05-26' },
	{ path: '/llms.txt', changefreq: 'monthly', priority: 0.3, lastmod: '2026-05-26' },
	{ path: '/llms-full.txt', changefreq: 'monthly', priority: 0.3, lastmod: '2026-05-26' },
	{ path: '/about', changefreq: 'yearly', priority: 0.4, lastmod: '2026-05-26' },
	{ path: '/press', changefreq: 'monthly', priority: 0.5, lastmod: '2026-05-26' },
	{ path: '/privacy', changefreq: 'yearly', priority: 0.3, lastmod: '2026-05-26' },
	{ path: '/security', changefreq: 'yearly', priority: 0.3, lastmod: '2026-05-26' },
	{ path: '/project/demo/edit', changefreq: 'monthly', priority: 0.9, lastmod: '2026-05-26' },
	{ path: '/share/demo', changefreq: 'monthly', priority: 0.9, lastmod: '2026-05-26' }
];

export const GET: RequestHandler = ({ setHeaders }) => {
	const urls = ROUTES.map(
		(r) => `	<url>
		<loc>${BASE}${r.path}</loc>
		<lastmod>${r.lastmod}</lastmod>
		<changefreq>${r.changefreq}</changefreq>
		<priority>${r.priority}</priority>
	</url>`
	).join('\n');
	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
	setHeaders({
		'content-type': 'application/xml',
		'cache-control': 'public, max-age=3600, s-maxage=3600'
	});
	return new Response(xml, { status: 200 });
};
