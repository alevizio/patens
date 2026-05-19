/**
 * Pure transforms for the AI kerning-suggestion pipeline — no Svelte / no
 * Claude deps so they're unit-testable in Vitest.
 *
 * The impure outer layer (Claude API call + project-store wiring) lives in
 * ./kerning-suggest.ts.
 */

import type { KerningSide } from '$lib/font/types';

// Schema ---------------------------------------------------------------------

export type KerningSuggestion = {
	/** Codepoint or @class-name on the left. */
	left: KerningSide;
	/** Codepoint or @class-name on the right. */
	right: KerningSide;
	/** Suggested value in font units. Negative = pull together. */
	value: number;
	/** Claude's self-reported confidence — useful for the UI to gate one-click apply. */
	confidence: 'high' | 'medium' | 'low';
};

export type KerningProposal = {
	reasoning: string;
	pairs: KerningSuggestion[];
};

// Canonical problem-pair seed list — the universally-needs-kerning pairs from
// classical Latin typography. Used when the user hasn't enumerated their own
// pair list yet, so "AI suggest" still has something to work with.
export const CANONICAL_LATIN_PAIRS: Array<[number, number]> = [
	// Left-leaning + right-leaning combinations (the classics)
	[0x41, 0x56], [0x41, 0x57], [0x41, 0x59], [0x41, 0x54], // AV, AW, AY, AT
	[0x46, 0x41], [0x46, 0x6f], // FA, Fo
	[0x4c, 0x54], [0x4c, 0x56], [0x4c, 0x57], [0x4c, 0x59], // LT, LV, LW, LY
	[0x50, 0x41], [0x50, 0x65], [0x50, 0x6f], // PA, Pe, Po
	[0x52, 0x54], [0x52, 0x56], [0x52, 0x57], [0x52, 0x59], // RT, RV, RW, RY
	[0x54, 0x41], [0x54, 0x6f], [0x54, 0x72], [0x54, 0x75], // TA, To, Tr, Tu
	[0x54, 0x77], [0x54, 0x79], // Tw, Ty
	[0x56, 0x41], [0x56, 0x6f], [0x56, 0x65], // VA, Vo, Ve
	[0x57, 0x41], [0x57, 0x6f], [0x57, 0x65], // WA, Wo, We
	[0x59, 0x41], [0x59, 0x6f], [0x59, 0x65], [0x59, 0x75] // YA, Yo, Ye, Yu
];

// Parser ---------------------------------------------------------------------

/** Coerce Claude's response into a structured KerningProposal. */
export const parseKerningProposal = (raw: string): KerningProposal => {
	let body = raw.trim();
	const fence = body.match(/```(?:json)?\s*([\s\S]*?)```/);
	if (fence) body = fence[1].trim();
	if (!body.startsWith('{')) {
		const start = body.indexOf('{');
		const end = body.lastIndexOf('}');
		if (start === -1 || end === -1)
			throw new Error('No JSON object found in response.');
		body = body.slice(start, end + 1);
	}
	const parsed = JSON.parse(body) as Partial<KerningProposal>;
	if (!parsed || typeof parsed !== 'object')
		throw new Error('Parsed value is not an object.');
	if (!Array.isArray(parsed.pairs))
		throw new Error('Missing or invalid "pairs" array.');
	const pairs: KerningSuggestion[] = parsed.pairs
		.filter(
			(p): p is KerningSuggestion =>
				p != null &&
				(typeof p.left === 'number' || typeof p.left === 'string') &&
				(typeof p.right === 'number' || typeof p.right === 'string') &&
				typeof p.value === 'number' &&
				Number.isFinite(p.value)
		)
		.map((p) => ({
			left: p.left,
			right: p.right,
			// Clamp to a sane font-units range. Designers occasionally use values
			// outside ±500 but anything beyond ±1000 is almost certainly a model
			// hallucination, not a real suggestion.
			value: Math.max(-1000, Math.min(1000, Math.round(p.value))),
			confidence:
				p.confidence === 'high' || p.confidence === 'medium' || p.confidence === 'low'
					? p.confidence
					: 'medium'
		}));
	return {
		reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
		pairs
	};
};

// Helpers --------------------------------------------------------------------

/** Human-readable label for a kerning side, e.g. 65 → "A", "@A_left" → "@A_left". */
export const sideLabel = (side: KerningSide): string => {
	if (typeof side === 'string') return side;
	return side > 0x20 && side < 0x10000
		? String.fromCodePoint(side)
		: `U+${side.toString(16).toUpperCase().padStart(4, '0')}`;
};

/** Compose canonical pair seed from a set of drawn codepoints. */
export const seedPairsFromDrawn = (
	drawnCodepoints: ReadonlySet<number>
): Array<[number, number]> =>
	CANONICAL_LATIN_PAIRS.filter(
		([l, r]) => drawnCodepoints.has(l) && drawnCodepoints.has(r)
	);
