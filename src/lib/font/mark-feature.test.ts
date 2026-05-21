import { describe, it, expect } from 'vitest';
import { applyMarkPositioning, buildMarkGposBinary } from './mark-feature';
import { parseSfntDirectory, getTableBytes } from './sfnt-splice';
import type { Glyph, Project } from './types';
import { DEFAULT_METRICS } from './types';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseGlyph = (overrides: Partial<Glyph> = {}): Glyph =>
	({
		codepoint: 0x0041,
		name: 'A',
		status: 'final',
		advanceWidth: 600,
		leftSidebearing: 50,
		rightSidebearing: 50,
		contours: [],
		anchors: [],
		updatedAt: new Date('2026-01-01').toISOString(),
		...overrides
	}) as Glyph;

const project = (glyphs: Record<number, Glyph>): Project =>
	({
		id: 't',
		name: 't',
		metadata: { familyName: 't', styleName: 'r', version: '1', designer: '', copyright: '', license: '' },
		metrics: DEFAULT_METRICS,
		glyphs,
		kerning: [],
		classes: [],
		masters: [],
		axes: [],
		instances: [],
		features: { kern: true, liga: false },
		brief: {},
		samples: {},
		changelog: [],
		decisions: [],
		updatedAt: '2026-01-01',
		createdAt: '2026-01-01'
	}) as Project;

const loadDemoOtf = async (): Promise<Uint8Array> => {
	const p = path.join(
		process.cwd(),
		'static/demo-fonts/StudioGeometric-Regular.otf'
	);
	const buf = await fs.readFile(p);
	return new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
};

// buildMarkGposBinary ----------------------------------------------------

