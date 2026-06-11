#!/usr/bin/env node
/**
 * Bundle the MCP server into a single ESM file with a node shebang,
 * mirroring cli/build.mjs: zero runtime dependencies, the audit module
 * + catalogue + types collapse into one file that runs on Node 22+.
 *
 * Extra step vs the CLI build: the audit module has no code → severity
 * table (severity is decided at each `issues.push(...)` emit site), but
 * the MCP `list_audit_codes` tool promises one. Rather than hand-
 * maintaining a duplicate table that rots, this script extracts the
 * severity per code from the audit sources at build time and injects
 * it via esbuild `define` as `__AUDIT_SEVERITY_BY_CODE__`. The build
 * fails loudly if a catalogue code can't be resolved, so a new audit
 * code can't ship with a silently-wrong severity.
 */

import { build } from 'esbuild';
import { readFile, chmod } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repo = (p) => resolve(__dirname, '..', p);

/**
 * Extract code → severity from the audit sources.
 *
 * For every `code: '<literal>'`, walk to the enclosing balanced-brace
 * block and read its `severity: '<literal>'`. When the immediate block
 * has none (e.g. the COVERAGE_GROUPS data objects, whose severity
 * lives at the single shared emit site), widen to the parent block and
 * accept only an unambiguous answer (exactly one distinct severity
 * literal). Codes emitted with several different severities resolve to
 * 'varies'.
 */
const extractSeverities = (sources) => {
	const enclosingBlock = (src, from, levels) => {
		// Walk outwards `levels` opening braces from `from`…
		let start = from;
		for (let l = 0; l < levels; l++) {
			let depth = 0;
			start--;
			while (start > 0) {
				const ch = src[start];
				if (ch === '}') depth++;
				if (ch === '{') {
					if (depth === 0) break;
					depth--;
				}
				start--;
			}
		}
		// …then forward from that opening brace to its matching close, so
		// the slice covers the WHOLE parent block (a widened lookup must
		// see emit sites that come after the data object, not just before).
		let end = start + 1;
		let depth = 0;
		while (end < src.length) {
			const ch = src[end];
			if (ch === '{') depth++;
			if (ch === '}') {
				if (depth === 0) break;
				depth--;
			}
			end++;
		}
		return src.slice(start, end + 1);
	};

	const byCode = new Map();
	for (const src of sources) {
		for (const m of src.matchAll(/code:\s*'([\w-]+)'/g)) {
			let severities = [
				...enclosingBlock(src, m.index, 1).matchAll(/severity:\s*'(info|warn|error)'/g)
			].map((s) => s[1]);
			if (severities.length === 0) {
				// Widen once — only trust an unambiguous parent block.
				const parent = [
					...enclosingBlock(src, m.index, 2).matchAll(/severity:\s*'(info|warn|error)'/g)
				].map((s) => s[1]);
				if (new Set(parent).size === 1) severities = parent;
			}
			const set = byCode.get(m[1]) ?? new Set();
			for (const s of severities) set.add(s);
			byCode.set(m[1], set);
		}
	}

	const result = {};
	for (const [code, set] of byCode) {
		if (set.size === 1) result[code] = [...set][0];
		else if (set.size > 1) result[code] = 'varies';
		// size 0 → unresolved; the catalogue guard below decides.
	}
	return result;
};

const auditSources = await Promise.all([
	readFile(repo('src/lib/font/audit.ts'), 'utf8'),
	readFile(repo('src/lib/font/peer-audit.ts'), 'utf8')
]);
const severityByCode = extractSeverities(auditSources);

// Guard: every catalogue code must have a resolved severity. The
// catalogue codes are the RULE_META keys in audit-catalogue.ts.
const catalogueSrc = await readFile(repo('src/lib/font/audit-catalogue.ts'), 'utf8');
const catalogueCodes = [...catalogueSrc.matchAll(/^\t'?([\w-]+)'?:\s*\{ title/gm)].map((m) => m[1]);
if (catalogueCodes.length < 90) {
	throw new Error(
		`build-mcp: only found ${catalogueCodes.length} codes in audit-catalogue.ts — the RULE_META regex no longer matches its formatting.`
	);
}
const unresolved = catalogueCodes.filter((code) => !severityByCode[code]);
if (unresolved.length > 0) {
	throw new Error(
		`build-mcp: no severity extracted for catalogue code(s): ${unresolved.join(', ')}. ` +
			'Check the emit sites in src/lib/font/audit.ts.'
	);
}

await build({
	entryPoints: [resolve(__dirname, 'src/mcp/server.ts')],
	bundle: true,
	platform: 'node',
	target: 'node22',
	format: 'esm',
	outfile: resolve(__dirname, 'dist/mcp-server.mjs'),
	banner: { js: '#!/usr/bin/env node' },
	loader: { '.json': 'json' },
	define: { __AUDIT_SEVERITY_BY_CODE__: JSON.stringify(severityByCode) },
	sourcemap: true,
	logLevel: 'info'
});

await chmod(resolve(__dirname, 'dist/mcp-server.mjs'), 0o755);

/* eslint-disable no-console */
console.log(`✓ MCP server built to cli/dist/mcp-server.mjs (${catalogueCodes.length} codes, severities resolved)`);
console.log('  Run via: node cli/dist/mcp-server.mjs   (stdio transport)');
console.log('  Or via:  the patens-mcp bin');
/* eslint-enable no-console */
