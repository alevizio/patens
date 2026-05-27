#!/usr/bin/env node
/**
 * Generate two installable demo fonts to demonstrate what Font Studio can ship.
 *
 *   - Studio Geometric — a clean monolinear geometric sans (the "default
 *     control set" outcome you'd get drawing H, O, n, o, etc. in the app).
 *   - Studio Slab — same skeleton, plus square serifs, to show how the
 *     project can fork variants from a single drawing pass.
 *
 * Both are written as `.otf` files into `static/demo-fonts/` and become
 * directly downloadable from the deployed site at `/demo-fonts/<name>.otf`.
 *
 * Construction notes:
 *   • Round glyphs (O, o) use 4-segment cubic-Bézier ellipses (kappa
 *     approximation) for a real circular shape, not the octagon approx
 *     that the first cut shipped with.
 *   • Lowercase n is a single contour traced around the outline: full-
 *     height left stem with a square top, a quarter-Bézier shoulder
 *     curving down to a SHORTER right arm, and a quarter-Bézier inner
 *     undercurve forming the negative space. Renders as a real n —
 *     the previous version's two equal-height stems made it look like
 *     a "Π" (pi).
 *   • Stem-overlap contours (the diagonal of capital N) are wound the
 *     same direction as the stems they cross, so non-zero winding fills
 *     correctly at the join instead of carving accidental holes.
 */

import opentype from 'opentype.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'static', 'demo-fonts');
mkdirSync(outDir, { recursive: true });

const UPM = 1000;
const ASCENDER = 800;
const DESCENDER = -200;
const CAP_HEIGHT = 700;
const X_HEIGHT = 500;

// Cubic Bézier approximation of a quarter-circle. Standard kappa ≈ 0.5523.
const KAPPA = 0.5522847498307936;

/** Build a path that closes a polygon (list of [x, y] vertices, Y-up). */
const polyPath = (verts) => {
	const p = new opentype.Path();
	verts.forEach(([x, y], i) => (i === 0 ? p.moveTo(x, y) : p.lineTo(x, y)));
	p.close();
	return p;
};

/** Compose multiple sub-paths into one. */
const mergePaths = (...paths) => {
	const merged = new opentype.Path();
	for (const p of paths) merged.commands.push(...p.commands);
	return merged;
};

/**
 * A full ellipse as 4 cubic-Bézier quarters, centered at (cx, cy) with
 * radii (rx, ry). `direction` controls winding:
 *   - 'ccw' (the default) for filled outer contours
 *   - 'cw'  for holes that should subtract under non-zero winding rule
 *
 * Used for the O / o counters (CCW outer + CW inner) and for any other
 * round shape that needs to render cleanly without an octagonal feel.
 */
const ellipsePath = (cx, cy, rx, ry, direction = 'ccw') => {
	const p = new opentype.Path();
	const k = KAPPA;
	if (direction === 'ccw') {
		// Right → top → left → bottom → right, going CCW around center.
		p.moveTo(cx + rx, cy);
		p.curveTo(cx + rx, cy + ry * k, cx + rx * k, cy + ry, cx, cy + ry);
		p.curveTo(cx - rx * k, cy + ry, cx - rx, cy + ry * k, cx - rx, cy);
		p.curveTo(cx - rx, cy - ry * k, cx - rx * k, cy - ry, cx, cy - ry);
		p.curveTo(cx + rx * k, cy - ry, cx + rx, cy - ry * k, cx + rx, cy);
	} else {
		// Right → bottom → left → top → right, going CW (reverse of CCW).
		p.moveTo(cx + rx, cy);
		p.curveTo(cx + rx, cy - ry * k, cx + rx * k, cy - ry, cx, cy - ry);
		p.curveTo(cx - rx * k, cy - ry, cx - rx, cy - ry * k, cx - rx, cy);
		p.curveTo(cx - rx, cy + ry * k, cx - rx * k, cy + ry, cx, cy + ry);
		p.curveTo(cx + rx * k, cy + ry, cx + rx, cy + ry * k, cx + rx, cy);
	}
	p.close();
	return p;
};

const STEM = 90; // vertical stem width
const BAR = 80; // horizontal bar width
const CAP_W = 560; // average uppercase width
const LC_W = 480; // average lowercase width
const SERIF = 24; // slab serif depth (only for Studio Slab)

/** Build a horizontal slab serif at (x, y) of given width — Y-up. */
const slab = (x, y, w) =>
	polyPath([
		[x, y - SERIF],
		[x + w, y - SERIF],
		[x + w, y + SERIF],
		[x, y + SERIF]
	]);

// ----- Glyph constructions (each returns { path, advance, lsb }) -----

const buildH = (slabs) => {
	const left = polyPath([
		[80, 0],
		[80 + STEM, 0],
		[80 + STEM, CAP_HEIGHT],
		[80, CAP_HEIGHT]
	]);
	const right = polyPath([
		[CAP_W - STEM - 80, 0],
		[CAP_W - 80, 0],
		[CAP_W - 80, CAP_HEIGHT],
		[CAP_W - STEM - 80, CAP_HEIGHT]
	]);
	const bar = polyPath([
		[80, CAP_HEIGHT / 2 - BAR / 2],
		[CAP_W - 80, CAP_HEIGHT / 2 - BAR / 2],
		[CAP_W - 80, CAP_HEIGHT / 2 + BAR / 2],
		[80, CAP_HEIGHT / 2 + BAR / 2]
	]);
	const parts = [left, right, bar];
	if (slabs) {
		parts.push(slab(80, 0, STEM), slab(80, CAP_HEIGHT, STEM));
		parts.push(
			slab(CAP_W - STEM - 80, 0, STEM),
			slab(CAP_W - STEM - 80, CAP_HEIGHT, STEM)
		);
	}
	return { path: mergePaths(...parts), advance: CAP_W, lsb: 80 };
};

