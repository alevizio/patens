import { describe, expect, it } from 'vitest';
import { suggestSidebearingClasses } from './sb-classes';
import type { SidebearingMeasurement } from './sb-classes';

const m = (
	cp: number,
	category: SidebearingMeasurement['category'],
	left: number,
	right: number
): SidebearingMeasurement => ({
	codepoint: cp,
	category,
	leftSidebearing: left,
	rightSidebearing: right
});

describe('suggestSidebearingClasses', () => {
	it('empty input → empty output', () => {
		expect(suggestSidebearingClasses([])).toEqual([]);
	});

	it('clusters uppercase with similar left sidebearings (vertical-stem cluster)', () => {
		// H, I, L all have stem-on-left → similar LSBs (~80).
		// O, C have round-on-left → different LSBs (~50).
		const glyphs = [
			m(0x0048, 'uppercase', 80, 80), // H
			m(0x0049, 'uppercase', 82, 82), // I
			m(0x004c, 'uppercase', 78, 60), // L
			m(0x004f, 'uppercase', 50, 50), // O
			m(0x0043, 'uppercase', 48, 70) //  C
		];
		const out = suggestSidebearingClasses(glyphs, { tolerance: 10 });
		// Expect: an uppercase-left cluster around 80 with H/I/L (3 members).
		const stemCluster = out.find(
			(c) => c.side === 'left' && c.category === 'uppercase' && c.value === 80
		);
		expect(stemCluster).toBeDefined();
		expect(stemCluster!.members.sort()).toEqual([0x0048, 0x0049, 0x004c]);
		// And a separate uppercase-left cluster around 49 with O/C.
		const roundCluster = out.find(
			(c) => c.side === 'left' && c.category === 'uppercase' && c.value === 49
		);
		expect(roundCluster).toBeDefined();
		expect(roundCluster!.members.sort()).toEqual([0x0043, 0x004f]);
	});

	it("doesn't cross category boundaries", () => {
		// H (uppercase, LSB=80) and h (lowercase, LSB=80) shouldn't end up
		// in the same cluster despite having identical LSBs.
		const glyphs = [
			m(0x0048, 'uppercase', 80, 80),
			m(0x0049, 'uppercase', 80, 80),
			m(0x0068, 'lowercase', 80, 80),
			m(0x006c, 'lowercase', 80, 80)
		];
		const out = suggestSidebearingClasses(glyphs);
		// Two clusters per side per category, but never one that mixes.
		const uppercaseLeft = out.filter((c) => c.category === 'uppercase' && c.side === 'left');
		const lowercaseLeft = out.filter((c) => c.category === 'lowercase' && c.side === 'left');
		expect(uppercaseLeft).toHaveLength(1);
		expect(lowercaseLeft).toHaveLength(1);
		expect(uppercaseLeft[0].members).toEqual([0x0048, 0x0049]);
		expect(lowercaseLeft[0].members).toEqual([0x0068, 0x006c]);
	});

	it('respects tolerance — values just outside split into separate clusters', () => {
		// LSBs of 60, 65, 72, 76. tolerance=5 should split into [60,65] and
		// [72,76] (each spread = 5 — at the limit, inclusive).
		const glyphs = [
			m(0x0041, 'uppercase', 60, 0),
			m(0x0042, 'uppercase', 65, 0),
			m(0x0043, 'uppercase', 72, 0),
			m(0x0044, 'uppercase', 76, 0)
		];
		const out = suggestSidebearingClasses(glyphs, { tolerance: 5 });
		const left = out.filter((c) => c.side === 'left');
		expect(left).toHaveLength(2);
		expect(left[0].members).toEqual([0x0041, 0x0042]);
		expect(left[1].members).toEqual([0x0043, 0x0044]);
	});

	it('honours minMembers — singleton clusters are dropped', () => {
		// One isolated glyph + a pair — only the pair should emit.
		const glyphs = [
			m(0x0041, 'uppercase', 60, 0),
			m(0x0042, 'uppercase', 200, 0),
			m(0x0043, 'uppercase', 202, 0)
		];
		const out = suggestSidebearingClasses(glyphs, { minMembers: 2, tolerance: 10 });
		expect(out.filter((c) => c.side === 'left')).toHaveLength(1);
		expect(out[0].members).toEqual([0x0042, 0x0043]);
	});

	it('computes median value (odd count)', () => {
		const glyphs = [
			m(0x0041, 'uppercase', 70, 0),
			m(0x0042, 'uppercase', 80, 0),
			m(0x0043, 'uppercase', 75, 0)
		];
		const out = suggestSidebearingClasses(glyphs, { tolerance: 20 });
		const left = out.find((c) => c.side === 'left');
		expect(left).toBeDefined();
		expect(left!.value).toBe(75); // sorted median of {70, 75, 80}
	});

	it('computes median value (even count, averaged)', () => {
		const glyphs = [
			m(0x0041, 'uppercase', 70, 0),
			m(0x0042, 'uppercase', 80, 0),
			m(0x0043, 'uppercase', 75, 0),
			m(0x0044, 'uppercase', 73, 0)
		];
		const out = suggestSidebearingClasses(glyphs, { tolerance: 20 });
		const left = out.find((c) => c.side === 'left');
		expect(left).toBeDefined();
		// Sorted: 70, 73, 75, 80 → median = (73+75)/2 = 74
		expect(left!.value).toBe(74);
	});

	it('reports spread = max − min for the cluster', () => {
		const glyphs = [
			m(0x0041, 'uppercase', 60, 0),
			m(0x0042, 'uppercase', 64, 0),
			m(0x0043, 'uppercase', 69, 0)
		];
		const out = suggestSidebearingClasses(glyphs, { tolerance: 10 });
		const left = out.find((c) => c.side === 'left');
		expect(left).toBeDefined();
		expect(left!.spread).toBe(9);
	});

	it('handles both sides independently', () => {
		// H: LSB=80 RSB=80. I: LSB=82 RSB=78. L: LSB=78 RSB=200 (deep RSB).
		// Left cluster should have H/I/L (close LSBs); right cluster should
		// have only H/I (L's RSB is far away).
		const glyphs = [
			m(0x0048, 'uppercase', 80, 80),
			m(0x0049, 'uppercase', 82, 78),
			m(0x004c, 'uppercase', 78, 200)
		];
		const out = suggestSidebearingClasses(glyphs, { tolerance: 5, minMembers: 2 });
		const left = out.find((c) => c.side === 'left');
		const right = out.find((c) => c.side === 'right');
		expect(left).toBeDefined();
		expect(left!.members).toEqual([0x0048, 0x0049, 0x004c]);
		expect(right).toBeDefined();
		expect(right!.members).toEqual([0x0048, 0x0049]); // L excluded
	});

	it('output is stable-sorted by category, then side, then value', () => {
		const glyphs = [
			m(0x0048, 'uppercase', 80, 80),
			m(0x0049, 'uppercase', 80, 80),
			m(0x0068, 'lowercase', 50, 50),
			m(0x006c, 'lowercase', 50, 50),
			m(0x004f, 'uppercase', 60, 60),
			m(0x0043, 'uppercase', 60, 60)
		];
		const out = suggestSidebearingClasses(glyphs);
		// Categories sort alphabetically: lowercase, uppercase. Each
		// category has left then right. Within each, sorted by value.
		expect(out.map((c) => `${c.category}.${c.side}.${c.value}`)).toEqual([
			'lowercase.left.50',
			'lowercase.right.50',
			'uppercase.left.60',
			'uppercase.left.80',
			'uppercase.right.60',
			'uppercase.right.80'
		]);
	});

	it('tolerance guard: negative tolerance throws', () => {
		expect(() => suggestSidebearingClasses([], { tolerance: -1 })).toThrow();
	});

	it('minMembers guard: zero or less throws', () => {
		expect(() => suggestSidebearingClasses([], { minMembers: 0 })).toThrow();
	});
});
