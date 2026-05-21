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