const buildO = () => {
	const cx = CAP_W / 2;
	const cy = CAP_HEIGHT / 2;
	const rx = CAP_W / 2 - 80;
	const ry = CAP_HEIGHT / 2;
	const outer = ellipsePath(cx, cy, rx, ry, 'ccw');
	const inner = ellipsePath(cx, cy, rx - STEM, ry - STEM, 'cw');
	return { path: mergePaths(outer, inner), advance: CAP_W, lsb: 80 };
};

const buildT = (slabs) => {
	const stem = polyPath([
		[CAP_W / 2 - STEM / 2, 0],
		[CAP_W / 2 + STEM / 2, 0],
		[CAP_W / 2 + STEM / 2, CAP_HEIGHT - BAR],
		[CAP_W / 2 - STEM / 2, CAP_HEIGHT - BAR]
	]);
	const top = polyPath([
		[60, CAP_HEIGHT - BAR],
		[CAP_W - 60, CAP_HEIGHT - BAR],
		[CAP_W - 60, CAP_HEIGHT],
		[60, CAP_HEIGHT]
	]);
	const parts = [stem, top];
	if (slabs) {
		parts.push(slab(CAP_W / 2 - STEM / 2, 0, STEM));
	}
	return { path: mergePaths(...parts), advance: CAP_W, lsb: 60 };
};

const buildI = (slabs) => {
	const stem = polyPath([
		[CAP_W / 2 - STEM / 2, 0],
		[CAP_W / 2 + STEM / 2, 0],
		[CAP_W / 2 + STEM / 2, CAP_HEIGHT],
		[CAP_W / 2 - STEM / 2, CAP_HEIGHT]
	]);
	const parts = [stem];
	if (slabs) {
		parts.push(slab(CAP_W / 2 - STEM / 2 - SERIF, 0, STEM + SERIF * 2));
		parts.push(slab(CAP_W / 2 - STEM / 2 - SERIF, CAP_HEIGHT, STEM + SERIF * 2));
	}
	return { path: mergePaths(...parts), advance: CAP_W * 0.6, lsb: 60 };
};

const buildE = (slabs) => {
	const stem = polyPath([
		[80, 0],
		[80 + STEM, 0],
		[80 + STEM, CAP_HEIGHT],
		[80, CAP_HEIGHT]
	]);
	const top = polyPath([
		[80, CAP_HEIGHT - BAR],
		[CAP_W - 60, CAP_HEIGHT - BAR],
		[CAP_W - 60, CAP_HEIGHT],
		[80, CAP_HEIGHT]
	]);
	const mid = polyPath([
		[80, CAP_HEIGHT / 2 - BAR / 2],
		[CAP_W - 100, CAP_HEIGHT / 2 - BAR / 2],
		[CAP_W - 100, CAP_HEIGHT / 2 + BAR / 2],
		[80, CAP_HEIGHT / 2 + BAR / 2]
	]);
	const bot = polyPath([
		[80, 0],
		[CAP_W - 60, 0],
		[CAP_W - 60, BAR],
		[80, BAR]
	]);
	const parts = [stem, top, mid, bot];
	if (slabs) parts.push(slab(80, 0, STEM), slab(80, CAP_HEIGHT, STEM));
	return { path: mergePaths(...parts), advance: CAP_W, lsb: 80 };
};

const buildN = (slabs) => {
	const left = polyPath([
		[80, 0],
		[80 + STEM, 0],
		[80 + STEM, CAP_HEIGHT],
		[80, CAP_HEIGHT]
	]);
	const right = polyPath([
		[CAP_W - STEM - 80, 0],
		[CAP_W - 80, 0],
		[CAP_W - 80, CAP_HEIGHT],
		[CAP_W - STEM - 80, CAP_HEIGHT]
	]);
	// The diagonal — wound CCW (same direction as the stems) so it
	// FILLS where it overlaps them instead of cancelling under non-zero
	// winding and carving accidental holes at the joins.
	const diag = polyPath([
		[80, CAP_HEIGHT],
		[CAP_W - STEM - 80, 0],
		[CAP_W - 80, 0],
		[80 + STEM, CAP_HEIGHT]
	]);
	const parts = [left, right, diag];
	if (slabs) {
		parts.push(slab(80, 0, STEM), slab(80, CAP_HEIGHT, STEM));
		parts.push(
			slab(CAP_W - STEM - 80, 0, STEM),
			slab(CAP_W - STEM - 80, CAP_HEIGHT, STEM)
		);
	}
	return { path: mergePaths(...parts), advance: CAP_W + 20, lsb: 80 };
};

const buildO_lc = () => {
	const cx = LC_W / 2;
	const cy = X_HEIGHT / 2;
	const rx = LC_W / 2 - 80;
	const ry = X_HEIGHT / 2;
	const thickness = STEM - 10; // slightly lighter than uppercase O
	const outer = ellipsePath(cx, cy, rx, ry, 'ccw');
	const inner = ellipsePath(cx, cy, rx - thickness, ry - thickness, 'cw');
	return { path: mergePaths(outer, inner), advance: LC_W, lsb: 80 };
};

