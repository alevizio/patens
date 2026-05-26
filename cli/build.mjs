#!/usr/bin/env node
/**
 * Bundle the CLI into a single ESM file with a node shebang so it's
 * directly executable as `cli/dist/index.mjs` or installable via
 * package.json's "bin" entry.
 *
 * Bundling everything (audit module + types + format helpers + the
 * package.json import for the version string) lets the published CLI
 * have zero runtime dependencies. That's important because the audit
 * module imports `./path`, `./peer-audit`, `./aglfn` which in turn
 * have their own transitive imports — bundling collapses the graph
 * into one file that runs on any Node 22+.
 */

import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

await build({
	entryPoints: [resolve(__dirname, 'src/index.ts')],
	bundle: true,
	platform: 'node',
	target: 'node22',
	format: 'esm',
	outfile: resolve(__dirname, 'dist/index.mjs'),
	banner: { js: '#!/usr/bin/env node' },
	// Inline the package.json so the version string works without
	// resolving the file at runtime.
	loader: { '.json': 'json' },
	// Don't fail the build on the project's TypeScript decorators or
	// other modern syntax — Node 22 handles all of it.
	sourcemap: true,
	logLevel: 'info'
});

// Make the output executable.
import { chmod } from 'node:fs/promises';
await chmod(resolve(__dirname, 'dist/index.mjs'), 0o755);

// Build script — informational output. Console.log is the right shape
// here; eslint's no-console rule is for app code, not build scripts.
/* eslint-disable no-console */
console.log('✓ CLI built to cli/dist/index.mjs');
console.log('  Run via: pnpm patens audit <path>');
console.log('  Or via:  node cli/dist/index.mjs audit <path>');
/* eslint-enable no-console */
