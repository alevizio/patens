// Paste-glyph fallback: when the clipboard isn't a Patens glyph
// payload, try to interpret it as SVG path data — covers the common
// "copy from Figma / Illustrator / Inkscape and drop onto a glyph"
// workflow. Returns a populated Patens glyph patch ready for
// projectStore.updateGlyph(), or null on failure.

import type { BezierContour } from '$lib/font/types';

export type GlyphPastePatch = {
	contours: BezierContour[];
	advanceWidth: number;
};

export type FontMetricsForPaste = {
	ascender: number;
	descender: number;
	defaultSidebearing: number;
};

// Pulls SVG path d="..." strings out of arbitrary clipboard text.
// Accepts bare path data ("M 0 0 L 100 100"), a single <path d="…"/>
// tag, or a full <svg> document with one or more <path> elements.
export const extractSvgPathD = (text: string): string[] => {
	const trimmed = text.trim();
	if (!trimmed) return [];
	if (/^[MmLlHhVvCcSsQqTt]/.test(trimmed)) return [trimmed];
	const out: string[] = [];
	const re = /\sd\s*=\s*"([^"]+)"/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(text)) !== null) out.push(m[1]);
	return out;
};

// Returns a glyph patch if `text` parses as SVG path(s), or null.
// Scales the result to ~70% of the cap-height range so the pasted
// shape lands at a usable size; anchors the baseline at y=0.
export const parseSvgPasteToGlyph = async (
	text: string,
	metrics: FontMetricsForPaste
): Promise<GlyphPastePatch | null> => {
	const dStrings = extractSvgPathD(text);
	if (dStrings.length === 0) return null;
	const { parseSvgPath } = await import('$lib/font/svg-path');
	const { contourBounds: cb } = await import('$lib/font/path');
	const raw: BezierContour[] = [];
	for (const d of dStrings) raw.push(...parseSvgPath(d, { forceClose: true }));
	if (raw.length === 0) return null;
	const allCmds = raw.flatMap((c) => c.commands);
	const bounds = cb(allCmds);
	const srcW = Math.max(bounds.maxX - bounds.minX, 1);
	const srcH = Math.max(bounds.maxY - bounds.minY, 1);
	const fontH = metrics.ascender - metrics.descender;
	const scale = (fontH * 0.7) / srcH;
	const reparsed: BezierContour[] = [];
	for (const d of dStrings) {
		reparsed.push(
			...parseSvgPath(d, {
				forceClose: true,
				transformPoint: (x, y) => {
					const cx = (bounds.minX + bounds.maxX) / 2;
					const cy = (bounds.minY + bounds.maxY) / 2;
					const fx = (x - cx) * scale + srcW * scale * 0.5;
					const fy = (cy - y) * scale + fontH * 0.35;
					return [Math.round(fx), Math.round(fy)];
				}
			})
		);
	}
	const advanceWidth = Math.round(srcW * scale + 2 * metrics.defaultSidebearing);
	return { contours: reparsed, advanceWidth };
};
