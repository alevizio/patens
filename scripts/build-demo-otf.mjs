#!/usr/bin/env node
// Bundles + runs scripts/src/build-demo-otf-entry.ts so the node script
// can import the editor's TS modules (same pattern as cli/build-mcp.mjs).
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outfile = join(here, 'dist', 'build-demo-otf.mjs');

await build({
	entryPoints: [join(here, 'src', 'build-demo-otf-entry.ts')],
	bundle: true,
	platform: 'node',
	format: 'esm',
	target: 'node22',
	outfile,
	logLevel: 'warning'
});

execFileSync(process.execPath, [outfile], { stdio: 'inherit' });
