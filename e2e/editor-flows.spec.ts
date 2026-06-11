import { test, expect, type Page } from '@playwright/test';

// Launch-critical path coverage (2026-06 QA finding: the three flows the
// product is sold on — draw→trace, export, kerning — had zero e2e tests).
// All three drive the demo project via direct deep links; ?fresh=1 gives
// each test a pristine, deterministic starting state.

test.beforeEach(async ({ context }) => {
	await context.addInitScript(() => {
		localStorage.setItem(
			'font-studio:settings:v1',
			JSON.stringify({ welcomeDismissed: true, theme: 'light' })
		);
	});
});

const openFreshEditor = async (page: Page) => {
	await page.goto('/project/demo/edit?fresh=1');
	// Glyph browser tiles signal the project is hydrated.
	await page.locator('button[title*="U+0041"]').first().waitFor({ timeout: 15000 });
};

test('draw → trace → persists across reload', async ({ page }) => {
	await openFreshEditor(page);
	await page.locator('button[title*="U+0041"]').first().click();

	const canvas = page.locator('[role="application"] svg').first();
	const box = await canvas.boundingBox();
	expect(box).not.toBeNull();
	if (!box) return;

	// One diagonal stroke with the pencil (default tool on a fresh load).
	await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.3);
	await page.mouse.down();
	await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.7, { steps: 12 });
	await page.mouse.up();

	// The committed sketch enables Trace — the truthful "stroke landed" signal.
	const traceButton = page.getByRole('button', { name: /Trace to vector/ });
	await expect(traceButton).toBeEnabled({ timeout: 5000 });

	// Demo 'A' ships with contours; clear them so "Clear vector" enabling
	// again afterwards can only mean OUR trace produced contours.
	page.on('dialog', (d) => void d.accept());
	const clearVector = page.getByRole('button', { name: 'Clear vector' });
	await clearVector.click();
	await expect(clearVector).toBeDisabled({ timeout: 5000 });

	await traceButton.click();
	// Trace keeps the sketch as reference (Trace stays enabled); contours
	// existing again is the real success signal.
	await expect(clearVector).toBeEnabled({ timeout: 5000 });

	// Persistence: reload (no ?fresh) and re-select A — contours survived.
	await page.goto('/project/demo/edit');
	await page.locator('button[title*="U+0041"]').first().waitFor({ timeout: 15000 });
	await page.locator('button[title*="U+0041"]').first().click();
	await expect(page.getByRole('button', { name: 'Clear vector' })).toBeEnabled({
		timeout: 5000
	});
});

test('export OTF downloads a real OpenType file', async ({ page }) => {
	await page.goto('/project/demo/export?fresh=1');
	const exportButton = page.getByRole('button', { name: 'Export OTF' });
	await expect(exportButton).toBeEnabled({ timeout: 20000 });

	const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
	await exportButton.click();
	const download = await downloadPromise;

	expect(download.suggestedFilename()).toMatch(/\.otf$/);
	const stream = await download.createReadStream();
	const chunks: Buffer[] = [];
	for await (const chunk of stream) chunks.push(chunk as Buffer);
	const bytes = Buffer.concat(chunks);
	// Real CFF OpenType: OTTO magic + a plausible size.
	expect(bytes.length).toBeGreaterThan(10_000);
	expect(bytes.subarray(0, 4).toString('latin1')).toBe('OTTO');
});

test('kerning pair editor applies a nudge and persists it', async ({ page }) => {
	await page.goto('/project/demo/spacing?fresh=1');
	const leftInput = page.getByLabel('Left glyph');
	await leftInput.waitFor({ timeout: 15000 });

	await leftInput.fill('V');
	await page.getByLabel('Right glyph').fill('a');
	// Don't hardcode the seeded value — read it, nudge, assert the delta.
	const readout = page.getByText(/kern\(V, a\) = -?\d+/);
	await expect(readout).toBeVisible({ timeout: 5000 });
	const before = Number((await readout.textContent())?.match(/= (-?\d+)/)?.[1]);
	expect(Number.isFinite(before)).toBe(true);

	await page.getByRole('button', { name: '-10', exact: true }).click();
	const expected = `kern(V, a) = ${before - 10}`;
	await expect(page.getByText(expected)).toBeVisible({ timeout: 5000 });

	// Survives a reload (y-indexeddb persistence). NOT page.reload():
	// that would re-apply ?fresh=1, which by design wipes the edit.
	await page.goto('/project/demo/spacing');
	await page.getByLabel('Left glyph').waitFor({ timeout: 15000 });
	await page.getByLabel('Left glyph').fill('V');
	await page.getByLabel('Right glyph').fill('a');
	await expect(page.getByText(expected)).toBeVisible({ timeout: 5000 });
});
