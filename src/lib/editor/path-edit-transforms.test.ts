import { describe, it, expect } from 'vitest';
import {
	snapPointsToGrid,
	flipContours,
	scaleContours,
	alignContoursVertically,
	centerContoursHorizontally,
	autoSpaceContours
} from './path-edit-transforms';
import type { BezierContour, FontMetrics } from '$lib/font/types';
import { DEFAULT_METRICS } from '$lib/font/types';

// ---- Fixtures ----

const rect = (x: number, y: number, w: number, h: number): BezierContour => ({
	closed: true,
	winding: 'ccw',
	commands: [
		{ type: 'M', x, y },
		{ type: 'L', x: x + w, y },
		{ type: 'L', x: x + w, y: y + h },
		{ type: 'L', x, y: y + h },
		{ type: 'Z' }
	]
});

const withCubic = (cmd: { x: number; y: number; x1: number; y1: number; x2: number; y2: number }): BezierContour => ({
	closed: true,
	winding: 'ccw',
	commands: [
		{ type: 'M', x: 0, y: 0 },
		{
			type: 'C',
			x1: cmd.x1,
			y1: cmd.y1,
			x2: cmd.x2,
			y2: cmd.y2,
			x: cmd.x,
			y: cmd.y
		},
		{ type: 'Z' }
	]
});

const allEndpoints = (c: BezierContour) =>
	c.commands.filter((cmd) => cmd.type !== 'Z').map((cmd) => ({ x: (cmd as { x: number }).x, y: (cmd as { y: number }).y }));

// ---- snapPointsToGrid ----

describe('snapPointsToGrid', () => {
	it('rounds M/L coordinates to the nearest grid step', () => {
		const c: BezierContour = {
			closed: true,
			winding: 'ccw',
			commands: [
				{ type: 'M', x: 7.4, y: 12.7 },
				{ type: 'L', x: 23.1, y: 47.9 },
				{ type: 'Z' }
			]
		};
		const [out] = snapPointsToGrid([c], 10);
		expect(out.commands[0]).toMatchObject({ type: 'M', x: 10, y: 10 });
		expect(out.commands[1]).toMatchObject({ type: 'L', x: 20, y: 50 });
	});

	it('rounds Q control + endpoint together', () => {
		const c: BezierContour = {
			closed: true,
			winding: 'ccw',
			commands: [
				{ type: 'M', x: 0, y: 0 },
				{ type: 'Q', x1: 17, y1: 23, x: 33, y: 41 },
				{ type: 'Z' }
			]
		};
		const [out] = snapPointsToGrid([c], 10);
		expect(out.commands[1]).toMatchObject({ type: 'Q', x1: 20, y1: 20, x: 30, y: 40 });
	});

	it('rounds C all six coordinates', () => {
		const c = withCubic({ x: 17, y: 23, x1: 4, y1: 8, x2: 11, y2: 14 });
		const [out] = snapPointsToGrid([c], 5);
		expect(out.commands[1]).toMatchObject({
			type: 'C',
			x1: 5,
			y1: 10,
			x2: 10,
			y2: 15,
			x: 15,
			y: 25
		});
	});

	it('leaves Z commands untouched', () => {
		const c: BezierContour = {
			closed: true,
			winding: 'ccw',
			commands: [
				{ type: 'M', x: 0, y: 0 },
				{ type: 'Z' }
			]
		};
		const [out] = snapPointsToGrid([c], 10);
		expect(out.commands[1]).toEqual({ type: 'Z' });
	});

	it('uses step=10 by default', () => {
		const [out] = snapPointsToGrid([rect(7, 13, 95, 105)]);
		const ms = out.commands.find((c) => c.type === 'M');
		expect((ms as { x: number; y: number }).x).toBe(10);
	});
});

// ---- flipContours ----

describe('flipContours', () => {
	it('mirrors horizontally around the bbox center', () => {
		const [out] = flipContours([rect(0, 0, 100, 50)], 'horizontal');
		// bbox center x = 50. point at x=0 → 100, point at x=100 → 0
		const xs = allEndpoints(out)
			.map((p) => Math.round(p.x))
			.sort((a, b) => a - b);
		expect(xs[0]).toBe(0);
		expect(xs[xs.length - 1]).toBe(100);
	});

	it('mirrors vertically around the bbox center', () => {
		const [out] = flipContours([rect(0, 0, 100, 50)], 'vertical');
		const ys = allEndpoints(out)
			.map((p) => Math.round(p.y))
			.sort((a, b) => a - b);
		expect(ys[0]).toBe(0);
		expect(ys[ys.length - 1]).toBe(50);
	});

	it('is idempotent (two flips = identity)', () => {
		const orig = [rect(10, 20, 100, 50)];
		const once = flipContours(orig, 'horizontal');
		const twice = flipContours(once, 'horizontal');
		expect(allEndpoints(twice[0])).toEqual(allEndpoints(orig[0]));
	});
});

// ---- scaleContours ----

