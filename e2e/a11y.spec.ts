import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Accessibility smoke tests via axe-core. We check WCAG 2.1 AA on the public
// surfaces (home, learn, families) + the in-app surfaces (edit, audit). These
// only catch automatable violations — keyboard navigation, focus order, and
// screen-reader experience still need manual review — but axe catches enough
// (missing aria-labels, contrast issues, invalid ARIA, button-name absence)
// to be worth running on every push.
//
// Severity policy:
//   - critical + serious impact → FAIL the test (regression)
//   - moderate / minor → log only
//
// The pill-token migration (introducing --color-accent-strong etc. for use on
// tinted bgs) has cleared the previous serious backlog; the bar is now
// "any serious violation introduced is a regression that blocks CI."

// SSR now pre-renders the welcome strip into the HTML before hydration
// attaches its onclick handler — clicking the dismiss button pre-hydration
// is a no-op. Setting the localStorage flag before any navigation makes the
// strip never appear in the first place (SettingsStore reads it on init),
// which keeps every a11y test deterministic and stops axe from scanning the
// strip's own DOM.
test.beforeEach(async ({ context }) => {
	await context.addInitScript(() => {
		localStorage.setItem(
			'font-studio:settings:v1',
			JSON.stringify({ welcomeDismissed: true })
		);
	});
});

const dismissWelcomeIfPresent = async (page: Page) => {
	// The init script in beforeEach already sets welcomeDismissed=true, but
	// the SSR'd HTML renders the strip *before* hydration reads localStorage.
	// We just wait for hydration to remove the strip — no click needed.
	const strip = page.getByRole('region', { name: /Welcome to Patens/i });
	await strip.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {
		/* strip was never there (route doesn't show it) — fine */
	});
};

const auditPage = async (page: Page) => {
	// <svelte:head> sets document.title after hydration; axe checks it
	// synchronously, so wait for the title to be populated before scanning.
	await page.waitForFunction(() => document.title.length > 0, undefined, {
		timeout: 5000
	});
	// Tag scope: WCAG 2.0 + 2.1 + 2.2 A/AA. Filter chips in the
	// GlyphBrowser were bumped to min-h-[24px] in commit (this one) to
	// satisfy WCAG 2.5.8 target-size while keeping visual density close.
	const results = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
		.analyze();
	const critical = results.violations.filter((v) => v.impact === 'critical');
	const serious = results.violations.filter((v) => v.impact === 'serious');
	const minor = results.violations.filter(
		(v) => v.impact !== 'serious' && v.impact !== 'critical'
	);
	const blocking = [...critical, ...serious];
	if (minor.length > 0) {
		console.log(
			`[a11y minor/moderate] ${minor.length} on ${page.url()}: ` +
				minor.map((v) => `${v.id} (${v.impact})`).join(', ')
		);
	}
	if (blocking.length > 0) {
		console.log(
			`[a11y BLOCKING] ${blocking.length} serious/critical on ${page.url()}:\n` +
				blocking
					.map((v) => {
						const sampleNode = v.nodes[0];
						const sample = sampleNode
							? `\n      ${sampleNode.html.slice(0, 180)}${sampleNode.html.length > 180 ? '…' : ''}`
							: '';
						return `  - ${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} node${
							v.nodes.length === 1 ? '' : 's'
						}${sample}`;
					})
					.join('\n')
		);
	}
	expect(blocking, `serious/critical a11y violations on ${page.url()}`).toEqual([]);
};

test('home has no serious/critical a11y violations', async ({ page }) => {
	await page.goto('/');
	await dismissWelcomeIfPresent(page);
	await auditPage(page);
});

test('/learn has no serious/critical a11y violations', async ({ page }) => {
	await page.goto('/learn');
	await auditPage(page);
});

test('/families has no serious/critical a11y violations', async ({ page }) => {
	await page.goto('/families');
	await auditPage(page);
});

test('/help has no serious/critical a11y violations', async ({ page }) => {
	await page.goto('/help');
	await auditPage(page);
});

test('/changelog has no serious/critical a11y violations', async ({ page }) => {
	await page.goto('/changelog');
	await auditPage(page);
});

test('/about has no serious/critical a11y violations', async ({ page }) => {
	await page.goto('/about');
	await auditPage(page);
});

test('/compare has no serious/critical a11y violations', async ({ page }) => {
	await page.goto('/compare');
	await auditPage(page);
});

test('/learn/first-font has no serious/critical a11y violations', async ({ page }) => {
	await page.goto('/learn/first-font');
	await auditPage(page);
});

