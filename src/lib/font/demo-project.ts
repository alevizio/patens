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

// L — vertical stem + bottom bar.
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

// V — two angled stems meeting at the bottom.
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

// A — two angled stems meeting at the top + crossbar.
const buildA = (): BezierContour[] => [
	poly([
		[CAP_W / 2 - STEM / 2, CAP_HEIGHT],
		[CAP_W / 2 + STEM / 2, CAP_HEIGHT],
		[CAP_W - 60, 0],
		[CAP_W - 60 - STEM, 0]
	]),
	poly([
		[CAP_W / 2 - STEM / 2, CAP_HEIGHT],
		[CAP_W / 2 + STEM / 2, CAP_HEIGHT],
		[60 + STEM, 0],
		[60, 0]
	]),
	// Crossbar at 40% height
	poly([
		[140, CAP_HEIGHT * 0.4 - BAR / 2],
		[CAP_W - 140, CAP_HEIGHT * 0.4 - BAR / 2],
		[CAP_W - 140, CAP_HEIGHT * 0.4 + BAR / 2],
		[140, CAP_HEIGHT * 0.4 + BAR / 2]
	])
];

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

// R — vertical stem + half-ring at top + diagonal leg.
const buildR = (): BezierContour[] => [
	poly([
		[80, 0],
		[80 + STEM, 0],
		[80 + STEM, CAP_HEIGHT],
		[80, CAP_HEIGHT]
	]),
	// Bowl top bar
	poly([
		[80, CAP_HEIGHT],
		[CAP_W - 100, CAP_HEIGHT],
		[CAP_W - 100, CAP_HEIGHT - BAR],
		[80, CAP_HEIGHT - BAR]
	]),
	// Bowl right stem
	poly([
		[CAP_W - 100 - STEM, CAP_HEIGHT - BAR],
		[CAP_W - 100, CAP_HEIGHT - BAR],
		[CAP_W - 100, CAP_HEIGHT * 0.55 + BAR],
		[CAP_W - 100 - STEM, CAP_HEIGHT * 0.55 + BAR]
	]),
	// Bowl bottom bar
	poly([
		[80, CAP_HEIGHT * 0.55],
		[CAP_W - 100, CAP_HEIGHT * 0.55],
		[CAP_W - 100, CAP_HEIGHT * 0.55 + BAR],
		[80, CAP_HEIGHT * 0.55 + BAR]
	]),
	// Diagonal leg from junction to bottom-right
	poly([
		[80 + STEM, CAP_HEIGHT * 0.55],
		[80 + STEM + 40, CAP_HEIGHT * 0.55],
		[CAP_W - 60, 0],
		[CAP_W - 60 - 80, 0]
	])
];

// P — vertical stem + bowl (top bar / right stem / bottom bar of bowl).
const buildP = (): BezierContour[] => [
	poly([
		[80, 0],
		[80 + STEM, 0],
		[80 + STEM, CAP_HEIGHT],
		[80, CAP_HEIGHT]
	]),
	// Bowl top
	poly([
		[80, CAP_HEIGHT],
		[CAP_W - 80, CAP_HEIGHT],
		[CAP_W - 80, CAP_HEIGHT - BAR],
		[80, CAP_HEIGHT - BAR]
	]),
	// Bowl right stem
	poly([
		[CAP_W - 80 - STEM, CAP_HEIGHT - BAR],
		[CAP_W - 80, CAP_HEIGHT - BAR],
		[CAP_W - 80, CAP_HEIGHT * 0.55 + BAR],
		[CAP_W - 80 - STEM, CAP_HEIGHT * 0.55 + BAR]
	]),
	// Bowl bottom
	poly([
		[80, CAP_HEIGHT * 0.55],
		[CAP_W - 80, CAP_HEIGHT * 0.55],
		[CAP_W - 80, CAP_HEIGHT * 0.55 + BAR],
		[80, CAP_HEIGHT * 0.55 + BAR]
	])
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
	const w = CAP_W;
	const mid = CAP_HEIGHT / 2;
	return [
		// Top bar
		poly([
			[80, CAP_HEIGHT - BAR],
			[w - 80, CAP_HEIGHT - BAR],
			[w - 80, CAP_HEIGHT],
			[80, CAP_HEIGHT]
		]),
		// Top-left stem (above middle)
		poly([
			[80, mid + BAR / 2],
			[80 + STEM, mid + BAR / 2],
			[80 + STEM, CAP_HEIGHT - BAR],
			[80, CAP_HEIGHT - BAR]
		]),
		// Middle bar
		poly([
			[80, mid - BAR / 2],
			[w - 80, mid - BAR / 2],
			[w - 80, mid + BAR / 2],
			[80, mid + BAR / 2]
		]),
		// Bottom-right stem (below middle)
		poly([
			[w - 80 - STEM, BAR],
			[w - 80, BAR],
			[w - 80, mid - BAR / 2],
			[w - 80 - STEM, mid - BAR / 2]
		]),
		// Bottom bar
		poly([
			[80, 0],
			[w - 80, 0],
			[w - 80, BAR],
			[80, BAR]
		])
	];
};

