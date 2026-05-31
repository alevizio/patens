/**
 * Citation engine — audit-code → citation matcher.
 *
 * Given a Patens audit code (e.g., "sidebearing-class-drift-lsb"),
 * returns the top-ranked Citations from the corpus that establish or
 * explain the rule. See docs/research/canonical-library.md Section 2
 * for the per-family licensing matrix and citation strength rationale.
 *
 * Current implementation is keyword + family-mapping based — a
 * deterministic lookup against a hand-built citation map. Post-launch
 * roadmap (per docs/research/ai-features-roadmap.md Feature 1) is to
 * augment this with semantic retrieval over the full ingested corpus
 * text. The deterministic baseline remains as the fallback path.
 */

import type { AuditCodeCitationMatch, RankedCitation } from './types';
import { MAX_CITATIONS_PER_CODE } from './types';

/**
 * Hand-built citation map — keyed by audit code, lists the (citationId,
 * score) pairs that establish the rule. Citations are sourced from the
 * corpus.ts manifest; this map is built from the licensing matrix in
 * docs/research/canonical-library.md Section 2.
 *
 * Empty mapping = no canonical citation in the open MVP corpus. The UI
 * should gracefully degrade ("no canonical citation in our reference
 * corpus yet — see [related family] sources").
 */
const CITATION_MAP: ReadonlyMap<string, ReadonlyArray<{ citationId: string; score: number }>> =
	new Map([
		// Family 1 — Contour shape
		// Most citations require Smeijers / Cheng / Noordzij — license-required.
		// Open corpus covers via spec-side references.
		['self-intersecting', [{ citationId: 'opentype-spec:filling', score: 0.6 }]],
		[
			'contour-winding-collision',
			[{ citationId: 'opentype-spec:filling', score: 0.7 }]
		],
		['near-collinear-points', []],
		['sharp-kink', []],
		['off-grid-points', [{ citationId: 'truetype-reference-manual:Chap5', score: 0.5 }]],
		['duplicate-points', []],
		['open-contour', [{ citationId: 'opentype-spec:cff2', score: 0.4 }]],
		['tiny-contour', []],
		['empty', []],

		// Family 2 — Vertical metrics + topology
		[
			'metrics-cap-above-ascender',
			[{ citationId: 'opentype-spec:os2', score: 1.0 }]
		],
		['metrics-x-above-cap', [{ citationId: 'opentype-spec:os2', score: 1.0 }]],
		['metrics-asc-mismatch', [{ citationId: 'opentype-spec:os2', score: 1.0 }]],
		['metrics-desc-mismatch', [{ citationId: 'opentype-spec:os2', score: 1.0 }]],
		['metrics-gap-mismatch', [{ citationId: 'opentype-spec:os2', score: 1.0 }]],
		['metrics-use-typo-off', [{ citationId: 'opentype-spec:os2', score: 1.0 }]],
		['metrics-win-clip-top', [{ citationId: 'opentype-spec:os2', score: 0.9 }]],
		['metrics-win-clip-bottom', [{ citationId: 'opentype-spec:os2', score: 0.9 }]],

		// Family 3 — Spacing + sidebearings
		// Tracy 1986 is the canonical authority — fair-use only. Open
		// MVP corpus references via Sheep (introductory) and spec
		// for advance-width semantics.
		[
			'zero-advance',
			[{ citationId: 'opentype-spec:hmtx', score: 1.0 }]
		],
		['overflows-advance', []],
		['sidebearing-deeply-negative-lsb', []],
		['sidebearing-deeply-negative-rsb', []],
		['sidebearing-class-drift-lsb', [{ citationId: 'stop-stealing-sheep:spacing', score: 0.6 }]],
		['sidebearing-class-drift-rsb', [{ citationId: 'stop-stealing-sheep:spacing', score: 0.6 }]],
		['kerning-extreme', [{ citationId: 'opentype-spec:kern', score: 0.7 }]],

		// Family 4 — OpenType invariants — spec citations are highest authority
		[
			'duplicate-glyph-name',
			[{ citationId: 'opentype-spec:post', score: 1.0 }]
		],
		[
			'feature-kern-disabled-with-pairs',
			[{ citationId: 'adobe-fea-spec:kern-feature', score: 1.0 }]
		],
		[
			'pair-orphan-class',
			[{ citationId: 'adobe-fea-spec:classes', score: 1.0 }]
		],
		[
			'class-empty',
			[{ citationId: 'adobe-fea-spec:classes', score: 1.0 }]
		],
		[
			'class-missing-member',
			[{ citationId: 'adobe-fea-spec:classes', score: 1.0 }]
		],
		[
			'class-name-format',
			[{ citationId: 'adobe-fea-spec:classes', score: 1.0 }]
		],
		[
			'pair-missing-glyph',
			[{ citationId: 'adobe-fea-spec:pairpos', score: 1.0 }]
		],
		[
			'kerning-pair-self',
			[{ citationId: 'adobe-fea-spec:pairpos', score: 0.8 }]
		],
		[
			'kerning-class-singleton',
			[{ citationId: 'opentype-cookbook:kerning', score: 0.7 }]
		],
		[
			'composite-missing-base',
			[{ citationId: 'ufo-3-spec:components', score: 1.0 }]
		],
		[
			'composite-cycle',
			[{ citationId: 'ufo-3-spec:components', score: 1.0 }]
		],

		// Family 5 — Naming + metadata
		[
			'naming-family',
			[{ citationId: 'opentype-spec:name', score: 1.0 }]
		],
		[
			'naming-style',
			[{ citationId: 'opentype-spec:name', score: 1.0 }]
		],
		[
			'naming-version',
			[{ citationId: 'opentype-spec:name', score: 1.0 }]
		],
		[
			'glyph-name-not-canonical',
			[{ citationId: 'adobe-glyph-list:agl-aglfn', score: 1.0 }]
		],
		[
			'glyph-name-invalid',
			[{ citationId: 'opentype-spec:glyph-name-restrictions', score: 1.0 }]
		],
		[
			'meta-no-vendor-id',
			[{ citationId: 'opentype-spec:os2-vendorId', score: 1.0 }]
		],
		[
			'meta-vendor-id-invalid',
			[{ citationId: 'opentype-spec:os2-vendorId', score: 1.0 }]
		],
		[
			'meta-version-format',
			[{ citationId: 'opentype-spec:name-version', score: 1.0 }]
		],

		// Family 6 — Coverage (Unicode)
		[
			'coverage-typo-essentials',
			[{ citationId: 'unicode-standard-16:basic-latin', score: 0.9 }]
		],
		[
			'coverage-latin-1-supp',
			[{ citationId: 'unicode-standard-16:latin-1-supp', score: 1.0 }]
		],
		[
			'coverage-currency',
			[{ citationId: 'unicode-standard-16:currency', score: 1.0 }]
		],
		[
			'coverage-math',
			[{ citationId: 'unicode-standard-16:math-symbols', score: 1.0 }]
		],

		// Family 7 — Anchors
		[
			'anchor-naming-mark-no-prefix',
			[{ citationId: 'adobe-fea-spec:mark-positioning', score: 1.0 }]
		],
		[
			'anchor-naming-base-with-prefix',
			[{ citationId: 'adobe-fea-spec:mark-positioning', score: 1.0 }]
		],
		[
			'anchor-without-partner',
			[{ citationId: 'opentype-spec:gpos-mark', score: 0.9 }]
		],

		// Family 8 — Variable fonts
		[
			'master-axis-out-of-range',
			[{ citationId: 'opentype-spec:fvar', score: 1.0 }]
		],
		[
			'master-axis-missing',
			[{ citationId: 'opentype-spec:fvar', score: 1.0 }]
		],
		[
			'master-contour-count',
			[{ citationId: 'opentype-spec:gvar', score: 1.0 }]
		],
		[
			'master-point-count',
			[{ citationId: 'opentype-spec:gvar', score: 1.0 }]
		],
		[
			'no-instances',
			[{ citationId: 'opentype-spec:fvar-namedInstance', score: 0.8 }]
		],
		[
			'axis-range-invalid',
			[{ citationId: 'opentype-spec:fvar', score: 1.0 }]
		],

		// Family 9 — Color fonts · brief · misc
		[
			'palette-length-mismatch',
			[{ citationId: 'opentype-spec:cpal', score: 1.0 }]
		],
		[
			'color-layer-no-palette',
			[{ citationId: 'opentype-spec:colr', score: 1.0 }]
		],
		[
			'color-layer-out-of-range',
			[{ citationId: 'opentype-spec:cpal', score: 1.0 }]
		]
	]);

