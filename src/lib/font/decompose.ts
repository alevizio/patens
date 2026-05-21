/**
 * Unicode NFD-based composite glyph generator.
 *
 * Most precomposed Latin / Greek / Cyrillic letters decompose
 * canonically into a base letter + combining mark(s) — e.g.
 * "Á" (U+00C1) → "A" (U+0041) + COMBINING ACUTE ACCENT (U+0301).
 * For these, the designer typically wants the precomposed glyph
 * to render as a composite reference to base + mark rather than
 * being drawn from scratch.
 *
 * `decomposeCodepoint` uses the JS engine's built-in NFD
 * normaliser (no Unicode tables needed) to get the decomposition,
 * then maps each component to a `GlyphReference` that the
 * existing composite renderer + export pipeline already
 * understands.
 *
 * Anchor positioning is M2 follow-up work — for now we emit
 * zero-offset references and rely on the designer's anchor data
 * (or manual positioning) to land marks correctly. This still
 * cuts ~80% of the manual labour of building accented glyph
 * sets.
 */

import type { GlyphReference, Project } from './types';

export type DecompositionResult = {
	codepoint: number;
	references: GlyphReference[];
	/** Missing component codepoints — if any, the user can't auto-compose yet. */
	missing: number[];
};

/**
 * Decompose a codepoint via the JS NFD normaliser, then map each
 * component to a GlyphReference if that component is already
 * drawn in the project.
 *
 * Returns `null` when the codepoint has no decomposition (e.g.
 * "A" itself, ligatures like "fi", non-canonical sequences). The
 * caller treats null as "this glyph has to be drawn manually."
 */
export const decomposeCodepoint = (
	codepoint: number,
	project: Project
): DecompositionResult | null => {
	const ch = String.fromCodePoint(codepoint);
	const nfd = ch.normalize('NFD');
	const components = [...nfd].map((c) => c.codePointAt(0) ?? 0);
	// No decomposition: NFD is the same single codepoint.
	if (components.length <= 1 && components[0] === codepoint) return null;
	const references: GlyphReference[] = [];
	const missing: number[] = [];
	for (const cp of components) {
		const g = project.glyphs[cp];
		if (!g || (g.contours.length === 0 && (!g.components || g.components.length === 0))) {
			missing.push(cp);
			continue;
		}
		references.push({
			baseCodepoint: cp,
			offsetX: 0,
			offsetY: 0
		});
	}
	return { codepoint, references, missing };
};

/**
 * Scan the project for precomposed glyphs that could be auto-
 * built from existing base + combining glyphs. Used by the audit
 * pass to surface "compose this instead of drawing it from
 * scratch" suggestions, and by the bulk-compose action to do it
 * for many glyphs at once.
 *
 * Returns codepoints in ascending order. A glyph qualifies if:
 *  - It's currently EMPTY (no contours, no existing components)
 *  - Its NFD decomposition has ≥2 codepoints
 *  - Every component is drawn or composed in the project
 */
export const findComposableCandidates = (project: Project): DecompositionResult[] => {
	const out: DecompositionResult[] = [];
	for (const cpStr of Object.keys(project.glyphs)) {
		const cp = Number(cpStr);
		const g = project.glyphs[cp];
		if (!g) continue;
		const isEmpty =
			g.contours.length === 0 &&
			(!g.components || g.components.length === 0);
		if (!isEmpty) continue;
		const decomp = decomposeCodepoint(cp, project);
		if (!decomp) continue;
		if (decomp.missing.length > 0) continue;
		if (decomp.references.length < 2) continue;
		out.push(decomp);
	}
	out.sort((a, b) => a.codepoint - b.codepoint);
	return out;
};
