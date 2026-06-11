/**
 * The canonical audit-code count, as a standalone constant so marketing
 * surfaces (home, /audit, press) can show the number without bundling
 * the full catalogue (titles + descriptions ≈ tens of KB of prose).
 *
 * Guarded against drift by audit-catalogue.test.ts, which asserts
 * AUDIT_CATALOGUE.length === AUDIT_CODE_COUNT. When a new code lands,
 * bump this constant — and grep the repo for the literal count in
 * static copy (README, /es pages, llms-full.txt) which can't import it.
 */
export const AUDIT_CODE_COUNT = 105;