test('/learn/audit-codes has no serious/critical a11y violations', async ({ page }) => {
	await page.goto('/learn/audit-codes');
	await auditPage(page);
});

test('/learn/kerning has no serious/critical a11y violations', async ({ page }) => {
	await page.goto('/learn/kerning');
	await auditPage(page);
});

test('/learn/variable-fonts has no serious/critical a11y violations', async ({ page }) => {
	await page.goto('/learn/variable-fonts');
	await auditPage(page);
});

test('/learn/opentype-features has no serious/critical a11y violations', async ({ page }) => {
	await page.goto('/learn/opentype-features');
	await auditPage(page);
});

test('/learn/multi-script has no serious/critical a11y violations', async ({ page }) => {
	await page.goto('/learn/multi-script');
	await auditPage(page);
});

test('/learn/export-formats has no serious/critical a11y violations', async ({ page }) => {
	await page.goto('/learn/export-formats');
	await auditPage(page);
});

test('/privacy has no serious/critical a11y violations', async ({ page }) => {
	await page.goto('/privacy');
	await auditPage(page);
});

test('/security has no serious/critical a11y violations', async ({ page }) => {
	await page.goto('/security');
	await auditPage(page);
});

test('/share/demo has no serious/critical a11y violations', async ({ page }) => {
	await page.goto('/share/demo');
	await auditPage(page);
});

test('/family/[id] has no serious/critical a11y violations', async ({ page }) => {
	// /family/[id] reads from IndexedDB (font-studio-families DB, families
	// store). addInitScript would race with the page's load() function
	// (async IDB open vs sync load call), so seed via page.evaluate after
	// loading a neutral route, then navigate to the family hub.
	await page.goto('/');
	await page.evaluate(async () => {
		const FAMILY_ID = 'a11y-test-family';
		const family = {
			id: FAMILY_ID,
			name: 'Test family',
			designer: 'A11y harness',
			copyright: '© 2026',
			license: 'MIT',
			createdAt: '2026-01-01T00:00:00.000Z',
			updatedAt: '2026-01-01T00:00:00.000Z',
			kerning: [],
			classes: []
		};
		const indexEntry = {
			id: FAMILY_ID,
			name: family.name,
			updatedAt: family.updatedAt,
			siblingCount: 0
		};
		// Mirrors idb-keyval's createStore('font-studio-families', 'families').
		await new Promise<void>((resolve, reject) => {
			const open = indexedDB.open('font-studio-families', 1);
			open.onupgradeneeded = () => {
				open.result.createObjectStore('families');
			};
			open.onerror = () => reject(open.error);
			open.onsuccess = () => {
				const db = open.result;
				const tx = db.transaction('families', 'readwrite');
				const store = tx.objectStore('families');
				store.put(family, FAMILY_ID);
				store.put([indexEntry], '__family_index__');
				tx.oncomplete = () => {
					db.close();
					resolve();
				};
				tx.onerror = () => reject(tx.error);
			};
		});
	});
	await page.goto('/family/a11y-test-family');
	// Family name is an editable <input> (not a heading) — wait for value.
	await expect(page.locator('input').filter({ hasNot: page.locator('[type="checkbox"]') }).first()).toHaveValue(/Test family/i, {
		timeout: 5000
	});
	await auditPage(page);
});

test('/edit (demo project) has no serious/critical a11y violations', async ({
	page
}) => {
	await page.goto('/');
	await dismissWelcomeIfPresent(page);
	await page.getByRole('button', { name: /Open the example project/i }).first().click();
	await page.waitForURL(/\/project\/[^/]+\/edit$/);
	await auditPage(page);
});

test('/audit (demo project) has no serious/critical a11y violations', async ({
	page
}) => {
	await page.goto('/');
	await dismissWelcomeIfPresent(page);
	await page.getByRole('button', { name: /Open the example project/i }).first().click();
	await page.waitForURL(/\/project\/[^/]+\/edit$/);
	await page.getByRole('link', { name: /^Audit/ }).first().click();
	await page.waitForURL(/\/audit$/);
	await auditPage(page);
});

