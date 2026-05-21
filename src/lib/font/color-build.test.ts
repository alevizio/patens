import { describe, expect, it } from 'vitest';
import { buildColorFontPlan, resolveColorFontPlan } from './color-build';
import type { BezierContour, ColorLayer, ColorPalette, Glyph, Project } from './types';

const tri: BezierContour = {
	closed: true,
	winding: 'cw',
	commands: [
		{ type: 'M', x: 0, y: 0 },
		{ type: 'L', x: 100, y: 0 },
		{ type: 'L', x: 50, y: 100 },
		{ type: 'L', x: 0, y: 0 },
		{ type: 'Z' }
	]
};

const layer = (id: string, paletteIndex: number, hidden?: boolean): ColorLayer => ({
	id,
	contours: [tri],
	paletteIndex,
	hidden
});

const glyph = (codepoint: number, name: string, colorLayers?: ColorLayer[]): Glyph => ({
	codepoint,
	name,
	status: 'draft',
	advanceWidth: 500,
	leftSidebearing: 50,
	rightSidebearing: 50,
	contours: [tri],
	colorLayers,
	updatedAt: '2026-05-21'
});

const palette: ColorPalette = {
	id: 'p',
	name: 'P',
	colors: [
		{ r: 0, g: 0, b: 0, a: 1 },
		{ r: 255, g: 0, b: 0, a: 1 },
		{ r: 0, g: 255, b: 0, a: 1 }
	]
};

const projectFrom = (glyphs: Glyph[], palettes?: ColorPalette[]): Project => ({
	id: 'p',
	name: 'test',
	metadata: {
		familyName: 'Test',
		styleName: 'Regular',
		designer: '',
		copyright: '',
		license: '',
		version: '1.000'
	},
	metrics: {
		unitsPerEm: 1000,
		ascender: 800,
		descender: -200,
		capHeight: 700,
		xHeight: 500,
		defaultSidebearing: 50
	},
	glyphs: Object.fromEntries(glyphs.map((g) => [g.codepoint, g])),
	kerning: [],
	features: { kern: false, liga: false },
	palettes,
	createdAt: '2026-05-21',
	updatedAt: '2026-05-21'
});

