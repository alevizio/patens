/**
 * Citation engine — audit-code → citation matcher.
 *
 * Given a Patens audit code (e.g., "sidebearing-class-drift-lsb"),
 * returns the top-ranked Citations from the corpus that establish or
 * explain the rule. See docs/research/canonical-library.md Section 2
 * for the per-family licensing matrix and citation strength rationale.
 *
 * Current implementation is keyword + family-mapping based — a
 * deterministic lookup against a hand-built citation map. Post-launch
 * roadmap (per docs/research/ai-features-roadmap.md Feature 1) is to
 * augment this with semantic retrieval over the full ingested corpus
 * text. The deterministic baseline remains as the fallback path.
 */

import type { AuditCodeCitationMatch, RankedCitation } from './types';
import { MAX_CITATIONS_PER_CODE } from './types';

/**
 * Hand-built citation map — keyed by audit code, lists the (citationId,
 * anchor, gist, score) tuples that establish the rule. Citations are
 * sourced from the corpus.ts manifest; this map is built from the
 * licensing matrix in docs/research/canonical-library.md Section 2.
 *
 * Empty mapping = no canonical citation in the open MVP corpus. The UI
 * should gracefully degrade ("no canonical citation in our reference
 * corpus yet — see [related family] sources").
 */
type CitationMapEntry = {
	/** `${sourceId}:${anchor}` — must resolve to a real Source in corpus.ts */
	citationId: string;
	/** Where IN the source — page range / spec section / chapter ID */
	anchor: string;
	/** One-line description of what the cited passage establishes */
	gist: string;
	/** Relevance score 0-1 */
	score: number;
};

