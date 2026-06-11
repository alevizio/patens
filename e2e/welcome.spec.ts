import { test, expect, type Page } from '@playwright/test';
import { STUDIO_HOME } from './routes';

// First-time visitor smoke test for the welcome strip.
//
// Why this exists: the historical bug was a blocking modal that stole pointer
// events on the home-page CTAs underneath. v1.0.0-beta replaced the modal
// with a non-blocking region (role="region", aria-label="Welcome to Font
// Studio") that sits at the top of the home-page content. The strip is
// dismissible via an X button; pressing it should hide the strip + leave
// the rest of the page interactive.

const setUnseen = async (page: Page) => {
	// The welcome strip opens when settings.welcomeDismissed is falsy. The
	// settings store persists to localStorage; clearing the relevant key gives
	// us the first-visit experience every test run.
	await page.goto(STUDIO_HOME);
	await page.evaluate(() => {
		try {
			const raw = localStorage.getItem('font-studio:settings:v1');
			if (raw) {
				const j = JSON.parse(raw);
				delete j.welcomeDismissed;
				localStorage.setItem('font-studio:settings:v1', JSON.stringify(j));
			}
		} catch {
			/* ignore */
		}
	});
	await page.reload();
	// With SSR on, the strip's HTML lands before hydration attaches its
	// onclick handler. Wait for the layout's onMount to flip the sentinel
	// so the subsequent .click() reaches a live listener, not raw DOM.
	await page.waitForFunction(() => document.documentElement.dataset.hydrated === 'true', undefined, {
		timeout: 5000
	});
};

test('Welcome strip appears on a fresh visit', async ({ page }) => {
	await setUnseen(page);
	await expect(page.getByRole('region', { name: /Welcome to Patens/i })).toBeVisible();
	// Strip should NOT be a modal — the home-page content underneath stays
	// reachable. Verify the example-project CTA inside the strip is visible.
	await expect(
		page.getByRole('button', { name: /Open the example project/i })
	).toBeVisible();
});

test('Welcome strip dismisses via the X button', async ({ page }) => {
	await setUnseen(page);
	await page.getByRole('button', { name: 'Dismiss welcome' }).click();
	await expect(
		page.getByRole('region', { name: /Welcome to Patens/i })
	).toBeHidden();
});

test('Once dismissed, the home-page CTAs are clickable', async ({ page }) => {
	// The original regression: a blocking modal that stole pointer events on
	// the CTAs below. With the strip-only design this would only fail if the
	// strip somehow occluded the demo CTA. Click an in-strip link AFTER
	// dismissal to verify the strip is fully gone — the link still exists
	// in another section of the home page (the "See it in action" hero).
	await setUnseen(page);
	await page.getByRole('button', { name: 'Dismiss welcome' }).click();
	await expect(
		page.getByRole('region', { name: /Welcome to Patens/i })
	).toBeHidden();
	// The home page has its own "Open the example project" button in the
	// "See it in action" section; click that to confirm navigation works.
	await page
		.getByRole('button', { name: /Open the example project/i })
		.first()
		.click();
	await expect(page).toHaveURL(/\/project\/[^/]+\/edit$/);
});

test('Welcome strip persists dismissal across reloads', async ({ page }) => {
	await setUnseen(page);
	await page.getByRole('button', { name: 'Dismiss welcome' }).click();
	await expect(
		page.getByRole('region', { name: /Welcome to Patens/i })
	).toBeHidden();
	await page.reload();
	await expect(
		page.getByRole('region', { name: /Welcome to Patens/i })
	).toBeHidden();
});
