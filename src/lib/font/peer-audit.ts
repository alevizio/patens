/**
 * Peer-consistency audit.
 *
 * Existing audits check per-glyph rules (open contour, naming, advance overflow)
 * and project-level invariants (vertical metrics consistency, control-set
 * coverage). This module adds a *relational* layer: glyphs are grouped by
 * structural class (round caps, vertical-stem caps, ascenders, descenders,
 * round lowercase, figures), and each member's key dimensions are compared
 * against the group's mean. Outliers — glyphs whose advance, top/bottom Y, or
 * sidebearings drift unexpectedly far from their peers — are surfaced as audit
 * issues.
 *
 * This catches the kind of slip-of-the-pen drift that a designer working alone
 * commonly misses: an O that's a few units shorter than the other round caps,
 * a tabular 5 with a different advance than the rest of the digits, a g
 * descender that doesn't reach as far as p or q.
 */

import { glyphBounds } from './path';
import type { AuditIssue } from './audit';
import type { Project, Glyph } from './types';

export type PeerGroup = {
	id: string;
	label: string;
	codepoints: number[];
	/** Which dimensions to check for consistency across members of this group. */
	checks: Array<PeerCheck>;
};

export type PeerCheck =
	/** advanceWidth */
	| 'advance'
	/** maxY of the bounding box — meaningful for caps + ascenders + figures */
	| 'capTop'
	/** maxY of the bounding box — meaningful for x-height-relative lowercase */
	| 'xHeight'
	/** minY of the bounding box — meaningful for baseline-sitting and descenders */
	| 'baseline'
	/** average of LSB + RSB; large drift suggests inconsistent fitting */
	| 'sidebearings'
	/** total bbox height */
	| 'bboxHeight';

/**
 * Structural peer groups. Each glyph in a group is expected to share key
 * dimensions with the others (with optical-compensation tolerance handled by
 * the threshold logic below). Groups are intentionally conservative — letters
 * are paired only with peers that genuinely *should* match.
 */
export const PEER_GROUPS: PeerGroup[] = [
	{
		id: 'caps-rounds',
		label: 'Round capitals (O C G Q)',
		codepoints: [0x004f, 0x0043, 0x0047, 0x0051],
		checks: ['capTop', 'baseline', 'sidebearings', 'advance']
	},
	{
		id: 'caps-stems',
		label: 'Vertical-stem capitals (H I L M N E F)',
		codepoints: [0x0048, 0x0049, 0x004c, 0x004d, 0x004e, 0x0045, 0x0046],
		checks: ['capTop', 'baseline']
	},
	{
		id: 'caps-diagonals',
		label: 'Diagonal capitals (A V W X Y K)',
		codepoints: [0x0041, 0x0056, 0x0057, 0x0058, 0x0059, 0x004b],
		checks: ['capTop', 'baseline']
	},
	{
		id: 'lower-rounds',
		label: 'Round lowercase (o c e)',
		codepoints: [0x006f, 0x0063, 0x0065],
		checks: ['xHeight', 'baseline', 'sidebearings', 'advance']
	},
	{
		id: 'lower-stems',
		label: 'Vertical-stem lowercase (n m h i l)',
		codepoints: [0x006e, 0x006d, 0x0068, 0x0069, 0x006c],
		checks: ['xHeight', 'baseline']
	},
	{
		id: 'lower-ascenders',
		label: 'Ascenders (b d h k l)',
		codepoints: [0x0062, 0x0064, 0x0068, 0x006b, 0x006c],
		checks: ['capTop', 'baseline']
	},
	{
		id: 'lower-descenders',
		label: 'Descenders (g p q y)',
		codepoints: [0x0067, 0x0070, 0x0071, 0x0079],
		checks: ['baseline']
	},
	{
		id: 'figures',
		label: 'Figures 0–9 (tabular consistency)',
		codepoints: [
			0x0030, 0x0031, 0x0032, 0x0033, 0x0034, 0x0035, 0x0036, 0x0037, 0x0038, 0x0039
		],
		checks: ['advance', 'capTop', 'baseline']
	}
];

