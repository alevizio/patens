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

const dismissWelcomeIfPresent = async (page: Page) => {
	const dialog = page.getByRole('dialog');
	if (
		await dialog
			.first()
			.waitFor({ state: 'visible', timeout: 1500 })
			.then(() => true)
			.catch(() => false)
	) {
		await dialog.getByRole('button', { name: 'Dismiss' }).click();
		await dialog.first().waitFor({ state: 'detached' });
	}
};

const auditPage = async (page: Page) => {
	// <svelte:head> sets document.title after hydration; axe checks it
	// synchronously, so wait for the title to be populated before scanning.
	await page.waitForFunction(() => document.title.length > 0, undefined, {
		timeout: 5000
	});
	const results = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa'])
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

test('/edit (demo project) has no serious/critical a11y violations', async ({
	page
}) => {
	await page.goto('/');
	await dismissWelcomeIfPresent(page);
	await page.getByRole('button', { name: /Open the example project/i }).click();
	await page.waitForURL(/\/project\/[^/]+\/edit$/);
	await auditPage(page);
});

test('/audit (demo project) has no serious/critical a11y violations', async ({
	page
}) => {
	await page.goto('/');
	await dismissWelcomeIfPresent(page);
	await page.getByRole('button', { name: /Open the example project/i }).click();
	await page.waitForURL(/\/project\/[^/]+\/edit$/);
	await page.getByRole('link', { name: /^Audit/ }).first().click();
	await page.waitForURL(/\/audit$/);
	await auditPage(page);
});
