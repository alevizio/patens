/**
 * Pure path-editing helpers used by the vector point editor.
 * All operations return new arrays — never mutate in place.
 */

import polygonClipping from 'polygon-clipping';
import type { BezierContour, PathCommand } from './types';

export type PointRef = { contour: number; index: number };

/** Reference to a bezier control point (off-curve handle). */
export type HandleRef = {
	contour: number;
	/** Command index that owns the handle */
	cmdIndex: number;
	/** Which handle on that command */
	which: 'x1' | 'x2';
};

export type OnCurvePoint = {
	contourIndex: number;
	pointIndex: number;
	x: number;
	y: number;
	cmdType: 'M' | 'L' | 'C' | 'Q';
};

export type Handle = {
	ref: HandleRef;
	x: number;
	y: number;
	/** Position of the on-curve point this handle is attached to (its anchor). */
	anchorX: number;
	anchorY: number;
};

export type Segment = {
	contourIndex: number;
	/** Index of the starting on-curve command in commands[] */
	startCmdIndex: number;
	/** Index of the ending on-curve command in commands[] (wraps to M for closing edge) */
	endCmdIndex: number;
	ax: number;
	ay: number;
	bx: number;
	by: number;
};

/**
 * Find the on-curve point referenced by a PointRef. Returns the (x, y) at that
 * command, or null if the command is Z or out of range.
 */
const pointXY = (
	contours: BezierContour[],
	ref: PointRef
): { x: number; y: number } | null => {
	const cmd = contours[ref.contour]?.commands[ref.index];
	if (!cmd) return null;
	if (cmd.type === 'M' || cmd.type === 'L' || cmd.type === 'C' || cmd.type === 'Q')
		return { x: cmd.x, y: cmd.y };
	return null;
};

/**
 * Collect the bezier handles immediately adjacent to a selected on-curve point.
 * For a closed contour, the handles wrap (last point's outgoing handle is the
 * first C/Q command after M).
 */
export const collectHandlesForPoint = (
	contours: BezierContour[],
	ref: PointRef
): Handle[] => {
	const contour = contours[ref.contour];
	if (!contour) return [];
	const anchor = pointXY(contours, ref);
	if (!anchor) return [];

	const out: Handle[] = [];
	const cmds = contour.commands;
	const sel = cmds[ref.index];
	// Incoming handle: x2/y2 of a C ending at this point, or x1/y1 of a Q.
	if (sel?.type === 'C') {
		out.push({
			ref: { contour: ref.contour, cmdIndex: ref.index, which: 'x2' },
			x: sel.x2,
			y: sel.y2,
			anchorX: anchor.x,
			anchorY: anchor.y
		});
	} else if (sel?.type === 'Q') {
		out.push({
			ref: { contour: ref.contour, cmdIndex: ref.index, which: 'x1' },
			x: sel.x1,
			y: sel.y1,
			anchorX: anchor.x,
			anchorY: anchor.y
		});
	}

	// Outgoing handle: the next C/Q command's x1/y1.
	// Find the next drawing command, wrapping if the contour is closed.
	const closed = cmds[cmds.length - 1]?.type === 'Z';
	const findNext = (start: number): number | null => {
		for (let i = start; i < cmds.length; i++) {
			const c = cmds[i];
			if (c.type === 'L' || c.type === 'C' || c.type === 'Q') return i;
			if (c.type === 'M') return null;
			if (c.type === 'Z') break;
		}
		if (!closed) return null;
		// wrap from start (the M is at the beginning, find the next L/C/Q after M)
		for (let i = 0; i < cmds.length; i++) {
			const c = cmds[i];
			if (c.type === 'L' || c.type === 'C' || c.type === 'Q') return i;
		}
		return null;
	};
	const nextIdx = findNext(ref.index + 1);
	if (nextIdx !== null) {
		const next = cmds[nextIdx];
		if (next.type === 'C') {
			out.push({
				ref: { contour: ref.contour, cmdIndex: nextIdx, which: 'x1' },
				x: next.x1,
				y: next.y1,
				anchorX: anchor.x,
				anchorY: anchor.y
			});
		} else if (next.type === 'Q') {
			out.push({
				ref: { contour: ref.contour, cmdIndex: nextIdx, which: 'x1' },
				x: next.x1,
				y: next.y1,
				anchorX: anchor.x,
				anchorY: anchor.y
			});
		}
	}
	return out;
};