/**
 * Lowercase n as a single CCW contour. Geometry:
 *
 *   • Left stem: full x-height, flat top — flush at the LSB.
 *   • Outer shoulder: quarter-ellipse centered at (lsb+s, h-r) with
 *     radii (w-s, r). Starts at the TOP-RIGHT of the left stem with a
 *     horizontal tangent (smooth continuation of the flat top) and ends
 *     at the outer-top of the right arm with a vertical tangent (smooth
 *     continuation of the right-arm stem).
 *   • Right arm: shorter than the left stem (height = h - r), since the
 *     shoulder occupies the top portion.
 *   • Inner undercurve: HALF-ellipse spanning (lsb+s, h-r) to
 *     (lsb+w-s, h-r), peaking at (lsb+w/2, h-s). Tangents at both
 *     joins are vertical so the negative space has no sharp interior
 *     corners.
 *
 * Both shoulders share the same y of their center (h-r). The whole
 * letter is one closed path because the negative space inside the n
 * opens out at the bottom — fill rule does the rest.
 */
const buildN_lc = (slabs) => {
	const lsb = 80;
	const w = LC_W - 2 * lsb; // visible width (320 with current constants)
	const h = X_HEIGHT;
	const s = STEM;
	// Arch vertical drop. 0.42 × x-height gives a balanced n where the
	// shoulder occupies the upper third-ish and both stems read clearly.
	const r = Math.round(h * 0.42);
	const k = KAPPA;

	// Inner shoulder dimensions — half-ellipse with horizontal radius
	// half the inter-stem gap, vertical radius (r-s) so stroke thickness
	// at the apex stays ≈ s.
	const rxIn = (w - 2 * s) / 2;
	const ryIn = r - s;

	const p = new opentype.Path();

	p.moveTo(lsb, 0);
	p.lineTo(lsb + s, 0); // across bottom of left stem
	p.lineTo(lsb + s, h - r); // up inside of left stem to base of inner arch

	// Inner shoulder Q1: (lsb+s, h-r) → (lsb+w/2, h-s). Left edge to top
	// edge of the inner half-ellipse. Start tangent +y (smooth with the
	// rising stem inside); end tangent +x (smooth with the next quarter).
	p.curveTo(
		lsb + s,
		h - r + ryIn * k,
		lsb + w / 2 - rxIn * k,
		h - s,
		lsb + w / 2,
		h - s
	);
	// Inner shoulder Q2: (lsb+w/2, h-s) → (lsb+w-s, h-r). Top edge to
	// right edge. Start tangent +x; end tangent -y (smooth with the
	// descending right-arm inside).
	p.curveTo(
		lsb + w / 2 + rxIn * k,
		h - s,
		lsb + w - s,
		h - r + ryIn * k,
		lsb + w - s,
		h - r
	);

	p.lineTo(lsb + w - s, 0); // down inside of right arm
	p.lineTo(lsb + w, 0); // across bottom of right arm
	p.lineTo(lsb + w, h - r); // up outside of right arm to shoulder base

	// Outer shoulder: quarter-Bézier centered at (lsb+s, h-r) with radii
	// (w-s, r). From (lsb+w, h-r) [right of center] going CCW around it
	// up to (lsb+s, h) [top of center]. Start tangent +y (smooth with
	// the right-arm outside going up); end tangent -x (smooth with the
	// flat top of the left stem going left).
	p.curveTo(
		lsb + w,
		h - r + r * k,
		lsb + s + (w - s) * k,
		h,
		lsb + s,
		h
	);

	p.lineTo(lsb, h); // across the flat top of the left stem (right → left)
	p.lineTo(lsb, 0); // down outside of left stem
	p.close();

	let result = p;
	if (slabs) {
		result = mergePaths(p, slab(lsb, 0, s), slab(lsb + w - s, 0, s));
	}
	return { path: result, advance: LC_W, lsb };
};

// ----- Expanded character set — Phase A/B/C/D additions -----
//
// These builders extend the demo OTF from the original 9-glyph stub
// (space + H/O/T/I/E/N + o/n) into a real specimen-grade subset:
// full uppercase coverage for "PATENS" + "STUDIO GEOMETRIC", lowercase
// for "Hamburgevons", digits 0-9 for figure proportions, and basic
// punctuation. The geometric aesthetic stays monolinear: 90fu stems,
// 80fu bars, kappa-Bézier round shapes, no optical corrections.

// Reusable: rectangular stem at (x, y, w, h) — Y-up.
const rect = (x, y, w, h) =>
	polyPath([
		[x, y],
		[x + w, y],
		[x + w, y + h],
		[x, y + h]
	]);

// Helper for the round-letter outlines (P, R, D, etc.): a full
// ellipse ring (outer + inner) that gets composed with a vertical
// stem on the left. For the stem to visually replace the ring's left
// half, the ring's outer-left edge must align with the stem's left
// edge AND the ring's inner-left edge must align with the stem's
// right edge — i.e., the stem exactly covers the LEFT WALL of the
// ring. That forces: cx = stemLeft + rx AND wall-thickness = stem-width.
// The bowl extends from x=stemLeft to x=stemLeft+2*rx visually.
//
// Call site supplies `stemLeftX` instead of `cx` so the geometry is
// derivable from one number; this prevents the "ring overshoots the
// stem" bug that the first cut had with cx = stemLeft + STEM/2.
const bowlRing = (stemLeftX, cy, rx, ry, t) => {
	const cx = stemLeftX + rx;
	const outer = ellipsePath(cx, cy, rx, ry, 'ccw');
	const inner = ellipsePath(cx, cy, rx - t, ry - t, 'cw');
	return mergePaths(outer, inner);
};

