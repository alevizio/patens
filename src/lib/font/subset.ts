/**
 * Glyph subsetting for export — pick a target character set, expand
 * dependencies (composite bases, .notdef + space) and produce a
 * filtered glyph map ready for `buildFont`.
 *
 * Web font shipping is the primary use case: a landing page typically
 * needs Basic Latin + maybe a few punctuation marks, and a 5KB subset
 * beats a 150KB full font over the wire.
 *
 * The shipper picks codepoints (via UI presets like "Basic Latin" or a
 * free-text input). This module turns that into the actual subset:
 *
 *   1. Always include codepoint 0 / .notdef (the missing-glyph
 *      placeholder)
 *   2. Always include space (U+0020) — fonts without space crash
 *      most layout engines
 *   3. Include the requested codepoints
 *   4. Recursively include any composite-reference base glyphs (so an
 *      "Á" in the subset pulls in "A" + COMBINING ACUTE even if the
 *      user didn't ask for them)
 *
 * Returns a new `glyphs` map. The kerning/classes filtering happens
 * elsewhere (export pipeline) since it depends on the final
 * codepoint-to-glyphID mapping.
 */

import type { Glyph, Project } from './types';

/**
 * Canonical Unicode block presets — the most-asked-for character
 * sets when shipping web fonts. Designers pick one or more checkboxes
 * + add custom characters on top.
 */
export const SUBSET_PRESETS: Record<string, { label: string; codepoints: number[] }> = {
	'basic-latin': {
		label: 'Basic Latin (U+0020–U+007E)',
		codepoints: rangeCodepoints(0x0020, 0x007e)
	},
	'latin-1-supplement': {
		label: 'Latin-1 Supplement (U+00A0–U+00FF)',
		codepoints: rangeCodepoints(0x00a0, 0x00ff)
	},
	'latin-extended-a': {
		label: 'Latin Extended-A (U+0100–U+017F)',
		codepoints: rangeCodepoints(0x0100, 0x017f)
	},
	'digits': {
		label: 'Digits (0-9)',
		codepoints: rangeCodepoints(0x0030, 0x0039)
	},
	'punctuation': {
		label: 'Common punctuation',
		codepoints: [
			0x0021, 0x0022, 0x0027, 0x0028, 0x0029, 0x002c, 0x002d, 0x002e, 0x002f,
			0x003a, 0x003b, 0x003f, 0x005b, 0x005d, 0x007b, 0x007d,
			0x2013, 0x2014, // en + em dash
			0x2018, 0x2019, 0x201c, 0x201d, // smart quotes
			0x2026 // ellipsis
		]
	}
};

function rangeCodepoints(start: number, end: number): number[] {
	const out: number[] = [];
	for (let cp = start; cp <= end; cp++) out.push(cp);
	return out;
}

/**
 * Expand a target codepoint set into the actual glyph subset,
 * including .notdef, space, and any composite-reference dependencies.
 */
export const expandSubset = (
	project: Project,
	targetCodepoints: Iterable<number>
): { glyphs: Record<number, Glyph>; included: Set<number> } => {
	const included = new Set<number>();
	// Always include .notdef + space — every font needs them.
	included.add(0);
	included.add(0x0020);
	for (const cp of targetCodepoints) included.add(cp);

	// Walk composite references — if a glyph in the subset references
	// other glyphs by codepoint, pull those in too. Iterate until the
	// set is stable (handles transitive references: composite refs a
	// composite that refs a base).
	let added = true;
	while (added) {
		added = false;
		for (const cp of [...included]) {
			const g = project.glyphs[cp];
			if (!g) continue;
			for (const ref of g.components ?? []) {
				if (!included.has(ref.baseCodepoint)) {
					included.add(ref.baseCodepoint);
					added = true;
				}
			}
		}
	}

	const out: Record<number, Glyph> = {};
	for (const cp of included) {
		const g = project.glyphs[cp];
		if (g) out[cp] = g;
	}
	return { glyphs: out, included };
};

/**
 * Filter a kerning pair list to a subset's resolved codepoints.
 * Class-based pairs (string sides) are preserved as-is — the export
 * pipeline expands them after subsetting.
 */
export const filterKerningToSubset = <T extends { left: number | string; right: number | string }>(
	kerning: ReadonlyArray<T>,
	included: ReadonlySet<number>
): T[] => {
	return kerning.filter((k) => {
		if (typeof k.left === 'number' && !included.has(k.left)) return false;
		if (typeof k.right === 'number' && !included.has(k.right)) return false;
		return true;
	});
};
