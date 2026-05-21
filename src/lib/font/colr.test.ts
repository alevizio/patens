import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { applyColorFontTables, writeColrV0, writeColrV1, writeCpalV0 } from './colr';
import { parseSfntDirectory, computeTableChecksum, getTableBytes } from './sfnt-splice';
import type { ColorPalette } from './types';

const loadDemoOtf = async (): Promise<Uint8Array> => {
	const p = path.join(
		process.cwd(),
		'static/demo-fonts/StudioGeometric-Regular.otf'
	);
	const buf = await fs.readFile(p);
	return new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
};

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

describe('writeColrV1', () => {
	it('emits version 1 header with v1 BaseGlyphList offset when v1 records present', () => {
		const colr = writeColrV1(
			[],
			[
				{
					glyphID: 5,
					paint: {
						kind: 'glyph',
						glyphID: 5,
						paint: {
							kind: 'linearGradient',
							x0: 0,
							y0: 0,
							x1: 100,
							y1: 0,
							x2: 0,
							y2: 100,
							stops: [
								{ offset: 0, paletteIndex: 0 },
								{ offset: 1, paletteIndex: 1 }
							]
						}
					}
				}
			]
		);
		expect(u16(colr, 0)).toBe(1); // version
		expect(u16(colr, 2)).toBe(0); // numV0BaseRecords
		// v1 BaseGlyphList offset at header bytes 14..17
		const v1BaseListOff = u32(colr, 14);
		expect(v1BaseListOff).toBeGreaterThan(0);
		// First 4 bytes of BaseGlyphList = numV1Records (= 1)
		expect(u32(colr, v1BaseListOff)).toBe(1);
		// Next: uint16 glyphID, uint32 paintOffset
		expect(u16(colr, v1BaseListOff + 4)).toBe(5);
	});

	it('emits PaintGlyph wrapping PaintLinearGradient at the right offset', () => {
		const colr = writeColrV1(
			[],
			[
				{
					glyphID: 5,
					paint: {
						kind: 'glyph',
						glyphID: 5,
						paint: {
							kind: 'linearGradient',
							x0: 10,
							y0: 20,
							x1: 30,
							y1: 40,
							x2: 50,
							y2: 60,
							stops: [
								{ offset: 0, paletteIndex: 0 },
								{ offset: 1, paletteIndex: 1, alpha: 0.5 }
							]
						}
					}
				}
			]
		);
		// Walk the structure to find the paint
		const v1BaseListOff = u32(colr, 14);
		const paintOffFromBaseList = u32(colr, v1BaseListOff + 6);
		const paintOff = v1BaseListOff + paintOffFromBaseList;
		// Paint format = 10 (PaintGlyph)
		expect(colr[paintOff]).toBe(10);
		// Next 3 bytes: Offset24 to nested paint, = 6 (header is 6 bytes)
		expect(colr[paintOff + 1]).toBe(0);
		expect(colr[paintOff + 2]).toBe(0);
		expect(colr[paintOff + 3]).toBe(6);
		// uint16 glyphID = 5
		expect(u16(colr, paintOff + 4)).toBe(5);
		// Linear gradient at paintOff + 6
		expect(colr[paintOff + 6]).toBe(4);
	});

	it('writes BOTH v0 and v1 records when both supplied', () => {
		const colr = writeColrV1(
			[{ glyphID: 3, layers: [{ glyphID: 7, paletteIndex: 0 }] }],
			[
				{
					glyphID: 5,
					paint: {
						kind: 'glyph',
						glyphID: 5,
						paint: {
							kind: 'linearGradient',
							x0: 0,
							y0: 0,
							x1: 100,
							y1: 0,
							x2: 0,
							y2: 100,
							stops: [
								{ offset: 0, paletteIndex: 0 },
								{ offset: 1, paletteIndex: 1 }
							]
						}
					}
				}
			]
		);
		expect(u16(colr, 0)).toBe(1); // version
		expect(u16(colr, 2)).toBe(1); // numV0BaseRecords
		expect(u32(colr, 14)).toBeGreaterThan(0); // v1 baseList offset
	});

	it('PaintColrLayers + LayerList for multi-layer paint trees', () => {
		const colr = writeColrV1(
			[],
			[
				{
					glyphID: 5,
					paint: {
						kind: 'colrLayers',
						layers: [
							{
								kind: 'glyph',
								glyphID: 6,
								paint: { kind: 'solid', paletteIndex: 0 }
							},
							{
								kind: 'glyph',
								glyphID: 7,
								paint: {
									kind: 'linearGradient',
									x0: 0,
									y0: 0,
									x1: 100,
									y1: 0,
									x2: 0,
									y2: 100,
									stops: [
										{ offset: 0, paletteIndex: 0 },
										{ offset: 1, paletteIndex: 1 }
									]
								}
							}
						]
					}
				}
			]
		);
		expect(u16(colr, 0)).toBe(1);
		const v1BaseListOff = u32(colr, 14);
		const layerListOff = u32(colr, 18);
		expect(layerListOff).toBeGreaterThan(0);
		// LayerList header: uint32 numLayers
		expect(u32(colr, layerListOff)).toBe(2);
		// Walk: BaseGlyphList → record points to PaintColrLayers
		const paintOffFromBaseList = u32(colr, v1BaseListOff + 6);
		const paintOff = v1BaseListOff + paintOffFromBaseList;
		// PaintColrLayers (format 1): uint8 format + uint8 numLayers + uint32 firstLayerIndex
		expect(colr[paintOff]).toBe(1);
		expect(colr[paintOff + 1]).toBe(2); // numLayers
		expect(u32(colr, paintOff + 2)).toBe(0); // firstLayerIndex
	});

	it('PaintSolid (format 2) — uint16 paletteIndex + F2DOT14 alpha', () => {
		const colr = writeColrV1(
			[],
			[
				{
					glyphID: 5,
					paint: {
						kind: 'glyph',
						glyphID: 5,
						paint: { kind: 'solid', paletteIndex: 3, alpha: 0.5 }
					}
				}
			]
		);
		const v1BaseListOff = u32(colr, 14);
		const paintOff = v1BaseListOff + u32(colr, v1BaseListOff + 6);
		// PaintGlyph header (6 bytes) → nested at paintOff + 6
		const solidOff = paintOff + 6;
		expect(colr[solidOff]).toBe(2); // format = solid
		expect(u16(colr, solidOff + 1)).toBe(3); // paletteIndex
		// F2DOT14 alpha: 0.5 = 0x2000
		expect(u16(colr, solidOff + 3)).toBe(0x2000);
	});

	it('rejects v1 records out of glyphID order', () => {
		expect(() =>
			writeColrV1(
				[],
				[
					{
						glyphID: 5,
						paint: {
							kind: 'linearGradient',
							x0: 0,
							y0: 0,
							x1: 100,
							y1: 0,
							x2: 0,
							y2: 100,
							stops: [
								{ offset: 0, paletteIndex: 0 },
								{ offset: 1, paletteIndex: 1 }
							]
						}
					},
					{
						glyphID: 3,
						paint: {
							kind: 'linearGradient',
							x0: 0,
							y0: 0,
							x1: 100,
							y1: 0,
							x2: 0,
							y2: 100,
							stops: [
								{ offset: 0, paletteIndex: 0 },
								{ offset: 1, paletteIndex: 1 }
							]
						}
					}
				]
			)
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

describe('applyColorFontTables', () => {
	it('no-op on empty inputs', async () => {
		const otf = await loadDemoOtf();
		expect(applyColorFontTables(otf, [], [])).toBe(otf); // same reference
		expect(applyColorFontTables(otf, [{ glyphID: 5, layers: [] }], [])).toBe(otf);
		expect(
			applyColorFontTables(
				otf,
				[],
				[
					{
						id: 'p',
						name: 'P',
						colors: [{ r: 0, g: 0, b: 0, a: 1 }]
					}
				]
			)
		).toBe(otf);
	});

	it('produces a buffer that parses as a valid SFNT with COLR + CPAL', async () => {
		const otf = await loadDemoOtf();
		const palettes: ColorPalette[] = [
			{
				id: 'default',
				name: 'Default',
				variant: 'default',
				colors: [
					{ r: 26, g: 26, b: 26, a: 1 },
					{ r: 255, g: 100, b: 100, a: 1 }
				]
			}
		];
		const baseGlyphs = [
			{
				glyphID: 5,
				layers: [
					{ glyphID: 10, paletteIndex: 0 },
					{ glyphID: 11, paletteIndex: 1 }
				]
			}
		];
		const out = applyColorFontTables(otf, baseGlyphs, palettes);
		// New buffer, different reference
		expect(out).not.toBe(otf);
		// Parses as a valid SFNT
		const dir = parseSfntDirectory(out);
		// Has both new tables
		const tags = dir.tables.map((t) => t.tag);
		expect(tags).toContain('COLR');
		expect(tags).toContain('CPAL');
		// Tables remain alphabetically sorted (SFNT spec)
		for (let i = 1; i < tags.length; i++) {
			expect(tags[i] >= tags[i - 1]).toBe(true);
		}
		// Each table's checksum matches its bytes (whole-file invariant)
		for (const rec of dir.tables) {
			const data = getTableBytes(out, dir, rec.tag);
			if (!data) continue;
			// Padded checksum should equal the recorded checksum (head is
			// special — its checkSumAdjustment is masked during compute).
			const checksum = computeTableChecksum(padFor(data));
			if (rec.tag === 'head') {
				// head's checksum is computed over the table with the
				// checkSumAdjustment field treated as 0 — spliceTable
				// already does that work; we just verify the table is
				// present and sized correctly.
				expect(data.length).toBeGreaterThanOrEqual(54);
			} else {
				expect(checksum).toBe(rec.checksum);
			}
		}
	});

	it('preserves the original font tables (kerning, cmap, etc.)', async () => {
		const otf = await loadDemoOtf();
		const beforeDir = parseSfntDirectory(otf);
		const beforeTags = new Set(beforeDir.tables.map((t) => t.tag));
		const palettes: ColorPalette[] = [
			{
				id: 'p',
				name: 'P',
				colors: [{ r: 0, g: 0, b: 0, a: 1 }]
			}
		];
		const baseGlyphs = [
			{ glyphID: 5, layers: [{ glyphID: 10, paletteIndex: 0 }] }
		];
		const out = applyColorFontTables(otf, baseGlyphs, palettes);
		const afterDir = parseSfntDirectory(out);
		const afterTags = new Set(afterDir.tables.map((t) => t.tag));
		// Every original table still exists.
		for (const tag of beforeTags) {
			expect(afterTags.has(tag)).toBe(true);
		}
		// Plus COLR + CPAL.
		expect(afterTags.has('COLR')).toBe(true);
		expect(afterTags.has('CPAL')).toBe(true);
	});
});

const padFor = (data: Uint8Array): Uint8Array => {
	const padLen = (4 - (data.length % 4)) % 4;
	if (padLen === 0) return data;
	const out = new Uint8Array(data.length + padLen);
	out.set(data);
	return out;
};
