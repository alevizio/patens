/**
 * Pure path-editing helpers used by the vector point editor.
 * All operations return new arrays — never mutate in place.
 */

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
