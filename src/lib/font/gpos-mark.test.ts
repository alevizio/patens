import { describe, it, expect } from 'vitest';
import {
	ByteBuf,
	writeAnchorFormat1,
	writeBaseArray,
	writeCoverageFormat1,
	writeMarkArray,
	writeMarkBasePosFormat1
} from './gpos-mark';

// Helpers ----------------------------------------------------------------

const hex = (bytes: Uint8Array): string =>
	[...bytes].map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');

const fromHex = (s: string): Uint8Array =>
	new Uint8Array(s.split(/\s+/).filter(Boolean).map((h) => parseInt(h, 16)));

// ByteBuf ----------------------------------------------------------------

describe('ByteBuf', () => {
	it('writes big-endian uint16', () => {
		const buf = new ByteBuf();
		buf.writeUint16(0x1234);
		expect(hex(buf.toUint8Array())).toBe('12 34');
	});

	it('writes 0 and 0xffff at the boundaries', () => {
		const buf = new ByteBuf();
		buf.writeUint16(0).writeUint16(0xffff);
		expect(hex(buf.toUint8Array())).toBe('00 00 FF FF');
	});

	it('rejects out-of-range uint16 values', () => {
		const buf = new ByteBuf();
		expect(() => buf.writeUint16(-1)).toThrow();
		expect(() => buf.writeUint16(0x10000)).toThrow();
		expect(() => buf.writeUint16(1.5)).toThrow();
	});

	it('writes big-endian int16 (positive)', () => {
		const buf = new ByteBuf();
		buf.writeInt16(300);
		// 300 = 0x012C
		expect(hex(buf.toUint8Array())).toBe('01 2C');
	});

	it("writes big-endian int16 (negative — two's complement)", () => {
		const buf = new ByteBuf();
		buf.writeInt16(-200);
		// -200 in two's complement uint16 = 0x10000 - 200 = 0xFF38
		expect(hex(buf.toUint8Array())).toBe('FF 38');
	});

	it('handles int16 boundaries', () => {
		const buf = new ByteBuf();
		buf.writeInt16(-32768).writeInt16(32767);
		expect(hex(buf.toUint8Array())).toBe('80 00 7F FF');
	});

	it('rejects out-of-range int16 values', () => {
		const buf = new ByteBuf();
		expect(() => buf.writeInt16(-32769)).toThrow();
		expect(() => buf.writeInt16(32768)).toThrow();
		expect(() => buf.writeInt16(0.5)).toThrow();
	});

	it('grows the underlying buffer beyond its initial 64-byte capacity', () => {
		const buf = new ByteBuf();
		// Default initial cap is 64; write 200 uint16 = 400 bytes.
		for (let i = 0; i < 200; i++) buf.writeUint16(i);
		const out = buf.toUint8Array();
		expect(out.length).toBe(400);
		// Spot check: 199 = 0x00C7
		expect(out[398]).toBe(0x00);
		expect(out[399]).toBe(0xc7);
	});

	it('appends raw bytes via writeBytes', () => {
		const buf = new ByteBuf();
		buf.writeUint16(0x1234).writeBytes(fromHex('AB CD EF'));
		expect(hex(buf.toUint8Array())).toBe('12 34 AB CD EF');
	});

	it('toUint8Array returns a snapshot (writes after the call do not mutate it)', () => {
		const buf = new ByteBuf();
		buf.writeUint16(0x1234);
		const snap = buf.toUint8Array();
		buf.writeUint16(0x5678);
		expect(snap.length).toBe(2);
		expect(hex(snap)).toBe('12 34');
	});
});

// Anchor Format 1 ---------------------------------------------------------

describe('writeAnchorFormat1', () => {
	it('emits the spec-correct 6-byte format', () => {
		// posFormat=1, x=300, y=700
		// 00 01 | 01 2C | 02 BC
		const out = writeAnchorFormat1({ x: 300, y: 700 });
		expect(hex(out)).toBe('00 01 01 2C 02 BC');
	});

	it('handles negative coordinates (descender anchors)', () => {
		// y = -150 = 0xFF6A
		const out = writeAnchorFormat1({ x: 0, y: -150 });
		expect(hex(out)).toBe('00 01 00 00 FF 6A');
	});

	it('rounds fractional coordinates to integers', () => {
		const out = writeAnchorFormat1({ x: 300.4, y: 700.6 });
		// 300.4 → 300 (0x012C), 700.6 → 701 (0x02BD)
		expect(hex(out)).toBe('00 01 01 2C 02 BD');
	});

	it('is always exactly 6 bytes', () => {
		expect(writeAnchorFormat1({ x: 0, y: 0 }).length).toBe(6);
		expect(writeAnchorFormat1({ x: 32767, y: -32768 }).length).toBe(6);
	});
});

// Coverage Format 1 -------------------------------------------------------

