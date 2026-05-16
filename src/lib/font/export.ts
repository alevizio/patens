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
 * For composites we copy contours from the referenced base glyphs and translate.
 */
const effectiveContours = (
	glyph: ProjectGlyph,
	project: Project,
	depth = 0
): BezierContour[] => {
	if (depth > 4) return glyph.contours; // recursion guard
	if (glyph.contours.length > 0) return glyph.contours;
	if (!glyph.components || glyph.components.length === 0) return [];

	const out: BezierContour[] = [];
	for (const ref of glyph.components) {
		const base = project.glyphs[ref.baseCodepoint];
		if (!base) continue;
		const baseContours = effectiveContours(base, project, depth + 1);
		for (const c of baseContours) {
			out.push({
				...c,
				commands: c.commands.map((cmd) => translate(cmd, ref.offsetX, ref.offsetY))
			});
		}
	}
	return out;
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

export const buildFont = (project: Project): BuildResult => {
	const { metrics, metadata } = project;

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

	const codepoints = Object.keys(project.glyphs)
		.map((s) => Number(s))
		.sort((a, b) => a - b);

	for (const cp of codepoints) {
		const g = project.glyphs[cp];
		const eff = effectiveContours(g, project);
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
		styleName: metadata.styleName || 'Regular',
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
