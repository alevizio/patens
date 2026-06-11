// Records the 30-second launch demo per docs/launch/demo-gif-storyboard.md.
//
//   node scripts/record-demo.mjs --dry     # beat screenshots only (fast iterate)
//   node scripts/record-demo.mjs           # full CDP-screencast take
//
// Drives the live editor at localhost:5175 (npm run dev -- --port 5175)
// with CDP input events — pen events carry a force profile so the brush
// stroke tapers like a real stylus. Frames + timestamps land in
// /tmp/patens-demo/; assemble with scripts/assemble-demo.sh.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const DRY = process.argv.includes('--dry');
const OUT = '/tmp/patens-demo';
const FRAMES = path.join(OUT, 'frames');
const SHOTS = path.join(OUT, 'dry');
const BASE = 'http://localhost:5175';
const W = 1920;
const H = 1080;

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(FRAMES, { recursive: true });
fs.mkdirSync(SHOTS, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

// ---------------------------------------------------------------- launch
const browser = await chromium.launch({
	headless: false,
	args: ['--hide-scrollbars', '--force-color-profile=srgb']
});
const context = await browser.newContext({
	viewport: { width: W, height: H },
	deviceScaleFactor: 1,
	reducedMotion: 'no-preference',
	colorScheme: 'light'
});

// Pre-dismiss the welcome strip, force light theme, and inject a fake
// cursor — CDP screencast doesn't rasterize the OS cursor, so a plain
// arrow (crosshair over the drawing canvas) follows pointer events.
await context.addInitScript(() => {
	try {
		const KEY = 'font-studio:settings:v1';
		const cur = JSON.parse(localStorage.getItem(KEY) || '{}');
		localStorage.setItem(KEY, JSON.stringify({ ...cur, welcomeDismissed: true, theme: 'light' }));
	} catch {
		/* localStorage unavailable — first-run UI will show; harmless in dry runs */
	}

	const ARROW =
		'<svg width="26" height="26" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
		'<path d="M5.5 3.2 L5.5 17.5 L9.0 14.4 L11.2 19.8 L13.6 18.8 L11.4 13.5 L16.2 13.2 Z" ' +
		'fill="black" stroke="white" stroke-width="1.4" stroke-linejoin="round"/></svg>';
	const CROSS =
		'<svg width="26" height="26" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
		'<g stroke="black" stroke-width="1.6"><line x1="12" y1="3" x2="12" y2="21"/>' +
		'<line x1="3" y1="12" x2="21" y2="12"/></g>' +
		'<g stroke="white" stroke-width="0.6"><line x1="12" y1="3" x2="12" y2="21"/>' +
		'<line x1="3" y1="12" x2="21" y2="12"/></g></svg>';

	const ready = () => {
		// Recording-only: hide the empty-glyph ghost template so the draw
		// beat starts from a truly blank canvas (storyboard 0:00).
		const style = document.createElement('style');
		style.textContent = '[role="application"] svg text[opacity="0.18"]{display:none!important}';
		document.head.appendChild(style);
		const el = document.createElement('div');
		el.id = '__demo-cursor';
		el.style.cssText =
			'position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;' +
			'pointer-events:none;transform:translate(-2000px,-2000px);will-change:transform;';
		el.innerHTML = ARROW;
		document.body.appendChild(el);
		let overCanvas = false;
		const update = (e) => {
			const onCanvas = !!(e.target instanceof Element && e.target.closest('[role="application"]'));
			if (onCanvas !== overCanvas) {
				overCanvas = onCanvas;
				el.innerHTML = onCanvas ? CROSS : ARROW;
			}
			// Arrow hotspot is the tip (top-left); crosshair centers on the point.
			const off = onCanvas ? 13 : 5;
			el.style.transform = `translate(${e.clientX - off}px, ${e.clientY - off}px)`;
		};
		document.addEventListener('pointermove', update, { capture: true, passive: true });
		document.addEventListener('pointerdown', update, { capture: true, passive: true });
	};
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
	else ready();
});

const page = await context.newPage();
page.on('dialog', (d) => d.accept());
const cdp = await context.newCDPSession(page);

// ------------------------------------------------------------- input rig
let cur = { x: W - 60, y: H - 30 };

const rawMove = (x, y, opts = {}) =>
	cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, ...opts });

const moveTo = async (x, y, ms = 450) => {
	const steps = Math.max(2, Math.round(ms / 16));
	const from = { ...cur };
	for (let i = 1; i <= steps; i++) {
		const t = easeInOut(i / steps);
		await rawMove(from.x + (x - from.x) * t, from.y + (y - from.y) * t);
		await sleep(ms / steps);
	}
	cur = { x, y };
};

const click = async () => {
	await cdp.send('Input.dispatchMouseEvent', {
		type: 'mousePressed', x: cur.x, y: cur.y, button: 'left', buttons: 1, clickCount: 1
	});
	await sleep(70);
	await cdp.send('Input.dispatchMouseEvent', {
		type: 'mouseReleased', x: cur.x, y: cur.y, button: 'left', buttons: 0, clickCount: 1
	});
};

