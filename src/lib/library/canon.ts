/**
 * Patens canonical type-design library.
 *
 * The 42 canonical references that ground the audit module's prose +
 * the citation engine's RAG corpus. Sourced from
 * docs/research/canonical-library.md Section 1 (the research artifact
 * compiled 2026-05-30).
 *
 * Surfaced publicly at /library so designers can:
 * - Browse the foundation of the audit-as-pedagogy positioning
 * - Verify the citation engine's authority
 * - Discover what to read next
 *
 * The smaller `src/lib/citations/corpus.ts` holds the subset actively
 * mapped to audit codes (the open MVP corpus). This file is the full
 * canon — including the in-copyright craft books that require
 * licensing for body-text ingest. Patens cites all of them by
 * bibliographic reference only.
 */

export type LibraryCategory =
	| 'Foundational craft & theory'
	| 'Specifications'
	| 'Academic + research'
	| 'Foundry blogs'
	| 'Living OFL exemplars';

export type LibraryConfidence = 'confirmed' | 'likely' | 'uncertain';

export type LibraryLicensing =
	| 'open'
	| 'cc'
	| 'fair-use'
	| 'license-required'
	| 'public-domain';

export type LibraryEntry = {
	/** Stable kebab-case slug. */
	id: string;
	/** Index in canonical-library.md Section 1 (1-38). Used for sorting. */
	index: number;
	title: string;
	author: string;
	year: number;
	publisher: string;
	/** Which subsection of canonical-library.md this belongs to. */
	category: LibraryCategory;
	/** The one-line "why this is canonical" justification. */
	whyCanonical: string;
	/** Topical coverage — what the work addresses. */
	topicalCoverage?: string;
	/** Licensing posture. */
	licensing: LibraryLicensing;
	/** Free-text licensing detail (e.g. "in-copyright Hyphen Press"). */
	licensingDetail?: string;
	/** Where to find a copy (Internet Archive, foundry site, etc.). */
	digitization?: string;
	/** Which Patens audit families this work most informs. */
	auditFamilies: string[];
	/** Canonical URL — author's site, publisher's page, archive copy. */
	canonicalUrl?: string;
	/** Confidence in our characterization. */
	confidence: LibraryConfidence;
};

