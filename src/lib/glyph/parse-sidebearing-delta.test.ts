import { describe, it, expect } from 'vitest';
import { parseSidebearingDelta } from './parse-sidebearing-delta';

describe('parseSidebearingDelta', () => {
	it('parses a single value as both sides', () => {
		expect(parseSidebearingDelta('10')).toEqual({ dLsb: 10, dRsb: 10 });
	});

	it('parses a negative single value as both sides', () => {
		expect(parseSidebearingDelta('-20')).toEqual({ dLsb: -20, dRsb: -20 });
	});

	it('parses split form "10/-5" as separate deltas', () => {
		expect(parseSidebearingDelta('10/-5')).toEqual({ dLsb: 10, dRsb: -5 });
	});

	it('parses "-" on either side as skip', () => {
		expect(parseSidebearingDelta('-/5')).toEqual({ dLsb: null, dRsb: 5 });
		expect(parseSidebearingDelta('10/-')).toEqual({ dLsb: 10, dRsb: null });
	});

	it('trims whitespace around values and the separator', () => {
		expect(parseSidebearingDelta('  10  / -5 ')).toEqual({ dLsb: 10, dRsb: -5 });
	});

	it('returns null for an empty string', () => {
		expect(parseSidebearingDelta('')).toBeNull();
		expect(parseSidebearingDelta('   ')).toBeNull();
	});

	it('returns null when both sides are skipped', () => {
		expect(parseSidebearingDelta('-/-')).toBeNull();
	});

	it('returns null for non-numeric input', () => {
		expect(parseSidebearingDelta('abc')).toBeNull();
		expect(parseSidebearingDelta('10/abc')).toBeNull();
		expect(parseSidebearingDelta('abc/10')).toBeNull();
	});

	it('returns null for malformed split (more than one /)', () => {
		expect(parseSidebearingDelta('1/2/3')).toBeNull();
	});

	it('handles zero correctly (delta of 0 is valid)', () => {
		expect(parseSidebearingDelta('0')).toEqual({ dLsb: 0, dRsb: 0 });
		expect(parseSidebearingDelta('0/-10')).toEqual({ dLsb: 0, dRsb: -10 });
	});
});
