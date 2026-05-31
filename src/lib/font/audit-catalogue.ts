/**
 * Single source of truth for the 93 audit rules: code, human-friendly
 * title, category, description, and whether the rule has a one-click
 * Fix action in the editor.
 *
 * Used by:
 *   - The per-rule pages at /audit/[code] (LLM-discoverable long-tail
 *     pages — one URL per rule, with DefinedTerm + TechArticle schema)
 *   - The /audit landing page index
 *   - The sitemap generator (each rule is a sitemap entry)
 *
 * Descriptions are sourced from `describeAuditCode()` in audit.ts so the
 * editor's inline help and the public rule pages stay in sync — if you
 * edit a description there, regenerate or hand-merge into this file.
 */

import { describeAuditCode } from './audit';

export type AuditCategory =
	| 'Contour shape'
	| 'Metric alignment'
	| 'Spacing & advance'
	| 'Composites & references'
	| 'Anchor naming'
	| 'Anchor coverage'
	| 'Variable-font compatibility'
	| 'Notes, flags & naming'
	| 'Glyph naming'
	| 'Vertical metrics'
	| 'Kerning'
	| 'Kerning classes'
	| 'Color fonts'
	| 'Designspace & masters'
	| 'Brief'
	| 'Coverage'
	| 'Glyph count'
	| 'UPM'
	| 'Family naming'
	| 'Metadata'
	| 'Designspace axes';

export type AuditRule = {
	/** Stable kebab-case code — the URL slug. */
	code: string;
	/** Human-friendly title — H1 on the rule's page. */
	title: string;
	/** Category — drives the sidebar grouping on /audit. */
	category: AuditCategory;
	/** One- or two-sentence plain-English explanation. */
	description: string;
	/** True when the editor has an auto-fix button for this rule. */
	fixable: boolean;
};

/**
 * Codes that have a one-click "Fix" action wired in the editor's audit
 * accordion. Must stay in sync with the `isFixable()` map in
 * src/lib/editor/AuditAccordion.svelte.
 */
const FIXABLE_CODES = new Set([
	'self-intersecting',
	'duplicate-points',
	'near-collinear-points',
	'contour-winding-collision',
	'off-grid-points',
	'open-contour',
	'zero-advance',
	'overflows-advance',
	'anchor-naming-mark-no-prefix',
	'anchor-naming-base-with-prefix',
	'tiny-contour'
]);

/**
 * Code → (title, category) overrides. Title defaults to a Title-Cased
 * version of the code if absent; category is required.
 */