export const LIBRARY: ReadonlyArray<LibraryEntry> = [
	// 1.1 Foundational craft & theory books
	{
		id: 'tracy-letters-of-credit',
		index: 1,
		title: 'Letters of Credit: A View of Type Design',
		author: 'Walter Tracy',
		year: 1986,
		publisher: 'Gordon Fraser / David R. Godine',
		category: 'Foundational craft & theory',
		whyCanonical:
			'The standard English-language text on type-design fundamentals; the first to fully codify Linotype-era spacing logic.',
		topicalCoverage:
			'Letter anatomy, spacing & sidebearings (Smith-Tracy method), legibility theory, classification.',
		licensing: 'fair-use',
		licensingDetail: 'In-copyright (Godine 2003 reprint active). Fair-use ingestion plausible for excerpt citations.',
		digitization: 'Internet Archive borrowable copy.',
		auditFamilies: ['Spacing + sidebearings', 'Contour shape', 'Vertical metrics'],
		canonicalUrl: 'https://archive.org/details/lettersofcreditv0000trac',
		confidence: 'confirmed'
	},
	{
		id: 'bringhurst-elements',
		index: 2,
		title: 'The Elements of Typographic Style',
		author: 'Robert Bringhurst',
		year: 1992,
		publisher: 'Hartley & Marks',
		category: 'Foundational craft & theory',
		whyCanonical:
			'Hermann Zapf called for it to be "the Typographers\' Bible"; Hoefler/Frere-Jones call it "the finest book ever written about typography." House manual at most US university presses.',
		topicalCoverage:
			'Comprehensive — anatomy, classification, page composition, diacritics, micro/macrotypography, glossary, designer/foundry annotated lists.',
		licensing: 'fair-use',
		licensingDetail: 'In-copyright, Hartley & Marks active. Fair use only.',
		digitization: 'Internet Archive 3rd-edition borrow.',
		auditFamilies: ['All 9 families (secondary)', 'Contour shape', 'Naming + metadata', 'Spacing'],
		canonicalUrl: 'https://archive.org/details/elementsoftypogr0000brin',
		confidence: 'confirmed'
	},
	{
		id: 'hochuli-detail',
		index: 3,
		title: 'Detail in Typography',
		author: 'Jost Hochuli',
		year: 1987,
		publisher: 'Éditions B42',
		category: 'Foundational craft & theory',
		whyCanonical:
			'Coined the term "microtypography" (1987). The standard reference for what happens inside a column of text.',
		topicalCoverage: 'Letterspacing, wordspacing, linespacing, optical adjustments — the interior of typography.',
		licensing: 'fair-use',
		licensingDetail: 'In-copyright, B42 active. Translated into 17 languages.',
		digitization: 'No open edition; partial scans circulate.',
		auditFamilies: ['Spacing + sidebearings', 'Contour shape'],
		canonicalUrl: 'https://www.typotheque.com/books/detail-in-typography',
		confidence: 'confirmed'
	},
	{
		id: 'smeijers-counterpunch',
		index: 4,
		title: 'Counterpunch: Making Type in the Sixteenth Century, Designing Typefaces Now',
		author: 'Fred Smeijers',
		year: 1996,
		publisher: 'Hyphen Press',
		category: 'Foundational craft & theory',
		whyCanonical:
			'The only modern text that reverse-engineers Garamond/Granjon-era punchcutting from practical reconstruction. Smeijers cut punches himself.',
		topicalCoverage: 'Contour reasoning, counter logic, the physical origin of "type color."',
		licensing: 'fair-use',
		licensingDetail: 'In-copyright Hyphen Press. Fair use only.',
		digitization: 'Internet Archive borrow.',
		auditFamilies: ['Contour shape (primary)', 'Spacing', 'Historical context'],
		canonicalUrl: 'https://hyphenpress.co.uk/products/books/978-0-907259-42-8/',
		confidence: 'confirmed'
	},
	{
		id: 'noordzij-stroke',
		index: 5,
		title: 'The Stroke: Theory of Writing',
		author: 'Gerrit Noordzij',
		year: 1985,
		publisher: 'Hyphen Press',
		category: 'Foundational craft & theory',
		whyCanonical:
			'The theoretical underpinning for "writing-based" type design used across KABK, Type@Cooper, Reading. Frames typography as "writing with prefabricated characters."',
		topicalCoverage: 'Stroke construction, contrast (translation vs. expansion), counter — applicable to any script.',
		licensing: 'fair-use',
		licensingDetail: 'In-copyright Hyphen Press. Dutch → English via Peter Enneson (2005).',
		auditFamilies: ['Contour shape (primary)'],
		canonicalUrl: 'https://hyphenpress.co.uk/products/books/978-0-907259-30-5/',
		confidence: 'confirmed'
	},
	{
		id: 'noordzij-letterletter',
		index: 6,
		title: 'Letterletter',
		author: 'Gerrit Noordzij',
		year: 2000,
		publisher: 'Hartley & Marks',
		category: 'Foundational craft & theory',
		whyCanonical:
			'The workshop voice of Noordzij in distilled form; collected 1984–1994 ATypI bulletin essays.',
		licensing: 'fair-use',
		auditFamilies: ['Contour shape', 'Multi-script reasoning'],
		confidence: 'likely'
	},
	{
		id: 'lawson-anatomy',
		index: 7,
		title: 'Anatomy of a Typeface',
		author: 'Alexander Lawson',
		year: 1990,
		publisher: 'David R. Godine',
		category: 'Foundational craft & theory',
		whyCanonical:
			'Chapter-per-family deep history of 30 type families; standard university classroom text on classification.',
		topicalCoverage: 'Classification, history, anatomy.',
		licensing: 'fair-use',
		digitization: 'Internet Archive borrow.',
		auditFamilies: ['Naming + metadata', 'Classification'],
		canonicalUrl: 'https://archive.org/details/anatomyoftypefac0000laws',
		confidence: 'confirmed'
	},
	{
		id: 'cheng-designing-type',
		index: 8,
		title: 'Designing Type',
		author: 'Karen Cheng',
		year: 2006,
		publisher: 'Yale University Press',
		category: 'Foundational craft & theory',
		whyCanonical:
			'The most thorough English-language treatment of glyph-by-glyph optical compensation; covers serif and sans cap/lowercase/numerals/diacritics/spacing.',
		topicalCoverage: 'Optical compensation, structure, glyph anatomy, spacing.',
		licensing: 'fair-use',
		licensingDetail: 'In-copyright Yale. Fair use. 2nd ed. 2020.',
		auditFamilies: ['Contour shape (primary)', 'Spacing', 'Anchors (diacritic chapter)'],
		canonicalUrl: 'https://yalebooks.yale.edu/book/9780300111507/designing-type/',
		confidence: 'confirmed'
	},
	{
		id: 'highsmith-paragraphs',
		index: 9,
		title: 'Inside Paragraphs: Typographic Fundamentals',
		author: 'Cyrus Highsmith',
		year: 2012,
		publisher: 'Font Bureau / Princeton Architectural Press',
		category: 'Foundational craft & theory',
		whyCanonical: 'The modern teaching primer; required reading at RISD Type Lab.',
		topicalCoverage: 'White space, paragraph mechanics.',
		licensing: 'fair-use',
		auditFamilies: ['Spacing', 'Vertical metrics (line economy)'],
		canonicalUrl: 'https://papress.com/products/inside-paragraphs-typographic-fundamentals',
		confidence: 'confirmed'
	},
	{
		id: 'spiekermann-stop-stealing-sheep',
		index: 10,
		title: 'Stop Stealing Sheep & Find Out How Type Works',
		author: 'Erik Spiekermann and E. M. Ginger',
		year: 1993,
		publisher: 'Adobe Press / Peachpit',
		category: 'Foundational craft & theory',
		whyCanonical:
			'The introductory text in print for three decades. As of the 4th edition, full PDF is released under Creative Commons via Google Fonts — making it the most ingestible high-quality introductory source.',
		topicalCoverage: 'Spacing, anatomy, classification, naming.',
		licensing: 'cc',
		licensingDetail: 'CC-licensed PDF (4th ed., open).',
		digitization: 'Full PDF via Google Fonts.',
		auditFamilies: ['Spacing', 'Anatomy', 'Naming + metadata'],
		canonicalUrl: 'https://archive.org/details/stopstealingshee0000spie_k4v4',
		confidence: 'confirmed'
	},
	{
		id: 'gill-essay',
		index: 11,
		title: 'An Essay on Typography',
		author: 'Eric Gill',
		year: 1931,
		publisher: 'Hague & Gill',
		category: 'Foundational craft & theory',
		whyCanonical: 'The modernist counter-statement to traditional typography; set in Gill\'s own Joanna.',
		licensing: 'public-domain',
		licensingDetail:
			'Public domain in many jurisdictions. Gill d. 1940 → PD in life+70 jurisdictions in 2011; US 1931 imprint may still be in-copyright until 2027.',
		digitization: 'Internet Archive full text.',
		auditFamilies: ['Contour shape', 'Classification context'],
		canonicalUrl: 'https://archive.org/details/AnEssayOnTypographyEricGill',
		confidence: 'confirmed'
	},
	{
		id: 'morison-first-principles',
		index: 12,
		title: 'First Principles of Typography',
		author: 'Stanley Morison',
		year: 1936,
		publisher: 'Cambridge University Press',
		category: 'Foundational craft & theory',
		whyCanonical: 'Morison\'s brief, oft-cited polemic; basis for much UK type tradition.',
		licensing: 'fair-use',
		licensingDetail: 'In-copyright until ~2038 (Morison d. 1967 + 70 yr).',
		digitization: 'Rare-book copies; not open.',
		auditFamilies: ['Classification', 'Historical context'],
		confidence: 'confirmed'
	},
	{
		id: 'kinross-modern-typography',
		index: 13,
		title: 'Modern Typography: An Essay in Critical History',
		author: 'Robin Kinross',
		year: 1992,
		publisher: 'Hyphen Press',
		category: 'Foundational craft & theory',
		whyCanonical:
			'The first critical history of typography (vs. bibliophilic celebration); standard university reference.',
		licensing: 'fair-use',
		auditFamilies: ['Historical context', 'Naming', 'Classification'],
		canonicalUrl: 'https://hyphenpress.co.uk/products/books/978-0-907259-18-3/',
		confidence: 'confirmed'
	},
	{
		id: 'adobe-type-library-reference',
		index: 14,
		title: 'Adobe Type Library Reference Book',
		author: 'Adobe Systems',
		year: 2007,
		publisher: 'Adobe Press',
		category: 'Foundational craft & theory',
		whyCanonical:
			'Codex of 2,200+ Adobe Originals with foundry metadata, classification, OpenType feature listings.',
		licensing: 'fair-use',
		auditFamilies: ['Naming + metadata (primary)', 'OpenType invariants'],
		canonicalUrl: 'https://archive.org/details/adobetypelibrary0000unse',
		confidence: 'confirmed'
	},
	{
		id: 'frutiger-type-sign-symbol',
		index: 15,
		title: 'Type, Sign, Symbol',
		author: 'Adrian Frutiger',
		year: 1980,
		publisher: 'ABC Verlag, Zurich',
		category: 'Foundational craft & theory',
		whyCanonical: 'Frutiger\'s working-method statement; legibility research from the Univers/Frutiger periods.',
		topicalCoverage: 'Contour shape, legibility-driven vertical metrics. Trilingual (EN/DE/FR).',
		licensing: 'fair-use',
		digitization: 'Monoskop has a scan.',
		auditFamilies: ['Contour shape', 'Vertical metrics'],
		canonicalUrl: 'https://monoskop.org/images/b/b6/Frutiger_Adrian_Type_Sign_Symbol.pdf',
		confidence: 'likely'
	},
	{
		id: 'ahrens-mugikura-size-specific',
		index: 16,
		title: 'Size-specific Adjustments to Type Designs',
		author: 'Tim Ahrens & Shoko Mugikura',
		year: 2007,
		publisher: 'Just Another Foundry',
		category: 'Foundational craft & theory',
		whyCanonical:
			'The only book-length English treatment of optical sizing — directly relevant to variable-font opsz axis.',
		licensing: 'fair-use',
		licensingDetail: 'JAF self-published. Ahrens MA thesis (Reading); revised 2014.',
		auditFamilies: ['Variable fonts (opsz)', 'Contour shape', 'Vertical metrics'],
		canonicalUrl: 'https://justanotherfoundry.com/size-specific-adjustments-to-type-designs',
		confidence: 'confirmed'
	},

	// 1.2 Specifications
	{
		id: 'opentype-specification',
		index: 17,
		title: 'OpenType Specification 1.9.1',
		author: 'Microsoft Typography (with Adobe, Apple, Google)',
		year: 1997,
		publisher: 'Microsoft',
		category: 'Specifications',
		whyCanonical:
			'Origin 1997 (Microsoft + Adobe joint announcement). Ratified as ISO/IEC 14496-22 ("Open Font Format") March 2007.',
		licensing: 'open',
		licensingDetail: 'Microsoft Learn pages freely readable, royalty-free implementation rights. ISO drafts freely downloadable.',
		auditFamilies: ['OpenType invariants (primary)', 'COLR/CPAL', 'Variable fonts', 'Vertical metrics'],
		canonicalUrl: 'https://learn.microsoft.com/en-us/typography/opentype/spec/',
		confidence: 'confirmed'
	},
	{
		id: 'apple-truetype-reference',
		index: 18,
		title: 'TrueType Reference Manual',
		author: 'Apple Inc.',
		year: 1991,
		publisher: 'Apple Computer',
		category: 'Specifications',
		whyCanonical: 'Definitive reference for TrueType instruction language (TT hinting bytecode).',
		licensing: 'open',
		licensingDetail: 'Free to read on developer.apple.com; Apple retains copyright.',
		auditFamilies: ['OpenType invariants (TT hinting)', 'Contour shape (grid-fitting)'],
		canonicalUrl: 'https://developer.apple.com/fonts/TrueType-Reference-Manual/',
		confidence: 'confirmed'
	},
	{
		id: 'opentype-os2-table',
		index: 19,
		title: 'OS/2 and Windows Metrics Table (OpenType spec subsection)',
		author: 'Microsoft',
		year: 1997,
		publisher: 'Microsoft',
		category: 'Specifications',
		whyCanonical:
			'The only normative description of winAscent/winDescent/sTypoAscender/USE_TYPO_METRICS cross-platform behavior — the source of nearly every "vertical metrics drift" bug.',
		licensing: 'open',
		auditFamilies: ['Vertical metrics (primary)'],
		canonicalUrl: 'https://learn.microsoft.com/en-us/typography/opentype/spec/os2',
		confidence: 'confirmed'
	},
	{
		id: 'opentype-colr-cpal',
		index: 20,
		title: 'COLR / CPAL Tables (OpenType spec subsections)',
		author: 'Microsoft',
		year: 2020,
		publisher: 'Microsoft',
		category: 'Specifications',
		whyCanonical: 'COLR v1 (2020) adds gradients, transforms, compositing — the modern color-font format.',
		licensing: 'open',
		auditFamilies: ['Color fonts (primary)'],
		canonicalUrl: 'https://learn.microsoft.com/en-us/typography/opentype/spec/colr',
		confidence: 'confirmed'
	},
	{
		id: 'opentype-variations',
		index: 21,
		title: 'Variations Tables (fvar, gvar, HVAR, VVAR, MVAR, STAT, avar)',
		author: 'Peter Constable, Ned Holbrook, Behdad Esfahbod, David Lemon',
		year: 2016,
		publisher: 'Microsoft / Apple / Google / Adobe',
		category: 'Specifications',
		whyCanonical: 'OpenType 1.8 (Sept 2016). The Four-Browsers joint effort that ratified variable fonts.',
		licensing: 'open',
		auditFamilies: ['Variable fonts (primary)'],
		canonicalUrl: 'https://learn.microsoft.com/en-us/typography/opentype/spec/fvar',
		confidence: 'confirmed'
	},
	{
		id: 'adobe-glyph-list',
		index: 22,
		title: 'Adobe Glyph List (AGL) Specification + AGLFN',
		author: 'Adobe Type Tools',
		year: 2010,
		publisher: 'Adobe Systems',
		category: 'Specifications',
		whyCanonical: 'Mapping 4,281 glyph names ↔ Unicode.',
		licensing: 'open',
		licensingDetail: 'Apache 2.0 / BSD-style on GitHub — fully ingestible.',
		auditFamilies: ['Naming + metadata (primary)', 'OpenType invariants (glyph-name canonicality)'],
		canonicalUrl: 'https://github.com/adobe-type-tools/agl-specification',
		confidence: 'confirmed'
	},
	{
		id: 'adobe-fea-spec',
		index: 23,
		title: 'Adobe OpenType Feature File Specification (.fea)',
		author: 'Adobe Type Tools',
		year: 2005,
		publisher: 'Adobe Systems',
		category: 'Specifications',
		whyCanonical: 'AFDKO documentation. The grammar every modern build pipeline ingests.',
		licensing: 'open',
		licensingDetail: 'Apache 2.0 (AFDKO repo).',
		auditFamilies: ['OpenType invariants (GSUB/GPOS)', 'Anchors'],
		canonicalUrl: 'http://adobe-type-tools.github.io/afdko/OpenTypeFeatureFileSpecification.html',
		confidence: 'confirmed'
	},
	{
		id: 'ufo-3-spec',
		index: 24,
		title: 'Unified Font Object (UFO) Specification',
		author: 'Tal Leming, Just van Rossum, Erik van Blokland',
		year: 2003,
		publisher: 'unifiedfontobject.org',
		category: 'Specifications',
		whyCanonical: 'Originated 2003; UFO 3 released 2012. Recommended source format by SIL.',
		licensing: 'open',
		licensingDetail: 'Open specification, MIT-style, on GitHub.',
		auditFamilies: ['Source-format invariants', 'Naming + metadata'],
		canonicalUrl: 'https://unifiedfontobject.org/',
		confidence: 'confirmed'
	},
	{
		id: 'unicode-standard',
		index: 25,
		title: 'The Unicode Standard, Version 16.0',
		author: 'Unicode Consortium',
		year: 2024,
		publisher: 'Unicode Consortium',
		category: 'Specifications',
		whyCanonical: 'ISO/IEC 10646 jointly maintained.',
		licensing: 'open',
		licensingDetail: 'Freely downloadable PDF, Unicode IP policy permits derivative use.',
		auditFamilies: ['Coverage (primary)', 'Anchors (combining marks)', 'Multi-script invariants'],
		canonicalUrl: 'https://www.unicode.org/versions/Unicode16.0.0/UnicodeStandard-16.0.pdf',
		confidence: 'confirmed'
	},
	{
		id: 'opentype-cookbook',
		index: 26,
		title: 'OpenType Cookbook',
		author: 'Tal Leming',
		year: 2014,
		publisher: 'opentypecookbook.com',
		category: 'Specifications',
		whyCanonical: 'Designer-oriented introduction to GSUB/GPOS feature syntax.',
		licensing: 'open',
		licensingDetail: 'Not formally open-licensed but freely readable; source on GitHub.',
		auditFamilies: ['OpenType invariants (primary teaching cite)'],
		canonicalUrl: 'https://opentypecookbook.com/',
		confidence: 'confirmed'
	},
	{
		id: 'use-shaping-docs',
		index: 27,
		title: 'Universal Shaping Engine + opentype-shaping-documents',
		author: 'Andrew Glass (Microsoft) + Nathan Willis',
		year: 2018,
		publisher: 'Microsoft / GitHub',
		category: 'Specifications',
		whyCanonical: 'The only published account of how complex scripts (Indic + 20+ others) shape via OpenType.',
		licensing: 'open',
		licensingDetail: 'Microsoft Learn freely readable; n8willis repo open-licensed.',
		auditFamilies: ['OpenType invariants (multi-script)', 'Anchors', 'Coverage'],
		canonicalUrl: 'https://github.com/n8willis/opentype-shaping-documents',
		confidence: 'confirmed'
	},

	// 1.3 Academic + research
	{
		id: 'knuth-mathematical-typography',
		index: 28,
		title: 'Mathematical Typography',
		author: 'Donald E. Knuth',
		year: 1979,
		publisher: 'Bulletin of the American Mathematical Society',
		category: 'Academic + research',
		whyCanonical: 'The foundational paper of parametric / computational type design. Spawned Metafont.',
		licensing: 'open',
		licensingDetail: 'AMS Bulletin papers from this era often freely downloadable via the AMS site.',
		auditFamilies: ['Contour shape (parametric reasoning)', 'Variable fonts (intellectual ancestor)'],
		canonicalUrl: 'https://www.historyofinformation.com/detail.php?id=3339',
		confidence: 'confirmed'
	},
	{
		id: 'knuth-metafont',
		index: 29,
		title: 'Metafont: A System for Alphabet Design',
		author: 'Donald E. Knuth',
		year: 1979,
		publisher: 'Stanford CS / Digital Press / AMS',
		category: 'Academic + research',
		whyCanonical: 'The system that produced Computer Modern; published in book form Dec 1979 as TEX and METAFONT.',
		licensing: 'open',
		auditFamilies: ['Contour shape', 'Variable fonts'],
		confidence: 'confirmed'
	},
	{
		id: 'haralambous-fonts-encodings',
		index: 30,
		title: 'Fonts & Encodings',
		author: 'Yannis Haralambous',
		year: 2007,
		publisher: 'O\'Reilly',
		category: 'Academic + research',
		whyCanonical:
			'The most comprehensive single-volume reference covering PostScript, TrueType, OpenType, AAT, Metafont, Unicode, multi-script shaping.',
		licensing: 'fair-use',
		licensingDetail: 'In-copyright O\'Reilly; HAL deposit of French manuscript freely available on hal.science.',
		auditFamilies: ['All 9 families (secondary)', 'OpenType invariants', 'Coverage', 'Multi-script'],
		canonicalUrl: 'https://archive.org/details/fontsencodings0000hara',
		confidence: 'confirmed'
	},
	{
		id: 'lunde-cjkv',
		index: 31,
		title: 'CJKV Information Processing',
		author: 'Ken Lunde',
		year: 1999,
		publisher: 'O\'Reilly',
		category: 'Academic + research',
		whyCanonical: 'The standard reference for Chinese/Japanese/Korean/Vietnamese text and font processing.',
		licensing: 'fair-use',
		licensingDetail: 'In-copyright O\'Reilly. 2nd ed. 2009.',
		auditFamilies: ['Coverage (CJKV)', 'Naming + metadata (Adobe-Japan1 ROS)', 'OpenType (vert/CJK features)'],
		canonicalUrl: 'https://archive.org/details/cjkvinformationp00lund',
		confidence: 'confirmed'
	},
	{
		id: 'macrakis-greek-letters',
		index: 32,
		title: 'Greek Letters: From Tablets to Pixels',
		author: 'Michael Macrakis (ed.)',
		year: 1996,
		publisher: 'Oak Knoll Press',
		category: 'Academic + research',
		whyCanonical: 'The only English-language proceedings volume centering Greek type design. Contributions from Hermann Zapf, Matthew Carter, Nicolas Barker.',
		licensing: 'fair-use',
		auditFamilies: ['Multi-script coverage (Greek)', 'Historical naming'],
		confidence: 'likely'
	},
	{
		id: 'leonidas-greek-primer',
		index: 33,
		title: 'A primer on Greek type design',
		author: 'Gerry Leonidas',
		year: 2013,
		publisher: 'leonidas.net',
		category: 'Academic + research',
		whyCanonical: 'Open-web canonical English-language Greek type-design primer (originally Reading lecture notes, 1998–2002).',
		licensing: 'open',
		licensingDetail: 'Freely available on author\'s site.',
		auditFamilies: ['Multi-script coverage (Greek)', 'Contour shape'],
		canonicalUrl: 'https://leonidas.net/2013/12/01/a-primer-on-greek-type-design/',
		confidence: 'confirmed'
	},
	{
		id: 'decotype-arabic',
		index: 34,
		title: 'DecoType / Thomas Milo writings on Arabic',
		author: 'Thomas Milo (DecoType)',
		year: 1989,
		publisher: 'DecoType',
		category: 'Academic + research',
		whyCanonical: 'Typesetting Islamic Calligraphy (1989); decotype.com publications. Recipient of Peter Karow award.',
		licensing: 'fair-use',
		auditFamilies: ['Multi-script coverage (Arabic)', 'OpenType invariants (joining/USE/Arab shaping)'],
		canonicalUrl: 'https://decotype.com/',
		confidence: 'likely'
	},
	{
		id: 'sakkal-arabic',
		index: 35,
		title: 'Arabic Type series',
		author: 'Mamoun Sakkal',
		year: 2008,
		publisher: 'sakkal.com',
		category: 'Academic + research',
		whyCanonical: 'Open-web canonical English-language Arabic type-design tutorial.',
		licensing: 'open',
		licensingDetail: 'Freely web-readable.',
		auditFamilies: ['Multi-script coverage (Arabic)'],
		canonicalUrl: 'https://www.sakkal.com/articles/Arabic_Type_Article/Arabic_Type4.html',
		confidence: 'confirmed'
	},

	// 1.4 Foundry blogs
	{
		id: 'klim-blog',
		index: 36,
		title: 'Design Information + Blog',
		author: 'Kris Sowersby (Klim Type Foundry)',
		year: 2008,
		publisher: 'Klim Type Foundry',
		category: 'Foundry blogs',
		whyCanonical:
			'The most thoroughly published contemporary type-design studio reasoning; cited by educators globally.',
		licensing: 'fair-use',
		licensingDetail: 'Open-web readable, copyright Klim. Fair-use citation appropriate.',
		auditFamilies: ['Contour shape', 'Spacing', 'Classification', 'Naming'],
		canonicalUrl: 'https://klim.co.nz/blog/',
		confidence: 'confirmed'
	},
	{
		id: 'frere-jones-blog',
		index: 37,
		title: 'Frere-Jones Type — Blog',
		author: 'Tobias Frere-Jones',
		year: 2015,
		publisher: 'Frere-Jones Type',
		category: 'Foundry blogs',
		whyCanonical: 'Essays on type-history, ephemera, technical reasoning.',
		licensing: 'fair-use',
		auditFamilies: ['Contour shape', 'Naming / historical metadata'],
		canonicalUrl: 'https://frerejones.com/blog',
		confidence: 'confirmed'
	},
	{
		id: 'phinney-on-fonts',
		index: 38,
		title: 'Phinney on Fonts',
		author: 'Thomas Phinney',
		year: 2005,
		publisher: 'thomasphinney.com',
		category: 'Foundry blogs',
		whyCanonical: 'Former Adobe Type product manager, FontLab president, ATypI board.',
		licensing: 'fair-use',
		auditFamilies: ['Variable fonts', 'OpenType invariants', 'Font-format history'],
		canonicalUrl: 'https://www.thomasphinney.com/',
		confidence: 'confirmed'
	},
	// 1.5 Living OFL exemplars — contemporary open-source fonts that
	// demonstrate the audit categories in production.
	{
		id: 'bungee-djr',
		index: 39,
		title: 'Bungee',
		author: 'David Jonathan Ross',
		year: 2018,
		publisher: 'djr.com',
		category: 'Living OFL exemplars',
		whyCanonical:
			'The canonical open-source chromatic signage typeface. Multi-layer COLR/CPAL implementation in production; one of the few OFL fonts that exercises the full color-font pipeline. Active maintenance through 2026.',
		topicalCoverage:
			'COLR/CPAL color fonts, multi-layer font architecture, vertical + horizontal setting, sign-painting tradition.',
		licensing: 'open',
		licensingDetail: 'OFL 1.1. Source UFOs published at github.com/djrrb/Bungee.',
		digitization: 'github.com/djrrb/Bungee; Google Fonts.',
		auditFamilies: ['Color font (COLR/CPAL)', 'OpenType invariants', 'Glyph naming'],
		canonicalUrl: 'https://github.com/djrrb/Bungee',
		confidence: 'confirmed'
	},
	{
		id: 'fit-djr',
		index: 40,
		title: 'Fit',
		author: 'David Jonathan Ross',
		year: 2017,
		publisher: 'djr.com',
		category: 'Living OFL exemplars',
		whyCanonical:
			'Extreme-range single-axis variable font (wdth 10–1000). Exemplary stress test for any variable-font tool — Patens\'s axis-range-extreme audit fires on its designspace as expected, validating the check.',
		topicalCoverage:
			'Variable fonts (wdth axis), designspace v3, extreme interpolation, display typography.',
		licensing: 'open',
		licensingDetail: 'OFL 1.1 (Font of the Month Club distribution).',
		digitization: 'github.com/djrrb/fit-vf-test (designspace + UFO sources).',
		auditFamilies: ['Variable fonts', 'Designspace axes', 'Variable-font compatibility'],
		canonicalUrl: 'https://djr.com/fit',
		confidence: 'confirmed'
	},
	{
		id: 'amstelvar-typenetwork',
		index: 41,
		title: 'Amstelvar',
		author: 'Type Network team (lead: Nick Sherman, David Berlow)',
		year: 2017,
		publisher: 'Type Network',
		category: 'Living OFL exemplars',
		whyCanonical:
			'The original parametric-axis variable font. Demonstrates the unregistered Type Network parametric axes (XOPQ, YOPQ, XTRA, etc.) the OpenType axis-tag registry treats as proposed. Required reading for anyone implementing parametric-axis support in a font tool.',
		topicalCoverage:
			'Parametric variable axes, registered + unregistered axis tags, STAT table design, fvar conventions.',
		licensing: 'open',
		licensingDetail: 'OFL 1.1. Roman + Italic designspaces published openly.',
		digitization: 'github.com/TypeNetwork/Amstelvar; djrrb/AmstelvarNew (DJR fork with active designspace work).',
		auditFamilies: ['Variable fonts', 'Designspace axes', 'STAT table', 'Variable-font compatibility'],
		canonicalUrl: 'https://github.com/TypeNetwork/Amstelvar',
		confidence: 'confirmed'
	},
	{
		id: 'roboto-flex-google',
		index: 42,
		title: 'Roboto Flex',
		author: 'Google Fonts team + Type Network',
		year: 2022,
		publisher: 'Google Fonts',
		category: 'Living OFL exemplars',
		whyCanonical:
			'The most widely-deployed parametric variable font in production. Ships the Type Network parametric axes at scale (millions of pageloads via Google Fonts). The de-facto reference for what a "parametric-axis-aware" font tool needs to support, since these axes pass through the Google Fonts pipeline daily.',
		topicalCoverage:
			'Production parametric axes, Google Fonts pipeline, opsz + parametric coexistence, large-axis-count interpolation.',
		licensing: 'open',
		licensingDetail: 'OFL 1.1.',
		digitization: 'github.com/googlefonts/roboto-flex; fonts.google.com.',
		auditFamilies: ['Variable fonts', 'Designspace axes', 'STAT table', 'Variable-font compatibility'],
		canonicalUrl: 'https://github.com/googlefonts/roboto-flex',
		confidence: 'confirmed'
	}
];

/** Look up an entry by id. */
export const libraryById = (id: string): LibraryEntry | undefined =>
	LIBRARY.find((e) => e.id === id);

/** Library entries grouped by category. */
export const libraryByCategory = (): Record<LibraryCategory, LibraryEntry[]> => {
	const out = {
		'Foundational craft & theory': [] as LibraryEntry[],
		Specifications: [] as LibraryEntry[],
		'Academic + research': [] as LibraryEntry[],
		'Foundry blogs': [] as LibraryEntry[],
		'Living OFL exemplars': [] as LibraryEntry[]
	};
	for (const entry of LIBRARY) {
		out[entry.category].push(entry);
	}
	return out;
};
