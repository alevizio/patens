/**
 * Glyph silhouette sampling — foundation for auto-spacing and
 * auto-kerning (milestone 1 of the kerning roadmap).
 *
 * Given a glyph's contours plus the font's vertical extent (descender →
 * ascender), produces a left/right "ink profile" — for each of N
 * scan-heights, the leftmost and rightmost x where the outline has
 * ink. Heights with no ink return `null` on both sides.
 *
 * This is the HTLetterSpacer / BubbleKern shape — used by every
 * silhouette-distance algorithm in the field. Conceptually:
 *
 *   for each scan height y_i:
 *     gather all polyline points within [y_i - band/2, y_i + band/2]
 *     left  = min(x) of those points (null if none)
 *     right = max(x) of those points (null if none)
 *
 * Performance: O(P · S) where P is the number of polyline points across
 * all contours and S is the sample count. For a typical Latin glyph
 * (P ≈ 100, S = 128) this is sub-1ms; trivially under the per-keystroke
 * budget. No Pyodide hop required.
 */

import { sampleContour } from './path';
import type { BezierContour } from './types';

export type SilhouetteSample = {
	/** Scan-height in font units, evenly spaced from `ymin` to `ymax`. */
	y: number;
	/** Leftmost x where any contour has ink at this y, or `null` if none. */
	left: number | null;
	/** Rightmost x where any contour has ink at this y, or `null` if none. */
	right: number | null;
};

export type SilhouetteOptions = {
	/** Number of scan heights. Default 128 — sub-millisecond on Latin. */
	samples?: number;
	/** Bezier polyline density. Default 16 — matches `sampleContour`. */
	stepsPerCurve?: number;
};

/**
 * Sample a glyph's silhouette across the full ascender-to-descender
 * range. Returns an ordered array of `samples` entries from `ymin`
 * (bottom) to `ymax` (top).
 *
 * For each scan height, we walk the polyline derived from every
 * contour and find the x where each polyline segment crosses the
 * scan line. Min and max of those crossings become left and right.
 * Bands are NOT used — a true horizontal scan-line gives exact
 * left/right edges even for outlines built from sparse straight
 * segments (e.g. an upright rectangle whose vertical edges have only
 * two endpoints).
 */
export const sampleGlyphSilhouette = (
	contours: BezierContour[],
	ymin: number,
	ymax: number,
	opts: SilhouetteOptions = {}
): SilhouetteSample[] => {
	const samples = opts.samples ?? 128;
	const stepsPerCurve = opts.stepsPerCurve ?? 16;
	if (!Number.isFinite(ymin) || !Number.isFinite(ymax) || ymax <= ymin) {
		throw new Error(
			`sampleGlyphSilhouette: invalid y-range ymin=${ymin} ymax=${ymax} (need ymax > ymin)`
		);
	}
	if (samples < 2) {
		throw new Error(`sampleGlyphSilhouette: need samples ≥ 2, got ${samples}`);
	}

	// Build per-contour polylines. Each polyline is treated as closed —
	// the last point pairs with the first when scan-line-testing — so
	// vertical edges of straight-segment shapes work correctly even
	// though sampleContour doesn't densify L commands.
	const polylines: { x: number; y: number }[][] = [];
	for (const c of contours) {
		const poly = sampleContour(c.commands, stepsPerCurve);
		if (poly.length >= 2) polylines.push(poly);
	}

	const span = ymax - ymin;
	const out: SilhouetteSample[] = new Array(samples);

	for (let i = 0; i < samples; i++) {
		// Scan heights at band centers — bottommost sample is `ymin + span/(2N)`,
		// topmost is `ymax - span/(2N)`. Avoids exact-edge intersection edge cases.
		const y = ymin + ((i + 0.5) / samples) * span;
		let left: number | null = null;
		let right: number | null = null;
		for (const poly of polylines) {
			for (let j = 0; j < poly.length; j++) {
				const a = poly[j];
				const b = poly[(j + 1) % poly.length];
				// Strict-vs-non-strict comparisons avoid double-counting a
				// vertex that lies exactly on the scan line.
				const aAbove = a.y > y;
				const bAbove = b.y > y;
				if (aAbove === bAbove) continue; // both above or both below — no crossing
				const t = (y - a.y) / (b.y - a.y);
				const x = a.x + t * (b.x - a.x);
				if (left === null || x < left) left = x;
				if (right === null || x > right) right = x;
			}
		}
		out[i] = { y, left, right };
	}
	return out;
};

/**
 * Minimum horizontal distance between two glyphs placed at offset 0.
 * Walks both silhouettes scan-by-scan and returns the smallest
 * `B.left - A.right` where both glyphs have ink. Returns `null` when
 * the glyphs never share any scan height with ink (typical for marks
 * vs descenders).
 *
 * Used by the kerning suggester: given a target gap (derived from a
 * reference pair like "HH" or "nn"), the kerning delta is
 * `target - silhouetteDistance(A, B)`.
 *
 * Both inputs MUST be sampled with the same `samples` count and y-range.
 */
export const silhouetteDistance = (
	a: SilhouetteSample[],
	b: SilhouetteSample[]
): number | null => {
	if (a.length !== b.length) {
		throw new Error(
			`silhouetteDistance: sample count mismatch (${a.length} vs ${b.length})`
		);
	}
	let best: number | null = null;
	for (let i = 0; i < a.length; i++) {
		const ar = a[i].right;
		const bl = b[i].left;
		if (ar === null || bl === null) continue;
		const gap = bl - ar;
		if (best === null || gap < best) best = gap;
	}
	return best;
};
