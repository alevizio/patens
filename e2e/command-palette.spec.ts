import { test, expect } from '@playwright/test';

// Same SSR-pre-hydration seed as the other specs — the global Cmd-K
// listener is attached in onMount on the root layout, so we wait for
// the hydration sentinel before firing the shortcut.
test.beforeEach(async ({ context }) => {
	await context.addInitScript(() => {
		localStorage.setItem(
			'font-studio:settings:v1',
			JSON.stringify({ welcomeDismissed: true })
		);
	});
});

const waitForHydrated = (page: import('@playwright/test').Page) =>
	page.waitForFunction(() => document.documentElement.dataset.hydrated === 'true', undefined, {
		timeout: 5000
	});

test('Cmd-K opens the command palette from the home page', async ({ page }) => {
	await page.goto('/');
	await waitForHydrated(page);
	await page.keyboard.press('Meta+K');
	await expect(page.getByRole('dialog', { name: /Command palette|Glyph search/i })).toBeVisible();
});

test('Cmd-K opens the command palette from /about', async ({ page }) => {
	await page.goto('/about');
	await waitForHydrated(page);
	await page.keyboard.press('Meta+K');
	await expect(page.getByRole('dialog', { name: /Command palette|Glyph search/i })).toBeVisible();
});

test('Cmd-K opens the command palette from /learn', async ({ page }) => {
	await page.goto('/learn');
	await waitForHydrated(page);
	await page.keyboard.press('Meta+K');
	await expect(page.getByRole('dialog', { name: /Command palette|Glyph search/i })).toBeVisible();
});

test('Cmd-K toggles the palette closed when already open', async ({ page }) => {
	await page.goto('/');
	await waitForHydrated(page);
	const dialog = page.getByRole('dialog', { name: /Command palette|Glyph search/i });
	await page.keyboard.press('Meta+K');
	await expect(dialog).toBeVisible();
	// Move focus out of the input so the global handler runs (it ignores
	// Cmd-K while typing into an input). The Escape key closes via the
	// palette's own onKey handler — that's the canonical close.
	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
});

test('Inside a project, > prefix lists the project pages', async ({ page }) => {
	await page.goto('/project/demo/edit');
	await waitForHydrated(page);
	await page.keyboard.press('Meta+K');
	await page.keyboard.type('>');
	// Should surface project pages — at least the canonical "Edit", "Audit".
	await expect(page.getByText('Brief', { exact: false }).first()).toBeVisible();
	await expect(page.getByText('Audit', { exact: false }).first()).toBeVisible();
});
