/**
 * Shared route constants for the e2e suite.
 *
 * The studio home (project list, welcome strip, example-project CTA,
 * Create-font / Storage / Shortcuts dialogs) moved from '/' to an
 * unlisted URL when the marketing teaser took over the root route.
 * Every spec that drives in-app surfaces must navigate here — using
 * the constant keeps the next route move a one-line change instead
 * of silently killing 27 tests again (2026-06 QA finding).
 */
export const STUDIO_HOME = '/studio-c104c94c';
