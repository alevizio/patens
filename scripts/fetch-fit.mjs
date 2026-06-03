// Pre-build hook: fetches DJR's Fit.woff2 from a private Vercel Blob
// before every Vite build. Runs because of the `prebuild` entry in
// package.json. Production deploys ship with the licensed web font
// without it ever touching the public GitHub repo.
//
// Required env on Vercel (Production):
//   FIT_FONT_URL            — private Blob URL of Fit.woff2
//   BLOB_READ_WRITE_TOKEN   — auto-injected by Vercel Blob integration
//
// Local dev: when env vars are unset we leave the developer's existing
// static/fonts/Fit.woff2 in place (the licensed file lives there
// already on the maintainer's machine).

import { mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs';

const TARGET = 'static/fonts/Fit.woff2';
const url = process.env.FIT_FONT_URL;
const token = process.env.BLOB_READ_WRITE_TOKEN;

if (!url || !token) {
	if (existsSync(TARGET)) {
		console.log(
			`[fetch-fit] env vars unset — keeping existing ${TARGET} (${statSync(TARGET).size} bytes)`
		);
		process.exit(0);
	}
	console.warn(
		'[fetch-fit] FIT_FONT_URL or BLOB_READ_WRITE_TOKEN not set and no local Fit.woff2. The hero will fall back to ui-sans-serif.'
	);
	process.exit(0);
}

const res = await fetch(url, {
	headers: { Authorization: `Bearer ${token}` }
});

if (!res.ok) {
	console.error(`[fetch-fit] fetch failed: ${res.status} ${res.statusText}`);
	process.exit(1);
}

const buf = Buffer.from(await res.arrayBuffer());
mkdirSync('static/fonts', { recursive: true });
writeFileSync(TARGET, buf);
console.log(`[fetch-fit] fetched Fit.woff2 (${buf.length} bytes) → ${TARGET}`);
