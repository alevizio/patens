import { describe, it, expect } from 'vitest';
import {
	computePeerComparison,
	computeSpacingSuggestion,
	countDrawnGlyphs,
	findMissingControlGlyphs,
	computeSuggestedNext,
	isBriefEmpty,
	pickReferenceGlyph,
	pickOnionNeighbours,
	computeGlyphStats,
	computeAglfnSuggestion,
	computeAllProjectTags,
	pickFamilyReferenceGlyph,
	pickPinnedSnapshotGhost,
	computeUsedByGlyphs,
	computeInvolvedKerning,
	computeCopyableMetricSources
} from './glyph-deriveds';
import type { Glyph, Project, BezierContour, GlyphRevision, UseCase } from '$lib/font/types';
import { DEFAULT_METRICS, DEFAULT_FEATURES } from '$lib/font/types';

// ---- Fixtures ----

const baseGlyph = (overrides: Partial<Glyph> = {}): Glyph => ({
	codepoint: 0x0041,
	name: 'A',
	status: 'draft',
	advanceWidth: 600,
	leftSidebearing: 50,
	rightSidebearing: 50,
	contours: [],
	updatedAt: '2026-01-01T00:00:00Z',
	...overrides
});

const baseProject = (glyphs: Record<number, Glyph> = {}): Project => ({
	id: 'p1',
	name: 'Test',
	metrics: DEFAULT_METRICS,
	metadata: {
		familyName: 'Test',
		styleName: 'Regular',
		designer: '',
		copyright: '',
		license: '',
		version: '1.000'
	},
	features: { ...DEFAULT_FEATURES },
	glyphs,
	kerning: [],
	classes: [],
	axes: [],
	masters: [],
	instances: [],
	createdAt: '2026-01-01T00:00:00Z',
	updatedAt: '2026-01-01T00:00:00Z'
});

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

// ---- Tests ----

describe('countDrawnGlyphs', () => {
	it('counts only glyphs with contours', () => {
		const proj = baseProject({
			0x41: baseGlyph({ codepoint: 0x41, contours: [rectContour(0, 0, 100, 700)] }),
			0x42: baseGlyph({ codepoint: 0x42, contours: [] }),
			0x43: baseGlyph({ codepoint: 0x43, contours: [rectContour(0, 0, 100, 700)] })
		});
		expect(countDrawnGlyphs(proj)).toBe(2);
	});

	it('returns 0 for a null project', () => {
		expect(countDrawnGlyphs(null)).toBe(0);
	});

	it('returns 0 for an empty project', () => {
		expect(countDrawnGlyphs(baseProject())).toBe(0);
	});
});

describe('findMissingControlGlyphs', () => {
	it('returns all 13 control glyphs for an empty project', () => {
		expect(findMissingControlGlyphs(baseProject())).toHaveLength(13);
	});

	it('removes drawn control glyphs from the missing list', () => {
		const proj = baseProject({
			0x6e: baseGlyph({ codepoint: 0x6e, name: 'n', contours: [rectContour(0, 0, 100, 500)] }),
			0x6f: baseGlyph({ codepoint: 0x6f, name: 'o', contours: [rectContour(0, 0, 100, 500)] })
		});
		const missing = findMissingControlGlyphs(proj);
		expect(missing).toHaveLength(11);
		expect(missing).not.toContain(0x6e);
		expect(missing).not.toContain(0x6f);
	});

	it('ignores empty control-glyph entries', () => {
		const proj = baseProject({
			0x6e: baseGlyph({ codepoint: 0x6e, name: 'n', contours: [] }) // present but undrawn
		});
		expect(findMissingControlGlyphs(proj)).toContain(0x6e);
	});

	it('returns empty for null project', () => {
		expect(findMissingControlGlyphs(null)).toEqual([]);
	});
});

