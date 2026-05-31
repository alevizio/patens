# Patens — AI Features Roadmap

**Date:** 2026-05-30
**Horizon:** TypeCon Portland launch Aug 6–8, 2026 → 12 months post-launch
**Positioning:** *The old masters taught by being in the room with you. Patens puts that voice in the margin — augmented by AI that's read every book on the shelf.*

This document ties the three research tracks (canonical library, AI-audit mapping, multi-script canon) to a concrete 5-feature product roadmap with launch-gate ordering, dependencies, and grant-application leverage.

---

## Strategic positioning

Patens's wedge is **audit-as-pedagogy** — the 94-code module isn't a linter, it's a mentor that has internalized the tradition. Every existing AI tool in the type-design market (Lipi, Fontish) *bypasses* the discipline. Patens's opening is to do the opposite: **use AI to deepen the discipline**.

The five features below all reinforce the audit. None of them replace it. The pattern is consistent:
- The deterministic audit fires
- AI provides a second layer (historical citation, perceptual confirmation, multi-script grounding, brief coherence, adversarial review)
- The designer reads both, makes the call

This is the inverse of "AI generates the font" — Patens stays on the designer's side of the canvas.

---

## The 5 features, ranked by audit-reinforcement leverage

### Feature 1 — The Historical Citation Engine

**One-line:** When an audit code fires, surface the canonical text where the rule was first articulated, who established it, where, when, and why.

**Mechanism.** RAG over a curated corpus of canonical type-design literature. The 94-code audit dictionary becomes the matcher input; the corpus from `canonical-library.md` becomes the retrieval target; the citation is the output.

**Example.** `sidebearing-class-drift-lsb` fires today and shows plain-English prose. With the citation engine: a second pane shows *"Tracy, Letters of Credit (1986), pp. 71–73 — the Smith-Tracy spacing method codifies the H/n/o control-letter triad..."* with the historical context for why the rule exists.

**Why it's #1:** every existing audit code becomes 10× deeper without changing the audit module itself. The mentor-in-the-margin metaphor literalized. Highest pre-launch demo leverage.

**Dependency:** Research A (`canonical-library.md`) — done. The 10-source starter corpus is fully open-licensed. Ingest in 4–6 weeks of solo work.

**Pre-launch ship feasibility:** **MVP yes** — the 10-source starter corpus covers all 9 audit families with open-licensed content. Ship behind a feature flag, demo at TypeCon.

**Grant-application leverage:** Anthropic Research Credits (audit-as-pedagogy is *literally* a pedagogy claim). NLnet Commons Fund (open digital commons + educational resource). Maps directly to the research-credits framing of "studying how AI explanations compare to deterministic prose."

---

### Feature 2 — Vision-Model Disagreement Surface

**One-line:** Run a vision model on the rendered glyph; compare its perceptual judgment against the 94-code audit's geometric findings; surface the disagreement column.

**Mechanism.** For each of the 11 vision-augmented codes identified in `ai-audit-mapping.md`, run the rendered specimen through claude-opus-4-7 vision with the prompt template from Section 2 of that research doc. Compare the verdict to the deterministic audit:

- **Codes agree:** confirmed finding — both geometric + perceptual evidence.
- **AI sees what audit missed:** new candidate for the dictionary. Designer reviews.
- **Audit sees what AI missed:** the rule is sub-perceptual and needs the algorithm.

The *disagreement column* becomes a research surface for the next 30 codes.

**Top 10 candidate codes** (from Research B):
1. `xheight-misaligned` — algorithm finds drift, vision tells you if visible at body-text size
2. `sharp-kink` — vision distinguishes faceted display from accidental kink
3. `kerning-extreme` — vision distinguishes display kern from typo
4. `overflows-advance` — vision confirms rendered collision vs benign graze
5. `capheight-misaligned` — same as #1 for caps
6. `contour-winding-collision` — vision confirms counter fills incorrectly
7. `self-intersecting` — vision distinguishes design feature from artifact
8. `extends-above/below-ascender/descender` — vision simulates clipping
9. `figures-non-tabular` — vision makes misalignment legible
10. `tiny-contour` — vision distinguishes artifact from intentional tittle/dot

