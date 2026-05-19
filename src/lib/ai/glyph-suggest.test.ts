import { describe, it, expect } from 'vitest';
import { parseProposal, proposalToContours, type GlyphProposal } from './glyph-suggest-core';
import { computeWinding, glyphBounds } from '$lib/font/path';

describe('parseProposal', () => {
	it('parses a clean JSON response', () => {
		const raw = JSON.stringify({
			codepoint: 0x0045,
			reasoning: 'Matches the cap height of H.',
			advanceWidth: 600,
			strokes: [{ type: 'stem', x: 50, y1: 0, y2: 700, weight: 80 }]
		});
		const out = parseProposal(raw, 0x0045);
		expect(out.codepoint).toBe(0x0045);
		expect(out.strokes).toHaveLength(1);
	});

	it('strips ```json fences', () => {
		const raw =
			'```json\n{ "codepoint": 69, "reasoning": "x", "advanceWidth": 600, "strokes": [] }\n```';
		const out = parseProposal(raw, 0x0045);
		expect(out.codepoint).toBe(69);
	});

	it('strips bare ``` fences', () => {
		const raw =
			'```\n{ "codepoint": 69, "reasoning": "x", "advanceWidth": 600, "strokes": [] }\n```';
		const out = parseProposal(raw, 0x0045);
		expect(out.codepoint).toBe(69);
	});

	it('extracts JSON from surrounding prose', () => {
		const raw =
			'Sure! Here is the proposal:\n{ "codepoint": 69, "reasoning": "x", "advanceWidth": 600, "strokes": [] }\nLet me know!';
		const out = parseProposal(raw, 0x0045);
		expect(out.codepoint).toBe(69);
	});

	it('falls back to expected codepoint when missing', () => {
		const raw = '{ "reasoning": "x", "advanceWidth": 600, "strokes": [] }';
		const out = parseProposal(raw, 0x0045);
		expect(out.codepoint).toBe(0x0045);
	});

	it('throws on unparseable input', () => {
		expect(() => parseProposal('not json at all', 0x0045)).toThrow();
	});

	it('throws when strokes is missing', () => {
		const raw = '{ "codepoint": 69, "reasoning": "x", "advanceWidth": 600 }';
		expect(() => parseProposal(raw, 0x0045)).toThrow(/strokes/);
	});
});

describe('proposalToContours', () => {
	const baseProposal = (strokes: GlyphProposal['strokes']): GlyphProposal => ({
		codepoint: 0x0045,
		reasoning: '',
		advanceWidth: 600,
		strokes
	});

	it('builds a single rectangle from a stem stroke', () => {
		const out = proposalToContours(
			baseProposal([{ type: 'stem', x: 100, y1: 0, y2: 700, weight: 80 }])
		);
		expect(out).toHaveLength(1);
		const b = glyphBounds(out);
		expect(b).toEqual({ minX: 60, minY: 0, maxX: 140, maxY: 700 });
		expect(computeWinding(out[0].commands)).toBe('ccw');
	});

	it('builds a horizontal bar', () => {
		const out = proposalToContours(
			baseProposal([{ type: 'bar', x1: 0, x2: 500, y: 700, weight: 60 }])
		);
		const b = glyphBounds(out);
		expect(b).toEqual({ minX: 0, minY: 670, maxX: 500, maxY: 730 });
	});

	it('builds an uppercase E from 4 primitives', () => {
		// Stem + top bar + middle bar + bottom bar
		const out = proposalToContours(
			baseProposal([
				{ type: 'stem', x: 40, y1: 0, y2: 700, weight: 80 },
				{ type: 'bar', x1: 0, x2: 500, y: 660, weight: 80 },
				{ type: 'bar', x1: 0, x2: 400, y: 350, weight: 70 },
				{ type: 'bar', x1: 0, x2: 500, y: 40, weight: 80 }
			])
		);
		expect(out).toHaveLength(4);
		// Bounding box should span the full letter
		const b = glyphBounds(out);
		expect(b.minX).toBe(0);
		expect(b.minY).toBe(0);
		expect(b.maxX).toBe(500);
		expect(b.maxY).toBe(700);
	});

	it('builds a diagonal stroke with the correct width perpendicular', () => {
		const out = proposalToContours(
			baseProposal([
				{ type: 'diagonal', x1: 0, y1: 0, x2: 100, y2: 0, weight: 40 }
			])
		);
		const b = glyphBounds(out);
		// A horizontal "diagonal" from (0,0) to (100,0) with weight 40 should
		// equal a horizontal bar of height 40 centred on y=0.
		expect(b).toEqual({ minX: 0, minY: -20, maxX: 100, maxY: 20 });
	});

	it('builds an O-shape (donut) from an ellipse stroke', () => {
		const out = proposalToContours(
			baseProposal([
				{ type: 'ellipse', cx: 300, cy: 350, rx: 250, ry: 350, weight: 80 }
			])
		);
		// Outer contour + inner reverse-winding contour
		expect(out).toHaveLength(2);
		expect(out[0].winding).toBe('ccw');
		expect(out[1].winding).toBe('cw');
	});

	it('handles zero-weight ellipse without an inner contour', () => {
		const out = proposalToContours(
			baseProposal([
				{ type: 'ellipse', cx: 100, cy: 100, rx: 50, ry: 50, weight: 100 }
			])
		);
		// weight >= 2*rx → no inner contour
		expect(out).toHaveLength(1);
	});
});
