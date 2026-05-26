// Onboarding glyph-target catalogues:
//
// CONTROL_GLYPHS — the canonical proportion/texture set every typeface
// should land first (n o H O a e s c p v y f g). 13 glyphs that set
// width, x-height behaviour, round/straight tension, and the texture
// of running text. Drawing these before scattering across the alphabet
// keeps the family coherent.
//
// useCaseTargets — codepoints that matter most given a chosen use case
// from the Brief (web UI / body text / data tables / code / display).
// Designed for the "Suggested next" picker on the editor — once you've
// got controls in, these put you on the path to a usable font fastest.

export const CONTROL_GLYPHS = [
	0x006e, // n
	0x006f, // o
	0x0048, // H
	0x004f, // O
	0x0061, // a
	0x0065, // e
	0x0073, // s
	0x0063, // c
	0x0070, // p
	0x0076, // v
	0x0079, // y
	0x0066, // f
	0x0067 // g
];

const DIGITS = [
	0x0030, 0x0031, 0x0032, 0x0033, 0x0034, 0x0035, 0x0036, 0x0037, 0x0038, 0x0039
];
const CORE_PUNCT = [
	0x002e, 0x002c, 0x003a, 0x003b, 0x0021, 0x003f, 0x0027, 0x0022
];
const WRAP_PUNCT = [0x0028, 0x0029, 0x002d, 0x002013, 0x2014];

export const useCaseTargets = (uc: string | undefined): number[] => {
	switch (uc) {
		case 'web-ui':
			return [...DIGITS, ...CORE_PUNCT];
		case 'body-text':
			return [...CORE_PUNCT, ...WRAP_PUNCT, ...DIGITS];
		case 'data-tables':
			return [...DIGITS, 0x002e, 0x002c, 0x0025, 0x0024];
		case 'code':
			return [...DIGITS, 0x005b, 0x005d, 0x007b, 0x007d, 0x002f, 0x005c, 0x003d];
		case 'display':
			return [];
		default:
			return [...DIGITS, ...CORE_PUNCT];
	}
};
