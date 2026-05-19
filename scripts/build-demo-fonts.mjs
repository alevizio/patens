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
 * Construction is bare-bones (rectangular strokes, no curves where avoidable)
 * — the goal is "looks like a font you'd recognise", not production polish.
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
const BASELINE = 0;

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

const STEM = 90; // vertical stem width
const BAR = 80; // horizontal bar width
const CAP_W = 560; // average uppercase width
const LC_W = 480; // average lowercase width
const SERIF = 24; // slab serif depth (only for Studio Slab)

/** Build a horizontal slab serif at (x, y) of given width — Y-up. */
const slab = (x, y, w) => polyPath([
	[x, y - SERIF],
	[x + w, y - SERIF],
	[x + w, y + SERIF],
	[x, y + SERIF]
]);

// ----- Glyph constructions (each returns { path, advance, lsb }) -----

const buildH = (slabs) => {
	const left = polyPath([[80, 0], [80 + STEM, 0], [80 + STEM, CAP_HEIGHT], [80, CAP_HEIGHT]]);
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
	let parts = [left, right, bar];
	if (slabs) {
		parts.push(slab(80, 0, STEM), slab(80, CAP_HEIGHT, STEM));
		parts.push(slab(CAP_W - STEM - 80, 0, STEM), slab(CAP_W - STEM - 80, CAP_HEIGHT, STEM));
	}
	return { path: mergePaths(...parts), advance: CAP_W, lsb: 80 };
};

const ringOutline = (cx, cy, rx, ry, t) => {
	// Approximate a ring (donut) with two concentric octagons (Y-up).
	const oct = (rx, ry) => {
		const k = 0.4;
		return [
			[cx - rx, cy],
			[cx - rx * k, cy + ry],
			[cx + rx * k, cy + ry],
			[cx + rx, cy],
			[cx + rx, cy - 0], // hint that this is one polygon
			[cx + rx * k, cy - ry],
			[cx - rx * k, cy - ry],
			[cx - rx, cy]
		];
	};
	const outer = polyPath(oct(rx, ry));
	// Counter-clockwise inner punches a hole when fill-rule is evenodd.
	const innerVerts = [
		[cx - (rx - t), cy],
		[cx - (rx - t) * 0.4, cy - (ry - t)],
		[cx + (rx - t) * 0.4, cy - (ry - t)],
		[cx + (rx - t), cy],
		[cx + (rx - t) * 0.4, cy + (ry - t)],
		[cx - (rx - t) * 0.4, cy + (ry - t)]
	];
	const inner = polyPath(innerVerts);
	return mergePaths(outer, inner);
};

const buildO = () => {
	const rx = CAP_W / 2 - 80;
	const ry = CAP_HEIGHT / 2;
	const path = ringOutline(CAP_W / 2, CAP_HEIGHT / 2, rx, ry, STEM);
	return { path, advance: CAP_W, lsb: 80 };
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
	let parts = [stem, top];
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
	let parts = [stem];
	if (slabs) {
		parts.push(slab(CAP_W / 2 - STEM / 2 - SERIF, 0, STEM + SERIF * 2));
		parts.push(slab(CAP_W / 2 - STEM / 2 - SERIF, CAP_HEIGHT, STEM + SERIF * 2));
	}
	return { path: mergePaths(...parts), advance: CAP_W * 0.6, lsb: 60 };
};

const buildE = (slabs) => {
	const stem = polyPath([[80, 0], [80 + STEM, 0], [80 + STEM, CAP_HEIGHT], [80, CAP_HEIGHT]]);
	const top = polyPath([[80, CAP_HEIGHT - BAR], [CAP_W - 60, CAP_HEIGHT - BAR], [CAP_W - 60, CAP_HEIGHT], [80, CAP_HEIGHT]]);
	const mid = polyPath([[80, CAP_HEIGHT / 2 - BAR / 2], [CAP_W - 100, CAP_HEIGHT / 2 - BAR / 2], [CAP_W - 100, CAP_HEIGHT / 2 + BAR / 2], [80, CAP_HEIGHT / 2 + BAR / 2]]);
	const bot = polyPath([[80, 0], [CAP_W - 60, 0], [CAP_W - 60, BAR], [80, BAR]]);
	let parts = [stem, top, mid, bot];
	if (slabs) parts.push(slab(80, 0, STEM), slab(80, CAP_HEIGHT, STEM));
	return { path: mergePaths(...parts), advance: CAP_W, lsb: 80 };
};

