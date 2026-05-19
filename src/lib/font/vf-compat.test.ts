import { describe, it, expect } from 'vitest';
import { checkMasterCompatibility, summarizeCompatibility } from './vf-compat';
import type { Glyph, Master, PathCommand, Project } from './types';
import { DEFAULT_METRICS } from './types';

// Fixtures ----------------------------------------------------------------

const baseGlyph = (overrides: Partial<Glyph> = {}): Glyph =>
	({
		codepoint: 0x41,
		name: 'A',
		status: 'final',
		advanceWidth: 600,
		leftSidebearing: 50,
		rightSidebearing: 50,
		contours: [],
		updatedAt: '2026-01-01',
		...overrides
	}) as Glyph;

const squareCommands = (): PathCommand[] => [
	{ type: 'M', x: 0, y: 0 },
	{ type: 'L', x: 500, y: 0 },
	{ type: 'L', x: 500, y: 500 },
	{ type: 'L', x: 0, y: 500 },
	{ type: 'Z' }
];

const curveCommands = (): PathCommand[] => [
	{ type: 'M', x: 0, y: 0 },
	{ type: 'C', x1: 30, y1: 0, x2: 70, y2: 100, x: 100, y: 100 },
	{ type: 'Z' }
];

const squareGlyph = (cp: number, name: string, size = 500): Glyph =>
	baseGlyph({
		codepoint: cp,
		name,
		contours: [
			{
				closed: true,
				winding: 'ccw',
				commands: squareCommands().map((c) => {
					if (c.type === 'L' || c.type === 'M') return { ...c, x: c.x * (size / 500), y: c.y * (size / 500) };
					return c;
				})
			}
		]
	});

const master = (overrides: Partial<Master> = {}): Master =>
	({
		id: overrides.id ?? 'm1',
		name: overrides.name ?? 'Bold',
		location: { wght: 700 },
		glyphs: {},
		createdAt: '2026-01-01',
		updatedAt: '2026-01-01',
		...overrides
	}) as Master;

const project = (overrides: Partial<Project> = {}): Project =>
	({
		id: 't',
		name: 't',
		metadata: { familyName: 't', styleName: 'r', version: '1', designer: '', copyright: '', license: '' },
		metrics: DEFAULT_METRICS,
		glyphs: {},
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
		createdAt: '2026-01-01',
		...overrides
	}) as Project;

// Tests -------------------------------------------------------------------