/** Move a bezier handle to a new position. */
export const moveHandle = (
	contours: BezierContour[],
	ref: HandleRef,
	x: number,
	y: number
): BezierContour[] =>
	contours.map((c, ci) => {
		if (ci !== ref.contour) return c;
		return {
			...c,
			commands: c.commands.map((cmd, i) => {
				if (i !== ref.cmdIndex) return cmd;
				if (cmd.type === 'C') {
					if (ref.which === 'x1') return { ...cmd, x1: x, y1: y };
					if (ref.which === 'x2') return { ...cmd, x2: x, y2: y };
				}
				if (cmd.type === 'Q' && ref.which === 'x1') return { ...cmd, x1: x, y1: y };
				return cmd;
			})
		};
	});

/** All on-curve points across all contours, with their command indices. */
export const collectOnCurvePoints = (contours: BezierContour[]): OnCurvePoint[] => {
	const out: OnCurvePoint[] = [];
	for (let ci = 0; ci < contours.length; ci++) {
		const cmds = contours[ci].commands;
		for (let pi = 0; pi < cmds.length; pi++) {
			const c = cmds[pi];
			if (c.type === 'M' || c.type === 'L' || c.type === 'C' || c.type === 'Q') {
				out.push({ contourIndex: ci, pointIndex: pi, x: c.x, y: c.y, cmdType: c.type });
			}
		}
	}
	return out;
};

/** Adjacent segments connecting on-curve points (line approximation for hit-testing). */
export const collectSegments = (contours: BezierContour[]): Segment[] => {
	const out: Segment[] = [];
	for (let ci = 0; ci < contours.length; ci++) {
		const cmds = contours[ci].commands;
		// Find on-curve commands within this contour
		const onCurve: { i: number; x: number; y: number }[] = [];
		for (let i = 0; i < cmds.length; i++) {
			const c = cmds[i];
			if (c.type === 'M' || c.type === 'L' || c.type === 'C' || c.type === 'Q')
				onCurve.push({ i, x: c.x, y: c.y });
		}
		if (onCurve.length < 2) continue;
		const closed = cmds[cmds.length - 1]?.type === 'Z';
		for (let k = 0; k < onCurve.length - 1; k++) {
			const a = onCurve[k];
			const b = onCurve[k + 1];
			out.push({
				contourIndex: ci,
				startCmdIndex: a.i,
				endCmdIndex: b.i,
				ax: a.x,
				ay: a.y,
				bx: b.x,
				by: b.y
			});
		}
		if (closed) {
			const a = onCurve[onCurve.length - 1];
			const b = onCurve[0];
			out.push({
				contourIndex: ci,
				startCmdIndex: a.i,
				endCmdIndex: b.i,
				ax: a.x,
				ay: a.y,
				bx: b.x,
				by: b.y
			});
		}
	}
	return out;
};

/**
 * Move an on-curve point and translate its adjacent bezier handles by the same
 * delta so the surrounding curves keep their shape (FontLab default behaviour).
 */
