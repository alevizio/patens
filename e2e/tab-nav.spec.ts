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
	// Welcome is a non-blocking region in v1.0.0-beta. Dismiss it if present
	// so the strip isn't visible during the rest of the test.
	const strip = page.getByRole('region', { name: /Welcome to Patens/i });
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
	await openDemoProject(page);

	for (const tab of TABS) {
		// Wait for the previous nav to fully settle BEFORE clicking the
		// next tab. SvelteKit's CSR has a window where a click during
		// route-load can be silently dropped — we'd rather take the time
		// hit than catch a flake.
		await page.waitForLoadState('networkidle');
		await page
			.getByRole('link', { name: new RegExp(`^${tab.label}(\\s|$|\\()`) })
			.first()
			.click();
		// waitForURL (not toHaveURL) so we get a single clear error when the
		// nav doesn't take, instead of toHaveURL's poll timing out at 5s with
		// a less-clear message.
		await page.waitForURL(`**${tab.path}`);
		await assertTabMounted(page, tab);
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
