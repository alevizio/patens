import { describe, it, expect } from 'vitest';
import { normalizeEmail, waitlistKey } from './waitlist';

describe('normalizeEmail', () => {
	it('trims + lowercases a valid address', () => {
		expect(normalizeEmail('  Hello@Studio.COM ')).toBe('hello@studio.com');
	});

	it('accepts ordinary addresses', () => {
		expect(normalizeEmail('a.b+tag@sub.example.io')).toBe('a.b+tag@sub.example.io');
	});

	it('rejects malformed input', () => {
		expect(normalizeEmail('no-at-sign')).toBeNull();
		expect(normalizeEmail('no@dot')).toBeNull();
		expect(normalizeEmail('two spaces@x.com')).toBeNull();
		expect(normalizeEmail('@x.com')).toBeNull();
		expect(normalizeEmail('a@')).toBeNull();
		expect(normalizeEmail('')).toBeNull();
		expect(normalizeEmail('   ')).toBeNull();
	});

	it('rejects non-strings', () => {
		expect(normalizeEmail(null)).toBeNull();
		expect(normalizeEmail(undefined)).toBeNull();
		expect(normalizeEmail(42)).toBeNull();
		expect(normalizeEmail({})).toBeNull();
	});

	it('rejects an over-long address (>254 chars)', () => {
		const long = 'a'.repeat(250) + '@x.com';
		expect(normalizeEmail(long)).toBeNull();
	});
});

describe('waitlistKey', () => {
	it('produces a stable hashed blob path', () => {
		const k = waitlistKey('hello@studio.com');
		expect(k).toMatch(/^waitlist\/[0-9a-f]{64}\.json$/);
		expect(waitlistKey('hello@studio.com')).toBe(k);
	});

	it('maps distinct emails to distinct keys', () => {
		expect(waitlistKey('a@x.com')).not.toBe(waitlistKey('b@x.com'));
	});

	it('does not leak the raw address into the key', () => {
		expect(waitlistKey('secret@studio.com')).not.toContain('secret');
	});
});