const CITATION_MAP: ReadonlyMap<string, ReadonlyArray<CitationMapEntry>> =
	new Map<string, ReadonlyArray<CitationMapEntry>>([
		// Family 1 — Contour shape
		[
			'self-intersecting',
			[
				{
					citationId: 'opentype-spec:filling',
					anchor: '§ filling-and-clipping',
					gist: 'Even-odd vs non-zero fill-rule determines how self-intersecting contours rasterise — unpredictably across renderers.',
					score: 0.6
				}
			]
		],
		[
			'contour-winding-collision',
			[
				{
					citationId: 'opentype-spec:filling',
					anchor: '§ filling-and-clipping',
					gist: 'Contour winding direction (CW vs CCW) determines whether a contour fills as ink or as counter; mixing them creates the "filled crescent" artefact.',
					score: 0.7
				}
			]
		],
		[
			'off-grid-points',
			[
				{
					citationId: 'truetype-reference-manual:Chap5',
					anchor: 'Chap5 — Instruction Set',
					gist: 'Grid-fitting (hinting) assumes integer-valued coordinates; sub-integer points cannot be grid-snapped without rounding artefacts.',
					score: 0.5
				}
			]
		],
		[
			'open-contour',
			[
				{
					citationId: 'opentype-spec:cff2',
					anchor: '§ CFF2 spec',
					gist: 'CFF Type 2 charstring format requires closed contours; rasterisation of open paths is undefined behaviour.',
					score: 0.4
				}
			]
		],

		// Family 2 — Vertical metrics + topology
		[
			'metrics-cap-above-ascender',
			[
				{
					citationId: 'opentype-spec:os2',
					anchor: '§ OS/2 — Vertical Metrics',
					gist: 'sCapHeight must not exceed sTypoAscender or capitals risk clipping on platforms using OS/2 metrics.',
					score: 1.0
				}
			]
		],
		[
			'metrics-x-above-cap',
			[
				{
					citationId: 'opentype-spec:os2',
					anchor: '§ OS/2 — sxHeight, sCapHeight',
					gist: 'x-height should be less than cap-height in conventional Latin typefaces; inversion is highly unusual and likely an error.',
					score: 1.0
				}
			]
		],
		[
			'metrics-asc-mismatch',
			[
				{
					citationId: 'opentype-spec:os2',
					anchor: '§ Cross-platform line-height (USE_TYPO_METRICS)',
					gist: 'sTypoAscender (OS/2) vs hhea ascender mismatch causes platform-dependent line-height; the source of nearly every "vertical metrics drift" bug.',
					score: 1.0
				}
			]
		],
		[
			'metrics-desc-mismatch',
			[
				{
					citationId: 'opentype-spec:os2',
					anchor: '§ Cross-platform line-height (USE_TYPO_METRICS)',
					gist: 'sTypoDescender (OS/2) vs hhea descender mismatch creates cross-platform inconsistency; align both to the same conceptual baseline.',
					score: 1.0
				}
			]
		],
		[
			'metrics-gap-mismatch',
			[
				{
					citationId: 'opentype-spec:os2',
					anchor: '§ sTypoLineGap, hhea LineGap',
					gist: 'Line-gap mismatch between OS/2 and hhea causes different line-heights on macOS vs Windows; standardise both.',
					score: 1.0
				}
			]
		],
		[
			'metrics-use-typo-off',
			[
				{
					citationId: 'opentype-spec:os2',
					anchor: '§ fsSelection bit 7 (USE_TYPO_METRICS)',
					gist: 'When USE_TYPO_METRICS is off, applications fall back to legacy winAscent/winDescent rather than the cross-platform-stable sTypo values.',
					score: 1.0
				}
			]
		],
		[
			'metrics-win-clip-top',
			[
				{
					citationId: 'opentype-spec:os2',
					anchor: '§ usWinAscent',
					gist: 'usWinAscent defines the Windows clipping bounds; ascenders above it clip in Windows applications using legacy metrics.',
					score: 0.9
				}
			]
		],
		[
			'metrics-win-clip-bottom',
			[
				{
					citationId: 'opentype-spec:os2',
					anchor: '§ usWinDescent',
					gist: 'usWinDescent (unsigned!) defines the Windows clipping bounds for descenders; values below it clip in legacy rendering.',
					score: 0.9
				}
			]
		],

		// Family 3 — Spacing + sidebearings
		[
			'zero-advance',
			[
				{
					citationId: 'opentype-spec:hmtx',
					anchor: '§ Horizontal Metrics Table',
					gist: 'A zero advance-width on a non-combining glyph leaves the cursor stationary; valid only for combining marks (anchored via GPOS).',
					score: 1.0
				}
			]
		],
		[
			'sidebearing-class-drift-lsb',
			[
				{
					citationId: 'stop-stealing-sheep:spacing',
					anchor: 'Chapter on spacing',
					gist: 'Designers group glyphs into sidebearing classes (round letters, straight stems, narrow shapes); drift within a class breaks the optical rhythm Tracy and Hochuli describe.',
					score: 0.6
				}
			]
		],
		[
			'sidebearing-class-drift-rsb',
			[
				{
					citationId: 'stop-stealing-sheep:spacing',
					anchor: 'Chapter on spacing',
					gist: 'Same principle as left-sidebearing class drift, applied to the right-sidebearing class.',
					score: 0.6
				}
			]
		],
		[
			'kerning-extreme',
			[
				{
					citationId: 'opentype-spec:kern',
					anchor: '§ kern subtable, GPOS PairPos',
					gist: 'Kerning values are designed to fine-tune spacing within ~10-20% of the glyph advance; magnitudes exceeding half the advance suggest a decimal-place typo.',
					score: 0.7
				}
			]
		],

		// Family 4 — OpenType invariants
		[
			'duplicate-glyph-name',
			[
				{
					citationId: 'opentype-spec:post',
					anchor: '§ post table — glyph names',
					gist: 'Glyph names must be unique within a font; duplicate names cause undefined behaviour in features that reference by name (.fea substitutions, kerning classes).',
					score: 1.0
				}
			]
		],
		[
			'feature-kern-disabled-with-pairs',
			[
				{
					citationId: 'adobe-fea-spec:kern-feature',
					anchor: '§ feature kern',
					gist: 'When kerning pairs exist but the kern feature is disabled, the kerning is silently ignored — a common cause of "my font lost its kerning" bugs.',
					score: 1.0
				}
			]
		],
		[
			'pair-orphan-class',
			[
				{
					citationId: 'adobe-fea-spec:classes',
					anchor: '§ Glyph classes',
					gist: 'A pair referencing a non-existent class is a no-op at compile time; lookups fail silently.',
					score: 1.0
				}
			]
		],
		[
			'class-empty',
			[
				{
					citationId: 'adobe-fea-spec:classes',
					anchor: '§ Glyph classes',
					gist: 'Empty classes compile but never match; their presence is misleading — remove or populate.',
					score: 1.0
				}
			]
		],
		[
			'class-missing-member',
			[
				{
					citationId: 'adobe-fea-spec:classes',
					anchor: '§ Glyph classes — referenced glyphs',
					gist: 'Class members must reference existing glyph names; orphan references compile-error or silently truncate the class.',
					score: 1.0
				}
			]
		],
		[
			'class-name-format',
			[
				{
					citationId: 'adobe-fea-spec:classes',
					anchor: '§ Glyph class syntax',
					gist: 'Class names must begin with `@`; the FEA parser rejects names that violate this.',
					score: 1.0
				}
			]
		],
		[
			'pair-missing-glyph',
			[
				{
					citationId: 'adobe-fea-spec:pairpos',
					anchor: '§ pos pair',
					gist: 'Kerning pairs must reference existing glyphs; orphan references cause compile errors or silent truncation depending on toolchain.',
					score: 1.0
				}
			]
		],
		[
			'kerning-pair-self',
			[
				{
					citationId: 'adobe-fea-spec:pairpos',
					anchor: '§ pos pair',
					gist: 'A glyph kerning against itself (e.g., AA) is rarely intentional — most often a copy-paste error.',
					score: 0.8
				}
			]
		],
		[
			'kerning-class-singleton',
			[
				{
					citationId: 'opentype-cookbook:kerning',
					anchor: '§ kerning classes',
					gist: 'A kerning class with a single member offers no class-level abstraction; flatten to a pair.',
					score: 0.7
				}
			]
		],
		[
			'composite-missing-base',
			[
				{
					citationId: 'ufo-3-spec:components',
					anchor: '§ Component element',
					gist: 'Component-composite glyphs reference base glyphs by name; orphan base references render as missing glyphs.',
					score: 1.0
				}
			]
		],
		[
			'composite-cycle',
			[
				{
					citationId: 'ufo-3-spec:components',
					anchor: '§ Component recursion',
					gist: 'A composite referencing itself (directly or transitively) causes infinite recursion at render time; cycles are not allowed.',
					score: 1.0
				}
			]
		],

		// Family 5 — Naming + metadata
		[
			'naming-family',
			[
				{
					citationId: 'opentype-spec:name',
					anchor: '§ name table — nameID 1, 16',
					gist: 'Family name (nameID 1) and Typographic Family (nameID 16) are required for font identification in operating systems and applications.',
					score: 1.0
				}
			]
		],
		[
			'naming-style',
			[
				{
					citationId: 'opentype-spec:name',
					anchor: '§ name table — nameID 2, 17',
					gist: 'Style name (nameID 2) and Typographic Subfamily (nameID 17) carry the variant designation (Regular/Bold/Italic); both are required.',
					score: 1.0
				}
			]
		],
		[
			'naming-version',
			[
				{
					citationId: 'opentype-spec:name',
					anchor: '§ name table — nameID 5 (Version)',
					gist: 'Version string (nameID 5) should follow the format "Version x.yyy"; deviations confuse downstream tooling and version comparison.',
					score: 1.0
				}
			]
		],
		[
			'glyph-name-not-canonical',
			[
				{
					citationId: 'adobe-glyph-list:agl-aglfn',
					anchor: 'AGLFN mapping table',
					gist: 'The Adobe Glyph List for New Fonts (AGLFN) maps glyph names to Unicode codepoints. Non-canonical names break downstream tooling that relies on the AGL convention.',
					score: 1.0
				}
			]
		],
		[
			'meta-no-vendor-id',
			[
				{
					citationId: 'opentype-spec:os2',
					anchor: '§ OS/2 achVendID',
					gist: 'The 4-byte vendor ID identifies the foundry; missing or default values weaken font provenance tracking.',
					score: 1.0
				}
			]
		],
		[
			'meta-vendor-id-invalid',
			[
				{
					citationId: 'opentype-spec:os2',
					anchor: '§ OS/2 achVendID — char set',
					gist: 'Vendor ID must be exactly 4 ASCII characters from the printable subset; deviations confuse registrar-style lookups.',
					score: 1.0
				}
			]
		],

		// Family 6 — Coverage (Unicode)
		[
			'coverage-typo-essentials',
			[
				{
					citationId: 'unicode-standard-16:basic-latin',
					anchor: '§ Block: Basic Latin (U+0020 - U+007F)',
					gist: 'The "typographic essentials" subset includes punctuation, spaces, and ASCII; missing any of these breaks basic text rendering.',
					score: 0.9
				}
			]
		],
		[
			'coverage-latin-1-supp',
			[
				{
					citationId: 'unicode-standard-16:latin-1-supp',
					anchor: '§ Block: Latin-1 Supplement (U+0080 - U+00FF)',
					gist: 'Latin-1 Supplement covers Western European accented characters (é, ñ, ü, etc.); missing these breaks rendering for major world languages.',
					score: 1.0
				}
			]
		],
		[
			'coverage-currency',
			[
				{
					citationId: 'unicode-standard-16:currency',
					anchor: '§ Block: Currency Symbols (U+20A0 - U+20CF)',
					gist: 'Currency symbols (€, ¥, £, ₹, etc.) ship in a dedicated Unicode block; coverage matters for any face used in financial or commercial contexts.',
					score: 1.0
				}
			]
		],
		[
			'coverage-math',
			[
				{
					citationId: 'unicode-standard-16:math-symbols',
					anchor: '§ Mathematical Operators block',
					gist: 'Mathematical operators (×, ÷, ±, ≤, ≥, ∞, etc.) appear in a dedicated block; missing them limits technical typography.',
					score: 1.0
				}
			]
		],

		// Family 7 — Anchors
		[
			'anchor-naming-mark-no-prefix',
			[
				{
					citationId: 'adobe-fea-spec:mark-positioning',
					anchor: '§ Mark-to-base, naming conventions',
					gist: 'Anchor names on mark glyphs require an underscore prefix (_top, _bottom) per the standard convention; without it, the GPOS lookup fails to bind.',
					score: 1.0
				}
			]
		],
		[
			'anchor-naming-base-with-prefix',
			[
				{
					citationId: 'adobe-fea-spec:mark-positioning',
					anchor: '§ Mark-to-base, naming conventions',
					gist: 'Anchor names on base glyphs must NOT have the underscore prefix (use top, bottom — without leading _); the prefix is mark-only.',
					score: 1.0
				}
			]
		],
		[
			'anchor-without-partner',
			[
				{
					citationId: 'opentype-spec:os2',
					anchor: '§ GPOS — Mark-to-Base attachment',
					gist: 'GPOS mark-positioning requires both a base glyph with an anchor and a mark glyph with the matching prefixed anchor; an orphan on either side is dead code.',
					score: 0.9
				}
			]
		],

		// Family 8 — Variable fonts
		[
			'master-axis-out-of-range',
			[
				{
					citationId: 'opentype-spec:fvar',
					anchor: '§ fvar — VariationAxisRecord',
					gist: 'Master locations must fall within the axis min/max range declared in fvar; values outside the range create undefined interpolation behaviour.',
					score: 1.0
				},
				{
					citationId: 'variablefonts-io-primer:implementing',
					anchor: 'Implementing variable fonts',
					gist: 'Practitioner-friendly explanation of the axis-range model and how downstream consumers (browsers, CSS) interpret out-of-range values.',
					score: 0.6
				}
			]
		],
		[
			'master-axis-missing',
			[
				{
					citationId: 'opentype-spec:fvar',
					anchor: '§ fvar — VariationAxisRecord',
					gist: 'Each master must declare a location for every axis the font defines; missing locations break interpolation at runtime.',
					score: 1.0
				}
			]
		],
		[
			'master-contour-count',
			[
				{
					citationId: 'opentype-spec:gvar',
					anchor: '§ gvar — Glyph Variations Table',
					gist: 'Variable-font masters must have matching contour counts per glyph; mismatches break interpolation between masters.',
					score: 1.0
				}
			]
		],
		[
			'master-point-count',
			[
				{
					citationId: 'opentype-spec:gvar',
					anchor: '§ gvar — Glyph Variations Table',
					gist: 'Variable-font masters must have matching point counts per contour per glyph; mismatches cause gvar interpolation failure.',
					score: 1.0
				}
			]
		],
		[
			'master-axis-unknown',
			[
				{
					citationId: 'opentype-spec:fvar',
					anchor: '§ fvar — VariationAxisRecord',
					gist: 'Master locations must reference axes declared in the fvar table; orphan axis references are dead specifications.',
					score: 1.0
				}
			]
		],
		[
			'master-empty',
			[
				{
					citationId: 'ufo-3-spec:designspace',
					anchor: 'Designspace — sources',
					gist: 'A master with no glyph overrides contributes nothing to the variation surface; an empty master is dead specification.',
					score: 0.8
				}
			]
		],
		[
			'master-orphan-axis',
			[
				{
					citationId: 'opentype-spec:fvar',
					anchor: '§ fvar — designspace axes',
					gist: 'Each axis a master references must be declared globally; orphan references cause undefined behaviour during interpolation.',
					score: 1.0
				}
			]
		],
		[
			'master-out-of-range',
			[
				{
					citationId: 'opentype-spec:fvar',
					anchor: '§ fvar — min/default/max',
					gist: 'Master locations must fall within the axis min/max range; values outside the range create undefined interpolation at runtime.',
					score: 1.0
				}
			]
		],
		[
			'instance-orphan-axis',
			[
				{
					citationId: 'opentype-spec:fvar',
					anchor: '§ fvar — InstanceRecord coordinates',
					gist: 'Instance coordinates must reference declared axes; orphan references make the instance unaddressable from CSS or font pickers.',
					score: 1.0
				}
			]
		],
		[
			'no-instances',
			[
				{
					citationId: 'opentype-spec:fvar',
					anchor: '§ fvar — InstanceRecord',
					gist: 'Named instances (e.g., Regular, Bold, Light) are the most user-friendly way to expose a variable font; without them users see only the axis sliders.',
					score: 0.8
				},
				{
					citationId: 'variablefonts-io-primer:designing',
					anchor: 'Designing with variable fonts',
					gist: 'Practitioner-friendly guidance on how to expose a variable font to web designers via named instances — the user-facing affordance for axis exploration.',
					score: 0.6
				}
			]
		],
		[
			'axis-range-invalid',
			[
				{
					citationId: 'opentype-spec:fvar',
					anchor: '§ fvar — VariationAxisRecord min/max/default',
					gist: 'Axis range must have min ≤ default ≤ max; inversions or out-of-range defaults break the variation surface.',
					score: 1.0
				}
			]
		],

		// Family 9 — Color fonts · brief · misc
		[
			'palette-length-mismatch',
			[
				{
					citationId: 'opentype-spec:cpal',
					anchor: '§ CPAL — palette length',
					gist: 'All palettes in a CPAL table must have the same length; mismatches cause out-of-bounds reads when the user switches palettes.',
					score: 1.0
				}
			]
		],
		[
			'color-layer-no-palette',
			[
				{
					citationId: 'opentype-spec:cpal',
					anchor: '§ COLR / CPAL',
					gist: 'A COLR color layer requires a CPAL palette to resolve the color index; without a palette, the layer renders as solid black or undefined.',
					score: 1.0
				}
			]
		],
		[
			'color-layer-out-of-range',
			[
				{
					citationId: 'opentype-spec:cpal',
					anchor: '§ CPAL — paletteIndex',
					gist: 'COLR layer palette indices must be within the CPAL palette length; out-of-range indices wrap or render as undefined color.',
					score: 1.0
				}
			]
		],

		// Additional Family 1 — Contour shape (open-corpus citations)
		[
			'empty',
			[
				{
					citationId: 'ufo-3-spec:glyphs',
					anchor: '§ Glyph — outline element',
					gist: 'A glyph with no contours and no components is empty; valid only for whitespace glyphs (space, no-break space, etc.).',
					score: 0.8
				}
			]
		],
		[
			'duplicate-points',
			[
				{
					citationId: 'ufo-3-spec:glyphs',
					anchor: '§ Glyph — point definitions',
					gist: 'Two points at identical coordinates produce undefined Bézier curvature; remove the duplicate.',
					score: 0.7
				}
			]
		],

		// Additional Family 2 — Vertical metrics (open-corpus citations)
		[
			'capheight-misaligned',
			[
				{
					citationId: 'opentype-spec:os2',
					anchor: '§ OS/2 — sCapHeight',
					gist: 'sCapHeight should match the actual cap-height of capital letters in the font; drift causes layout-engine misalignment.',
					score: 0.9
				}
			]
		],
		[
			'xheight-misaligned',
			[
				{
					citationId: 'opentype-spec:os2',
					anchor: '§ OS/2 — sxHeight',
					gist: 'sxHeight should match the actual x-height of lowercase letters in the font; drift causes line-height calculation errors in layout engines.',
					score: 0.9
				}
			]
		],
		[
			'metrics-descender-nonnegative',
			[
				{
					citationId: 'opentype-spec:os2',
					anchor: '§ OS/2 — sTypoDescender',
					gist: 'sTypoDescender should be negative or zero (descenders sit below the baseline); positive values are nearly always errors.',
					score: 1.0
				}
			]
		],
		[
			'metrics-zero-height',
			[
				{
					citationId: 'opentype-spec:os2',
					anchor: '§ OS/2 — sTypoAscender, sTypoDescender',
					gist: 'A typo ascender of zero (or matching the typo descender) produces zero font height; rendering will collapse.',
					score: 1.0
				}
			]
		],

		// Family 3 — Spacing & sidebearings (additional)
		[
			'overflows-advance',
			[
				{
					citationId: 'opentype-spec:hmtx',
					anchor: '§ Horizontal Metrics Table',
					gist: 'Glyph extents that overflow the advance width cause collisions with the next character in tight settings.',
					score: 0.8
				}
			]
		],
		[
			'extends-above-ascender',
			[
				{
					citationId: 'opentype-spec:os2',
					anchor: '§ OS/2 — usWinAscent',
					gist: 'Glyphs extending above usWinAscent clip on Windows applications using legacy line-height metrics.',
					score: 0.8
				}
			]
		],
		[
			'extends-below-descender',
			[
				{
					citationId: 'opentype-spec:os2',
					anchor: '§ OS/2 — usWinDescent',
					gist: 'Glyphs extending below usWinDescent clip on Windows applications using legacy line-height metrics.',
					score: 0.8
				}
			]
		],
		[
			'sidebearing-deeply-negative-lsb',
			[
				{
					citationId: 'opentype-spec:hmtx',
					anchor: '§ leftSideBearing',
					gist: 'Deeply negative LSB causes glyph collision with the previous character — usually a typo (extra minus sign or units mistake).',
					score: 0.7
				}
			]
		],
		[
			'sidebearing-deeply-negative-rsb',
			[
				{
					citationId: 'opentype-spec:hmtx',
					anchor: '§ advanceWidth + LSB',
					gist: 'Deeply negative RSB (advance < right-edge) causes glyph collision with the next character — usually a units mistake.',
					score: 0.7
				}
			]
		],

		// Family 4 — OpenType invariants (additional)
		[
			'kerning-no-classes',
			[
				{
					citationId: 'opentype-cookbook:kerning',
					anchor: '§ kerning classes',
					gist: 'Hundreds of individual pair-positioning records that could be expressed as a few classes inflate the font binary and complicate maintenance.',
					score: 0.7
				}
			]
		],

		// Family 5 — Naming + metadata (additional 12 codes)
		[
			'meta-no-copyright',
			[
				{
					citationId: 'opentype-spec:name',
					anchor: '§ name table — nameID 0 (Copyright)',
					gist: 'Copyright notice (nameID 0) is required for legal provenance and is parsed by font-managers + foundry tooling.',
					score: 1.0
				}
			]
		],
		[
			'meta-no-designer',
			[
				{
					citationId: 'opentype-spec:name',
					anchor: '§ name table — nameID 9 (Designer)',
					gist: 'Designer name (nameID 9) attributes the work; required for proper credit in font-pickers and foundry catalogues.',
					score: 1.0
				}
			]
		],
		[
			'meta-no-designer-url',
			[
				{
					citationId: 'opentype-spec:name',
					anchor: '§ name table — nameID 12 (Designer URL)',
					gist: 'Designer URL (nameID 12) lets font users follow back to the designer; missing means font-pickers cannot link out.',
					score: 0.9
				}
			]
		],
		[
			'meta-no-license',
			[
				{
					citationId: 'opentype-spec:name',
					anchor: '§ name table — nameID 13 (License Description)',
					gist: 'License description (nameID 13) is the legally-binding usage terms embedded in the binary; absence creates legal ambiguity.',
					score: 1.0
				}
			]
		],
		[
			'meta-no-license-url',
			[
				{
					citationId: 'opentype-spec:name',
					anchor: '§ name table — nameID 14 (License URL)',
					gist: 'License URL (nameID 14) points at the canonical license text; required for OFL and similar redistributable licenses.',
					score: 0.9
				}
			]
		],
		[
			'meta-no-manufacturer',
			[
				{
					citationId: 'opentype-spec:name',
					anchor: '§ name table — nameID 8 (Manufacturer)',
					gist: 'Manufacturer (nameID 8) identifies the foundry/organization; required for proper attribution in font-pickers.',
					score: 0.9
				}
			]
		],
		[
			'meta-version-format',
			[
				{
					citationId: 'opentype-spec:name',
					anchor: '§ name table — nameID 5 (Version)',
					gist: 'Version string format should be "Version x.yyy"; non-canonical formats break version comparison in downstream tooling.',
					score: 1.0
				}
			]
		],
		[
			'naming-copyright-missing',
			[
				{
					citationId: 'opentype-spec:name',
					anchor: '§ name table — nameID 0',
					gist: 'Copyright notice is required for legal provenance; missing copyright opens the font to claim-of-derivative confusion.',
					score: 1.0
				}
			]
		],
		[
			'naming-designer-missing',
			[
				{
					citationId: 'opentype-spec:name',
					anchor: '§ name table — nameID 9',
					gist: 'Designer attribution is required by most font licenses; missing it leaves the designer un-creditable in font-pickers.',
					score: 1.0
				}
			]
		],
		[
			'naming-license-missing',
			[
				{
					citationId: 'opentype-spec:name',
					anchor: '§ name table — nameID 13',
					gist: 'License terms in the binary are the legally-binding text; missing license leaves usage rights ambiguous.',
					score: 1.0
				}
			]
		],
		[
			'naming-family-chars',
			[
				{
					citationId: 'opentype-spec:name',
					anchor: '§ name table — character restrictions',
					gist: 'Family name characters are restricted for font-picker compatibility (no slashes, control characters, etc.).',
					score: 1.0
				}
			]
		],
		[
			'naming-family-long',
			[
				{
					citationId: 'opentype-spec:name',
					anchor: '§ name table — length',
					gist: 'Family names should be under 32 characters; longer names truncate in font-pickers and OS dialogs.',
					score: 0.9
				}
			]
		],
		[
			'glyph-name-empty',
			[
				{
					citationId: 'opentype-spec:post',
					anchor: '§ post table — glyph names',
					gist: 'Empty glyph names are invalid; the post table requires every glyph to have a stable identifier.',
					score: 1.0
				}
			]
		],
		[
			'glyph-name-invalid',
			[
				{
					citationId: 'opentype-spec:post',
					anchor: '§ post table — glyph name character set',
					gist: 'Glyph names must use only allowed characters (letters, digits, underscore, period); other characters cause parser failures.',
					score: 1.0
				}
			]
		],
		[
			'glyph-name-too-long',
			[
				{
					citationId: 'opentype-spec:post',
					anchor: '§ post table — length limits',
					gist: 'Glyph names should be under 31 characters; longer names violate the PostScript identifier convention.',
					score: 0.9
				}
			]
		],

		// Family 6 — Coverage (additional)
		[
			'control-glyphs-missing',
			[
				{
					citationId: 'unicode-standard-16:basic-latin',
					anchor: '§ C0 Controls (U+0000 - U+001F)',
					gist: 'Control codepoints (CR, LF, tab) should have glyph entries (typically zero-advance or .notdef) for proper text handling.',
					score: 0.8
				}
			]
		],
		[
			'figures-non-tabular',
			[
				{
					citationId: 'opentype-spec:os2',
					anchor: '§ OS/2 — tabular figures',
					gist: 'Tabular figures (digits with equal advance widths) enable column alignment in tables; missing tabular variant limits typography in numeric contexts.',
					score: 0.8
				}
			]
		],
		[
			'glyph-count-low',
			[
				{
					citationId: 'opentype-spec:maxp',
					anchor: '§ maxp — numGlyphs',
					gist: 'A font with very few glyphs is suspicious — most production fonts cover at least Basic Latin (~95 glyphs).',
					score: 0.7
				}
			]
		],
		[
			'upm-unusual',
			[
				{
					citationId: 'opentype-spec:head',
					anchor: '§ head — unitsPerEm',
					gist: 'UPM (units per em) values outside the conventional range (256, 512, 1000, 1024, 2048) cause sub-pixel rounding issues across rasterisers.',
					score: 0.9
				}
			]
		],

		// Family 7 — Anchors (additional)
		[
			'anchors-missing',
			[
				{
					citationId: 'opentype-spec:gpos',
					anchor: '§ GPOS — mark positioning',
					gist: 'Without GPOS anchors, marks (diacritics) cannot be precisely positioned over their base; renders fall back to advance-width spacing.',
					score: 1.0
				}
			]
		],

		// 3 new variable-font audit codes (v1.6) — per
		// docs/research/variable-fonts-deep-dive.md Part 8
		[
			'axis-range-extreme',
			[
				{
					citationId: 'variablefonts-io-primer:designing',
					anchor: 'Designing with variable fonts',
					gist: 'Practitioner-side guidance on axis-range trade-offs and when extreme masters need intermediates to anchor interpolation.',
					score: 0.8
				},
				{
					citationId: 'opentype-spec:fvar',
					anchor: '§ fvar — VariationAxisRecord min/max',
					gist: 'The fvar table allows arbitrary axis ranges; designers are responsible for ensuring interpolation quality across the declared range.',
					score: 0.7
				}
			]
		],
		[
			'master-too-close',
			[
				{
					citationId: 'ufo-3-spec:designspace',
					anchor: 'Designspace — master placement',
					gist: 'Designspace v5 supports arbitrary master locations; the responsibility for non-redundant master placement is on the designer.',
					score: 0.8
				},
				{
					citationId: 'variablefonts-io-primer:implementing',
					anchor: 'Implementing variable fonts',
					gist: 'Master count and placement affect both file size (gvar deltas) and runtime interpolation cost.',
					score: 0.6
				}
			]
		],
		[
			'stat-missing',
			[
				{
					citationId: 'opentype-spec:stat',
					anchor: '§ STAT — Style Attributes Table',
					gist: 'STAT records the canonical axis-value names, default values, and italic-linkage needed for proper variable-font display in OS font-pickers. Without STAT, Windows in particular can display style names incorrectly (e.g. "Regular Bold Italic" instead of "Bold Italic").',
					score: 1.0
				},
				{
					citationId: 'variablefonts-io-primer:implementing',
					anchor: 'Implementing variable fonts',
					gist: 'STAT is a per-axis label registry that the OS uses to compose instance names; the practitioner guidance covers why it matters and what to put in it.',
					score: 0.7
				}
			]
		],
		[
			'stat-format-mismatch',
			[
				{
					citationId: 'opentype-spec:stat',
					anchor: '§ STAT — AxisValueTables',
					gist: 'STAT format 3 (linkedValue) records italic-axis values as "Italic, linked to upright Regular" — this is what enables proper "Bold Italic" composition. Format 1 for the italic axis breaks Windows style-name display.',
					score: 1.0
				}
			]
		],
		[
			'stat-instance-name-mismatch',
			[
				{
					citationId: 'opentype-spec:stat',
					anchor: '§ STAT — coordination with fvar instances',
					gist: 'OpenType 1.8.2 spec notes that STAT axis-value names should compose to the same instance name that fvar declares — divergence causes inconsistent display across apps.',
					score: 1.0
				}
			]
		]
	]);

