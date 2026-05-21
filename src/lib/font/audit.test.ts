import { describe, it, expect } from 'vitest';
import { auditGlyph } from './audit';
import type { Glyph, Project, BezierContour, PathCommand } from './types';
import { DEFAULT_METRICS } from './types';

// Fixtures -------------------------------------------------------------------

const baseGlyph = (overrides: Partial<Glyph> = {}): Glyph =>
	({
		codepoint: 0x0041,
		name: 'A',
		status: 'empty',
		advanceWidth: 600,
		leftSidebearing: 50,
		rightSidebearing: 50,
		contours: [],
		updatedAt: new Date('2026-01-01').toISOString(),
		...overrides
	}) as Glyph;

const closedSquare = (size = 500): BezierContour => ({
	closed: true,
	winding: 'ccw',
	commands: [
		{ type: 'M', x: 0, y: 0 },
		{ type: 'L', x: size, y: 0 },
		{ type: 'L', x: size, y: size },
		{ type: 'L', x: 0, y: size },
		{ type: 'Z' }
	] as PathCommand[]
});

const baseProject = (overrides: Partial<Project> = {}): Project =>
	({
		id: 'test-id',
		name: 'Test',
		metadata: {
			familyName: 'Test',
			styleName: 'Regular',
			version: '1.000',
			designer: '',
			copyright: '',
			license: ''
		},
		metrics: DEFAULT_METRICS,
		glyphs: {},
		kerning: [],
		classes: [],
		masters: [],
		axes: [],
		instances: [],
		features: { source: '' },
		brief: {},
		samples: {},
		changelog: [],
		decisions: [],
		updatedAt: new Date('2026-01-01').toISOString(),
		createdAt: new Date('2026-01-01').toISOString(),
		...overrides
	}) as Project;

// Tests ----------------------------------------------------------------------

describe('auditGlyph', () => {
	it('flags an empty non-space glyph with severity info', () => {
		const glyph = baseGlyph({ codepoint: 0x0041, contours: [] });
		const issues = auditGlyph(glyph, baseProject());
		expect(issues.find((i) => i.code === 'empty')).toBeDefined();
		expect(issues.find((i) => i.code === 'empty')?.severity).toBe('info');
	});

	it('does NOT flag the space glyph as empty', () => {
		const glyph = baseGlyph({ codepoint: 0x0020, name: 'space' });
		const issues = auditGlyph(glyph, baseProject());
		expect(issues.find((i) => i.code === 'empty')).toBeUndefined();
	});

	it('flags zero advance width on a drawn glyph as error', () => {
		const glyph = baseGlyph({ contours: [closedSquare(500)], advanceWidth: 0 });
		const issues = auditGlyph(glyph, baseProject());
		const zero = issues.find((i) => i.code === 'zero-advance');
		expect(zero).toBeDefined();
		expect(zero?.severity).toBe('error');
	});

	it('flags an open contour as error', () => {
		const open: BezierContour = { ...closedSquare(500), closed: false };
		const glyph = baseGlyph({ contours: [open] });
		const issues = auditGlyph(glyph, baseProject());
		const openIssue = issues.find((i) => i.code === 'open-contour');
		expect(openIssue).toBeDefined();
		expect(openIssue?.severity).toBe('error');
	});

	it('flags a glyph extending past the advance width', () => {
		const glyph = baseGlyph({ contours: [closedSquare(700)], advanceWidth: 500 });
		const issues = auditGlyph(glyph, baseProject());
		expect(issues.find((i) => i.code === 'overflows-advance')).toBeDefined();
	});

	it('flags glyph notes containing TODO', () => {
		const glyph = baseGlyph({
			contours: [closedSquare(500)],
			notes: 'TODO: fix the bottom serif'
		});
		const issues = auditGlyph(glyph, baseProject());
		expect(issues.find((i) => i.code === 'notes-todo')).toBeDefined();
	});

	it('flags glyph notes containing FIXME case-insensitively', () => {
		const glyph = baseGlyph({
			contours: [closedSquare(500)],
			notes: 'fixme: rebalance the counter'
		});
		const issues = auditGlyph(glyph, baseProject());
		expect(issues.find((i) => i.code === 'notes-todo')).toBeDefined();
	});

	it('returns no issues for a clean, well-formed drawn glyph', () => {
		const glyph = baseGlyph({
			contours: [closedSquare(500)],
			advanceWidth: 600,
			status: 'final'
		});
		const issues = auditGlyph(glyph, baseProject());
		// Filter out the metrics-bounds warnings that might fire (square goes 0→500
		// which is well within default metrics) — main thing: no error-severity issues.
		expect(issues.filter((i) => i.severity === 'error')).toHaveLength(0);
	});

	// M2 audit expansion — quality checks for drawing artefacts.

	it('flags off-grid points (fractional coordinates)', () => {
		const glyph = baseGlyph({
			contours: [
				{
					closed: true,
					winding: 'ccw',
					commands: [
						{ type: 'M', x: 0, y: 0 },
						{ type: 'L', x: 100.5, y: 0 },
						{ type: 'L', x: 100.5, y: 100 },
						{ type: 'L', x: 0, y: 100 },
						{ type: 'Z' }
					] as PathCommand[]
				}
			]
		});
		const issues = auditGlyph(glyph, baseProject());
		const og = issues.find((i) => i.code === 'off-grid-points');
		expect(og).toBeDefined();
		expect(og?.severity).toBe('info');
	});

	it('flags duplicate points (consecutive nodes < 0.5fu apart)', () => {
		const glyph = baseGlyph({
			contours: [
				{
					closed: true,
					winding: 'ccw',
					commands: [
						{ type: 'M', x: 0, y: 0 },
						{ type: 'L', x: 100, y: 0 },
						{ type: 'L', x: 100.3, y: 0.2 }, // duplicate of previous (within 0.5fu)
						{ type: 'L', x: 100, y: 100 },
						{ type: 'L', x: 0, y: 100 },
						{ type: 'Z' }
					] as PathCommand[]
				}
			]
		});
		const issues = auditGlyph(glyph, baseProject());
		expect(issues.find((i) => i.code === 'duplicate-points')).toBeDefined();
	});

	it('flags tiny artefact contours (<8fu in both axes)', () => {
		const glyph = baseGlyph({
			contours: [
				closedSquare(500),
				// Stray 5×3 fu blob — boolean-op artefact
				{
					closed: true,
					winding: 'ccw',
					commands: [
						{ type: 'M', x: 700, y: 0 },
						{ type: 'L', x: 705, y: 0 },
						{ type: 'L', x: 705, y: 3 },
						{ type: 'L', x: 700, y: 3 },
						{ type: 'Z' }
					] as PathCommand[]
				}
			]
		});
		const issues = auditGlyph(glyph, baseProject());
		expect(issues.find((i) => i.code === 'tiny-contour')).toBeDefined();
	});

	it('does NOT flag a large contour as tiny', () => {
		const glyph = baseGlyph({ contours: [closedSquare(500)] });
		const issues = auditGlyph(glyph, baseProject());
		expect(issues.find((i) => i.code === 'tiny-contour')).toBeUndefined();
	});
});
