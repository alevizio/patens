# Roadmap

What's deliberately deferred from `v1.0.0-beta` and why.

## M3 — Cloud + real sharing

The share-link recipient story is browser-local in v1: `/share/{id}` only renders for visitors whose IndexedDB has the project, i.e. the originator. The recovery flow ([`+error.svelte`](./src/routes/+error.svelte) when `path.startsWith('/share/')`) explains the constraint and offers `/share/demo` + the `.font.json` import as workarounds.

To make share URLs work for arbitrary recipients we need:

- **Cloud project storage.** PartyKit, Supabase, or similar. A `projects` table keyed by UUID, with the project blob as JSON.
- **Hydration in the share-page loader.** `src/routes/share/[id]/+page.ts` becomes async-server: try IndexedDB first (cheap, local), fall back to the network if the project isn't local. Cached aggressively so repeat visits don't re-fetch.
- **Auth (optional but likely).** If projects are uploaded, visibility rules matter. Public-by-default-with-unguessable-id might be enough for v1 (the share URL is the capability).
- **Upload affordance.** Today's "Copy share link" button doesn't upload; it just produces the URL. With cloud storage, the click should also upload the current project state.

Estimated effort: 2-3 days of focused work.

## Per-project OG image

Cloud's twin problem. Social-media bots that fetch a share URL to render a link preview can't run JS; they can't see project data that lives in the originator's IndexedDB. The OG image meta tag points at a generic Font Studio brand image.

Resolutions, in order of complexity:

1. **Static OG with familyName via URL param.** Server-render an OG image using the project metadata embedded in the URL (familyName, designer). Doesn't show the actual font, but at least the link preview says the right name.
2. **OG generated at upload time** (depends on cloud storage). When the project uploads, server renders a real OG image with the font's own glyphs.
3. **Edge function on first OG request** (depends on cloud storage). Lazy generation — only renders the OG when first requested by a bot. Cached.

Estimated effort: 1 day on top of M3 cloud.

## Account system

If cloud storage lands, account boundaries become relevant (deletes, quotas, sharing controls). v1 doesn't have any of this; everything is "if you can guess the URL you can see it."

- Sign-in via OAuth (GitHub, Google) — no email/password.
- Per-account project list page (separate from the home page's IndexedDB list).
- Project visibility: private / unlisted (link-only) / public.

Estimated effort: 3-5 days.

## Editor — features we haven't drawn

Bullets, not estimates — each is its own discovery + design + build cycle:

- **Real curve-fitting on existing geometric glyphs.** The polygon primitives that built the demo letters are honest but rough. Replacing them with hand-tuned Béziers (or with a curve-fit pass over the polygon data) would lift visual quality across the whole demo.
- **Drawn Italic master** (vs the slant-axis shear). A real italic redraws specific glyphs (a, e, g especially) rather than transforming the upright. Marked as future work in the demo's decision log.
- **Cyrillic / Greek glyph sets.** The demo is Latin-only by deliberate scope. Adding even a starter Cyrillic would make it a multi-script demo and substantially widen the audience.
- **AI features.** "Explain this audit code in plain language" with an LLM; "Suggest a kerning value for this pair" via a learned model. Both need an API key + cost handling.

## Editor — features we've made progress on but haven't shipped

- **Family-wide kerning propagation.** Today each sibling kerns independently. A family-level kerning store with per-sibling overrides would match how foundries actually work.
- **Multi-master variation explorer.** Designspace page lists axes + masters; doesn't yet have a "drag through the design space" surface.

## Polish we deliberately deferred

- **Per-device responsive test.** I (the maintainer) audited the share page at common breakpoints in CSS, but haven't tested on a real iPhone / iPad. PRs reporting issues with screenshots welcome.
- **Real bundle-size budgets in CI.** Bundle analyzer ships as `pnpm run analyze`; wiring a `bundlewatch` or similar into CI to fail PRs that grow the bundle past a threshold is future work.
- **Accessibility audit beyond focus traps + accordion ARIA.** axe-core runs in Playwright E2E for the home + welcome + tab-nav routes; full audit across every route + every modal is future work.

## Anti-goals

The things we explicitly don't want:

- **A FontLab / Glyphs competitor.** Font Studio is a specific bet: browser-native, single-designer, share-friendly. Trying to match desktop-grade type-design tools feature-for-feature would dilute the bet.
- **A multi-user collaborative editor.** Type design is mostly solo work; the collaboration story we want is async share + comment, not Figma-style co-editing.
- **An npm package.** This is an app, not a library. The reusable bits (audit module, opentype.js wrapper) might one day ship as packages, but not by default.
