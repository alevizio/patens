/**
 * Per-glyph and per-project lint checks. Returns a list of issues with severity
 * so the UI can surface them in the editor and on export.
 */

import type { Glyph, Project } from './types';
import { resolveVerticalMetrics } from './types';
import { glyphBounds, signedArea, sampleContour } from './path';
import { auditPeers } from './peer-audit';
import { aglfnName } from './aglfn';

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
		// x-height / cap-height alignment — letters that should reach their
		// metric line. Tolerance: 15fu (about 1.5% UPM at 1000) — accounts
		// for optical overshoot on round letters without flagging everything.
		// X-HEIGHT lowercase (no ascender, no descender): a c e m n o r s u v w x z
		const XHT_LOWERS = new Set(['a', 'c', 'e', 'm', 'n', 'o', 'r', 's', 'u', 'v', 'w', 'x', 'z']);
		// CAP-HEIGHT uppercase: every Latin cap reaches cap-height except
		// none excluded (Q descends but still reaches the top). All A-Z.
		const ch = cp > 0x20 && cp < 0x80 ? String.fromCharCode(cp) : '';
		if (XHT_LOWERS.has(ch)) {
			const target = project.metrics.xHeight;
			const delta = Math.abs(b.maxY - target);
			// Allow modest overshoot upward; only flag when noticeably below.
			if (target > 0 && b.maxY < target - 15) {
				issues.push({
					codepoint: cp,
					severity: 'info',
					code: 'xheight-misaligned',
					message: `Top of '${ch}' (${Math.round(b.maxY)}) sits ${Math.round(delta)}fu below x-height (${target}) — text colour will look uneven`
				});
			}
		}
		if (ch >= 'A' && ch <= 'Z') {
			const target = project.metrics.capHeight;
			const delta = Math.abs(b.maxY - target);
			if (target > 0 && b.maxY < target - 15) {
				issues.push({
					codepoint: cp,
					severity: 'info',
					code: 'capheight-misaligned',
					message: `Top of '${ch}' (${Math.round(b.maxY)}) sits ${Math.round(delta)}fu below cap-height (${target}) — caps line will look uneven`
				});
			}
		}

		// Deeply-negative sidebearing — modest negative is intentional for
		// italics (top-right of f, V) but anything beyond -100 is almost
		// always accidental, often from a mass-spacing bug.
		if (glyph.leftSidebearing < -100) {
			issues.push({
				codepoint: cp,
				severity: 'info',
				code: 'sidebearing-deeply-negative-lsb',
				message: `LSB ${Math.round(glyph.leftSidebearing)} is unusually negative — check this isn't a spacing-pass bug`
			});
		}
		if (glyph.rightSidebearing < -100) {
			issues.push({
				codepoint: cp,
				severity: 'info',
				code: 'sidebearing-deeply-negative-rsb',
				message: `RSB ${Math.round(glyph.rightSidebearing)} is unusually negative — check this isn't a spacing-pass bug`
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
				let directParent = -1;
				for (let j = 0; j < sampled.length; j++) {
					if (j === i || sampled[j].pts.length === 0) continue;
					if (contains(sampled[j].pts, probe.x, probe.y)) {
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
		// Build the set of all anchor names across all glyphs (cached
		// per-audit-call would be cheaper but the per-glyph version is
		// simple and the audit module is hot-pathless).
		const allMarkAnchorNames = new Set<string>();
		const allBaseAnchorNames = new Set<string>();
		for (const g of Object.values(project.glyphs)) {
			const gIsMark = g.codepoint >= 0x0300 && g.codepoint <= 0x036f;
			for (const a of g.anchors ?? []) {
				if (gIsMark && a.name.startsWith('_')) allMarkAnchorNames.add(a.name.slice(1));
				else if (!gIsMark && !a.name.startsWith('_')) allBaseAnchorNames.add(a.name);
			}
		}
		for (const a of glyph.anchors) {
			const hasUnderscorePrefix = a.name.startsWith('_');
			// Partner detection — anchor only does work when there's a peer
			// on the other side. base `top` needs at least one mark with
			// `_top`; mark `_top` needs at least one base with `top`.
			if (isMark && hasUnderscorePrefix) {
				if (!allBaseAnchorNames.has(a.name.slice(1))) {
					issues.push({
						codepoint: cp,
						severity: 'info',
						code: 'anchor-without-partner',
						message: `Mark anchor "${a.name}" has no base glyph with anchor "${a.name.slice(1)}" — this mark won't attach to anything`
					});
				}
			} else if (!isMark && !hasUnderscorePrefix) {
				if (!allMarkAnchorNames.has(a.name)) {
					issues.push({
						codepoint: cp,
						severity: 'info',
						code: 'anchor-without-partner',
						message: `Base anchor "${a.name}" has no mark glyph with anchor "_${a.name}" — no mark will attach here`
					});
				}
			}
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

		// Composite cycle detection — DFS through component references
		// starting from this glyph. A cycle would infinite-loop the renderer.
		const visited = new Set<number>();
		const stack: number[] = [cp];
		while (stack.length > 0) {
			const current = stack.pop()!;
			if (visited.has(current)) continue;
			visited.add(current);
			const cg = project.glyphs[current];
			for (const r of cg?.components ?? []) {
				if (r.baseCodepoint === cp) {
					issues.push({
						codepoint: cp,
						severity: 'error',
						code: 'composite-cycle',
						message: `Composite references itself transitively (via U+${current.toString(16).toUpperCase().padStart(4, '0')}) — rendering would loop forever`
					});
					stack.length = 0;
					break;
				}
				if (!visited.has(r.baseCodepoint)) stack.push(r.baseCodepoint);
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
	} else {
		// Canonical-name check: when AGLFN defines a name for this codepoint
		// and the glyph's current name differs, info-level flag. Info, not
		// warn, because valid custom names are sometimes intentional —
		// e.g. project conventions like "ampersand.alt". The auto-fix
		// matches the existing AGLFN suggestion chip in the editor.
		const canonical = aglfnName(cp);
		if (canonical && canonical !== glyph.name && /^[A-Za-z._][A-Za-z0-9._-]{0,62}$/.test(canonical)) {
			issues.push({
				codepoint: cp,
				severity: 'info',
				code: 'glyph-name-not-canonical',
				message: `Name "${glyph.name}" differs from AGLFN canonical "${canonical}" — rename to keep downstream tooling happy`
			});
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

	// Axis-range sanity — each master's location must be within the
	// declared range of every axis it references, AND must reference
	// every declared axis (an axis without a value is undefined behaviour
	// at export time).
	const axes = project.axes ?? [];
	const axisByTag = new Map(axes.map((a) => [a.tag, a]));
	for (const m of project.masters ?? []) {
		// Each location entry must be in-range.
		for (const [tag, value] of Object.entries(m.location)) {
			const axis = axisByTag.get(tag);
			if (!axis) {
				issues.push({
					codepoint: 0,
					severity: 'warn',
					code: 'master-axis-unknown',
					message: `Master "${m.name}" references axis "${tag}" which isn't declared in project.axes`
				});
				continue;
			}
			if (value < axis.minimum || value > axis.maximum) {
				issues.push({
					codepoint: 0,
					severity: 'error',
					code: 'master-axis-out-of-range',
					message: `Master "${m.name}" sits at ${tag}=${value} but axis range is ${axis.minimum}..${axis.maximum}`
				});
			}
		}
		// Every declared axis must have a value in this master.
		for (const axis of axes) {
			if (!(axis.tag in m.location)) {
				issues.push({
					codepoint: 0,
					severity: 'warn',
					code: 'master-axis-missing',
					message: `Master "${m.name}" missing a value for axis "${axis.tag}" — interpolation is undefined`
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
	if (!project.metadata.designer?.trim())
		issues.push({ codepoint: 0, severity: 'info', code: 'naming-designer-missing', message: 'Designer name is empty — appears as "Unknown" in font browsers and metadata views' });
	if (!project.metadata.copyright?.trim())
		issues.push({ codepoint: 0, severity: 'info', code: 'naming-copyright-missing', message: 'Copyright line is empty — recommended for distribution + legal clarity' });
	if (!project.metadata.license?.trim())
		issues.push({ codepoint: 0, severity: 'info', code: 'naming-license-missing', message: 'License text is empty — pick an SPDX identifier or paste your custom EULA to make distribution terms explicit' });

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

	// Vertical-metric topology — caps can't be taller than ascender, x can't
	// be taller than caps, descender must be negative. These are user-set
	// in the project metrics and easy to corrupt by a typo. Each is fatal
	// for text rendering, so error-level.
	const m = project.metrics;
	if (m.capHeight > m.ascender) {
		issues.push({
			codepoint: 0,
			severity: 'error',
			code: 'metrics-cap-above-ascender',
			message: `Cap-height (${m.capHeight}) exceeds ascender (${m.ascender}) — caps will clip on every platform`
		});
	}
	if (m.xHeight > m.capHeight) {
		issues.push({
			codepoint: 0,
			severity: 'error',
			code: 'metrics-x-above-cap',
			message: `x-height (${m.xHeight}) exceeds cap-height (${m.capHeight}) — lowercase reads taller than uppercase`
		});
	}
	if (m.descender >= 0) {
		issues.push({
			codepoint: 0,
			severity: 'error',
			code: 'metrics-descender-nonnegative',
			message: `Descender (${m.descender}) is non-negative — descending letters (g j p q y) will sit on the baseline`
		});
	}
	if (m.capHeight <= 0 || m.xHeight <= 0) {
		issues.push({
			codepoint: 0,
			severity: 'warn',
			code: 'metrics-zero-height',
			message: 'Cap-height or x-height is zero — auto-fit + spacing-by-reference algorithms will misbehave'
		});
	}

	// Duplicate glyph names — fatal at OTF export time. Reports each
	// repeating name once with a list of the codepoints sharing it.
	const byName = new Map<string, number[]>();
	for (const g of Object.values(project.glyphs)) {
		if (!g.name) continue;
		const list = byName.get(g.name) ?? [];
		list.push(g.codepoint);
		byName.set(g.name, list);
	}
	for (const [name, cps] of byName) {
		if (cps.length < 2) continue;
		const labels = cps.map((cp) => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`).join(', ');
		issues.push({
			codepoint: 0,
			severity: 'error',
			code: 'duplicate-glyph-name',
			message: `Glyph name "${name}" used by ${cps.length} glyphs (${labels}) — OTF export will fail`
		});
	}

	// Kerning sanity — pairs whose absolute value exceeds half the smaller
	// glyph's advance width are almost always typos (designer meant -50 but
	// typed -500). Negative kerning > advance width effectively rewinds
	// past the previous glyph's right edge; positive > advance creates
	// gaps wider than a missing glyph.
	for (const pair of project.kerning) {
		const limit = (() => {
			if (typeof pair.left !== 'number' || typeof pair.right !== 'number') return null;
			const l = project.glyphs[pair.left];
			const r = project.glyphs[pair.right];
			if (!l || !r) return null;
			return Math.round(Math.min(l.advanceWidth, r.advanceWidth) / 2);
		})();
		if (limit !== null && Math.abs(pair.value) > limit && limit > 0) {
			const lc = pair.left as number;
			const rc = pair.right as number;
			const lch = lc > 0x20 && lc < 0x10000 ? String.fromCodePoint(lc) : `U+${lc.toString(16)}`;
			const rch = rc > 0x20 && rc < 0x10000 ? String.fromCodePoint(rc) : `U+${rc.toString(16)}`;
			issues.push({
				codepoint: 0,
				severity: 'warn',
				code: 'kerning-extreme',
				message: `Kerning ${lch}${rch} = ${pair.value}fu — extreme. Likely a typo (did you mean ${Math.sign(pair.value) * Math.round(Math.abs(pair.value) / 10)}?)`
			});
		}
	}

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

	// Kerning classes with a single member — almost always an oversight.
	// A class with one glyph is identical to kerning that glyph as a pair,
	// so it adds maintenance burden without compression value.
	for (const cls of project.classes ?? []) {
		if (cls.members.length === 1) {
			issues.push({
				codepoint: 0,
				severity: 'info',
				code: 'kerning-class-singleton',
				message: `Class ${cls.name} has one member — kerning classes are meant to group glyphs that share spacing behavior. Either add more members or replace the class with a direct pair.`
			});
		}
	}

	// CPAL invariant: every palette must have the same number of colors.
	// font5.md: "palettes are alternate themes for the same layer set."
	if (project.palettes && project.palettes.length > 1) {
		const lengths = project.palettes.map((p) => p.colors.length);
		const max = Math.max(...lengths);
		const min = Math.min(...lengths);
		if (max !== min) {
			issues.push({
				codepoint: 0,
				severity: 'warn',
				code: 'palette-length-mismatch',
				message: `Palettes have mismatched lengths (${min}–${max}). CPAL requires every palette to share the same color count — layers referencing higher indices will fail to render in the shorter palettes.`
			});
		}
	}

	// Color-layer integrity. Each layer references a palette slot by
	// index; if that index is beyond every palette's color count, the
	// layer renders as transparent. Easy to break by adding a color to
	// a glyph after the palette was trimmed; detection saves a
	// "why is my glyph invisible" debug session.
	const paletteCount = project.palettes?.length ?? 0;
	const minPaletteLen =
		paletteCount > 0
			? Math.min(...(project.palettes ?? []).map((p) => p.colors.length))
			: 0;
	for (const g of Object.values(project.glyphs)) {
		const layers = g.colorLayers ?? [];
		for (const layer of layers) {
			if (paletteCount === 0) {
				// Color layer with no palette in the project at all.
				issues.push({
					codepoint: g.codepoint,
					severity: 'warn',
					code: 'color-layer-no-palette',
					message: `Glyph has color layers but the project has no palettes — layers won't render. Define at least one palette on the Features tab.`
				});
				break;
			}
			if (layer.paletteIndex >= minPaletteLen) {
				issues.push({
					codepoint: g.codepoint,
					severity: 'warn',
					code: 'color-layer-out-of-range',
					message: `Color layer references palette slot ${layer.paletteIndex}, but the shortest palette only has ${minPaletteLen} colors — layer renders transparent in that palette.`
				});
			}
		}
	}

	// Self-kerning. A pair where left === right is rarely intended
	// (typos like accidentally entering the same glyph in both slots
	// of the pair editor) and produces a "letter pulls toward itself"
	// effect that designers won't expect. Surface as info — false
	// positives possible (some scripts legitimately kern a letter to
	// itself in compound contexts) but worth flagging.
	for (const k of project.kerning) {
		if (typeof k.left === 'number' && typeof k.right === 'number' && k.left === k.right) {
			const g = project.glyphs[k.left];
			const ch = g ? `${g.name} (${String.fromCodePoint(k.left)})` : `U+${k.left.toString(16)}`;
			issues.push({
				codepoint: 0,
				severity: 'info',
				code: 'kerning-pair-self',
				message: `Kerning pair where left = right (${ch} ↔ ${ch}) — pulls a letter toward itself. Usually a typo in the pair editor.`
			});
		}
	}

	// Master with no overrides. A master is supposed to provide
	// per-glyph deltas at a specific axis location; an empty master
	// is dead weight in the designspace + confusing in the share-page
	// master picker.
	for (const m of project.masters ?? []) {
		const overrideCount = Object.values(m.glyphs ?? {}).filter(
			(g) => g.contours.length > 0 || (g.components?.length ?? 0) > 0
		).length;
		if (overrideCount === 0) {
			issues.push({
				codepoint: 0,
				severity: 'warn',
				code: 'master-empty',
				message: `Master "${m.name}" has no glyph overrides — it'll render identically to the default. Add overrides or remove the master.`
			});
		}
	}

	// Feature-state inconsistency. project.features.kern = false but
	// kerning pairs exist → the pairs ship dead. project.features.liga
	// = false but ligature glyphs exist → the ligas ship invisible.
	if (project.features.kern === false && project.kerning.length > 0) {
		issues.push({
			codepoint: 0,
			severity: 'warn',
			code: 'feature-kern-disabled-with-pairs',
			message: `kern feature is disabled but ${project.kerning.length} kerning pairs exist — pairs ship dead in the OTF. Enable kern or delete the pairs.`
		});
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

		// Axis range — flag when a registered axis spans more than the
		// conventionally-comfortable range. Designers commonly draw extreme
		// masters that don't interpolate cleanly through the middle of the
		// range. Per docs/research/variable-fonts-deep-dive.md Part 8.
		const AXIS_RANGE_THRESHOLDS: Record<string, number> = {
			wght: 800,
			wdth: 100,
			opsz: 50,
			slnt: 30
		};
		for (const axis of project.axes ?? []) {
			const threshold = AXIS_RANGE_THRESHOLDS[axis.tag];
			if (threshold === undefined) continue;
			const range = axis.maximum - axis.minimum;
			if (range > threshold) {
				issues.push({
					codepoint: 0,
					severity: 'info',
					code: 'axis-range-extreme',
					message: `Axis '${axis.tag}' spans ${range} units (typical max ${threshold}) — consider whether intermediate masters are needed to anchor interpolation`
				});
			}
		}

		// Master proximity — two masters within 5% of each other in
		// designspace are either redundant or a deliberately tight
		// intermediate pair worth confirming.
		const MASTER_PROXIMITY_THRESHOLD = 0.05;
		const masters = project.masters ?? [];
		const axisRanges = new Map<string, number>();
		for (const a of project.axes ?? []) {
			axisRanges.set(a.tag, a.maximum - a.minimum);
		}
		for (let i = 0; i < masters.length; i++) {
			for (let j = i + 1; j < masters.length; j++) {
				const a = masters[i];
				const b = masters[j];
				const sharedAxes = Object.keys(a.location).filter((k) => k in b.location);
				if (sharedAxes.length === 0) continue;
				// Compute normalized euclidean distance across shared axes
				let sumSq = 0;
				for (const tag of sharedAxes) {
					const range = axisRanges.get(tag) ?? 1;
					if (range === 0) continue;
					const diff = (a.location[tag] - b.location[tag]) / range;
					sumSq += diff * diff;
				}
				const normalizedDistance = Math.sqrt(sumSq / sharedAxes.length);
				if (normalizedDistance > 0 && normalizedDistance < MASTER_PROXIMITY_THRESHOLD) {
					issues.push({
						codepoint: 0,
						severity: 'warn',
						code: 'master-too-close',
						message: `Master '${a.name}' and '${b.name}' are within ${(normalizedDistance * 100).toFixed(1)}% of each other in designspace — confirm intent`
					});
				}
			}
		}

		// STAT shape — a variable font intended for shipping should have
		// familyAxes set (Patens uses this to generate the STAT table at
		// export time). Without it, OS font menus may display style names
		// incorrectly on Windows.
		if (project.axes && project.axes.length > 0) {
			const hasFamilyAxes =
				project.familyAxes !== undefined &&
				(project.familyAxes.wght !== undefined ||
					project.familyAxes.wdth !== undefined ||
					project.familyAxes.ital !== undefined ||
					project.familyAxes.slnt !== undefined);
			if (!hasFamilyAxes) {
				issues.push({
					codepoint: 0,
					severity: 'warn',
					code: 'stat-missing',
					message:
						'Variable font has axes but no familyAxes set — STAT generation at export time may produce incorrect style names in OS font menus. Set position in the family on the Family tab.'
				});
			}
		}

		// STAT format checks — only fire when the project has an explicit
		// STAT override. The italic axis should use format 3 (linkedValue)
		// so Windows displays "Bold Italic" not "Regular Bold Italic".
		if (project.stat && project.axes && project.axes.length > 0) {
			const italAxisIndex = project.stat.designAxes.findIndex((a) => a.tag === 'ital');
			if (italAxisIndex >= 0) {
				const italValues = project.stat.axisValues.filter(
					(v) => v.format !== 4 && v.axisIndex === italAxisIndex
				);
				const wrongFormatValues = italValues.filter((v) => v.format !== 3);
				for (const v of wrongFormatValues) {
					issues.push({
						codepoint: 0,
						severity: 'warn',
						code: 'stat-format-mismatch',
						message: `STAT italic axis-value "${v.name}" uses format ${v.format} — should be format 3 (linkedValue) for proper Windows style-name display`
					});
				}
			}
		}

		// STAT instance name coherence — STAT-composed names should match
		// the corresponding fvar named-instance style names. Mismatches mean
		// different OS apps display different names for the same instance.
		if (project.stat && project.instances && project.instances.length > 0) {
			for (const inst of project.instances) {
				// Walk the STAT axis values matching this instance's location
				// and check that the constructed name matches inst.styleName.
				const parts: string[] = [];
				for (let i = 0; i < project.stat.designAxes.length; i++) {
					const axis = project.stat.designAxes[i];
					const value = inst.location[axis.tag];
					if (value === undefined) continue;
					const match = project.stat.axisValues.find((v) => {
						if (v.format === 4) return false;
						if (v.axisIndex !== i) return false;
						if (v.format === 1 || v.format === 3) return v.value === value;
						if (v.format === 2) return v.nominalValue === value;
						return false;
					});
					if (match) parts.push(match.name);
				}
				const composed = parts.join(' ').trim();
				if (composed && composed !== inst.styleName) {
					issues.push({
						codepoint: 0,
						severity: 'warn',
						code: 'stat-instance-name-mismatch',
						message: `Instance "${inst.styleName}" has STAT-composed name "${composed}" — keep them identical so OS apps display the same name everywhere`
					});
				}
			}
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
		// Metric alignment
		'xheight-misaligned':
			'A lowercase letter that should reach x-height is sitting noticeably below it. Uneven tops across letters give text a wobbly rhythm; consistent x-height alignment is what makes type read smoothly.',
		'capheight-misaligned':
			'An uppercase letter that should reach cap-height is sitting noticeably below it. Caps lines lose their crisp baseline-and-cap rhythm when individual letters fall short.',
		'sidebearing-deeply-negative-lsb':
			'Left sidebearing is more negative than -100fu — usually a bug from a mass-spacing pass. Modest negatives (e.g. -20) are normal for italic letters that lean.',
		'sidebearing-deeply-negative-rsb':
			'Right sidebearing is more negative than -100fu — usually a bug from a mass-spacing pass. Modest negatives (e.g. -20) are normal for italic letters that lean or for tightly-tucked terminal shapes (T, Y, V at the end of a word).',
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
			'This glyph\'s right sidebearing has drifted from the median of its sidebearing-class peers. Either re-apply the class or remove this glyph from it — the drift means one of those two is your intent, and leaving the class in place propagates the staleness on the next class edit.',
		// Composites & references
		'composite-missing-base':
			'A composite reference points at a glyph with no outlines. The reference will render as nothing.',
		'composite-cycle':
			'A composite glyph references itself transitively (A → B → A). Rendering would loop forever — exports break. Remove one link in the chain.',
		// Anchor naming
		'anchor-naming-mark-no-prefix':
			'GPOS mark-positioning convention: marks (combining diacritics) carry anchors prefixed with "_" so they pair up with same-named base anchors. Without the prefix, this anchor never enters the mark feature.',
		'anchor-naming-base-with-prefix':
			'Base-glyph anchors should not start with "_" — that prefix is reserved for mark glyphs. Rename or the GPOS mark feature will miss this attachment point.',
		'anchor-without-partner':
			'An anchor has no partner on the other side (no mark with the matching "_name" for a base anchor, or no base with the matching "name" for a mark anchor). Info-level because designers often add anchors ahead of drawing the partner glyph — but if you forget the partner, the anchor sits unused at export.',
		// Variable-font compatibility
		'master-contour-count':
			'The number of contours differs across masters. VF interpolation requires identical contour count and order in every master.',
		'master-point-count':
			'A specific contour has different point counts across masters. Same constraint as master-contour-count, one level deeper.',
		'master-axis-unknown':
			'A master\'s location references an axis tag the project doesn\'t declare. The unknown axis is ignored at export — fix by adding the axis to project.axes or removing it from the master\'s location.',
		'master-axis-out-of-range':
			'A master\'s axis value sits outside the declared range. The interpolation engine will clip to the nearest valid value, producing unexpected geometry.',
		'master-axis-missing':
			'A master is missing a value for a declared axis. Interpolation is undefined at that axis — the export pipeline will substitute the axis default, which is rarely what the designer intended.',
		// Notes / flags / naming
		'notes-todo':
			'The glyph\'s notes field contains TODO or FIXME — an unresolved work item the designer left for future iteration.',
		'flagged-for-review':
			'A designer hit Shift+F on this glyph to mark it for follow-up review — a designer-set reminder, not a rule violation. The flag clears with another Shift+F. Useful for batch-marking glyphs that need refinement on a second pass without losing track (e.g. the bespoke Cyrillic shapes Я Ж Ф that ship as sketches in the demo project).',
		'glyph-name-empty':
			'Glyph name field is empty. PostScript glyph names are required for OpenType feature substitutions.',
		'glyph-name-invalid':
			'Glyph name contains characters outside the allowed set (A-Za-z0-9._-) or starts with a digit. The PostScript spec forbids it.',
		'glyph-name-too-long':
			'Glyph name exceeds 63 characters. The OpenType post-table v2 spec caps individual names at 63 bytes; longer names get silently truncated on export, which can then collide with whatever existing glyph already shares the prefix. Use the AGLFN suggestion chip in the glyph browser to get a canonical short name.',
		'glyph-name-not-canonical':
			'The glyph name differs from the canonical Adobe Glyph List for New Fonts name for this codepoint. Renaming keeps downstream tooling (feature substitutions, color emoji lookups, PostScript naming) consistent.',
		// Vertical-metric sanity
		'metrics-cap-above-ascender':
			'Cap-height exceeds the ascender. Capital letters will clip when rendered — ascender is the platform-recognised top of the glyph bounding box, caps must fit inside it.',
		'metrics-x-above-cap':
			'x-height exceeds cap-height — lowercase letters would render taller than uppercase. Almost certainly a typo in the metrics inspector.',
		'metrics-descender-nonnegative':
			'Descender is zero or positive — descending letters (g, j, p, q, y) will sit on the baseline rather than dropping below it. Descender values are conventionally negative (e.g. -200 at 1000 UPM).',
		'metrics-zero-height':
			'Cap-height or x-height is zero. Several algorithms (auto-spacing, spacing-by-reference, x-height alignment audit) depend on these to be positive — set them in the metrics inspector.',
		'kerning-extreme':
			'A kerning pair exceeds half the smaller glyph\'s advance — almost certainly a decimal typo (e.g. -500 typed when -50 was meant). Check the value in the spacing pair editor.',
		'kerning-class-singleton':
			'A kerning class has exactly one member. Classes are meant to group glyphs that share kerning behavior — a singleton class is identical to a direct pair and just adds a layer to navigate. Either expand it (e.g. visually-similar glyphs to share the value) or replace it with a direct pair on the spacing tab.',
		'palette-length-mismatch':
			'Color palettes have different lengths. CPAL requires every palette to share the same color count — when a glyph layer references slot 4 and only the default palette has 5 colors, the alternate palette will fail to render that layer. Trim or pad palettes on the features tab so all share one length.',
		'color-layer-no-palette':
			'A glyph carries color layers but the project has no palettes defined — the layers won\'t render. Either define a palette on the Features tab so the layers have somewhere to draw their colors from, or remove the colorLayers from the glyph if the color was experimental.',
		'color-layer-out-of-range':
			'A color layer references a palette slot index that\'s beyond the shortest palette\'s color count. That layer renders transparent in any palette that doesn\'t have a color at that index. Either add more colors to the short palette(s) or change the layer to reference a slot within the existing range.',
		'kerning-pair-self':
			'A kerning pair sets a value where the left and right glyph are the same — at run time this pulls a letter toward itself, which is rarely intended. Usually a typo in the pair editor (accidentally entering the same glyph in both slots). Delete unless the script genuinely needs self-kerning in a compound context.',
		'master-empty':
			'A variable-font master has no glyph overrides — every codepoint falls back to the default master\'s shape. Either add at least one override (the typical case: the difference is what defines the master) or remove the master from the designspace.',
		'feature-kern-disabled-with-pairs':
			'The kern feature is disabled in project.features.kern but kerning pairs exist in project.kerning. The pairs ship in the OTF dead — they\'re emitted into the file but the off flag tells renderers to skip them. Either enable kern on the Features tab (the typical case once pairs are set) or delete the pair data.',
		'duplicate-glyph-name':
			'Two or more glyphs share the same PostScript name. The OpenType post table requires unique names — OTF export fails. Rename the conflicting glyphs (the AGLFN suggestion chip + bulk AGLFN rename in the glyph browser are the fastest paths).',
		'naming-designer-missing':
			'Designer field is empty. The name appears in OS font browsers and any metadata-aware tool — leaving it blank shows "Unknown".',
		'naming-copyright-missing':
			'Copyright line is empty. Recommended for any distributed font — sets ownership and reuse boundaries.',
		'naming-license-missing':
			'License field is empty. Distributing without a license leaves recipients guessing about terms. Pick an SPDX identifier (e.g. "OFL-1.1") or paste your custom EULA.',

		// Brief completeness — fields the project's design intent depends on
		'brief-no-intent':
			'The brief\'s "intent" field is empty. Without a stated intent, audit and review tools can\'t check whether design choices match the goal. Set one sentence on the Brief tab — e.g. "a geometric sans for product UI at 14px+".',
		'brief-no-design-notes':
			'The brief has no design notes. Notes are where you record decisions ("contrast is monoline", "g is single-storey") so future-you doesn\'t reinvent them. Not required for export — recommended for any project you\'ll revisit.',

		// Coverage groups — bulk audits that check whether a script-essential subset is present
		'coverage-typo-essentials':
			'The typographic essentials subset is incomplete — basic punctuation and spacing characters that every font needs to feel finished (period, comma, hyphen, space, colon, semicolon, quotes). Some text will render with system-font fallbacks for the missing glyphs.',
		'coverage-latin-1-supp':
			'The Latin-1 Supplement subset is incomplete — accented letters used across Western European languages (À É Ñ Ü etc.). Missing glyphs mean Spanish, French, German, Portuguese, etc. won\'t render in your font.',
		'coverage-currency':
			'The currency-symbol subset is incomplete (¥ £ € ¢ ¤ etc.). Missing currency glyphs fall back to system fonts in price text — a visible inconsistency on storefronts and invoices.',
		'coverage-math':
			'The math-symbol subset is incomplete (± × ÷ ≠ ≤ ≥ etc.). Missing math glyphs are mostly invisible in body text but show up sharply in data tables and technical writing.',

		// Glyph count
		'glyph-count-low':
			'The project has fewer than ~95 drawn glyphs — the baseline for "usable font" (A–Z + a–z + 0–9 + basic punctuation). Below that, most real-world text will render with fallback fonts mixed in.',
		'control-glyphs-missing':
			'The 12-glyph control set (the letters foundries draw first to establish proportion + texture: H, O, n, o, +, period, etc.) is incomplete. These should land before mass-drawing the rest because they set the visual rhythm everything else has to match.',
		'figures-non-tabular':
			'The 0–9 digits have unequal advance widths — proportional figures. Fine for body text; broken for data tables, prices, and spreadsheets where columns of numbers must align. Run "Tabularise 0–9" on the Spacing tab to give every digit the same advance.',

		// UPM
		'upm-unusual':
			'Units-per-em (UPM) sits outside the typical 1000–2048 range. Most foundries pick 1000 (PostScript convention) or 2048 (TrueType convention). Unusual values still work but may cause off-by-one rounding when other tools assume a standard UPM.',

		// Naming — top-level name table fields
		'naming-family':
			'Family name is empty. The OpenType name table requires a non-empty family name (ID 1) — export will refuse to produce a file without it. Set it on the Brief or Export tab.',
		'naming-style':
			'Style name is empty. The name table requires a style name (ID 2 — e.g. "Regular", "Bold", "Italic"). Export refuses to ship without one.',
		'naming-version':
			'Version field is empty. The OpenType head.fontRevision is derived from this — when empty, export defaults to "1.000". Set it explicitly so each release has a recognisable version string in font dialogs.',
		'naming-family-long':
			'Family name exceeds 31 characters. Some legacy app menus truncate or refuse to list overly long family names — keeping the name compact avoids ugly fallback behavior in Word, Photoshop, and older Office builds.',
		'naming-family-chars':
			'Family name contains characters outside the safe set (letters / digits / space / hyphen). Some apps reject anything beyond that — limit to A–Z, a–z, 0–9, space, and hyphen unless you\'ve verified your target apps accept more.',

		// Metadata (meta-* — OS/2 + name-table metadata)
		'meta-no-copyright':
			'Copyright notice is empty. Most foundries require it; Google Fonts review rejects fonts without one. Add a one-line copyright on the Export tab (e.g. "Copyright 2026 Your Name").',
		'meta-no-designer':
			'Designer field is empty. Name table ID 9 ships blank, so Glyphs / Font Book / OS font browsers show "Unknown designer". Set it on the Brief tab.',
		'meta-no-designer-url':
			'Designer URL is empty. A homepage or portfolio link surfaces in some font dialogs and in PDF metadata when the font is embedded. Recommended for any font you want credit on.',
		'meta-no-license':
			'License field is empty. Pick a preset on the Export tab (OFL 1.1 for open source, Proprietary for commercial) so downstream users know the terms — fonts without licenses get treated as untrusted by review tools.',
		'meta-no-license-url':
			'License is set but the license URL is empty. URLs let embedded apps link directly to the license text (e.g. https://scripts.sil.org/OFL for OFL). Strongly recommended for OFL fonts.',
		'meta-no-manufacturer':
			'Manufacturer (foundry) field is empty — the name table falls back to the designer name. If you ship under a foundry brand distinct from the designer, set it explicitly so attribution is correct.',
		'meta-no-vendor-id':
			'OS/2 vendor ID is empty — defaults to "NONE" in the exported file. Register a 4-letter foundry tag at https://learn.microsoft.com/typography/vendors/ to identify your fonts in font-management tooling and crash diagnostics.',
		'meta-vendor-id-invalid':
			'Vendor ID is more than 4 characters or contains non-ASCII. The OS/2 achVendID field is 4 bytes — Microsoft\'s registry uses 4-letter all-caps tags. Short tags will be space-padded; over-length tags get truncated.',
		'meta-version-format':
			'Version string doesn\'t match the OpenType "MAJOR.MINOR" convention (e.g. "1.000", "2.345"). Many tools parse it into head.fontRevision and round non-conforming strings — best to follow the convention for predictable behavior.',

		// Vertical-metric mismatches (between OS/2 typo* and hhea fields)
		'metrics-asc-mismatch':
			'OS/2 typoAscender doesn\'t match hhea ascender. The two values should be equal — line-height computations on Mac/iOS read OS/2, on Windows browsers read hhea, and a mismatch causes line spacing to differ across platforms.',
		'metrics-desc-mismatch':
			'OS/2 typoDescender doesn\'t match hhea descender. Same platform-divergence story as the ascender mismatch — line spacing won\'t match between Mac and Windows.',
		'metrics-gap-mismatch':
			'OS/2 typoLineGap doesn\'t match hhea lineGap. The extra-line-gap above the ascender is platform-dependent unless both fields agree. Set them equal in the Metrics inspector.',
		'metrics-use-typo-off':
			'The USE_TYPO_METRICS flag (OS/2 fsSelection bit 7) is off. Without it, Windows uses winAscent / winDescent for line spacing while Mac uses typoAscender / typoDescender, producing different line heights across platforms. Almost always should be on.',
		'metrics-win-clip-top':
			'OS/2 winAscent is below typoAscender — top edges of glyphs may clip on Windows. winAscent is Windows\' clipping boundary; if it sits below the typoAscender, ascenders that reach typoAscender will be cropped. Bump winAscent up.',
		'metrics-win-clip-bottom':
			'OS/2 winDescent is below |typoDescender| — descenders may clip on Windows. winDescent is the clipping boundary for descenders; if it\'s smaller than the typoDescender\'s magnitude, descenders get cropped. Bump winDescent up.',

		// Designspace / variable-font axes + masters + instances
		'axis-range-invalid':
			'A designspace axis has min/default/max values out of order. The interpolation engine requires min ≤ default ≤ max — fix the axis on the Designspace tab.',
		'master-orphan-axis':
			'A master references an axis the project doesn\'t declare. The unknown axis is ignored at export, which may produce unexpected interpolation results. Either remove the axis reference from the master\'s location or add the axis to project.axes.',
		'master-out-of-range':
			'A master\'s axis value sits outside the declared range. Interpolation will clip to the nearest valid value, producing unexpected geometry. Either move the master into range or widen the axis range to include it.',
		'instance-orphan-axis':
			'A named instance references an axis the project doesn\'t declare. The instance will fall back to axis defaults for the unknown axis — usually not what you want. Remove or re-tag the axis reference.',
		'no-instances':
			'The designspace has axes but no named instances. Most apps expect at least the default instance to be defined (e.g. "Regular") so users have something to pick from the font menu. Add one on the Designspace tab.',
		'axis-range-extreme':
			'A designspace axis spans a range wider than the conventional comfort zone (wght > 800, wdth > 100, opsz > 50pt, slnt > 30°). Designers commonly draw extreme masters that don\'t interpolate cleanly through the middle of the range — consider whether you have a designed intermediate master, or whether intermediate weights are extrapolation. See variablefonts.io and Ahrens/Mugikura\'s Size-specific Adjustments for the design conventions.',
		'master-too-close':
			'Two masters sit within 5% of each other in designspace. Either one master is redundant, or you have a deliberately tight intermediate-master pair worth confirming. Tight master pairs increase the gvar table size and rarely change rendered output between them.',
		'stat-missing':
			'Variable font has axes but no familyAxes set — Patens needs the family-position to generate the STAT (Style Attributes) table at export time. Without STAT, OS font menus may display style names incorrectly (Windows in particular). Set the family-position on the Family tab.',
		'stat-format-mismatch':
			'A STAT axis-value uses the wrong format. The italic axis (ital) specifically requires format 3 (linkedValue) — format 3 records "Italic is the italic version of Regular" so Windows displays "Bold Italic" instead of "Regular Bold Italic". Other formats (1, 2, 4) for italic axis-values produce broken style-name composition.',
		'stat-instance-name-mismatch':
			'A STAT axis-value combination produces a style name that doesn\'t match the corresponding fvar named-instance style name. Result: the OS may display the STAT-derived name in some apps and the fvar-derived name in others. Convention: keep them identical. Patens can rename one to match the other.',

		// Kerning classes + class-aware pair audits
		'class-empty':
			'A kerning class has no members. Empty classes pull their weight on the maintenance side but contribute nothing at run time — either fill them with the glyphs they\'re meant to group, or delete them.',
		'class-missing-member':
			'A kerning class lists a codepoint that has no corresponding glyph in the project. The reference is dead — the class behaves as if that member weren\'t there. Either draw the glyph or remove the reference from the class.',
		'class-name-format':
			'A kerning class name doesn\'t start with "@" — the convention shared by Glyphs, FontLab, and FEA syntax for kerning groups. Renaming makes the class read uniformly across tools and any FEA you generate.',
		'pair-missing-glyph':
			'A kerning pair references a glyph that doesn\'t exist in the project. The pair is dead weight — either draw the missing glyph or remove the pair from the spacing tab.',
		'pair-orphan-class':
			'A kerning pair references an undefined kerning class. The pair silently does nothing at run time. Either define the class or change the pair to reference one that exists.',
		'kerning-no-classes':
			'The project has many flat kerning pairs and zero kerning classes. Once you have more than ~30 pairs, classes become much more maintainable than direct pairs — grouping accented variants (e.g. @A_left = [A Á Â Ä À]) consolidates kerning across the family.',
		'sidebearings-no-classes':
			'The project has no sidebearing classes — every glyph carries its sidebearings independently. For mid-to-large families this gets unmaintainable; sidebearing classes pin shape-similar glyphs (n / m / h / b / d / p / q) together so a tweak propagates.',

		// Anchor coverage (separate from anchor-naming-*)
		'anchors-missing':
			'A meaningful number of Latin base glyphs have no anchors. Composites built from them (Á, È, Ñ, Ç) will use fixed offsets rather than proper GPOS mark positioning — marks will look mechanically placed rather than tuned to each letter\'s shape.'
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
