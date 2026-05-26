// Per-glyph export helpers: PNG render, SVG download, SVG-path copy.
// Pure DOM-side utilities — no reactive state, no projectStore. The
// editor +page glues them up with `toast` confirmations.

import { glyphBounds, contoursToSvgPath } from '$lib/font/path';
import type { Glyph } from '$lib/font/types';

export type FontMetrics = { ascender: number; descender: number };

const safeFileName = (name: string | undefined) =>
	(name || 'glyph').replace(/[^a-zA-Z0-9_-]/g, '_');

// PNG: 800px wide raster at the glyph + 60u of padding on each side,
// black on white. Used for the editor's "PNG" export button.
export const downloadGlyphPng = (
	glyph: Glyph,
	metrics: FontMetrics
): Promise<string | null> => {
	if (glyph.contours.length === 0) return Promise.resolve(null);
	const bounds = glyphBounds(glyph.contours);
	const padX = 60;
	const padY = 60;
	const left = Math.min(0, bounds.minX) - padX;
	const right = Math.max(glyph.advanceWidth, bounds.maxX) + padX;
	const top = metrics.ascender + padY;
	const bottom = metrics.descender - padY;
	const width = right - left;
	const height = top - bottom;
	const px = 800;
	const scale = px / width;
	const c = document.createElement('canvas');
	c.width = Math.round(px);
	c.height = Math.round(height * scale);
	const ctx = c.getContext('2d');
	if (!ctx) return Promise.resolve(null);
	ctx.fillStyle = 'white';
	ctx.fillRect(0, 0, c.width, c.height);
	ctx.save();
	ctx.translate(-left * scale, top * scale);
	ctx.scale(scale, -scale);
	ctx.fillStyle = 'black';
	ctx.fill(new Path2D(contoursToSvgPath(glyph.contours)), 'evenodd');
	ctx.restore();
	return new Promise((resolve) => {
		c.toBlob((blob) => {
			if (!blob) {
				resolve(null);
				return;
			}
			const safeName = safeFileName(glyph.name);
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${safeName}.png`;
			a.click();
			URL.revokeObjectURL(url);
			resolve(`${safeName}.png`);
		}, 'image/png');
	});
};

// SVG: viewBox-flipped so the path uses on-glyph Y-up coordinates
// directly. 40u padding around the glyph + advance.
export const downloadGlyphSvg = (glyph: Glyph, metrics: FontMetrics): void => {
	if (glyph.contours.length === 0) return;
	const bounds = glyphBounds(glyph.contours);
	const padX = 40;
	const padY = 40;
	const left = Math.min(0, bounds.minX) - padX;
	const right = Math.max(glyph.advanceWidth, bounds.maxX) + padX;
	const top = metrics.ascender + padY;
	const bottom = metrics.descender - padY;
	const width = right - left;
	const height = top - bottom;
	const pathD = contoursToSvgPath(glyph.contours);
	const safeName = safeFileName(glyph.name);
	const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${left} ${-top} ${width} ${height}" width="${width}" height="${height}">
	<g transform="scale(1, -1)">
		<path d="${pathD}" fill="black" fill-rule="evenodd" />
	</g>
</svg>
`;
	const blob = new Blob([svg], { type: 'image/svg+xml' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${safeName}.svg`;
	a.click();
	URL.revokeObjectURL(url);
};

// Resolves to the path d attribute string. Caller writes it to the
// clipboard and shows the toast — keeps clipboard-permission failure
// handling at the call site.
export const glyphSvgPathString = (glyph: Glyph): string | null => {
	if (glyph.contours.length === 0) return null;
	return contoursToSvgPath(glyph.contours);
};
