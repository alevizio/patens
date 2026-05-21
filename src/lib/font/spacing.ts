/**
 * Auto-spacing — clean-room re-implementation of the area-normalised
 * sidebearing method documented by HTLetterSpacer (Huerta Tipográfica).
 * GPL is on their *code*; the method itself isn't copyrightable. We
 * use only the published algorithm.
 *
 * Operating principle:
 *
 *   For each glyph, measure the area between its left silhouette and
 *   a vertical reference line at the glyph's leftmost ink — call this
 *   `leftArea`. Likewise on the right. These areas are intrinsic to
 *   the glyph shape — independent of positioning.
 *
 *   Then, for visual spacing to feel consistent across glyphs, the
 *   sum `sidebearing + area/height` should match a reference glyph's
 *   same sum (typically `H` for caps, `n` for lowercase). Solving for
 *   the suggested sidebearing:
 *
 *     glyphSidebearing = (refSidebearing + refArea/refHeight) - glyphArea/glyphHeight
 *
 *   This produces the same visual whitespace adjacent to each letter
 *   regardless of contour shape — that's the HTL claim, ~95-98% of
 *   Latin pairs land in the acceptable zone.
 *
 * Build on `sampleGlyphSilhouette` from `./silhouette` for the inner
 * loop. No Pyodide hop.
 */

import { sampleGlyphSilhouette } from './silhouette';
import type { BezierContour } from './types';

export type SpacingMeasurement = {
	/**
	 * Area in font-units² between the left silhouette and the glyph's
	 * leftmost ink. Intrinsic to the contour shape — invariant under
	 * horizontal translation.
	 */
	leftArea: number;
	/** Area between the right silhouette and the rightmost ink. */
	rightArea: number;
	/**
	 * Vertical extent of inked rows in the measurement zone. Use this
	 * to normalise areas into a per-unit-height distance.
	 */
	inkedHeight: number;
	/** Leftmost x of any ink in the zone. */
	minX: number;
	/** Rightmost x of any ink in the zone. */
	maxX: number;
	/**
	 * Fraction of scan rows that actually had ink (0..1). Surfaced as
	 * a confidence proxy — a glyph with only a few inked rows in the
	 * zone (e.g. an ellipsis measured in the x-height zone) shouldn't
	 * drive spacing suggestions.
	 */
	inkedFraction: number;
};

export type SpacingZone = {
	/** Bottom of the measurement band (font units). */
	bottom: number;
	/** Top of the measurement band. */
	top: number;
	/** Scan-height samples. Default 128 — matches `sampleGlyphSilhouette`. */
	samples?: number;
};

/**
 * Measure a glyph's spacing-relevant areas inside the given vertical
 * zone. Returns `null` when the glyph has no ink in the zone at all
 * (typical for an "x" measured in the cap-height zone, or for an
 * unrendered codepoint).
 *
 * For Latin caps, pass `{ bottom: baseline, top: capHeight }`.
 * For lowercase, `{ bottom: baseline, top: xHeight }`.
 * Mixed-case fonts can measure both and pick by glyph category.
 */
export const measureSpacing = (
	contours: BezierContour[],
	zone: SpacingZone
): SpacingMeasurement | null => {
	const samples = zone.samples ?? 128;
	const silhouette = sampleGlyphSilhouette(contours, zone.bottom, zone.top, { samples });

	// First pass: find the inked rows and the leftmost / rightmost x.
	let minX = Infinity;
	let maxX = -Infinity;
	let inkedRows = 0;
	for (const s of silhouette) {
		if (s.left === null || s.right === null) continue;
		inkedRows++;
		if (s.left < minX) minX = s.left;
		if (s.right > maxX) maxX = s.right;
	}
	if (inkedRows === 0) return null;

	// Each row contributes `(left - minX)` to the left area and
	// `(maxX - right)` to the right area. Multiply by the row's vertical
	// thickness `(zone.top - zone.bottom) / samples` for true area.
	const rowHeight = (zone.top - zone.bottom) / samples;
	let leftArea = 0;
	let rightArea = 0;
	for (const s of silhouette) {
		if (s.left === null || s.right === null) continue;
		leftArea += (s.left - minX) * rowHeight;
		rightArea += (maxX - s.right) * rowHeight;
	}
	const inkedHeight = inkedRows * rowHeight;
	return {
		leftArea,
		rightArea,
		inkedHeight,
		minX,
		maxX,
		inkedFraction: inkedRows / samples
	};
};

export type ReferenceSpacing = {
	/** Measurement of a reference glyph (typically `H` for caps, `n` for lowercase). */
	measurement: SpacingMeasurement;
	/** The reference glyph's known-good left sidebearing. */
	leftSidebearing: number;
	/** The reference glyph's known-good right sidebearing. */
	rightSidebearing: number;
};

export type SpacingSuggestion = {
	/** Suggested left sidebearing, rounded to the nearest font unit. */
	leftSidebearing: number;
	/** Suggested right sidebearing, rounded to the nearest font unit. */
	rightSidebearing: number;
	/**
	 * Heuristic 0..1 confidence based on `inkedFraction` of the glyph
	 * being spaced. UI can show suggestions below 0.3 as "low confidence"
	 * or hide them entirely.
	 */
	confidence: number;
};

/**
 * Given a measured glyph and a reference (e.g. the user's existing `H`
 * or `n`), produce a suggested sidebearing pair so the glyph's visual
 * whitespace matches the reference's.
 *
 * The maths:
 *   refReach   = refSidebearing + refArea / refHeight
 *   glyphReach = glyphSidebearing + glyphArea / glyphHeight
 *   want: glyphReach == refReach
 *   ∴   glyphSidebearing = refReach - glyphArea / glyphHeight
 *
 * Applied on each side independently.
 */
export const suggestSpacingFromReference = (
	glyph: SpacingMeasurement,
	ref: ReferenceSpacing
): SpacingSuggestion => {
	const refLeftReach = ref.leftSidebearing + ref.measurement.leftArea / ref.measurement.inkedHeight;
	const refRightReach =
		ref.rightSidebearing + ref.measurement.rightArea / ref.measurement.inkedHeight;
	const left = refLeftReach - glyph.leftArea / glyph.inkedHeight;
	const right = refRightReach - glyph.rightArea / glyph.inkedHeight;
	// Confidence: more ink coverage → more trust. Cap at 1, floor at 0.
	const confidence = Math.max(0, Math.min(1, glyph.inkedFraction * 1.2));
	return {
		leftSidebearing: Math.round(left),
		rightSidebearing: Math.round(right),
		confidence
	};
};
