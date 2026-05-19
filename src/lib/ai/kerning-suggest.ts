/**
 * AI kerning suggestion — text-only Claude integration. Claude has strong
 * typographic priors (AV needs tight kerning regardless of the specific
 * shapes), so we send the *list* of pairs + font metrics + currently-drawn
 * glyphs, not rendered images. This gives reliable structured output without
 * image-fidelity issues.
 *
 * Pure transforms in ./kerning-suggest-core.ts.
 */

import type { KerningPair, KerningSide, Project } from '$lib/font/types';
import { askClaude } from './anthropic';
import {
	parseKerningProposal,
	sideLabel,
	type KerningProposal
} from './kerning-suggest-core';

export {
	parseKerningProposal,
	seedPairsFromDrawn,
	sideLabel,
	CANONICAL_LATIN_PAIRS
} from './kerning-suggest-core';
export type { KerningProposal, KerningSuggestion } from './kerning-suggest-core';

const SYSTEM = `You are an expert type designer with deep knowledge of classical Latin spacing and kerning. The user has drawn a typeface in a browser editor and needs suggested kerning values for letter pairs.

For each pair, output a value in FONT UNITS (typically 1000 per em):
- Negative = pull together (tighter)
- Positive = push apart (looser)
- Zero = no kerning needed

Typical magnitudes for cap-cap problem pairs (AV, To, We, etc.): -40 to -80.
For minor adjustments: -10 to -30.
Loose kerning (rarely needed): +10 to +30.

You should produce the same value a senior type designer would for a competent text typeface — assume the user wants spacing in line with general-purpose typography, not display or experimental work.

Output ONLY a JSON object matching this exact schema. No prose, no code fences.

{
  "reasoning": "1-2 sentences summarizing the approach across the requested pairs",
  "pairs": [
    {
      "left": <codepoint number OR class name string starting with '@'>,
      "right": <codepoint number OR class name string starting with '@'>,
      "value": <signed integer in font units>,
      "confidence": "high" | "medium" | "low"
    }
  ]
}

Mark confidence:
- "high" for canonical pairs you have strong typographic basis for
- "medium" for context-dependent judgments
- "low" for pairs that may need designer review`;

const formatPairForPrompt = (
	pair: { left: KerningSide; right: KerningSide; existing?: number }
): string => {
	const l = sideLabel(pair.left);
	const r = sideLabel(pair.right);
	const existing = pair.existing && pair.existing !== 0 ? ` (currently ${pair.existing})` : '';
	const leftRef =
		typeof pair.left === 'number' ? `${pair.left}` : `"${pair.left}"`;
	const rightRef =
		typeof pair.right === 'number' ? `${pair.right}` : `"${pair.right}"`;
	return `  - "${l}${r}" — left=${leftRef}, right=${rightRef}${existing}`;
};

export const requestKerningProposal = async (
	pairs: Array<{ left: KerningSide; right: KerningSide; existing?: number }>,
	project: Project
): Promise<KerningProposal> => {
	if (pairs.length === 0) throw new Error('No pairs to evaluate.');

	const drawn = Object.values(project.glyphs)
		.filter((g) => g.contours.length > 0)
		.map((g) => String.fromCodePoint(g.codepoint))
		.filter((s) => s.length === 1 && s.codePointAt(0)! > 0x20);

	const m = project.metrics;
	const briefIntent = project.brief?.intent?.trim();
	const briefAudience = project.brief?.audience?.trim();

	const userText = [
		`Project: "${project.metadata.familyName}" / ${project.metadata.styleName}`,
		`Font metrics: UPM ${m.unitsPerEm}, cap height ${m.capHeight}, x-height ${m.xHeight}, default sidebearing ${m.defaultSidebearing}.`,
		`Drawn glyphs (${drawn.length}): ${drawn.join(' ') || '(none yet)'}.`,
		briefIntent ? `Brief intent: ${briefIntent}` : '',
		briefAudience ? `Audience: ${briefAudience}` : '',
		'',
		`Suggest kerning values for these pairs:`,
		...pairs.map(formatPairForPrompt),
		'',
		`Use the exact left/right values shown above in your output so the suggestions can be applied programmatically.`
	]
		.filter(Boolean)
		.join('\n');

	const out = await askClaude({
		system: SYSTEM,
		messages: [{ role: 'user', content: userText }],
		maxTokens: 2000
	});

	return parseKerningProposal(out.text);
};

/**
 * Build the input list for requestKerningProposal from a project's current
 * kerning pairs + canonical seed pairs derivable from drawn glyphs. Used by
 * the /spacing UI as the default "evaluate everything sensible" path.
 */
export const buildPairsToEvaluate = (
	project: Project
): Array<{ left: KerningSide; right: KerningSide; existing?: number }> => {
	const seen = new Set<string>();
	const out: Array<{ left: KerningSide; right: KerningSide; existing?: number }> = [];

	// 1. Existing pairs (whatever the user has set up)
	for (const k of project.kerning as KerningPair[]) {
		const key = `${String(k.left)}::${String(k.right)}`;
		seen.add(key);
		out.push({ left: k.left, right: k.right, existing: k.value });
	}

	// 2. Canonical pairs for drawn glyphs the user hasn't kerned yet
	const drawn = new Set(
		Object.values(project.glyphs)
			.filter((g) => g.contours.length > 0)
			.map((g) => g.codepoint)
	);
	// Import via the type-only path to avoid circular re-exports at runtime
	for (const [l, r] of (
		[
			[0x41, 0x56], [0x41, 0x57], [0x41, 0x59], [0x41, 0x54],
			[0x46, 0x41], [0x46, 0x6f],
			[0x4c, 0x54], [0x4c, 0x56], [0x4c, 0x57], [0x4c, 0x59],
			[0x50, 0x41], [0x50, 0x65], [0x50, 0x6f],
			[0x52, 0x54], [0x52, 0x56], [0x52, 0x57], [0x52, 0x59],
			[0x54, 0x41], [0x54, 0x6f], [0x54, 0x72], [0x54, 0x75], [0x54, 0x77], [0x54, 0x79],
			[0x56, 0x41], [0x56, 0x6f], [0x56, 0x65],
			[0x57, 0x41], [0x57, 0x6f], [0x57, 0x65],
			[0x59, 0x41], [0x59, 0x6f], [0x59, 0x65], [0x59, 0x75]
		] as Array<[number, number]>
	)) {
		const key = `${l}::${r}`;
		if (seen.has(key)) continue;
		if (!drawn.has(l) || !drawn.has(r)) continue;
		out.push({ left: l, right: r });
		seen.add(key);
	}
	return out;
};
