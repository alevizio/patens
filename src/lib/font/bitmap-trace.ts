/**
 * Bitmap-to-vector tracing for the reference image workflow.
 *
 * Pipeline:
 *   1. Rasterise the data URL into an offscreen canvas (capped resolution).
 *   2. Grayscale + threshold to a binary mask.
 *   3. Moore-Neighbor contour tracing — walk every closed boundary.
 *   4. Douglas-Peucker simplification (reuses dpSimplify from path-edit).
 *   5. Schneider cubic-bezier fitting via fit-curve.
 *   6. Scale + flip the contours into font space (Y+ up, origin baseline).
 *
 * Designed for the "drop letterform photo, click Trace" loop. Output is
 * intentionally a starting point for refinement, not a finished glyph.
 */

import type { BezierContour, PathCommand } from './types';
import { dpSimplify } from './path-edit';
import { reverseContour, signedArea } from './path';

export type TraceOptions = {
	/** 0-255 threshold; below = ink. Default 128. */
	threshold?: number;
	/** Treat dark pixels as ink. Default true. */
	darkIsInk?: boolean;
	/** Resolution cap (longest side); higher = more detail but slower. */
	maxDimension?: number;
	/** Douglas-Peucker tolerance in pixels. Default 1.5. */
	simplifyTolerance?: number;
	/** Bezier fit max error in pixels. Default 4. */
	cubicMaxError?: number;
	/** Drop contours shorter than this (in points). Default 8. */
	minPoints?: number;
	/** Brightness adjustment, -100 to 100. Default 0. */
	brightness?: number;
	/** Contrast adjustment, -100 to 100. Default 0. */
	contrast?: number;
};

const DEFAULTS: Required<TraceOptions> = {
	threshold: 128,
	darkIsInk: true,
	maxDimension: 480,
	simplifyTolerance: 1.5,
	cubicMaxError: 4,
	minPoints: 8,
	brightness: 0,
	contrast: 0
};

type Point = { x: number; y: number };

/**
 * Trace a data URL into contours, mapped into a font-space box. The output
 * is anchored to (boxX, boxY) with width = boxWidth; height is derived from
 * the source aspect ratio.
 */
