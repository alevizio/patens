// Walk every interesting public route, extract JSON-LD blocks, validate.
const BASE = 'http://[::1]:5180';
const ROUTES = [
  '/', '/about', '/help', '/press', '/privacy', '/security',
  '/pronunciation', '/compare', '/changelog', '/audit',
  '/learn', '/learn/first-font', '/learn/audit-codes', '/learn/kerning',
  '/learn/multi-script', '/learn/export-formats',
  '/audit/anchors-missing', '/audit/meta-no-manufacturer',
  '/share/demo', '/project/demo/edit'
];

let total = 0, ok = 0, fail = 0;
for (const route of ROUTES) {
  const res = await fetch(`${BASE}${route}`);
  const html = await res.text();
  const matches = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  for (const m of matches) {
    total++;
    const raw = m[1].trim();
    try {
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        const graph = item['@graph'] ?? [item];
        for (const node of graph) {
          if (!node['@context'] && !item['@context']) {
            throw new Error('missing @context');
          }
          if (!node['@type']) throw new Error('missing @type');
        }
      }
      ok++;
    } catch (err) {
      fail++;
      console.error(`FAIL ${route}: ${err.message}`);
      console.error(`  preview: ${raw.slice(0, 200)}...`);
    }
  }
}
console.log(`\n${ok}/${total} JSON-LD blocks valid across ${ROUTES.length} routes.`);
if (fail > 0) process.exit(1);
