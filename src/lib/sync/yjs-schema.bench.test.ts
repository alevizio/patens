/**
 * Phase C Day 3d preparation — round-trip cost profiling for
 * `projectToYDoc` (paid once on load) and `yDocToProject` (paid on
 * every mutator that triggers refreshFromDoc).
 *
 * The drawing-tool `updateGlyph` mutator is the only remaining
 * un-migrated mutator on the Y.Doc path. It fires up to 60 times
 * per second during a brush stroke, and each call now would
 * trigger:
 *
 *   doc.transact(set glyph) → 'update' event → refreshFromDoc →
 *   yDocToProject(doc) → this.project = next
 *
 * If `yDocToProject` is sub-frame at realistic project sizes, plain
 * migration is safe. If not, patch-based reconciliation
 * (refreshFromDoc applies only the changed glyph instead of
 * rebuilding the whole project) needs to land first.
 *
 * This file isn't asserting performance — different machines run at
 * different speeds — but it logs the per-call cost so a human can
 * read the numbers and decide. The `expect()`s are sanity bounds
 * that would only fail if something is catastrophically slow (>1s
 * for 500 glyphs).
 */

import { describe, expect, it } from 'vitest';
import { projectToYDoc, yDocToProject } from './yjs-schema';
import type { BezierContour, Glyph, Project } from '$lib/font/types';

const synthGlyph = (codepoint: number): Glyph => {
	// Average glyph in a typical sans-serif font has ~30-80 commands
	// across 2-3 contours. Approximate it with two triangles, one cubic
	// per side, to keep the JSON shape representative without exploding
	// test runtime.
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
		contours: [contour(0), contour(50), contour(100)],
		updatedAt: '2026-05-21'
	};
};

const synthProject = (glyphCount: number): Project => {
	const glyphs: Record<number, Glyph> = {};
	// Latin range + extended; keep contiguous so codepoints stay realistic
	for (let i = 0; i < glyphCount; i++) {
		const cp = 0x0021 + i; // start at '!' to skip control chars
		glyphs[cp] = synthGlyph(cp);
	}
	return {
		id: `synth-${glyphCount}`,
		name: `Synthetic ${glyphCount}`,
		description: undefined,
		metadata: {
			familyName: 'Synth',
			styleName: 'Regular',
			designer: 'Bench',
			copyright: '',
			license: '',
			version: '1.0',
			fsType: 0,
			designerURL: '',
			manufacturer: '',
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
		glyphs,
		kerning: Array.from({ length: Math.min(glyphCount, 100) }, (_, i) => ({
			left: 0x0041 + (i % 26),
			right: 0x0061 + (i % 26),
			value: -50 - (i % 30)
		})),
		features: { kern: true, liga: true, autoFeatures: true, disabledAutoFeatures: [] },
		axes: [],
		masters: [],
		instances: [],
		palettes: [],
		createdAt: '2026-05-20',
		updatedAt: '2026-05-21'
	};
};

const measure = (label: string, fn: () => void, iters = 10): number => {
	// Warm-up to let the JIT optimise.
	fn();
	const t0 = performance.now();
	for (let i = 0; i < iters; i++) fn();
	const dt = (performance.now() - t0) / iters;
	console.log(`  ${label}: ${dt.toFixed(2)}ms / call`);
	return dt;
};

describe('Phase C profiling — schema round-trip cost', () => {
	for (const size of [50, 100, 200, 500]) {
		it(`size=${size}: projectToYDoc + yDocToProject`, () => {
			const p = synthProject(size);
			console.log(`\n[${size} glyphs]`);
			const encDt = measure('projectToYDoc (one-time on load)', () => {
				projectToYDoc(p);
			});
			const doc = projectToYDoc(p);
			const decDt = measure('yDocToProject (paid per refreshFromDoc)', () => {
				yDocToProject(doc);
			});
			// Catastrophic-floor sanity bounds: 1s per call would mean
			// something has gone fundamentally wrong with the schema.
			// Real concern threshold is ~5ms (sub-frame at 60fps); the
			// numbers in the console output are the data point a human
			// reads to make the Day 3d call.
			expect(encDt).toBeLessThan(1000);
			expect(decDt).toBeLessThan(1000);
		});
	}
});