**Dependency:** Research B (`ai-audit-mapping.md`) — done. Methodology + budget + sample plan all specified. ~$100 of Anthropic credits + a weekend.

**Pre-launch ship feasibility:** **Methodology yes, full UI no.** Pre-launch: run the experiment, publish the agreement-kappa numbers, demo the 2–3 strongest examples at TypeCon. Post-launch: ship the UI for the full 11 candidates.

**Grant-application leverage:** Anthropic Startup Credits ($25K–$100K) — credits fund the empirical measurement; the published kappa numbers become a citable artifact. Codex Open Source Fund — alternative model comparison fits.

---

### Feature 3 — Multi-Script Inheritance Suggestions

**One-line:** You design a Latin face. AI suggests historically-grounded inheritance paths for Cyrillic, Greek, Arabic, Hebrew, Devanagari, CJK — with explicit citations to the script's native tradition, not Latin-as-default.

**Mechanism.** RAG over the multi-script corpus identified in `multi-script-canon.md`. When the designer enables a script extension, AI proposes inheritance options grounded in:
- Specific historical foundries known for cross-script work in this script
- Anti-patterns from the script's own tradition
- Designers worth grounding LLM context in ("how would Maxim Zhukov approach this Cyrillic *Я*?")

**Example.** *"Your low-contrast geometric Latin lowercase suggests Cyrillic in the Cold War industrial tradition (cite: Yefimov, Typejournal). The alternative humanist contemporary path is Tagir Safayev's approach at Paratype (cite: Paratype 1989). Pick a direction; both have historical precedent."*

**Dependency:** Research C (`multi-script-canon.md`) — done. Identifies 3 MVP scripts (Cyrillic + Greek + Arabic based on combined writing population + open literature availability) for TypeCon demo.

**Pre-launch ship feasibility:** **Cyrillic + Greek yes** (Patens already ships 17 + 14 look-alike glyphs). Arabic post-launch. Other scripts research-only at TypeCon.

**Grant-application leverage:** NLnet Commons Fund — multi-script accessibility is core to the EU "open digital commons" frame. Mozilla MOSS — advances the open web for non-Latin writing systems. GitHub Secure Open Source Fund — multi-script support is a known critical-infrastructure gap.

---

### Feature 4 — Brief-to-Glyph Coherence Check

**One-line:** You write a brief (`brief.intent`, `brief.useCase`, `brief.voice`). AI reads the actual shapes you drew and reports whether they match the stated brief.

**Mechanism.** LLM-augmented audit code (per Research B Section 5). The `brief-no-intent` and `brief-no-design-notes` codes today only check presence; this expands them to check *coherence*.

**Example.** *"You wrote 'editorial body text, calm, contemporary humanist.' Your lowercase a has a single-storey form which reads more geometric than humanist. Your descenders are short which reads more compact than calm. Reconcile or revise the brief."*

**Why this matters:** ties existing audit codes (`brief-no-intent`, `brief-no-design-notes`) into a coherence loop with the actual shape data. Closes the gap between what the designer *says* they're making and what they actually drew.

**Dependency:** Research A (canonical library, for the design-philosophy vocabulary) + minor work on the brief schema.

**Pre-launch ship feasibility:** **MVP feasible** — much smaller scope than Features 1–3. Add to the release pre-flight check.

**Grant-application leverage:** Anthropic Research Credits — the brief-coherence loop is research-able (does AI catch coherence violations humans miss?).

---

### Feature 5 — The Adversarial Foundry Director

**One-line:** Pre-release, AI plays the role of a hostile foundry director reviewing your typeface against a stated brief — modeled on specific design personas with consistent voice.

**Mechanism.** LLM with persona-grounded prompts:
- *"What would Matthew Carter say about this body-text design?"*
- *"What would Erik Spiekermann reject from this signage face?"*
- *"What would Tobias Frere-Jones flag in this revival?"*

