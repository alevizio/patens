# NLnet NGI Zero Commons — application draft

Patens fits NLnet NGI Zero Commons cleanly: free software, public benefit,
open standards, type-design pedagogy. Rolling deadline every 2 months;
funding range €5K–€50K; no equity, no IP transfer.

**Target cycle: 2026-08-01.** (The 2026-06-01 cycle is being skipped —
chosen post-launch credibility over a pre-launch ask. The Aug 1 cycle
overlaps TypeCon Portland week, so this application benefits from real
launch-day data + early-user feedback.)

Submit at <https://nlnet.nl/commonsfund/> (the page links to the
active proposal form during the open call window). The fallback
generic submission URL is <https://nlnet.nl/propose/>.

This document is mostly **paste-ready**. The form fields map 1:1 to
the headers below. Three sections still need your voice:

- [ ] **Has anybody contributed to your project?** — pick "none yet"
      or list contributors honestly.
- [ ] **Why do you want to do this work?** — only you can write this.
      Sketch starter prose is offered below; rewrite in your voice.
- [ ] **What was the inspiration for this idea?** — same. The whiteboard
      anecdote works if it's true; replace if not.

Everything else (abstract, topic, comparison, deliverables, technical
challenges, open standards, license) is paste-ready as written.

---

## Project name

Patens

## Project URL

<https://patens.design>

## Repository URL

<https://github.com/alevizio/patens>

## Abstract (max 1200 characters)

> Patens is a browser-native, open-source type design environment under
> the MIT License. Designers draw glyphs with a pressure-sensitive
> pencil, trace strokes to Bézier contours, kern them, audit them
> against a built-in 99-code rule set, and ship OpenType fonts —
> entirely in a browser tab, with no installs and no account.
>
> The differentiator is teaching: a 99-code audit module explains every
> warning in plain language across five surfaces (edit panel, audit
> page, family hub, release pre-flight, home), and one-click "Fix"
> actions resolve ~30 of the codes mechanically. The vocabulary of
> type design — sidebearings, mark anchors, vertical metrics,
> compatibility — becomes legible to designers who haven't shipped a
> typeface before.
>
> The project is browser-native: every project lives in IndexedDB on
> the user's machine; nothing leaves unless they choose to export
> (OTF, WOFF2, TTF, UFO, .font.json, designer bundle) or upload to an
> optional cloud-share path. WCAG 2.0 + 2.1 + 2.2 A/AA via axe-core in
> CI across 31 routes and 5 modals.

## How much funding are you requesting?

€20,000 (within the Commons typical range; adjust based on the scope
you commit to)

## Explain the topic of your activities (max 2000 characters)