/**
 * Minimum threshold for a check to be considered an outlier, regardless of the
 * group's standard deviation. Prevents micro-deviations on uniform groups from
 * generating noise, while still flagging cases where every value happens to be
 * near-identical except one.
 */
const minThresholdForCheck = (check: PeerCheck, upm: number): number => {
	// Scale thresholds with UPM so a 1000-UPM font and a 2048-UPM font behave
	// similarly. Numbers below are calibrated for 1000 UPM.
	const k = upm / 1000;
	switch (check) {
		case 'advance':
			return 5 * k;
		case 'capTop':
		case 'xHeight':
		case 'baseline':
			return 6 * k; // ~one overshoot unit
		case 'sidebearings':
			return 8 * k;
		case 'bboxHeight':
			return 6 * k;
	}
};

const dimensionForCheck = (g: Glyph, check: PeerCheck): number | null => {
	if (check === 'advance') return g.advanceWidth;
	if (check === 'sidebearings') return (g.leftSidebearing + g.rightSidebearing) / 2;
	if (g.contours.length === 0) return null;
	const b = glyphBounds(g.contours);
	if (check === 'capTop' || check === 'xHeight') return b.maxY;
	if (check === 'baseline') return b.minY;
	if (check === 'bboxHeight') return b.maxY - b.minY;
	return null;
};

const checkLabel = (check: PeerCheck): string => {
	switch (check) {
		case 'advance':
			return 'advance width';
		case 'capTop':
			return 'top';
		case 'xHeight':
			return 'top';
		case 'baseline':
			return 'baseline reach';
		case 'sidebearings':
			return 'sidebearings (mean)';
		case 'bboxHeight':
			return 'bbox height';
	}
};

/**
 * Run peer audit across every PEER_GROUP. Returns standard AuditIssue records
 * so the existing audit pipeline (preflightProject, audit page UI) can consume
 * them without further changes.
 */
export const auditPeers = (project: Project): AuditIssue[] => {
	const issues: AuditIssue[] = [];
	const upm = project.metrics.unitsPerEm;

	for (const group of PEER_GROUPS) {
		const items: Array<{ cp: number; g: Glyph }> = [];
		for (const cp of group.codepoints) {
			const g = project.glyphs[cp];
			if (g && g.contours.length > 0) items.push({ cp, g });
		}
		// Need at least 3 drawn members for a meaningful mean/std
		if (items.length < 3) continue;

		for (const check of group.checks) {
			const values: Array<{ cp: number; val: number }> = [];
			for (const item of items) {
				const v = dimensionForCheck(item.g, check);
				if (v !== null && Number.isFinite(v)) values.push({ cp: item.cp, val: v });
			}
			if (values.length < 3) continue;

			const mean = values.reduce((s, x) => s + x.val, 0) / values.length;
			const variance =
				values.reduce((s, x) => s + (x.val - mean) ** 2, 0) / values.length;
			const std = Math.sqrt(variance);
			// Threshold: 2σ OR the calibrated minimum, whichever is larger.
			const threshold = Math.max(std * 2, minThresholdForCheck(check, upm));

			for (const item of values) {
				const deviation = item.val - mean;
				const absDev = Math.abs(deviation);
				if (absDev <= threshold) continue;
				const direction = deviation > 0 ? '+' : '';
				const severity: AuditIssue['severity'] = absDev > threshold * 2 ? 'warn' : 'info';
				const name = project.glyphs[item.cp]?.name ?? '?';
				const char =
					item.cp > 0x20 && item.cp < 0x10000
						? `"${String.fromCodePoint(item.cp)}" `
						: '';
				issues.push({
					codepoint: item.cp,
					severity,
					code: `peer-${group.id}-${check}`,
					message: `${char}${name}: ${checkLabel(check)} ${Math.round(item.val)} drifts ${direction}${Math.round(deviation)}u from ${group.label} mean ${Math.round(mean)} (σ${Math.round(std)}, ${values.length} peers).`
				});
			}
		}
	}

	return issues;
};
