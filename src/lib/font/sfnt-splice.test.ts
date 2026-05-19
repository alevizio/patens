import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
	computeTableChecksum,
	getTableBytes,
	padTable,
	parseSfntDirectory,
	spliceTable
} from './sfnt-splice';

// Fixture: real OTF produced by opentype.js (the demo font that ships
// with the app). Used as a realistic SFNT to splice into.
const loadDemoOtf = async (): Promise<Uint8Array> => {
	const p = path.join(
		process.cwd(),
		'static/demo-fonts/StudioGeometric-Regular.otf'
	);
	const buf = await fs.readFile(p);
	return new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
};

// computeTableChecksum ---------------------------------------------------

describe('computeTableChecksum', () => {
	it('returns 0 for an empty buffer', () => {
		expect(computeTableChecksum(new Uint8Array(0))).toBe(0);
	});

	it('sums a single uint32 correctly', () => {
		// 0x00000001 → sum = 1
		expect(computeTableChecksum(new Uint8Array([0, 0, 0, 1]))).toBe(1);
		// 0x12345678 → sum = 0x12345678
		expect(computeTableChecksum(new Uint8Array([0x12, 0x34, 0x56, 0x78]))).toBe(
			0x12345678
		);
	});

	it('sums two uint32s with overflow wrapping to 32 bits', () => {
		// 0xFFFFFFFF + 0x00000002 wraps to 0x00000001
		const buf = new Uint8Array([0xff, 0xff, 0xff, 0xff, 0, 0, 0, 2]);
		expect(computeTableChecksum(buf)).toBe(1);
	});

	it('treats a final partial uint32 as zero-padded', () => {
		// [0x12, 0x34, 0x56] is treated as 0x12345600 (NOT 0x00123456)
		expect(computeTableChecksum(new Uint8Array([0x12, 0x34, 0x56]))).toBe(0x12345600);
		// [0x12] is treated as 0x12000000
		expect(computeTableChecksum(new Uint8Array([0x12]))).toBe(0x12000000);
	});
});

// padTable ----------------------------------------------------------------

describe('padTable', () => {
	it('returns the input unchanged when already 4-aligned', () => {
		const data = new Uint8Array([1, 2, 3, 4]);
		expect(padTable(data)).toBe(data);
	});

	it('pads with zeros to the next 4-byte boundary', () => {
		expect(Array.from(padTable(new Uint8Array([1])))).toEqual([1, 0, 0, 0]);
		expect(Array.from(padTable(new Uint8Array([1, 2])))).toEqual([1, 2, 0, 0]);
		expect(Array.from(padTable(new Uint8Array([1, 2, 3])))).toEqual([1, 2, 3, 0]);
	});

	it("doesn't mutate the input on padding", () => {
		const data = new Uint8Array([1, 2, 3]);
		padTable(data);
		expect(Array.from(data)).toEqual([1, 2, 3]);
	});
});

// parseSfntDirectory -----------------------------------------------------

describe('parseSfntDirectory', () => {
	it('parses the demo OTF directory with all required tables', async () => {
		const buf = await loadDemoOtf();
		const dir = parseSfntDirectory(buf);
		// CFF-flavored OpenType uses 'OTTO' = 0x4F54544F
		expect(dir.sfntVersion).toBe(0x4f54544f);
		expect(dir.tables.length).toBeGreaterThan(0);
		// Every OTF must have these tables
		const tags = dir.tables.map((t) => t.tag);
		expect(tags).toContain('head');
		expect(tags).toContain('hhea');
		expect(tags).toContain('hmtx');
		expect(tags).toContain('cmap');
		expect(tags).toContain('name');
		expect(tags).toContain('post');
		expect(tags).toContain('OS/2');
	});

	it('returns offsets and lengths within the buffer', async () => {
		const buf = await loadDemoOtf();
		const dir = parseSfntDirectory(buf);
		for (const t of dir.tables) {
			expect(t.offset + t.length).toBeLessThanOrEqual(buf.length);
		}
	});

	it('throws on buffer too small for offset table', () => {
		expect(() => parseSfntDirectory(new Uint8Array(8))).toThrow(/Buffer too small/);
	});

	it('throws when numTables = 0', () => {
		const buf = new Uint8Array(12);
		// sfntVersion = 0x00010000, numTables = 0 (already)
		buf[2] = 0x01;
		expect(() => parseSfntDirectory(buf)).toThrow(/zero tables/);
	});
});

