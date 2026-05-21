import { describe, expect, it } from 'vitest';
import { sampleGlyphSilhouette } from './silhouette';
import { evaluateKerningSuggester } from './kerning-quality';
import type { KerningCorpus } from './kerning-quality';
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

const makeGlyph = (contours: BezierContour[], advance: number) => ({
	silhouette: sampleGlyphSilhouette(contours, 0, 700, { samples: 128 }),
	advanceWidth: advance
});

describe('evaluateKerningSuggester', () => {
	it('zero-error corpus → MAE 0', () => {
		// Reference glyph: simple cap-shaped rectangle. Pair under test is
		// the SAME pair as reference → suggester returns 0 → expected 0 →
		// no error.
		const H = makeGlyph([rect(80, 0, 320, 500)], 400);
		const corpus: KerningCorpus = {
			reference: { left: H, right: H },
			cases: [
				{ label: 'HH', left: H, right: H, expected: 0 },
				{ label: 'HH-2', left: H, right: H, expected: 0 }
			]
		};
		const report = evaluateKerningSuggester(corpus);
		expect(report.n).toBe(2);
		expect(report.mae).toBe(0);
		expect(report.median).toBe(0);
		expect(report.max).toBe(0);
	});

	it('synthetic pair with known kern → matches expected within rounding', () => {
		// Reference: HH with natural gap = 160 (each H has LSB=80, RSB=80,
		// width=240, advance=400 → 400+80-320 = 160).
		// Test pair: same H plus a wide-LSB right glyph (200) → natural gap
		// = 400+200-320 = 280. Suggester should return 160-280 = -120.
		const H = makeGlyph([rect(80, 0, 320, 500)], 400);
		const wide = makeGlyph([rect(200, 0, 320, 500)], 400);
		const corpus: KerningCorpus = {
			reference: { left: H, right: H },
			cases: [
				// Suggested delta should be -120; foundry shipped -118 ≈ close.
				{ label: 'H wide', left: H, right: wide, expected: -118 }
			]
		};
		const report = evaluateKerningSuggester(corpus);
		expect(report.n).toBe(1);
		// |suggested -120 vs expected -118| = 2 fu.
		expect(report.mae).toBe(2);
		expect(report.median).toBe(2);
		expect(report.max).toBe(2);
		expect(report.rows[0]).toEqual({
			label: 'H wide',
			expected: -118,
			suggested: -120,
			absError: 2
		});
	});

	it('drops cases where suggester returns null', () => {
		// Pair whose silhouettes overlap with reference fine; ref pair itself
		// has no inked-scan overlap → suggester returns null → case dropped.
		const inkedBottom = makeGlyph([rect(0, 0, 100, 200)], 200);
		const inkedTop = makeGlyph([rect(0, 400, 100, 600)], 200);
		const normal = makeGlyph([rect(0, 0, 100, 500)], 200);
		const corpus: KerningCorpus = {
			reference: { left: inkedBottom, right: inkedTop },
			cases: [{ label: 'NN', left: normal, right: normal, expected: 0 }]
		};
		const report = evaluateKerningSuggester(corpus);
		expect(report.n).toBe(0);
		expect(report.mae).toBe(0);
		expect(report.rows).toEqual([]);
	});

	it('MAE / median / max calculated correctly across a small corpus', () => {
		// Build a corpus with known per-row errors of {0, 2, 5, 9}:
		// MAE = 4, median = 3.5, max = 9.
		const H = makeGlyph([rect(80, 0, 320, 500)], 400);
		const wA = makeGlyph([rect(200, 0, 320, 500)], 400); // natural gap = 280; sugg -120
		const wB = makeGlyph([rect(180, 0, 320, 500)], 400); // natural gap = 260; sugg -100
		const wC = makeGlyph([rect(160, 0, 320, 500)], 400); // natural gap = 240; sugg -80
		const corpus: KerningCorpus = {
			reference: { left: H, right: H },
			cases: [
				{ label: 'p0', left: H, right: H, expected: 0 }, // sugg 0, exp 0 → 0
				{ label: 'p1', left: H, right: wA, expected: -118 }, // sugg -120 → 2
				{ label: 'p2', left: H, right: wB, expected: -95 }, // sugg -100 → 5
				{ label: 'p3', left: H, right: wC, expected: -71 } //  sugg -80 → 9
			]
		};
		const report = evaluateKerningSuggester(corpus);
		expect(report.n).toBe(4);
		expect(report.mae).toBe(4);
		// errors sorted: 0, 2, 5, 9 → median = (2+5)/2 = 3.5
		expect(report.median).toBe(3.5);
		expect(report.max).toBe(9);
	});

	it('empty corpus → all metrics zero, n=0', () => {
		const H = makeGlyph([rect(0, 0, 100, 500)], 200);
		const corpus: KerningCorpus = { reference: { left: H, right: H }, cases: [] };
		const report = evaluateKerningSuggester(corpus);
		expect(report.n).toBe(0);
		expect(report.mae).toBe(0);
		expect(report.median).toBe(0);
		expect(report.max).toBe(0);
		expect(report.rows).toEqual([]);
	});
});
