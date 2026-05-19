import { describe, it, expect } from 'vitest';
import { aglfnName } from './aglfn';

describe('aglfnName', () => {
	it('returns the literal character for Basic Latin uppercase letters', () => {
		expect(aglfnName(0x0041)).toBe('A');
		expect(aglfnName(0x005a)).toBe('Z');
	});

	it('returns the literal character for Basic Latin lowercase letters', () => {
		expect(aglfnName(0x0061)).toBe('a');
		expect(aglfnName(0x007a)).toBe('z');
	});

	it('returns AGLFN names for ASCII digits', () => {
		expect(aglfnName(0x0030)).toBe('zero');
		expect(aglfnName(0x0039)).toBe('nine');
	});

	it('returns AGLFN names for common punctuation', () => {
		expect(aglfnName(0x0020)).toBe('space');
		expect(aglfnName(0x002e)).toBe('period');
		expect(aglfnName(0x002c)).toBe('comma');
	});

	it('derives Latin Extended accented names by pattern', () => {
		expect(aglfnName(0x00c1)).toBe('Aacute');
		expect(aglfnName(0x00e9)).toBe('eacute');
	});

	it('falls back to uniXXXX for unmapped codepoints', () => {
		// U+0301 (combining acute) is not in the basic AGLFN — should fall through
		expect(aglfnName(0x0301)).toMatch(/^uni0301$/);
	});

	it('pads the uniXXXX hex to 4 digits', () => {
		expect(aglfnName(0x0050)).not.toMatch(/^uni/); // P → literal "P"
		// Pick a codepoint that's definitely not in any map and ≤ 0x0FFF
		const result = aglfnName(0x0a00);
		expect(result).toBe('uni0A00');
	});
});
