/**
 * Browser-clipboard glyph copy/paste — serializes a glyph's geometry,
 * spacing, and anchors as JSON so it round-trips across tabs and projects.
 * Falls back to a module-level in-memory clipboard when the system
 * clipboard is unavailable (e.g. iframe permissions).
 */

import type { Anchor, BezierContour, Glyph, GlyphReference } from '$lib/font/types';

const MIME_TAG = '__fontstudio-glyph-v1__';

export type GlyphClipboardPayload = {
	tag: typeof MIME_TAG;
	advanceWidth: number;
	leftSidebearing: number;
	rightSidebearing: number;
	contours: BezierContour[];
	anchors?: Anchor[];
	components?: GlyphReference[];
	sourceName?: string;
};

let memoryFallback: GlyphClipboardPayload | null = null;

export const copyGlyphToClipboard = async (glyph: Glyph): Promise<boolean> => {
	const payload: GlyphClipboardPayload = {
		tag: MIME_TAG,
		advanceWidth: glyph.advanceWidth,
		leftSidebearing: glyph.leftSidebearing,
		rightSidebearing: glyph.rightSidebearing,
		contours: JSON.parse(JSON.stringify(glyph.contours)),
		anchors: glyph.anchors ? JSON.parse(JSON.stringify(glyph.anchors)) : undefined,
		components: glyph.components ? JSON.parse(JSON.stringify(glyph.components)) : undefined,
		sourceName: glyph.name
	};
	memoryFallback = payload;
	try {
		await navigator.clipboard.writeText(JSON.stringify(payload));
		return true;
	} catch {
		// memoryFallback still set — paste will work within this tab
		return true;
	}
};

export const readGlyphFromClipboard = async (): Promise<GlyphClipboardPayload | null> => {
	try {
		const text = await navigator.clipboard.readText();
		const parsed = JSON.parse(text);
		if (parsed && parsed.tag === MIME_TAG) return parsed as GlyphClipboardPayload;
	} catch {
		/* permission denied or non-JSON */
	}
	return memoryFallback;
};

export const hasClipboardGlyph = (): boolean => memoryFallback !== null;
