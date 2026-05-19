/**
 * GPOS Mark-to-Base (Lookup Type 4) binary writer.
 *
 * Context: opentype.js v2 emits the GPOS table shell but its subtable writers
 * (subtableMakers2 in opentype.mjs) are empty — Types 1-9 are not implemented
 * for write. To enable anchor-based mark positioning without Pyodide, we
 * construct the GPOS binary ourselves and splice it into the SFNT directory
 * after opentype.js produces the rest of the font.
 *
 * This module ships the spec-conformant binary primitives. The SFNT splicer
 * + lookup-list / script-list / feature-list wrappers come in subsequent
 * commits. Each layer is independently tested against the OpenType spec's
 * binary format (https://learn.microsoft.com/en-us/typography/opentype/spec/gpos).
 *
 * SPEC INVARIANTS we rely on:
 *   - All offsets are uint16 (max 65535) and computed from the start of
 *     the containing table.
 *   - Coverage Format 1 glyph arrays MUST be sorted ascending.
 *   - Anchor Format 1 is the minimal form: x + y coordinates only.
 *   - markClass values are 0-indexed into the BaseRecord anchor arrays.
 */

// Binary writer helpers --------------------------------------------------

/** Mutable byte buffer that grows as values are appended. */
export class ByteBuf {
	private buf = new Uint8Array(64);
	private len = 0;

	private ensure(extra: number): void {
		const need = this.len + extra;
		if (need <= this.buf.length) return;
		let cap = this.buf.length;
		while (cap < need) cap *= 2;
		const next = new Uint8Array(cap);
		next.set(this.buf.subarray(0, this.len));
		this.buf = next;
	}

	get length(): number {
		return this.len;
	}

	/** Append a big-endian unsigned 16-bit integer. */
	writeUint16(v: number): this {
		if (!Number.isInteger(v) || v < 0 || v > 0xffff)
			throw new Error(`writeUint16 out of range: ${v}`);
		this.ensure(2);
		this.buf[this.len++] = (v >> 8) & 0xff;
		this.buf[this.len++] = v & 0xff;
		return this;
	}

	/** Append a big-endian signed 16-bit integer (two's complement). */
	writeInt16(v: number): this {
		if (!Number.isInteger(v) || v < -32768 || v > 32767)
			throw new Error(`writeInt16 out of range: ${v}`);
		const u = v < 0 ? v + 0x10000 : v;
		this.ensure(2);
		this.buf[this.len++] = (u >> 8) & 0xff;
		this.buf[this.len++] = u & 0xff;
		return this;
	}

	/** Append raw bytes from another buffer. */
	writeBytes(bytes: Uint8Array): this {
		this.ensure(bytes.length);
		this.buf.set(bytes, this.len);
		this.len += bytes.length;
		return this;
	}

	/** Snapshot a copy of the current bytes. */
	toUint8Array(): Uint8Array {
		return this.buf.slice(0, this.len);
	}
}

// Anchor Format 1 --------------------------------------------------------

export type Anchor = { x: number; y: number };

/**
 * Anchor Table, Format 1 — the minimal form.
 *   uint16 anchorFormat = 1
 *   int16  xCoordinate
 *   int16  yCoordinate
 *
 * Total: 6 bytes.
 */
export const writeAnchorFormat1 = (anchor: Anchor): Uint8Array => {
	const buf = new ByteBuf();
	buf.writeUint16(1);
	buf.writeInt16(Math.round(anchor.x));
	buf.writeInt16(Math.round(anchor.y));
	return buf.toUint8Array();
};

// Coverage Format 1 ------------------------------------------------------

/**
 * Coverage Table, Format 1 (glyph list).
 *   uint16 coverageFormat = 1
 *   uint16 glyphCount
 *   uint16 glyphArray[glyphCount]  (ASCENDING SORTED — spec invariant)
 *
 * Throws if input glyphs aren't sorted ascending and unique; this catches
 * caller bugs that would otherwise produce a technically-valid but
 * shaper-rejecting font.
 */
