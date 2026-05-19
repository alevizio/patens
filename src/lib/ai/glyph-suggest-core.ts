/**
 * Pure transforms for the AI glyph-suggestion pipeline — no Svelte / no Claude
 * dependencies, so they're trivially unit-testable in Vitest without pulling
 * in `$app/environment` or anything else SvelteKit-specific.
 *
 * The impure outer layer (Claude API call) lives in `glyph-suggest.ts`.
 */

import type { BezierContour, PathCommand } from '$lib/font/types';

// Schema ---------------------------------------------------------------------

export type Stroke =
	| { type: 'stem'; x: number; y1: number; y2: number; weight: number }
	| { type: 'bar'; x1: number; x2: number; y: number; weight: number }
	| { type: 'diagonal'; x1: number; y1: number; x2: number; y2: number; weight: number }
	| {
			type: 'ellipse';
			cx: number;
			cy: number;
			rx: number;
			ry: number;
			weight: number;
		};

export type GlyphProposal = {
	codepoint: number;
	reasoning: string;
	advanceWidth: number;
	strokes: Stroke[];
};

// Geometric construction -----------------------------------------------------

const KAPPA = 0.5522847498; // Cubic-bezier approximation constant for circles

const rectContour = (
	xMin: number,
	yMin: number,
	xMax: number,
	yMax: number
): BezierContour => ({
	closed: true,
	winding: 'ccw',
	commands: [
		{ type: 'M', x: xMin, y: yMin },
		{ type: 'L', x: xMax, y: yMin },
		{ type: 'L', x: xMax, y: yMax },
		{ type: 'L', x: xMin, y: yMax },
		{ type: 'Z' }
	]
});

const diagonalRect = (
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	weight: number
): BezierContour => {
	const dx = x2 - x1;
	const dy = y2 - y1;
	const len = Math.hypot(dx, dy);
	if (len === 0) return rectContour(x1, y1, x1 + 1, y1 + 1);
	const nx = (-dy / len) * (weight / 2);
	const ny = (dx / len) * (weight / 2);
	return {
		closed: true,
		winding: 'ccw',
		commands: [
			{ type: 'M', x: x1 - nx, y: y1 - ny },
			{ type: 'L', x: x2 - nx, y: y2 - ny },
			{ type: 'L', x: x2 + nx, y: y2 + ny },
			{ type: 'L', x: x1 + nx, y: y1 + ny },
			{ type: 'Z' }
		]
	};
};

const ellipsePath = (cx: number, cy: number, rx: number, ry: number): PathCommand[] => {
	const kx = rx * KAPPA;
	const ky = ry * KAPPA;
	return [
		{ type: 'M', x: cx + rx, y: cy },
		{ type: 'C', x1: cx + rx, y1: cy + ky, x2: cx + kx, y2: cy + ry, x: cx, y: cy + ry },
		{ type: 'C', x1: cx - kx, y1: cy + ry, x2: cx - rx, y2: cy + ky, x: cx - rx, y: cy },
		{ type: 'C', x1: cx - rx, y1: cy - ky, x2: cx - kx, y2: cy - ry, x: cx, y: cy - ry },
		{ type: 'C', x1: cx + kx, y1: cy - ry, x2: cx + rx, y2: cy - ky, x: cx + rx, y: cy },
		{ type: 'Z' }
	];
};

const ellipsePathReversed = (
	cx: number,
	cy: number,
	rx: number,
	ry: number
): PathCommand[] => {
	const kx = rx * KAPPA;
	const ky = ry * KAPPA;
	return [
		{ type: 'M', x: cx + rx, y: cy },
		{ type: 'C', x1: cx + rx, y1: cy - ky, x2: cx + kx, y2: cy - ry, x: cx, y: cy - ry },
		{ type: 'C', x1: cx - kx, y1: cy - ry, x2: cx - rx, y2: cy - ky, x: cx - rx, y: cy },
		{ type: 'C', x1: cx - rx, y1: cy + ky, x2: cx - kx, y2: cy + ry, x: cx, y: cy + ry },
		{ type: 'C', x1: cx + kx, y1: cy + ry, x2: cx + rx, y2: cy + ky, x: cx + rx, y: cy },
		{ type: 'Z' }
	];
};

const ellipseStroke = (
	cx: number,
	cy: number,
	rx: number,
	ry: number,
	weight: number
): BezierContour[] => {
	const out: BezierContour[] = [
		{ closed: true, winding: 'ccw', commands: ellipsePath(cx, cy, rx, ry) }
	];
	const innerRx = rx - weight;
	const innerRy = ry - weight;
	if (innerRx > 0 && innerRy > 0) {
		out.push({
			closed: true,
			winding: 'cw',
			commands: ellipsePathReversed(cx, cy, innerRx, innerRy)
		});
	}
	return out;
};

const strokeToContours = (s: Stroke): BezierContour[] => {
	switch (s.type) {
		case 'stem':
			return [rectContour(s.x - s.weight / 2, s.y1, s.x + s.weight / 2, s.y2)];
		case 'bar':
			return [rectContour(s.x1, s.y - s.weight / 2, s.x2, s.y + s.weight / 2)];
		case 'diagonal':
			return [diagonalRect(s.x1, s.y1, s.x2, s.y2, s.weight)];
		case 'ellipse':
			return ellipseStroke(s.cx, s.cy, s.rx, s.ry, s.weight);
	}
};

export const proposalToContours = (proposal: GlyphProposal): BezierContour[] =>
	proposal.strokes.flatMap(strokeToContours);

// Parser ---------------------------------------------------------------------

/** Extracts JSON from Claude's response — tolerates code fences and surrounding prose. */
export const parseProposal = (raw: string, expectedCodepoint: number): GlyphProposal => {
	let body = raw.trim();
	const fence = body.match(/```(?:json)?\s*([\s\S]*?)```/);
	if (fence) body = fence[1].trim();
	if (!body.startsWith('{')) {
		const start = body.indexOf('{');
		const end = body.lastIndexOf('}');
		if (start === -1 || end === -1)
			throw new Error('No JSON object found in response.');
		body = body.slice(start, end + 1);
	}
	const parsed = JSON.parse(body) as Partial<GlyphProposal>;
	if (!parsed || typeof parsed !== 'object')
		throw new Error('Parsed value is not an object.');
	if (!Array.isArray(parsed.strokes))
		throw new Error('Missing or invalid "strokes" array.');
	return {
		codepoint: parsed.codepoint ?? expectedCodepoint,
		reasoning: parsed.reasoning ?? '',
		advanceWidth: parsed.advanceWidth ?? 600,
		strokes: parsed.strokes as Stroke[]
	};
};