Output is a candid pre-release review of strengths, weaknesses, market fit, with specific reference to glyphs/metrics/kerning that drove the verdict.

**Persona grounding** comes from the foundry blogs identified in Research A as living primary sources: Klim Type Foundry, Frere-Jones Type, Phinney on Fonts, plus historical figures grounded in the canonical literature.

**Why this matters:** designers ship typefaces today without ever getting the harsh critique that used to happen at foundries. Patens restores the missing step.

**Dependency:** Research A (for canonical voices) + Klim/Frere-Jones blog ingestion as living primary sources.

**Pre-launch ship feasibility:** **Demo yes** (2–3 personas), production no.

**Grant-application leverage:** Less leverage than features 1–3 — this is the *delight* feature, not the pedagogy feature. Ship post-launch when the audience exists.

---

## Roadmap with launch gates

### Pre-launch (now → Aug 6)

| Week | Feature work | Research / grant work |
|---|---|---|
| 1 (May 30 – Jun 7) | Research published (this doc + 3 research files) | Vercel OSS submission (Wed Jun 3) |
| 2–3 (Jun 7 – Jun 21) | Feature 1 — ingest 5 of 10 starter sources (OT spec, AGL, FEA, UFO, Unicode) | Anthropic startup + research credit applications |
| 4–5 (Jun 21 – Jul 5) | Feature 1 — ingest remaining 5 (Sheep, Cookbook, Klim archive, Knuth, TrueType) | First Lighthouse run + real-device QA |
| 6 (Jul 5 – Jul 12) | Feature 1 — wire audit-code → citation matcher; alpha-flag-gated UI | GitHub Secure OSS Fund + FUTO applications |
| 7 (Jul 12 – Jul 19) | Feature 2 — run vision-model experiment per Research B methodology; publish kappa numbers | NLnet draft refresh with launch traction |
| 8 (Jul 19 – Jul 26) | Feature 3 — Cyrillic + Greek grounding seeds in the LLM context; demo flow | Tag v1.6.0 with citation-engine MVP |
| 9 (Jul 26 – Aug 2) | Pre-launch polish — citation prose, demo screenplay, presenter notes | NLnet submission Jul 31 EOD |
| 10 (Aug 2 – Aug 8) | TypeCon launch week | Show HN Tue Aug 4 → TypeDrawers T+24h → TypeCon Portland Aug 6–8 |

**Pre-launch MVP scope:**
- Feature 1 — Citation Engine — **shipped behind feature flag, 10-source corpus, 5 audit families**
- Feature 2 — Vision Disagreement — **methodology + kappa numbers published, UI deferred**
- Feature 3 — Multi-script — **Cyrillic + Greek demo, Arabic deferred**
- Feature 4 — Brief Coherence — **deferred (smaller wedge, post-launch)**
- Feature 5 — Adversarial Director — **demo at TypeCon, production post-launch**

### Post-launch (Aug 8 onward)

| Quarter | Features advanced | Grant work |
|---|---|---|
| Q3 2026 | Feature 1 — license Tracy + Hochuli + Cheng for fair-use ingestion. Expand corpus to all 9 audit families with craft-tradition coverage. | Sovereign Tech Fund Q3/Q4 round |
| Q4 2026 | Feature 2 — production UI for all 11 vision-augmented codes. Publish kappa-numbers paper to ATypI/peer-reviewed. | OpenAI Codex OSS Fund — alternative model integration |
| Q1 2027 | Feature 3 — Arabic + Hebrew + Devanagari. Foundry partnerships for proprietary literature ingestion. | EU Sovereign Tech Fund (if launched) |
| Q2 2027 | Feature 4 + Feature 5 — full release. Brief coherence audit; adversarial-director personas with archive.org snapshot citations for foundry blogs. | Linux Foundation LFX Mentorship — Patens as hosting project |

---

## Cross-cutting concerns

