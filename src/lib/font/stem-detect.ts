/**
 * Quick stem-width detection for the current glyph. Rasterizes the contour
 * silhouette to a small bitmap at known y-positions, walks each scanline,
 * and reports each ink run's width in font units.
 *
 * Useful for stem consistency QA across n, h, b, d, l, m, p, q, u — they
 * should all share a vertical-stem thickness.
 */

import type { BezierContour } from './types';
import { contoursToSvgPath } from './path';

const RASTER_WIDTH = 400;

export type StemMeasurement = {
	/** Y position in font units the slice was taken at. */
	y: number;
	/** Each run's [startX, width] in font units, ink only. */
	runs: Array<{ x: number; width: number }>;
};

/**
 * Sample horizontal slices through the glyph and return ink-run widths.
 * Slices are picked at metric heights typical for stem measurement.
 */
export const detectStemWidths = async (
	contours: BezierContour[],
	bbox: { minX: number; maxX: number; minY: number; maxY: number },
	advanceWidth: number,
	metrics: { capHeight: number; xHeight: number }
): Promise<StemMeasurement[]> => {
	if (contours.length === 0) return [];
	const width = advanceWidth;
	const totalHeight = bbox.maxY - bbox.minY;
	if (totalHeight <= 0) return [];

	const pxPerUnit = RASTER_WIDTH / Math.max(width, 200);
	const w = Math.max(2, Math.round(width * pxPerUnit));
	const h = Math.max(2, Math.round(totalHeight * pxPerUnit));

	const canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext('2d', { willReadFrequently: true });
	if (!ctx) return [];
	ctx.fillStyle = 'white';
	ctx.fillRect(0, 0, w, h);
	ctx.save();
	// Map font space (Y+ up, origin baseline) into canvas (Y+ down)
	ctx.scale(pxPerUnit, -pxPerUnit);
	ctx.translate(0, -bbox.maxY);
	ctx.fillStyle = 'black';
	const path = new Path2D(contoursToSvgPath(contours));
	ctx.fill(path, 'evenodd');
	ctx.restore();

	const data = ctx.getImageData(0, 0, w, h).data;
	// Pick reasonable Y slices: middle of x-height, middle of cap, mid-stem.
	const yCandidates = [
		metrics.xHeight / 2,
		metrics.capHeight / 2,
		metrics.xHeight * 0.8,
		metrics.capHeight * 0.8
	].filter((y) => y >= bbox.minY && y <= bbox.maxY);

	const out: StemMeasurement[] = [];
	for (const yFont of yCandidates) {
		// canvas y from font y: rowPx = (bbox.maxY - yFont) * pxPerUnit
		const rowPx = Math.round((bbox.maxY - yFont) * pxPerUnit);
		if (rowPx < 0 || rowPx >= h) continue;
		const runs: Array<{ x: number; width: number }> = [];
		let runStart: number | null = null;
		for (let x = 0; x < w; x++) {
			const o = (rowPx * w + x) * 4;
			const isInk = data[o] < 128; // black
			if (isInk && runStart === null) runStart = x;
			else if (!isInk && runStart !== null) {
				const widthFont = Math.round((x - runStart) / pxPerUnit);
				if (widthFont >= 10) {
					runs.push({ x: Math.round(runStart / pxPerUnit), width: widthFont });
				}
				runStart = null;
			}
		}
		if (runStart !== null) {
			const widthFont = Math.round((w - runStart) / pxPerUnit);
			if (widthFont >= 10) {
				runs.push({ x: Math.round(runStart / pxPerUnit), width: widthFont });
			}
		}
		if (runs.length > 0) out.push({ y: Math.round(yFont), runs });
	}
	return out;
};