const buildA = () => {
	// A: two diagonal strokes meeting at a flat apex (cap-width STEM)
	// + horizontal crossbar at 35% cap-height. The diagonals are
	// constant-horizontal-width parallelograms; the apex is naturally
	// flat (STEM wide) where the inner edges of the two strokes meet
	// the outer edges at the top — no separate "apex cap" needed.
	const apexL = CAP_W / 2 - STEM / 2;
	const apexR = CAP_W / 2 + STEM / 2;
	// Wider base so the triangle reads as a proper A silhouette
	// (previously the base was just CAP_W wide, making A look tall
	// and narrow rather than a confident wide triangle).
	const baseL = 30;
	const baseR = CAP_W - 30;
	// Left stroke: parallelogram from (baseL, 0) to (apexL, CAP_H).
	const left = polyPath([
		[baseL, 0],
		[baseL + STEM, 0],
		[apexR, CAP_HEIGHT],
		[apexL, CAP_HEIGHT]
	]);
	// Right stroke: mirror of left.
	const right = polyPath([
		[baseR - STEM, 0],
		[baseR, 0],
		[apexR, CAP_HEIGHT],
		[apexL, CAP_HEIGHT]
	]);
	// Crossbar — compute the inner-edge X at the crossbar Y so it joins
	// the diagonals cleanly (no overshoot, no gap).
	const crossY = CAP_HEIGHT * 0.35;
	const t = crossY / CAP_HEIGHT;
	// Left inner-edge runs from (baseL + STEM, 0) to (apexR, CAP_H).
	const innerL = baseL + STEM + (apexR - baseL - STEM) * t;
	const innerR = baseR - STEM + (apexL - baseR + STEM) * t;
	const bar = rect(innerL, crossY - BAR / 2, innerR - innerL, BAR);
	return { path: mergePaths(left, right, bar), advance: CAP_W, lsb: baseL };
};

const buildP = () => {
	// P: full vertical stem + LARGE upper-half bowl. Bowl extends from
	// cap-top down to ~45% cap-height — was 48%, but the visual "tiny
	// bowl floating on a long stick" feeling came from bowl-height
	// being only 0.52 of cap-height. Going to 0.55+ makes the bowl
	// dominate visually like a real geometric P.
	const stem = rect(80, 0, STEM, CAP_HEIGHT);
	const bowlBottom = CAP_HEIGHT * 0.45;
	const ringRy = (CAP_HEIGHT - bowlBottom) / 2;
	const ringCy = CAP_HEIGHT - ringRy;
	const ringRx = CAP_W * 0.4;
	const ring = bowlRing(80, ringCy, ringRx, ringRy, STEM);
	return { path: mergePaths(stem, ring), advance: 80 + 2 * ringRx + 30, lsb: 80 };
};

const buildR = () => {
	// R: like P (large bowl) + diagonal leg from bowl-base-right to
	// baseline-right corner.
	const stem = rect(80, 0, STEM, CAP_HEIGHT);
	const bowlBottom = CAP_HEIGHT * 0.45;
	const ringRy = (CAP_HEIGHT - bowlBottom) / 2;
	const ringCy = CAP_HEIGHT - ringRy;
	const ringRx = CAP_W * 0.4;
	const ring = bowlRing(80, ringCy, ringRx, ringRy, STEM);
	const bowlRightEdge = 80 + 2 * ringRx;
	const legTopX = bowlRightEdge - STEM * 1.5;
	const legTopY = bowlBottom + STEM / 2;
	const legBottomRight = bowlRightEdge + 30;
	const leg = polyPath([
		[legTopX, legTopY],
		[legTopX + STEM, legTopY],
		[legBottomRight, 0],
		[legBottomRight - STEM, 0]
	]);
	return { path: mergePaths(stem, ring, leg), advance: legBottomRight + 30, lsb: 80 };
};

const buildD = () => {
	// D: vertical stem + full-cap-height bowl. Bowl extends to give the
	// D a wide, confident silhouette.
	const stem = rect(80, 0, STEM, CAP_HEIGHT);
	const ringRx = CAP_W * 0.48;
	const ring = bowlRing(80, CAP_HEIGHT / 2, ringRx, CAP_HEIGHT / 2, STEM);
	return { path: mergePaths(stem, ring), advance: 80 + 2 * ringRx + 30, lsb: 80 };
};

const buildU = () => {
	// U: full ring at the bottom + two tall stems exactly covering the
	// ring's top-left and top-right walls. Ring extends horizontally
	// from x=80 (left stem left edge) to x=W-80 (right stem right edge).
	const W = CAP_W;
	const baseRy = CAP_HEIGHT * 0.32;
	const ringRx = (W - 160) / 2; // outer-left at 80, outer-right at W-80
	const ringCy = baseRy;
	const ring = bowlRing(80, ringCy, ringRx, baseRy, STEM);
	// Top-half-cover: a wide CW rect across the ring's top half, plus
	// stems extending UP from ringCy to cap-height to give the U its
	// vertical sides. The CW rect punches out the ring's top half
	// (between the stem walls).
	const topCover = cwRect(80 + STEM, ringCy, W - 160 - 2 * STEM, baseRy + 10);
	const leftStem = rect(80, ringCy, STEM, CAP_HEIGHT - ringCy);
	const rightStem = rect(W - 80 - STEM, ringCy, STEM, CAP_HEIGHT - ringCy);
	return {
		path: mergePaths(ring, topCover, leftStem, rightStem),
		advance: W,
		lsb: 80
	};
};