// getTableBytes -----------------------------------------------------------

describe('getTableBytes', () => {
	it('returns the bytes for a known table', async () => {
		const buf = await loadDemoOtf();
		const dir = parseSfntDirectory(buf);
		const head = getTableBytes(buf, dir, 'head');
		expect(head).not.toBeNull();
		// head table is exactly 54 bytes per spec
		expect(head!.length).toBe(54);
	});

	it('returns null for an absent table', async () => {
		const buf = await loadDemoOtf();
		const dir = parseSfntDirectory(buf);
		expect(getTableBytes(buf, dir, 'GPOS')).toBeNull();
	});
});

// spliceTable -------------------------------------------------------------

describe('spliceTable', () => {
	it('inserts a new GPOS table into a font that did not have one', async () => {
		const original = await loadDemoOtf();
		const origDir = parseSfntDirectory(original);
		expect(getTableBytes(original, origDir, 'GPOS')).toBeNull();

		// Splice in a placeholder GPOS payload.
		const payload = new Uint8Array([0xab, 0xcd, 0xef, 0x01, 0x23, 0x45]);
		const next = spliceTable(original, 'GPOS', payload);

		const nextDir = parseSfntDirectory(next);
		expect(nextDir.tables.length).toBe(origDir.tables.length + 1);
		const gpos = getTableBytes(next, nextDir, 'GPOS');
		expect(gpos).not.toBeNull();
		// length field excludes the 4-byte pad, so we get exactly the bytes back
		expect(Array.from(gpos!)).toEqual(Array.from(payload));
	});

	it('replaces an existing GPOS table without duplicating', async () => {
		// Splice once to add GPOS, then splice again to replace.
		const original = await loadDemoOtf();
		const first = spliceTable(original, 'GPOS', new Uint8Array([0x11, 0x22]));
		const second = spliceTable(first, 'GPOS', new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd]));

		const dir = parseSfntDirectory(second);
		const gposEntries = dir.tables.filter((t) => t.tag === 'GPOS');
		expect(gposEntries.length).toBe(1);
		const gpos = getTableBytes(second, dir, 'GPOS');
		expect(Array.from(gpos!)).toEqual([0xaa, 0xbb, 0xcc, 0xdd]);
	});

	it('keeps directory entries sorted alphabetically by tag (spec invariant)', async () => {
		const original = await loadDemoOtf();
		const next = spliceTable(original, 'GPOS', new Uint8Array([0]));
		const dir = parseSfntDirectory(next);
		const tags = dir.tables.map((t) => t.tag);
		const sorted = [...tags].sort();
		expect(tags).toEqual(sorted);
	});

	it('preserves the other tables byte-for-byte', async () => {
		const original = await loadDemoOtf();
		const origDir = parseSfntDirectory(original);
		const next = spliceTable(original, 'GPOS', new Uint8Array([0]));
		const nextDir = parseSfntDirectory(next);

		// For every non-head, non-GPOS table, the bytes must round-trip
		// identically. (head changes because we recompute checkSumAdjustment.)
		for (const t of origDir.tables) {
			if (t.tag === 'head') continue;
			const before = getTableBytes(original, origDir, t.tag);
			const after = getTableBytes(next, nextDir, t.tag);
			expect(after).not.toBeNull();
			expect(Array.from(after!)).toEqual(Array.from(before!));
		}
	});

	it('updates head.checkSumAdjustment so whole-file checksum is 0xB1B0AFBA', async () => {
		const original = await loadDemoOtf();
		const next = spliceTable(original, 'GPOS', new Uint8Array([0]));
		const dir = parseSfntDirectory(next);
		const headRec = dir.tables.find((t) => t.tag === 'head')!;
		// Zero out checkSumAdjustment in a copy and compute the whole-file
		// checksum; adding head.checkSumAdjustment should give 0xB1B0AFBA.
		const copy = next.slice();
		copy[headRec.offset + 8] = 0;
		copy[headRec.offset + 9] = 0;
		copy[headRec.offset + 10] = 0;
		copy[headRec.offset + 11] = 0;
		const wholeChecksum = computeTableChecksum(copy);
		const headerAdjustment =
			next[headRec.offset + 8] * 0x1000000 +
			(next[headRec.offset + 9] << 16) +
			(next[headRec.offset + 10] << 8) +
			next[headRec.offset + 11];
		expect(((wholeChecksum + headerAdjustment) >>> 0)).toBe(0xb1b0afba);
	});
});