// Geometric digits — tabular-width, cap-height tall. Stem width matches
// the letters. Each digit is a small composition of rects + (where
// needed) the ring helper from buildO.
const DIGIT_W = Math.round(CAP_W * 0.65);
const digitRing = (cx: number, cy: number, rx: number, ry: number, ccw = false): Array<[number, number]> => {
	const sides = 16;
	const pts: Array<[number, number]> = [];
	for (let i = 0; i < sides; i++) {
		const angle = (i / sides) * Math.PI * 2 * (ccw ? -1 : 1);
		pts.push([cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry]);
	}
	return pts;
};
const build0 = (): BezierContour[] => {
	const cx = DIGIT_W / 2;
	const cy = CAP_HEIGHT / 2;
	const rx = DIGIT_W / 2 - 60;
	const ry = CAP_HEIGHT / 2;
	const t = STEM - 10;
	return [
		poly(digitRing(cx, cy, rx, ry), 'cw'),
		poly(digitRing(cx, cy, rx - t, ry - t, true), 'ccw')
	];
};
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
		poly(digitRing(w / 2, (CAP_HEIGHT + mid + BAR / 2) / 2, w / 2 - 60, (CAP_HEIGHT - mid - BAR / 2) / 2), 'cw'),
		poly(digitRing(w / 2, (CAP_HEIGHT + mid + BAR / 2) / 2, w / 2 - 60 - (STEM - 10), (CAP_HEIGHT - mid - BAR / 2) / 2 - (STEM - 10), true), 'ccw'),
		// Bottom bowl outer
		poly(digitRing(w / 2, (mid - BAR / 2) / 2, w / 2 - 60, (mid - BAR / 2) / 2), 'cw'),
		poly(digitRing(w / 2, (mid - BAR / 2) / 2, w / 2 - 60 - (STEM - 10), (mid - BAR / 2) / 2 - (STEM - 10), true), 'ccw')
	];
};
// B — vertical stem + two stacked half-rings (top + bottom bowls).
const buildB = (): BezierContour[] => {
	const mid = CAP_HEIGHT / 2;
	return [
		// Stem
		poly([
			[80, 0],
			[80 + STEM, 0],
			[80 + STEM, CAP_HEIGHT],
			[80, CAP_HEIGHT]
		]),
		// Top bowl: top bar
		poly([[80, CAP_HEIGHT - BAR], [CAP_W - 80, CAP_HEIGHT - BAR], [CAP_W - 80, CAP_HEIGHT], [80, CAP_HEIGHT]]),
		// Top bowl: right stem
		poly([[CAP_W - 80 - STEM, mid + BAR / 2], [CAP_W - 80, mid + BAR / 2], [CAP_W - 80, CAP_HEIGHT - BAR], [CAP_W - 80 - STEM, CAP_HEIGHT - BAR]]),
		// Middle bar
		poly([[80, mid - BAR / 2], [CAP_W - 80, mid - BAR / 2], [CAP_W - 80, mid + BAR / 2], [80, mid + BAR / 2]]),
		// Bottom bowl: right stem
		poly([[CAP_W - 80 - STEM, BAR], [CAP_W - 80, BAR], [CAP_W - 80, mid - BAR / 2], [CAP_W - 80 - STEM, mid - BAR / 2]]),
		// Bottom bar
		poly([[80, 0], [CAP_W - 80, 0], [CAP_W - 80, BAR], [80, BAR]])
	];
};

