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
 * Helper: turn a (markInfos, baseInfos, classNames) collection into
 * a MarkBasePosFormat1 subtable. Returns null when the input would
 * produce an invalid subtable (empty / duplicate coverage).
 */
const buildMarkBasePosSubtable = (
	markInfos: MarkInfo[],
	baseInfos: BaseInfo[],
	classNames: string[]
): Uint8Array | null => {
	if (classNames.length === 0 || markInfos.length === 0 || baseInfos.length === 0)
		return null;
	const classIndexByName = new Map(classNames.map((c, i) => [c, i] as const));
	const markClassCount = classNames.length;
	const sortedMarks = [...markInfos].sort((a, b) => a.gIdx - b.gIdx);
	const markGlyphs = sortedMarks.map((m) => m.gIdx);
	const markRecords: MarkRecord[] = sortedMarks.map((m) => ({
		markClass: classIndexByName.get(m.className)!,
		anchor: m.anchor
	}));
	const sortedBases = [...baseInfos].sort((a, b) => a.gIdx - b.gIdx);
	const baseGlyphs = sortedBases.map((b) => b.gIdx);
	const baseRecords: BaseRecord[] = sortedBases.map((b) => ({
		anchors: classNames.map((name) => b.anchors.get(name) ?? null)
	}));
	if (new Set(markGlyphs).size !== markGlyphs.length) return null;
	if (new Set(baseGlyphs).size !== baseGlyphs.length) return null;
	return writeMarkBasePosFormat1({
		markGlyphs,
		baseGlyphs,
		markRecords,
		baseRecords,
		markClassCount
	});
};

/**
 * Collect mark-to-mark anchor data. A "mark2" (the attachee) is any
 * mark glyph that ALSO has unprefixed anchors (e.g. `top`) where a
 * NEXT mark could attach. A "mark1" (the attacher) is any mark glyph
 * with `_` -prefixed anchors (same as mark-to-base; reused as the
 * mkmk attacher).
 *
 * Convention: combining acute (U+0301) has both:
 *   `_top`  — its bottom-centre, attaches to base's `top`
 *   `top`   — its top-centre, where a next mark stacks on top of it
 */
const collectMkmkData = (
	project: Project,
	indexByCodepoint: Map<number, number>
): { mark1Infos: MarkInfo[]; mark2Infos: BaseInfo[]; classNames: string[] } => {
	const mark1Infos: MarkInfo[] = [];
	const mark2InfosByGidx = new Map<number, BaseInfo>();
	const classNamesUsedByMark1 = new Set<string>();
	const classNamesUsedByMark2 = new Set<string>();
	const allClassNames = new Set<string>();
	for (const glyph of Object.values(project.glyphs)) {
		if (!isMarkGlyph(glyph.codepoint)) continue;
		const anchors = glyph.anchors ?? [];
		if (anchors.length === 0) continue;
		const gIdx = indexByCodepoint.get(glyph.codepoint);
		if (gIdx === undefined) continue;
		// Mark1: `_top` etc — the attachment point.
		for (const a of anchors) {
			if (!a.name.startsWith('_')) continue;
			const className = a.name.slice(1);
			mark1Infos.push({ gIdx, anchor: { x: a.x, y: a.y }, className });
			allClassNames.add(className);
			classNamesUsedByMark1.add(className);
		}
		// Mark2: non-underscore anchors on a MARK glyph mean "next mark
		// attaches here". (Same anchor name shape as a base, but the glyph
		// happens to be a mark.)
		const mark2Anchors = new Map<string, { x: number; y: number }>();
		for (const a of anchors) {
			if (a.name.startsWith('_')) continue;
			mark2Anchors.set(a.name, { x: a.x, y: a.y });
			allClassNames.add(a.name);
			classNamesUsedByMark2.add(a.name);
		}
		if (mark2Anchors.size > 0) {
			mark2InfosByGidx.set(gIdx, { gIdx, anchors: mark2Anchors });
		}
	}
	const classNames = [...allClassNames]
		.filter((c) => classNamesUsedByMark1.has(c) && classNamesUsedByMark2.has(c))
		.sort();
	return {
		mark1Infos: mark1Infos.filter((m) => classNames.includes(m.className)),
		mark2Infos: [...mark2InfosByGidx.values()].filter((b) =>
			[...b.anchors.keys()].some((n) => classNames.includes(n))
		),
		classNames
	};
};

/**
 * Build a GPOS binary covering both 'mark' (mark-to-base, Type 4)
 * and 'mkmk' (mark-to-mark, Type 6) features. Returns `null` if
 * neither has usable anchor data.
 *
 * GPOS Type 6 MarkMarkPosFormat1 has the same byte layout as Type 4
 * MarkBasePosFormat1 — same subtable writer, just emitted under a
 * lookup of type 6 instead of 4.
 */
export const buildMarkGposBinary = (
	project: Project,
	indexByCodepoint: Map<number, number>
): Uint8Array | null => {
	const mark = collectMarkData(project, indexByCodepoint);
	const mkmk = collectMkmkData(project, indexByCodepoint);

	const markSub = buildMarkBasePosSubtable(mark.markInfos, mark.baseInfos, mark.classNames);
	const mkmkSub = buildMarkBasePosSubtable(mkmk.mark1Infos, mkmk.mark2Infos, mkmk.classNames);

	if (!markSub && !mkmkSub) return null;

	const lookups: Uint8Array[] = [];
	const features: { tag: string; lookupListIndices: number[] }[] = [];
	if (markSub) {
		lookups.push(writeLookupTable(4, 0, [markSub]));
		features.push({ tag: 'mark', lookupListIndices: [lookups.length - 1] });
	}
	if (mkmkSub) {
		lookups.push(writeLookupTable(6, 0, [mkmkSub]));
		features.push({ tag: 'mkmk', lookupListIndices: [lookups.length - 1] });
	}

	return writeGposTable({
		scripts: [
			{ tag: 'DFLT', defaultLangSysFeatureIndices: features.map((_, i) => i) },
			{ tag: 'latn', defaultLangSysFeatureIndices: features.map((_, i) => i) }
		],
		features,
		lookups
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