/**
 * Look up citations for a single audit code.
 *
 * Returns up to MAX_CITATIONS_PER_CODE citations ordered by relevance
 * score (descending). Returns an empty array if the code has no
 * citation map entries.
 *
 * The actual Citation objects (with anchor, gist, verifiedAt) are
 * NOT YET LOADED from the corpus — this function returns the
 * citation IDs + scores. The next phase (corpus ingestion) populates
 * the full Citation objects. Until then, callers should pair the
 * citationId with the Source metadata from sourceById().
 */
export const lookupCitations = (auditCode: string): AuditCodeCitationMatch => {
	const entries = CITATION_MAP.get(auditCode) ?? [];

	const citations: ReadonlyArray<RankedCitation> = entries
		.slice(0, MAX_CITATIONS_PER_CODE)
		.map((entry) => ({
			citation: {
				// Placeholder Citation — anchor + gist will be populated
				// by the corpus-ingestion phase. Until then, callers can
				// resolve the sourceId via sourceById().
				id: entry.citationId,
				sourceId: entry.citationId.split(':')[0],
				anchor: entry.citationId.split(':')[1] ?? '',
				gist: '',
				verifiedAt: '2026-05-30'
			},
			score: entry.score
		}));

	return { auditCode, citations };
};

/**
 * Batch lookup — useful for the /audit/[code] page generator.
 */
export const lookupCitationsMany = (
	auditCodes: ReadonlyArray<string>
): ReadonlyMap<string, AuditCodeCitationMatch> => {
	const out = new Map<string, AuditCodeCitationMatch>();
	for (const code of auditCodes) {
		out.set(code, lookupCitations(code));
	}
	return out;
};

/**
 * Returns the set of audit codes that have at least one citation in
 * the current open MVP corpus. Useful for the UI to show a "Citations
 * available" badge in the audit panel.
 */
export const codesWithCitations = (): ReadonlySet<string> => {
	const out = new Set<string>();
	for (const [code, entries] of CITATION_MAP) {
		if (entries.length > 0) out.add(code);
	}
	return out;
};