describe('checkMasterCompatibility', () => {
	it('returns ok=true when no masters exist (single-master project)', () => {
		const report = checkMasterCompatibility(project({ glyphs: { 0x41: squareGlyph(0x41, 'A') } }));
		expect(report.ok).toBe(true);
		expect(report.masterCount).toBe(0);
		expect(report.issues).toEqual([]);
	});

	it('returns ok=true when every master matches the default master topology', () => {
		const p = project({
			glyphs: { 0x41: squareGlyph(0x41, 'A') },
			masters: [
				master({
					id: 'bold',
					name: 'Bold',
					glyphs: { 0x41: squareGlyph(0x41, 'A', 600) } // same topology, different sizes
				})
			]
		});
		const report = checkMasterCompatibility(p);
		expect(report.ok).toBe(true);
		expect(report.issues).toEqual([]);
		expect(report.checkedGlyphCount).toBe(1);
	});

	it('flags missing-in-master when a master lacks a drawn default glyph', () => {
		const p = project({
			glyphs: { 0x41: squareGlyph(0x41, 'A'), 0x42: squareGlyph(0x42, 'B') },
			masters: [master({ id: 'bold', name: 'Bold', glyphs: { 0x41: squareGlyph(0x41, 'A') } })]
		});
		const report = checkMasterCompatibility(p);
		expect(report.ok).toBe(false);
		expect(report.issues).toHaveLength(1);
		expect(report.issues[0].code).toBe('missing-in-master');
		expect(report.issues[0].glyphName).toBe('B');
		expect(report.issues[0].message).toContain('missing in Bold');
	});

	it('flags extra-in-master when a master has glyphs the default does not', () => {
		const p = project({
			glyphs: { 0x41: squareGlyph(0x41, 'A') },
			masters: [
				master({
					id: 'bold',
					name: 'Bold',
					glyphs: { 0x41: squareGlyph(0x41, 'A'), 0x42: squareGlyph(0x42, 'B') }
				})
			]
		});
		const report = checkMasterCompatibility(p);
		expect(report.ok).toBe(false);
		expect(report.issues).toHaveLength(1);
		expect(report.issues[0].code).toBe('extra-in-master');
	});

	it('flags contour-count mismatch', () => {
		const defaultA = squareGlyph(0x41, 'A'); // 1 contour
		// Bold has 2 contours
		const boldA = baseGlyph({
			codepoint: 0x41,
			name: 'A',
			contours: [
				{ closed: true, winding: 'ccw', commands: squareCommands() },
				{ closed: true, winding: 'cw', commands: squareCommands() }
			]
		});
		const p = project({
			glyphs: { 0x41: defaultA },
			masters: [master({ glyphs: { 0x41: boldA } })]
		});
		const report = checkMasterCompatibility(p);
		expect(report.issues.some((i) => i.code === 'contour-count')).toBe(true);
	});

	it('flags point-count mismatch within a contour', () => {
		const defaultA = squareGlyph(0x41, 'A'); // 5 commands (M L L L Z)
		const boldA = baseGlyph({
			codepoint: 0x41,
			name: 'A',
			contours: [
				{
					closed: true,
					winding: 'ccw',
					commands: [
						{ type: 'M', x: 0, y: 0 },
						{ type: 'L', x: 500, y: 0 },
						{ type: 'L', x: 250, y: 500 },
						{ type: 'Z' }
					]
				}
			]
		});
		const p = project({
			glyphs: { 0x41: defaultA },
			masters: [master({ glyphs: { 0x41: boldA } })]
		});
		const report = checkMasterCompatibility(p);
		expect(report.issues.some((i) => i.code === 'point-count')).toBe(true);
	});

	it('flags point-type mismatch (line vs curve)', () => {
		const defaultA = squareGlyph(0x41, 'A'); // M L L L Z
		const boldA = baseGlyph({
			codepoint: 0x41,
			name: 'A',
			contours: [
				{
					closed: true,
					winding: 'ccw',
					commands: [
						{ type: 'M', x: 0, y: 0 },
						{ type: 'C', x1: 30, y1: 0, x2: 70, y2: 100, x: 100, y: 100 }, // C, not L
						{ type: 'L', x: 500, y: 500 },
						{ type: 'L', x: 0, y: 500 },
						{ type: 'Z' }
					]
				}
			]
		});
		const p = project({
			glyphs: { 0x41: defaultA },
			masters: [master({ glyphs: { 0x41: boldA } })]
		});
		const report = checkMasterCompatibility(p);
		expect(report.issues.some((i) => i.code === 'point-type')).toBe(true);
	});

	it('reports issues across multiple masters', () => {
		const p = project({
			glyphs: { 0x41: squareGlyph(0x41, 'A') },
			masters: [
				master({ id: 'bold', name: 'Bold', glyphs: {} }), // missing
				master({
					id: 'cond',
					name: 'Condensed',
					glyphs: {
						0x41: baseGlyph({
							codepoint: 0x41,
							name: 'A',
							contours: [{ closed: true, winding: 'ccw', commands: curveCommands() }]
						})
					}
				}) // point-count + type
			]
		});
		const report = checkMasterCompatibility(p);
		expect(report.issues.length).toBeGreaterThan(1);
		const masterNames = new Set(report.issues.map((i) => i.masterName));
		expect(masterNames.has('Bold')).toBe(true);
		expect(masterNames.has('Condensed')).toBe(true);
	});

	it('checkedGlyphCount counts drawn-in-default glyphs only', () => {
		const p = project({
			glyphs: {
				0x41: squareGlyph(0x41, 'A'),
				0x42: baseGlyph({ codepoint: 0x42, name: 'B', contours: [] }) // undrawn
			},
			masters: [master({ glyphs: { 0x41: squareGlyph(0x41, 'A') } })]
		});
		const report = checkMasterCompatibility(p);
		expect(report.checkedGlyphCount).toBe(1); // only 'A'
	});
});

describe('summarizeCompatibility', () => {
	it('produces a positive summary when ok', () => {
		const summary = summarizeCompatibility({
			ok: true,
			masterCount: 2,
			checkedGlyphCount: 50,
			issues: []
		});
		expect(summary).toContain('2 masters compatible');
		expect(summary).toContain('50 glyphs');
	});

	it('groups issues by master name in the summary', () => {
		const summary = summarizeCompatibility({
			ok: false,
			masterCount: 1,
			checkedGlyphCount: 10,
			issues: [
				{
					code: 'point-count',
					masterId: 'b',
					masterName: 'Bold',
					codepoint: 0x41,
					glyphName: 'A',
					message: 'A contour 1: default has 5 points, Bold has 4'
				}
			]
		});
		expect(summary).toContain('1 incompatibility');
		expect(summary).toContain('Bold');
		expect(summary).toContain('A contour 1');
	});

	it('truncates to 3 issues per master with a "… and N more" line', () => {
		const issues = Array.from({ length: 5 }, (_, i) => ({
			code: 'point-count' as const,
			masterId: 'b',
			masterName: 'Bold',
			codepoint: 0x41 + i,
			glyphName: String.fromCharCode(0x41 + i),
			message: `glyph ${i} issue`
		}));
		const summary = summarizeCompatibility({
			ok: false,
			masterCount: 1,
			checkedGlyphCount: 10,
			issues
		});
		expect(summary).toContain('… and 2 more');
	});
});