// C — left stem + top bar + bottom bar (open on the right).
const buildC = (): BezierContour[] => [
	poly([[80, 0], [80 + STEM, 0], [80 + STEM, CAP_HEIGHT], [80, CAP_HEIGHT]]),
	poly([[80, CAP_HEIGHT - BAR], [CAP_W - 80, CAP_HEIGHT - BAR], [CAP_W - 80, CAP_HEIGHT], [80, CAP_HEIGHT]]),
	poly([[80, 0], [CAP_W - 80, 0], [CAP_W - 80, BAR], [80, BAR]])
];

// D — vertical stem + top/bottom bars + right stem (rect-style).
const buildD = (): BezierContour[] => [
	poly([[80, 0], [80 + STEM, 0], [80 + STEM, CAP_HEIGHT], [80, CAP_HEIGHT]]),
	poly([[80, CAP_HEIGHT - BAR], [CAP_W - 80, CAP_HEIGHT - BAR], [CAP_W - 80, CAP_HEIGHT], [80, CAP_HEIGHT]]),
	poly([[CAP_W - 80 - STEM, BAR], [CAP_W - 80, BAR], [CAP_W - 80, CAP_HEIGHT - BAR], [CAP_W - 80 - STEM, CAP_HEIGHT - BAR]]),
	poly([[80, 0], [CAP_W - 80, 0], [CAP_W - 80, BAR], [80, BAR]])
];

// G — C with a small horizontal extension at mid-right + a vertical stub.
const buildG = (): BezierContour[] => {
	const mid = CAP_HEIGHT / 2;
	return [
		poly([[80, 0], [80 + STEM, 0], [80 + STEM, CAP_HEIGHT], [80, CAP_HEIGHT]]),
		poly([[80, CAP_HEIGHT - BAR], [CAP_W - 80, CAP_HEIGHT - BAR], [CAP_W - 80, CAP_HEIGHT], [80, CAP_HEIGHT]]),
		poly([[80, 0], [CAP_W - 80, 0], [CAP_W - 80, BAR], [80, BAR]]),
		// Right vertical (lower half only)
		poly([[CAP_W - 80 - STEM, BAR], [CAP_W - 80, BAR], [CAP_W - 80, mid], [CAP_W - 80 - STEM, mid]]),
		// Mid-right horizontal serif
		poly([[CAP_W / 2, mid - BAR / 2], [CAP_W - 80, mid - BAR / 2], [CAP_W - 80, mid + BAR / 2], [CAP_W / 2, mid + BAR / 2]])
	];
};

