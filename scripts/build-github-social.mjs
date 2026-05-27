#!/usr/bin/env node
/**
 * Generate static/github-social.png — the 1280×640 image GitHub renders
 * when the repo URL is unfurled (Twitter/X, Slack, Discord, the GitHub
 * repository listing card, search results that show a thumbnail).
 *
 * GitHub doesn't expose an API for uploading social preview images —
 * this file gets dropped into the repo so the maintainer can upload it
 * once via Settings → General → Social preview. Regenerate after any
 * branding change:
 *
 *   pnpm build:github-social
 *
 * Architecture mirrors src/routes/og.png/+server.ts: extract glyph
 * paths from the demo OTF via opentype.js (no font-registration needed
 * for resvg), compose an SVG of `<path>` elements, rasterize.
 */

import { writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import { Resvg } from '@resvg/resvg-js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const fontPath = join(root, 'static/demo-fonts/StudioGeometric-Regular.otf');
const outPath = join(root, 'static/github-social.png');

const buf = readFileSync(fontPath);
const font = opentype.parse(
	buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
);

const W = 1280;
const H = 640;
const BG = '#FAF6EE';
const FG = '#1B1611';
const MUTED = '#6B6258';
const SUBTLE = '#8C8378';
const ACCENT = '#7C5C2A';

// Safe path-data converter — opentype.js's built-in toPathData() has a
// decimal-rounding cache bug that emits "NaN" for values like
// 336.00000000000006 (floating-point noise from font scaling). Round
// manually instead.
const r = (v) => Math.round(v * 100) / 100;
const textToPath = (text, x, y, fontSize) =>
	font
		.getPath(text, x, y, fontSize)
		.commands.map((c) => {
			if (c.type === 'M') return `M${r(c.x)} ${r(c.y)}`;
			if (c.type === 'L') return `L${r(c.x)} ${r(c.y)}`;
			if (c.type === 'C')
				return `C${r(c.x1)} ${r(c.y1)} ${r(c.x2)} ${r(c.y2)} ${r(c.x)} ${r(c.y)}`;
			if (c.type === 'Q') return `Q${r(c.x1)} ${r(c.y1)} ${r(c.x)} ${r(c.y)}`;
			if (c.type === 'Z') return 'Z';
			return '';
		})
		.join(' ');

// PATENS wordmark on the left, demo type samples on the right, audit-
// module differentiator strap-line at the bottom. The whole layout uses
// the demo OTF for everything in-font (no system-font for the wordmark)
// so the unfurl is literally the product's output. 26 glyphs available
// — full uppercase for "PATENS" + "STUDIO GEOMETRIC" specimen.
const wordmarkPath = textToPath('PATENS', 96, 360, 240);
const specimenPath = textToPath('STUDIO GEOMETRIC', 96, 460, 64);
const tonePath = textToPath('HONE THE TONE.', 96, 540, 64);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
	<rect width="${W}" height="${H}" fill="${BG}" />

	<!-- top-left eyebrow -->
	<text x="96" y="110" font-family="-apple-system,system-ui,Helvetica,Arial,sans-serif" font-size="20" letter-spacing="5" fill="${SUBTLE}">BROWSER-NATIVE TYPE DESIGN · 26-GLYPH DEMO TYPEFACE</text>

	<!-- wordmark — PATENS in the demo font -->
	<path d="${wordmarkPath}" fill="${FG}" />

	<!-- specimen lines below the wordmark -->
	<path d="${specimenPath}" fill="${FG}" />
	<path d="${tonePath}" fill="${FG}" />

	<!-- bottom strap-line — the audit-module differentiator -->
	<text x="96" y="600" font-family="-apple-system,system-ui,Helvetica,Arial,sans-serif" font-size="22" fill="${MUTED}">SvelteKit · 94-rule audit module · variable fonts · open source MIT</text>

	<!-- accent rule -->
	<rect x="96" y="615" width="120" height="2" fill="${ACCENT}" />
</svg>`;

const resvg = new Resvg(svg, {
	fitTo: { mode: 'width', value: W },
	font: { loadSystemFonts: true, defaultFontFamily: 'sans-serif' }
});

const png = resvg.render().asPng();
writeFileSync(outPath, png);

console.log(
	`✓ static/github-social.png (${W}×${H}, ${(png.byteLength / 1024).toFixed(1)} KB)`
);
console.log('  Next: upload via github.com/alevizio/patens/settings → Social preview');