describe('computeSuggestedNext', () => {
	it('prioritises undrawn control glyphs first', () => {
		const proj = baseProject({});
		const out = computeSuggestedNext(proj);
		// First 10 should be control glyphs, in CONTROL_GLYPHS order
		expect(out[0]).toBe(0x6e); // n
		expect(out[1]).toBe(0x6f); // o
		expect(out).toHaveLength(10); // cap at 10
	});

	it('falls back to use-case targets once controls are drawn', () => {
		// Pre-draw all 13 control glyphs
		const glyphs: Record<number, Glyph> = {};
		const CONTROL = [0x6e, 0x6f, 0x48, 0x4f, 0x61, 0x65, 0x73, 0x63, 0x70, 0x76, 0x79, 0x66, 0x67];
		for (const cp of CONTROL) {
			glyphs[cp] = baseGlyph({ codepoint: cp, contours: [rectContour(0, 0, 100, 500)] });
		}
		const proj = { ...baseProject(glyphs), brief: { useCases: ['code'] as UseCase[] } };
		const out = computeSuggestedNext(proj);
		// Code use-case lists digits first; the function caps at 10 so digits
		// occupy all 10 slots. Brackets fall off the slice (they'd be #11+).
		expect(out).toContain(0x30); // 0
		expect(out).toContain(0x39); // 9
		expect(out).toHaveLength(10);
	});

	it('caps at 10 entries even with many use cases', () => {
		const proj = { ...baseProject(), brief: { useCases: ['code', 'data-tables'] as UseCase[] } };
		expect(computeSuggestedNext(proj).length).toBeLessThanOrEqual(10);
	});

	it('returns empty for null project', () => {
		expect(computeSuggestedNext(null)).toEqual([]);
	});
});

describe('isBriefEmpty', () => {
	it('true when project is null', () => {
		expect(isBriefEmpty(null)).toBe(true);
	});

	it('true when brief is missing', () => {
		expect(isBriefEmpty(baseProject())).toBe(true);
	});

	it('true when all brief fields are blank', () => {
		const proj = { ...baseProject(), brief: { intent: '', audience: '', useCases: [], differentiation: '', references: [] } };
		expect(isBriefEmpty(proj)).toBe(true);
	});

	it('true when fields are whitespace-only', () => {
		const proj = { ...baseProject(), brief: { intent: '   \n  ' } };
		expect(isBriefEmpty(proj)).toBe(true);
	});

	it('false when intent has real content', () => {
		const proj = { ...baseProject(), brief: { intent: 'A geometric sans for UI at 14px+' } };
		expect(isBriefEmpty(proj)).toBe(false);
	});

	it('false when useCases is non-empty', () => {
		const proj = { ...baseProject(), brief: { useCases: ['web-ui'] as UseCase[] } };
		expect(isBriefEmpty(proj)).toBe(false);
	});
});

describe('pickReferenceGlyph', () => {
	const baseProj = baseProject({
		0x48: baseGlyph({ codepoint: 0x48, name: 'H', contours: [rectContour(0, 0, 100, 700)] }),
		0x4e: baseGlyph({ codepoint: 0x4e, name: 'N', contours: [rectContour(0, 0, 100, 700)] }),
		0x6e: baseGlyph({ codepoint: 0x6e, name: 'n', contours: [rectContour(0, 0, 100, 500)] }),
		0x30: baseGlyph({ codepoint: 0x30, name: 'zero', contours: [rectContour(0, 0, 100, 700)] })
	});

	it('returns H for an uppercase letter (A)', () => {
		const a = baseGlyph({ codepoint: 0x41 }); // A
		expect(pickReferenceGlyph(a, baseProj)?.codepoint).toBe(0x48); // H
	});

	it('returns n for a lowercase letter (a)', () => {
		const a = baseGlyph({ codepoint: 0x61, name: 'a' }); // a
		expect(pickReferenceGlyph(a, baseProj)?.codepoint).toBe(0x6e); // n
	});

	it('returns 0 for a digit', () => {
		const one = baseGlyph({ codepoint: 0x31, name: 'one' });
		expect(pickReferenceGlyph(one, baseProj)?.codepoint).toBe(0x30); // 0
	});

	it('returns null for space (no useful reference)', () => {
		const space = baseGlyph({ codepoint: 0x20, name: 'space' });
		expect(pickReferenceGlyph(space, baseProj)).toBeNull();
	});

	it('skips the candidate if it is the current glyph (H references O/N, not itself)', () => {
		const h = baseGlyph({ codepoint: 0x48, name: 'H', contours: [rectContour(0, 0, 100, 700)] });
		expect(pickReferenceGlyph(h, baseProj)?.codepoint).toBe(0x4e); // N (since H itself is the current)
	});

	it('returns null when no candidate has contours', () => {
		const emptyProj = baseProject({
			0x48: baseGlyph({ codepoint: 0x48, contours: [] })
		});
		const a = baseGlyph({ codepoint: 0x41 });
		expect(pickReferenceGlyph(a, emptyProj)).toBeNull();
	});
});

