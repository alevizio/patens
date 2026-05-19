/**
 * Dynamic OG image — Font Studio's own demo OTF for the wordmark + type sample.
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
import opentype from 'opentype.js';
import { Resvg } from '@resvg/resvg-js';

let cachedPng: Buffer | null = null;

const W = 1200;
const H = 630;
const BG = '#FAF6EE';
const FG = '#1B1611';
const MUTED = '#6B6258';
const SUBTLE = '#8C8378';

/** Render `text` via opentype.js to a single SVG path d-string. */
// opentype.js Path exposes toPathData() at runtime but our local .d.ts doesn't
// declare it; narrow inline rather than editing the global type for this one site.
type PathWithToPathData = { toPathData(decimals: number): string };

const textToPath = (
	font: ReturnType<typeof opentype.parse>,
	text: string,
	x: number,
	y: number,
	fontSize: number
): string => (font.getPath(text, x, y, fontSize) as unknown as PathWithToPathData).toPathData(2);

const buildPng = async (): Promise<Buffer> => {
	const fontPath = path.join(
		process.cwd(),
		'static/demo-fonts/StudioGeometric-Regular.otf'
	);
	const buf = await fs.readFile(fontPath);
	const font = opentype.parse(
		buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
	);

	// All four display strings use only glyphs the demo OTF actually contains
	// (H, O, T, I, E, N, o, n, space). Anything else would render as missing.
	const hnPath = textToPath(font, 'Hn', 80, 470, 360);
	const honePath = textToPath(font, 'HONE', 560, 360, 96);
	const tonePath = textToPath(font, 'TONE', 560, 480, 96);

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
		<rect width="${W}" height="${H}" fill="${BG}" />

		<!-- top-left eyebrow -->
		<text x="80" y="110" font-family="-apple-system,system-ui,Helvetica,Arial,sans-serif" font-size="20" letter-spacing="5" fill="${SUBTLE}">FONT STUDIO</text>

		<!-- wordmark -->
		<path d="${hnPath}" fill="${FG}" />

		<!-- type sample -->
		<path d="${honePath}" fill="${FG}" />
		<path d="${tonePath}" fill="${FG}" />

		<!-- subtitle -->
		<text x="80" y="560" font-family="-apple-system,system-ui,Helvetica,Arial,sans-serif" font-size="22" fill="${MUTED}">Sketch-first browser type editor · variable fonts · AI completion</text>
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
