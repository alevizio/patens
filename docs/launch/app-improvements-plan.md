# App improvements + nice-to-haves — Plan & day estimates

Companion to `docs/launch/typecon-plan.md`. This is the inward-facing roadmap:
what's left to build, polish, or fix between now (2026-05-25) and TypeCon
Portland (Aug 6–8).

**Unit**: 1 day = ~5 hours of focused solo-dev work. Estimates are honest but
soft — first 50% takes the predicted time, the last 20% takes the same again.
Treat as ranges, not contracts.

**Runway**: 10 weeks to TypeCon = ~50 working days at 5/wk, or ~25 working days
at the realistic 2.5/wk pace once you account for life. The plan below totals
~42 days at full-throttle. Aim to ship P0 + P1, sprinkle P2, defer P3.

---

## P0 — Block launch (must ship before Show HN)

These are the ones that affect the *trust* of the launch — a press kit,
clean a11y, no flakey known-issues. Total: **~5 days.**

### a11y sweep (2.5d)
- Add tests for `/compare`, `/learn/first-font`, `/learn/audit-codes` (0.5d — partially in flight, e2e/a11y.spec.ts edited)
- Add tests for modals while OPEN: SettingsDialog, ShortcutsDialog, StorageDialog, CreateFontDialog, WelcomeDialog (1d)
- Add `/family/[id]` to the suite (0.25d)
- Fix whatever violations the above surface (0.75d budget — actual depends)

### Launch artifacts (1d)
- `/press` page with downloadable bundle (logos, screenshots, factsheet) — 0.5d
- `/llms-full.txt` — concatenate `/learn/*` + `/compare` + `/help` + `/about` — 0.25d
- `/privacy` + `/security` pages (1 page each, plain English) — 0.25d
- Year-in-title pass on landing routes — 0.25d

### Bug fixes + known-issue closure (1d)
- Root-cause `tab-nav.spec.ts` Designspace flake (currently patched with `networkidle` wait) — 0.5d
- Bundle review via `pnpm analyze`, identify anything new/large — 0.5d

