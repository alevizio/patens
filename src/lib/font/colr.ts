/**
 * COLR v0 + COLR v1 + CPAL v0 binary writers for color-font export.
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
import { spliceTable } from './sfnt-splice';
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

// ---------------------------------------------------------------- COLR v1

/**
 * COLR v1 paint tree node. Discriminated union — only the minimum
 * set of formats needed to ship the editor's gradient layers:
 *
 *  - PaintColrLayers (format 1): list of paints to stack
 *  - PaintLinearGradient (format 4): linear gradient fill
 *  - PaintRadialGradient (format 6): radial gradient fill
 *  - PaintGlyph (format 10): clip a paint to a glyph's outline
 *
 * Sweep gradients (8), transforms (12+), composite (32), and the
 * variable variants (3, 5, 7, 9, 13+) are deferred — they can
 * extend this union without restructuring the writer.
 */
export type Paint =
	| { kind: 'colrLayers'; layers: Paint[] }
	| { kind: 'solid'; paletteIndex: number; alpha?: number }
	| {
			kind: 'linearGradient';
			x0: number;
			y0: number;
			x1: number;
			y1: number;
			x2: number;
			y2: number;
			stops: ColorStop[];
	  }
	| {
			kind: 'radialGradient';
			x0: number;
			y0: number;
			r0: number;
			x1: number;
			y1: number;
			r1: number;
			stops: ColorStop[];
	  }
	| { kind: 'glyph'; glyphID: number; paint: Paint };

export type ColorStop = {
	/** 0..1 along the gradient axis. */
	offset: number;
	paletteIndex: number;
	/** 0..1 alpha multiplier. Default 1. */
	alpha?: number;
};

export type BaseGlyphPaint = {
	glyphID: number;
	paint: Paint;
};

/**
 * Write a combined COLR v0 + v1 table. The v0 records remain in
 * place (older renderers fall back to flat fills); the v1
 * sections (BaseGlyphList, LayerList) add gradient + clipped-glyph
 * paints. Modern renderers (CoreText, FreeType 2.13+, Chrome 98+,
 * Firefox 89+) consume the v1 section.
 *
 * Layout produced:
 *
 *   COLR Header v1 (34 bytes)
 *   BaseGlyphRecord[] (v0)        — sorted ascending
 *   LayerRecord[] (v0)            — flattened in baseGlyphs order
 *   BaseGlyphList (v1)            — sorted ascending
 *   LayerList (v1)                — flat list of all paint roots
 *   <paint sub-tables>            — appended after LayerList
 *
 * The Paint formats use Offset24 (3 bytes big-endian) — written
 * inline below since ByteBuf doesn't have a writeUint24 helper.
 */