describe('buildColorFontPlan', () => {
	it('returns empty plan when project has no palettes', () => {
		const project = projectFrom([
			glyph(0x2764, 'heart', [layer('l1', 0), layer('l2', 1)])
		]);
		const plan = buildColorFontPlan(project);
		expect(plan.syntheticGlyphs).toEqual([]);
		expect(plan.baseGlyphRecords).toEqual([]);
	});

	it('emits synthetic glyphs + base record for one color glyph', () => {
		const project = projectFrom(
			[
				glyph(0x0061, 'a'),
				glyph(0x2764, 'heart', [layer('l1', 0), layer('l2', 1)])
			],
			[palette]
		);
		const plan = buildColorFontPlan(project);
		expect(plan.syntheticGlyphs).toHaveLength(2);
		expect(plan.syntheticGlyphs[0].name).toBe('heart.color0');
		expect(plan.syntheticGlyphs[1].name).toBe('heart.color1');
		expect(plan.baseGlyphRecords).toEqual([
			{
				baseGlyphName: 'heart',
				layers: [
					{ layerGlyphName: 'heart.color0', paletteIndex: 0 },
					{ layerGlyphName: 'heart.color1', paletteIndex: 1 }
				]
			}
		]);
	});

	it('skips hidden layers', () => {
		const project = projectFrom(
			[
				glyph(0x2764, 'heart', [
					layer('l1', 0),
					layer('l2', 1, true), // hidden
					layer('l3', 2)
				])
			],
			[palette]
		);
		const plan = buildColorFontPlan(project);
		expect(plan.syntheticGlyphs).toHaveLength(2);
		// Hidden middle layer is omitted; remaining layers re-index 0, 1.
		expect(plan.syntheticGlyphs.map((g) => g.name)).toEqual([
			'heart.color0',
			'heart.color1'
		]);
		const baseRec = plan.baseGlyphRecords[0];
		expect(baseRec.layers.map((l) => l.paletteIndex)).toEqual([0, 2]);
	});

	it('skips layers with empty contours', () => {
		const emptyLayer: ColorLayer = {
			id: 'e',
			contours: [],
			paletteIndex: 1
		};
		const project = projectFrom(
			[glyph(0x2764, 'heart', [layer('l1', 0), emptyLayer])],
			[palette]
		);
		const plan = buildColorFontPlan(project);
		expect(plan.syntheticGlyphs).toHaveLength(1);
	});

	it('skips glyphs with no visible color layers entirely', () => {
		const project = projectFrom(
			[
				glyph(0x0061, 'a'), // no colorLayers
				glyph(0x2764, 'heart', []), // empty colorLayers array
				glyph(0x2702, 'scissors', [layer('l1', 0, true)]), // all hidden
				glyph(0x2603, 'snowman', [layer('l1', 0)])
			],
			[palette]
		);
		const plan = buildColorFontPlan(project);
		expect(plan.baseGlyphRecords.map((r) => r.baseGlyphName)).toEqual(['snowman']);
	});

	it('iterates glyphs in codepoint order for determinism', () => {
		// Two color glyphs at codepoints 0x2603 (snowman) and 0x2764 (heart).
		// Lower codepoint first.
		const project = projectFrom(
			[
				glyph(0x2764, 'heart', [layer('l1', 0)]),
				glyph(0x2603, 'snowman', [layer('l2', 1)])
			],
			[palette]
		);
		const plan = buildColorFontPlan(project);
		expect(plan.baseGlyphRecords.map((r) => r.baseGlyphName)).toEqual([
			'snowman',
			'heart'
		]);
	});

	it('falls back to cp<hex> name when the glyph has no name', () => {
		const g: Glyph = {
			codepoint: 0x2764,
			name: '',
			status: 'draft',
			advanceWidth: 0,
			leftSidebearing: 0,
			rightSidebearing: 0,
			contours: [],
			colorLayers: [layer('l1', 0)],
			updatedAt: '2026-05-21'
		};
		const project = projectFrom([g], [palette]);
		const plan = buildColorFontPlan(project);
		expect(plan.baseGlyphRecords[0].baseGlyphName).toBe('cp2764');
		expect(plan.syntheticGlyphs[0].name).toBe('cp2764.color0');
	});
});

describe('resolveColorFontPlan', () => {
	const project = projectFrom(
		[
			glyph(0x2764, 'heart', [layer('l1', 0), layer('l2', 1)]),
			glyph(0x2603, 'snowman', [layer('l3', 2)])
		],
		[palette]
	);
	const plan = buildColorFontPlan(project);

	it('resolves names → IDs and sorts ascending by base glyph ID', () => {
		const idsByName = new Map([
			['heart', 100],
			['heart.color0', 200],
			['heart.color1', 201],
			['snowman', 50],
			['snowman.color0', 250]
		]);
		const resolved = resolveColorFontPlan(plan, idsByName);
		// Snowman (50) sorts before heart (100).
		expect(resolved.map((r) => r.glyphID)).toEqual([50, 100]);
		expect(resolved[0].layers).toEqual([{ glyphID: 250, paletteIndex: 2 }]);
		expect(resolved[1].layers).toEqual([
			{ glyphID: 200, paletteIndex: 0 },
			{ glyphID: 201, paletteIndex: 1 }
		]);
	});

	it('drops records whose base glyph is unresolved', () => {
		const idsByName = new Map([
			['heart.color0', 200],
			['heart.color1', 201]
			// 'heart' itself missing
		]);
		const resolved = resolveColorFontPlan(plan, idsByName);
		expect(resolved.length).toBe(0);
	});

	it('drops records whose any layer glyph is unresolved', () => {
		const idsByName = new Map([
			['heart', 100],
			['heart.color0', 200]
			// 'heart.color1' missing
		]);
		const resolved = resolveColorFontPlan(plan, idsByName);
		// `heart` record is dropped because layer 1 unresolved; snowman
		// also missing because we didn't list it.
		expect(resolved).toEqual([]);
	});

	it('empty plan → empty resolved', () => {
		expect(
			resolveColorFontPlan(
				{ syntheticGlyphs: [], baseGlyphRecords: [], v1Records: [] },
				new Map()
			)
		).toEqual([]);
	});
});
