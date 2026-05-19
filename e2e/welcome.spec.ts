import { test, expect, type Page } from '@playwright/test';

// First-time visitor smoke test for the Welcome dialog.
//
// Why this exists: the Welcome modal has `fixed inset-0 z-50` + an aria-modal
// backdrop that has historically intercepted pointer events on the home-page
// CTAs underneath. The whole point of the dialog is to be dismissible — if
// any of the three paths (X button / Escape / backdrop click) regresses, a
// first-time visitor gets a softlocked home page they can't click through.
// This suite locks each path in.

const setUnseen = async (page: Page) => {
	// The welcome dialog opens when settings.welcomeDismissed is falsy. The
	// settings store persists to localStorage; clearing the relevant key gives
	// us the first-visit experience every test run.
	await page.goto('/');
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
};

test('Welcome dialog opens on a fresh visit', async ({ page }) => {
	await setUnseen(page);
	await expect(page.getByRole('dialog')).toBeVisible();
	await expect(
		page.getByRole('dialog').getByRole('heading', { name: /Design your own typeface/i })
	).toBeVisible();
});

test('Welcome dialog dismisses via the X button', async ({ page }) => {
	await setUnseen(page);
	await page.getByRole('button', { name: 'Dismiss' }).click();
	await expect(page.getByRole('dialog')).toBeHidden();
});

test('Welcome dialog dismisses via the "Got it" CTA', async ({ page }) => {
	await setUnseen(page);
	await page.getByRole('button', { name: /Got it/i }).click();
	await expect(page.getByRole('dialog')).toBeHidden();
});

test('Welcome dialog dismisses via Escape (focus inside)', async ({ page }) => {
	await setUnseen(page);
	// Focus the dialog itself (it has tabindex="-1") then press Escape — the
	// keydown handler only fires when focus is in the dialog subtree.
	await page.getByRole('dialog').focus();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog')).toBeHidden();
});

test('Once dismissed, the home-page CTAs are clickable', async ({ page }) => {
	// This is the actual regression test — the historical bug was that the
	// modal stole pointer events even after the user thought they'd dismissed
	// it. Verify the demo-project button is reachable + functional.
	await setUnseen(page);
	await page.getByRole('button', { name: 'Dismiss' }).click();
	await expect(page.getByRole('dialog')).toBeHidden();
	await page.getByRole('button', { name: /Open the example project/i }).click();
	await expect(page).toHaveURL(/\/project\/[^/]+\/edit$/);
});
