import { describe, it, expect } from 'vitest';
import { hasMarkAnchors } from './export';
import type { Glyph, Project } from './types';
import { DEFAULT_METRICS } from './types';

const baseGlyph = (overrides: Partial<Glyph> = {}): Glyph =>
	({
		codepoint: 0x0041,
		name: 'A',
		status: 'empty',
		advanceWidth: 600,
		leftSidebearing: 50,
		rightSidebearing: 50,
		contours: [],
		anchors: [],
		updatedAt: new Date('2026-01-01').toISOString(),
		...overrides
	}) as Glyph;

const project = (glyphs: Record<number, Glyph>): Project =>
	({
		id: 't',
		name: 't',
		metadata: { familyName: 't', styleName: 'r', version: '1', designer: '', copyright: '', license: '' },
		metrics: DEFAULT_METRICS,
		glyphs,
		kerning: [],
		classes: [],
		masters: [],
		axes: [],
		instances: [],
		features: { kern: true, liga: false },
		brief: {},
		samples: {},
		changelog: [],
		decisions: [],
		updatedAt: '2026-01-01',
		createdAt: '2026-01-01'
	}) as Project;

describe('hasMarkAnchors', () => {
	it('returns false for an empty project', () => {
		expect(hasMarkAnchors(project({}))).toBe(false);
	});

	it('returns false when only base anchors exist (no marks to attach)', () => {
		const a = baseGlyph({
			codepoint: 0x0041,
			anchors: [{ name: 'top', x: 300, y: 700 }]
		});
		expect(hasMarkAnchors(project({ 0x41: a }))).toBe(false);
	});

	it('returns false when only mark anchors exist (no bases to attach to)', () => {
		const acute = baseGlyph({
			codepoint: 0x0301,
			name: 'acutecomb',
			anchors: [{ name: '_top', x: 0, y: 0 }]
		});
		expect(hasMarkAnchors(project({ 0x301: acute }))).toBe(false);
	});

	it('returns true with matched base + mark anchors', () => {
		const a = baseGlyph({
			codepoint: 0x0041,
			anchors: [{ name: 'top', x: 300, y: 700 }]
		});
		const acute = baseGlyph({
			codepoint: 0x0301,
			name: 'acutecomb',
			anchors: [{ name: '_top', x: 0, y: 0 }]
		});
		expect(hasMarkAnchors(project({ 0x41: a, 0x301: acute }))).toBe(true);
	});

	it('does not count combining-mark glyph anchors as base anchors', () => {
		// A combining glyph (in U+0300..U+036F) with a non-underscore anchor
		// shouldn't count as having a base anchor — it's still a mark.
		const acute = baseGlyph({
			codepoint: 0x0301,
			name: 'acutecomb',
			anchors: [{ name: 'top', x: 0, y: 0 }]
		});
		expect(hasMarkAnchors(project({ 0x301: acute }))).toBe(false);
	});
});