// Remaining in-app tabs. Each follows the same shape: open the demo, click
// the tab link, audit. Generated to ensure no surface is left unaudited.
const PROJECT_TABS = [
	{ name: 'brief', linkName: /^Brief/, urlPattern: /\/brief$/ },
	{ name: 'spacing', linkName: /^Spacing/, urlPattern: /\/spacing$/ },
	{ name: 'designspace', linkName: /^Designspace/, urlPattern: /\/designspace$/ },
	{ name: 'features', linkName: /^Features/, urlPattern: /\/features$/ },
	{ name: 'ai', linkName: /^AI/, urlPattern: /\/ai$/ },
	{ name: 'preview', linkName: /^Preview/, urlPattern: /\/preview$/ },
	{ name: 'specimen', linkName: /^Specimen/, urlPattern: /\/specimen$/ },
	{ name: 'compare', linkName: /^Compare/, urlPattern: /\/compare$/ },
	{ name: 'release', linkName: /^Release/, urlPattern: /\/release$/ },
	{ name: 'export', linkName: /^Export/, urlPattern: /\/export$/ }
] as const;

for (const tab of PROJECT_TABS) {
	test(`/${tab.name} (demo project) has no serious/critical a11y violations`, async ({
		page
	}) => {
		await page.goto('/');
		await dismissWelcomeIfPresent(page);
		await page.getByRole('button', { name: /Open the example project/i }).first().click();
		await page.waitForURL(/\/project\/[^/]+\/edit$/);
		await page.getByRole('link', { name: tab.linkName }).first().click();
		await page.waitForURL(tab.urlPattern);
		await auditPage(page);
	});
}

// Modal a11y. axe scans the open dialog DOM — catches missing focus-trap
// anchors, button-name issues, ARIA invalidity that only manifests while the
// modal is in the tree. Each test opens the modal, waits for its dialog/region
// to be visible, then runs auditPage.

test('Shortcuts dialog (open) has no serious/critical a11y violations', async ({
	page
}) => {
	await page.goto('/');
	await dismissWelcomeIfPresent(page);
	await page.keyboard.press('?');
	await page.getByRole('dialog', { name: /Keyboard shortcuts/i }).waitFor({
		state: 'visible'
	});
	await auditPage(page);
});

test('Create-font dialog (open) has no serious/critical a11y violations', async ({
	page
}) => {
	await page.goto('/');
	await dismissWelcomeIfPresent(page);
	await page.getByRole('button', { name: /Start a new font/i }).first().click();
	await page.getByRole('dialog').first().waitFor({ state: 'visible' });
	await auditPage(page);
});

test('Storage dialog (open) has no serious/critical a11y violations', async ({
	page
}) => {
	await page.goto('/');
	await dismissWelcomeIfPresent(page);
	const trigger = page.getByRole('button', { name: 'Browser storage' });
	// The storage button is conditional on navigator.storage.estimate() —
	// in headless Chromium this is generally available, but if it isn't the
	// test is meaningless rather than failing.
	const visible = await trigger
		.waitFor({ state: 'visible', timeout: 3000 })
		.then(() => true)
		.catch(() => false);
	test.skip(!visible, 'navigator.storage.estimate unavailable in this env');
	await trigger.click();
	await page.getByRole('dialog').first().waitFor({ state: 'visible' });
	await auditPage(page);
});

test('Settings dialog (open, in editor) has no serious/critical a11y violations', async ({
	page
}) => {
	await page.goto('/');
	await dismissWelcomeIfPresent(page);
	await page.getByRole('button', { name: /Open the example project/i }).first().click();
	await page.waitForURL(/\/project\/[^/]+\/edit$/);
	await page.getByRole('button', { name: 'Settings' }).click();
	await page.getByRole('dialog').first().waitFor({ state: 'visible' });
	await auditPage(page);
});

// Welcome strip while VISIBLE — opt out of the file-level beforeEach so the
// SettingsStore renders the strip and axe scans it. Catches a11y regressions
// in first-visit copy + dismiss button + the open links.
test.describe('Welcome strip while visible', () => {
	test.use({
		// Clear the storage state for this describe block so the init script
		// doesn't dismiss the strip.
		storageState: { cookies: [], origins: [] }
	});
	// Override the file-level beforeEach with one that does NOT set the
	// dismissed flag. (Playwright applies all beforeEach hooks in scope; the
	// inner one runs after the outer, but storageState above prevents the
	// outer's localStorage write from persisting between tests.)
	test.beforeEach(async ({ context }) => {
		await context.addInitScript(() => {
			localStorage.removeItem('font-studio:settings:v1');
		});
	});

	test('Welcome strip (open) has no serious/critical a11y violations', async ({
		page
	}) => {
		await page.goto('/');
		await page
			.getByRole('region', { name: /Welcome to Patens/i })
			.waitFor({ state: 'visible' });
		await auditPage(page);
	});
});
