# Phase C — Yjs store-binding sprint plan

The big internal refactor that swaps `projectStore.project` from a
plain `$state<Project>` into a Y.Doc-backed reactive view. Once this
lands, Phase A→B foundations from the 2026-05-20→21 session become a
live multi-user (Option B) editor.

Read alongside [`next-90-days.md`](./next-90-days.md) and
[`roadmap.md`](./roadmap.md) §12 for the broader context.

---

## State at sprint start

Three foundation pieces shipped on `main` from the previous session:

| Commit | Module | Purpose |
| --- | --- | --- |
| `2ea8765` | `src/lib/sync/yjs-schema.ts` | Lossless Project ↔ Y.Doc round-trip |
| `bb0f1e7` | `src/lib/sync/yjs-persistence.ts` | y-indexeddb binding + room naming |
| `ca24ab0` | `src/lib/sync/yjs-network.ts` + `partykit/font-studio.ts` | y-partykit client + Cloudflare Workers server |
| `e3d9130` | `src/routes/dev/sync-playground/+page.svelte` | End-to-end harness (two-tab sync demo) |

What's *not* on `main` and is the sprint:

- The actual swap of `projectStore` internals to use a Y.Doc
- A read-only share-link UI on the project header
- The PartyKit Cloudflare Workers deploy + the share-link URL shape

---

## Sprint shape — 5 to 7 days, in this order

### Day 1 — Y.Doc-backed store internals (additive, no behavioural change)

Goal: introduce the Y.Doc inside `ProjectStore` **without changing
any public API**. Every existing component continues to read
`projectStore.project` and call mutator methods exactly the same.

1. Add a private `#doc: Y.Doc | null = null` field to `ProjectStore`.
2. In `load(project)`, populate `#doc` via `projectToYDoc(project)`.
3. Add a private `#refreshFromDoc()` that calls `yDocToProject(#doc)`
   and writes the result to the existing `project = $state(...)`.
4. Subscribe `#doc.on('update', this.#refreshFromDoc)` so any future
   Y.Doc edit triggers the existing `$state` setter (which Svelte
   already watches).
5. **Don't change any mutator method yet.** Existing methods like
   `addPalette` still do `this.project = { ... }`; they don't touch
   `#doc`. This keeps the binding additive: `#doc` mirrors `project`
   passively.

Why: lands the new field + the refresh plumbing without changing
behaviour. Easy to back out if Y.Doc memory footprint surprises us.

End-of-day: full test suite + a11y pass; the `dev/sync-playground`
still works; the editor still works exactly as before.

### Day 2 — Migrate one mutator end-to-end

Pick the *smallest mutator that involves a Y.Array*:
`upsertKerningPair(pair)`. Replace its implementation with:

```ts
upsertKerningPair(pair: KerningPair) {
  if (!this.project || !this.#doc) return;
  if (this.project.locked) return;
  this.#doc.transact(() => {
    const arr = this.#doc!.getMap('project').get('kerning') as Y.Array<KerningPair>;
    const i = arr.toArray().findIndex(p => p.left === pair.left && p.right === pair.right);
    if (pair.value === 0) {
      if (i >= 0) arr.delete(i, 1);
    } else if (i >= 0) {
      arr.delete(i, 1);
      arr.insert(i, [pair]);
    } else {
      arr.insert(arr.length, [pair]);
    }
  });
  // No more `this.project = { ... }` — the doc update event will fire
  // `#refreshFromDoc` which mutates `project` via $state.
  this.touch();
}
```

End-of-day: kerning edits flow through the Y.Doc. Existing tests
that exercise `upsertKerningPair` should still pass — the result is
the same, the path is different.

### Day 3 — Migrate the remaining mutators

Same pattern, ~20 methods. Group by data shape:

- **Y.Array operations** (kerning, classes, sidebearingClasses,
  axes, masters, instances, palettes) — done same as Day 2.
- **Y.Map operations** (glyphs by codepoint) — `updateGlyph`,
  `addColorLayer`, `removeColorLayer`, `reorderColorLayers` use
  `glyphsMap.get(String(cp))` + a transaction.
- **Root-scalar mutations** (`updateMetadata`, `updateFeatures`,
  `setName`, etc.) — `root.set('metadata', { ... })` inside a
  transaction.

This is the bulk of the sprint. ~3-4 hours of repetitive but
mechanical work. Each mutator gets its own unit test that exercises
the new transactional path.

### Day 4 — Wire IndexedDB persistence

Once mutators flow through `#doc`, the persistence layer lights up:

