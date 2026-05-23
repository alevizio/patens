/**
 * Import an existing OTF/TTF file and produce a Font Studio Project.
 * Adopts the source font's UPM, metrics, naming, and glyph outlines.
 */

import { parse as parseFont } from 'opentype.js';
import type { BezierContour, FontMetrics, Glyph, PathCommand, Project } from './types';
import { DEFAULT_FEATURES } from './types';
import { DEFAULT_GLYPH_SET } from './glyph-set';
import { glyphBounds } from './path';

// Derive LSB/RSB from the actual contour bbox + advance. Empty glyphs fall
// back to the project default sidebearing.
const computeSidebearings = (
	contours: BezierContour[],
	advanceWidth: number,
	defaultSb: number
): { leftSidebearing: number; rightSidebearing: number } => {
	if (contours.length === 0) {
		return { leftSidebearing: defaultSb, rightSidebearing: defaultSb };
	}
	const b = glyphBounds(contours);
	return {
		leftSidebearing: Math.round(b.minX),
		rightSidebearing: Math.round(advanceWidth - b.maxX)
	};
};

const newId = () => crypto.randomUUID();
const now = () => new Date().toISOString();

/** Convert an opentype.js path's commands to one BezierContour per subpath. */
const splitIntoContours = (
	commands: Array<
		| { type: 'M'; x: number; y: number }
		| { type: 'L'; x: number; y: number }
		| { type: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
		| { type: 'Q'; x1: number; y1: number; x: number; y: number }
		| { type: 'Z' }
	>
): BezierContour[] => {
	const out: BezierContour[] = [];
	let current: PathCommand[] = [];
	for (const cmd of commands) {
		if (cmd.type === 'M') {
			if (current.length > 0) {
				out.push({ closed: true, winding: 'ccw', commands: current });
			}
			current = [{ type: 'M', x: cmd.x, y: cmd.y }];
		} else if (cmd.type === 'L') {
			current.push({ type: 'L', x: cmd.x, y: cmd.y });
		} else if (cmd.type === 'C') {
			current.push({
				type: 'C',
				x1: cmd.x1,
				y1: cmd.y1,
				x2: cmd.x2,
				y2: cmd.y2,
				x: cmd.x,
				y: cmd.y
			});
		} else if (cmd.type === 'Q') {
			current.push({ type: 'Q', x1: cmd.x1, y1: cmd.y1, x: cmd.x, y: cmd.y });
		} else if (cmd.type === 'Z') {
			current.push({ type: 'Z' });
			out.push({ closed: true, winding: 'ccw', commands: current });
			current = [];
		}
	}
	if (current.length > 0) {
		out.push({ closed: true, winding: 'ccw', commands: current });
	}
	return out.filter((c) => c.commands.length >= 2);
};

export type ImportResult = {
	project: Project;
	stats: {
		totalGlyphs: number;
		matchedGlyphs: number;
		extraGlyphs: number;
	};
};

const safeStr = (v: unknown, fallback: string): string => {
	if (typeof v === 'string') return v.trim() || fallback;
	if (v && typeof v === 'object' && 'en' in (v as Record<string, unknown>)) {
		const en = (v as { en: unknown }).en;
		if (typeof en === 'string') return en.trim() || fallback;
	}
	return fallback;
};

export const importFromOtf = async (file: File): Promise<ImportResult> => {
	const buffer = await file.arrayBuffer();
	// parseFont expects an ArrayBuffer
	const font = parseFont(buffer) as unknown as {
		unitsPerEm: number;
		ascender: number;
		descender: number;
		tables: Record<string, unknown>;
		names: Record<string, unknown>;
		glyphs: { length: number; get(i: number): unknown };
		kerningPairs?: Record<string, number>;
	};

	const upm = font.unitsPerEm || 1000;
	const asc = font.ascender || 800;
	const desc = font.descender || -200;
	const os2 = (font.tables.os2 as Record<string, number> | undefined) ?? undefined;
	const capHeight = os2?.sCapHeight && os2.sCapHeight > 0 ? os2.sCapHeight : Math.round(asc * 0.85);
	const xHeight = os2?.sxHeight && os2.sxHeight > 0 ? os2.sxHeight : Math.round(asc * 0.6);

	const metrics: FontMetrics = {
		unitsPerEm: upm,
		ascender: asc,
		descender: desc,
		capHeight,
		xHeight,
		defaultSidebearing: Math.round(upm * 0.05)
	};

	// Build a unicode → opentype.Glyph map.
	const byUnicode = new Map<number, unknown>();
	for (let i = 0; i < font.glyphs.length; i++) {
		const g = font.glyphs.get(i) as { unicode?: number; unicodes?: number[] };
		if (typeof g.unicode === 'number' && g.unicode > 0) byUnicode.set(g.unicode, g);
		if (Array.isArray(g.unicodes)) for (const u of g.unicodes) if (u > 0) byUnicode.set(u, g);
	}

	const fileBase = file.name.replace(/\.(otf|ttf)$/i, '');
	// Clean variable-font axis tags out of the family name (e.g. "Inter[opsz,wght]" → "Inter")
	const cleanFamily = (s: string): string => s.replace(/\s*\[[^\]]+\]\s*$/, '').trim() || s;
	const rawFamily = safeStr((font.names as { fontFamily?: unknown }).fontFamily, fileBase);
	const familyName = cleanFamily(rawFamily);
	const styleName = safeStr(
		(font.names as { fontSubfamily?: unknown }).fontSubfamily,
		'Regular'
	);
	const designer = safeStr((font.names as { designer?: unknown }).designer, '');
	const copyright = safeStr((font.names as { copyright?: unknown }).copyright, '');
	const license = safeStr((font.names as { license?: unknown }).license, '');
	const version = safeStr((font.names as { version?: unknown }).version, '1.000');

	const glyphs: Record<number, Glyph> = {};
	const importedNames = new Map<number, string>();
	let matched = 0;
	let extras = 0;

	// First: import all glyphs in our default Latin starter set.
	for (const spec of DEFAULT_GLYPH_SET) {
		const otg = byUnicode.get(spec.codepoint) as
			| {
					name?: string;
					advanceWidth: number;
					path: { commands: Parameters<typeof splitIntoContours>[0] };
			  }
			| undefined;
		if (otg) {
			const contours = splitIntoContours(otg.path.commands);
			const sb = computeSidebearings(contours, otg.advanceWidth, metrics.defaultSidebearing);
			glyphs[spec.codepoint] = {
				codepoint: spec.codepoint,
				name: otg.name || spec.name,
				status: contours.length > 0 ? 'final' : 'empty',
				advanceWidth: otg.advanceWidth,
				leftSidebearing: sb.leftSidebearing,
				rightSidebearing: sb.rightSidebearing,
				contours,
				updatedAt: now()
			};
			if (contours.length > 0) matched += 1;
			importedNames.set(spec.codepoint, otg.name || spec.name);
		} else {
			// Keep the slot but empty
			glyphs[spec.codepoint] = {
				codepoint: spec.codepoint,
				name: spec.name,
				status: 'empty',
				advanceWidth: spec.composite ? Math.round(upm * 0.6) : 0,
				leftSidebearing: metrics.defaultSidebearing,
				rightSidebearing: metrics.defaultSidebearing,
				contours: [],
				components: spec.composite
					? [
							{ baseCodepoint: spec.composite.base, offsetX: 0, offsetY: 0 },
							{ baseCodepoint: spec.composite.mark, offsetX: 0, offsetY: xHeight }
						]
					: undefined,
				updatedAt: now()
			};
		}
	}

	// Then: include any extra glyphs from the font we don't already have a slot for.
	for (const [cp, otg] of byUnicode.entries()) {
		if (glyphs[cp]) continue;
		const g = otg as {
			name?: string;
			advanceWidth: number;
			path: { commands: Parameters<typeof splitIntoContours>[0] };
		};
		const contours = splitIntoContours(g.path.commands);
		const sb = computeSidebearings(contours, g.advanceWidth, metrics.defaultSidebearing);
		glyphs[cp] = {
			codepoint: cp,
			name: g.name || `uni${cp.toString(16).toUpperCase().padStart(4, '0')}`,
			status: contours.length > 0 ? 'final' : 'empty',
			advanceWidth: g.advanceWidth,
			leftSidebearing: sb.leftSidebearing,
			rightSidebearing: sb.rightSidebearing,
			contours,
			updatedAt: now()
		};
		if (contours.length > 0) extras += 1;
	}

	// Kerning: opentype.js exposes legacy `kern` table as a flat
	// "leftGlyphIndex,rightGlyphIndex" → value map. We translate back to
	// codepoint pairs via the glyph index. GPOS kern (modern) is not
	// directly exposed by opentype.js; designers re-tune those after import.
	const kerning: import('./types').KerningPair[] = [];
	if (font.kerningPairs && typeof font.kerningPairs === 'object') {
		// Build glyph-index → codepoint map for the pair lookup.
		const idxToCp = new Map<number, number>();
		for (let i = 0; i < font.glyphs.length; i++) {
			const g = font.glyphs.get(i) as { unicode?: number };
			if (typeof g.unicode === 'number' && g.unicode > 0) idxToCp.set(i, g.unicode);
		}
		for (const [key, value] of Object.entries(font.kerningPairs)) {
			if (typeof value !== 'number' || value === 0) continue;
			const [lStr, rStr] = key.split(',');
			const li = Number(lStr);
			const ri = Number(rStr);
			const lc = idxToCp.get(li);
			const rc = idxToCp.get(ri);
			if (!lc || !rc) continue;
			kerning.push({ left: lc, right: rc, value });
		}
	}

	const ts = now();
	const project: Project = {
		id: newId(),
		name: `${fileBase} (imported)`,
		metadata: {
			familyName,
			styleName,
			designer,
			copyright,
			license,
			version
		},
		metrics,
		glyphs,
		kerning,
		features: { ...DEFAULT_FEATURES },
		createdAt: ts,
		updatedAt: ts
	};

	return {
		project,
		stats: {
			totalGlyphs: byUnicode.size,
			matchedGlyphs: matched,
			extraGlyphs: extras
		}
	};
};
