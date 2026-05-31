/**
 * Citation engine — type definitions
 *
 * The citation engine maps each audit code to one or more canonical
 * citations from the type-design literature. See
 * docs/research/canonical-library.md for the corpus design and
 * docs/research/ai-features-roadmap.md Feature 1 for the product
 * roadmap this implements.
 */

/**
 * A canonical source — book, specification, journal paper, foundry blog.
 *
 * Bibliographic identity is the (title, author, year) triple. Sources
 * with multiple editions share the same Source.id; per-edition page
 * numbers go on Citation, not Source.
 */
export type Source = {
	/** Stable string ID — kebab-case slug. Once issued, never reused. */
	id: string;
	/** Full bibliographic title. */
	title: string;
	/** Author(s) — "Tracy" / "Tracy and Smith" / "Microsoft Typography". */
	author: string;
	/** Year of the FIRST edition. Subsequent editions tracked per-citation. */
	year: number;
	/** Publisher / foundry / standards body. */
	publisher: string;
	/**
	 * One of:
	 * - "book" — bound volume with editions + page numbers
	 * - "specification" — normative spec (OpenType, Unicode, FEA)
	 * - "paper" — academic / industry research paper
	 * - "blog" — foundry / personal blog post (versionable)
	 * - "manual" — official technical manual (Apple TrueType Reference Manual)
	 */
	kind: 'book' | 'specification' | 'paper' | 'blog' | 'manual';
	/**
	 * Licensing posture for body-text ingestion.
	 * - "open" — open license (CC, MIT, Apache, Unicode IP policy)
	 *   allows in-corpus storage of body text
	 * - "fair-use" — in-copyright but excerptable for educational
	 *   research tool with attribution. Patens cites by bibliographic
	 *   reference only — does NOT ingest body text.
	 * - "license-required" — body-text ingestion requires negotiated
	 *   licensing. Cite by reference only until license obtained.
	 */
	licensing: 'open' | 'fair-use' | 'license-required';
	/** Canonical URL — current edition, foundry homepage, spec URL. */
	canonicalUrl: string;
	/**
	 * archive.org snapshot URL — REQUIRED for blog kind sources, which
	 * are versionable and may be revised live. Optional for stable
	 * sources (specs revise via numbered versions, books revise via
	 * editions).
	 */
	archiveUrl?: string;
	/**
	 * Free-text confidence note when the source's authority is itself
	 * uncertain (e.g., a single-author blog post making a claim that
	 * isn't echoed elsewhere). Empty / undefined = canonical.
	 */
	caveat?: string;
};

/**
 * A specific citation — pointer to a passage within a Source.
 *
 * One Source produces many Citations (different chapters, different
 * editions). The audit-code → citation mapping in the matcher is
 * Citation-level, not Source-level.
 */
export type Citation = {
	/** Stable string ID — `${source.id}:${anchor}`. */
	id: string;
	/** The Source this citation is within. */
	sourceId: string;
	/**
	 * Where IN the source. Format varies by source.kind:
	 * - book: page range like "71-73"
	 * - specification: section ID like "os2" or "fvar.namedInstances"
	 * - paper: section like "§4.2" or page like "p.337"
	 * - blog: anchor like "#counter-shape" or omitted
	 * - manual: chapter reference like "Chap5"
	 */
	anchor: string;
	/**
	 * The edition / version this anchor refers to. Required for sources
	 * with multiple editions; omitted for sources with a single
	 * canonical state.
	 */
	editionOrVersion?: string;
	/**
	 * Short description of WHAT the cited passage establishes. Used in
	 * the UI as the "why this citation" annotation.
	 *
	 * Example: "Smith-Tracy spacing method; the H/n/o control-letter
	 * triad."
	 */
	gist: string;
	/**
	 * When this citation was last verified (matches the canonical
	 * Source content). ISO-8601 date.
	 */
	verifiedAt: string;
};

/**
 * A matcher result — pairs an audit code with one or more citations.
 *
 * The matcher returns up to MAX_CITATIONS_PER_CODE (default 3) per
 * code, ordered by relevance score (descending).
 */
export type AuditCodeCitationMatch = {
	/** The Patens audit code (e.g., "sidebearing-class-drift-lsb"). */
	auditCode: string;
	/** Ordered citations, most-relevant first. */
	citations: ReadonlyArray<RankedCitation>;
};

/**
 * A citation with its relevance score for a specific audit code.
 */
export type RankedCitation = {
	citation: Citation;
	/**
	 * Relevance score 0-1, monotonic.
	 *
	 * 1.0 = the citation is the canonical authority for this rule
	 *       (e.g., Tracy 1986 pp. 71-73 for sidebearing-class-drift)
	 * 0.5 = the citation is secondary support (general anatomy /
	 *       classification context)
	 * 0.2 = the citation is tangential context worth surfacing
	 */
	score: number;
};

/**
 * The MAX_CITATIONS_PER_CODE constant. UI should not surface more than
 * this number of citations per audit code — beyond 3, the citation
 * list becomes noise rather than guidance.
 */
export const MAX_CITATIONS_PER_CODE = 3;

/**
 * Confidence threshold below which citations are NOT surfaced in the
 * audit edit-panel inline UI. They remain accessible from the
 * /audit/[code] dedicated page where users have opted into deeper
 * exploration.
 */
export const INLINE_UI_CONFIDENCE_THRESHOLD = 0.4;
