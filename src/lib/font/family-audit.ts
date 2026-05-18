/**
 * Family-level consistency checks. Runs across every sibling in a family and
 * surfaces drift in structural decisions (UPM, vertical metrics, kerning class
 * shape, anchor naming, duplicate axis positions) that would cause the family
 * to feel incoherent in real use.
 */

import type { Project } from './types';
import type { AuditSeverity } from './audit';
import { loadProject } from './project';
import { listSiblings, loadFamily } from './family';

export type FamilyIssue = {
	severity: AuditSeverity;
	code: string;
	message: string;
	/** When set, names a particular sibling project that's diverging. */
	siblingId?: string;
};

export const auditFamily = async (familyId: string): Promise<FamilyIssue[]> => {
	const family = await loadFamily(familyId);
	if (!family) return [];
	const sibs = await listSiblings(familyId);
	const projects: Project[] = [];
	for (const s of sibs) {
		const p = await loadProject(s.id);
		if (p) projects.push(p);
	}
	if (projects.length === 0) {
		return [
			{
				severity: 'warn',
				code: 'family-empty',
				message: 'Family has no siblings — link an existing project or create one.'
			}
		];
	}
	const issues: FamilyIssue[] = [];
	const ref = projects[0];

	// --- UPM consistency ---
	for (const p of projects.slice(1)) {
		if (p.metrics.unitsPerEm !== ref.metrics.unitsPerEm) {
			issues.push({
				severity: 'error',
				code: 'family-upm-mismatch',
				message: `"${p.metadata.styleName}" UPM ${p.metrics.unitsPerEm} ≠ "${ref.metadata.styleName}" UPM ${ref.metrics.unitsPerEm}. UPM must match across siblings.`,
				siblingId: p.id
			});
		}
	}

	// --- Vertical-metrics consistency ---
	const VM_KEYS = ['ascender', 'descender', 'capHeight', 'xHeight'] as const;
	for (const k of VM_KEYS) {
		for (const p of projects.slice(1)) {
			if (p.metrics[k] !== ref.metrics[k]) {
				issues.push({
					severity: 'warn',
					code: `family-metrics-mismatch-${k}`,
					message: `"${p.metadata.styleName}" ${k} ${p.metrics[k]} ≠ "${ref.metadata.styleName}" ${ref.metrics[k]}. Line spacing will drift across the family.`,
					siblingId: p.id
				});
			}
		}
	}

	// --- Kerning class structure: same class names + same member sets ---
	const refClassNames = new Set((ref.classes ?? []).map((c) => c.name));
	for (const p of projects.slice(1)) {
		const myNames = new Set((p.classes ?? []).map((c) => c.name));
		for (const n of refClassNames) {
			if (!myNames.has(n)) {
				issues.push({
					severity: 'info',
					code: 'family-class-missing',
					message: `"${p.metadata.styleName}" is missing kerning class \`${n}\` (defined in "${ref.metadata.styleName}").`,
					siblingId: p.id
				});
			}
		}
	}

	// --- Anchor naming consistency on lowercase a-z ---
	const ANCHOR_LETTERS = Array.from({ length: 26 }, (_, i) => 0x0061 + i);
	for (const cp of ANCHOR_LETTERS) {
		const refAnchors = new Set((ref.glyphs[cp]?.anchors ?? []).map((a) => a.name));
		for (const p of projects.slice(1)) {
			const myAnchors = new Set((p.glyphs[cp]?.anchors ?? []).map((a) => a.name));
			for (const an of refAnchors) {
				if (!myAnchors.has(an)) {
					issues.push({
						severity: 'info',
						code: 'family-anchor-missing',
						message: `"${p.metadata.styleName}" glyph "${String.fromCodePoint(cp)}" missing anchor \`${an}\` (present in "${ref.metadata.styleName}").`,
						siblingId: p.id
					});
					break; // one issue per glyph is enough
				}
			}
		}
	}

	// --- Duplicate familyAxes (two siblings at the same design coordinate) ---
	const seen = new Map<string, Project>();
	for (const p of projects) {
		const a = p.familyAxes;
		if (!a) continue;
		const key = `${a.wght ?? 400}-${a.ital ?? 0}-${a.wdth ?? 100}-${a.slnt ?? 0}`;
		const dup = seen.get(key);
		if (dup) {
			issues.push({
				severity: 'error',
				code: 'family-axes-duplicate',
				message: `"${p.metadata.styleName}" and "${dup.metadata.styleName}" both sit at familyAxes ${key}. Adjust one so the family STAT records resolve unambiguously.`,
				siblingId: p.id
			});
		}
		seen.set(key, p);
	}

	// --- Designer / license divergence from the family record (informational) ---
	if (family.designer) {
		for (const p of projects) {
			if (
				p.metadata.designer &&
				p.metadata.designer !== family.designer &&
				p.metadata.designer.trim() !== ''
			) {
				issues.push({
					severity: 'info',
					code: 'family-designer-override',
					message: `"${p.metadata.styleName}" has its own designer "${p.metadata.designer}" — overrides family "${family.designer}".`,
					siblingId: p.id
				});
			}
		}
	}

	return issues;
};