const buildS = () => {
	// S: three horizontal bars (top, middle, bottom) joined by two
	// stem connectors at opposite corners — geometric/brutalist S.
	// Previous "two ring" attempt produced a "+" artifact because the
	// middle bar filled both rings' inner counters. Rectangular S
	// reads cleanly even if it's not curved, and matches the H/E/T
	// rectangular aesthetic the rest of the alphabet uses.
	const top = polyPath([
		[60, CAP_HEIGHT - BAR],
		[CAP_W - 60, CAP_HEIGHT - BAR],
		[CAP_W - 60, CAP_HEIGHT],
		[60, CAP_HEIGHT]
	]);
	const bottom = polyPath([
		[60, 0],
		[CAP_W - 60, 0],
		[CAP_W - 60, BAR],
		[60, BAR]
	]);
	const middle = polyPath([
		[60, CAP_HEIGHT / 2 - BAR / 2],
		[CAP_W - 60, CAP_HEIGHT / 2 - BAR / 2],
		[CAP_W - 60, CAP_HEIGHT / 2 + BAR / 2],
		[60, CAP_HEIGHT / 2 + BAR / 2]
	]);
	const upperLeft = rect(60, CAP_HEIGHT / 2 - BAR / 2, STEM, CAP_HEIGHT / 2 - BAR / 2);
	const lowerRight = rect(
		CAP_W - 60 - STEM,
		BAR,
		STEM,
		CAP_HEIGHT / 2 - BAR / 2
	);
	return {
		path: mergePaths(top, bottom, middle, upperLeft, lowerRight),
		advance: CAP_W,
		lsb: 60
	};
};

// CW-wound rectangle — when merged into a path with non-zero winding,
// this SUBTRACTS from anything overlapping it (because CW = -1). Used
// to punch mouth openings in C, G, 2, etc.
const cwRect = (x, y, w, h) =>
	polyPath([
		[x, y],
		[x, y + h],
		[x + w, y + h],
		[x + w, y]
	]);

/**
 * Half-width of an axis-aligned ellipse at vertical offset `dy` from
 * its center. Used to clip the mouth-cut rectangles so they don't
 * extend PAST the outer ellipse's curve at the mouth's top/bottom Y —
 * which would leave a small "outside outer + inside mouth" sliver
 * filled (+1 −1 = 0 OUTSIDE outer, but −1 alone inside mouth = filled).
 */
const ellipseHalfWidthAt = (rx, ry, dy) =>
	rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2));

const buildG = () => {
	// G: C-style open ring + horizontal spur at mid-right.
	// Mouth aligned EXACTLY with the inner ellipse's right edge so it
	// doesn't overlap (winding = +1 -1 -1 = -1 → filled artifact).
	const cx = CAP_W / 2;
	const cy = CAP_HEIGHT / 2;
	const rx = CAP_W / 2 - 80;
	const ry = CAP_HEIGHT / 2;
	const innerRx = rx - STEM;
	const innerRy = ry - STEM;
	const outer = ellipsePath(cx, cy, rx, ry, 'ccw');
	const inner = ellipsePath(cx, cy, innerRx, innerRy, 'cw');
	const mouthH = innerRy * 1.2;
	// Mouth's right edge clipped to outer ellipse at mouth top/bottom Y
	// so it doesn't stick past the outer curve (which would create a
	// filled crescent: outer=0, mouth=-1, winding=-1, filled).
	const mouthRightX = cx + ellipseHalfWidthAt(rx, ry, mouthH / 2);
	const mouth = cwRect(cx + innerRx, cy - mouthH / 2, mouthRightX - (cx + innerRx), mouthH);
	// Spur — horizontal bar at the middle. Spans from CENTER of the
	// ring (cx) to the OUTER right edge (cx+rx) so it visually attaches
	// to the right wall AND extends halfway into the counter.
	const spur = rect(cx, cy - STEM / 2, rx, STEM);
	return { path: mergePaths(outer, inner, mouth, spur), advance: CAP_W, lsb: 80 };
};

const buildC = () => {
	// C: open ring, right side punched out. Mouth's right edge clipped
	// to the outer curve at mouth top/bottom Y so no filled crescent
	// artifact (see G for details).
	const cx = CAP_W / 2;
	const cy = CAP_HEIGHT / 2;
	const rx = CAP_W / 2 - 80;
	const ry = CAP_HEIGHT / 2;
	const innerRx = rx - STEM;
	const innerRy = ry - STEM;
	const outer = ellipsePath(cx, cy, rx, ry, 'ccw');
	const inner = ellipsePath(cx, cy, innerRx, innerRy, 'cw');
	const mouthH = innerRy * 1.3;
	const mouthRightX = cx + ellipseHalfWidthAt(rx, ry, mouthH / 2);
	const mouth = cwRect(cx + innerRx, cy - mouthH / 2, mouthRightX - (cx + innerRx), mouthH);
	return { path: mergePaths(outer, inner, mouth), advance: CAP_W, lsb: 80 };
};

const buildM = () => {
	// M: two verticals + V in the middle dropping to ~30% height. Wider
	// glyph (CAP_W * 1.2) because the M is typographically the widest
	// uppercase letter.
	const W = CAP_W * 1.2;
	const leftStem = rect(80, 0, STEM, CAP_HEIGHT);
	const rightStem = rect(W - 80 - STEM, 0, STEM, CAP_HEIGHT);
	const midX = W / 2;
	const midDipY = CAP_HEIGHT * 0.3;
	// Left diagonal goes from inner-top of left stem down-right to the V's
	// vertex. We model it as a parallelogram with horizontal width STEM:
	// top-left at inner-top of left stem, top-right slightly to the right
	// of that, bottom at the V vertex centered on midX.
	const leftDiag = polyPath([
		[80 + STEM, CAP_HEIGHT],
		[80 + STEM * 2, CAP_HEIGHT],
		[midX + STEM / 2, midDipY],
		[midX - STEM / 2, midDipY]
	]);
	const rightDiag = polyPath([
		[W - 80 - STEM * 2, CAP_HEIGHT],
		[W - 80 - STEM, CAP_HEIGHT],
		[midX + STEM / 2, midDipY],
		[midX - STEM / 2, midDipY]
	]);
	return {
		path: mergePaths(leftStem, rightStem, leftDiag, rightDiag),
		advance: W,
		lsb: 80
	};
};