export const writeCoverageFormat1 = (glyphs: number[]): Uint8Array => {
	if (glyphs.length === 0) throw new Error('Coverage table must cover at least one glyph');
	for (let i = 0; i < glyphs.length; i++) {
		const g = glyphs[i];
		if (!Number.isInteger(g) || g < 0 || g > 0xffff)
			throw new Error(`Coverage glyph index out of range: ${g}`);
		if (i > 0 && g <= glyphs[i - 1])
			throw new Error(
				`Coverage Format 1 requires ascending unique glyph IDs (got ${glyphs[i - 1]} then ${g})`
			);
	}
	const buf = new ByteBuf();
	buf.writeUint16(1); // coverageFormat
	buf.writeUint16(glyphs.length);
	for (const g of glyphs) buf.writeUint16(g);
	return buf.toUint8Array();
};

// MarkArray --------------------------------------------------------------

export type MarkRecord = { markClass: number; anchor: Anchor };

/**
 * MarkArray Table.
 *   uint16 markCount
 *   MarkRecord[markCount]:
 *     uint16   markClass
 *     Offset16 markAnchorOffset  (from start of MarkArray)
 *   (then) Anchor tables — pointed to by the offsets above
 *
 * Marks must be parallel to the markCoverage glyph list. markCount === markCoverage.glyphCount.
 */
export const writeMarkArray = (marks: MarkRecord[]): Uint8Array => {
	if (marks.length === 0) throw new Error('MarkArray must have at least one MarkRecord');
	const header = new ByteBuf();
	const anchors = new ByteBuf();
	// Header is: uint16 markCount + (4 bytes per record) = 2 + 4*N
	const headerSize = 2 + 4 * marks.length;
	header.writeUint16(marks.length);
	for (const m of marks) {
		if (!Number.isInteger(m.markClass) || m.markClass < 0 || m.markClass > 0xffff)
			throw new Error(`MarkRecord.markClass out of range: ${m.markClass}`);
		header.writeUint16(m.markClass);
		// Anchor offset is from MarkArray start, which is `headerSize + anchors.length so far`.
		header.writeUint16(headerSize + anchors.length);
		anchors.writeBytes(writeAnchorFormat1(m.anchor));
	}
	const out = new ByteBuf();
	out.writeBytes(header.toUint8Array());
	out.writeBytes(anchors.toUint8Array());
	return out.toUint8Array();
};

// BaseArray --------------------------------------------------------------

export type BaseRecord = {
	/** Length must equal the GPOS Lookup Type 4 subtable's markClassCount.
	 *  null entries become offset 0 (no attachment for that class). */
	anchors: (Anchor | null)[];
};

/**
 * BaseArray Table.
 *   uint16 baseCount
 *   BaseRecord[baseCount]:
 *     Offset16[markClassCount] baseAnchorOffsets  (from start of BaseArray)
 *   (then) Anchor tables — pointed to by the offsets above, null entries → 0
 *
 * baseCount === baseCoverage.glyphCount. Every BaseRecord MUST have exactly
 * markClassCount entries (use null for "no anchor for that class").
 */
export const writeBaseArray = (
	bases: BaseRecord[],
	markClassCount: number
): Uint8Array => {
	if (bases.length === 0) throw new Error('BaseArray must have at least one BaseRecord');
	if (!Number.isInteger(markClassCount) || markClassCount < 1)
		throw new Error(`markClassCount must be ≥ 1, got ${markClassCount}`);
	for (let i = 0; i < bases.length; i++) {
		if (bases[i].anchors.length !== markClassCount)
			throw new Error(
				`BaseRecord[${i}] has ${bases[i].anchors.length} anchors, expected ${markClassCount}`
			);
	}
	const header = new ByteBuf();
	const anchors = new ByteBuf();
	// Header: uint16 baseCount + (2 bytes * markClassCount * baseCount)
	const headerSize = 2 + 2 * markClassCount * bases.length;
	header.writeUint16(bases.length);
	for (const base of bases) {
		for (const a of base.anchors) {
			if (a === null) {
				header.writeUint16(0); // null offset = no anchor
			} else {
				header.writeUint16(headerSize + anchors.length);
				anchors.writeBytes(writeAnchorFormat1(a));
			}
		}
	}
	const out = new ByteBuf();
	out.writeBytes(header.toUint8Array());
	out.writeBytes(anchors.toUint8Array());
	return out.toUint8Array();
};

