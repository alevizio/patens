// Pure path-edit transformations — given input contours and a few
// scalar parameters, return new contours (or null when the edit is a
// no-op). The editor's reactive handlers wrap these with null-guards
// + projectStore.updateGlyph calls.
//
// All functions are deterministic, side-effect free, and easy to test.

import { glyphBounds } from '$lib/font/path';
import {
	transformPoints,
	simplifyContours,
	type AffineMatrix
} from '$lib/font/path-edit';
import type { BezierContour, FontMetrics } from '$lib/font/types';

// Walk every M/L/Q/C command and round its coordinates to `step`.
// Q-cmd: round both the control point and endpoint. C-cmd: round all
// three. Z stays untouched. Used by both Snap-10u and the Auto-clean
// pipeline.
export const snapPointsToGrid = (
	contours: BezierContour[],
	step = 10
): BezierContour[] => {
	const snap = (n: number) => Math.round(n / step) * step;
	return contours.map((c) => ({
		...c,
		commands: c.commands.map((cmd) => {
			if (cmd.type === 'Z') return cmd;
			if (cmd.type === 'M' || cmd.type === 'L') {
				return { ...cmd, x: snap(cmd.x), y: snap(cmd.y) };
			}
			if (cmd.type === 'Q') {
				return {
					...cmd,
					x: snap(cmd.x),
					y: snap(cmd.y),
					x1: snap(cmd.x1),
					y1: snap(cmd.y1)
				};
			}
			return {
				...cmd,
				x: snap(cmd.x),
				y: snap(cmd.y),
				x1: snap(cmd.x1),
				y1: snap(cmd.y1),
				x2: snap(cmd.x2),
				y2: snap(cmd.y2)
			};
		})
	}));
};

// Reusable "every M/L/Q/C is selected" reference list — drives
// transformPoints when we want to apply a matrix to the whole glyph.
const allPointRefs = (contours: BezierContour[]) =>
	contours.flatMap((c, ci) =>
		c.commands
			.map((cmd, i) =>
				cmd.type === 'M' || cmd.type === 'L' || cmd.type === 'Q' || cmd.type === 'C'
					? { contour: ci, index: i }
					: null
			)
			.filter((r): r is { contour: number; index: number } => r !== null)
	);

// Mirror around the bbox center on the given axis.
export const flipContours = (
	contours: BezierContour[],
	axis: 'horizontal' | 'vertical'
): BezierContour[] => {
	const bounds = glyphBounds(contours);
	const cx = (bounds.minX + bounds.maxX) / 2;
	const cy = (bounds.minY + bounds.maxY) / 2;
	const m: AffineMatrix =
		axis === 'horizontal'
			? { a: -1, b: 0, c: 0, d: 1, tx: 2 * cx, ty: 0 }
			: { a: 1, b: 0, c: 0, d: -1, tx: 0, ty: 2 * cy };
	return transformPoints(contours, allPointRefs(contours), m);
};

// Scale around the bbox center. factor=1 is identity (caller should
// short-circuit if needed).
export const scaleContours = (
	contours: BezierContour[],
	factor: number
): BezierContour[] => {
	const bounds = glyphBounds(contours);
	const cx = (bounds.minX + bounds.maxX) / 2;
	const cy = (bounds.minY + bounds.maxY) / 2;
	const m: AffineMatrix = {
		a: factor,
		b: 0,
		c: 0,
		d: factor,
		tx: cx - factor * cx,
		ty: cy - factor * cy
	};
	return transformPoints(contours, allPointRefs(contours), m);
};

// Shift contours vertically so the bbox top hits cap-height / x-height
// or the bbox bottom sits on the baseline. Returns null when already
// aligned (caller short-circuits).
export const alignContoursVertically = (
	contours: BezierContour[],
	target: 'baseline' | 'capHeight' | 'xHeight',
	metrics: FontMetrics
): BezierContour[] | null => {
	const bounds = glyphBounds(contours);
	const dy =
		target === 'baseline'
			? -bounds.minY
			: target === 'capHeight'
				? metrics.capHeight - bounds.maxY
				: metrics.xHeight - bounds.maxY;
	if (dy === 0) return null;
	const m: AffineMatrix = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: Math.round(dy) };
	return transformPoints(contours, allPointRefs(contours), m);
};

// Shift contours horizontally so their bbox center matches advance/2.
// Returns null when already centred.
export const centerContoursHorizontally = (
	contours: BezierContour[],
	advanceWidth: number
): BezierContour[] | null => {
	const bounds = glyphBounds(contours);
	const targetCenter = advanceWidth / 2;
	const currentCenter = (bounds.minX + bounds.maxX) / 2;
	const dx = Math.round(targetCenter - currentCenter);
	if (dx === 0) return null;
	const m: AffineMatrix = { a: 1, b: 0, c: 0, d: 1, tx: dx, ty: 0 };
	return transformPoints(contours, allPointRefs(contours), m);
};

// Auto-space: shift to LSB = sb, compute the new bbox, set RSB = sb,
// recompute advance to fit. Returns the full mutation payload (caller
// merges with the rest of the glyph in projectStore.updateGlyph).
export type AutoSpacePatch = {
	contours: BezierContour[];
	leftSidebearing: number;
	rightSidebearing: number;
	advanceWidth: number;
};

export const autoSpaceContours = (
	contours: BezierContour[],
	defaultSidebearing: number
): AutoSpacePatch => {
	const bounds = glyphBounds(contours);
	const sb = defaultSidebearing;
	const dx = Math.round(sb - bounds.minX);
	const shifted =
		dx === 0
			? contours
			: contours.map((c) => ({
					...c,
					commands: c.commands.map((cmd) => {
						if (cmd.type === 'M' || cmd.type === 'L') return { ...cmd, x: cmd.x + dx };
						if (cmd.type === 'Q') return { ...cmd, x1: cmd.x1 + dx, x: cmd.x + dx };
						if (cmd.type === 'C')
							return { ...cmd, x1: cmd.x1 + dx, x2: cmd.x2 + dx, x: cmd.x + dx };
						return cmd;
					})
				}));
	const newBounds = glyphBounds(shifted);
	const width = newBounds.maxX - newBounds.minX;
	return {
		contours: shifted,
		leftSidebearing: sb,
		rightSidebearing: sb,
		advanceWidth: Math.max(50, Math.round(sb * 2 + width))
	};
};

// Auto-clean pipeline: simplify (re-sample + DP + refit cubics) →
// snap to 10u. Returns null when simplify yields empty geometry
// (caller surfaces a toast).
export const runAutoClean = async (
	contours: BezierContour[]
): Promise<BezierContour[] | null> => {
	const simplified = await simplifyContours(contours);
	if (simplified.length === 0) return null;
	return snapPointsToGrid(simplified, 10);
};
