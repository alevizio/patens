/**
 * Fetch a font from any URL and dispatch to the OTF/UFO importer.
 *
 * Handles URL rewriting so common GitHub references just work in the browser:
 *   - github.com/owner/repo/blob/branch/path → cdn.jsdelivr.net/gh/...
 *   - github.com/owner/repo/raw/branch/path → cdn.jsdelivr.net/gh/...
 *   - raw.githubusercontent.com/owner/repo/branch/path → cdn.jsdelivr.net/gh/...
 *
 * jsdelivr is CDN-cached, CORS-clean, and the canonical mirror for npm + GH.
 */

import { importFromOtf } from './import';
import type { Project } from './types';

// STARTER_FONTS + StarterFont type moved to ./starter-fonts so consumers
// that only need the dropdown data (CreateFontDialog) don't transitively
// pull in importFromOtf → opentype.js (~240KB). Re-exported here for
// back-compat with any external code that imports from this module.
export { STARTER_FONTS } from './starter-fonts';
export type { StarterFont } from './starter-fonts';

/** Rewrite a github.com URL into the equivalent jsdelivr URL when possible. */
export const rewriteGithubUrl = (url: string): string => {
	const trimmed = url.trim();
	// github.com/{owner}/{repo}/blob/{branch}/{path}
	const ghBlob = trimmed.match(
		/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|raw)\/([^/]+)\/(.+)$/
	);
	if (ghBlob) {
		const [, owner, repo, branch, path] = ghBlob;
		return `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${path}`;
	}
	// raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}
	const rawGh = trimmed.match(
		/^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/
	);
	if (rawGh) {
		const [, owner, repo, branch, path] = rawGh;
		return `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${path}`;
	}
	return trimmed;
};

const filenameFromUrl = (url: string): string => {
	try {
		const u = new URL(url);
		const last = u.pathname.split('/').pop() || 'font.otf';
		return decodeURIComponent(last);
	} catch {
		return 'font.otf';
	}
};

/**
 * Convert a WOFF2 buffer to OTF via the Pyodide+fontTools harness so opentype.js
 * (which doesn't ship brotli) can parse it.
 */
const woff2ToOtfIfNeeded = async (
	buffer: ArrayBuffer,
	filename: string
): Promise<ArrayBuffer> => {
	const lower = filename.toLowerCase();
	if (!lower.endsWith('.woff2') && !lower.endsWith('.woff')) return buffer;
	const py = await import('./python');
	const runtime = await py.ensurePython();
	runtime.FS.writeFile('/tmp/in.web', new Uint8Array(buffer));
	await runtime.runPythonAsync(`
from fontTools.ttLib import TTFont
font = TTFont('/tmp/in.web')
font.flavor = None
font.save('/tmp/out.otf')
	`);
	const out = runtime.FS.readFile('/tmp/out.otf');
	const buf = new ArrayBuffer(out.byteLength);
	new Uint8Array(buf).set(out);
	return buf;
};

export const importFromUrl = async (rawUrl: string): Promise<{ project: Project; sourceUrl: string }> => {
	const url = rewriteGithubUrl(rawUrl);
	const filename = filenameFromUrl(url);
	const res = await fetch(url, { mode: 'cors' });
	if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
	const raw = await res.arrayBuffer();

	// Route based on extension
	if (filename.toLowerCase().endsWith('.zip') || filename.toLowerCase().endsWith('.ufo.zip')) {
		const py = await import('./python');
		await py.ensurePython();
		const json = await py.ufoZipToProject(raw);
		const parsed = JSON.parse(json);
		const ts = new Date().toISOString();
		const project: Project = {
			...parsed,
			id: crypto.randomUUID(),
			name: `${parsed.metadata?.familyName ?? filename} (UFO)`,
			createdAt: ts,
			updatedAt: ts
		};
		return { project, sourceUrl: url };
	}

	const otfBuffer = await woff2ToOtfIfNeeded(raw, filename);
	const file = new File([otfBuffer], filename.replace(/\.(woff2?|webfont)$/i, '.otf'), {
		type: 'font/otf'
	});
	const result = await importFromOtf(file);
	return { project: result.project, sourceUrl: url };
};