// MarkBasePosFormat1 -----------------------------------------------------

export type MarkBasePosSubtable = {
	/** Mark glyph indices (must be sorted ascending). Parallel to markRecords. */
	markGlyphs: number[];
	/** Base glyph indices (must be sorted ascending). Parallel to baseRecords. */
	baseGlyphs: number[];
	/** One MarkRecord per mark glyph (same order). */
	markRecords: MarkRecord[];
	/** One BaseRecord per base glyph; each carries markClassCount anchors. */
	baseRecords: BaseRecord[];
	/** Number of distinct markClass values used. Determines BaseRecord shape. */
	markClassCount: number;
};

/**
 * MarkBasePosFormat1 — GPOS Lookup Type 4 subtable.
 *   uint16   posFormat = 1
 *   Offset16 markCoverageOffset  (from start of subtable → Coverage table)
 *   Offset16 baseCoverageOffset
 *   uint16   markClassCount
 *   Offset16 markArrayOffset
 *   Offset16 baseArrayOffset
 *   (then) MarkCoverage table, BaseCoverage table, MarkArray, BaseArray.
 *
 * Spec invariant: markRecords.length === markGlyphs.length, same for bases.
 * Coverage glyph lists must be ascending and unique (enforced downstream).
 */
export const writeMarkBasePosFormat1 = (sub: MarkBasePosSubtable): Uint8Array => {
	if (sub.markGlyphs.length !== sub.markRecords.length)
		throw new Error('markGlyphs and markRecords must be parallel arrays');
	if (sub.baseGlyphs.length !== sub.baseRecords.length)
		throw new Error('baseGlyphs and baseRecords must be parallel arrays');

	// Build child tables (each independently spec-validated):
	const markCoverage = writeCoverageFormat1(sub.markGlyphs);
	const baseCoverage = writeCoverageFormat1(sub.baseGlyphs);
	const markArray = writeMarkArray(sub.markRecords);
	const baseArray = writeBaseArray(sub.baseRecords, sub.markClassCount);

	// Header is fixed-size: 6 × uint16 = 12 bytes.
	const headerSize = 12;
	const markCoverageOffset = headerSize;
	const baseCoverageOffset = markCoverageOffset + markCoverage.length;
	const markArrayOffset = baseCoverageOffset + baseCoverage.length;
	const baseArrayOffset = markArrayOffset + markArray.length;

	const buf = new ByteBuf();
	buf.writeUint16(1); // posFormat
	buf.writeUint16(markCoverageOffset);
	buf.writeUint16(baseCoverageOffset);
	buf.writeUint16(sub.markClassCount);
	buf.writeUint16(markArrayOffset);
	buf.writeUint16(baseArrayOffset);
	buf.writeBytes(markCoverage);
	buf.writeBytes(baseCoverage);
	buf.writeBytes(markArray);
	buf.writeBytes(baseArray);
	return buf.toUint8Array();
};

// OpenType tag (4 ASCII chars) -------------------------------------------

/** Encode a 4-character OpenType tag as 4 bytes (padded with space if short). */
export const writeTag = (tag: string): Uint8Array => {
	if (typeof tag !== 'string' || tag.length === 0 || tag.length > 4)
		throw new Error(`Tag must be 1-4 chars, got "${tag}"`);
	const padded = (tag + '    ').slice(0, 4); // pad with spaces per spec
	const out = new Uint8Array(4);
	for (let i = 0; i < 4; i++) {
		const code = padded.charCodeAt(i);
		if (code < 0x20 || code > 0x7e) throw new Error(`Tag char out of ASCII: ${tag}`);
		out[i] = code;
	}
	return out;
};

// LangSys ---------------------------------------------------------------

/**
 * LangSys Table.
 *   Offset16 lookupOrderOffset = 0  (NULL, reserved)
 *   uint16   requiredFeatureIndex = 0xFFFF (none)
 *   uint16   featureIndexCount
 *   uint16   featureIndices[featureIndexCount]
 */
