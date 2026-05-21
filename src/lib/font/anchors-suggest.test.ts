import { describe, expect, it } from 'vitest';
import { suggestAnchors, findAnchorDrift } from './anchors-suggest';
import type { BezierContour, Glyph, Project } from './types';

const rect = (xMin: number, yMin: number, xMax: number, yMax: number): BezierContour => ({
	closed: true,
	winding: 'cw',
	commands: [
		{ type: 'M', x: xMin, y: yMin },
		{ type: 'L', x: xMax, y: yMin },
		{ type: 'L', x: xMax, y: yMax },
		{ type: 'L', x: xMin, y: yMax },
		{ type: 'Z' }
	]
});

const makeGlyph = (
	codepoint: number,
	contours: BezierContour[] = [],
	overrides: Partial<Glyph> = {}
): Glyph => ({
	codepoint,
	name: `g-${codepoint}`,
	status: 'draft',
	advanceWidth: 500,
	leftSidebearing: 50,
	rightSidebearing: 50,
	contours,
	updatedAt: '2026-05-21',
	...overrides
});

const makeProject = (glyphs: Record<number, Glyph>): Project => ({
	id: 't',
	name: 'T',
	description: undefined,
	metadata: {
		familyName: 'T',
		styleName: 'R',
		designer: '',
		copyright: '',
		license: '',
		version: '1',
		fsType: 0,
		designerURL: '',
		manufacturer: '',
		licenseURL: '',
		vendorID: 'T'
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
	kerning: [],
	features: { kern: true, liga: true },
	axes: [],
	masters: [],
	instances: [],
	palettes: [],
	createdAt: '2026-05-20',
	updatedAt: '2026-05-21'
});

describe('suggestAnchors', () => {
	it('returns empty for an undrawn glyph', () => {
		const project = makeProject({ 0x41: makeGlyph(0x41) });
		expect(suggestAnchors(makeGlyph(0x41), project)).toEqual([]);
	});

	it('suggests top + bottom anchors for an uppercase Latin glyph at visual centre', () => {
		// "A" — bbox from x=100 to x=400 → visual centre = 250
		const A = makeGlyph(0x41, [rect(100, 0, 400, 700)]);
		const project = makeProject({ 0x41: A });
		const out = suggestAnchors(A, project);
		expect(out).toHaveLength(2);
		expect(out.find((a) => a.name === 'top')?.x).toBe(250);
		expect(out.find((a) => a.name === 'top')?.y).toBe(730); // capHeight 700 + 30 buffer
		expect(out.find((a) => a.name === 'bottom')?.x).toBe(250);
		expect(out.find((a) => a.name === 'bottom')?.y).toBe(0);
	});

	it('suggests anchors at x-height for lowercase', () => {
		const a = makeGlyph(0x61, [rect(100, 0, 400, 500)]);
		const project = makeProject({ 0x61: a });
		const out = suggestAnchors(a, project);
		expect(out.find((a) => a.name === 'top')?.y).toBe(530); // xHeight 500 + 30
	});

	it("suggests an underscore-prefixed `_top` attach anchor for combining marks", () => {
		// Combining acute (U+0301) typically lives above baseline with a small bbox
		const acute = makeGlyph(0x301, [rect(80, 550, 220, 700)]);
		const project = makeProject({ 0x301: acute });
		const out = suggestAnchors(acute, project);
		expect(out).toHaveLength(1);
		expect(out[0].name).toBe('_top');
		expect(out[0].x).toBe(150); // bbox centre
		expect(out[0].y).toBe(550); // bbox bottom — attach point
	});

	it("suggests nothing for codepoints outside the known ranges (e.g. digits)", () => {
		const digit = makeGlyph(0x30, [rect(100, 0, 400, 700)]);
		const project = makeProject({ 0x30: digit });
		expect(suggestAnchors(digit, project)).toEqual([]);
	});
});

describe('findAnchorDrift', () => {
	it('picks up glyphs whose existing anchors drift from the suggestion', () => {
		// A drawn with anchors at advance-centre (250), but its bbox is
		// offset so the actual visual centre is 300 — anchors drift 50fu.
		const A = makeGlyph(0x41, [rect(200, 0, 400, 700)], {
			anchors: [
				{ name: 'top', x: 250, y: 730 },
				{ name: 'bottom', x: 250, y: 0 }
			]
		});
		const project = makeProject({ 0x41: A });
		const drift = findAnchorDrift(project);
		expect(drift).toHaveLength(1);
		expect(drift[0].codepoint).toBe(0x41);
	});

	it('does NOT flag glyphs whose anchors are within 8fu of the suggestion', () => {
		const A = makeGlyph(0x41, [rect(100, 0, 400, 700)], {
			anchors: [
				{ name: 'top', x: 252, y: 728 }, // both within 8fu of suggestion
				{ name: 'bottom', x: 248, y: 2 }
			]
		});
		const project = makeProject({ 0x41: A });
		expect(findAnchorDrift(project)).toEqual([]);
	});

	it('flags glyphs that are entirely missing the suggested anchors', () => {
		const A = makeGlyph(0x41, [rect(100, 0, 400, 700)]);
		const project = makeProject({ 0x41: A });
		const drift = findAnchorDrift(project);
		expect(drift).toHaveLength(1);
	});

	it('skips empty glyphs', () => {
		const project = makeProject({ 0x41: makeGlyph(0x41) });
		expect(findAnchorDrift(project)).toEqual([]);
	});
});