export const writeColrV1 = (
	v0BaseGlyphs: BaseGlyphRecord[],
	v1BaseGlyphs: BaseGlyphPaint[]
): Uint8Array => {
	for (let i = 1; i < v0BaseGlyphs.length; i++) {
		if (v0BaseGlyphs[i].glyphID <= v0BaseGlyphs[i - 1].glyphID) {
			throw new Error(
				`writeColrV1: v0 baseGlyphs must be sorted ascending by glyphID`
			);
		}
	}
	for (let i = 1; i < v1BaseGlyphs.length; i++) {
		if (v1BaseGlyphs[i].glyphID <= v1BaseGlyphs[i - 1].glyphID) {
			throw new Error(
				`writeColrV1: v1 baseGlyphs must be sorted ascending by glyphID`
			);
		}
	}

	const HEADER = 34;
	const V0_BASE_REC = 6;
	const V0_LAYER_REC = 4;
	const numV0Base = v0BaseGlyphs.length;
	const totalV0Layers = v0BaseGlyphs.reduce((s, b) => s + b.layers.length, 0);

	// Phase 1: scan top-level paints, allocate LayerList indices for any
	// PaintColrLayers we encounter. The flat layerPaints list holds the
	// children of every PaintColrLayers in registration order.
	type TopLevelAllocation =
		| { kind: 'direct'; paint: Paint }
		| { kind: 'layers'; firstLayerIndex: number; numLayers: number };
	const topLevelAllocations: TopLevelAllocation[] = [];
	const layerPaints: Paint[] = [];
	for (const rec of v1BaseGlyphs) {
		if (rec.paint.kind === 'colrLayers') {
			const firstLayerIndex = layerPaints.length;
			for (const child of rec.paint.layers) layerPaints.push(child);
			topLevelAllocations.push({
				kind: 'layers',
				firstLayerIndex,
				numLayers: rec.paint.layers.length
			});
		} else {
			topLevelAllocations.push({ kind: 'direct', paint: rec.paint });
		}
	}

	// Phase 2: emit all paint sub-tables into a single buffer, tracking
	// the byte offset of each top-level paint AND each layer paint within
	// the paint buffer. PaintColrLayers headers are written with the
	// LayerList index pre-computed in phase 1, so no fixups needed.
	const paintBuf = new ByteBuf();
	const topLevelOffsets: number[] = [];
	for (const alloc of topLevelAllocations) {
		topLevelOffsets.push(paintBuf.length);
		if (alloc.kind === 'layers') {
			// PaintColrLayers (format 1):
			//   uint8 format = 1
			//   uint8 numLayers
			//   uint32 firstLayerIndex (into LayerList)
			paintBuf.writeUint8(1);
			if (alloc.numLayers > 0xff) {
				throw new Error(
					`PaintColrLayers: numLayers ${alloc.numLayers} > 255 — split into multiple groups`
				);
			}
			paintBuf.writeUint8(alloc.numLayers);
			paintBuf.writeUint32(alloc.firstLayerIndex);
		} else {
			writePaint(paintBuf, alloc.paint);
		}
	}
	const layerPaintOffsets: number[] = [];
	for (const child of layerPaints) {
		layerPaintOffsets.push(paintBuf.length);
		writePaint(paintBuf, child);
	}

	const baseV0Off = HEADER;
	const layerV0Off = baseV0Off + numV0Base * V0_BASE_REC;
	const v1BaseListOff =
		v0BaseGlyphs.length === 0 && v1BaseGlyphs.length === 0
			? 0
			: layerV0Off + totalV0Layers * V0_LAYER_REC;
	const v1BaseListSize = v1BaseGlyphs.length === 0 ? 0 : 4 + v1BaseGlyphs.length * 6;
	const v1LayerListOff = v1BaseGlyphs.length === 0 ? 0 : v1BaseListOff + v1BaseListSize;
	// LayerList header = uint32 numLayers + Offset32[numLayers]
	const v1LayerListSize =
		v1BaseGlyphs.length === 0 ? 0 : 4 + layerPaints.length * 4;
	const v1PaintsOff = v1BaseGlyphs.length === 0 ? 0 : v1LayerListOff + v1LayerListSize;
	const totalSize =
		v1BaseGlyphs.length === 0
			? layerV0Off + totalV0Layers * V0_LAYER_REC
			: v1PaintsOff + paintBuf.length;

	const buf = new ByteBuf();
	buf.writeUint16(1);
	buf.writeUint16(numV0Base);
	buf.writeUint32(numV0Base === 0 ? 0 : baseV0Off);
	buf.writeUint32(totalV0Layers === 0 ? 0 : layerV0Off);
	buf.writeUint16(totalV0Layers);
	buf.writeUint32(v1BaseListOff);
	buf.writeUint32(layerPaints.length > 0 ? v1LayerListOff : 0);
	buf.writeUint32(0); // clipListOffset
	buf.writeUint32(0); // varIndexMapOffset
	buf.writeUint32(0); // itemVariationStoreOffset

	let layerCursor = 0;
	for (const b of v0BaseGlyphs) {
		buf.writeUint16(b.glyphID);
		buf.writeUint16(layerCursor);
		buf.writeUint16(b.layers.length);
		layerCursor += b.layers.length;
	}
	for (const b of v0BaseGlyphs) {
		for (const l of b.layers) {
			buf.writeUint16(l.glyphID);
			buf.writeUint16(l.paletteIndex);
		}
	}

	if (v1BaseGlyphs.length > 0) {
		// BaseGlyphList: uint32 numRecords + (uint16 glyphID + Offset32 paintOffset)[]
		buf.writeUint32(v1BaseGlyphs.length);
		const paintsFromBaseList = v1PaintsOff - v1BaseListOff;
		for (let i = 0; i < v1BaseGlyphs.length; i++) {
			buf.writeUint16(v1BaseGlyphs[i].glyphID);
			buf.writeUint32(paintsFromBaseList + topLevelOffsets[i]);
		}
		// LayerList: uint32 numLayers + Offset32[numLayers] (each from
		// LayerList start). When numLayers is 0 we still emit the
		// 4-byte header so the byte layout matches the computed size.
		buf.writeUint32(layerPaints.length);
		const paintsFromLayerList = v1PaintsOff - v1LayerListOff;
		for (let i = 0; i < layerPaints.length; i++) {
			buf.writeUint32(paintsFromLayerList + layerPaintOffsets[i]);
		}
		buf.writeBytes(paintBuf.toUint8Array());
	}

	const out = buf.toUint8Array();
	if (out.length !== totalSize) {
		throw new Error(`writeColrV1: size mismatch — expected ${totalSize}, got ${out.length}`);
	}
	return out;
};