export const movePoint = (
	contours: BezierContour[],
	ref: PointRef,
	x: number,
	y: number
): BezierContour[] => {
	const before = pointXY(contours, ref);
	if (!before) return contours;
	const dx = x - before.x;
	const dy = y - before.y;
	const next = contours.map((c, ci) => {
		if (ci !== ref.contour) return c;
		const cmds = c.commands;
		const newCmds = cmds.map((cmd, i) => {
			if (i === ref.index) {
				if (cmd.type === 'M' || cmd.type === 'L' || cmd.type === 'C' || cmd.type === 'Q') {
					if (cmd.type === 'C')
						return { ...cmd, x: cmd.x + dx, y: cmd.y + dy, x2: cmd.x2 + dx, y2: cmd.y2 + dy };
					if (cmd.type === 'Q')
						return { ...cmd, x: cmd.x + dx, y: cmd.y + dy, x1: cmd.x1 + dx, y1: cmd.y1 + dy };
					return { ...cmd, x: cmd.x + dx, y: cmd.y + dy };
				}
			}
			return cmd;
		});
		// Also translate the next curve's x1/y1 (outgoing handle from the moved point).
		const closed = cmds[cmds.length - 1]?.type === 'Z';
		const findNext = (start: number): number | null => {
			for (let i = start; i < cmds.length; i++) {
				const cc = cmds[i];
				if (cc.type === 'L' || cc.type === 'C' || cc.type === 'Q') return i;
				if (cc.type === 'M') return null;
				if (cc.type === 'Z') break;
			}
			if (!closed) return null;
			for (let i = 0; i < cmds.length; i++) {
				const cc = cmds[i];
				if (cc.type === 'L' || cc.type === 'C' || cc.type === 'Q') return i;
			}
			return null;
		};
		const nextIdx = findNext(ref.index + 1);
		if (nextIdx !== null) {
			const nc = newCmds[nextIdx];
			if (nc.type === 'C') newCmds[nextIdx] = { ...nc, x1: nc.x1 + dx, y1: nc.y1 + dy };
			else if (nc.type === 'Q') newCmds[nextIdx] = { ...nc, x1: nc.x1 + dx, y1: nc.y1 + dy };
		}
		return { ...c, commands: newCmds };
	});
	return next;
};

/** Translate many on-curve points (and their adjacent handles) by the same delta. */
export const movePoints = (
	contours: BezierContour[],
	refs: PointRef[],
	dx: number,
	dy: number
): BezierContour[] => {
	if (refs.length === 0 || (dx === 0 && dy === 0)) return contours;
	let next = contours;
	// Build a set of refs grouped by contour for efficiency
	const byContour = new Map<number, Set<number>>();
	for (const r of refs) {
		if (!byContour.has(r.contour)) byContour.set(r.contour, new Set());
		byContour.get(r.contour)!.add(r.index);
	}
	next = next.map((c, ci) => {
		const indices = byContour.get(ci);
		if (!indices) return c;
		const cmds = c.commands;
		const closed = cmds[cmds.length - 1]?.type === 'Z';
		const findNext = (start: number): number | null => {
			for (let i = start; i < cmds.length; i++) {
				const cc = cmds[i];
				if (cc.type === 'L' || cc.type === 'C' || cc.type === 'Q') return i;
				if (cc.type === 'M') return null;
				if (cc.type === 'Z') break;
			}
			if (!closed) return null;
			for (let i = 0; i < cmds.length; i++) {
				const cc = cmds[i];
				if (cc.type === 'L' || cc.type === 'C' || cc.type === 'Q') return i;
			}
			return null;
		};

		const out: PathCommand[] = cmds.map((cmd, i) => {
			if (!indices.has(i)) return cmd;
			if (cmd.type === 'C')
				return { ...cmd, x: cmd.x + dx, y: cmd.y + dy, x2: cmd.x2 + dx, y2: cmd.y2 + dy };
			if (cmd.type === 'Q')
				return { ...cmd, x: cmd.x + dx, y: cmd.y + dy, x1: cmd.x1 + dx, y1: cmd.y1 + dy };
			if (cmd.type === 'M' || cmd.type === 'L') return { ...cmd, x: cmd.x + dx, y: cmd.y + dy };
			return cmd;
		});
		// Outgoing handles from moved points
		for (const idx of indices) {
			const nextIdx = findNext(idx + 1);
			if (nextIdx === null) continue;
			// If the next on-curve is ALSO selected, its incoming/outgoing already moved as a whole curve segment.
			if (indices.has(nextIdx)) continue;
			const nc = out[nextIdx];
			if (nc.type === 'C') out[nextIdx] = { ...nc, x1: nc.x1 + dx, y1: nc.y1 + dy };
			else if (nc.type === 'Q') out[nextIdx] = { ...nc, x1: nc.x1 + dx, y1: nc.y1 + dy };
		}
		return { ...c, commands: out };
	});
	return next;
};

