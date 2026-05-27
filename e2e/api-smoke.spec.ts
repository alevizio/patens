/**
 * API smoke tests — covers the non-page surfaces shipped in v1.5.x:
 *   - /health reports the right service + version
 *   - /sitemap.xml + /changelog/rss.xml render valid XML with the canonical BASE
 *   - /og/brand + /og/demo + /og/home render real PNGs
 *   - /manifest.json has the right PWA shape
 *   - /api/share returns 503 when cloud isn't configured (the default in CI)
 *   - /api/share/[id] returns 404 / 503 paths
 *   - /auth/* routes return 503 when OAuth env vars aren't set (CI default)
 *
 * These run against the dev server. They catch the kinds of bug that
 * docs/qa-checklist.md exists to catch — but here they fail CI instead of
 * waiting for a human curl session post-deploy.
 */

import { test, expect } from '@playwright/test';

test('/health returns service: "patens" + a version', async ({ request }) => {
	const res = await request.get('/health');
	expect(res.status()).toBe(200);
	expect(res.headers()['content-type']).toContain('application/json');
	expect(res.headers()['x-content-type-options']).toBe('nosniff');
	expect(res.headers()['x-frame-options']).toBe('DENY');
	expect(res.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
	expect(res.headers()['permissions-policy']).toContain('camera=()');
	const body = (await res.json()) as {
		status: string;
		service: string;
		version: string;
		commit: string;
		ref: string;
	};
	expect(body.status).toBe('ok');
	expect(body.service).toBe('patens');
	expect(body.version).toMatch(/^\d+\.\d+\.\d+/);
});

test('/sitemap.xml renders valid XML with patens.design BASE', async ({ request }) => {
	const res = await request.get('/sitemap.xml');
	expect(res.status()).toBe(200);
	expect(res.headers()['content-type']).toContain('xml');
	const body = await res.text();
	expect(body).toContain('<?xml version="1.0"');
	expect(body).toContain('<urlset');
	// Canonical BASE — guards against regressing back to font-studio.vercel.app
	expect(body).toContain('https://patens.design/');
	expect(body).not.toContain('font-studio.vercel.app');
	// At least the core URLs we added through the project
	const urls = ['/', '/help', '/changelog', '/about'];
	for (const u of urls) expect(body).toContain(`https://patens.design${u}`);
});

test('/changelog/rss.xml renders valid RSS 2.0 with ≥1 item', async ({ request }) => {
	const res = await request.get('/changelog/rss.xml');
	expect(res.status()).toBe(200);
	expect(res.headers()['content-type']).toContain('xml');
	const body = await res.text();
	expect(body).toContain('<?xml version="1.0"');
	expect(body).toContain('<rss version="2.0"');
	expect(body).toContain('<channel>');
	// Title rebranded to Patens — guards regression
	expect(body).toContain('<title>Patens · Changelog</title>');
	expect(body).toContain('<atom:link href="https://patens.design/changelog/rss.xml"');
	// At least one <item> — the changelog is non-empty
	expect(body.match(/<item>/g)?.length ?? 0).toBeGreaterThanOrEqual(1);
});

const ogVariants = ['brand', 'demo', 'home'];
for (const variant of ogVariants) {
	test(`/og/${variant} returns a real PNG (≥5KB)`, async ({ request }) => {
		const res = await request.get(`/og/${variant}`);
		expect(res.status()).toBe(200);
		expect(res.headers()['content-type']).toBe('image/png');
		const body = await res.body();
		// Real OG cards rendered by satori+resvg-js are ~25-40KB.
		// <5KB suggests either a JSON error body or a broken render.
		expect(body.length).toBeGreaterThan(5000);
		// PNG signature check — first 8 bytes are the PNG magic number
		expect(body[0]).toBe(0x89);
		expect(body[1]).toBe(0x50); // P
		expect(body[2]).toBe(0x4e); // N
		expect(body[3]).toBe(0x47); // G
	});
}

test('/manifest.json has the correct PWA shape', async ({ request }) => {
	const res = await request.get('/manifest.json');
	expect(res.status()).toBe(200);
	const manifest = (await res.json()) as {
		name: string;
		short_name: string;
		start_url: string;
		display: string;
		icons: Array<{ src: string; sizes: string }>;
	};
	// `name` ships the long-form for richer install-prompt context;
	// `short_name` stays compact for icon-grid contexts.
	expect(manifest.name).toMatch(/^Patens/);
	expect(manifest.name).toContain('teaches as you draw');
	expect(manifest.short_name).toBe('Patens');
	expect(manifest.start_url).toBe('/');
	expect(manifest.display).toBe('standalone');
	expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
	// Sizes must include 192 + 512 for Android install criteria
	const sizes = manifest.icons.map((i) => i.sizes);
	expect(sizes.some((s) => s.includes('192'))).toBe(true);
	expect(sizes.some((s) => s.includes('512'))).toBe(true);
});

test('/api/share returns 503 when BLOB_READ_WRITE_TOKEN is unset (CI default)', async ({
	request
}) => {
	const res = await request.post('/api/share', {
		data: { id: 'test-project-12345', metadata: { familyName: 'Test' } }
	});
	// 503 = cloud not configured; the share button gracefully falls back
	// to a local-only URL with a clear warning.
	expect(res.status()).toBe(503);
});

test('/api/share/[id] GET returns 404 when cloud is unconfigured', async ({ request }) => {
	const res = await request.get('/api/share/nonexistent-share-id-12345');
	// 404 (not 503) is intentional here so the share-page loader
	// surfaces the "Project not found" recovery copy instead of an error.
	expect(res.status()).toBe(404);
});

test('/api/share/[id] DELETE returns 503 when cloud is unconfigured', async ({ request }) => {
	const res = await request.delete('/api/share/nonexistent-share-id-12345', {
		headers: { 'X-Share-Token': 'fake-token' }
	});
	// DELETE returns 503 (the cloud-required check fires before token validation)
	expect(res.status()).toBe(503);
});

test('/api/share/[id]/versions GET returns 404 when cloud is unconfigured', async ({
	request
}) => {
	const res = await request.get('/api/share/nonexistent-share-id-12345/versions');
	// 404 (matching GET /api/share/[id]) so the share-page version-history UI
	// gracefully renders "no history" rather than a configuration warning.
	expect(res.status()).toBe(404);
});

test('/api/ai/messages rejects unsupported models before upstream call', async ({ request }) => {
	const res = await request.post('/api/ai/messages', {
		data: {
			apiKey: 'sk-ant-test',
			model: 'claude-unbounded-future-model',
			max_tokens: 32,
			messages: [{ role: 'user', content: 'Hello' }]
		}
	});
	expect(res.status()).toBe(400);
	expect(await res.json()).toEqual({ error: 'Unsupported Anthropic model' });
});

test('/api/ai/messages rejects oversize max_tokens before upstream call', async ({ request }) => {
	const res = await request.post('/api/ai/messages', {
		data: {
			apiKey: 'sk-ant-test',
			model: 'claude-sonnet-4-6',
			max_tokens: 100_000,
			messages: [{ role: 'user', content: 'Hello' }]
		}
	});
	expect(res.status()).toBe(400);
	expect(await res.json()).toEqual({ error: 'max_tokens must be an integer from 1-4096' });
});

test('/api/share/[id]?v=abc returns 400 for non-numeric version', async ({ request }) => {
	const res = await request.get('/api/share/some-share-id-12345?v=abc');
	// Version validation runs before the cloud-config check so the
	// error fires deterministically regardless of deploy state.
	expect(res.status()).toBe(400);
});

test('/auth/login returns 503 when OAuth env vars are unset (CI default)', async ({ request }) => {
	const res = await request.get('/auth/login', { maxRedirects: 0 });
	expect(res.status()).toBe(503);
});

test('/auth/callback/github returns 503 when OAuth env vars are unset', async ({ request }) => {
	const res = await request.get('/auth/callback/github?code=fake&state=fake', {
		maxRedirects: 0
	});
	expect(res.status()).toBe(503);
});
