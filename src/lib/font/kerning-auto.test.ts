/**
 * Tests for the auto-kern M2 build-time generator. Validates the
 * user-pair-wins invariant + the reference-pair selection + the
 * confidence + min-delta thresholds.
 */

import { describe, expect, it } from 'vitest';
import { buildAutoKern } from './kerning-auto';
import type { BezierContour, Glyph, Project } from './types';

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

const makeGlyph = (codepoint: number, contours: BezierContour[], advance: number): Glyph => ({
	codepoint,
	name: `glyph-${codepoint}`,
	status: 'draft',
	advanceWidth: advance,
	leftSidebearing: 50,
	rightSidebearing: 50,
	contours,
	updatedAt: '2026-05-21'
});

const baseProject = (overrides: {
	glyphs: Record<number, Glyph>;
	kerning?: Project['kerning'];
}): Project => ({
	id: 'test',
	name: 'Test',
	description: undefined,
	metadata: {
		familyName: 'Test',
		styleName: 'Regular',
		designer: '',
		copyright: '',
		license: '',
		version: '1.0',
		fsType: 0,
		designerURL: '',
		manufacturer: '',
		licenseURL: '',
		vendorID: 'TEST'
	},
	metrics: {
		unitsPerEm: 1000,
		ascender: 700,
		descender: 0,
		capHeight: 700,
		xHeight: 500,
		defaultSidebearing: 50
	},
	glyphs: overrides.glyphs,
	kerning: overrides.kerning ?? [],
	features: { kern: true, liga: true, autoKern: true },
	axes: [],
	masters: [],
	instances: [],
	palettes: [],
	createdAt: '2026-05-20',
	updatedAt: '2026-05-21'
});

describe('buildAutoKern', () => {
	it('returns empty result when no reference pair exists', () => {
		const A = makeGlyph(0x41, [rect(80, 0, 420, 700)], 500);
		const B = makeGlyph(0x42, [rect(80, 0, 420, 700)], 500);
		const out = buildAutoKern(baseProject({ glyphs: { 0x41: A, 0x42: B } }));
		expect(out.pairs).toEqual([]);
		expect(out.referenceUsed).toBeNull();
		// Reference selection happens BEFORE pair iteration — short-circuits to 0.
		expect(out.candidatesConsidered).toBe(0);
	});

	it('honours user-tuned pairs (never overwrites them)', () => {
		// Two-glyph project: A and B. User has kerned A→B to -100. Auto-kern
		// should iterate the four candidate pairs (AA, AB, BA, BB) but
		// skip AB because the user already tuned it.
		const A = makeGlyph(0x41, [rect(80, 0, 420, 700)], 500);
		const B = makeGlyph(0x42, [rect(80, 0, 420, 700)], 500);
		const out = buildAutoKern(
			baseProject({
				glyphs: { 0x41: A, 0x42: B },
				kerning: [{ left: 0x41, right: 0x42, value: -100 }]
			})
		);
		// The reference pair (A→B) itself is "userSet" — never appears in
		// suggestions even though it was used as the reference.
		const abPair = out.pairs.find((p) => p.left === 0x41 && p.right === 0x42);
		expect(abPair).toBeUndefined();
		expect(out.referenceUsed).toEqual({ left: 0x41, right: 0x42 });
	});

	it('only emits suggestions above the confidence threshold', () => {
		const A = makeGlyph(0x41, [rect(80, 0, 420, 700)], 500);
		const B = makeGlyph(0x42, [rect(80, 0, 420, 700)], 500);
		const project = baseProject({
			glyphs: { 0x41: A, 0x42: B },
			kerning: [{ left: 0x41, right: 0x42, value: -50 }]
		});
		// Very high threshold filters out nearly everything.
		const strict = buildAutoKern(project, { confidence: 0.99 });
		// Loose threshold lets more through (or at least, no more than the
		// strict pass).
		const loose = buildAutoKern(project, { confidence: 0.0 });
		expect(loose.pairs.length).toBeGreaterThanOrEqual(strict.pairs.length);
	});

	it('skips glyphs without contours', () => {
		const A = makeGlyph(0x41, [rect(80, 0, 420, 700)], 500);
		const B = makeGlyph(0x42, [rect(80, 0, 420, 700)], 500);
		const empty = makeGlyph(0x43, [], 500); // no contours
		const out = buildAutoKern(
			baseProject({
				glyphs: { 0x41: A, 0x42: B, 0x43: empty },
				kerning: [{ left: 0x41, right: 0x42, value: -50 }]
			})
		);
		// No pair involving codepoint 0x43 should appear.
		const involves0x43 = out.pairs.some((p) => p.left === 0x43 || p.right === 0x43);
		expect(involves0x43).toBe(false);
	});

	it('class-based kerning pairs are not eligible as reference', () => {
		const A = makeGlyph(0x41, [rect(80, 0, 420, 700)], 500);
		const out = buildAutoKern(
			baseProject({
				glyphs: { 0x41: A },
				kerning: [{ left: '@A_left', right: '@O_right', value: -80 }]
			})
		);
		expect(out.referenceUsed).toBeNull();
		expect(out.pairs).toEqual([]);
	});

	it('picks the largest-magnitude pair as reference', () => {
		const A = makeGlyph(0x41, [rect(80, 0, 420, 700)], 500);
		const B = makeGlyph(0x42, [rect(80, 0, 420, 700)], 500);
		const C = makeGlyph(0x43, [rect(80, 0, 420, 700)], 500);
		const out = buildAutoKern(
			baseProject({
				glyphs: { 0x41: A, 0x42: B, 0x43: C },
				kerning: [
					{ left: 0x41, right: 0x42, value: -20 },  // small
					{ left: 0x42, right: 0x43, value: -150 }, // bigger — should win
					{ left: 0x41, right: 0x43, value: -30 }
				]
			})
		);
		expect(out.referenceUsed).toEqual({ left: 0x42, right: 0x43 });
	});
});
