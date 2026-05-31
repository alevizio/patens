# Awesome-list PR drafts

Three PRs ready to submit. Each is a tiny one-line addition + the
contributor-guidelines steps that maintainers like to see.

**Pre-flight checklist** (do once before submitting any of them):
- [ ] Patens README header has a one-paragraph description + a screenshot
- [ ] README lists license + maintenance status (active, MIT)
- [ ] Repo has more than 50 stars (most awesome-lists require this)
- [ ] No broken links from the README

Stars matter more than maintainers admit. If the repo's under 50 stars,
post Show HN + r/typography first to bump the count, then submit PRs.

---

## PR 1 — TheComputerM/awesome-svelte

**Repo**: https://github.com/TheComputerM/awesome-svelte
**File to edit**: `README.md`
**Section**: most awesome-svelte lists have a "Showcase" or "Real-world
apps" section. If TheComputerM/awesome-svelte doesn't yet, propose
adding Patens under whichever section best fits ("Apps" or "Examples").

**PR title**:
```
Add Patens (browser-native open-source type design editor)
```

**Insertion** (alphabetical within the section):
```markdown
- [Patens](https://patens.design) — Open-source type design tool with a built-in 102-code audit module that teaches as you draw. Sketch glyphs, trace to Bézier, kern, ship OpenType. SvelteKit 2 + Svelte 5 runes, IndexedDB, opentype.js, HarfBuzz.js. MIT licensed. ([source](https://github.com/alevizio/patens))
```

**PR description**:
```markdown
Adds Patens — a browser-native, MIT-licensed type design editor built on
SvelteKit 2 + Svelte 5 runes.

Why it fits this list:
- Production app (v1.5.2 at https://patens.design)
- Real Svelte 5 patterns in production: $state classes for stores,
  $derived for the audit pipeline, Web Worker integration with
  $state.snapshot() across the worker boundary, $effect for IDB
  hydration
- Open source MIT, public roadmap, public issues
- A11y-tested across 31 routes / modals via axe-core in CI

Happy to adjust the description or section if there's a better fit.
```

---

## PR 2 — janosh/awesome-sveltekit

**Repo**: https://github.com/janosh/awesome-sveltekit
**File to edit**: `README.md` (or `sites.yml` if the maintainer uses a
data-driven build — check before editing)
**Section**: this list specifically wants real-world SvelteKit deployments
under "Sites" or "Apps".

**PR title**:
```
Add Patens
```

**Insertion** (alphabetical within the section):

YAML form (if `sites.yml` exists):
```yaml
- title: Patens
  url: https://patens.design
  source: https://github.com/alevizio/patens
  description: Open-source type design tool with a built-in 102-code
    audit module that teaches as you draw — every contour, metric,
    and kern pair gets checked with plain-English fixes. Sketch,
    trace to Bézier, ship OpenType. No installs. SvelteKit 2 + Svelte
    5 runes, IndexedDB, Web Workers, opentype.js, HarfBuzz.js (WASM).
    MIT licensed.
  tags:
    - design
    - tools
    - typography
    - open-source
```

Markdown form (if `README.md` is direct):
```markdown
- [Patens](https://patens.design) — Open-source type design tool that
  teaches as you draw. 102-code audit module in a Web Worker, family-
  wide kerning at export, SvelteKit 2 + Svelte 5 runes, global Cmd-K,
  MIT. ([source](https://github.com/alevizio/patens))
```

**PR description**:
```markdown
Adds Patens — production SvelteKit 2 deployment at https://patens.design.

Quick fact-sheet for review:
- Stack: SvelteKit 2, Svelte 5 runes, Tailwind v4, TypeScript strict
- Stores: Svelte 5 \`$state\` classes (no legacy store API)
- Workers: audit module in a Web Worker with $state.snapshot() over
  the postMessage boundary
- IndexedDB via idb-keyval with getMany() batching
- Real-world Svelte 5 patterns in production
- Public source + roadmap + issues
- License: MIT
- Active maintenance, single maintainer

Happy to revise the description or move to a different section.
```

---

## PR 3 — goabstract/Awesome-Design-Tools

**Repo**: https://github.com/goabstract/Awesome-Design-Tools
**File to edit**: `README.md`
**Section**: "Typography" — currently lists ~10-15 type tools spanning
desktop apps and online tools.

**PR title**:
```
Add Patens to Typography section
```

**Insertion** (alphabetical within Typography):
```markdown
- [Patens](https://patens.design) - Open-source type design tool with a built-in 102-code audit module that teaches as you draw. Sketch glyphs, trace to Bézier, kern, ship OpenType. Browser-native, no installs. MIT licensed.
```

**PR description**:
```markdown
Adds Patens — a browser-native, MIT-licensed type design editor that
fits the Typography section.

Differentiator vs other browser-based type tools already in the list
(Glyphr Studio, Fontra, typlr.app): Patens is the only one designed as
a teaching tool — a built-in 102-code audit module explains what's wrong
with a font and offers one-click fixes for ~30 of those codes.

Quick check vs the contribution guidelines:
- Free / open source: yes (MIT)
- Mature / stable: production at v1.5.2
- Useful for designers: targets the in-between (sketch → ship-able font)
- Single line entry, alphabetically placed

Open to adjusting if there's a better category or wording.
```

---

## Submission strategy

**Order**: 
1. awesome-svelte first (likely smallest list, fastest review)
2. awesome-sveltekit second (active maintainer, often merges quickly)
3. Awesome-Design-Tools third (most-watched list, biggest traffic
   bump, but slowest review — janosh's typically merges in ~24h,
   goabstract's can take weeks)

**Timing**: submit all three the **same day**, ideally Tuesday–Thursday
US morning. Star bumps from each merge compound. Don't submit on a
Friday or weekend — maintainers tend not to triage then.

**Follow-up**: if no response in 7 days, polite bump comment on the PR.
Don't ping the maintainer's email or socials.

**Don't game it**: no star-asks, no fake accounts. The lists are
human-curated and reviewers spot manipulation quickly.

---

## Auto-prep (run before submitting)

```sh
# Verify the README still scans well
gh repo view alevizio/patens

# Check current star count
gh api repos/alevizio/patens --jq .stargazers_count

# Fork the awesome lists into your account
gh repo fork TheComputerM/awesome-svelte --clone=false
gh repo fork janosh/awesome-sveltekit --clone=false
gh repo fork goabstract/Awesome-Design-Tools --clone=false
```

The PRs themselves can be authored from the GitHub web editor — quicker
than cloning for a one-line change.
