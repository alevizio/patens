/**
 * AI glyph suggestion — vector-output completion via Claude vision + structured
 * output + programmatic outline construction.
 *
 * SPIKE SCOPE: validates the architecture end-to-end without depending on a
 * generative vector model. The pipeline:
 *
 *   1. Render the user's drawn glyphs to a PNG mosaic (reuses glyphsToPng).
 *   2. Send to Claude with a strict JSON schema describing geometric primitives.
 *   3. Parse Claude's structured output.
 *   4. Construct BezierContour[] programmatically from the primitives.
 *
 * Limitations:
 *   - Covers ~60% of the Latin alphabet cleanly (letters that decompose into
 *     stems/bars/diagonals/ellipses). Q, &, @, S degrade.
 *   - Quality bounded by Claude's spatial reasoning over rendered glyphs.
 *   - When/if a real generative vector model becomes browser-deployable, only
 *     this file's requestGlyphProposal() swaps; the pure transforms in
 *     ./glyph-suggest-core.ts and the UI surface stay.
 *
 * Pure transforms live in ./glyph-suggest-core.ts so they're testable without
 * SvelteKit globals; this file is the impure outer layer.
 */

import type { FontMetrics, Glyph } from '$lib/font/types';
import { askClaude, glyphsToPng } from './anthropic';
import { parseProposal, type GlyphProposal } from './glyph-suggest-core';

export { proposalToContours, parseProposal } from './glyph-suggest-core';
export type { GlyphProposal, Stroke } from './glyph-suggest-core';

const codepointHex = (cp: number) =>
	`U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;

const buildSystemPrompt = (metrics: FontMetrics): string => `You are an expert type designer. The user is drawing a typeface in a browser editor and wants you to propose how to construct a missing letter using simple geometric primitives, in the same style as their existing drawn glyphs.

The font's metrics (in font units):
- units per em: ${metrics.unitsPerEm}
- ascender: ${metrics.ascender}
- descender: ${metrics.descender}
- cap height: ${metrics.capHeight}
- x-height: ${metrics.xHeight}

Y=0 is the baseline. Y positive is above the baseline. X=0 is the glyph's left sidebearing.

Output ONLY a JSON object matching this exact schema, no prose, no code fences:
{
  "codepoint": number,
  "reasoning": "1-2 sentences explaining how this letter relates to the user's existing glyphs in stroke weight, proportion, and style",
  "advanceWidth": number,
  "strokes": [
    // Use any combination of these primitive types:
    { "type": "stem", "x": number, "y1": number, "y2": number, "weight": number },        // vertical line
    { "type": "bar", "x1": number, "x2": number, "y": number, "weight": number },         // horizontal line
    { "type": "diagonal", "x1": number, "y1": number, "x2": number, "y2": number, "weight": number },
    { "type": "ellipse", "cx": number, "cy": number, "rx": number, "ry": number, "weight": number }
  ]
}

Examples:
- Uppercase E: left stem (0→capHeight) + top bar (top) + middle bar (midheight) + bottom bar (baseline).
- Uppercase O: a single "ellipse" stroke centered at capHeight/2.
- Uppercase A: two diagonals meeting at apex + one horizontal crossbar.

Match the user's stroke weight from their drawn glyphs. Use the cap height for uppercase letters, x-height for lowercase. Keep the letter readable and proportional to their existing set.`;

export const requestGlyphProposal = async (
	targetCodepoint: number,
	drawnGlyphs: Glyph[],
	metrics: FontMetrics
): Promise<GlyphProposal> => {
	if (drawnGlyphs.length === 0) {
		throw new Error('Need at least one drawn glyph to infer style.');
	}
	const character = String.fromCodePoint(targetCodepoint);
	const pngData = glyphsToPng(
		drawnGlyphs.map((g) => ({
			codepoint: g.codepoint,
			name: g.name,
			contours: g.contours
		})),
		{ ascender: metrics.ascender, descender: metrics.descender },
		96
	);
	if (!pngData) throw new Error('Failed to render reference glyphs.');

	const userText = `The reference image shows ${drawnGlyphs.length} glyph${
		drawnGlyphs.length === 1 ? '' : 's'
	} I have already drawn: ${drawnGlyphs.map((g) => String.fromCodePoint(g.codepoint)).join(' ')}.

Propose how to construct "${character}" (${codepointHex(targetCodepoint)}) in the same style.`;

	const out = await askClaude({
		system: buildSystemPrompt(metrics),
		messages: [
			{
				role: 'user',
				content: [
					{ type: 'text', text: userText },
					{
						type: 'image',
						source: { type: 'base64', media_type: 'image/png', data: pngData }
					}
				]
			}
		],
		maxTokens: 1500
	});

	return parseProposal(out.text, targetCodepoint);
};
