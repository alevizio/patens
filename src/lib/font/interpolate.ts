/**
 * Linear interpolation between glyph variants (default + masters) for a
 * variable-font preview without a Python round-trip.
 *
 * Requires interpolation compatibility (same contour and point counts).
 * Returns the un-interpolated default glyph's contours when incompatibility
 * is detected (caller can show a warning).
 */

import type { BezierContour, Glyph, PathCommand } from './types';

type Sample = { glyph: Glyph; weight: number };

const lerpCommands = (
	base: PathCommand[],
	others: { commands: PathCommand[]; weight: number }[],
	baseWeight: number
): PathCommand[] => {
	return base.map((cmd, i) => {
		// All variants must have same command type at same index
		for (const o of others) {
			if (o.commands[i]?.type !== cmd.type) return cmd;
		}
		if (cmd.type === 'Z') return cmd;
		if (cmd.type === 'M' || cmd.type === 'L') {
			let x = cmd.x * baseWeight;
			let y = cmd.y * baseWeight;
			for (const o of others) {
				const oc = o.commands[i] as typeof cmd;
				x += oc.x * o.weight;
				y += oc.y * o.weight;
			}
			return { type: cmd.type, x: Math.round(x), y: Math.round(y) };
		}
		if (cmd.type === 'Q') {
			let x = cmd.x * baseWeight,
				y = cmd.y * baseWeight,
				x1 = cmd.x1 * baseWeight,
				y1 = cmd.y1 * baseWeight;
			for (const o of others) {
				const oc = o.commands[i] as typeof cmd;
				x += oc.x * o.weight;
				y += oc.y * o.weight;
				x1 += oc.x1 * o.weight;
				y1 += oc.y1 * o.weight;
			}
			return {
				type: 'Q',
				x: Math.round(x),
				y: Math.round(y),
				x1: Math.round(x1),
				y1: Math.round(y1)
			};
		}
		// C
		let x = cmd.x * baseWeight,
			y = cmd.y * baseWeight,
			x1 = cmd.x1 * baseWeight,
			y1 = cmd.y1 * baseWeight,
			x2 = cmd.x2 * baseWeight,
			y2 = cmd.y2 * baseWeight;
		for (const o of others) {
			const oc = o.commands[i] as typeof cmd;
			x += oc.x * o.weight;
			y += oc.y * o.weight;
			x1 += oc.x1 * o.weight;
			y1 += oc.y1 * o.weight;
			x2 += oc.x2 * o.weight;
			y2 += oc.y2 * o.weight;
		}
		return {
			type: 'C',
			x: Math.round(x),
			y: Math.round(y),
			x1: Math.round(x1),
			y1: Math.round(y1),
			x2: Math.round(x2),
			y2: Math.round(y2)
		};
	});
};

/**
 * Mix glyphs by weight. Weights must sum to ~1. The first sample is the
 * "base" (typically the default master) and provides the structural template.
 *
 * Returns null when any variant has incompatible contour/point counts.
 */
export const interpolateGlyph = (samples: Sample[]): BezierContour[] | null => {
	if (samples.length === 0) return null;
	const base = samples[0];
	const others = samples.slice(1);
	// Compatibility check
	for (const o of others) {
		if (o.glyph.contours.length !== base.glyph.contours.length) return null;
		for (let i = 0; i < base.glyph.contours.length; i++) {
			if (o.glyph.contours[i].commands.length !== base.glyph.contours[i].commands.length)
				return null;
		}
	}
	return base.glyph.contours.map((bc, ci) => ({
		...bc,
		commands: lerpCommands(
			bc.commands,
			others.map((o) => ({ commands: o.glyph.contours[ci].commands, weight: o.weight })),
			base.weight
		)
	}));
};

/**
 * Convert axis-location → master weights, using the standard piecewise-linear
 * variable-font interpolation model. Simple 1-axis case: pick the two
 * surrounding masters and linearly blend. For multi-axis we approximate by
 * normalising distance.
 */
export const computeMasterWeights = (
	axisLocation: Record<string, number>,
	defaultLocation: Record<string, number>,
	masters: Array<{ id: string; location: Record<string, number> }>
): Array<{ id: string | undefined; weight: number }> => {
	// Distance in axis space (squared)
	const dist = (a: Record<string, number>, b: Record<string, number>) => {
		let d = 0;
		const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
		for (const k of keys) {
			const av = a[k] ?? 0;
			const bv = b[k] ?? 0;
			d += (av - bv) ** 2;
		}
		return Math.sqrt(d);
	};
	const all = [
		{ id: undefined as string | undefined, location: defaultLocation },
		...masters
	];
	// Inverse-distance weighting with a small epsilon to avoid div/0
	const weights = all.map((m) => {
		const d = dist(axisLocation, m.location);
		if (d < 0.5) return { id: m.id, w: 1e6 }; // essentially at this master
		return { id: m.id, w: 1 / (d * d) };
	});
	const total = weights.reduce((s, w) => s + w.w, 0);
	return weights.map((w) => ({ id: w.id, weight: w.w / total }));
};
