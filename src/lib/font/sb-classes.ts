/**
 * Sidebearing-class auto-suggest — milestone-1 week-1 day-5.
 *
 * Given per-glyph measured sidebearings (from the spacing module,
 * typically) plus each glyph's script category, cluster glyphs whose
 * sidebearings sit within a small tolerance of each other AND share
 * a category — those clusters are *candidate* sidebearing classes the
 * user can adopt to keep spacing maintainable.
 *
 * Why classes matter: a font with 100 glyphs and 800 raw kerning
 * pairs is unmaintainable. The same 100 glyphs grouped into ~12
 * sidebearing classes (verticals, rounds, diagonals, ascenders…)
 * collapse to ~20 class pairs, which the designer can actually reason
 * about. This is what HTLetterSpacer's "category" system does
 * automatically; we mirror its grouping logic.
 *
 * Algorithm (single-pass on sorted values):
 *   group glyphs by (category, side)
 *   within each group, sort by sidebearing value
 *   walk sorted list, building clusters where
 *     current_value − cluster_min ≤ tolerance
 *   emit clusters with ≥ minMembers
 *
 * Output is a *suggestion* — the caller chooses which classes to
 * adopt and what names to give them. Median sidebearing value comes
 * along so the UI can show "this class's spacing target."
 *
 * Pure TypeScript on top of the spacing module's measurements. No
 * Pyodide hop, no Pyodide hop, no Pyodide hop. (Theme of the week.)
 */

import type { GlyphCategory } from './glyph-set';

export type SidebearingMeasurement = {
	codepoint: number;
	category: GlyphCategory;
	leftSidebearing: number;
	rightSidebearing: number;
};

export type SidebearingClusterOptions = {
	/**
	 * Max spread (max − min) of sidebearings allowed within one cluster,
	 * in font units. Default 10. Tighter values produce more clusters of
	 * smaller size; looser produces fewer clusters with more variance.
	 * HTLetterSpacer uses ~5 fu in 1000-UPM fonts; we widen slightly to
	 * give the user fewer suggestions to triage.
	 */
	tolerance?: number;
	/**
	 * Minimum members for a cluster to emit. Default 2 — single-glyph
	 * "classes" are meaningless. Set higher (3-4) to surface only the
	 * strongest signals.
	 */
	minMembers?: number;
};

export type SuggestedSidebearingClass = {
	/** Which side of the glyph this class is for. */
	side: 'left' | 'right';
	/** Script category — clusters never cross category boundaries. */
	category: GlyphCategory;
	/**
	 * Median sidebearing across cluster members, rounded to font units.
	 * Reasonable starting target if the user adopts this as a real class.
	 */
	value: number;
	/** Codepoints in the cluster, sorted ascending. */
	members: number[];
	/** max − min of sidebearings in the cluster, in font units. */
	spread: number;
};

/**
 * Suggest sidebearing classes for a font given per-glyph measurements.
 * Returns one entry per (category, side) cluster that meets the
 * tolerance + member-count thresholds.
 *
 * Empty input → empty output. Glyphs without measurements should be
 * filtered out by the caller; the function trusts its inputs.
 */
export const suggestSidebearingClasses = (
	glyphs: SidebearingMeasurement[],
	opts: SidebearingClusterOptions = {}
): SuggestedSidebearingClass[] => {
	const tolerance = opts.tolerance ?? 10;
	const minMembers = opts.minMembers ?? 2;
	if (tolerance < 0) throw new Error(`suggestSidebearingClasses: tolerance must be ≥ 0`);
	if (minMembers < 1) throw new Error(`suggestSidebearingClasses: minMembers must be ≥ 1`);

	const out: SuggestedSidebearingClass[] = [];

	// Iterate every (category, side) pair. We deliberately don't precompute
	// category sets — glyphs with unusual categories just produce smaller
	// or empty clusters, which is fine.
	type Side = 'left' | 'right';
	const SIDES: Side[] = ['left', 'right'];
	const byCategory = new Map<GlyphCategory, SidebearingMeasurement[]>();
	for (const g of glyphs) {
		const list = byCategory.get(g.category);
		if (list) list.push(g);
		else byCategory.set(g.category, [g]);
	}

	for (const [category, members] of byCategory) {
		for (const side of SIDES) {
			// Project to (codepoint, value) and sort by value.
			const projected = members
				.map((g) => ({
					cp: g.codepoint,
					value: side === 'left' ? g.leftSidebearing : g.rightSidebearing
				}))
				.sort((a, b) => a.value - b.value);

			// Walk sorted list, building clusters. A new cluster starts
			// whenever the current value exceeds the running cluster's min
			// by more than tolerance.
			let cluster: { cps: number[]; values: number[]; min: number } | null = null;
			const finalize = () => {
				if (!cluster) return;
				if (cluster.cps.length >= minMembers) {
					// Median (sorted values, so just middle index).
					const sortedV = [...cluster.values].sort((a, b) => a - b);
					const mid = Math.floor(sortedV.length / 2);
					const value =
						sortedV.length % 2 === 1
							? sortedV[mid]
							: Math.round((sortedV[mid - 1] + sortedV[mid]) / 2);
					out.push({
						side,
						category,
						value: Math.round(value),
						members: [...cluster.cps].sort((a, b) => a - b),
						spread: sortedV[sortedV.length - 1] - sortedV[0]
					});
				}
				cluster = null;
			};

			for (const { cp, value } of projected) {
				if (cluster === null) {
					cluster = { cps: [cp], values: [value], min: value };
				} else if (value - cluster.min <= tolerance) {
					cluster.cps.push(cp);
					cluster.values.push(value);
				} else {
					finalize();
					cluster = { cps: [cp], values: [value], min: value };
				}
			}
			finalize();
		}
	}

	// Stable ordering: by category, then side, then value.
	out.sort((a, b) => {
		if (a.category !== b.category) return a.category < b.category ? -1 : 1;
		if (a.side !== b.side) return a.side < b.side ? -1 : 1;
		return a.value - b.value;
	});
	return out;
};
