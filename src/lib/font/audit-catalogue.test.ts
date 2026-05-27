import { describe, it, expect } from 'vitest';
import {
	AUDIT_CATALOGUE,
	AUDIT_CATALOGUE_BY_CODE,
	AUDIT_CATALOGUE_BY_CATEGORY
} from './audit-catalogue';
import { describeAuditCode } from './audit';

describe('audit catalogue', () => {
	it('exposes 94 rules — the canonical count surfaced in marketing copy', () => {
		// Memory: the README, llms.txt, JSON-LD WebApplication description,
		// and home-page hero all say "94-code audit module" — keep this in
		// sync, or update them all in lockstep. Currently 94.
		expect(AUDIT_CATALOGUE.length).toBe(94);
	});

	it('every rule has a non-empty title, category, description, fixable bool', () => {
		for (const rule of AUDIT_CATALOGUE) {
			expect(rule.code).toMatch(/^[a-z][a-z0-9-]*$/);
			expect(rule.title.length).toBeGreaterThan(0);
			expect(rule.category.length).toBeGreaterThan(0);
			expect(rule.description.length).toBeGreaterThan(0);
			expect(typeof rule.fixable).toBe('boolean');
		}
	});

	it('every code is unique', () => {
		const seen = new Set<string>();
		for (const rule of AUDIT_CATALOGUE) {
			expect(seen.has(rule.code)).toBe(false);
			seen.add(rule.code);
		}
	});

	it('every catalogue description matches the audit module', () => {
		for (const rule of AUDIT_CATALOGUE) {
			expect(rule.description).toBe(describeAuditCode(rule.code));
		}
	});

	it('catalogue is sorted by category, then code within category', () => {
		for (let i = 1; i < AUDIT_CATALOGUE.length; i++) {
			const prev = AUDIT_CATALOGUE[i - 1];
			const cur = AUDIT_CATALOGUE[i];
			if (prev.category === cur.category) {
				expect(prev.code.localeCompare(cur.code)).toBeLessThan(0);
			} else {
				expect(prev.category.localeCompare(cur.category)).toBeLessThan(0);
			}
		}
	});

	it('AUDIT_CATALOGUE_BY_CODE returns every rule', () => {
		for (const rule of AUDIT_CATALOGUE) {
			expect(AUDIT_CATALOGUE_BY_CODE[rule.code]).toBe(rule);
		}
	});

	it('AUDIT_CATALOGUE_BY_CATEGORY groups all rules', () => {
		const flattened = Object.values(AUDIT_CATALOGUE_BY_CATEGORY).flat();
		expect(flattened.length).toBe(AUDIT_CATALOGUE.length);
	});

	it('the 11 auto-fixable codes are marked fixable', () => {
		const fixableCodes = AUDIT_CATALOGUE.filter((r) => r.fixable).map((r) => r.code);
		// The same set the editor's AuditAccordion isFixable() function knows.
		const expected = [
			'self-intersecting',
			'duplicate-points',
			'near-collinear-points',
			'contour-winding-collision',
			'off-grid-points',
			'open-contour',
			'zero-advance',
			'overflows-advance',
			'anchor-naming-mark-no-prefix',
			'anchor-naming-base-with-prefix',
			'tiny-contour'
		];
		for (const code of expected) {
			expect(fixableCodes).toContain(code);
		}
		expect(fixableCodes.length).toBe(expected.length);
	});

	it('every rule maps to one of the declared AuditCategory enum values', () => {
		const validCategories = new Set([
			'Contour shape',
			'Metric alignment',
			'Spacing & advance',
			'Composites & references',
			'Anchor naming',
			'Anchor coverage',
			'Variable-font compatibility',
			'Notes, flags & naming',
			'Glyph naming',
			'Vertical metrics',
			'Kerning',
			'Kerning classes',
			'Color fonts',
			'Designspace & masters',
			'Brief',
			'Coverage',
			'Glyph count',
			'UPM',
			'Family naming',
			'Metadata',
			'Designspace axes'
		]);
		for (const rule of AUDIT_CATALOGUE) {
			expect(validCategories.has(rule.category)).toBe(true);
		}
	});
});