describe('pickOnionNeighbours', () => {
	it('returns prev + next drawn glyphs from sorted codepoints', () => {
		const proj = baseProject({
			0x41: baseGlyph({ codepoint: 0x41, contours: [rectContour(0, 0, 100, 700)] }),
			0x42: baseGlyph({ codepoint: 0x42, contours: [rectContour(0, 0, 100, 700)] }),
			0x43: baseGlyph({ codepoint: 0x43, contours: [rectContour(0, 0, 100, 700)] })
		});
		const b = proj.glyphs[0x42];
		const { prev, next } = pickOnionNeighbours(b, proj);
		expect(prev?.codepoint).toBe(0x41);
		expect(next?.codepoint).toBe(0x43);
	});

	it('skips undrawn glyphs when finding neighbours', () => {
		const proj = baseProject({
			0x41: baseGlyph({ codepoint: 0x41, contours: [rectContour(0, 0, 100, 700)] }),
			0x42: baseGlyph({ codepoint: 0x42, contours: [] }), // undrawn — should be skipped
			0x43: baseGlyph({ codepoint: 0x43, contours: [rectContour(0, 0, 100, 700)] }),
			0x44: baseGlyph({ codepoint: 0x44, contours: [rectContour(0, 0, 100, 700)] })
		});
		const c = proj.glyphs[0x43];
		const { prev, next } = pickOnionNeighbours(c, proj);
		expect(prev?.codepoint).toBe(0x41); // skip undrawn 0x42
		expect(next?.codepoint).toBe(0x44);
	});

	it('returns nulls when no neighbours are drawn', () => {
		const proj = baseProject({
			0x41: baseGlyph({ codepoint: 0x41, contours: [rectContour(0, 0, 100, 700)] })
		});
		const a = proj.glyphs[0x41];
		const { prev, next } = pickOnionNeighbours(a, proj);
		expect(prev).toBeNull();
		expect(next).toBeNull();
	});
});

describe('computeGlyphStats', () => {
	it('returns zeros for null glyph', () => {
		const stats = computeGlyphStats(null);
		expect(stats.contours).toBe(0);
		expect(stats.points).toBe(0);
		expect(stats.width).toBe(0);
		expect(stats.height).toBe(0);
	});

	it('returns zeros for empty glyph', () => {
		const stats = computeGlyphStats(baseGlyph());
		expect(stats.contours).toBe(0);
	});

	it('counts contours and points', () => {
		const g = baseGlyph({
			contours: [rectContour(0, 0, 100, 100), rectContour(200, 0, 100, 100)]
		});
		const stats = computeGlyphStats(g);
		expect(stats.contours).toBe(2);
		// Each rect has 4 M/L points (plus a Z which doesn't count)
		expect(stats.points).toBe(8);
	});

	it('computes bounding box dimensions', () => {
		const g = baseGlyph({ contours: [rectContour(10, 20, 100, 50)] });
		const stats = computeGlyphStats(g);
		expect(stats.minX).toBe(10);
		expect(stats.maxX).toBe(110);
		expect(stats.minY).toBe(20);
		expect(stats.maxY).toBe(70);
		expect(stats.width).toBe(100);
		expect(stats.height).toBe(50);
	});
});

describe('computeAglfnSuggestion', () => {
	it('returns null for a glyph already canonically named', () => {
		// 'A' is the canonical AGLFN name for U+0041
		const a = baseGlyph({ codepoint: 0x41, name: 'A' });
		expect(computeAglfnSuggestion(a)).toBeNull();
	});

	it('suggests the AGLFN name when current name differs', () => {
		const a = baseGlyph({ codepoint: 0x41, name: 'capital-a' });
		expect(computeAglfnSuggestion(a)).toBe('A');
	});

	it('returns null for null glyph', () => {
		expect(computeAglfnSuggestion(null)).toBeNull();
	});

	it('suggests the uniXXXX fallback name for PUA / unmapped codepoints', () => {
		// aglfnName falls back to `uniXXXX` for codepoints not in the AGLFN
		// table; the suggestion machinery accepts that as a valid PS name.
		const pua = baseGlyph({ codepoint: 0xe001, name: 'custom' });
		expect(computeAglfnSuggestion(pua)).toBe('uniE001');
	});
});

describe('computeAllProjectTags', () => {
	it('returns empty for null project', () => {
		expect(computeAllProjectTags(null)).toEqual([]);
	});

	it('returns empty for project with no tags', () => {
		expect(computeAllProjectTags(baseProject())).toEqual([]);
	});

	it('collects + dedupes + sorts tags across all glyphs', () => {
		const proj = baseProject({
			0x41: baseGlyph({ codepoint: 0x41, tags: ['wip', 'review'] }),
			0x42: baseGlyph({ codepoint: 0x42, tags: ['wip', 'final'] }),
			0x43: baseGlyph({ codepoint: 0x43, tags: ['draft'] })
		});
		expect(computeAllProjectTags(proj)).toEqual(['draft', 'final', 'review', 'wip']);
	});
});

