import { describe, it, expect } from 'vitest';
import { CONTROL_GLYPHS, useCaseTargets } from './onboarding-targets';

describe('onboarding-targets', () => {
	describe('CONTROL_GLYPHS', () => {
		it('contains the 13 canonical proportion/texture-set glyphs', () => {
			expect(CONTROL_GLYPHS).toHaveLength(13);
		});

		it('starts with lowercase n and o (the proportion anchors)', () => {
			expect(CONTROL_GLYPHS[0]).toBe(0x006e); // n
			expect(CONTROL_GLYPHS[1]).toBe(0x006f); // o
		});

		it('includes both uppercase H and O (the cap-height anchors)', () => {
			expect(CONTROL_GLYPHS).toContain(0x0048); // H
			expect(CONTROL_GLYPHS).toContain(0x004f); // O
		});

		it('covers the lowercase texture set a e s c p v y f g', () => {
			const expected = [0x0061, 0x0065, 0x0073, 0x0063, 0x0070, 0x0076, 0x0079, 0x0066, 0x0067];
			for (const cp of expected) {
				expect(CONTROL_GLYPHS).toContain(cp);
			}
		});

		it('contains only codepoints in the Basic Latin range', () => {
			for (const cp of CONTROL_GLYPHS) {
				expect(cp).toBeGreaterThanOrEqual(0x20);
				expect(cp).toBeLessThanOrEqual(0x7f);
			}
		});
	});

	describe('useCaseTargets', () => {
		it('returns digits + core punct for unknown / default use case', () => {
			const out = useCaseTargets(undefined);
			// 10 digits + 8 core punct
			expect(out).toHaveLength(18);
			expect(out).toContain(0x0030); // 0
			expect(out).toContain(0x0039); // 9
			expect(out).toContain(0x002e); // .
			expect(out).toContain(0x002c); // ,
		});

		it('prioritises punct + wrap + digits for body-text use case', () => {
			const out = useCaseTargets('body-text');
			// core-punct (8) + wrap (5) + digits (10) = 23
			expect(out).toHaveLength(23);
			// First entries are core punct (highest priority for body text)
			expect(out[0]).toBe(0x002e); // .
		});

		it('returns code-specific brackets and symbols for code use case', () => {
			const out = useCaseTargets('code');
			expect(out).toContain(0x005b); // [
			expect(out).toContain(0x005d); // ]
			expect(out).toContain(0x007b); // {
			expect(out).toContain(0x007d); // }
			expect(out).toContain(0x003d); // =
		});

		it('returns digits + tabular-relevant punct for data-tables', () => {
			const out = useCaseTargets('data-tables');
			expect(out).toContain(0x0025); // %
			expect(out).toContain(0x0024); // $
		});

		it('returns an empty list for display — no extras needed', () => {
			expect(useCaseTargets('display')).toEqual([]);
		});

		it('produces stable output (same input → same output)', () => {
			expect(useCaseTargets('code')).toEqual(useCaseTargets('code'));
		});
	});
});
