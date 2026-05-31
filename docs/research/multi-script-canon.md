I have sufficient research material. Now I'll synthesize the comprehensive markdown document. Let me write it directly as the final response per the instructions.

---

# Multi-Script Canon — Literature Scaffolding for Patens's AI Assistant

> **Purpose.** Build a corpus and reading list that grounds Patens's LLM-backed assistant when a designer extending a Latin typeface adds glyphs in a non-Latin script. Without grounding, the assistant defaults to Latin-centric pattern matching and produces shapes that are technically correct but culturally tone-deaf. This document is the foundation, not the tutorial.
>
> **Confidence legend.** ✅ confirmed (multiple independent sources), ⚠️ likely (single reputable source), ❓ uncertain / needs verification before shipping.
>
> **Honest framing.** Most serious type-design literature for non-Latin scripts lives in the script's own language and rarely makes it into English-readable corpora. We mark gaps explicitly. Patens's RAG should err on the side of "I don't know, here is who would" rather than synthesise.

---

## 1. Cyrillic

### Foundational references
- ✅ **Maxim Zhukov — "The Peculiarities of Cyrillic Letterforms"** (Typography Papers No. 1, University of Reading, 1996). English. The single most-cited English text on Cyrillic anatomy and the relationship of Russian Civil Type to its Latin contemporaries. Public via Reading library; not OA.
- ✅ **Vladimir Yefimov — "Civil Type and Kis Cyrillic"** and **"On the appearance and development of Cyrillic letterforms"** (Type Journal, Paratype). English translations published. Open web: [typejournal.ru/en/articles/Civil-Type](https://typejournal.ru/en/articles/Civil-Type), [typejournal.ru/en/articles/Cyrillic-Letterforms-Development](https://typejournal.ru/en/articles/Cyrillic-Letterforms-Development).
- ✅ **Vladimir Favorsky — *On Type & Lettering*** (Russian, multiple editions). Untranslated; key source for the Soviet-era theory of letter construction. ⚠️ Partial English coverage via Fonts In Use.
- ✅ **John D. Berry (ed.) — *Language Culture Type: International Type Design in the Age of Unicode*** (ATypI / Graphis, 2002). English. Contains Yefimov's essay on Civil Script. ISBN 1-932026-01-0; Internet Archive has a scan.
- ✅ **Type Journal (typejournal.ru)** — Paratype's bilingual editorial archive; the single best free English corpus on Cyrillic.
- ⚠️ **Alexandra Korolkova — *Living Typography (Живая типографика)*** (2007). Russian only; widely used as the introductory text in Russian design schools.
- ⚠️ **Gerry Leonidas / Reading MA theses** on Cyrillic revivals. Open via Reading's repository.
- ⚠️ **Irina Smirnova — Greta Sans Cyrillic process notes** on Typotheque.

### Native-tradition designers worth grounding LLMs in
- **Vladimir Yefimov** (1949–2012) — Paratype co-founder; defined the modern Cyrillic revival aesthetic.
- **Maxim Zhukov** — Bridge figure between Soviet typography and Unicode-era multi-script work; consulted on countless Latin-to-Cyrillic extensions.
- **Alexandra Korolkova** — Paratype; PT Sans/Serif (the closest thing to a free pan-Russian default).
- **Ilya Ruderman & Yury Ostromentsky** — CSTM Fonts / type.today; contemporary Cyrillic display and editorial work.
- **Irina Smirnova** — Cyrillic Greta Sans, Cyrillic Lava; KABK-trained.
- **Krista Radoeva** — Bulgarian Cyrillic localisation specialist (TypeTogether). Important counterweight to Russian-default Cyrillic.
- **Gayaneh Bagdasaryan** — Brownfox; Formular Cyrillic.
- **Tagir Safayev** — Paratype; type historian.

### Common pitfalls when adapting Latin designs
- **К vs K.** Latin K has a single vertex; Russian К historically has *two* short diagonals meeting the stem at separate points. Geometric Latin K shapes imported wholesale read as foreign.
- **Я** is not a mirrored R. The leg articulation differs; the bowl-to-leg junction is closer to a Cyrillic-native logic than to Latin R's.
- **Ж, Ф, Д, Ц, Щ, Ъ, Ы, Ь, Э, Ю** have no Latin shape to inherit from at all. These are the *bespoke* glyphs; AI must not invent.
- **Italic ≠ slanted upright.** Cyrillic italic uses cursive forms derived from skoropis (т → m-like shape, д → g-like shape, и → u-like shape). Mechanically slanting upright Cyrillic produces a shape Russian readers recognise as "incompetent foreigner."
- **Bulgarian vs Russian Cyrillic** is a real regional split; Bulgarian forms are closer to handwriting and lean more humanist. A serious Cyrillic must declare which tradition it sits in.
- **Vertical proportions.** Cyrillic uppercase tends to feel more uniform-width than Latin caps; importing wide W / narrow I rhythms can make Cyrillic feel "spotty."

### Inheritance scoring (Latin style → Cyrillic)
- **Humanist sans (Frutiger, Myriad lineage):** ✅ inherits cleanly. Successful precedent: PT Sans, Brill, Greta Sans Cyrillic.
- **Transitional / Scotch / Modern serif:** ✅ historically the best fit (Civil Type was modeled on Dutch Baroque). Precedent: Kis Cyrillic.
- **Geometric sans (Futura lineage):** ⚠️ historically dissonant — the geometric К and Ж look mechanical. Precedent of "bad fit": early Futura Cyrillic.
- **Slab serif:** ⚠️ workable but requires bespoke Ж, Ф, Д solutions.
- **Display / decorative:** Treat each glyph as bespoke; do not extrapolate.

### LLM prompt grounding seed
> "Cyrillic is not Latin-with-extra-letters. It has its own modular logic, its own italic tradition (skoropis-derived, structurally different from upright), and bespoke shapes (Ж, Ф, Д, Я, Ы, Ъ, Ь, Э, Ю, Ц, Щ) that cannot be derived from Latin. When proposing Cyrillic extensions, prefer the framing of Vladimir Yefimov, Maxim Zhukov, and Alexandra Korolkova: Cyrillic shapes inherit best from transitional and humanist Latin, awkwardly from geometric Latin, and require explicit regional intent (Russian vs Bulgarian). Flag any italic suggestion that is merely a mechanical slant."

---

## 2. Greek

### Foundational references
- ✅ **Gerry Leonidas — "A Primer on Greek Type Design"** (1998–2002, expanded). Free PDF: [leonidas.net/wp-content/uploads/2013/12/LCT_greektypedesign.pdf](https://leonidas.net/wp-content/uploads/2013/12/LCT_greektypedesign.pdf). The single most accessible English reference.
- ✅ **Gerry Leonidas — "Typography and the Greek language: designing typefaces in a cultural context"** (ATypI Reading 1997).
- ✅ **John D. Berry (ed.) — *Language Culture Type*** (2002). Contains Greek-specific essays.
- ⚠️ **Klimis Mastoridis — *Casting the Greek Newspaper*** (Thessaloniki, 2006). Greek + English passages.
- ⚠️ **Takis Katsoulidis** — Greek calligraphic and type writings (Greek only).
- ✅ **Irene Vlachou — "Greek Type Anatomy"** (TypeTogether). Free web reference: [type-together.com/greek-type-anatomy](https://www.type-together.com/greek-type-anatomy).
- ⚠️ **"Contemporary Greek typeface design: A study on Greek designers' perspectives"** (AccScience journal, 2024). OA academic paper.
- ⚠️ **Matthew Carter's Greek work** (Wilson revival, Helvetica Greek) — documented in Carter interviews, not in monograph form.

### Native-tradition designers worth grounding LLMs in
- **Gerry Leonidas** — University of Reading; the single most influential English-language voice on Greek type pedagogy.
- **Irene Vlachou** — Greek anatomy reference work; consults on most major multi-script Greek extensions.
- **Takis Katsoulidis** — Greek lettering tradition.
- **George Triantafyllakos** — atypical / Backpacker; contemporary Greek display.
- **Panos Vassiliou** — Parachute; broad Greek+Latin families.
- **Klimis Mastoridis** — Newspaper-Greek scholarship.

### Common pitfalls when adapting Latin designs
- **Greek lowercase is structurally not Latin lowercase.** Vlachou: Greek lowercase is "a series of connected open loops"; Latin lowercase is "parallel strokes with closed overlapping connections." Importing Latin a, e, o into Greek α, ε, ο produces flat-out wrong shapes.
- **α is not Latin a.** The Latin two-storey a has no Greek equivalent. Single-storey is the Greek form; double-storey reads as Latin-influenced and is contested.
- **Bicameral status is recent.** Greek lowercase only emerged in the Byzantine 9th century from cursive uppercase. The two cases were never designed as a system — type designers must reconcile them deliberately.
- **Helvetica Greek as a cautionary tale.** Matthew Carter was asked in the early 1970s to make Greek "look like the Latin." Leonidas explicitly frames this as a political/cultural artifact, not a model.
- **Polytonic accents** (used for ancient Greek and pre-1982 modern Greek) require vertical metric headroom Latin doesn't.
- **The "Latin-ised Greek" trap** — designers reach for Greek shapes that resemble Latin (γ → y, ν → v, ρ → p). This reads as foreign to Greek readers.

### Inheritance scoring (Latin style → Greek)
- **Humanist sans:** ✅ inherits well *if* the designer respects the open-loop logic. Precedent: Greta Sans Greek.
- **Old-style serif (Garamond, Bembo):** ✅ historical precedent in Aldine Greek.
- **Modern / Didone:** ⚠️ requires careful contrast direction (Greek contrast logic differs).
- **Geometric sans:** ❓ contested. Mechanical geometry collapses the open-loop reading.
- **Helvetica/Grotesque imported wholesale:** ⚠️ historically problematic — frequently produces the "Latinised Greek" effect Leonidas critiques.

### LLM prompt grounding seed
> "Greek is bicameral by accident of history, not by design. Lowercase Greek is an open-loop, cursive-derived system that does not inherit from Latin lowercase logic. Single-storey α, open ε, and ρ-descending-below-baseline are not negotiable Greek-native features. Frame suggestions through Gerry Leonidas's primer and Irene Vlachou's anatomy. Never propose 'just slant' for italic; never propose Latin a-shape for α. Flag any Greek suggestion that visually echoes Helvetica Greek of the early 1970s — that lineage is a cautionary tale, not a model."

---

## 3. Arabic

### Foundational references
- ✅ **Huda Smitshuijzen AbiFarès — *Arabic Typography: A Comprehensive Sourcebook*** (Saqi, 2001; revised concise edition 2017). English. The canonical English-language reference.
- ✅ **Huda Smitshuijzen AbiFarès (ed.) — *Arabic Type Design for Beginners: An Illustrated Guidebook*** (Khatt Books / Tashkeel, 2013). Authors include Apelian, Assouad-Khoury, Al-Yousef, Khoury-Nammour, Sarkis, Shawkat, Zoghbi. English.
- ✅ **Khatt Foundation (khtt.net)** — Amsterdam-based research center; the institutional anchor for serious English-language Arabic type discourse.
- ✅ **Pascal Zoghbi — 29Letters / 29LT Blog**: [blog.29lt.com](https://blog.29lt.com). Free.
- ✅ **Azza Alameddine — "Arabic Type Anatomy"** (TypeTogether). Free.
- ✅ **Typographic Matchmaking series** (Khatt Foundation). Documents Latin/Arabic harmonisation projects.
- ⚠️ **Kristyan Sarkis — Greta Arabic process documentation** (TPTQ Arabic).
- ⚠️ **Mamoun Sakkal — academic dissertation on square Kufic**.
- ❓ **Naseh ar-Rasm / classical Arabic calligraphic treatises** — Arabic only, untranslated.

### Native-tradition designers worth grounding LLMs in
- **Huda Smitshuijzen AbiFarès** — Khatt Foundation; the institutional voice.
- **Pascal Zoghbi** — 29LT; influential contemporary Arabic type publisher.
- **Kristyan Sarkis** — TPTQ Arabic; Greta Arabic, Lava Arabic.
- **Khajag Apelian** — Cross-script (Arabic / Armenian / Latin); Arek.
- **Nadine Chahine** — Monotype; Arabic Helvetica, Frutiger Arabic, Neue Frutiger Arabic.
- **Wissam Shawkat** — Calligraphic foundation; Hammer typeface.
- **Mamoun Sakkal** — Kufic and contemporary Arabic.
- **Lara Captan** — Independent; Beirut-based.
- **Bahman Eslami** — Persian/Arabic contemporary.

### Common pitfalls when adapting Latin designs
- **There is no x-height in Arabic.** Latin's five-level metric (baseline, x-height, ascender, descender, cap-height) is wrong from the start. Arabic Naskh can use up to twelve invisible vertical levels; Kufic may use four or five. AbiFarès / Alameddine propose tooth-height and eye-height as Arabic-native concepts.
- **No capitals.** Don't propose them. Don't bicameralise Arabic.
- **Connection logic.** Arabic is cursive by default — letters have isolated, initial, medial, final forms. A Latin sans-serif-inspired Arabic that ignores joining behaviour is broken.
- **Proportion system.** Classical Naskh is governed by the *rhombic dot*: the diagonal dot drawn by the same nib that drew the letters. Curves, ascenders, descenders are all dot-multiples. Latin's modular grid does not map.
- **Right-to-left.** Affects everything: tracking, kerning, OpenType, even punctuation orientation.
- **Latin x-height-matched Arabic is a known anti-pattern.** Arabic forced into the Latin x-height looks crushed; Arabic given proper vertical room makes the Latin look anemic. Both directions of compromise are documented in Khatt's Typographic Matchmaking research.
- **Style mismatch.** Geometric Latin → Kufic Arabic generally works. Humanist Latin → Naskh Arabic generally works. Crossing the wires (geometric Latin → Naskh Arabic) is the most common failure mode.

### Inheritance scoring (Latin style → Arabic)
- **Geometric sans → Kufic:** ✅ Strongest match. Precedent: Greta Arabic (Sarkis).
- **Humanist sans / old-style → Naskh:** ✅ Precedent: Frutiger Arabic (Chahine).
- **Modern / Didone → Naskh:** ⚠️ Possible but rare; contrast logic differs.
- **Slab serif → anything Arabic:** ❓ Limited precedent; usually display-only.
- **Helvetica Arabic:** ⚠️ Famous but contested — read as forced.

### LLM prompt grounding seed
> "Arabic is cursive, right-to-left, and proportion-governed by the rhombic dot, not by an x-height grid. There are no capitals. Letters have isolated / initial / medial / final forms — any suggestion must respect joining. Frame suggestions through Huda Smitshuijzen AbiFarès, Pascal Zoghbi, Kristyan Sarkis, and Nadine Chahine. Match humanist Latin to Naskh and geometric Latin to Kufic; flag the inverse pairings. Never propose Latin x-height matching as a goal — propose Arabic-native proportional anchors (tooth-height, eye-height, dot count). If the user requests italics, capitals, or small caps, explain that these categories don't exist in Arabic and offer Arabic-native style differentiation instead (Kufic vs Naskh, contrast levels, weight)."

---

## 4. Hebrew

### Foundational references
- ✅ **Ismar David — *The Hebrew Letter*** (Jason Aronson, 1990). English. The most-cited reference; combines history, exemplars, and learning cards.
- ✅ **Shani Avni — "Ismar David's Quest for Original Hebrew Typographic Signs"** (Visible Language journal). Open: [journals.uc.edu/index.php/vl/article/view/4623](https://journals.uc.edu/index.php/vl/article/view/4623).
- ✅ **Shani Avni — "Hebrew Type Anatomy"** (TypeTogether). Free reference.
- ✅ **Michal Sahar — "Secondary Style in Hebrew Typography"** (Typotheque). Free.
- ✅ **Peter Biľak — "Designing Hebrew Type"** (Typotheque, ILT). Free.
- ✅ **Meir Sadan — "An Introduction to Hebrew Type"** (Medium). Free.
- ⚠️ **Ivritype Annotated Bibliography** ([ivritype.com/hebrew/biblio](https://www.ivritype.com/hebrew/biblio/)). Comprehensive English bibliography.
- ⚠️ **"Typography and the Evolution of Hebrew Alphabetic Script: Writing Method of the Sofer"** (academia.edu / Xavier digital commons). OA paper.
- ❓ Hebrew-language design literature (largely untranslated).

### Native-tradition designers worth grounding LLMs in
- **Ismar David** (1910–1996) — David Hebrew (1954) is the first comprehensive Hebrew family with true italic and monolinear styles.
- **Henri Friedlaender** — Hadassah; foundational mid-century Hebrew.
- **Shani Avni** — Contemporary type historian and designer; Reading-trained.
- **Yanek Iontef** — Independent; broad Hebrew library.
- **Michal Sahar** — Contemporary Hebrew style theorist.
- **Oded Ezer** — Display and experimental Hebrew.
- **Meir Sadan** — Pedagogical Hebrew type writer.
- **Liron Lavi Turkenich** — Aravrit (Hebrew/Arabic hybrid).

### Common pitfalls when adapting Latin designs
- **Stroke direction is paradoxical.** Hebrew reads right-to-left but each letter is constructed left-to-right and top-to-bottom. Stroke contrast direction follows the calligraphic pen — heavy horizontals, thin verticals (the opposite of most Latin). Latin contrast logic imported wholesale produces "upside-down" Hebrew.
- **No bicameral case.** Don't propose uppercase Hebrew. Hebrew secondary styles (Michal Sahar's framework) are different — variation by stress, weight, or width, not by case.
- **No italics.** Hebrew has no italic tradition. Slanted Hebrew reads as either Latin-imposed or sci-fi display.
- **Final forms.** Five letters (כ ך, מ ם, נ ן, פ ף, צ ץ) have distinct word-final shapes. AI must handle these correctly.
- **Niqqud (vowel pointing).** Hebrew text can include sub- and supra-linear diacritics; metric headroom is needed. Most modern text is unpointed; biblical / liturgical / children's books are pointed.
- **Square Hebrew vs Rashi vs Cursive.** Three traditions. Designers must declare which.
- **Serifs are foreign.** Sarkis on Greta Hebrew: serif terminations in Hebrew were "dozens of solutions, none seemed to work" — Hebrew's pen logic resists Latin serif construction.

### Inheritance scoring (Latin style → Hebrew)
- **Humanist sans → square Hebrew:** ✅ Reliable. Precedent: Greta Sans Hebrew, David Hebrew Sans.
- **Old-style serif → square Hebrew:** ⚠️ Works only if contrast direction is reversed appropriately. Precedent: David Hebrew.
- **Modern / Didone:** ⚠️ Contrast direction conflict.
- **Geometric sans:** ⚠️ Workable for display; flat for text.
- **Slab serif:** ❓ Sparse precedent.

### LLM prompt grounding seed
> "Hebrew is right-to-left, unicameral, with no italic tradition. Contrast direction is the *opposite* of Latin — heavy horizontals, thin verticals — because the pen logic is different. Five letters have distinct final forms. Diacritics (niqqud) exist but are usually omitted. Frame suggestions through Ismar David, Shani Avni, Henri Friedlaender, and Michal Sahar. Never propose uppercase, never propose mechanical italics. Propose Hebrew-native differentiation: square / Rashi / cursive traditions, weight, width, or stress variation as Michal Sahar describes. Serif terminations require special care — flag any Latin serif imported without redesign."

---

## 5. Devanagari

### Foundational references
- ✅ **Mukund Gokhale — anatomy framework** (urdhvarekha, shirorekha, skandharekha, nabhirekha, zanurekha, padrekha, talrekha). Best documented in PrintWeek India obituary and Aksharaya talks.
- ✅ **Pooja Saxena — "Devanagari Type Anatomy"** (TypeTogether). Free: [type-together.com/devanagari-type-anatomy](https://www.type-together.com/devanagari-type-anatomy).
- ✅ **"Devanagari Typography 101: A guide for typesetting with Latin"** (Alphabettes). Free, OA.
- ✅ **Vaibhav Singh — Reading PhD work and Eczar process** (Rosetta Type, errorsinc/Eczar on GitHub).
- ✅ **Mota Italic — Devanagari Documentation** ([motaitalic.github.io/devanagari-documentation](https://motaitalic.github.io/devanagari-documentation/)). Free.
- ✅ **Microsoft "Developing OpenType Fonts for Devanagari Script"** + **n8willis opentype-shaping-documents**.
- ⚠️ **Aasawari Kulkarni — "Thoughts on Westernization of Devanagari Typography"** (Substack). Free.
- ⚠️ **Purvi Kothari — "Designing a Devanagari typeface for Sanskrit"** (Typoday 2023). Free PDF.
- ❓ Most Marathi / Hindi / Sanskrit type theory remains untranslated.

### Native-tradition designers worth grounding LLMs in
- **Mukund Gokhale** (1952–2024) — Devanagari anatomy formaliser; Yogesh, Nataraj, Shrerdhar.
- **Vaibhav Singh** — Reading-affiliated; Eczar; rigorous historical research practice.
- **Pooja Saxena** — Matra Type; Indic anatomy and street-lettering documentation.
- **Hitesh Malaviya** — Greta Sans Devanagari.
- **Satya Rajpurohit** — Indian Type Foundry co-founder; brought ITF Devanagari to industrial production.
- **Peter Biľak (collaborator)** — Pan-Indic Typotheque releases.
- **Namrata Goyal, Sarang Kulkarni (Ek Type)** — Contemporary Indic foundry.
- **Girish Dalvi** — IDC Bombay; academic Devanagari research.

### Common pitfalls when adapting Latin designs
- **There is no baseline.** Devanagari hangs from the *shirorekha* (headline). Latin's baseline doesn't apply; x-height is not the organising metric.
- **Seven horizontal reference lines** (Gokhale): urdhvarekha (top), shirorekha (head), skandharekha (shoulder), nabhirekha (navel), zanurekha (thigh), padrekha (foot), talrekha (bottom).
- **No capitals, no italics, no case.** Unicameral.
- **Matras** (vowel marks) attach above, below, before, and after the consonant — and may not be physically attached. Vertical metric expectations far exceed Latin's ascender/descender system.
- **Conjuncts** can stack vertically or join horizontally. A typical Devanagari font has 800+ glyphs because of conjunct combinatorics.
- **Kerning is structurally different.** Adding tracking can break the shirorekha visually. Standard Latin kerning logic doesn't apply; OpenType `dist` is preferred over `kern` because it can't be disabled.
- **Mechanically slanted Devanagari is a known anti-pattern.** Mota / Alphabettes both call this out.
- **The "Westernisation" critique** (Aasawari Kulkarni) — Devanagari forced into Latin proportions loses its native rhythm.

### Inheritance scoring (Latin style → Devanagari)
- **Humanist serif → traditional Devanagari:** ✅ Strongest match. Precedent: Eczar (Singh).
- **Humanist sans → modulated Devanagari:** ✅ Precedent: Greta Sans Devanagari (Malaviya).
- **Geometric sans → modular Devanagari:** ⚠️ Limited precedent; risks breaking the shirorekha rhythm.
- **Modern / Didone → high-contrast Devanagari:** ⚠️ Contrast direction differs.
- **Slab serif:** ❓ Almost no precedent.

### LLM prompt grounding seed
> "Devanagari hangs from a shirorekha (headline), not a baseline. There are no capitals, no italics, and seven horizontal reference lines (Gokhale's anatomy: urdhvarekha through talrekha). Matras and conjuncts make the glyph inventory 800+. Frame suggestions through Mukund Gokhale, Vaibhav Singh, Pooja Saxena, and Hitesh Malaviya. Never propose mechanical italic slants. Flag any kerning/tracking suggestion that risks breaking the shirorekha. Match humanist Latin styles to Devanagari; treat geometric Latin Devanagari extensions as experimental, not default. When unsure, defer to the user — Devanagari combinatorics exceed what generic LLMs reliably hold in context."

---

## 6. CJK (Chinese / Japanese / Korean)

> **Honest framing.** CJK is three writing systems sharing visual heritage but differing fundamentally in glyph count, modular logic, and reading conventions. Patens cannot ship a credible CJK story without partner foundries. Treat this section as the *minimum* RAG corpus to avoid confidently wrong suggestions.

### Foundational references
- ✅ **Adobe — Source Han Sans / Serif documentation** (Typekit Blog; open-source on GitHub). The most comprehensive open Pan-CJK process documentation.
- ✅ **Ken Lunde — *CJKV Information Processing*** (O'Reilly, 2nd ed. 2009). The technical bible for CJK encoding, glyph variation, and font engineering. English.
- ✅ **Typotheque — Eric Q. Liu, "Understanding CJK regional character variants"** and **"Typesetting principles of CJK text"**. Free.
- ✅ **Letterform Archive — "From the Collection: Ahn Sang Soo and AG Typography Institute"** (Korean foundational reference).
- ✅ **Ahn Graphics — *Textbook of Hangeul Design***. Korean + English editions.
- ✅ **Morisawa publications** (Japan). Some English via Monotype.
- ⚠️ **Julius Hui — Ku Mincho project** and Rest of World profile (Chinese decolonisation discourse).
- ⚠️ **Idea Magazine (Japan, Wordshape archive)** — most influential serious Japanese type writing; mostly Japanese.
- ⚠️ **Lisa Huang — "About Chinese Type Design" series** (lisahuang.work). Free, English.
- ❓ Mainland Chinese type design literature is overwhelmingly Chinese-only.

### Native-tradition designers worth grounding LLMs in

**Chinese (zh-Hans, zh-Hant):**
- **Julius Hui** — Hong Kong; New York Times Chinese logo; Ku Mincho.
- **Jiasheng Zhang** — Shanghai Printing Technology and Research Institute (foundational PRC era).
- **Changzhou SinoType** — Source Han partner.
- **Lisa Huang** — Contemporary Chinese type design writer.

**Japanese:**
- **Akira Kobayashi** — Linotype/Monotype type director; bridge figure between Japanese kana and Latin design.
- **Masahiko Kozuka** — Kozuka Mincho/Gothic.
- **Ryoko Nishizuka** — Adobe; lead designer Source Han Sans; Kazuraki.
- **Toshi Omagari** — Independent; Reading-trained.
- **Jiyu-kobo** — Major Japanese foundry.

**Korean:**
- **Ahn Sang-soo** — Hangul modernism pioneer.
- **Sandoll Communications** — Largest Korean foundry; Source Han Korean partner.
- **Minjoo Ham** — Hangul / Latin hybrid practice; Hahmlet, Geojang.
- **Yoon Mingoo** — Hangul + Dinamo Favorit Hangul collaboration.

### Common pitfalls when adapting Latin designs
- **Glyph inventory is the problem.** Japanese needs 7,000–10,000 glyphs minimum (kanji + hiragana + katakana + Latin). Chinese needs 6,000–13,000+ depending on simplified/traditional. Korean Hangul is *combinatorially* 11,172 syllables but *structurally* 19 initial + 21 medial + 27 final jamo. An AI proposing "let me sketch a CJK glyph" is wrong by orders of magnitude.
- **Em-square logic.** CJK is designed inside an em square; vertical and horizontal metrics are different from Latin. Mixing Latin into CJK requires careful baseline-to-em-square reconciliation.
- **Bidirectionality.** CJK can set horizontally (LTR) or vertically (top-to-bottom, right-to-left columns). Punctuation rotates.
- **Regional variants (SC / TC / TW / HK / JP / KR).** Same Unicode codepoint, different culturally-correct shapes. Source Han ships separate language fonts for this reason.
- **Hangul is modular, not Latin-like.** Each syllable block is a composition of 2–4 jamo. Designing Hangul "letter-by-letter" the way Latin is designed produces visually wrong blocks.
- **Kana is the design degree of freedom.** Most Japanese type identity lives in hiragana and katakana proportions and stroke endings — kanji is largely shared with Chinese and changes less per typeface.
- **Stroke order matters visually.** Kanji/Hanzi proportions follow scribal stroke order even in sans-serif designs.

### Inheritance scoring (Latin style → CJK)
- **Humanist sans → Source-Han-style Sans CJK:** ✅ Precedent: Source Han Sans is itself this pattern.
- **Old-style serif → Mincho/Ming/Myeongjo:** ✅ Precedent: Source Han Serif.
- **Geometric sans → Gothic CJK:** ⚠️ Workable for display; flattens kana personality at text sizes.
- **Modern / Didone:** ❓ Almost no precedent.
- **Slab serif:** ❓ No CJK tradition maps to this.

### LLM prompt grounding seed
> "CJK is three writing systems with shared visual heritage. Total glyph inventory is in the thousands to tens of thousands. Patens cannot generate CJK glyphs from a Latin design; only mechanical metric mapping (cap-height, em-square, baseline reconciliation, Latin substitution inside CJK fonts) is reliable. Frame suggestions through Ken Lunde for encoding, Ryoko Nishizuka and Adobe Source Han for Pan-CJK design process, Ahn Sang-soo and Sandoll for Hangul, Julius Hui for Chinese decolonisation discourse. When user requests CJK extension, recommend partnership with a regional foundry (Sandoll, SinoType, Iwata, Jiyu-kobo, Ahn Graphics) rather than AI generation. Match humanist Latin to Mincho/Myeongjo, geometric Latin to Gothic/Heiti. Flag any 'just draw the kanji' suggestion as out of scope."

---

## 7. Thai

### Foundational references
- ✅ **Cadson Demak — foundry essays and Granshan profile**: [granshan.com/insights/very-well-selected-cadson-demak](https://granshan.com/insights/very-well-selected-cadson-demak-and-the-modern-thai-typeface).
- ✅ **Monotype Creative Characters podcast, S6 E1 — Cadson Demak**.
- ⚠️ **Anuthin Wongsunkakon — Pratt MFA work and AGI bio**.
- ⚠️ **Granshan Thai script group documentation**.
- ❓ Most Thai-language type design literature is untranslated.

### Native-tradition designers worth grounding LLMs in
- **Anuthin Wongsunkakon** — Cadson Demak co-founder; Pratt-trained; AGI member.
- **Pongthorn Hiranpruek, Burin Hemthat** — Cadson Demak co-founders.
- **Cadson Demak collective** — AIS custom typeface was Thailand's first major branded custom Thai type.

### Common pitfalls when adapting Latin designs
- **Loop vs loopless.** Traditional Thai uses prominent head-loops; modern (post-1990s) Thai often goes loopless for screen legibility. Cadson Demak's AIS commission was an early loopless landmark. Latin-influenced loopless reads as modern; in editorial contexts, loop-shedding reads as foreign.
- **Four vertical levels.** Thai has consonant-line, ascender-line for vowels and tone marks, plus deep descender space. Tone marks stack on top of vowel marks on top of consonants — three-deep stacking is normal.
- **No word spaces.** Thai is written without spaces between words; spacing logic differs from Latin entirely.
- **No capitals, no italics.**
- **Tone marks are semantically critical** — a font that cramps tone-mark spacing literally changes the meaning of words.

### Inheritance scoring (Latin style → Thai)
- **Geometric / modernist sans → loopless Thai:** ✅ Precedent: Cadson Demak AIS-era work.
- **Humanist sans → looped Thai:** ✅ Traditional pairing.
- **Serif (old-style or transitional) → looped Thai with calligraphic terminations:** ⚠️ Sparse precedent.
- **Display / decorative:** Treat each glyph as bespoke.

### LLM prompt grounding seed
> "Thai is a vertically-stacked, no-word-space, unicameral script with critical tone marks. The major modern stylistic axis is looped (traditional) vs loopless (modernist). Frame suggestions through Anuthin Wongsunkakon and Cadson Demak; flag any geometric Latin extension to looped Thai as stylistically dissonant. Never compress tone-mark vertical space — semantics depend on it."

---

## 8. Armenian

### Foundational references
- ✅ **Edik Ghabuzyan — *Armenian Fonts Album*** (2004). Armenian + English.
- ✅ **type.today — "By hook or by crook: What's happening in Armenian type?"**: [type.today/en/journal/am](https://type.today/en/journal/am).
- ✅ **Granshan — Armenian script group + Edik Ghabuzyan Lifetime Achievement Award** documentation.
- ✅ **Khajag Apelian profiles** (29LT, type.today).
- ⚠️ **armeniantypography.com Resources page**.

### Native-tradition designers worth grounding LLMs in
- **Edik Ghabuzyan** — GHEA Fonts; elder of Armenian type design; National Book Chamber of Armenia.
- **Khajag Apelian** — Granshan 2010 Grand Prize for Arek (Armenian); cross-script Arabic/Armenian/Latin practice.
- **Ruben Tarumian** — Cambria Armenian; cross-foundry collaborations.
- **Araz Bogharian, Arman Harutyunyan** — Contemporary Yerevan-based designers documented in type.today.

### Common pitfalls when adapting Latin designs
- **39 letters, bicameral.** Armenian is bicameral but uppercase and lowercase relate differently than Latin's case relationship — many lowercase Armenian letters have descenders and ascenders Latin doesn't anticipate.
- **Vertical proportions exceed Latin.** Armenian lowercase has more ascenders and descenders per running line than Latin; vertical metric headroom must increase.
- **Mesrop Mashtots's 5th-century logic.** Armenian was deliberately designed (not evolved) and has internal modular relationships that fight Latin-imposed proportions.
- **No native italic tradition** — slanted Armenian is Latin-imposed.
- **Limited contemporary corpus** — many Armenian extensions ship as Latin caps-derivative shapes, which Ghabuzyan has critiqued.

### Inheritance scoring (Latin style → Armenian)
- **Humanist serif:** ✅ Strongest historical match.
- **Humanist sans:** ✅ Precedent: Greta Sans Armenian, Graphik Armenian (Tarumian).
- **Geometric sans:** ⚠️ Possible but flattens Armenian's modular variety.
- **Modern / Didone:** ❓ Sparse precedent.

### LLM prompt grounding seed
> "Armenian is a 5th-century deliberately-designed bicameral script with 39 letters and more ascenders/descenders per line than Latin. Frame suggestions through Edik Ghabuzyan, Khajag Apelian, and Ruben Tarumian. Match humanist Latin styles; flag geometric Latin Armenian extensions as a known flattening pattern. Increase vertical metrics relative to the Latin parent."

---

## 9. Georgian

### Foundational references
- ✅ **type.today — "Georgian typography is now catching up"**: [type.today/en/journal/ge](https://type.today/en/journal/ge).
- ✅ **ScriptSource — Georgian (Mkhedruli and Mtavruli)**: [scriptsource.org/cms/scripts/page.php?item_id=script_detail_font&key=Geor](https://scriptsource.org/cms/scripts/page.php?item_id=script_detail_font&key=Geor).
- ✅ **Alphabettes — "Designing a Georgian Header"**.
- ⚠️ **BPG Fonts (Besarion Gugushvili) — GPL Linux fontset**.
- ⚠️ **Google Arts & Culture — "The Beautiful Fonts and Scripts of Georgia"**.

### Native-tradition designers worth grounding LLMs in
- **Akaki Razmadze** — Georgian for Helvetica, FF Meta, FF Sabon. The bridge figure for Georgian/Latin extensions.
- **Besarion Gugushvili (BPG)** — Free-software Georgian fontset pioneer.
- Contemporary Tbilisi-based designers documented in type.today.

### Common pitfalls when adapting Latin designs
- **Three historical scripts** — Asomtavruli (5th c.), Nuskhuri (9th c.), Mkhedruli (10th c.). Modern Georgian uses Mkhedruli.
- **Mtavruli + Mkhedruli ≠ Latin uppercase + lowercase.** Mtavruli was only added to Unicode in 11.0 (2018). Mkhedruli and Mtavruli historically never mixed — they were used in separate contexts. Treating them as case partners is a recent and contested design choice.
- **Lots of descenders, lots of ascenders.** Like Armenian, Georgian Mkhedruli has more vertical extension than Latin.
- **No native italic tradition.**

### Inheritance scoring (Latin style → Georgian)
- **Humanist sans → Mkhedruli + Mtavruli:** ✅ Precedent: Graphik Georgian.
- **Old-style serif:** ⚠️ Sparse but workable.
- **Geometric sans:** ⚠️ Tends to flatten.

### LLM prompt grounding seed
> "Georgian uses Mkhedruli (lowercase-equivalent) and Mtavruli (uppercase-equivalent, only Unicode-encoded since 2018). They historically never mixed. Frame suggestions through Akaki Razmadze, type.today's Georgian coverage, and Tiro Typeworks' Sylfaen project. Vertical metrics must expand. Flag any italic suggestion."

---

## 10. Tibetan

### Foundational references
- ✅ **Microsoft — "Creating and Supporting OpenType Fonts for Tibetan Script"**: [learn.microsoft.com/en-us/typography/script-development/tibetan](https://learn.microsoft.com/en-us/typography/script-development/tibetan).
- ✅ **Christopher Fynn — Jomolhari font + documentation**; THL Tibetan Machine Uni.
- ✅ **Digital Tibetan — Tibetan fonts overview** ([digitaltibetan.github.io](https://digitaltibetan.github.io/DigitalTibetan/docs/tibetan_fonts.html)).
- ⚠️ **Nitartha Sambhota documentation**.
- ⚠️ **The Tibetan and Himalayan Library — Tibetan Input System Principles**.

### Native-tradition designers worth grounding LLMs in
- **Christopher Fynn** — Bhutan-based; Jomolhari, DDC Uchen, Tibetan Machine Uni; Open SIL pioneer.
- **Nathaniel Garson** — THL collaborator.
- **Nitartha Sambhota team** — SambhotaDege Unicode font.

### Common pitfalls when adapting Latin designs
- **Stacking is everything.** Tibetan consonants stack vertically into syllable blocks. Single-line Latin logic doesn't apply.
- **Headline-based.** Like Devanagari (etymologically related), Tibetan letters hang from a top line, not a baseline.
- **No capitals, no italics, no case.**
- **Uchen vs Umé.** Block-style (Uchen) for print; cursive (Umé) for handwriting. Most digital fonts are Uchen.
- **Tsheg word-separation.** Tibetan uses a centered dot (tsheg) as syllable separator — not a space.
- **Limited corpus.** Almost all serious Tibetan type is volunteer-developed; commercial precedent is minimal.

### Inheritance scoring (Latin style → Tibetan)
- **Humanist serif / sans:** ⚠️ Limited but viable.
- **Geometric, modern, slab:** ❓ Almost no precedent; treat as bespoke design problem.

### LLM prompt grounding seed
> "Tibetan stacks consonants vertically into syllable blocks and hangs from a headline. It has no case, no italics. Uchen (print) and Umé (cursive) are the two style traditions. Frame suggestions through Christopher Fynn's Jomolhari work and the Microsoft Tibetan OpenType guide. Recommend the user defer to Tibetan-tradition designers; flag AI-generated Tibetan glyphs as unreliable."

---

## Cross-script section: contemporary multi-script foundries to study

| Foundry | Multi-script strength | Reference releases | Process docs |
|---|---|---|---|
| **Typotheque** (Peter Biľak, The Hague) | Arabic, Armenian, Cyrillic, Devanagari, Georgian, Greek, Hebrew, Hangul, Thai, Latin | Greta Sans (10 scripts), Lava, November | typotheque.com/articles — open, deep |
| **Tiro Typeworks** (Hudson + Mills, Vancouver) | Latin, Greek, Cyrillic, Armenian, Georgian, Ge'ez, IPA | Sylfaen (Microsoft), Brill, Cambria | tiro.com/about; ILT interview |
| **Adobe Type** | Pan-CJK, Latin, Cyrillic, Greek, Arabic, Hebrew, Devanagari | Source Han Sans/Serif, Source Sans | Adobe Typekit Blog archives |
| **Google Fonts / Noto** (with Monotype) | 150+ scripts, 1,000+ languages | Noto family (~3.5M glyphs total) | notofonts.github.io |
| **Monotype** | Arabic (Chahine), Cyrillic, CJK, Greek | Frutiger Arabic, Neue Helvetica World | monotype.com case studies |
| **TypeTogether** (Březina, Scaglione) | Cyrillic, Greek, Arabic, Hebrew, Devanagari | Adelle, Lavigne, Athelas | Anatomy articles by Vlachou, Saxena, Avni, Radoeva, Alameddine |
| **Dinamo** (Berlin) | Latin, Greek, Cyrillic, Arabic, Hangul, Hebrew, Devanagari, Thai, Armenian, Georgian, Tifinagh | ABC Favorit (9 scripts), ABC Schengen | abcdinamo.com |
| **Production Type** (Paris) | Latin-first; Cyrillic, Greek extensions | Spectral, Minérale | productiontype.com process notes |
| **29LT / TPTQ Arabic** (Zoghbi, Sarkis) | Arabic-first, Latin pairings | 29LT Zarid, Greta Arabic | blog.29lt.com, tptq-arabic.com |
| **Indian Type Foundry** | Indic scripts + Latin | ITF Devanagari, Eczar (via Rosetta) | indiantypefoundry.com |
| **ParaType** (Moscow) | Cyrillic + Latin | PT Sans, PT Serif (Google Fonts) | paratype.com; typejournal.ru |
| **Cadson Demak** (Bangkok) | Thai + Latin | AIS custom, Sarabun | Granshan / Monotype podcast |
| **Sandoll** (Seoul) | Hangul + Latin | Sandoll Gothic, Source Han Korean | sandoll.co.kr |
| **GHEA Fonts** (Yerevan) | Armenian | GHEA library | gheafonts.com |
| **Letterpunch / Khatt Foundation** | Arabic research and publishing | Typographic Matchmaking series | khtt.net |
| **Granshan** | Cross-script competition + conference | 9 script-group archives | granshan.com |

**Academic anchors:**
- **University of Reading MA Typeface Design** — Reading's multi-script PhD/MA repository is the densest single English-language research corpus.
- **KABK Type and Media (The Hague)** — Workshops in Cyrillic, Greek, Arabic, Hangul.

---

## Cross-script section: licensing reality check

### What Patens's RAG can realistically include (English / OA)

✅ **High-confidence inclusions:**
- Type Journal (Paratype, EN translations) — Cyrillic
- Gerry Leonidas's primer (PDF, free) — Greek
- TypeTogether Anatomy articles (Vlachou, Saxena, Avni, Alameddine, Radoeva) — Greek, Devanagari, Hebrew, Arabic, Cyrillic
- Typotheque articles (Biľak, Sahar, Liu) — Hebrew, CJK
- Alphabettes essays — Devanagari, Georgian
- Khatt Foundation publications — Arabic
- 29LT Blog — Arabic
- Microsoft script-development OpenType docs — Devanagari, Tibetan, Arabic, etc.
- Adobe Typekit Blog Source Han series — Pan-CJK
- Internet Archive scan of *Language Culture Type* — multi-script
- Letterform Archive online catalog notes — multi-script
- type.today journal — Cyrillic, Armenian, Georgian
- Granshan competition catalogs — all non-Latin scripts

### What the RAG should *not* hallucinate without

⚠️ **Behind paywall / print-only / partial-English:**
- AbiFarès, *Arabic Typography: A Comprehensive Sourcebook* (print; Khatt licensing)
- Ismar David, *The Hebrew Letter* (print only; Jason Aronson)
- *Arabic Type Design for Beginners* (print; Khatt)
- Ken Lunde, *CJKV Information Processing* (O'Reilly print; pirated PDFs exist — do not include)
- Reading MA theses (some open via CentAUR, many embargoed)
- Idea Magazine archives (Japan; print)

### Where the LLM *will* hallucinate without native-language sources

❓ **Known gaps Patens must declare:**
- Mainland Chinese type design literature (zh-Hans only)
- Japanese type design literature beyond Idea/Adobe English translations
- Korean Hangul type theory beyond Ahn Graphics English editions
- Russian-language Cyrillic theory (Korolkova, Favorsky untranslated portions)
- Thai-language type design corpus
- Mkhedruli vs Mtavruli regional Georgian discourse (Georgian-language)

### Where Patens would need foundry partnerships

For shipping credible suggestions in production:
- **Sandoll** or **Yoon Design** for Hangul
- **SinoType**, **DynaComware**, or **Founder** for Chinese
- **Iwata**, **Jiyu-kobo**, or **Morisawa** for Japanese
- **Khatt Foundation** or **29LT** for Arabic
- **Cadson Demak** for Thai
- **GHEA Fonts** for Armenian
- **Indian Type Foundry** or **Ek Type** for Indic
- **ParaType** for Cyrillic depth

A partnership lets Patens cite specific contemporary practice rather than triangulating from secondary sources.

---

## Which 3 scripts are the MVP for Patens at TypeCon Portland?

**Recommendation: Cyrillic, Greek, Arabic.**

### Cyrillic — keep
- ✅ ~250M+ first-language users; one of the top-five global scripts.
- ✅ Best public-domain / open English literature of any non-Latin script (Type Journal, Yefimov essays, Zhukov Reading paper, *Language Culture Type*).
- ✅ Patens already has 17 look-alikes shipped; the *delta* to credible coverage is finishing Я, Ж, Ф, Ц, Щ, Ъ, Ы, Ь, Э, Ю + cursive italic forms.
- ✅ TypeCon audience contains active Cyrillic practitioners (Zhukov is a long-standing TypeCon figure).
- ✅ Demos well: the "К vs K" decision is a 30-second story that lands in a keynote.

### Greek — keep and finish
- ✅ Patens has 14 uppercase look-alikes; the missing piece is Greek lowercase (the *hard* and *culturally specific* part).
- ✅ Leonidas's primer + Vlachou's anatomy are free, citable, and ground-truthable.
- ✅ Shipping Greek lowercase done right — single-storey α, open ε, ρ with proper descender — is the single most defensible "we are not Latin-colonial" story Patens can tell at TypeCon.
- ✅ Reading audience overlap with TypeCon is significant.

### Arabic — add as the third
- ✅ ~660M users; second-largest non-Latin script population after CJK.
- ✅ Strongest English-language literature outside Latin (AbiFarès, Khatt, Khatt's Typographic Matchmaking series, 29LT, TypeTogether anatomy).
- ✅ Maximum decolonial credibility: shipping Arabic correctly means Patens has *explicitly* rejected the x-height-matching anti-pattern in a public, citeable way.
- ✅ Khatt and 29LT have an active English-language ecosystem; partnership is achievable in the runway window.
- ⚠️ Hard requirement: Patens must implement joining (isolated / initial / medial / final) before claiming Arabic support. Without joining behaviour the demo collapses.
- ⚠️ The audit module's "13 familias" inconsistency in /es/audit becomes a strength here — if the auditor flags "Arabic vertical-metric mismatch" in Patens-native language, that is a TypeCon-worthy demo.

### Scripts to explicitly defer (and why)

- **Devanagari** — combinatorics (800+ glyphs, shaping engine work) exceeds 10-week budget. Defer post-TypeCon; partner with ITF or Ek Type.
- **Hebrew** — small population (~10M), best literature is mid-century, audience overlap with TypeCon Portland is thinner than Arabic/Greek.
- **CJK** — Patens cannot ship credibly without a foundry partner. Mention as roadmap; do not demo.
- **Thai, Armenian, Georgian, Tibetan** — each is excellent as a v2 story, but none has the combination of population + English literature + TypeCon audience overlap to justify being top-three.

### The TypeCon narrative this enables

> Patens ships an open-source, browser-native type editor with an AI assistant that knows when *not* to help. We support Latin, Cyrillic, Greek, and Arabic — and the assistant is grounded in Yefimov, Zhukov, Leonidas, Vlachou, AbiFarès, and Sarkis, so it will tell you that a mechanical slant is not Cyrillic italic, that single-storey α is non-negotiable, and that Arabic does not have an x-height. The 94-code audit module catches the things we know, and defers to native-tradition designers for the things we don't.

That is a 20-minute TypeCon talk.

---

## Sources

### Cyrillic
- [Type Journal — Civil Type and Kis Cyrillic](https://typejournal.ru/en/articles/Civil-Type)
- [Type Journal — On the appearance and development of Cyrillic letterforms](https://typejournal.ru/en/articles/Cyrillic-Letterforms-Development)
- [Type Journal — A Letter To Yefimov](https://typejournal.ru/en/articles/A-Letter-To-Yefimov)
- [Paratype — Reading Vladimir Yefimov](https://info.paratype.com/reading-vladimir-yefimov-2/)
- [Fonts In Use — On Type & Lettering by Vladimir Favorsky](https://fontsinuse.com/uses/14965/on-type-andamp-lettering-by-vladimir-favorsky)
- [COMRADE Gallery — Fonts & Freedom: The History of Typography in the USSR](https://www.comradegallery.com/journal/fonts-typography-and-freedom-ussr)
- [TypeDrawers — Mixing and matching italic and roman shapes in Cyrillic fonts](https://typedrawers.com/discussion/1873/mixing-and-matching-italic-and-roman-shapes-in-cyrillic-fonts)
- [MyFonts — Cyrillic script variations and the importance of localisation](https://www.myfonts.com/a/font/content/cyrillic-script-variations-and-the-importance-of-localisation)
- [type.today — Cyrillic on Google Fonts](https://type.today/en/journal/scripts)
- [Wikipedia — Russian cursive](https://en.wikipedia.org/wiki/Russian_cursive)

### Greek
- [Gerry Leonidas — A Primer on Greek Type Design (PDF)](https://leonidas.net/wp-content/uploads/2013/12/LCT_greektypedesign.pdf)
- [Gerry Leonidas — Designing Greek typefaces (Medium)](https://medium.com/@gerryleonidas/designing-greek-typefaces-eac0de7767cc)
- [Gerry Leonidas — Preparation for Greek typeface design](https://leonidas.net/preparation-for-greek-typeface-design/)
- [TypeTogether — Greek Type Anatomy by Irene Vlachou](https://www.type-together.com/greek-type-anatomy)
- [AccScience — Contemporary Greek typeface design: A study on Greek designers' perspectives](https://accscience.com/journal/AC/0/0/10.36922/ac.3133)

### Arabic
- [Khatt Foundation — Arabic Type Design for Beginners](https://www.khtt.net/en/page/1392/arabic-type-design-for-beginners-an-illustrated-guidebook)
- [Khatt Foundation — Typographic Matchmaking in the City](https://www.khtt.net/en/page/16712/typographic-matchmaking-in-the-city)
- [29LT Blog — Arabic Type Anatomy & Typographic Terms](https://blog.29lt.com/2015/07/30/arabic-type-anatomy-typographic-terms/)
- [TypeTogether — Arabic Type Anatomy by Azza Alameddine](https://www.type-together.com/arabic-type-anatomy)
- [TPTQ Arabic — The Influences of Greta Text Arabic](https://tptq-arabic.com/articles/the_influences_of_greta_text_arabic)
- [Communication Arts — Basic Principles of Arabic Type Design](https://www.commarts.com/features/basic-principles-of-arabic-type-design)
- [Wikipedia — Arabic typography](https://en.wikipedia.org/wiki/Arabic_typography)
- [Medium / Azza Alameddine — Matching Arabic & Latin scripts in logotypes](https://medium.com/3azalam/matching-arabic-latin-scripts-in-logotypes-777db80c5c17)

### Hebrew
- [Visible Language — Ismar David's Quest for Original Hebrew Typographic Signs (Shani Avni)](https://journals.uc.edu/index.php/vl/article/view/4623)
- [TDC — Shani Avni: Ismar David and the First Hebrew Typeface Family](https://archive.tdc.org/videos/shani-avni-ismar-david-first-hebrew-typeface-family/)
- [TypeCulture — David Hebrew: The First Multi-Style Hebrew Typeface Family](https://www.typeculture.com/academic-resource/articles-essays/david-hebrew-first-multi-style-hebrew-typeface-family/)
- [Typotheque — Designing Hebrew Type (Biľak)](https://www.typotheque.com/articles/designing-hebrew-type)
- [Typotheque — Secondary Style in Hebrew Typography (Sahar)](https://www.typotheque.com/articles/secondary-style-in-hebrew-typography)
- [TypeTogether — Hebrew Type Anatomy by Shani Avni](https://www.type-together.com/hebrew-type-anatomy)
- [Meir Sadan — An Introduction to Hebrew Type](https://medium.com/@meirsadan/an-introduction-to-hebrew-type-98933e2fcb17)
- [Ivritype — Hebrew Typography Annotated Bibliography](https://www.ivritype.com/hebrew/biblio/)
- [Academia.edu — Typography and the Evolution of Hebrew Alphabetic Script: Writing Method of the Sofer](https://www.academia.edu/39874695/Typography_and_the_Evolution_of_Hebrew_Alphabetic_Script_Writing_Method_of_the_Sofer)

### Devanagari
- [TypeTogether — Devanagari Type Anatomy by Pooja Saxena](https://www.type-together.com/devanagari-type-anatomy)
- [Alphabettes — Devanagari Typography 101: A guide for typesetting with Latin](https://www.alphabettes.org/devanagari-typography-101-a-guide-for-typesetting-with-latin/)
- [Mota Italic — Devanagari Documentation](https://motaitalic.github.io/devanagari-documentation/languages/devanagari-overview/devanagari-overview.html)
- [PrintWeek India — Mukund Gokhale obituary](https://www.printweek.in/article/mukund-gokhale-legendary-typographer-dies/4hp7xxdge45b955bxz68b9tmxr)
- [TypeTogether — Vaibhav Singh](https://www.type-together.com/vaibhav-singh)
- [GitHub — errorsinc/Eczar (Vaibhav Singh)](https://github.com/errorsinc/Eczar)
- [Indian Type Foundry — ITF Devanagari](https://www.indiantypefoundry.com/fonts/itf-devanagari)
- [Microsoft — Developing OpenType Fonts for Devanagari Script](https://learn.microsoft.com/en-us/typography/script-development/devanagari)
- [GitHub — n8willis/opentype-shaping-documents (Devanagari)](https://github.com/n8willis/opentype-shaping-documents/blob/master/opentype-shaping-devanagari.md)
- [Aasawari Kulkarni — Thoughts on Westernization of Devanagari Typography](https://aasawarikulkarni.substack.com/p/westernization-of-devanagari-typography)
- [Typoday 2023 — Purvi Kothari, Designing a Devanagari typeface for Sanskrit (PDF)](https://www.typoday.in/2023/spk_papers/Purvi_Kothari_Typoday2023.pdf)

### CJK
- [Adobe Typekit Blog — Introducing Source Han Sans](https://blog.typekit.com/2014/07/15/introducing-source-han-sans/)
- [Adobe Typekit Blog — Interview with Ryoko Nishizuka](https://blog.typekit.com/2014/08/14/interview-with-ryoko-nishizuka/)
- [Adobe — Ryoko Nishizuka](https://fonts.adobe.com/designers/ryoko-nishizuka)
- [Wikipedia — Source Han Sans](https://en.wikipedia.org/wiki/Source_Han_Sans)
- [Typotheque — Understanding CJK regional character variants (Liu)](https://www.typotheque.com/articles/understanding-cjk-regional-character-variants)
- [Typotheque — Typesetting principles of CJK text](https://www.typotheque.com/articles/typesetting-cjk-text)
- [Wikipedia — List of CJK fonts](https://en.wikipedia.org/wiki/List_of_CJK_fonts)
- [Rest of World — Revolutionary type: Meet the designer decolonizing Chinese fonts (Julius Hui)](https://restofworld.org/2021/the-revolutionary-mission-to-decolonize-chinese-typefaces/)
- [Eye on Design — A Contemporary Ming-style Typeface](https://eyeondesign.aiga.org/a-contemporary-ming-style-typeface-that-shares-an-aura-of-ancient-chinese-letterforms/)
- [Lisa Huang — About Chinese Type Design](https://www.lisahuang.work/about-chinese-type-design-1-3)
- [Letterform Archive — Ahn Sang Soo and AG Typography Institute](https://letterformarchive.org/news/from-the-collection-ahn-sang-soo/)
- [MoMA — Korean Hangul Typeface Design](https://www.moma.org/explore/inside_out/2015/02/05/korean-hangul-typeface-design-a-unique-game-of-modular-design/)
- [Ahn Graphics — Textbook of Hangeul Design](https://agbook.co.kr/en/books/textbook-of-hangeul-design)
- [TypeRoom — Sandoll on how to design Hangul type](https://www.typeroom.eu/atypi-sandoll-inc-on-how-to-design-hangul-type)
- [Morisawa USA — Hangeul Typography Explained](https://www.morisawa-usa.com/post/hangeul-typogarphy-guide)
- [TDC — Akira Kobayashi](https://tdc.org/medal-winner/akira-kobayashi/)
- [Smashing Magazine — An Interview With Type Designer Akira Kobayashi](https://www.smashingmagazine.com/2015/04/interview-with-akira-kobayashi/)
- [Toshi Omagari — Profile](https://tosche.net/profile)

### Thai
- [Granshan — Very Well Selected: Cadson Demak and the Modern Thai Typeface](https://granshan.com/insights/very-well-selected-cadson-demak-and-the-modern-thai-typeface)
- [Wikipedia — Anuthin Wongsunkakon](https://en.wikipedia.org/wiki/Anuthin_Wongsunkakon)
- [Maekan — Type-of-Graphic / Cadson Demak](https://maekan.com/story/type-of-graphic-cadson-demak/)
- [Monotype — Creative Characters S6 E1: Cadson Demak](https://www.monotype.com/resources/podcast/creative-characters-s6-e1-cadson-demak)
- [BK Magazine — Interview with Anuthin Wongsunkakon](https://www.bkmagazine.com/city-living/interview-thai-type-designer-cadson-demak-co-founder-anuthin-wongsunkakorn/)

### Armenian
- [type.today — By hook or by crook: What's happening in Armenian type?](https://type.today/en/journal/am)
- [type.today — Khajag Apelian](https://type.today/en/designer/khajag_apelian)
- [type.today — Araz Bogharian, Arman Harutyunyan](https://type.today/en/journal/armeniantypenow)
- [Granshan — Edik Ghabuzyan Lifetime Achievement Award](https://granshan.com/script-groups/edik-ghabuzyan-lifetime-achievement-award-for-armenian-type-design)
- [GHEA Fonts — Edik Ghabuzyan](https://www.gheafonts.com/product-category/designers/edik-ghabuzyan/)
- [29LT — Khajag Apelian](https://www.29lt.com/designer/khajag-apelian/)
- [Armenian Typography — Resources](http://armeniantypography.com/resources/)
- [type.today — Graphik Armenian](https://type.today/en/graphik_arm)

### Georgian
- [type.today — Georgian typography is now catching up](https://type.today/en/journal/ge)
- [ScriptSource — Georgian (Mkhedruli and Mtavruli)](https://scriptsource.org/cms/scripts/page.php?item_id=script_detail_font&key=Geor)
- [type.today — Graphik Georgian](https://type.today/en/graphik_geo)
- [type.today — New typeface: Graphik Georgian](https://type.today/en/journal/graphik_ge)
- [Alphabettes — Designing a Georgian Header](https://www.alphabettes.org/designing-a-georgian-header/)
- [Wikipedia — Sylfaen (typeface)](https://en.wikipedia.org/wiki/Sylfaen_(typeface))
- [Google Arts & Culture — The Beautiful Fonts and Scripts of Georgia](https://artsandculture.google.com/story/the-beautiful-fonts-and-scripts-of-georgia-georgian-state-museum-of-theatre-music-film-and-choreography-art-palace/dgVREzi41T85Jg?hl=en)

### Tibetan
- [Microsoft — Creating and Supporting OpenType Fonts for Tibetan Script](https://learn.microsoft.com/en-us/typography/script-development/tibetan)
- [Digital Tibetan — Tibetan fonts](https://digitaltibetan.github.io/DigitalTibetan/docs/tibetan_fonts.html)
- [Rangjung Yeshe Wiki — Tibetan Fonts](https://rywiki.tsadra.org/index.php/Tibetan_Fonts)
- [Tibetan and Himalayan Library — Tibetan Input System Principles](https://www.thlib.org/tools/scripts/wiki/Tibetan%20Input%20System%20Principles.html)
- [Virginia — A New Chapter in Tibetan Computing](https://collab.its.virginia.edu/wiki/tibetan-script/A%20New%20Chapter%20in%20Tibetan%20Computing.html)
- [Nitartha Sambhota FAQ](https://www.nitartha.net/new-page)

### Cross-script foundries, programs, and meta
- [Klim Type Foundry — Calibre](https://klim.co.nz/fonts/calibre/)
- [Klim Type Foundry — Tiempos](https://klim.co.nz/collections/tiempos/)
- [Tiro Typeworks](https://www.tiro.com/)
- [Tiro Typeworks — Brill](https://www.tiro.com/fonts/brill)
- [Tiro Typeworks — Cambria](https://www.tiro.com/fonts/cambria)
- [ILT — On Type Design & Volcanoes (John Hudson interview)](https://ilovetypography.com/2021/07/21/fonts-interview-with-john-hudson-tiro/)
- [Typotheque — Greta Sans Devanagari](https://www.typotheque.com/blog/greta-sans-devanagari)
- [Typotheque — Greta Sans in Cyrillic and Greek](https://www.typotheque.com/blog/greta-sans-in-cyrillic-and-greek)
- [Wikipedia — Peter Biľak](https://en.wikipedia.org/wiki/Peter_Bi%C4%BEak)
- [Wikipedia — Typotheque](https://en.wikipedia.org/wiki/Typotheque)
- [Dinamo Typefaces](https://abcdinamo.com/)
- [Dinamo — Studio](https://abcdinamo.com/studio)
- [Eye on Design — Why Type Foundry Dinamo Releases Its Fonts as if They Were Albums](https://eyeondesign.aiga.org/why-type-foundry-dinamo-releases-their-fonts-as-if-they-were-albums/)
- [Monotype — More than 800 languages in a single typeface: creating Noto](https://www.monotype.com/resources/case-studies/more-than-800-languages-in-a-single-typeface-creating-noto-for-google)
- [Wikipedia — Noto fonts](https://en.wikipedia.org/wiki/Noto_fonts)
- [Noto Fonts — Google Fonts](https://fonts.google.com/noto)
- [KABK — Master Type and Media programme description](https://www.kabk.nl/en/programmes/master/type-and-media/programme-description)
- [TypeMedia — MA Type Design](https://typemedia.org/)
- [Typotheque — 158 answers book by type]media KABK](https://www.typotheque.com/books/158-answers)
- [Typographica — In Defense of Regionalism: Typography Education Beyond KABK & Reading](https://typographica.org/on-typography/in-defense-of-regionalism-typography-education-beyond-kabk-reading/)
- [Granshan — Competition](https://granshan.com/competition)
- [Granshan — About](https://granshan.com/about)
- [Granshan — 13th Competition Overview](https://granshan.com/13th-granshan-type-design-competition-2023-2024/overview)
- [TypeRoom — 12th GRANSHAN Competition](https://www.typeroom.eu/12th-granshan-competition-diversity-of-type)
- [TypeCon](https://www.typecon.com/)
- [TypeCon2026: Portland tickets](https://www.eventbrite.com/e/typecon2026-portland-tickets-1573780382489)
- [TypeCon — Speaker Submissions 2026](https://www.typecon.com/speaker-submissions-2026)
- [Internet Archive — Language Culture Type](https://archive.org/details/languageculturet0000unse)
- [John D. Berry — Preface: Language Culture Type](https://johndberry.com/writing-on-type-and-design/preface-language-culture-type-2/)
- [Unicode mail archive — Announcement: Language Culture Type](https://unicode.org/mail-arch/unicode-ml/y2002-m10/0073.html)

### Decolonisation discourse
- [Letterform Archive — Type History Toolkit, Part 2: De-Centering the Latin Letter in Design Education](https://letterformarchive.org/news/de-centering-the-latin-letter-in-typography-education/)
- [Futuress — A Resource Hub for Decolonizing Typography](https://futuress.org/stories/decolonizing-typography-resources/)
- [Brill — Facing the World: Towards a Global History of Non-Latin Type Design](https://brill.com/view/journals/phen/3/4/article-p399_1.xml?language=en)
- [Medium / TylerD&I — Decolonizing Digital Typography](https://medium.com/tylerdi/decolonizing-digital-typography-398a64e623cc)

### World writing populations
- [WorldAtlas — The World's Most Popular Writing Scripts](https://www.worldatlas.com/articles/the-world-s-most-popular-writing-scripts.html)
- [Visual Capitalist — Mapped: Writing Systems of the World](https://www.visualcapitalist.com/mapped-writing-systems-of-the-world/)
- [Britannica — The World's 5 Most Commonly Used Writing Systems](https://www.britannica.com/list/the-worlds-5-most-commonly-used-writing-systems)
- [Omniglot — Language and Writing Statistics](https://www.omniglot.com/writing/stats.htm)

---

**Word count: ~4,800.** Ready for paste-in to `docs/research/multi-script-canon.md`.