const RULE_META: Record<string, { title?: string; category: AuditCategory }> = {
	// Contour shape
	'empty': { title: 'Empty glyph', category: 'Contour shape' },
	'off-grid-points': { title: 'Off-grid points', category: 'Contour shape' },
	'duplicate-points': { title: 'Duplicate points', category: 'Contour shape' },
	'self-intersecting': { title: 'Self-intersecting contour', category: 'Contour shape' },
	'contour-winding-collision': { title: 'Contour winding collision', category: 'Contour shape' },
	'near-collinear-points': { title: 'Near-collinear points', category: 'Contour shape' },
	'sharp-kink': { title: 'Sharp kink', category: 'Contour shape' },
	'open-contour': { title: 'Open contour', category: 'Contour shape' },
	'tiny-contour': { title: 'Tiny contour', category: 'Contour shape' },

	// Metric alignment
	'xheight-misaligned': { title: 'x-height misaligned', category: 'Metric alignment' },
	'capheight-misaligned': { title: 'Cap-height misaligned', category: 'Metric alignment' },
	'sidebearing-deeply-negative-lsb': { title: 'Deeply negative LSB', category: 'Metric alignment' },
	'sidebearing-deeply-negative-rsb': { title: 'Deeply negative RSB', category: 'Metric alignment' },
	'sidebearing-class-drift-lsb': { title: 'Sidebearing class drift (LSB)', category: 'Metric alignment' },
	'sidebearing-class-drift-rsb': { title: 'Sidebearing class drift (RSB)', category: 'Metric alignment' },

	// Spacing & advance
	'zero-advance': { title: 'Zero advance width', category: 'Spacing & advance' },
	'overflows-advance': { title: 'Overflows advance width', category: 'Spacing & advance' },
	'extends-above-ascender': { title: 'Extends above ascender', category: 'Spacing & advance' },
	'extends-below-descender': { title: 'Extends below descender', category: 'Spacing & advance' },

	// Composites & references
	'composite-missing-base': { title: 'Composite missing base', category: 'Composites & references' },
	'composite-cycle': { title: 'Composite cycle', category: 'Composites & references' },

	// Anchor naming
	'anchor-naming-mark-no-prefix': { title: 'Mark anchor missing "_" prefix', category: 'Anchor naming' },
	'anchor-naming-base-with-prefix': { title: 'Base anchor has "_" prefix', category: 'Anchor naming' },
	'anchor-without-partner': { title: 'Anchor without partner', category: 'Anchor naming' },

	// Variable-font compatibility
	'master-contour-count': { title: 'Master contour count mismatch', category: 'Variable-font compatibility' },
	'master-point-count': { title: 'Master point count mismatch', category: 'Variable-font compatibility' },
	'master-axis-unknown': { title: 'Master references unknown axis', category: 'Variable-font compatibility' },
	'master-axis-out-of-range': { title: 'Master axis value out of range', category: 'Variable-font compatibility' },
	'master-axis-missing': { title: 'Master missing axis value', category: 'Variable-font compatibility' },

	// Notes, flags & naming
	'notes-todo': { title: 'Notes contain TODO/FIXME', category: 'Notes, flags & naming' },
	'flagged-for-review': { title: 'Flagged for review', category: 'Notes, flags & naming' },

	// Glyph naming
	'glyph-name-empty': { title: 'Glyph name empty', category: 'Glyph naming' },
	'glyph-name-invalid': { title: 'Glyph name invalid', category: 'Glyph naming' },
	'glyph-name-too-long': { title: 'Glyph name too long', category: 'Glyph naming' },
	'glyph-name-not-canonical': { title: 'Glyph name not canonical (AGLFN)', category: 'Glyph naming' },
	'duplicate-glyph-name': { title: 'Duplicate glyph name', category: 'Glyph naming' },

	// Vertical metrics
	'metrics-cap-above-ascender': { title: 'Cap-height above ascender', category: 'Vertical metrics' },
	'metrics-x-above-cap': { title: 'x-height above cap-height', category: 'Vertical metrics' },
	'metrics-descender-nonnegative': { title: 'Descender is non-negative', category: 'Vertical metrics' },
	'metrics-zero-height': { title: 'Cap or x-height is zero', category: 'Vertical metrics' },
	'metrics-asc-mismatch': { title: 'OS/2 vs hhea ascender mismatch', category: 'Vertical metrics' },
	'metrics-desc-mismatch': { title: 'OS/2 vs hhea descender mismatch', category: 'Vertical metrics' },
	'metrics-gap-mismatch': { title: 'OS/2 vs hhea line-gap mismatch', category: 'Vertical metrics' },
	'metrics-use-typo-off': { title: 'USE_TYPO_METRICS flag off', category: 'Vertical metrics' },
	'metrics-win-clip-top': { title: 'winAscent below typoAscender (top clip risk)', category: 'Vertical metrics' },
	'metrics-win-clip-bottom': { title: 'winDescent below typoDescender (bottom clip risk)', category: 'Vertical metrics' },

	// Kerning
	'kerning-extreme': { title: 'Extreme kerning value', category: 'Kerning' },
	'kerning-pair-self': { title: 'Kerning pair to self', category: 'Kerning' },
	'feature-kern-disabled-with-pairs': { title: 'kern feature disabled but pairs present', category: 'Kerning' },

	// Kerning classes
	'kerning-class-singleton': { title: 'Singleton kerning class', category: 'Kerning classes' },
	'class-empty': { title: 'Empty kerning class', category: 'Kerning classes' },
	'class-missing-member': { title: 'Class member missing from project', category: 'Kerning classes' },
	'class-name-format': { title: 'Kerning class name missing "@" prefix', category: 'Kerning classes' },
	'pair-missing-glyph': { title: 'Kerning pair references missing glyph', category: 'Kerning classes' },
	'pair-orphan-class': { title: 'Kerning pair references undefined class', category: 'Kerning classes' },
	'kerning-no-classes': { title: 'Many pairs but no classes', category: 'Kerning classes' },
	'sidebearings-no-classes': { title: 'No sidebearing classes', category: 'Kerning classes' },

	// Color fonts
	'palette-length-mismatch': { title: 'CPAL palette length mismatch', category: 'Color fonts' },
	'color-layer-no-palette': { title: 'Color layers but no palette', category: 'Color fonts' },
	'color-layer-out-of-range': { title: 'Color layer references missing palette slot', category: 'Color fonts' },

	// Designspace & masters
	'master-empty': { title: 'Master has no glyph overrides', category: 'Designspace & masters' },
	'axis-range-invalid': { title: 'Axis min/default/max out of order', category: 'Designspace axes' },
	'master-orphan-axis': { title: 'Master references undeclared axis', category: 'Designspace axes' },
	'master-out-of-range': { title: 'Master sits outside axis range', category: 'Designspace axes' },
	'instance-orphan-axis': { title: 'Instance references undeclared axis', category: 'Designspace axes' },
	'no-instances': { title: 'No named instances', category: 'Designspace axes' },
	'axis-range-extreme': { title: 'Axis range very wide', category: 'Designspace axes' },
	'master-too-close': { title: 'Two masters nearly identical in designspace', category: 'Designspace & masters' },
	'stat-missing': { title: 'STAT table missing (familyAxes unset)', category: 'Variable-font compatibility' },
	'stat-format-mismatch': { title: 'STAT italic axis uses wrong format', category: 'Variable-font compatibility' },
	'stat-instance-name-mismatch': { title: 'STAT composed name does not match fvar instance', category: 'Variable-font compatibility' },
	'instance-at-master-position': { title: 'Instance shares location with a master', category: 'Designspace axes' },
	'opsz-without-cap-x-divergence': { title: 'opsz axis vacuous (no distinct opsz masters)', category: 'Variable-font compatibility' },

	// Brief
	'brief-no-intent': { title: 'Brief intent missing', category: 'Brief' },
	'brief-no-design-notes': { title: 'Brief design notes missing', category: 'Brief' },

	// Coverage
	'coverage-typo-essentials': { title: 'Typographic essentials coverage incomplete', category: 'Coverage' },
	'coverage-latin-1-supp': { title: 'Latin-1 Supplement coverage incomplete', category: 'Coverage' },
	'coverage-currency': { title: 'Currency symbol coverage incomplete', category: 'Coverage' },
	'coverage-math': { title: 'Math symbol coverage incomplete', category: 'Coverage' },

	// Glyph count
	'glyph-count-low': { title: 'Glyph count too low for usable font', category: 'Glyph count' },
	'control-glyphs-missing': { title: 'Control-glyph set incomplete', category: 'Glyph count' },
	'figures-non-tabular': { title: 'Non-tabular figures', category: 'Glyph count' },

	// UPM
	'upm-unusual': { title: 'Unusual UPM value', category: 'UPM' },

	// Family naming
	'naming-family': { title: 'Family name empty', category: 'Family naming' },
	'naming-style': { title: 'Style name empty', category: 'Family naming' },
	'naming-version': { title: 'Version field empty', category: 'Family naming' },
	'naming-family-long': { title: 'Family name too long', category: 'Family naming' },
	'naming-family-chars': { title: 'Family name has unsafe characters', category: 'Family naming' },
	'naming-designer-missing': { title: 'Designer field missing', category: 'Family naming' },
	'naming-copyright-missing': { title: 'Copyright line missing', category: 'Family naming' },
	'naming-license-missing': { title: 'License field missing', category: 'Family naming' },

	// Metadata
	'meta-no-copyright': { title: 'Copyright notice empty', category: 'Metadata' },
	'meta-no-designer': { title: 'Designer field empty', category: 'Metadata' },
	'meta-no-designer-url': { title: 'Designer URL empty', category: 'Metadata' },
	'meta-no-license': { title: 'License field empty', category: 'Metadata' },
	'meta-no-license-url': { title: 'License URL empty', category: 'Metadata' },
	'meta-no-manufacturer': { title: 'Manufacturer field empty', category: 'Metadata' },
	'meta-no-vendor-id': { title: 'OS/2 vendor ID empty', category: 'Metadata' },
	'meta-vendor-id-invalid': { title: 'OS/2 vendor ID invalid', category: 'Metadata' },
	'meta-version-format': { title: 'Version string format invalid', category: 'Metadata' },

	// Anchor coverage
	'anchors-missing': { title: 'Base glyphs missing anchors', category: 'Anchor coverage' }
};

