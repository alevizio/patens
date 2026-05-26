/**
 * Ask Claude to explain an audit code in plain language, with the
 * specific issue + glyph context. Surfaced as an opt-in "Explain (AI)"
 * button on the audit page next to each issue, gated on the user
 * having an Anthropic API key in Settings.
 *
 * Cost guard:
 *   - Hard token cap (max_tokens=400) keeps the response readable +
 *     bounds API spend per click at ~$0.002 worst-case (Sonnet 4.6).
 *   - In-memory cache keyed by code so the same explanation isn't paid
 *     for twice in a session.
 *   - The "Explain" button is opt-in per-click; we never auto-call.
 *
 * The result is a 2–4 paragraph explanation written for a designer who
 * may not be familiar with the underlying OpenType / font-engineering
 * concept. Claude is told the canonical describeAuditCode() blurb so
 * the answer matches the editor's voice + doesn't drift into AI
 * generic-speak.
 */

import { askClaude, AnthropicError } from './anthropic';
import { describeAuditCode } from '$lib/font/audit';

const cache = new Map<string, string>();

export const explainAuditCode = async (
	code: string,
	context: { sampleMessage?: string; glyphName?: string }
): Promise<string> => {
	const cacheKey = `${code}|${context.sampleMessage ?? ''}|${context.glyphName ?? ''}`;
	const hit = cache.get(cacheKey);
	if (hit) return hit;

	const dictionary = describeAuditCode(code) ?? '(no curated description in Patens)';
	const lines: string[] = [
		`A user of Patens (a browser-native type design tool) is looking at audit code "${code}".`,
		`Patens's own one-line description of this code: "${dictionary}"`
	];
	if (context.sampleMessage) {
		lines.push(`The specific message they see: "${context.sampleMessage}"`);
	}
	if (context.glyphName) {
		lines.push(`The affected glyph (one of possibly many): ${context.glyphName}`);
	}

	const system =
		'You are a type-design assistant inside Patens. Explain audit codes to designers in plain English — they may not know OpenType jargon. Two to four short paragraphs. Cover: what this code means, why it matters for shipped fonts, and one concrete thing the user can do about it. Be specific and pragmatic, not abstract. Do not refer to the prompt or your role. Do not apologize. No markdown.';

	let result;
	try {
		result = await askClaude({
			system,
			messages: [{ role: 'user', content: lines.join('\n') }],
			maxTokens: 400
		});
	} catch (e) {
		if (e instanceof AnthropicError) throw e;
		throw new AnthropicError(`Explain failed: ${e instanceof Error ? e.message : String(e)}`);
	}

	const text = result.text.trim();
	cache.set(cacheKey, text);
	return text;
};
