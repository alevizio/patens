#!/usr/bin/env node
/**
 * Build static/llms-full.txt — the "full corpus" dump that AI coding
 * agents (Cursor, Claude Code, Windsurf, Copilot) fetch when they want
 * deep context on the project. `llms.txt` is the index; this is the
 * body.
 *
 * Concatenated in the order an LLM should read them:
 *   1. The llms.txt index itself (positioning paragraph + key links)
 *   2. README (entry point + 90-second pitch)
 *   3. DESIGN_PHILOSOPHY (the "why" — most cite-worthy section)
 *   4. ARCHITECTURE + docs/architecture (the "how")
 *   5. docs/setup (self-hosters)
 *   6. docs/release-process (versioning / changelog policy)
 *   7. ROADMAP (what's deferred and why)
 *   8. CONTRIBUTING (PR workflow)
 *   9. SUPPORT (where to ask)
 *  10. SECURITY (vuln disclosure)
 *  11. AGENTS (instructions for AI tools touching the code)
 *  12. MAINTAINERS (governance)
 *  13. CHANGELOG (release history — last)
 *
 * Each file's content is prefixed with an `===` header so an LLM can
 * navigate by section. Total target size: 60–150 KB (well under the
 * 200 KB practical ceiling for Anthropic/Vercel-style llms-full.txt).
 *
 * Regenerate after any meaningful docs change:
 *   pnpm build:llms-full
 */

import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outPath = join(root, 'static', 'llms-full.txt');

// Files relative to repo root, in the order they should appear.
const SECTIONS = [
	{ path: 'static/llms.txt', title: 'Patens — overview (llms.txt)' },
	{ path: 'README.md', title: 'README' },
	{ path: 'DESIGN_PHILOSOPHY.md', title: 'Design philosophy' },
	{ path: 'ARCHITECTURE.md', title: 'Architecture (top-level)' },
	{ path: 'docs/architecture.md', title: 'Architecture (deep dive)' },
	{ path: 'docs/setup.md', title: 'Setup guide for self-hosters' },
	{ path: 'docs/release-process.md', title: 'Release process' },
	{ path: 'ROADMAP.md', title: 'Roadmap' },
	{ path: 'CONTRIBUTING.md', title: 'Contributing' },
	{ path: 'SUPPORT.md', title: 'Support — where to ask, where to report' },
	{ path: 'SECURITY.md', title: 'Security policy' },
	{ path: 'AGENTS.md', title: 'Instructions for AI agents touching this code' },
	{ path: 'MAINTAINERS.md', title: 'Maintainers + governance' },
	{ path: 'CHANGELOG.md', title: 'Changelog' }
];

const HEADER = `# Patens — full corpus for AI agents

This file is generated from the project's canonical docs by
\`scripts/build-llms-full.mjs\`. It exists as a single fetch target so
LLM-based coding tools (Cursor, Claude Code, Windsurf, GitHub Copilot,
Continue, Cline, etc.) can pull deep project context in one request
rather than crawling the GitHub tree.

The shorter \`llms.txt\` is the index. This is the body.

Generated: ${new Date().toISOString()}
Source: https://github.com/alevizio/patens
Live: https://patens.design

---

`;

const parts = [HEADER];
const summary = [];

for (const { path: rel, title } of SECTIONS) {
	const abs = join(root, rel);
	try {
		statSync(abs);
	} catch {
		console.warn(`  skip (missing): ${rel}`);
		continue;
	}
	const body = readFileSync(abs, 'utf8').trimEnd();
	const bytes = Buffer.byteLength(body, 'utf8');
	summary.push({ rel, title, bytes });
	parts.push(`=== ${title} ===\n`);
	parts.push(`Source: ${rel}\n\n`);
	parts.push(body);
	parts.push('\n\n');
}

const out = parts.join('');
writeFileSync(outPath, out);

const totalKb = (Buffer.byteLength(out, 'utf8') / 1024).toFixed(1);
console.log(`✓ static/llms-full.txt (${totalKb} KB, ${SECTIONS.length} sections)`);
for (const s of summary) {
	console.log(`    ${(s.bytes / 1024).toFixed(1).padStart(6)} KB · ${s.rel}`);
}
