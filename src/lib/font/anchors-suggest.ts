/**
 * Anchor auto-placement suggestions.
 *
 * Newly-created glyphs get default anchors via `addCustomGlyph`,
 * positioned at the centre of the *advance* (advanceWidth / 2) at
 * cap- or x-height. After the designer draws the glyph, those
 * anchors stay at their original x position even if the glyph's
 * visible centre has shifted — leaving anchors visually offset
 * from where marks should attach.
 *
 * This module suggests anchor positions based on the glyph's
 * actual bbox + the project's metric heights, so a "Recenter
 * anchors" or "Suggest anchors" button can produce the positions
 * a designer typically wants without manual placement.
 *
 * Convention recap:
 *  - Base glyph anchors are unprefixed: `top`, `bottom`, `center`
 *  - Mark glyph attach-anchors are underscore-prefixed: `_top`,
 *    `_bottom`, `_center` — these align WITH the base anchor of
 *    the same suffix at composite render time.
 *  - Latin uppercase → top at capHeight + N, bottom at baseline
 *  - Latin lowercase → top at xHeight + N, bottom at baseline
 *  - Combining marks → `_top` attaches at the mark's bbox bottom
 *    so it sits on top of the base's `top` anchor.
 */

import type { Anchor, Glyph, Project } from './types';
import { glyphBounds } from './path';

/** Vertical buffer above cap/x-height for top anchors (font units). */
const TOP_BUFFER = 30;

export type AnchorSuggestion = Anchor & {
	/** Reason for the suggestion — surfaced in tooltips / UIs. */
	rationale: string;
};

/**
 * Suggest anchor positions for `glyph`. Returns a fresh set of
 * anchors based on the glyph's actual bbox + the project's
 * metric heights. Empty glyphs (no contours) return an empty set
 * — the metric-center fallback in `addCustomGlyph` handles those.
 *
 * Existing anchor names that don't match the auto-suggestable set
 * (e.g. designer-named anchors like `centerleft`) are preserved
 * untouched.
 */
export const suggestAnchors = (glyph: Glyph, project: Project): AnchorSuggestion[] => {
	if (glyph.contours.length === 0) return [];
	const cp = glyph.codepoint;
	const bbox = glyphBounds(glyph.contours);
	const cx = Math.round((bbox.minX + bbox.maxX) / 2);
	const metrics = project.metrics;
	const out: AnchorSuggestion[] = [];

	const isUpper = cp >= 0x0041 && cp <= 0x005a;
	const isLower = cp >= 0x0061 && cp <= 0x007a;
	const isMark = cp >= 0x0300 && cp <= 0x036f;

	if (isUpper) {
		out.push({
			name: 'top',
			x: cx,
			y: metrics.capHeight + TOP_BUFFER,
			rationale: 'Cap-height anchor at visual centre'
		});
		out.push({
			name: 'bottom',
			x: cx,
			y: 0,
			rationale: 'Baseline anchor at visual centre'
		});
	} else if (isLower) {
		out.push({
			name: 'top',
			x: cx,
			y: metrics.xHeight + TOP_BUFFER,
			rationale: 'x-height anchor at visual centre'
		});
		out.push({
			name: 'bottom',
			x: cx,
			y: 0,
			rationale: 'Baseline anchor at visual centre'
		});
	} else if (isMark) {
		// Combining mark attaches at its visual bottom, which becomes
		// the point that lands on the base's `top` anchor.
		out.push({
			name: '_top',
			x: cx,
			y: bbox.minY,
			rationale: 'Mark attaches at bottom-centre of its bbox'
		});
	}
	return out;
};

/**
 * Bulk version: scan the project for drawn glyphs whose current
 * anchors visibly drift from the suggested positions (or are
 * missing entirely) and return one `{ codepoint, suggestions }`
 * entry per glyph that needs work.
 *
 * Drift threshold: 8fu — within that the existing anchor is
 * considered "close enough" and isn't flagged. Above it, the
 * suggestion will visibly change anchor placement.
 *
 * Glyphs that already have custom-named anchors keep them; the
 * suggester only considers the canonical names `top`, `bottom`,
 * `_top`.
 */
export const findAnchorDrift = (
	project: Project
): Array<{ codepoint: number; suggestions: AnchorSuggestion[] }> => {
	const out: Array<{ codepoint: number; suggestions: AnchorSuggestion[] }> = [];
	for (const cpStr of Object.keys(project.glyphs)) {
		const cp = Number(cpStr);
		const g = project.glyphs[cp];
		if (!g || g.contours.length === 0) continue;
		const suggestions = suggestAnchors(g, project);
		if (suggestions.length === 0) continue;
		// Check whether any suggestion differs from the existing anchor
		// by more than 8fu. If so, the glyph needs attention.
		const existing = g.anchors ?? [];
		let drift = false;
		for (const s of suggestions) {
			const ex = existing.find((a) => a.name === s.name);
			if (!ex) {
				drift = true;
				break;
			}
			if (Math.abs(ex.x - s.x) > 8 || Math.abs(ex.y - s.y) > 8) {
				drift = true;
				break;
			}
		}
		if (drift) out.push({ codepoint: cp, suggestions });
	}
	return out;
};