1. In `load(project)`, after `projectToYDoc`, call
   `bindIndexedDb(this.#doc, project.id)`.
2. `await persistence.whenSynced` — if existing IndexedDB state for
   this project exists, it merges into the freshly-created Y.Doc.
   This is the moment the user's local edits survive a reload.
3. On `unload()` / route navigation away, call `persistence.destroy()`.

End-of-day: the editor persists state via Yjs / IndexedDB, not via
the existing JSON serialiser. The old `saveProject(project)` path in
`src/lib/font/project.ts` becomes vestigial — flag for removal in a
later commit.

**Migration concern:** existing users have projects stored in the
old IndexedDB format. The first-load path must read the legacy state
and seed it into the new Y.Doc-backed format. A one-time migration
helper in `yjs-schema.ts` handles this:

```ts
export const migrateLegacyProject = async (
  legacyProject: Project,
  projectId: string
): Promise<Y.Doc> => {
  const doc = projectToYDoc(legacyProject);
  // bindIndexedDb under the new keying writes the doc to a fresh
  // IndexedDB DB. The legacy DB is left intact for one release as
  // a safety net.
  const p = bindIndexedDb(doc, projectId);
  if (p) await p.whenSynced;
  return doc;
};
```

### Day 5 — PartyKit deploy + share-link UI

1. `pnpm dlx partykit deploy` — uses the existing `partykit.json` +
   `partykit/font-studio.ts`. The user runs this once; produces a
   `*.partykit.dev` URL.
2. Set `PUBLIC_PARTYKIT_HOST` env var in Vercel pointing at the
   deployed URL.
3. In the store's `load(project)`, after persistence binds, also
   call `connectToPartyKit(this.#doc, project.id, { host: env.PUBLIC_PARTYKIT_HOST })`.
4. Add a "Share" button to the project header that copies a URL of
   the form `/share/<projectId>`.
5. Add a new route `/share/[id]/+page.svelte` that mounts a
   read-only viewer: Y.Doc connects to the same PartyKit room, but
   the editor canvas + mutators are gated behind a `readOnly` flag.
6. The room-name token (the project ID slug) is the access control
   for Option B. Anyone with the link can view; no writes possible
   without owner auth (Option A, M2).

End-of-day (or day 6-7): a real two-machine Figma-style share-link
working end-to-end.

---

## Risks + rollback

- **Memory footprint.** Y.Doc keeps full edit history. For a large
  project edited daily for years, this can balloon. Mitigation:
  periodic server-side compaction snapshots (the PartyKit server's
  `persist: { mode: 'snapshot' }` mode handles this automatically).
  Monitor via DevTools IndexedDB inspector during the sprint.
- **Lost mutator.** Easy to miss a mutator path during migration.
  The existing audit test suite (~360 vitest tests) catches most;
  add a "smoke test that every mutator hits the doc" before Day 4.
- **Y.Doc race conditions.** Multiple mutators in the same tick can
  produce surprising Y.Array ordering. Mitigation: use
  `doc.transact(() => ...)` for every mutator (already in the day-2
  template).
- **Network unavailable.** PartyKit deploy fails / Cloudflare outage
  — the IndexedDB binding still works, edits queue locally, sync
  resumes when network returns. This is the Yjs guarantee.

**Rollback path**: revert the commits in reverse order. Days 1-4
are additive; day 5 is the user-visible flip. If anything fails at
day 5, the share-link route can be gated behind a feature flag
without rolling back the days 1-4 internals.

---

## Open questions answered

Per `next-90-days.md`, two of the four pending questions are now
relevant for this sprint:

- **Auth provider** — Supabase magic links, free tier. Comes online
  in M2 (Option A — read-write multiplayer). M1 of Phase C (Option
  B) uses room-token access control only.
- **ICP confirmation** — per the user (2026-05-21), Phase C is
  greenlit as a positioning play. Pricing-strategy evolution deferred
  to post-launch.

---

## Definition of done

- `projectStore.project` reads come from a Y.Doc; no behavioural
  change for monochrome editing.
- IndexedDB replaces the legacy save path; a fresh load reconstructs
  state from the IndexedDB-stored Y.Doc.
- Two designers in two browsers can both load `/share/<id>` and see
  the same project state. Edits in the owner's browser propagate to
  the viewer in real time.
- All 360+ existing vitest tests + playwright a11y suite green.
- Documentation updated: `roadmap.md` §12 marks Option D + B as
  shipped; `next-90-days.md` updates Phase C status to ✅.
