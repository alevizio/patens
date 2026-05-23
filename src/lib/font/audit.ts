/**
 * Per-glyph and per-project lint checks. Returns a list of issues with severity
 * so the UI can surface them in the editor and on export.
 */

import type { Glyph, Project } from './types';
import { resolveVerticalMetrics } from './types';
import { glyphBounds, signedArea, sampleContour } from './path';
import { auditPeers } from './peer-audit';

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

		// Quality checks (M2 audit expansion) — these catch drawing
		// artefacts that ship through the basic-bounds + open-contour pass:
		// duplicate points (vestigial node from an abandoned edit),
		// off-grid coordinates (rendered fuzzy at small sizes), tiny
		// contours (artefact dot left from a Boolean op).
		let offGridCount = 0;
		let dupCount = 0;
		for (const c of glyph.contours) {
			let prevX: number | null = null;
			let prevY: number | null = null;
			for (const cmd of c.commands) {
				if (cmd.type === 'Z') {
					prevX = null;
					prevY = null;
					continue;
				}
				const x = cmd.x;
				const y = cmd.y;
				if (!Number.isInteger(x) || !Number.isInteger(y)) offGridCount++;
				if (
					prevX !== null &&
					prevY !== null &&
					cmd.type !== 'M' &&
					Math.abs(x - prevX) < 0.5 &&
					Math.abs(y - prevY) < 0.5
				) {
					dupCount++;
				}
				prevX = x;
				prevY = y;
			}
		}
		if (offGridCount > 0) {
			issues.push({
				codepoint: cp,
				severity: 'info',
				code: 'off-grid-points',
				message: `${offGridCount} point${offGridCount === 1 ? '' : 's'} on fractional coordinates`
			});
		}
		if (dupCount > 0) {
			issues.push({
				codepoint: cp,
				severity: 'warn',
				code: 'duplicate-points',
				message: `${dupCount} duplicate point${dupCount === 1 ? '' : 's'} (consecutive nodes within 0.5fu)`
			});
		}

		// Tiny contours: closed contour with bbox <8fu in BOTH axes is
		// almost always an artefact dot left from a boolean operation.
		// 8fu is ~1% of em at 1000 UPM.
		for (let i = 0; i < glyph.contours.length; i++) {
			const c = glyph.contours[i];
			if (!c.closed) continue;
			const cb = glyphBounds([c]);
			const w = cb.maxX - cb.minX;
			const h = cb.maxY - cb.minY;
			if (w < 8 && h < 8) {
				issues.push({
					codepoint: cp,
					severity: 'warn',
					code: 'tiny-contour',
					message: `Contour ${i + 1} is ${Math.round(w)}×${Math.round(h)} — likely a stray artefact`
				});
				break;
			}
		}

		// Near-collinear points: three consecutive on-curve points where
		// the middle one is within 1fu of the line between the outer
		// two. Removing the middle point simplifies the outline without
		// changing its visible shape — these are vestiges of editing
		// that bloat the contour and confuse rasterisers. Only
		// considers L (lineTo) commands — curves with collinear control
		// points are a different story (intentional flat segments).
		let nearCollinearCount = 0;
		for (const c of glyph.contours) {
			const pts: Array<{ x: number; y: number }> = [];
			for (const cmd of c.commands) {
				if (cmd.type === 'M' || cmd.type === 'L') pts.push({ x: cmd.x, y: cmd.y });
				// Curves break the L→L→L sequence we're checking for
				if (cmd.type === 'C' || cmd.type === 'Q') pts.length = 0;
			}
			for (let i = 1; i < pts.length - 1; i++) {
				const a = pts[i - 1];
				const b = pts[i];
				const d = pts[i + 1];
				// Distance from point b to line a→d
				const num = Math.abs((d.y - a.y) * b.x - (d.x - a.x) * b.y + d.x * a.y - d.y * a.x);
				const den = Math.hypot(d.x - a.x, d.y - a.y);
				if (den < 0.001) continue;
				const distToLine = num / den;
				if (distToLine < 1) nearCollinearCount++;
			}
		}
		if (nearCollinearCount > 0) {
			issues.push({
				codepoint: cp,
				severity: 'info',
				code: 'near-collinear-points',
				message: `${nearCollinearCount} point${nearCollinearCount === 1 ? '' : 's'} within 1fu of the line between neighbours — safe to remove`
			});
		}

		// Sharp-angle kinks: a tight angle between adjacent line segments
		// where the designer probably intended either a smooth curve or a
		// proper corner. Threshold: turn-angle between 5° and 25° from
		// straight. Very small turns (<5°) read as "almost straight,
		// you might want truly straight" — caught by near-collinear above.
		// Larger turns (>25°) read as deliberate corners and are fine.
		let kinkCount = 0;
		for (const c of glyph.contours) {
			const pts: Array<{ x: number; y: number }> = [];
			for (const cmd of c.commands) {
				if (cmd.type === 'M' || cmd.type === 'L') pts.push({ x: cmd.x, y: cmd.y });
				if (cmd.type === 'C' || cmd.type === 'Q') pts.length = 0;
			}
			for (let i = 1; i < pts.length - 1; i++) {
				const a = pts[i - 1];
				const b = pts[i];
				const d = pts[i + 1];
				// Incoming + outgoing direction vectors
				const ix = b.x - a.x;
				const iy = b.y - a.y;
				const ox = d.x - b.x;
				const oy = d.y - b.y;
				const il = Math.hypot(ix, iy);
				const ol = Math.hypot(ox, oy);
				if (il < 1 || ol < 1) continue; // segments too short to judge
				// cos(turn angle) — 1 = perfectly straight, -1 = doubled back
				const cosT = (ix * ox + iy * oy) / (il * ol);
				if (cosT >= 1) continue;
				const turnDeg = (Math.acos(Math.max(-1, Math.min(1, cosT))) * 180) / Math.PI;
				if (turnDeg >= 5 && turnDeg <= 25) kinkCount++;
			}
		}
		if (kinkCount > 0) {
			issues.push({
				codepoint: cp,
				severity: 'info',
				code: 'sharp-kink',
				message: `${kinkCount} sharp-but-not-quite-corner${kinkCount === 1 ? '' : 's'} (5–25° turn) — likely intended as a curve or a sharper corner`
			});
		}

		// Self-intersecting contours: a contour whose own line segments
		// cross each other. Common from boolean op artefacts or rough
		// edits. Rasterisers handle these via fill-rule (non-zero /
		// even-odd) but the rendered shape is rarely what the designer
		// intended. O(n²) segment-segment intersection per contour;
		// fine at typical glyph point counts (<200 per contour).
		let selfIntCount = 0;
		for (const c of glyph.contours) {
			const segs: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
			let lastX: number | null = null;
			let lastY: number | null = null;
			let startX: number | null = null;
			let startY: number | null = null;
			for (const cmd of c.commands) {
				if (cmd.type === 'M') {
					lastX = cmd.x;
					lastY = cmd.y;
					startX = cmd.x;
					startY = cmd.y;
					continue;
				}
				if (cmd.type === 'Z') {
					if (lastX !== null && lastY !== null && startX !== null && startY !== null) {
						segs.push({ x1: lastX, y1: lastY, x2: startX, y2: startY });
					}
					lastX = startX;
					lastY = startY;
					continue;
				}
				if (lastX === null || lastY === null) continue;
				segs.push({ x1: lastX, y1: lastY, x2: cmd.x, y2: cmd.y });
				lastX = cmd.x;
				lastY = cmd.y;
			}
			// Test each pair of non-adjacent segments for proper intersection.
			for (let i = 0; i < segs.length; i++) {
				for (let j = i + 2; j < segs.length; j++) {
					// Adjacent segments share an endpoint — skip them; also
					// skip the wraparound (last + first) for closed contours.
					if (i === 0 && j === segs.length - 1) continue;
					if (segmentsCross(segs[i], segs[j])) {
						selfIntCount++;
					}
				}
			}
		}
		if (selfIntCount > 0) {
			issues.push({
				codepoint: cp,
				severity: 'warn',
				code: 'self-intersecting',
				message: `Contour crosses itself in ${selfIntCount} place${selfIntCount === 1 ? '' : 's'} — rasterisers fill unpredictably`
			});
		}

		// Nested-contour winding: an outer contour that contains another
		// should have opposite winding to its interior (the classic donut /
		// counter). If both have the same direction, the rasteriser will
		// fill the counter solid — the most common cause of "my O looks
		// like a solid disc" or "my a's bowl has no hole." We only audit
		// nested pairs (genuine outer-counter relationships); two
		// side-by-side contours with the same winding is correct.
		if (glyph.contours.length > 1) {
			const sampled: Array<{ pts: { x: number; y: number }[]; area: number }> = glyph.contours.map(
				(c) => ({
					pts: sampleContour(c.commands, 12),
					area: signedArea(c.commands)
				})
			);
			// Ray-casting point-in-polygon test.
			const contains = (poly: { x: number; y: number }[], px: number, py: number): boolean => {
				let inside = false;
				for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
					const xi = poly[i].x,
						yi = poly[i].y;
					const xj = poly[j].x,
						yj = poly[j].y;
					if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi) {
						inside = !inside;
					}
				}
				return inside;
			};
			let badNestCount = 0;
			for (let i = 0; i < sampled.length; i++) {
				if (sampled[i].pts.length === 0) continue;
				const probe = sampled[i].pts[0];
				let depth = 0;
				let directParent = -1;
				for (let j = 0; j < sampled.length; j++) {
					if (j === i || sampled[j].pts.length === 0) continue;
					if (contains(sampled[j].pts, probe.x, probe.y)) {
						depth++;
						directParent = j;
					}
				}
				if (directParent !== -1) {
					// signedArea positive = CCW, negative = CW. Nested
					// contours must alternate signs.
					const aSign = Math.sign(sampled[i].area);
					const pSign = Math.sign(sampled[directParent].area);
					if (aSign !== 0 && pSign !== 0 && aSign === pSign) {
						badNestCount++;
					}
				}
			}
			if (badNestCount > 0) {
				issues.push({
					codepoint: cp,
					severity: 'warn',
					code: 'contour-winding-collision',
					message: `${badNestCount} nested contour${badNestCount === 1 ? '' : 's'} share winding with the enclosing outer — counters will fill solid`
				});
			}
		}
	}

	// Anchor naming convention — used by the GPOS mark feature pipeline.
	// Marks live in U+0300–U+036F and carry anchors prefixed with '_'
	// (e.g. `_top`); base glyphs carry the same name without the underscore
	// (`top`). A mismatch on either side means the GPOS pair won't form and
	// the anchor effectively does nothing at export.
	if (glyph.anchors && glyph.anchors.length > 0) {
		const isMark = cp >= 0x0300 && cp <= 0x036f;
		for (const a of glyph.anchors) {
			const hasUnderscorePrefix = a.name.startsWith('_');
			if (isMark && !hasUnderscorePrefix) {
				issues.push({
					codepoint: cp,
					severity: 'warn',
					code: 'anchor-naming-mark-no-prefix',
					message: `Mark glyph anchor "${a.name}" should start with '_' to participate in the mark feature`
				});
			} else if (!isMark && hasUnderscorePrefix) {
				issues.push({
					codepoint: cp,
					severity: 'warn',
					code: 'anchor-naming-base-with-prefix',
					message: `Base glyph anchor "${a.name}" should not start with '_' — only marks use that prefix`
				});
			}
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

	// Sidebearing-class drift (M2 audit). Sidebearing classes exist to
	// enforce LSB/RSB consistency across grouped glyphs (e.g. H I L all
	// share the same vertical-stem sidebearings). They drift silently
	// when individual glyphs get edited via the metrics inspector,
	// because the class itself doesn't auto-propagate edits — only the
	// explicit "Set values" action does. Flag the drift so the
	// designer can decide to re-apply the class values or remove the
	// glyph from the class.
	if (drawn) {
		for (const cls of project.sidebearingClasses ?? []) {
			if (!cls.members.includes(cp)) continue;
			const peers = cls.members
				.filter((m) => m !== cp)
				.map((m) => project.glyphs[m])
				.filter((g): g is Glyph => !!g && g.contours.length > 0);
			if (peers.length === 0) continue;
			const median = (arr: number[]) => {
				const s = [...arr].sort((a, b) => a - b);
				const mid = Math.floor(s.length / 2);
				return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
			};
			const peerLsb = median(peers.map((p) => p.leftSidebearing));
			const peerRsb = median(peers.map((p) => p.rightSidebearing));
			const lsbDelta = glyph.leftSidebearing - peerLsb;
			const rsbDelta = glyph.rightSidebearing - peerRsb;
			// 5fu tolerance — within a few units is normal manual nudging,
			// beyond that is real drift.
			if (Math.abs(lsbDelta) > 5) {
				issues.push({
					codepoint: cp,
					severity: 'info',
					code: 'sidebearing-class-drift-lsb',
					message: `LSB ${Math.round(glyph.leftSidebearing)} drifts from class "${cls.name}" median ${Math.round(peerLsb)} (${lsbDelta > 0 ? '+' : ''}${Math.round(lsbDelta)})`
				});
			}
			if (Math.abs(rsbDelta) > 5) {
				issues.push({
					codepoint: cp,
					severity: 'info',
					code: 'sidebearing-class-drift-rsb',
					message: `RSB ${Math.round(glyph.rightSidebearing)} drifts from class "${cls.name}" median ${Math.round(peerRsb)} (${rsbDelta > 0 ? '+' : ''}${Math.round(rsbDelta)})`
				});
			}
			break; // one class report per glyph is enough
		}
	}

	// Surface TODO / FIXME left in glyph notes — visible reminder pre-release
	if (glyph.notes && /(?:^|\W)(TODO|FIXME)\b/i.test(glyph.notes)) {
		issues.push({
			codepoint: cp,
			severity: 'info',
			code: 'notes-todo',
			message: 'Notes contain TODO/FIXME — open work item.'
		});
	}

	// Surface unaddressed review flags
	if (glyph.flagged) {
		issues.push({
			codepoint: cp,
			severity: 'info',
			code: 'flagged-for-review',
			message: 'Flagged for review — ⇧F to clear once addressed.'
		});
	}

	// Glyph name validation per Adobe glyph-list naming rules + OpenType
	// post table constraints: must start with letter or period, then
	// letters/digits/period/underscore/hyphen; max 63 chars; not reserved.
	const NAME_RE = /^[A-Za-z._][A-Za-z0-9._-]*$/;
	if (!glyph.name.trim()) {
		issues.push({
			codepoint: cp,
			severity: 'error',
			code: 'glyph-name-empty',
			message: 'Glyph name is empty'
		});
	} else if (!NAME_RE.test(glyph.name)) {
		issues.push({
			codepoint: cp,
			severity: 'warn',
			code: 'glyph-name-invalid',
			message: `Name "${glyph.name}" contains characters disallowed in OpenType post table (allowed: A-Z a-z 0-9 . _ -, must start with letter or .)`
		});
	} else if (glyph.name.length > 63) {
		issues.push({
			codepoint: cp,
			severity: 'warn',
			code: 'glyph-name-too-long',
			message: `Name "${glyph.name.slice(0, 30)}…" exceeds 63 chars (OpenType post table limit)`
		});
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

	// Coverage gaps in standard typographic / currency / math sets. Only check
	// once a font is past the "warming up" phase (≥ 26 drawn glyphs) so we
	// don't nag during early sketching. `drawn` is computed below; precompute
	// it here so the coverage block can gate on the count.
	const drawnPreCoverage = Object.values(project.glyphs).filter(
		(g) => g.contours.length > 0
	).length;
	if (drawnPreCoverage >= 26) {
		const COVERAGE_GROUPS = [
			{
				code: 'coverage-typo-essentials',
				label: 'Typographic essentials',
				rationale:
					'These are what separate a sketch from a usable text face: real curly quotes, real dashes, the ellipsis.',
				codepoints: [
					0x2018, // ‘ left single quote
					0x2019, // ’ right single quote / apostrophe
					0x201c, // “ left double quote
					0x201d, // ” right double quote
					0x2013, // – en-dash
					0x2014, // — em-dash
					0x2026, // … ellipsis
					0x2022 //  • bullet
				]
			},
			{
				code: 'coverage-currency',
				label: 'Currency baseline',
				rationale:
					'Even a Latin-only font is expected to support the major currency signs alongside the dollar.',
				codepoints: [
					0x0024, // $ dollar
					0x00a2, // ¢ cent
					0x00a3, // £ pound
					0x00a5, // ¥ yen
					0x20ac //  € euro
				]
			},
			{
				code: 'coverage-math',
				label: 'Math symbols',
				rationale:
					'Math glyphs (real minus, multiply, division) matter for any font used in technical / scientific text.',
				codepoints: [
					0x002b, // + plus
					0x2212, // − minus (real, not hyphen)
					0x00d7, // × multiplication
					0x00f7, // ÷ division
					0x003d, // = equals
					0x00b1, // ± plus-minus
					0x2264, // ≤ less-equal
					0x2265 //  ≥ greater-equal
				]
			},
			{
				code: 'coverage-latin-1-supp',
				label: 'Latin-1 Supplement accents',
				rationale:
					'Without these, German / French / Spanish / Portuguese / Italian users fall back to system defaults mid-paragraph.',
				codepoints: [
					0x00e0, // à
					0x00e1, // á
					0x00e2, // â
					0x00e4, // ä
					0x00e7, // ç
					0x00e8, // è
					0x00e9, // é
					0x00ea, // ê
					0x00ed, // í
					0x00f1, // ñ
					0x00f3, // ó
					0x00f6, // ö
					0x00fa, // ú
					0x00fc //  ü
				]
			}
		] as const;
		for (const group of COVERAGE_GROUPS) {
			const missing = group.codepoints.filter(
				(cp) => (project.glyphs[cp]?.contours.length ?? 0) === 0
			);
			if (missing.length > 0) {
				const total = group.codepoints.length;
				const drawn = total - missing.length;
				const labels = missing.map((cp) => String.fromCodePoint(cp)).join(' ');
				issues.push({
					codepoint: 0,
					severity: 'info',
					code: group.code,
					message: `${group.label}: ${drawn}/${total} drawn. Missing: ${labels} — ${group.rationale}`
				});
			}
		}
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

	// Tabular figures: warn when 0-9 have non-uniform advance widths
	const digits: number[] = [];
	for (let cp = 0x0030; cp <= 0x0039; cp++) {
		const g = project.glyphs[cp];
		if (g && g.contours.length > 0) digits.push(g.advanceWidth);
	}
	if (digits.length >= 2) {
		const min = Math.min(...digits);
		const max = Math.max(...digits);
		if (max - min > 2) {
			issues.push({
				codepoint: 0,
				severity: 'info',
				code: 'figures-non-tabular',
				message: `Digits 0–9 have varying advance widths (${min}–${max}) — proportional figures. For data tables, run "Tabularise 0–9" on the Spacing tab.`
			});
		}
	}

	// Glyph count vs declared character set
	const drawn = Object.values(project.glyphs).filter((g) => g.contours.length > 0).length;
	if (drawn < 26)
		issues.push({
			codepoint: 0,
			severity: 'info',
			code: 'glyph-count-low',
			message: `Only ${drawn} glyphs drawn — most apps expect at least full A–Z + a–z + 0–9 + punctuation (~95 glyphs) for a usable font`
		});

	// Brief discipline (font5.md: "type design is system design — define the
	// problem before drawing"). These are info-level nudges, not blockers.
	const brief = project.brief ?? {};
	if (!brief.intent?.trim() && drawn >= 12) {
		issues.push({
			codepoint: 0,
			severity: 'info',
			code: 'brief-no-intent',
			message:
				'No brief.intent set. Even one sentence about who this is for and at what size keeps later decisions honest.'
		});
	}
	if (!brief.designNotes?.trim() && drawn >= 50) {
		issues.push({
			codepoint: 0,
			severity: 'info',
			code: 'brief-no-design-notes',
			message:
				'No design-notes essay yet. Foundries that explain their decisions (KLIM, Hoefler, Commercial Type) get studied — write 2–3 paragraphs while the choices are still fresh.'
		});
	}

	// Kerning consolidation (font5.md hierarchy: sidebearings → classes → pairs)
	const kernCount = project.kerning.length;
	const classCount = project.classes?.length ?? 0;
	if (kernCount > 100 && classCount === 0) {
		issues.push({
			codepoint: 0,
			severity: 'info',
			code: 'kerning-no-classes',
			message: `${kernCount} flat kerning pairs and 0 kerning classes — consider grouping accented variants (e.g. @A_left = [A Á Â Ä À]) to consolidate and stay maintainable.`
		});
	}
	const sbClassCount = project.sidebearingClasses?.length ?? 0;
	if (drawn >= 26 && sbClassCount === 0) {
		issues.push({
			codepoint: 0,
			severity: 'info',
			code: 'sidebearings-no-classes',
			message:
				'No sidebearing classes yet. Grouping vertical stems / rounds / diagonals lets you tune spacing systematically before reaching for kerning pairs.'
		});
	}

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

	// Peer-consistency: flag glyphs whose dimensions drift unexpectedly far
	// from their structural peers (round caps, vertical-stem caps, ascenders,
	// descenders, lower-rounds, lower-stems, figures). Catches slip-of-the-pen
	// drift that a designer working alone commonly misses.
	issues.push(...auditPeers(project));

	// Release-readiness metadata. These are the "professional polish" name-table
	// + OS/2 fields. Empty fields produce nameless OTF/TTF binaries that look
	// amateur in Font Book / Glyphs / OS font menus. All warns (not errors) —
	// the font still compiles, it just won't pass FontBakery review or look
	// foundry-grade to downstream users.
	const md = project.metadata;
	const ver = md.version?.trim();
	if (!md.designer?.trim()) {
		issues.push({
			codepoint: 0,
			severity: 'warn',
			code: 'meta-no-designer',
			message: 'Designer field is empty — name table ID 9 ships blank. Glyphs / Font Book show "Unknown designer".'
		});
	}
	if (!md.copyright?.trim()) {
		issues.push({
			codepoint: 0,
			severity: 'warn',
			code: 'meta-no-copyright',
			message: 'Copyright notice is empty — required by most foundries and by Google Fonts review.'
		});
	}
	if (!md.license?.trim()) {
		issues.push({
			codepoint: 0,
			severity: 'warn',
			code: 'meta-no-license',
			message: 'License field is empty. Pick a preset (OFL 1.1, Proprietary) on the Export tab so downstream users know the terms.'
		});
	}
	if (!md.licenseURL?.trim() && md.license?.trim()) {
		issues.push({
			codepoint: 0,
			severity: 'info',
			code: 'meta-no-license-url',
			message: 'License set but no license URL — recommended so embedded apps can link out (e.g. https://scripts.sil.org/OFL for OFL).'
		});
	}
	if (!md.designerURL?.trim() && md.designer?.trim()) {
		issues.push({
			codepoint: 0,
			severity: 'info',
			code: 'meta-no-designer-url',
			message: 'Designer URL is empty. A homepage / portfolio link gets shown in some font dialogs and PDF metadata.'
		});
	}
	if (!md.manufacturer?.trim() && md.designer?.trim()) {
		// We fall back to designer if blank, so this is just info-level.
		issues.push({
			codepoint: 0,
			severity: 'info',
			code: 'meta-no-manufacturer',
			message: 'Manufacturer (foundry) is empty — falling back to designer name. If you ship under a foundry brand, set it explicitly.'
		});
	}
	if (!md.vendorID?.trim()) {
		issues.push({
			codepoint: 0,
			severity: 'info',
			code: 'meta-no-vendor-id',
			message: 'OS/2 vendor ID is empty — defaults to "NONE". Register a 4-letter foundry tag at https://learn.microsoft.com/typography/vendors/ to identify your fonts in tool diagnostics.'
		});
	} else if (!/^[\x20-\x7e]{1,4}$/.test(md.vendorID.trim())) {
		issues.push({
			codepoint: 0,
			severity: 'warn',
			code: 'meta-vendor-id-invalid',
			message: `Vendor ID "${md.vendorID}" should be 1-4 ASCII characters (will be padded with spaces). Microsoft's registry uses 4-letter all-caps tags.`
		});
	}
	if (ver && !/^\d+\.\d{2,3}$/.test(ver)) {
		issues.push({
			codepoint: 0,
			severity: 'info',
			code: 'meta-version-format',
			message: `Version "${ver}" doesn't match the OpenType "MAJOR.MINOR" convention (e.g. "1.000", "2.345"). Some tools parse the string into the head.fontRevision field and round.`
		});
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

/**
 * Plain-English description of each audit code — what it means and why it
 * matters. Surfaced as tooltips and help text in the audit UI so designers
 * learning the craft don't need an external reference.
 *
 * Returns undefined for codes without a curated description (newly added,
 * external, or codes whose `message` field is already self-explanatory).
 */
export const describeAuditCode = (code: string): string | undefined => {
	const descriptions: Record<string, string> = {
		// Contour shape
		'empty':
			'Glyph has no outlines yet. Draw at least one contour (or set components) before export.',
		'off-grid-points':
			'Point coordinates are fractional. Most renderers round to integer font units anyway — snapping explicitly avoids subpixel surprises.',
		'duplicate-points':
			'Two consecutive on-curve points sit within 0.5fu of each other — the second adds no information and may cause hinting noise.',
		'self-intersecting':
			'A contour crosses itself. Rasterisers fill the overlap unpredictably depending on fill-rule (even-odd vs non-zero).',
		'contour-winding-collision':
			'A nested counter shares its outer contour\'s direction. Inner contours must run opposite for the counter to render as a hole.',
		'near-collinear-points':
			'A point sits within 1fu of the line between its neighbours — a vestigial node, safe to remove.',
		'sharp-kink':
			'A 5–25° turn between line segments. Probably meant to be a smooth curve or a clean corner.',
		'open-contour':
			'A contour lacks its closing Z command. Open paths still rasterise but break boolean ops and many shaping tools.',
		'tiny-contour':
			'A contour smaller than 8fu in both dimensions — usually a stray artefact from a boolean op or imported SVG.',
		// Spacing & metrics
		'zero-advance':
			'The glyph\'s advance width is 0. Text containing this glyph will have all following glyphs stacked at the same position.',
		'overflows-advance':
			'The drawn glyph extends past its advance width. Adjacent glyphs will overlap — bump the advance or pull the right edge in.',
		'extends-above-ascender':
			'The glyph\'s bbox extends above the OS/2 ascender. Some renderers will clip the top stroke.',
		'extends-below-descender':
			'The glyph\'s bbox extends below the OS/2 descender. Some renderers will clip the bottom stroke.',
		'sidebearing-class-drift-lsb':
			'This glyph\'s left sidebearing has drifted from the median of its sidebearing-class peers. Either re-apply the class or remove this glyph from it.',
		'sidebearing-class-drift-rsb':
			'This glyph\'s right sidebearing has drifted from the median of its sidebearing-class peers.',
		// Composites & references
		'composite-missing-base':
			'A composite reference points at a glyph with no outlines. The reference will render as nothing.',
		// Anchor naming
		'anchor-naming-mark-no-prefix':
			'GPOS mark-positioning convention: marks (combining diacritics) carry anchors prefixed with "_" so they pair up with same-named base anchors. Without the prefix, this anchor never enters the mark feature.',
		'anchor-naming-base-with-prefix':
			'Base-glyph anchors should not start with "_" — that prefix is reserved for mark glyphs. Rename or the GPOS mark feature will miss this attachment point.',
		// Variable-font compatibility
		'master-contour-count':
			'The number of contours differs across masters. VF interpolation requires identical contour count and order in every master.',
		'master-point-count':
			'A specific contour has different point counts across masters. Same constraint as master-contour-count, one level deeper.',
		// Notes / flags / naming
		'notes-todo':
			'The glyph\'s notes field contains TODO or FIXME — an unresolved work item the designer left for future iteration.',
		'flagged-for-review':
			'A designer hit Shift+F on this glyph to mark it for follow-up review.',
		'glyph-name-empty':
			'Glyph name field is empty. PostScript glyph names are required for OpenType feature substitutions.',
		'glyph-name-invalid':
			'Glyph name contains characters outside the allowed set (A-Za-z0-9._-) or starts with a digit. The PostScript spec forbids it.',
		'glyph-name-too-long':
			'Glyph name exceeds 63 characters. The OpenType post-table v2 spec caps it there.'
	};
	return descriptions[code];
};

/**
 * Proper segment intersection test using the orientation method.
 * Returns true when two segments cross each other STRICTLY in
 * their interiors (excludes the case where they merely touch at
 * an endpoint — that's a legitimate shared corner).
 */
const orient = (
	a: { x: number; y: number },
	b: { x: number; y: number },
	c: { x: number; y: number }
): number => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

const segmentsCross = (
	s1: { x1: number; y1: number; x2: number; y2: number },
	s2: { x1: number; y1: number; x2: number; y2: number }
): boolean => {
	const a = { x: s1.x1, y: s1.y1 };
	const b = { x: s1.x2, y: s1.y2 };
	const c = { x: s2.x1, y: s2.y1 };
	const d = { x: s2.x2, y: s2.y2 };
	const o1 = orient(a, b, c);
	const o2 = orient(a, b, d);
	const o3 = orient(c, d, a);
	const o4 = orient(c, d, b);
	// Strict crossing — all four orientations non-zero with opposite signs
	// pairwise. The endpoint-touch case (o == 0 for any one) is excluded.
	return o1 * o2 < 0 && o3 * o4 < 0;
};
