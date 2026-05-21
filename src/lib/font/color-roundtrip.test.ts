/**
 * Color-fonts M1 day-10 round-trip test.
 *
 * Builds a tiny Twemoji-shape font in-memory:
 *   - 2 colour palettes (default + dark variant)
 *   - 2 colour glyphs (heart + sparkle), each with 2-3 layers
 * Then walks it through the WHOLE color-font pipeline:
 *   parseSvgPath → BezierContour
 *   buildColorFontPlan → synthetic + base records
 *   buildFont → opentype.js Font (with synthetic glyphs appended)
 *   font.toArrayBuffer → SFNT bytes
 *   applyColorFontTables → CPAL + COLR splice
 *   parseSfntDirectory → verify the resulting binary
 *
 * No browser dependency. Catches regressions in the data-flow joints
 * between the modules without needing real Twemoji binaries committed.
 */

import { describe, expect, it } from 'vitest';
import { parseSvgPath } from './svg-path';
import { buildFont } from './export';
import { applyColorFontTables } from './colr';
import { parseSfntDirectory, getTableBytes } from './sfnt-splice';
import { createColorLayer, createDefaultPalette } from './color';
import type { ColorPalette, Project, Glyph, BezierContour } from './types';

// ----- Tiny "Twemoji-shape" SVG paths -----
// Simplified heart (closed). Y-down SVG coords.
const HEART_PATH_OUTER =
	'M 500 800 C 300 600 50 500 50 300 C 50 150 150 50 300 50 C 400 50 500 150 500 250 C 500 150 600 50 700 50 C 850 50 950 150 950 300 C 950 500 700 600 500 800 Z';
// Inner highlight (smaller closed curve).
const HEART_PATH_HIGHLIGHT =
	'M 500 200 C 450 150 350 150 300 200 C 250 250 250 350 300 400 C 350 450 450 450 500 400 Z';

// 4-point sparkle (closed quad-ish star).
const SPARKLE_PATH =
	'M 500 100 L 600 450 L 950 500 L 600 550 L 500 900 L 400 550 L 50 500 L 400 450 Z';

// Build BezierContours by flipping SVG-y-down to font-y-up around the
// 800-y baseline (matches a 1000 UPM box with ascender 800).
const svgToFontContours = (d: string): BezierContour[] =>
	parseSvgPath(d, {
		transformPoint: (x, y) => [x, 800 - y]
	});

const PALETTE_DEFAULT: ColorPalette = {
	...createDefaultPalette('Default', 'default'),
	colors: [
		{ r: 232, g: 29, b: 95, a: 1 }, // hot pink — heart body
		{ r: 255, g: 255, b: 255, a: 1 }, // white — heart highlight
		{ r: 251, g: 191, b: 36, a: 1 }, // amber — sparkle
		{ r: 26, g: 26, b: 26, a: 1 } //  ink
	]
};

const PALETTE_DARK: ColorPalette = {
	...createDefaultPalette('Dark', 'dark'),
	colors: [
		{ r: 200, g: 25, b: 80, a: 1 },
		{ r: 240, g: 240, b: 240, a: 1 },
		{ r: 230, g: 175, b: 30, a: 1 },
		{ r: 240, g: 240, b: 240, a: 1 }
	]
};

