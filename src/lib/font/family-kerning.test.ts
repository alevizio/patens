import { describe, it, expect } from 'vitest';
import { resolveKerning, resolveClasses, pairOrigin } from './family-kerning';
import type { Family, Project, KerningPair } from './types';

const mkPair = (left: number, right: number, value: number): KerningPair => ({
	left,
	right,
	value
});

const mkProject = (kerning: KerningPair[]): Project =>
	({
		id: 'p1',
		name: 'p',
		kerning,
		classes: [],
		glyphs: {},
		metadata: { familyName: '', styleName: '', version: '' },
		metrics: { unitsPerEm: 1000, ascender: 800, descender: -200, capHeight: 700, xHeight: 500 },
		features: {}
	} as unknown as Project);

const mkFamily = (kerning: KerningPair[]): Family => ({
	id: 'f1',
	name: 'f',
	kerning,
	createdAt: '2026-05-25T00:00:00Z',
	updatedAt: '2026-05-25T00:00:00Z'
});

describe('resolveKerning', () => {
	it('returns project pairs unchanged when family has none', () => {
		const p = mkProject([mkPair(65, 86, -50)]);
		expect(resolveKerning(p, null)).toHaveLength(1);
		expect(resolveKerning(p, mkFamily([]))).toHaveLength(1);
	});

	it('appends family pairs that aren\'t in the project', () => {
		const p = mkProject([mkPair(65, 86, -50)]);
		const f = mkFamily([mkPair(84, 89, -30)]); // TY pair
		const out = resolveKerning(p, f);
		expect(out).toHaveLength(2);
		expect(out[0].value).toBe(-50);
		expect(out[1].value).toBe(-30);
	});

	it('project wins on (left, right) collision', () => {
		const p = mkProject([mkPair(65, 86, -50)]); // AV = -50 in project
		const f = mkFamily([mkPair(65, 86, -80)]); // AV = -80 in family
		const out = resolveKerning(p, f);
		expect(out).toHaveLength(1);
		expect(out[0].value).toBe(-50);
	});

	it('merges with multiple overrides', () => {
		const p = mkProject([mkPair(65, 86, -50), mkPair(84, 79, 20)]); // AV + TO local
		const f = mkFamily([
			mkPair(65, 86, -80), // AV — overridden by project
			mkPair(84, 89, -30), // TY — inherited
			mkPair(70, 65, -40) // FA — inherited
		]);
		const out = resolveKerning(p, f);
		expect(out).toHaveLength(4);
		const av = out.find((p) => p.left === 65 && p.right === 86)!;
		expect(av.value).toBe(-50); // project's AV
	});
});

describe('pairOrigin', () => {
	const p = mkProject([mkPair(65, 86, -50)]);
	const f = mkFamily([mkPair(84, 89, -30)]);

	it('returns "project" for a pair defined on the project', () => {
		expect(pairOrigin(65, 86, p, f)).toBe('project');
	});

	it('returns "family" for a pair only in family.kerning', () => {
		expect(pairOrigin(84, 89, p, f)).toBe('family');
	});

	it('returns null for a pair in neither', () => {
		expect(pairOrigin(70, 65, p, f)).toBe(null);
	});

	it('returns "project" when both sides have the pair (project wins)', () => {
		const both = mkProject([mkPair(65, 86, -50)]);
		const fboth = mkFamily([mkPair(65, 86, -80)]);
		expect(pairOrigin(65, 86, both, fboth)).toBe('project');
	});
});

describe('resolveClasses', () => {
	it('merges family classes by name', () => {
		const p = mkProject([]);
		p.classes = [{ name: '@A_left', members: [65, 192] }];
		const f = mkFamily([]);
		f.classes = [
			{ name: '@A_left', members: [65, 192, 193] }, // overridden by project
			{ name: '@T_right', members: [84] } // inherited
		];
		const out = resolveClasses(p, f);
		expect(out).toHaveLength(2);
		const aLeft = out.find((c) => c.name === '@A_left')!;
		expect(aLeft.members).toEqual([65, 192]); // project's class
	});
});
