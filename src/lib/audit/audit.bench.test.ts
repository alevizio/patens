/**
 * Audit-pipeline perf regression guard.
 *
 * Logs per-call cost for auditProject + auditCompatibility +
 * preflightProject at realistic project sizes. The audit now runs in a
 * Web Worker (see src/lib/audit/audit-worker.ts) so main-thread INP
 * isn't affected by total cost — but the worker still has to finish
 * before issues land in the UI, so faster is better for "did my edit
 * fix the issue" feedback.
 *
 * The asserts are sanity bounds, not contracts; they only fail on a
 * truly catastrophic regression. The real value is the timing logs:
 * `pnpm vitest run audit.bench` and read the numbers.
 *
 * Mirrors the shape of yjs-schema.bench.test.ts.
 */

import { describe, expect, it } from 'vitest';
import {
	auditProject,
	auditCompatibility,
	preflightProject
} from '$lib/font/audit';
import type { BezierContour, Glyph, Project } from '$lib/font/types';

const synthGlyph = (codepoint: number): Glyph => {
	// Two-contour shape that exercises both the contour-shape checks
	// (self-intersection, winding, near-collinear) and the basic-bounds
	// path. Realistic-ish: typical Latin glyphs have 2–3 contours of
	// 20–40 commands each.
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
		id: `bench-${glyphCount}`,
		name: `Synth ${glyphCount}`,
		metadata: {
			familyName: 'Bench',
			styleName: 'Regular',
			designer: 'Bench harness',
			copyright: '© 2026 Bench',
			license: 'MIT',
			version: '1.000',
			fsType: 0,
			designerURL: 'https://example.com',
			manufacturer: 'Bench',
			licenseURL: 'https://example.com/license',
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
				const cp = 0x0021 + i;
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

const measure = (label: string, fn: () => unknown, iterations = 10) => {
	// Warm-up — JIT + V8 inline-cache prep. The first call usually runs
	// ~2× the steady-state cost.
	fn();
	const start = performance.now();
	for (let i = 0; i < iterations; i++) fn();
	const total = performance.now() - start;
	const per = total / iterations;
	console.log(`  ${label.padEnd(28)} ${per.toFixed(2)}ms/call (${iterations}× iter)`);
	return per;
};

describe('audit pipeline — per-call cost', () => {
	const SIZES = [50, 162, 500] as const;

	for (const n of SIZES) {
		it(`size=${n}: auditProject + auditCompatibility + preflightProject`, () => {
			const project = synthProject(n);
			console.log(`\n[${n} glyphs]`);
			const perGlyph = measure('auditProject', () => auditProject(project));
			const compat = measure('auditCompatibility', () => auditCompatibility(project));
			const preflight = measure('preflightProject', () => preflightProject(project));
			const total = perGlyph + compat + preflight;
			console.log(`  ${'TOTAL'.padEnd(28)} ${total.toFixed(2)}ms/call`);
			// Sanity bounds — only fail on catastrophic regression. 500-glyph
			// project on CI hardware should never exceed 500ms total. If it
			// does, something is O(n²) where it should be O(n).
			expect(total, `${n} glyphs catastrophically slow`).toBeLessThan(500);
		});
	}
});
