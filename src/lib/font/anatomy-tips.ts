/**
 * Per-glyph design tips drawn from font4.md's anatomy section, plus the
 * mainstream type-design references it cites (Cheng's *Designing Type* and
 * Noordzij's *The Stroke*). Surfaced contextually in the editor so a
 * beginner sees the right thing to watch for as they work on a specific
 * letter.
 *
 * Intentionally curated, not exhaustive — these are the "control glyphs"
 * and a handful of other letters with widely-agreed-upon construction
 * gotchas.
 */

export type AnatomyTip = {
	headline: string;
	body: string;
};

const TIPS: Record<number, AnatomyTip> = {
	0x0048: {
		// H
		headline: 'Stem rhythm anchor',
		body: 'Sets vertical-stem thickness and cap-height for the whole uppercase. Crossbar usually a touch above optical centre, slightly thinner than verticals.'
	},
	0x004f: {
		// O
		headline: 'Overshoot + symmetry',
		body: 'Round caps should reach ~2% past cap-height and below baseline so they appear aligned with flat caps. LSB and RSB equal.'
	},
	0x0056: {
		// V
		headline: 'Diagonal weight comp',
		body: 'Diagonals usually drawn slightly heavier than verticals to look equal. Watch the apex — sharpen or trap as needed to avoid clogging.'
	},
	0x004d: {
		// M
		headline: 'Splay + apex',
		body: 'Outer stems can be vertical or splayed. Apex can sit on baseline or hover. Each choice changes the whole sans/serif character.'
	},
	0x0057: {
		// W
		headline: 'Crossing valleys',
		body: 'Two V shapes share counters. Inner diagonals get reduced weight; valley apexes sit on baseline (usually).'
	},
	0x004b: {
		// K
		headline: 'Junction problem',
		body: 'Where the diagonals meet the stem is the single hardest junction in the alphabet. Most designers ink-trap or split the strokes.'
	},
	0x0041: {
		// A
		headline: 'Apex + crossbar',
		body: 'Crossbar typically sits at or just below middle of cap-height. Apex can be sharp, flat, or notched. Diagonal weight matches V/W.'
	},

	0x006e: {
		// n
		headline: 'Lowercase rhythm anchor',
		body: 'Sets the entire lowercase texture: stem width, arch shape, terminal, sidebearings. Every other lowercase reads against n.'
	},
	0x006f: {
		// o
		headline: 'Lowercase counter shape',
		body: 'Round lowercase also overshoots x-height and baseline. Stress (where strokes thin) defines whether the family reads as humanist, geometric, or transitional.'
	},
	0x0061: {
		// a
		headline: 'Double-storey or single?',
		body: 'Two-storey reads as text-friendly; single-storey reads as display/geometric. The bowl-to-counter ratio in the upper half is decisive.'
	},
	0x0065: {
		// e
		headline: 'Eye + crossbar',
		body: 'Crossbar height controls the eye size. Lower it for openness at small sizes; raise it for elegance at display.'
	},
	0x0073: {
		// s
		headline: 'Balanced spine',
		body: 'The trickiest lowercase. Upper bowl slightly smaller than lower bowl so it looks balanced — the lower one carries more visual weight.'
	},
	0x0063: {
		// c
		headline: 'Aperture',
		body: 'How open the curve is at the right controls text clarity (open = legible at small sizes) vs. display elegance (closed).'
	},
	0x0070: {
		// p
		headline: 'Descender + stem',
		body: 'Stem matches n/h/m. Bowl matches o\'s curve logic. Descender depth picks the line-spacing baseline for the whole family.'
	},
	0x0076: {
		// v
		headline: 'Diagonal weight + apex',
		body: 'Same comp as uppercase V at smaller scale. Lowercase apex usually flatter or notched to sit cleanly on baseline.'
	},
	0x0079: {
		// y
		headline: 'Descender junction',
		body: 'How the descender joins the diagonals (curved, straight, hooked) is a strong character cue.'
	},
	0x0066: {
		// f
		headline: 'Terminal + hook',
		body: 'Top terminal (ball, flat, ear) sets a lot of the family voice. Crossbar should align with the e/t crossbars.'
	},
	0x0067: {
		// g
		headline: 'Single or double-storey',
		body: 'Double-storey is the technical showpiece. Single-storey is friendlier and easier. Pick the one that matches a\'s storey count.'
	},
	0x0068: {
		// h
		headline: 'Twin of n',
		body: 'Stem + arch must exactly match n. Ascender depth matches b/d/k/l. Sidebearings: LSB matches n, RSB matches n.'
	},
	0x0042: {
		// B
		headline: 'Two bowls',
		body: 'Upper bowl is slightly smaller than lower — same optical-balance rule as lowercase s. Junction at the spine is delicate.'
	},
	0x0052: {
		// R
		headline: 'Leg junction',
		body: 'Leg can join the bowl, the spine, or split. Each choice rhymes (or doesn\'t) with K\'s junction.'
	},
	0x0053: {
		// S
		headline: 'Spine balance',
		body: 'Uppercase version of s. Upper curve a touch smaller than lower so the form sits visually.'
	},

	0x0030: {
		// 0 (zero)
		headline: 'Disambiguate from O',
		body: 'Narrower than O is the norm; some fonts add a slash (`zero` feature). Match figure height to numeral style (lining vs. oldstyle).'
	},
	0x0031: {
		// 1
		headline: 'Set numeral width',
		body: 'Often the narrowest figure — but in tabular figures, all digits use the same advance. Decide which the default is.'
	},

	0x002e: {
		// period
		headline: 'Punctuation weight',
		body: 'Decide square vs. round dot. Its weight propagates to colon, semicolon, ellipsis. Sits on baseline.'
	},
	0x002c: {
		// comma
		headline: 'Comma + quote rhyme',
		body: 'Should rhyme with ‘quoteright’ — same shape, lowered to baseline. Tail length affects rhythm in dense paragraphs.'
	}
};

export const tipFor = (codepoint: number): AnatomyTip | null => TIPS[codepoint] ?? null;
