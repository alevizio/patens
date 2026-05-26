/**
 * buildFont() perf regression guard.
 *
 * Measures the cost of the OpenType emit pipeline across project
 * sizes. Mirrors the shape of audit.bench.test.ts — logs per-call
 * cost without making the test fail on slow CI hardware. The
 * sanity bound (<2s for 500 glyphs) only fires on catastrophic
 * regression.
 */

import { describe, expect, it } from 'vitest';
import { buildFont } from './export';
import type { BezierContour, Glyph, Project } from './types';

const synthGlyph = (codepoint: number): Glyph => {
	// Two-contour shape exercises the contour-to-Path path + the
	// boolean union pass that runs during export's notdef-builder.
	const contour = (offset: number): BezierContour => ({
		closed: true,
		winding: 'cw',
		commands: [
			{ type: 'M', x: 0 + offset, y: 0 },
			{ type: 'C', x1: 50, y1: 50, x2: 100, y2: 50, x: 150 + offset, y: 0 },
			{ type: 'L', x: 200 + offset, y: 100 },
			{ type: 'C', x1: 150, y1: 150, x2: 50, y2: 150, x: 0 + offset, y: 100 },
			{ type: 'Z' }
		]
	});
	return {
		codepoint,
		name: `glyph-${codepoint}`,
		status: 'draft',
		advanceWidth: 600,
		leftSidebearing: 50,
		rightSidebearing: 50,
		contours: [contour(0), contour(50)],
		updatedAt: '2026-05-25'
	} as Glyph;
};

const synthProject = (glyphCount: number): Project =>
	({
		id: `bench-export-${glyphCount}`,
		name: `Synth ${glyphCount}`,
		metadata: {
			familyName: 'BenchExport',
			styleName: 'Regular',
			designer: 'Bench',
			copyright: '© 2026',
			license: 'MIT',
			version: '1.000',
			fsType: 0,
			designerURL: '',
			manufacturer: 'Bench',
			licenseURL: '',
			vendorID: 'BNCH'
		},
		metrics: {
			unitsPerEm: 1000,
			ascender: 800,
			descender: -200,
			capHeight: 700,
			xHeight: 500,
			defaultSidebearing: 50
		},
		glyphs: Object.fromEntries(
			Array.from({ length: glyphCount }, (_, i) => {
				const cp = 0x0041 + i;
				return [cp, synthGlyph(cp)];
			})
		),
		kerning: Array.from({ length: Math.min(glyphCount, 100) }, (_, i) => ({
			left: 0x0041 + (i % 26),
			right: 0x0061 + (i % 26),
			value: -50 - (i % 30)
		})),
		classes: [],
		features: { kern: true, liga: true, autoFeatures: true, disabledAutoFeatures: [] },
		axes: [],
		masters: [],
		instances: [],
		brief: {},
		samples: {},
		changelog: [],
		decisions: [],
		updatedAt: '2026-05-25',
		createdAt: '2026-05-25'
	}) as Project;

const measure = (label: string, fn: () => unknown, iterations: number) => {
	fn(); // warm-up
	const start = performance.now();
	for (let i = 0; i < iterations; i++) fn();
	const total = performance.now() - start;
	const per = total / iterations;
	// eslint-disable-next-line no-console
	console.log(`  ${label.padEnd(28)} ${per.toFixed(2)}ms/call (${iterations}× iter)`);
	return per;
};

describe('buildFont — per-call cost', () => {
	// Smaller iteration counts than audit.bench because buildFont is
	// heavier (opentype.js Glyph construction + OTF binary emit).
	const SIZES: ReadonlyArray<{ n: number; iter: number }> = [
		{ n: 50, iter: 5 },
		{ n: 162, iter: 3 },
		{ n: 500, iter: 2 }
	];

	for (const { n, iter } of SIZES) {
		it(`size=${n}: buildFont()`, () => {
			const project = synthProject(n);
			// eslint-disable-next-line no-console
			console.log(`\n[${n} glyphs]`);
			const cost = measure('buildFont', () => buildFont(project), iter);
			// Sanity bound — 500-glyph project on CI hardware should
			// never exceed 2 seconds. If it does, something is O(n²)
			// where it should be O(n) or the opentype.js path is hot.
			expect(cost, `${n} glyphs catastrophically slow`).toBeLessThan(2000);
		});
	}
});
