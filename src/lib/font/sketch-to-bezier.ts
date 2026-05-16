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
import polygonClipping from 'polygon-clipping';
import fitCurve from 'fit-curve';
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

export type TraceStyle = {
	/** Use Schneider cubic bezier fitting instead of polyline+Chaikin. */
	cubic: boolean;
	/** Squared error tolerance when cubic fitting (5–500). Higher = fewer, smoother curves. */
	cubicMaxError: number;
};

export const DEFAULT_TRACE: TraceStyle = {
	cubic: true,
	cubicMaxError: 60
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

const polygonToContour = (
	poly: [number, number][],
	winding: 'cw' | 'ccw' = 'ccw'
): BezierContour => {
	if (poly.length === 0) return { closed: true, winding, commands: [] };
	const commands: PathCommand[] = [{ type: 'M', x: poly[0][0], y: poly[0][1] }];
	for (let i = 1; i < poly.length; i++) {
		commands.push({ type: 'L', x: poly[i][0], y: poly[i][1] });
	}
	commands.push({ type: 'Z' });
	return { closed: true, winding, commands };
};

/** Convert a closed polygon to a contour of cubic bezier curves via Schneider's algorithm. */
const polygonToCubicContour = (
	poly: [number, number][],
	winding: 'cw' | 'ccw' = 'ccw',
	maxError = 60
): BezierContour => {
	if (poly.length < 4) return polygonToContour(poly, winding);
	// Close the polygon so fitCurve produces a closed curve sequence
	const pts: [number, number][] = [...poly, poly[0]];
	let curves: number[][][];
	try {
		curves = fitCurve(pts, maxError) as number[][][];
	} catch {
		return polygonToContour(poly, winding);
	}
	if (!curves || curves.length === 0) return polygonToContour(poly, winding);

	const commands: PathCommand[] = [
		{ type: 'M', x: curves[0][0][0], y: curves[0][0][1] }
	];
	for (const curve of curves) {
		commands.push({
			type: 'C',
			x1: curve[1][0],
			y1: curve[1][1],
			x2: curve[2][0],
			y2: curve[2][1],
			x: curve[3][0],
			y: curve[3][1]
		});
	}
	commands.push({ type: 'Z' });
	return { closed: true, winding, commands };
};

const strokeToOutlinePolygon = (
	stroke: SketchStroke,
	style: StrokeStyle
): [number, number][] | null => {
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
	return simplified;
};

/** Convert one sketch stroke into a closed contour (without union). */
export const strokeToContour = (
	stroke: SketchStroke,
	style: StrokeStyle = DEFAULT_STROKE
): BezierContour | null => {
	const poly = strokeToOutlinePolygon(stroke, style);
	return poly ? polygonToContour(poly) : null;
};

/**
 * Convert all sketch strokes into vector contours, merging overlapping strokes
 * with a polygon boolean union. The result is a clean silhouette for multi-stroke
 * letters like H, A, X — each MultiPolygon ring becomes a separate contour with
 * outer rings winding CCW and holes CW (CFF convention).
 *
 * When `trace.cubic` is true (default), each ring is fitted with Schneider's
 * cubic-bezier algorithm producing smooth curves instead of polyline edges.
 */
export const sketchToContours = (
	strokes: SketchStroke[],
	style: StrokeStyle = DEFAULT_STROKE,
	trace: TraceStyle = DEFAULT_TRACE
): BezierContour[] => {
	const polys: [number, number][][] = [];
	for (const s of strokes) {
		const p = strokeToOutlinePolygon(s, style);
		if (p) polys.push(p);
	}
	if (polys.length === 0) return [];

	const ringToContour = (ring: [number, number][], winding: 'cw' | 'ccw'): BezierContour =>
		trace.cubic
			? polygonToCubicContour(ring, winding, trace.cubicMaxError)
			: polygonToContour(ring, winding);

	if (polys.length === 1) return [ringToContour(polys[0], 'ccw')];

	let merged;
	try {
		const geoms = polys.map((p) => [p] as [number, number][][]);
		merged = polygonClipping.union(geoms[0], ...geoms.slice(1));
	} catch {
		return polys.map((p) => ringToContour(p, 'ccw'));
	}

	const out: BezierContour[] = [];
	for (const poly of merged) {
		for (let ringIdx = 0; ringIdx < poly.length; ringIdx++) {
			const ring = poly[ringIdx];
			if (ring.length < 4) continue;
			const last = ring[ring.length - 1];
			const first = ring[0];
			const cleaned: [number, number][] =
				last[0] === first[0] && last[1] === first[1] ? ring.slice(0, -1) : ring.slice();
			out.push(ringToContour(cleaned, ringIdx === 0 ? 'ccw' : 'cw'));
		}
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
