/**
 * Pure path-editing helpers used by the vector point editor.
 * All operations return new arrays — never mutate in place.
 */

import type { BezierContour, PathCommand } from './types';

export type PointRef = { contour: number; index: number };

export type OnCurvePoint = {
	contourIndex: number;
	pointIndex: number;
	x: number;
	y: number;
	cmdType: 'M' | 'L' | 'C' | 'Q';
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

export const movePoint = (
	contours: BezierContour[],
	ref: PointRef,
	x: number,
	y: number
): BezierContour[] => {
	const next = contours.map((c, ci) => {
		if (ci !== ref.contour) return c;
		return {
			...c,
			commands: c.commands.map((cmd, i) => {
				if (i !== ref.index) return cmd;
				if (cmd.type === 'M' || cmd.type === 'L' || cmd.type === 'C' || cmd.type === 'Q') {
					return { ...cmd, x, y };
				}
				return cmd;
			})
		};
	});
	return next;
};

export const deletePoint = (contours: BezierContour[], ref: PointRef): BezierContour[] => {
	const target = contours[ref.contour];
	if (!target) return contours;
	const cmds = target.commands;
	const onCurveCount = cmds.filter(
		(c) => c.type === 'M' || c.type === 'L' || c.type === 'C' || c.type === 'Q'
	).length;
	if (onCurveCount <= 3) {
		// Removing leaves a degenerate contour — drop it.
		return contours.filter((_, ci) => ci !== ref.contour);
	}
	let newCmds = cmds.filter((_, i) => i !== ref.index);
	// If we removed the M, promote the next on-curve to M.
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
