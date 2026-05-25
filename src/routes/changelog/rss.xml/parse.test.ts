import { describe, it, expect } from 'vitest';
import { parseReleases } from './parse';

describe('parseReleases', () => {
	it('returns one Release per "## [X.Y.Z] — date" heading', () => {
		const md = `# Changelog

intro paragraph

## [1.2.0] — 2026-05-24

### Added
- Multi-script starter set

## [1.1.0] — 2026-05-23

### Added
- Cloud share
`;
		const out = parseReleases(md);
		expect(out).toHaveLength(2);
		expect(out[0].version).toBe('1.2.0');
		expect(out[0].date).toBe('2026-05-24');
		expect(out[1].version).toBe('1.1.0');
		expect(out[1].date).toBe('2026-05-23');
	});

	it('captures the section body between headings', () => {
		const md = `## [2.0.0] — 2026-06-01

### Added
- thing one
- thing two

## [1.0.0] — 2026-01-01

### Fixed
- the bug
`;
		const out = parseReleases(md);
		expect(out[0].body).toContain('thing one');
		expect(out[0].body).toContain('thing two');
		expect(out[0].body).not.toContain('the bug');
		expect(out[1].body).toContain('the bug');
	});

	it('builds an anchor matching the changelog page slugify rule', () => {
		const md = '## [1.4.0] — 2026-05-24\n\nbody\n';
		const out = parseReleases(md);
		// The /changelog page's h2 id is slugify of the literal heading text
		// `[1.4.0] — 2026-05-24`; the RSS anchor must match for #-linking to work.
		expect(out[0].anchor).toBe('1-4-0-2026-05-24');
	});

	it('captures the final release even without a trailing heading', () => {
		const md = '## [1.0.0] — 2026-01-01\n\nfinal release body line\n';
		const out = parseReleases(md);
		expect(out).toHaveLength(1);
		expect(out[0].body).toBe('final release body line');
	});

	it('ignores other heading levels and unrelated content', () => {
		const md = `# Changelog

prose

## Not a release

## [3.0.0] — 2026-12-31

actual release

### Subsection
`;
		const out = parseReleases(md);
		expect(out).toHaveLength(1);
		expect(out[0].version).toBe('3.0.0');
	});

	it('returns an empty array for an empty changelog', () => {
		expect(parseReleases('')).toEqual([]);
		expect(parseReleases('# Changelog\n\nNo releases yet.\n')).toEqual([]);
	});
});