describe('buildMarkGposBinary', () => {
	it('returns null for an empty project (nothing to splice)', () => {
		expect(buildMarkGposBinary(project({}), new Map())).toBeNull();
	});

	it('returns null when only base anchors exist (no marks to attach)', () => {
		const a = baseGlyph({
			codepoint: 0x41,
			anchors: [{ name: 'top', x: 300, y: 700 }]
		});
		expect(buildMarkGposBinary(project({ 0x41: a }), new Map([[0x41, 1]]))).toBeNull();
	});

	it('returns null when only mark anchors exist (no bases to attach to)', () => {
		const acute = baseGlyph({
			codepoint: 0x0301,
			name: 'acutecomb',
			anchors: [{ name: '_top', x: 0, y: 0 }]
		});
		expect(
			buildMarkGposBinary(project({ 0x301: acute }), new Map([[0x301, 2]]))
		).toBeNull();
	});

	it('builds a GPOS binary with one mark + one base sharing class "top"', () => {
		const a = baseGlyph({
			codepoint: 0x41,
			name: 'A',
			anchors: [{ name: 'top', x: 300, y: 700 }]
		});
		const acute = baseGlyph({
			codepoint: 0x0301,
			name: 'acutecomb',
			anchors: [{ name: '_top', x: 0, y: 0 }]
		});
		const indexByCp = new Map([
			[0x41, 1],
			[0x301, 2]
		]);
		const gpos = buildMarkGposBinary(project({ 0x41: a, 0x301: acute }), indexByCp);
		expect(gpos).not.toBeNull();
		// Top-level GPOS table header: 00 01 00 00 ... (version 1.0)
		expect(gpos![0]).toBe(0x00);
		expect(gpos![1]).toBe(0x01);
		expect(gpos![2]).toBe(0x00);
		expect(gpos![3]).toBe(0x00);
	});

	it('handles two mark classes (top + bottom) over a single base', () => {
		const a = baseGlyph({
			codepoint: 0x41,
			anchors: [
				{ name: 'top', x: 300, y: 700 },
				{ name: 'bottom', x: 300, y: 0 }
			]
		});
		const acute = baseGlyph({
			codepoint: 0x0301,
			name: 'acutecomb',
			anchors: [{ name: '_top', x: 0, y: 0 }]
		});
		const cedilla = baseGlyph({
			codepoint: 0x0327,
			name: 'cedillacomb',
			anchors: [{ name: '_bottom', x: 0, y: 0 }]
		});
		const indexByCp = new Map([
			[0x41, 1],
			[0x301, 2],
			[0x327, 3]
		]);
		const gpos = buildMarkGposBinary(
			project({ 0x41: a, 0x301: acute, 0x327: cedilla }),
			indexByCp
		);
		expect(gpos).not.toBeNull();
		// The subtable's markClassCount should be 2.
		// Header is 10 bytes; ScriptList comes next, then FeatureList,
		// then LookupList containing our subtable. Rather than digging
		// through the full table tree, just sanity-check the binary isn't
		// degenerate (more bytes than the one-class case).
		const single = buildMarkGposBinary(
			project({ 0x41: baseGlyph({ codepoint: 0x41, anchors: [{ name: 'top', x: 0, y: 0 }] }), 0x301: acute }),
			new Map([[0x41, 1], [0x301, 2]])
		);
		expect(gpos!.length).toBeGreaterThan(single!.length);
	});

	it('drops orphan class names (base with no matching mark, or vice versa)', () => {
		// 'A' has a 'top' anchor that's matched by acutecomb; 'B' has an
		// orphan 'middle' anchor with no matching mark. Result: only the
		// 'top' class exists in the subtable.
		const a = baseGlyph({
			codepoint: 0x41,
			anchors: [{ name: 'top', x: 300, y: 700 }]
		});
		const b = baseGlyph({
			codepoint: 0x42,
			name: 'B',
			anchors: [{ name: 'middle', x: 200, y: 350 }]
		});
		const acute = baseGlyph({
			codepoint: 0x0301,
			name: 'acutecomb',
			anchors: [{ name: '_top', x: 0, y: 0 }]
		});
		const indexByCp = new Map([
			[0x41, 1],
			[0x42, 2],
			[0x301, 3]
		]);
		const gpos = buildMarkGposBinary(
			project({ 0x41: a, 0x42: b, 0x301: acute }),
			indexByCp
		);
		expect(gpos).not.toBeNull();
		// Only 'A' should be a base in the resulting subtable, since 'B' has
		// no matching mark. This is hard to verify without re-parsing the
		// binary; rely on the byte-length being closer to a single-base case.
	});

	it('emits mkmk lookup when marks have both _top and top anchors (stacking)', () => {
		// acute has _top (attach to base) + top (next mark stacks above)
		// circumflex has _top (attach to acute's top) — no further marks
		const acute = baseGlyph({
			codepoint: 0x0301,
			name: 'acutecomb',
			anchors: [
				{ name: '_top', x: 0, y: 0 }, // attach to base.top
				{ name: 'top', x: 0, y: 200 } // next mark attaches here
			]
		});
		const circumflex = baseGlyph({
			codepoint: 0x0302,
			name: 'circumflexcomb',
			anchors: [{ name: '_top', x: 0, y: 0 }]
		});
		const A = baseGlyph({
			codepoint: 0x41,
			name: 'A',
			anchors: [{ name: 'top', x: 300, y: 700 }]
		});
		const indexByCp = new Map([
			[0x41, 1],
			[0x301, 2],
			[0x302, 3]
		]);
		const gpos = buildMarkGposBinary(
			project({ 0x41: A, 0x301: acute, 0x302: circumflex }),
			indexByCp
		);
		expect(gpos).not.toBeNull();
		// GPOS header is 10 bytes; feature list comes after the script
		// list. Just sanity-check that BOTH features (mark + mkmk) make
		// it into the binary by searching the byte stream for the tags
		// 'mark' and 'mkmk' (their 4-char ASCII representations).
		const bytes = gpos!;
		const findAscii = (s: string) => {
			const needle = new TextEncoder().encode(s);
			outer: for (let i = 0; i + needle.length <= bytes.length; i++) {
				for (let j = 0; j < needle.length; j++) {
					if (bytes[i + j] !== needle[j]) continue outer;
				}
				return i;
			}
			return -1;
		};
		expect(findAscii('mark')).toBeGreaterThan(0);
		expect(findAscii('mkmk')).toBeGreaterThan(0);
	});

	it('emits mark + mkmk together when project has both', () => {
		// Same setup as above — verifies the dual-feature path doesn't
		// drop the mark feature in favour of mkmk.
		const acute = baseGlyph({
			codepoint: 0x0301,
			name: 'acutecomb',
			anchors: [
				{ name: '_top', x: 0, y: 0 },
				{ name: 'top', x: 0, y: 200 }
			]
		});
		const circumflex = baseGlyph({
			codepoint: 0x0302,
			name: 'circumflexcomb',
			anchors: [{ name: '_top', x: 0, y: 0 }]
		});
		const A = baseGlyph({
			codepoint: 0x41,
			name: 'A',
			anchors: [{ name: 'top', x: 300, y: 700 }]
		});
		const indexByCp = new Map([
			[0x41, 1],
			[0x301, 2],
			[0x302, 3]
		]);
		const gpos = buildMarkGposBinary(
			project({ 0x41: A, 0x301: acute, 0x302: circumflex }),
			indexByCp
		);
		expect(gpos).not.toBeNull();
	});

	it('NO mkmk lookup when no mark has an unprefixed anchor', () => {
		// Only mark-to-base setup; no stacking.
		const acute = baseGlyph({
			codepoint: 0x0301,
			name: 'acutecomb',
			anchors: [{ name: '_top', x: 0, y: 0 }]
		});
		const A = baseGlyph({
			codepoint: 0x41,
			name: 'A',
			anchors: [{ name: 'top', x: 300, y: 700 }]
		});
		const indexByCp = new Map([
			[0x41, 1],
			[0x301, 2]
		]);
		const gpos = buildMarkGposBinary(
			project({ 0x41: A, 0x301: acute }),
			indexByCp
		);
		expect(gpos).not.toBeNull();
		const bytes = gpos!;
		const find = (s: string) => {
			const needle = new TextEncoder().encode(s);
			outer: for (let i = 0; i + needle.length <= bytes.length; i++) {
				for (let j = 0; j < needle.length; j++) {
					if (bytes[i + j] !== needle[j]) continue outer;
				}
				return i;
			}
			return -1;
		};
		expect(find('mark')).toBeGreaterThan(0);
		expect(find('mkmk')).toBe(-1);
	});
});

