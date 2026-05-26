# Contributors

Patens is open source under the MIT License. Everyone who's
contributed to it — code, docs, audit codes, translations, bug
reports with great repros, design feedback — gets credit here.

If you've contributed and aren't listed, that's a bug. Open an issue
or PR and I'll fix it.

---

## Maintainers

- [@alevizio](https://github.com/alevizio) — Alejandro Vizio. Creator,
  current sole maintainer. Drew every glyph in the demo, wrote every
  audit code, built every editor surface. See `MAINTAINERS.md` for
  scope + SLA.

---

## Code contributors

<!--
  This list is generated at first launch from the git shortlog and
  maintained by hand thereafter. The simplest update pattern when a
  contributor's PR merges:

    git shortlog -sn HEAD --since="last year"

  Then add the new name + GitHub handle alphabetically below.

  If you'd prefer the All-Contributors-bot pattern (emoji-labelled
  contribution types, auto-table generation), the migration is:

    npx all-contributors-cli init

  It edits this file in place and adds the bot to any PR that ends
  with the trigger phrase. The maintainer hasn't enabled it yet —
  preference is to keep the file flat + readable until 10+
  contributors makes the bot worth it.
-->

*Awaiting the first external code contributor — your PR could land
this section here.*

---

## Acknowledgements

People + projects who shaped Patens without committing code directly.

### Type design

The vocabulary + the rules-of-thumb encoded into the audit module
come from the type-design community as a whole. The 94-code list is
calibrated against the educational tradition that runs through
foundries and courses I'm grateful to have audited or read:

- The teachers whose whiteboard sketches taught the spacing rules,
  the cap-height alignment intuitions, the kerning-class shapes that
  became `kerning-no-classes` + `sidebearing-class-drift-*` + the
  rest of the GPOS-tier audit codes.
- The Cyrillic + Greek type designers whose published work
  documented what bespoke-shape design looks like — references for
  the planned `Drawn Italic master` and `Full Greek lowercase`
  milestones.
- Every type designer who's posted a "here's why this letter looks
  wrong" thread on Bluesky / TypeDrawers. The audit module's
  teaching tone owes a lot to that style of public-craft thinking.

### Code

- The maintainers of the underlying libraries — see `humans.txt` for
  the full stack. Patens wouldn't exist without `opentype.js`,
  HarfBuzz.js, fontTools, Pyodide, SvelteKit, and the rest.

### Tooling

- The Linux Foundation's Agentic AI Foundation for the AGENTS.md
  convention.
- OpenSSF for the Best Practices badge framework + Scorecard.
- NLnet for the NGI Zero Commons funding stream that's enabled
  open-source design tooling at this depth.

### AI assistants

Patens was substantially built with the assistance of AI coding tools
(Claude Code, Cursor, Copilot — read `AGENTS.md` for the conventions).
The 2026 OSS norm is to preserve `Co-Authored-By:` trailers on
AI-assisted commits, and the commit history reflects this. The human
maintainer remains responsible for every shipped line — AI suggests,
the human decides.

---

## How to be added

Land a PR. The maintainer reviews + merges + adds your name + GitHub
handle here. If you'd prefer not to be listed publicly, mention that
in the PR description — opt-out is honored.

Last updated: 2026-05-25.
