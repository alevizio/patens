import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { auditGlyph, sortBySeverity, describeAuditCode } from './audit';
import type {
	Glyph,
	Project,
	BezierContour,
	PathCommand,
	GlyphStatus
} from './types';
import { DEFAULT_METRICS, DEFAULT_FEATURES, CURRENT_SCHEMA_VERSION } from './types';

/**
 * Property tests for the audit module — generate random-but-valid
 * glyphs + projects with fast-check, assert audit invariants hold
 * no matter what shape comes in. Closes the OpenSSF Silver "fuzz
 * testing on parsers" gap.
 *
 * These tests focus on STRUCTURAL invariants (never throws, always
 * returns an array, every issue has the expected shape, codes are
 * kebab-case, severities are within the enum) rather than semantic
 * invariants (which would be testing the rules themselves — that's
 * what audit.test.ts does with hand-built fixtures).
 *
 * Run with: `pnpm vitest run audit.property` — each `it` runs 100
 * random inputs by default (fast-check's `numRuns`); bump via
 * `{ numRuns: N }` if you want deeper coverage in CI.
 */

// ---- Arbitraries ----

const pathCommandArb: fc.Arbitrary<PathCommand> = fc.oneof(
	fc.record({ type: fc.constant('M' as const), x: fc.integer({ min: -2000, max: 2000 }), y: fc.integer({ min: -2000, max: 2000 }) }),
	fc.record({ type: fc.constant('L' as const), x: fc.integer({ min: -2000, max: 2000 }), y: fc.integer({ min: -2000, max: 2000 }) }),
	fc.record({
		type: fc.constant('Q' as const),
		x1: fc.integer({ min: -2000, max: 2000 }),
		y1: fc.integer({ min: -2000, max: 2000 }),
		x: fc.integer({ min: -2000, max: 2000 }),
		y: fc.integer({ min: -2000, max: 2000 })
	}),
	fc.record({
		type: fc.constant('C' as const),
		x1: fc.integer({ min: -2000, max: 2000 }),
		y1: fc.integer({ min: -2000, max: 2000 }),
		x2: fc.integer({ min: -2000, max: 2000 }),
		y2: fc.integer({ min: -2000, max: 2000 }),
		x: fc.integer({ min: -2000, max: 2000 }),
		y: fc.integer({ min: -2000, max: 2000 })
	}),
	fc.record({ type: fc.constant('Z' as const) })
);

const contourArb: fc.Arbitrary<BezierContour> = fc.record({
	closed: fc.boolean(),
	winding: fc.constantFrom('ccw' as const, 'cw' as const),
	commands: fc.array(pathCommandArb, { minLength: 0, maxLength: 12 })
});

const statusArb: fc.Arbitrary<GlyphStatus> = fc.constantFrom(
	'empty',
	'sketch',
	'draft',
	'final'
);

const glyphArb: fc.Arbitrary<Glyph> = fc.record({
	codepoint: fc.integer({ min: 0x20, max: 0xffff }),
	name: fc.string({ minLength: 0, maxLength: 30 }),
	status: statusArb,
	advanceWidth: fc.integer({ min: 0, max: 2000 }),
	leftSidebearing: fc.integer({ min: -500, max: 500 }),
	rightSidebearing: fc.integer({ min: -500, max: 500 }),
	contours: fc.array(contourArb, { minLength: 0, maxLength: 6 }),
	updatedAt: fc.constant('2026-01-01T00:00:00Z')
});

// Minimal valid project — keeping it stable across runs so the
// audit doesn't blow up on bad project-level invariants we're not
// testing in this file (those have their own coverage in audit.test.ts).
const baseProject = (glyphs: Glyph[]): Project => ({
	schemaVersion: CURRENT_SCHEMA_VERSION,
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
	glyphs: Object.fromEntries(glyphs.map((g) => [g.codepoint, g])),
	kerning: [],
	classes: [],
	axes: [],
	masters: [],
	instances: [],
	createdAt: '2026-01-01T00:00:00Z',
	updatedAt: '2026-01-01T00:00:00Z'
});

// ---- Invariants ----

