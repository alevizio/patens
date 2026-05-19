import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { isWoff2, otfToWoff2Native, WOFF2_MAGIC } from './woff2';

describe('isWoff2', () => {
	it('detects the WOFF2 magic bytes', () => {
		const buf = new ArrayBuffer(4);
		new DataView(buf).setUint32(0, WOFF2_MAGIC, false);
		expect(isWoff2(buf)).toBe(true);
	});

	it('rejects a non-WOFF2 buffer', () => {
		const buf = new ArrayBuffer(4);
		new DataView(buf).setUint32(0, 0x00010000, false); // OpenType sfnt magic
		expect(isWoff2(buf)).toBe(false);
	});

	it('rejects buffers too small to contain a magic header', () => {
		expect(isWoff2(new ArrayBuffer(3))).toBe(false);
		expect(isWoff2(new ArrayBuffer(0))).toBe(false);
	});

	it('accepts a Uint8Array view', () => {
		const buf = new Uint8Array([0x77, 0x4f, 0x46, 0x32, 0xff, 0xff]);
		expect(isWoff2(buf)).toBe(true);
	});
});

describe('otfToWoff2Native', () => {
	it('encodes the demo OTF to a valid WOFF2 file', async () => {
		const fontPath = path.join(
			process.cwd(),
			'static/demo-fonts/StudioGeometric-Regular.otf'
		);
		const buf = await fs.readFile(fontPath);
		const sfnt = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
		const woff2 = await otfToWoff2Native(sfnt);
		expect(isWoff2(woff2)).toBe(true);
		// WOFF2 should be smaller than the source (compression usually saves
		// 30-60% on small fonts; brotli is the codec).
		expect(woff2.byteLength).toBeLessThan(sfnt.byteLength);
		expect(woff2.byteLength).toBeGreaterThan(0);
	}, 20_000);

	it('throws on a non-OTF input rather than producing garbage', async () => {
		const junk = new TextEncoder().encode('not a font at all, just text').buffer;
		await expect(otfToWoff2Native(junk)).rejects.toThrow();
	}, 10_000);
});
