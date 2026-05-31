# Patens Citation Engine — Canonical Type-Design Library

**Research compiled:** 2026-05-30
**Scope:** RAG corpus design for Patens's audit-citation engine (94-code module → primary literature)
**Author:** research agent, sourced from foundry websites, library catalogs, archives, and W3C/Microsoft/Adobe specifications

---

## Preamble: the literature problem this corpus is solving

Type-design knowledge has historically been transmitted **orally and through apprenticeship** — punchcutter to apprentice, type director to junior designer, type-program faculty to student. Joseph Moxon's *Mechanick Exercises* (1683) is one of the earliest texts that betrays this oral undercurrent: he writes as a journalist describing a craft that practitioners themselves rarely codified. Fred Smeijers's *Counterpunch* (1996) is explicit about this: it exists *because* the lore of the punchcutter's room was nearly lost. Gerrit Noordzij similarly framed *The Stroke* as a workshop document, not an academic treatise ("This circle-game is not played in the study, but rather in the workshop").

This is the gap Patens's audit engine is designed to close: it surfaces tacit craft rules as explicit, citeable signals. For the RAG corpus to be authoritative, it must reach both into the codified literature *and* into the relatively narrow band of texts where the oral tradition was, fortuitously, written down. The strongest "oral-to-text" capture points in the canon are:

- **Tracy, *Letters of Credit* (1986)** — Tracy explicitly transcribes Harry Smith's Linotype spacing method ⚠️
- **Smeijers, *Counterpunch* (1996)** — preserves punchcutter lore via practical reconstruction ✅
- **Noordzij, *Letterletter* essays (1984–1994)** — the Hague workshop tradition in print ✅
- **Hochuli, *Detail in Typography* (1987)** — Swiss compositor craft codified ✅
- **Klim Type Foundry "Design Information" essays (2008–present)** — contemporary studio reasoning, currently open-web ✅
- **Frere-Jones Type blog (2015–present)** — contemporary studio reasoning, currently open-web ✅

Everything else is either secondary scholarship, technical specification, or historical primary source.

---

## Section 1 — The Canonical References (38 sources)

Confidence key: ✅ confirmed across ≥2 reputable sources · ⚠️ likely (single reputable source) · ❓ uncertain

### 1.1 Foundational craft & theory books

**1. *Letters of Credit: A View of Type Design* — Walter Tracy** ✅
Gordon Fraser, London / David R. Godine, Boston, **1986**.
- Why canonical: the standard English-language text on type-design fundamentals; the first to fully codify Linotype-era spacing logic.
- Topical coverage: letter anatomy, **spacing & sidebearings** (Smith-Tracy method), legibility theory, classification.
- Licensing: in-copyright, Godine 2003 reprint active. Fair-use ingestion plausible for excerpt citations.
- Digitization: Internet Archive borrowable copy, Scribd unauthorized PDF circulating.
- Audit families: **spacing+sidebearings (primary)**, contour shape, vertical metrics.

**2. *The Elements of Typographic Style* — Robert Bringhurst** ✅
Hartley & Marks, **1992** (1st ed.) → **2012** (4.0).
- Why canonical: Hermann Zapf called for it to be "the Typographers' Bible"; Hoefler/Frere-Jones call it "the finest book ever written about typography." House manual at most US university presses.
- Topical coverage: comprehensive — anatomy, classification, page composition, diacritics, micro/macrotypography, glossary of glyphs, designer/foundry annotated lists.
- Licensing: in-copyright, Hartley & Marks active publisher. Fair use only.
- Digitization: Internet Archive 3rd-ed borrow; no open text.
- Audit families: **all 9** as secondary cite; particularly strong on contour shape, naming/metadata, spacing.

**3. *Detail in Typography* — Jost Hochuli** ✅
First published in German 1987; latest English edition Éditions B42 (Paris), translated into 17 languages.
- Why canonical: coined the term *microtypography* (1987). The standard reference for what happens inside a column of text.
- Topical coverage: letterspacing, wordspacing, linespacing, optical adjustments — the **interior** of typography.
- Licensing: in-copyright, B42 active.
- Digitization: partial Scribd PDFs circulate; no open edition.
- Audit families: **spacing+sidebearings**, contour shape (legibility-driven).

**4. *Counterpunch: Making Type in the Sixteenth Century, Designing Typefaces Now* — Fred Smeijers** ✅
Hyphen Press, London, **1996** (2nd ed. 2011).
- Why canonical: the only modern text that reverse-engineers Garamond/Granjon-era punchcutting from practical reconstruction. Smeijers cut punches himself.
- Topical coverage: contour reasoning, counter logic, the physical origin of "type color."
- Licensing: in-copyright Hyphen Press; fair use only.
- Digitization: Internet Archive borrow.
- Audit families: **contour shape (primary)**, spacing (via counter), historical context for all.

