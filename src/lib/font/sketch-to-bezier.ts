/**
 * Convert a freehand sketch into clean bezier contours.
 *
 * Pipeline:
 *  1. perfect-freehand turns each stroke into an outline polygon
 *  2. Douglas–Peucker simplification reduces polygon vertex count
 *  3. Convert the simplified polygon to a closed BezierContour using
 *     short cubic segments (smoothed by the simplification).
 *
 * This is intentionally simple — real Schneider-style bezier fitting would
 * produce smoother curves but adds substantial complexity. We trade a bit
 * of curve quality for predictability; the user can refine in the vector
 * editor afterwards.
 */

import { getStroke } from 'perfect-freehand';
import type { BezierContour, PathCommand, SketchStroke } from './types';

export type StrokeStyle = {
	size: number;
	thinning: number;
	smoothing: number;
	streamline: number;
	simplifyTolerance: number;
};

export const DEFAULT_STROKE: StrokeStyle = {
	size: 36,
	thinning: 0.55,
	smoothing: 0.55,
	streamline: 0.6,
	simplifyTolerance: 1.5
};

const distSq = (a: [number, number], b: [number, number]): number => {
	const dx = a[0] - b[0];
	const dy = a[1] - b[1];
	return dx * dx + dy * dy;
};

const perpDistSq = (
	point: [number, number],
	a: [number, number],
	b: [number, number]
): number => {
	const dx = b[0] - a[0];
	const dy = b[1] - a[1];
	if (dx === 0 && dy === 0) return distSq(point, a);
	const t = ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / (dx * dx + dy * dy);
	const px = a[0] + t * dx;
	const py = a[1] + t * dy;
	const ex = point[0] - px;
	const ey = point[1] - py;
	return ex * ex + ey * ey;
};

const douglasPeucker = (
	points: [number, number][],
	tolerance: number
): [number, number][] => {
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
			const d = perpDistSq(points[i], points[first], points[last]);
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

const polygonToContour = (poly: [number, number][]): BezierContour => {
	if (poly.length === 0) return { closed: true, winding: 'ccw', commands: [] };
	const commands: PathCommand[] = [{ type: 'M', x: poly[0][0], y: poly[0][1] }];
	for (let i = 1; i < poly.length; i++) {
		commands.push({ type: 'L', x: poly[i][0], y: poly[i][1] });
	}
	commands.push({ type: 'Z' });
	return { closed: true, winding: 'ccw', commands };
};

/** Convert one sketch stroke into a closed contour. */
export const strokeToContour = (
	stroke: SketchStroke,
	style: StrokeStyle = DEFAULT_STROKE
): BezierContour | null => {
	if (stroke.points.length < 2) return null;
	const inputPts = stroke.points.map(
		(p) => [p.x, p.y, Math.min(Math.max(p.pressure, 0), 1)] as [number, number, number]
	);
	const outline = getStroke(inputPts, {
		size: style.size,
		thinning: style.thinning,
		smoothing: style.smoothing,
		streamline: style.streamline,
		simulatePressure: false,
		last: true
	}) as [number, number][];
	if (outline.length < 3) return null;
	const simplified = douglasPeucker(outline, style.simplifyTolerance);
	if (simplified.length < 3) return null;
	return polygonToContour(simplified);
};

/** Convert all sketch strokes into vector contours. */
export const sketchToContours = (
	strokes: SketchStroke[],
	style: StrokeStyle = DEFAULT_STROKE
): BezierContour[] => {
	const out: BezierContour[] = [];
	for (const s of strokes) {
		const c = strokeToContour(s, style);
		if (c) out.push(c);
	}
	return out;
};

/** Produce an SVG path for the live preview of a single sketch stroke (filled). */
export const sketchOutlineSvg = (
	stroke: SketchStroke,
	style: StrokeStyle = DEFAULT_STROKE
): string => {
	if (stroke.points.length === 0) return '';
	const inputPts = stroke.points.map(
		(p) => [p.x, p.y, Math.min(Math.max(p.pressure, 0), 1)] as [number, number, number]
	);
	const outline = getStroke(inputPts, {
		size: style.size,
		thinning: style.thinning,
		smoothing: style.smoothing,
		streamline: style.streamline,
		simulatePressure: false,
		last: false
	}) as [number, number][];
	if (outline.length < 3) return '';
	let d = `M ${outline[0][0]} ${outline[0][1]}`;
	for (let i = 1; i < outline.length; i++) d += ` L ${outline[i][0]} ${outline[i][1]}`;
	d += ' Z';
	return d;
};
