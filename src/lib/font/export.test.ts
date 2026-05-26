import { describe, it, expect } from 'vitest';
import { buildFont, hasMarkAnchors } from './export';
import type { Family, Glyph, Project } from './types';
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

describe('buildFont — family-wide kerning merge', () => {
	// Two drawable glyphs so opentype.js can build a font.
	const A = baseGlyph({ codepoint: 0x41, name: 'A' });
	const V = baseGlyph({ codepoint: 0x56, name: 'V' });

	const baseProject: Project = {
		...project({ 0x41: A, 0x56: V }),
		kerning: [{ left: 0x41, right: 0x56, value: -10 }] // project: A V at -10
	};

	const family: Family = {
		id: 'fam-1',
		name: 'Test',
		createdAt: '2026-01-01',
		updatedAt: '2026-01-01',
		kerning: [
			{ left: 0x41, right: 0x56, value: -50 }, // collides with project's pair
			{ left: 0x56, right: 0x41, value: -30 } // family-only (V A)
		],
		classes: []
	};

	// Helper: look up the kern value for a (left,right) codepoint pair by
	// resolving each codepoint to its glyph index in the built font. Walks
	// font.glyphs because opentype.js's TS types don't expose charToGlyph.
	const indexOfCodepoint = (font: ReturnType<typeof buildFont>['font'], cp: number) => {
		for (let i = 0; i < font.glyphs.length; i++) {
			const g = font.glyphs.get(i) as { unicode?: number; unicodes?: number[] };
			if (g.unicode === cp || g.unicodes?.includes(cp)) return i;
		}
		return -1;
	};
	const kernFor = (font: ReturnType<typeof buildFont>['font'], lcp: number, rcp: number) => {
		const li = indexOfCodepoint(font, lcp);
		const ri = indexOfCodepoint(font, rcp);
		return font.kerningPairs[`${li},${ri}`];
	};

	it('inherits family-only pairs into the export', () => {
		const { font } = buildFont(baseProject, { family });
		// V A is family-only at -30 — should appear in the export.
		expect(kernFor(font, 0x56, 0x41)).toBe(-30);
	});

	it("project's pair wins on collision with family", () => {
		const { font } = buildFont(baseProject, { family });
		// A V — project says -10, family says -50, project should win.
		expect(kernFor(font, 0x41, 0x56)).toBe(-10);
	});

	it('omits family kerning when family option is null', () => {
		const { font } = buildFont(baseProject, { family: null });
		// V A should NOT be present (it's family-only and no family was passed).
		expect(kernFor(font, 0x56, 0x41)).toBeUndefined();
	});

	it('falls back to project-only kerning when family arg is omitted', () => {
		const { font } = buildFont(baseProject);
		expect(Object.keys(font.kerningPairs)).toHaveLength(1);
	});
});
