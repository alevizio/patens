/**
 * In-app example project — opens a fully-set-up Font Studio project in the
 * editor with several drawn glyphs, a brief, and project metadata. The point
 * is to let a new user explore a font mid-design instead of staring at empty
 * slots, then "Start a new font" once they understand the surfaces.
 *
 * Shapes mirror the Studio Geometric demo OTF in scripts/build-demo-fonts.mjs.
 * Constructed as straight-line polygons in font space (Y+ up) — the editor's
 * vector layer renders them, and the user can immediately edit points, run
 * boolean ops, switch tools, etc.
 */

import type { BezierContour, PathCommand, Project } from './types';
import { createProject } from './project';

const ASCENDER = 800;
const DESCENDER = -200;
const CAP_HEIGHT = 700;
const X_HEIGHT = 500;
const STEM = 90;
const BAR = 80;
const CAP_W = 560;
const LC_W = 480;

/** Closed polygon from a list of [x, y] vertices (Y-up font space). */
const poly = (verts: Array<[number, number]>, winding: 'cw' | 'ccw' = 'cw'): BezierContour => {
	const commands: PathCommand[] = [
		{ type: 'M', x: verts[0][0], y: verts[0][1] },
		...verts.slice(1).map(([x, y]) => ({ type: 'L' as const, x, y })),
		{ type: 'Z' as const }
	];
	return { closed: true, winding, commands };
};

// ---------- Glyph shape builders ----------

const buildH = (): BezierContour[] => [
	poly([
		[80, 0],
		[80 + STEM, 0],
		[80 + STEM, CAP_HEIGHT],
		[80, CAP_HEIGHT]
	]),
	poly([
		[CAP_W - STEM - 80, 0],
		[CAP_W - 80, 0],
		[CAP_W - 80, CAP_HEIGHT],
		[CAP_W - STEM - 80, CAP_HEIGHT]
	]),
	poly([
		[80, CAP_HEIGHT / 2 - BAR / 2],
		[CAP_W - 80, CAP_HEIGHT / 2 - BAR / 2],
		[CAP_W - 80, CAP_HEIGHT / 2 + BAR / 2],
		[80, CAP_HEIGHT / 2 + BAR / 2]
	])
];

const buildT = (): BezierContour[] => [
	poly([
		[CAP_W / 2 - STEM / 2, 0],
		[CAP_W / 2 + STEM / 2, 0],
		[CAP_W / 2 + STEM / 2, CAP_HEIGHT - BAR],
		[CAP_W / 2 - STEM / 2, CAP_HEIGHT - BAR]
	]),
	poly([
		[60, CAP_HEIGHT - BAR],
		[CAP_W - 60, CAP_HEIGHT - BAR],
		[CAP_W - 60, CAP_HEIGHT],
		[60, CAP_HEIGHT]
	])
];

const buildI = (): BezierContour[] => [
	poly([
		[CAP_W / 2 - STEM / 2, 0],
		[CAP_W / 2 + STEM / 2, 0],
		[CAP_W / 2 + STEM / 2, CAP_HEIGHT],
		[CAP_W / 2 - STEM / 2, CAP_HEIGHT]
	])
];

const buildE = (): BezierContour[] => [
	poly([
		[80, 0],
		[80 + STEM, 0],
		[80 + STEM, CAP_HEIGHT],
		[80, CAP_HEIGHT]
	]),
	poly([
		[80, CAP_HEIGHT - BAR],
		[CAP_W - 60, CAP_HEIGHT - BAR],
		[CAP_W - 60, CAP_HEIGHT],
		[80, CAP_HEIGHT]
	]),
	poly([
		[80, CAP_HEIGHT / 2 - BAR / 2],
		[CAP_W - 100, CAP_HEIGHT / 2 - BAR / 2],
		[CAP_W - 100, CAP_HEIGHT / 2 + BAR / 2],
		[80, CAP_HEIGHT / 2 + BAR / 2]
	]),
	poly([
		[80, 0],
		[CAP_W - 60, 0],
		[CAP_W - 60, BAR],
		[80, BAR]
	])
];

const buildN = (): BezierContour[] => [
	poly([
		[80, 0],
		[80 + STEM, 0],
		[80 + STEM, CAP_HEIGHT],
		[80, CAP_HEIGHT]
	]),
	poly([
		[CAP_W - STEM - 80, 0],
		[CAP_W - 80, 0],
		[CAP_W - 80, CAP_HEIGHT],
		[CAP_W - STEM - 80, CAP_HEIGHT]
	]),
	poly([
		[80 + STEM, CAP_HEIGHT],
		[CAP_W - 80, 0],
		[CAP_W - STEM - 80, 0],
		[80, CAP_HEIGHT]
	])
];

