import { defineConfig, devices } from '@playwright/test';

const PORT = 5175;

export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	// HTML reporter in CI gives a browseable bundle (open from the
	// artifact zip locally); the line reporter is fine for local dev.
	// process.env.CI is the standard signal for "build server".
	reporter: process.env.CI
		? [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
		: 'list',
	use: {
		baseURL: `http://localhost:${PORT}`,
		// retain-on-failure keeps the trace + screenshot + video only when
		// a test fails, so successful runs don't accumulate gigabytes of
		// artifact data. Trace gives a step-by-step DOM playback; screenshot
		// gives the final state at the failure assertion; video gives the
		// full timeline when the trace itself isn't enough (rare, but the
		// welcome-strip hydration race was one).
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure'
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: `npm run dev -- --port ${PORT}`,
		url: `http://localhost:${PORT}`,
		reuseExistingServer: !process.env.CI,
		timeout: 60_000
	}
});
