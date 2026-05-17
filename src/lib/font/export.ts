/**
 * Build an opentype.js Font from a Project.
 * Used by both the live preview pipeline and the OTF/TTF exporter.
 *
 * Future escape hatch: if opentype.js can't write a feature we need,
 * lazy-load Pyodide + fontTools and run that step there.
 */

import opentype from 'opentype.js';
import type { BezierContour, Glyph as ProjectGlyph, Project, PathCommand } from './types';
import { buildNotdefContours, NOTDEF_ADVANCE_WIDTH } from './notdef';
import { glyphBounds, roundToFontUnits } from './path';

type OTPath = InstanceType<typeof opentype.Path>;
type OTGlyph = InstanceType<typeof opentype.Glyph>;

const applyCommandsToPath = (path: OTPath, commands: PathCommand[]): void => {
	for (const c of commands) {
		switch (c.type) {
			case 'M':
				path.moveTo(c.x, c.y);
				break;
			case 'L':
				path.lineTo(c.x, c.y);
				break;
			case 'Q':
				path.quadraticCurveTo(c.x1, c.y1, c.x, c.y);
				break;
			case 'C':
				path.curveTo(c.x1, c.y1, c.x2, c.y2, c.x, c.y);
				break;
			case 'Z':
				path.close();
				break;
		}
	}
};

const contoursToOpenTypePath = (contours: BezierContour[]): OTPath => {
	const path = new opentype.Path();
	for (const contour of contours) {
		applyCommandsToPath(path, roundToFontUnits(contour.commands));
	}
	return path;
};

/**
 * Resolve effective contours for a glyph, including composite components.
 *
 * For composites with two components (typical base + mark pattern), we look
 * for matching anchors: an anchor named 'top' on the first component aligns
 * with an anchor named '_top' on the second component (Glyphs / UFO
 * convention). When a match is found it overrides the stored xy offset.
 */
const effectiveContoursWithMap = (
	glyph: ProjectGlyph,
	glyphs: Record<number, ProjectGlyph>,
	depth = 0
): BezierContour[] => {
	if (depth > 4) return glyph.contours;
	if (glyph.contours.length > 0) return glyph.contours;
	if (!glyph.components || glyph.components.length === 0) return [];

	const components = glyph.components;
	const translations: { dx: number; dy: number }[] = components.map((c) => ({
		dx: c.offsetX,
		dy: c.offsetY
	}));
	if (components.length >= 2) {
		const base = glyphs[components[0].baseCodepoint];
		if (base) {
			for (let i = 1; i < components.length; i++) {
				const mark = glyphs[components[i].baseCodepoint];
				if (!mark) continue;
				const anchorPair = findAnchorPair(base.anchors, mark.anchors);
				if (anchorPair) {
					translations[i] = {
						dx: anchorPair.baseX - anchorPair.markX,
						dy: anchorPair.baseY - anchorPair.markY
					};
				}
			}
		}
	}

	const out: BezierContour[] = [];
	for (let i = 0; i < components.length; i++) {
		const ref = components[i];
		const t = translations[i];
		const base = glyphs[ref.baseCodepoint];
		if (!base) continue;
		const baseContours = effectiveContoursWithMap(base, glyphs, depth + 1);
		for (const c of baseContours) {
			out.push({
				...c,
				commands: c.commands.map((cmd) => translate(cmd, t.dx, t.dy))
			});
		}
	}
	return out;
};

/** Back-compat wrapper that keeps the original Project-based signature. */
const effectiveContours = (
	glyph: ProjectGlyph,
	project: Project,
	depth = 0
): BezierContour[] => effectiveContoursWithMap(glyph, project.glyphs, depth);

/**
 * Find a pair of anchors where the base has 'X' and the mark has '_X'
 * (Glyphs / UFO convention).
 */
const findAnchorPair = (
	baseAnchors: ProjectGlyph['anchors'],
	markAnchors: ProjectGlyph['anchors']
): { baseX: number; baseY: number; markX: number; markY: number } | null => {
	if (!baseAnchors || !markAnchors) return null;
	for (const m of markAnchors) {
		if (!m.name.startsWith('_')) continue;
		const base = baseAnchors.find((b) => b.name === m.name.slice(1));
		if (base) return { baseX: base.x, baseY: base.y, markX: m.x, markY: m.y };
	}
	return null;
};