**5. *The Stroke: Theory of Writing* — Gerrit Noordzij** ✅
First Dutch ed. 1985; English ed. Hyphen Press, **2005** (trans. Peter Enneson).
- Why canonical: the theoretical underpinning for "writing-based" type design used across KABK, Type@Cooper, Reading. Frames typography as "writing with prefabricated characters."
- Topical coverage: stroke construction, contrast (translation vs. expansion), counter — applicable to any script.
- Licensing: in-copyright Hyphen Press.
- Digitization: PDFs circulate (Scribd, archive); not open-licensed.
- Audit families: **contour shape (primary)**.

**6. *Letterletter* (collected) — Gerrit Noordzij** ⚠️
Hartley & Marks, **2000** (collected 1984–1994 ATypI bulletin essays).
- Why canonical: the workshop voice of Noordzij in distilled form; widely cited.
- Audit families: contour shape, multi-script reasoning.

**7. *Anatomy of a Typeface* — Alexander Lawson** ✅
David R. Godine, Boston, **1990**.
- Why canonical: chapter-per-family deep history of 30 type families; standard university classroom text on classification.
- Topical coverage: classification, history, anatomy.
- Licensing: in-copyright Godine; fair use.
- Digitization: Internet Archive borrow.
- Audit families: **naming+metadata**, classification mapping.

**8. *Designing Type* — Karen Cheng** ✅
Yale University Press, **2006** (2nd ed. 2020).
- Why canonical: the most thorough English-language treatment of glyph-by-glyph optical compensation; covers serif and sans cap/lowercase/numerals/diacritics/spacing.
- Topical coverage: optical compensation, structure, glyph anatomy, spacing.
- Licensing: in-copyright Yale; fair use.
- Digitization: PDFs circulate (Bookey, etc.); no open edition.
- Audit families: **contour shape (primary)**, **spacing**, anchors (via diacritic chapter).

**9. *Inside Paragraphs: Typographic Fundamentals* — Cyrus Highsmith** ✅
Font Bureau / Princeton Architectural Press, **2012/2020**.
- Why canonical: the modern teaching primer; required reading at RISD Type Lab.
- Topical coverage: white space, paragraph mechanics.
- Licensing: in-copyright; fair use.
- Audit families: spacing, vertical metrics (via line economy).

**10. *Stop Stealing Sheep & Find Out How Type Works* — Erik Spiekermann & E. M. Ginger** ✅
First published Adobe Press, **1993**; 4th ed. Adobe/Peachpit, 2014.
- Why canonical: the introductory text in print for three decades. **As of the 4th edition, full PDF is released under Creative Commons via Google Fonts** — making it the most ingestible high-quality introductory source.
- Licensing: **CC-licensed PDF (open)** — Patens can ingest fully. ✅
- Audit families: spacing, anatomy, naming/metadata.

**11. *An Essay on Typography* — Eric Gill** ✅
Hague & Gill, **1931** (1st ed., signed 500-copy run).
- Why canonical: the modernist counter-statement to traditional typography; set in Gill's own Joanna.
- Licensing: **Public domain in many jurisdictions** (Gill d. 1940 → PD in life+70 jurisdictions in 2011; PD in US for pre-1929 only — 1931 imprint may still be in-copyright in US until 2027). ⚠️ jurisdiction-dependent.
- Digitization: Internet Archive full text. ✅
- Audit families: contour shape (philosophical), classification context.

**12. *First Principles of Typography* — Stanley Morison** ✅
Cambridge University Press, **1936** (29 pp.).
- Why canonical: Morison's brief, oft-cited polemic; basis for much UK type tradition. Originally an article in *The Fleuron* 7 (1930).
- Licensing: in-copyright; Morison d. 1967 → PD in life+70 jurisdictions in 2038.
- Digitization: rare-book copies; not open.

**13. *Modern Typography: An Essay in Critical History* — Robin Kinross** ✅
Hyphen Press, **1992** (2nd ed. 2004).
- Why canonical: the first critical history of typography (vs. bibliophilic celebration); standard university reference.
- Audit families: historical context for naming, classification.

**14. *Adobe Type Library Reference Book* — Adobe Systems** ✅
Adobe Press, 3rd/4th eds. (latest 2007).
- Why canonical: codex of 2,200+ Adobe Originals with foundry metadata, classification, OpenType feature listings.
- Audit families: **naming+metadata (primary)**, OpenType invariants.

**15. *Type, Sign, Symbol* — Adrian Frutiger** ⚠️
ABC Verlag, Zurich, **1980**. Trilingual (EN/DE/FR).
- Why canonical: Frutiger's working-method statement; legibility research from the Univers/Frutiger periods.
- Digitization: Monoskop has a scan. ✅
- Audit families: contour shape, legibility-driven vertical metrics.

**16. *Size-specific Adjustments to Type Designs* — Tim Ahrens & Shoko Mugikura** ✅
Just Another Foundry, **2007** (Ahrens MA thesis, Reading); revised 2014.
- Why canonical: the only book-length English treatment of **optical sizing** — directly relevant to variable-font opsz axis.
- Licensing: JAF self-published; in-copyright.
- Audit families: **variable fonts (opsz)**, contour shape, vertical metrics.