// Helpers for the variable-length paint sub-tables. Offset24 is
// written as 3 bytes big-endian; F2DOT14 is a fixed-point 16-bit
// 0..1 (or signed) — 0x0000 = 0.0, 0x4000 = 1.0.

const writeUint24 = (buf: ByteBuf, v: number): void => {
	if (!Number.isInteger(v) || v < 0 || v > 0xffffff) {
		throw new Error(`writeUint24 out of range: ${v}`);
	}
	buf.writeUint8((v >> 16) & 0xff);
	buf.writeUint8((v >> 8) & 0xff);
	buf.writeUint8(v & 0xff);
};

const writeF2Dot14 = (buf: ByteBuf, v: number): void => {
	// Spec range −2 .. ~1.999.... Clamp to that.
	const clamped = Math.max(-2, Math.min(1.99993896484375, v));
	const fixed = Math.round(clamped * 16384);
	buf.writeInt16(fixed);
};

const writePaint = (buf: ByteBuf, paint: Paint): void => {
	if (paint.kind === 'colrLayers') {
		// PaintColrLayers is emitted by writeColrV1 directly (it needs to
		// know the LayerList index allocation). Nested PaintColrLayers
		// inside a PaintColrLayers isn't supported — but the editor's
		// data model can't produce that shape anyway.
		throw new Error(
			'writePaint: PaintColrLayers must be emitted by writeColrV1 top-level handler, not recursively'
		);
	}
	if (paint.kind === 'solid') {
		// Format 2: PaintSolid.
		//   uint8 format = 2
		//   uint16 paletteIndex
		//   F2DOT14 alpha
		buf.writeUint8(2);
		buf.writeUint16(paint.paletteIndex);
		writeF2Dot14(buf, paint.alpha ?? 1);
		return;
	}
	if (paint.kind === 'glyph') {
		// Format 10: PaintGlyph.
		//   uint8 format = 10
		//   Offset24 paintOffset (from start of this Paint)
		//   uint16 glyphID
		// Total: 6 bytes header + the nested paint.
		const startOff = buf.length;
		buf.writeUint8(10);
		// Offset24 — paint sits immediately after the 6-byte header
		writeUint24(buf, 6);
		buf.writeUint16(paint.glyphID);
		const after = buf.length;
		if (after - startOff !== 6) {
			throw new Error('writePaint glyph: header byte count drift');
		}
		writePaint(buf, paint.paint);
		return;
	}
	if (paint.kind === 'linearGradient') {
		// Format 4: PaintLinearGradient.
		//   uint8 format = 4
		//   Offset24 colorLineOffset (from start of this Paint)
		//   FWORD x0, y0, x1, y1, x2, y2
		// Total: 4 + 12 = 16 bytes header + ColorLine.
		buf.writeUint8(4);
		writeUint24(buf, 16); // ColorLine sits right after the 16-byte header
		buf.writeInt16(Math.round(paint.x0));
		buf.writeInt16(Math.round(paint.y0));
		buf.writeInt16(Math.round(paint.x1));
		buf.writeInt16(Math.round(paint.y1));
		buf.writeInt16(Math.round(paint.x2));
		buf.writeInt16(Math.round(paint.y2));
		writeColorLine(buf, paint.stops);
		return;
	}
	if (paint.kind === 'radialGradient') {
		// Format 6: PaintRadialGradient.
		//   uint8 format = 6
		//   Offset24 colorLineOffset (from start of this Paint)
		//   FWORD x0, y0
		//   UFWORD r0
		//   FWORD x1, y1
		//   UFWORD r1
		// Total: 4 + 12 = 16 bytes header + ColorLine.
		buf.writeUint8(6);
		writeUint24(buf, 16);
		buf.writeInt16(Math.round(paint.x0));
		buf.writeInt16(Math.round(paint.y0));
		buf.writeUint16(Math.max(0, Math.round(paint.r0)));
		buf.writeInt16(Math.round(paint.x1));
		buf.writeInt16(Math.round(paint.y1));
		buf.writeUint16(Math.max(0, Math.round(paint.r1)));
		writeColorLine(buf, paint.stops);
		return;
	}
};

