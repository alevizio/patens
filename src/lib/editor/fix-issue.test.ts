// fix-issue.ts touches projectStore (for saveRevision + updateGlyph) and
// toast directly. Most rules pass cleaned contours through the
// `commitContours` callback the editor injects — those branches can be
// tested by spying on the callback. The two non-contour branches
// (zero-advance, anchor-naming-*) use projectStore.updateGlyph directly;
// they're tested with vi.mock + spies on the store module.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fixAuditIssue } from './fix-issue';
import type { Glyph, BezierContour } from '$lib/font/types';

// ---- Mocks ----

vi.mock('$lib/stores/toast.svelte', () => ({
	toast: {
		success: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		info: vi.fn()
	}
}));

vi.mock('$lib/stores/project.svelte', () => ({
	projectStore: {
		project: {
			metrics: { defaultSidebearing: 60 }
		},
		saveRevision: vi.fn(),
		updateGlyph: vi.fn()
	}
}));

// ---- Fixtures ----

const rectContour = (x: number, y: number, w: number, h: number): BezierContour => ({
	closed: true,
	winding: 'ccw',
	commands: [
		{ type: 'M', x, y },
		{ type: 'L', x: x + w, y },
		{ type: 'L', x: x + w, y: y + h },
		{ type: 'L', x, y: y + h },
		{ type: 'Z' }
	]
});

const openContour = (x: number, y: number, w: number, h: number): BezierContour => ({
	closed: false,
	winding: 'ccw',
	commands: [
		{ type: 'M', x, y },
		{ type: 'L', x: x + w, y },
		{ type: 'L', x: x + w, y: y + h },
		{ type: 'L', x, y: y + h }
	]
});

const baseGlyph = (overrides: Partial<Glyph> = {}): Glyph => ({
	codepoint: 0x0041,
	name: 'A',
	status: 'draft',
	advanceWidth: 600,
	leftSidebearing: 50,
	rightSidebearing: 50,
	contours: [rectContour(50, 0, 500, 700)],
	updatedAt: '2026-01-01T00:00:00Z',
	...overrides
});

// ---- Helper: capture the commitContours callback's last arg ----

const captureCommit = () => {
	const calls: BezierContour[][] = [];
	const fn = (c: BezierContour[]) => calls.push(c);
	return { fn, calls, last: () => calls[calls.length - 1] };
};

// ---- Tests: contour-mutating fixes via commitContours ----

describe('fixAuditIssue — contour-mutating rules', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('off-grid-points snaps fractional coords to integers', () => {
		const g = baseGlyph({
			contours: [
				{
					closed: true,
					winding: 'ccw',
					commands: [
						{ type: 'M', x: 1.4, y: 2.7 },
						{ type: 'L', x: 10.1, y: 20.6 },
						{ type: 'Z' }
					]
				}
			]
		});
		const c = captureCommit();
		fixAuditIssue(g, 'off-grid-points', c.fn);
		const out = c.last();
		expect(out[0].commands[0]).toMatchObject({ type: 'M', x: 1, y: 3 });
		expect(out[0].commands[1]).toMatchObject({ type: 'L', x: 10, y: 21 });
	});

	it('open-contour closes every contour', () => {
		const g = baseGlyph({
			contours: [openContour(0, 0, 100, 100), rectContour(200, 0, 100, 100)]
		});
		const c = captureCommit();
		fixAuditIssue(g, 'open-contour', c.fn);
		const out = c.last();
		expect(out[0].closed).toBe(true);
		expect(out[1].closed).toBe(true); // was already closed; stays closed
	});

	it('duplicate-points drops within-0.5fu duplicate L commands', () => {
		const g = baseGlyph({
			contours: [
				{
					closed: true,
					winding: 'ccw',
					commands: [
						{ type: 'M', x: 0, y: 0 },
						{ type: 'L', x: 100, y: 0 },
						{ type: 'L', x: 100.3, y: 0.2 }, // duplicate of previous (within 0.5)
						{ type: 'L', x: 100, y: 100 },
						{ type: 'L', x: 0, y: 100 },
						{ type: 'Z' }
					]
				}
			]
		});
		const c = captureCommit();
		fixAuditIssue(g, 'duplicate-points', c.fn);
		const out = c.last();
		// One L command should be dropped — original had 4 Ls, now 3
		const ls = out[0].commands.filter((cmd) => cmd.type === 'L');
		expect(ls.length).toBe(3);
	});

	it('near-collinear-points drops a midpoint on a straight L-segment', () => {
		const g = baseGlyph({
			contours: [
				{
					closed: true,
					winding: 'ccw',
					commands: [
						{ type: 'M', x: 0, y: 0 },
						{ type: 'L', x: 50, y: 0.3 }, // collinear with M(0,0) → L(100,0)
						{ type: 'L', x: 100, y: 0 },
						{ type: 'L', x: 100, y: 100 },
						{ type: 'L', x: 0, y: 100 },
						{ type: 'Z' }
					]
				}
			]
		});
		const c = captureCommit();
		fixAuditIssue(g, 'near-collinear-points', c.fn);
		const out = c.last();
		const ls = out[0].commands.filter((cmd) => cmd.type === 'L');
		expect(ls.length).toBe(3); // dropped the (50, 0.3) midpoint
	});

	it('tiny-contour removes contours under 8×8 fu', () => {
		const g = baseGlyph({
			contours: [
				rectContour(0, 0, 100, 100), // big — keep
				rectContour(0, 0, 5, 5), // tiny — drop
				rectContour(200, 0, 9, 9) // just over threshold — keep
			]
		});
		const c = captureCommit();
		fixAuditIssue(g, 'tiny-contour', c.fn);
		const out = c.last();
		expect(out.length).toBe(2);
	});

	it('tiny-contour does NOTHING when there are no tiny contours', () => {
		const g = baseGlyph({ contours: [rectContour(0, 0, 100, 100)] });
		const c = captureCommit();
		fixAuditIssue(g, 'tiny-contour', c.fn);
		expect(c.calls.length).toBe(0); // no commit
	});

	it('self-intersecting runs boolean union (commit fires with result)', () => {
		const g = baseGlyph({
			contours: [rectContour(0, 0, 100, 100), rectContour(50, 50, 100, 100)]
		});
		const c = captureCommit();
		fixAuditIssue(g, 'self-intersecting', c.fn);
		expect(c.calls.length).toBe(1);
		expect(c.last().length).toBeGreaterThan(0);
	});

	it('contour-winding-collision also runs boolean union', () => {
		const g = baseGlyph({ contours: [rectContour(0, 0, 100, 100)] });
		const c = captureCommit();
		fixAuditIssue(g, 'contour-winding-collision', c.fn);
		expect(c.calls.length).toBe(1);
	});
});

