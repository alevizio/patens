/**
 * In-app example project — opens a fully-set-up Patens project in the
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

/**
 * Cubic Bézier approximation of an axis-aligned ellipse, centered at
 * (cx, cy) with radii (rx, ry). Four cubic segments + kappa control
 * points produce a circle indistinguishable from the real thing at
 * editor zoom levels.
 *
 * `winding` controls direction:
 *   - 'cw'  fills the interior under the editor's CW-positive rule
 *           (used for outer contours of round letters)
 *   - 'ccw' subtracts (used for inner counters — the hole inside O/D/P/etc.)
 *
 * Kappa = 4/3 × tan(π/8) ≈ 0.5523.
 */
const KAPPA = 0.5522847498307936;
const curvedRing = (
	cx: number,
	cy: number,
	rx: number,
	ry: number,
	winding: 'cw' | 'ccw' = 'cw'
): BezierContour => {
	const k = KAPPA;
	// Editor's CW-labeled outer matches math-CCW traversal in Y-up
	// font space: right → top → left → bottom (matches the existing
	// `ring` polygon helper). CCW reverses for inner counters / holes.
	const cw = winding === 'cw';
	const sy = cw ? 1 : -1;
	const commands: PathCommand[] = [
		{ type: 'M', x: cx + rx, y: cy },
		{
			type: 'C',
			x1: cx + rx,
			y1: cy + sy * ry * k,
			x2: cx + rx * k,
			y2: cy + sy * ry,
			x: cx,
			y: cy + sy * ry
		},
		{
			type: 'C',
			x1: cx - rx * k,
			y1: cy + sy * ry,
			x2: cx - rx,
			y2: cy + sy * ry * k,
			x: cx - rx,
			y: cy
		},
		{
			type: 'C',
			x1: cx - rx,
			y1: cy - sy * ry * k,
			x2: cx - rx * k,
			y2: cy - sy * ry,
			x: cx,
			y: cy - sy * ry
		},
		{
			type: 'C',
			x1: cx + rx * k,
			y1: cy - sy * ry,
			x2: cx + rx,
			y2: cy - sy * ry * k,
			x: cx + rx,
			y: cy
		},
		{ type: 'Z' }
	];
	return { closed: true, winding, commands };
};

// ---------- Lowercase redraw primitives (2026-06 quality pass) ----------
//
// The original lowercase was rectangles + 16-gon rings — visibly faceted
// and "stencil"-broken at specimen sizes. These helpers carry the redraw:
// kappa-cubic rings with overshoot + optically-corrected wall weights,
// and the single-contour arch recipe ported from the proven static
// build-demo-fonts.mjs n (documented tangencies, no seam-sharing rects).

/** Round-letter overshoot — bowls breach baseline/x-height by this much
 *  so they read the same height as flat letters. */
/** Ring side wall — slightly heavier than the 90u stem so curves read
 *  the same weight as straights. */
const RING_SIDE = 94;
/** Ring top/bottom wall — optically thinned. */
const RING_CAP = 84;

/** Subtracting rect (math-CW vertex order = the editor's 'ccw' counter
 *  direction). Used to open apertures in ring walls (c, e mouths). */
const cutRect = (x0: number, y0: number, x1: number, y1: number): BezierContour =>
	poly(
		[
			[x0, y0],
			[x0, y1],
			[x1, y1],
			[x1, y0]
		],
		'ccw'
	);


/** 180-degree rotation inside a w-by-h box — orientation-preserving, so
 *  winding stays valid. u is the rotated n; the s bottom hook is the
 *  rotated top hook. */
const rotate180 = (c: BezierContour, w: number, h: number): BezierContour => ({
	...c,
	commands: c.commands.map((cmd) => {
		const m = { ...cmd } as PathCommand & { x1?: number; y1?: number; x2?: number; y2?: number; x?: number; y?: number };
		if ('x' in m && typeof m.x === 'number') m.x = w - m.x;
		if ('y' in m && typeof m.y === 'number') m.y = h - m.y;
		if ('x1' in m && typeof m.x1 === 'number') m.x1 = w - m.x1;
		if ('y1' in m && typeof m.y1 === 'number') m.y1 = h - m.y1;
		if ('x2' in m && typeof m.x2 === 'number') m.x2 = w - m.x2;
		if ('y2' in m && typeof m.y2 === 'number') m.y2 = h - m.y2;
		return m as PathCommand;
	})
});



// ---------- Squared-geometric primitives (2026-06 "Eurostile" pass) ----------
//
// The demo font's design language: SQUARED geometric — every round form
// is a rounded rectangle (Eurostile / Microgramma genre). This is the
// most parametric letterform system there is: bowls, arches, hooks and
// counters all derive from one rounded-rect primitive, so the whole
// alphabet stays optically consistent by construction.

/** Outer corner radius for lowercase bowls. */
const SQ_R = 110;
/** Counter corner radius — visibly rounded but squarer than the outer. */
const SQ_RI = 42;
/** Tiny corner radius for stem/beam ends (softens the grid, reads "machined"). */
const SQ_RS = 16;
/** Cap-scale outer / counter corner radii. */
const SQ_R_CAP = 130;
const SQ_RI_CAP = 46;
/** Squared-form overshoot — much smaller than circular forms need. */
const SQ_OVER = 8;

/**
 * Rounded rectangle contour. Radii are [bottomLeft, bottomRight,
 * topRight, topLeft], clamped to half the box. dir 'solid' traces
 * positive (math-CCW); 'counter' traces negative.
 */
const rr = (
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	radii: number | [number, number, number, number],
	dir: 'solid' | 'counter' = 'solid'
): BezierContour => {
	const k = KAPPA;
	const maxR = Math.min((x1 - x0) / 2, (y1 - y0) / 2);
	const [bl, br, tr, tl] = (
		typeof radii === 'number' ? [radii, radii, radii, radii] : radii
	).map((r) => Math.max(0, Math.min(r, maxR)));
	const commands: PathCommand[] = [{ type: 'M', x: x0 + bl, y: y0 }];
	const lineTo = (x: number, y: number) => commands.push({ type: 'L', x, y });
	const corner = (cx: number, cy: number, r: number, from: [number, number], to: [number, number]) => {
		if (r <= 0) return;
		commands.push({
			type: 'C',
			x1: from[0] + (cx - from[0]) * k,
			y1: from[1] + (cy - from[1]) * k,
			x2: to[0] + (cx - to[0]) * k,
			y2: to[1] + (cy - to[1]) * k,
			x: to[0],
			y: to[1]
		});
	};
	// CCW: bottom edge → BR corner → right edge → TR → top → TL → left → BL
	lineTo(x1 - br, y0);
	corner(x1, y0, br, [x1 - br, y0], [x1, y0 + br]);
	lineTo(x1, y1 - tr);
	corner(x1, y1, tr, [x1, y1 - tr], [x1 - tr, y1]);
	lineTo(x0 + tl, y1);
	corner(x0, y1, tl, [x0 + tl, y1], [x0, y1 - tl]);
	lineTo(x0, y0 + bl);
	corner(x0, y0, bl, [x0, y0 + bl], [x0 + bl, y0]);
	commands.push({ type: 'Z' });
	const contour: BezierContour = { closed: true, winding: 'cw', commands };
	return dir === 'solid' ? contour : reverseContourCmds(contour);
};

/** Reverse a contour's direction (positive <-> negative). */
const reverseContourCmds = (c: BezierContour): BezierContour => {
	const cmds = c.commands.filter((m) => m.type !== 'Z');
	const pts: Array<{ x: number; y: number }> = [];
	for (const m of cmds) if ('x' in m) pts.push({ x: m.x, y: m.y });
	const out: PathCommand[] = [{ type: 'M', x: pts[pts.length - 1].x, y: pts[pts.length - 1].y }];
	for (let i = cmds.length - 1; i >= 1; i--) {
		const seg = cmds[i];
		const target = pts[i - 1];
		if (seg.type === 'L') out.push({ type: 'L', x: target.x, y: target.y });
		else if (seg.type === 'C')
			out.push({ type: 'C', x1: seg.x2, y1: seg.y2, x2: seg.x1, y2: seg.y1, x: target.x, y: target.y });
	}
	out.push({ type: 'Z' });
	return { ...c, winding: c.winding === 'cw' ? 'ccw' : 'cw', commands: out };
};

/** Squared o-class ring: outer rounded-rect + counter. */
const sqRing = (
	x0: number,
	x1: number,
	yBottom: number,
	yTop: number
): BezierContour[] => [
	rr(x0, yBottom, x1, yTop, SQ_R),
	rr(x0 + RING_SIDE, yBottom + RING_CAP, x1 - RING_SIDE, yTop - RING_CAP, SQ_RI, 'counter')
];




/** Cubic corner command: from -> to around the corner point. */
const sqC = (
	fx: number,
	fy: number,
	ccx: number,
	ccy: number,
	tx: number,
	ty: number
): PathCommand => ({
	type: 'C',
	x1: fx + (ccx - fx) * KAPPA,
	y1: fy + (ccy - fy) * KAPPA,
	x2: tx + (ccx - tx) * KAPPA,
	y2: ty + (ccy - ty) * KAPPA,
	x: tx,
	y: ty
});

/** Squared arch outline (n skeleton): flat beam, rounded outer top-right
 *  corner, rounded counter top corners. leftTop > x-height makes the h. */
