/**
 * GPOS `mark` feature application — project anchor data → full GPOS binary
 * spliced into the SFNT.
 *
 * Pipeline:
 *   1. Walk project.glyphs to find matched (base anchor, mark anchor) pairs
 *      by name. Convention: marks have anchors starting with '_' (e.g.,
 *      '_top'); bases have matching non-underscore anchors ('top'). Marks
 *      are codepoints in U+0300-U+036F (combining diacritical range).
 *   2. Build one markClass per distinct anchor name that has both base and
 *      mark sides.
 *   3. Construct the MarkBasePosFormat1 subtable via gpos-mark.ts.
 *   4. Wrap in a GPOS table with 'mark' feature → lookup 0 under DFLT/dflt
 *      and latn/dflt scripts (matching what autoFeaSource emitted).
 *   5. Splice into the font binary.
 *
 * This is the moment where the binary primitives become a feature.
 */

import type { Project } from './types';
import {
	writeGposTable,
	writeLookupTable,
	writeMarkBasePosFormat1,
	type BaseRecord,
	type MarkRecord
} from './gpos-mark';
import { spliceTable } from './sfnt-splice';

const isMarkGlyph = (cp: number): boolean => cp >= 0x0300 && cp <= 0x036f;

type MarkInfo = { gIdx: number; anchor: { x: number; y: number }; className: string };
type BaseInfo = { gIdx: number; anchors: Map<string, { x: number; y: number }> };

/**
 * Walk the project, group anchors into mark/base buckets keyed by class
 * name. Returns the data structures ready for subtable construction.
 *
 * `indexByCodepoint` maps a project glyph's codepoint to its OpenType
 * glyph index (built by buildFont() in export.ts).
 */
const collectMarkData = (
	project: Project,
	indexByCodepoint: Map<number, number>
): {
	markInfos: MarkInfo[];
	baseInfos: BaseInfo[];
	classNames: string[];
} => {
	const markInfos: MarkInfo[] = [];
	const baseInfosByGidx = new Map<number, BaseInfo>();
	const allClassNames = new Set<string>();
	const classNamesUsedByMarks = new Set<string>();
	const classNamesUsedByBases = new Set<string>();

	for (const glyph of Object.values(project.glyphs)) {
		const anchors = glyph.anchors ?? [];
		if (anchors.length === 0) continue;
		const gIdx = indexByCodepoint.get(glyph.codepoint);
		if (gIdx === undefined) continue;
		if (isMarkGlyph(glyph.codepoint)) {
			// Mark glyph: anchors starting with '_' attach to bases on the
			// matching unprefixed class name.
			for (const a of anchors) {
				if (!a.name.startsWith('_')) continue;
				const className = a.name.slice(1);
				markInfos.push({ gIdx, anchor: { x: a.x, y: a.y }, className });
				allClassNames.add(className);
				classNamesUsedByMarks.add(className);
			}
		} else {
			// Base glyph: non-underscore anchors are attachment points.
			const baseAnchors = new Map<string, { x: number; y: number }>();
			for (const a of anchors) {
				if (a.name.startsWith('_')) continue;
				baseAnchors.set(a.name, { x: a.x, y: a.y });
				allClassNames.add(a.name);
				classNamesUsedByBases.add(a.name);
			}
			if (baseAnchors.size > 0) {
				baseInfosByGidx.set(gIdx, { gIdx, anchors: baseAnchors });
			}
		}
	}

	// Only keep class names that have BOTH a mark side and at least one base
	// side. Orphan classes (e.g., a base with anchor 'top' but no mark
	// attaching there) would emit empty markClass arrays the shaper rejects.
	const classNames = [...allClassNames]
		.filter((c) => classNamesUsedByMarks.has(c) && classNamesUsedByBases.has(c))
		.sort();

	return {
		markInfos: markInfos.filter((m) => classNames.includes(m.className)),
		baseInfos: [...baseInfosByGidx.values()].filter((b) =>
			[...b.anchors.keys()].some((n) => classNames.includes(n))
		),
		classNames
	};
};

/**
 * Build a GPOS binary with one 'mark' feature wrapping a single
 * MarkBasePosFormat1 subtable. Returns `null` if the project has no
 * compatible mark/base anchor data (caller skips the splice in that case).
 */
export const buildMarkGposBinary = (
	project: Project,
	indexByCodepoint: Map<number, number>
): Uint8Array | null => {
	const { markInfos, baseInfos, classNames } = collectMarkData(project, indexByCodepoint);
	if (classNames.length === 0 || markInfos.length === 0 || baseInfos.length === 0)
		return null;

	const classIndexByName = new Map(classNames.map((c, i) => [c, i] as const));
	const markClassCount = classNames.length;

	// Sort marks by glyph index ascending so the coverage list matches the
	// MarkArray order (spec invariant: glyph N at coverage index K → mark
	// record K).
	const sortedMarks = [...markInfos].sort((a, b) => a.gIdx - b.gIdx);
	const markGlyphs = sortedMarks.map((m) => m.gIdx);
	const markRecords: MarkRecord[] = sortedMarks.map((m) => ({
		markClass: classIndexByName.get(m.className)!,
		anchor: m.anchor
	}));

	// Bases similarly. For each base, build a length-markClassCount array of
	// anchors (null for classes the base doesn't attach to).
	const sortedBases = [...baseInfos].sort((a, b) => a.gIdx - b.gIdx);
	const baseGlyphs = sortedBases.map((b) => b.gIdx);
	const baseRecords: BaseRecord[] = sortedBases.map((b) => ({
		anchors: classNames.map((name) => b.anchors.get(name) ?? null)
	}));

	// De-dupe coverage entries (a mark with multiple class attachments could
	// otherwise appear twice in markGlyphs, breaking the spec invariant).
	if (new Set(markGlyphs).size !== markGlyphs.length) {
		// One mark with anchors on two different classes — the spec wants a
		// single coverage entry but one mark record per glyph. We don't
		// currently support that shape; skip and fall back.
		return null;
	}
	if (new Set(baseGlyphs).size !== baseGlyphs.length) return null;

	const subtable = writeMarkBasePosFormat1({
		markGlyphs,
		baseGlyphs,
		markRecords,
		baseRecords,
		markClassCount
	});
	const lookup = writeLookupTable(4, 0, [subtable]);

	return writeGposTable({
		scripts: [
			{ tag: 'DFLT', defaultLangSysFeatureIndices: [0] },
			{ tag: 'latn', defaultLangSysFeatureIndices: [0] }
		],
		features: [{ tag: 'mark', lookupListIndices: [0] }],
		lookups: [lookup]
	});
};

/**
 * Splice a project's mark-to-base anchor data into an emitted OTF binary,
 * replacing any existing (empty) GPOS table.
 *
 * Returns the original buffer if there's nothing to apply.
 */
export const applyMarkPositioning = (
	originalOtf: Uint8Array,
	project: Project,
	indexByCodepoint: Map<number, number>
): Uint8Array => {
	const gpos = buildMarkGposBinary(project, indexByCodepoint);
	if (!gpos) return originalOtf;
	return spliceTable(originalOtf, 'GPOS', gpos);
};
