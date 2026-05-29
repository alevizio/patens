import { describe, it, expect, afterEach } from 'vitest';
import {
	alphaCookieValue,
	isAlphaCookieValid,
	checkPasscode,
	alphaGateEnabled,
	isAlphaProtectedPath
} from './alpha';

const secret = 'test-secret-must-be-32-chars-or-more-yes';
const passcode = 'open-sesame-2026';

describe('alphaCookieValue', () => {
	it('is deterministic for the same passcode + secret', () => {
		expect(alphaCookieValue(passcode, secret)).toBe(alphaCookieValue(passcode, secret));
	});

	it('changes when the passcode changes (rotation invalidates cookies)', () => {
		expect(alphaCookieValue(passcode, secret)).not.toBe(alphaCookieValue('different', secret));
	});

	it('changes when the signing secret changes', () => {
		expect(alphaCookieValue(passcode, secret)).not.toBe(
			alphaCookieValue(passcode, 'another-secret-of-equal-length-yes!!')
		);
	});

	it('emits a url-safe value (no +, /, or = padding)', () => {
		const v = alphaCookieValue(passcode, secret);
		expect(v).not.toMatch(/[+/=]/);
	});
});

describe('isAlphaCookieValid', () => {
	const good = alphaCookieValue(passcode, secret);

	it('accepts a cookie signed with the current passcode + secret', () => {
		expect(isAlphaCookieValid(good, passcode, secret)).toBe(true);
	});

	it('rejects a missing cookie', () => {
		expect(isAlphaCookieValid(undefined, passcode, secret)).toBe(false);
		expect(isAlphaCookieValid('', passcode, secret)).toBe(false);
	});

	it('rejects a forged / tampered value', () => {
		expect(isAlphaCookieValid('1', passcode, secret)).toBe(false);
		expect(isAlphaCookieValid(good.slice(0, -2) + 'xx', passcode, secret)).toBe(false);
	});

	it('rejects a cookie issued under a now-rotated passcode', () => {
		const old = alphaCookieValue('old-passcode', secret);
		expect(isAlphaCookieValid(old, passcode, secret)).toBe(false);
	});

	it('rejects a cookie signed with a different secret', () => {
		expect(isAlphaCookieValid(good, passcode, 'wrong-secret-of-equal-length-yes!!!!')).toBe(false);
	});
});

describe('checkPasscode', () => {
	it('matches the exact passcode', () => {
		expect(checkPasscode(passcode, passcode)).toBe(true);
	});

	it('rejects a wrong passcode and length mismatches', () => {
		expect(checkPasscode('nope', passcode)).toBe(false);
		expect(checkPasscode('', passcode)).toBe(false);
		expect(checkPasscode(passcode + 'x', passcode)).toBe(false);
	});
});

describe('alphaGateEnabled', () => {
	const prevPass = process.env.ALPHA_PASSCODE;
	const prevSecret = process.env.AUTH_SECRET;
	afterEach(() => {
		process.env.ALPHA_PASSCODE = prevPass;
		process.env.AUTH_SECRET = prevSecret;
	});

	it('is true only when both passcode + secret are set', () => {
		process.env.ALPHA_PASSCODE = 'x';
		process.env.AUTH_SECRET = 'y';
		expect(alphaGateEnabled()).toBe(true);
	});

	it('is false when either is missing (fail-open)', () => {
		process.env.ALPHA_PASSCODE = 'x';
		delete process.env.AUTH_SECRET;
		expect(alphaGateEnabled()).toBe(false);

		process.env.AUTH_SECRET = 'y';
		delete process.env.ALPHA_PASSCODE;
		expect(alphaGateEnabled()).toBe(false);
	});
});

describe('isAlphaProtectedPath', () => {
	it('gates the app surface, including the demo (no public demo during alpha)', () => {
		for (const p of [
			'/alpha',
			'/alpha/',
			'/project/2b9c-uuid',
			'/project/2b9c-uuid/edit',
			'/project/demo',
			'/project/demo/edit',
			'/project/demo/audit',
			'/families',
			'/family/abc',
			'/family/abc/anything'
		]) {
			expect(isAlphaProtectedPath(p)).toBe(true);
		}
	});

	it('leaves the public marketing surface open', () => {
		for (const p of ['/', '/about', '/es', '/learn/kerning', '/audit/foo', '/share/x', '/unlock']) {
			expect(isAlphaProtectedPath(p)).toBe(false);
		}
	});

	it('does not match on a bare prefix substring', () => {
		expect(isAlphaProtectedPath('/projects-roadmap')).toBe(false);
		expect(isAlphaProtectedPath('/alphabet')).toBe(false);
	});
});
