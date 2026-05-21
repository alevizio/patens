/**
 * Auto-kerning quality harness — milestone-1 week-2 day-10.
 *
 * Given a corpus of `(left glyph, right glyph, expected kern value)`
 * triples + a kerning suggester, compute MAE / median / max error
 * against the expected values. The intent: gate regressions in the
 * suggester algorithm at CI time.
 *
 * Headline target (per research): MAE ≤ 20 % of mean(|expected|) on
 * the top-200 Latin pair set drawn from Inter
 * (https://github.com/rsms/inter). Inter's contour data is too large
 * to bundle directly into the repo — this module ships the *harness*;
 * the actual Inter corpus is loaded externally by callers (a future
 * commit will wire a small representative subset).
 *
 * Pure TS, no dependencies beyond the silhouette / kerning-suggest
 * modules.
 */

import type { SilhouetteSample } from './silhouette';
import { suggestKerning } from './kerning-suggest';

export type KerningTestCase = {
	label: string;
	left: { silhouette: SilhouetteSample[]; advanceWidth: number };
	right: { silhouette: SilhouetteSample[]; advanceWidth: number };
	/** Foundry-shipped kerning value, in font units. */
	expected: number;
};

export type KerningCorpus = {
	/** Reference pair used by `suggestKerning` (typically HH / nn from the corpus font). */
	reference: {
		left: { silhouette: SilhouetteSample[]; advanceWidth: number };
		right: { silhouette: SilhouetteSample[]; advanceWidth: number };
	};
	cases: KerningTestCase[];
};

export type KerningQualityReport = {
	/** Total cases the suggester could evaluate (skips return null). */
	n: number;
	/** Mean absolute error in font units. */
	mae: number;
	/** Median absolute error. */
	median: number;
	/** Worst single error. */
	max: number;
	/** Per-case breakdown — `delta` field is positive when suggestion overshoots expected. */
	rows: Array<{ label: string; expected: number; suggested: number; absError: number }>;
};

/**
 * Evaluate a corpus of test cases against the auto-kerning suggester.
 * Returns the aggregate report; the caller decides whether to gate on
 * `mae` or per-row variance.
 *
 * Cases where the suggester returns `null` (e.g. no inked-scan overlap
 * between the pair or the reference) are dropped from the calculation
 * — not counted as errors. The `n` field reflects the post-filter
 * count.
 */
export const evaluateKerningSuggester = (corpus: KerningCorpus): KerningQualityReport => {
	const rows: KerningQualityReport['rows'] = [];
	for (const c of corpus.cases) {
		const result = suggestKerning(c.left, c.right, corpus.reference);
		if (!result) continue;
		const absError = Math.abs(result.delta - c.expected);
		rows.push({
			label: c.label,
			expected: c.expected,
			suggested: result.delta,
			absError
		});
	}
	const n = rows.length;
	if (n === 0) {
		return { n: 0, mae: 0, median: 0, max: 0, rows };
	}
	const errors = rows.map((r) => r.absError);
	const sum = errors.reduce((acc, e) => acc + e, 0);
	const mae = sum / n;
	const sorted = [...errors].sort((a, b) => a - b);
	const median =
		sorted.length % 2 === 1
			? sorted[(sorted.length - 1) / 2]
			: (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
	const max = sorted[sorted.length - 1];
	return { n, mae, median, max, rows };
};
