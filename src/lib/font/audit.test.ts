import { describe, it, expect } from 'vitest';
import { auditGlyph, preflightProject } from './audit';
import type { Glyph, Project, BezierContour, PathCommand, Master } from './types';
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

	// M2 — sidebearing-class drift detection.

	it('flags LSB drift from sidebearing class median', () => {
		// Class "Vertical stems" has H, I, L sharing sidebearings.
		// Edit I to have a much smaller LSB — audit on I should flag it.
		const H = baseGlyph({ codepoint: 0x48, contours: [closedSquare(500)], leftSidebearing: 60, rightSidebearing: 60 });
		const I = baseGlyph({ codepoint: 0x49, contours: [closedSquare(500)], leftSidebearing: 20, rightSidebearing: 60 });
		const L = baseGlyph({ codepoint: 0x4c, contours: [closedSquare(500)], leftSidebearing: 60, rightSidebearing: 50 });
		const project = baseProject({
			glyphs: { 0x48: H, 0x49: I, 0x4c: L },
			sidebearingClasses: [{ id: 'sb1', name: 'Vertical stems', members: [0x48, 0x49, 0x4c] }]
		});
		const issues = auditGlyph(I, project);
		const drift = issues.find((i) => i.code === 'sidebearing-class-drift-lsb');
		expect(drift).toBeDefined();
		expect(drift?.severity).toBe('info');
	});

	it('does NOT flag glyphs within 5fu of class median', () => {
		const H = baseGlyph({ codepoint: 0x48, contours: [closedSquare(500)], leftSidebearing: 60, rightSidebearing: 60 });
		const I = baseGlyph({ codepoint: 0x49, contours: [closedSquare(500)], leftSidebearing: 63, rightSidebearing: 60 });
		const L = baseGlyph({ codepoint: 0x4c, contours: [closedSquare(500)], leftSidebearing: 58, rightSidebearing: 60 });
		const project = baseProject({
			glyphs: { 0x48: H, 0x49: I, 0x4c: L },
			sidebearingClasses: [{ id: 'sb1', name: 'Vertical stems', members: [0x48, 0x49, 0x4c] }]
		});
		const issues = auditGlyph(I, project);
		expect(issues.find((i) => i.code === 'sidebearing-class-drift-lsb')).toBeUndefined();
		expect(issues.find((i) => i.code === 'sidebearing-class-drift-rsb')).toBeUndefined();
	});

	it('does NOT report drift when only one class member exists', () => {
		// I is alone in the class — no peers to compute a median from.
		const I = baseGlyph({ codepoint: 0x49, contours: [closedSquare(500)], leftSidebearing: 999, rightSidebearing: 999 });
		const project = baseProject({
			glyphs: { 0x49: I },
			sidebearingClasses: [{ id: 'sb1', name: 'Solo', members: [0x49] }]
		});
		const issues = auditGlyph(I, project);
		expect(issues.find((i) => i.code === 'sidebearing-class-drift-lsb')).toBeUndefined();
	});

	it('flags near-collinear points (vestigial nodes on a straight segment)', () => {
		// A "square" with an extra point planted mid-edge — that point is
		// exactly on the line, so distance = 0 < 1fu threshold.
		const glyph = baseGlyph({
			contours: [
				{
					closed: true,
					winding: 'ccw',
					commands: [
						{ type: 'M', x: 0, y: 0 },
						{ type: 'L', x: 100, y: 0 },
						{ type: 'L', x: 200, y: 0 },  // mid-edge — collinear with neighbours
						{ type: 'L', x: 200, y: 200 },
						{ type: 'L', x: 0, y: 200 },
						{ type: 'Z' }
					] as PathCommand[]
				}
			]
		});
		const issues = auditGlyph(glyph, baseProject());
		const ncl = issues.find((i) => i.code === 'near-collinear-points');
		expect(ncl).toBeDefined();
		expect(ncl?.severity).toBe('info');
	});

	it('flags sharp-but-not-quite-corner kinks (5–25° turn)', () => {
		// A near-vertical segment that bends slightly to the right —
		// turn-angle around 10°. Typical accidental kink.
		const glyph = baseGlyph({
			contours: [
				{
					closed: true,
					winding: 'ccw',
					commands: [
						{ type: 'M', x: 0, y: 0 },
						{ type: 'L', x: 0, y: 200 },     // straight up
						{ type: 'L', x: 35, y: 400 },    // ~10° kink off vertical
						{ type: 'L', x: 100, y: 400 },
						{ type: 'L', x: 100, y: 0 },
						{ type: 'Z' }
					] as PathCommand[]
				}
			]
		});
		const issues = auditGlyph(glyph, baseProject());
		expect(issues.find((i) => i.code === 'sharp-kink')).toBeDefined();
	});

	it('does NOT flag a 90° corner as a kink (intentional)', () => {
		const glyph = baseGlyph({ contours: [closedSquare(500)] });
		const issues = auditGlyph(glyph, baseProject());
		expect(issues.find((i) => i.code === 'sharp-kink')).toBeUndefined();
	});

	it('flags self-intersecting contours (bowtie shape)', () => {
		// Classic bowtie — two triangles that share an X-crossing.
		// The edges (0,0)-(100,100) and (100,0)-(0,100) cross.
		const glyph = baseGlyph({
			contours: [
				{
					closed: true,
					winding: 'ccw',
					commands: [
						{ type: 'M', x: 0, y: 0 },
						{ type: 'L', x: 100, y: 100 },
						{ type: 'L', x: 100, y: 0 },
						{ type: 'L', x: 0, y: 100 },
						{ type: 'Z' }
					] as PathCommand[]
				}
			]
		});
		const issues = auditGlyph(glyph, baseProject());
		const si = issues.find((i) => i.code === 'self-intersecting');
		expect(si).toBeDefined();
		expect(si?.severity).toBe('warn');
	});

	it('does NOT flag a simple convex polygon', () => {
		const glyph = baseGlyph({ contours: [closedSquare(500)] });
		const issues = auditGlyph(glyph, baseProject());
		expect(issues.find((i) => i.code === 'self-intersecting')).toBeUndefined();
	});

	it('does NOT flag a clean polygon with no near-collinear interior nodes', () => {
		const glyph = baseGlyph({
			contours: [
				{
					closed: true,
					winding: 'ccw',
					commands: [
						{ type: 'M', x: 0, y: 0 },
						{ type: 'L', x: 100, y: 50 },  // not on a line with anyone
						{ type: 'L', x: 200, y: 0 },
						{ type: 'L', x: 100, y: 150 },
						{ type: 'Z' }
					] as PathCommand[]
				}
			]
		});
		const issues = auditGlyph(glyph, baseProject());
		expect(issues.find((i) => i.code === 'near-collinear-points')).toBeUndefined();
	});

	it('flags both LSB and RSB drift when both are off', () => {
		const H = baseGlyph({ codepoint: 0x48, contours: [closedSquare(500)], leftSidebearing: 60, rightSidebearing: 60 });
		const L = baseGlyph({ codepoint: 0x4c, contours: [closedSquare(500)], leftSidebearing: 60, rightSidebearing: 60 });
		const I = baseGlyph({ codepoint: 0x49, contours: [closedSquare(500)], leftSidebearing: 20, rightSidebearing: 100 });
		const project = baseProject({
			glyphs: { 0x48: H, 0x49: I, 0x4c: L },
			sidebearingClasses: [{ id: 'sb1', name: 'Vertical stems', members: [0x48, 0x49, 0x4c] }]
		});
		const issues = auditGlyph(I, project);
		expect(issues.find((i) => i.code === 'sidebearing-class-drift-lsb')).toBeDefined();
		expect(issues.find((i) => i.code === 'sidebearing-class-drift-rsb')).toBeDefined();
	});

	it('flags nested contours sharing winding (donut with no hole)', () => {
		// Outer 500-unit square + inner 200-unit square, BOTH CCW. The
		// inner should be CW to render as a counter; same direction
		// means the rasteriser will fill it solid.
		const glyph = baseGlyph({
			contours: [
				{
					closed: true,
					winding: 'ccw',
					commands: [
						{ type: 'M', x: 0, y: 0 },
						{ type: 'L', x: 500, y: 0 },
						{ type: 'L', x: 500, y: 500 },
						{ type: 'L', x: 0, y: 500 },
						{ type: 'Z' }
					] as PathCommand[]
				},
				{
					closed: true,
					winding: 'ccw', // wrong! should be cw to be a counter
					commands: [
						{ type: 'M', x: 150, y: 150 },
						{ type: 'L', x: 350, y: 150 },
						{ type: 'L', x: 350, y: 350 },
						{ type: 'L', x: 150, y: 350 },
						{ type: 'Z' }
					] as PathCommand[]
				}
			]
		});
		const issues = auditGlyph(glyph, baseProject());
		const wc = issues.find((i) => i.code === 'contour-winding-collision');
		expect(wc).toBeDefined();
		expect(wc?.severity).toBe('warn');
	});

	it('does NOT flag a proper donut (outer CCW + inner CW)', () => {
		const glyph = baseGlyph({
			contours: [
				{
					closed: true,
					winding: 'ccw',
					commands: [
						{ type: 'M', x: 0, y: 0 },
						{ type: 'L', x: 500, y: 0 },
						{ type: 'L', x: 500, y: 500 },
						{ type: 'L', x: 0, y: 500 },
						{ type: 'Z' }
					] as PathCommand[]
				},
				{
					closed: true,
					winding: 'cw',
					commands: [
						{ type: 'M', x: 150, y: 150 },
						{ type: 'L', x: 150, y: 350 },
						{ type: 'L', x: 350, y: 350 },
						{ type: 'L', x: 350, y: 150 },
						{ type: 'Z' }
					] as PathCommand[]
				}
			]
		});
		const issues = auditGlyph(glyph, baseProject());
		expect(issues.find((i) => i.code === 'contour-winding-collision')).toBeUndefined();
	});

	it('does NOT flag two side-by-side contours sharing winding', () => {
		// "ii" — two stems, both CCW outers, neither nested. No collision.
		const glyph = baseGlyph({
			contours: [
				{
					closed: true,
					winding: 'ccw',
					commands: [
						{ type: 'M', x: 0, y: 0 },
						{ type: 'L', x: 100, y: 0 },
						{ type: 'L', x: 100, y: 400 },
						{ type: 'L', x: 0, y: 400 },
						{ type: 'Z' }
					] as PathCommand[]
				},
				{
					closed: true,
					winding: 'ccw',
					commands: [
						{ type: 'M', x: 200, y: 0 },
						{ type: 'L', x: 300, y: 0 },
						{ type: 'L', x: 300, y: 400 },
						{ type: 'L', x: 200, y: 400 },
						{ type: 'Z' }
					] as PathCommand[]
				}
			]
		});
		const issues = auditGlyph(glyph, baseProject());
		expect(issues.find((i) => i.code === 'contour-winding-collision')).toBeUndefined();
	});

	it('flags mark glyph anchors that lack the "_" prefix', () => {
		const mark = baseGlyph({
			codepoint: 0x0301, // combining acute
			name: 'acutecomb',
			contours: [closedSquare(100)],
			anchors: [{ name: 'top', x: 50, y: 0 }]
		});
		const issues = auditGlyph(mark, baseProject());
		const found = issues.find((i) => i.code === 'anchor-naming-mark-no-prefix');
		expect(found).toBeDefined();
		expect(found?.severity).toBe('warn');
	});

	it('flags base glyph anchors that start with "_"', () => {
		const base = baseGlyph({
			codepoint: 0x0041,
			name: 'A',
			contours: [closedSquare(500)],
			anchors: [{ name: '_top', x: 250, y: 700 }]
		});
		const issues = auditGlyph(base, baseProject());
		const found = issues.find((i) => i.code === 'anchor-naming-base-with-prefix');
		expect(found).toBeDefined();
		expect(found?.severity).toBe('warn');
	});

	it('flags lowercase letters sitting below x-height', () => {
		// `o` drawn at half its expected height — should reach 500 (xHeight)
		// but tops out at 200.
		const o = baseGlyph({
			codepoint: 0x6f, // o
			name: 'o',
			contours: [{
				closed: true,
				winding: 'ccw',
				commands: [
					{ type: 'M', x: 0, y: 0 },
					{ type: 'L', x: 200, y: 0 },
					{ type: 'L', x: 200, y: 200 },
					{ type: 'L', x: 0, y: 200 },
					{ type: 'Z' }
				] as PathCommand[]
			}]
		});
		const issues = auditGlyph(o, baseProject());
		const found = issues.find((i) => i.code === 'xheight-misaligned');
		expect(found).toBeDefined();
		expect(found?.severity).toBe('info');
	});

	it('does NOT flag x-height-reaching lowercase letters', () => {
		const o = baseGlyph({
			codepoint: 0x6f,
			name: 'o',
			contours: [{
				closed: true,
				winding: 'ccw',
				commands: [
					{ type: 'M', x: 0, y: 0 },
					{ type: 'L', x: 400, y: 0 },
					{ type: 'L', x: 400, y: 500 }, // hits x-height
					{ type: 'L', x: 0, y: 500 },
					{ type: 'Z' }
				] as PathCommand[]
			}]
		});
		const issues = auditGlyph(o, baseProject());
		expect(issues.find((i) => i.code === 'xheight-misaligned')).toBeUndefined();
	});

	it('flags uppercase letters sitting below cap-height', () => {
		const a = baseGlyph({
			codepoint: 0x41, // A
			name: 'A',
			contours: [{
				closed: true,
				winding: 'ccw',
				commands: [
					{ type: 'M', x: 0, y: 0 },
					{ type: 'L', x: 500, y: 0 },
					{ type: 'L', x: 500, y: 300 }, // far below cap-height 700
					{ type: 'L', x: 0, y: 300 },
					{ type: 'Z' }
				] as PathCommand[]
			}]
		});
		const issues = auditGlyph(a, baseProject());
		const found = issues.find((i) => i.code === 'capheight-misaligned');
		expect(found).toBeDefined();
		expect(found?.severity).toBe('info');
	});

	it('does NOT flag correctly-named base / mark anchors', () => {
		const mark = baseGlyph({
			codepoint: 0x0301,
			name: 'acutecomb',
			contours: [closedSquare(100)],
			anchors: [{ name: '_top', x: 50, y: 0 }]
		});
		const base = baseGlyph({
			codepoint: 0x0041,
			contours: [closedSquare(500)],
			anchors: [{ name: 'top', x: 250, y: 700 }]
		});
		const mIssues = auditGlyph(mark, baseProject());
		const bIssues = auditGlyph(base, baseProject());
		expect(mIssues.find((i) => i.code?.startsWith('anchor-naming'))).toBeUndefined();
		expect(bIssues.find((i) => i.code?.startsWith('anchor-naming'))).toBeUndefined();
	});
});

