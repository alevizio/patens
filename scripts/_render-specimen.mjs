// Specimen render — uses our safe path-data converter (bypasses
// opentype.js's broken toPathData on near-integer floats).
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

const W = 1280;
const H = 820;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
	<rect width="${W}" height="${H}" fill="#FAF6EE" />
	<text x="60" y="60" font-family="-apple-system,sans-serif" font-size="14" letter-spacing="3" fill="#888">STUDIO GEOMETRIC · DEMO TYPEFACE — 26 GLYPHS</text>
	<path d="${pathD('PATENS', 60, 240, 200)}" fill="#1B1611" />
	<path d="${pathD('STUDIO GEOMETRIC', 60, 360, 92)}" fill="#1B1611" />
	<path d="${pathD('HONE THE TONE.', 60, 460, 76)}" fill="#1B1611" />
	<path d="${pathD('hats one note. eat. on.', 60, 560, 72)}" fill="#1B1611" />
	<path d="${pathD('0 1 2 - , . !', 60, 670, 76)}" fill="#1B1611" />
	<text x="60" y="${H - 30}" font-family="-apple-system,sans-serif" font-size="13" fill="#888">All glyphs in the demo OTF. Production rendering by browsers; this script uses a custom path converter to dodge opentype.js's toPathData decimal-cache bug.</text>
</svg>`;

const png = new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
await fs.writeFile('/tmp/specimen.png', png);
console.log(`Wrote /tmp/specimen.png (${(png.byteLength / 1024).toFixed(1)} KB)`);