describe('pickFamilyReferenceGlyph', () => {
	it('returns the family-Regular glyph at the same codepoint when it has contours', () => {
		const familyProj = baseProject({
			0x41: baseGlyph({ codepoint: 0x41, contours: [rectContour(0, 0, 100, 700)] })
		});
		const a = baseGlyph({ codepoint: 0x41, contours: [] }); // current glyph is empty
		const ref = pickFamilyReferenceGlyph(a, familyProj);
		expect(ref?.codepoint).toBe(0x41);
	});

	it('returns null when family Regular is null', () => {
		const a = baseGlyph({ codepoint: 0x41 });
		expect(pickFamilyReferenceGlyph(a, null)).toBeNull();
	});

	it('returns null when family glyph exists but has no contours', () => {
		const familyProj = baseProject({
			0x41: baseGlyph({ codepoint: 0x41, contours: [] })
		});
		const a = baseGlyph({ codepoint: 0x41 });
		expect(pickFamilyReferenceGlyph(a, familyProj)).toBeNull();
	});
});

describe('pickPinnedSnapshotGhost', () => {
	const makeRevision = (id: string, takenAt: string, pinned: boolean): GlyphRevision => ({
		id,
		takenAt,
		label: 'snap',
		contours: [rectContour(0, 0, 100, 100)],
		advanceWidth: 600,
		leftSidebearing: 50,
		rightSidebearing: 50,
		pinned
	});

	it('returns null when no revisions are pinned', () => {
		const g = baseGlyph({
			revisions: [makeRevision('r1', '2026-01-01T00:00:00Z', false)]
		});
		expect(pickPinnedSnapshotGhost(g)).toBeNull();
	});

	it('returns null when glyph is null', () => {
		expect(pickPinnedSnapshotGhost(null)).toBeNull();
	});

	it('returns the most-recent pinned revisions contours', () => {
		const g = baseGlyph({
			revisions: [
				makeRevision('r1', '2026-01-01T00:00:00Z', true),
				makeRevision('r2', '2026-03-01T00:00:00Z', true),
				makeRevision('r3', '2026-02-01T00:00:00Z', false) // newer but not pinned
			]
		});
		const ghost = pickPinnedSnapshotGhost(g);
		// Should pick r2 (newest of pinned)
		expect(ghost).toBeDefined();
		expect(ghost?.length).toBe(1);
	});
});

describe('computeUsedByGlyphs', () => {
	it('returns glyphs that reference the current glyph as a component', () => {
		const proj = baseProject({
			0x41: baseGlyph({ codepoint: 0x41, name: 'A' }),
			0xc1: baseGlyph({
				codepoint: 0xc1,
				name: 'Aacute',
				components: [{ baseCodepoint: 0x41, offsetX: 0, offsetY: 0 }]
			})
		});
		const a = proj.glyphs[0x41];
		const out = computeUsedByGlyphs(a, proj);
		expect(out).toHaveLength(1);
		expect(out[0].codepoint).toBe(0xc1);
	});

	it('returns empty for null inputs', () => {
		expect(computeUsedByGlyphs(null, baseProject())).toEqual([]);
		expect(computeUsedByGlyphs(baseGlyph(), null)).toEqual([]);
	});
});

describe('computeInvolvedKerning', () => {
	it('returns zero counts when project has no kerning', () => {
		const proj = baseProject();
		const a = baseGlyph({ codepoint: 0x41 });
		const out = computeInvolvedKerning(a, proj);
		expect(out.asLeft).toBe(0);
		expect(out.asRight).toBe(0);
	});

	it('counts direct-codepoint pairs in both directions', () => {
		const proj = {
			...baseProject(),
			kerning: [
				{ left: 0x41, right: 0x56, value: -50 }, // A|V — A is left
				{ left: 0x57, right: 0x41, value: -30 }, // W|A — A is right
				{ left: 0x41, right: 0x59, value: -40 } // A|Y — A is left
			]
		};
		const a = baseGlyph({ codepoint: 0x41 });
		const out = computeInvolvedKerning(a, proj);
		expect(out.asLeft).toBe(2);
		expect(out.asRight).toBe(1);
	});

	it('counts class-membership pairs', () => {
		const proj = {
			...baseProject(),
			classes: [{ name: '@A_left', members: [0x41, 0x00c1] }],
			kerning: [{ left: '@A_left', right: 0x56, value: -50 }]
		};
		const a = baseGlyph({ codepoint: 0x41 });
		const out = computeInvolvedKerning(a, proj);
		expect(out.asLeft).toBe(1);
		expect(out.asRight).toBe(0);
	});
});