const clickEl = async (locator, ms = 450) => {
	const box = await locator.boundingBox();
	if (!box) throw new Error(`no boundingBox for ${locator}`);
	await moveTo(box.x + box.width / 2, box.y + box.height / 2, ms);
	await sleep(120);
	await click();
};

const pressKey = async (key, code, text) => {
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, text });
	await sleep(60);
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code });
};

// Pen stroke: pts = [{x, y, force, dt}] in viewport px. pointerType 'pen'
// makes ev.pressure carry `force`, which the sketch outline uses for taper.
const penStroke = async (pts) => {
	const p0 = pts[0];
	await moveTo(p0.x, p0.y, 600);
	await sleep(150);
	await cdp.send('Input.dispatchMouseEvent', {
		type: 'mousePressed', x: p0.x, y: p0.y, button: 'left', buttons: 1,
		clickCount: 1, pointerType: 'pen', force: p0.force
	});
	for (const p of pts.slice(1)) {
		await sleep(p.dt);
		await rawMove(p.x, p.y, { buttons: 1, pointerType: 'pen', force: p.force });
		cur = { x: p.x, y: p.y };
	}
	await sleep(40);
	const last = pts[pts.length - 1];
	await cdp.send('Input.dispatchMouseEvent', {
		type: 'mouseReleased', x: last.x, y: last.y, button: 'left', buttons: 0,
		clickCount: 1, pointerType: 'pen', force: 0
	});
};

// --------------------------------------------------------- the 'a' path
// Single-gesture single-storey lowercase a in font units (UPM 1000,
// x-height 500, baseline 0): over the bowl top, down the left, around
// the bottom, up the right into the stem, down the stem, exit tail.
const buildGlyphGesture = () => {
	const coarse = [];
	const bowl = { cx: 255, cy: 252, rx: 192, ry: 242 };
	for (let i = 0; i <= 30; i++) {
		const th = ((52 + (340 - 52) * (i / 30)) * Math.PI) / 180;
		coarse.push({
			x: bowl.cx + bowl.rx * Math.cos(th),
			y: bowl.cy + bowl.ry * Math.sin(th),
			seg: i < 4 ? 'in' : 'bowl'
		});
	}
	// blend from bowl exit (~(436,170)) up the right side to the stem top
	for (let i = 1; i <= 8; i++) {
		const t = i / 8;
		const x = 436 + (452 - 436) * t + 18 * Math.sin(Math.PI * t);
		const y = 170 + (478 - 170) * easeInOut(t);
		coarse.push({ x, y, seg: 'blend' });
	}
	for (let i = 1; i <= 10; i++) {
		const t = i / 10;
		coarse.push({ x: 452 + 3 * Math.sin(t * 5), y: 478 - (478 - 14) * t, seg: 'stem' });
	}
	for (let i = 1; i <= 4; i++) {
		const t = i / 4;
		coarse.push({ x: 452 + 52 * t, y: 14 + 38 * t * t, seg: 'out' });
	}
	// hand wobble
	return coarse.map((p, i) => ({
		...p,
		x: p.x + 2.2 * Math.sin(i * 1.7),
		y: p.y + 2.2 * Math.cos(i * 2.3)
	}));
};

// Catmull-Rom densify so the app sees ~real pointermove rates.
const densify = (pts, per = 6) => {
	const out = [];
	for (let i = 0; i < pts.length - 1; i++) {
		const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1],
			p3 = pts[Math.min(pts.length - 1, i + 2)];
		for (let j = 0; j < per; j++) {
			const t = j / per, t2 = t * t, t3 = t2 * t;
			out.push({
				x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
				y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
				seg: p1.seg
			});
		}
	}
	out.push({ ...pts[pts.length - 1] });
	return out;
};

const SEG_SPEED = { in: 1.5, bowl: 1.0, blend: 1.15, stem: 0.72, out: 1.35 };

const gestureToScreen = async () => {
	// font-units -> viewport px via the Y-flipped drawing group's CTM
	const m = await page.evaluate(() => {
		const app = document.querySelector('[role="application"] svg');
		if (!app) return null;
		for (const g of app.querySelectorAll('g')) {
			const ctm = g.getCTM();
			if (ctm && ctm.d < 0) {
				const s = g.getScreenCTM();
				return { a: s.a, b: s.b, c: s.c, d: s.d, e: s.e, f: s.f };
			}
		}
		return null;
	});
	if (!m) throw new Error('drawing layer CTM not found');
	const dense = densify(buildGlyphGesture(), 6);
	const n = dense.length;
	return dense.map((p, i) => {
		const t = i / (n - 1);
		let force = 0.58 + 0.1 * Math.sin(t * 7.1);
		if (i < 10) force = 0.25 + (0.58 - 0.25) * (i / 10);
		if (i > n - 9) force = Math.max(0.12, force * ((n - 1 - i) / 9));
		return {
			x: m.a * p.x + m.c * p.y + m.e,
			y: m.b * p.x + m.d * p.y + m.f,
			force: Math.round(force * 100) / 100,
			dt: Math.round(11 * (SEG_SPEED[p.seg] ?? 1))
		};
	});
};

