/**
 * Per-glyph and per-project lint checks. Returns a list of issues with severity
 * so the UI can surface them in the editor and on export.
 */

import type { Glyph, Project } from './types';
import { resolveVerticalMetrics } from './types';
import { glyphBounds } from './path';

export type AuditSeverity = 'info' | 'warn' | 'error';

export type AuditIssue = {
	codepoint: number;
	severity: AuditSeverity;
	code: string;
	message: string;
};

export const auditGlyph = (glyph: Glyph, project: Project): AuditIssue[] => {
	const issues: AuditIssue[] = [];
	const cp = glyph.codepoint;

	const drawn = glyph.contours.length > 0;
	const composite = !!(glyph.components && glyph.components.length > 0);

	// Empty glyph that's not space and isn't a composite: warn
	if (!drawn && !composite && cp !== 0x20) {
		issues.push({
			codepoint: cp,
			severity: 'info',
			code: 'empty',
			message: 'No outlines yet'
		});
	}

	if (drawn) {
		const b = glyphBounds(glyph.contours);
		// bbox out of bounds top
		if (b.maxY > project.metrics.ascender + 50) {
			issues.push({
				codepoint: cp,
				severity: 'warn',
				code: 'extends-above-ascender',
				message: `Top of glyph (${Math.round(b.maxY)}) is above ascender (${project.metrics.ascender})`
			});
		}
		if (b.minY < project.metrics.descender - 50) {
			issues.push({
				codepoint: cp,
				severity: 'warn',
				code: 'extends-below-descender',
				message: `Bottom of glyph (${Math.round(b.minY)}) is below descender (${project.metrics.descender})`
			});
		}
		// Advance width zero or smaller than bbox
		if (glyph.advanceWidth <= 0) {
			issues.push({
				codepoint: cp,
				severity: 'error',
				code: 'zero-advance',
				message: 'Advance width is 0'
			});
		} else if (b.maxX > glyph.advanceWidth + 5) {
			issues.push({
				codepoint: cp,
				severity: 'warn',
				code: 'overflows-advance',
				message: `Glyph extends past advance width (${Math.round(b.maxX)} vs ${glyph.advanceWidth})`
			});
		}
		// Open contours
		const openContours = glyph.contours.filter((c) => !c.closed);
		if (openContours.length > 0) {
			issues.push({
				codepoint: cp,
				severity: 'error',
				code: 'open-contour',
				message: `${openContours.length} open contour${openContours.length === 1 ? '' : 's'}`
			});
		}
	}

	// Composite references that point to empty base glyphs
	if (composite) {
		for (const ref of glyph.components ?? []) {
			const base = project.glyphs[ref.baseCodepoint];
			if (!base || (base.contours.length === 0 && (!base.components || base.components.length === 0))) {
				issues.push({
					codepoint: cp,
					severity: 'warn',
					code: 'composite-missing-base',
					message: `References U+${ref.baseCodepoint.toString(16).toUpperCase().padStart(4, '0')} which has no outlines`
				});
			}
		}
	}

	return issues;
};

export const auditProject = (project: Project): AuditIssue[] => {
	const out: AuditIssue[] = [];
	for (const g of Object.values(project.glyphs)) {
		out.push(...auditGlyph(g, project));
	}
	return out;
};

/**
 * Per-glyph contour + point-count compatibility across all masters.
 * Variable-font interpolation requires every master to match exactly.
 */
export const auditCompatibility = (project: Project): AuditIssue[] => {
	if (!project.masters || project.masters.length === 0) return [];
	const issues: AuditIssue[] = [];
	const masters = [
		{ name: 'Default', glyphs: project.glyphs },
		...project.masters.map((m) => ({ name: m.name, glyphs: m.glyphs }))
	];
	const codepoints = new Set<number>();
	for (const m of masters) for (const cp of Object.keys(m.glyphs)) codepoints.add(Number(cp));
	for (const cp of codepoints) {
		const variants = masters.map((m) => ({ name: m.name, glyph: m.glyphs[cp] }));
		const drawn = variants.filter((v) => v.glyph?.contours && v.glyph.contours.length > 0);
		if (drawn.length === 0) continue;
		// Contour count check
		const counts = drawn.map((d) => d.glyph!.contours.length);
		if (new Set(counts).size > 1) {
			issues.push({
				codepoint: cp,
				severity: 'error',
				code: 'master-contour-count',
				message: `U+${cp.toString(16).toUpperCase().padStart(4, '0')}: contour count differs across masters (${counts.join(' / ')})`
			});
			continue;
		}
		// Per-contour command count check
		for (let ci = 0; ci < counts[0]; ci++) {
			const pointCounts = drawn.map((d) => d.glyph!.contours[ci]?.commands.length ?? 0);
			if (new Set(pointCounts).size > 1) {
				issues.push({
					codepoint: cp,
					severity: 'error',
					code: 'master-point-count',
					message: `U+${cp.toString(16).toUpperCase().padStart(4, '0')} contour ${ci}: point count differs across masters (${pointCounts.join(' / ')})`
				});
			}
		}
	}
	return issues;
};

