#!/usr/bin/env node
/**
 * Export the private-alpha waitlist from Vercel Blob to a CSV on stdout.
 *
 * The store is private (see src/routes/api/waitlist/+server.ts), so the
 * RW token is required to list and read entries. Pull it from your linked
 * Vercel project with `vercel env pull` (it populates .env.local), or
 * paste it inline.
 *
 * Usage:
 *   pnpm waitlist:export                          # reads .env.local
 *   BLOB_READ_WRITE_TOKEN=… pnpm waitlist:export  # explicit
 *   pnpm waitlist:export > waitlist.csv           # save to file
 *
 * Output columns:
 *   email           — the address as submitted (already normalized to lowercase)
 *   locale          — 'en' or 'es' (which surface the signup came from)
 *   signed_up_at    — ISO 8601 UTC timestamp; sorted oldest first
 */

import { existsSync, readFileSync } from 'node:fs';
import { list, get } from '@vercel/blob';

// Load .env.local if `BLOB_READ_WRITE_TOKEN` isn't already in the env.
// Minimal parser — no dotenv dependency. Handles KEY=value and quoted
// values; ignores comments and blank lines.
if (!process.env.BLOB_READ_WRITE_TOKEN && existsSync('.env.local')) {
	for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
		const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^#\s]*))\s*(?:#.*)?$/);
		if (m && !process.env[m[1]]) process.env[m[1]] = m[2] ?? m[3] ?? m[4] ?? '';
	}
}

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
	console.error(
		'BLOB_READ_WRITE_TOKEN is not set. Run `vercel env pull` to populate .env.local from your linked project, or set it inline.'
	);
	process.exit(1);
}

const { blobs } = await list({ prefix: 'waitlist/', token });

if (blobs.length === 0) {
	console.error('No waitlist entries.');
	process.exit(0);
}

// Read every blob's body concurrently (these are tiny JSON objects).
const entries = await Promise.all(
	blobs.map(async (b) => {
		const { stream } = await get(b.pathname, { access: 'private', token });
		const text = await new Response(stream).text();
		return JSON.parse(text);
	})
);

entries.sort((a, b) => (a.ts < b.ts ? -1 : 1));

// CSV-escape: wrap in quotes if the field contains comma/quote/newline.
// Defensive — real emails don't, but garbage-in shouldn't break the file.
const csv = (s) => (/[",\n]/.test(s) ? `"${String(s).replace(/"/g, '""')}"` : String(s));

console.log('email,locale,signed_up_at');
for (const e of entries) {
	console.log([csv(e.email), csv(e.locale), e.ts].join(','));
}

console.error(`\n${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}.`);
