/**
 * Color-font primitives — milestone-1 day 1 of the COLR direction.
 *
 * Pure-TS helpers for working with the `ColorLayer` / `ColorPalette` /
 * `RGBA` types defined alongside `Glyph` / `Project` in `./types`.
 * No opentype.js or Pyodide dependency at this layer — just the data
 * model. Render + export wire-up land in later days of the milestone.
 *
 * Designed against COLR v0 + CPAL v0 (the universally-supported
 * subset; see `docs/roadmap.md` section 7 for the format research and
 * Safari blocker on COLR v1).
 */

import { contoursToSvgPath } from './path';
import type { ColorLayer, ColorPalette, RGBA, BezierContour } from './types';

/** Parse a CSS `#rrggbb` or `#rrggbbaa` hex string into an `RGBA` tuple. */
export const hexToRgba = (hex: string): RGBA => {
	const m = hex.trim().match(/^#?([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/);
	if (!m) throw new Error(`hexToRgba: invalid hex "${hex}"`);
	const r = parseInt(m[1].slice(0, 2), 16);
	const g = parseInt(m[1].slice(2, 4), 16);
	const b = parseInt(m[1].slice(4, 6), 16);
	const a = m[2] ? parseInt(m[2], 16) / 255 : 1;
	return { r, g, b, a };
};

/** Inverse of `hexToRgba`. Lowercase `#rrggbb` (drops the alpha byte when fully opaque). */
export const rgbaToHex = (color: RGBA): string => {
	const h = (n: number) =>
		Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
	const aByte = Math.round(color.a * 255);
	return aByte === 255 ? `#${h(color.r)}${h(color.g)}${h(color.b)}` : `#${h(color.r)}${h(color.g)}${h(color.b)}${h(aByte)}`;
};

/** CSS `rgba(r, g, b, a)` for use as a fill in Canvas2D / inline styles. */
/**
 * Linearly interpolate between two RGBA colors at parameter t (0..1).
 * Used by the SVG sweep-gradient approximation to compute the colour
 * at each slice's midpoint angle.
 */
export const lerpRgba = (a: RGBA, b: RGBA, t: number): RGBA => ({
	r: Math.round(a.r + (b.r - a.r) * t),
	g: Math.round(a.g + (b.g - a.g) * t),
	b: Math.round(a.b + (b.b - a.b) * t),
	a: a.a + (b.a - a.a) * t
});

/**
 * Sample a color line at offset `t` (0..1), interpolating linearly
 * between adjacent stops. Stops must be sorted by offset ascending;
 * out-of-range `t` clamps to the nearest stop's color.
 */
export const sampleColorLine = (
	stops: ReadonlyArray<{ offset: number; color: RGBA }>,
	t: number
): RGBA => {
	if (stops.length === 0) return { r: 0, g: 0, b: 0, a: 1 };
	if (t <= stops[0].offset) return stops[0].color;
	if (t >= stops[stops.length - 1].offset) return stops[stops.length - 1].color;
	for (let i = 0; i < stops.length - 1; i++) {
		const s1 = stops[i];
		const s2 = stops[i + 1];
		if (t >= s1.offset && t <= s2.offset) {
			const range = s2.offset - s1.offset;
			const local = range === 0 ? 0 : (t - s1.offset) / range;
			return lerpRgba(s1.color, s2.color, local);
		}
	}
	return stops[stops.length - 1].color;
};

export const rgbaToCss = (color: RGBA): string => {
	const c = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
	const a = Math.max(0, Math.min(1, color.a));
	return `rgba(${c(color.r)}, ${c(color.g)}, ${c(color.b)}, ${a})`;
};

/** Create a fresh ColorPalette with a sensible default set of colours. */
export const createDefaultPalette = (
	name: string,
	variant?: ColorPalette['variant']
): ColorPalette => ({
	id: makeId(),
	name,
	variant,
	colors: [
		hexToRgba('#1a1a1a'), // ink
		hexToRgba('#ffffff'), // paper
		hexToRgba('#3b82f6'), // accent (blue)
		hexToRgba('#f59e0b') //  warm
	]
});

/** Create a fresh ColorLayer referencing the given paletteIndex. */
export const createColorLayer = (
	contours: BezierContour[],
	paletteIndex: number,
	name?: string
): ColorLayer => ({
	id: makeId(),
	name,
	contours,
	paletteIndex
});

/**
 * Pick a project's default palette — the variant-tagged `default` if
 * present, otherwise the first entry. Returns `null` when the project
 * is monochrome.
 */
export const defaultPalette = (palettes: ColorPalette[] | undefined): ColorPalette | null => {
	if (!palettes || palettes.length === 0) return null;
	const tagged = palettes.find((p) => p.variant === 'default');
	return tagged ?? palettes[0];
};

/**
 * Validate that all palettes in a project carry the same number of
 * entries — CPAL requires this. Returns the unified length, or null
 * when palettes don't agree.
 */
export const palettesAgreeOnLength = (palettes: ColorPalette[] | undefined): number | null => {
	if (!palettes || palettes.length === 0) return null;
	const first = palettes[0].colors.length;
	for (const p of palettes) if (p.colors.length !== first) return null;
	return first;
};

/**
 * `true` when the glyph has any color layer visible at export time.
 * Treats undefined / empty / all-hidden layer arrays as monochrome.
 */
export const hasVisibleColorLayers = (layers: ColorLayer[] | undefined): boolean => {
	if (!layers || layers.length === 0) return false;
	return layers.some((l) => !l.hidden);
};

// crypto.randomUUID is preferred; fall back to a small unique-ish id
// when crypto is unavailable (e.g. SSR contexts). Both branches return
// stable strings safe for use as React/Svelte keys.
const makeId = (): string => {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
	return `cl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

/**
 * A single drawable step for the color-glyph renderer: an SVG path
 * string + the fill. Steps are ordered bottom-up; the caller fills
 * them in array order so later layers paint on top.
 *
 * Color-fonts M2 starter: `fill` is a discriminated union so a
 * single step can be either flat (COLR v0 — what we already
 * export today) or gradient (COLR v1 — preview only until the
 * binary writer lands).
 */
export type ColorRenderStep = {
	/** SVG-path `d` string (same format as `contoursToSvgPath`). */
	path: string;
	fill: ColorRenderFill;
	/** Source layer id, for hit-testing / hover state. */
	layerId: string;
};

export type ColorRenderFill =
	| { type: 'solid'; color: RGBA }
	| {
			type: 'linearGradient';
			start: { x: number; y: number };
			end: { x: number; y: number };
			stops: Array<{ offset: number; color: RGBA }>;
	  }
	| {
			type: 'radialGradient';
			center: { x: number; y: number };
			radius: number;
			stops: Array<{ offset: number; color: RGBA }>;
	  }
	| {
			type: 'sweepGradient';
			center: { x: number; y: number };
			/** Degrees, CCW from +x axis (font-Y-up convention). */
			startAngle: number;
			endAngle: number;
			stops: Array<{ offset: number; color: RGBA }>;
	  };

/**
 * Plan a color-glyph render: produce an ordered list of (path, color)
 * steps the UI can apply to Canvas2D / SVG / anywhere. Pure data —
 * doesn't touch the DOM, so it's testable without a canvas mock.
 *
 * Skipped silently:
 * - Layers marked `hidden` (export uses the same rule).
 * - Layers whose `paletteIndex` falls outside the palette's range —
 *   prevents export errors at the cost of dropping the layer.
 * - Empty contour layers — nothing to paint.
 *
 * Returns an empty array when there are no layers, no palette, or
 * every layer was filtered.
 */
export const planColorRender = (
	layers: ColorLayer[] | undefined,
	palette: ColorPalette | null | undefined
): ColorRenderStep[] => {
	if (!layers || layers.length === 0) return [];
	if (!palette) return [];
	const steps: ColorRenderStep[] = [];
	for (const layer of layers) {
		if (layer.hidden) continue;
		if (layer.paletteIndex < 0 || layer.paletteIndex >= palette.colors.length) continue;
		if (layer.contours.length === 0) continue;
		const path = contoursToSvgPath(layer.contours);
		if (!path) continue;
		// Color-fonts M2 gradient resolution: when the layer has a
		// gradient (linear OR radial), each stop's palette colour gets
		// looked up and optionally alpha-multiplied. Invalid stops
		// (out-of-range palette index) silently fall through to the
		// flat fallback.
		if (layer.gradient && layer.gradient.stops.length >= 2) {
			const stops = layer.gradient.stops
				.filter((s) => s.paletteIndex >= 0 && s.paletteIndex < palette.colors.length)
				.map((s) => {
					const base = palette.colors[s.paletteIndex];
					const a = s.alpha === undefined ? base.a : base.a * s.alpha;
					return { offset: s.offset, color: { ...base, a } };
				});
			if (stops.length >= 2) {
				if (layer.gradient.type === 'linear') {
					steps.push({
						path,
						fill: {
							type: 'linearGradient',
							start: layer.gradient.start,
							end: layer.gradient.end,
							stops
						},
						layerId: layer.id
					});
					continue;
				}
				if (layer.gradient.type === 'radial') {
					steps.push({
						path,
						fill: {
							type: 'radialGradient',
							center: layer.gradient.center,
							radius: layer.gradient.radius,
							stops
						},
						layerId: layer.id
					});
					continue;
				}
				if (layer.gradient.type === 'sweep') {
					steps.push({
						path,
						fill: {
							type: 'sweepGradient',
							center: layer.gradient.center,
							startAngle: layer.gradient.startAngle,
							endAngle: layer.gradient.endAngle,
							stops
						},
						layerId: layer.id
					});
					continue;
				}
			}
		}
		// Flat fallback — both the COLR v0 export path and renderers
		// that don't understand the gradient field land here.
		steps.push({
			path,
			fill: { type: 'solid', color: palette.colors[layer.paletteIndex] },
			layerId: layer.id
		});
	}
	return steps;
};

/**
 * Apply a render plan to a Canvas2D context. Caller is responsible
 * for setting up the transform (scaleY(-1), translate, scale) so the
 * font's y-up coords map correctly to canvas space — same convention
 * as the monochrome renderer.
 *
 * Separated from `planColorRender` so the planner stays pure /
 * testable and the canvas-touching wrapper is a thin shim.
 */
export const applyColorRenderToCanvas = (
	ctx: CanvasRenderingContext2D,
	steps: ColorRenderStep[]
): void => {
	for (const step of steps) {
		ctx.save();
		if (step.fill.type === 'solid') {
			ctx.fillStyle = rgbaToCss(step.fill.color);
		} else if (step.fill.type === 'linearGradient') {
			// Linear gradient — Canvas2D's createLinearGradient takes
			// coordinates in the post-transform space, and our caller
			// has already set up the font-units-to-canvas-pixels
			// transform via scaleY(-1) + translate. The gradient
			// endpoints live in font units, so they ride along.
			const grad = ctx.createLinearGradient(
				step.fill.start.x,
				step.fill.start.y,
				step.fill.end.x,
				step.fill.end.y
			);
			for (const s of step.fill.stops) grad.addColorStop(s.offset, rgbaToCss(s.color));
			ctx.fillStyle = grad;
		} else if (step.fill.type === 'radialGradient') {
			// Radial gradient — single-circle (start radius 0, end at
			// the configured radius). COLR v1 supports two focal
			// circles, but for the editor preview a single-focal
			// gradient covers the common designer intent (highlight,
			// vignette, spot).
			const grad = ctx.createRadialGradient(
				step.fill.center.x,
				step.fill.center.y,
				0,
				step.fill.center.x,
				step.fill.center.y,
				Math.max(step.fill.radius, 1)
			);
			for (const s of step.fill.stops) grad.addColorStop(s.offset, rgbaToCss(s.color));
			ctx.fillStyle = grad;
		} else {
			// Sweep gradient — Canvas2D's createConicGradient angle is in
			// radians, measured CLOCKWISE from positive x-axis. COLR v1
			// uses degrees counter-clockwise from positive x-axis. The
			// canvas is also already y-flipped (caller's scaleY(-1)
			// transform), which inverts the rotation direction back to
			// CCW visually. Net: convert deg → rad directly.
			//
			// Canvas2D doesn't expose a way to specify an END angle
			// separately — we approximate by mapping (startAngle..endAngle)
			// to (0..1) in the gradient's color line.
			const startRad = (step.fill.startAngle * Math.PI) / 180;
			const grad = ctx.createConicGradient(
				startRad,
				step.fill.center.x,
				step.fill.center.y
			);
			const sweepDeg = step.fill.endAngle - step.fill.startAngle;
			const fullCircleDeg = 360;
			for (const s of step.fill.stops) {
				// Scale stop offset to the actual sweep range (so a sweep
				// from 0 to 90° puts offset=1 at 90°, not at 360°).
				const offsetInFullCircle = (s.offset * sweepDeg) / fullCircleDeg;
				if (offsetInFullCircle >= 0 && offsetInFullCircle <= 1) {
					grad.addColorStop(offsetInFullCircle, rgbaToCss(s.color));
				}
			}
			ctx.fillStyle = grad;
		}
		const path = new Path2D(step.path);
		ctx.fill(path, 'evenodd');
		ctx.restore();
	}
};