const makeProject = (): Project => {
	const heartOuter = svgToFontContours(HEART_PATH_OUTER);
	const heartInner = svgToFontContours(HEART_PATH_HIGHLIGHT);
	const sparkle = svgToFontContours(SPARKLE_PATH);

	const heartGlyph: Glyph = {
		codepoint: 0x2764, // ❤
		name: 'heart',
		status: 'draft',
		advanceWidth: 1000,
		leftSidebearing: 50,
		rightSidebearing: 50,
		contours: heartOuter, // monochrome fallback
		colorLayers: [
			createColorLayer(heartOuter, 0, 'body'),
			createColorLayer(heartInner, 1, 'highlight')
		],
		updatedAt: '2026-05-21'
	};

	const sparkleGlyph: Glyph = {
		codepoint: 0x2728, // ✨
		name: 'sparkle',
		status: 'draft',
		advanceWidth: 1000,
		leftSidebearing: 50,
		rightSidebearing: 50,
		contours: sparkle,
		colorLayers: [createColorLayer(sparkle, 2, 'body')],
		updatedAt: '2026-05-21'
	};

	return {
		id: 'test-project',
		name: 'Twemoji subset',
		metadata: {
			familyName: 'TwemojiSubset',
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
		glyphs: {
			[heartGlyph.codepoint]: heartGlyph,
			[sparkleGlyph.codepoint]: sparkleGlyph
		},
		kerning: [],
		features: { kern: false, liga: false, autoFeatures: false },
		palettes: [PALETTE_DEFAULT, PALETTE_DARK],
		createdAt: '2026-05-21',
		updatedAt: '2026-05-21'
	};
};

describe('color-fonts M1 round-trip', () => {
	it('builds a font with color layers + emits COLR + CPAL tables', () => {
		const project = makeProject();
		const { font, colorBaseGlyphs } = buildFont(project);

		// Two color glyphs → two base records (heart with 2 layers, sparkle with 1).
		expect(colorBaseGlyphs).toHaveLength(2);
		// Spec: ascending by glyphID.
		expect(colorBaseGlyphs[0].glyphID).toBeLessThan(colorBaseGlyphs[1].glyphID);

		const heartRec = colorBaseGlyphs.find((r) => r.layers.length === 2);
		expect(heartRec).toBeDefined();
		expect(heartRec!.layers[0].paletteIndex).toBe(0);
		expect(heartRec!.layers[1].paletteIndex).toBe(1);

		const sparkleRec = colorBaseGlyphs.find((r) => r.layers.length === 1);
		expect(sparkleRec!.layers[0].paletteIndex).toBe(2);

		// Synthetic layer glyphs are appended to the font.
		const glyphCount = (font.glyphs as unknown as { length?: number }).length;
		if (typeof glyphCount === 'number') {
			// 1 .notdef + 2 codepoint glyphs + 3 synthetic layer glyphs = 6
			expect(glyphCount).toBe(6);
		}

		// Splice COLR + CPAL.
		const buffer = font.toArrayBuffer();
		const augmented = applyColorFontTables(
			new Uint8Array(buffer),
			colorBaseGlyphs,
			project.palettes!
		);

		const dir = parseSfntDirectory(augmented);
		const tags = dir.tables.map((t) => t.tag);
		expect(tags).toContain('COLR');
		expect(tags).toContain('CPAL');
	});

	it('COLR + CPAL byte structure matches what the spec writer produces', () => {
		const project = makeProject();
		const { font, colorBaseGlyphs } = buildFont(project);
		const buffer = font.toArrayBuffer();
		const augmented = applyColorFontTables(
			new Uint8Array(buffer),
			colorBaseGlyphs,
			project.palettes!
		);

		const dir = parseSfntDirectory(augmented);
		const colr = getTableBytes(augmented, dir, 'COLR');
		const cpal = getTableBytes(augmented, dir, 'CPAL');
		expect(colr).toBeDefined();
		expect(cpal).toBeDefined();

		// COLR v0 header: version (uint16) = 0.
		expect((colr![0] << 8) | colr![1]).toBe(0);
		// numBaseGlyphRecords = 2.
		expect((colr![2] << 8) | colr![3]).toBe(2);

		// CPAL v0 header: version = 0.
		expect((cpal![0] << 8) | cpal![1]).toBe(0);
		// numPaletteEntries = 4 (we shipped 4 colours per palette).
		expect((cpal![2] << 8) | cpal![3]).toBe(4);
		// numPalettes = 2 (default + dark).
		expect((cpal![4] << 8) | cpal![5]).toBe(2);
	});

	it('SVG → BezierContour conversion preserves topology (heart has 7 segments)', () => {
		// Heart outer path: M + 6 cubics + Z = 8 commands → 7 curve segments.
		const contours = svgToFontContours(HEART_PATH_OUTER);
		expect(contours).toHaveLength(1);
		expect(contours[0].closed).toBe(true);
		const cubicCount = contours[0].commands.filter((c) => c.type === 'C').length;
		expect(cubicCount).toBe(6);
	});

	it('y-flip transform puts the heart\'s topmost SVG point at the highest font y', () => {
		const contours = svgToFontContours(HEART_PATH_OUTER);
		const ys = contours[0].commands
			.map((c) => (c.type !== 'Z' ? c.y : null))
			.filter((y): y is number => y !== null);
		// SVG y=50 (near top in SVG) becomes the largest font y.
		// SVG y=800 (bottom in SVG) becomes the smallest font y.
		const maxFontY = Math.max(...ys);
		const minFontY = Math.min(...ys);
		// 800 - 50 = 750 should be near the max.
		expect(maxFontY).toBeGreaterThanOrEqual(700);
		// 800 - 800 = 0 should be near the min.
		expect(minFontY).toBeLessThanOrEqual(50);
	});
});