### 1.2 Specifications (mostly open / freely accessible)

**17. *OpenType Specification* — Microsoft Typography (with Adobe, Apple, Google)** ✅
Currently **OpenType 1.9.1** (Microsoft Learn). Origin: Microsoft + Adobe joint announcement 1997. Ratified as **ISO/IEC 14496-22 ("Open Font Format")** March 2007.
- Licensing: **Microsoft Learn pages freely readable, royalty-free implementation rights**. ISO drafts freely downloadable. ✅
- Audit families: **OpenType invariants (primary)**, COLR/CPAL, variable fonts (fvar/HVAR/MVAR), vertical metrics (OS/2, hhea).
- Canonical URL: https://learn.microsoft.com/en-us/typography/opentype/spec/

**18. *TrueType Reference Manual* — Apple Computer** ✅
Apple Developer Documentation. Original 1991.
- Why canonical: definitive reference for TrueType instruction language (TT hinting bytecode).
- Licensing: free to read on developer.apple.com; Apple retains copyright. ✅
- Audit families: **OpenType invariants (TT hinting)**, contour shape (grid-fitting).
- URL: https://developer.apple.com/fonts/TrueType-Reference-Manual/

**19. *OS/2 and Windows Metrics Table* (OpenType spec subsection) — Microsoft** ✅
- Why canonical: the *only* normative description of winAscent/winDescent/sTypoAscender/Linux-FB/USE_TYPO_METRICS cross-platform behavior — the source of nearly every "vertical metrics drift" bug.
- Audit families: **vertical metrics (primary)**.

**20. *COLR / CPAL Tables* (OpenType spec subsections) — Microsoft** ✅
- COLR v1 (released 2020) adds gradients, transforms, compositing — the modern color-font format.
- Audit families: **color fonts (primary)**.
- URL: https://learn.microsoft.com/en-us/typography/opentype/spec/colr

**21. *Variations Tables* — fvar, gvar, HVAR, VVAR, MVAR, STAT, avar** ✅
OpenType 1.8 spec (Sept 2016) onward. Co-authored by Peter Constable (MS), Ned Holbrook (Apple), Behdad Esfahbod (Google), David Lemon (Adobe).
- Audit families: **variable fonts (primary)**.

**22. *Adobe Glyph List (AGL) Specification* + AGLFN** ✅
adobe-type-tools GitHub. Mapping 4,281 glyph names ↔ Unicode.
- Licensing: **Apache 2.0 / BSD-style on GitHub** — fully ingestible. ✅
- Audit families: **naming+metadata (primary)**, OpenType invariants (glyph-name canonicality).
- URL: https://github.com/adobe-type-tools/agl-specification

**23. *Adobe OpenType Feature File Specification (.fea)* — Adobe Type Tools** ✅
AFDKO documentation.
- Licensing: **Apache 2.0** (AFDKO repo). ✅
- Audit families: **OpenType invariants (GSUB/GPOS)**, anchors.
- URL: http://adobe-type-tools.github.io/afdko/OpenTypeFeatureFileSpecification.html

**24. *Unified Font Object (UFO) Specification* — Tal Leming, Just van Rossum, Erik van Blokland** ✅
Originated 2003; UFO 3 released 2012. Recommended source format by SIL.
- Licensing: **open specification, MIT-style**, on GitHub. ✅
- Audit families: source-format invariants (transverse), naming/metadata.
- URL: https://unifiedfontobject.org/

**25. *Unicode Standard, Core Specification* — Unicode Consortium** ✅
Current Version 16.0 (2024). ISO/IEC 10646 jointly maintained.
- Licensing: **freely downloadable PDF**, Unicode IP policy permits derivative use. ✅
- Audit families: **coverage (primary)**, anchors (combining-mark semantics), multi-script invariants.

**26. *OpenType Cookbook* — Tal Leming** ✅
opentypecookbook.com — designer-oriented introduction to GSUB/GPOS feature syntax.
- Licensing: not formally open-licensed but freely readable; source on GitHub.
- Audit families: **OpenType invariants (primary teaching cite)**.

**27. *Universal Shaping Engine (USE) documentation* — Microsoft / Andrew Glass; opentype-shaping-documents — Nathan Willis** ✅
- Why canonical: the only published account of how complex scripts (Indic + 20+ others) shape via OpenType.
- Licensing: Microsoft Learn freely readable; n8willis repo open-licensed. ✅
- Audit families: OpenType invariants (multi-script), anchors, coverage.

### 1.3 Academic + research literature

**28. "Mathematical Typography" — Donald E. Knuth** ✅
*Bulletin of the AMS*, March 1979, Vol. 1, No. 2, 337–72 (Gibbs Lecture, Jan 1978).
- Why canonical: the foundational paper of parametric / computational type design. Spawned Metafont.
- Licensing: AMS Bulletin papers from this era often **freely downloadable** via the AMS site. ✅
- Audit families: contour shape (parametric reasoning), variable fonts (intellectual ancestor).

