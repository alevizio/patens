/**
 * Family-wide kerning resolution.
 *
 * Each `Family` may carry `kerning` + `classes` arrays that apply across
 * all sibling projects. At export time (and in the spacing UI), we merge
 * the family-level pairs with the project's own — the project's pair
 * wins on (left, right) collision.
 *
 * Why this is structurally safe: KerningPair.left + .right are
 * KerningSide (glyph codepoint or class name). The semantic key is the
 * (left, right) tuple, not the value. Two siblings can carry the same
 * family-inherited AV pair and override only if they specifically need
 * a different value.
 */

import type { Family, Project, KerningPair, KerningClass } from './types';

const pairKey = (p: KerningPair): string => `${JSON.stringify(p.left)}|${JSON.stringify(p.right)}`;

/**
 * Returns the project's kerning with the family's kerning merged in.
 * Project pairs that collide with family pairs (same left + right) keep
 * the project's value; the family's pair is dropped. Family-only pairs
 * are appended at the end.
 */
export const resolveKerning = (project: Project, family: Family | null): KerningPair[] => {
	const familyPairs = family?.kerning ?? [];
	if (familyPairs.length === 0) return project.kerning;

	const projectKeys = new Set<string>(project.kerning.map(pairKey));
	const inherited = familyPairs.filter((fp) => !projectKeys.has(pairKey(fp)));
	if (inherited.length === 0) return project.kerning;

	return [...project.kerning, ...inherited];
};

/**
 * Returns the project's classes with the family's classes merged in.
 * Project classes win by name; family-only classes are appended.
 */
export const resolveClasses = (project: Project, family: Family | null): KerningClass[] => {
	const familyClasses = family?.classes ?? [];
	if (familyClasses.length === 0) return project.classes ?? [];

	const projectNames = new Set((project.classes ?? []).map((c) => c.name));
	const inherited = familyClasses.filter((fc) => !projectNames.has(fc.name));
	if (inherited.length === 0) return project.classes ?? [];

	return [...(project.classes ?? []), ...inherited];
};

/**
 * Tag whether a given pair is inherited from the family (vs defined on
 * the project itself). Drives the "inherited" badge in the spacing UI.
 *
 * Returns 'project' if the pair appears in project.kerning, 'family'
 * if it only appears in family.kerning, or null if neither.
 */
export type PairOrigin = 'project' | 'family' | null;

export const pairOrigin = (
	left: KerningPair['left'],
	right: KerningPair['right'],
	project: Project,
	family: Family | null
): PairOrigin => {
	const key = `${JSON.stringify(left)}|${JSON.stringify(right)}`;
	if (project.kerning.some((p) => pairKey(p) === key)) return 'project';
	if (family?.kerning?.some((p) => pairKey(p) === key)) return 'family';
	return null;
};
