// Static prerender — the /audit page has no per-request data and benefits
// from being served as a flat HTML file for crawler-citation + edge-cache
// reasons. SSR is also fine (the root layout has `ssr = true`), but
// prerender lets Vercel hand back the bytes without re-running the loader.
export const prerender = true;