const translate = (c: PathCommand, dx: number, dy: number): PathCommand => {
	if (c.type === 'M' || c.type === 'L') return { ...c, x: c.x + dx, y: c.y + dy };
	if (c.type === 'Q')
		return { ...c, x1: c.x1 + dx, y1: c.y1 + dy, x: c.x + dx, y: c.y + dy };
	if (c.type === 'C')
		return {
			...c,
			x1: c.x1 + dx,
			y1: c.y1 + dy,
			x2: c.x2 + dx,
			y2: c.y2 + dy,
			x: c.x + dx,
			y: c.y + dy
		};
	return c;
};

/** Compute advance width: explicit if set, otherwise bbox + sidebearings. */
const effectiveAdvanceWidth = (
	glyph: ProjectGlyph,
	contours: BezierContour[]
): number => {
	if (glyph.advanceWidth > 0) return glyph.advanceWidth;
	if (contours.length === 0) return Math.max(50, glyph.leftSidebearing + glyph.rightSidebearing);
	const b = glyphBounds(contours);
	return Math.max(50, Math.round(b.maxX + glyph.rightSidebearing));
};

export type BuildResult = {
	font: InstanceType<typeof opentype.Font>;
	indexByCodepoint: Map<number, number>;
	glyphCount: number;
};

export type BuildOptions = {
	/** If set, render this master's glyphs instead of the project's default. */
	masterId?: string;
	/** If set, used as a name suffix (e.g. "Bold") in the PostScript subfamily. */
	styleSuffix?: string;
};

export const buildFont = (project: Project, opts: BuildOptions = {}): BuildResult => {
	const { metrics, metadata } = project;
	// Resolve which glyph set to use
	let activeGlyphs = project.glyphs;
	let styleName = metadata.styleName || 'Regular';
	if (opts.masterId) {
		const master = (project.masters ?? []).find((m) => m.id === opts.masterId);
		if (master) {
			activeGlyphs = master.glyphs;
			styleName = opts.styleSuffix ?? master.name;
		}
	}

	// .notdef is always glyph index 0.
	const notdefPath = contoursToOpenTypePath(buildNotdefContours(metrics));
	const notdef = new opentype.Glyph({
		name: '.notdef',
		unicode: 0,
		advanceWidth: NOTDEF_ADVANCE_WIDTH,
		path: notdefPath
	});

	const glyphs: OTGlyph[] = [notdef];
	const indexByCodepoint = new Map<number, number>();
	indexByCodepoint.set(0, 0);

	const codepoints = Object.keys(activeGlyphs)
		.map((s) => Number(s))
		.sort((a, b) => a - b);

	for (const cp of codepoints) {
		const g = activeGlyphs[cp];
		const eff = effectiveContoursWithMap(g, activeGlyphs);
		const advanceWidth = effectiveAdvanceWidth(g, eff);
		const path = contoursToOpenTypePath(eff);
		const otGlyph = new opentype.Glyph({
			name: g.name || `uni${cp.toString(16).toUpperCase().padStart(4, '0')}`,
			unicode: cp,
			advanceWidth,
			path
		});
		indexByCodepoint.set(cp, glyphs.length);
		glyphs.push(otGlyph);
	}

	const font = new opentype.Font({
		familyName: metadata.familyName || 'Untitled',
		styleName,
		unitsPerEm: metrics.unitsPerEm,
		ascender: metrics.ascender,
		descender: metrics.descender,
		designer: metadata.designer || '',
		designerURL: '',
		manufacturer: metadata.designer || '',
		manufacturerURL: '',
		license: metadata.license || '',
		licenseURL: '',
		version: metadata.version || '1.000',
		copyright: metadata.copyright || '',
		glyphs
	});

	if (project.features.kern) {
		const pairs: Record<string, number> = {};
		for (const k of project.kerning) {
			// Skip class-based pairs — those are handled by the .fea compile step
			if (typeof k.left === 'string' || typeof k.right === 'string') continue;
			const li = indexByCodepoint.get(k.left);
			const ri = indexByCodepoint.get(k.right);
			if (li === undefined || ri === undefined) continue;
			pairs[`${li},${ri}`] = k.value;
		}
		font.kerningPairs = pairs;
	}

	return { font, indexByCodepoint, glyphCount: glyphs.length };
};

export const fontToArrayBuffer = (font: InstanceType<typeof opentype.Font>): ArrayBuffer =>
	font.toArrayBuffer();

/** Trigger a browser download of the font as OTF. */
export const downloadFont = (
	font: InstanceType<typeof opentype.Font>,
	filename: string
): void => {
	const buffer = font.toArrayBuffer();
	const blob = new Blob([buffer], { type: 'font/otf' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
};
