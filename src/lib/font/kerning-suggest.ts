/**
 * Auto-kerning suggester — milestone-1 week-1 day-4.
 *
 * Given two glyphs and a reference pair (typically `HH` for caps, `nn`
 * for lowercase), suggest a kerning delta that brings the visible gap
 * for this pair in line with the reference.
 *
 * Algorithm:
 *   1. Compute the natural visible gap between left and right at zero
 *      kerning — uses `pairGap` on the two silhouettes plus left's
 *      advance.
 *   2. Compute the target gap from the reference pair, same formula.
 *   3. Kerning delta = target − natural, rounded to font units.
 *
 * A positive delta loosens the pair; negative tightens. Returned with
 * raw inputs so the UI can show "why this value?" ("AV currently sits
 * at 42 fu; reference HH sits at 28 fu → kern −14 fu").
 *
 * Pure TypeScript on top of the existing silhouette module — no
 * Pyodide hop. Sub-1ms per pair query.
 */

import { pairGap } from './silhouette';
import type { SilhouetteSample } from './silhouette';

export type KerningGlyph = {
	silhouette: SilhouetteSample[];
	advanceWidth: number;
};

export type KerningReference = {
	left: KerningGlyph;
	right: KerningGlyph;
};

export type KerningSuggestion = {
	/** Suggested kern delta in font units, rounded. Positive loosens, negative tightens. */
	delta: number;
	/** Measured visible gap before any kerning is applied (raw, unrounded). */
	naturalGap: number;
	/** Target gap derived from the reference pair (raw, unrounded). */
	targetGap: number;
	/**
	 * Heuristic 0..1 confidence. Driven by overlap of inked scan rows
	 * between the pair (more overlap → more trust) and by reference
	 * overlap (a reference pair with thin overlap shouldn't drive
	 * suggestions). UIs typically hide suggestions below ~0.3.
	 */
	confidence: number;
};

const PAIR_GAP_OPTIONS = {} as const;

/**
 * Suggest a kerning value for the pair (`left`, `right`) so its
 * visible gap matches the reference pair's.
 *
 * Returns `null` when either pair has no inked-scan overlap — that
 * means the algorithm can't see the gap (e.g. a Latin base paired
 * with a combining mark above the cap-height — different scan zones).
 */
export const suggestKerning = (
	left: KerningGlyph,
	right: KerningGlyph,
	reference: KerningReference
): KerningSuggestion | null => {
	void PAIR_GAP_OPTIONS;
	if (left.silhouette.length !== right.silhouette.length) {
		throw new Error(
			`suggestKerning: pair silhouette count mismatch (${left.silhouette.length} vs ${right.silhouette.length})`
		);
	}
	if (
		reference.left.silhouette.length !== reference.right.silhouette.length ||
		reference.left.silhouette.length !== left.silhouette.length
	) {
		throw new Error(
			'suggestKerning: reference silhouette count must match the pair silhouette count'
		);
	}

	const pair = pairGap(left.silhouette, left.advanceWidth, right.silhouette);
	const ref = pairGap(
		reference.left.silhouette,
		reference.left.advanceWidth,
		reference.right.silhouette
	);
	if (!pair || !ref) return null;

	const delta = Math.round(ref.gap - pair.gap);

	// Confidence — multiply pair coverage by reference coverage. Both
	// matter: if the pair barely overlaps, we don't know its true gap;
	// if the reference barely overlaps, the target is shaky.
	const pairCoverage = pair.inkedRows / left.silhouette.length;
	const refCoverage = ref.inkedRows / reference.left.silhouette.length;
	// Multiply, then scale slightly so a 0.5-each pair lands ~0.3 not 0.25.
	const confidence = Math.max(0, Math.min(1, pairCoverage * refCoverage * 1.2));

	return {
		delta,
		naturalGap: pair.gap,
		targetGap: ref.gap,
		confidence
	};
};
