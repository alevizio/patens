import { describe, expect, it } from 'vitest';
import { applySecurityHeaders, serverErrorPayload } from './http-security';

describe('applySecurityHeaders', () => {
	it('sets baseline browser hardening headers', () => {
		const headers = new Headers();
		applySecurityHeaders(headers, true);

		expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
		expect(headers.get('X-Frame-Options')).toBe('DENY');
		expect(headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
		expect(headers.get('Permissions-Policy')).toContain('camera=()');
		expect(headers.get('Strict-Transport-Security')).toContain('max-age=63072000');
	});

	it('does not set HSTS on non-HTTPS origins', () => {
		const headers = new Headers();
		applySecurityHeaders(headers, false);
		expect(headers.has('Strict-Transport-Security')).toBe(false);
	});
});

describe('serverErrorPayload', () => {
	it('includes stack details when explicitly exposed', () => {
		const error = new Error('database blew up');
		const payload = serverErrorPayload({
			error,
			message: 'fallback',
			status: 500,
			url: '/broken',
			exposeDetails: true
		});
		expect(payload.message).toBe('database blew up');
		expect(payload.stack).toContain('database blew up');
	});

	it('hides implementation details by default', () => {
		const payload = serverErrorPayload({
			error: new Error('secret path /tmp/build/foo'),
			message: 'fallback',
			status: 500,
			url: '/broken',
			exposeDetails: false
		});
		expect(payload).toEqual({
			message: 'Something went wrong.',
			status: 500,
			url: '/broken'
		});
	});
});
