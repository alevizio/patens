import { describe, expect, it } from 'vitest';
import { expandKerningClasses } from './kerning-classes';
import type { KerningClass, KerningPair } from './types';

describe('expandKerningClasses', () => {
	it('direct pairs pass through unchanged', () => {
		const pairs: KerningPair[] = [{ left: 0x41, right: 0x56, value: -80 }];
		const out = expandKerningClasses(pairs, []);
		expect(out).toEqual([{ left: 0x41, right: 0x56, value: -80 }]);
	});

	it('class on left expands to one pair per member', () => {
		const classes: KerningClass[] = [
			{ name: '@A_left', members: [0x41, 0xc0, 0xc1] }
		];
		const pairs: KerningPair[] = [{ left: '@A_left', right: 0x56, value: -80 }];
		const out = expandKerningClasses(pairs, classes);
		expect(out).toHaveLength(3);
		expect(out).toEqual(
			expect.arrayContaining([
				{ left: 0x41, right: 0x56, value: -80 },
				{ left: 0xc0, right: 0x56, value: -80 },
				{ left: 0xc1, right: 0x56, value: -80 }
			])
		);
	});

	it('class on both sides cross-products', () => {
		const classes: KerningClass[] = [
			{ name: '@A_left', members: [0x41, 0xc0] },
			{ name: '@V_right', members: [0x56, 0x57] }
		];
		const pairs: KerningPair[] = [{ left: '@A_left', right: '@V_right', value: -80 }];
		const out = expandKerningClasses(pairs, classes);
		expect(out).toHaveLength(4);
	});

	it('direct pair overrides class-derived value at the same codepoint pair', () => {
		// @A_left includes Â (0xc2), and a class-pair says -80 for the
		// whole class against V (0x56). But the designer also manually
		// kerned (Â, V) to -50. The direct value must win.
		const classes: KerningClass[] = [{ name: '@A_left', members: [0x41, 0xc2] }];
		const pairs: KerningPair[] = [
			{ left: '@A_left', right: 0x56, value: -80 },
			{ left: 0xc2, right: 0x56, value: -50 }
		];
		const out = expandKerningClasses(pairs, classes);
		const acircV = out.find((p) => p.left === 0xc2 && p.right === 0x56);
		expect(acircV?.value).toBe(-50);
		// Other class members still use the class value
		const aV = out.find((p) => p.left === 0x41 && p.right === 0x56);
		expect(aV?.value).toBe(-80);
	});

	it('skips unresolvable class references silently', () => {
		const pairs: KerningPair[] = [
			{ left: '@DoesNotExist', right: 0x56, value: -80 },
			{ left: 0x41, right: 0x56, value: -50 }
		];
		const out = expandKerningClasses(pairs, []);
		expect(out).toHaveLength(1);
		expect(out[0]).toEqual({ left: 0x41, right: 0x56, value: -50 });
	});

	it('skips empty classes silently', () => {
		const classes: KerningClass[] = [{ name: '@empty', members: [] }];
		const pairs: KerningPair[] = [{ left: '@empty', right: 0x56, value: -80 }];
		expect(expandKerningClasses(pairs, classes)).toEqual([]);
	});

	it('deduplicates pairs (last write wins per (left, right))', () => {
		// Two class-pairs touching the same codepoint pair via overlapping
		// classes — order in `pairs` determines which value sticks.
		const classes: KerningClass[] = [
			{ name: '@a', members: [0x41] },
			{ name: '@b', members: [0x41] }
		];
		const pairs: KerningPair[] = [
			{ left: '@a', right: 0x56, value: -80 },
			{ left: '@b', right: 0x56, value: -100 }
		];
		const out = expandKerningClasses(pairs, classes);
		expect(out).toHaveLength(1);
		expect(out[0].value).toBe(-100);
	});
});
