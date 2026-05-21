import { describe, expect, it } from 'vitest';
import {
	hexToRgba,
	rgbaToHex,
	rgbaToCss,
	createDefaultPalette,
	createColorLayer,
	defaultPalette,
	palettesAgreeOnLength,
	hasVisibleColorLayers,
	planColorRender
} from './color';
import type { BezierContour, ColorLayer, ColorPalette } from './types';

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

describe('hexToRgba / rgbaToHex round-trip', () => {
	it('round-trips opaque colours', () => {
		expect(rgbaToHex(hexToRgba('#1a2b3c'))).toBe('#1a2b3c');
		expect(rgbaToHex(hexToRgba('#FF8800'))).toBe('#ff8800');
	});

	it('parses 6-digit hex (alpha defaults to 1)', () => {
		expect(hexToRgba('#3b82f6')).toEqual({ r: 59, g: 130, b: 246, a: 1 });
	});

	it('parses 8-digit hex with alpha byte', () => {
		const { r, g, b, a } = hexToRgba('#3b82f680');
		expect(r).toBe(59);
		expect(g).toBe(130);
		expect(b).toBe(246);
		expect(a).toBeCloseTo(128 / 255, 3);
	});

	it('accepts hex without the leading #', () => {
		expect(hexToRgba('ff0000')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
	});

	it('drops alpha byte when fully opaque', () => {
		expect(rgbaToHex({ r: 0, g: 0, b: 0, a: 1 })).toBe('#000000');
		expect(rgbaToHex({ r: 0, g: 0, b: 0, a: 0.5 })).toBe('#00000080');
	});

	it('throws on invalid hex', () => {
		expect(() => hexToRgba('#zzz')).toThrow();
		expect(() => hexToRgba('not-a-color')).toThrow();
	});
});

describe('rgbaToCss', () => {
	it('formats as CSS rgba()', () => {
		expect(rgbaToCss({ r: 255, g: 0, b: 0, a: 1 })).toBe('rgba(255, 0, 0, 1)');
		expect(rgbaToCss({ r: 0, g: 128, b: 255, a: 0.5 })).toBe('rgba(0, 128, 255, 0.5)');
	});

	it('clamps out-of-range channels', () => {
		expect(rgbaToCss({ r: -10, g: 300, b: 128, a: 2 })).toBe('rgba(0, 255, 128, 1)');
	});
});

describe('createDefaultPalette', () => {
	it('returns 4 colours + the given name and variant', () => {
		const p = createDefaultPalette('Brand', 'default');
		expect(p.name).toBe('Brand');
		expect(p.variant).toBe('default');
		expect(p.colors).toHaveLength(4);
		expect(p.id).toBeTypeOf('string');
		expect(p.id.length).toBeGreaterThan(0);
	});

	it('omits variant when undefined', () => {
		const p = createDefaultPalette('Untagged');
		expect(p.variant).toBeUndefined();
	});
});

describe('createColorLayer', () => {
	it('wraps contours + paletteIndex with a fresh id', () => {
		const contours: BezierContour[] = [
			{
				closed: true,
				winding: 'cw',
				commands: [
					{ type: 'M', x: 0, y: 0 },
					{ type: 'L', x: 10, y: 0 },
					{ type: 'Z' }
				]
			}
		];
		const layer = createColorLayer(contours, 2, 'shadow');
		expect(layer.contours).toBe(contours);
		expect(layer.paletteIndex).toBe(2);
		expect(layer.name).toBe('shadow');
		expect(layer.id).toBeTypeOf('string');
	});
});

describe('defaultPalette', () => {
	it('prefers the variant-tagged default', () => {
		const palettes: ColorPalette[] = [
			{ id: 'a', name: 'Light', variant: 'light', colors: [] },
			{ id: 'b', name: 'Default', variant: 'default', colors: [] },
			{ id: 'c', name: 'Dark', variant: 'dark', colors: [] }
		];
		expect(defaultPalette(palettes)?.id).toBe('b');
	});

	it('falls back to the first palette when no default tag is set', () => {
		const palettes: ColorPalette[] = [
			{ id: 'a', name: 'Light', variant: 'light', colors: [] },
			{ id: 'b', name: 'Dark', variant: 'dark', colors: [] }
		];
		expect(defaultPalette(palettes)?.id).toBe('a');
	});

	it('returns null on empty / undefined', () => {
		expect(defaultPalette(undefined)).toBeNull();
		expect(defaultPalette([])).toBeNull();
	});
});

describe('palettesAgreeOnLength', () => {
	it('returns the unified length when all match', () => {
		const palettes: ColorPalette[] = [
			{
				id: 'a',
				name: 'A',
				colors: [
					{ r: 0, g: 0, b: 0, a: 1 },
					{ r: 255, g: 255, b: 255, a: 1 }
				]
			},
			{
				id: 'b',
				name: 'B',
				colors: [
					{ r: 50, g: 50, b: 50, a: 1 },
					{ r: 200, g: 200, b: 200, a: 1 }
				]
			}
		];
		expect(palettesAgreeOnLength(palettes)).toBe(2);
	});

	it('returns null when lengths disagree', () => {
		const palettes: ColorPalette[] = [
			{ id: 'a', name: 'A', colors: [{ r: 0, g: 0, b: 0, a: 1 }] },
			{
				id: 'b',
				name: 'B',
				colors: [
					{ r: 50, g: 50, b: 50, a: 1 },
					{ r: 200, g: 200, b: 200, a: 1 }
				]
			}
		];
		expect(palettesAgreeOnLength(palettes)).toBeNull();
	});

	it('null on empty / undefined', () => {
		expect(palettesAgreeOnLength(undefined)).toBeNull();
		expect(palettesAgreeOnLength([])).toBeNull();
	});
});

describe('hasVisibleColorLayers', () => {
	const c: BezierContour[] = [
		{ closed: true, winding: 'cw', commands: [{ type: 'M', x: 0, y: 0 }] }
	];
	it('false on undefined / empty', () => {
		expect(hasVisibleColorLayers(undefined)).toBe(false);
		expect(hasVisibleColorLayers([])).toBe(false);
	});
	it('true when at least one layer is visible', () => {
		expect(
			hasVisibleColorLayers([
				{ id: '1', contours: c, paletteIndex: 0, hidden: true },
				{ id: '2', contours: c, paletteIndex: 1 }
			])
		).toBe(true);
	});
	it('false when every layer is hidden', () => {
		expect(
			hasVisibleColorLayers([
				{ id: '1', contours: c, paletteIndex: 0, hidden: true },
				{ id: '2', contours: c, paletteIndex: 1, hidden: true }
			])
		).toBe(false);
	});
});

describe('planColorRender', () => {
	const palette: ColorPalette = {
		id: 'p',
		name: 'Test',
		colors: [
			{ r: 0, g: 0, b: 0, a: 1 }, // ink
			{ r: 255, g: 0, b: 0, a: 1 }, // red
			{ r: 0, g: 0, b: 255, a: 1 } //  blue
		]
	};

	it('returns empty array on missing inputs', () => {
		expect(planColorRender(undefined, palette)).toEqual([]);
		expect(planColorRender([], palette)).toEqual([]);
		expect(planColorRender([{ id: 'a', contours: [tri], paletteIndex: 0 }], null)).toEqual([]);
	});

	it('emits one step per visible layer, bottom-up', () => {
		const layers: ColorLayer[] = [
			{ id: 'bottom', contours: [tri], paletteIndex: 0 },
			{ id: 'top', contours: [tri], paletteIndex: 1 }
		];
		const steps = planColorRender(layers, palette);
		expect(steps).toHaveLength(2);
		expect(steps[0].layerId).toBe('bottom');
		expect(steps[0].color).toEqual({ r: 0, g: 0, b: 0, a: 1 });
		expect(steps[1].layerId).toBe('top');
		expect(steps[1].color).toEqual({ r: 255, g: 0, b: 0, a: 1 });
		// SVG path string non-empty for both
		expect(steps[0].path.length).toBeGreaterThan(0);
	});

	it('skips hidden layers', () => {
		const layers: ColorLayer[] = [
			{ id: 'visible', contours: [tri], paletteIndex: 0 },
			{ id: 'hidden', contours: [tri], paletteIndex: 1, hidden: true }
		];
		const steps = planColorRender(layers, palette);
		expect(steps).toHaveLength(1);
		expect(steps[0].layerId).toBe('visible');
	});

	it('skips layers with out-of-range paletteIndex', () => {
		const layers: ColorLayer[] = [
			{ id: 'in-range', contours: [tri], paletteIndex: 0 },
			{ id: 'too-big', contours: [tri], paletteIndex: 99 },
			{ id: 'negative', contours: [tri], paletteIndex: -1 }
		];
		const steps = planColorRender(layers, palette);
		expect(steps).toHaveLength(1);
		expect(steps[0].layerId).toBe('in-range');
	});

	it('skips layers with empty contours', () => {
		const layers: ColorLayer[] = [
			{ id: 'has', contours: [tri], paletteIndex: 0 },
			{ id: 'empty', contours: [], paletteIndex: 1 }
		];
		const steps = planColorRender(layers, palette);
		expect(steps).toHaveLength(1);
		expect(steps[0].layerId).toBe('has');
	});

	it('preserves layer order even when filtering', () => {
		const layers: ColorLayer[] = [
			{ id: 'a', contours: [tri], paletteIndex: 0 },
			{ id: 'b', contours: [tri], paletteIndex: 99 }, // dropped
			{ id: 'c', contours: [tri], paletteIndex: 1 },
			{ id: 'd', contours: [tri], paletteIndex: 0, hidden: true }, // dropped
			{ id: 'e', contours: [tri], paletteIndex: 2 }
		];
		const steps = planColorRender(layers, palette);
		expect(steps.map((s) => s.layerId)).toEqual(['a', 'c', 'e']);
	});
});
