/**
 * Smoke test for the HarfBuzzJS wrapper. Loads the demo OTF, shapes a
 * basic Latin string, asserts the wrapper round-trips correctly.
 *
 * NOTE: harfbuzzjs ships a WebAssembly module. Vitest runs in Node by
 * default, which supports WASM natively, but the wasm fetch path may
 * need the module pre-initialised. If a future vitest update breaks
 * the WASM load here, the wrapper itself remains correct — the test
 * is for build-system health.
 */

import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { shapeText } from './shape';

const loadDemoOtf = async (): Promise<ArrayBuffer> => {
	const p = path.join(process.cwd(), 'static/demo-fonts/StudioGeometric-Regular.otf');
	const buf = await fs.readFile(p);
	return buf.buffer.slice(
		buf.byteOffset,
		buf.byteOffset + buf.byteLength
	) as ArrayBuffer;
};

describe('shapeText (HarfBuzzJS wrapper)', () => {
	it('shapes a basic Latin string into glyphs with advances', async () => {
		const fontBuffer = await loadDemoOtf();
		const result = shapeText(fontBuffer, 'AV');
		expect(result.glyphs.length).toBeGreaterThan(0);
		expect(result.totalAdvance).toBeGreaterThan(0);
		// Every glyph has a valid id + advance
		for (const g of result.glyphs) {
			expect(g.glyphID).toBeGreaterThanOrEqual(0);
			expect(g.xAdvance).toBeGreaterThanOrEqual(0);
			expect(g.cluster).toBeGreaterThanOrEqual(0);
		}
	});

	it('respects explicit script + direction overrides', async () => {
		const fontBuffer = await loadDemoOtf();
		const result = shapeText(fontBuffer, 'Hello', {
			script: 'latn',
			direction: 'ltr',
			language: 'en'
		});
		expect(result.glyphs.length).toBe(5);
	});

	it('feature toggle changes the shaped output (or no-op when feature absent)', async () => {
		// Demo font may or may not ship smcp; this test asserts the
		// feature-toggle plumbing doesn't crash, not the substitution
		// itself (we have separate unit tests for that).
		const fontBuffer = await loadDemoOtf();
		const off = shapeText(fontBuffer, 'abc');
		const on = shapeText(fontBuffer, 'abc', { features: { smcp: 1 } });
		expect(on.glyphs.length).toBe(off.glyphs.length);
		// If the font has smcp, glyph IDs may differ; if not, identical.
		// Either way, the call shape works.
		expect(on.totalAdvance).toBeGreaterThan(0);
	});

	it('empty string returns no glyphs', async () => {
		const fontBuffer = await loadDemoOtf();
		const result = shapeText(fontBuffer, '');
		expect(result.glyphs).toEqual([]);
		expect(result.totalAdvance).toBe(0);
	});
});