**29. "Metafont: A System for Alphabet Design" — Donald E. Knuth** ✅
Stanford CS report, Sept 1979; published in book form Dec 1979 by Digital Press + AMS as *TEX and METAFONT*.
- Audit families: contour shape, variable fonts.

**30. *Fonts & Encodings* — Yannis Haralambous** ✅
O'Reilly, **2007** (translation by P. Scott Horne of *Fontes & codages*, 2004).
- Why canonical: the most comprehensive single-volume reference covering PostScript, TrueType, OpenType, AAT, Metafont, Unicode, multi-script shaping.
- Licensing: in-copyright O'Reilly; HAL deposit of French manuscript freely available on hal.science. ⚠️ partial open.
- Audit families: **all 9 families** as secondary cite; particularly **OpenType invariants**, **coverage**, **multi-script**.

**31. *CJKV Information Processing* — Ken Lunde** ✅
O'Reilly, 1st ed. **1999**, 2nd ed. **2009**.
- Why canonical: the standard reference for Chinese/Japanese/Korean/Vietnamese text and font processing.
- Licensing: in-copyright O'Reilly.
- Audit families: **coverage (CJKV)**, naming/metadata (Adobe-Japan1 ROS), OpenType (vert/CJK features).

**32. *Greek Letters: From Tablets to Pixels* (ed. Michael Macrakis)** ⚠️
Oak Knoll Press, **1996**. Contributions from Hermann Zapf, Matthew Carter, Nicolas Barker.
- Why canonical: the only English-language proceedings volume centering Greek type design.
- Audit families: multi-script coverage (Greek), historical naming.

**33. "A primer on Greek type design" — Gerry Leonidas** ✅
Leonidas.net (originally Reading lecture notes, 1998–2002).
- Licensing: freely available on author's site. ✅
- Audit families: multi-script coverage (Greek), contour shape.

**34. DecoType / Thomas Milo writings on Arabic** ⚠️
*Typesetting Islamic Calligraphy* (1989); decotype.com publications. Recipient of Peter Karow award.
- Audit families: multi-script coverage (Arabic), OpenType invariants (joining/USE/Arab shaping).

**35. Mamoun Sakkal's "Arabic Type" essay series** ✅
sakkal.com — open-web canonical English-language Arabic-type-design tutorial.
- Licensing: freely web-readable. ✅
- Audit families: multi-script coverage (Arabic).

### 1.4 Foundry blogs (contemporary studio reasoning)

**36. Klim Type Foundry — "Design Information" essays + blog (Kris Sowersby)** ✅
klim.co.nz/blog and per-typeface "design information" pages.
- Why canonical: the most thoroughly published contemporary type-design studio reasoning; cited by educators globally.
- Licensing: open-web readable, copyright Klim. Fair-use citation appropriate.
- Audit families: contour shape, spacing, classification, naming.

**37. Frere-Jones Type — Blog (Tobias Frere-Jones)** ✅
frerejones.com/blog. Essays on type-history, ephemera, technical reasoning.
- Audit families: contour shape, naming/historical metadata.

**38. Phinney on Fonts — Thomas Phinney** ✅
thomasphinney.com. Former Adobe Type product manager, FontLab president, ATypI board.
- Audit families: variable fonts, OpenType invariants, font-format history.

### 1.5 Honorable mentions (selected; not in the 38-core)

- **Joseph Moxon, *Mechanick Exercises on the Whole Art of Printing* (1683–84)** — public domain. The earliest practical English-language printing manual.
- **Pierre Simon Fournier, *Manuel typographique* (1764–66)** — public domain; foundational French text-and-specimen.
- **Updike, *Printing Types: Their History, Forms and Use* (1922)** — 2 vols., near-public-domain (Updike d. 1941). Cambridge/Harvard reprints.
- **Goudy, *The Alphabet and Elements of Lettering* (1922/1942)** — public domain (1922 ed.). Internet Archive.
- **John Hudson essays at tiro.com** — multi-script + OpenType.
- **Karow, *Digital Typefaces* (1994)** — Springer; the URW/IKARUS technical perspective.

---

## Section 2 — Licensing matrix per Patens audit family

Each of Patens's 9 audit families is mapped here to the 5–10 references that form the most defensible RAG-corpus subset given current licensing realities. "Open" = ingestible without permission. "Fair use" = excerptable for educational/research tool with attribution. "License" = should be negotiated for full ingestion.