const buildN = (slabs) => {
	const left = polyPath([[80, 0], [80 + STEM, 0], [80 + STEM, CAP_HEIGHT], [80, CAP_HEIGHT]]);
	const right = polyPath([[CAP_W - STEM - 80, 0], [CAP_W - 80, 0], [CAP_W - 80, CAP_HEIGHT], [CAP_W - STEM - 80, CAP_HEIGHT]]);
	const diag = polyPath([
		[80 + STEM, CAP_HEIGHT],
		[CAP_W - 80, 0],
		[CAP_W - STEM - 80, 0],
		[80, CAP_HEIGHT]
	]);
	let parts = [left, right, diag];
	if (slabs) {
		parts.push(slab(80, 0, STEM), slab(80, CAP_HEIGHT, STEM));
		parts.push(slab(CAP_W - STEM - 80, 0, STEM), slab(CAP_W - STEM - 80, CAP_HEIGHT, STEM));
	}
	return { path: mergePaths(...parts), advance: CAP_W + 20, lsb: 80 };
};

const buildO_lc = () => {
	const rx = LC_W / 2 - 80;
	const ry = X_HEIGHT / 2;
	const path = ringOutline(LC_W / 2, X_HEIGHT / 2, rx, ry, STEM - 10);
	return { path, advance: LC_W, lsb: 80 };
};

const buildN_lc = (slabs) => {
	const left = polyPath([[80, 0], [80 + STEM, 0], [80 + STEM, X_HEIGHT - STEM], [80, X_HEIGHT - STEM]]);
	const arch = polyPath([
		[80, X_HEIGHT - STEM],
		[LC_W - 80, X_HEIGHT - STEM],
		[LC_W - 80, X_HEIGHT],
		[80, X_HEIGHT]
	]);
	const right = polyPath([[LC_W - STEM - 80, 0], [LC_W - 80, 0], [LC_W - 80, X_HEIGHT - STEM], [LC_W - STEM - 80, X_HEIGHT - STEM]]);
	let parts = [left, arch, right];
	if (slabs) parts.push(slab(80, 0, STEM), slab(LC_W - STEM - 80, 0, STEM));
	return { path: mergePaths(...parts), advance: LC_W, lsb: 80 };
};

const buildSpace = () => ({ path: new opentype.Path(), advance: 250, lsb: 0 });

// ----- Assemble & save fonts -----

const buildFont = ({ familyName, styleName, slabs }) => {
	const notdef = new opentype.Glyph({
		name: '.notdef',
		unicode: 0,
		advanceWidth: 500,
		path: polyPath([[40, 0], [460, 0], [460, CAP_HEIGHT], [40, CAP_HEIGHT]])
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
		const { path, advance, lsb } = spec.build();
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
	{ name: 'StudioGeometric-Regular.otf', font: buildFont({ familyName: 'Studio Geometric', styleName: 'Regular', slabs: false }) },
	{ name: 'StudioSlab-Regular.otf', font: buildFont({ familyName: 'Studio Slab', styleName: 'Regular', slabs: true }) }
];

for (const { name, font } of exports) {
	const buffer = font.toArrayBuffer();
	const path = join(outDir, name);
	writeFileSync(path, Buffer.from(buffer));
	console.log(`✓ ${name} (${(buffer.byteLength / 1024).toFixed(1)} KB) → ${path}`);
}

console.log(`\nDone. ${exports.length} font(s) written to ${outDir}`);