/**
 * The full catalogue — one entry per audit code. Built at import time
 * from the title/category map above + the description text in audit.ts.
 *
 * Sorted by category, then alphabetically by code within each category.
 */
export const AUDIT_CATALOGUE: AuditRule[] = (() => {
	const codes = Object.keys(RULE_META);
	const rules: AuditRule[] = [];
	for (const code of codes) {
		const meta = RULE_META[code];
		const description = describeAuditCode(code);
		if (!description) {
			// Skip codes that have metadata but no description yet. The
			// build will warn; the description should be added to
			// describeAuditCode() to surface the rule on the public pages.
			continue;
		}
		rules.push({
			code,
			title: meta.title ?? toTitleCase(code),
			category: meta.category,
			description,
			fixable: FIXABLE_CODES.has(code)
		});
	}
	rules.sort((a, b) => {
		if (a.category === b.category) return a.code.localeCompare(b.code);
		return a.category.localeCompare(b.category);
	});
	return rules;
})();

/** Map code → rule. Used by the /audit/[code] page loader. */
export const AUDIT_CATALOGUE_BY_CODE: Record<string, AuditRule> = Object.fromEntries(
	AUDIT_CATALOGUE.map((r) => [r.code, r])
);

/** Group rules by category for the /audit landing-page sidebar. */
export const AUDIT_CATALOGUE_BY_CATEGORY: Record<string, AuditRule[]> = (() => {
	const map: Record<string, AuditRule[]> = {};
	for (const rule of AUDIT_CATALOGUE) {
		(map[rule.category] ||= []).push(rule);
	}
	return map;
})();

function toTitleCase(code: string): string {
	return code
		.split('-')
		.map((word, i) => (i === 0 ? word[0].toUpperCase() + word.slice(1) : word))
		.join(' ');
}