/**
 * Project-level pre-flight checks aligned with FontBakery's check-universal
 * and Google Fonts' naming/metrics guidance. Run before export.
 */
export const preflightProject = (project: Project): AuditIssue[] => {
	const issues: AuditIssue[] = [];

	// Naming
	if (!project.metadata.familyName.trim())
		issues.push({ codepoint: 0, severity: 'error', code: 'naming-family', message: 'Family name is empty' });
	if (!project.metadata.styleName.trim())
		issues.push({ codepoint: 0, severity: 'error', code: 'naming-style', message: 'Style name is empty' });
	if (!project.metadata.version.trim())
		issues.push({ codepoint: 0, severity: 'warn', code: 'naming-version', message: 'Version is empty (defaulting to 1.000)' });
	if (project.metadata.familyName.length > 31)
		issues.push({ codepoint: 0, severity: 'warn', code: 'naming-family-long', message: 'Family name longer than 31 characters may break legacy app menus' });
	if (/[^A-Za-z0-9 -]/.test(project.metadata.familyName))
		issues.push({ codepoint: 0, severity: 'warn', code: 'naming-family-chars', message: 'Family name contains special characters — some apps reject anything beyond letters/digits/space' });

	// Vertical metrics consistency (Google Fonts: hhea should match typo)
	const vm = resolveVerticalMetrics(project.metrics);
	if (vm.typoAscender !== vm.hheaAscender)
		issues.push({ codepoint: 0, severity: 'warn', code: 'metrics-asc-mismatch', message: `OS/2 typoAscender (${vm.typoAscender}) does not match hhea ascender (${vm.hheaAscender})` });
	if (vm.typoDescender !== vm.hheaDescender)
		issues.push({ codepoint: 0, severity: 'warn', code: 'metrics-desc-mismatch', message: `OS/2 typoDescender (${vm.typoDescender}) does not match hhea descender (${vm.hheaDescender})` });
	if (vm.typoLineGap !== vm.hheaLineGap)
		issues.push({ codepoint: 0, severity: 'warn', code: 'metrics-gap-mismatch', message: `OS/2 typoLineGap (${vm.typoLineGap}) does not match hhea lineGap (${vm.hheaLineGap})` });
	if (!vm.useTypoMetrics)
		issues.push({ codepoint: 0, severity: 'warn', code: 'metrics-use-typo-off', message: 'USE_TYPO_METRICS flag is off — line spacing will vary across platforms' });
	if (vm.winAscent < vm.typoAscender)
		issues.push({ codepoint: 0, severity: 'warn', code: 'metrics-win-clip-top', message: `winAscent (${vm.winAscent}) is below typoAscender — glyphs may clip on Windows` });
	if (vm.winDescent < Math.abs(vm.typoDescender))
		issues.push({ codepoint: 0, severity: 'warn', code: 'metrics-win-clip-bottom', message: `winDescent (${vm.winDescent}) is below |typoDescender| — descenders may clip on Windows` });

	// UPM sanity
	if (project.metrics.unitsPerEm < 1000 || project.metrics.unitsPerEm > 16384)
		issues.push({ codepoint: 0, severity: 'warn', code: 'upm-unusual', message: `UPM ${project.metrics.unitsPerEm} is outside the typical 1000–2048 range` });

	// Control-glyph coverage
	const controlGlyphs = [0x004e, 0x004f, 0x006e, 0x006f, 0x0048, 0x0061, 0x0065, 0x0073, 0x0063, 0x0070, 0x0076, 0x0079];
	const missingControl = controlGlyphs.filter(
		(cp) => (project.glyphs[cp]?.contours.length ?? 0) === 0
	);
	if (missingControl.length > 0) {
		const labels = missingControl.map((cp) => String.fromCodePoint(cp)).join(' ');
		issues.push({
			codepoint: 0,
			severity: 'info',
			code: 'control-glyphs-missing',
			message: `Control set incomplete (${missingControl.length}/12): ${labels} — these set proportion + texture for the whole family`
		});
	}

	// Anchor coverage on composite bases
	let anchorless = 0;
	for (const g of Object.values(project.glyphs)) {
		if (g.contours.length > 0 && (g.codepoint >= 0x0041 && g.codepoint <= 0x007a)) {
			const anchors = g.anchors ?? [];
			if (anchors.length === 0) anchorless++;
		}
	}
	if (anchorless > 0)
		issues.push({
			codepoint: 0,
			severity: 'info',
			code: 'anchors-missing',
			message: `${anchorless} Latin base glyphs have no anchors — composites with marks will use fixed offsets instead of proper positioning`
		});

	// Glyph count vs declared character set
	const drawn = Object.values(project.glyphs).filter((g) => g.contours.length > 0).length;
	if (drawn < 26)
		issues.push({
			codepoint: 0,
			severity: 'info',
			code: 'glyph-count-low',
			message: `Only ${drawn} glyphs drawn — most apps expect at least full A–Z + a–z + 0–9 + punctuation (~95 glyphs) for a usable font`
		});

	// Master compatibility (only matters for VF projects)
	if ((project.masters?.length ?? 0) > 0) {
		const compatIssues = auditCompatibility(project);
		issues.push(...compatIssues);
	}

	// Variable-font specific
	if ((project.axes?.length ?? 0) > 0) {
		// Every axis should be in standard ranges where applicable
		for (const a of project.axes ?? []) {
			if (a.minimum > a.default || a.default > a.maximum) {
				issues.push({
					codepoint: 0,
					severity: 'error',
					code: 'axis-range-invalid',
					message: `Axis '${a.tag}' has min/default/max out of order (${a.minimum} / ${a.default} / ${a.maximum})`
				});
			}
		}
		// Each master location should be within all axis ranges
		for (const m of project.masters ?? []) {
			for (const [tag, val] of Object.entries(m.location)) {
				const axis = (project.axes ?? []).find((a) => a.tag === tag);
				if (!axis) {
					issues.push({
						codepoint: 0,
						severity: 'warn',
						code: 'master-orphan-axis',
						message: `Master '${m.name}' references undefined axis '${tag}'`
					});
				} else if (val < axis.minimum || val > axis.maximum) {
					issues.push({
						codepoint: 0,
						severity: 'warn',
						code: 'master-out-of-range',
						message: `Master '${m.name}' value ${val} for '${tag}' is outside axis range ${axis.minimum}..${axis.maximum}`
					});
				}
			}
		}
		// Instances should match axis tags too
		for (const inst of project.instances ?? []) {
			for (const tag of Object.keys(inst.location)) {
				if (!(project.axes ?? []).some((a) => a.tag === tag)) {
					issues.push({
						codepoint: 0,
						severity: 'warn',
						code: 'instance-orphan-axis',
						message: `Instance '${inst.styleName}' references undefined axis '${tag}'`
					});
				}
			}
		}
		// No instances at all in a VF project is a soft warn
		if ((project.instances?.length ?? 0) === 0) {
			issues.push({
				codepoint: 0,
				severity: 'info',
				code: 'no-instances',
				message:
					'Variable font has no named instances — OS font menus may only show "Regular". Add at least Regular + Bold on the Designspace tab.'
			});
		}
	}

	// Kerning class sanity
	for (const cls of project.classes ?? []) {
		if (!cls.name.startsWith('@')) {
			issues.push({
				codepoint: 0,
				severity: 'warn',
				code: 'class-name-format',
				message: `Kerning class '${cls.name}' should start with '@'`
			});
		}
		if (cls.members.length === 0) {
			issues.push({
				codepoint: 0,
				severity: 'info',
				code: 'class-empty',
				message: `Kerning class '${cls.name}' has no members`
			});
		}
		// Each member must resolve to a project glyph
		for (const cp of cls.members) {
			if (!project.glyphs[cp]) {
				issues.push({
					codepoint: cp,
					severity: 'warn',
					code: 'class-missing-member',
					message: `Kerning class '${cls.name}' references missing glyph U+${cp.toString(16).toUpperCase().padStart(4, '0')}`
				});
				break;
			}
		}
	}

	// Kerning pair references should resolve
	const classNames = new Set((project.classes ?? []).map((c) => c.name));
	for (const pair of project.kerning) {
		for (const side of [pair.left, pair.right]) {
			if (typeof side === 'string') {
				if (!classNames.has(side)) {
					issues.push({
						codepoint: 0,
						severity: 'warn',
						code: 'pair-orphan-class',
						message: `Kerning pair references undefined class '${side}'`
					});
				}
			} else if (!project.glyphs[side]) {
				issues.push({
					codepoint: side,
					severity: 'warn',
					code: 'pair-missing-glyph',
					message: `Kerning pair references missing glyph U+${side.toString(16).toUpperCase().padStart(4, '0')}`
				});
			}
		}
	}

	return sortBySeverity(issues);
};

export const SEVERITY_ORDER: Record<AuditSeverity, number> = {
	error: 0,
	warn: 1,
	info: 2
};

export const sortBySeverity = (issues: AuditIssue[]): AuditIssue[] =>
	[...issues].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
