/**
 * Curated default glyph set for new projects.
 * Returns Unicode codepoints with PostScript names and category metadata.
 */

export type GlyphCategory =
	| 'uppercase'
	| 'lowercase'
	| 'figure'
	| 'punctuation'
	| 'symbol'
	| 'mark'
	| 'composite';

export type GlyphSpec = {
	codepoint: number;
	name: string;
	category: GlyphCategory;
	/** For composites: base codepoint + diacritic codepoint to render */
	composite?: { base: number; mark: number };
};

const range = (start: number, end: number, prefix = ''): GlyphSpec[] => {
	const out: GlyphSpec[] = [];
	for (let cp = start; cp <= end; cp++) {
		out.push({
			codepoint: cp,
			name: (prefix ? prefix : '') + String.fromCodePoint(cp),
			category: cp >= 0x0030 && cp <= 0x0039 ? 'figure' : cp >= 0x0061 ? 'lowercase' : 'uppercase'
		});
	}
	return out;
};

const punctuation: GlyphSpec[] = [
	{ codepoint: 0x0020, name: 'space', category: 'symbol' },
	{ codepoint: 0x002e, name: 'period', category: 'punctuation' },
	{ codepoint: 0x002c, name: 'comma', category: 'punctuation' },
	{ codepoint: 0x003b, name: 'semicolon', category: 'punctuation' },
	{ codepoint: 0x003a, name: 'colon', category: 'punctuation' },
	{ codepoint: 0x0021, name: 'exclam', category: 'punctuation' },
	{ codepoint: 0x003f, name: 'question', category: 'punctuation' },
	{ codepoint: 0x0027, name: 'quotesingle', category: 'punctuation' },
	{ codepoint: 0x0022, name: 'quotedbl', category: 'punctuation' },
	{ codepoint: 0x2018, name: 'quoteleft', category: 'punctuation' },
	{ codepoint: 0x2019, name: 'quoteright', category: 'punctuation' },
	{ codepoint: 0x201c, name: 'quotedblleft', category: 'punctuation' },
	{ codepoint: 0x201d, name: 'quotedblright', category: 'punctuation' },
	{ codepoint: 0x0028, name: 'parenleft', category: 'punctuation' },
	{ codepoint: 0x0029, name: 'parenright', category: 'punctuation' },
	{ codepoint: 0x005b, name: 'bracketleft', category: 'punctuation' },
	{ codepoint: 0x005d, name: 'bracketright', category: 'punctuation' },
	{ codepoint: 0x002d, name: 'hyphen', category: 'punctuation' },
	{ codepoint: 0x2013, name: 'endash', category: 'punctuation' },
	{ codepoint: 0x2014, name: 'emdash', category: 'punctuation' },
	{ codepoint: 0x002f, name: 'slash', category: 'punctuation' },
	{ codepoint: 0x0026, name: 'ampersand', category: 'symbol' },
	{ codepoint: 0x0040, name: 'at', category: 'symbol' },
	{ codepoint: 0x0023, name: 'numbersign', category: 'symbol' },
	{ codepoint: 0x002a, name: 'asterisk', category: 'punctuation' },
	{ codepoint: 0x0025, name: 'percent', category: 'symbol' },
	{ codepoint: 0x002b, name: 'plus', category: 'symbol' }
];

const marks: GlyphSpec[] = [
	{ codepoint: 0x0301, name: 'acutecomb', category: 'mark' },
	{ codepoint: 0x0300, name: 'gravecomb', category: 'mark' },
	{ codepoint: 0x0308, name: 'dieresiscomb', category: 'mark' },
	{ codepoint: 0x0302, name: 'circumflexcomb', category: 'mark' },
	{ codepoint: 0x0303, name: 'tildecomb', category: 'mark' },
	{ codepoint: 0x030a, name: 'ringcomb', category: 'mark' },
	{ codepoint: 0x0327, name: 'cedillacomb', category: 'mark' }
];

const compositeDef = (
	codepoint: number,
	name: string,
	base: number,
	mark: number
): GlyphSpec => ({
	codepoint,
	name,
	category: 'composite',
	composite: { base, mark }
});

const composites: GlyphSpec[] = [
	compositeDef(0x00e1, 'aacute', 0x0061, 0x0301),
	compositeDef(0x00e0, 'agrave', 0x0061, 0x0300),
	compositeDef(0x00e4, 'adieresis', 0x0061, 0x0308),
	compositeDef(0x00e2, 'acircumflex', 0x0061, 0x0302),
	compositeDef(0x00e3, 'atilde', 0x0061, 0x0303),
	compositeDef(0x00e5, 'aring', 0x0061, 0x030a),
	compositeDef(0x00e9, 'eacute', 0x0065, 0x0301),
	compositeDef(0x00e8, 'egrave', 0x0065, 0x0300),
	compositeDef(0x00eb, 'edieresis', 0x0065, 0x0308),
	compositeDef(0x00ea, 'ecircumflex', 0x0065, 0x0302),
	compositeDef(0x00ed, 'iacute', 0x0069, 0x0301),
	compositeDef(0x00ec, 'igrave', 0x0069, 0x0300),
	compositeDef(0x00ef, 'idieresis', 0x0069, 0x0308),
	compositeDef(0x00ee, 'icircumflex', 0x0069, 0x0302),
	compositeDef(0x00f3, 'oacute', 0x006f, 0x0301),
	compositeDef(0x00f2, 'ograve', 0x006f, 0x0300),
	compositeDef(0x00f6, 'odieresis', 0x006f, 0x0308),
	compositeDef(0x00f4, 'ocircumflex', 0x006f, 0x0302),
	compositeDef(0x00f5, 'otilde', 0x006f, 0x0303),
	compositeDef(0x00fa, 'uacute', 0x0075, 0x0301),
	compositeDef(0x00f9, 'ugrave', 0x0075, 0x0300),
	compositeDef(0x00fc, 'udieresis', 0x0075, 0x0308),
	compositeDef(0x00fb, 'ucircumflex', 0x0075, 0x0302),
	compositeDef(0x00f1, 'ntilde', 0x006e, 0x0303),
	compositeDef(0x00e7, 'ccedilla', 0x0063, 0x0327)
];

/** Default Latin starter set used when creating a new project. */
export const DEFAULT_GLYPH_SET: GlyphSpec[] = [
	...punctuation,
	...range(0x0030, 0x0039), // 0–9
	...range(0x0041, 0x005a), // A–Z
	...range(0x0061, 0x007a), // a–z
	...marks,
	...composites
];

export const CATEGORY_LABELS: Record<GlyphCategory, string> = {
	uppercase: 'Uppercase',
	lowercase: 'Lowercase',
	figure: 'Figures',
	punctuation: 'Punctuation',
	symbol: 'Symbols',
	mark: 'Combining marks',
	composite: 'Composites'
};

export const CATEGORY_ORDER: GlyphCategory[] = [
	'uppercase',
	'lowercase',
	'figure',
	'punctuation',
	'symbol',
	'mark',
	'composite'
];

export const groupByCategory = (specs: GlyphSpec[]): Map<GlyphCategory, GlyphSpec[]> => {
	const map = new Map<GlyphCategory, GlyphSpec[]>();
	for (const cat of CATEGORY_ORDER) map.set(cat, []);
	for (const spec of specs) {
		const list = map.get(spec.category);
		if (list) list.push(spec);
	}
	return map;
};
