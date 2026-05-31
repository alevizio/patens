/**
 * Citation engine — the canonical Source corpus.
 *
 * The 10-source starter corpus per docs/research/canonical-library.md
 * Section 4 — covers all 9 audit families with open-licensed content
 * that ships without licensing negotiations.
 *
 * Adding sources:
 * 1. Append to SOURCES with a new stable id (never reuse).
 * 2. The licensing field is enforced — only `open` sources can have
 *    body text stored in-repo. `fair-use` and `license-required` sources
 *    are cited by bibliographic reference only.
 * 3. For `blog` kind, archiveUrl is required (sources are versionable).
 */

import type { Source } from './types';

export const SOURCES: ReadonlyArray<Source> = [
	{
		id: 'opentype-spec',
		title: 'OpenType Specification 1.9.1',
		author: 'Microsoft Typography',
		year: 1997,
		publisher: 'Microsoft Corporation',
		kind: 'specification',
		licensing: 'open',
		canonicalUrl: 'https://learn.microsoft.com/en-us/typography/opentype/spec/'
	},
	{
		id: 'truetype-reference-manual',
		title: 'TrueType Reference Manual',
		author: 'Apple Inc.',
		year: 1991,
		publisher: 'Apple Inc.',
		kind: 'manual',
		licensing: 'open',
		canonicalUrl: 'https://developer.apple.com/fonts/TrueType-Reference-Manual/'
	},
	{
		id: 'adobe-glyph-list',
		title: 'Adobe Glyph List Specification + AGLFN',
		author: 'Adobe Type Tools',
		year: 2010,
		publisher: 'Adobe Systems',
		kind: 'specification',
		licensing: 'open',
		canonicalUrl: 'https://github.com/adobe-type-tools/agl-specification'
	},
	{
		id: 'adobe-fea-spec',
		title: 'Adobe OpenType Feature File Specification',
		author: 'Adobe Type Tools',
		year: 2005,
		publisher: 'Adobe Systems',
		kind: 'specification',
		licensing: 'open',
		canonicalUrl:
			'http://adobe-type-tools.github.io/afdko/OpenTypeFeatureFileSpecification.html'
	},
	{
		id: 'ufo-3-spec',
		title: 'Unified Font Object 3 Specification',
		author: 'Tal Leming, Just van Rossum, Erik van Blokland',
		year: 2003,
		publisher: 'unifiedfontobject.org',
		kind: 'specification',
		licensing: 'open',
		canonicalUrl: 'https://unifiedfontobject.org/'
	},
	{
		id: 'unicode-standard-16',
		title: 'The Unicode Standard, Version 16.0',
		author: 'Unicode Consortium',
		year: 2024,
		publisher: 'Unicode Consortium',
		kind: 'specification',
		licensing: 'open',
		canonicalUrl: 'https://www.unicode.org/versions/Unicode16.0.0/UnicodeStandard-16.0.pdf'
	},
	{
		id: 'stop-stealing-sheep',
		title: 'Stop Stealing Sheep & Find Out How Type Works (4th ed.)',
		author: 'Erik Spiekermann and E. M. Ginger',
		year: 1993,
		publisher: 'Adobe Press / Peachpit',
		kind: 'book',
		licensing: 'open',
		canonicalUrl:
			'https://ptgmedia.pearsoncmg.com/images/9780321934284/samplepages/0321934288.pdf',
		caveat: '4th edition (2014) released under CC license via Google Fonts.'
	},
	{
		id: 'opentype-cookbook',
		title: 'OpenType Cookbook',
		author: 'Tal Leming',
		year: 2014,
		publisher: 'opentypecookbook.com',
		kind: 'manual',
		licensing: 'open',
		canonicalUrl: 'https://opentypecookbook.com/'
	},
	{
		id: 'klim-design-information',
		title: 'Design Information (per-typeface essays + blog)',
		author: 'Kris Sowersby (Klim Type Foundry)',
		year: 2008,
		publisher: 'Klim Type Foundry',
		kind: 'blog',
		licensing: 'fair-use',
		canonicalUrl: 'https://klim.co.nz/blog/',
		archiveUrl: 'https://web.archive.org/web/2026*/klim.co.nz/blog'
	},
	{
		id: 'knuth-mathematical-typography',
		title: 'Mathematical Typography',
		author: 'Donald E. Knuth',
		year: 1979,
		publisher: 'Bulletin of the American Mathematical Society',
		kind: 'paper',
		licensing: 'open',
		canonicalUrl: 'https://www.historyofinformation.com/detail.php?id=3339'
	},
	{
		id: 'variablefonts-io-primer',
		title: 'A Variable Fonts Primer',
		author: 'variablefonts.io contributors',
		year: 2018,
		publisher: 'variablefonts.io',
		kind: 'manual',
		licensing: 'fair-use',
		canonicalUrl: 'https://variablefonts.io/',
		archiveUrl: 'https://web.archive.org/web/2026*/variablefonts.io',
		caveat:
			'Practitioner-friendly primer covering both designing and implementing variable fonts. Complements the normative OpenType variations chapter.'
	},
	{
		id: 'frere-jones-blog',
		title: 'Frere-Jones Type — Blog',
		author: 'Tobias Frere-Jones',
		year: 2015,
		publisher: 'Frere-Jones Type',
		kind: 'blog',
		licensing: 'fair-use',
		canonicalUrl: 'https://frerejones.com/blog',
		archiveUrl: 'https://web.archive.org/web/2026*/frerejones.com',
		caveat:
			'Contemporary studio reasoning from one of the most-cited working type designers. Essays on type-history, ephemera, technical reasoning, and the craft of contemporary type design. Treats foundry-blog citations as living primary sources per canonical-library.md Section 3.5.'
	}
] as const;

/**
 * Get a Source by id. Returns undefined if not found.
 */
export const sourceById = (id: string): Source | undefined =>
	SOURCES.find((s) => s.id === id);
