/**
 * Coordinate transforms between screen space and font space.
 * Font space: Y+ is UP, baseline at y=0.
 * Screen space: Y+ is DOWN.
 *
 * View defines the visible region in font coordinates and the screen size in pixels.
 */

export type EditorView = {
	/** Width of the drawing area in screen pixels */
	screenWidth: number;
	/** Height of the drawing area in screen pixels */
	screenHeight: number;
	/** Center of the view in FONT coordinates (x, y) */
	cx: number;
	cy: number;
	/** Pixels per font unit */
	zoom: number;
};

export const screenToFont = (
	view: EditorView,
	sx: number,
	sy: number
): { x: number; y: number } => ({
	x: (sx - view.screenWidth / 2) / view.zoom + view.cx,
	y: -(sy - view.screenHeight / 2) / view.zoom + view.cy
});

export const fontToScreen = (
	view: EditorView,
	fx: number,
	fy: number
): { x: number; y: number } => ({
	x: (fx - view.cx) * view.zoom + view.screenWidth / 2,
	y: -(fy - view.cy) * view.zoom + view.screenHeight / 2
});

/**
 * Fit the view so that a glyph spanning descender..ascender is visible
 * with the given vertical padding (in font units).
 */
export const fitView = (
	screenWidth: number,
	screenHeight: number,
	ascender: number,
	descender: number,
	advanceWidth: number,
	pad = 80
): EditorView => {
	const fontHeight = ascender - descender + pad * 2;
	const fontWidth = Math.max(advanceWidth, 300) + pad * 2;
	const zoom = Math.min(screenWidth / fontWidth, screenHeight / fontHeight);
	return {
		screenWidth,
		screenHeight,
		cx: advanceWidth / 2,
		cy: (ascender + descender) / 2,
		zoom
	};
};