/** O — ring approximated by 12-sided outer polygon with inner counter (ccw). */
const buildO = (): BezierContour[] => {
	const cx = CAP_W / 2;
	const cy = CAP_HEIGHT / 2;
	const rx = CAP_W / 2 - 80;
	const ry = CAP_HEIGHT / 2;
	const t = STEM;
	const sides = 16;
	const ring = (radX: number, radY: number, ccw = false): Array<[number, number]> => {
		const pts: Array<[number, number]> = [];
		for (let i = 0; i < sides; i++) {
			const angle = (i / sides) * Math.PI * 2 * (ccw ? -1 : 1);
			pts.push([cx + Math.cos(angle) * radX, cy + Math.sin(angle) * radY]);
		}
		return pts;
	};
	return [poly(ring(rx, ry), 'cw'), poly(ring(rx - t, ry - t, true), 'ccw')];
};

const buildO_lc = (): BezierContour[] => {
	const cx = LC_W / 2;
	const cy = X_HEIGHT / 2;
	const rx = LC_W / 2 - 80;
	const ry = X_HEIGHT / 2;
	const t = STEM - 10;
	const sides = 16;
	const ring = (radX: number, radY: number, ccw = false): Array<[number, number]> => {
		const pts: Array<[number, number]> = [];
		for (let i = 0; i < sides; i++) {
			const angle = (i / sides) * Math.PI * 2 * (ccw ? -1 : 1);
			pts.push([cx + Math.cos(angle) * radX, cy + Math.sin(angle) * radY]);
		}
		return pts;
	};
	return [poly(ring(rx, ry), 'cw'), poly(ring(rx - t, ry - t, true), 'ccw')];
};

const buildN_lc = (): BezierContour[] => [
	poly([
		[80, 0],
		[80 + STEM, 0],
		[80 + STEM, X_HEIGHT - STEM],
		[80, X_HEIGHT - STEM]
	]),
	poly([
		[80, X_HEIGHT - STEM],
		[LC_W - 80, X_HEIGHT - STEM],
		[LC_W - 80, X_HEIGHT],
		[80, X_HEIGHT]
	]),
	poly([
		[LC_W - STEM - 80, 0],
		[LC_W - 80, 0],
		[LC_W - 80, X_HEIGHT - STEM],
		[LC_W - STEM - 80, X_HEIGHT - STEM]
	])
];

// ---------- Assembly ----------

type GlyphSpec = {
	codepoint: number;
	contours: BezierContour[];
	advanceWidth: number;
	leftSidebearing: number;
	rightSidebearing: number;
	status: 'draft' | 'final' | 'sketch';
};

const DRAWN: GlyphSpec[] = [
	{ codepoint: 0x48, contours: buildH(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 80, status: 'final' },
	{ codepoint: 0x4f, contours: buildO(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 80, status: 'final' },
	{ codepoint: 0x54, contours: buildT(), advanceWidth: CAP_W, leftSidebearing: 60, rightSidebearing: 60, status: 'draft' },
	{ codepoint: 0x49, contours: buildI(), advanceWidth: Math.round(CAP_W * 0.6), leftSidebearing: 60, rightSidebearing: 60, status: 'draft' },
	{ codepoint: 0x45, contours: buildE(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 60, status: 'draft' },
	{ codepoint: 0x4e, contours: buildN(), advanceWidth: CAP_W + 20, leftSidebearing: 80, rightSidebearing: 80, status: 'draft' },
	{ codepoint: 0x6f, contours: buildO_lc(), advanceWidth: LC_W, leftSidebearing: 80, rightSidebearing: 80, status: 'draft' },
	{ codepoint: 0x6e, contours: buildN_lc(), advanceWidth: LC_W, leftSidebearing: 80, rightSidebearing: 80, status: 'sketch' }
];

/** Build a fresh demo project. Caller is expected to saveProject() it. */
export const createDemoProject = (): Project => {
	const project = createProject({
		name: 'Studio Geometric (example)',
		familyName: 'Studio Geometric Demo',
		kind: 'ui'
	});

	// Patch metrics to match the shapes (the kind preset is close but not exact).
	project.metrics = {
		...project.metrics,
		unitsPerEm: 1000,
		ascender: ASCENDER,
		descender: DESCENDER,
		capHeight: CAP_HEIGHT,
		xHeight: X_HEIGHT
	};

	// Inject drawn contours into existing glyph slots from the default set.
	for (const spec of DRAWN) {
		const g = project.glyphs[spec.codepoint];
		if (!g) continue;
		project.glyphs[spec.codepoint] = {
			...g,
			contours: spec.contours,
			advanceWidth: spec.advanceWidth,
			leftSidebearing: spec.leftSidebearing,
			rightSidebearing: spec.rightSidebearing,
			status: spec.status,
			updatedAt: new Date().toISOString()
		};
	}

	// Pre-fill the Brief so the user sees a complete project, not just glyphs.
	project.brief = {
		intent:
			'A neutral monolinear geometric sans for product UI at 12–28px. Example project — open the Edit tab to see how the H, O, n, and o were drawn, then start adding more glyphs.',
		useCases: ['web-ui', 'body-text'],
		audience: 'Designers and engineers exploring Font Studio for the first time',
		references: []
	};

	// A starter changelog entry so the Release tab shows something on first open.
	project.changelog = [
		{
			id: crypto.randomUUID(),
			version: '0.1.0-demo',
			date: new Date().toISOString(),
			notes:
				'Initial example project shipped with Font Studio. Eight drawn glyphs across uppercase + lowercase.'
		}
	];

	return project;
};
