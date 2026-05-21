import { describe, expect, it } from 'vitest';
import { sampleGlyphSilhouette, silhouetteDistance } from './silhouette';
import type { BezierContour } from './types';

// Helper: build a closed contour from a list of corner points.
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

const triangle = (
	apex: { x: number; y: number },
	base: { y: number; x1: number; x2: number }
): BezierContour => ({
	closed: true,
	winding: 'cw',
	commands: [
		{ type: 'M', x: base.x1, y: base.y },
		{ type: 'L', x: base.x2, y: base.y },
		{ type: 'L', x: apex.x, y: apex.y },
		{ type: 'L', x: base.x1, y: base.y },
		{ type: 'Z' }
	]
});

describe('sampleGlyphSilhouette', () => {
	it('rectangle: every in-range scan has fixed left and right', () => {
		const samples = sampleGlyphSilhouette([rect(100, 0, 400, 700)], -200, 800, {
			samples: 64
		});
		const inside = samples.filter((s) => s.y >= 0 && s.y <= 700);
		expect(inside.length).toBeGreaterThan(0);
		for (const s of inside) {
			expect(s.left).toBe(100);
			expect(s.right).toBe(400);
		}
	});

	it('rectangle: scans outside the y-range have null left/right', () => {
		const samples = sampleGlyphSilhouette([rect(100, 0, 400, 700)], -200, 800, {
			samples: 64
		});
		const belowBaseline = samples.filter((s) => s.y < -10);
		const aboveCap = samples.filter((s) => s.y > 720);
		for (const s of belowBaseline) {
			expect(s.left).toBeNull();
			expect(s.right).toBeNull();
		}
		for (const s of aboveCap) {
			expect(s.left).toBeNull();
			expect(s.right).toBeNull();
		}
	});

	it('triangle (apex top): silhouette width narrows toward the top', () => {
		// Base 0-400 at y=0, apex at (200, 700).
		const samples = sampleGlyphSilhouette(
			[triangle({ x: 200, y: 700 }, { y: 0, x1: 0, x2: 400 })],
			-200,
			800,
			{ samples: 128 }
		);
		const inked = samples.filter((s) => s.left !== null && s.right !== null);
		// Sort by y so we can compare adjacent widths.
		inked.sort((a, b) => a.y - b.y);
		// Widths should be monotonically (weakly) decreasing — the triangle narrows.
		let prev = Infinity;
		for (const s of inked) {
			const w = (s.right as number) - (s.left as number);
			expect(w).toBeLessThanOrEqual(prev + 0.001);
			prev = w;
		}
	});

	it('multi-contour: both shapes contribute (i-dot pattern)', () => {
		// Stem (lowercase i body): 100-200 from y=0 to y=500.
		// Dot: 80-220 from y=600 to y=700.
		const stem = rect(100, 0, 200, 500);
		const dot = rect(80, 600, 220, 700);
		const samples = sampleGlyphSilhouette([stem, dot], -200, 800, { samples: 128 });
		// At dot height the silhouette should be the wider 80-220.
		const atDot = samples.find((s) => s.y > 620 && s.y < 680);
		expect(atDot?.left).toBe(80);
		expect(atDot?.right).toBe(220);
		// At stem height the narrower 100-200.
		const atStem = samples.find((s) => s.y > 200 && s.y < 300);
		expect(atStem?.left).toBe(100);
		expect(atStem?.right).toBe(200);
		// Between the two (y ≈ 550), null on both sides.
		const between = samples.find((s) => s.y > 540 && s.y < 580);
		expect(between?.left).toBeNull();
		expect(between?.right).toBeNull();
	});

	it('empty contours: every sample returns null/null', () => {
		const samples = sampleGlyphSilhouette([], -200, 800, { samples: 32 });
		expect(samples.length).toBe(32);
		for (const s of samples) {
			expect(s.left).toBeNull();
			expect(s.right).toBeNull();
		}
	});

	it('y-range guard: throws on inverted range', () => {
		expect(() => sampleGlyphSilhouette([rect(0, 0, 100, 100)], 800, -200)).toThrow();
		expect(() => sampleGlyphSilhouette([rect(0, 0, 100, 100)], 100, 100)).toThrow();
	});

	it('sample-count guard: throws when samples < 2', () => {
		expect(() => sampleGlyphSilhouette([rect(0, 0, 100, 100)], 0, 200, { samples: 1 })).toThrow();
	});

	it('default samples = 128', () => {
		const out = sampleGlyphSilhouette([rect(0, 0, 100, 100)], -200, 800);
		expect(out.length).toBe(128);
	});
});

describe('silhouetteDistance', () => {
	it('two rectangles at the same height: distance = bLeft - aRight', () => {
		// A: 0..100 at y=0..500. B: 200..300 at y=0..500. Distance should be 100.
		const a = sampleGlyphSilhouette([rect(0, 0, 100, 500)], -200, 800, { samples: 64 });
		const b = sampleGlyphSilhouette([rect(200, 0, 300, 500)], -200, 800, { samples: 64 });
		expect(silhouetteDistance(a, b)).toBe(100);
	});

	it('non-overlapping y-ranges return null', () => {
		// A: top half. B: bottom half. They never share a scan height.
		const a = sampleGlyphSilhouette([rect(0, 400, 100, 700)], -200, 800, { samples: 128 });
		const b = sampleGlyphSilhouette([rect(200, -150, 300, 0)], -200, 800, { samples: 128 });
		expect(silhouetteDistance(a, b)).toBeNull();
	});

	it('asymmetric profiles find the minimum gap, not the average', () => {
		// A: a vertical bar at x=0..100, full height.
		// B: an L-shape that pokes out at the bottom — minimum gap is at the
		// bottom where B's leftmost edge is at x=120, so gap = 20. Elsewhere
		// B's leftmost is x=200, gap = 100. silhouetteDistance must catch
		// the 20.
		const a = sampleGlyphSilhouette([rect(0, 0, 100, 500)], -200, 800, { samples: 128 });
		const b = sampleGlyphSilhouette(
			[rect(200, 0, 300, 500), rect(120, 0, 200, 80)],
			-200,
			800,
			{ samples: 128 }
		);
		expect(silhouetteDistance(a, b)).toBe(20);
	});

	it('mismatched sample counts throw', () => {
		const a = sampleGlyphSilhouette([rect(0, 0, 100, 500)], -200, 800, { samples: 64 });
		const b = sampleGlyphSilhouette([rect(0, 0, 100, 500)], -200, 800, { samples: 128 });
		expect(() => silhouetteDistance(a, b)).toThrow();
	});
});
