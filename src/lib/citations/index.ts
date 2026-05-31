/**
 * Citation engine — public API barrel.
 *
 * See docs/research/canonical-library.md for the corpus design and
 * docs/research/ai-features-roadmap.md Feature 1 for the product
 * roadmap.
 */

export type {
	Source,
	Citation,
	RankedCitation,
	AuditCodeCitationMatch
} from './types';
export { MAX_CITATIONS_PER_CODE, INLINE_UI_CONFIDENCE_THRESHOLD } from './types';
export { SOURCES, sourceById } from './corpus';
export {
	lookupCitations,
	lookupCitationsMany,
	codesWithCitations
} from './matcher';