describe('writeCoverageFormat1', () => {
	it('emits the spec-correct format for a single-glyph coverage', () => {
		// coverageFormat=1, glyphCount=1, glyphArray=[0x0041 = 65]
		// 00 01 | 00 01 | 00 41
		const out = writeCoverageFormat1([0x0041]);
		expect(hex(out)).toBe('00 01 00 01 00 41');
	});

	it('emits ascending-sorted glyph arrays correctly', () => {
		const out = writeCoverageFormat1([3, 7, 12]);
		// header (4 bytes) + 3 × uint16 = 10 bytes
		expect(out.length).toBe(10);
		expect(hex(out)).toBe('00 01 00 03 00 03 00 07 00 0C');
	});

	it('throws on empty input (must cover ≥1 glyph)', () => {
		expect(() => writeCoverageFormat1([])).toThrow(/at least one/);
	});

	it('throws on unsorted glyphs (catches caller bugs)', () => {
		expect(() => writeCoverageFormat1([5, 3, 8])).toThrow(/ascending/);
	});

	it('throws on duplicate glyphs', () => {
		expect(() => writeCoverageFormat1([3, 3])).toThrow(/ascending/);
	});

	it('throws on out-of-range glyph IDs', () => {
		expect(() => writeCoverageFormat1([-1])).toThrow();
		expect(() => writeCoverageFormat1([65536])).toThrow();
	});
});

// MarkArray --------------------------------------------------------------

describe('writeMarkArray', () => {
	it('emits markCount + records + anchors with correct offsets', () => {
		// Two marks, each in markClass 0, simple anchors.
		const out = writeMarkArray([
			{ markClass: 0, anchor: { x: 0, y: 0 } },
			{ markClass: 0, anchor: { x: 100, y: 500 } }
		]);
		// Header: markCount=2 + 2 records of 4 bytes = 2 + 8 = 10 bytes
		// Anchor at offset 10: 00 01 00 00 00 00 (6 bytes)
		// Anchor at offset 16: 00 01 00 64 01 F4
		expect(out.length).toBe(10 + 12);
		expect(hex(out)).toBe(
			[
				'00 02', // markCount
				'00 00 00 0A', // markClass=0, anchorOffset=10
				'00 00 00 10', // markClass=0, anchorOffset=16
				'00 01 00 00 00 00', // anchor 1 (0,0)
				'00 01 00 64 01 F4' // anchor 2 (100,500)
			].join(' ')
		);
	});

	it('preserves distinct markClass values per record', () => {
		const out = writeMarkArray([
			{ markClass: 0, anchor: { x: 1, y: 1 } },
			{ markClass: 1, anchor: { x: 2, y: 2 } },
			{ markClass: 2, anchor: { x: 3, y: 3 } }
		]);
		// Each record's first uint16 is markClass — check positions 2, 6, 10
		expect(out[2] << 8 | out[3]).toBe(0); // record[0].markClass
		expect(out[6] << 8 | out[7]).toBe(1); // record[1].markClass
		expect(out[10] << 8 | out[11]).toBe(2); // record[2].markClass
	});

	it('throws on empty input', () => {
		expect(() => writeMarkArray([])).toThrow(/at least one/);
	});

	it('throws on out-of-range markClass', () => {
		expect(() =>
			writeMarkArray([{ markClass: -1, anchor: { x: 0, y: 0 } }])
		).toThrow(/out of range/);
		expect(() =>
			writeMarkArray([{ markClass: 0x10000, anchor: { x: 0, y: 0 } }])
		).toThrow(/out of range/);
	});
});

// BaseArray --------------------------------------------------------------

describe('writeBaseArray', () => {
	it('emits baseCount + per-class anchor offsets + anchor tables', () => {
		// One base with two anchors (markClassCount = 2)
		const out = writeBaseArray(
			[
				{
					anchors: [
						{ x: 300, y: 700 }, // class 0: top
						{ x: 300, y: 0 } // class 1: bottom
					]
				}
			],
			2
		);
		// Header: baseCount(2) + 2 offsets × 2 bytes = 2 + 4 = 6 bytes
		// Anchor[0] at offset 6: 00 01 01 2C 02 BC (300, 700)
		// Anchor[1] at offset 12: 00 01 01 2C 00 00 (300, 0)
		expect(out.length).toBe(6 + 12);
		expect(hex(out)).toBe(
			[
				'00 01', // baseCount
				'00 06', // anchor offset for class 0
				'00 0C', // anchor offset for class 1
				'00 01 01 2C 02 BC', // anchor at 6
				'00 01 01 2C 00 00' // anchor at 12
			].join(' ')
		);
	});

	it('emits null anchors as offset 0 (no inline anchor)', () => {
		const out = writeBaseArray(
			[{ anchors: [{ x: 100, y: 200 }, null] }],
			2
		);
		// Header: 2 + 2*2 = 6 bytes. Only one anchor follows.
		expect(out.length).toBe(6 + 6);
		// Second offset should be 0 (null), first should point to header end
		expect(out[2] << 8 | out[3]).toBe(6); // class 0 → offset 6
		expect(out[4] << 8 | out[5]).toBe(0); // class 1 → null
	});

	it('handles multiple bases sharing markClassCount', () => {
		const out = writeBaseArray(
			[
				{ anchors: [{ x: 100, y: 100 }] },
				{ anchors: [{ x: 200, y: 200 }] }
			],
			1
		);
		// Header: 2 + 2*1*2 = 6 bytes
		// Anchor[0] at 6 (for base 0), Anchor[1] at 12 (for base 1)
		expect(out[2] << 8 | out[3]).toBe(6);
		expect(out[4] << 8 | out[5]).toBe(12);
	});

	it('throws when markClassCount and BaseRecord.anchors.length mismatch', () => {
		expect(() =>
			writeBaseArray([{ anchors: [{ x: 0, y: 0 }] }], 2)
		).toThrow(/expected 2/);
	});

	it('throws on empty bases', () => {
		expect(() => writeBaseArray([], 1)).toThrow(/at least one/);
	});

	it('throws on invalid markClassCount', () => {
		expect(() => writeBaseArray([{ anchors: [] }], 0)).toThrow();
	});
});

