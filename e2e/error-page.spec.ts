import { test, expect } from '@playwright/test';

test('404 renders the foundry-themed error page', async ({ page }) => {
	const res = await page.goto('/this-route-was-never-drawn');
	expect(res?.status()).toBe(404);
	await expect(page.getByRole('heading', { name: 'Not in this typeface.' })).toBeVisible();
	await expect(page.getByText('U+0404')).toBeVisible();
	await expect(page.getByRole('link', { name: /Back to the foundry/i })).toBeVisible();
});
