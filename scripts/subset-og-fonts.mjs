#!/usr/bin/env node
/**
 * Subset Inter-500 + Lora-600 to the characters Patens's OG-image
 * renderer actually uses.
 *
 * The OG render path (src/routes/og/[id]/+server.ts) draws four kinds
 * of text:
 *   - Family name (any Latin/Cyrillic/Greek the user typed)
 *   - Style name (Regular, Bold, etc.)
 *   - Designer name (any Latin name)
 *   - Glyph count + version (digits + dots)
 *
 * The full Inter ships 325 KB; full Lora 132 KB. After subsetting to
 * Latin Basic + Latin-1 Supplement + Latin Extended-A + a few special
 * punctuation runs, Inter shrinks to ~25 KB and Lora to ~12 KB.
 *
 * The subset still covers every Latin language and the common
 * European accented characters (Á É Í Ó Ú Ñ Ç Ø Æ etc.). Cyrillic +
 * Greek family names will fall back to system serif/sans in the OG
 * image — acceptable trade-off given <1% of users have non-Latin
 * family names.
 *
 * Run: node scripts/subset-og-fonts.mjs
 */

import { readFile, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import subset from 'subset-font';

const ROOT = new URL('..', import.meta.url).pathname;
const OG_DIR = join(ROOT, 'src/lib/og-fonts');

// Unicode coverage:
//   - U+0020..U+007E  ASCII printable (Latin Basic)
//   - U+00A0..U+00FF  Latin-1 Supplement (¡ © ® ñ ø etc.)
//   - U+0100..U+017F  Latin Extended-A (Ą Ć Ę etc., covers Polish, Czech, etc.)
//   - U+2010..U+2027  General Punctuation: en-dash, em-dash, smart quotes
//   - U+2030..U+2044  Per-mille, fractions
//   - U+20AC          Euro
//   - U+2122          ™
const ranges = [
	[0x0020, 0x007e],
	[0x00a0, 0x00ff],
	[0x0100, 0x017f],
	[0x2010, 0x2027],
	[0x2030, 0x2044],
	[0x20ac, 0x20ac],
	[0x2122, 0x2122]
];
const text = ranges
	.flatMap(([lo, hi]) => {
		const out = [];
		for (let cp = lo; cp <= hi; cp++) out.push(String.fromCodePoint(cp));
		return out;
	})
	.join('');

const targets = [
	{ name: 'Inter-500.ttf' },
	{ name: 'Lora-600.ttf' }
];

console.log(`Subsetting OG fonts to ${text.length} characters of Latin coverage…`);

for (const t of targets) {
	const path = join(OG_DIR, t.name);
	const before = await readFile(path);
	const subsetted = await subset(before, text, {
		targetFormat: 'truetype'
	});
	await writeFile(path, subsetted);
	const beforeSize = before.byteLength;
	const afterSize = subsetted.byteLength;
	const pct = ((1 - afterSize / beforeSize) * 100).toFixed(0);
	console.log(
		`  ${t.name.padEnd(20)} ${formatBytes(beforeSize)} → ${formatBytes(afterSize)}  (-${pct}%)`
	);
}

function formatBytes(n) {
	if (n < 1024) return `${n} B`;
	if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
	return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
