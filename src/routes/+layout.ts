// SSR is ON at the root so public/marketing routes (/, /about, /help,
// /changelog, /learn, /compare) emit real `<title>`, `<meta>`, and
// JSON-LD into the HTML — crawlers and AI engines need that. Routes
// that depend on browser-only APIs (IndexedDB, FontFace, pointer
// events) opt back out with their own `export const ssr = false` —
// see /project/[id], /family/[id], /share/[id].
export const ssr = true;
export const prerender = false;
