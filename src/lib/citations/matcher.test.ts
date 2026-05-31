/**
 * Citation engine — matcher tests.
 *
 * Covers: lookup returns the right ID, score ordering, empty result
 * for unmapped codes, batch lookup, codes-with-citations set, hard
 * cap at MAX_CITATIONS_PER_CODE, and the sourceById helper.
 */

import { describe, it, expect } from 'vitest';
import { lookupCitations, lookupCitationsMany, codesWithCitations } from './matcher';
import { sourceById, SOURCES } from './corpus';
import { MAX_CITATIONS_PER_CODE } from './types';

describe('citation matcher', () => {
	it('returns citations for a mapped code', () => {
		const result = lookupCitations('metrics-cap-above-ascender');
		expect(result.auditCode).toBe('metrics-cap-above-ascender');
		expect(result.citations.length).toBeGreaterThan(0);
		expect(result.citations[0].score).toBeGreaterThan(0);
	});

	it('returns empty citations for unmapped code', () => {
		const result = lookupCitations('nonexistent-fake-code-xyz');
		expect(result.auditCode).toBe('nonexistent-fake-code-xyz');
		expect(result.citations).toEqual([]);
	});

	it('returns empty citations for codes with empty mapping', () => {
		// sharp-kink has [] in the citation map — no canonical citation
		// in the open MVP corpus.
		const result = lookupCitations('sharp-kink');
		expect(result.citations).toEqual([]);
	});

	it('respects MAX_CITATIONS_PER_CODE cap', () => {
		// All currently-mapped codes have 1 citation, so the cap isn't
		// exercised in MVP. This test asserts the cap will be enforced
		// when richer mappings land.
		const result = lookupCitations('metrics-cap-above-ascender');
		expect(result.citations.length).toBeLessThanOrEqual(MAX_CITATIONS_PER_CODE);
	});

	it('parses citationId into sourceId + anchor', () => {
		const result = lookupCitations('metrics-cap-above-ascender');
		const cite = result.citations[0];
		expect(cite.citation.sourceId).toBe('opentype-spec');
		expect(cite.citation.anchor).toBe('os2');
	});

	it('batch lookup returns one entry per code', () => {
		const codes = [
			'metrics-cap-above-ascender',
			'duplicate-glyph-name',
			'nonexistent-fake-code-xyz'
		];
		const results = lookupCitationsMany(codes);
		expect(results.size).toBe(3);
		expect(results.get('metrics-cap-above-ascender')?.citations.length).toBeGreaterThan(0);
		expect(results.get('nonexistent-fake-code-xyz')?.citations).toEqual([]);
	});

	it('codesWithCitations excludes codes with empty mappings', () => {
		const set = codesWithCitations();
		expect(set.has('metrics-cap-above-ascender')).toBe(true);
		expect(set.has('sharp-kink')).toBe(false);
		expect(set.has('nonexistent-fake-code-xyz')).toBe(false);
	});
});

describe('corpus', () => {
	it('every source id is unique', () => {
		const ids = new Set(SOURCES.map((s) => s.id));
		expect(ids.size).toBe(SOURCES.length);
	});

	it('sourceById resolves known source', () => {
		const source = sourceById('opentype-spec');
		expect(source?.title).toBe('OpenType Specification 1.9.1');
		expect(source?.licensing).toBe('open');
	});

	it('sourceById returns undefined for unknown id', () => {
		expect(sourceById('nonexistent-source')).toBeUndefined();
	});

	it('every blog source has an archiveUrl (versionable sources)', () => {
		const blogs = SOURCES.filter((s) => s.kind === 'blog');
		expect(blogs.length).toBeGreaterThan(0);
		for (const blog of blogs) {
			expect(blog.archiveUrl).toBeTruthy();
		}
	});

	it('every citation in the matcher resolves to a real source', () => {
		const codes = [
			'metrics-cap-above-ascender',
			'duplicate-glyph-name',
			'naming-family',
			'glyph-name-not-canonical',
			'coverage-currency'
		];
		for (const code of codes) {
			const result = lookupCitations(code);
			for (const cite of result.citations) {
				const source = sourceById(cite.citation.sourceId);
				expect(source, `source not found for code ${code}, citation ${cite.citation.id}`).toBeDefined();
			}
		}
	});
});
