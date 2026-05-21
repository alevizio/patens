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

	// No palettes → no color font, no layer glyphs. Caller may still
	// have a useful monochrome project; we just don't emit COLR/CPAL.
	if (!project.palettes || project.palettes.length === 0) {
		return { syntheticGlyphs, baseGlyphRecords };
	}

	// Iterate glyphs by codepoint order so the plan is deterministic
	// across runs.
	const codepoints = Object.keys(project.glyphs)
		.map((s) => Number(s))
		.sort((a, b) => a - b);

	for (const cp of codepoints) {
		const glyph = project.glyphs[cp];
		if (!glyph || !hasVisibleColorLayers(glyph.colorLayers)) continue;
		const baseName = glyph.name || `cp${cp.toString(16)}`;
		const layers: PlanBaseGlyphRecord['layers'] = [];
		let layerIndex = 0;
		for (const layer of glyph.colorLayers ?? []) {
			if (layer.hidden) continue;
			if (layer.contours.length === 0) continue;
			const layerGlyphName = `${baseName}.color${layerIndex}`;
			syntheticGlyphs.push({
				name: layerGlyphName,
				contours: layer.contours,
				advanceWidth: 0 // layer glyphs never render standalone
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
	}

	return { syntheticGlyphs, baseGlyphRecords };
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