describe('computeCopyableMetricSources', () => {
	it('returns other drawn glyphs sorted by codepoint, excluding the current one', () => {
		const proj = baseProject({
			0x41: baseGlyph({ codepoint: 0x41, contours: [rectContour(0, 0, 100, 700)] }),
			0x42: baseGlyph({ codepoint: 0x42, contours: [rectContour(0, 0, 100, 700)] }),
			0x43: baseGlyph({ codepoint: 0x43, contours: [] }) // empty — should be filtered
		});
		const a = proj.glyphs[0x41];
		const sources = computeCopyableMetricSources(a, proj);
		expect(sources).toHaveLength(1);
		expect(sources[0].codepoint).toBe(0x42);
	});

	it('returns empty for null inputs', () => {
		expect(computeCopyableMetricSources(null, baseProject())).toEqual([]);
		expect(computeCopyableMetricSources(baseGlyph(), null)).toEqual([]);
	});
});

describe('computePeerComparison', () => {
	it('returns null when glyph is empty', () => {
		const proj = baseProject({
			0x42: baseGlyph({ codepoint: 0x42, contours: [rectContour(0, 0, 100, 700)] }),
			0x43: baseGlyph({ codepoint: 0x43, contours: [rectContour(0, 0, 100, 700)] })
		});
		const a = baseGlyph({ codepoint: 0x41, contours: [] });
		expect(computePeerComparison(a, proj)).toBeNull();
	});

	it('returns null when fewer than 2 peers exist', () => {
		const proj = baseProject({
			0x41: baseGlyph({ codepoint: 0x41, contours: [rectContour(0, 0, 100, 700)] }),
			0x42: baseGlyph({ codepoint: 0x42, advanceWidth: 600, contours: [rectContour(0, 0, 100, 700)] })
		});
		expect(computePeerComparison(proj.glyphs[0x41], proj)).toBeNull();
	});

	it('compares advance against same-category peers', () => {
		const proj = baseProject({
			0x41: baseGlyph({ codepoint: 0x41, advanceWidth: 700, contours: [rectContour(0, 0, 100, 700)] }),
			0x42: baseGlyph({ codepoint: 0x42, advanceWidth: 600, contours: [rectContour(0, 0, 100, 700)] }),
			0x43: baseGlyph({ codepoint: 0x43, advanceWidth: 500, contours: [rectContour(0, 0, 100, 700)] }),
			0x44: baseGlyph({ codepoint: 0x44, advanceWidth: 600, contours: [rectContour(0, 0, 100, 700)] })
		});
		const comp = computePeerComparison(proj.glyphs[0x41], proj);
		expect(comp).not.toBeNull();
		expect(comp!.peerCount).toBe(3);
		expect(comp!.medianAdv).toBe(600);
		expect(comp!.diff).toBe(100); // 700 - 600
	});
});

describe('computeSpacingSuggestion', () => {
	it('returns null when glyph is empty', () => {
		const proj = baseProject({
			0x42: baseGlyph({ codepoint: 0x42, contours: [rectContour(0, 0, 100, 700)] })
		});
		expect(computeSpacingSuggestion(baseGlyph({ codepoint: 0x41, contours: [] }), proj)).toBeNull();
	});

	it('returns null when no same-category peers exist', () => {
		const proj = baseProject({
			0x41: baseGlyph({ codepoint: 0x41, contours: [rectContour(0, 0, 100, 700)] })
		});
		expect(computeSpacingSuggestion(proj.glyphs[0x41], proj)).toBeNull();
	});

	it('returns the closest-width peer with different sidebearings', () => {
		const proj = baseProject({
			0x41: baseGlyph({
				codepoint: 0x41,
				name: 'A',
				leftSidebearing: 30,
				rightSidebearing: 30,
				contours: [rectContour(0, 0, 100, 700)]
			}),
			0x42: baseGlyph({
				codepoint: 0x42,
				name: 'B',
				leftSidebearing: 50,
				rightSidebearing: 50,
				contours: [rectContour(0, 0, 110, 700)] // closer width
			}),
			0x43: baseGlyph({
				codepoint: 0x43,
				name: 'C',
				leftSidebearing: 80,
				rightSidebearing: 80,
				contours: [rectContour(0, 0, 200, 700)] // further width
			})
		});
		const out = computeSpacingSuggestion(proj.glyphs[0x41], proj);
		expect(out).not.toBeNull();
		expect(out!.peerName).toBe('B');
		expect(out!.lsb).toBe(50);
	});
});
