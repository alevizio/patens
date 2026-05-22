/**
 * Day-1 de-risking smoke test for the OT-layout-depth milestone-1.
 *
 * The plan's load-bearing assumption (per the research):
 *   opentype.js `font.substitution.addSingle / addAlternate /
 *   addMultiple / addLigature` work for ANY feature tag, not just
 *   `liga`/`rlig` which the README mentions.
 *
 * This test rounds-trips `salt` (single sub) and `smcp` (small caps,
 * also single sub) through opentype.js: write → toArrayBuffer →
 * parse → read back. If the writes survive a save/reparse cycle and
 * the resulting GSUB tables can be introspected, the M1 hybrid
 * compile path is safe. If they don't, M1 needs to lean harder on
 * Pyodide+feaLib and the 9.5-day plan is invalid.
 *
 * No new dependencies. Uses the existing demo OTF fixture.
 */

import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parse as parseFont } from 'opentype.js';

const loadDemoOtf = async (): Promise<ArrayBuffer> => {
	const p = path.join(
		process.cwd(),
		'static/demo-fonts/StudioGeometric-Regular.otf'
	);
	const buf = await fs.readFile(p);
	return buf.buffer.slice(
		buf.byteOffset,
		buf.byteOffset + buf.byteLength
	) as ArrayBuffer;
};

