import { describe, it, expect } from 'vitest';
import { decodeSession, encodeSession, safeReturnTo, type Session } from './session';

describe('encodeSession + decodeSession', () => {
	const secret = 'test-secret-must-be-32-chars-or-more-yes';
	const session: Session = {
		id: '12345',
		login: 'alevizio',
		name: 'Alejandro',
		avatar: 'https://github.com/avatar.png'
	};

	it('round-trips a session through encode/decode with a valid signature', () => {
		const cookie = encodeSession(session, secret);
		const decoded = decodeSession(cookie, secret);
		expect(decoded).toEqual(session);
	});

	it('returns null for a tampered payload', () => {
		const cookie = encodeSession(session, secret);
		const [payload, sig] = cookie.split('.');
		// Flip a bit in the payload — signature won't verify
		const tampered = payload.slice(0, -2) + 'xx.' + sig;
		expect(decodeSession(tampered, secret)).toBeNull();
	});

	it('returns null for a tampered signature', () => {
		const cookie = encodeSession(session, secret);
		const [payload, sig] = cookie.split('.');
		const tampered = `${payload}.${sig.slice(0, -2)}xx`;
		expect(decodeSession(tampered, secret)).toBeNull();
	});

	it('returns null when secret differs', () => {
		const cookie = encodeSession(session, secret);
		expect(decodeSession(cookie, 'different-secret-of-equal-length-yes')).toBeNull();
	});

	it('returns null for empty / malformed input', () => {
		expect(decodeSession(undefined, secret)).toBeNull();
		expect(decodeSession('', secret)).toBeNull();
		expect(decodeSession('no-dot-here', secret)).toBeNull();
		expect(decodeSession('.', secret)).toBeNull();
	});

	it('handles names with unicode + emoji round-tripping', () => {
		const s: Session = { id: '1', login: 'a', name: '😀 Álvaro', avatar: 'x' };
		const cookie = encodeSession(s, secret);
		expect(decodeSession(cookie, secret)).toEqual(s);
	});
});

describe('safeReturnTo — open-redirect defense', () => {
	const origin = 'https://patens.design';

	it('passes relative path through', () => {
		expect(safeReturnTo('/project/demo/edit', origin)).toBe('/project/demo/edit');
		expect(safeReturnTo('/', origin)).toBe('/');
		expect(safeReturnTo('/help?foo=bar', origin)).toBe('/help?foo=bar');
		expect(safeReturnTo('/help#section', origin)).toBe('/help#section');
	});

	it('blocks absolute URL to off-origin host', () => {
		expect(safeReturnTo('https://evil.com', origin)).toBe('/');
		expect(safeReturnTo('https://evil.com/phish', origin)).toBe('/');
		expect(safeReturnTo('http://evil.com', origin)).toBe('/');
	});

	it('blocks scheme-relative URL (//evil.com)', () => {
		expect(safeReturnTo('//evil.com', origin)).toBe('/');
		expect(safeReturnTo('//evil.com/page', origin)).toBe('/');
	});

	it('blocks backslash trick that some browsers normalize as protocol-relative', () => {
		// In a strict URL parser, /\evil.com resolves to /\evil.com on same origin
		// (treated as path). But some browsers normalize backslashes — defense in
		// depth: as long as resolved origin matches, we're safe. Verify behavior.
		const result = safeReturnTo('/\\evil.com', origin);
		// Either result is safe — we just need to not redirect to evil.com
		expect(result.startsWith('/')).toBe(true);
		expect(result).not.toContain('evil.com');
	});

	it('passes a same-origin absolute URL through, returning just the path', () => {
		expect(safeReturnTo('https://patens.design/about', origin)).toBe('/about');
		expect(safeReturnTo('https://patens.design/share/demo?x=1', origin)).toBe('/share/demo?x=1');
	});

	it('falls back to / on missing / empty / malformed input', () => {
		expect(safeReturnTo(null, origin)).toBe('/');
		expect(safeReturnTo(undefined, origin)).toBe('/');
		expect(safeReturnTo('', origin)).toBe('/');
	});

	it('falls back to / on garbage that doesn\'t parse', () => {
		// new URL('javascript:alert(1)', origin) does parse with javascript: scheme
		// → different origin → falls back to /. Defends against javascript: redirects.
		expect(safeReturnTo('javascript:alert(1)', origin)).toBe('/');
		expect(safeReturnTo('data:text/html,foo', origin)).toBe('/');
	});
});