// MarkBasePosFormat1 -----------------------------------------------------

describe('writeMarkBasePosFormat1', () => {
	it('emits a spec-correct subtable for one mark and one base', () => {
		// Pair: base glyph 65 ('A') with anchor 'top' at (300, 700);
		//       mark glyph 200 (acutecomb) with anchor '_top' at (0, 0).
		// markClass 0 = 'top'.
		const out = writeMarkBasePosFormat1({
			markGlyphs: [200],
			baseGlyphs: [65],
			markRecords: [{ markClass: 0, anchor: { x: 0, y: 0 } }],
			baseRecords: [{ anchors: [{ x: 300, y: 700 }] }],
			markClassCount: 1
		});

		// Header = 12 bytes:
		//   00 01            posFormat
		//   00 0C            markCoverageOffset = 12
		//   00 12            baseCoverageOffset = 12 + 6 (MarkCov) = 18
		//   00 01            markClassCount = 1
		//   00 18            markArrayOffset = 18 + 6 (BaseCov) = 24
		//   00 24            baseArrayOffset = 24 + 12 (MarkArray) = 36
		expect(out[0] << 8 | out[1]).toBe(1); // posFormat
		expect(out[2] << 8 | out[3]).toBe(12); // markCoverageOffset
		expect(out[4] << 8 | out[5]).toBe(18); // baseCoverageOffset
		expect(out[6] << 8 | out[7]).toBe(1); // markClassCount
		expect(out[8] << 8 | out[9]).toBe(24); // markArrayOffset
		expect(out[10] << 8 | out[11]).toBe(36); // baseArrayOffset

		// MarkCoverage at offset 12: 00 01 00 01 00 C8 (mark glyph 200)
		expect(hex(out.slice(12, 18))).toBe('00 01 00 01 00 C8');
		// BaseCoverage at offset 18: 00 01 00 01 00 41 (base glyph 65)
		expect(hex(out.slice(18, 24))).toBe('00 01 00 01 00 41');
	});

	it('throws when markGlyphs and markRecords have mismatched lengths', () => {
		expect(() =>
			writeMarkBasePosFormat1({
				markGlyphs: [1, 2],
				baseGlyphs: [10],
				markRecords: [{ markClass: 0, anchor: { x: 0, y: 0 } }],
				baseRecords: [{ anchors: [{ x: 0, y: 0 }] }],
				markClassCount: 1
			})
		).toThrow(/parallel/);
	});

	it('throws when baseGlyphs and baseRecords have mismatched lengths', () => {
		expect(() =>
			writeMarkBasePosFormat1({
				markGlyphs: [1],
				baseGlyphs: [10, 11],
				markRecords: [{ markClass: 0, anchor: { x: 0, y: 0 } }],
				baseRecords: [{ anchors: [{ x: 0, y: 0 }] }],
				markClassCount: 1
			})
		).toThrow(/parallel/);
	});

	it('handles multiple mark classes per base', () => {
		// Two-class case: 'top' (class 0) and 'bottom' (class 1).
		// One base 'A' with anchors for both classes; two marks (acute top, cedilla bottom).
		const out = writeMarkBasePosFormat1({
			markGlyphs: [200, 201],
			baseGlyphs: [65],
			markRecords: [
				{ markClass: 0, anchor: { x: 0, y: 0 } }, // acute, top
				{ markClass: 1, anchor: { x: 0, y: 0 } } // cedilla, bottom
			],
			baseRecords: [
				{ anchors: [{ x: 300, y: 700 }, { x: 300, y: 0 }] }
			],
			markClassCount: 2
		});
		// header(12) + markCov(6 for 2 marks = 2 + 4) wait — coverage for 2 glyphs is 4 + 2*2 = 8 bytes
		// MarkCoverage: 00 01 00 02 00 C8 00 C9 (8 bytes)
		// BaseCoverage: 00 01 00 01 00 41 (6 bytes)
		expect(out[2] << 8 | out[3]).toBe(12); // markCoverageOffset
		expect(out[4] << 8 | out[5]).toBe(12 + 8); // baseCoverageOffset = 20
		expect(out[6] << 8 | out[7]).toBe(2); // markClassCount
	});
});
