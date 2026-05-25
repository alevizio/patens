/**
 * Cold-load profiler — drives a fresh Chromium against the production
 * URL, records the Chrome DevTools Performance trace, and prints a
 * digest of:
 *   - Long tasks (>50ms) that contribute to max-potential-fid
 *   - Layout / recalc-style events that contribute to forced-reflow
 *   - Largest scripts evaluated during the cold load
 *
 * Run via: pnpm exec node scripts/profile-cold-load.mjs [url]
 *
 * Default URL: https://font-studio.vercel.app/. The script uses
 * playwright-chromium (already a devDep) so no new install.
 *
 * The full trace is dumped to /tmp/font-studio-trace.json — load it in
 * chrome://tracing or DevTools → Performance → Load profile for
 * a graphical view if the digest isn't enough.
 */

// @playwright/test re-exports chromium; we only need the browser.
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const URL = process.argv[2] ?? 'https://font-studio.vercel.app/';
const TRACE_PATH = '/tmp/font-studio-trace.json';

const fmt = (ms) => `${ms.toFixed(1)}ms`;

const main = async () => {
	console.log(`Profiling cold load: ${URL}`);
	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext();
	const page = await context.newPage();

	// CDP session for Performance trace capture
	const client = await context.newCDPSession(page);
	await client.send('Performance.enable');
	await client.send('Tracing.start', {
		categories: [
			'devtools.timeline',
			'v8.execute',
			'blink.user_timing',
			'loading',
			'disabled-by-default-devtools.timeline.frame',
			'disabled-by-default-v8.compile'
		].join(','),
		options: 'sampling-frequency=10000'
	});

	const events = [];
	client.on('Tracing.dataCollected', (data) => {
		events.push(...data.value);
	});

	const tracingComplete = new Promise((resolve) => {
		client.once('Tracing.tracingComplete', resolve);
	});

	// Cold load — disable cache to simulate first-visit
	await page.route('**/*', (route) => route.continue());
	await context.clearCookies();
	const start = Date.now();
	await page.goto(URL, { waitUntil: 'networkidle' });
	const total = Date.now() - start;

	await client.send('Tracing.end');
	await tracingComplete;

	writeFileSync(TRACE_PATH, JSON.stringify({ traceEvents: events }));

	// --- Analysis ---
	// Long tasks: any top-level task >50ms blocking the main thread.
	// These contribute directly to max-potential-fid.
	const longTasks = events
		.filter(
			(e) =>
				e.name === 'RunTask' &&
				e.dur != null &&
				e.dur / 1000 >= 50 &&
				e.cat?.includes('devtools.timeline')
		)
		.map((e) => ({ name: e.name, durMs: e.dur / 1000, ts: e.ts / 1000 }))
		.sort((a, b) => b.durMs - a.durMs);

	// Forced layouts: Layout events that happened inside a JS task
	// (i.e., synchronous reflow). Look for Layout with a parent task.
	const layouts = events
		.filter((e) => e.name === 'Layout' && e.dur != null && e.dur / 1000 >= 4)
		.map((e) => ({ durMs: e.dur / 1000, ts: e.ts / 1000 }))
		.sort((a, b) => b.durMs - a.durMs);

	// Script evaluation totals
	const scriptCompiles = events.filter((e) => e.name === 'v8.compile' && e.dur != null);
	const evalEvents = events.filter((e) => e.name === 'EvaluateScript' && e.dur != null);
	const evalTotal = evalEvents.reduce((sum, e) => sum + e.dur / 1000, 0);

	// FCP / LCP / DOMContentLoaded
	const markers = events
		.filter((e) =>
			['firstContentfulPaint', 'largestContentfulPaint::Candidate', 'domContentLoadedEventEnd'].includes(
				e.name
			)
		)
		.map((e) => ({ name: e.name, ts: e.ts / 1000 }));
	const earliest = events
		.filter((e) => e.name === 'navigationStart')
		.map((e) => e.ts / 1000)[0];

	console.log(`\n=== Cold-load digest for ${URL} ===`);
	console.log(`Total load time: ${total}ms`);
	console.log(`Trace events captured: ${events.length}`);
	console.log(`Trace dumped to: ${TRACE_PATH}\n`);

	if (earliest != null) {
		console.log('Page lifecycle markers (ms from navigationStart):');
		for (const m of markers) {
			console.log(`  ${m.name}: ${fmt(m.ts - earliest)}`);
		}
	}

	console.log(`\nLong tasks (≥50ms) — these drive max-potential-fid:`);
	if (longTasks.length === 0) {
		console.log('  (none — good!)');
	} else {
		for (const t of longTasks.slice(0, 10)) {
			console.log(`  ${fmt(t.durMs)}  at +${fmt(t.ts - (earliest ?? 0))}`);
		}
		if (longTasks.length > 10) console.log(`  ... and ${longTasks.length - 10} more`);
	}

	console.log(`\nLayout events (≥4ms) — these drive forced-reflow-insight:`);
	if (layouts.length === 0) {
		console.log('  (none — good!)');
	} else {
		for (const l of layouts.slice(0, 10)) {
			console.log(`  ${fmt(l.durMs)}  at +${fmt(l.ts - (earliest ?? 0))}`);
		}
		if (layouts.length > 10) console.log(`  ... and ${layouts.length - 10} more`);
	}

	console.log(`\nScript execution:`);
	console.log(`  Total EvaluateScript time: ${fmt(evalTotal)}`);
	console.log(`  v8.compile events: ${scriptCompiles.length}`);

	await browser.close();
};

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
