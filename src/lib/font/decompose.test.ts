import { describe, expect, it } from 'vitest';
import { decomposeCodepoint, findComposableCandidates } from './decompose';
import type { BezierContour, Glyph, Project } from './types';

const square: BezierContour = {
	closed: true,
	winding: 'cw',
	commands: [
		{ type: 'M', x: 0, y: 0 },
		{ type: 'L', x: 100, y: 0 },
		{ type: 'L', x: 100, y: 100 },
		{ type: 'L', x: 0, y: 100 },
		{ type: 'Z' }
	]
};

const drawnGlyph = (cp: number): Glyph => ({
	codepoint: cp,
	name: `glyph-${cp}`,
	status: 'draft',
	advanceWidth: 500,
	leftSidebearing: 50,
	rightSidebearing: 50,
	contours: [square],
	updatedAt: '2026-05-21'
});

const emptyGlyph = (cp: number): Glyph => ({
	codepoint: cp,
	name: `glyph-${cp}`,
	status: 'empty',
	advanceWidth: 500,
	leftSidebearing: 50,
	rightSidebearing: 50,
	contours: [],
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

describe('decomposeCodepoint', () => {
	it('returns null for an undecomposable codepoint', () => {
		const project = makeProject({ 0x41: drawnGlyph(0x41) });
		expect(decomposeCodepoint(0x41, project)).toBeNull();
	});

	it('decomposes Á (U+00C1) → A + COMBINING ACUTE', () => {
		const project = makeProject({
			0xc1: emptyGlyph(0xc1),
			0x41: drawnGlyph(0x41),  // A
			0x301: drawnGlyph(0x301) // ́ (combining acute)
		});
		const out = decomposeCodepoint(0xc1, project);
		expect(out).not.toBeNull();
		expect(out!.references).toHaveLength(2);
		expect(out!.references[0].baseCodepoint).toBe(0x41);
		expect(out!.references[1].baseCodepoint).toBe(0x301);
		expect(out!.missing).toEqual([]);
	});

	it('reports missing components when base or mark is undrawn', () => {
		const project = makeProject({
			0xc1: emptyGlyph(0xc1)
			// A and combining acute not drawn
		});
		const out = decomposeCodepoint(0xc1, project);
		expect(out!.references).toEqual([]);
		expect(out!.missing).toEqual(expect.arrayContaining([0x41, 0x301]));
	});

	it('handles double-mark decomposition (e.g. ǟ = a + combining diaeresis + combining macron)', () => {
		// U+01DF LATIN SMALL LETTER A WITH DIAERESIS AND MACRON
		// → 0061 a + 0308 ̈ + 0304 ̄
		const project = makeProject({
			0x1df: emptyGlyph(0x1df),
			0x61: drawnGlyph(0x61),
			0x308: drawnGlyph(0x308),
			0x304: drawnGlyph(0x304)
		});
		const out = decomposeCodepoint(0x1df, project);
		expect(out!.references).toHaveLength(3);
		expect(out!.references.map((r) => r.baseCodepoint)).toEqual([0x61, 0x308, 0x304]);
	});
});

describe('findComposableCandidates', () => {
	it('picks up empty precomposed glyphs whose components are drawn', () => {
		const project = makeProject({
			0x41: drawnGlyph(0x41),    // A
			0x301: drawnGlyph(0x301),  // combining acute
			0xc1: emptyGlyph(0xc1),    // Á — composable
			0xc2: emptyGlyph(0xc2)     // Â — NOT composable (no combining circumflex)
		});
		const candidates = findComposableCandidates(project);
		expect(candidates).toHaveLength(1);
		expect(candidates[0].codepoint).toBe(0xc1);
	});

	it('skips glyphs that already have contours', () => {
		const project = makeProject({
			0x41: drawnGlyph(0x41),
			0x301: drawnGlyph(0x301),
			0xc1: drawnGlyph(0xc1) // Á — already manually drawn
		});
		expect(findComposableCandidates(project)).toEqual([]);
	});

	it('skips glyphs that already have components', () => {
		const project = makeProject({
			0x41: drawnGlyph(0x41),
			0x301: drawnGlyph(0x301),
			0xc1: {
				...emptyGlyph(0xc1),
				components: [{ baseCodepoint: 0x41, offsetX: 0, offsetY: 0 }]
			}
		});
		expect(findComposableCandidates(project)).toEqual([]);
	});

	it('skips undecomposable empties', () => {
		// "A" is empty and undecomposable — should not appear as a candidate
		const project = makeProject({
			0x41: emptyGlyph(0x41)
		});
		expect(findComposableCandidates(project)).toEqual([]);
	});
});
