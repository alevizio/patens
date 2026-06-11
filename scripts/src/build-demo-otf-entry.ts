/**
 * Build the static marketing OTF (StudioGeometric-Regular) FROM the
 * in-editor demo project — single source of truth for the demo font.
 * The old hand-drawn duplicate in build-demo-fonts.mjs drifted from the
 * editor's letterforms (2026-06 QA: its a/e/s were rectangles while the
 * editor shipped real curves). Bundled to scripts/dist by
 * build-demo-otf.mjs (same esbuild pattern as cli/build-mcp.mjs).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { createDemoProject } from '../../src/lib/font/demo-project';
import { buildFont } from '../../src/lib/font/export';

const outDir = new URL('../../static/demo-fonts/', import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });

const project = createDemoProject();
const { font, glyphCount } = buildFont(project);
const buffer = font.toArrayBuffer();
writeFileSync(outDir + 'StudioGeometric-Regular.otf', Buffer.from(buffer));
console.log(
	`✓ StudioGeometric-Regular.otf from demo project (${glyphCount} glyphs, ${(buffer.byteLength / 1024).toFixed(1)} KB)`
);