// ---- Tests: rules that go through projectStore.updateGlyph ----

describe('fixAuditIssue — store-mutating rules', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('zero-advance sets advance = round(bbox.maxX) + defaultSidebearing', async () => {
		const { projectStore } = await import('$lib/stores/project.svelte');
		const g = baseGlyph({ contours: [rectContour(0, 0, 500, 700)] });
		fixAuditIssue(g, 'zero-advance', () => {});
		expect(projectStore.updateGlyph).toHaveBeenCalled();
		// The updater takes a glyph + applies { advanceWidth: target }.
		// target = 500 + 60 (sb) = 560.
		const updater = (projectStore.updateGlyph as unknown as ReturnType<typeof vi.fn>).mock
			.calls[0][1] as (g: Glyph) => Glyph;
		const result = updater(g);
		expect(result.advanceWidth).toBe(560);
	});

	it('overflows-advance shares the same fix as zero-advance', async () => {
		const { projectStore } = await import('$lib/stores/project.svelte');
		const g = baseGlyph({ contours: [rectContour(0, 0, 500, 700)] });
		fixAuditIssue(g, 'overflows-advance', () => {});
		expect(projectStore.updateGlyph).toHaveBeenCalled();
	});

	it('zero-advance does nothing on an empty glyph', async () => {
		const { projectStore } = await import('$lib/stores/project.svelte');
		const g = baseGlyph({ contours: [] });
		fixAuditIssue(g, 'zero-advance', () => {});
		expect(projectStore.updateGlyph).not.toHaveBeenCalled();
	});

	it('anchor-naming-mark-no-prefix prefixes anchor names for mark codepoints', async () => {
		const { projectStore } = await import('$lib/stores/project.svelte');
		// U+0301 (combining acute) is in the mark range 0x0300-0x036F
		const g = baseGlyph({
			codepoint: 0x0301,
			anchors: [
				{ name: 'top', x: 50, y: 700 },
				{ name: 'bottom', x: 50, y: 0 }
			]
		});
		fixAuditIssue(g, 'anchor-naming-mark-no-prefix', () => {});
		const updater = (projectStore.updateGlyph as unknown as ReturnType<typeof vi.fn>).mock
			.calls[0][1] as (g: Glyph) => Glyph;
		const result = updater(g);
		expect(result.anchors).toEqual([
			{ name: '_top', x: 50, y: 700 },
			{ name: '_bottom', x: 50, y: 0 }
		]);
	});

	it('anchor-naming-base-with-prefix strips _ prefix for base codepoints', async () => {
		const { projectStore } = await import('$lib/stores/project.svelte');
		// U+0041 (A) is a base glyph
		const g = baseGlyph({
			codepoint: 0x0041,
			anchors: [
				{ name: '_top', x: 250, y: 700 },
				{ name: 'baseline', x: 250, y: 0 }
			]
		});
		fixAuditIssue(g, 'anchor-naming-base-with-prefix', () => {});
		const updater = (projectStore.updateGlyph as unknown as ReturnType<typeof vi.fn>).mock
			.calls[0][1] as (g: Glyph) => Glyph;
		const result = updater(g);
		expect(result.anchors).toEqual([
			{ name: 'top', x: 250, y: 700 },
			{ name: 'baseline', x: 250, y: 0 }
		]);
	});
});

// ---- Tests: auto-snapshot policy ----

describe('fixAuditIssue — auto-snapshot policy', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('takes a labelled snapshot before any contour-mutating fix', async () => {
		const { projectStore } = await import('$lib/stores/project.svelte');
		const g = baseGlyph({ contours: [rectContour(0, 0, 100, 100)] });
		fixAuditIssue(g, 'self-intersecting', () => {});
		expect(projectStore.saveRevision).toHaveBeenCalledWith(
			g.codepoint,
			'pre-fix: self-intersecting'
		);
	});

	it('does NOT take a snapshot for non-contour fixes (zero-advance)', async () => {
		const { projectStore } = await import('$lib/stores/project.svelte');
		const g = baseGlyph();
		fixAuditIssue(g, 'zero-advance', () => {});
		expect(projectStore.saveRevision).not.toHaveBeenCalled();
	});

	it('does NOT snapshot a glyph with empty contours even for a contour-fix code', async () => {
		const { projectStore } = await import('$lib/stores/project.svelte');
		const g = baseGlyph({ contours: [] });
		fixAuditIssue(g, 'self-intersecting', () => {});
		expect(projectStore.saveRevision).not.toHaveBeenCalled();
	});
});
