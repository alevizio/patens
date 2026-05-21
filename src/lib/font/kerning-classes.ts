/**
 * OT layout M2 — expand class-based kerning into explicit pairs at
 * export time. Closes the gap where the export pipeline previously
 * skipped any KerningPair with a string side, leaving class-based
 * kerning data orphaned in the project file unless the user had
 * Pyodide+fontTools running.
 *
 * Strategy: cross-product class members. A pair
 * `@A_left × @V_right → -80` with `@A_left = [A, Á, Â]` and
 * `@V_right = [V, W]` expands into 6 explicit pairs (one per
 * combination). Direct user-set pairs ALWAYS win over class-
 * derived ones — a designer who manually tuned (Â, V) to -70
 * keeps that value even if (@A_left, @V_right) says -80.
 */

import type { KerningClass, KerningPair, KerningSide } from './types';

export type ExpandedKerningPair = {
	left: number;
	right: number;
	value: number;
};

/**
 * Expand `pairs` into explicit codepoint-pair form, looking up
 * class names against `classes`. Returns only codepoint pairs;
 * unresolvable class references (typo in @name, empty class) are
 * silently skipped. Direct pairs take precedence over class-
 * derived ones via a last-write-wins map keyed by `${left},${right}`.
 *
 * The precedence rule depends on insertion order — process
 * class-derived pairs FIRST so direct pairs overwrite them. The
 * caller (export pipeline) typically iterates `project.kerning`
 * once, separating direct from class-based, then layers.
 */
export const expandKerningClasses = (
	pairs: ReadonlyArray<KerningPair>,
	classes: ReadonlyArray<KerningClass>
): ExpandedKerningPair[] => {
	const classMap = new Map<string, number[]>();
	for (const c of classes) classMap.set(c.name, c.members);

	const result = new Map<string, ExpandedKerningPair>();
	// Two passes: class-based first, then direct codepoint pairs.
	// This ensures direct pairs override class-derived ones at the
	// same `${left},${right}` key.
	const classBased: KerningPair[] = [];
	const direct: KerningPair[] = [];
	for (const p of pairs) {
		if (typeof p.left === 'string' || typeof p.right === 'string') {
			classBased.push(p);
		} else {
			direct.push(p);
		}
	}

	for (const p of classBased) {
		const lefts = resolveSide(p.left, classMap);
		const rights = resolveSide(p.right, classMap);
		if (!lefts || !rights) continue;
		for (const l of lefts) {
			for (const r of rights) {
				result.set(`${l},${r}`, { left: l, right: r, value: p.value });
			}
		}
	}
	for (const p of direct) {
		const l = p.left as number;
		const r = p.right as number;
		result.set(`${l},${r}`, { left: l, right: r, value: p.value });
	}

	return Array.from(result.values());
};

const resolveSide = (
	side: KerningSide,
	classMap: Map<string, number[]>
): number[] | null => {
	if (typeof side === 'number') return [side];
	const members = classMap.get(side);
	if (!members || members.length === 0) return null;
	return members;
};
