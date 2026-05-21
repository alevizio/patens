import { describe, expect, it } from 'vitest';
import { writeColrV0, writeCpalV0 } from './colr';
import type { ColorPalette } from './types';

// Read a big-endian uint16 from a Uint8Array at an offset.
const u16 = (b: Uint8Array, off: number) => (b[off] << 8) | b[off + 1];
const u32 = (b: Uint8Array, off: number) =>
	((b[off] << 24) >>> 0) +
	((b[off + 1] << 16) >>> 0) +
	((b[off + 2] << 8) >>> 0) +
	b[off + 3];

describe('writeColrV0', () => {
	it('empty input → just the header, no records', () => {
		const out = writeColrV0([]);
		expect(out.length).toBe(14);
		expect(u16(out, 0)).toBe(0); // version
		expect(u16(out, 2)).toBe(0); // numBaseGlyphRecords
		expect(u32(out, 4)).toBe(14); // baseGlyphRecordsOffset (just past header)
		expect(u32(out, 8)).toBe(14); // layerRecordsOffset
		expect(u16(out, 12)).toBe(0); // numLayerRecords
	});

	it('single base with two layers — record offsets, firstLayerIndex, layer IDs', () => {
		const out = writeColrV0([
			{
				glyphID: 100,
				layers: [
					{ glyphID: 200, paletteIndex: 0 },
					{ glyphID: 201, paletteIndex: 1 }
				]
			}
		]);
		expect(out.length).toBe(14 + 6 + 2 * 4); // header + 1 base + 2 layers = 28
		expect(u16(out, 0)).toBe(0);
		expect(u16(out, 2)).toBe(1);
		expect(u32(out, 4)).toBe(14);
		expect(u32(out, 8)).toBe(20); // 14 + 6
		expect(u16(out, 12)).toBe(2);

		// BaseGlyphRecord
		expect(u16(out, 14)).toBe(100); // glyphID
		expect(u16(out, 16)).toBe(0); // firstLayerIndex
		expect(u16(out, 18)).toBe(2); // numLayers

		// LayerRecords
		expect(u16(out, 20)).toBe(200);
		expect(u16(out, 22)).toBe(0);
		expect(u16(out, 24)).toBe(201);
		expect(u16(out, 26)).toBe(1);
	});

	it('two bases — second base picks up firstLayerIndex after the first', () => {
		const out = writeColrV0([
			{ glyphID: 50, layers: [{ glyphID: 500, paletteIndex: 0 }] },
			{
				glyphID: 60,
				layers: [
					{ glyphID: 600, paletteIndex: 1 },
					{ glyphID: 601, paletteIndex: 2 }
				]
			}
		]);
		// Header + 2 base records + 3 layer records
		expect(out.length).toBe(14 + 12 + 12);
		expect(u16(out, 2)).toBe(2); // numBaseGlyphRecords
		expect(u32(out, 8)).toBe(14 + 12); // layerRecordsOffset

		// Base 1: glyph 50, firstLayer 0, 1 layer
		expect(u16(out, 14)).toBe(50);
		expect(u16(out, 16)).toBe(0);
		expect(u16(out, 18)).toBe(1);
		// Base 2: glyph 60, firstLayer 1, 2 layers
		expect(u16(out, 20)).toBe(60);
		expect(u16(out, 22)).toBe(1);
		expect(u16(out, 24)).toBe(2);

		// Layers: flat list in base-order
		expect(u16(out, 26)).toBe(500); // base 1 layer
		expect(u16(out, 30)).toBe(600); // base 2 layer 1
		expect(u16(out, 34)).toBe(601); // base 2 layer 2
	});

	it('rejects baseGlyphRecords not sorted ascending', () => {
		expect(() =>
			writeColrV0([
				{ glyphID: 60, layers: [{ glyphID: 600, paletteIndex: 0 }] },
				{ glyphID: 50, layers: [{ glyphID: 500, paletteIndex: 0 }] } // out of order
			])
		).toThrow();
	});

	it('rejects duplicate baseGlyph IDs (spec requires strict ascending)', () => {
		expect(() =>
			writeColrV0([
				{ glyphID: 50, layers: [{ glyphID: 500, paletteIndex: 0 }] },
				{ glyphID: 50, layers: [{ glyphID: 501, paletteIndex: 1 }] }
			])
		).toThrow();
	});
});

describe('writeCpalV0', () => {
	const p1: ColorPalette = {
		id: 'p1',
		name: 'Default',
		colors: [
			{ r: 255, g: 0, b: 0, a: 1 }, // red
			{ r: 0, g: 255, b: 0, a: 1 } //  green
		]
	};
	const p2: ColorPalette = {
		id: 'p2',
		name: 'Dark',
		variant: 'dark',
		colors: [
			{ r: 128, g: 0, b: 0, a: 1 },
			{ r: 0, g: 128, b: 0, a: 0.5 }
		]
	};

	it('header sizing for one palette of two colours', () => {
		const out = writeCpalV0([p1]);
		const header = 12;
		const indices = 2; // one palette × 2 bytes
		const colors = 2 * 4; // 2 entries × 4 bytes
		expect(out.length).toBe(header + indices + colors);
		expect(u16(out, 0)).toBe(0); // version
		expect(u16(out, 2)).toBe(2); // numPaletteEntries
		expect(u16(out, 4)).toBe(1); // numPalettes
		expect(u16(out, 6)).toBe(2); // numColorRecords
		expect(u32(out, 8)).toBe(header + indices); // colorRecordsOffset
	});

	it('writes BGRA byte order — note: NOT RGBA', () => {
		const out = writeCpalV0([p1]);
		// Header (12) + indices (2) = 14, then records.
		// First record (palette 0, entry 0 = pure red): B=0, G=0, R=255, A=255
		expect(out[14]).toBe(0); // B
		expect(out[15]).toBe(0); // G
		expect(out[16]).toBe(255); // R
		expect(out[17]).toBe(255); // A
		// Second record (entry 1 = pure green): B=0, G=255, R=0, A=255
		expect(out[18]).toBe(0);
		expect(out[19]).toBe(255);
		expect(out[20]).toBe(0);
		expect(out[21]).toBe(255);
	});

	it('palette indices point at the correct offsets in the records array', () => {
		const out = writeCpalV0([p1, p2]);
		// colorRecordIndices live just past the 12-byte header.
		const idx0 = u16(out, 12);
		const idx1 = u16(out, 14);
		expect(idx0).toBe(0); // palette 0 starts at record 0
		expect(idx1).toBe(2); // palette 1 starts at record 2 (after p1's 2 entries)
	});

	it('alpha < 1 round-trips as 0..255 byte', () => {
		const out = writeCpalV0([p2]);
		// Palette 0 (p2), entry 1: alpha=0.5 → 128.
		// Header (12) + indices (2) = 14. Entry 0 occupies 14..17, entry 1 occupies 18..21.
		expect(out[21]).toBe(128); // alpha byte of entry 1
	});

	it('throws when palettes disagree on length', () => {
		const mismatched: ColorPalette = {
			id: 'short',
			name: 'Short',
			colors: [{ r: 0, g: 0, b: 0, a: 1 }] // 1 entry
		};
		expect(() => writeCpalV0([p1, mismatched])).toThrow();
	});

	it('throws on empty input', () => {
		expect(() => writeCpalV0([])).toThrow();
	});

	it('throws when palette has zero entries', () => {
		const empty: ColorPalette = { id: 'e', name: 'Empty', colors: [] };
		expect(() => writeCpalV0([empty])).toThrow();
	});
});