const writeColorLine = (buf: ByteBuf, stops: ColorStop[]): void => {
	// ColorLine:
	//   uint8 extend (= 0 pad)
	//   uint16 numStops
	//   ColorStop[numStops]:
	//     F2DOT14 stopOffset
	//     uint16 paletteIndex
	//     F2DOT14 alpha
	buf.writeUint8(0);
	buf.writeUint16(stops.length);
	for (const s of stops) {
		writeF2Dot14(buf, s.offset);
		buf.writeUint16(s.paletteIndex);
		writeF2Dot14(buf, s.alpha ?? 1);
	}
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

// ---------------------------------------------------------------- Integration

/**
 * Splice a COLR v0 + CPAL v0 pair into an existing OTF / TTF buffer.
 * Returns the augmented buffer. The original is not mutated.
 *
 * The caller is responsible for:
 *   - Creating the synthetic per-layer glyphs in the source font BEFORE
 *     calling this (each `LayerRecord.glyphID` must already exist).
 *   - Sorting `baseGlyphs` ascending by glyphID (enforced by writeColrV0).
 *   - Making palettes agree on length (enforced by writeCpalV0).
 *
 * No-op (returns the input as-is) when there are no base glyphs OR no
 * palettes — both tables are useless without their counterpart.
 */
export const applyColorFontTables = (
	sfntBuf: Uint8Array,
	baseGlyphs: BaseGlyphRecord[],
	palettes: ColorPalette[],
	v1BaseGlyphs: BaseGlyphPaint[] = []
): Uint8Array => {
	if (baseGlyphs.length === 0 && v1BaseGlyphs.length === 0) return sfntBuf;
	if (palettes.length === 0) return sfntBuf;
	const cpal = writeCpalV0(palettes);
	// COLR v1 when any gradient layers are present; v0 otherwise. The
	// v1 table includes the v0 sections inline so older renderers still
	// see flat-fill fallbacks.
	const colr =
		v1BaseGlyphs.length > 0
			? writeColrV1(baseGlyphs, v1BaseGlyphs)
			: writeColrV0(baseGlyphs);
	const withCpal = spliceTable(sfntBuf, 'CPAL', cpal);
	return spliceTable(withCpal, 'COLR', colr);
};