const sqArch = (lsb: number, width: number, leftTop: number): BezierContour => {
	const h = X_HEIGHT;
	const ri = SQ_RI;
	const xL = lsb;
	const xLi = lsb + STEM;
	const xRi = lsb + width - STEM;
	const xR = lsb + width;
	const beamY = h - 84;
	const commands: PathCommand[] = [
		{ type: 'M', x: xL, y: 0 },
		{ type: 'L', x: xLi, y: 0 },
		{ type: 'L', x: xLi, y: beamY - ri },
		sqC(xLi, beamY - ri, xLi, beamY, xLi + ri, beamY),
		{ type: 'L', x: xRi - ri, y: beamY },
		sqC(xRi - ri, beamY, xRi, beamY, xRi, beamY - ri),
		{ type: 'L', x: xRi, y: 0 },
		{ type: 'L', x: xR, y: 0 },
		{ type: 'L', x: xR, y: h - SQ_R },
		sqC(xR, h - SQ_R, xR, h, xR - SQ_R, h),
		...(leftTop > h
			? ([
					{ type: 'L', x: xLi, y: h },
					{ type: 'L', x: xLi, y: leftTop - SQ_RS },
					sqC(xLi, leftTop - SQ_RS, xLi, leftTop, xLi - SQ_RS, leftTop),
					{ type: 'L', x: xL + SQ_RS, y: leftTop },
					sqC(xL + SQ_RS, leftTop, xL, leftTop, xL, leftTop - SQ_RS)
				] as PathCommand[])
			: ([
					{ type: 'L', x: xL + SQ_RS, y: h },
					sqC(xL + SQ_RS, h, xL, h, xL, h - SQ_RS)
				] as PathCommand[])),
		{ type: 'L', x: xL, y: 0 },
		{ type: 'Z' }
	];
	return { closed: true, winding: 'cw', commands };
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
const buildO = (): BezierContour[] => [
	rr(80, -SQ_OVER, CAP_W - 80, CAP_HEIGHT + SQ_OVER, SQ_R_CAP),
	rr(80 + RING_SIDE, RING_CAP - SQ_OVER, CAP_W - 80 - RING_SIDE, CAP_HEIGHT + SQ_OVER - RING_CAP, SQ_RI_CAP, 'counter')
];


const buildO_lc = (): BezierContour[] => sqRing(80, LC_W - 80, -SQ_OVER, X_HEIGHT + SQ_OVER);


// M — left stem, two angled inner stems meeting at center-bottom, right stem.
const buildM = (): BezierContour[] => {
	const W = CAP_W + 60;
	return [
		poly([
			[80, 0],
			[80 + STEM, 0],
			[80 + STEM, CAP_HEIGHT],
			[80, CAP_HEIGHT]
		]),
		poly([
			[W - 80 - STEM, 0],
			[W - 80, 0],
			[W - 80, CAP_HEIGHT],
			[W - 80 - STEM, CAP_HEIGHT]
		]),
		// Inner diagonals meeting at center-bottom
		poly([
			[80 + STEM, CAP_HEIGHT],
			[80 + STEM + 40, CAP_HEIGHT],
			[W / 2 + STEM / 2, 200],
			[W / 2 - STEM / 2, 200]
		]),
		poly([
			[W - 80 - STEM - 40, CAP_HEIGHT],
			[W - 80 - STEM, CAP_HEIGHT],
			[W / 2 + STEM / 2, 200],
			[W / 2 - STEM / 2, 200]
		])
	];
};

// R — vertical stem + curved upper-half bowl + diagonal leg.
const buildR = (): BezierContour[] => {
	const bowlBottom = Math.round(CAP_HEIGHT * 0.45);
	const bowlRight = CAP_W - 80;
	return [
		rr(80, bowlBottom, bowlRight, CAP_HEIGHT, [0, SQ_R_CAP, SQ_R_CAP, 0]),
		rr(80, 0, 80 + STEM, bowlBottom, 0),
		rr(80 + STEM, bowlBottom + 84, bowlRight - RING_SIDE, CAP_HEIGHT - 84, [0, SQ_RI_CAP, SQ_RI_CAP, 0], 'counter'),
		// Diagonal leg
		poly([
			[bowlRight - STEM, 0],
			[bowlRight + 10, 0],
			[bowlRight - STEM * 1.5 + STEM, bowlBottom],
			[bowlRight - STEM * 1.5, bowlBottom]
		])
	];
};


// P — vertical stem + curved upper-half bowl.
const buildP = (): BezierContour[] => [
	// Bowl block (upper) + abutting lower stem
	rr(80, Math.round(CAP_HEIGHT * 0.45), CAP_W - 60, CAP_HEIGHT, [0, SQ_R_CAP, SQ_R_CAP, 0]),
	rr(80, 0, 80 + STEM, Math.round(CAP_HEIGHT * 0.45), 0),
	rr(80 + STEM, Math.round(CAP_HEIGHT * 0.45) + 84, CAP_W - 60 - RING_SIDE, CAP_HEIGHT - 84, [0, SQ_RI_CAP, SQ_RI_CAP, 0], 'counter')
];


// F — vertical stem + top bar + middle bar.
const buildF = (): BezierContour[] => [
	poly([
		[80, 0],
		[80 + STEM, 0],
		[80 + STEM, CAP_HEIGHT],
		[80, CAP_HEIGHT]
	]),
	// Top bar
	poly([
		[80, CAP_HEIGHT - BAR],
		[CAP_W - 60, CAP_HEIGHT - BAR],
		[CAP_W - 60, CAP_HEIGHT],
		[80, CAP_HEIGHT]
	]),
	// Middle bar
	poly([
		[80, CAP_HEIGHT / 2 - BAR / 2],
		[CAP_W - 100, CAP_HEIGHT / 2 - BAR / 2],
		[CAP_W - 100, CAP_HEIGHT / 2 + BAR / 2],
		[80, CAP_HEIGHT / 2 + BAR / 2]
	])
];

// S — three horizontal bars connected by short diagonals. Geometric
// approximation, easier than a true curve-based S.
const buildS = (): BezierContour[] => {
	// Squared S: cap-scale rounded hooks + middle bar (same construction
	// as the lowercase s).
	const wall = rr(70, CAP_HEIGHT / 2, 166, CAP_HEIGHT, [0, 0, 0, 80]);
	const beam = rr(166, CAP_HEIGHT - 84, CAP_W - 70, CAP_HEIGHT, [0, 0, SQ_RS, 0]);
	return [
		wall,
		beam,
		rotate180(wall, CAP_W, CAP_HEIGHT),
		rotate180(beam, CAP_W, CAP_HEIGHT),
		poly([
			[166, CAP_HEIGHT / 2 - 42],
			[CAP_W - 166, CAP_HEIGHT / 2 - 42],
			[CAP_W - 166, CAP_HEIGHT / 2 + 42],
			[166, CAP_HEIGHT / 2 + 42]
		])
	];
};


// Geometric digits — tabular-width, cap-height tall. Stem width matches
// the letters. Each digit is a small composition of rects + (where
// needed) the ring helper from buildO.
const DIGIT_W = Math.round(CAP_W * 0.65);const build0 = (): BezierContour[] => [
	rr(60, -SQ_OVER, DIGIT_W - 60, CAP_HEIGHT + SQ_OVER, 110),
	rr(60 + RING_SIDE, RING_CAP - SQ_OVER, DIGIT_W - 60 - RING_SIDE, CAP_HEIGHT + SQ_OVER - RING_CAP, 36, 'counter')
];

const build1 = (): BezierContour[] => [
	poly([
		[DIGIT_W / 2 - STEM / 2, 0],
		[DIGIT_W / 2 + STEM / 2, 0],
		[DIGIT_W / 2 + STEM / 2, CAP_HEIGHT],
		[DIGIT_W / 2 - STEM / 2, CAP_HEIGHT]
	]),
	// Flag/serif at top
	poly([
		[DIGIT_W / 2 - STEM / 2 - 80, CAP_HEIGHT - 100],
		[DIGIT_W / 2 - STEM / 2, CAP_HEIGHT],
		[DIGIT_W / 2 - STEM / 2 + 20, CAP_HEIGHT - 80],
		[DIGIT_W / 2 - STEM / 2 - 60, CAP_HEIGHT - 180]
	])
];
const build2 = (): BezierContour[] => {
	// Top arc → diagonal → bottom bar. Simplified as five rects.
	const w = DIGIT_W;
	return [
		// Top bar
		poly([
			[60, CAP_HEIGHT - BAR],
			[w - 60, CAP_HEIGHT - BAR],
			[w - 60, CAP_HEIGHT],
			[60, CAP_HEIGHT]
		]),
		// Right top stem (cap level to middle)
		poly([
			[w - 60 - STEM, CAP_HEIGHT * 0.55],
			[w - 60, CAP_HEIGHT * 0.55],
			[w - 60, CAP_HEIGHT - BAR],
			[w - 60 - STEM, CAP_HEIGHT - BAR]
		]),
		// Diagonal as a slanted rect
		poly([
			[60, BAR],
			[60 + STEM, 0],
			[w - 60, CAP_HEIGHT * 0.55],
			[w - 60 - STEM, CAP_HEIGHT * 0.55 - BAR]
		]),
		// Bottom bar
		poly([
			[60, 0],
			[w - 60, 0],
			[w - 60, BAR],
			[60, BAR]
		])
	];
};
const build3 = (): BezierContour[] => {
	const w = DIGIT_W;
	const upper = CAP_HEIGHT * 0.6;
	return [
		// Top bar
		poly([[60, CAP_HEIGHT - BAR], [w - 60, CAP_HEIGHT - BAR], [w - 60, CAP_HEIGHT], [60, CAP_HEIGHT]]),
		// Right top stem
		poly([[w - 60 - STEM, upper], [w - 60, upper], [w - 60, CAP_HEIGHT - BAR], [w - 60 - STEM, CAP_HEIGHT - BAR]]),
		// Middle bar
		poly([[60, upper - BAR], [w - 60, upper - BAR], [w - 60, upper], [60, upper]]),
		// Right bottom stem
		poly([[w - 60 - STEM, BAR], [w - 60, BAR], [w - 60, upper - BAR], [w - 60 - STEM, upper - BAR]]),
		// Bottom bar
		poly([[60, 0], [w - 60, 0], [w - 60, BAR], [60, BAR]])
	];
};
const build4 = (): BezierContour[] => {
	const w = DIGIT_W;
	const mid = CAP_HEIGHT * 0.4;
	return [
		// Right stem (full height)
		poly([[w - 60 - STEM, 0], [w - 60, 0], [w - 60, CAP_HEIGHT], [w - 60 - STEM, CAP_HEIGHT]]),
		// Left stem (top half down to crossbar)
		poly([[60, mid], [60 + STEM, mid], [60 + STEM, CAP_HEIGHT], [60, CAP_HEIGHT]]),
		// Crossbar
		poly([[60, mid - BAR], [w - 60, mid - BAR], [w - 60, mid], [60, mid]])
	];
};
const build5 = (): BezierContour[] => {
	const w = DIGIT_W;
	const upper = CAP_HEIGHT * 0.55;
	return [
		// Top bar
		poly([[60, CAP_HEIGHT - BAR], [w - 60, CAP_HEIGHT - BAR], [w - 60, CAP_HEIGHT], [60, CAP_HEIGHT]]),
		// Left top stem
		poly([[60, upper], [60 + STEM, upper], [60 + STEM, CAP_HEIGHT - BAR], [60, CAP_HEIGHT - BAR]]),
		// Middle bar
		poly([[60, upper - BAR], [w - 60, upper - BAR], [w - 60, upper], [60, upper]]),
		// Right bottom stem
		poly([[w - 60 - STEM, BAR], [w - 60, BAR], [w - 60, upper - BAR], [w - 60 - STEM, upper - BAR]]),
		// Bottom bar
		poly([[60, 0], [w - 60, 0], [w - 60, BAR], [60, BAR]])
	];
};
const build6 = (): BezierContour[] => {
	const w = DIGIT_W;
	const mid = CAP_HEIGHT * 0.5;
	return [
		// Outer left stem (top to bottom)
		poly([[60, 0], [60 + STEM, 0], [60 + STEM, CAP_HEIGHT], [60, CAP_HEIGHT]]),
		// Top bar
		poly([[60 + STEM, CAP_HEIGHT - BAR], [w - 60, CAP_HEIGHT - BAR], [w - 60, CAP_HEIGHT], [60 + STEM, CAP_HEIGHT]]),
		// Middle bar (closes the bowl)
		poly([[60 + STEM, mid], [w - 60, mid], [w - 60, mid + BAR], [60 + STEM, mid + BAR]]),
		// Bottom bowl right stem
		poly([[w - 60 - STEM, BAR], [w - 60, BAR], [w - 60, mid + BAR], [w - 60 - STEM, mid + BAR]]),
		// Bottom bar
		poly([[60, 0], [w - 60, 0], [w - 60, BAR], [60, BAR]])
	];
};
const build7 = (): BezierContour[] => {
	const w = DIGIT_W;
	return [
		// Top bar
		poly([[60, CAP_HEIGHT - BAR], [w - 60, CAP_HEIGHT - BAR], [w - 60, CAP_HEIGHT], [60, CAP_HEIGHT]]),
		// Diagonal stem
		poly([
			[w - 60 - STEM, CAP_HEIGHT - BAR],
			[w - 60, CAP_HEIGHT - BAR],
			[60 + STEM, 0],
			[60, 0]
		])
	];
};
const build8 = (): BezierContour[] => {
	const w = DIGIT_W;
	const mid = CAP_HEIGHT * 0.5;
	return [
		// Top bowl outer
		curvedRing(w / 2, (CAP_HEIGHT + mid + BAR / 2) / 2, w / 2 - 60, (CAP_HEIGHT - mid - BAR / 2) / 2, 'cw'),
		curvedRing(w / 2, (CAP_HEIGHT + mid + BAR / 2) / 2, w / 2 - 60 - (STEM - 10), (CAP_HEIGHT - mid - BAR / 2) / 2 - (STEM - 10), 'ccw'),
		// Bottom bowl outer
		curvedRing(w / 2, (mid - BAR / 2) / 2, w / 2 - 60, (mid - BAR / 2) / 2, 'cw'),
		curvedRing(w / 2, (mid - BAR / 2) / 2, w / 2 - 60 - (STEM - 10), (mid - BAR / 2) / 2 - (STEM - 10), 'ccw')
	];
};
// B — vertical stem + two stacked half-rings (top + bottom bowls).
const buildB = (): BezierContour[] => [
	rr(80, 0, CAP_W - 70, CAP_HEIGHT, [0, 110, 110, 0]),
	rr(80 + STEM, CAP_HEIGHT / 2 + 36, CAP_W - 70 - 94, CAP_HEIGHT - 84, [0, 40, 40, 0], 'counter'),
	rr(80 + STEM, 84, CAP_W - 70 - 94, CAP_HEIGHT / 2 - 36, [0, 40, 40, 0], 'counter')
];


// C — curved ring with the right-side wall cut out by an inner-counter
// punch. The inner counter (CCW) extends past the outer-right wall so
// the mouth is "open" — non-zero winding rule subtracts the inner from
// the outer, but the inner's right portion lies outside the outer,
// leaving an opening on the right side of the ring.
const buildC = (): BezierContour[] => {
	const x1 = CAP_W - 80;
	const cy = CAP_HEIGHT / 2;
	return [
		rr(80, -SQ_OVER, x1, CAP_HEIGHT + SQ_OVER, SQ_R_CAP),
		rr(80 + RING_SIDE, RING_CAP - SQ_OVER, x1 - RING_SIDE, CAP_HEIGHT + SQ_OVER - RING_CAP, SQ_RI_CAP, 'counter'),
		cutRect(x1 - RING_SIDE + 1, cy - 160, x1 - 2, cy + 160)
	];
};


// D — vertical stem + full-height curved bowl.
const buildD = (): BezierContour[] => [
	rr(80, 0, CAP_W - 60, CAP_HEIGHT, [0, SQ_R_CAP, SQ_R_CAP, 0]),
	rr(80 + STEM, 84, CAP_W - 60 - RING_SIDE, CAP_HEIGHT - 84, [0, SQ_RI_CAP, SQ_RI_CAP, 0], 'counter')
];


// G — C-style ring + horizontal spur at mid-right reaching into the
// counter from the right wall.
const buildG = (): BezierContour[] => {
	const x1 = CAP_W - 80;
	const cy = CAP_HEIGHT / 2;
	return [
		rr(80, -SQ_OVER, x1, CAP_HEIGHT + SQ_OVER, SQ_R_CAP),
		rr(80 + RING_SIDE, RING_CAP - SQ_OVER, x1 - RING_SIDE, CAP_HEIGHT + SQ_OVER - RING_CAP, SQ_RI_CAP, 'counter'),
		// Aperture above the spur only
		cutRect(x1 - RING_SIDE + 1, cy + STEM / 2, x1 - 2, cy + 200),
		// Spur — abuts the counter edge, fills across to the wall
		poly([
			[CAP_W / 2, cy - STEM / 2],
			[x1 - RING_SIDE, cy - STEM / 2],
			[x1 - RING_SIDE, cy + STEM / 2],
			[CAP_W / 2, cy + STEM / 2]
		])
	];
};


// U — two vertical stems + curved bottom bowl. The bowl is a full ring
// at the bottom; the stems cover its top half via a CW rect-style cover
// would clash with curve winding, so we use a different approach: the
// stems extend from cap-top down to the bowl's center, and a wide rect
// across the bowl's top half punches out the inside.
const buildU = (): BezierContour[] => {
	const W = CAP_W;
	const H = CAP_HEIGHT;
	const R = SQ_R_CAP;
	const ri = SQ_RI_CAP;
	const u: BezierContour = {
		closed: true,
		winding: 'cw',
		commands: [
			{ type: 'M', x: 80, y: H },
			{ type: 'L', x: 80, y: -SQ_OVER + R },
			sqC(80, -SQ_OVER + R, 80, -SQ_OVER, 80 + R, -SQ_OVER),
			{ type: 'L', x: W - 80 - R, y: -SQ_OVER },
			sqC(W - 80 - R, -SQ_OVER, W - 80, -SQ_OVER, W - 80, -SQ_OVER + R),
			{ type: 'L', x: W - 80, y: H },
			{ type: 'L', x: W - 80 - STEM, y: H },
			{ type: 'L', x: W - 80 - STEM, y: RING_CAP - SQ_OVER + ri },
			sqC(W - 80 - STEM, RING_CAP - SQ_OVER + ri, W - 80 - STEM, RING_CAP - SQ_OVER, W - 80 - STEM - ri, RING_CAP - SQ_OVER),
			{ type: 'L', x: 80 + STEM + ri, y: RING_CAP - SQ_OVER },
			sqC(80 + STEM + ri, RING_CAP - SQ_OVER, 80 + STEM, RING_CAP - SQ_OVER, 80 + STEM, RING_CAP - SQ_OVER + ri),
			{ type: 'L', x: 80 + STEM, y: H },
			{ type: 'L', x: 80, y: H },
			{ type: 'Z' }
		]
	};
	return [u];
};


// Y — V meeting at mid + vertical stub extending down.
const buildY = (): BezierContour[] => {
	const mid = CAP_HEIGHT * 0.5;
	return [
		// Left angled stem (top to center)
		poly([
			[60, CAP_HEIGHT],
			[60 + STEM, CAP_HEIGHT],
			[CAP_W / 2 + STEM / 2, mid],
			[CAP_W / 2 - STEM / 2, mid]
		]),
		// Right angled stem (top to center)
		poly([
			[CAP_W - 60 - STEM, CAP_HEIGHT],
			[CAP_W - 60, CAP_HEIGHT],
			[CAP_W / 2 + STEM / 2, mid],
			[CAP_W / 2 - STEM / 2, mid]
		]),
		// Vertical stem from center to baseline
		poly([[CAP_W / 2 - STEM / 2, 0], [CAP_W / 2 + STEM / 2, 0], [CAP_W / 2 + STEM / 2, mid], [CAP_W / 2 - STEM / 2, mid]])
	];
};

// K — vertical stem + diagonal arms (upper + lower).
const buildK = (): BezierContour[] => {
	const mid = CAP_HEIGHT / 2;
	return [
		poly([[80, 0], [80 + STEM, 0], [80 + STEM, CAP_HEIGHT], [80, CAP_HEIGHT]]),
		// Upper diagonal arm
		poly([
			[80 + STEM, mid + BAR / 2],
			[80 + STEM + 30, mid],
			[CAP_W - 80, CAP_HEIGHT],
			[CAP_W - 80 - 80, CAP_HEIGHT]
		]),
		// Lower diagonal arm (vertex order kept non-self-crossing)
		poly([
			[80 + STEM, mid - BAR / 2],
			[CAP_W - 80 - 80, 0],
			[CAP_W - 80, 0],
			[80 + STEM + 30, mid]
		])
	];
};

// X — two diagonals crossing.
const buildX = (): BezierContour[] => [
	poly([
		[60, CAP_HEIGHT],
		[60 + STEM, CAP_HEIGHT],
		[CAP_W - 60, 0],
		[CAP_W - 60 - STEM, 0]
	]),
	poly([
		[CAP_W - 60 - STEM, CAP_HEIGHT],
		[CAP_W - 60, CAP_HEIGHT],
		[60 + STEM, 0],
		[60, 0]
	])
];

// J — short top bar + vertical stem with curve at bottom (approximated).
const buildJ = (): BezierContour[] => [
	poly([
		[CAP_W / 2 - STEM / 2, BAR],
		[CAP_W / 2 + STEM / 2, BAR],
		[CAP_W / 2 + STEM / 2, CAP_HEIGHT],
		[CAP_W / 2 - STEM / 2, CAP_HEIGHT]
	]),
	// Bottom hook
	poly([
		[80, 0],
		[CAP_W / 2 + STEM / 2, 0],
		[CAP_W / 2 + STEM / 2, BAR],
		[80, BAR]
	]),
	// Left tail going up
	poly([
		[80, BAR],
		[80 + STEM, BAR],
		[80 + STEM, BAR + 150],
		[80, BAR + 150]
	])
];

// Q — O with diagonal tail extending below baseline.
const buildQ = (): BezierContour[] => [
	rr(80, -SQ_OVER, CAP_W - 80, CAP_HEIGHT + SQ_OVER, SQ_R_CAP),
	rr(80 + RING_SIDE, RING_CAP - SQ_OVER, CAP_W - 80 - RING_SIDE, CAP_HEIGHT + SQ_OVER - RING_CAP, SQ_RI_CAP, 'counter'),
	// Tail from bottom-right to below baseline
	poly([
		[CAP_W - 60 - STEM, -100],
		[CAP_W - 60, -100],
		[CAP_W / 2 + 40 + STEM, BAR * 1.5],
		[CAP_W / 2 + 40, BAR * 1.5]
	])
];


// W — two V shapes side by side.
const buildW = (): BezierContour[] => {
	const w = CAP_W + 120;
	const H = CAP_HEIGHT;
	const b1 = Math.round(w * 0.35);
	const b2 = Math.round(w * 0.65);
	const midX = Math.round(w / 2);
	const outline: BezierContour = {
		closed: true,
		winding: 'cw',
		commands: [
			{ type: 'M', x: 60, y: H },
			{ type: 'L', x: b1 - 45, y: 0 },
			{ type: 'L', x: b1 + 45, y: 0 },
			{ type: 'L', x: midX, y: H - 380 },
			{ type: 'L', x: b2 - 45, y: 0 },
			{ type: 'L', x: b2 + 45, y: 0 },
			{ type: 'L', x: w - 60, y: H },
			{ type: 'L', x: w - 150, y: H },
			{ type: 'L', x: b2, y: 150 },
			{ type: 'L', x: midX, y: H - 150 },
			{ type: 'L', x: b1, y: 150 },
			{ type: 'L', x: 150, y: H },
			{ type: 'Z' }
		]
	};
	return [outline];
};


// Z — top bar + diagonal + bottom bar.
const buildZ = (): BezierContour[] => [
	poly([[60, CAP_HEIGHT - BAR], [CAP_W - 60, CAP_HEIGHT - BAR], [CAP_W - 60, CAP_HEIGHT], [60, CAP_HEIGHT]]),
	poly([
		[60, BAR],
		[60 + STEM, 0],
		[CAP_W - 60, CAP_HEIGHT - BAR],
		[CAP_W - 60 - STEM, CAP_HEIGHT - 2 * BAR]
	]),
	poly([[60, 0], [CAP_W - 60, 0], [CAP_W - 60, BAR], [60, BAR]])
];

// lowercase b — bowl + left stem with full ascender (mirror of d).
const buildB_lc = (): BezierContour[] => [
	// Bowl block + abutting ascender — exact shared edges, no overlap.
	rr(80, -SQ_OVER, LC_W - 80, X_HEIGHT + SQ_OVER, [SQ_RS, SQ_R, SQ_R, 0]),
	rr(80, X_HEIGHT + SQ_OVER, 80 + STEM, Math.round(X_HEIGHT * 1.5), [0, 0, SQ_RS, SQ_RS]),
	rr(80 + STEM, RING_CAP - SQ_OVER, LC_W - 80 - RING_SIDE, X_HEIGHT + SQ_OVER - RING_CAP, [0, SQ_RI, SQ_RI, 0], 'counter')
];


// lowercase f — vertical stem with short ascender + crossbar at x-height.
const buildF_lc = (): BezierContour[] => {
	const cx = LC_W / 2 - 60;
	return [
		rr(cx - 45, 0, cx + 45, 750, [0, 0, 0, SQ_RS]),
		rr(cx + 45, 666, cx + 215, 750, [0, 0, SQ_RS, 0]),
		// Crossbar split around the stem (abutting, never overlapping)
		poly([
			[80, X_HEIGHT - BAR],
			[cx - 45, X_HEIGHT - BAR],
			[cx - 45, X_HEIGHT],
			[80, X_HEIGHT]
		]),
		poly([
			[cx + 45, X_HEIGHT - BAR],
			[LC_W - 80, X_HEIGHT - BAR],
			[LC_W - 80, X_HEIGHT],
			[cx + 45, X_HEIGHT]
		])
	];
};



// lowercase g — bowl + right stem with descender + bottom hook.
const buildG_lc = (): BezierContour[] => [
	// Squared single-storey g: a-block + descender stem + hook beam,
	// all abutting.
	rr(80, -SQ_OVER, LC_W - 80, X_HEIGHT, [SQ_R, SQ_RS, SQ_RS, SQ_R]),
	rr(80 + RING_SIDE, RING_CAP - SQ_OVER, LC_W - 80 - STEM, X_HEIGHT - RING_CAP, [SQ_RI, 0, 0, SQ_RI], 'counter'),
	rr(LC_W - 80 - STEM, -116, LC_W - 80, -SQ_OVER, 0),
	rr(180, -200, LC_W - 80, -116, [60, SQ_RS, 0, 0])
];




// lowercase y — V shape with descender tail.
const buildY_lc = (): BezierContour[] => {
	const mid = X_HEIGHT * 0.5;
	return [
		// Left angled stem (top of x-height to mid)
		poly([
			[LC_W / 2 - STEM / 2, mid],
			[LC_W / 2 + STEM / 2, mid],
			[60 + STEM, X_HEIGHT],
			[60, X_HEIGHT]
		]),
		// Right angled stem (top of x-height to mid)
		poly([
			[LC_W / 2 - STEM / 2, mid],
			[LC_W / 2 + STEM / 2, mid],
			[LC_W - 60, X_HEIGHT],
			[LC_W - 60 - STEM, X_HEIGHT]
		]),
		// Vertical stem from mid down into descender
		poly([
			[LC_W / 2 - STEM / 2, -200],
			[LC_W / 2 + STEM / 2, -200],
			[LC_W / 2 + STEM / 2, mid],
			[LC_W / 2 - STEM / 2, mid]
		])
	];
};

// lowercase v — small V, same as cap V at x-height.
const buildV_lc = (): BezierContour[] => [
	poly([
		[LC_W / 2 - STEM / 2, 0],
		[LC_W / 2 + STEM / 2, 0],
		[60 + STEM, X_HEIGHT],
		[60, X_HEIGHT]
	]),
	poly([
		[LC_W / 2 - STEM / 2, 0],
		[LC_W / 2 + STEM / 2, 0],
		[LC_W - 60, X_HEIGHT],
		[LC_W - 60 - STEM, X_HEIGHT]
	])
];

// lowercase w — double-V at x-height.
const buildW_lc = (): BezierContour[] => {
	// Single-contour double-V: shared middle apex, no overlapping strokes.
	const w = LC_W + 80;
	const b1 = Math.round(w * 0.35);
	const b2 = Math.round(w * 0.65);
	const midX = Math.round(w / 2);
	const outline: BezierContour = {
		closed: true,
		winding: 'cw',
		commands: [
			{ type: 'M', x: 40, y: X_HEIGHT },
			{ type: 'L', x: b1 - 45, y: 0 },
			{ type: 'L', x: b1 + 45, y: 0 },
			{ type: 'L', x: midX, y: X_HEIGHT - 280 },
			{ type: 'L', x: b2 - 45, y: 0 },
			{ type: 'L', x: b2 + 45, y: 0 },
			{ type: 'L', x: w - 40, y: X_HEIGHT },
			{ type: 'L', x: w - 130, y: X_HEIGHT },
			{ type: 'L', x: b2, y: 110 },
			{ type: 'L', x: midX, y: X_HEIGHT - 110 },
			{ type: 'L', x: b1, y: 110 },
			{ type: 'L', x: 130, y: X_HEIGHT },
			{ type: 'Z' }
		]
	};
	return [outline];
};


// lowercase k — vertical stem with ascender + diagonals.
const buildK_lc = (): BezierContour[] => {
	const mid = X_HEIGHT / 2;
	return [
		poly([[80, 0], [80 + STEM, 0], [80 + STEM, Math.round(X_HEIGHT * 1.5)], [80, Math.round(X_HEIGHT * 1.5)]]),
		poly([
			[80 + STEM, mid + BAR / 2],
			[80 + STEM + 30, mid],
			[LC_W - 80, X_HEIGHT],
			[LC_W - 80 - 80, X_HEIGHT]
		]),
		poly([
			[80 + STEM, mid - BAR / 2],
			[LC_W - 80 - 80, 0],
			[LC_W - 80, 0],
			[80 + STEM + 30, mid]
		])
	];
};

// lowercase j — stem with descender + dot floating above x-height.
const buildJ_lc = (): BezierContour[] => {
	const cx = LC_W / 2;
	return [
		// Main stem (from descender to x-height)
		poly([
			[cx - STEM / 2, -100],
			[cx + STEM / 2, -100],
			[cx + STEM / 2, X_HEIGHT],
			[cx - STEM / 2, X_HEIGHT]
		]),
		// Bottom-left hook
		poly([
			[80, -200],
			[cx + STEM / 2, -200],
			[cx + STEM / 2, -100],
			[80, -100]
		]),
		// Tail going up at the left
		poly([
			[80, -100],
			[80 + STEM, -100],
			[80 + STEM, -100 + 100],
			[80, -100 + 100]
		]),
		// Dot floating above x-height
		poly([
			[cx - STEM / 2, X_HEIGHT + 60],
			[cx + STEM / 2, X_HEIGHT + 60],
			[cx + STEM / 2, X_HEIGHT + 180],
			[cx - STEM / 2, X_HEIGHT + 180]
		])
	];
};

// lowercase q — bowl + right stem with descender (mirror of g).
const buildQ_lc = (): BezierContour[] => [
	rr(80, -SQ_OVER, LC_W - 80, X_HEIGHT + SQ_OVER, [SQ_R, 0, SQ_RS, SQ_R]),
	rr(LC_W - 80 - STEM, -200, LC_W - 80, -SQ_OVER, [SQ_RS, SQ_RS, 0, 0]),
	rr(80 + RING_SIDE, RING_CAP - SQ_OVER, LC_W - 80 - STEM, X_HEIGHT + SQ_OVER - RING_CAP, [SQ_RI, 0, 0, SQ_RI], 'counter')
];


// lowercase u — two stems + bottom bar (mirror of n).
const buildU_lc = (): BezierContour[] => [rotate180(sqArch(80, LC_W - 160, X_HEIGHT), LC_W, X_HEIGHT)];


// lowercase c — left stem + top bar + bottom bar (open on the right).
const buildC_lc = (): BezierContour[] => {
	const x0 = 80;
	const x1 = LC_W - 80;
	const yB = -SQ_OVER;
	const yT = X_HEIGHT + SQ_OVER;
	const cy = X_HEIGHT / 2;
	return [
		rr(x0, yB, x1, yT, SQ_R),
		rr(x0 + RING_SIDE, yB + RING_CAP, x1 - RING_SIDE, yT - RING_CAP, SQ_RI, 'counter'),
		cutRect(x1 - RING_SIDE + 1, cy - 120, x1 - 2, cy + 120)
	];
};



// lowercase d — bowl + right stem with full ascender (mirror of b).
const buildD_lc = (): BezierContour[] => [
	rr(80, -SQ_OVER, LC_W - 80, X_HEIGHT + SQ_OVER, [SQ_R, SQ_RS, 0, SQ_R]),
	rr(LC_W - 80 - STEM, X_HEIGHT + SQ_OVER, LC_W - 80, Math.round(X_HEIGHT * 1.5), [0, 0, SQ_RS, SQ_RS]),
	rr(80 + RING_SIDE, RING_CAP - SQ_OVER, LC_W - 80 - STEM, X_HEIGHT + SQ_OVER - RING_CAP, [SQ_RI, 0, 0, SQ_RI], 'counter')
];




// lowercase p — bowl + left stem with descender (mirror of d/b).
const buildP_lc = (): BezierContour[] => [
	rr(80, -SQ_OVER, LC_W - 80, X_HEIGHT + SQ_OVER, [0, SQ_R, SQ_R, SQ_RS]),
	rr(80, -200, 80 + STEM, -SQ_OVER, [SQ_RS, SQ_RS, 0, 0]),
	rr(80 + STEM, RING_CAP - SQ_OVER, LC_W - 80 - RING_SIDE, X_HEIGHT + SQ_OVER - RING_CAP, [0, SQ_RI, SQ_RI, 0], 'counter')
];


// Ж (Zhe, U+0416) — symmetric, like K mirrored back-to-back. Central
// vertical stem with two diagonal arms reaching to each side at the
// upper-half and lower-half angles. Wider advance than CAP_W because
// of the splayed arms.
const buildZhe = (): BezierContour[] => {
	const mid = CAP_HEIGHT / 2;
	const cx = (CAP_W + 80) / 2; // x-center accounting for wider advance
	const armSpread = 220;
	const armEdgeWidth = 80; // top edge width of each arm
	return [
		// Central vertical stem
		poly([
			[cx - STEM / 2, 0],
			[cx + STEM / 2, 0],
			[cx + STEM / 2, CAP_HEIGHT],
			[cx - STEM / 2, CAP_HEIGHT]
		]),
		// Upper-left arm — from stem upper-junction out to top-left
		poly([
			[cx - STEM / 2, mid + BAR / 2],
			[cx - STEM / 2 - 30, mid],
			[cx - armSpread, CAP_HEIGHT],
			[cx - armSpread + armEdgeWidth, CAP_HEIGHT]
		]),
		// Upper-right arm — from stem upper-junction out to top-right
		poly([
			[cx + STEM / 2, mid + BAR / 2],
			[cx + STEM / 2 + 30, mid],
			[cx + armSpread, CAP_HEIGHT],
			[cx + armSpread - armEdgeWidth, CAP_HEIGHT]
		]),
		// Lower-left arm — from stem lower-junction out to bottom-left
		poly([
			[cx - STEM / 2, mid - BAR / 2],
			[cx - STEM / 2 - 30, mid],
			[cx - armSpread + armEdgeWidth, 0],
			[cx - armSpread, 0]
		]),
		// Lower-right arm — from stem lower-junction out to bottom-right
		poly([
			[cx + STEM / 2, mid - BAR / 2],
			[cx + STEM / 2 + 30, mid],
			[cx + armSpread - armEdgeWidth, 0],
			[cx + armSpread, 0]
		])
	];
};

// Ф (Ef, U+0424) — vertical stem extending top + bottom past a
// centered O. Stem caps approximate where ascender/descender of
// the bowl meet — actually, geometric Ф has the stem reach the
// cap-line + baseline, so the bowl sits inside.
const buildEf = (): BezierContour[] => {
	const cx = CAP_W / 2;
	const cy = CAP_HEIGHT / 2;
	const rx = (CAP_W - 80 * 2) / 2 - 20;
	const ry = CAP_HEIGHT / 2 - 40;
	const t = STEM - 10;
	return [
		// Outer bowl (clockwise)
		curvedRing(cx, cy, rx, ry, 'cw'),
		// Inner bowl (counter-clockwise so the fill creates a counter)
		curvedRing(cx, cy, rx - t, ry - t, 'ccw'),
		// Vertical stem — full cap height, centered
		poly([
			[cx - STEM / 2, 0],
			[cx + STEM / 2, 0],
			[cx + STEM / 2, CAP_HEIGHT],
			[cx - STEM / 2, CAP_HEIGHT]
		])
	];
};

// Lowercase letters — the high-frequency set so the Bringhurst sample
// paragraph renders. Each one fits the x-height envelope (h, t use a
// short ascender; r/s/i/e stay within x-height).

// lowercase e — bowl shape with horizontal middle bar (closed counter).
const buildE_lc = (): BezierContour[] => {
	// Squared e: rounded-rect ring; the crossbar IS the flat edges of two
	// rounded-rect counters; mouth opens the straight section of the
	// right wall. Overlap-free by construction.
	const x0 = 80;
	const x1 = LC_W - 80;
	const yB = -SQ_OVER;
	const yT = X_HEIGHT + SQ_OVER;
	const cy = X_HEIGHT / 2;
	const barHalf = 40;
	return [
		rr(x0, yB, x1, yT, SQ_R),
		rr(x0 + RING_SIDE, cy + barHalf, x1 - RING_SIDE, yT - RING_CAP, [0, 0, SQ_RI, SQ_RI], 'counter'),
		rr(x0 + RING_SIDE, yB + RING_CAP, x1 - RING_SIDE, cy - barHalf, [SQ_RI, SQ_RI, 0, 0], 'counter'),
		cutRect(x1 - RING_SIDE + 1, yB + SQ_R + 10, x1 - 2, cy - barHalf)
	];
};




// lowercase i — vertical stem + dot floating above
const buildI_lc = (): BezierContour[] => {
	const cx = LC_W / 2;
	const stemTop = X_HEIGHT;
	return [
		poly([
			[cx - STEM / 2, 0],
			[cx + STEM / 2, 0],
			[cx + STEM / 2, stemTop],
			[cx - STEM / 2, stemTop]
		]),
		// Dot floating above x-height
		poly([
			[cx - STEM / 2, stemTop + 60],
			[cx + STEM / 2, stemTop + 60],
			[cx + STEM / 2, stemTop + 180],
			[cx - STEM / 2, stemTop + 180]
		])
	];
};

// lowercase t — vertical stem + short crossbar at x-height
const buildT_lc = (): BezierContour[] => {
	const cx = LC_W / 2;
	const stemTop = Math.round(X_HEIGHT * 1.4);
	return [
		rr(cx - STEM / 2, 0, cx + STEM / 2, stemTop, [0, 0, SQ_RS, SQ_RS]),
		poly([
			[80, X_HEIGHT - BAR],
			[cx - STEM / 2, X_HEIGHT - BAR],
			[cx - STEM / 2, X_HEIGHT],
			[80, X_HEIGHT]
		]),
		poly([
			[cx + STEM / 2, X_HEIGHT - BAR],
			[LC_W - 80, X_HEIGHT - BAR],
			[LC_W - 80, X_HEIGHT],
			[cx + STEM / 2, X_HEIGHT]
		])
	];
};


// lowercase h — vertical stem with short ascender + arch from stem to right
const buildH_lc = (): BezierContour[] => [sqArch(80, LC_W - 160, Math.round(X_HEIGHT * 1.5))];


// lowercase r — vertical stem + small shoulder to upper-right
const buildR_lc = (): BezierContour[] => {
	// Squared r: stem + flat arm with rounded outer top-right corner.
	const h = X_HEIGHT;
	const armR = 84;
	const r: BezierContour = {
		closed: true,
		winding: 'cw',
		commands: [
			{ type: 'M', x: 80, y: 0 },
			{ type: 'L', x: 170, y: 0 },
			{ type: 'L', x: 170, y: h - 84 },
			{ type: 'L', x: 330, y: h - 84 },
			{ type: 'L', x: 330, y: h - armR },
			sqC(330, h - armR, 330, h, 330 - armR, h),
			{ type: 'L', x: 80 + SQ_RS, y: h },
			sqC(80 + SQ_RS, h, 80, h, 80, h - SQ_RS),
			{ type: 'L', x: 80, y: 0 },
			{ type: 'Z' }
		]
	};
	return [r];
};



// lowercase s — same construction as cap S but at x-height + reduced widths
const buildS_lc = (): BezierContour[] => {
	// Squared s: top hook = left wall (rounded outer top-left) + flat top
	// beam; bottom hook is the 180-degree rotation; middle bar abuts both.
	const wall = rr(70, 250, 154, X_HEIGHT, [0, 0, 0, 68]);
	const beam = rr(154, X_HEIGHT - 84, LC_W - 70, X_HEIGHT, [0, 0, SQ_RS, 0]);
	return [
		wall,
		beam,
		rotate180(wall, LC_W, X_HEIGHT),
		rotate180(beam, LC_W, X_HEIGHT),
		poly([
			[154, X_HEIGHT / 2 - 42],
			[LC_W - 154, X_HEIGHT / 2 - 42],
			[LC_W - 154, X_HEIGHT / 2 + 42],
			[154, X_HEIGHT / 2 + 42]
		])
	];
};



// Punctuation — small glyphs that the sample paragraph uses. Each one
// is a single rect or tiny composition. Tabular widths kept tight so they
// don't gap the surrounding letters.

const PUNCT_W = Math.round(STEM * 2.4);

// Period — small square baseline-adjacent rect.
const buildPeriod = (): BezierContour[] => [
	poly([
		[STEM, 0],
		[STEM + STEM, 0],
		[STEM + STEM, STEM],
		[STEM, STEM]
	])
];

// Comma — same as period but with a small tail extending below baseline.
const buildComma = (): BezierContour[] => [
	poly([
		[STEM, 0],
		[STEM + STEM, 0],
		[STEM + STEM, STEM],
		[STEM, STEM]
	]),
	// Tail descending below the baseline
	poly([
		[STEM + 10, -120],
		[STEM + STEM + 10, -120],
		[STEM + STEM - 20, 0],
		[STEM - 20, 0]
	])
];

// Plus — vertical + horizontal bars crossed at the math axis (just
// above x-height/2). Width matches PUNCT_W + a touch so it sits next
// to numbers without crowding.
const buildPlus = (): BezierContour[] => {
	const mid = Math.round(X_HEIGHT * 0.55);
	const w = PUNCT_W + 100;
	const armLen = Math.round(w * 0.35);
	const cx = w / 2;
	return [
		// Horizontal arm
		poly([
			[cx - armLen, mid - BAR / 2],
			[cx + armLen, mid - BAR / 2],
			[cx + armLen, mid + BAR / 2],
			[cx - armLen, mid + BAR / 2]
		]),
		// Vertical arm
		poly([
			[cx - BAR / 2, mid - armLen],
			[cx + BAR / 2, mid - armLen],
			[cx + BAR / 2, mid + armLen],
			[cx - BAR / 2, mid + armLen]
		])
	];
};

// Equals — two horizontal bars at and below the math axis. Same width
// + arm as plus so the row of math operators reads as a set.
const buildEquals = (): BezierContour[] => {
	const mid = Math.round(X_HEIGHT * 0.55);
	const w = PUNCT_W + 100;
	const armLen = Math.round(w * 0.35);
	const cx = w / 2;
	const sep = BAR + 30;
	return [
		poly([
			[cx - armLen, mid + sep / 2 - BAR / 2],
			[cx + armLen, mid + sep / 2 - BAR / 2],
			[cx + armLen, mid + sep / 2 + BAR / 2],
			[cx - armLen, mid + sep / 2 + BAR / 2]
		]),
		poly([
			[cx - armLen, mid - sep / 2 - BAR / 2],
			[cx + armLen, mid - sep / 2 - BAR / 2],
			[cx + armLen, mid - sep / 2 + BAR / 2],
			[cx - armLen, mid - sep / 2 + BAR / 2]
		])
	];
};

// Dollar — S-form with a vertical stem running through. The stem
// extends slightly above cap-height and below baseline so the bar
// is visible past the S's bowls (the canonical $ shape).
const buildDollar = (): BezierContour[] => {
	const w = CAP_W;
	const mid = CAP_HEIGHT / 2;
	const cx = w / 2;
	return [
		// S contours (same construction as buildS)
		poly([[80, CAP_HEIGHT - BAR], [w - 80, CAP_HEIGHT - BAR], [w - 80, CAP_HEIGHT], [80, CAP_HEIGHT]]),
		poly([[80, mid + BAR / 2], [80 + STEM, mid + BAR / 2], [80 + STEM, CAP_HEIGHT - BAR], [80, CAP_HEIGHT - BAR]]),
		poly([[80, mid - BAR / 2], [w - 80, mid - BAR / 2], [w - 80, mid + BAR / 2], [80, mid + BAR / 2]]),
		poly([[w - 80 - STEM, BAR], [w - 80, BAR], [w - 80, mid - BAR / 2], [w - 80 - STEM, mid - BAR / 2]]),
		poly([[80, 0], [w - 80, 0], [w - 80, BAR], [80, BAR]]),
		// Vertical stem extending above and below the S
		poly([
			[cx - STEM / 2, -60],
			[cx + STEM / 2, -60],
			[cx + STEM / 2, CAP_HEIGHT + 60],
			[cx - STEM / 2, CAP_HEIGHT + 60]
		])
	];
};

// Copyright — outer ring + counter + small letter C inside. The C is
// a smaller version of the buildC construction, scaled to fit inside
// the ring with breathing room.
const buildCopyright = (): BezierContour[] => {
	const w = CAP_W + 40;
	const cx = w / 2;
	const cy = CAP_HEIGHT / 2;
	const outerR = CAP_HEIGHT * 0.5;
	const innerR = outerR - STEM + 10;
	// Inner C — three small rectangles forming a C inside the ring
	const cR = outerR - STEM - 40;
	const cBar = BAR - 20;
	const cStem = STEM - 30;
	return [
		curvedRing(cx, cy, outerR, outerR, 'cw'),
		curvedRing(cx, cy, innerR, innerR, 'ccw'),
		// Inner C — left stem
		poly([
			[cx - cR, cy - cR],
			[cx - cR + cStem, cy - cR],
			[cx - cR + cStem, cy + cR],
			[cx - cR, cy + cR]
		]),
		// Inner C — top arm
		poly([
			[cx - cR, cy + cR - cBar],
			[cx + cR, cy + cR - cBar],
			[cx + cR, cy + cR],
			[cx - cR, cy + cR]
		]),
		// Inner C — bottom arm
		poly([
			[cx - cR, cy - cR],
			[cx + cR, cy - cR],
			[cx + cR, cy - cR + cBar],
			[cx - cR, cy - cR + cBar]
		])
	];
};

// Registered — outer ring + counter + R-shape inside (vertical stem +
// top bowl approximation + leg).
const buildRegistered = (): BezierContour[] => {
	const w = CAP_W + 40;
	const cx = w / 2;
	const cy = CAP_HEIGHT / 2;
	const outerR = CAP_HEIGHT * 0.5;
	const innerR = outerR - STEM + 10;
	const rR = outerR - STEM - 40;
	const rStem = STEM - 30;
	const rBar = BAR - 20;
	const stemX = cx - rR + 10;
	return [
		curvedRing(cx, cy, outerR, outerR, 'cw'),
		curvedRing(cx, cy, innerR, innerR, 'ccw'),
		// R left stem
		poly([
			[stemX, cy - rR],
			[stemX + rStem, cy - rR],
			[stemX + rStem, cy + rR],
			[stemX, cy + rR]
		]),
		// R top bowl outer (small rectangle approximation)
		poly([
			[stemX, cy + rR - rBar],
			[cx + rR * 0.7, cy + rR - rBar],
			[cx + rR * 0.7, cy + rR],
			[stemX, cy + rR]
		]),
		// R bowl right stem
		poly([
			[cx + rR * 0.4, cy + rBar / 2],
			[cx + rR * 0.7, cy + rBar / 2],
			[cx + rR * 0.7, cy + rR - rBar],
			[cx + rR * 0.4, cy + rR - rBar]
		]),
		// R bowl bottom bar
		poly([
			[stemX, cy + rBar / 2],
			[cx + rR * 0.7, cy + rBar / 2],
			[cx + rR * 0.7, cy + rBar / 2 + rBar - 10],
			[stemX, cy + rBar / 2 + rBar - 10]
		]),
		// R leg — diagonal stub down-right
		poly([
			[cx + rR * 0.3, cy + rBar / 2],
			[cx + rR * 0.45, cy + rBar / 2],
			[cx + rR * 0.7, cy - rR],
			[cx + rR * 0.55, cy - rR]
		])
	];
};

// Trademark — superscript TM. Two small letterforms (T + M) sized
// at ~half cap-height, positioned at the top of the glyph.
const buildTrademark = (): BezierContour[] => {
	const w = CAP_W + 60;
	const sm = CAP_HEIGHT * 0.5;
	const top = CAP_HEIGHT;
	const stemSmall = STEM - 30;
	const barSmall = BAR - 20;
	// T positioned at left
	const tCx = w * 0.25;
	const tW = sm * 0.7;
	// M positioned at right
	const mL = w * 0.5;
	const mR = w - 20;
	return [
		// T top bar
		poly([
			[tCx - tW / 2, top - barSmall],
			[tCx + tW / 2, top - barSmall],
			[tCx + tW / 2, top],
			[tCx - tW / 2, top]
		]),
		// T vertical stem
		poly([
			[tCx - stemSmall / 2, top - sm],
			[tCx + stemSmall / 2, top - sm],
			[tCx + stemSmall / 2, top],
			[tCx - stemSmall / 2, top]
		]),
		// M left stem
		poly([
			[mL, top - sm],
			[mL + stemSmall, top - sm],
			[mL + stemSmall, top],
			[mL, top]
		]),
		// M right stem
		poly([
			[mR - stemSmall, top - sm],
			[mR, top - sm],
			[mR, top],
			[mR - stemSmall, top]
		]),
		// M middle V (two short angled stubs)
		poly([
			[mL + stemSmall, top - barSmall],
			[(mL + mR) / 2 + stemSmall / 2, top - sm + barSmall],
			[(mL + mR) / 2 - stemSmall / 2, top - sm + barSmall],
			[mL + stemSmall, top]
		]),
		poly([
			[(mL + mR) / 2 - stemSmall / 2, top - sm + barSmall],
			[(mL + mR) / 2 + stemSmall / 2, top - sm + barSmall],
			[mR - stemSmall, top],
			[mR - stemSmall, top - barSmall]
		])
	];
};

// Section sign — two stacked C-curves rotated. Approximated as two
// stacked rectangular bowls with crossed connections.
const buildSection = (): BezierContour[] => {
	const w = CAP_W * 0.7;
	const mid = CAP_HEIGHT / 2;
	return [
		// Top bowl — C-shape pointing left
		poly([[w - 40 - STEM, CAP_HEIGHT - BAR], [w - 40, CAP_HEIGHT - BAR], [w - 40, CAP_HEIGHT], [w - 40 - STEM, CAP_HEIGHT]]),
		poly([[20, mid + BAR / 2], [w - 40, mid + BAR / 2], [w - 40, CAP_HEIGHT], [20, CAP_HEIGHT]]),
		poly([[20, mid - BAR / 2 + BAR], [20 + STEM, mid - BAR / 2 + BAR], [20 + STEM, CAP_HEIGHT - BAR], [20, CAP_HEIGHT - BAR]]),
		// Mid connectors (the crossing strokes)
		poly([[w / 2, mid - BAR], [w - 40, mid - BAR], [w - 40, mid + BAR], [w / 2, mid + BAR]]),
		// Bottom bowl — C-shape pointing right (mirrored)
		poly([[40, 0], [40 + STEM, 0], [40 + STEM, BAR], [40, BAR]]),
		poly([[40, 0], [w - 20, 0], [w - 20, mid - BAR / 2], [40, mid - BAR / 2]]),
		poly([[w - 20 - STEM, BAR], [w - 20, BAR], [w - 20, mid - BAR / 2 - BAR], [w - 20 - STEM, mid - BAR / 2 - BAR]])
	];
};

// Bracket left [ — three bars forming a left bracket at full ascender
// height (slightly taller than caps so they enclose ALL letters).
const buildBracketLeft = (): BezierContour[] => {
	const w = PUNCT_W;
	const top = ASCENDER - 100;
	const bot = -100;
	const armW = w * 0.7;
	return [
		// Left vertical stem
		poly([[40, bot], [40 + STEM - 10, bot], [40 + STEM - 10, top], [40, top]]),
		// Top arm
		poly([[40, top - BAR], [40 + armW, top - BAR], [40 + armW, top], [40, top]]),
		// Bottom arm
		poly([[40, bot], [40 + armW, bot], [40 + armW, bot + BAR], [40, bot + BAR]])
	];
};

// Bracket right ] — mirror of left.
const buildBracketRight = (): BezierContour[] => {
	const w = PUNCT_W;
	const top = ASCENDER - 100;
	const bot = -100;
	const armW = w * 0.7;
	return [
		poly([[w - 40 - STEM + 10, bot], [w - 40, bot], [w - 40, top], [w - 40 - STEM + 10, top]]),
		poly([[w - 40 - armW, top - BAR], [w - 40, top - BAR], [w - 40, top], [w - 40 - armW, top]]),
		poly([[w - 40 - armW, bot], [w - 40, bot], [w - 40, bot + BAR], [w - 40 - armW, bot + BAR]])
	];
};

// Brace left { — vertical stem segmented into top, mid (notched), and
// bottom, with a small middle nipple pointing left.
const buildBraceLeft = (): BezierContour[] => {
	const w = PUNCT_W;
	const top = ASCENDER - 100;
	const bot = -100;
	const mid = (top + bot) / 2;
	return [
		// Top vertical
		poly([[w * 0.4, mid + BAR], [w * 0.4 + STEM - 20, mid + BAR], [w * 0.4 + STEM - 20, top - BAR], [w * 0.4, top - BAR]]),
		// Top top-arm
		poly([[w * 0.4, top - BAR], [w * 0.4 + STEM * 1.5, top - BAR], [w * 0.4 + STEM * 1.5, top], [w * 0.4, top]]),
		// Mid nipple pointing left
		poly([[20, mid - STEM / 2], [w * 0.4, mid - STEM / 2], [w * 0.4, mid + STEM / 2], [20, mid + STEM / 2]]),
		// Bottom vertical
		poly([[w * 0.4, bot + BAR], [w * 0.4 + STEM - 20, bot + BAR], [w * 0.4 + STEM - 20, mid - BAR], [w * 0.4, mid - BAR]]),
		// Bottom bottom-arm
		poly([[w * 0.4, bot], [w * 0.4 + STEM * 1.5, bot], [w * 0.4 + STEM * 1.5, bot + BAR], [w * 0.4, bot + BAR]])
	];
};

// Brace right } — mirror of left.
const buildBraceRight = (): BezierContour[] => {
	const w = PUNCT_W;
	const top = ASCENDER - 100;
	const bot = -100;
	const mid = (top + bot) / 2;
	const stemX = w * 0.6 - STEM + 20;
	return [
		poly([[stemX, mid + BAR], [stemX + STEM - 20, mid + BAR], [stemX + STEM - 20, top - BAR], [stemX, top - BAR]]),
		poly([[stemX - STEM * 0.5, top - BAR], [stemX + STEM - 20, top - BAR], [stemX + STEM - 20, top], [stemX - STEM * 0.5, top]]),
		poly([[stemX + STEM - 20, mid - STEM / 2], [w - 20, mid - STEM / 2], [w - 20, mid + STEM / 2], [stemX + STEM - 20, mid + STEM / 2]]),
		poly([[stemX, bot + BAR], [stemX + STEM - 20, bot + BAR], [stemX + STEM - 20, mid - BAR], [stemX, mid - BAR]]),
		poly([[stemX - STEM * 0.5, bot], [stemX + STEM - 20, bot], [stemX + STEM - 20, bot + BAR], [stemX - STEM * 0.5, bot + BAR]])
	];
};

// Degree — small ring at cap-height. Ring weight matches BAR.
const buildDegree = (): BezierContour[] => {
	const w = PUNCT_W;
	const cx = w / 2;
	const cy = CAP_HEIGHT - 100;
	const r = 70;
	const innerR = r - BAR + 10;
	return [curvedRing(cx, cy, r, r, 'cw'), curvedRing(cx, cy, innerR, innerR, 'ccw')];
};

// Plus-minus — plus glyph + a horizontal bar below.
const buildPlusMinus = (): BezierContour[] => {
	const mid = Math.round(X_HEIGHT * 0.55);
	const w = PUNCT_W + 100;
	const armLen = Math.round(w * 0.35);
	const cx = w / 2;
	const bottomBar = mid - armLen - 60;
	return [
		// Horizontal arm of plus
		poly([[cx - armLen, mid - BAR / 2], [cx + armLen, mid - BAR / 2], [cx + armLen, mid + BAR / 2], [cx - armLen, mid + BAR / 2]]),
		// Vertical arm of plus
		poly([[cx - BAR / 2, mid - armLen], [cx + BAR / 2, mid - armLen], [cx + BAR / 2, mid + armLen], [cx - BAR / 2, mid + armLen]]),
		// Bottom horizontal bar (the minus part)
		poly([[cx - armLen, bottomBar - BAR / 2], [cx + armLen, bottomBar - BAR / 2], [cx + armLen, bottomBar + BAR / 2], [cx - armLen, bottomBar + BAR / 2]])
	];
};

// Multiplication — X-shape (two diagonal rectangles crossed).
const buildMultiply = (): BezierContour[] => {
	const w = PUNCT_W + 80;
	const mid = Math.round(X_HEIGHT * 0.55);
	const r = 80;
	const t = BAR / 2;
	return [
		// Diagonal NW-SE
		poly([
			[w / 2 - r - t, mid + r - t],
			[w / 2 - r + t, mid + r + t],
			[w / 2 + r + t, mid - r + t],
			[w / 2 + r - t, mid - r - t]
		]),
		// Diagonal NE-SW
		poly([
			[w / 2 + r - t, mid + r + t],
			[w / 2 + r + t, mid + r - t],
			[w / 2 - r + t, mid - r - t],
			[w / 2 - r - t, mid - r + t]
		])
	];
};

// Division — horizontal bar with a dot above and below.
const buildDivide = (): BezierContour[] => {
	const w = PUNCT_W + 100;
	const mid = Math.round(X_HEIGHT * 0.55);
	const armLen = Math.round(w * 0.35);
	const cx = w / 2;
	const dotR = 35;
	const dotOffset = 110;
	return [
		poly([[cx - armLen, mid - BAR / 2], [cx + armLen, mid - BAR / 2], [cx + armLen, mid + BAR / 2], [cx - armLen, mid + BAR / 2]]),
		curvedRing(cx, mid + dotOffset, dotR, dotR, 'cw'),
		curvedRing(cx, mid - dotOffset, dotR, dotR, 'cw')
	];
};

// Euro — C-form + two horizontal crossbars at upper-third and lower-
// third heights. The upper bar extends past the left stem on the LEFT
// — that's the euro convention; the bar protrudes beyond the glyph's
// body so the symbol reads as euro at small sizes.
const buildEuro = (): BezierContour[] => {
	const w = CAP_W;
	const upperBar = CAP_HEIGHT * 0.6;
	const lowerBar = CAP_HEIGHT * 0.4;
	return [
		// Left stem
		poly([[80, 0], [80 + STEM, 0], [80 + STEM, CAP_HEIGHT], [80, CAP_HEIGHT]]),
		// Top arm
		poly([
			[80, CAP_HEIGHT - BAR],
			[w - 80, CAP_HEIGHT - BAR],
			[w - 80, CAP_HEIGHT],
			[80, CAP_HEIGHT]
		]),
		// Bottom arm
		poly([
			[80, 0],
			[w - 80, 0],
			[w - 80, BAR],
			[80, BAR]
		]),
		// Upper crossbar — protrudes left of the stem
		poly([
			[20, upperBar - BAR / 2],
			[w - 130, upperBar - BAR / 2],
			[w - 130, upperBar + BAR / 2],
			[20, upperBar + BAR / 2]
		]),
		// Lower crossbar — slightly shorter
		poly([
			[20, lowerBar - BAR / 2],
			[w - 180, lowerBar - BAR / 2],
			[w - 180, lowerBar + BAR / 2],
			[20, lowerBar + BAR / 2]
		])
	];
};

// Pound — vertical stem with a top-right flag (the pound's curl
// approximation), a crossbar at mid-height, and a horizontal foot at
// the baseline extending right.
const buildPound = (): BezierContour[] => {
	const w = CAP_W;
	const stemL = w * 0.3;
	const stemR = stemL + STEM;
	const midBar = CAP_HEIGHT * 0.55;
	return [
		// Main vertical stem
		poly([
			[stemL, BAR],
			[stemR, BAR],
			[stemR, CAP_HEIGHT - 40],
			[stemL, CAP_HEIGHT - 40]
		]),
		// Top hook
		poly([
			[stemL, CAP_HEIGHT - 100],
			[stemR + 140, CAP_HEIGHT - 100],
			[stemR + 140, CAP_HEIGHT - 40],
			[stemL, CAP_HEIGHT - 40]
		]),
		// Crossbar at mid-height
		poly([
			[stemL - 60, midBar - BAR / 2],
			[stemR + 130, midBar - BAR / 2],
			[stemR + 130, midBar + BAR / 2],
			[stemL - 60, midBar + BAR / 2]
		]),
		// Base — horizontal foot extending right
		poly([
			[40, 0],
			[w - 40, 0],
			[w - 40, BAR],
			[40, BAR]
		])
	];
};

// Yen — Y-form + two horizontal crossbars (the canonical CJK currency
// construction; covers ¥ JPY and Chinese yuan).
const buildYen = (): BezierContour[] => {
	const w = CAP_W;
	const cx = w / 2;
	const mid = CAP_HEIGHT * 0.5;
	const upperBar = CAP_HEIGHT * 0.4;
	const lowerBar = CAP_HEIGHT * 0.25;
	const armW = 60;
	return [
		// Left angled stem
		poly([
			[80, CAP_HEIGHT - armW],
			[80 + armW, CAP_HEIGHT],
			[cx + armW / 2, mid + armW / 2],
			[cx - armW / 2, mid + armW / 2]
		]),
		// Right angled stem
		poly([
			[w - 80 - armW, CAP_HEIGHT],
			[w - 80, CAP_HEIGHT - armW],
			[cx + armW / 2, mid + armW / 2],
			[cx - armW / 2, mid + armW / 2]
		]),
		// Vertical stub from center down to baseline
		poly([
			[cx - STEM / 2, 0],
			[cx + STEM / 2, 0],
			[cx + STEM / 2, mid + armW / 2],
			[cx - STEM / 2, mid + armW / 2]
		]),
		// Upper crossbar
		poly([
			[60, upperBar - BAR / 2],
			[w - 60, upperBar - BAR / 2],
			[w - 60, upperBar + BAR / 2],
			[60, upperBar + BAR / 2]
		]),
		// Lower crossbar
		poly([
			[60, lowerBar - BAR / 2],
			[w - 60, lowerBar - BAR / 2],
			[w - 60, lowerBar + BAR / 2],
			[60, lowerBar + BAR / 2]
		])
	];
};

// Ampersand — descends from the Latin "et" ligature. Geometric-sans
// convention: small top bowl + larger bottom bowl + tail extending
// right at the baseline. Built from two rings (each with a counter)
// and a horizontal arm. Sits at cap-height like a real ampersand.
const buildAmp = (): BezierContour[] => {
	const W = CAP_W + 80;
	const h = CAP_HEIGHT;
	const innerT = STEM - 10;
	// Top bowl — small, upper-left of the glyph
	const topCx = W * 0.4;
	const topCy = h * 0.74;
	const topR = 130;
	// Bottom bowl — larger, slightly right of center
	const botCx = W * 0.45;
	const botCy = h * 0.3;
	const botR = 200;
	return [
		// Top bowl outer ring
		curvedRing(topCx, topCy, topR, topR, 'cw'),
		// Top bowl counter (ccw to punch a hole)
		curvedRing(topCx, topCy, topR - innerT, topR - innerT, 'ccw'),
		// Bottom bowl outer ring
		curvedRing(botCx, botCy, botR, botR, 'cw'),
		// Bottom bowl counter
		curvedRing(botCx, botCy, botR - innerT, botR - innerT, 'ccw'),
		// Connecting diagonal — tilted rectangle from top bowl's
		// top-right to bottom bowl's bottom-left, the visual line that
		// reads as the et-ligature cross stroke.
		poly([
			[topCx + topR * 0.4, topCy + topR * 0.6],
			[topCx + topR * 0.7, topCy + topR * 0.9],
			[botCx - botR * 0.6, botCy - botR * 0.7],
			[botCx - botR * 0.9, botCy - botR * 0.4]
		]),
		// Tail — extends from the bottom bowl's right side outward and
		// down to the baseline. Reads as the swash exit of a real
		// drawn ampersand without needing a curved stroke.
		poly([
			[botCx + botR - innerT, botCy - botR * 0.2],
			[botCx + botR + 100, botCy - botR + 20],
			[W - 20, BAR + 40],
			[botCx + botR + 60, BAR + 100]
		])
	];
};

// At-sign — outer ring + inner counter + a small lowercase "a" core.
// Geometric three-ring construction at cap-height. The opening at the
// bottom-right (where the spiral ends) is a small notch carved out of
// the outer ring's counter so the "a" core reads as enclosed but not
// fully surrounded — the canonical visual.
const buildAtSign = (): BezierContour[] => {
	const W = CAP_W + 60;
	const h = CAP_HEIGHT;
	const cx = W / 2;
	const cy = h * 0.5;
	const outerR = h * 0.5;
	const innerR = outerR - STEM;
	// Inner `a` core — small bowl centered slightly right of center.
	const coreCx = cx + 40;
	const coreCy = cy;
	const coreR = innerR - STEM - 10;
	const coreInner = coreR - STEM + 20;
	// Notch at the bottom-right where the spiral opens. A small wedge
	// punched out of the outer ring + the gap between outer and the `a`
	// core so the eye reads it as a single connected stroke.
	const notchAngle = Math.PI * 0.35;
	// Partial-arc polygon ring — only used for the @'s 270-degree spiral
	// counter, where a true cubic partial ring isn't worth the math at
	// tile size. 24 sides keeps facets invisible.
	const ring = (
		rcx: number,
		rcy: number,
		rx: number,
		ry: number,
		ccw: boolean,
		startAngle: number,
		sweep: number
	): Array<[number, number]> => {
		const pts: Array<[number, number]> = [];
		const sides = 24;
		for (let i = 0; i <= sides; i++) {
			const a = startAngle + (i / sides) * sweep * (ccw ? -1 : 1);
			pts.push([rcx + Math.cos(a) * rx, rcy + Math.sin(a) * ry]);
		}
		return pts;
	};
	return [
		// Outer ring — full circle
		curvedRing(cx, cy, outerR, outerR, 'cw'),
		// Outer ring counter (the white space between outer ring + the
		// inner `a` core). 270° sweep so the bottom-right is open,
		// reading as the spiral exit. ccw because counters punch holes.
		poly(
			ring(cx, cy, innerR, innerR, true, -Math.PI / 2 - notchAngle, Math.PI * 2 - notchAngle * 2),
			'ccw'
		),
		// Inner `a` core outer bowl
		curvedRing(coreCx, coreCy, coreR, coreR, 'cw'),
		// Inner `a` core counter (small hole in the middle of the `a`)
		curvedRing(coreCx, coreCy, coreInner, coreInner, 'ccw'),
		// Right stem of the inner `a` (visual closure of the lowercase
		// a's right side, the part that hooks down past the bowl)
		poly([
			[coreCx + coreR - STEM / 2, coreCy - coreR],
			[coreCx + coreR + STEM / 2, coreCy - coreR],
			[coreCx + coreR + STEM / 2, coreCy + coreR + 30],
			[coreCx + coreR - STEM / 2, coreCy + coreR + 30]
		])
	];
};

// Asterisk — six short bars rotated 60° each around a center near
// cap-height. Six arms is the most-typographically-correct asterisk
// shape (matches the historic five-point star + descender stub).
const buildAsterisk = (): BezierContour[] => {
	const cx = (PUNCT_W + 60) / 2;
	const cy = Math.round(CAP_HEIGHT * 0.75);
	const armLen = 100;
	const armWidth = 35;
	const out: BezierContour[] = [];
	for (let i = 0; i < 6; i++) {
		const angle = (i / 6) * Math.PI * 2;
		const dx = Math.cos(angle);
		const dy = Math.sin(angle);
		// Perpendicular for thickness
		const px = -dy * armWidth;
		const py = dx * armWidth;
		// Four corners of a rotated rectangle from (cx,cy) outward by armLen
		out.push(
			poly([
				[cx + px, cy + py],
				[cx - px, cy - py],
				[cx - px + dx * armLen, cy - py + dy * armLen],
				[cx + px + dx * armLen, cy + py + dy * armLen]
			])
		);
	}
	return out;
};

// Forward slash — diagonal from lower-left to upper-right, rotated
// rectangle. Spans full ascender to mirror cap-height + descender.
const buildSlash = (): BezierContour[] => {
	const w = PUNCT_W + 40;
	const topY = ASCENDER;
	const bottomY = -100;
	const thick = STEM - 20;
	return [
		poly([
			[0, bottomY],
			[thick, bottomY],
			[w, topY],
			[w - thick, topY]
		])
	];
};

// Backslash — mirror of slash.
const buildBackslash = (): BezierContour[] => {
	const w = PUNCT_W + 40;
	const topY = ASCENDER;
	const bottomY = -100;
	const thick = STEM - 20;
	return [
		poly([
			[0, topY],
			[thick, topY],
			[w, bottomY],
			[w - thick, bottomY]
		])
	];
};

// Pipe — vertical bar, full ascender + descender height. Used by code
// editors + tabular separators.
const buildPipe = (): BezierContour[] => {
	const w = PUNCT_W;
	const cx = w / 2;
	return [
		poly([
			[cx - STEM / 2 + 10, -100],
			[cx + STEM / 2 - 10, -100],
			[cx + STEM / 2 - 10, ASCENDER],
			[cx - STEM / 2 + 10, ASCENDER]
		])
	];
};

// Hyphen-minus — short horizontal bar centered around x-height/2.
const buildHyphen = (): BezierContour[] => {
	const mid = X_HEIGHT / 2;
	const w = PUNCT_W + 80;
	return [
		poly([
			[40, mid - BAR / 2],
			[w - 40, mid - BAR / 2],
			[w - 40, mid + BAR / 2],
			[40, mid + BAR / 2]
		])
	];
};

// Em-dash — wider hyphen at the same height, almost double the width.
const buildEmDash = (): BezierContour[] => {
	const mid = X_HEIGHT / 2;
	const w = Math.round(CAP_W * 1.6);
	return [
		poly([
			[40, mid - BAR / 2],
			[w - 40, mid - BAR / 2],
			[w - 40, mid + BAR / 2],
			[40, mid + BAR / 2]
		])
	];
};

// Apostrophe — small rect floating just below cap-height.
const buildApostrophe = (): BezierContour[] => {
	const top = CAP_HEIGHT;
	const bottom = CAP_HEIGHT - 220;
	return [
		poly([
			[STEM / 2 + 20, bottom],
			[STEM / 2 + STEM + 20, bottom],
			[STEM / 2 + STEM, top],
			[STEM / 2, top]
		])
	];
};

// Colon — two small squares stacked vertically.
const buildColon = (): BezierContour[] => [
	// Bottom dot at baseline
	poly([
		[STEM, 0],
		[STEM + STEM, 0],
		[STEM + STEM, STEM],
		[STEM, STEM]
	]),
	// Top dot at x-height level
	poly([
		[STEM, X_HEIGHT - STEM],
		[STEM + STEM, X_HEIGHT - STEM],
		[STEM + STEM, X_HEIGHT],
		[STEM, X_HEIGHT]
	])
];

// Semicolon — top dot + bottom comma (period with tail).
const buildSemicolon = (): BezierContour[] => [
	// Top dot at x-height level
	poly([
		[STEM, X_HEIGHT - STEM],
		[STEM + STEM, X_HEIGHT - STEM],
		[STEM + STEM, X_HEIGHT],
		[STEM, X_HEIGHT]
	]),
	// Bottom comma at baseline + tail
	poly([
		[STEM, 0],
		[STEM + STEM, 0],
		[STEM + STEM, STEM],
		[STEM, STEM]
	]),
	poly([
		[STEM + 10, -120],
		[STEM + STEM + 10, -120],
		[STEM + STEM - 20, 0],
		[STEM - 20, 0]
	])
];

// Question mark — top hook + stem + dot at baseline.
const buildQuestion = (): BezierContour[] => {
	const w = PUNCT_W + 100;
	const upperBowl = CAP_HEIGHT * 0.55;
	return [
		// Top bar
		poly([
			[60, CAP_HEIGHT - BAR],
			[w - 60, CAP_HEIGHT - BAR],
			[w - 60, CAP_HEIGHT],
			[60, CAP_HEIGHT]
		]),
		// Right top stem (cap to middle)
		poly([
			[w - 60 - STEM, upperBowl],
			[w - 60, upperBowl],
			[w - 60, CAP_HEIGHT - BAR],
			[w - 60 - STEM, CAP_HEIGHT - BAR]
		]),
		// Mid-right diagonal/connector down to mid stem
		poly([
			[w / 2, upperBowl - BAR],
			[w - 60, upperBowl - BAR],
			[w - 60, upperBowl],
			[w / 2, upperBowl]
		]),
		// Lower stem (mid down to dot area)
		poly([
			[w / 2 - STEM / 2, STEM * 2],
			[w / 2 + STEM / 2, STEM * 2],
			[w / 2 + STEM / 2, upperBowl - BAR],
			[w / 2 - STEM / 2, upperBowl - BAR]
		]),
		// Dot at baseline
		poly([
			[w / 2 - STEM / 2, 0],
			[w / 2 + STEM / 2, 0],
			[w / 2 + STEM / 2, STEM],
			[w / 2 - STEM / 2, STEM]
		])
	];
};

// Left single curly quote — small angled wedge floating below cap-height.
const buildQuoteLeft = (): BezierContour[] => {
	const top = CAP_HEIGHT;
	const bottom = CAP_HEIGHT - 200;
	return [
		// Inverted comma shape (mirror of regular comma but at top)
		poly([
			[STEM / 2, top],
			[STEM / 2 + STEM, top],
			[STEM / 2 + STEM, top - 100],
			[STEM / 2, top - 100]
		]),
		poly([
			[STEM / 2 - 20, bottom],
			[STEM / 2 + STEM - 20, bottom],
			[STEM / 2 + STEM, top - 100],
			[STEM / 2, top - 100]
		])
	];
};

// Right single curly quote — like apostrophe.
const buildQuoteRight = (): BezierContour[] => buildApostrophe();

// Exclamation mark — vertical stem + dot at baseline.
const buildExclam = (): BezierContour[] => {
	const cx = PUNCT_W / 2;
	return [
		// Stem from above dot to cap-height
		poly([
			[cx - STEM / 2, STEM * 2],
			[cx + STEM / 2, STEM * 2],
			[cx + STEM / 2, CAP_HEIGHT],
			[cx - STEM / 2, CAP_HEIGHT]
		]),
		// Dot at baseline
		poly([
			[cx - STEM / 2, 0],
			[cx + STEM / 2, 0],
			[cx + STEM / 2, STEM],
			[cx - STEM / 2, STEM]
		])
	];
};

// Left paren — vertical curve approximation (rect-style).
const buildParenLeft = (): BezierContour[] => {
	const w = Math.round(PUNCT_W * 1.2);
	return [
		// Left vertical (recessed)
		poly([
			[60, STEM * 2],
			[60 + STEM, STEM * 2],
			[60 + STEM, CAP_HEIGHT - STEM * 2],
			[60, CAP_HEIGHT - STEM * 2]
		]),
		// Top angled cap
		poly([
			[60 + STEM, CAP_HEIGHT - STEM * 2],
			[w - 40, CAP_HEIGHT - STEM],
			[w - 40, CAP_HEIGHT],
			[60 + STEM - 20, CAP_HEIGHT - STEM]
		]),
		// Bottom angled cap
		poly([
			[60 + STEM - 20, STEM],
			[w - 40, 0],
			[w - 40, STEM],
			[60 + STEM, STEM * 2]
		])
	];
};

// Right paren — mirror of left paren.
const buildParenRight = (): BezierContour[] => {
	const w = Math.round(PUNCT_W * 1.2);
	return [
		poly([
			[w - 60 - STEM, STEM * 2],
			[w - 60, STEM * 2],
			[w - 60, CAP_HEIGHT - STEM * 2],
			[w - 60 - STEM, CAP_HEIGHT - STEM * 2]
		]),
		poly([
			[40, CAP_HEIGHT - STEM],
			[w - 60 - STEM + 20, CAP_HEIGHT - STEM * 2],
			[w - 60 - STEM, CAP_HEIGHT - STEM],
			[40, CAP_HEIGHT]
		]),
		poly([
			[40, 0],
			[w - 60 - STEM, STEM * 2],
			[w - 60 - STEM + 20, STEM],
			[40, STEM]
		])
	];
};

const build9 = (): BezierContour[] => {
	const w = DIGIT_W;
	const mid = CAP_HEIGHT * 0.5;
	return [
		// Outer right stem (top to bottom)
		poly([[w - 60 - STEM, 0], [w - 60, 0], [w - 60, CAP_HEIGHT], [w - 60 - STEM, CAP_HEIGHT]]),
		// Top bar
		poly([[60, CAP_HEIGHT - BAR], [w - 60 - STEM, CAP_HEIGHT - BAR], [w - 60 - STEM, CAP_HEIGHT], [60, CAP_HEIGHT]]),
		// Top bowl left stem
		poly([[60, mid + BAR], [60 + STEM, mid + BAR], [60 + STEM, CAP_HEIGHT - BAR], [60, CAP_HEIGHT - BAR]]),
		// Middle bar (closes the bowl)
		poly([[60, mid], [w - 60 - STEM, mid], [w - 60 - STEM, mid + BAR], [60, mid + BAR]])
	];
};

// acutecomb (U+0301) — a small angled bar floating just above cap-height,
// designed as a mark that attaches to base letters via the `_top` anchor.
// Shape: slanted parallelogram 60fu wide, 80fu tall.
const buildAcuteComb = (): BezierContour[] => {
	// Mark coordinates are local; `_top` anchor will be placed at the
	// bottom-centre so the composite snaps onto the base's `top` anchor.
	const y0 = CAP_HEIGHT + 50; // bottom of mark sits 50fu above cap-height
	const y1 = y0 + 90; // top of mark
	const cx = 100;
	const skew = 30; // slant offset
	return [
		poly([
			[cx - 30 + skew, y0],
			[cx + 30 + skew, y0],
			[cx + 30, y1],
			[cx - 30, y1]
		])
	];
};

// lowercase a — single-storey alternate (ss01). Geometric circle bowl +
// right stem flowing down. Demonstrates the OpenType stylistic-set feature.
const buildA_lc_ss01 = (): BezierContour[] => {
	const cx = LC_W / 2 - 30;
	const cy = X_HEIGHT / 2;
	const rx = LC_W / 2 - 100;
	const ry = X_HEIGHT / 2;
	const t = STEM - 10;
	return [
		// Bowl — circular outer + circular counter.
		curvedRing(cx, cy, rx, ry, 'cw'),
		curvedRing(cx, cy, rx - t, ry - t, 'ccw'),
		// Right stem going down from the bowl edge to the baseline.
		poly([
			[LC_W - 80 - STEM, 0],
			[LC_W - 80, 0],
			[LC_W - 80, X_HEIGHT],
			[LC_W - 80 - STEM, X_HEIGHT]
		])
	];
};

// lowercase a — simple two-storey approximation: bowl + stem.
const buildA_lc = (): BezierContour[] => [
	// Squared single-storey a: one solid block (bowl + right stem fused
	// by construction) + one counter whose right edge is the stem.
	rr(80, 0, LC_W - 80, X_HEIGHT, [SQ_R, SQ_RS, SQ_RS, SQ_R]),
	rr(80 + RING_SIDE, RING_CAP, LC_W - 80 - STEM, X_HEIGHT - RING_CAP, [SQ_RI, 0, 0, SQ_RI], 'counter')
];


// ---------- Restored + squared builders (repair 2026-06-10) ----------

type GlyphSpec = {
	codepoint: number;
	contours: BezierContour[];
	advanceWidth: number;
	leftSidebearing: number;
	rightSidebearing: number;
	status: 'draft' | 'final' | 'sketch';
};

const buildL = (): BezierContour[] => [
	poly([
		[80, 0],
		[80 + STEM, 0],
		[80 + STEM, CAP_HEIGHT],
		[80, CAP_HEIGHT]
	]),
	poly([
		[80, 0],
		[CAP_W - 60, 0],
		[CAP_W - 60, BAR],
		[80, BAR]
	])
];

const buildV = (): BezierContour[] => [
	poly([
		[60, CAP_HEIGHT],
		[60 + STEM, CAP_HEIGHT],
		[CAP_W / 2 + STEM / 2, 0],
		[CAP_W / 2 - STEM / 2, 0]
	]),
	poly([
		[CAP_W - 60 - STEM, CAP_HEIGHT],
		[CAP_W - 60, CAP_HEIGHT],
		[CAP_W / 2 + STEM / 2, 0],
		[CAP_W / 2 - STEM / 2, 0]
	])
];

const buildA = (): BezierContour[] => {
	// Two parallelogram strokes meeting at a STEM-wide flat apex +
	// crossbar at 35% cap-height. Crossbar X is computed from the
	// inner-edge geometry so it joins the diagonals cleanly.
	const apexL = CAP_W / 2 - STEM / 2;
	const apexR = CAP_W / 2 + STEM / 2;
	const baseL = 30;
	const baseR = CAP_W - 30;
	const crossY = CAP_HEIGHT * 0.35;
	const t = crossY / CAP_HEIGHT;
	const innerL = baseL + STEM + (apexR - baseL - STEM) * t;
	const innerR = baseR - STEM + (apexL - baseR + STEM) * t;
	return [
		// Left diagonal
		poly([
			[baseL, 0],
			[baseL + STEM, 0],
			[apexR, CAP_HEIGHT],
			[apexL, CAP_HEIGHT]
		]),
		// Right diagonal
		poly([
			[baseR - STEM, 0],
			[baseR, 0],
			[apexR, CAP_HEIGHT],
			[apexL, CAP_HEIGHT]
		]),
		// Crossbar
		poly([
			[innerL, crossY - BAR / 2],
			[innerR, crossY - BAR / 2],
			[innerR, crossY + BAR / 2],
			[innerL, crossY + BAR / 2]
		])
	];
};

const buildYa = (): BezierContour[] => {
	return [
		// Vertical stem on the RIGHT
		poly([
			[CAP_W - 80 - STEM, 0],
			[CAP_W - 80, 0],
			[CAP_W - 80, CAP_HEIGHT],
			[CAP_W - 80 - STEM, CAP_HEIGHT]
		]),
		// Bowl top bar
		poly([
			[100, CAP_HEIGHT],
			[CAP_W - 80, CAP_HEIGHT],
			[CAP_W - 80, CAP_HEIGHT - BAR],
			[100, CAP_HEIGHT - BAR]
		]),
		// Bowl left stem
		poly([
			[100, CAP_HEIGHT - BAR],
			[100 + STEM, CAP_HEIGHT - BAR],
			[100 + STEM, CAP_HEIGHT * 0.55 + BAR],
			[100, CAP_HEIGHT * 0.55 + BAR]
		]),
		// Bowl bottom bar
		poly([
			[100, CAP_HEIGHT * 0.55],
			[CAP_W - 80, CAP_HEIGHT * 0.55],
			[CAP_W - 80, CAP_HEIGHT * 0.55 + BAR],
			[100, CAP_HEIGHT * 0.55 + BAR]
		]),
		// Diagonal leg from junction to bottom-LEFT
		poly([
			[CAP_W - 80 - STEM, CAP_HEIGHT * 0.55],
			[CAP_W - 80 - STEM - 40, CAP_HEIGHT * 0.55],
			[60, 0],
			[60 + 80, 0]
		])
	];
};

const buildEszett = (): BezierContour[] => {
	const stemL = 80;
	const stemR = 80 + STEM;
	const stemTop = Math.round(X_HEIGHT * 1.5);
	const cx = LC_W / 2 + 30;
	const cy = X_HEIGHT / 2;
	const rx = LC_W / 2 - 100;
	const ry = X_HEIGHT / 2;
	const innerOffset = STEM - 10;
	return [
		// Left stem with full ascender
		poly([
			[stemL, 0],
			[stemR, 0],
			[stemR, stemTop],
			[stemL, stemTop]
		]),
		// Top flag — extends right from the top of the stem, hinting at
		// the long-s (ſ) origin. Width tuned to match buildF_lc's flag.
		poly([
			[stemR, stemTop - 110],
			[stemR + 220, stemTop - 110],
			[stemR + 220, stemTop],
			[stemR, stemTop]
		]),
		// Bottom bowl — outer
		curvedRing(cx, cy, rx, ry, 'cw'),
		// Bottom bowl — inner counter (ccw so it punches a hole)
		curvedRing(cx, cy, rx - innerOffset, ry - innerOffset, 'ccw')
	];
};

const buildL_lc = (): BezierContour[] => {
	const cx = LC_W / 2;
	return [
		poly([
			[cx - STEM / 2, 0],
			[cx + STEM / 2, 0],
			[cx + STEM / 2, Math.round(X_HEIGHT * 1.5)],
			[cx - STEM / 2, Math.round(X_HEIGHT * 1.5)]
		])
	];
};

const buildN_lc = (): BezierContour[] => [sqArch(80, LC_W - 160, X_HEIGHT)];

const buildM_lc = (): BezierContour[] => {
	const w = LC_W + 80;
	const h = X_HEIGHT;
	const ri = Math.min(SQ_RI, 30);
	const beamY = h - 84;
	const m: BezierContour = {
		closed: true,
		winding: 'cw',
		commands: [
			{ type: 'M', x: 80, y: 0 },
			{ type: 'L', x: 170, y: 0 },
			{ type: 'L', x: 170, y: beamY - ri },
			sqC(170, beamY - ri, 170, beamY, 170 + ri, beamY),
			{ type: 'L', x: 235 - ri, y: beamY },
			sqC(235 - ri, beamY, 235, beamY, 235, beamY - ri),
			{ type: 'L', x: 235, y: 0 },
			{ type: 'L', x: 325, y: 0 },
			{ type: 'L', x: 325, y: beamY - ri },
			sqC(325, beamY - ri, 325, beamY, 325 + ri, beamY),
			{ type: 'L', x: 390 - ri, y: beamY },
			sqC(390 - ri, beamY, 390, beamY, 390, beamY - ri),
			{ type: 'L', x: 390, y: 0 },
			{ type: 'L', x: w - 80, y: 0 },
			{ type: 'L', x: w - 80, y: h - SQ_R },
			sqC(w - 80, h - SQ_R, w - 80, h, w - 80 - SQ_R, h),
			{ type: 'L', x: 80 + SQ_RS, y: h },
			sqC(80 + SQ_RS, h, 80, h, 80, h - SQ_RS),
			{ type: 'L', x: 80, y: 0 },
			{ type: 'Z' }
		]
	};
	return [m];
};

const buildX_lc = (): BezierContour[] => [
	poly([
		[LC_W - 40 - STEM, 0],
		[LC_W - 40, 0],
		[40 + STEM, X_HEIGHT],
		[40, X_HEIGHT]
	]),
	poly([
		[40, 0],
		[40 + STEM, 0],
		[LC_W - 40, X_HEIGHT],
		[LC_W - 40 - STEM, X_HEIGHT]
	])
];

const buildZ_lc = (): BezierContour[] => [
	poly([[40, X_HEIGHT - BAR], [LC_W - 40, X_HEIGHT - BAR], [LC_W - 40, X_HEIGHT], [40, X_HEIGHT]]),
	// Diagonal — clean parallelogram abutting both bars
	poly([
		[40, BAR],
		[40 + STEM + 30, BAR],
		[LC_W - 40, X_HEIGHT - BAR],
		[LC_W - 40 - STEM - 30, X_HEIGHT - BAR]
	]),
	poly([[40, 0], [LC_W - 40, 0], [LC_W - 40, BAR], [40, BAR]])
];

const DRAWN: GlyphSpec[] = [
	{ codepoint: 0x48, contours: buildH(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 80, status: 'final' },
	{ codepoint: 0x4f, contours: buildO(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 80, status: 'final' },
	{ codepoint: 0x54, contours: buildT(), advanceWidth: CAP_W, leftSidebearing: 60, rightSidebearing: 60, status: 'draft' },
	{ codepoint: 0x49, contours: buildI(), advanceWidth: Math.round(CAP_W * 0.6), leftSidebearing: 60, rightSidebearing: 60, status: 'draft' },
	{ codepoint: 0x45, contours: buildE(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 60, status: 'draft' },
	{ codepoint: 0x4e, contours: buildN(), advanceWidth: CAP_W + 20, leftSidebearing: 80, rightSidebearing: 80, status: 'draft' },
	{ codepoint: 0x4c, contours: buildL(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 60, status: 'draft' },
	{ codepoint: 0x56, contours: buildV(), advanceWidth: CAP_W, leftSidebearing: 60, rightSidebearing: 60, status: 'draft' },
	{ codepoint: 0x41, contours: buildA(), advanceWidth: CAP_W, leftSidebearing: 60, rightSidebearing: 60, status: 'draft' },
	{ codepoint: 0x4d, contours: buildM(), advanceWidth: CAP_W + 80, leftSidebearing: 80, rightSidebearing: 80, status: 'draft' },
	{ codepoint: 0x52, contours: buildR(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 60, status: 'draft' },
	{ codepoint: 0x50, contours: buildP(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 60, status: 'draft' },
	{ codepoint: 0x46, contours: buildF(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 60, status: 'draft' },
	{ codepoint: 0x53, contours: buildS(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 80, status: 'draft' },
	// Remaining caps — fills out the alphabet so the demo can spell anything.
	{ codepoint: 0x42, contours: buildB(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 60, status: 'draft' }, // B
	{ codepoint: 0x43, contours: buildC(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 60, status: 'draft' }, // C
	{ codepoint: 0x44, contours: buildD(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 80, status: 'draft' }, // D
	{ codepoint: 0x47, contours: buildG(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 60, status: 'draft' }, // G
	{ codepoint: 0x55, contours: buildU(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 80, status: 'draft' }, // U
	{ codepoint: 0x59, contours: buildY(), advanceWidth: CAP_W, leftSidebearing: 60, rightSidebearing: 60, status: 'draft' }, // Y
	{ codepoint: 0x4b, contours: buildK(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 60, status: 'draft' }, // K
	{ codepoint: 0x58, contours: buildX(), advanceWidth: CAP_W, leftSidebearing: 60, rightSidebearing: 60, status: 'draft' }, // X
	// Remaining caps — completes the alphabet.
	{ codepoint: 0x4a, contours: buildJ(), advanceWidth: Math.round(CAP_W * 0.8), leftSidebearing: 60, rightSidebearing: 60, status: 'draft' }, // J
	{ codepoint: 0x51, contours: buildQ(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 80, status: 'draft' }, // Q
	{ codepoint: 0x57, contours: buildW(), advanceWidth: CAP_W + 120, leftSidebearing: 60, rightSidebearing: 60, status: 'draft' }, // W
	{ codepoint: 0x5a, contours: buildZ(), advanceWidth: CAP_W, leftSidebearing: 60, rightSidebearing: 60, status: 'draft' }, // Z
	// Digits — tabular-width (DIGIT_W), all the same advance so they form
	// neat columns. Cap-height tall.
	{ codepoint: 0x30, contours: build0(), advanceWidth: DIGIT_W, leftSidebearing: 60, rightSidebearing: 60, status: 'draft' },
	{ codepoint: 0x31, contours: build1(), advanceWidth: DIGIT_W, leftSidebearing: 60, rightSidebearing: 60, status: 'draft' },
	{ codepoint: 0x32, contours: build2(), advanceWidth: DIGIT_W, leftSidebearing: 60, rightSidebearing: 60, status: 'draft' },
	{ codepoint: 0x33, contours: build3(), advanceWidth: DIGIT_W, leftSidebearing: 60, rightSidebearing: 60, status: 'draft' },
	{ codepoint: 0x34, contours: build4(), advanceWidth: DIGIT_W, leftSidebearing: 60, rightSidebearing: 60, status: 'draft' },
	{ codepoint: 0x35, contours: build5(), advanceWidth: DIGIT_W, leftSidebearing: 60, rightSidebearing: 60, status: 'draft' },
	{ codepoint: 0x36, contours: build6(), advanceWidth: DIGIT_W, leftSidebearing: 60, rightSidebearing: 60, status: 'draft' },
	{ codepoint: 0x37, contours: build7(), advanceWidth: DIGIT_W, leftSidebearing: 60, rightSidebearing: 60, status: 'draft' },
	{ codepoint: 0x38, contours: build8(), advanceWidth: DIGIT_W, leftSidebearing: 60, rightSidebearing: 60, status: 'draft' },
	{ codepoint: 0x39, contours: build9(), advanceWidth: DIGIT_W, leftSidebearing: 60, rightSidebearing: 60, status: 'draft' },
	// Punctuation — minimum set the Bringhurst sample paragraph needs.
	{ codepoint: 0x2e, contours: buildPeriod(), advanceWidth: PUNCT_W, leftSidebearing: STEM, rightSidebearing: STEM, status: 'draft' }, // .
	{ codepoint: 0x2c, contours: buildComma(), advanceWidth: PUNCT_W, leftSidebearing: STEM, rightSidebearing: STEM, status: 'draft' }, // ,
	{ codepoint: 0x2d, contours: buildHyphen(), advanceWidth: PUNCT_W + 80, leftSidebearing: 40, rightSidebearing: 40, status: 'draft' }, // -
	{ codepoint: 0x2014, contours: buildEmDash(), advanceWidth: Math.round(CAP_W * 1.6), leftSidebearing: 40, rightSidebearing: 40, status: 'draft' }, // em dash
	{ codepoint: 0x27, contours: buildApostrophe(), advanceWidth: PUNCT_W, leftSidebearing: STEM / 2, rightSidebearing: STEM / 2, status: 'draft' }, // '
	{ codepoint: 0x3a, contours: buildColon(), advanceWidth: PUNCT_W, leftSidebearing: STEM, rightSidebearing: STEM, status: 'draft' }, // :
	{ codepoint: 0x3b, contours: buildSemicolon(), advanceWidth: PUNCT_W, leftSidebearing: STEM, rightSidebearing: STEM, status: 'draft' }, // ;
	{ codepoint: 0x3f, contours: buildQuestion(), advanceWidth: PUNCT_W + 100, leftSidebearing: 60, rightSidebearing: 60, status: 'draft' }, // ?
	{ codepoint: 0x2018, contours: buildQuoteLeft(), advanceWidth: PUNCT_W, leftSidebearing: STEM / 2, rightSidebearing: STEM / 2, status: 'draft' }, // '
	{ codepoint: 0x2019, contours: buildQuoteRight(), advanceWidth: PUNCT_W, leftSidebearing: STEM / 2, rightSidebearing: STEM / 2, status: 'draft' }, // '
	{ codepoint: 0x21, contours: buildExclam(), advanceWidth: PUNCT_W, leftSidebearing: STEM, rightSidebearing: STEM, status: 'draft' }, // !
	{ codepoint: 0x28, contours: buildParenLeft(), advanceWidth: Math.round(PUNCT_W * 1.2), leftSidebearing: 60, rightSidebearing: 40, status: 'draft' }, // (
	{ codepoint: 0x29, contours: buildParenRight(), advanceWidth: Math.round(PUNCT_W * 1.2), leftSidebearing: 40, rightSidebearing: 60, status: 'draft' }, // )
	// Ampersand — descends from Latin "et"; geometric two-bowl + tail.
	{ codepoint: 0x26, contours: buildAmp(), advanceWidth: CAP_W + 80, leftSidebearing: 40, rightSidebearing: 40, status: 'sketch' }, // &
	// At-sign — outer ring enclosing a small lowercase a core
	{ codepoint: 0x40, contours: buildAtSign(), advanceWidth: CAP_W + 60, leftSidebearing: 40, rightSidebearing: 40, status: 'sketch' }, // @
	// Currency — euro / pound / yen / dollar for international body text
	{ codepoint: 0x20ac, contours: buildEuro(), advanceWidth: CAP_W, leftSidebearing: 50, rightSidebearing: 50, status: 'sketch' }, // €
	{ codepoint: 0x00a3, contours: buildPound(), advanceWidth: CAP_W, leftSidebearing: 50, rightSidebearing: 50, status: 'sketch' }, // £
	{ codepoint: 0x00a5, contours: buildYen(), advanceWidth: CAP_W, leftSidebearing: 50, rightSidebearing: 50, status: 'sketch' }, // ¥
	{ codepoint: 0x24, contours: buildDollar(), advanceWidth: CAP_W, leftSidebearing: 50, rightSidebearing: 50, status: 'sketch' }, // $
	// Legal / typography — copyright / registered / trademark / section
	{ codepoint: 0x00a9, contours: buildCopyright(), advanceWidth: CAP_W + 40, leftSidebearing: 40, rightSidebearing: 40, status: 'sketch' }, // ©
	{ codepoint: 0x00ae, contours: buildRegistered(), advanceWidth: CAP_W + 40, leftSidebearing: 40, rightSidebearing: 40, status: 'sketch' }, // ®
	{ codepoint: 0x2122, contours: buildTrademark(), advanceWidth: CAP_W + 60, leftSidebearing: 30, rightSidebearing: 30, status: 'sketch' }, // ™
	{ codepoint: 0x00a7, contours: buildSection(), advanceWidth: Math.round(CAP_W * 0.7), leftSidebearing: 40, rightSidebearing: 40, status: 'sketch' }, // §
	// Brackets
	{ codepoint: 0x5b, contours: buildBracketLeft(), advanceWidth: PUNCT_W, leftSidebearing: 30, rightSidebearing: 30, status: 'sketch' }, // [
	{ codepoint: 0x5d, contours: buildBracketRight(), advanceWidth: PUNCT_W, leftSidebearing: 30, rightSidebearing: 30, status: 'sketch' }, // ]
	{ codepoint: 0x7b, contours: buildBraceLeft(), advanceWidth: PUNCT_W, leftSidebearing: 30, rightSidebearing: 30, status: 'sketch' }, // {
	{ codepoint: 0x7d, contours: buildBraceRight(), advanceWidth: PUNCT_W, leftSidebearing: 30, rightSidebearing: 30, status: 'sketch' }, // }
	// Math
	{ codepoint: 0x00b0, contours: buildDegree(), advanceWidth: PUNCT_W, leftSidebearing: 40, rightSidebearing: 40, status: 'sketch' }, // °
	{ codepoint: 0x00b1, contours: buildPlusMinus(), advanceWidth: PUNCT_W + 100, leftSidebearing: 50, rightSidebearing: 50, status: 'sketch' }, // ±
	{ codepoint: 0x00d7, contours: buildMultiply(), advanceWidth: PUNCT_W + 80, leftSidebearing: 50, rightSidebearing: 50, status: 'sketch' }, // ×
	{ codepoint: 0x00f7, contours: buildDivide(), advanceWidth: PUNCT_W + 100, leftSidebearing: 50, rightSidebearing: 50, status: 'sketch' }, // ÷
	// Math + symbol operators — minimum set for code, prices, equations
	{ codepoint: 0x2b, contours: buildPlus(), advanceWidth: PUNCT_W + 100, leftSidebearing: 50, rightSidebearing: 50, status: 'draft' }, // +
	{ codepoint: 0x3d, contours: buildEquals(), advanceWidth: PUNCT_W + 100, leftSidebearing: 50, rightSidebearing: 50, status: 'draft' }, // =
	{ codepoint: 0x2a, contours: buildAsterisk(), advanceWidth: PUNCT_W + 60, leftSidebearing: 30, rightSidebearing: 30, status: 'draft' }, // *
	{ codepoint: 0x2f, contours: buildSlash(), advanceWidth: PUNCT_W + 40, leftSidebearing: 20, rightSidebearing: 20, status: 'draft' }, // /
	{ codepoint: 0x5c, contours: buildBackslash(), advanceWidth: PUNCT_W + 40, leftSidebearing: 20, rightSidebearing: 20, status: 'draft' }, // \
	{ codepoint: 0x7c, contours: buildPipe(), advanceWidth: PUNCT_W, leftSidebearing: STEM, rightSidebearing: STEM, status: 'draft' }, // |
	{ codepoint: 0x6f, contours: buildO_lc(), advanceWidth: LC_W, leftSidebearing: 80, rightSidebearing: 80, status: 'draft' },
	{ codepoint: 0x6e, contours: buildN_lc(), advanceWidth: LC_W, leftSidebearing: 80, rightSidebearing: 80, status: 'sketch' },
	{ codepoint: 0x61, contours: buildA_lc(), advanceWidth: LC_W, leftSidebearing: 80, rightSidebearing: 80, status: 'sketch' },
	// Lowercase high-frequency letters — render the sample paragraph
	{ codepoint: 0x65, contours: buildE_lc(), advanceWidth: LC_W, leftSidebearing: 80, rightSidebearing: 80, status: 'draft' },
	{ codepoint: 0x69, contours: buildI_lc(), advanceWidth: Math.round(LC_W * 0.55), leftSidebearing: 50, rightSidebearing: 50, status: 'draft' },
	{ codepoint: 0x74, contours: buildT_lc(), advanceWidth: Math.round(LC_W * 0.7), leftSidebearing: 50, rightSidebearing: 50, status: 'draft' },
	{ codepoint: 0x68, contours: buildH_lc(), advanceWidth: LC_W, leftSidebearing: 80, rightSidebearing: 80, status: 'draft' },
	{ codepoint: 0x72, contours: buildR_lc(), advanceWidth: Math.round(LC_W * 0.7), leftSidebearing: 80, rightSidebearing: 60, status: 'draft' },
	{ codepoint: 0x73, contours: buildS_lc(), advanceWidth: LC_W, leftSidebearing: 80, rightSidebearing: 80, status: 'draft' },
	// More lowercase — the next-most-frequent letters in English.
	{ codepoint: 0x6c, contours: buildL_lc(), advanceWidth: Math.round(LC_W * 0.55), leftSidebearing: 50, rightSidebearing: 50, status: 'draft' }, // l
	{ codepoint: 0x75, contours: buildU_lc(), advanceWidth: LC_W, leftSidebearing: 80, rightSidebearing: 80, status: 'draft' }, // u
	{ codepoint: 0x63, contours: buildC_lc(), advanceWidth: LC_W, leftSidebearing: 80, rightSidebearing: 60, status: 'draft' }, // c
	{ codepoint: 0x64, contours: buildD_lc(), advanceWidth: LC_W, leftSidebearing: 80, rightSidebearing: 80, status: 'draft' }, // d
	{ codepoint: 0x6d, contours: buildM_lc(), advanceWidth: LC_W + 80, leftSidebearing: 80, rightSidebearing: 80, status: 'draft' }, // m
	{ codepoint: 0x70, contours: buildP_lc(), advanceWidth: LC_W, leftSidebearing: 80, rightSidebearing: 80, status: 'draft' }, // p
	{ codepoint: 0x62, contours: buildB_lc(), advanceWidth: LC_W, leftSidebearing: 80, rightSidebearing: 80, status: 'draft' }, // b
	{ codepoint: 0x66, contours: buildF_lc(), advanceWidth: Math.round(LC_W * 0.6), leftSidebearing: 50, rightSidebearing: 50, status: 'draft' }, // f
	{ codepoint: 0x67, contours: buildG_lc(), advanceWidth: LC_W, leftSidebearing: 80, rightSidebearing: 80, status: 'draft' }, // g
	{ codepoint: 0x79, contours: buildY_lc(), advanceWidth: LC_W, leftSidebearing: 60, rightSidebearing: 60, status: 'draft' }, // y
	{ codepoint: 0x76, contours: buildV_lc(), advanceWidth: LC_W, leftSidebearing: 60, rightSidebearing: 60, status: 'draft' }, // v
	{ codepoint: 0x77, contours: buildW_lc(), advanceWidth: LC_W + 80, leftSidebearing: 40, rightSidebearing: 40, status: 'draft' }, // w
	{ codepoint: 0x6b, contours: buildK_lc(), advanceWidth: LC_W, leftSidebearing: 80, rightSidebearing: 60, status: 'draft' }, // k
	{ codepoint: 0x78, contours: buildX_lc(), advanceWidth: LC_W, leftSidebearing: 40, rightSidebearing: 40, status: 'draft' }, // x
	{ codepoint: 0x6a, contours: buildJ_lc(), advanceWidth: Math.round(LC_W * 0.55), leftSidebearing: 50, rightSidebearing: 50, status: 'draft' }, // j
	{ codepoint: 0x71, contours: buildQ_lc(), advanceWidth: LC_W, leftSidebearing: 80, rightSidebearing: 80, status: 'draft' }, // q
	{ codepoint: 0x7a, contours: buildZ_lc(), advanceWidth: LC_W, leftSidebearing: 40, rightSidebearing: 40, status: 'draft' }, // z
	// Cyrillic look-alike starter — letters that share Latin shapes
	// directly. NOT a full Cyrillic set; bespoke Cyrillic shapes (Я Ж Ц
	// Щ Б Г Д Ы Ю Э Ч П Л Ф) need their own drawings and are explicit
	// future work. This starter unlocks reading basic Russian/Bulgarian
	// transliterations + words that happen to use only look-alike letters.
	// Uppercase:
	{ codepoint: 0x0410, contours: buildA(), advanceWidth: CAP_W, leftSidebearing: 60, rightSidebearing: 60, status: 'sketch' }, // А
	{ codepoint: 0x0412, contours: buildB(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 80, status: 'sketch' }, // В
	{ codepoint: 0x0415, contours: buildE(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 80, status: 'sketch' }, // Е
	{ codepoint: 0x041a, contours: buildK(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 60, status: 'sketch' }, // К
	{ codepoint: 0x041c, contours: buildM(), advanceWidth: CAP_W + 80, leftSidebearing: 80, rightSidebearing: 80, status: 'sketch' }, // М
	{ codepoint: 0x041d, contours: buildH(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 80, status: 'sketch' }, // Н — same as Latin H
	{ codepoint: 0x041e, contours: buildO(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 80, status: 'sketch' }, // О
	{ codepoint: 0x0420, contours: buildP(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 80, status: 'sketch' }, // Р — same as Latin P
	{ codepoint: 0x0421, contours: buildC(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 80, status: 'sketch' }, // С — same as Latin C
	{ codepoint: 0x0422, contours: buildT(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 80, status: 'sketch' }, // Т — same as Latin T
	{ codepoint: 0x0425, contours: buildX(), advanceWidth: CAP_W, leftSidebearing: 40, rightSidebearing: 40, status: 'sketch' }, // Х — same as Latin X
	// Bespoke Cyrillic uppercase — Я / Ж / Ф have no Latin look-alike. Status: 'sketch'
	// (audit will flag for refinement). Builder docstrings in demo-project.ts.
	{ codepoint: 0x0416, contours: buildZhe(), advanceWidth: CAP_W + 200, leftSidebearing: 60, rightSidebearing: 60, status: 'sketch' }, // Ж
	{ codepoint: 0x0424, contours: buildEf(), advanceWidth: CAP_W + 40, leftSidebearing: 60, rightSidebearing: 60, status: 'sketch' }, // Ф
	{ codepoint: 0x042f, contours: buildYa(), advanceWidth: CAP_W, leftSidebearing: 60, rightSidebearing: 60, status: 'sketch' }, // Я
	// Lowercase (only the ones with unambiguous Latin twins in geometric sans):
	{ codepoint: 0x0430, contours: buildA_lc(), advanceWidth: LC_W, leftSidebearing: 80, rightSidebearing: 80, status: 'sketch' }, // а
	{ codepoint: 0x0435, contours: buildE_lc(), advanceWidth: LC_W, leftSidebearing: 80, rightSidebearing: 80, status: 'sketch' }, // е
	{ codepoint: 0x043e, contours: buildO_lc(), advanceWidth: LC_W, leftSidebearing: 80, rightSidebearing: 80, status: 'sketch' }, // о
	{ codepoint: 0x0440, contours: buildP_lc(), advanceWidth: LC_W, leftSidebearing: 80, rightSidebearing: 80, status: 'sketch' }, // р — same as Latin p
	{ codepoint: 0x0441, contours: buildC_lc(), advanceWidth: LC_W, leftSidebearing: 80, rightSidebearing: 60, status: 'sketch' }, // с
	{ codepoint: 0x0445, contours: buildX_lc(), advanceWidth: LC_W, leftSidebearing: 40, rightSidebearing: 40, status: 'sketch' }, // х
	// Greek uppercase look-alikes — same starter pattern as Cyrillic.
	// 14 capitals whose shapes are identical (in a geometric sans) to
	// their Latin counterparts. NOT a full Greek set; Γ Δ Θ Λ Ξ Π Σ Φ Ψ Ω
	// + the entire lowercase script need bespoke shapes (Greek lowercase
	// is its own design problem) and are deliberate future work.
	{ codepoint: 0x0391, contours: buildA(), advanceWidth: CAP_W, leftSidebearing: 60, rightSidebearing: 60, status: 'sketch' }, // Α Alpha
	{ codepoint: 0x0392, contours: buildB(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 80, status: 'sketch' }, // Β Beta
	{ codepoint: 0x0395, contours: buildE(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 80, status: 'sketch' }, // Ε Epsilon
	{ codepoint: 0x0396, contours: buildZ(), advanceWidth: CAP_W, leftSidebearing: 40, rightSidebearing: 40, status: 'sketch' }, // Ζ Zeta
	{ codepoint: 0x0397, contours: buildH(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 80, status: 'sketch' }, // Η Eta
	{ codepoint: 0x0399, contours: buildI(), advanceWidth: Math.round(CAP_W * 0.6), leftSidebearing: 60, rightSidebearing: 60, status: 'sketch' }, // Ι Iota
	{ codepoint: 0x039a, contours: buildK(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 60, status: 'sketch' }, // Κ Kappa
	{ codepoint: 0x039c, contours: buildM(), advanceWidth: CAP_W + 80, leftSidebearing: 80, rightSidebearing: 80, status: 'sketch' }, // Μ Mu
	{ codepoint: 0x039d, contours: buildN(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 80, status: 'sketch' }, // Ν Nu
	{ codepoint: 0x039f, contours: buildO(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 80, status: 'sketch' }, // Ο Omicron
	{ codepoint: 0x03a1, contours: buildP(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 80, status: 'sketch' }, // Ρ Rho
	{ codepoint: 0x03a4, contours: buildT(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 80, status: 'sketch' }, // Τ Tau
	{ codepoint: 0x03a5, contours: buildY(), advanceWidth: CAP_W, leftSidebearing: 60, rightSidebearing: 60, status: 'sketch' }, // Υ Upsilon
	{ codepoint: 0x03a7, contours: buildX(), advanceWidth: CAP_W, leftSidebearing: 40, rightSidebearing: 40, status: 'sketch' } // Χ Chi
];

/** Build a fresh demo project. Caller is expected to saveProject() it. */
export const createDemoProject = (): Project => {
	const project = createProject({
		name: 'Studio Geometric — demo',
		familyName: 'Studio Geometric',
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

	// Polish the metadata so the demo reads as a real foundry release rather
	// than a default skeleton. Designer / copyright / license / vendorID
	// all populated; designer URL points at a placeholder so the link
	// renders without 404-ing real content.
	project.metadata = {
		...project.metadata,
		designer: 'Studio Geometric',
		copyright: '© 2026 Studio Geometric. Released under the SIL Open Font License 1.1.',
		license: 'SIL Open Font License 1.1',
		licenseURL: 'https://scripts.sil.org/OFL',
		designerURL: 'https://studio-geometric.example',
		manufacturer: 'Studio Geometric',
		vendorID: 'STGM'
	};

	// Set space's advance — without this, words run together.
	// Standard convention is ~25% UPM (250 at 1000 UPM).
	const spaceGlyph = project.glyphs[0x20];
	if (spaceGlyph) {
		project.glyphs[0x20] = {
			...spaceGlyph,
			advanceWidth: 250,
			status: 'final',
			updatedAt: new Date().toISOString()
		};
	}

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

	// Translate a contour set by (dx, dy). Used by the feature-variant
	// glyphs below — onum digits sit lower than lining, case parens sit
	// higher than default. Same offset applied to every command's
	// coordinates (M/L/Q/C handles).
	const translateContours = (
		contours: BezierContour[],
		dx: number,
		dy: number
	): BezierContour[] =>
		contours.map((c) => ({
			...c,
			commands: c.commands.map((cmd) => {
				if (cmd.type === 'Z') return cmd;
				if (cmd.type === 'M' || cmd.type === 'L') {
					return { ...cmd, x: cmd.x + dx, y: cmd.y + dy };
				}
				if (cmd.type === 'Q') {
					return { ...cmd, x: cmd.x + dx, y: cmd.y + dy, x1: cmd.x1 + dx, y1: cmd.y1 + dy };
				}
				return {
					...cmd,
					x: cmd.x + dx,
					y: cmd.y + dy,
					x1: cmd.x1 + dx,
					y1: cmd.y1 + dy,
					x2: cmd.x2 + dx,
					y2: cmd.y2 + dy
				};
			})
		}));

	// Oldstyle figures — each digit translated down so the set sits
	// lower than the lining default. Lights up the onum feature in the
	// tester so the toggle does visible work.
	const ONUM_NAMES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
	const ONUM_BUILDERS = [build0, build1, build2, build3, build4, build5, build6, build7, build8, build9];
	for (let i = 0; i < 10; i++) {
		const cp = 0xe100 + i;
		// Hangers (3,4,5,7,9) sit lower; "tall" oldstyle (6,8) lift; the
		// rest sit at x-height-ish. Approximations of the historic shape
		// distinctions — close enough for the demo to show variation.
		let dy = -80;
		if (i === 6 || i === 8) dy = 30;
		else if (i === 0 || i === 1 || i === 2) dy = -50;
		project.glyphs[cp] = {
			codepoint: cp,
			name: `${ONUM_NAMES[i]}.onum`,
			status: 'sketch',
			advanceWidth: DIGIT_W,
			leftSidebearing: 60,
			rightSidebearing: 60,
			contours: translateContours(ONUM_BUILDERS[i](), 0, dy),
			tags: ['alternate', 'onum'],
			notes: `Oldstyle ${ONUM_NAMES[i]} — shifted vertical so the set has the wave that oldstyle figures carry through running text. Reach via 'onum' 1.`,
			updatedAt: new Date().toISOString()
		};
	}

	// Case-sensitive parens — raised so the vertical position matches
	// uppercase letters (the default parens sit at lowercase x-height
	// territory). Lights up the case feature.
	project.glyphs[0xe200] = {
		codepoint: 0xe200,
		name: 'parenleft.case',
		status: 'sketch',
		advanceWidth: Math.round(PUNCT_W * 1.2),
		leftSidebearing: 60,
		rightSidebearing: 40,
		contours: translateContours(buildParenLeft(), 0, 80),
		tags: ['alternate', 'case'],
		notes: 'Case-sensitive ( — raised so it aligns vertically with uppercase letters in "(HELLO)" rather than centering at x-height. Reach via \'case\' 1.',
		updatedAt: new Date().toISOString()
	};
	project.glyphs[0xe201] = {
		codepoint: 0xe201,
		name: 'parenright.case',
		status: 'sketch',
		advanceWidth: Math.round(PUNCT_W * 1.2),
		leftSidebearing: 40,
		rightSidebearing: 60,
		contours: translateContours(buildParenRight(), 0, 80),
		tags: ['alternate', 'case'],
		notes: 'Case-sensitive ) — raised partner to parenleft.case.',
		updatedAt: new Date().toISOString()
	};

	// g.ss02 — alternate lowercase g. The default is the geometric two-
	// storey g; this one is a single-storey with a hook tail (the
	// monolinear UI shape). Same x-height bowl, simpler descender.
	project.glyphs[0xe010] = {
		codepoint: 0xe010,
		name: 'g.ss02',
		status: 'sketch',
		advanceWidth: LC_W,
		leftSidebearing: 80,
		rightSidebearing: 80,
		contours: [
			// Bowl outer (small ring at x-height/2)
			curvedRing(LC_W / 2, X_HEIGHT / 2, X_HEIGHT / 2 - 60, X_HEIGHT / 2 - 60, 'cw'),
			// Bowl counter (ccw)
			curvedRing(LC_W / 2, X_HEIGHT / 2, X_HEIGHT / 2 - 60 - STEM + 10, X_HEIGHT / 2 - 60 - STEM + 10, 'ccw'),
			// Right stem (single-storey g has a vertical stem on the right
			// extending into the descender)
			poly([
				[LC_W - 80 - STEM, -150],
				[LC_W - 80, -150],
				[LC_W - 80, X_HEIGHT - 60],
				[LC_W - 80 - STEM, X_HEIGHT - 60]
			]),
			// Descender hook (short horizontal at the bottom of the right
			// stem, signal of the single-storey descender)
			poly([
				[LC_W - 80 - STEM - 80, -150],
				[LC_W - 80, -150],
				[LC_W - 80, -150 + BAR],
				[LC_W - 80 - STEM - 80, -150 + BAR]
			])
		],
		tags: ['alternate', 'ss02'],
		notes: 'Single-storey g alternate — geometric-UI variant of the default two-storey shape. Reach via \'ss02\' 1.',
		updatedAt: new Date().toISOString()
	};

	// Add the ss01 stylistic-alternate glyph at a PUA codepoint. The name
	// `a.ss01` triggers feature-detect to emit a GSUB `feature ss01 { sub
	// a by a.ss01; } ss01;` rule at export — the user can flip it on with
	// font-feature-settings: 'ss01' 1 in the preview.
	const ssOneCp = 0xe001;
	project.glyphs[ssOneCp] = {
		codepoint: ssOneCp,
		name: 'a.ss01',
		status: 'draft',
		advanceWidth: LC_W,
		leftSidebearing: 80,
		rightSidebearing: 80,
		contours: buildA_lc_ss01(),
		tags: ['flagship', 'alternate'],
		notes: 'Single-storey alternate `a` — the geometric counterpart to the default two-storey form. Reach via font-feature-settings: \'ss01\' 1.',
		updatedAt: new Date().toISOString()
	};

	// Combining acute (U+0301) — the mark glyph that pairs with base
	// glyphs via the `_top` / `top` anchor convention. Drawn with the
	// `_top` anchor at the bottom-centre of the mark so it lands on the
	// base's `top` anchor when composed.
	const ACUTECOMB = 0x0301;
	const acuteShape = buildAcuteComb();
	project.glyphs[ACUTECOMB] = {
		codepoint: ACUTECOMB,
		name: 'acutecomb',
		status: 'draft',
		advanceWidth: 0, // marks have zero advance
		leftSidebearing: 0,
		rightSidebearing: 0,
		contours: acuteShape,
		anchors: [
			// `_top` at (100, CAP_HEIGHT) — sits at the bottom-centre of
			// the mark shape (y matches the buildAcuteComb baseline + 0).
			{ name: '_top', x: 100, y: CAP_HEIGHT + 50 }
		],
		tags: ['mark'],
		notes: 'Combining acute. `_top` anchor pairs with the `top` anchor on Latin caps + lowercase via the GPOS mark feature.',
		updatedAt: new Date().toISOString()
	};

	// Aacute (U+00C1) — composite of A + acutecomb. Anchor-snap math:
	// A.top is at (CAP_W/2, CAP_HEIGHT); acutecomb._top is at (100, CAP_HEIGHT+50).
	// mark.offset = base.offset + base.anchor - mark.anchor
	//             = (0, 0) + (CAP_W/2, CAP_HEIGHT) - (100, CAP_HEIGHT + 50)
	//             = (CAP_W/2 - 100, -50)
	const AACUTE = 0x00c1;
	const Aglyph = project.glyphs[0x41];
	if (Aglyph) {
		const markOffsetX = Math.round(Aglyph.advanceWidth / 2 - 100);
		const markOffsetY = -50;
		project.glyphs[AACUTE] = {
			codepoint: AACUTE,
			name: 'Aacute',
			status: 'draft',
			advanceWidth: Aglyph.advanceWidth,
			leftSidebearing: Aglyph.leftSidebearing,
			rightSidebearing: Aglyph.rightSidebearing,
			contours: [],
			components: [
				{ baseCodepoint: 0x41, offsetX: 0, offsetY: 0 },
				{ baseCodepoint: ACUTECOMB, offsetX: markOffsetX, offsetY: markOffsetY }
			],
			tags: ['composite'],
			notes: 'Composite: A + acutecomb. Anchor-snapped — the mark\'s _top anchor sits exactly on A\'s top anchor.',
			updatedAt: new Date().toISOString()
		};
	}

	// æ (U+00E6) and œ (U+0153) — composite ligatures built from a/e and
	// o/e. Each base shifts the second letter right by its own advance,
	// then nudges back slightly so the two letterforms share a join
	// rather than reading as two adjacent letters with a gap. Not how
	// you'd ship a polished ligature (those want a custom drawing) but
	// they demonstrate the composite mechanism + populate the Extended
	// Latin coverage row with real shapes.
	const Aglyph_lc = project.glyphs[0x61];
	const Eglyph_lc = project.glyphs[0x65];
	const Oglyph_lc = project.glyphs[0x6f];
	if (Aglyph_lc && Eglyph_lc) {
		const overlap = 180;
		const offsetX = Aglyph_lc.advanceWidth - overlap;
		project.glyphs[0x00e6] = {
			codepoint: 0x00e6,
			name: 'ae',
			status: 'sketch',
			advanceWidth: offsetX + Eglyph_lc.advanceWidth,
			leftSidebearing: Aglyph_lc.leftSidebearing,
			rightSidebearing: Eglyph_lc.rightSidebearing,
			contours: [],
			components: [
				{ baseCodepoint: 0x61, offsetX: 0, offsetY: 0 },
				{ baseCodepoint: 0x65, offsetX, offsetY: 0 }
			],
			tags: ['composite', 'ligature'],
			notes: 'Composite a + e. A real æ joins them at the central vertical; this is a side-by-side approximation that demonstrates the composite mechanism.',
			updatedAt: new Date().toISOString()
		};
	}
	if (Oglyph_lc && Eglyph_lc) {
		const overlap = 200;
		const offsetX = Oglyph_lc.advanceWidth - overlap;
		project.glyphs[0x0153] = {
			codepoint: 0x0153,
			name: 'oe',
			status: 'sketch',
			advanceWidth: offsetX + Eglyph_lc.advanceWidth,
			leftSidebearing: Oglyph_lc.leftSidebearing,
			rightSidebearing: Eglyph_lc.rightSidebearing,
			contours: [],
			components: [
				{ baseCodepoint: 0x6f, offsetX: 0, offsetY: 0 },
				{ baseCodepoint: 0x65, offsetX, offsetY: 0 }
			],
			tags: ['composite', 'ligature'],
			notes: 'Composite o + e. Side-by-side approximation; a polished œ would share the bowl.',
			updatedAt: new Date().toISOString()
		};
	}

	// ß (eszett, U+00DF) — a real drawn glyph (not a composite). Geometric
	// construction matches the rest of the lowercase: full-ascender left
	// stem + bottom bowl + a top flag. Fills out Extended Latin with a
	// shape that designer-friends evaluating the demo would expect.
	project.glyphs[0x00df] = {
		codepoint: 0x00df,
		name: 'germandbls',
		status: 'draft',
		advanceWidth: LC_W + 60,
		leftSidebearing: 80,
		rightSidebearing: 80,
		contours: buildEszett(),
		tags: ['extended-latin'],
		notes:
			'Geometric ß — left stem with full ascender, top flag hinting at the long-s (ſ) origin, B-style lower bowl. Construction parallels buildB_lc so the family reads as one design.',
		updatedAt: new Date().toISOString()
	};

	// fi (U+FB01) and fl (U+FB02) — proper ligatures with FEA-convention
	// names ("f_i", "f_l") so detectFeatures picks them up as `liga`
	// substitutions. When the share-page tester (or installed font with
	// liga on) sees an "f" followed by "i", it swaps both for the
	// ligature glyph. The composites use a small negative overlap so
	// the f's hook + i's dot share visual space — the canonical
	// motivation for shipping a fi ligature.
	const Fglyph_lc = project.glyphs[0x66];
	const Iglyph_lc = project.glyphs[0x69];
	const Lglyph_lc_lower = project.glyphs[0x6c];
	if (Fglyph_lc && Iglyph_lc) {
		// f.advance is narrow (~0.6 * LC_W); i is even narrower. Overlap
		// pulls the i slightly under the f's hook for a real-feeling
		// fi shape.
		const overlap = 80;
		const offsetX = Fglyph_lc.advanceWidth - overlap;
		project.glyphs[0xfb01] = {
			codepoint: 0xfb01,
			name: 'f_i',
			status: 'sketch',
			advanceWidth: offsetX + Iglyph_lc.advanceWidth,
			leftSidebearing: Fglyph_lc.leftSidebearing,
			rightSidebearing: Iglyph_lc.rightSidebearing,
			contours: [],
			components: [
				{ baseCodepoint: 0x66, offsetX: 0, offsetY: 0 },
				{ baseCodepoint: 0x69, offsetX, offsetY: 0 }
			],
			tags: ['composite', 'ligature'],
			notes:
				'Composite f + i, slight overlap so the hook meets the dot. Auto-detected as a liga substitution because the name is `f_i`.',
			updatedAt: new Date().toISOString()
		};
	}
	if (Fglyph_lc && Lglyph_lc_lower) {
		const overlap = 60;
		const offsetX = Fglyph_lc.advanceWidth - overlap;
		project.glyphs[0xfb02] = {
			codepoint: 0xfb02,
			name: 'f_l',
			status: 'sketch',
			advanceWidth: offsetX + Lglyph_lc_lower.advanceWidth,
			leftSidebearing: Fglyph_lc.leftSidebearing,
			rightSidebearing: Lglyph_lc_lower.rightSidebearing,
			contours: [],
			components: [
				{ baseCodepoint: 0x66, offsetX: 0, offsetY: 0 },
				{ baseCodepoint: 0x6c, offsetX, offsetY: 0 }
			],
			tags: ['composite', 'ligature'],
			notes:
				'Composite f + l. Auto-detected as `liga` via the underscore-joined name (`f_l`).',
			updatedAt: new Date().toISOString()
		};
	}

	// Pre-fill the Brief so the user sees a complete project, not just
	// glyphs. Six fields filled = 100% brief completion.
	project.brief = {
		intent:
			'A neutral monolinear geometric sans built for product interfaces at 12–28px. The aim is texture as steady as a column of bricks — readable at small sizes, calm at large ones, never calling attention to itself unless asked. Geometric construction gives the letters a clean, modern aesthetic without sacrificing legibility.',
		audience:
			'Designers and engineers building interfaces who need a typeface that disappears into the layout and lets the content speak. Equally happy in a Settings panel, a data table, or a marketing landing page.',
		useCases: ['web-ui', 'body-text', 'display'],
		readingConditions:
			'Primarily on high-DPI screens at body sizes (12–18px) with optical sizing for larger heads (24–96px). Tested against macOS, iOS, Chrome on Android, and 1× / 2× Retina rendering. Should hold up at 12px on a low-DPI second monitor.',
		differentiation:
			'Where Inter and Manrope optimise for variable spans, this typeface optimises for the static body case: even rhythm, slightly tighter aperture on `c` and `e` so they hold their shape at 12px, two stylistic-alternate slots (`ss01` single-storey `a`, `ss02` single-storey `g`), oldstyle figures via `onum`, case-sensitive parens via `case`, and a real `liga` pair (`fi`, `fl`). The Latin set covers ASCII + Extended Latin (ß, æ, œ), currency (€ £ ¥ $), legal (© ® ™ §), math (± × ÷ °), and brackets — enough to set a UI shell, a price table, or a legal footer without falling back to system fonts. A Cyrillic + Greek look-alike starter (the letters that share Latin shapes in a geometric sans — А В Е К М Н О Р С Т Х and Α Β Ε Ζ Η Ι Κ Μ Ν Ο Ρ Τ Υ Χ) seeds the multi-script story; bespoke Cyrillic + Greek shapes are explicit future work.',
		designNotes:
			'Stem width 90fu (≈9% UPM); bar weight 80fu to match the optical balance at body sizes. Geometric letters (`O`, `o`) use circular construction; humanist letters (`a`, `g`) get a more handwritten lean. Kerning targets the AV/Ta/We pairs hardest — those carry most of the perceived spacing in Latin body text.',
		references: [
			{
				id: crypto.randomUUID(),
				name: 'Inter',
				url: 'https://rsms.me/inter/',
				kind: 'functional',
				notes: 'The UI-grade benchmark. Reference for x-height proportion and spacing rhythm.'
			},
			{
				id: crypto.randomUUID(),
				name: 'Söhne',
				kind: 'competitive',
				notes:
					'Klim Type Foundry, 2019. Studied for the geometric/humanist crossover — particularly the way the lowercase a holds at small sizes.'
			},
			{
				id: crypto.randomUUID(),
				name: 'Futura',
				kind: 'historical',
				notes:
					"Paul Renner, 1927. The geometric grandparent; reference for `O` circularity and `n` shoulder."
			},
			{
				id: crypto.randomUUID(),
				name: 'Avenir',
				kind: 'historical',
				notes:
					"Adrian Frutiger, 1988. The other geometric reference — a touch more human than Futura. Studied for the way the lowercase joins (`u`, `n`) feel slightly softer than the perfect circles suggest."
			},
			{
				id: crypto.randomUUID(),
				name: 'IBM Plex Sans',
				url: 'https://www.ibm.com/plex/',
				kind: 'functional',
				notes:
					'Mike Abbink + Bold Monday, 2017. Sibling reference for the body-text optical-size story — reads similarly at 14px but optically heavier in display.'
			}
		]
	};

	// Decisions captured in the design journal so the Brief tab's decision
	// log reads like an actual project notebook — every decision has a
	// "tried it the other way" trace so the journal is teaching, not
	// rationalization. Dates back-distributed so the recency story is
	// believable (oldest decisions first, newest at the bottom).
	const daysAgo = (n: number) => new Date(Date.now() - 1000 * 60 * 60 * 24 * n).toISOString();
	project.decisions = [
		{
			id: crypto.randomUUID(),
			date: daysAgo(28),
			decision: 'UPM 1000, ascender 800 / descender -200',
			rationale:
				'Considered 2048 (Inter standard) for vertical-metric precision, but 1000 keeps the coordinate math readable in the editor + audit logs. Designers reading the contour data understand units-per-em instantly when they match common rounding (50, 100, 250).'
		},
		{
			id: crypto.randomUUID(),
			date: daysAgo(21),
			decision: 'Cap-height 700 / x-height 500 (ratio 0.71)',
			rationale:
				'Higher x-height tested (0.75) read younger but lost some of the calm rhythm at body sizes. 0.71 is the Söhne / Inter compromise — large enough to hold at 12px without dominating the cap-height in mixed-case.'
		},
		{
			id: crypto.randomUUID(),
			date: daysAgo(14),
			decision: 'Single-storey `a` as ss01 alternate, not the default',
			rationale:
				'Tested both in body copy. The two-storey `a` reads more solidly at 12-14px where most UI text lives. Single-storey reserved for designers who want the geometric look — opt in via the ss01 OpenType feature.'
		},
		{
			id: crypto.randomUUID(),
			date: daysAgo(7),
			decision: 'Stem width fixed at 90fu across uppercase + lowercase',
			rationale:
				'Tried 100fu for caps and 85fu for lowercase to match optical density. The contrast was too visible in mixed-case settings. 90fu reads as consistent across body text without looking mechanical.'
		},
		{
			id: crypto.randomUUID(),
			date: daysAgo(3),
			decision: 'Italic via 10° slnt axis (no separate Italic master geometry)',
			rationale:
				'A proper drawn Italic was scoped at ~3 weeks of work. The slnt-only shear ships an Italic that reads consistent with Regular for body text — the audience (UI designers) won\'t typically use Italic for display. Drawn Italic is on the v2 list.'
		},
		{
			id: crypto.randomUUID(),
			date: daysAgo(1),
			decision: 'Kerning targets AV/Ta/We/LT/LV/LY first; everything else by silhouette',
			rationale:
				'Type design folklore: 30 pairs do 80% of the perceived spacing in Latin body text. Hand-tuned those plus a handful of CJK-adjacent uppercase pairs (HI, IH); the rest fills in via auto-kern silhouette distance.'
		},
		{
			id: crypto.randomUUID(),
			date: daysAgo(0),
			decision: 'Six OpenType features (kern, liga, ss01, ss02, onum, case) before extending Cyrillic / Greek',
			rationale:
				'A complete Latin set with rich OpenType behavior beats a half-finished multi-script. liga ships real fi/fl ligatures (the eye notices missing fi-collisions instantly in body text). onum + case turn the tester toggles from "feature declared" into "feature does something visible." ss01/ss02 reach the population that wants a different a or g without forcing the rest. Cyrillic + Greek are real work in the next arc.'
		},
		{
			id: crypto.randomUUID(),
			date: daysAgo(0),
			decision: 'Cyrillic + Greek as look-alike starters first, bespoke shapes deferred',
			rationale:
				'Cyrillic А В Е Н К М О Р С Т Х and Greek Α Β Ε Ζ Η Ι Κ Μ Ν Ο Ρ Τ Υ Χ share their Latin shapes in a geometric sans — Latin builders are reused honestly. v1.5 added bespoke Я Ж Ф in the same idiom (constant STEM, hard 90° corners) as proof-of-concept; they ship with status:"sketch" so the audit panel flags them for designer refinement. Greek lowercase + the dotted-i family (й, ё etc.) remain explicit future work.'
		}
	];

	// Sample text the Preview + Specimen pages pick up.
	project.samples = {
		paragraph:
			'Typography is the craft of endowing human language with a durable visual form, and thus with an independent existence. Its heartwood is calligraphy — the dance, on a tiny stage, of the living, speaking hand — and its roots reach into living soil, though its branches may be hung each year with new and shifting leaves.'
	};

	// Curated kerning pairs — the AV/HE/TO/Ta/We trifecta that carries
	// most of the perceived spacing in Latin body text. Negative values
	// pull the glyphs closer; positive push them apart.
	project.kerning = [
		// Classic angular-stem pairs — the most-photographed bigrams in type.
		{ left: 0x41, right: 0x56, value: -50 }, // AV
		{ left: 0x56, right: 0x41, value: -50 }, // VA
		{ left: 0x41, right: 0x54, value: -50 }, // AT
		{ left: 0x54, right: 0x41, value: -50 }, // TA
		{ left: 0x41, right: 0x59, value: -40 }, // AY (Y not drawn but pair stays)
		{ left: 0x4c, right: 0x54, value: -50 }, // LT
		{ left: 0x4c, right: 0x56, value: -50 }, // LV
		{ left: 0x4c, right: 0x59, value: -50 }, // LY
		// Uppercase pairs against H / T / N / O / L / R / M.
		{ left: 0x48, right: 0x49, value: -20 }, // HI
		{ left: 0x48, right: 0x4f, value: -10 }, // HO
		{ left: 0x49, right: 0x48, value: -20 }, // IH
		{ left: 0x49, right: 0x4e, value: -10 }, // IN
		{ left: 0x49, right: 0x4f, value: -30 }, // IO
		{ left: 0x4f, right: 0x48, value: -10 }, // OH
		{ left: 0x4f, right: 0x4e, value: -10 }, // ON
		{ left: 0x4f, right: 0x54, value: -20 }, // OT
		{ left: 0x4e, right: 0x4f, value: -10 }, // NO
		{ left: 0x54, right: 0x4e, value: -20 }, // TN
		{ left: 0x54, right: 0x4f, value: -30 }, // TO
		{ left: 0x52, right: 0x4f, value: -10 }, // RO
		{ left: 0x4d, right: 0x4f, value: -10 }, // MO
		// Cap-then-lowercase (mid-word and after-cap-then-lowercase letter).
		{ left: 0x54, right: 0x61, value: -50 }, // Ta
		{ left: 0x54, right: 0x6f, value: -40 }, // To
		{ left: 0x54, right: 0x6e, value: -30 }, // Tn
		{ left: 0x56, right: 0x61, value: -30 }, // Va
		{ left: 0x56, right: 0x6f, value: -30 }, // Vo
		{ left: 0x41, right: 0x61, value: -10 }, // Aa
		// New letters' kerning into common lowercase neighbours.
		{ left: 0x50, right: 0x61, value: -50 }, // Pa
		{ left: 0x50, right: 0x6f, value: -30 }, // Po
		{ left: 0x46, right: 0x61, value: -50 }, // Fa
		{ left: 0x46, right: 0x6f, value: -30 }, // Fo
		{ left: 0x46, right: 0x6e, value: -30 }, // Fn
		{ left: 0x53, right: 0x61, value: -10 }, // Sa
		{ left: 0x53, right: 0x6f, value: -10 }, // So
		// Lowercase pairs — the body-text bigrams that carry rhythm.
		{ left: 0x6e, right: 0x6f, value: -10 }, // no
		{ left: 0x6f, right: 0x6e, value: -10 }, // on
		{ left: 0x61, right: 0x6e, value: -10 }, // an
		{ left: 0x61, right: 0x6f, value: -10 }, // ao
		{ left: 0x6f, right: 0x76, value: -20 }, // ov
		{ left: 0x76, right: 0x6f, value: -20 }, // vo
		{ left: 0x6f, right: 0x77, value: -20 }, // ow
		{ left: 0x77, right: 0x6f, value: -20 }, // wo
		{ left: 0x6f, right: 0x79, value: -20 }, // oy
		{ left: 0x6f, right: 0x74, value: -10 }, // ot
		{ left: 0x74, right: 0x6f, value: -20 }, // to
		{ left: 0x74, right: 0x79, value: -10 }, // ty
		{ left: 0x65, right: 0x77, value: -10 }, // ew
		{ left: 0x65, right: 0x76, value: -10 }, // ev
		{ left: 0x6c, right: 0x74, value: -20 }, // lt
		{ left: 0x6c, right: 0x76, value: -30 }, // lv
		{ left: 0x6c, right: 0x79, value: -30 }, // ly
		{ left: 0x6c, right: 0x77, value: -30 }, // lw
		{ left: 0x72, right: 0x74, value: -20 }, // rt
		{ left: 0x72, right: 0x79, value: -10 }, // ry
		{ left: 0x72, right: 0x76, value: -10 }, // rv
		// Diphthong / vowel pairs that carry the lions share of English body.
		{ left: 0x61, right: 0x69, value: -10 }, // ai
		{ left: 0x65, right: 0x69, value: -10 }, // ei
		{ left: 0x6f, right: 0x69, value: -10 }, // oi
		{ left: 0x69, right: 0x6f, value: -10 }, // io
		{ left: 0x65, right: 0x61, value: -10 }, // ea
		// Lowercase after punctuation — comma + period kern the following
		// letter slightly closer so the rhythm doesn't break at sentence
		// ends.
		{ left: 0x2c, right: 0x6f, value: -30 }, // ,o
		{ left: 0x2c, right: 0x61, value: -30 }, // ,a
		{ left: 0x2c, right: 0x65, value: -30 }, // ,e
		{ left: 0x2e, right: 0x6f, value: -20 }, // .o
		// Numbers next to operators (now that +, =, * are drawn).
		{ left: 0x31, right: 0x32, value: -10 }, // 12
		{ left: 0x32, right: 0x33, value: -10 }, // 23
		// Mixed-case caps following lowercase (common after-period case).
		{ left: 0x6e, right: 0x48, value: 10 }, // nH
		{ left: 0x6f, right: 0x48, value: 10 } // oH
	];

	// Sidebearing classes — vertical-stem caps + lowercase-with-stem.
	// Demonstrates the class system + the sidebearing-class-drift audit.
	project.sidebearingClasses = [
		{
			id: crypto.randomUUID(),
			name: 'Cap vertical stems',
			members: [0x48, 0x49, 0x4c, 0x4d, 0x4e, 0x52, 0x54, 0x50, 0x46, 0x42, 0x44, 0x4b, 0x55] // H I L M N R T P F B D K U
		},
		{
			id: crypto.randomUUID(),
			name: 'Lowercase stems',
			members: [0x6e, 0x61] // n a
		},
		{
			id: crypto.randomUUID(),
			name: 'Tabular figures',
			members: [0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39] // 0-9
		}
	];

	// Two color palettes — default ("ink") + dark variant. Drives COLR
	// rendering on the flagship `O` (below). Demonstrates the CPAL palette
	// editor + the font-palette: light/dark CSS selector.
	const PAL_DEFAULT_ID = crypto.randomUUID();
	const PAL_DARK_ID = crypto.randomUUID();
	project.palettes = [
		{
			id: PAL_DEFAULT_ID,
			name: 'Default',
			variant: 'default',
			colors: [
				{ r: 17, g: 17, b: 17, a: 1 }, // 0: ink (near-black)
				{ r: 220, g: 38, b: 38, a: 1 }, // 1: warn red
				{ r: 245, g: 158, b: 11, a: 0.85 } // 2: warm accent w/ alpha
			]
		},
		{
			id: PAL_DARK_ID,
			name: 'Dark',
			variant: 'dark',
			colors: [
				{ r: 245, g: 245, b: 245, a: 1 }, // 0: paper
				{ r: 252, g: 165, b: 165, a: 1 }, // 1: soft red
				{ r: 252, g: 211, b: 77, a: 0.85 } // 2: warm accent w/ alpha
			]
		}
	];

	// Anchors on a few base glyphs so the composite editor + the
	// mark-positioning surfaces have real data to play with. The O carries
	// top + bottom anchors centered on its bbox; H gets top + bottom
	// aligned to the crossbar height. Lowercase n gets top only (no
	// bottom — n has no descender to anchor against).
	const H = project.glyphs[0x48];
	if (H && H.contours.length > 0) {
		project.glyphs[0x48] = {
			...H,
			anchors: [
				{ name: 'top', x: Math.round(H.advanceWidth / 2), y: CAP_HEIGHT },
				{ name: 'bottom', x: Math.round(H.advanceWidth / 2), y: 0 }
			]
		};
	}
	const nLower = project.glyphs[0x6e];
	if (nLower && nLower.contours.length > 0) {
		project.glyphs[0x6e] = {
			...nLower,
			anchors: [
				{ name: 'top', x: Math.round(nLower.advanceWidth / 2), y: X_HEIGHT }
			]
		};
	}
	// Anchors on A, M, R, L, V, P, F, S — bigger character set means more
	// useful anchors for the GPOS mark feature when designer-friends
	// explore composites.
	for (const cp of [
		0x41, 0x4d, 0x52, 0x4c, 0x56, 0x50, 0x46, 0x53,
		0x42, 0x43, 0x44, 0x47, 0x55, 0x59, 0x4b, 0x58
	]) {
		const g = project.glyphs[cp];
		if (g && g.contours.length > 0) {
			project.glyphs[cp] = {
				...g,
				anchors: [
					{ name: 'top', x: Math.round(g.advanceWidth / 2), y: CAP_HEIGHT },
					{ name: 'bottom', x: Math.round(g.advanceWidth / 2), y: 0 }
				]
			};
		}
	}
	// `a` lowercase gets a top anchor (no descender to anchor against).
	const aLower = project.glyphs[0x61];
	if (aLower && aLower.contours.length > 0) {
		project.glyphs[0x61] = {
			...aLower,
			anchors: [
				{ name: 'top', x: Math.round(aLower.advanceWidth / 2), y: X_HEIGHT }
			]
		};
	}

	// Glyph tags — demonstrates the freeform taxonomy. Flagship glyphs get
	// "flagship"; in-progress lowercase letter gets "wip". Surfaces in the
	// browser filter as "#flagship" / "#wip" and in the command palette.
	const tag = (cp: number, tags: string[]) => {
		const g = project.glyphs[cp];
		if (g) project.glyphs[cp] = { ...g, tags };
	};
	tag(0x4f, ['flagship', 'color']);
	tag(0x48, ['flagship']);
	tag(0x41, ['flagship']); // A — classic kerning showcase
	tag(0x56, ['flagship']); // V — classic kerning showcase
	tag(0x6e, ['wip']);
	tag(0x61, ['wip', 'needs-redraw']);

	// COLR layers on the flagship uppercase `O`. Three layers stack to
	// produce a warm-on-ink ring effect: ink fill (full), red accent
	// (offset slightly), warm highlight (smallest, alpha).
	const O = project.glyphs[0x4f];
	if (O && O.contours.length > 0) {
		// Layer 0: ink fill — the existing monochrome shape itself.
		// Layer 1: red accent — same shape, slightly nudged. (Demo
		//    uses the same contours since the demo's O is a simple ring.)
		// Layer 2: warm highlight — smaller inset.
		const baseContours = JSON.parse(JSON.stringify(O.contours)) as typeof O.contours;
		project.glyphs[0x4f] = {
			...O,
			anchors: [
				{ name: 'top', x: Math.round(O.advanceWidth / 2), y: CAP_HEIGHT },
				{ name: 'bottom', x: Math.round(O.advanceWidth / 2), y: 0 }
			],
			colorLayers: [
				{
					id: crypto.randomUUID(),
					name: 'ink',
					contours: baseContours,
					paletteIndex: 0
				},
				{
					id: crypto.randomUUID(),
					name: 'red accent',
					contours: JSON.parse(JSON.stringify(baseContours)),
					paletteIndex: 1
				},
				{
					id: crypto.randomUUID(),
					name: 'warm highlight',
					contours: JSON.parse(JSON.stringify(baseContours)),
					paletteIndex: 2
				}
			]
		};
	}

	// Variable-font axis + Italic master — demonstrates the VF pipeline
	// with a `slnt` (slant) axis at 0..-12 degrees. The Italic master is
	// the default master's glyphs with every point skewed by -10° about
	// the baseline; topology is preserved by construction (same contour
	// count, same per-contour point count) so the master-compatibility
	// audit passes cleanly.
	project.axes = [
		{
			tag: 'slnt',
			name: 'Slant',
			minimum: -12,
			default: 0,
			maximum: 0
		}
	];
	// Per-glyph slant amounts — a uniform 10° shear made every Italic glyph
	// look like a rotated photocopy of its Regular. Real italic typefaces
	// vary the slant by glyph class: caps slant LESS than lowercase (the
	// classic foundry-italic convention), digits stay upright (tabular
	// figures), punctuation gets a gentle lean, and lowercase varies
	// slightly between rounded and angular forms. The result reads as
	// drawn rather than rendered, even though the underlying transform
	// is still a shear.
	const slantDegFor = (cp: number): number => {
		// Digits — stay upright (tabular figures convention).
		if (cp >= 0x30 && cp <= 0x39) return 0;
		// Punctuation + symbols — gentle lean so they don't visually clash
		// with the slanted letters around them but don't out-italic them
		// either.
		if (
			(cp >= 0x21 && cp <= 0x2f) ||
			(cp >= 0x3a && cp <= 0x40) ||
			(cp >= 0x5b && cp <= 0x60) ||
			(cp >= 0x7b && cp <= 0x7e)
		)
			return 4;
		// Caps — less slant than lowercase (foundry-italic convention).
		if (cp >= 0x41 && cp <= 0x5a) return 8;
		// Lowercase round-bowl letters get slightly MORE slant — the round
		// counters absorb the angle and read more clearly italic.
		if (cp === 0x61 || cp === 0x65 || cp === 0x67 || cp === 0x6f) return 11;
		// Lowercase angular-stem letters get slightly LESS — the existing
		// vertical stems already carry the slant signal; over-slanting
		// makes them feel like they're falling over.
		if (cp === 0x6e || cp === 0x6d || cp === 0x72 || cp === 0x75) return 9;
		// Default for the remaining lowercase: the classic 10°.
		return 10;
	};
	const slantContours = (contours: BezierContour[], deg: number): BezierContour[] => {
		if (deg === 0) return contours;
		const shear = Math.tan((deg * Math.PI) / 180);
		return contours.map((c) => ({
			...c,
			commands: c.commands.map((cmd) => {
				if (cmd.type === 'Z') return cmd;
				if (cmd.type === 'M' || cmd.type === 'L') {
					return { ...cmd, x: Math.round(cmd.x + cmd.y * shear) };
				}
				if (cmd.type === 'Q') {
					return {
						...cmd,
						x: Math.round(cmd.x + cmd.y * shear),
						x1: Math.round(cmd.x1 + cmd.y1 * shear)
					};
				}
				// C
				return {
					...cmd,
					x: Math.round(cmd.x + cmd.y * shear),
					x1: Math.round(cmd.x1 + cmd.y1 * shear),
					x2: Math.round(cmd.x2 + cmd.y2 * shear)
				};
			})
		}));
	};
	const italicGlyphs: Record<number, import('./types').Glyph> = {};
	for (const [cpStr, g] of Object.entries(project.glyphs)) {
		const cp = Number(cpStr);
		if (g.contours.length === 0) {
			// Empty / composite glyphs keep the original shape (composites
			// inherit via reference at render time anyway).
			italicGlyphs[cp] = { ...g, updatedAt: new Date().toISOString() };
			continue;
		}
		const deg = slantDegFor(cp);
		const shear = deg === 0 ? 0 : Math.tan((deg * Math.PI) / 180);
		italicGlyphs[cp] = {
			...g,
			contours: slantContours(g.contours, deg),
			anchors: g.anchors?.map((a) => ({
				...a,
				x: Math.round(a.x + a.y * shear)
			})),
			updatedAt: new Date().toISOString()
		};
	}
	project.masters = [
		{
			id: crypto.randomUUID(),
			name: 'Italic',
			location: { slnt: -10 },
			glyphs: italicGlyphs,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		}
	];
	// Named instances mapping to the axis space — Regular + Italic.
	project.instances = [
		{
			id: crypto.randomUUID(),
			styleName: 'Regular',
			location: { slnt: 0 }
		},
		{
			id: crypto.randomUUID(),
			styleName: 'Italic',
			location: { slnt: -10 }
		}
	];

	// A starter changelog entry so the Release tab shows something on first open.
	project.changelog = [
		{
			id: crypto.randomUUID(),
			version: '0.1.0-demo',
			date: new Date().toISOString(),
			notes:
				'Initial example project shipped with Patens. Eight drawn glyphs across uppercase + lowercase, kerning pairs, sidebearing classes, and a stylistic-alternate set.'
		}
	];

	// One pinned project-level snapshot so the Release tab's Project
	// Snapshots panel isn't empty on first open. Serialises the current
	// (just-built) project minus its own snapshots array to avoid
	// recursive bloat — same pattern projectStore.saveProjectSnapshot uses.
	const { snapshots: _ignored, ...snapshotData } = project;
	project.snapshots = [
		{
			id: crypto.randomUUID(),
			takenAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
			label: 'v0.1 baseline — pre-iteration',
			pinned: true,
			data: JSON.stringify(snapshotData)
		}
	];

	return project;
};
