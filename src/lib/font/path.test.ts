import { describe, it, expect } from 'vitest';
import {
	signedArea,
	computeWinding,
	reverseContour,
	enforceWinding,
	glyphBounds,
	contourBounds
} from './path';
import type { PathCommand, BezierContour } from './types';

// Helpers --------------------------------------------------------------------

const square = (size = 100, ccw = true): PathCommand[] => {
	// Font convention: CCW = positive area. Two valid orderings for a square:
	const pts = ccw
		? [{ x: 0, y: 0 }, { x: size, y: 0 }, { x: size, y: size }, { x: 0, y: size }]
		: [{ x: 0, y: 0 }, { x: 0, y: size }, { x: size, y: size }, { x: size, y: 0 }];
	return [
		{ type: 'M', x: pts[0].x, y: pts[0].y },
		{ type: 'L', x: pts[1].x, y: pts[1].y },
		{ type: 'L', x: pts[2].x, y: pts[2].y },
		{ type: 'L', x: pts[3].x, y: pts[3].y },
		{ type: 'Z' }
	];
};

const contour = (commands: PathCommand[], winding: 'cw' | 'ccw' = 'ccw'): BezierContour => ({
	closed: true,
	winding,
	commands
});

// Tests ----------------------------------------------------------------------

describe('signedArea', () => {
	it('is positive for a CCW polygon', () => {
		expect(signedArea(square(100, true))).toBeGreaterThan(0);
	});

	it('is negative for a CW polygon', () => {
		expect(signedArea(square(100, false))).toBeLessThan(0);
	});

	it('scales with size² for a square', () => {
		const a = signedArea(square(50, true));
		const b = signedArea(square(100, true));
		expect(b / a).toBeCloseTo(4, 1);
	});
});

describe('computeWinding', () => {
	it.each([
		['ccw', true],
		['cw', false]
	])('detects %s', (expected, ccw) => {
		expect(computeWinding(square(100, ccw as boolean))).toBe(expected);
	});
});

describe('reverseContour', () => {
	it('flips the winding direction', () => {
		const reversed = reverseContour(square(100, true));
		expect(computeWinding(reversed)).toBe('cw');
	});

	it('preserves the bounding box', () => {
		const original = contour(square(100, true), 'ccw');
		const reversed = contour(reverseContour(square(100, true)), 'cw');
		expect(glyphBounds([reversed])).toEqual(glyphBounds([original]));
	});

	it('swaps cubic bezier handle order (x1/y1 ↔ x2/y2)', () => {
		// A single C-curve from (0,0) to (100,100) — reversing it should swap
		// the control handles so the curve geometry stays identical.
		const cmds: PathCommand[] = [
			{ type: 'M', x: 0, y: 0 },
			{ type: 'C', x1: 30, y1: 0, x2: 70, y2: 100, x: 100, y: 100 },
			{ type: 'Z' }
		];
		const out = reverseContour(cmds);
		const c = out.find((cmd) => cmd.type === 'C');
		expect(c).toBeDefined();
		if (c?.type === 'C') {
			expect(c.x1).toBe(70);
			expect(c.y1).toBe(100);
			expect(c.x2).toBe(30);
			expect(c.y2).toBe(0);
		}
	});

	it('preserves the closing Z command', () => {
		const out = reverseContour(square(100, true));
		expect(out[out.length - 1].type).toBe('Z');
	});
});

describe('enforceWinding', () => {
	it('returns the contour unchanged when winding already matches', () => {
		const ccw = contour(square(100, true), 'ccw');
		const result = enforceWinding(ccw, 'ccw');
		expect(result.commands).toEqual(ccw.commands);
		expect(result.winding).toBe('ccw');
	});

	it('reverses the contour when winding mismatches', () => {
		const ccw = contour(square(100, true), 'ccw');
		const result = enforceWinding(ccw, 'cw');
		expect(computeWinding(result.commands)).toBe('cw');
		expect(result.winding).toBe('cw');
	});
});

describe('contourBounds', () => {
	it('returns zeros for an empty command list', () => {
		expect(contourBounds([])).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 });
	});

	it('computes the bbox of a square', () => {
		const b = contourBounds(square(100, true));
		expect(b).toEqual({ minX: 0, minY: 0, maxX: 100, maxY: 100 });
	});
});

describe('glyphBounds', () => {
	it('returns zeros for no contours', () => {
		expect(glyphBounds([])).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 });
	});

	it('unions bounding boxes across multiple contours', () => {
		const a = contour(square(100, true), 'ccw');
		// Translate a second square by +200 on the x-axis
		const offsetCmds = square(100, true).map((c) =>
			c.type === 'Z' ? c : { ...c, x: c.x + 200 }
		) as PathCommand[];
		const b = contour(offsetCmds, 'ccw');
		const bbox = glyphBounds([a, b]);
		expect(bbox).toEqual({ minX: 0, minY: 0, maxX: 300, maxY: 100 });
	});
});