### Family 1 — Contour shape
| Source | Licensing | Citation strength |
|---|---|---|
| Smeijers, *Counterpunch* | Fair use | ✅ primary |
| Noordzij, *The Stroke* | Fair use | ✅ primary |
| Cheng, *Designing Type* | Fair use | ✅ primary (glyph-by-glyph) |
| Knuth, "Mathematical Typography" 1979 | **Open (AMS)** | ✅ |
| Ahrens & Mugikura, *Size-specific Adjustments* | Fair use | ⚠️ optical sizing |
| Klim "design information" pages | Open web (fair use) | ✅ contemporary |
| Frere-Jones blog | Open web (fair use) | ✅ contemporary |
| Spiekermann, *Stop Stealing Sheep* | **CC (open)** | ✅ entry-level |

### Family 2 — Vertical metrics
| Source | Licensing | Citation strength |
|---|---|---|
| OpenType spec, OS/2 table | **Open (MS Learn)** | ✅ primary normative |
| OpenType spec, hhea table | **Open** | ✅ primary normative |
| Google Fonts metrics guide | **Open (Apache-doc'd)** | ✅ practical |
| Apple TrueType Reference Manual, hhea | **Open** | ✅ |
| Ahrens & Mugikura | Fair use | ⚠️ size-driven |
| Bringhurst, ETS | Fair use | secondary |

### Family 3 — Spacing & sidebearings
| Source | Licensing | Citation strength |
|---|---|---|
| Tracy, *Letters of Credit* | Fair use | ✅ **primary historical** |
| Hochuli, *Detail in Typography* | Fair use | ✅ primary |
| Cheng, *Designing Type* | Fair use | ✅ primary (chap. on spacing) |
| Highsmith, *Inside Paragraphs* | Fair use | ✅ teaching |
| Briem's notes (FontLab Help) | Open web | ⚠️ secondary |
| Bringhurst, ETS | Fair use | secondary |
| Spiekermann, *Sheep* | **CC** | ✅ entry-level |

### Family 4 — OpenType invariants (GSUB/GPOS/cmap)
| Source | Licensing | Citation strength |
|---|---|---|
| OpenType Specification (Microsoft) | **Open** | ✅ primary normative |
| Adobe FEA File Specification | **Apache 2.0** | ✅ primary syntax |
| OpenType Cookbook (Leming) | Open web | ✅ pedagogical |
| Haralambous, *Fonts & Encodings* | Fair use | ✅ deep |
| AFDKO documentation | **Apache 2.0** | ✅ |
| USE / opentype-shaping-documents | **Open** | ✅ |

### Family 5 — Naming & metadata
| Source | Licensing | Citation strength |
|---|---|---|
| Adobe Glyph List (AGL/AGLFN) | **Open (Apache/BSD)** | ✅ primary normative |
| OpenType `name` table spec | **Open** | ✅ primary normative |
| Adobe Type Library Reference Book | Fair use | ✅ practical exemplar |
| Lawson, *Anatomy of a Typeface* | Fair use | ✅ classification |
| Bringhurst, ETS | Fair use | secondary |

### Family 6 — Coverage (Unicode / script support)
| Source | Licensing | Citation strength |
|---|---|---|
| Unicode Standard | **Open** | ✅ primary normative |
| Lunde, *CJKV Information Processing* | Fair use | ✅ CJKV primary |
| Haralambous, *Fonts & Encodings* | Fair use | ✅ |
| Leonidas, "Primer on Greek type design" | **Open web** | ✅ Greek |
| Sakkal, "Arabic Type" series | **Open web** | ✅ Arabic |
| USE shaping docs | **Open** | ✅ Indic-extended |

### Family 7 — Anchors (mark/mkmk + diacritics)
| Source | Licensing | Citation strength |
|---|---|---|
| OpenType GPOS spec (Microsoft) | **Open** | ✅ primary normative |
| Unicode Standard, combining-marks chapter | **Open** | ✅ primary |
| Adobe FEA spec, anchor syntax | **Apache 2.0** | ✅ |
| Cheng, *Designing Type*, diacritics chapter | Fair use | ✅ |
| Bringhurst, ETS, on diacritics | Fair use | secondary |

### Family 8 — Variable fonts
| Source | Licensing | Citation strength |
|---|---|---|
| OpenType 1.8+ variations tables (fvar/gvar/HVAR/MVAR/STAT/avar) | **Open** | ✅ primary normative |
| ATypI Warsaw 2016 papers (Constable/Holbrook/Esfahbod/Lemon) | Mixed (some open) | ✅ historical |
| Knuth Metafont papers 1979 | **Open** | ⚠️ intellectual ancestor |
| Ahrens & Mugikura, *Size-specific* | Fair use | ✅ opsz |
| Phinney on Fonts (variable-fonts tag) | Open web | ✅ |

### Family 9 — Color fonts (COLR/CPAL/SVG/sbix)
| Source | Licensing | Citation strength |
|---|---|---|
| OpenType COLR v0/v1 spec | **Open** | ✅ primary normative |
| OpenType CPAL spec | **Open** | ✅ primary normative |
| OpenType SVG spec | **Open** | ✅ alternative |
| Glyphs Handbook color-font chapter | Fair use | ✅ practical |
| Phinney on Fonts | Open web | ⚠️ |

**Gap candor:** The COLR/CPAL literature **outside the spec itself is sparse** (≈2016-onward). For at least 12 months after Patens ships, the citation engine's color-font citations will lean almost exclusively on the normative OpenType chapter + Microsoft's COLR-v1 explainer. This is unavoidable: the literature simply does not yet exist in book form. ⚠️

---

## Section 3 — Citation methodology

A citation engine for tacit-craft knowledge is not the same as an academic citation engine. The rules:

### 3.1 Citation format

Adopt a **modified Bringhurst footnote style** — already canonical in foundry-text contexts. Patens should emit citations in the form:

```
Tracy, Walter. Letters of Credit: A View of Type Design.
London: Gordon Fraser, 1986. pp. 71–73.
[Smith-Tracy spacing method; H/n/o control-letter triad].
```

For specifications, use the W3C/Microsoft convention:

```
Microsoft Typography. "OS/2 — OS/2 and Windows Metrics Table."
OpenType Specification 1.9.1, § "Vertical Metrics."
https://learn.microsoft.com/en-us/typography/opentype/spec/os2
(retrieved 2026-05-30).
```

### 3.2 Edition disambiguation

Bringhurst's text has **eight printed revisions (1992 → 2012, v4.0)**. *Detail in Typography* has been **translated into 17 languages** with non-aligned paginations. *The Stroke* has Dutch (1985), German, French, and English (2005) editions with different page numbers and slightly different prefatory material.

**Rule:** Patens must store *both* an "ideal" canonical edition reference (latest/most-cited) *and* the actual edition used during ingestion, marked explicitly. Citations should always disclose ingested-edition page numbers, with a parenthetical "(also in 4th ed., pp. 71–73)" where confirmed.

### 3.3 Translation chains

*The Stroke* (Dutch → English via Peter Enneson) and *Fonts & Encodings* (French → English via P. Scott Horne) are both **translation-mediated**. Where a phrase is load-bearing, cite the translator and original-language edition.

### 3.4 Posthumous re-publications

Several canonical texts (Tracy 2003 Godine reprint; Lawson reprints; Knuth's *Computer Modern* writings re-collected) have been re-issued after death/retirement with new introductions but unchanged body text. Patens should flag the **body-text imprint** as authoritative, not the re-issue's frontmatter.

### 3.5 Foundry-blog citation

Blogs are versioned. Klim and Frere-Jones occasionally revise live. **Patens must store an archive.org-snapshot URL alongside the live URL** at ingestion time — this is the only durable citation form for living documents.

### 3.6 Specification-version citation

OpenType has gone 1.0 (1997) → 1.9.1 (current). Audit codes related to MVAR (introduced 1.8), COLR v1 (introduced ~1.9), and STAT (1.8.2) **must cite a specific spec version** because the prior version did not yet define them.

---

## Section 4 — Highest-leverage starter corpus (10 sources, 4–6 week MVP)

These ten sources together (a) cover all 9 audit families, (b) are either open-licensed or normatively required for ingestion, (c) have digital text not behind a paywall or scan-only, and (d) can be downloaded and indexed within a sprint.

| # | Source | Format | Covers families |
|---|---|---|---|
| 1 | **OpenType Specification 1.9.1** (Microsoft Learn) | HTML, open | OT invariants, vertical metrics, variable fonts, color fonts, anchors |
| 2 | **Apple TrueType Reference Manual** | HTML, open | OT invariants (TT hinting), contour shape |
| 3 | **Adobe Glyph List + AGLFN** (GitHub, Apache-style) | TSV/MD, open | Naming/metadata |
| 4 | **Adobe FEA File Specification** (AFDKO, Apache 2.0) | MD/HTML, open | OT invariants, anchors |
| 5 | **Unified Font Object 3 specification** (GitHub, open) | MD, open | Source-format invariants, naming |
| 6 | **Unicode Standard 16.0 Core Specification** (PDF, free) | PDF, open | Coverage, anchors, multi-script |
| 7 | **Spiekermann & Ginger, *Stop Stealing Sheep* 4th ed.** (CC PDF via Google Fonts) | PDF, **CC** | Spacing, anatomy, classification, vertical metrics |
| 8 | **Tal Leming, *OpenType Cookbook*** (open web) | HTML, open | OT invariants (pedagogy) |
| 9 | **Klim Type Foundry "Design Information"** pages (web + archive.org snapshots) | HTML, open-readable | Contour shape, spacing, classification — contemporary studio voice |
| 10 | **Knuth, "Mathematical Typography" + "Metafont: System for Alphabet Design," 1979** (AMS / Stanford archive) | PDF, open | Contour shape, variable-font ancestor |

**Coverage check across the 9 audit families:**
- Contour shape: #7, #9, #10 ✅
- Vertical metrics: #1, #7 ✅
- Spacing + sidebearings: #7, #9 ✅ (gap: no Tracy-grade source in MVP — accept and supplement with a Tracy excerpt under fair use as #11)
- OpenType invariants: #1, #2, #4, #8 ✅
- Naming + metadata: #3, #5, #1 ✅
- Coverage: #6, #5 ✅
- Anchors: #1, #4, #6 ✅
- Variable fonts: #1, #10 ✅
- Color fonts: #1 (COLR v1 chapter) ✅ — with the candor flag that no book-length source yet exists.

**Sprint plan (4–6 weeks):**
- Week 1: ingest #1, #2, #6 (the three normative pillars). Build the citation-token schema (source-id, anchor, edition, version, retrieval-date).
- Week 2: ingest #3, #4, #5, #8 (open-spec quartet).
- Week 3: ingest #7 (Sheep CC PDF), #10 (Knuth PDFs). Build chunker that respects spec-table boundaries.
- Week 4: ingest #9 with archive.org-snapshot capture. Stand up the matcher: audit-code → 1–3 best citations.
- Weeks 5–6: human-in-the-loop QA against 20 representative audit codes across the 9 families; tune retrieval; ship to alpha behind a feature flag.

**Out-of-scope for MVP (intentional):** Bringhurst, Tracy, Hochuli, Smeijers, Noordzij, Cheng, Lawson, Lunde, Haralambous. These all require licensing negotiation or remain fair-use excerpts only. Plan to license post-grant, after MVP demand justifies the legal spend. Until then, Patens cites them by **bibliographic reference only** (title/author/page) without ingesting body text — this is the same posture every academic paper takes.

---

## Section 5 — Honest gaps & meta-observations

1. **Variable-font literature is ~10 years old.** The intellectual ancestor (Knuth 1979) and the contemporary spec exist; the *interpretive* literature explaining variable-font design *practice* is mostly conference talks (ATypI 2016 Warsaw, 2018 Antwerp, 2019 Tokyo) and foundry blog posts. There is no canonical book yet. ⚠️

2. **COLR/CPAL literature is even sparser.** COLR v1 is from 2020; almost no peer-reviewed or book-length treatment exists. Citation engine will need to lean on Microsoft's normative spec + a small handful of Google Fonts blog posts. ❓ → flag for re-audit annually.

3. **Cyrillic and Arabic literature in English is sparse.** Substantial literature exists in Russian, Arabic, and Persian, but is poorly digitized and largely untranslated. Patens should flag multi-script citation gaps to users explicitly ("we have no primary English-language citation for this audit; see [foundry-blog X]").

4. **CJK literature in English is dominated by Lunde alone.** This is a single-source dependency. Patens should mark Lunde as authoritative-but-not-redundant in the CJK family.

5. **Oral-tradition fidelity.** As stated in the preamble, the load-bearing facts about spacing, counter logic, optical compensation, and grid-fitting were transmitted by mouth far more than by text for centuries. The best textual proxies — Tracy 1986, Smeijers 1996, Noordzij 1985, Hochuli 1987, Cheng 2006 — are *all in-copyright and require licensing*. **This is the most important business reality for Patens's citation engine roadmap:** ingesting the open spec corpus is feasible in 4–6 weeks; ingesting the craft corpus requires a publisher-relations program that will take 6–12 months.

6. **Foundry blogs are the canon now being written.** Klim, Frere-Jones, Production Type, Dinamo, Typotheque, Commercial Type, ABC Dinamo, and Pangram Pangram are all publishing studio reasoning at high frequency on the open web. A serious citation engine should treat them as *living primary sources*, not secondary.

---

## Sources

- [The Elements of Typographic Style — Wikipedia](https://en.wikipedia.org/wiki/The_Elements_of_Typographic_Style)
- [The Elements of Typographic Style — Internet Archive](https://archive.org/details/elementsoftypogr0000brin)
- [Letters of Credit — Internet Archive](https://archive.org/details/lettersofcreditv0000trac)
- [Letters of Credit — Oak Knoll](https://www.oakknoll.com/pages/books/24310/walter-tracy/letters-of-credit-a-view-of-type-design)
- [Detail in Typography — Hyphen / B42](https://www.typotheque.com/books/detail-in-typography)
- [Counterpunch — Hyphen Press](https://hyphenpress.co.uk/products/books/978-0-907259-42-8/)
- [Counterpunch — Internet Archive](https://archive.org/details/counterpunchmaki0000smei)
- [The Stroke — Hyphen Press](https://hyphenpress.co.uk/products/books/978-0-907259-30-5/)
- [Gerrit Noordzij — Wikipedia](https://en.wikipedia.org/wiki/Gerrit_Noordzij)
- [Anatomy of a Typeface — Wikipedia](https://en.wikipedia.org/wiki/Anatomy_of_a_Typeface)
- [Anatomy of a Typeface — Internet Archive](https://archive.org/details/anatomyoftypefac0000laws)
- [Designing Type — Yale University Press](https://yalebooks.yale.edu/book/9780300111507/designing-type/)
- [Inside Paragraphs — Princeton Architectural Press](https://papress.com/products/inside-paragraphs-typographic-fundamentals)
- [Stop Stealing Sheep — Internet Archive](https://archive.org/details/stopstealingshee0000spie_k4v4)
- [Stop Stealing Sheep — Adobe/Pearson PDF sample](https://ptgmedia.pearsoncmg.com/images/9780321934284/samplepages/0321934288.pdf)
- [An Essay on Typography — Internet Archive](https://archive.org/details/AnEssayOnTypographyEricGill)
- [An Essay on Typography — Wikipedia](https://en.wikipedia.org/wiki/An_Essay_on_Typography)
- [Stanley Morison, First Principles of Typography — bibliographic](https://libquotes.com/stanley-morison/works/first-principles-of-typography)
- [Modern Typography — Hyphen Press](https://hyphenpress.co.uk/products/books/978-0-907259-18-3/)
- [Adobe Type Library Reference Book — Internet Archive](https://archive.org/details/adobetypelibrary0000unse)
- [Type Sign Symbol — Monoskop PDF](https://monoskop.org/images/b/b6/Frutiger_Adrian_Type_Sign_Symbol.pdf)
- [Size-specific Adjustments — Just Another Foundry](https://justanotherfoundry.com/size-specific-adjustments-to-type-designs)
- [OpenType Specification 1.9.1 — Microsoft Learn](https://learn.microsoft.com/en-us/typography/opentype/spec/)
- [OS/2 table — OpenType spec](https://learn.microsoft.com/en-us/typography/opentype/spec/os2)
- [COLR table — OpenType spec](https://learn.microsoft.com/en-us/typography/opentype/spec/colr)
- [CPAL table — OpenType spec](https://learn.microsoft.com/en-us/typography/opentype/spec/cpal)
- [TrueType Reference Manual — Apple Developer](https://developer.apple.com/fonts/TrueType-Reference-Manual/)
- [TrueType Instruction Set — Apple Developer](https://developer.apple.com/fonts/TrueType-Reference-Manual/RM05/Chap5.html)
- [Glyph Variations Table (gvar) — Apple](https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6gvar.html)
- [Adobe Glyph List Specification — GitHub](https://github.com/adobe-type-tools/agl-specification)
- [AGL & AGLFN — GitHub](https://github.com/adobe-type-tools/agl-aglfn)
- [OpenType Feature File Specification — adobe-type-tools](http://adobe-type-tools.github.io/afdko/OpenTypeFeatureFileSpecification.html)
- [OpenType Cookbook — Tal Leming](https://opentypecookbook.com/)
- [Unified Font Object — homepage](https://unifiedfontobject.org/)
- [UFO Specification — GitHub](https://github.com/unified-font-object/ufo-spec)
- [Unicode Standard 16.0 — PDF](https://www.unicode.org/versions/Unicode16.0.0/UnicodeStandard-16.0.pdf)
- [Universal Shaping Engine — opentype-shaping-documents (n8willis)](https://github.com/n8willis/opentype-shaping-documents/blob/master/opentype-shaping-use.md)
- [Variations fonts and OpenType 1.8 — LWN](https://lwn.net/Articles/701158/)
- [Introducing OpenType Font Variations — Google Open Source Blog](https://opensource.googleblog.com/2016/09/introducing-opentype-font-variations.html)
- [Fonts & Encodings — Internet Archive](https://archive.org/details/fontsencodings0000hara)
- [Fonts & Encodings (French manuscript) — HAL](https://hal.science/hal-02112942v1/document)
- [CJKV Information Processing — Internet Archive](https://archive.org/details/cjkvinformationp00lund)
- [Donald Knuth — "Mathematical Typography" 1979 (History of Information)](https://www.historyofinformation.com/detail.php?id=3339)
- [Parametric type design — arxiv 2502.07386 (modern overview)](https://arxiv.org/abs/2502.07386)
- [Greek Letters: From Tablets to Pixels — Oak Knoll / Macrakis](https://luc.devroye.org/fonts-52653.html)
- [Gerry Leonidas — "A primer on Greek type design"](https://leonidas.net/2013/12/01/a-primer-on-greek-type-design/)
- [Mamoun Sakkal — "Arabic Type" series](https://www.sakkal.com/articles/Arabic_Type_Article/Arabic_Type4.html)
- [DecoType — homepage](https://decotype.com/)
- [Klim Type Foundry blog](https://klim.co.nz/blog/)
- [Frere-Jones Type blog](https://frerejones.com/blog)
- [Phinney on Fonts](https://www.thomasphinney.com/)
- [Google Fonts vertical metrics guide](https://googlefonts.github.io/gf-guide/metrics.html)
- [Briem's notes on type design — FontLab Help](https://help.fontlab.com/fontlab/8/tutorials/briem/5-0-spacing/briem-5-03-capitals/)
- [Frank Blokland — Letter Model](https://www.lettermodel.org/letterform_construction.html)