describe('scaleContours', () => {
	it('scales around the bbox center', () => {
		const [out] = scaleContours([rect(0, 0, 100, 100)], 2);
		// bbox center is (50, 50). Scaled by 2 → bbox is (-50, -50) to (150, 150)
		const pts = allEndpoints(out);
		const xs = pts.map((p) => p.x);
		const ys = pts.map((p) => p.y);
		expect(Math.min(...xs)).toBeCloseTo(-50, 0);
		expect(Math.max(...xs)).toBeCloseTo(150, 0);
		expect(Math.min(...ys)).toBeCloseTo(-50, 0);
		expect(Math.max(...ys)).toBeCloseTo(150, 0);
	});

	it('factor=1 returns identity', () => {
		const orig = [rect(10, 20, 100, 50)];
		const [out] = scaleContours(orig, 1);
		const origPts = allEndpoints(orig[0]);
		const outPts = allEndpoints(out);
		origPts.forEach((p, i) => {
			expect(outPts[i].x).toBeCloseTo(p.x, 0);
			expect(outPts[i].y).toBeCloseTo(p.y, 0);
		});
	});

	it('downscales correctly (factor < 1)', () => {
		const [out] = scaleContours([rect(0, 0, 100, 100)], 0.5);
		const pts = allEndpoints(out);
		const xs = pts.map((p) => p.x);
		expect(Math.min(...xs)).toBeCloseTo(25, 0);
		expect(Math.max(...xs)).toBeCloseTo(75, 0);
	});
});

// ---- alignContoursVertically ----

const metricsFor = (override?: Partial<FontMetrics>): FontMetrics => ({
	...DEFAULT_METRICS,
	...override
});

describe('alignContoursVertically', () => {
	it('shifts to sit on baseline (bbox bottom → 0)', () => {
		const out = alignContoursVertically([rect(0, 50, 100, 100)], 'baseline', metricsFor());
		expect(out).not.toBeNull();
		const ys = allEndpoints(out![0]).map((p) => p.y);
		expect(Math.min(...ys)).toBeCloseTo(0, 0);
	});

	it('shifts top to cap-height', () => {
		const m = metricsFor({ capHeight: 700 });
		const out = alignContoursVertically([rect(0, 0, 100, 100)], 'capHeight', m);
		expect(out).not.toBeNull();
		const ys = allEndpoints(out![0]).map((p) => p.y);
		expect(Math.max(...ys)).toBeCloseTo(700, 0);
	});

	it('shifts top to x-height', () => {
		const m = metricsFor({ xHeight: 500 });
		const out = alignContoursVertically([rect(0, 0, 100, 100)], 'xHeight', m);
		expect(out).not.toBeNull();
		const ys = allEndpoints(out![0]).map((p) => p.y);
		expect(Math.max(...ys)).toBeCloseTo(500, 0);
	});

	it('returns null when already aligned (dy === 0)', () => {
		// Bbox bottom already at 0 → baseline alignment is a no-op
		expect(alignContoursVertically([rect(0, 0, 100, 100)], 'baseline', metricsFor())).toBeNull();
	});
});

// ---- centerContoursHorizontally ----

describe('centerContoursHorizontally', () => {
	it('shifts to center the bbox at advance/2', () => {
		// rect from x=0 to x=100, bbox center at 50. Advance=600 → target center=300.
		// dx = 300 - 50 = 250. New bbox: x=250 to x=350.
		const out = centerContoursHorizontally([rect(0, 0, 100, 100)], 600);
		expect(out).not.toBeNull();
		const xs = allEndpoints(out![0]).map((p) => p.x);
		expect(Math.min(...xs)).toBeCloseTo(250, 0);
		expect(Math.max(...xs)).toBeCloseTo(350, 0);
	});

	it('returns null when already centered', () => {
		// Bbox 250-350, advance 600 → center 300, bbox center 300 → no-op
		expect(centerContoursHorizontally([rect(250, 0, 100, 100)], 600)).toBeNull();
	});
});

// ---- autoSpaceContours ----

describe('autoSpaceContours', () => {
	it('sets LSB+RSB to the requested default sidebearing', () => {
		const out = autoSpaceContours([rect(20, 0, 200, 700)], 60);
		expect(out.leftSidebearing).toBe(60);
		expect(out.rightSidebearing).toBe(60);
	});

	it('shifts contours so the bbox left edge sits at the sidebearing', () => {
		const out = autoSpaceContours([rect(20, 0, 200, 700)], 60);
		const xs = allEndpoints(out.contours[0]).map((p) => p.x);
		expect(Math.min(...xs)).toBeCloseTo(60, 0); // bbox min = sidebearing
		expect(Math.max(...xs)).toBeCloseTo(260, 0); // 60 + 200 width
	});

	it('advance = 2*sb + bbox width', () => {
		const out = autoSpaceContours([rect(20, 0, 200, 700)], 60);
		expect(out.advanceWidth).toBe(60 * 2 + 200); // 320
	});

	it('clamps advance to at least 50', () => {
		// Tiny contour — advance would naturally be 2*sb + width
		const out = autoSpaceContours([rect(0, 0, 1, 1)], 10);
		expect(out.advanceWidth).toBeGreaterThanOrEqual(50);
	});

	it('preserves contour Y coordinates (only horizontal shift)', () => {
		const orig = [rect(20, 100, 200, 500)];
		const out = autoSpaceContours(orig, 60);
		const origYs = allEndpoints(orig[0]).map((p) => p.y);
		const outYs = allEndpoints(out.contours[0]).map((p) => p.y);
		expect(outYs).toEqual(origYs);
	});
});