/** Find all on-curve points whose position is inside a rect (font coords). */
export const pointsInRect = (
	contours: BezierContour[],
	x0: number,
	y0: number,
	x1: number,
	y1: number
): PointRef[] => {
	const minX = Math.min(x0, x1);
	const maxX = Math.max(x0, x1);
	const minY = Math.min(y0, y1);
	const maxY = Math.max(y0, y1);
	const out: PointRef[] = [];
	for (let ci = 0; ci < contours.length; ci++) {
		const cmds = contours[ci].commands;
		for (let i = 0; i < cmds.length; i++) {
			const c = cmds[i];
			if (c.type === 'M' || c.type === 'L' || c.type === 'C' || c.type === 'Q') {
				if (c.x >= minX && c.x <= maxX && c.y >= minY && c.y <= maxY) {
					out.push({ contour: ci, index: i });
				}
			}
		}
	}
	return out;
};

export const deletePoint = (contours: BezierContour[], ref: PointRef): BezierContour[] => {
	const target = contours[ref.contour];
	if (!target) return contours;
	const cmds = target.commands;
	const onCurveCount = cmds.filter(
		(c) => c.type === 'M' || c.type === 'L' || c.type === 'C' || c.type === 'Q'
	).length;
	if (onCurveCount <= 3) {
		return contours.filter((_, ci) => ci !== ref.contour);
	}
	let newCmds = cmds.filter((_, i) => i !== ref.index);
	if (cmds[ref.index].type === 'M') {
		const promoteIdx = newCmds.findIndex(
			(c) => c.type === 'L' || c.type === 'C' || c.type === 'Q'
		);
		if (promoteIdx >= 0) {
			const old = newCmds[promoteIdx];
			if (old.type === 'L' || old.type === 'C' || old.type === 'Q') {
				newCmds = newCmds.map((c, i) => (i === promoteIdx ? { type: 'M', x: old.x, y: old.y } : c));
			}
		}
	}
	return contours.map((c, ci) => (ci === ref.contour ? { ...c, commands: newCmds } : c));
};

/** Delete multiple on-curve points in one pass (descending index, per contour). */
export const deletePoints = (
	contours: BezierContour[],
	refs: PointRef[]
): BezierContour[] => {
	if (refs.length === 0) return contours;
	// Process per-contour, descending index
	const byContour = new Map<number, number[]>();
	for (const r of refs) {
		if (!byContour.has(r.contour)) byContour.set(r.contour, []);
		byContour.get(r.contour)!.push(r.index);
	}
	let result = contours;
	for (const [ci, indices] of byContour.entries()) {
		const sorted = [...indices].sort((a, b) => b - a);
		for (const idx of sorted) {
			result = deletePoint(result, { contour: ci, index: idx });
		}
	}
	return result;
};

/**
 * Project a click position onto a segment and return parameter t in [0, 1]
 * and the resulting (x, y) on the segment.
 */
export const projectOntoSegment = (
	seg: Segment,
	px: number,
	py: number
): { t: number; x: number; y: number; distSq: number } => {
	const dx = seg.bx - seg.ax;
	const dy = seg.by - seg.ay;
	const lenSq = dx * dx + dy * dy;
	if (lenSq === 0) {
		return {
			t: 0,
			x: seg.ax,
			y: seg.ay,
			distSq: (px - seg.ax) ** 2 + (py - seg.ay) ** 2
		};
	}
	let t = ((px - seg.ax) * dx + (py - seg.ay) * dy) / lenSq;
	t = Math.max(0, Math.min(1, t));
	const x = seg.ax + dx * t;
	const y = seg.ay + dy * t;
	return { t, x, y, distSq: (px - x) ** 2 + (py - y) ** 2 };
};

/** Insert a new on-curve point on a segment at the given (x, y). */
export const insertPointOnSegment = (
	contours: BezierContour[],
	seg: Segment,
	x: number,
	y: number
): { contours: BezierContour[]; ref: PointRef } => {
	const target = contours[seg.contourIndex];
	if (!target) return { contours, ref: { contour: -1, index: -1 } };
	// Insert L command immediately after startCmdIndex (or right after M for closing edge).
	const insertAt = seg.startCmdIndex + 1;
	const newCmd: PathCommand = { type: 'L', x, y };
	const newCmds = [...target.commands];
	newCmds.splice(insertAt, 0, newCmd);
	const nextContours = contours.map((c, ci) =>
		ci === seg.contourIndex ? { ...c, commands: newCmds } : c
	);
	return {
		contours: nextContours,
		ref: { contour: seg.contourIndex, index: insertAt }
	};
};

