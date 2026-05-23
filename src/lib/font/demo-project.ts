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
	{ codepoint: 0x6f, contours: buildO_lc(), advanceWidth: LC_W, leftSidebearing: 80, rightSidebearing: 80, status: 'draft' },
	{ codepoint: 0x6e, contours: buildN_lc(), advanceWidth: LC_W, leftSidebearing: 80, rightSidebearing: 80, status: 'sketch' },
	{ codepoint: 0x61, contours: buildA_lc(), advanceWidth: LC_W, leftSidebearing: 80, rightSidebearing: 80, status: 'sketch' }
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
			members: [0x48, 0x49, 0x4c, 0x4d, 0x4e, 0x52, 0x54, 0x50, 0x46] // H I L M N R T P F
		},
		{
			id: crypto.randomUUID(),
			name: 'Lowercase stems',
			members: [0x6e, 0x61] // n a
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
	for (const cp of [0x41, 0x4d, 0x52, 0x4c, 0x56, 0x50, 0x46, 0x53]) {
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