// ---- Lowercase additions ----

const buildA_lc = () => {
	// a: ring bowl + right stem. Ring's outer-RIGHT edge aligns with
	// the right stem's right edge (mirror of P's bowl construction):
	// stem covers the ring's RIGHT wall, only the left bowl shows.
	// rx derived from the FULL visible ring width (lsb → stemRightEdge),
	// not the previous over-narrow formula.
	const lsb = 80;
	const t = STEM - 10;
	const ry = X_HEIGHT / 2;
	const stemRightEdge = LC_W - lsb;
	const stemLeftEdge = stemRightEdge - t;
	const ringLeftEdge = lsb;
	const ringRightEdge = stemRightEdge;
	const rx = (ringRightEdge - ringLeftEdge) / 2;
	const cx = (ringRightEdge + ringLeftEdge) / 2;
	const outer = ellipsePath(cx, ry, rx, ry, 'ccw');
	const inner = ellipsePath(cx, ry, rx - t, ry - t, 'cw');
	const stem = rect(stemLeftEdge, 0, t, X_HEIGHT);
	return { path: mergePaths(outer, inner, stem), advance: LC_W, lsb };
};

const buildE_lc = () => {
	// e: full ring + horizontal crossbar at mid-height + mouth opening
	// the lower-right wall. Mouth is restricted to wall thickness so it
	// doesn't re-fill the interior. Crossbar overlaps the wall on both
	// sides so it joins cleanly.
	const cx = LC_W / 2;
	const cy = X_HEIGHT / 2;
	const rx = LC_W / 2 - 80;
	const ry = X_HEIGHT / 2;
	const t = STEM - 10;
	const innerRx = rx - t;
	const innerRy = ry - t;
	const outer = ellipsePath(cx, cy, rx, ry, 'ccw');
	const inner = ellipsePath(cx, cy, innerRx, innerRy, 'cw');
	// Lower-right mouth — opens just the lower portion of the right
	// wall. Y range and right edge are both clipped to keep the mouth
	// INSIDE the outer ellipse so no crescent artifact appears past
	// outer's curve.
	const mouthBottomY = cy - innerRy * 0.9;
	const mouthTopY = cy + STEM * 0.1;
	const mouthRightX = cx + ellipseHalfWidthAt(rx, ry, cy - mouthBottomY);
	const mouth = cwRect(
		cx + innerRx,
		mouthBottomY,
		mouthRightX - (cx + innerRx),
		mouthTopY - mouthBottomY
	);
	// Crossbar — horizontal, full inner width minus a bit of bleed.
	const bar = rect(cx - rx + t / 2, cy - t / 3, rx * 2 - t, (t * 2) / 3);
	return { path: mergePaths(outer, inner, mouth, bar), advance: LC_W, lsb: 80 };
};

const buildS_lc = () => {
	// s: scaled-down S using the same construction
	const top = polyPath([
		[60, X_HEIGHT - BAR],
		[LC_W - 60, X_HEIGHT - BAR],
		[LC_W - 60, X_HEIGHT],
		[60, X_HEIGHT]
	]);
	const bottom = polyPath([
		[60, 0],
		[LC_W - 60, 0],
		[LC_W - 60, BAR],
		[60, BAR]
	]);
	const middle = polyPath([
		[80, X_HEIGHT / 2 - BAR / 2],
		[LC_W - 80, X_HEIGHT / 2 - BAR / 2],
		[LC_W - 80, X_HEIGHT / 2 + BAR / 2],
		[80, X_HEIGHT / 2 + BAR / 2]
	]);
	const upperLeft = polyPath([
		[60, X_HEIGHT / 2 + BAR / 2],
		[60 + STEM, X_HEIGHT / 2 + BAR / 2],
		[60 + STEM, X_HEIGHT - BAR],
		[60, X_HEIGHT - BAR]
	]);
	const lowerRight = polyPath([
		[LC_W - 60 - STEM, BAR],
		[LC_W - 60, BAR],
		[LC_W - 60, X_HEIGHT / 2 - BAR / 2],
		[LC_W - 60 - STEM, X_HEIGHT / 2 - BAR / 2]
	]);
	return {
		path: mergePaths(top, bottom, middle, upperLeft, lowerRight),
		advance: LC_W,
		lsb: 60
	};
};

const buildT_lc = () => {
	// t: tall thin vertical with a horizontal crossbar near the top,
	// extending slightly above the x-height (typical lowercase t)
	const stemH = X_HEIGHT + 100; // extends above x-height
	const stemX = LC_W / 2 - STEM / 2;
	const stem = rect(stemX, 0, STEM, stemH);
	const bar = polyPath([
		[80, X_HEIGHT - BAR / 2],
		[LC_W - 80, X_HEIGHT - BAR / 2],
		[LC_W - 80, X_HEIGHT + BAR / 2],
		[80, X_HEIGHT + BAR / 2]
	]);
	return { path: mergePaths(stem, bar), advance: LC_W * 0.7, lsb: 60 };
};

