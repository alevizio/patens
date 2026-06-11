/**
 * Auto-kerning regression gate against the bundled demo font.
 *
 * The auto-kerning M1 ships a quality harness (`kerning-quality.ts`)
 * but the canonical regression corpus would be Inter's shipped
 * kerning — and committing Inter's binaries to git or fetching them
 * at CI time both fail the "keep it cheap" constraint.
 *
 * Instead this test uses the already-committed demo OTF as the
 * corpus source and runs a **snapshot-style** regression gate: the
 * auto-kerner runs against whatever pairs the demo font supports,
 * and the suggested values are pinned via inline snapshots. Any
 * change to silhouette sampling / pairGap / suggestKerning that
 * meaningfully shifts the numbers fails the test loudly with a
 * diff the reviewer inspects.
 *
 * Snapshot is the source of truth — when you intentionally improve
 * the algorithm, `vitest -u` updates the snapshot; reviewers then
 * read the diff in the PR.
 *
 * The TODO of building a REAL Inter corpus stays in
 * docs/next-90-days.md A3.
 */

import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parse as parseFont, Font } from 'opentype.js';
import { sampleGlyphSilhouette } from './silhouette';
import { suggestKerning } from './kerning-suggest';

const SAMPLES = 128;
// Canonical Latin pairs we'd evaluate IF the demo font had them all.
// Pairs the demo font is missing get silently skipped.
const CANDIDATE_PAIRS: ReadonlyArray<[string, string]> = [
	['A', 'V'], ['A', 'W'], ['A', 'Y'], ['A', 'T'],
	['F', 'A'], ['L', 'T'], ['L', 'V'], ['L', 'Y'],
	['P', 'A'], ['R', 'T'], ['R', 'V'], ['R', 'Y'],
	['T', 'A'], ['V', 'A'], ['W', 'A'], ['Y', 'A'],
	['T', 'o'], ['T', 'a'], ['T', 'u'], ['T', 'r'], ['T', 'y'],
	['V', 'o'], ['V', 'e'], ['W', 'o'], ['W', 'e'],
	['Y', 'o'], ['Y', 'e'], ['Y', 'u'],
	['F', 'o'], ['P', 'o'], ['P', 'e']
];

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

type OtGlyph = {
	name?: string;
	advanceWidth?: number;
	path?: {
		commands?: Array<{
			type: string;
			x?: number;
			y?: number;
			x1?: number;
			y1?: number;
			x2?: number;
			y2?: number;
		}>;
	};
};

const otGlyphToContours = (g: OtGlyph) => {
	const cmds = g.path?.commands ?? [];
	if (cmds.length === 0) return [];
	type Cmd =
		| { type: 'M'; x: number; y: number }
		| { type: 'L'; x: number; y: number }
		| { type: 'Q'; x1: number; y1: number; x: number; y: number }
		| { type: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
		| { type: 'Z' };
	type Contour = { closed: boolean; winding: 'cw'; commands: Cmd[] };
	const contours: Contour[] = [];
	let current: Contour | null = null;
	for (const c of cmds) {
		if (c.type === 'M') {
			if (current) contours.push(current);
			current = {
				closed: false,
				winding: 'cw',
				commands: [{ type: 'M', x: c.x ?? 0, y: c.y ?? 0 }]
			};
		} else if (current) {
			if (c.type === 'L')
				current.commands.push({ type: 'L', x: c.x ?? 0, y: c.y ?? 0 });
			else if (c.type === 'Q')
				current.commands.push({
					type: 'Q',
					x1: c.x1 ?? 0,
					y1: c.y1 ?? 0,
					x: c.x ?? 0,
					y: c.y ?? 0
				});
			else if (c.type === 'C')
				current.commands.push({
					type: 'C',
					x1: c.x1 ?? 0,
					y1: c.y1 ?? 0,
					x2: c.x2 ?? 0,
					y2: c.y2 ?? 0,
					x: c.x ?? 0,
					y: c.y ?? 0
				});
			else if (c.type === 'Z') {
				current.commands.push({ type: 'Z' });
				current.closed = true;
			}
		}
	}
	if (current) contours.push(current);
	return contours;
};

const findGlyphByChar = (
	font: InstanceType<typeof Font>,
	ch: string
): OtGlyph | null => {
	const cp = ch.codePointAt(0);
	if (cp === undefined) return null;
	const set = (font.glyphs as unknown) as {
		glyphs?: Record<string, OtGlyph & { unicode?: number; unicodes?: number[] }>;
	};
	if (!set.glyphs) return null;
	for (const g of Object.values(set.glyphs)) {
		if (g.unicode === cp || g.unicodes?.includes(cp)) return g;
	}
	return null;
};

describe('auto-kern regression vs demo font', () => {
	it('produces deterministic suggestions snapshotted in this test', async () => {
		const font = parseFont(await loadDemoOtf());
		const H = findGlyphByChar(font, 'H');
		expect(H, 'demo font must have an H glyph').not.toBeNull();
		const HContours = otGlyphToContours(H!);
		expect(HContours.length).toBeGreaterThan(0);
		const HSil = sampleGlyphSilhouette(HContours, -200, 800, { samples: SAMPLES });
		const reference = {
			left: { silhouette: HSil, advanceWidth: H!.advanceWidth ?? 600 },
			right: { silhouette: HSil, advanceWidth: H!.advanceWidth ?? 600 }
		};

		const results: Record<string, number> = {};
		for (const [leftChar, rightChar] of CANDIDATE_PAIRS) {
			const lg = findGlyphByChar(font, leftChar);
			const rg = findGlyphByChar(font, rightChar);
			if (!lg || !rg) continue;
			const lc = otGlyphToContours(lg);
			const rc = otGlyphToContours(rg);
			if (lc.length === 0 || rc.length === 0) continue;
			const suggestion = suggestKerning(
				{
					silhouette: sampleGlyphSilhouette(lc, -200, 800, { samples: SAMPLES }),
					advanceWidth: lg.advanceWidth ?? 600
				},
				{
					silhouette: sampleGlyphSilhouette(rc, -200, 800, { samples: SAMPLES }),
					advanceWidth: rg.advanceWidth ?? 600
				},
				reference
			);
			if (!suggestion) continue;
			results[`${leftChar}${rightChar}`] = suggestion.delta;
		}

		expect(Object.keys(results).length).toBeGreaterThan(0);
		// Pinned snapshot of suggested kerning deltas against the demo
		// font. Updates require `vitest -u` and a reviewer reading the
		// diff in the PR. The reviewer's question is always: "do the
		// shifts make typographic sense, or did the algorithm break?"
		expect(results).toMatchInlineSnapshot(`
			{
			  "AT": -107,
			  "AV": -105,
			  "AW": -64,
			  "AY": -107,
			  "FA": -61,
			  "Fo": -20,
			  "LT": -135,
			  "LV": -116,
			  "LY": -135,
			  "PA": -55,
			  "Pe": 15,
			  "Po": 15,
			  "RT": 8,
			  "RV": -9,
			  "RY": -30,
			  "TA": -107,
			  "Ta": -155,
			  "To": -155,
			  "Tr": -155,
			  "Tu": -155,
			  "Ty": -135,
			  "VA": -105,
			  "Ve": -52,
			  "Vo": -52,
			  "WA": -64,
			  "We": -35,
			  "Wo": -35,
			  "YA": -107,
			  "Ye": -118,
			  "Yo": -118,
			  "Yu": -80,
			}
		`);
	});
});
