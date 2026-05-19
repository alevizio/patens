/**
 * SFNT directory parser + table splicer.
 *
 * Used to inject our hand-built GPOS table (see gpos-mark.ts) into the OTF
 * binary that opentype.js emits — opentype.js can't write GPOS subtables
 * for Mark-to-Base positioning, so we splice in afterward.
 *
 * SFNT (OpenType) file layout:
 *
 *   Offset Table (12 bytes):
 *     uint32 sfntVersion  ('OTTO' for OpenType/CFF, 0x00010000 for TT)
 *     uint16 numTables
 *     uint16 searchRange   (2^floor(log2(numTables)) * 16)
 *     uint16 entrySelector (floor(log2(numTables)))
 *     uint16 rangeShift    (numTables * 16 - searchRange)
 *
 *   Table Directory (16 bytes per record, count = numTables):
 *     Tag    tag
 *     uint32 checksum
 *     uint32 offset       (from start of file)
 *     uint32 length       (excluding the 4-byte pad)
 *
 *   Table data — each padded to a 4-byte boundary.
 */

/** Big-endian uint32 read from a Uint8Array at `offset`. */
const readUint32 = (buf: Uint8Array, offset: number): number =>
	(buf[offset] * 0x1000000 +
		(buf[offset + 1] << 16) +
		(buf[offset + 2] << 8) +
		buf[offset + 3]) >>>
	0;

/** Big-endian uint16 read. */
const readUint16 = (buf: Uint8Array, offset: number): number =>
	(buf[offset] << 8) | buf[offset + 1];

/** Big-endian uint32 write. */
const writeUint32 = (buf: Uint8Array, offset: number, value: number): void => {
	const u = value >>> 0;
	buf[offset] = (u >>> 24) & 0xff;
	buf[offset + 1] = (u >>> 16) & 0xff;
	buf[offset + 2] = (u >>> 8) & 0xff;
	buf[offset + 3] = u & 0xff;
};

/** Big-endian uint16 write. */
const writeUint16 = (buf: Uint8Array, offset: number, value: number): void => {
	buf[offset] = (value >>> 8) & 0xff;
	buf[offset + 1] = value & 0xff;
};

/** 4-byte ASCII tag read as a string. */
const readTag = (buf: Uint8Array, offset: number): string =>
	String.fromCharCode(buf[offset], buf[offset + 1], buf[offset + 2], buf[offset + 3]);

/** 4-byte ASCII tag write. Throws on non-ASCII / non-4-char input. */
const writeTagBytes = (buf: Uint8Array, offset: number, tag: string): void => {
	const padded = (tag + '    ').slice(0, 4);
	for (let i = 0; i < 4; i++) {
		const code = padded.charCodeAt(i);
		if (code < 0x20 || code > 0x7e)
			throw new Error(`SFNT tag must be ASCII, got "${tag}"`);
		buf[offset + i] = code;
	}
};

// SFNT directory types ----------------------------------------------------

export type SfntTableRecord = {
	tag: string;
	checksum: number;
	offset: number;
	length: number;
};

export type SfntDirectory = {
	sfntVersion: number; // 0x00010000 (TT) or 0x4F54544F ('OTTO')
	tables: SfntTableRecord[];
};

/** Parse the SFNT offset table + directory from a font binary. */
export const parseSfntDirectory = (buf: Uint8Array): SfntDirectory => {
	if (buf.length < 12) throw new Error('Buffer too small for SFNT offset table');
	const sfntVersion = readUint32(buf, 0);
	const numTables = readUint16(buf, 4);
	if (numTables === 0) throw new Error('SFNT has zero tables');
	const directorySize = 12 + numTables * 16;
	if (buf.length < directorySize)
		throw new Error(`Buffer too small for ${numTables}-table directory`);

	const tables: SfntTableRecord[] = [];
	for (let i = 0; i < numTables; i++) {
		const rec = 12 + i * 16;
		tables.push({
			tag: readTag(buf, rec),
			checksum: readUint32(buf, rec + 4),
			offset: readUint32(buf, rec + 8),
			length: readUint32(buf, rec + 12)
		});
	}
	return { sfntVersion, tables };
};

/** Get the byte slice for a specific table by tag (returns null if absent). */
export const getTableBytes = (
	buf: Uint8Array,
	directory: SfntDirectory,
	tag: string
): Uint8Array | null => {
	const rec = directory.tables.find((t) => t.tag === tag);
	if (!rec) return null;
	return buf.slice(rec.offset, rec.offset + rec.length);
};

// Checksum + padding ------------------------------------------------------

/**
 * OpenType table checksum: sum of all uint32s from the start of the table
 * data, padded to a 4-byte boundary with zeros for the sum (not the file).
 * Wraps to 32 bits.
 *
 * Per spec: tables are conceptually treated as a sequence of uint32, with
 * any final partial uint32 padded with zero bytes.
 */