const buildH_lc = () => {
	// h: full left stem (ascender-height) + the same arch + right arm
	// as `n`. Simpler than building a custom arch path — we reuse
	// buildN_lc's shape and just extend the left stem upward to
	// ascender height.
	const lsb = 80;
	const w = LC_W - 2 * lsb;
	const h = X_HEIGHT;
	const ascH = X_HEIGHT + 200; // ascender ≈ 700
	const s = STEM;
	const r = Math.round(h * 0.42);
	const k = KAPPA;
	const rxIn = (w - 2 * s) / 2;
	const ryIn = r - s;

	// Same CCW contour as buildN_lc, but the outer-left of the left
	// stem extends from y=0 up to ascH instead of just h.
	const p = new opentype.Path();
	p.moveTo(lsb, 0);
	p.lineTo(lsb + s, 0);
	p.lineTo(lsb + s, h - r);
	p.curveTo(lsb + s, h - r + ryIn * k, lsb + w / 2 - rxIn * k, h - s, lsb + w / 2, h - s);
	p.curveTo(
		lsb + w / 2 + rxIn * k,
		h - s,
		lsb + w - s,
		h - r + ryIn * k,
		lsb + w - s,
		h - r
	);
	p.lineTo(lsb + w - s, 0);
	p.lineTo(lsb + w, 0);
	p.lineTo(lsb + w, h - r);
	p.curveTo(lsb + w, h - r + r * k, lsb + s + (w - s) * k, h, lsb + s, h);
	// Instead of going straight across the top of the stem at y=h, we
	// step UP to ascender height for the h's extended left stem.
	p.lineTo(lsb + s, ascH); // up the inner edge of the riser
	p.lineTo(lsb, ascH); // across the flat top
	p.lineTo(lsb, 0); // down the outside of the left stem
	p.close();
	return { path: p, advance: LC_W, lsb };
};

// ---- Digits ----

const buildZero = () => {
	const cx = CAP_W / 2;
	const cy = CAP_HEIGHT / 2;
	const rx = CAP_W / 2 - 100;
	const ry = CAP_HEIGHT / 2;
	const outer = ellipsePath(cx, cy, rx, ry, 'ccw');
	const inner = ellipsePath(cx, cy, rx - STEM, ry - STEM, 'cw');
	return { path: mergePaths(outer, inner), advance: CAP_W, lsb: 100 };
};

const buildOne = () => {
	// 1: tall stem + small flag at top + small base bar
	const stem = rect(CAP_W / 2 - STEM / 2, 0, STEM, CAP_HEIGHT);
	const flag = polyPath([
		[CAP_W / 2 - STEM / 2 - 80, CAP_HEIGHT - BAR],
		[CAP_W / 2 + STEM / 2, CAP_HEIGHT - BAR],
		[CAP_W / 2 + STEM / 2, CAP_HEIGHT],
		[CAP_W / 2 - STEM / 2 - 80, CAP_HEIGHT - 40]
	]);
	const base = polyPath([
		[CAP_W / 2 - STEM / 2 - 50, 0],
		[CAP_W / 2 + STEM / 2 + 50, 0],
		[CAP_W / 2 + STEM / 2 + 50, BAR / 2],
		[CAP_W / 2 - STEM / 2 - 50, BAR / 2]
	]);
	return { path: mergePaths(stem, flag, base), advance: CAP_W * 0.6, lsb: 80 };
};

const buildTwo = () => {
	// 2: top half-arch (single CCW contour — outer arc + inner arc
	// joined by horizontal wall pieces at upperCy) + diagonal + base.
	// Tracing the arch as a single contour avoids the rectangle-cut
	// approach, which had the "cut sticks out past outer ellipse curve"
	// artifact that filled small wedges below the arch.
	const cx = CAP_W / 2;
	const upperRy = CAP_HEIGHT * 0.27;
	const upperCy = CAP_HEIGHT - upperRy;
	const upperRx = CAP_W / 2 - 80;
	const innerRx = upperRx - STEM;
	const innerRy = upperRy - STEM;
	const k = KAPPA;

	const arch = new opentype.Path();
	// Outer half-arc, CCW around the top, from right-middle to left-middle.
	arch.moveTo(cx + upperRx, upperCy);
	arch.curveTo(
		cx + upperRx, upperCy + upperRy * k,
		cx + upperRx * k, upperCy + upperRy,
		cx, upperCy + upperRy
	);
	arch.curveTo(
		cx - upperRx * k, upperCy + upperRy,
		cx - upperRx, upperCy + upperRy * k,
		cx - upperRx, upperCy
	);
	// Left wall: line across to inner-left.
	arch.lineTo(cx - innerRx, upperCy);
	// Inner half-arc, CW around the top (reverse of CCW), from
	// left-middle to right-middle.
	arch.curveTo(
		cx - innerRx, upperCy + innerRy * k,
		cx - innerRx * k, upperCy + innerRy,
		cx, upperCy + innerRy
	);
	arch.curveTo(
		cx + innerRx * k, upperCy + innerRy,
		cx + innerRx, upperCy + innerRy * k,
		cx + innerRx, upperCy
	);
	// Right wall: line back to start.
	arch.lineTo(cx + upperRx, upperCy);
	arch.close();

	const diagStartX = cx + upperRx - STEM / 2;
	const diag = polyPath([
		[diagStartX - STEM, upperCy],
		[diagStartX, upperCy],
		[80 + STEM, BAR],
		[80, BAR]
	]);
	const base = rect(80, 0, CAP_W - 160, BAR);
	return {
		path: mergePaths(arch, diag, base),
		advance: CAP_W,
		lsb: 80
	};
};

// ---- Punctuation ----

const buildPeriod = () => {
	const r = STEM / 2;
	return {
		path: ellipsePath(r + 60, r + 20, r, r, 'ccw'),
		advance: 240,
		lsb: 60
	};
};