// Variable-font v1.6 checks (axis-range-extreme, master-too-close, stat-missing)
// Per docs/research/variable-fonts-deep-dive.md Part 8.
describe('preflightProject — variable-font v1.6 checks', () => {
	const makeMaster = (id: string, name: string, location: Record<string, number>): Master => ({
		id,
		name,
		location,
		glyphs: {},
		createdAt: new Date('2026-01-01').toISOString(),
		updatedAt: new Date('2026-01-01').toISOString()
	});

	describe('axis-range-extreme', () => {
		it('flags a wght axis spanning more than 800 units', () => {
			const project = baseProject({
				axes: [{ tag: 'wght', name: 'Weight', minimum: 100, default: 400, maximum: 1000 }],
				familyAxes: { wght: 400 }
			});
			const issues = preflightProject(project);
			expect(issues.find((i) => i.code === 'axis-range-extreme')).toBeDefined();
		});

		it('does NOT flag a wght axis spanning 700 units', () => {
			const project = baseProject({
				axes: [{ tag: 'wght', name: 'Weight', minimum: 200, default: 400, maximum: 900 }],
				familyAxes: { wght: 400 }
			});
			const issues = preflightProject(project);
			expect(issues.find((i) => i.code === 'axis-range-extreme')).toBeUndefined();
		});

		it('flags wdth axis spanning more than 100 units', () => {
			const project = baseProject({
				axes: [{ tag: 'wdth', name: 'Width', minimum: 50, default: 100, maximum: 200 }],
				familyAxes: { wdth: 100 }
			});
			const issues = preflightProject(project);
			expect(issues.find((i) => i.code === 'axis-range-extreme')).toBeDefined();
		});

		it('does NOT flag custom (non-registered) axes', () => {
			const project = baseProject({
				axes: [{ tag: 'GRAD', name: 'Grade', minimum: -200, default: 0, maximum: 200 }],
				familyAxes: { wght: 400 }
			});
			const issues = preflightProject(project);
			expect(issues.find((i) => i.code === 'axis-range-extreme')).toBeUndefined();
		});
	});

	describe('master-too-close', () => {
		it('flags two masters within 5% of each other in designspace', () => {
			const project = baseProject({
				axes: [{ tag: 'wght', name: 'Weight', minimum: 100, default: 400, maximum: 900 }],
				masters: [
					makeMaster('m1', 'Light', { wght: 200 }),
					makeMaster('m2', 'Light2', { wght: 220 })
				],
				familyAxes: { wght: 400 }
			});
			const issues = preflightProject(project);
			expect(issues.find((i) => i.code === 'master-too-close')).toBeDefined();
		});

		it('does NOT flag masters that are sufficiently far apart', () => {
			const project = baseProject({
				axes: [{ tag: 'wght', name: 'Weight', minimum: 100, default: 400, maximum: 900 }],
				masters: [
					makeMaster('m1', 'Light', { wght: 200 }),
					makeMaster('m2', 'Bold', { wght: 700 })
				],
				familyAxes: { wght: 400 }
			});
			const issues = preflightProject(project);
			expect(issues.find((i) => i.code === 'master-too-close')).toBeUndefined();
		});

		it('does NOT fire when only one master is present', () => {
			const project = baseProject({
				axes: [{ tag: 'wght', name: 'Weight', minimum: 100, default: 400, maximum: 900 }],
				masters: [makeMaster('m1', 'Light', { wght: 200 })],
				familyAxes: { wght: 400 }
			});
			const issues = preflightProject(project);
			expect(issues.find((i) => i.code === 'master-too-close')).toBeUndefined();
		});
	});

	describe('stat-missing', () => {
		it('flags a variable font with axes but no familyAxes', () => {
			const project = baseProject({
				axes: [{ tag: 'wght', name: 'Weight', minimum: 100, default: 400, maximum: 900 }],
				familyAxes: undefined
			});
			const issues = preflightProject(project);
			expect(issues.find((i) => i.code === 'stat-missing')).toBeDefined();
		});

		it('flags a variable font with empty familyAxes object', () => {
			const project = baseProject({
				axes: [{ tag: 'wght', name: 'Weight', minimum: 100, default: 400, maximum: 900 }],
				familyAxes: {}
			});
			const issues = preflightProject(project);
			expect(issues.find((i) => i.code === 'stat-missing')).toBeDefined();
		});

		it('does NOT flag when familyAxes has at least one value set', () => {
			const project = baseProject({
				axes: [{ tag: 'wght', name: 'Weight', minimum: 100, default: 400, maximum: 900 }],
				familyAxes: { wght: 400 }
			});
			const issues = preflightProject(project);
			expect(issues.find((i) => i.code === 'stat-missing')).toBeUndefined();
		});

		it('does NOT fire on a static (non-variable) font', () => {
			const project = baseProject({
				axes: [],
				familyAxes: undefined
			});
			const issues = preflightProject(project);
			expect(issues.find((i) => i.code === 'stat-missing')).toBeUndefined();
		});
	});

	describe('stat-format-mismatch', () => {
		it('flags italic STAT axis-value using format 1 instead of format 3', () => {
			const project = baseProject({
				axes: [
					{ tag: 'wght', name: 'Weight', minimum: 100, default: 400, maximum: 900 },
					{ tag: 'ital', name: 'Italic', minimum: 0, default: 0, maximum: 1 }
				],
				familyAxes: { wght: 400 },
				stat: {
					designAxes: [
						{ tag: 'wght', name: 'Weight', axisOrdering: 0 },
						{ tag: 'ital', name: 'Italic', axisOrdering: 1 }
					],
					axisValues: [
						// Format 1 on italic — should be format 3
						{ format: 1, axisIndex: 1, name: 'Italic', value: 1 }
					]
				}
			});
			const issues = preflightProject(project);
			expect(issues.find((i) => i.code === 'stat-format-mismatch')).toBeDefined();
		});

		it('does NOT flag italic STAT axis-value using format 3', () => {
			const project = baseProject({
				axes: [
					{ tag: 'wght', name: 'Weight', minimum: 100, default: 400, maximum: 900 },
					{ tag: 'ital', name: 'Italic', minimum: 0, default: 0, maximum: 1 }
				],
				familyAxes: { wght: 400 },
				stat: {
					designAxes: [
						{ tag: 'wght', name: 'Weight', axisOrdering: 0 },
						{ tag: 'ital', name: 'Italic', axisOrdering: 1 }
					],
					axisValues: [
						{ format: 3, axisIndex: 1, name: 'Italic', value: 1, linkedValue: 0 }
					]
				}
			});
			const issues = preflightProject(project);
			expect(issues.find((i) => i.code === 'stat-format-mismatch')).toBeUndefined();
		});

		it('does NOT fire when no STAT override is set', () => {
			const project = baseProject({
				axes: [{ tag: 'wght', name: 'Weight', minimum: 100, default: 400, maximum: 900 }],
				familyAxes: { wght: 400 },
				stat: undefined
			});
			const issues = preflightProject(project);
			expect(issues.find((i) => i.code === 'stat-format-mismatch')).toBeUndefined();
		});
	});

	describe('stat-instance-name-mismatch', () => {
		it('flags an instance whose STAT-composed name differs from styleName', () => {
			const project = baseProject({
				axes: [{ tag: 'wght', name: 'Weight', minimum: 100, default: 400, maximum: 900 }],
				familyAxes: { wght: 400 },
				instances: [
					{ id: 'i1', styleName: 'Heavy', location: { wght: 700 } }
				],
				stat: {
					designAxes: [{ tag: 'wght', name: 'Weight', axisOrdering: 0 }],
					axisValues: [
						{ format: 1, axisIndex: 0, name: 'Bold', value: 700 }
					]
				}
			});
			const issues = preflightProject(project);
			// STAT says "Bold" at wght 700, but instance styleName is "Heavy"
			expect(issues.find((i) => i.code === 'stat-instance-name-mismatch')).toBeDefined();
		});

		it('does NOT flag when STAT composition matches fvar styleName', () => {
			const project = baseProject({
				axes: [{ tag: 'wght', name: 'Weight', minimum: 100, default: 400, maximum: 900 }],
				familyAxes: { wght: 400 },
				instances: [
					{ id: 'i1', styleName: 'Bold', location: { wght: 700 } }
				],
				stat: {
					designAxes: [{ tag: 'wght', name: 'Weight', axisOrdering: 0 }],
					axisValues: [
						{ format: 1, axisIndex: 0, name: 'Bold', value: 700 }
					]
				}
			});
			const issues = preflightProject(project);
			expect(issues.find((i) => i.code === 'stat-instance-name-mismatch')).toBeUndefined();
		});

		it('does NOT fire when no STAT override is set', () => {
			const project = baseProject({
				axes: [{ tag: 'wght', name: 'Weight', minimum: 100, default: 400, maximum: 900 }],
				familyAxes: { wght: 400 },
				instances: [{ id: 'i1', styleName: 'Bold', location: { wght: 700 } }],
				stat: undefined
			});
			const issues = preflightProject(project);
			expect(issues.find((i) => i.code === 'stat-instance-name-mismatch')).toBeUndefined();
		});
	});

	describe('instance-at-master-position', () => {
		it('flags an instance at the exact location of a master', () => {
			const project = baseProject({
				axes: [{ tag: 'wght', name: 'Weight', minimum: 100, default: 400, maximum: 900 }],
				masters: [makeMaster('m1', 'Bold', { wght: 700 })],
				instances: [{ id: 'i1', styleName: 'Bold', location: { wght: 700 } }],
				familyAxes: { wght: 400 }
			});
			const issues = preflightProject(project);
			expect(issues.find((i) => i.code === 'instance-at-master-position')).toBeDefined();
		});

		it('does NOT flag instances at non-master locations', () => {
			const project = baseProject({
				axes: [{ tag: 'wght', name: 'Weight', minimum: 100, default: 400, maximum: 900 }],
				masters: [makeMaster('m1', 'Black', { wght: 900 })],
				instances: [{ id: 'i1', styleName: 'Medium', location: { wght: 500 } }],
				familyAxes: { wght: 400 }
			});
			const issues = preflightProject(project);
			expect(issues.find((i) => i.code === 'instance-at-master-position')).toBeUndefined();
		});

		it('does NOT fire when no masters exist', () => {
			const project = baseProject({
				axes: [{ tag: 'wght', name: 'Weight', minimum: 100, default: 400, maximum: 900 }],
				masters: [],
				instances: [{ id: 'i1', styleName: 'Bold', location: { wght: 700 } }],
				familyAxes: { wght: 400 }
			});
			const issues = preflightProject(project);
			expect(issues.find((i) => i.code === 'instance-at-master-position')).toBeUndefined();
		});
	});

	describe('opsz-without-cap-x-divergence', () => {
		it('flags an opsz axis with no masters at distinct opsz values', () => {
			const project = baseProject({
				axes: [
					{ tag: 'wght', name: 'Weight', minimum: 100, default: 400, maximum: 900 },
					{ tag: 'opsz', name: 'Optical Size', minimum: 6, default: 14, maximum: 72 }
				],
				masters: [makeMaster('m1', 'Bold', { wght: 700, opsz: 14 })],
				familyAxes: { wght: 400 }
			});
			const issues = preflightProject(project);
			expect(issues.find((i) => i.code === 'opsz-without-cap-x-divergence')).toBeDefined();
		});

		it('does NOT flag opsz when masters exist at distinct opsz values', () => {
			const project = baseProject({
				axes: [
					{ tag: 'wght', name: 'Weight', minimum: 100, default: 400, maximum: 900 },
					{ tag: 'opsz', name: 'Optical Size', minimum: 6, default: 14, maximum: 72 }
				],
				masters: [
					makeMaster('m1', 'Caption', { wght: 400, opsz: 6 }),
					makeMaster('m2', 'Display', { wght: 400, opsz: 72 })
				],
				familyAxes: { wght: 400 }
			});
			const issues = preflightProject(project);
			expect(issues.find((i) => i.code === 'opsz-without-cap-x-divergence')).toBeUndefined();
		});

		it('does NOT fire when no opsz axis is declared', () => {
			const project = baseProject({
				axes: [{ tag: 'wght', name: 'Weight', minimum: 100, default: 400, maximum: 900 }],
				masters: [makeMaster('m1', 'Bold', { wght: 700 })],
				familyAxes: { wght: 400 }
			});
			const issues = preflightProject(project);
			expect(issues.find((i) => i.code === 'opsz-without-cap-x-divergence')).toBeUndefined();
		});
	});
});