/**
 * Sample a contour densely (handles M, L, Q, C, Z) and return a closed ring
 * of [x, y] pairs, suitable for polygon-clipping. Curves are flattened with
 * the same step count we use for bbox sampling.
 */
const contourToRing = (commands: PathCommand[], stepsPerCurve = 24): [number, number][] => {
	const ring: [number, number][] = [];
	let cx = 0,
		cy = 0;
	const push = (x: number, y: number) => {
		const last = ring[ring.length - 1];
		if (!last || last[0] !== x || last[1] !== y) ring.push([x, y]);
	};
	for (const c of commands) {
		if (c.type === 'M' || c.type === 'L') {
			push(c.x, c.y);
			cx = c.x;
			cy = c.y;
		} else if (c.type === 'Q') {
			for (let i = 1; i <= stepsPerCurve; i++) {
				const t = i / stepsPerCurve;
				const mt = 1 - t;
				const x = mt * mt * cx + 2 * mt * t * c.x1 + t * t * c.x;
				const y = mt * mt * cy + 2 * mt * t * c.y1 + t * t * c.y;
				push(x, y);
			}
			cx = c.x;
			cy = c.y;
		} else if (c.type === 'C') {
			for (let i = 1; i <= stepsPerCurve; i++) {
				const t = i / stepsPerCurve;
				const mt = 1 - t;
				const x =
					mt * mt * mt * cx + 3 * mt * mt * t * c.x1 + 3 * mt * t * t * c.x2 + t * t * t * c.x;
				const y =
					mt * mt * mt * cy + 3 * mt * mt * t * c.y1 + 3 * mt * t * t * c.y2 + t * t * t * c.y;
				push(x, y);
			}
			cx = c.x;
			cy = c.y;
		}
	}
	if (ring.length > 0) {
		const first = ring[0];
		const last = ring[ring.length - 1];
		if (first[0] !== last[0] || first[1] !== last[1]) ring.push([first[0], first[1]]);
	}
	return ring;
};

const ringToContour = (ring: [number, number][], winding: 'cw' | 'ccw' = 'ccw'): BezierContour => {
	// Drop the duplicated closing point
	let cleaned = ring;
	if (ring.length >= 2) {
		const first = ring[0];
		const last = ring[ring.length - 1];
		if (first[0] === last[0] && first[1] === last[1]) cleaned = ring.slice(0, -1);
	}
	if (cleaned.length < 3) return { closed: true, winding, commands: [] };
	const commands: PathCommand[] = [
		{ type: 'M', x: Math.round(cleaned[0][0]), y: Math.round(cleaned[0][1]) }
	];
	for (let i = 1; i < cleaned.length; i++)
		commands.push({ type: 'L', x: Math.round(cleaned[i][0]), y: Math.round(cleaned[i][1]) });
	commands.push({ type: 'Z' });
	return { closed: true, winding, commands };
};

export type PathOp = 'union' | 'intersection' | 'difference' | 'xor';

/**
 * Run a boolean operation across the supplied contours. For union/xor the
 * order is irrelevant; for difference, contours[0] is the subject and the
 * rest are subtracted from it.
 */
export const booleanContours = (
	contours: BezierContour[],
	op: PathOp
): BezierContour[] => {
	if (contours.length === 0) return [];
	const rings = contours.map((c) => contourToRing(c.commands));
	const polys = rings.map((r) => [r] as [number, number][][]);
	let merged: ReturnType<typeof polygonClipping.union>;
	try {
		if (op === 'union') merged = polygonClipping.union(polys[0], ...polys.slice(1));
		else if (op === 'intersection')
			merged = polygonClipping.intersection(polys[0], ...polys.slice(1));
		else if (op === 'xor') merged = polygonClipping.xor(polys[0], ...polys.slice(1));
		else merged = polygonClipping.difference(polys[0], ...polys.slice(1));
	} catch {
		return contours;
	}
	const out: BezierContour[] = [];
	for (const poly of merged) {
		for (let ringIdx = 0; ringIdx < poly.length; ringIdx++) {
			const ring = poly[ringIdx] as [number, number][];
			if (ring.length < 4) continue;
			out.push(ringToContour(ring, ringIdx === 0 ? 'ccw' : 'cw'));
		}
	}
	return out;
};