const buildComma = () => {
	const r = STEM / 2;
	// Drop with a small tail
	const drop = ellipsePath(r + 60, r + 20, r, r, 'ccw');
	const tail = polyPath([
		[60 + r - 5, 20],
		[60 + r + 5, 20],
		[60 + r - 10, -80],
		[60 + r - 20, -80]
	]);
	return { path: mergePaths(drop, tail), advance: 240, lsb: 60 };
};

const buildHyphen = () => {
	const yMid = CAP_HEIGHT / 2;
	return {
		path: rect(60, yMid - BAR / 4, CAP_W / 2, BAR / 2),
		advance: CAP_W / 2 + 120,
		lsb: 60
	};
};

const buildExclaim = () => {
	const x = 60;
	const stem = rect(x, BAR * 1.5, STEM, CAP_HEIGHT - BAR * 1.5);
	const dot = ellipsePath(x + STEM / 2, BAR / 2 + 20, STEM / 2, STEM / 2, 'ccw');
	return { path: mergePaths(stem, dot), advance: STEM + 120, lsb: 60 };
};

const buildSpace = () => ({ path: new opentype.Path(), advance: 250, lsb: 0 });

// ----- Assemble & save fonts -----

const buildFont = ({ familyName, styleName, slabs }) => {
	const notdef = new opentype.Glyph({
		name: '.notdef',
		unicode: 0,
		advanceWidth: 500,
		path: polyPath([
			[40, 0],
			[460, 0],
			[460, CAP_HEIGHT],
			[40, CAP_HEIGHT]
		])
	});

	const glyphSpecs = [
		// Space + originals (proven-good)
		{ name: 'space', cp: 0x20, build: () => buildSpace() },
		{ name: 'H', cp: 0x48, build: () => buildH(slabs) },
		{ name: 'O', cp: 0x4f, build: () => buildO() },
		{ name: 'T', cp: 0x54, build: () => buildT(slabs) },
		{ name: 'I', cp: 0x49, build: () => buildI(slabs) },
		{ name: 'E', cp: 0x45, build: () => buildE(slabs) },
		{ name: 'N', cp: 0x4e, build: () => buildN(slabs) },
		// Uppercase additions — needed for PATENS · STUDIO GEOMETRIC
		{ name: 'A', cp: 0x41, build: () => buildA() },
		{ name: 'C', cp: 0x43, build: () => buildC() },
		{ name: 'D', cp: 0x44, build: () => buildD() },
		{ name: 'G', cp: 0x47, build: () => buildG() },
		{ name: 'M', cp: 0x4d, build: () => buildM() },
		{ name: 'P', cp: 0x50, build: () => buildP() },
		{ name: 'R', cp: 0x52, build: () => buildR() },
		{ name: 'S', cp: 0x53, build: () => buildS() },
		{ name: 'U', cp: 0x55, build: () => buildU() },
		// Lowercase
		{ name: 'a', cp: 0x61, build: () => buildA_lc() },
		{ name: 'e', cp: 0x65, build: () => buildE_lc() },
		{ name: 'h', cp: 0x68, build: () => buildH_lc() },
		{ name: 'n', cp: 0x6e, build: () => buildN_lc(slabs) },
		{ name: 'o', cp: 0x6f, build: () => buildO_lc() },
		{ name: 's', cp: 0x73, build: () => buildS_lc() },
		{ name: 't', cp: 0x74, build: () => buildT_lc() },
		// Digits — start with 0, 1, 2 (most-visible in dates / sample text)
		{ name: 'zero', cp: 0x30, build: () => buildZero() },
		{ name: 'one', cp: 0x31, build: () => buildOne() },
		{ name: 'two', cp: 0x32, build: () => buildTwo() },
		// Punctuation
		{ name: 'period', cp: 0x2e, build: () => buildPeriod() },
		{ name: 'comma', cp: 0x2c, build: () => buildComma() },
		{ name: 'hyphen', cp: 0x2d, build: () => buildHyphen() },
		{ name: 'exclam', cp: 0x21, build: () => buildExclaim() }
	];

	const glyphs = [notdef];
	for (const spec of glyphSpecs) {
		const { path, advance } = spec.build();
		glyphs.push(
			new opentype.Glyph({
				name: spec.name,
				unicode: spec.cp,
				advanceWidth: advance,
				path
			})
		);
	}

	const font = new opentype.Font({
		familyName,
		styleName,
		unitsPerEm: UPM,
		ascender: ASCENDER,
		descender: DESCENDER,
		glyphs,
		designer: 'Font Studio demo',
		designerURL: '',
		manufacturer: 'Font Studio',
		license: 'Public domain — use freely.',
		version: '1.000',
		copyright: `Copyright (c) ${new Date().getFullYear()} Font Studio demo`
	});

	return font;
};

const exports = [
	{
		name: 'StudioGeometric-Regular.otf',
		font: buildFont({
			familyName: 'Studio Geometric',
			styleName: 'Regular',
			slabs: false
		})
	},
	{
		name: 'StudioSlab-Regular.otf',
		font: buildFont({
			familyName: 'Studio Slab',
			styleName: 'Regular',
			slabs: true
		})
	}
];

for (const { name, font } of exports) {
	const buffer = font.toArrayBuffer();
	const path = join(outDir, name);
	writeFileSync(path, Buffer.from(buffer));
	console.log(
		`✓ ${name} (${(buffer.byteLength / 1024).toFixed(1)} KB) → ${path}`
	);
}

console.log(`\nDone. ${exports.length} font(s) written to ${outDir}`);
