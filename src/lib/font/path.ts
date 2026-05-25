/**
 * Bezier path utilities — winding, bbox, integer rounding, opentype.js bridge.
 */

import type { BezierContour, PathCommand } from './types';

/** Compute signed area of a polygon (positive = CCW in math/font space). */
export const signedArea = (commands: PathCommand[]): number => {
	const pts = sampleContour(commands, 24);
	let sum = 0;
	for (let i = 0; i < pts.length; i++) {
		const a = pts[i];
		const b = pts[(i + 1) % pts.length];
		sum += (b.x - a.x) * (b.y + a.y);
	}
	return -sum / 2;
};

export const computeWinding = (commands: PathCommand[]): 'cw' | 'ccw' =>
	signedArea(commands) >= 0 ? 'ccw' : 'cw';

export const reverseContour = (commands: PathCommand[]): PathCommand[] => {
	// Reversing bezier handles requires swapping x1<->x2.
	let mx = 0,
		my = 0;
	for (const c of commands) {
		if (c.type === 'M') {
			mx = c.x;
			my = c.y;
		}
	}

	const result: PathCommand[] = [];
	const segments: PathCommand[] = commands.filter((c) => c.type !== 'Z' && c.type !== 'M');
	const start = { x: mx, y: my };
	const points: { x: number; y: number }[] = [start];
	for (const seg of segments) {
		if (seg.type === 'L' || seg.type === 'C' || seg.type === 'Q') {
			points.push({ x: seg.x, y: seg.y });
		}
	}
	// Walk in reverse, swapping bezier handle order for C/Q.
	result.push({ type: 'M', x: points[points.length - 1].x, y: points[points.length - 1].y });
	for (let i = segments.length - 1; i >= 0; i--) {
		const seg = segments[i];
		const target = points[i];
		if (seg.type === 'L') result.push({ type: 'L', x: target.x, y: target.y });
		else if (seg.type === 'C')
			result.push({
				type: 'C',
				x1: seg.x2,
				y1: seg.y2,
				x2: seg.x1,
				y2: seg.y1,
				x: target.x,
				y: target.y
			});
		else if (seg.type === 'Q')
			result.push({ type: 'Q', x1: seg.x1, y1: seg.y1, x: target.x, y: target.y });
	}
	if (commands[commands.length - 1]?.type === 'Z') result.push({ type: 'Z' });
	return result;
};

/** Ensure outer contours are CCW (font convention) and inner CW. Pass `desired` per contour. */
export const enforceWinding = (
	contour: BezierContour,
	desired: 'cw' | 'ccw'
): BezierContour => {
	const current = computeWinding(contour.commands);
	if (current === desired) return { ...contour, winding: desired };
	return {
		...contour,
		winding: desired,
		commands: reverseContour(contour.commands)
	};
};

/** Round all coordinates to integer font units (required for clean rendering). */
export const roundToFontUnits = (commands: PathCommand[]): PathCommand[] =>
	commands.map((c) => {
		if (c.type === 'M' || c.type === 'L') return { ...c, x: Math.round(c.x), y: Math.round(c.y) };
		if (c.type === 'Q')
			return { ...c, x1: Math.round(c.x1), y1: Math.round(c.y1), x: Math.round(c.x), y: Math.round(c.y) };
		if (c.type === 'C')
			return {
				...c,
				x1: Math.round(c.x1),
				y1: Math.round(c.y1),
				x2: Math.round(c.x2),
				y2: Math.round(c.y2),
				x: Math.round(c.x),
				y: Math.round(c.y)
			};
		return c;
	});

/** Sample N points along a contour for bbox/area calculations. */
export const sampleContour = (
	commands: PathCommand[],
	stepsPerCurve = 16
): { x: number; y: number }[] => {
	const out: { x: number; y: number }[] = [];
	let cx = 0,
		cy = 0;
	for (const c of commands) {
		if (c.type === 'M' || c.type === 'L') {
			out.push({ x: c.x, y: c.y });
			cx = c.x;
			cy = c.y;
		} else if (c.type === 'Q') {
			for (let i = 1; i <= stepsPerCurve; i++) {
				const t = i / stepsPerCurve;
				const mt = 1 - t;
				out.push({
					x: mt * mt * cx + 2 * mt * t * c.x1 + t * t * c.x,
					y: mt * mt * cy + 2 * mt * t * c.y1 + t * t * c.y
				});
			}
			cx = c.x;
			cy = c.y;
		} else if (c.type === 'C') {
			for (let i = 1; i <= stepsPerCurve; i++) {
				const t = i / stepsPerCurve;
				const mt = 1 - t;
				out.push({
					x:
						mt * mt * mt * cx +
						3 * mt * mt * t * c.x1 +
						3 * mt * t * t * c.x2 +
						t * t * t * c.x,
					y:
						mt * mt * mt * cy +
						3 * mt * mt * t * c.y1 +
						3 * mt * t * t * c.y2 +
						t * t * t * c.y
				});
			}
			cx = c.x;
			cy = c.y;
		}
	}
	return out;
};

export const contourBounds = (
	commands: PathCommand[]
): { minX: number; minY: number; maxX: number; maxY: number } => {
	const pts = sampleContour(commands, 16);
	if (pts.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
	let minX = Infinity,
		minY = Infinity,
		maxX = -Infinity,
		maxY = -Infinity;
	for (const p of pts) {
		if (p.x < minX) minX = p.x;
		if (p.x > maxX) maxX = p.x;
		if (p.y < minY) minY = p.y;
		if (p.y > maxY) maxY = p.y;
	}
	return { minX, minY, maxX, maxY };
};

export const glyphBounds = (
	contours: BezierContour[]
): { minX: number; minY: number; maxX: number; maxY: number } => {
	if (contours.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
	let minX = Infinity,
		minY = Infinity,
		maxX = -Infinity,
		maxY = -Infinity;
	for (const c of contours) {
		const b = contourBounds(c.commands);
		if (b.minX < minX) minX = b.minX;
		if (b.maxX > maxX) maxX = b.maxX;
		if (b.minY < minY) minY = b.minY;
		if (b.maxY > maxY) maxY = b.maxY;
	}
	return {
		minX: isFinite(minX) ? minX : 0,
		minY: isFinite(minY) ? minY : 0,
		maxX: isFinite(maxX) ? maxX : 0,
		maxY: isFinite(maxY) ? maxY : 0
	};
};

/** Convert one contour to an SVG path string for previews. Y is NOT flipped here. */
export const contourToSvgPath = (commands: PathCommand[]): string => {
	const out: string[] = [];
	for (const c of commands) {
		if (c.type === 'M') out.push(`M ${c.x} ${c.y}`);
		else if (c.type === 'L') out.push(`L ${c.x} ${c.y}`);
		else if (c.type === 'Q') out.push(`Q ${c.x1} ${c.y1} ${c.x} ${c.y}`);
		else if (c.type === 'C') out.push(`C ${c.x1} ${c.y1} ${c.x2} ${c.y2} ${c.x} ${c.y}`);
		else if (c.type === 'Z') out.push('Z');
	}
	return out.join(' ');
};

export const contoursToSvgPath = (contours: BezierContour[]): string =>
	contours.map((c) => contourToSvgPath(c.commands)).join(' ');