/**
 * Transform a set of on-curve points + their adjacent off-curve handles by a
 * 2D affine matrix [a b c d tx ty]. Equivalent to canvas transform: every
 * point becomes (a*x + c*y + tx, b*x + d*y + ty).
 */
export type AffineMatrix = { a: number; b: number; c: number; d: number; tx: number; ty: number };

export const transformPoints = (
	contours: BezierContour[],
	refs: PointRef[],
	m: AffineMatrix
): BezierContour[] => {
	if (refs.length === 0) return contours;
	const byContour = new Map<number, Set<number>>();
	for (const r of refs) {
		if (!byContour.has(r.contour)) byContour.set(r.contour, new Set());
		byContour.get(r.contour)!.add(r.index);
	}
	const apply = (x: number, y: number) => ({
		x: Math.round(m.a * x + m.c * y + m.tx),
		y: Math.round(m.b * x + m.d * y + m.ty)
	});
	return contours.map((c, ci) => {
		const set = byContour.get(ci);
		if (!set) return c;
		return {
			...c,
			commands: c.commands.map((cmd, i) => {
				if (!set.has(i)) return cmd;
				if (cmd.type === 'M' || cmd.type === 'L') {
					const p = apply(cmd.x, cmd.y);
					return { ...cmd, x: p.x, y: p.y };
				}
				if (cmd.type === 'Q') {
					const p = apply(cmd.x, cmd.y);
					const h = apply(cmd.x1, cmd.y1);
					return { ...cmd, x: p.x, y: p.y, x1: h.x, y1: h.y };
				}
				if (cmd.type === 'C') {
					const p = apply(cmd.x, cmd.y);
					const h1 = apply(cmd.x1, cmd.y1);
					const h2 = apply(cmd.x2, cmd.y2);
					return { ...cmd, x: p.x, y: p.y, x1: h1.x, y1: h1.y, x2: h2.x, y2: h2.y };
				}
				return cmd;
			})
		};
	});
};

/** Centroid of the bounding box of a set of selected points. */
export const selectionCentroid = (
	contours: BezierContour[],
	refs: PointRef[]
): { x: number; y: number } => {
	let minX = Infinity,
		maxX = -Infinity,
		minY = Infinity,
		maxY = -Infinity;
	let n = 0;
	for (const r of refs) {
		const cmd = contours[r.contour]?.commands[r.index];
		if (!cmd) continue;
		if (cmd.type === 'M' || cmd.type === 'L' || cmd.type === 'Q' || cmd.type === 'C') {
			minX = Math.min(minX, cmd.x);
			maxX = Math.max(maxX, cmd.x);
			minY = Math.min(minY, cmd.y);
			maxY = Math.max(maxY, cmd.y);
			n++;
		}
	}
	if (n === 0) return { x: 0, y: 0 };
	return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
};

/**
 * Re-sample existing contours into points, simplify with a Douglas-Peucker
 * pass, then refit cubic beziers. Useful for cleaning up traced outlines
 * that ended up with too many control points.
 */
export const simplifyContours = async (
	contours: BezierContour[],
	tolerance = 8,
	cubicMaxError = 60
): Promise<BezierContour[]> => {
	const { default: fitCurve } = await import('fit-curve');
	const out: BezierContour[] = [];
	for (const contour of contours) {
		const ring = contourToRing(contour.commands, 16);
		if (ring.length < 4) {
			out.push(contour);
			continue;
		}
		const simplified = dpSimplify(ring, tolerance);
		if (simplified.length < 4) {
			out.push(ringToContour(ring, contour.winding));
			continue;
		}
		// Close polygon for fit
		const closed = [...simplified, simplified[0]];
		let curves: number[][][];
		try {
			curves = fitCurve(closed, cubicMaxError) as number[][][];
		} catch {
			out.push(ringToContour(simplified, contour.winding));
			continue;
		}
		if (!curves || curves.length === 0) {
			out.push(ringToContour(simplified, contour.winding));
			continue;
		}
		const commands: PathCommand[] = [
			{
				type: 'M',
				x: Math.round(curves[0][0][0]),
				y: Math.round(curves[0][0][1])
			}
		];
		for (const curve of curves) {
			commands.push({
				type: 'C',
				x1: Math.round(curve[1][0]),
				y1: Math.round(curve[1][1]),
				x2: Math.round(curve[2][0]),
				y2: Math.round(curve[2][1]),
				x: Math.round(curve[3][0]),
				y: Math.round(curve[3][1])
			});
		}
		commands.push({ type: 'Z' });
		out.push({ closed: true, winding: contour.winding, commands });
	}
	return out;
};

