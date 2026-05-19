/**
 * Variable-font master compatibility checker (Phase B1).
 *
 * Before kicking off a VF export, every master must be structurally
 * compatible with the default master:
 *   - Same set of drawn glyphs (no master can add/remove glyphs)
 *   - Same contour count per glyph
 *   - Same point count per contour
 *   - Same point types in the same order (line/curve/qcurve)
 *
 * Incompatible masters produce a VF binary that loads but renders wrong
 * (gvar interpolation reads stale point counts). fontTools' varLib raises
 * an error in this case but the message is cryptic and arrives ~15s into
 * the export. This checker fails fast and gives a useful per-glyph reason
 * the user can act on.
 *
 * Pure logic. No Pyodide, no opentype.js dependency, no I/O.
 */

import type { Glyph, Master, PathCommand, Project } from './types';

export type IncompatibilityCode =
	| 'missing-in-master'
	| 'extra-in-master'
	| 'contour-count'
	| 'point-count'
	| 'point-type';

export type Incompatibility = {
	code: IncompatibilityCode;
	masterId: string;
	masterName: string;
	codepoint: number;
	glyphName: string;
	/** Human-readable explanation for surfacing in a toast / dialog. */
	message: string;
};

export type CompatibilityReport = {
	ok: boolean;
	masterCount: number;
	checkedGlyphCount: number;
	issues: Incompatibility[];
};

/** Count of drawn (non-empty-contour) glyphs in a glyph map. */
const drawnCodepoints = (glyphs: Record<number, Glyph>): Set<number> => {
	const out = new Set<number>();
	for (const g of Object.values(glyphs)) {
		if (g.contours.length > 0) out.add(g.codepoint);
	}
	return out;
};

const cmdTypeOf = (c: PathCommand): string => c.type;

const compareGlyphContours = (
	defaultGlyph: Glyph,
	masterGlyph: Glyph,
	master: Master,
	codepoint: number,
	glyphName: string
): Incompatibility[] => {
	const issues: Incompatibility[] = [];
	const dCounts = defaultGlyph.contours.length;
	const mCounts = masterGlyph.contours.length;
	if (dCounts !== mCounts) {
		issues.push({
			code: 'contour-count',
			masterId: master.id,
			masterName: master.name,
			codepoint,
			glyphName,
			message: `${glyphName}: default master has ${dCounts} contour${
				dCounts === 1 ? '' : 's'
			}, ${master.name} has ${mCounts}`
		});
		return issues; // can't compare per-contour if counts differ
	}
	for (let i = 0; i < dCounts; i++) {
		const dCmds = defaultGlyph.contours[i].commands;
		const mCmds = masterGlyph.contours[i].commands;
		if (dCmds.length !== mCmds.length) {
			issues.push({
				code: 'point-count',
				masterId: master.id,
				masterName: master.name,
				codepoint,
				glyphName,
				message: `${glyphName} contour ${i + 1}: default has ${
					dCmds.length
				} points, ${master.name} has ${mCmds.length}`
			});
			continue;
		}
		for (let j = 0; j < dCmds.length; j++) {
			const dType = cmdTypeOf(dCmds[j]);
			const mType = cmdTypeOf(mCmds[j]);
			if (dType !== mType) {
				issues.push({
					code: 'point-type',
					masterId: master.id,
					masterName: master.name,
					codepoint,
					glyphName,
					message: `${glyphName} contour ${i + 1}, point ${j + 1}: default uses ${dType}, ${master.name} uses ${mType}`
				});
				break; // one point-type mismatch per contour is enough info
			}
		}
	}
	return issues;
};

/**
 * Check that every master is compatible with the default master.
 * Returns a report with `ok: true` if every drawn glyph in every master
 * matches the default master's topology.
 */
export const checkMasterCompatibility = (project: Project): CompatibilityReport => {
	const masters = project.masters ?? [];
	if (masters.length === 0) {
		return {
			ok: true,
			masterCount: 0,
			checkedGlyphCount: 0,
			issues: []
		};
	}

	const issues: Incompatibility[] = [];
	const defaultDrawn = drawnCodepoints(project.glyphs);

	for (const master of masters) {
		const masterDrawn = drawnCodepoints(master.glyphs);

		// Missing-in-master: codepoint drawn in default but not master.
		for (const cp of defaultDrawn) {
			if (!masterDrawn.has(cp)) {
				const gName = project.glyphs[cp]?.name ?? `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
				issues.push({
					code: 'missing-in-master',
					masterId: master.id,
					masterName: master.name,
					codepoint: cp,
					glyphName: gName,
					message: `${gName}: drawn in default master, missing in ${master.name}`
				});
			}
		}

		// Extra-in-master: master has a drawn glyph the default doesn't.
		for (const cp of masterDrawn) {
			if (!defaultDrawn.has(cp)) {
				const gName =
					master.glyphs[cp]?.name ??
					`U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
				issues.push({
					code: 'extra-in-master',
					masterId: master.id,
					masterName: master.name,
					codepoint: cp,
					glyphName: gName,
					message: `${gName}: drawn in ${master.name} but not in the default master`
				});
			}
		}

		// Per-glyph topology check (only on shared drawn glyphs).
		for (const cp of defaultDrawn) {
			if (!masterDrawn.has(cp)) continue;
			const dGlyph = project.glyphs[cp];
			const mGlyph = master.glyphs[cp];
			if (!dGlyph || !mGlyph) continue;
			const glyphName = dGlyph.name ?? `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
			issues.push(...compareGlyphContours(dGlyph, mGlyph, master, cp, glyphName));
		}
	}

	return {
		ok: issues.length === 0,
		masterCount: masters.length,
		checkedGlyphCount: defaultDrawn.size,
		issues
	};
};

/** Format a CompatibilityReport into a human-readable summary string. */
export const summarizeCompatibility = (report: CompatibilityReport): string => {
	if (report.ok) {
		return `${report.masterCount} master${report.masterCount === 1 ? '' : 's'} compatible across ${report.checkedGlyphCount} glyph${report.checkedGlyphCount === 1 ? '' : 's'}.`;
	}
	const byMaster = new Map<string, Incompatibility[]>();
	for (const i of report.issues) {
		const list = byMaster.get(i.masterName) ?? [];
		list.push(i);
		byMaster.set(i.masterName, list);
	}
	const lines: string[] = [
		`${report.issues.length} incompatibilit${report.issues.length === 1 ? 'y' : 'ies'} blocking VF export:`
	];
	for (const [name, issues] of byMaster) {
		lines.push(`  ${name}: ${issues.length} issue${issues.length === 1 ? '' : 's'}`);
		for (const i of issues.slice(0, 3)) lines.push(`    • ${i.message}`);
		if (issues.length > 3) lines.push(`    • … and ${issues.length - 3} more`);
	}
	return lines.join('\n');
};
