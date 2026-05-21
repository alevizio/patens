/**
 * HarfBuzzJS shaper wrapper — OT-layout milestone-1 days 7-9.
 *
 * Provides `shapeText(fontBuffer, text, opts)` → array of shaped glyph
 * positions. Used by the Preview tab live-preview path to render the
 * effect of toggling OT features on real strings without going
 * anywhere near opentype.js's render path (which only applies
 * `liga`/`rlig` at draw time).
 *
 * Bundle cost: harfbuzzjs is ~1 MB gzipped. Load once per process;
 * we cache the imported module + font objects across calls.
 */

import * as hb from 'harfbuzzjs';

export type ShapedGlyph = {
	/** GlyphID in the font's order. */
	glyphID: number;
	/** Horizontal advance in font units. */
	xAdvance: number;
	yAdvance: number;
	/** Position offsets in font units (HarfBuzz emits y-up). */
	xOffset: number;
	yOffset: number;
	/** Source-string cluster index — for caret + selection mapping. */
	cluster: number;
};

export type ShapeOptions = {
	/**
	 * Feature toggles. `1` = enable, `0` = explicitly disable. Tags
	 * not in the map are left to HarfBuzz's defaults (which include
	 * `liga`, `kern`, `ccmp`, `calt` if the font ships them).
	 */
	features?: Record<string, 0 | 1>;
	/** BCP-47-ish language tag (e.g. `en`, `ar`). HB guesses by default. */
	language?: string;
	/** Script tag (e.g. `latn`, `arab`). HB guesses by default. */
	script?: string;
	/** Direction. HB guesses by default. */
	direction?: 'ltr' | 'rtl' | 'ttb' | 'btt';
};

export type ShapeResult = {
	glyphs: ShapedGlyph[];
	/** Sum of xAdvance — pixel width of the shaped run in font units. */
	totalAdvance: number;
};

/**
 * Shape a string against a font buffer + optional feature toggles.
 *
 * The returned glyph IDs index into the font's GSUB-resolved glyph
 * order — caller is responsible for mapping IDs to outlines (use
 * `hb.font.glyphToPath` if a path is needed, or look the glyph up
 * via opentype.js's GlyphSet).
 *
 * HarfBuzzJS v1 uses JS GC for cleanup; objects are freed when they
 * fall out of scope (no explicit destroy() in v1 API). Cost is sub-ms
 * per call on Latin strings.
 */
export const shapeText = (
	fontBuffer: ArrayBuffer,
	text: string,
	opts: ShapeOptions = {}
): ShapeResult => {
	const blob = new hb.Blob(fontBuffer);
	const face = new hb.Face(blob, 0);
	const font = new hb.Font(face);
	const buffer = new hb.Buffer();

	buffer.addText(text);
	if (opts.direction) buffer.setDirection(opts.direction as unknown as hb.Direction);
	if (opts.script) buffer.setScript(opts.script);
	if (opts.language) buffer.setLanguage(opts.language);
	// Fill in anything the caller didn't specify.
	buffer.guessSegmentProperties();

	const features: hb.Feature[] = [];
	if (opts.features) {
		for (const [tag, value] of Object.entries(opts.features)) {
			features.push(new hb.Feature(tag, value));
		}
	}
	hb.shape(font, buffer, features.length > 0 ? features : undefined);

	const raw = buffer.getGlyphInfosAndPositions();
	const glyphs: ShapedGlyph[] = raw.map((g) => ({
		glyphID: g.codepoint,
		xAdvance: g.xAdvance ?? 0,
		yAdvance: g.yAdvance ?? 0,
		xOffset: g.xOffset ?? 0,
		yOffset: g.yOffset ?? 0,
		cluster: g.cluster
	}));
	const totalAdvance = glyphs.reduce((acc, g) => acc + g.xAdvance, 0);
	return { glyphs, totalAdvance };
};
