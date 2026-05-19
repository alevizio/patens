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
//   - critical impact → FAIL the test (regression)
//   - serious impact  → log but don't fail (current backlog includes the
//     `bg-X-soft text-X` soft-pill pattern that needs a design-system
//     decision: introduce `--color-accent-strong` for use on tinted bgs,
//     then migrate all pills. Doing that piecemeal floods the log without
//     blocking CI.)
//   - moderate / minor → log only
//
// When the soft-pill backlog clears, flip the threshold to 'serious'.

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
	if (serious.length > 0) {
		console.log(
			`[a11y serious — advisory] ${serious.length} on ${page.url()}:\n` +
				serious
					.map((v) => `  - ${v.id}: ${v.help} (${v.nodes.length} nodes)`)
					.join('\n')
		);
	}
	if (minor.length > 0) {
		console.log(
			`[a11y minor/moderate] ${minor.length} on ${page.url()}: ` +
				minor.map((v) => `${v.id} (${v.impact})`).join(', ')
		);
	}
	if (critical.length > 0) {
		console.log(
			`[a11y CRITICAL] ${critical.length} on ${page.url()}:\n` +
				critical
					.map((v) => `  - ${v.id}: ${v.help} (${v.nodes.length} nodes)`)
					.join('\n')
		);
	}
	expect(critical, `critical a11y violations on ${page.url()}`).toEqual([]);
};

test('home has no critical a11y violations', async ({ page }) => {
	await page.goto('/');
	await dismissWelcomeIfPresent(page);
	await auditPage(page);
});

test('/learn has no critical a11y violations', async ({ page }) => {
	await page.goto('/learn');
	await auditPage(page);
});

test('/families has no critical a11y violations', async ({ page }) => {
	await page.goto('/families');
	await auditPage(page);
});

test('/edit (demo project) has no critical a11y violations', async ({
	page
}) => {
	await page.goto('/');
	await dismissWelcomeIfPresent(page);
	await page.getByRole('button', { name: /Open the example project/i }).click();
	await page.waitForURL(/\/project\/[^/]+\/edit$/);
	await auditPage(page);
});

test('/audit (demo project) has no critical a11y violations', async ({
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
