/**
 * expandKerningClasses() perf regression guard.
 *
 * The class-expansion path is O(direct + class-pairs × Σ left × right).
 * A worst-case "all-pairs" scenario (every left class against every
 * right class) explodes quadratically. This bench measures the
 * realistic shape: a few dozen kerning classes with 8–30 members
 * each, scaled across project sizes.
 */

import { describe, expect, it } from 'vitest';
import { expandKerningClasses } from './kerning-classes';
import type { KerningClass, KerningPair } from './types';

type SidedClass = KerningClass & { side: 'left' | 'right' };

const synthClasses = (count: number, membersPerClass: number): SidedClass[] => {
	const classes: SidedClass[] = [];
	for (let i = 0; i < count; i++) {
		const side: 'left' | 'right' = i % 2 === 0 ? 'left' : 'right';
		const baseCp = 0x0041 + (i * membersPerClass);
		classes.push({
			name: `@class_${side}_${i}`,
			side,
			members: Array.from({ length: membersPerClass }, (_, j) => baseCp + j)
		});
	}
	return classes;
};

const synthPairs = (
	classes: ReadonlyArray<SidedClass>,
	classPairCount: number,
	directPairCount: number
): KerningPair[] => {
	const leftClasses = classes.filter((c) => c.side === 'left');
	const rightClasses = classes.filter((c) => c.side === 'right');

	const out: KerningPair[] = [];
	for (let i = 0; i < classPairCount; i++) {
		const l = leftClasses[i % leftClasses.length];
		const r = rightClasses[i % rightClasses.length];
		if (!l || !r) continue;
		out.push({ left: l.name, right: r.name, value: -50 - (i % 30) });
	}
	for (let i = 0; i < directPairCount; i++) {
		out.push({
			left: 0x0041 + (i % 26),
			right: 0x0061 + (i % 26),
			value: -10 - (i % 40)
		});
	}
	return out;
};

const measure = (label: string, fn: () => unknown, iterations: number) => {
	fn();
	const start = performance.now();
	for (let i = 0; i < iterations; i++) fn();
	const total = performance.now() - start;
	const per = total / iterations;
	// eslint-disable-next-line no-console
	console.log(`  ${label.padEnd(28)} ${per.toFixed(3)}ms/call (${iterations}× iter)`);
	return per;
};

describe('expandKerningClasses — per-call cost', () => {
	// Scenarios calibrated to realistic project shapes:
	// small  ~ a single style with a handful of classes
	// medium ~ the demo's typical class count
	// large  ~ a maxed-out family with deep class kerning
	const SCENARIOS = [
		{ name: 'small',  classes: 8,  members: 8,  classPairs: 20,  direct: 50,  iter: 50 },
		{ name: 'medium', classes: 24, members: 16, classPairs: 100, direct: 200, iter: 30 },
		{ name: 'large',  classes: 50, members: 30, classPairs: 400, direct: 800, iter: 10 }
	] as const;

	for (const s of SCENARIOS) {
		it(`scenario=${s.name}: expandKerningClasses()`, () => {
			const classes = synthClasses(s.classes, s.members);
			const pairs = synthPairs(classes, s.classPairs, s.direct);
			// eslint-disable-next-line no-console
			console.log(
				`\n[${s.name}] ${s.classes} classes × ${s.members} members, ` +
					`${s.classPairs} class pairs + ${s.direct} direct`
			);
			const cost = measure('expandKerningClasses', () => expandKerningClasses(pairs, classes), s.iter);
			// Sanity bound — large scenario expands to roughly
			// 400 × 30 × 30 = 360k entries plus 800 direct. Should
			// complete in well under 500ms; if it ever crosses
			// that, the expansion path has gone superlinear.
			expect(cost, `${s.name} catastrophically slow`).toBeLessThan(500);
		});
	}
});
