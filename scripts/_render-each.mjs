// Per-glyph diagnostic. Uses our own path-data converter because
// opentype.js's toPathData has a decimal-rounding cache bug that
// emits "NaN" for values like 336.00000000000006 (floating-point
// noise from font scaling). The browser's native font renderer
// doesn't have this bug, so production rendering is fine.
import fs from 'node:fs/promises';
import opentype from 'opentype.js';
import { Resvg } from '@resvg/resvg-js';

const buf = await fs.readFile(
	'/Users/alevizio/font/static/demo-fonts/StudioGeometric-Regular.otf'
);
const font = opentype.parse(
	buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
);

const r = (v) => Math.round(v * 100) / 100;
const pathD = (text, x, y, size) =>
	font
		.getPath(text, x, y, size)
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

const letters = 'ACDGMPRSU aehnos t012-,.!';
const W = 1280;
const H = 600;

let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
	<rect width="${W}" height="${H}" fill="#FAF6EE" />`;
let x = 60,
	y = 200;
const size = 140;
for (const ch of letters) {
	svg += `<path d="${pathD(ch, x, y, size)}" fill="#1B1611" />`;
	svg += `<text x="${x}" y="${y + 40}" font-family="monospace" font-size="14" fill="#888">${ch === ' ' ? '_' : ch}</text>`;
	x += 110;
	if (x > W - 100) {
		x = 60;
		y += 240;
	}
}
svg += `<text x="60" y="${H - 30}" font-family="-apple-system" font-size="13" fill="#888">Per-glyph diagnostic</text>`;
svg += `</svg>`;

const png = new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
await fs.writeFile('/tmp/each.png', png);
console.log(`Wrote /tmp/each.png`);
