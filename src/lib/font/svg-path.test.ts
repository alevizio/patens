import { describe, expect, it } from 'vitest';
import { parseSvgPath, svgToFontTransform } from './svg-path';

describe('parseSvgPath', () => {
	it('parses a simple triangle (M L L Z)', () => {
		const contours = parseSvgPath('M 0 0 L 100 0 L 50 100 Z');
		expect(contours).toHaveLength(1);
		expect(contours[0].closed).toBe(true);
		expect(contours[0].commands).toEqual([
			{ type: 'M', x: 0, y: 0 },
			{ type: 'L', x: 100, y: 0 },
			{ type: 'L', x: 50, y: 100 },
			{ type: 'Z' }
		]);
	});

	it('handles relative moves and lines (m l)', () => {
		const contours = parseSvgPath('m 10 10 l 50 0 l 0 50 z');
		expect(contours[0].commands).toEqual([
			{ type: 'M', x: 10, y: 10 },
			{ type: 'L', x: 60, y: 10 },
			{ type: 'L', x: 60, y: 60 },
			{ type: 'Z' }
		]);
	});

	it('implicit-repeat: numbers after M become L', () => {
		// "M 0 0 10 10 20 0" → M(0,0) L(10,10) L(20,0)
		const contours = parseSvgPath('M 0 0 10 10 20 0');
		expect(contours[0].commands).toEqual([
			{ type: 'M', x: 0, y: 0 },
			{ type: 'L', x: 10, y: 10 },
			{ type: 'L', x: 20, y: 0 }
		]);
	});

	it('horizontal (H) and vertical (V) lines', () => {
		const contours = parseSvgPath('M 10 20 H 100 V 80 Z');
		expect(contours[0].commands).toEqual([
			{ type: 'M', x: 10, y: 20 },
			{ type: 'L', x: 100, y: 20 },
			{ type: 'L', x: 100, y: 80 },
			{ type: 'Z' }
		]);
	});

	it('relative H/V use the current point', () => {
		const contours = parseSvgPath('M 10 20 h 50 v 30');
		expect(contours[0].commands).toEqual([
			{ type: 'M', x: 10, y: 20 },
			{ type: 'L', x: 60, y: 20 },
			{ type: 'L', x: 60, y: 50 }
		]);
	});

	it('cubic Bezier (C)', () => {
		const contours = parseSvgPath('M 0 0 C 50 50 70 70 100 100');
		expect(contours[0].commands[1]).toEqual({
			type: 'C',
			x1: 50,
			y1: 50,
			x2: 70,
			y2: 70,
			x: 100,
			y: 100
		});
	});

	it('smooth cubic (S) reflects previous control', () => {
		// Previous cubic ends with control (90, 0) and on-curve (100, 100).
		// S reflects: control1 = (2*100 - 90, 2*100 - 0) = (110, 200).
		const contours = parseSvgPath('M 0 0 C 10 0 90 0 100 100 S 200 200 300 0');
		const s = contours[0].commands[2];
		expect(s.type).toBe('C');
		if (s.type !== 'C') throw new Error('expected C');
		expect(s.x1).toBe(110);
		expect(s.y1).toBe(200);
	});

	it('S after a non-cubic uses the current point as control1', () => {
		const contours = parseSvgPath('M 100 100 S 200 200 300 0');
		const s = contours[0].commands[1];
		if (s.type !== 'C') throw new Error('expected C');
		expect(s.x1).toBe(100);
		expect(s.y1).toBe(100);
	});

	it('quadratic Bezier (Q)', () => {
		const contours = parseSvgPath('M 0 0 Q 50 100 100 0');
		expect(contours[0].commands[1]).toEqual({
			type: 'Q',
			x1: 50,
			y1: 100,
			x: 100,
			y: 0
		});
	});

	it('smooth quadratic (T) reflects previous Q control', () => {
		// Previous Q control (50, 100), Q endpoint (100, 0).
		// T reflects: control = (2*100 - 50, 2*0 - 100) = (150, -100).
		const contours = parseSvgPath('M 0 0 Q 50 100 100 0 T 200 0');
		const t = contours[0].commands[2];
		if (t.type !== 'Q') throw new Error('expected Q');
		expect(t.x1).toBe(150);
		expect(t.y1).toBe(-100);
	});

	it('multiple contours separated by M', () => {
		const contours = parseSvgPath('M 0 0 L 10 0 Z M 100 100 L 110 100 Z');
		expect(contours).toHaveLength(2);
		expect(contours[0].commands).toHaveLength(3);
		expect(contours[1].commands).toHaveLength(3);
	});

	it('applies transformPoint to every coord', () => {
		// Negate y (SVG-y-down → font-y-up).
		const contours = parseSvgPath('M 10 20 L 30 40', {
			transformPoint: (x, y) => [x, -y]
		});
		expect(contours[0].commands).toEqual([
			{ type: 'M', x: 10, y: -20 },
			{ type: 'L', x: 30, y: -40 }
		]);
	});

	it('forceClose adds a Z when missing', () => {
		const contours = parseSvgPath('M 0 0 L 10 0 L 5 10', { forceClose: true });
		const last = contours[0].commands[contours[0].commands.length - 1];
		expect(last.type).toBe('Z');
		expect(contours[0].closed).toBe(true);
	});

	it('accepts exponent notation and shorthand floats', () => {
		const contours = parseSvgPath('M .5 1e2 L 1. .5');
		expect(contours[0].commands).toEqual([
			{ type: 'M', x: 0.5, y: 100 },
			{ type: 'L', x: 1, y: 0.5 }
		]);
	});

	it('accepts commas + extra whitespace as separators', () => {
		const contours = parseSvgPath('M0,0 L  10 , 0  L\n10,10Z');
		expect(contours[0].commands).toHaveLength(4);
	});

	it('throws on the arc command for now', () => {
		expect(() => parseSvgPath('M 0 0 A 10 10 0 0 0 100 100')).toThrow(/arc/);
	});

	it('throws on unknown commands', () => {
		expect(() => parseSvgPath('M 0 0 X 10 10')).toThrow();
	});

	it('handles a Twemoji-shape heart (representative case)', () => {
		// Heavily simplified heart path inspired by Twemoji's `❤` glyph.
		const d =
			'M 50 80 C 30 60 5 50 5 30 C 5 15 15 5 30 5 C 40 5 50 15 50 25 C 50 15 60 5 70 5 C 85 5 95 15 95 30 C 95 50 70 60 50 80 Z';
		const contours = parseSvgPath(d);
		expect(contours).toHaveLength(1);
		expect(contours[0].closed).toBe(true);
		// Move + 6 cubics + Z = 8 commands.
		expect(contours[0].commands).toHaveLength(8);
	});
});

describe('svgToFontTransform', () => {
	it('flips y and scales SVG coords into font UPM space', () => {
		// SVG 36x36 (Twemoji size), baseline at y=27.
		// Font: ascender 800, descender -200 → height 1000.
		const t = svgToFontTransform(36, 800, -200, { svgBaselineY: 27 });
		// SVG (0, 0) → top-left → should land high above baseline.
		const [x0, y0] = t(0, 0);
		expect(x0).toBe(0);
		expect(y0).toBeCloseTo(27 * (1000 / 36), 1);
		// SVG point at the baseline → font y = 0.
		const [, yBaseline] = t(0, 27);
		expect(yBaseline).toBe(0);
		// SVG point below baseline → negative font y (descender area).
		const [, yBelow] = t(0, 30);
		expect(yBelow).toBeLessThan(0);
	});

	it('default baseline is 75% of svgHeight', () => {
		const t = svgToFontTransform(100, 700, -200);
		const [, yMid] = t(0, 75);
		expect(yMid).toBeCloseTo(0, 5);
	});
});