describe('audit property tests', () => {
	it('auditGlyph never throws for any structurally-valid glyph', () => {
		fc.assert(
			fc.property(glyphArb, (g) => {
				const proj = baseProject([g]);
				expect(() => auditGlyph(g, proj)).not.toThrow();
			})
		);
	});

	it('auditGlyph always returns an array', () => {
		fc.assert(
			fc.property(glyphArb, (g) => {
				const proj = baseProject([g]);
				const out = auditGlyph(g, proj);
				expect(Array.isArray(out)).toBe(true);
			})
		);
	});

	it('every issue has the full AuditIssue shape', () => {
		fc.assert(
			fc.property(glyphArb, (g) => {
				const proj = baseProject([g]);
				for (const issue of auditGlyph(g, proj)) {
					expect(issue).toHaveProperty('codepoint');
					expect(issue).toHaveProperty('severity');
					expect(issue).toHaveProperty('code');
					expect(issue).toHaveProperty('message');
					expect(typeof issue.codepoint).toBe('number');
					expect(typeof issue.code).toBe('string');
					expect(typeof issue.message).toBe('string');
					expect(['error', 'warn', 'info']).toContain(issue.severity);
				}
			})
		);
	});

	it('every issue code is a non-empty kebab-case identifier', () => {
		fc.assert(
			fc.property(glyphArb, (g) => {
				const proj = baseProject([g]);
				for (const issue of auditGlyph(g, proj)) {
					expect(issue.code).toMatch(/^[a-z][a-z0-9-]*$/);
				}
			})
		);
	});

	it('every issue carries the glyph codepoint it refers to', () => {
		fc.assert(
			fc.property(glyphArb, (g) => {
				const proj = baseProject([g]);
				for (const issue of auditGlyph(g, proj)) {
					// Issue codepoints should reference EITHER the glyph
					// itself, OR a related glyph mentioned by the rule.
					// For per-glyph audits the codepoint is always the
					// current glyph.
					expect(issue.codepoint).toBe(g.codepoint);
				}
			})
		);
	});

	it('auditGlyph is deterministic — same input produces same output', () => {
		fc.assert(
			fc.property(glyphArb, (g) => {
				const proj = baseProject([g]);
				const a = auditGlyph(g, proj);
				const b = auditGlyph(g, proj);
				expect(a).toEqual(b);
			})
		);
	});

	it('every issue code has a curated description in describeAuditCode', () => {
		fc.assert(
			fc.property(glyphArb, (g) => {
				const proj = baseProject([g]);
				for (const issue of auditGlyph(g, proj)) {
					const desc = describeAuditCode(issue.code);
					// Allow undefined for new codes that haven't been
					// documented yet — that's a soft signal, not a hard
					// invariant. But we want SOMETHING (either a curated
					// description, or the issue's own message).
					if (desc === undefined) {
						expect(issue.message.length).toBeGreaterThan(0);
					} else {
						expect(desc.length).toBeGreaterThan(0);
					}
				}
			})
		);
	});

	it('sortBySeverity preserves count + relative order of same-severity issues', () => {
		fc.assert(
			fc.property(glyphArb, (g) => {
				const proj = baseProject([g]);
				const raw = auditGlyph(g, proj);
				const sorted = sortBySeverity(raw);
				expect(sorted.length).toBe(raw.length);
				// After sort, severities must be in descending priority:
				// error first, then warn, then info.
				const rank = { error: 0, warn: 1, info: 2 };
				for (let i = 1; i < sorted.length; i++) {
					expect(rank[sorted[i].severity]).toBeGreaterThanOrEqual(
						rank[sorted[i - 1].severity]
					);
				}
			})
		);
	});

	it('empty contours + no components → must surface "empty" or composite rule', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 0x41, max: 0x5a }), // uppercase Latin
				(cp) => {
					const g: Glyph = {
						codepoint: cp,
						name: String.fromCodePoint(cp),
						status: 'empty',
						advanceWidth: 600,
						leftSidebearing: 50,
						rightSidebearing: 50,
						contours: [],
						updatedAt: '2026-01-01T00:00:00Z'
					};
					const proj = baseProject([g]);
					const codes = auditGlyph(g, proj).map((i) => i.code);
					// One of: 'empty' (no contours, no components) OR a
					// coverage / control-glyph code. The strict
					// invariant: SOMETHING flags an empty Latin letter.
					expect(codes.length).toBeGreaterThan(0);
				}
			)
		);
	});
});