export const computeTableChecksum = (data: Uint8Array): number => {
	let sum = 0;
	const fullWords = Math.floor(data.length / 4);
	for (let i = 0; i < fullWords; i++) {
		const off = i * 4;
		const word =
			data[off] * 0x1000000 +
			(data[off + 1] << 16) +
			(data[off + 2] << 8) +
			data[off + 3];
		sum = (sum + word) >>> 0;
	}
	// Pad final partial uint32 with zeros conceptually
	const remainder = data.length % 4;
	if (remainder > 0) {
		let word = 0;
		for (let i = 0; i < remainder; i++) {
			word |= data[fullWords * 4 + i] << ((3 - i) * 8);
		}
		sum = (sum + (word >>> 0)) >>> 0;
	}
	return sum;
};

/** Pad a table's data to a 4-byte boundary with zero bytes. Returns a new
 *  buffer (input is not mutated). */
export const padTable = (data: Uint8Array): Uint8Array => {
	const padLen = (4 - (data.length % 4)) % 4;
	if (padLen === 0) return data;
	const out = new Uint8Array(data.length + padLen);
	out.set(data);
	return out;
};

// Splice ------------------------------------------------------------------

/**
 * Splice a new GPOS table into an SFNT binary, replacing the existing one
 * if present. Returns a fresh buffer.
 *
 * Steps:
 *   1. Parse existing directory.
 *   2. Build new directory: existing tables minus any old GPOS, plus a
 *      new GPOS record. Tables are sorted ascending by tag per spec.
 *   3. Pad each table to 4 bytes; recompute offsets.
 *   4. Recompute head.checkSumAdjustment so the whole-file checksum =
 *      0xB1B0AFBA, per spec.
 */
export const spliceTable = (
	originalBuf: Uint8Array,
	tag: string,
	newTableData: Uint8Array
): Uint8Array => {
	const dir = parseSfntDirectory(originalBuf);

	// Build the new table list: existing minus replaced, plus new entry.
	const otherTables: Array<{ tag: string; data: Uint8Array }> = [];
	for (const rec of dir.tables) {
		if (rec.tag === tag) continue; // drop the old entry; we'll add the new one
		const data = originalBuf.slice(rec.offset, rec.offset + rec.length);
		otherTables.push({ tag: rec.tag, data });
	}
	otherTables.push({ tag, data: newTableData });
	// SFNT directory MUST be sorted alphabetically by tag (per spec).
	otherTables.sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));

	// Compute new directory: offsets are after the offset table + directory.
	const numTables = otherTables.length;
	const directorySize = 12 + numTables * 16;
	let runningOffset = directorySize;
	const records: Array<{ tag: string; checksum: number; offset: number; length: number; data: Uint8Array; paddedData: Uint8Array }> = [];
	for (const t of otherTables) {
		const padded = padTable(t.data);
		const checksum = computeTableChecksum(padded);
		records.push({
			tag: t.tag,
			checksum,
			offset: runningOffset,
			length: t.data.length, // length in directory excludes padding
			data: t.data,
			paddedData: padded
		});
		runningOffset += padded.length;
	}

	const totalSize = runningOffset;
	const out = new Uint8Array(totalSize);

	// Write offset table:
	writeUint32(out, 0, dir.sfntVersion);
	writeUint16(out, 4, numTables);
	// searchRange = 2^floor(log2(numTables)) * 16
	const log2 = Math.floor(Math.log2(numTables));
	const pow2 = 1 << log2;
	writeUint16(out, 6, pow2 * 16); // searchRange
	writeUint16(out, 8, log2); // entrySelector
	writeUint16(out, 10, numTables * 16 - pow2 * 16); // rangeShift

	// Write directory + table bodies:
	for (let i = 0; i < records.length; i++) {
		const r = records[i];
		const recOff = 12 + i * 16;
		writeTagBytes(out, recOff, r.tag);
		writeUint32(out, recOff + 4, r.checksum);
		writeUint32(out, recOff + 8, r.offset);
		writeUint32(out, recOff + 12, r.length);
		out.set(r.paddedData, r.offset);
	}

	// Recompute head.checkSumAdjustment. Spec algorithm:
	//   1. Set head.checkSumAdjustment = 0.
	//   2. Compute whole-file checksum (sum of all uint32 in the file).
	//   3. head.checkSumAdjustment = 0xB1B0AFBA - that whole-file checksum.
	const headRec = records.find((r) => r.tag === 'head');
	if (headRec) {
		// Zero out checkSumAdjustment in the in-buffer head table (offset 8).
		writeUint32(out, headRec.offset + 8, 0);
		// Compute whole-file checksum.
		const wholeFileChecksum = computeTableChecksum(out);
		// Update head.checkSumAdjustment in-place.
		const adjustment = (0xb1b0afba - wholeFileChecksum) >>> 0;
		writeUint32(out, headRec.offset + 8, adjustment);
	}

	return out;
};
