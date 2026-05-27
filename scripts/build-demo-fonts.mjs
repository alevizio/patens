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
		{ name: 'space', cp: 0x20, build: () => buildSpace() },
		{ name: 'H', cp: 0x48, build: () => buildH(slabs) },
		{ name: 'O', cp: 0x4f, build: () => buildO() },
		{ name: 'T', cp: 0x54, build: () => buildT(slabs) },
		{ name: 'I', cp: 0x49, build: () => buildI(slabs) },
		{ name: 'E', cp: 0x45, build: () => buildE(slabs) },
		{ name: 'N', cp: 0x4e, build: () => buildN(slabs) },
		{ name: 'o', cp: 0x6f, build: () => buildO_lc() },
		{ name: 'n', cp: 0x6e, build: () => buildN_lc(slabs) }
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
