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

const textToPath = (text, x, y, fontSize) =>
	font.getPath(text, x, y, fontSize).toPathData(2);

// Big "Hn" wordmark on the left, demo type samples on the right,
// audit-module differentiator strap-line at the bottom. The whole layout
// uses the demo OTF for everything in-font (no system-font for the
// wordmark) so the unfurl is literally the product's output.
const hnPath = textToPath('Hn', 96, 460, 380);
const honePath = textToPath('HONE', 620, 270, 92);
const tonePath = textToPath('TONE', 620, 380, 92);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
	<rect width="${W}" height="${H}" fill="${BG}" />

	<!-- top-left eyebrow -->
	<text x="96" y="110" font-family="-apple-system,system-ui,Helvetica,Arial,sans-serif" font-size="20" letter-spacing="5" fill="${SUBTLE}">PATENS · TYPE DESIGN</text>

	<!-- wordmark (the demo font's own H + lowercase n) -->
	<path d="${hnPath}" fill="${FG}" />

	<!-- type sample column on the right -->
	<path d="${honePath}" fill="${FG}" />
	<path d="${tonePath}" fill="${FG}" />

	<!-- right-side label above the samples -->
	<text x="620" y="180" font-family="-apple-system,system-ui,Helvetica,Arial,sans-serif" font-size="15" letter-spacing="3" fill="${SUBTLE}">STUDIO GEOMETRIC · DEMO TYPEFACE</text>

	<!-- bottom strap-line — the audit-module differentiator -->
	<text x="96" y="570" font-family="-apple-system,system-ui,Helvetica,Arial,sans-serif" font-size="22" fill="${MUTED}">Browser-native type design tool · 94-rule audit module · open source MIT</text>

	<!-- accent rule -->
	<rect x="96" y="592" width="120" height="2" fill="${ACCENT}" />
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