describe('opentype.js substitution write API — smoke test (M1 day-1)', () => {
	it('addSingle for `salt` survives save → reparse cycle', async () => {
		const font = parseFont(await loadDemoOtf());

		// Verify the test font has the glyphs we need.
		const aSet = font.glyphs;
		const aSetUnknown = aSet as unknown as { glyphs?: Record<string, { name?: string }> };
		expect(aSetUnknown.glyphs).toBeDefined();

		// Find two real glyph names we can substitute between.
		const names = Object.values(aSetUnknown.glyphs ?? {})
			.map((g) => g.name)
			.filter((n): n is string => !!n);
		expect(names.length).toBeGreaterThan(2);
		const sub = names.find((n) => n === 'a') ?? names[1];
		const by = names.find((n) => n === 'A') ?? names[2];

		// Add a salt single-sub a → A.
		font.substitution.addSingle('salt', { sub, by });

		// Reparse via the round-trip.
		const buf = font.toArrayBuffer();
		expect(buf.byteLength).toBeGreaterThan(0);
		const reparsed = parseFont(buf);

		// The substitution should come back symmetric.
		const recovered = reparsed.substitution.getSingle('salt');
		expect(recovered.length).toBeGreaterThan(0);
		// `getSingle` returns glyph IDs, not names — at least one record
		// must exist for the salt feature in the reparsed font.
		expect(recovered.some((r) => typeof r.sub === 'number')).toBe(true);
	});

	it('addSingle for `smcp` survives save → reparse cycle', async () => {
		const font = parseFont(await loadDemoOtf());
		const aSetUnknown = font.glyphs as unknown as {
			glyphs?: Record<string, { name?: string }>;
		};
		const names = Object.values(aSetUnknown.glyphs ?? {})
			.map((g) => g.name)
			.filter((n): n is string => !!n);
		const sub = names.find((n) => n === 'a') ?? names[1];
		const by = names.find((n) => n === 'A') ?? names[2];

		font.substitution.addSingle('smcp', { sub, by });
		const buf = font.toArrayBuffer();
		const reparsed = parseFont(buf);
		const recovered = reparsed.substitution.getSingle('smcp');
		expect(recovered.length).toBeGreaterThan(0);
	});

	it('addAlternate for `aalt` survives save → reparse cycle', async () => {
		const font = parseFont(await loadDemoOtf());
		const aSetUnknown = font.glyphs as unknown as {
			glyphs?: Record<string, { name?: string }>;
		};
		const names = Object.values(aSetUnknown.glyphs ?? {})
			.map((g) => g.name)
			.filter((n): n is string => !!n);
		const baseSub = names.find((n) => n === 'a') ?? names[1];
		const alt1 = names.find((n) => n === 'A') ?? names[2];
		const alt2 = names.find((n) => n === 'B') ?? names[3];

		font.substitution.addAlternate('aalt', { sub: baseSub, by: [alt1, alt2] });
		const buf = font.toArrayBuffer();
		const reparsed = parseFont(buf);
		const recovered = reparsed.substitution.getAlternates('aalt');
		expect(recovered.length).toBeGreaterThan(0);
		expect(recovered[0].by.length).toBeGreaterThan(0);
	});

	it('multiple features coexist when added in alphabetical order', async () => {
		// CRITICAL CONSTRAINT discovered by this test: opentype.js throws
		// "Features must be added in alphabetical order" if calls aren't
		// sorted by feature tag. The M1 compile path MUST sort the
		// detected-features list before invoking addSingle / addAlternate.
		// Within a single feature, subsequent calls are fine; the order
		// rule is BETWEEN distinct features.
		const font = parseFont(await loadDemoOtf());
		const aSetUnknown = font.glyphs as unknown as {
			glyphs?: Record<string, { name?: string }>;
		};
		const names = Object.values(aSetUnknown.glyphs ?? {})
			.map((g) => g.name)
			.filter((n): n is string => !!n);
		expect(names.length).toBeGreaterThan(5);

		const a = names.find((n) => n === 'a') ?? names[1];
		const A = names.find((n) => n === 'A') ?? names[2];
		const b = names.find((n) => n === 'b') ?? names[3];
		const B = names.find((n) => n === 'B') ?? names[4];

		// Alphabetical: c2sc < salt < smcp.
		font.substitution.addSingle('c2sc', { sub: A, by: a });
		font.substitution.addSingle('salt', { sub: a, by: A });
		font.substitution.addSingle('salt', { sub: b, by: B });
		font.substitution.addSingle('smcp', { sub: a, by: A });

		const buf = font.toArrayBuffer();
		const reparsed = parseFont(buf);
		expect(reparsed.substitution.getSingle('c2sc').length).toBeGreaterThan(0);
		expect(reparsed.substitution.getSingle('salt').length).toBeGreaterThanOrEqual(2);
		expect(reparsed.substitution.getSingle('smcp').length).toBeGreaterThan(0);
	});

	it('out-of-order feature additions throw a clear error', async () => {
		// Pinning the constraint so a future refactor that drops sorting
		// fails loudly here instead of in the export path.
		const font = parseFont(await loadDemoOtf());
		const aSetUnknown = font.glyphs as unknown as {
			glyphs?: Record<string, { name?: string }>;
		};
		const names = Object.values(aSetUnknown.glyphs ?? {})
			.map((g) => g.name)
			.filter((n): n is string => !!n);
		const a = names.find((n) => n === 'a') ?? names[1];
		const A = names.find((n) => n === 'A') ?? names[2];

		font.substitution.addSingle('smcp', { sub: a, by: A });
		// c2sc < smcp alphabetically — opentype.js refuses.
		expect(() =>
			font.substitution.addSingle('c2sc', { sub: A, by: a })
		).toThrow(/alphabetical/);
	});

	it('written features end up in the GSUB table (binary check)', async () => {
		const font = parseFont(await loadDemoOtf());
		const aSetUnknown = font.glyphs as unknown as {
			glyphs?: Record<string, { name?: string }>;
		};
		const names = Object.values(aSetUnknown.glyphs ?? {})
			.map((g) => g.name)
			.filter((n): n is string => !!n);
		const sub = names.find((n) => n === 'a') ?? names[1];
		const by = names.find((n) => n === 'A') ?? names[2];

		font.substitution.addSingle('salt', { sub, by });
		const buf = font.toArrayBuffer();

		// Look at the raw bytes for a 'GSUB' table tag — confirms we
		// haven't accidentally produced a font without GSUB.
		const u8 = new Uint8Array(buf);
		const gsubTag = [0x47, 0x53, 0x55, 0x42]; // "GSUB"
		let found = false;
		for (let i = 0; i < u8.length - 4; i++) {
			if (
				u8[i] === gsubTag[0] &&
				u8[i + 1] === gsubTag[1] &&
				u8[i + 2] === gsubTag[2] &&
				u8[i + 3] === gsubTag[3]
			) {
				found = true;
				break;
			}
		}
		expect(found).toBe(true);
	});
});
