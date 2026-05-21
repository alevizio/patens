import { describe, expect, it } from 'vitest';
import { expandSubset, filterKerningToSubset, SUBSET_PRESETS } from './subset';
import type { Glyph, Project } from './types';

const baseGlyph = (cp: number, name: string, components: Glyph['components'] = []): Glyph => ({
	codepoint: cp,
	name,
	status: 'draft',
	advanceWidth: 500,
	leftSidebearing: 50,
	rightSidebearing: 50,
	contours: components.length > 0 ? [] : [
		{
			closed: true,
			winding: 'cw',
			commands: [
				{ type: 'M', x: 0, y: 0 },
				{ type: 'L', x: 100, y: 0 },
				{ type: 'L', x: 100, y: 100 },
				{ type: 'L', x: 0, y: 100 },
				{ type: 'Z' }
			]
		}
	],
	components: components.length > 0 ? components : undefined,
	updatedAt: '2026-05-21'
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

describe('expandSubset', () => {
	it('always includes .notdef + space', () => {
		const project = makeProject({ 0x41: baseGlyph(0x41, 'A') });
		const { included } = expandSubset(project, [0x41]);
		expect(included.has(0)).toBe(true);
		expect(included.has(0x20)).toBe(true);
		expect(included.has(0x41)).toBe(true);
	});

	it('pulls in composite-reference base glyphs', () => {
		// Á (0xC1) is a composite of A (0x41) + COMBINING ACUTE (0x301)
		const project = makeProject({
			0xc1: baseGlyph(0xc1, 'Aacute', [
				{ baseCodepoint: 0x41, offsetX: 0, offsetY: 0 },
				{ baseCodepoint: 0x301, offsetX: 0, offsetY: 0 }
			]),
			0x41: baseGlyph(0x41, 'A'),
			0x301: baseGlyph(0x301, 'acutecomb')
		});
		const { included } = expandSubset(project, [0xc1]);
		expect(included.has(0xc1)).toBe(true);
		expect(included.has(0x41)).toBe(true); // pulled in transitively
		expect(included.has(0x301)).toBe(true); // pulled in transitively
	});

	it('handles transitive composite references', () => {
		// 0x1F00 → composite of 0xC1 + 0x300
		// 0xC1 → composite of 0x41 + 0x301
		// Expanding 0x1F00 must pull in 0xC1, 0x300, 0x41, 0x301.
		const project = makeProject({
			0x1f00: baseGlyph(0x1f00, 'doubleAcute', [
				{ baseCodepoint: 0xc1, offsetX: 0, offsetY: 0 },
				{ baseCodepoint: 0x300, offsetX: 0, offsetY: 0 }
			]),
			0xc1: baseGlyph(0xc1, 'Aacute', [
				{ baseCodepoint: 0x41, offsetX: 0, offsetY: 0 },
				{ baseCodepoint: 0x301, offsetX: 0, offsetY: 0 }
			]),
			0x41: baseGlyph(0x41, 'A'),
			0x300: baseGlyph(0x300, 'gravecomb'),
			0x301: baseGlyph(0x301, 'acutecomb')
		});
		const { included } = expandSubset(project, [0x1f00]);
		for (const cp of [0x1f00, 0xc1, 0x41, 0x300, 0x301]) {
			expect(included.has(cp)).toBe(true);
		}
	});

	it('returns only the codepoint-mapped glyphs in the subset', () => {
		const project = makeProject({
			0x41: baseGlyph(0x41, 'A'),
			0x42: baseGlyph(0x42, 'B'),
			0x43: baseGlyph(0x43, 'C')
		});
		const { glyphs, included } = expandSubset(project, [0x41]);
		expect(Object.keys(glyphs).map(Number).sort()).toEqual([0x41]);
		expect(included.has(0x42)).toBe(false);
		expect(included.has(0x43)).toBe(false);
	});
});

describe('filterKerningToSubset', () => {
	it('drops pairs whose codepoint is outside the subset', () => {
		const included = new Set([0x41, 0x56]);
		const out = filterKerningToSubset(
			[
				{ left: 0x41, right: 0x56, value: -80 },  // both in
				{ left: 0x41, right: 0x57, value: -60 }   // right NOT in
			],
			included
		);
		expect(out).toHaveLength(1);
		expect(out[0]).toEqual({ left: 0x41, right: 0x56, value: -80 });
	});

	it('preserves class-vs-class pairs (both sides string)', () => {
		const included = new Set([0x41]);
		const out = filterKerningToSubset(
			[
				{ left: '@A_left', right: '@V_right', value: -80 } // class-vs-class
			],
			included
		);
		// Class-vs-class survives subsetting regardless of `included`;
		// class expansion later filters to subset-resolved members.
		expect(out).toHaveLength(1);
	});

	it('drops class-vs-codepoint pair when the codepoint is outside the subset', () => {
		const included = new Set([0x41]);
		const out = filterKerningToSubset(
			[{ left: '@A_left', right: 0x56, value: -80 }],
			included
		);
		// Right (0x56) isn't in subset → drop.
		expect(out).toHaveLength(0);
	});
});

describe('SUBSET_PRESETS', () => {
	it('basic-latin covers 0x20..0x7E', () => {
		const cps = SUBSET_PRESETS['basic-latin'].codepoints;
		expect(cps).toContain(0x20);
		expect(cps).toContain(0x7e);
		expect(cps.length).toBe(0x7e - 0x20 + 1);
	});

	it('digits covers 0-9', () => {
		expect(SUBSET_PRESETS['digits'].codepoints).toEqual([
			0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39
		]);
	});
});
