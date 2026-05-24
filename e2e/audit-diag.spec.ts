import { test, expect, type Page } from '@playwright/test';

const seed = async (page: Page) => {
	await page.goto('/');
	const strip = page.getByRole('region', { name: /Welcome to Font Studio/i });
	if (
		await strip
			.waitFor({ state: 'visible', timeout: 2000 })
			.then(() => true)
			.catch(() => false)
	) {
		await page.getByRole('button', { name: 'Dismiss welcome' }).click();
		await strip.waitFor({ state: 'hidden' });
	}
	await page.getByRole('button', { name: /Open the example project/i }).first().click();
	await page.waitForURL(/\/project\/[^/]+\/edit$/);
	return new URL(page.url()).pathname.split('/')[2];
};

const tap = async (page: Page, label: RegExp) =>
	page.getByRole('link', { name: label }).first().click();

const SEQS: Array<{ name: string; chain: RegExp[] }> = [
	{ name: 'edit → audit', chain: [/^Audit/] },
	{ name: 'edit → compare → audit', chain: [/^Compare/, /^Audit/] },
	{
		name: 'edit → brief → spacing → audit',
		chain: [/^Brief/, /^Spacing/, /^Audit/]
	},
	{
		name: 'edit → preview → specimen → compare → audit',
		chain: [/^Preview/, /^Specimen/, /^Compare/, /^Audit/]
	}
];

test.describe.configure({ mode: 'serial' });

for (const seq of SEQS) {
	test(`audit mounts after sequence: ${seq.name}`, async ({ page }) => {
		const errors: string[] = [];
		page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}\n${e.stack}`));
		page.on('console', async (m) => {
			if (m.type() !== 'error' && m.type() !== 'warning') return;
			const args = await Promise.all(m.args().map((a) => a.jsonValue().catch(() => null)));
			errors.push(`[${m.type()}] ${m.text()}\nARGS: ${JSON.stringify(args)}`);
		});

		const id = await seed(page);
		for (const re of seq.chain) {
			await tap(page, re);
			await page.waitForLoadState('networkidle');
		}
		await expect(page).toHaveURL(`/project/${id}/audit`);
		const visible = await page
			.getByRole('heading', { name: 'Audit', level: 1 })
			.isVisible()
			.catch(() => false);
		if (!visible) {
			console.log(`---FAIL: ${seq.name}---`);
			const html = await page.locator('main').first().innerHTML();
			console.log('main starts with:', html.slice(0, 200));
			console.log('errors:', errors.length ? errors.join('\n') : '(none)');
		}
		await expect(page.getByRole('heading', { name: 'Audit', level: 1 })).toBeVisible({
			timeout: 5000
		});
	});
}