/**
 * Look up citations for a single audit code.
 *
 * Returns up to MAX_CITATIONS_PER_CODE citations ordered by relevance
 * score (descending). Returns an empty array if the code has no
 * citation map entries.
 *
 * The actual Citation objects (with anchor, gist, verifiedAt) are
 * NOT YET LOADED from the corpus — this function returns the
 * citation IDs + scores. The next phase (corpus ingestion) populates
 * the full Citation objects. Until then, callers should pair the
 * citationId with the Source metadata from sourceById().
 */
export const lookupCitations = (auditCode: string): AuditCodeCitationMatch => {
	const entries = CITATION_MAP.get(auditCode) ?? [];

	const citations: ReadonlyArray<RankedCitation> = entries
		.slice(0, MAX_CITATIONS_PER_CODE)
		.map((entry) => ({
			citation: {
				id: entry.citationId,
				sourceId: entry.citationId.split(':')[0],
				anchor: entry.anchor,
				gist: entry.gist,
				verifiedAt: '2026-05-30'
			},
			score: entry.score
		}));

	return { auditCode, citations };
};

/**
 * Batch lookup — useful for the /audit/[code] page generator.
 */
export const lookupCitationsMany = (
	auditCodes: ReadonlyArray<string>
): ReadonlyMap<string, AuditCodeCitationMatch> => {
	const out = new Map<string, AuditCodeCitationMatch>();
	for (const code of auditCodes) {
		out.set(code, lookupCitations(code));
	}
	return out;
};

/**
 * Returns the set of audit codes that have at least one citation in
 * the current open MVP corpus. Useful for the UI to show a "Citations
 * available" badge in the audit panel.
 */
export const codesWithCitations = (): ReadonlySet<string> => {
	const out = new Set<string>();
	for (const [code, entries] of CITATION_MAP) {
		if (entries.length > 0) out.add(code);
	}
	return out;
};
