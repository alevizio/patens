import { error } from '@sveltejs/kit';
import {
	AUDIT_CATALOGUE,
	AUDIT_CATALOGUE_BY_CODE,
	AUDIT_CATALOGUE_BY_CATEGORY
} from '$lib/font/audit-catalogue';
import { lookupCitations, sourceById } from '$lib/citations';
import type { EntryGenerator, PageLoad } from './$types';

/**
 * One static HTML page per audit rule. Pre-renders all ~93 codes at
 * build time so each rule has a stable, indexable URL with its own
 * `DefinedTerm` + `TechArticle` JSON-LD. This is the long-tail SEO /
 * LLM-citation surface: queries like "what is overshoot in type
 * design", "what is xheight-misaligned", or "Patens audit
 * self-intersecting" all land on a dedicated page rather than a
 * single-page-app anchor.
 */
export const prerender = true;

export const entries: EntryGenerator = () =>
	AUDIT_CATALOGUE.map((rule) => ({ code: rule.code }));

export const load: PageLoad = ({ params }) => {
	const rule = AUDIT_CATALOGUE_BY_CODE[params.code];
	if (!rule) {
		throw error(404, `Unknown audit code: ${params.code}`);
	}

	const peers = (AUDIT_CATALOGUE_BY_CATEGORY[rule.category] ?? []).filter(
		(r) => r.code !== rule.code
	);

	// Pull citations from the citation engine (docs/research/canonical-library.md
	// corpus). Resolve each citation's source for display. Empty list when
	// the code has no canonical reference in the current open MVP corpus.
	const citationMatch = lookupCitations(rule.code);
	const citations = citationMatch.citations
		.map((rc) => {
			const source = sourceById(rc.citation.sourceId);
			return source ? { citation: rc.citation, source, score: rc.score } : null;
		})
		.filter((c): c is NonNullable<typeof c> => c !== null);

	return {
		rule,
		peers,
		totalRules: AUDIT_CATALOGUE.length,
		citations
	};
};