// ------------------------------------------------------------ screencast
const meta = { beats: [], frames: [] };
let frameNo = 0;
const startCapture = async () => {
	if (DRY) return;
	cdp.on('Page.screencastFrame', async (ev) => {
		const fn = path.join(FRAMES, String(frameNo++).padStart(6, '0') + '.jpg');
		fs.writeFileSync(fn, Buffer.from(ev.data, 'base64'));
		meta.frames.push(ev.metadata.timestamp);
		await cdp.send('Page.screencastFrameAck', { sessionId: ev.sessionId }).catch(() => {});
	});
	await cdp.send('Page.startScreencast', {
		format: 'jpeg', quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1
	});
};
const stopCapture = async () => {
	if (DRY) return;
	await cdp.send('Page.stopScreencast');
};

const beat = async (name) => {
	meta.beats.push({ name, t: Date.now() / 1000 });
	console.log(`· ${name}`);
	if (DRY) await page.screenshot({ path: path.join(SHOTS, `${meta.beats.length}-${name}.png`) });
};

// ============================================================ choreography
console.log('staging…');
await page.goto(`${BASE}/project/demo/edit?fresh=1`, { waitUntil: 'networkidle' });
await sleep(2000);

// select 'a' (U+0061) in the glyph browser
await page.locator('button[title*="U+0061"]').first().click();
await sleep(500);

// stage the cold state: wipe the pre-built outline (+ sketch if any)
for (const label of ['Clear vector', 'Clear sketch']) {
	const b = page.getByRole('button', { name: label });
	if ((await b.count()) && (await b.isEnabled())) {
		await b.click();
		await sleep(350);
	}
}
await pressKey('p', 'KeyP', 'p'); // pencil
await sleep(400);
await rawMove(cur.x, cur.y); // park the fake cursor bottom-right
await beat('staged-cold-state');

const stroke = await gestureToScreen();

console.log(DRY ? 'dry run…' : 'recording…');
await startCapture();

// 0:00 – hold the cold state
await sleep(1500);
await beat('cold-hold');

// draw
await penStroke(stroke);
await sleep(600);
await beat('drawn');

// trace
await pressKey('t', 'KeyT', 't');
await sleep(2400);
await beat('traced');

// audit: hover first finding, apply fix
const auditRow = page.locator('aside li').filter({ has: page.getByRole('button', { name: 'Fix' }) }).first();
if (await auditRow.count()) {
	await auditRow.scrollIntoViewIfNeeded();
	const box = await auditRow.boundingBox();
	await moveTo(box.x + box.width * 0.4, box.y + box.height / 2, 700);
	await sleep(1500);
	await beat('audit-hover');
	await clickEl(auditRow.getByRole('button', { name: 'Fix' }), 350);
	await sleep(1700);
	await beat('audit-fixed');
} else {
	console.log('!! no fixable audit rows — beat skipped');
	await sleep(1200);
	await beat('audit-empty');
}

// spacing: pair V/a, nudge tighter
await clickEl(page.getByRole('link', { name: 'Spacing' }).first(), 600);
await page.waitForURL(/\/spacing/);
await sleep(900);
const kernPanel = page.getByRole('heading', { name: 'Kerning pair editor' });
await kernPanel.scrollIntoViewIfNeeded();
await sleep(400);
// Field wraps a labelled Input; fall back to placeholder-free text inputs
const leftInput = (await page.getByLabel('Left glyph').count())
	? page.getByLabel('Left glyph')
	: page.locator('.text-center.text-lg').first();
const rightInput = (await page.getByLabel('Right glyph').count())
	? page.getByLabel('Right glyph')
	: page.locator('.text-center.text-lg').nth(1);
await clickEl(leftInput, 500);
await page.keyboard.press('Meta+a');
await page.keyboard.type('V', { delay: 80 });
await clickEl(rightInput, 350);
await page.keyboard.press('Meta+a');
await page.keyboard.type('a', { delay: 80 });
await sleep(900);
await beat('pair-loaded');
for (const lbl of ['-30', '-30', '-10']) {
	await clickEl(page.getByRole('button', { name: lbl, exact: true }), 380);
	await sleep(420);
}
await sleep(900);
await beat('kerned');

// export
await clickEl(page.getByRole('link', { name: 'Export' }).first(), 600);
await page.waitForURL(/\/export/);
await sleep(900);
const otfBtn = page.getByRole('button', { name: 'Export OTF' });
await otfBtn.scrollIntoViewIfNeeded();
await sleep(300);
const dl = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
await clickEl(otfBtn, 550);
await dl;
await sleep(1900);
await beat('exported');

// loop seam: back to the finished glyph
await clickEl(page.locator('a[href$="/edit"]').first(), 550);
await sleep(1900);
await beat('loop-hold');

await stopCapture();
fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 1));
console.log(DRY ? `dry shots in ${SHOTS}` : `${frameNo} frames in ${FRAMES}`);
await browser.close();
