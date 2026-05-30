/**
 * Dynamic OG image — Patens's own demo OTF for the wordmark + type sample.
 *
 * Architecture note: we don't use Satori here because Satori bundles a fork of
 * opentype.js that fails to parse our generated demo OTF (missing ltag table).
 * Since the demo glyphs are already available via the vanilla opentype.js we
 * already depend on, we extract path outlines directly and compose an SVG of
 * pure `<path>` elements (no `<text>` — no font registration needed). resvg
 * then rasterizes that to PNG without needing any font.
 *
 * Served at /og.png. Cached in-process since the output is deterministic
 * until the demo font changes.
 */

import type { RequestHandler } from './$types';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parse as parseFont } from 'opentype.js';
import { Resvg } from '@resvg/resvg-js';

let cachedPng: Buffer | null = null;

const W = 1200;
const H = 630;
// Swiss palette (mirrors app.css token redirect): stone-50 canvas,
// stone-900 fg, stone-600 muted, Swiss Red accent.
const BG = '#fafaf9'; // stone-50
const FG = '#1c1917'; // stone-900
const MUTED = '#57534e'; // stone-600
const SWISS_RED = '#C8102E';

/**
 * Render `text` via opentype.js to a single SVG path d-string.
 *
 * IMPORTANT: We DON'T use opentype.js's built-in toPathData() because it
 * has a decimal-rounding cache bug — when scaled coordinates land on
 * values like 336.00000000000006 (floating-point noise from font scaling),
 * it emits "NaN" into the d-string. We round manually here.
 */
const r = (v: number) => Math.round(v * 100) / 100;
const textToPath = (
	font: ReturnType<typeof parseFont>,
	text: string,
	x: number,
	y: number,
	fontSize: number
): string =>
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

const buildPng = async (): Promise<Buffer> => {
	const fontPath = path.join(
		process.cwd(),
		'static/demo-fonts/StudioGeometric-Regular.otf'
	);
	const buf = await fs.readFile(fontPath);
	const font = parseFont(
		buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
	);

	// Demo OTF has 26 glyphs: A C D E G H I M N O P R S T U + a e h n o s t + 0 1 2 + . , - !
	// Wordmark = "Patens" (the project name) at large size.
	// Specimen = "HONE THE TONE" + "studio geometric" at smaller sizes.
	const wordmarkPath = textToPath(font, 'PATENS', 80, 320, 220);
	const specimenPath = textToPath(font, 'STUDIO GEOMETRIC', 80, 420, 60);
	const tonePath = textToPath(font, 'HONE THE TONE.', 80, 500, 60);

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
		<rect width="${W}" height="${H}" fill="${BG}" />

		<!-- Swiss Red corner mark -->
		<rect x="${W - 80 - 56}" y="72" width="56" height="6" fill="${SWISS_RED}" />

		<!-- top-left eyebrow -->
		<text x="80" y="110" font-family="-apple-system,system-ui,Helvetica,Arial,sans-serif" font-size="20" letter-spacing="5" fill="${MUTED}">PATENS · BROWSER-NATIVE TYPE DESIGN</text>

		<!-- wordmark -->
		<path d="${wordmarkPath}" fill="${FG}" />

		<!-- type specimen -->
		<path d="${specimenPath}" fill="${FG}" />
		<path d="${tonePath}" fill="${FG}" />

		<!-- subtitle -->
		<text x="80" y="565" font-family="-apple-system,system-ui,Helvetica,Arial,sans-serif" font-size="22" fill="${MUTED}">SvelteKit · 94-code audit · variable fonts · open source · MIT</text>
	</svg>`;

	const resvg = new Resvg(svg, {
		fitTo: { mode: 'width', value: W },
		font: { loadSystemFonts: true, defaultFontFamily: 'sans-serif' }
	});
	return resvg.render().asPng();
};

export const GET: RequestHandler = async () => {
	if (!cachedPng) cachedPng = await buildPng();
	return new Response(new Uint8Array(cachedPng), {
		headers: {
			'Content-Type': 'image/png',
			'Cache-Control': 'public, max-age=86400, s-maxage=86400, immutable'
		}
	});
};

export const prerender = true;