### BYOK preserved across all features
Every feature here uses the existing `/api/ai/messages` proxy with the user-provided Anthropic key. Patens does NOT introduce a shared-cost surface. If grant credits land, the architecture allows a "shared key for the published demo" tier without changing user-key handling — just an env-var fallback in the proxy.

### Corpus governance
The Research A doc names licensing posture explicitly: open-spec corpus shipped in-repo, fair-use excerpts cited by bibliographic reference only (no body-text ingest), foundry blogs cited with archive.org snapshots. The corpus itself becomes an editable spec on GitHub once licensing is clear.

### Audit code stability
All 5 features reinforce the existing 94-code dictionary. None introduce new codes pre-launch. Post-launch, new codes get added through the dictionary-amendment process documented in the existing audit-codes ADR.

### Open-source contract
Every feature ships under MIT. The corpus citations are bibliographic (titles, page numbers, URLs) — these are facts, not copyrightable content. The matcher code is open. The license-protected text excerpts stay out of the repo; they're cited by reference only.

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Citation engine hallucinates a non-existent page reference | Constrain RAG to retrieved-only output; reject any citation not in the corpus index. |
| Vision-model kappa numbers turn out to be terrible | Publish them anyway with honest exploratory framing per Research B. Negative results are publishable; the framing is "where AI augments, where it doesn't." |
| Multi-script grounding gets criticized as colonialist | Research C explicitly addresses this. Cite native designers + native foundries. Skip the "AI suggests Cyrillic" framing in favor of "AI surfaces what your tradition's masters did." |
| Foundry-blog citations break when Klim/Frere-Jones revise | Store archive.org snapshots at ingestion time per Research A Section 3.5. Cite both live URL + permanent snapshot. |
| Brief-coherence feature feels gimmicky | Ship Feature 4 last. Validate Features 1–3 first; if those land at TypeCon, Feature 4 has audience credibility. |

---

## Success metrics

### Pre-launch (Aug 6)
- Citation engine — covers 5/9 audit families, has ≥3 citations per code in MVP families
- Vision experiment — kappa numbers published for top 10 candidates (target: κ > 0.6 on at least 5)
- Multi-script — Cyrillic + Greek demo at TypeCon with at least 6 native-tradition citations
- 1 Show HN front page (Tue Aug 4)
- 1 TypeDrawers thread alive (T+24h)
- 1 TypeCon talk slot (if accepted)

### 12 months post-launch
- Citation engine — covers all 9 audit families with craft-tradition coverage. Licensing deals with at least 3 of (Hartley & Marks, Hyphen, Yale, Godine, B42).
- Vision experiment — peer-reviewed paper submitted to ATypI/JLT.
- Multi-script — 4 of 6 target scripts (Cyrillic, Greek, Arabic, Hebrew) demoable; at least one foundry partnership for non-Latin literature.
- Grant total: $50K–$150K mixed credits + cash; budget for first paid contractor.
- 1000+ stars on GitHub. 10+ external contributors. 1+ foundry adopting Patens as part of CI.

---

## How this doc gets revised

This roadmap is living — revise quarterly. Edit triggers:
- Major spec change in OpenType (e.g., COLR v2)
- Vision-model capability shift (e.g., new VLM benchmark exceeds designer-grade)
- Grant outcome (cash + credits affect timeline)
- Real user feedback from TypeCon → which features did designers actually want?

The three research files (`canonical-library.md`, `ai-audit-mapping.md`, `multi-script-canon.md`) get re-audited annually. Each has a confidence-level system; rerun any ❓ or ⚠️ entries against current literature.

---

## Sources

The three research files this roadmap is built on:

- [Canonical Type-Design Library](./canonical-library.md) — 38 sources, licensing matrix, 10-source open MVP starter corpus
- [AI-Audit False-Positive Mapping](./ai-audit-mapping.md) — 75/11/1/3 split across 94 codes, top 10 vision-augmented candidates, ~$100 weekend experiment methodology
- [Multi-Script Canon](./multi-script-canon.md) — Cyrillic, Greek, Arabic, Hebrew, Devanagari, CJK, Thai, Armenian, Georgian, Tibetan with native-tradition citations
