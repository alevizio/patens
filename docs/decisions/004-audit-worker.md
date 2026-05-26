# ADR-004 — Audit module runs in a Web Worker

**Status**: Accepted (2026-05)

## Context

The audit module runs three passes: `auditProject` (per-glyph),
`auditCompatibility` (cross-master), `preflightProject` (release).
Each pass scans every glyph + every kerning pair + every metadata
field. For the demo project (162 glyphs) the synthetic benchmark
measures ~1ms total; at 500 glyphs ~2.6ms; at 2000 glyphs (large
commercial family) somewhere in the 10-20ms range with the O(n²)
contour self-intersection check the dominant cost.

The audit re-runs on **every project mutation** in the editor —
every point drag, every kerning value change, every sidebearing
nudge. With Svelte 5 + the reactive store, that can fire 60×/second
during a drag.

At 1-2ms per audit, the main thread budget is fine. At 20ms+ per
audit, INP starts climbing — drag-frame latency becomes visible.

We profile-confirmed (see `src/lib/audit/audit.bench.test.ts`) that
small projects are safe today, but the algorithm scales with
project complexity, not project size. A 500-glyph project with
complex outlines + many masters could easily push past the INP
threshold.

Alternatives considered:

1. **Keep audit synchronous on main thread** — fine until it isn't.
   The failure mode is invisible (slow editor on big projects) and
   the fix would require a future emergency refactor.
2. **Debounce audit aggressively** — masks symptoms but the audit
   output is part of the editor's reactive feedback; debouncing past
   ~100ms makes the audit feel stale.
3. **Workerize** — move the three passes off the main thread. The
   audit functions are pure (no DOM access, no browser APIs), so
   they run unmodified in a Web Worker.

## Decision

The audit module runs in a dedicated Web Worker at
`src/lib/audit/audit-worker.ts`. The main thread interacts via a
Svelte 5 `$state` class at `src/lib/stores/audit.svelte.ts`:

```
main thread                          worker
──────────                           ──────
auditStore.request(p)                onmessage({project})
  └─ postMessage({project,seq})  →     auditProject(p)
                                       auditCompatibility(p)
                                       preflightProject(p)
                       ← postMessage({seq, perGlyph, ...})
  onmessage → store.set*
```

Three design properties:

- **Stale-response guard via monotonic `seq`** — every request bumps
  a counter; responses with a stale seq are dropped. So if the user
  mutates the project mid-audit, the slow audit on old state never
  clobbers the fresh data.
- **Debounced request (80ms default)** — rapid mutations don't flood
  the worker; the latest project state always wins.
- **Graceful sync fallback** — if `new Worker()` throws (CSP,
  no-Worker environment), the store falls back to running the
  audit synchronously. Callers see no behavioral change.

The sync functions (`auditProject`, `auditCompatibility`,
`preflightProject`) remain exported from `$lib/font/audit` and are
used unchanged by data-pipeline code that genuinely runs once-and-
discards (export, design-md generation, the CLI). Only the UI store
goes through the worker.

## Consequences

**Positive**:
- Main thread stays clear during audit runs. INP win, particularly
  for drag interactions where mutations fire at 60Hz.
- Future-proof — large commercial families won't degrade editor
  responsiveness.
- The worker is a reusable pattern. Future heavy compute
  (kerning auto-suggest at scale, compatibility analysis across
  many masters) can adopt the same shape.
- Tested in isolation. `src/lib/sw/upgrade.test.ts` proves the
  pattern works for the SW too; the audit pattern is parallel.

**Negative / constraint**:
- The audit results are now `$state` set asynchronously, not
  `$derived` synchronously. Callers had to be updated:
  - `/audit/+page.svelte`: was `$derived(auditProject(p))`, now
    `$effect(() => auditStore.request(p))` + `$derived(auditStore.perGlyph)`.
  - `/release/+page.svelte`: same shape.
  - `src/routes/project/[id]/edit/+page.svelte`: still uses sync
    auditCompatibility (small, scoped, called once).
- Project state crosses the worker boundary via postMessage; Svelte
  5 `$state` proxies aren't structured-cloneable. Workaround:
  `$state.snapshot(project)` before posting. A subtle bug we hit
  during the migration — recorded here so the next developer who
  workerizes anything else knows about it.

**Commits us to**:
- The audit worker is part of the bundle. Vite emits it as a
  separate chunk under `_app/immutable/workers/`; the SW + CI bundle-
  budget gate need to account for it.
- The `seq` protocol is part of the contract. Any worker-side
  optimization (caching, partial re-run) has to preserve seq
  semantics.

## Related

- ADR-003 (SSR at root) — surfaced the `$state.snapshot()`
  postMessage requirement.
- Commit `71f1399` — the workerization arc.
- Commit `23ddd00` — the benchmark + reality check (audit is fast
  even at 500 glyphs; the worker is future-proofing, not a current
  catastrophe).
