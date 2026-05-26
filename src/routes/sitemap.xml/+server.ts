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

const ROUTES: Array<{ path: string; changefreq: string; priority: number }> = [
	{ path: '/', changefreq: 'weekly', priority: 1.0 },
	{ path: '/audit', changefreq: 'monthly', priority: 0.9 },
	{ path: '/learn', changefreq: 'monthly', priority: 0.8 },
	{ path: '/learn/first-font', changefreq: 'monthly', priority: 0.8 },
	{ path: '/learn/kerning', changefreq: 'monthly', priority: 0.8 },
	{ path: '/learn/variable-fonts', changefreq: 'monthly', priority: 0.8 },
	{ path: '/learn/opentype-features', changefreq: 'monthly', priority: 0.8 },
	{ path: '/learn/multi-script', changefreq: 'monthly', priority: 0.7 },
	{ path: '/learn/export-formats', changefreq: 'monthly', priority: 0.7 },
	{ path: '/learn/audit-codes', changefreq: 'monthly', priority: 0.7 },
	{ path: '/families', changefreq: 'monthly', priority: 0.5 },
	{ path: '/help', changefreq: 'monthly', priority: 0.7 },
	{ path: '/compare', changefreq: 'monthly', priority: 0.7 },
	{ path: '/changelog', changefreq: 'weekly', priority: 0.6 },
	{ path: '/changelog/rss.xml', changefreq: 'weekly', priority: 0.3 },
	{ path: '/llms.txt', changefreq: 'monthly', priority: 0.3 },
	{ path: '/llms-full.txt', changefreq: 'monthly', priority: 0.3 },
	{ path: '/about', changefreq: 'yearly', priority: 0.4 },
	{ path: '/press', changefreq: 'monthly', priority: 0.5 },
	{ path: '/privacy', changefreq: 'yearly', priority: 0.3 },
	{ path: '/security', changefreq: 'yearly', priority: 0.3 },
	{ path: '/project/demo/edit', changefreq: 'monthly', priority: 0.9 },
	{ path: '/share/demo', changefreq: 'monthly', priority: 0.9 }
];

export const GET: RequestHandler = ({ setHeaders }) => {
	const lastmod = new Date().toISOString().split('T')[0];
	const urls = ROUTES.map(
		(r) => `	<url>
		<loc>${BASE}${r.path}</loc>
		<lastmod>${lastmod}</lastmod>
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
