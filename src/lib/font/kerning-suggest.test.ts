import { describe, expect, it } from 'vitest';
import { sampleGlyphSilhouette } from './silhouette';
import { suggestKerning } from './kerning-suggest';
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

// Helper: build a "glyph" with given contours, advance, and a silhouette
// sample on the standard 0–700 zone.
const makeGlyph = (contours: BezierContour[], advance: number) => ({
	silhouette: sampleGlyphSilhouette(contours, 0, 700, { samples: 128 }),
	advanceWidth: advance
});

describe('suggestKerning', () => {
	it('identical pair to reference → delta = 0', () => {
		// Reference and target are the same glyph (e.g. "nn") with identical
		// metrics. Suggested delta should be exactly 0.
		const n = makeGlyph([rect(80, 0, 320, 500)], 400);
		const out = suggestKerning(n, n, { left: n, right: n });
		expect(out).not.toBeNull();
		expect(out!.delta).toBe(0);
		expect(out!.confidence).toBeGreaterThan(0);
	});

	it('too-loose pair (wider RSB) → negative delta to tighten', () => {
		// Reference "HH" has 80 RSB and 80 LSB → gap ≈ 160.
		// Pair "Hi" where the right glyph has LSB 200 → natural gap ≈ 280.
		// Need to tighten by ~120 fu.
		const refGlyph = makeGlyph([rect(80, 0, 320, 500)], 400); // RSB = 400-320 = 80, LSB = 80
		const looseRight = makeGlyph([rect(200, 0, 320, 500)], 400); // LSB = 200
		const out = suggestKerning(refGlyph, looseRight, { left: refGlyph, right: refGlyph });
		expect(out).not.toBeNull();
		// Natural gap = 400 + 200 - 320 = 280
		// Target gap  = 400 +  80 - 320 = 160
		// Delta = 160 - 280 = -120
		expect(out!.delta).toBe(-120);
		expect(out!.naturalGap).toBe(280);
		expect(out!.targetGap).toBe(160);
	});

	it('too-tight pair (overlapping silhouettes) → positive delta to loosen', () => {
		// Reference: gap = 160.
		// Pair where right glyph has LSB = -40 (overhang into A's margin):
		//   natural gap = 400 + (-40) - 320 = 40 → too tight.
		// Suggested delta = 160 - 40 = +120.
		const refGlyph = makeGlyph([rect(80, 0, 320, 500)], 400);
		// Right glyph drawn at x = -40..240 with advance 400 → LSB = -40 (overhang).
		const overhang = makeGlyph([rect(-40, 0, 240, 500)], 400);
		const out = suggestKerning(refGlyph, overhang, { left: refGlyph, right: refGlyph });
		expect(out).not.toBeNull();
		expect(out!.delta).toBe(120);
	});

	it('null when pair and reference have no inked-scan overlap', () => {
		// Pair shares scan rows (both ink y=0..500) — but the reference's
		// pair gap can't be computed because its glyphs ink different bands.
		// Build a reference left ink at y=0..200, right ink at y=400..600.
		const above = makeGlyph([rect(0, 0, 100, 200)], 200);
		const below = makeGlyph([rect(0, 400, 100, 600)], 200);
		const pairLeft = makeGlyph([rect(0, 0, 100, 500)], 200);
		const pairRight = makeGlyph([rect(0, 0, 100, 500)], 200);
		const out = suggestKerning(pairLeft, pairRight, { left: above, right: below });
		expect(out).toBeNull();
	});

	it('mismatched sample counts throw', () => {
		const a = makeGlyph([rect(0, 0, 100, 500)], 200);
		const b = {
			silhouette: sampleGlyphSilhouette([rect(0, 0, 100, 500)], 0, 700, { samples: 64 }),
			advanceWidth: 200
		};
		expect(() => suggestKerning(a, b, { left: a, right: a })).toThrow();
	});

	it("confidence drops when the pair barely overlaps in y", () => {
		// Reference: full-height-overlap pair (high reference coverage).
		const ref = makeGlyph([rect(0, 0, 100, 700)], 200);
		// Pair: each glyph inks only ~15% of the height. Low pair coverage.
		const sliver = makeGlyph([rect(0, 100, 100, 200)], 200);
		const out = suggestKerning(sliver, sliver, { left: ref, right: ref });
		expect(out).not.toBeNull();
		expect(out!.confidence).toBeLessThan(0.3);
	});
});