/** Standalone Douglas-Peucker — exported so simplify can reuse it. */
export const dpSimplify = (points: [number, number][], tolerance: number): [number, number][] => {
	if (points.length < 3) return points.slice();
	const tolSq = tolerance * tolerance;
	const keep = new Uint8Array(points.length);
	keep[0] = 1;
	keep[points.length - 1] = 1;
	const stack: [number, number][] = [[0, points.length - 1]];
	while (stack.length > 0) {
		const [first, last] = stack.pop()!;
		let maxDist = 0;
		let idx = -1;
		for (let i = first + 1; i < last; i++) {
			const dx = points[last][0] - points[first][0];
			const dy = points[last][1] - points[first][1];
			const lenSq = dx * dx + dy * dy;
			let d: number;
			if (lenSq === 0) {
				const ex = points[i][0] - points[first][0];
				const ey = points[i][1] - points[first][1];
				d = ex * ex + ey * ey;
			} else {
				let t =
					((points[i][0] - points[first][0]) * dx + (points[i][1] - points[first][1]) * dy) / lenSq;
				t = Math.max(0, Math.min(1, t));
				const px = points[first][0] + t * dx;
				const py = points[first][1] + t * dy;
				const ex = points[i][0] - px;
				const ey = points[i][1] - py;
				d = ex * ex + ey * ey;
			}
			if (d > maxDist) {
				maxDist = d;
				idx = i;
			}
		}
		if (idx !== -1 && maxDist > tolSq) {
			keep[idx] = 1;
			stack.push([first, idx], [idx, last]);
		}
	}
	const out: [number, number][] = [];
	for (let i = 0; i < points.length; i++) if (keep[i]) out.push(points[i]);
	return out;
};

/** Chaikin smoothing: each polygon edge becomes 2 edges, corners get rounded. */
export const chaikinSmooth = (
	contours: BezierContour[],
	iterations: number
): BezierContour[] => {
	if (iterations <= 0) return contours;
	let current = contours;
	for (let iter = 0; iter < iterations; iter++) {
		current = current.map((c) => smoothContour(c));
	}
	return current;
};

const smoothContour = (contour: BezierContour): BezierContour => {
	const onCurve: { x: number; y: number }[] = [];
	for (const cmd of contour.commands) {
		if (cmd.type === 'M' || cmd.type === 'L') onCurve.push({ x: cmd.x, y: cmd.y });
	}
	if (onCurve.length < 3) return contour;
	const closed = contour.commands[contour.commands.length - 1]?.type === 'Z';
	const next: { x: number; y: number }[] = [];
	const pairCount = closed ? onCurve.length : onCurve.length - 1;
	for (let i = 0; i < pairCount; i++) {
		const a = onCurve[i];
		const b = onCurve[(i + 1) % onCurve.length];
		next.push({ x: 0.75 * a.x + 0.25 * b.x, y: 0.75 * a.y + 0.25 * b.y });
		next.push({ x: 0.25 * a.x + 0.75 * b.x, y: 0.25 * a.y + 0.75 * b.y });
	}
	if (!closed) {
		// keep last on-curve point
		next.push(onCurve[onCurve.length - 1]);
	}
	const newCmds: PathCommand[] = [{ type: 'M', x: next[0].x, y: next[0].y }];
	for (let i = 1; i < next.length; i++) newCmds.push({ type: 'L', x: next[i].x, y: next[i].y });
	if (closed) newCmds.push({ type: 'Z' });
	return { ...contour, commands: newCmds };
};
