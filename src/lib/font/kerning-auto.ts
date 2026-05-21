/**
 * Auto-kern M2 — build-time bulk kerning generator.
 *
 * Composes the existing M1 primitives (`sampleGlyphSilhouette`,
 * `suggestKerning`) into a single entry point the export pipeline
 * calls when `project.features.autoKern` is on. The algorithm
 * picks a reference pair from the user's existing manual kerning
 * (the most-overlapping one — that's the pair the designer tuned
 * with the clearest visual signal), then iterates every other
 * monochrome glyph pair and emits a suggestion above a confidence
 * threshold.
 *
 * Critical invariant: user-set pairs always win. If the user
 * already kerned `A V` to -50, auto-kern never replaces that.
 */

import type { Glyph, KerningPair, Project } from './types';
import { sampleGlyphSilhouette } from './silhouette';
import { suggestKerning, type KerningGlyph } from './kerning-suggest';

const DEFAULT_SAMPLES = 128;
const DEFAULT_CONFIDENCE = 0.5;
const MIN_DELTA = 5;  // ignore sub-5-unit suggestions — visually invisible

/**
 * Pick a reference pair from the user's manual kerning. Prefers
 * pairs where both glyphs are inked across most of their cap-band
 * (highest signal). Returns `null` if no usable manual pair exists.
 *
 * Numeric (codepoint) pairs only — class-based pairs (string sides)
 * don't have a unique left/right glyph to sample.
 */
const pickReference = (project: Project): KerningPair | null => {
	const numeric = project.kerning.filter(
		(k): k is KerningPair & { left: number; right: number } =>
			typeof k.left === 'number' && typeof k.right === 'number'
	);
	if (numeric.length === 0) return null;
	// Filter to pairs where both glyphs exist + have contours
	const usable = numeric.filter((k) => {
		const lg = project.glyphs[k.left];
		const rg = project.glyphs[k.right];
		return lg && rg && lg.contours.length > 0 && rg.contours.length > 0;
	});
	if (usable.length === 0) return null;
	// Pick whichever has the largest |value| — that's the pair the
	// designer pushed hardest, suggesting they considered it tuned.
	usable.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
	return usable[0];
};

/**
 * Sample a glyph as a `KerningGlyph` for the suggestion algorithm.
 * Uses the project's full em-span (ascender..descender) for the
 * scan range so all glyphs share a comparable silhouette grid.
 */
const sampleAs = (g: Glyph, ymin: number, ymax: number): KerningGlyph => ({
	silhouette: sampleGlyphSilhouette(g.contours, ymin, ymax, {
		samples: DEFAULT_SAMPLES
	}),
	advanceWidth: g.advanceWidth
});

export type AutoKernResult = {
	/** Pairs to add to the kern table (codepoint-indexed). */
	pairs: Array<{ left: number; right: number; value: number; confidence: number }>;
	/** Reference pair the algorithm used (for debug + UI surfacing). */
	referenceUsed: { left: number; right: number } | null;
	/** How many candidate pairs were considered before confidence + delta filtering. */
	candidatesConsidered: number;
};

/**
 * Generate auto-kern pairs for `project`. Skips pairs that exist
 * (with non-zero value) in `project.kerning` — those are the
 * user's manual work and we never overwrite. Returns an empty
 * result when no reference pair is available.
 *
 * Pairs explicitly set to zero by the user are also treated as
 * "explicit no-kern" — auto-kern doesn't try to fill them in.
 *
 * Time complexity: O(n²) glyph pairs × O(samples × stepsPerCurve)
 * per sample. For a typical Latin font (~120 glyphs, 128 samples)
 * that's ~15k pair tests at ~0.5ms each ≈ 7s. Acceptable for an
 * export step that already does Pyodide work.
 */
export const buildAutoKern = (
	project: Project,
	options: { confidence?: number } = {}
): AutoKernResult => {
	const result: AutoKernResult = {
		pairs: [],
		referenceUsed: null,
		candidatesConsidered: 0
	};
	const refPair = pickReference(project);
	if (!refPair) return result;
	const leftRef = project.glyphs[refPair.left as number];
	const rightRef = project.glyphs[refPair.right as number];
	if (!leftRef || !rightRef) return result;

	const { ascender, descender } = project.metrics;
	const refSamples = {
		left: sampleAs(leftRef, descender, ascender),
		right: sampleAs(rightRef, descender, ascender)
	};
	result.referenceUsed = { left: refPair.left as number, right: refPair.right as number };

	// Build the user-set / explicit-zero set so we never clobber it.
	const userSet = new Set<string>();
	for (const k of project.kerning) {
		if (typeof k.left !== 'number' || typeof k.right !== 'number') continue;
		userSet.add(`${k.left},${k.right}`);
	}

	// Pre-sample every glyph once; pair tests then reuse the sample.
	const codepoints = Object.keys(project.glyphs)
		.map(Number)
		.filter((cp) => {
			const g = project.glyphs[cp];
			return g && g.contours.length > 0;
		});
	const sampleCache = new Map<number, KerningGlyph>();
	for (const cp of codepoints) {
		sampleCache.set(cp, sampleAs(project.glyphs[cp], descender, ascender));
	}

	const threshold = options.confidence ?? project.features.autoKernConfidence ?? DEFAULT_CONFIDENCE;

	for (const li of codepoints) {
		for (const ri of codepoints) {
			result.candidatesConsidered++;
			if (userSet.has(`${li},${ri}`)) continue; // user-tuned
			const leftSample = sampleCache.get(li)!;
			const rightSample = sampleCache.get(ri)!;
			const suggestion = suggestKerning(leftSample, rightSample, refSamples);
			if (!suggestion) continue;
			if (suggestion.confidence < threshold) continue;
			if (Math.abs(suggestion.delta) < MIN_DELTA) continue;
			result.pairs.push({
				left: li,
				right: ri,
				value: suggestion.delta,
				confidence: suggestion.confidence
			});
		}
	}

	return result;
};