export const writeLangSysTable = (featureIndices: number[]): Uint8Array => {
	const buf = new ByteBuf();
	buf.writeUint16(0); // lookupOrderOffset (null)
	buf.writeUint16(0xffff); // requiredFeatureIndex (none)
	buf.writeUint16(featureIndices.length);
	for (const i of featureIndices) buf.writeUint16(i);
	return buf.toUint8Array();
};

// Script -----------------------------------------------------------------

/**
 * Script Table.
 *   Offset16 defaultLangSysOffset (may be 0)
 *   uint16   langSysCount
 *   LangSysRecord[langSysCount]:
 *     Tag      langSysTag (4 bytes)
 *     Offset16 langSysOffset
 *   (then) LangSys tables
 *
 * For our 'mark' feature use case we only need the default LangSys —
 * langSysCount is 0 and the default LangSys carries the feature index.
 */
export const writeScriptTable = (defaultLangSysFeatureIndices: number[]): Uint8Array => {
	const langSys = writeLangSysTable(defaultLangSysFeatureIndices);
	// Header is 4 bytes: defaultLangSysOffset + langSysCount.
	const headerSize = 4;
	const buf = new ByteBuf();
	buf.writeUint16(headerSize); // defaultLangSysOffset (points right past header)
	buf.writeUint16(0); // langSysCount (no additional named languages)
	buf.writeBytes(langSys);
	return buf.toUint8Array();
};

// ScriptList -------------------------------------------------------------

export type ScriptRecord = {
	tag: string; // 4-char OpenType script tag (e.g., 'DFLT', 'latn')
	defaultLangSysFeatureIndices: number[];
};

/**
 * ScriptList Table.
 *   uint16 scriptCount
 *   ScriptRecord[scriptCount]:
 *     Tag      scriptTag (4 bytes)
 *     Offset16 scriptOffset
 *   (then) Script tables
 *
 * Records MUST be sorted ASCII-ascending by tag per spec. We sort here so
 * callers don't have to think about it.
 */
export const writeScriptList = (scripts: ScriptRecord[]): Uint8Array => {
	if (scripts.length === 0) throw new Error('ScriptList must contain at least one script');
	const sorted = [...scripts].sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));
	const header = new ByteBuf();
	const tables = new ByteBuf();
	const headerSize = 2 + 6 * sorted.length; // count + 6-byte records
	header.writeUint16(sorted.length);
	for (const s of sorted) {
		const scriptBytes = writeScriptTable(s.defaultLangSysFeatureIndices);
		header.writeBytes(writeTag(s.tag));
		header.writeUint16(headerSize + tables.length);
		tables.writeBytes(scriptBytes);
	}
	const out = new ByteBuf();
	out.writeBytes(header.toUint8Array());
	out.writeBytes(tables.toUint8Array());
	return out.toUint8Array();
};

// Feature ----------------------------------------------------------------

/**
 * Feature Table.
 *   Offset16 featureParams = 0 (no params for 'mark', 'liga', 'kern')
 *   uint16   lookupIndexCount
 *   uint16   lookupListIndices[lookupIndexCount]
 */
export const writeFeatureTable = (lookupListIndices: number[]): Uint8Array => {
	const buf = new ByteBuf();
	buf.writeUint16(0); // featureParams (none)
	buf.writeUint16(lookupListIndices.length);
	for (const i of lookupListIndices) buf.writeUint16(i);
	return buf.toUint8Array();
};

// FeatureList ------------------------------------------------------------

export type FeatureRecord = {
	tag: string; // 4-char tag like 'mark', 'liga', 'kern'
	lookupListIndices: number[];
};

/**
 * FeatureList Table.
 *   uint16 featureCount
 *   FeatureRecord[featureCount]:
 *     Tag      featureTag (4 bytes)
 *     Offset16 featureOffset
 *   (then) Feature tables
 *
 * Records are NOT sorted by tag (feature indexes are referenced from
 * LangSys, so ordering is meaningful). Caller controls the index space.
 */