> Patens addresses three gaps in the 2026 type-design tooling
> landscape. First, the high-end tools (FontLab €499, Glyphs €300,
> RoboFont €400) gate professional-grade font design behind macOS-only
> + payment walls — students, hobbyists, and designers in regions
> where the local salary won't sustain €300 software are simply not
> served. Second, the free browser-based tools that exist (Glyphr
> Studio, Fontra, typlr.app, BirdFont, FontForge) are functional but
> teaching-blind: a designer hits a problem the editor catches, sees a
> cryptic warning, and has no path forward unless they already know
> what "ulUnicodeRange flag" means. Third, the multi-script story is
> often deferred to v2 of every tool — Cyrillic and Greek users see
> Latin-built shapes that fight their language, with no guidance on
> the bespoke shapes that need their own design pass.
>
> Patens is teaching-first: the 99-code audit module is the spine.
> Every warning links to a plain-English explanation, the editor
> describes why the rule exists ("uneven x-height alignment gives
> text a wobbly rhythm"), and one-click fixes resolve ~30 of the
> codes mechanically. Six dedicated `/learn/*` tutorials cover the
> canonical type-design workflow at depth.
>
> The funding would let me — currently working on Patens evenings + weekends — commit ~3 months of full-time effort to land
> the v2 milestones: a real Drawn Italic master (vs the current
> slant-axis shear), full Greek lowercase coverage, accessibility
> work for screen-reader users navigating the SVG drawing surface,
> and the bespoke Cyrillic shapes (Я, Ж, Ф) that ship today as
> audit-flagged stubs.

## Have other organisations expressed interest in this work? (max 1000 characters)

> Active outreach in progress to 4 type-design educators identified
> in `docs/research/type-education-landscape.md` as the highest-
> leverage NLnet supporters:
>
> 1. **Erik van Blokland** (Head of program, KABK Type and Media; UFO
>    + WOFF spec co-author). The most-aligned educator in the world
>    for Patens's open-tool + open-spec positioning.
> 2. **Gerry Leonidas** (Professor of Typography, University of
>    Reading; former ATypI President). His Greek-type-design primer
>    is already cited in Patens's open MVP corpus.
> 3. **Frank Adebiaye** (Velvetyne open-source foundry; prolific
>    YouTube type-design educator). Reaches the self-taught audience.
> 4. **Dave Crossland** (Google Fonts open-source program lead).
>    Google Fonts Knowledge Base is a candidate for the next citation
>    corpus expansion.
>
> Pre-conference outreach launched July 1, 2026 per
> `docs/launch/educator-outreach-emails.md`. TypeCon Portland (August
> 6-8, 2026) provides the in-person follow-up window. Letters of
> support are gathered Jul 15-25 for incorporation into the
> application before the August 1 cycle close.

## Compare your own project to existing or historical efforts (max 2000 characters)

> The closest contemporary peers are: Glyphr Studio (MIT, browser,
> hobbyist-flavored; lacks the audit-as-teaching frame), Fontra
> (BSD, browser + Python, Google-backed; variable-fonts focus;
> sophisticated but assumes prior type-design expertise), typlr.app
> (free browser editor; closed source; modern UI but doesn't engage
> the multi-script or teaching layers), BirdFont (GPL desktop,
> donateware; old codebase; respected but feels its age), and
> FontForge (GPL desktop; the classic open-source font editor; the
> historical benchmark, still actively maintained).
>
> Historical efforts: FontStruct (browser, free, modular-grid-only
> approach; introduced a generation of designers to type design but
> doesn't produce shippable typefaces), Metafont (Knuth, 1979;
> parametric type design; conceptually deep but never escaped its
> niche).
>
> Patens fits the gap none of these address: a teaching-first browser
> editor that produces real OpenType output. The audit module is the
> structural differentiator — it's the only browser tool in the list
> where the rules-of-thumb a type-design teacher would explain in
> person are encoded in the software itself.
>
> Patens deliberately won't try to replace FontLab or Glyphs at the
> professional foundry level — those tools win on depth + speed for
> ship-velocity work. Patens is for the in-between: the designer who
> drew a logo, the student learning, the foundry sharing a specimen.

## What are you going to make? (max 3000 characters)

> The funded work covers four concrete v2 deliverables, each a
> closed milestone with a public ship date:
>
> 1. **Drawn Italic master** (est. 5 weeks). A real italic redraws
>    `a e g k v y` etc. as cursive forms rather than slant-transforming
>    the upright. Today, Patens supports an `ital` axis but documents
>    it as "shear of the upright" in the demo's decision log. The
>    funded scope: design the bespoke italic shapes for the demo
>    typeface (StudioGeometric, ~70 glyphs), wire the per-glyph
>    "italic" master toggle in the editor, update the variable-font
>    export pipeline to handle the new master, write the
>    `/learn/italic` tutorial covering the design considerations.
>
> 2. **Full Greek lowercase coverage** (est. 3 weeks). Today, Patens
>    ships 14 Greek uppercase letters as look-alikes; lowercase is
>    deferred as audit-flagged stubs. The funded scope: design the
>    14 lowercase Greek letters (α β γ δ ε ζ η θ ι κ λ μ ν ξ ο π ρ
>    σ τ υ φ χ ψ ω) for the demo typeface, in consultation with at
>    least one Greek-native type designer; remove the
>    flagged-for-review stubs; update the multi-script tutorial.
>
> 3. **Screen-reader accessibility for the drawing surface** (est. 4
>    weeks). The Edit canvas is an SVG with pointer handlers — fully
>    inaccessible to screen-reader users. The funded scope: design
>    + implement an alternative keyboard-driven editing interface
>    that exposes the contour shape, control points, and
>    sidebearings via accessible primitives; verify with at least
>    two screen-reader users; document the keyboard-editing
>    workflow in `/learn/accessibility`.
>
> 4. **Bespoke Cyrillic shapes** (est. 1 week). Я, Ж, Ф today ship as
>    stubs flagged for review. The funded scope: design these three
>    glyphs to fit StudioGeometric's character, document the design
>    decisions, remove the audit flags.
>
> All deliverables ship under the existing MIT License to the public
> repository. Each closes with: a tagged release, an entry in
> CHANGELOG.md, an updated `/learn/*` tutorial, and the source
> committed publicly on the day of completion.

## Has anybody contributed to your project? (max 1000 characters)

> List any prior contributors. If none yet (likely): "Patens has been
> developed by a single maintainer to date. The public launch is
> targeted for TypeCon Portland (August 2026), which is expected to
> bring the first external contributors. The repository already has
> a complete contributor onboarding pipeline (CONTRIBUTING.md,
> ARCHITECTURE.md, AGENTS.md, MAINTAINERS.md, DESIGN_PHILOSOPHY.md,
> a Devcontainer for one-click Codespaces setup, comprehensive test
> suites + CI), so adoption is unblocked."

## Why do you want to do this work? (max 1500 characters)

> Insert your personal motivation here. Sketch:
>
> > I've watched students drop type design when they hit FontLab's
> > price tag — and even motivated learners get stuck on cryptic
> > warnings that desktop tools assume away. Patens is the editor I
> > wish I'd had when I was learning the craft.
> >
> > The teaching layer matters specifically because type design's
> > vocabulary is dense and the feedback loop is slow: a font ships,
> > and only after a designer uses it in real work do the structural
> > problems surface. Catching those issues at design time, with a
> > plain-English explanation rather than a four-letter error code,
> > is the leverage point. The audit module's 99 codes are 94
> > opportunities to teach.
> >
> > Beyond pedagogy, the open-source MIT licensing is a values
> > commitment — type design knowledge has historically been gated
> > behind expensive software and expensive education. Patens is
> > my contribution to opening it.

## What are significant technical challenges you expect to solve?

> Possible answers — pick 2-3 to expand on:
>
> - Designing a keyboard-driven editing interface that's coherent
>   for screen-reader users without compromising the spatial editing
>   model sighted users expect.
> - The Drawn Italic master shape decisions for a geometric
>   typeface (most italic-design tutorials assume humanist
>   foundations).
> - Greek lowercase design in collaboration with a native-script
>   designer — the cultural + typographic literacy work that no
>   "AI assistant" can replicate.
> - Maintaining the in-browser-only constraint for these new
>   features (no new server-side dependencies; the OTF for the
>   italic master must build entirely client-side).

## Open standards used

- OpenType (registered axes wght, wdth, slnt, ital, opsz; the GSUB,
  GPOS, kern, name, OS/2 tables).
- WCAG 2.0 + 2.1 + 2.2 A/AA.
- UFO 3 (Unified Font Object) for tool interop.
- WOFF2 (W3C standard).
- COLR / CPAL (color font tables).
- CycloneDX 1.5 (SBOM, in CI).
- HarfBuzz.js (WebAssembly).
- IndexedDB, Web Workers, Service Worker, WebAssembly (all W3C).

## License

MIT (already established; will not change). Patents grant: not
needed for this work; no patent surface. Trademark: pending USPTO
filing for the "Patens" wordmark in class 9 (separate from MIT code
licensing, prevents hostile-fork name confusion).

## What was the inspiration for this idea?

> Mention specific moments / projects / people that shaped Patens.
> Sketch:
>
> > Watching students bounce off FontLab during a type-design class
> > I audited in 2024. The instructor's whiteboard sketches of
> > anatomy + spacing rules were better than the editor's tooltips.
> > Patens is the attempt to encode those whiteboard rules into the
> > software.

---

## Submission notes (do not paste — for you)

- NLnet evaluation cycles every 2 months; check current deadline at
  <https://nlnet.nl/news/> and post within the window.
- Average evaluation time: ~6 weeks from submission to decision.
- Funding is paid in milestone tranches against deliverables (~50%
  upfront, ~50% on completion is common).
- NLnet asks for monthly progress updates during the funded period.
- If accepted, the project gets a public announcement on
  <https://nlnet.nl/project/> — useful press signal alongside Show HN.
- If rejected, the feedback is detailed + the project can re-apply
  next cycle with adjustments.
- No equity, no IP transfer, no obligation to use specific tools.
