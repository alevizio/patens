import { test, expect, type Page } from '@playwright/test';

// Regression guard for the silent mount-failure family of bugs that has bitten
// the project-tab nav twice: (1) invisible click-catcher overlays, (2) TDZ on
// $derived in /edit + /spacing that let the URL update while the route's
// component aborted mount. Both presented as "click tab, nothing happens".
//
// The assertion shape that catches both: after clicking a tab, the URL must
// change AND a piece of content unique to the destination route must appear.

type Tab =
	| { label: string; path: string; mode: 'h1'; heading: string }
	| { label: string; path: string; mode: 'aria'; aria: string };

const TABS: Tab[] = [
	{ label: 'Brief', path: '/brief', mode: 'h1', heading: 'Brief' },
	{ label: 'Edit', path: '/edit', mode: 'aria', aria: 'Pencil' },
	{ label: 'Spacing', path: '/spacing', mode: 'h1', heading: 'Spacing & kerning' },
	{ label: 'Designspace', path: '/designspace', mode: 'h1', heading: 'Designspace' },
	{ label: 'Features', path: '/features', mode: 'h1', heading: 'OpenType features' },
	{ label: 'AI', path: '/ai', mode: 'h1', heading: 'AI assistant' },
	{ label: 'Preview', path: '/preview', mode: 'h1', heading: 'Preview' },
	{ label: 'Compare', path: '/compare', mode: 'h1', heading: 'Compare' },
	{ label: 'Audit', path: '/audit', mode: 'h1', heading: 'Audit' },
	{ label: 'Release', path: '/release', mode: 'h1', heading: 'Release readiness' }
];

const openDemoProject = async (page: Page): Promise<string> => {
	await page.goto('/');
	// First-run Welcome dialog has aria-modal=fixed-inset and intercepts pointer
	// events from the page underneath; if it opened, click its X (Escape only
	// fires when focus is inside the dialog, which isn't true on cold load).
	const dialog = page.getByRole('dialog');
	if (
		await dialog
			.first()
			.waitFor({ state: 'visible', timeout: 2000 })
			.then(() => true)
			.catch(() => false)
	) {
		await dialog.getByRole('button', { name: 'Dismiss' }).click();
		await dialog.first().waitFor({ state: 'detached' });
	}
	await page.getByRole('button', { name: /Open the example project/i }).click();
	await page.waitForURL(/\/project\/[^/]+\/edit$/);
	return new URL(page.url()).pathname.split('/')[2];
};

const assertTabMounted = async (page: Page, tab: Tab) => {
	if (tab.mode === 'h1') {
		await expect(
			page.getByRole('heading', { name: tab.heading, level: 1 })
		).toBeVisible();
	} else {
		await expect(page.getByLabel(tab.aria).first()).toBeVisible();
	}
};

test('every project tab updates the URL AND mounts its content', async ({ page }) => {
	const id = await openDemoProject(page);

	for (const tab of TABS) {
		await page
			.getByRole('link', { name: new RegExp(`^${tab.label}(\\s|$|\\()`) })
			.first()
			.click();
		await expect(page).toHaveURL(`/project/${id}${tab.path}`);
		await assertTabMounted(page, tab);
		// Let SvelteKit fully settle between rapid clicks — without this, the
		// next click can race the previous route's teardown and SvelteKit ends
		// up rendering the wrong page (the symptom that has bitten this nav
		// twice before; we'd rather catch it than mask it).
		await page.waitForLoadState('networkidle');
	}
});

test('Edit ↔ Spacing round-trip mounts both routes (TDZ regression guard)', async ({
	page
}) => {
	const id = await openDemoProject(page);

	for (let i = 0; i < 3; i++) {
		await page.getByRole('link', { name: /^Spacing/ }).first().click();
		await expect(page).toHaveURL(`/project/${id}/spacing`);
		await assertTabMounted(page, TABS.find((t) => t.label === 'Spacing')!);

		await page.getByRole('link', { name: /^Edit/ }).first().click();
		await expect(page).toHaveURL(`/project/${id}/edit`);
		await assertTabMounted(page, TABS.find((t) => t.label === 'Edit')!);
	}
});
