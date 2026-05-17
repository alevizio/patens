/**
 * Generate a default `.fea` source from a project's state — kern pairs,
 * kerning classes, and standard ligatures. Users can edit and override this
 * in the Features tab.
 */

import type { Project } from './types';
import { isClassRef } from './types';

const STANDARD_LIGATURES: Array<{ result: string; parts: string[] }> = [
	{ result: 'fi', parts: ['f', 'i'] },
	{ result: 'fl', parts: ['f', 'l'] },
	{ result: 'ffi', parts: ['f', 'f', 'i'] },
	{ result: 'ffl', parts: ['f', 'f', 'l'] }
];

const psNameForCodepoint = (project: Project, cp: number): string | null => {
	const g = project.glyphs[cp];
	return g?.name ?? null;
};

/** Render a KerningSide as a .fea reference (glyph name or @class). */
const sideToFea = (side: number | string, project: Project): string | null => {
	if (isClassRef(side)) return side; // already "@name"
	return psNameForCodepoint(project, side as number);
};

export const autoFeaSource = (project: Project): string => {
	const lines: string[] = [];

	lines.push('# Auto-generated from project state. Click "Customize" to take over.');
	lines.push('languagesystem DFLT dflt;');
	lines.push('languagesystem latn dflt;');
	lines.push('');

	// Kerning classes
	const classes = project.classes ?? [];
	if (classes.length > 0) {
		for (const c of classes) {
			const names = c.members
				.map((cp) => psNameForCodepoint(project, cp))
				.filter((n): n is string => !!n);
			if (names.length === 0) continue;
			lines.push(`${c.name} = [${names.join(' ')}];`);
		}
		lines.push('');
	}

	if (project.features.liga) {
		lines.push('feature liga {');
		for (const lig of STANDARD_LIGATURES) {
			const partNames = lig.parts.map((ch) => psNameForCodepoint(project, ch.codePointAt(0)!));
			const resultName = psNameForCodepoint(project, lig.result.codePointAt(0)!);
			if (partNames.every((n) => n) && resultName) {
				lines.push(`    sub ${partNames.join(' ')} by ${resultName};`);
			}
		}
		lines.push('} liga;');
		lines.push('');
	}

	if (project.features.kern && project.kerning.length > 0) {
		lines.push('feature kern {');
		for (const pair of project.kerning) {
			const left = sideToFea(pair.left, project);
			const right = sideToFea(pair.right, project);
			if (left && right) {
				lines.push(`    pos ${left} ${right} ${pair.value};`);
			}
		}
		lines.push('} kern;');
		lines.push('');
	}

	return lines.join('\n');
};