export const traceBitmapToContours = async (
	dataUrl: string,
	box: { x: number; y: number; width: number; height: number },
	options?: TraceOptions
): Promise<BezierContour[]> => {
	const opts = { ...DEFAULTS, ...(options ?? {}) };
	const { default: fitCurve } = await import('fit-curve');

	const img = await loadImage(dataUrl);
	const longest = Math.max(img.naturalWidth, img.naturalHeight);
	const scale = Math.min(1, opts.maxDimension / longest);
	const w = Math.max(2, Math.round(img.naturalWidth * scale));
	const h = Math.max(2, Math.round(img.naturalHeight * scale));

	const canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext('2d', { willReadFrequently: true });
	if (!ctx) throw new Error('2d context unavailable');
	ctx.drawImage(img, 0, 0, w, h);
	const data = ctx.getImageData(0, 0, w, h).data;

	// Apply brightness + contrast in -100..100 space, then threshold.
	// brightness: shifts the curve up/down by ±brightness*1.275 in 0..255 space.
	// contrast: scales around the midpoint (128). +100 = 2× contrast, -100 = 0.
	const bAdd = (opts.brightness / 100) * 127.5;
	const cMul = 1 + opts.contrast / 100;
	const adjust = (v: number) => {
		const stretched = (v - 128) * cMul + 128 + bAdd;
		return stretched < 0 ? 0 : stretched > 255 ? 255 : stretched;
	};

	// Binary mask: 1 = ink, 0 = background. Includes a 1-px border of 0s so
	// boundary tracing doesn't run off the edge.
	const stride = w + 2;
	const mask = new Uint8Array((w + 2) * (h + 2));
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const o = (y * w + x) * 4;
			const a = data[o + 3];
			if (a < 32) continue; // transparent pixels = background
			const lumRaw = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
			const lum = adjust(lumRaw);
			const isDark = lum < opts.threshold;
			const isInk = opts.darkIsInk ? isDark : !isDark;
			if (isInk) mask[(y + 1) * stride + (x + 1)] = 1;
		}
	}

	const isInk = (x: number, y: number): boolean => mask[y * stride + x] === 1;

	const contours: Point[][] = [];
	const visited = new Uint8Array(mask.length); // visited start positions

	for (let y = 1; y <= h; y++) {
		for (let x = 1; x <= w; x++) {
			if (!isInk(x, y)) continue;
			// Outer boundary if pixel to the left is background and not visited
			if (isInk(x - 1, y)) continue;
			const idx = y * stride + x;
			if (visited[idx]) continue;
			const pts = mooreTrace(isInk, x, y, w, h);
			if (pts.length >= opts.minPoints) contours.push(pts);
			for (const p of pts) {
				visited[(p.y | 0) * stride + (p.x | 0)] = 1;
			}
		}
	}

	// Map pixel-space contours into font-space box.
	const sx = box.width / w;
	const sy = box.height / h;
	const fontContours: BezierContour[] = [];
	for (const pts of contours) {
		const tuples = pts.map((p) => [p.x, p.y] as [number, number]);
		const simplified = dpSimplify(tuples, opts.simplifyTolerance);
		if (simplified.length < 4) continue;
		// Fit cubic beziers
		let cubics: Array<[[number, number], [number, number], [number, number], [number, number]]>;
		try {
			cubics = fitCurve(simplified, opts.cubicMaxError);
		} catch {
			continue;
		}
		if (!cubics || cubics.length === 0) continue;
		const commands: PathCommand[] = [];
		const toFont = (p: [number, number]): { x: number; y: number } => ({
			// X: pixel * scaleX + boxX
			x: Math.round(p[0] * sx + box.x),
			// Y: flip image-Y (down) to font-Y (up). Top of image = top of box.
			y: Math.round(box.y + box.height - p[1] * sy)
		});
		const start = toFont(cubics[0][0]);
		commands.push({ type: 'M', x: start.x, y: start.y });
		for (const seg of cubics) {
			const c1 = toFont(seg[1]);
			const c2 = toFont(seg[2]);
			const end = toFont(seg[3]);
			commands.push({
				type: 'C',
				x1: c1.x,
				y1: c1.y,
				x2: c2.x,
				y2: c2.y,
				x: end.x,
				y: end.y
			});
		}
		commands.push({ type: 'Z' });
		const area = signedArea(commands);
		const winding: 'cw' | 'ccw' = area >= 0 ? 'cw' : 'ccw';
		// Font-space convention: outer contours CW. Largest area is the outer
		// contour; smaller contours nested inside (counters) should be CCW.
		const contour: BezierContour = { commands, closed: true, winding };
		fontContours.push(contour);
	}

	// Enforce outer-CW / inner-CCW by area magnitude.
	if (fontContours.length > 1) {
		// Largest first
		fontContours.sort(
			(a, b) => Math.abs(signedArea(b.commands)) - Math.abs(signedArea(a.commands))
		);
		for (let i = 0; i < fontContours.length; i++) {
			const desired: 'cw' | 'ccw' = i === 0 ? 'cw' : 'ccw';
			if (fontContours[i].winding !== desired) {
				fontContours[i] = {
					...fontContours[i],
					commands: reverseContour(fontContours[i].commands),
					winding: desired
				};
			}
		}
	}

	return fontContours;
};

const loadImage = (src: string): Promise<HTMLImageElement> =>
	new Promise((resolve, reject) => {
		const img = new window.Image();
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = src;
	});

/**
 * Moore-Neighbor contour tracing. Starts at (sx, sy) which must be an ink
 * pixel with a background pixel to its left. Walks clockwise around the
 * boundary back to start.
 *
 * Returns the pixel-space point chain along the boundary.
 */
const mooreTrace = (
	isInk: (x: number, y: number) => boolean,
	sx: number,
	sy: number,
	w: number,
	h: number
): Point[] => {
	// 8-neighbour offsets, clockwise starting from west
	const neighbours: Array<[number, number]> = [
		[-1, 0],
		[-1, -1],
		[0, -1],
		[1, -1],
		[1, 0],
		[1, 1],
		[0, 1],
		[-1, 1]
	];
	const points: Point[] = [{ x: sx, y: sy }];
	let cx = sx;
	let cy = sy;
	// We arrived at (sx,sy) from the west (background pixel to the left).
	// prevDir = direction from current pixel back to where we came from.
	let prevDir = 0; // W
	let steps = 0;
	const maxSteps = w * h * 4;
	while (steps < maxSteps) {
		steps++;
		// Look clockwise starting at the position immediately clockwise of prevDir
		let found = false;
		for (let i = 0; i < 8; i++) {
			const dir = (prevDir + 1 + i) & 7;
			const [dx, dy] = neighbours[dir];
			const nx = cx + dx;
			const ny = cy + dy;
			if (nx < 1 || nx > w || ny < 1 || ny > h) continue;
			if (!isInk(nx, ny)) continue;
			cx = nx;
			cy = ny;
			prevDir = (dir + 4) & 7;
			points.push({ x: cx, y: cy });
			found = true;
			// Closed loop?
			if (cx === sx && cy === sy && points.length > 3) return points;
			break;
		}
		if (!found) break; // isolated pixel
	}
	return points;
};
