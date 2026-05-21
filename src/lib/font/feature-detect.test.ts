import { describe, expect, it } from 'vitest';
import { detectFeatures, featureLabel } from './feature-detect';
import type { Glyph } from './types';

const g = (codepoint: number, name: string): Glyph => ({
	codepoint,
	name,
	status: 'draft',
	advanceWidth: 500,
	leftSidebearing: 50,
	rightSidebearing: 50,
	contours: [{ closed: true, winding: 'cw', commands: [{ type: 'M', x: 0, y: 0 }] }],
	updatedAt: '2026-05-21'
});

const project = (glyphs: Glyph[]): Record<number, Glyph> => {
	const out: Record<number, Glyph> = {};
	for (let i = 0; i < glyphs.length; i++) out[i] = glyphs[i];
	return out;
};

describe('detectFeatures — single-sub from suffix conventions', () => {
	it('empty project → empty output', () => {
		expect(detectFeatures({})).toEqual([]);
	});

	it('.sc → smcp', () => {
		const out = detectFeatures(project([g(1, 'a'), g(2, 'a.sc')]));
		expect(out).toEqual([
			{ feature: 'smcp', kind: 'single', subs: [{ from: 'a', to: 'a.sc' }] }
		]);
	});

	it('.smcp also maps to smcp (Adobe AFDKO dialect)', () => {
		const out = detectFeatures(project([g(1, 'a'), g(2, 'a.smcp')]));
		expect(out[0].feature).toBe('smcp');
		expect(out[0].subs).toEqual([{ from: 'a', to: 'a.smcp' }]);
	});

	it('.c2sc → c2sc', () => {
		const out = detectFeatures(project([g(1, 'A'), g(2, 'A.c2sc')]));
		expect(out[0].feature).toBe('c2sc');
	});

	it('.salt and .alt both → salt', () => {
		const out = detectFeatures(
			project([g(1, 'a'), g(2, 'b'), g(3, 'a.salt'), g(4, 'b.alt')])
		);
		expect(out).toHaveLength(1);
		expect(out[0].feature).toBe('salt');
		expect(out[0].subs).toEqual([
			{ from: 'a', to: 'a.salt' },
			{ from: 'b', to: 'b.alt' }
		]);
	});

	it('.ss01–.ss20 produce indexed stylistic sets', () => {
		const out = detectFeatures(
			project([g(1, 'a'), g(2, 'a.ss01'), g(3, 'a.ss05'), g(4, 'a.ss20')])
		);
		expect(out.map((f) => f.feature).sort()).toEqual(['ss01', 'ss05', 'ss20']);
	});

	it('.cv01–.cv99 produce indexed character variants', () => {
		const out = detectFeatures(project([g(1, 'a'), g(2, 'a.cv05'), g(3, 'a.cv42')]));
		expect(out.map((f) => f.feature).sort()).toEqual(['cv05', 'cv42']);
	});

	it('.tosf fires BOTH onum and tnum', () => {
		const out = detectFeatures(project([g(1, 'one'), g(2, 'one.tosf')]));
		expect(out.map((f) => f.feature).sort()).toEqual(['onum', 'tnum']);
		// Both features carry the same sub pair.
		for (const f of out) {
			expect(f.subs).toEqual([{ from: 'one', to: 'one.tosf' }]);
		}
	});

	it('.osf and .onum both → onum', () => {
		const out = detectFeatures(
			project([g(1, 'one'), g(2, 'two'), g(3, 'one.osf'), g(4, 'two.onum')])
		);
		expect(out).toHaveLength(1);
		expect(out[0].feature).toBe('onum');
		expect(out[0].subs.map((s) => s.to).sort()).toEqual(['one.osf', 'two.onum']);
	});

	it('.numr / .numerator / .dnom / .denominator', () => {
		const out = detectFeatures(
			project([
				g(1, 'one'),
				g(2, 'two'),
				g(3, 'one.numr'),
				g(4, 'two.numerator'),
				g(5, 'one.dnom'),
				g(6, 'two.denominator')
			])
		);
		expect(out.map((f) => f.feature).sort()).toEqual(['dnom', 'numr']);
	});

	it('.sups / .superior / .subs / .inferior', () => {
		const out = detectFeatures(
			project([
				g(1, 'one'),
				g(2, 'two'),
				g(3, 'one.sups'),
				g(4, 'two.superior'),
				g(5, 'one.subs'),
				g(6, 'two.inferior')
			])
		);
		expect(out.map((f) => f.feature).sort()).toEqual(['subs', 'sups']);
	});

	it('Arabic positional suffixes', () => {
		const out = detectFeatures(
			project([
				g(1, 'alef'),
				g(2, 'alef.init'),
				g(3, 'alef.medi'),
				g(4, 'alef.fina'),
				g(5, 'alef.isol')
			])
		);
		expect(out.map((f) => f.feature).sort()).toEqual(['fina', 'init', 'isol', 'medi']);
	});

	it('skips suffixed glyphs whose base does not exist', () => {
		// `a.sc` is suffixed but no plain `a` is drawn — typo, no feature
		// emitted.
		const out = detectFeatures(project([g(1, 'a.sc')]));
		expect(out).toEqual([]);
	});

	it('skips glyphs with empty names', () => {
		const out = detectFeatures(project([g(1, ''), g(2, 'a.sc')]));
		expect(out).toEqual([]);
	});

	it('subs are sorted by `from` for stable output', () => {
		const out = detectFeatures(
			project([
				g(1, 'a'),
				g(2, 'b'),
				g(3, 'c'),
				g(4, 'c.sc'),
				g(5, 'a.sc'),
				g(6, 'b.sc')
			])
		);
		expect(out[0].subs.map((s) => s.from)).toEqual(['a', 'b', 'c']);
	});

	it('features are returned in alphabetical order (opentype.js constraint)', () => {
		// Mix that would naturally land in random order — verify the
		// sort happens regardless.
		const out = detectFeatures(
			project([
				g(1, 'A'),
				g(2, 'a'),
				g(3, 'one'),
				g(4, 'a.salt'),
				g(5, 'A.c2sc'),
				g(6, 'one.osf'),
				g(7, 'a.sc')
			])
		);
		expect(out.map((f) => f.feature)).toEqual(['c2sc', 'onum', 'salt', 'smcp']);
	});

	it('full realistic font shape', () => {
		// What a beginner Glyphs-aware designer might produce: lowercase
		// with small caps, two stylistic sets on `a`, oldstyle figures.
		const glyphs = [
			g(1, 'a'),
			g(2, 'b'),
			g(3, 'A'),
			g(4, 'B'),
			g(5, 'one'),
			g(6, 'two'),
			// small caps
			g(7, 'a.sc'),
			g(8, 'b.sc'),
			// caps to small caps
			g(9, 'A.c2sc'),
			g(10, 'B.c2sc'),
			// stylistic sets
			g(11, 'a.ss01'),
			g(12, 'a.ss02'),
			// oldstyle figures
			g(13, 'one.osf'),
			g(14, 'two.osf')
		];
		const out = detectFeatures(project(glyphs));
		// Expect 5 features in alphabetical order.
		expect(out.map((f) => f.feature)).toEqual(['c2sc', 'onum', 'smcp', 'ss01', 'ss02']);
		expect(out.find((f) => f.feature === 'smcp')?.subs).toEqual([
			{ from: 'a', to: 'a.sc' },
			{ from: 'b', to: 'b.sc' }
		]);
	});
});

describe('featureLabel', () => {
	it('returns plain-English labels for known tags', () => {
		expect(featureLabel('smcp')).toBe('Small caps');
		expect(featureLabel('c2sc')).toBe('Caps to small caps');
		expect(featureLabel('salt')).toBe('Stylistic alternates');
		expect(featureLabel('onum')).toBe('Oldstyle figures');
	});

	it('expands indexed sets and variants', () => {
		expect(featureLabel('ss01')).toBe('Stylistic set 01');
		expect(featureLabel('cv05')).toBe('Character variant 05');
	});

	it('falls back to the raw tag for unknown features', () => {
		expect(featureLabel('zzzz')).toBe('zzzz');
	});
});
