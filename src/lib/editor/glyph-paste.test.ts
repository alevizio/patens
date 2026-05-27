import { describe, it, expect } from 'vitest';
import { extractSvgPathD, parseSvgPasteToGlyph } from './glyph-paste';

const metrics = { ascender: 800, descender: -200, defaultSidebearing: 60 };

describe('extractSvgPathD', () => {
	it('returns the empty array for blank text', () => {
		expect(extractSvgPathD('')).toEqual([]);
		expect(extractSvgPathD('   \n  ')).toEqual([]);
	});

	it('returns bare path data as a single entry', () => {
		expect(extractSvgPathD('M 0 0 L 100 100')).toEqual(['M 0 0 L 100 100']);
	});

	it('extracts d="..." from a <path> tag', () => {
		const xml = '<path d="M 10 10 L 90 90 Z" fill="black"/>';
		expect(extractSvgPathD(xml)).toEqual(['M 10 10 L 90 90 Z']);
	});

	it('extracts every d attribute from an SVG with multiple paths', () => {
		const xml = `<svg><path d="M 0 0 L 100 0"/><path d="M 100 0 L 100 100"/></svg>`;
		expect(extractSvgPathD(xml)).toEqual(['M 0 0 L 100 0', 'M 100 0 L 100 100']);
	});

	it('ignores d-like attributes that lack the SVG attribute prefix', () => {
		// "id=..." should NOT match — the regex requires a whitespace+`d=` prefix
		const xml = `<svg id="map d=fake"><path d="M 1 2 L 3 4"/></svg>`;
		expect(extractSvgPathD(xml)).toEqual(['M 1 2 L 3 4']);
	});

	it('handles each Move-or-Curve command prefix', () => {
		for (const ch of 'MmLlHhVvCcSsQqTt') {
			expect(extractSvgPathD(`${ch} 0 0`)).toEqual([`${ch} 0 0`]);
		}
	});
});

describe('parseSvgPasteToGlyph', () => {
	it('returns null when input has no path data', async () => {
		expect(await parseSvgPasteToGlyph('', metrics)).toBeNull();
		expect(await parseSvgPasteToGlyph('not svg', metrics)).toBeNull();
	});

	it('returns null when SVG has paths that parse to empty contours', async () => {
		// "M 0 0" alone (no L/Z) → no contour
		expect(await parseSvgPasteToGlyph('<svg><path d=""/></svg>', metrics)).toBeNull();
	});

	it('produces contours and an advance width from a parsed rectangle', async () => {
		const svg = `<svg><path d="M 0 0 L 100 0 L 100 100 L 0 100 Z"/></svg>`;
		const patch = await parseSvgPasteToGlyph(svg, metrics);
		expect(patch).not.toBeNull();
		expect(patch!.contours.length).toBeGreaterThan(0);
		expect(patch!.advanceWidth).toBeGreaterThan(0);
	});

	it('scales to ~70% of the cap-height range', async () => {
		// 100×100 source → scaled to ~70% of fontHeight (1000) = 700
		const svg = `<svg><path d="M 0 0 L 100 0 L 100 100 L 0 100 Z"/></svg>`;
		const patch = await parseSvgPasteToGlyph(svg, metrics);
		expect(patch).not.toBeNull();
		// The advance includes 2*sidebearing + scaled width
		// Scaled width = 100 * (1000*0.7 / 100) = 700
		// Advance = 700 + 120 = 820
		expect(patch!.advanceWidth).toBeGreaterThan(700);
		expect(patch!.advanceWidth).toBeLessThan(900);
	});

	it('respects the configured default sidebearing in advance computation', async () => {
		const svg = `<svg><path d="M 0 0 L 100 0 L 100 100 L 0 100 Z"/></svg>`;
		const sb20 = (await parseSvgPasteToGlyph(svg, { ...metrics, defaultSidebearing: 20 }))!;
		const sb100 = (await parseSvgPasteToGlyph(svg, { ...metrics, defaultSidebearing: 100 }))!;
		expect(sb100.advanceWidth - sb20.advanceWidth).toBe(2 * (100 - 20));
	});
});
