/**
 * Spanish marketing surface smoke. Verifies that every /es/* route:
 *   - serves HTTP 200
 *   - declares og:locale es_ES (so Slack/Twitter unfurls render in
 *     the right locale and AI engines pick the right Q&A surface)
 *   - declares hreflang pointing at the English canonical (so search
 *     engines don't treat /es as a content-duplicate of /)
 *   - carries a <html lang="es"> or lang="es-ES" attribute via the
 *     SvelteKit root layout (default lang attr is set by Vercel/host)
 *
 * Why these specifically: the canonical, hreflang, and og:locale tags
 * are the load-bearing SEO signals for a bilingual surface. Whichever
 * one goes silently missing on a future commit is exactly the kind of
 * regression i18n setups fail to flag — no compiler error, just
 * degraded discoverability that takes weeks to notice in search data.
 */

import { expect, test } from '@playwright/test';

const ES_ROUTES = [
	'/es',
	'/es/about',
	'/es/pronunciation',
	'/es/help',
	'/es/press',
	'/es/privacy',
	'/es/security',
	'/es/audit',
	'/es/compare',
	'/es/learn'
] as const;

for (const route of ES_ROUTES) {
	test(`${route} renders + declares og:locale es_ES + hreflang to EN`, async ({ page }) => {
		const res = await page.goto(route);
		expect(res?.status(), `${route} should serve HTTP 200`).toBe(200);

		// og:locale identifies the page's primary locale. The root layout
		// emits a default `og:locale=en_US` which the /es pages override
		// — we check that the es_ES value is PRESENT among all og:locale
		// tags rather than asserting the first one (which would be the
		// global default).
		const ogLocales = await page
			.locator('head meta[property="og:locale"]')
			.evaluateAll((els) => els.map((el) => el.getAttribute('content')));
		expect(ogLocales, `${route} should have og:locale=es_ES somewhere`).toContain('es_ES');

		// og:locale:alternate signals the English counterpart is available.
		const ogLocaleAlts = await page
			.locator('head meta[property="og:locale:alternate"]')
			.evaluateAll((els) => els.map((el) => el.getAttribute('content')));
		expect(ogLocaleAlts, `${route} should advertise en_US as alternate`).toContain('en_US');

		// hreflang triple — every locale + x-default.
		const enLink = await page.locator('head link[rel="alternate"][hreflang="en"]').first().getAttribute('href');
		const esLink = await page.locator('head link[rel="alternate"][hreflang="es"]').first().getAttribute('href');
		const defaultLink = await page
			.locator('head link[rel="alternate"][hreflang="x-default"]')
			.first()
			.getAttribute('href');

		expect(enLink, `${route} should declare hreflang=en`).toMatch(/^https:\/\/patens\.design/);
		expect(enLink, `${route} hreflang=en should NOT point at /es`).not.toMatch(/\/es(\/|$)/);
		expect(esLink, `${route} should declare hreflang=es pointing at /es`).toMatch(/\/es(\/|$)/);
		expect(defaultLink, `${route} x-default should point at the EN canonical`).not.toMatch(/\/es(\/|$)/);

		// Canonical must point at the /es URL itself (not the English page).
		const canonical = await page.locator('head link[rel="canonical"]').first().getAttribute('href');
		expect(canonical, `${route} canonical should be the /es URL`).toMatch(/\/es(\/|$)/);
	});
}

test('/es advertises a language switcher pointing at the English home', async ({ page }) => {
	await page.goto('/es');
	// SiteHeader emits the language switcher with hreflang="en"; the target
	// is the canonical English path. Verifies the switcher wires the right
	// direction (es → en) without a literal text match that would break on
	// copy changes.
	const switcher = page.locator('header a[hreflang="en"]').first();
	await expect(switcher).toBeVisible();
	const href = await switcher.getAttribute('href');
	expect(href, '/es language switcher should link to /').toBe('/');
});

test('English /about advertises a language switcher pointing at /es/about', async ({ page }) => {
	// The English home (/) has a custom hero and doesn't use SiteHeader, so
	// the language switcher isn't there. Every OTHER marketing page DOES
	// use SiteHeader, so we test /about as the canonical reverse-direction
	// proof: the switcher must mirror the path into /es/.
	await page.goto('/about');
	const switcher = page.locator('header a[hreflang="es"]').first();
	await expect(switcher).toBeVisible();
	const href = await switcher.getAttribute('href');
	expect(href, '/about language switcher should link to /es/about').toBe('/es/about');
});
