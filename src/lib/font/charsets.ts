/**
 * Optional script packs that extend the curated default Latin set.
 * The user can opt in to Greek / Cyrillic / Vietnamese on the home page;
 * each pack adds the corresponding range plus standard composite definitions.
 */

import type { GlyphSpec } from './glyph-set';

const range = (start: number, end: number, category: GlyphSpec['category']): GlyphSpec[] => {
	const out: GlyphSpec[] = [];
	for (let cp = start; cp <= end; cp++) {
		out.push({ codepoint: cp, name: `uni${cp.toString(16).toUpperCase().padStart(4, '0')}`, category });
	}
	return out;
};

/** Greek lowercase α–ω + uppercase Α–Ω */
export const GREEK_PACK: GlyphSpec[] = [
	...range(0x0391, 0x03a9, 'uppercase').filter((g) => g.codepoint !== 0x03a2),
	...range(0x03b1, 0x03c9, 'lowercase'),
	// Tonos + dialytika composites would need their own glyphs; defer
	{ codepoint: 0x0386, name: 'Alphatonos', category: 'composite', composite: { base: 0x0391, mark: 0x0301 } },
	{ codepoint: 0x0388, name: 'Epsilontonos', category: 'composite', composite: { base: 0x0395, mark: 0x0301 } },
	{ codepoint: 0x0389, name: 'Etatonos', category: 'composite', composite: { base: 0x0397, mark: 0x0301 } },
	{ codepoint: 0x038a, name: 'Iotatonos', category: 'composite', composite: { base: 0x0399, mark: 0x0301 } },
	{ codepoint: 0x038c, name: 'Omicrontonos', category: 'composite', composite: { base: 0x039f, mark: 0x0301 } },
	{ codepoint: 0x038e, name: 'Upsilontonos', category: 'composite', composite: { base: 0x03a5, mark: 0x0301 } },
	{ codepoint: 0x038f, name: 'Omegatonos', category: 'composite', composite: { base: 0x03a9, mark: 0x0301 } }
];

/** Cyrillic core: А–Я + а–я */
export const CYRILLIC_PACK: GlyphSpec[] = [
	...range(0x0410, 0x042f, 'uppercase'),
	...range(0x0430, 0x044f, 'lowercase'),
	// Ё ё (the ones not covered by the contiguous A-Я range)
	{ codepoint: 0x0401, name: 'afii10023', category: 'uppercase' },
	{ codepoint: 0x0451, name: 'afii10071', category: 'lowercase' }
];

/** Vietnamese composites (uses Latin + tone marks) */
export const VIETNAMESE_PACK: GlyphSpec[] = [
	{ codepoint: 0x1ea1, name: 'adotbelow', category: 'composite', composite: { base: 0x0061, mark: 0x0323 } },
	{ codepoint: 0x1ea3, name: 'ahookabove', category: 'composite', composite: { base: 0x0061, mark: 0x0309 } },
	{ codepoint: 0x1ea5, name: 'acircumflexacute', category: 'composite', composite: { base: 0x00e2, mark: 0x0301 } },
	{ codepoint: 0x1ea7, name: 'acircumflexgrave', category: 'composite', composite: { base: 0x00e2, mark: 0x0300 } },
	{ codepoint: 0x1ea9, name: 'acircumflexhookabove', category: 'composite', composite: { base: 0x00e2, mark: 0x0309 } },
	{ codepoint: 0x1eab, name: 'acircumflextilde', category: 'composite', composite: { base: 0x00e2, mark: 0x0303 } },
	{ codepoint: 0x1ead, name: 'acircumflexdotbelow', category: 'composite', composite: { base: 0x00e2, mark: 0x0323 } },
	{ codepoint: 0x0103, name: 'abreve', category: 'composite', composite: { base: 0x0061, mark: 0x0306 } },
	{ codepoint: 0x1eaf, name: 'abreveacute', category: 'composite', composite: { base: 0x0103, mark: 0x0301 } },
	{ codepoint: 0x1eb1, name: 'abrevegrave', category: 'composite', composite: { base: 0x0103, mark: 0x0300 } },
	{ codepoint: 0x1eb3, name: 'abrevehookabove', category: 'composite', composite: { base: 0x0103, mark: 0x0309 } },
	{ codepoint: 0x1eb5, name: 'abrevetilde', category: 'composite', composite: { base: 0x0103, mark: 0x0303 } },
	{ codepoint: 0x1eb7, name: 'abrevedotbelow', category: 'composite', composite: { base: 0x0103, mark: 0x0323 } },
	{ codepoint: 0x1ec7, name: 'ecircumflexdotbelow', category: 'composite', composite: { base: 0x00ea, mark: 0x0323 } },
	{ codepoint: 0x1ee3, name: 'ohorndotbelow', category: 'composite', composite: { base: 0x006f, mark: 0x031b } },
	{ codepoint: 0x1ee5, name: 'udotbelow', category: 'composite', composite: { base: 0x0075, mark: 0x0323 } },
	{ codepoint: 0x0111, name: 'dcroat', category: 'lowercase' },
	{ codepoint: 0x0110, name: 'Dcroat', category: 'uppercase' }
];

export type ScriptPack = {
	id: 'greek' | 'cyrillic' | 'vietnamese';
	label: string;
	description: string;
	glyphs: GlyphSpec[];
};

export const SCRIPT_PACKS: ScriptPack[] = [
	{
		id: 'greek',
		label: 'Greek',
		description: 'Α–Ω + α–ω + 7 tonos composites',
		glyphs: GREEK_PACK
	},
	{
		id: 'cyrillic',
		label: 'Cyrillic',
		description: 'А–Я + а–я + Ё ё',
		glyphs: CYRILLIC_PACK
	},
	{
		id: 'vietnamese',
		label: 'Vietnamese',
		description: 'Latin tone-mark composites + đ Đ',
		glyphs: VIETNAMESE_PACK
	}
];
