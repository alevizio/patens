/**
 * COLR v0 + CPAL v0 binary writers for color-font export.
 *
 * Same pattern as `gpos-mark.ts` — hand-written binary blobs we splice
 * into the SFNT via `sfnt-splice.ts`. Keeps us off opentype.js's
 * partial COLR API and off the Pyodide path entirely.
 *
 * COLR v0 layout (OpenType spec, COLR table v0):
 *
 *   COLR Header v0 (14 bytes)
 *     uint16  version (= 0)
 *     uint16  numBaseGlyphRecords
 *     Offset32 baseGlyphRecordsOffset      (from start of table)
 *     Offset32 layerRecordsOffset          (from start of table)
 *     uint16  numLayerRecords
 *
 *   BaseGlyphRecord (6 bytes each, sorted by glyphID)
 *     uint16  glyphID
 *     uint16  firstLayerIndex              (into the layer records array)
 *     uint16  numLayers
 *
 *   LayerRecord (4 bytes each)
 *     uint16  glyphID                      (the layer's own glyph in the font)
 *     uint16  paletteIndex
 *
 * CPAL v0 layout (OpenType spec, CPAL table v0):
 *
 *   CPAL Header v0 (12 bytes)
 *     uint16   version (= 0)
 *     uint16   numPaletteEntries           (entries per palette)
 *     uint16   numPalettes
 *     uint16   numColorRecords             (= numPaletteEntries * numPalettes)
 *     Offset32 colorRecordsArrayOffset     (from start of table)
 *
 *   ColorRecordIndices (uint16 * numPalettes)
 *     Each value is the index into the color records array where that
 *     palette begins (typically i * numPaletteEntries).
 *
 *   ColorRecord (4 bytes BGRA — note the byte order!)
 *     uint8 blue
 *     uint8 green
 *     uint8 red
 *     uint8 alpha
 *
 * Both writers produce a Uint8Array that's ready to splice into the
 * SFNT directory. No SFNT manipulation here — that's a separate
 * concern in `sfnt-splice.ts`.
 */

import { ByteBuf } from './gpos-mark';
import type { ColorPalette, RGBA } from './types';

// ---------------------------------------------------------------- COLR v0

export type BaseGlyphRecord = {
	/** The glyph ID of the "color" glyph (e.g. the heart, the emoji). */
	glyphID: number;
	/** Layers, in bottom-up render order. Each layer references its own glyphID. */
	layers: Array<{ glyphID: number; paletteIndex: number }>;
};

/**
 * Write a COLR v0 table. `baseGlyphs` MUST be sorted by glyphID
 * ascending — that's a spec requirement.
 */
export const writeColrV0 = (baseGlyphs: BaseGlyphRecord[]): Uint8Array => {
	// Spec invariant
	for (let i = 1; i < baseGlyphs.length; i++) {
		if (baseGlyphs[i].glyphID <= baseGlyphs[i - 1].glyphID) {
			throw new Error(
				`writeColrV0: baseGlyphs must be sorted ascending by glyphID (saw ${baseGlyphs[i - 1].glyphID} then ${baseGlyphs[i].glyphID})`
			);
		}
	}

	const HEADER = 14; // bytes
	const BASE_REC = 6;
	const LAYER_REC = 4;
	const numBase = baseGlyphs.length;
	const totalLayers = baseGlyphs.reduce((sum, b) => sum + b.layers.length, 0);

	// Layout: header → baseGlyphRecords → layerRecords.
	const baseOffset = HEADER;
	const layerOffset = baseOffset + numBase * BASE_REC;
	const totalSize = layerOffset + totalLayers * LAYER_REC;

	const buf = new ByteBuf();
	buf.writeUint16(0); // version
	buf.writeUint16(numBase);
	buf.writeUint32(baseOffset);
	buf.writeUint32(layerOffset);
	buf.writeUint16(totalLayers);

	// baseGlyphRecords — assign firstLayerIndex by walking the cursor.
	let layerCursor = 0;
	for (const b of baseGlyphs) {
		buf.writeUint16(b.glyphID);
		buf.writeUint16(layerCursor);
		buf.writeUint16(b.layers.length);
		layerCursor += b.layers.length;
	}

	// layerRecords — flattened in baseGlyphs iteration order.
	for (const b of baseGlyphs) {
		for (const l of b.layers) {
			buf.writeUint16(l.glyphID);
			buf.writeUint16(l.paletteIndex);
		}
	}

	const out = buf.toUint8Array();
	if (out.length !== totalSize) {
		throw new Error(`writeColrV0: size mismatch — expected ${totalSize}, got ${out.length}`);
	}
	return out;
};

// ---------------------------------------------------------------- CPAL v0

/**
 * Write a CPAL v0 table. All input palettes MUST have the same number
 * of colour entries (spec invariant — same as `palettesAgreeOnLength`
 * in color.ts).
 */
export const writeCpalV0 = (palettes: ColorPalette[]): Uint8Array => {
	if (palettes.length === 0) {
		throw new Error('writeCpalV0: must have at least one palette');
	}
	const entriesPerPalette = palettes[0].colors.length;
	if (entriesPerPalette === 0) {
		throw new Error('writeCpalV0: palettes must contain at least one colour');
	}
	for (let i = 1; i < palettes.length; i++) {
		if (palettes[i].colors.length !== entriesPerPalette) {
			throw new Error(
				`writeCpalV0: all palettes must agree on length (palette 0 has ${entriesPerPalette}, palette ${i} has ${palettes[i].colors.length})`
			);
		}
	}

	const HEADER = 12;
	const numPalettes = palettes.length;
	const numColorRecords = entriesPerPalette * numPalettes;
	const colorRecordIndicesSize = numPalettes * 2;
	const colorRecordsOffset = HEADER + colorRecordIndicesSize;
	const totalSize = colorRecordsOffset + numColorRecords * 4;

	const buf = new ByteBuf();
	buf.writeUint16(0); // version
	buf.writeUint16(entriesPerPalette);
	buf.writeUint16(numPalettes);
	buf.writeUint16(numColorRecords);
	buf.writeUint32(colorRecordsOffset);

	// colorRecordIndices: where each palette starts in the records array.
	for (let i = 0; i < numPalettes; i++) {
		buf.writeUint16(i * entriesPerPalette);
	}

	// colorRecords (BGRA per entry, note the order!).
	for (const palette of palettes) {
		for (const c of palette.colors) {
			writeColorRecord(buf, c);
		}
	}

	const out = buf.toUint8Array();
	if (out.length !== totalSize) {
		throw new Error(`writeCpalV0: size mismatch — expected ${totalSize}, got ${out.length}`);
	}
	return out;
};

/** BGRA in CPAL byte order — alpha last. Channels clamped to 0..255. */
const writeColorRecord = (buf: ByteBuf, c: RGBA): void => {
	const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
	buf.writeUint8(clamp(c.b));
	buf.writeUint8(clamp(c.g));
	buf.writeUint8(clamp(c.r));
	buf.writeUint8(clamp(c.a * 255));
};
