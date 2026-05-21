import { describe, expect, it } from 'vitest';
import { measureSpacing, suggestSpacingFromReference } from './spacing';
import type { BezierContour } from './types';

const rect = (xMin: number, yMin: number, xMax: number, yMax: number): BezierContour => ({
	closed: true,
	winding: 'cw',
	commands: [
		{ type: 'M', x: xMin, y: yMin },
		{ type: 'L', x: xMax, y: yMin },
		{ type: 'L', x: xMax, y: yMax },
		{ type: 'L', x: xMin, y: yMax },
		{ type: 'L', x: xMin, y: yMin },
		{ type: 'Z' }
	]
});

describe('measureSpacing', () => {
	it('rectangle: zero left/right area (silhouette is a flat vertical line)', () => {
		const m = measureSpacing([rect(100, 0, 400, 700)], { bottom: 0, top: 700, samples: 128 });
		expect(m).not.toBeNull();
		expect(m!.minX).toBe(100);
		expect(m!.maxX).toBe(400);
		// A rectangle's left silhouette IS minX at every row, so leftArea = 0.
		expect(m!.leftArea).toBeCloseTo(0, 4);
		expect(m!.rightArea).toBeCloseTo(0, 4);
		// Full coverage of the zone.
		expect(m!.inkedFraction).toBeCloseTo(1, 1);
	});

	it('right-leaning triangle: rightArea > 0, leftArea > 0 (apex offset)', () => {
		// Triangle with base 100-400 at y=0 and apex at (400, 700).
		// Right silhouette is the right vertical edge from (400, 0)
		// straight up to (400, 700). leftArea is the wedge from the
		// hypotenuse to x=100.
		const tri: BezierContour = {
			closed: true,
			winding: 'cw',
			commands: [
				{ type: 'M', x: 100, y: 0 },
				{ type: 'L', x: 400, y: 0 },
				{ type: 'L', x: 400, y: 700 },
				{ type: 'L', x: 100, y: 0 },
				{ type: 'Z' }
			]
		};
		const m = measureSpacing([tri], { bottom: 0, top: 700, samples: 256 });
		expect(m).not.toBeNull();
		// scan-line intersection at band centers misses the exact corner —
		// the lowest scan-row sits ~1.4 fu above y=0, so leftmost ink is
		// the hypotenuse crossing at that height, ~100.6 not exactly 100.
		expect(m!.minX).toBeGreaterThanOrEqual(100);
		expect(m!.minX).toBeLessThan(101);
		expect(m!.maxX).toBe(400);
		// Right silhouette is the right edge (x=400) → flush → rightArea ≈ 0.
		expect(m!.rightArea).toBeCloseTo(0, 1);
		// Left silhouette starts at x=100 (base) and ramps to x=400 (apex) →
		// triangular wedge of area ≈ 0.5 * (400 - 100) * 700 = 105_000 fu²
		expect(m!.leftArea).toBeGreaterThan(80_000);
		expect(m!.leftArea).toBeLessThan(110_000);
	});

	it('returns null when the glyph has no ink in the zone', () => {
		const m = measureSpacing([rect(0, -200, 100, -50)], { bottom: 0, top: 700 });
		expect(m).toBeNull();
	});

	it('inkedFraction reports a partial-coverage glyph', () => {
		// Glyph only inks the bottom half of the zone.
		const m = measureSpacing([rect(100, 0, 200, 350)], { bottom: 0, top: 700, samples: 128 });
		expect(m).not.toBeNull();
		expect(m!.inkedFraction).toBeCloseTo(0.5, 1);
	});
});

describe('suggestSpacingFromReference', () => {
	it('identical shape to reference → returns the reference sidebearings', () => {
		const ref = measureSpacing([rect(100, 0, 400, 700)], { bottom: 0, top: 700, samples: 128 })!;
		const glyph = measureSpacing([rect(50, 0, 350, 700)], { bottom: 0, top: 700, samples: 128 })!;
		// Both rectangles → zero areas on both sides. Suggested sidebearings
		// should equal the reference's exactly.
		const out = suggestSpacingFromReference(glyph, {
			measurement: ref,
			leftSidebearing: 80,
			rightSidebearing: 80
		});
		expect(out.leftSidebearing).toBe(80);
		expect(out.rightSidebearing).toBe(80);
	});

	it("triangle with overhanging left area gets a tighter left sidebearing", () => {
		// Reference: a clean rectangle with 80fu sidebearings each side.
		// Glyph: a left-overhang triangle (V-like) — its area extends into
		// the left margin, so the suggested left sidebearing should be
		// LOWER than the reference's, compensating for the visual whitespace
		// the wedge already provides.
		const ref = measureSpacing([rect(100, 0, 400, 700)], { bottom: 0, top: 700, samples: 256 })!;
		const wedge: BezierContour = {
			closed: true,
			winding: 'cw',
			commands: [
				{ type: 'M', x: 100, y: 700 },
				{ type: 'L', x: 400, y: 0 },
				{ type: 'L', x: 400, y: 700 },
				{ type: 'L', x: 100, y: 700 },
				{ type: 'Z' }
			]
		};
		const glyph = measureSpacing([wedge], { bottom: 0, top: 700, samples: 256 })!;
		const out = suggestSpacingFromReference(glyph, {
			measurement: ref,
			leftSidebearing: 80,
			rightSidebearing: 80
		});
		expect(out.leftSidebearing).toBeLessThan(80);
	});

	it('confidence scales with inkedFraction', () => {
		const ref = measureSpacing([rect(100, 0, 400, 700)], { bottom: 0, top: 700, samples: 128 })!;
		// Glyph with only ~40% inked rows in the zone.
		const partial = measureSpacing([rect(100, 0, 400, 280)], {
			bottom: 0,
			top: 700,
			samples: 128
		})!;
		const out = suggestSpacingFromReference(partial, {
			measurement: ref,
			leftSidebearing: 80,
			rightSidebearing: 80
		});
		expect(out.confidence).toBeLessThan(0.7);
		expect(out.confidence).toBeGreaterThan(0.3);
	});
});
