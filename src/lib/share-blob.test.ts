import { describe, expect, it } from 'vitest';
import { constantTimeEqual, hashShareToken, tokenMatchesStored } from './share-blob';

describe('share token verification', () => {
	it('hashes tokens with a stable prefix without storing the raw token', () => {
		const token = 'originator-delete-token';
		const stored = hashShareToken(token);
		expect(stored).toMatch(/^sha256:[a-f0-9]{64}$/);
		expect(stored).not.toContain(token);
		expect(hashShareToken(token)).toBe(stored);
	});

	it('matches sha256 token verifiers', () => {
		const stored = hashShareToken('secret-token');
		expect(tokenMatchesStored('secret-token', stored)).toBe(true);
		expect(tokenMatchesStored('wrong-token', stored)).toBe(false);
	});

	it('keeps legacy raw-token blobs deletable', () => {
		expect(tokenMatchesStored('legacy-token', 'legacy-token')).toBe(true);
		expect(tokenMatchesStored('wrong-token', 'legacy-token')).toBe(false);
	});

	it('returns false instead of throwing on different lengths', () => {
		expect(constantTimeEqual('short', 'a-much-longer-token')).toBe(false);
		expect(tokenMatchesStored('short', hashShareToken('a-much-longer-token'))).toBe(false);
	});
});
