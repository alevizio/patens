/**
 * Color-font build plan — day-6 of the color-fonts milestone-1.
 *
 * Bridges the gap between Font Studio's per-glyph `colorLayers` data
 * model and the COLR v0 binary format. For each glyph that has visible
 * color layers, emits:
 *
 *   - One "synthetic" layer-glyph per layer, with the layer's contours
 *     under a derived name (`<base>.color0`, `<base>.color1`, …).
 *     These get appended to the font's glyf table at build time.
 *   - One `BaseGlyphRecord` referencing those synthetic glyphs by
 *     name, alongside the palette index each layer uses.
 *
 * The actual font-table mutation lives in the export pipeline that
 * consumes this plan; the plan itself is pure data + testable in
 * isolation.
 *
 * Caller wires it together:
 *
 *   const plan = buildColorFontPlan(project);
 *   // 1. Add plan.syntheticGlyphs to the font's glyph set.
 *   // 2. Resolve each baseGlyphRecord's layer entries from glyph
 *   //    name → glyph ID using the post-append GlyphSet.
 *   // 3. applyColorFontTables(otfBuffer, resolvedBaseGlyphs,
 *   //    project.palettes ?? []).
 *
 * Pure TS. No Pyodide, no opentype.js. ~sub-millisecond on any
 * realistic project.
 */

import type { BezierContour, Glyph, Project } from './types';
import { hasVisibleColorLayers } from './color';

export type SyntheticLayerGlyph = {
	/** Stable name for the layer glyph in the font (e.g. `heart.color1`). */
	name: string;
	/** Contour shape for this layer. */
	contours: BezierContour[];
	/** Advance width to assign (typically 0 — these glyphs never render alone). */
	advanceWidth: number;
};

export type PlanBaseGlyphRecord = {
	/** Name of the parent (color) glyph in the font. */
	baseGlyphName: string;
	/** Ordered layers — bottom-up, references synthetic glyph names + palette index. */
	layers: Array<{ layerGlyphName: string; paletteIndex: number }>;
};

export type ColorFontPlan = {
	syntheticGlyphs: SyntheticLayerGlyph[];
	baseGlyphRecords: PlanBaseGlyphRecord[];
	/**
	 * COLR v1 base-glyph paint records. One per glyph whose single
	 * visible layer carries a gradient (linear or radial). Multi-layer
	 * gradient glyphs continue to ship via v0 flat fallback — they'd
	 * need PaintColrLayers + LayerList support, which is a follow-up.
	 *
	 * Each entry references a synthetic layer-glyph by NAME (resolved
	 * to glyphID after the font's glyph set is finalised, same way the
	 * v0 records work).
	 */
	v1Records: PlanV1BaseGlyphPaint[];
};

export type PlanV1BaseGlyphPaint = {
	/** Name of the parent (color) base glyph in the font. */
	baseGlyphName: string;
	/** One paint entry per visible layer. Multi-entry → wrapped in PaintColrLayers. */
	layers: PlanV1LayerPaint[];
};

export type PlanV1LayerPaint = {
	/** Synthetic layer-glyph name whose outline clips this paint. */
	layerGlyphName: string;
	/** Fill: flat palette colour OR gradient. */
	fill:
		| { kind: 'solid'; paletteIndex: number; alpha?: number }
		| {
				kind: 'linear';
				x0: number;
				y0: number;
				x1: number;
				y1: number;
				stops: Array<{ offset: number; paletteIndex: number; alpha?: number }>;
			}
		| {
				kind: 'radial';
				cx: number;
				cy: number;
				r: number;
				stops: Array<{ offset: number; paletteIndex: number; alpha?: number }>;
			};
};

/**
 * Build a color-font plan from a project. Skips glyphs without visible
 * layers; if a project has no palettes, returns an empty plan (calling
 * COLR/CPAL writers with empty input is a no-op).
 *
 * Naming convention: `<baseName>.color<index>` — index is 0-based,
 * matches the order of `colorLayers` on the glyph. Stable across
 * project saves because `colorLayers` carries stable layer IDs but
 * the names are derived purely from index + base name.
 */