// U — two vertical stems + bottom bar.
const buildU = (): BezierContour[] => [
	poly([[80, BAR], [80 + STEM, BAR], [80 + STEM, CAP_HEIGHT], [80, CAP_HEIGHT]]),
	poly([[CAP_W - 80 - STEM, BAR], [CAP_W - 80, BAR], [CAP_W - 80, CAP_HEIGHT], [CAP_W - 80 - STEM, CAP_HEIGHT]]),
	poly([[80, 0], [CAP_W - 80, 0], [CAP_W - 80, BAR], [80, BAR]])
];

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
		// Lower diagonal arm
		poly([
			[80 + STEM, mid - BAR / 2],
			[80 + STEM + 30, mid],
			[CAP_W - 80 - 80, 0],
			[CAP_W - 80, 0]
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
const buildQ = (): BezierContour[] => {
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
	return [
		poly(ring(rx, ry), 'cw'),
		poly(ring(rx - t, ry - t, true), 'ccw'),
		// Tail extending from bottom-right to below baseline
		poly([
			[CAP_W / 2 + 40, BAR * 1.5],
			[CAP_W / 2 + 40 + STEM, BAR * 1.5],
			[CAP_W - 60, -100],
			[CAP_W - 60 - STEM, -100]
		])
	];
};

// W — two V shapes side by side.
const buildW = (): BezierContour[] => {
	const w = CAP_W + 120;
	return [
		// Left V — outer left stem
		poly([[60, CAP_HEIGHT], [60 + STEM, CAP_HEIGHT], [w * 0.35 + STEM / 2, 0], [w * 0.35 - STEM / 2, 0]]),
		// Left V — inner stem (meets center bottom)
		poly([[w * 0.4 - STEM, CAP_HEIGHT], [w * 0.4, CAP_HEIGHT], [w * 0.35 + STEM / 2, 0], [w * 0.35 - STEM / 2, 0]]),
		// Right V — inner stem
		poly([[w * 0.6, CAP_HEIGHT], [w * 0.6 + STEM, CAP_HEIGHT], [w * 0.65 + STEM / 2, 0], [w * 0.65 - STEM / 2, 0]]),
		// Right V — outer right stem
		poly([[w - 60 - STEM, CAP_HEIGHT], [w - 60, CAP_HEIGHT], [w * 0.65 + STEM / 2, 0], [w * 0.65 - STEM / 2, 0]])
	];
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
const buildB_lc = (): BezierContour[] => {
	const cx = LC_W / 2 + 30;
	const cy = X_HEIGHT / 2;
	const rx = LC_W / 2 - 100;
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
	return [
		poly(ring(rx, ry), 'cw'),
		poly(ring(rx - t, ry - t, true), 'ccw'),
		// Left stem with full ascender
		poly([
			[80, 0],
			[80 + STEM, 0],
			[80 + STEM, Math.round(X_HEIGHT * 1.5)],
			[80, Math.round(X_HEIGHT * 1.5)]
		])
	];
};

// lowercase f — vertical stem with short ascender + crossbar at x-height.
const buildF_lc = (): BezierContour[] => {
	const cx = LC_W / 2 - 60;
	return [
		poly([
			[cx - STEM / 2, 0],
			[cx + STEM / 2, 0],
			[cx + STEM / 2, Math.round(X_HEIGHT * 1.5)],
			[cx - STEM / 2, Math.round(X_HEIGHT * 1.5)]
		]),
		// Top flag/hook
		poly([
			[cx - STEM / 2, Math.round(X_HEIGHT * 1.45)],
			[cx - STEM / 2 + 200, Math.round(X_HEIGHT * 1.45)],
			[cx - STEM / 2 + 200, Math.round(X_HEIGHT * 1.5)],
			[cx - STEM / 2, Math.round(X_HEIGHT * 1.5)]
		]),
		// Crossbar
		poly([
			[80, X_HEIGHT - BAR],
			[LC_W - 80, X_HEIGHT - BAR],
			[LC_W - 80, X_HEIGHT],
			[80, X_HEIGHT]
		])
	];
};

// lowercase g — bowl + right stem with descender + bottom hook.
const buildG_lc = (): BezierContour[] => {
	const cx = LC_W / 2 - 30;
	const cy = X_HEIGHT / 2;
	const rx = LC_W / 2 - 100;
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
	return [
		poly(ring(rx, ry), 'cw'),
		poly(ring(rx - t, ry - t, true), 'ccw'),
		// Right stem extending into descender
		poly([
			[LC_W - 80 - STEM, -200],
			[LC_W - 80, -200],
			[LC_W - 80, X_HEIGHT],
			[LC_W - 80 - STEM, X_HEIGHT]
		]),
		// Bottom hook closing the descender
		poly([
			[80, -200],
			[LC_W - 80, -200],
			[LC_W - 80, -200 + BAR],
			[80, -200 + BAR]
		])
	];
};

// lowercase y — V shape with descender tail.
const buildY_lc = (): BezierContour[] => {
	const mid = X_HEIGHT * 0.5;
	return [
		// Left angled stem (top of x-height to mid)
		poly([
			[60, X_HEIGHT],
			[60 + STEM, X_HEIGHT],
			[LC_W / 2 + STEM / 2, mid],
			[LC_W / 2 - STEM / 2, mid]
		]),
		// Right angled stem (top of x-height to mid)
		poly([
			[LC_W - 60 - STEM, X_HEIGHT],
			[LC_W - 60, X_HEIGHT],
			[LC_W / 2 + STEM / 2, mid],
			[LC_W / 2 - STEM / 2, mid]
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
		[60, X_HEIGHT],
		[60 + STEM, X_HEIGHT],
		[LC_W / 2 + STEM / 2, 0],
		[LC_W / 2 - STEM / 2, 0]
	]),
	poly([
		[LC_W - 60 - STEM, X_HEIGHT],
		[LC_W - 60, X_HEIGHT],
		[LC_W / 2 + STEM / 2, 0],
		[LC_W / 2 - STEM / 2, 0]
	])
];

// lowercase w — double-V at x-height.
const buildW_lc = (): BezierContour[] => {
	const w = LC_W + 80;
	return [
		poly([[40, X_HEIGHT], [40 + STEM, X_HEIGHT], [w * 0.35 + STEM / 2, 0], [w * 0.35 - STEM / 2, 0]]),
		poly([[w * 0.4 - STEM, X_HEIGHT], [w * 0.4, X_HEIGHT], [w * 0.35 + STEM / 2, 0], [w * 0.35 - STEM / 2, 0]]),
		poly([[w * 0.6, X_HEIGHT], [w * 0.6 + STEM, X_HEIGHT], [w * 0.65 + STEM / 2, 0], [w * 0.65 - STEM / 2, 0]]),
		poly([[w - 40 - STEM, X_HEIGHT], [w - 40, X_HEIGHT], [w * 0.65 + STEM / 2, 0], [w * 0.65 - STEM / 2, 0]])
	];
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
			[80 + STEM + 30, mid],
			[LC_W - 80 - 80, 0],
			[LC_W - 80, 0]
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
const buildQ_lc = (): BezierContour[] => {
	const cx = LC_W / 2 - 30;
	const cy = X_HEIGHT / 2;
	const rx = LC_W / 2 - 100;
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
	return [
		poly(ring(rx, ry), 'cw'),
		poly(ring(rx - t, ry - t, true), 'ccw'),
		// Right stem extending below baseline (no bottom hook — descender only)
		poly([
			[LC_W - 80 - STEM, -200],
			[LC_W - 80, -200],
			[LC_W - 80, X_HEIGHT],
			[LC_W - 80 - STEM, X_HEIGHT]
		])
	];
};

// lowercase z — same as cap Z at x-height.
const buildZ_lc = (): BezierContour[] => [
	poly([[40, X_HEIGHT - BAR], [LC_W - 40, X_HEIGHT - BAR], [LC_W - 40, X_HEIGHT], [40, X_HEIGHT]]),
	poly([
		[40, BAR],
		[40 + STEM, 0],
		[LC_W - 40, X_HEIGHT - BAR],
		[LC_W - 40 - STEM, X_HEIGHT - 2 * BAR]
	]),
	poly([[40, 0], [LC_W - 40, 0], [LC_W - 40, BAR], [40, BAR]])
];

// lowercase x — two diagonals at x-height.
const buildX_lc = (): BezierContour[] => [
	poly([
		[40, X_HEIGHT],
		[40 + STEM, X_HEIGHT],
		[LC_W - 40, 0],
		[LC_W - 40 - STEM, 0]
	]),
	poly([
		[LC_W - 40 - STEM, X_HEIGHT],
		[LC_W - 40, X_HEIGHT],
		[40 + STEM, 0],
		[40, 0]
	])
];

// lowercase l — vertical stem with full ascender height.
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

// lowercase u — two stems + bottom bar (mirror of n).
const buildU_lc = (): BezierContour[] => [
	poly([[80, BAR], [80 + STEM, BAR], [80 + STEM, X_HEIGHT], [80, X_HEIGHT]]),
	poly([[LC_W - 80 - STEM, BAR], [LC_W - 80, BAR], [LC_W - 80, X_HEIGHT], [LC_W - 80 - STEM, X_HEIGHT]]),
	poly([[80, 0], [LC_W - 80, 0], [LC_W - 80, BAR], [80, BAR]])
];

// lowercase c — left stem + top bar + bottom bar (open on the right).
const buildC_lc = (): BezierContour[] => [
	poly([[80, 0], [80 + STEM, 0], [80 + STEM, X_HEIGHT], [80, X_HEIGHT]]),
	poly([[80, X_HEIGHT - BAR], [LC_W - 80, X_HEIGHT - BAR], [LC_W - 80, X_HEIGHT], [80, X_HEIGHT]]),
	poly([[80, 0], [LC_W - 80, 0], [LC_W - 80, BAR], [80, BAR]])
];

// lowercase d — bowl + right stem with full ascender (mirror of b).
const buildD_lc = (): BezierContour[] => {
	const cx = LC_W / 2 - 30;
	const cy = X_HEIGHT / 2;
	const rx = LC_W / 2 - 100;
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
	return [
		poly(ring(rx, ry), 'cw'),
		poly(ring(rx - t, ry - t, true), 'ccw'),
		// Right stem with full ascender
		poly([
			[LC_W - 80 - STEM, 0],
			[LC_W - 80, 0],
			[LC_W - 80, Math.round(X_HEIGHT * 1.5)],
			[LC_W - 80 - STEM, Math.round(X_HEIGHT * 1.5)]
		])
	];
};

// lowercase m — three stems + two arches (n doubled).
const buildM_lc = (): BezierContour[] => {
	const w = LC_W + 80;
	const third = (w - 160) / 2;
	return [
		// Left stem
		poly([[80, 0], [80 + STEM, 0], [80 + STEM, X_HEIGHT - STEM], [80, X_HEIGHT - STEM]]),
		// Left arch
		poly([[80, X_HEIGHT - STEM], [80 + third, X_HEIGHT - STEM], [80 + third, X_HEIGHT], [80, X_HEIGHT]]),
		// Middle stem
		poly([[80 + third - STEM, 0], [80 + third, 0], [80 + third, X_HEIGHT - STEM], [80 + third - STEM, X_HEIGHT - STEM]]),
		// Right arch
		poly([[80 + third, X_HEIGHT - STEM], [w - 80, X_HEIGHT - STEM], [w - 80, X_HEIGHT], [80 + third, X_HEIGHT]]),
		// Right stem
		poly([[w - 80 - STEM, 0], [w - 80, 0], [w - 80, X_HEIGHT - STEM], [w - 80 - STEM, X_HEIGHT - STEM]])
	];
};

// lowercase p — bowl + left stem with descender (mirror of d/b).
const buildP_lc = (): BezierContour[] => {
	const cx = LC_W / 2 + 30;
	const cy = X_HEIGHT / 2;
	const rx = LC_W / 2 - 100;
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
	return [
		poly(ring(rx, ry), 'cw'),
		poly(ring(rx - t, ry - t, true), 'ccw'),
		// Left stem with descender (extends below baseline)
		poly([
			[80, -200],
			[80 + STEM, -200],
			[80 + STEM, X_HEIGHT],
			[80, X_HEIGHT]
		])
	];
};

// Lowercase letters — the high-frequency set so the Bringhurst sample
// paragraph renders. Each one fits the x-height envelope (h, t use a
// short ascender; r/s/i/e stay within x-height).

// lowercase e — bowl shape with horizontal middle bar (closed counter).
const buildE_lc = (): BezierContour[] => {
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
	return [
		poly(ring(rx, ry), 'cw'),
		poly(ring(rx - t, ry - t, true), 'ccw'),
		// Crossbar opens the lower-right counter (e shape)
		poly([
			[cx, cy - BAR / 2],
			[cx + rx - 10, cy - BAR / 2],
			[cx + rx - 10, cy + BAR / 2],
			[cx, cy + BAR / 2]
		])
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
		poly([
			[cx - STEM / 2, 0],
			[cx + STEM / 2, 0],
			[cx + STEM / 2, stemTop],
			[cx - STEM / 2, stemTop]
		]),
		// Crossbar at x-height
		poly([
			[80, X_HEIGHT - BAR],
			[LC_W - 80, X_HEIGHT - BAR],
			[LC_W - 80, X_HEIGHT],
			[80, X_HEIGHT]
		])
	];
};

// lowercase h — vertical stem with short ascender + arch from stem to right
const buildH_lc = (): BezierContour[] => [
	// Left stem (full ascender height)
	poly([
		[80, 0],
		[80 + STEM, 0],
		[80 + STEM, Math.round(X_HEIGHT * 1.5)],
		[80, Math.round(X_HEIGHT * 1.5)]
	]),
	// Right stem (x-height tall)
	poly([
		[LC_W - 80 - STEM, 0],
		[LC_W - 80, 0],
		[LC_W - 80, X_HEIGHT - STEM],
		[LC_W - 80 - STEM, X_HEIGHT - STEM]
	]),
	// Arch from left stem to right stem
	poly([
		[80, X_HEIGHT - STEM],
		[LC_W - 80, X_HEIGHT - STEM],
		[LC_W - 80, X_HEIGHT],
		[80, X_HEIGHT]
	])
];

// lowercase r — vertical stem + small shoulder to upper-right
const buildR_lc = (): BezierContour[] => [
	// Stem
	poly([
		[80, 0],
		[80 + STEM, 0],
		[80 + STEM, X_HEIGHT],
		[80, X_HEIGHT]
	]),
	// Shoulder (small horizontal at top extending right)
	poly([
		[80, X_HEIGHT - STEM],
		[LC_W - 100, X_HEIGHT - STEM],
		[LC_W - 100, X_HEIGHT],
		[80, X_HEIGHT]
	])
];

// lowercase s — same construction as cap S but at x-height + reduced widths
const buildS_lc = (): BezierContour[] => {
	const w = LC_W;
	const mid = X_HEIGHT / 2;
	const lt = STEM - 10;
	return [
		// Top bar
		poly([
			[60, X_HEIGHT - BAR],
			[w - 60, X_HEIGHT - BAR],
			[w - 60, X_HEIGHT],
			[60, X_HEIGHT]
		]),
		// Top-left stem
		poly([
			[60, mid + BAR / 2],
			[60 + lt, mid + BAR / 2],
			[60 + lt, X_HEIGHT - BAR],
			[60, X_HEIGHT - BAR]
		]),
		// Middle bar
		poly([
			[60, mid - BAR / 2],
			[w - 60, mid - BAR / 2],
			[w - 60, mid + BAR / 2],
			[60, mid + BAR / 2]
		]),
		// Bottom-right stem
		poly([
			[w - 60 - lt, BAR],
			[w - 60, BAR],
			[w - 60, mid - BAR / 2],
			[w - 60 - lt, mid - BAR / 2]
		]),
		// Bottom bar
		poly([[60, 0], [w - 60, 0], [w - 60, BAR], [60, BAR]])
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
	const sides = 16;
	const ring = (radX: number, radY: number, ccw = false): Array<[number, number]> => {
		const pts: Array<[number, number]> = [];
		for (let i = 0; i < sides; i++) {
			const angle = (i / sides) * Math.PI * 2 * (ccw ? -1 : 1);
			pts.push([cx + Math.cos(angle) * radX, cy + Math.sin(angle) * radY]);
		}
		return pts;
	};
	return [
		// Bowl — circular outer + circular counter.
		poly(ring(rx, ry), 'cw'),
		poly(ring(rx - t, ry - t, true), 'ccw'),
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
	// Stem on right
	poly([
		[LC_W - 80 - STEM, 0],
		[LC_W - 80, 0],
		[LC_W - 80, X_HEIGHT],
		[LC_W - 80 - STEM, X_HEIGHT]
	]),
	// Bowl top bar
	poly([
		[80, X_HEIGHT - STEM],
		[LC_W - 80 - STEM, X_HEIGHT - STEM],
		[LC_W - 80 - STEM, X_HEIGHT],
		[80, X_HEIGHT]
	]),
	// Bowl left stem
	poly([
		[80, 0],
		[80 + STEM, 0],
		[80 + STEM, X_HEIGHT],
		[80, X_HEIGHT]
	]),
	// Bowl bottom bar
	poly([
		[80, 0],
		[LC_W - 80 - STEM, 0],
		[LC_W - 80 - STEM, STEM],
		[80, STEM]
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
	{ codepoint: 0x7a, contours: buildZ_lc(), advanceWidth: LC_W, leftSidebearing: 40, rightSidebearing: 40, status: 'draft' } // z
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
			'Where Inter and Manrope optimise for variable spans, this typeface optimises for the static body case: even rhythm, slightly tighter aperture on `c` and `e` so they hold their shape at 12px, and stylistic alternates (ss01) for designers who want a single-storey `a`.',
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
			}
		]
	};

	// Two decisions captured in the design journal so the Brief tab's
	// decision log isn't empty.
	project.decisions = [
		{
			id: crypto.randomUUID(),
			date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
			decision: 'Single-storey `a` as ss01 alternate, not the default',
			rationale:
				'Tested both in body copy. The two-storey `a` reads more solidly at 12-14px where most UI text lives. Single-storey reserved for designers who want the geometric look — opt in via the ss01 OpenType feature.'
		},
		{
			id: crypto.randomUUID(),
			date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
			decision: 'Stem width fixed at 90fu across uppercase + lowercase',
			rationale:
				'Tried 100fu for caps and 85fu for lowercase to match optical density. The contrast was too visible in mixed-case settings. 90fu reads as consistent across body text without looking mechanical.'
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
		// Lowercase pairs.
		{ left: 0x6e, right: 0x6f, value: -10 }, // no
		{ left: 0x6f, right: 0x6e, value: -10 }, // on
		{ left: 0x61, right: 0x6e, value: -10 }, // an
		{ left: 0x61, right: 0x6f, value: -10 }, // ao
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

	// A starter changelog entry so the Release tab shows something on first open.
	project.changelog = [
		{
			id: crypto.randomUUID(),
			version: '0.1.0-demo',
			date: new Date().toISOString(),
			notes:
				'Initial example project shipped with Font Studio. Eight drawn glyphs across uppercase + lowercase, kerning pairs, sidebearing classes, and a stylistic-alternate set.'
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
