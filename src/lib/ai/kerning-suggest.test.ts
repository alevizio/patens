import { describe, it, expect } from 'vitest';
import {
	parseKerningProposal,
	sideLabel,
	seedPairsFromDrawn,
	CANONICAL_LATIN_PAIRS
} from './kerning-suggest-core';

describe('parseKerningProposal', () => {
	it('parses a clean JSON response', () => {
		const raw = JSON.stringify({
			reasoning: 'Standard cap-cap problem-pair tightening.',
			pairs: [
				{ left: 65, right: 86, value: -60, confidence: 'high' },
				{ left: 84, right: 111, value: -50, confidence: 'high' }
			]
		});
		const out = parseKerningProposal(raw);
		expect(out.pairs).toHaveLength(2);
		expect(out.pairs[0]).toEqual({
			left: 65,
			right: 86,
			value: -60,
			confidence: 'high'
		});
	});

	it('strips ```json fences', () => {
		const raw =
			'```json\n{ "reasoning": "x", "pairs": [{ "left": 65, "right": 86, "value": -50, "confidence": "high" }] }\n```';
		const out = parseKerningProposal(raw);
		expect(out.pairs[0].value).toBe(-50);
	});

	it('extracts JSON from prose-wrapped response', () => {
		const raw =
			'Here are the suggestions:\n{ "reasoning": "x", "pairs": [{ "left": 65, "right": 86, "value": -50, "confidence": "medium" }] }\nLet me know!';
		const out = parseKerningProposal(raw);
		expect(out.pairs).toHaveLength(1);
	});

	it('rounds non-integer values to integers', () => {
		const raw =
			'{ "reasoning": "", "pairs": [{ "left": 65, "right": 86, "value": -57.4, "confidence": "high" }] }';
		const out = parseKerningProposal(raw);
		expect(out.pairs[0].value).toBe(-57);
	});

	it('defaults confidence to medium when missing or invalid', () => {
		const raw =
			'{ "reasoning": "", "pairs": [{ "left": 65, "right": 86, "value": -50, "confidence": "absolute" }] }';
		const out = parseKerningProposal(raw);
		expect(out.pairs[0].confidence).toBe('medium');
	});

	it('drops malformed pairs but keeps valid ones', () => {
		const raw = JSON.stringify({
			reasoning: '',
			pairs: [
				{ left: 65, right: 86, value: -60, confidence: 'high' },
				{ left: 'not-a-codepoint-or-class', right: 86 }, // missing value
				{ left: null, right: 86, value: -50, confidence: 'high' } // null left
			]
		});
		const out = parseKerningProposal(raw);
		expect(out.pairs).toHaveLength(1);
		expect(out.pairs[0].left).toBe(65);
	});

	it('accepts class-name sides', () => {
		const raw = JSON.stringify({
			reasoning: '',
			pairs: [
				{ left: '@A_left', right: '@V_right', value: -60, confidence: 'high' }
			]
		});
		const out = parseKerningProposal(raw);
		expect(out.pairs[0].left).toBe('@A_left');
		expect(out.pairs[0].right).toBe('@V_right');
	});

	it('throws on unparseable JSON', () => {
		expect(() => parseKerningProposal('totally not json')).toThrow();
	});

	it('throws when pairs is missing', () => {
		expect(() =>
			parseKerningProposal('{ "reasoning": "x" }')
		).toThrow(/pairs/);
	});
});

describe('sideLabel', () => {
	it('returns the character for a printable codepoint', () => {
		expect(sideLabel(0x41)).toBe('A');
		expect(sideLabel(0x6f)).toBe('o');
	});

	it('returns the class name as-is for a class-side', () => {
		expect(sideLabel('@A_left')).toBe('@A_left');
	});

	it('falls back to U+XXXX for non-printable codepoints', () => {
		expect(sideLabel(0x07)).toBe('U+0007');
	});
});

describe('seedPairsFromDrawn', () => {
	it('returns only canonical pairs where both sides are drawn', () => {
		const drawn = new Set([0x41, 0x56, 0x54]); // A, V, T
		const pairs = seedPairsFromDrawn(drawn);
		// Should include AV and TA (both drawn) but not AT (A and T drawn — IS in list)
		// AV in canonical: yes. AT in canonical: yes. TA in canonical: yes.
		expect(pairs).toContainEqual([0x41, 0x56]);
		expect(pairs).toContainEqual([0x41, 0x54]);
		expect(pairs).toContainEqual([0x54, 0x41]);
	});

	it('returns empty list when no canonical pairs are fully drawn', () => {
		const drawn = new Set([0x41]); // only A
		expect(seedPairsFromDrawn(drawn)).toEqual([]);
	});

	it('CANONICAL_LATIN_PAIRS contains the AV classical pair', () => {
		expect(CANONICAL_LATIN_PAIRS).toContainEqual([0x41, 0x56]);
	});
});
