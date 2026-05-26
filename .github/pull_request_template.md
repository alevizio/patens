## Problem

<!-- What this PR fixes or changes. One paragraph. -->

## Solution

<!-- The shape of the change. If it's a refactor or behavior change, what's
     different now? -->

## Which design principle does this support?

<!--
  Patens has 8 explicit design principles in DESIGN_PHILOSOPHY.md.
  Reference the one this change supports, even briefly:
    1. Teaching-first, not foundry-first
    2. Browser-native, no installs
    3. Open source MIT, sincerely
    4. No AI in the lead
    5. Audit codes are stable contracts
    6. Type design is the audience
    7. Single designer, single machine
    8. Costs stay cheap

  If your change doesn't fit any principle, that's useful signal —
  open an issue first to discuss rather than coding speculatively.
-->

## Screenshots / recording

<!-- Required for UI changes. Drag-and-drop into this textbox. Before/after
     pairs are great for visual tweaks. -->

## Test plan

- [ ]
- [ ]

## Checks

- [ ] `pnpm exec eslint . --max-warnings 0` clean (no new warnings)
- [ ] `pnpm exec svelte-check --tsconfig ./tsconfig.json` (TypeScript strict)
- [ ] `pnpm exec vitest run` (unit + bench tests pass)
- [ ] `pnpm exec playwright test` (a11y + e2e pass — run for UI changes)
- [ ] Updated docs if behavior changed (README / ARCHITECTURE.md / `/help` /
      relevant `docs/`)

## AI-assisted disclosure

<!--
  If an AI assistant substantively wrote this change, please disclose:
  - Tool: <e.g. Claude Code, Cursor, Copilot>
  - Preserved `Co-Authored-By:` trailer in commit messages: yes / no
  - Stricter review applied (manual screenshot, tests, audit clean): yes / no

  Per 2026 OSS norms — not legally required, just lets the maintainer
  calibrate review depth. AI-generated code carries higher security-vuln
  and review-delay rates per industry data, so the stricter PR
  checklist exists for everyone's benefit.
-->

- [ ] This PR is fully human-authored, OR
- [ ] AI-assisted with: ___  (Co-Authored-By trailer preserved ✓)