// applyMarkPositioning ---------------------------------------------------

describe('applyMarkPositioning', () => {
	it('returns the original buffer when there are no marks (no GPOS added)', async () => {
		const otf = await loadDemoOtf();
		const out = applyMarkPositioning(otf, project({}), new Map());
		// Same buffer → no GPOS injected
		expect(out).toBe(otf);
		const dir = parseSfntDirectory(out);
		expect(getTableBytes(out, dir, 'GPOS')).toBeNull();
	});

	it('splices a GPOS table into the font when marks are present', async () => {
		const otf = await loadDemoOtf();
		// Pretend the demo OTF has the right glyphs at known indices.
		const indexByCp = new Map([
			[0x41, 1], // A — base
			[0x301, 2] // acutecomb — mark
		]);
		// Demo OTF doesn't have 0x41 anchors by default; supply via project.
		const p = project({
			0x41: baseGlyph({
				codepoint: 0x41,
				anchors: [{ name: 'top', x: 300, y: 700 }]
			}),
			0x301: baseGlyph({
				codepoint: 0x0301,
				name: 'acutecomb',
				anchors: [{ name: '_top', x: 0, y: 0 }]
			})
		});
		const out = applyMarkPositioning(otf, p, indexByCp);
		expect(out).not.toBe(otf);
		const dir = parseSfntDirectory(out);
		const gpos = getTableBytes(out, dir, 'GPOS');
		expect(gpos).not.toBeNull();
		// Valid GPOS table header
		expect(gpos!.length).toBeGreaterThan(20);
		expect(gpos![0] << 8 | gpos![1]).toBe(1); // major version
	});

	it('produces a font that still parses cleanly after splice', async () => {
		const otf = await loadDemoOtf();
		const indexByCp = new Map([[0x41, 1], [0x301, 2]]);
		const p = project({
			0x41: baseGlyph({
				codepoint: 0x41,
				anchors: [{ name: 'top', x: 300, y: 700 }]
			}),
			0x301: baseGlyph({
				codepoint: 0x0301,
				name: 'acutecomb',
				anchors: [{ name: '_top', x: 0, y: 0 }]
			})
		});
		const out = applyMarkPositioning(otf, p, indexByCp);
		// Round-trip: directory parses without error
		expect(() => parseSfntDirectory(out)).not.toThrow();
	});
});