### Final pre-launch QA (0.5d)
- Lighthouse audit on production, capture before/after
- Cold-load profile on the three primary routes (home, share/demo, edit)
- Spot-check on a real iPhone + iPad (you'll need physical devices)

---

## P1 — Strongly improves launch (do if there's time)

These would land the launch with more substance — additional `/learn/*`
content, deeper polish on the audit module surfaces, manual a11y beyond
axe. Total: **~6 days.**

### Content (1.5d)
- `/learn/kerning` — the philosophy + the editor's class system. ~0.5d
- `/learn/variable-fonts` — masters, axes, instances, the 2D explorer. ~0.5d
- `/learn/opentype-features` — `.ss01`, `.smcp`, `f_i`, the auto-detect rules. ~0.5d

### Editor polish (2d)
- Family-wide kerning propagation — sibling overrides over parent table. ~1d
- Audit "Fix" action discoverability — make the inline fix buttons more obvious without making them louder. ~0.5d
- Welcome dialog rework — first-time experience is currently a non-blocking strip; consider whether the lead message is actually what someone needs in their first 10s. ~0.5d

### Manual a11y (2d)
- Keyboard-only nav walkthrough — open editor, tab through every interactive control, fix focus traps + tab-order issues. ~1d
- VoiceOver pass on home + editor + audit page — fix ARIA gaps axe missed. ~1d

### Demo capture (0.5d)
- Storyboard the 30-second demo GIF — what to show, in what order. Then you record. (My prep, your shoot.)

---

## P2 — Post-launch nice-to-haves (start if P0+P1 ship early)

Real product depth. Each is its own self-contained ship-or-don't decision.
Total: **~10 days.**

### Editor depth (5d)
- Multi-master variation explorer drag UI — the "drag through design space" surface noted as deferred. ~2d
- Re-share versioning (per-share upload history + deep-link to a specific version). ~1.5d
- Self-service delete API for shares (key signed by the originator's IndexedDB project record). ~0.5d
- Bespoke Cyrillic shapes (Я Ж Ф). ~0.5d
- Real curve-fitting pass over the demo's geometric glyphs (replace polygon primitives with hand-tuned Béziers — visible quality lift across the demo). ~1.5d

### Polish + workflow (3d)
- Global glyph search (Cmd-K with character/name/U+ codepoint matching, already partially there in CommandPalette.svelte). ~1d
- Bulk select + bulk edit in glyph browser (mass-sidebearing, mass-rename, mass-delete). ~1d
- Drag-to-reorder glyphs in custom sets. ~0.5d
- Per-device responsive sweep (real iPhone/iPad audit, fixes). ~0.5d

### Codebase health (2d)
- Lint baseline ratchet 5 → 0. ~0.5d
- TypeScript strict-mode tightening (remove remaining `any` patterns if any). ~0.5d
- Service worker upgrade-path test — simulate "user on v1.4.0 visits v1.5.x" cache transition. ~1d

---

## P3 — Bigger bets, post-launch / v2

Each of these is a 3+ day commitment. None are launch-blocking; some are
v1.6.x→v2.x candidates. Total: **~21 days.**

### Account system (5d)
- OAuth (GitHub, Google) — no email/password. ~1.5d
- Per-account project list page (separate from IndexedDB-backed home). ~1d
- Visibility controls (private / unlisted / public). ~1.5d
- Quotas + delete flow. ~1d

### Drawn type expansion (7d)
- Drawn Italic master — real italic redraws a, e, g, etc., not a slant axis. ~5d
- Full Greek lowercase set (14+ glyphs). ~2d

### AI features (4.5d)
- "Explain this audit code" via LLM — Claude API integration + cost guard + UX. ~1.5d
- Kerning-suggest via learned model — either Anthropic API or a local distilled model. ~3d
  - Conflicts with "never lead with AI features" positioning — keep these *opt-in inside the editor*, never in marketing.

### i18n (5d)
- Currently English-only. Setting up message extraction + Svelte i18n + translation pipeline. Probably defer to v2.0.

---

## Things deliberately NOT planned

- **Mobile editor** — Patens is desktop-first by design. A touch-first editor is its own product.
- **Real-time collaboration** — single-designer-single-machine is the positioning.
- **Server-side font hosting** — fonts you draw are yours; no Patens-hosted serving tier.
- **PWA push notifications** — no notification story makes sense for a creative tool.

---

## Suggested 10-week sequencing

Aim for one ship-able commit most days. The cadence is the signal.

### Weeks 1–2 (now → June 8) — P0 a11y + launch artifacts
Foundation that everything else lands on. Press kit makes Phase 2 outreach
have something to point at.

### Weeks 3–4 (June 8 → June 22) — P0 finish + P1 content
Land the bug fixes + bundle review. Start the three `/learn/*` posts; they
give Tier 2 outreach something to link to.

### Weeks 5–6 (June 22 → July 6) — P1 polish + manual a11y
Editor polish + family-wide kerning. Manual keyboard + VoiceOver passes.

### Week 7 (July 6 → July 13) — P1 finish + reputation
Pitch Typographica + Alphabettes. dev.to long-form. TypeDrawers thread.
Newsletter set up.

### Weeks 8–9 (July 13 → July 27) — Stretch / buffer
P2 picks if you're ahead. Or use as cushion — launches go off the rails
when there's no slack.

### Week 10 (July 27 → Aug 8) — Launch
Show HN early in week. TypeCon Portland Aug 6–8.

---

## How to use this doc

- The **estimates are rangey**. Treat the day numbers as a *first sketch* —
  pad them mentally by 30% for unknown unknowns.
- The **categorization (P0/P1/P2/P3) is what matters**. If a P2 item starts
  blocking sleep, promote it. If a P0 item turns out to be a half-day fix,
  the rest of the day is yours.
- The **anti-goals at the bottom save more time than estimating well.**
  Saying *no* to mobile-editor and real-time-collab is the highest-leverage
  decision in this plan.

Last updated: 2026-05-25. Revise after each phase ends.