export const buildColorFontPlan = (project: Project): ColorFontPlan => {
	const syntheticGlyphs: SyntheticLayerGlyph[] = [];
	const baseGlyphRecords: PlanBaseGlyphRecord[] = [];
	const v1Records: PlanV1BaseGlyphPaint[] = [];

	if (!project.palettes || project.palettes.length === 0) {
		return { syntheticGlyphs, baseGlyphRecords, v1Records };
	}

	const codepoints = Object.keys(project.glyphs)
		.map((s) => Number(s))
		.sort((a, b) => a - b);

	for (const cp of codepoints) {
		const glyph = project.glyphs[cp];
		if (!glyph || !hasVisibleColorLayers(glyph.colorLayers)) continue;
		const baseName = glyph.name || `cp${cp.toString(16)}`;
		const layers: PlanBaseGlyphRecord['layers'] = [];
		const visibleLayers = (glyph.colorLayers ?? []).filter(
			(l) => !l.hidden && l.contours.length > 0
		);
		let layerIndex = 0;
		for (const layer of visibleLayers) {
			const layerGlyphName = `${baseName}.color${layerIndex}`;
			syntheticGlyphs.push({
				name: layerGlyphName,
				contours: layer.contours,
				advanceWidth: 0
			});
			layers.push({
				layerGlyphName,
				paletteIndex: layer.paletteIndex
			});
			layerIndex++;
		}
		if (layers.length === 0) continue;
		baseGlyphRecords.push({
			baseGlyphName: baseName,
			layers
		});

		// COLR v1 record: emit when ANY visible layer has a gradient.
		// All visible layers come along — flat-fill layers get a PaintSolid,
		// gradient layers get PaintLinearGradient / PaintRadialGradient.
		// The whole thing is wrapped in PaintColrLayers when there's more
		// than one layer.
		const anyGradient = visibleLayers.some((l) => !!l.gradient);
		if (anyGradient) {
			const v1Layers: PlanV1LayerPaint[] = [];
			for (let i = 0; i < visibleLayers.length; i++) {
				const lyr = visibleLayers[i];
				const layerGlyphName = `${baseName}.color${i}`;
				if (lyr.gradient?.type === 'linear') {
					v1Layers.push({
						layerGlyphName,
						fill: {
							kind: 'linear',
							x0: lyr.gradient.start.x,
							y0: lyr.gradient.start.y,
							x1: lyr.gradient.end.x,
							y1: lyr.gradient.end.y,
							stops: lyr.gradient.stops
						}
					});
				} else if (lyr.gradient?.type === 'radial') {
					v1Layers.push({
						layerGlyphName,
						fill: {
							kind: 'radial',
							cx: lyr.gradient.center.x,
							cy: lyr.gradient.center.y,
							r: lyr.gradient.radius,
							stops: lyr.gradient.stops
						}
					});
				} else {
					v1Layers.push({
						layerGlyphName,
						fill: { kind: 'solid', paletteIndex: lyr.paletteIndex }
					});
				}
			}
			v1Records.push({ baseGlyphName: baseName, layers: v1Layers });
		}
	}

	return { syntheticGlyphs, baseGlyphRecords, v1Records };
};

/**
 * Resolve a plan against a glyph-name → glyph-ID map (typically built
 * from the font's GlyphSet after synthetic glyphs are appended). Drops
 * records whose base or layer glyph can't be resolved — preserves the
 * "best effort" stance the rest of the export pipeline takes.
 *
 * Returns the spec-shaped `BaseGlyphRecord[]` ready to feed
 * `applyColorFontTables`. Pre-sorted ascending by glyphID per the COLR
 * v0 spec invariant (enforced again in `writeColrV0`).
 */