export const writeFeatureList = (features: FeatureRecord[]): Uint8Array => {
	if (features.length === 0) throw new Error('FeatureList must contain at least one feature');
	const header = new ByteBuf();
	const tables = new ByteBuf();
	const headerSize = 2 + 6 * features.length;
	header.writeUint16(features.length);
	for (const f of features) {
		const featureBytes = writeFeatureTable(f.lookupListIndices);
		header.writeBytes(writeTag(f.tag));
		header.writeUint16(headerSize + tables.length);
		tables.writeBytes(featureBytes);
	}
	const out = new ByteBuf();
	out.writeBytes(header.toUint8Array());
	out.writeBytes(tables.toUint8Array());
	return out.toUint8Array();
};

// Lookup -----------------------------------------------------------------

/**
 * Lookup Table.
 *   uint16   lookupType
 *   uint16   lookupFlag
 *   uint16   subTableCount
 *   Offset16 subtableOffsets[subTableCount]
 *   (no markFilteringSet field since lookupFlag bit UseMarkFilteringSet = 0)
 *   (then) subtable binaries
 */
export const writeLookupTable = (
	lookupType: number,
	lookupFlag: number,
	subtables: Uint8Array[]
): Uint8Array => {
	if (!Number.isInteger(lookupType) || lookupType < 1 || lookupType > 9)
		throw new Error(`lookupType must be 1-9, got ${lookupType}`);
	if (!Number.isInteger(lookupFlag) || lookupFlag < 0 || lookupFlag > 0xffff)
		throw new Error(`lookupFlag out of range: ${lookupFlag}`);
	if (subtables.length === 0)
		throw new Error('Lookup must have at least one subtable');
	const header = new ByteBuf();
	const body = new ByteBuf();
	const headerSize = 6 + 2 * subtables.length;
	header.writeUint16(lookupType);
	header.writeUint16(lookupFlag);
	header.writeUint16(subtables.length);
	for (const sub of subtables) {
		header.writeUint16(headerSize + body.length);
		body.writeBytes(sub);
	}
	const out = new ByteBuf();
	out.writeBytes(header.toUint8Array());
	out.writeBytes(body.toUint8Array());
	return out.toUint8Array();
};

// LookupList -------------------------------------------------------------

/**
 * LookupList Table.
 *   uint16   lookupCount
 *   Offset16 lookupOffsets[lookupCount]
 *   (then) Lookup tables
 *
 * Each `lookups` entry is a complete already-serialized Lookup table.
 */
export const writeLookupList = (lookups: Uint8Array[]): Uint8Array => {
	if (lookups.length === 0) throw new Error('LookupList must contain at least one lookup');
	const header = new ByteBuf();
	const body = new ByteBuf();
	const headerSize = 2 + 2 * lookups.length;
	header.writeUint16(lookups.length);
	for (const l of lookups) {
		header.writeUint16(headerSize + body.length);
		body.writeBytes(l);
	}
	const out = new ByteBuf();
	out.writeBytes(header.toUint8Array());
	out.writeBytes(body.toUint8Array());
	return out.toUint8Array();
};

// Top-level GPOS table ---------------------------------------------------

/**
 * GPOS Table v1.0 header + the three child tables.
 *   uint16  majorVersion = 1
 *   uint16  minorVersion = 0
 *   Offset16 scriptListOffset
 *   Offset16 featureListOffset
 *   Offset16 lookupListOffset
 *   (then) ScriptList, FeatureList, LookupList
 *
 * Order matches the spec recommendation; offsets are computed from the
 * start of the GPOS table.
 */
export const writeGposTable = (input: {
	scripts: ScriptRecord[];
	features: FeatureRecord[];
	lookups: Uint8Array[];
}): Uint8Array => {
	const scriptList = writeScriptList(input.scripts);
	const featureList = writeFeatureList(input.features);
	const lookupList = writeLookupList(input.lookups);

	const headerSize = 10; // 5 × uint16
	const scriptListOffset = headerSize;
	const featureListOffset = scriptListOffset + scriptList.length;
	const lookupListOffset = featureListOffset + featureList.length;

	const buf = new ByteBuf();
	buf.writeUint16(1); // majorVersion
	buf.writeUint16(0); // minorVersion
	buf.writeUint16(scriptListOffset);
	buf.writeUint16(featureListOffset);
	buf.writeUint16(lookupListOffset);
	buf.writeBytes(scriptList);
	buf.writeBytes(featureList);
	buf.writeBytes(lookupList);
	return buf.toUint8Array();
};