export const resolveColorFontPlan = (
	plan: ColorFontPlan,
	glyphIdByName: ReadonlyMap<string, number>
): Array<{ glyphID: number; layers: Array<{ glyphID: number; paletteIndex: number }> }> => {
	const out: Array<{
		glyphID: number;
		layers: Array<{ glyphID: number; paletteIndex: number }>;
	}> = [];
	for (const rec of plan.baseGlyphRecords) {
		const baseId = glyphIdByName.get(rec.baseGlyphName);
		if (baseId === undefined) continue;
		const layers: Array<{ glyphID: number; paletteIndex: number }> = [];
		let allResolved = true;
		for (const l of rec.layers) {
			const lid = glyphIdByName.get(l.layerGlyphName);
			if (lid === undefined) {
				allResolved = false;
				break;
			}
			layers.push({ glyphID: lid, paletteIndex: l.paletteIndex });
		}
		if (!allResolved || layers.length === 0) continue;
		out.push({ glyphID: baseId, layers });
	}
	// COLR v0 spec: baseGlyphRecords sorted ascending by glyphID.
	out.sort((a, b) => a.glyphID - b.glyphID);
	return out;
};

/**
 * Resolve the v1 portion of the plan into `BaseGlyphPaint[]` ready
 * for `writeColrV1`. Each entry's paint tree is:
 *
 *   single layer  → PaintGlyph → (gradient OR solid)
 *   N layers      → PaintColrLayers → [ PaintGlyph → ... ] × N
 *
 * Pre-sorted ascending by glyphID per the spec.
 *
 * PaintLinearGradient x2/y2 (rotation point) is computed as the
 * perpendicular to start→end at unit length — matches the simplest
 * common case where the gradient isn't sheared.
 */
import type { Paint as ColrPaint, BaseGlyphPaint } from './colr';

const layerToPaint = (l: PlanV1LayerPaint, layerGlyphID: number): ColrPaint => {
	if (l.fill.kind === 'solid') {
		return {
			kind: 'glyph',
			glyphID: layerGlyphID,
			paint: { kind: 'solid', paletteIndex: l.fill.paletteIndex, alpha: l.fill.alpha }
		};
	}
	if (l.fill.kind === 'linear') {
		const dx = l.fill.x1 - l.fill.x0;
		const dy = l.fill.y1 - l.fill.y0;
		return {
			kind: 'glyph',
			glyphID: layerGlyphID,
			paint: {
				kind: 'linearGradient',
				x0: l.fill.x0,
				y0: l.fill.y0,
				x1: l.fill.x1,
				y1: l.fill.y1,
				x2: l.fill.x0 - dy,
				y2: l.fill.y0 + dx,
				stops: l.fill.stops
			}
		};
	}
	return {
		kind: 'glyph',
		glyphID: layerGlyphID,
		paint: {
			kind: 'radialGradient',
			x0: l.fill.cx,
			y0: l.fill.cy,
			r0: 0,
			x1: l.fill.cx,
			y1: l.fill.cy,
			r1: l.fill.r,
			stops: l.fill.stops
		}
	};
};

export const resolveV1ColorFontPlan = (
	plan: ColorFontPlan,
	glyphIdByName: ReadonlyMap<string, number>
): BaseGlyphPaint[] => {
	const out: BaseGlyphPaint[] = [];
	for (const rec of plan.v1Records) {
		const baseId = glyphIdByName.get(rec.baseGlyphName);
		if (baseId === undefined) continue;
		const childPaints: ColrPaint[] = [];
		let allLayersResolved = true;
		for (const l of rec.layers) {
			const lid = glyphIdByName.get(l.layerGlyphName);
			if (lid === undefined) {
				allLayersResolved = false;
				break;
			}
			childPaints.push(layerToPaint(l, lid));
		}
		if (!allLayersResolved || childPaints.length === 0) continue;
		const paint: ColrPaint =
			childPaints.length === 1
				? childPaints[0]
				: { kind: 'colrLayers', layers: childPaints };
		out.push({ glyphID: baseId, paint });
	}
	out.sort((a, b) => a.glyphID - b.glyphID);
	return out;
};

/**
 * Convert a SyntheticLayerGlyph to a partial Glyph that can be merged
 * into `project.glyphs` ahead of font compilation. The caller picks
 * the codepoint — typically 0 since these synthetic glyphs aren't
 * mapped via cmap.
 */
export const syntheticToGlyph = (
	syn: SyntheticLayerGlyph,
	codepoint: number
): Glyph => ({
	codepoint,
	name: syn.name,
	status: 'draft',
	advanceWidth: syn.advanceWidth,
	leftSidebearing: 0,
	rightSidebearing: 0,
	contours: syn.contours,
	updatedAt: new Date().toISOString()
});
