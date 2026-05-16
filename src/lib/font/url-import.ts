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

export type StarterFont = {
	id: string;
	label: string;
	family: string;
	description: string;
	url: string;
};

/** A small curated catalog of OFL-licensed starter fonts via jsdelivr GitHub mirror. */
export const STARTER_FONTS: StarterFont[] = [
	{
		id: 'inter',
		label: 'Inter',
		family: 'Inter',
		description: 'Rasmus Andersson · neutral UI sans',
		url: 'https://cdn.jsdelivr.net/gh/rsms/inter@master/docs/font-files/Inter-Regular.otf'
	},
	{
		id: 'recursive',
		label: 'Recursive',
		family: 'Recursive',
		description: 'Arrow Type · variable mono/sans',
		url: 'https://cdn.jsdelivr.net/gh/arrowtype/recursive@main/fonts/ArrowType-Recursive-1.085/Recursive_Desktop/separate_statics/RecursiveSansLnrSt-Regular.otf'
	},
	{
		id: 'ibm-plex',
		label: 'IBM Plex Sans',
		family: 'IBM Plex Sans',
		description: 'IBM · corporate humanist sans',
		url: 'https://cdn.jsdelivr.net/gh/IBM/plex@master/IBM-Plex-Sans/fonts/complete/otf/IBMPlexSans-Regular.otf'
	},
	{
		id: 'plex-mono',
		label: 'IBM Plex Mono',
		family: 'IBM Plex Mono',
		description: 'IBM · monospace companion to Plex',
		url: 'https://cdn.jsdelivr.net/gh/IBM/plex@master/IBM-Plex-Mono/fonts/complete/otf/IBMPlexMono-Regular.otf'
	},
	{
		id: 'jetbrains-mono',
		label: 'JetBrains Mono',
		family: 'JetBrains Mono',
		description: 'JetBrains · code-oriented monospace',
		url: 'https://cdn.jsdelivr.net/gh/JetBrains/JetBrainsMono@master/fonts/ttf/JetBrainsMono-Regular.ttf'
	},
	{
		id: 'fira-code',
		label: 'Fira Code',
		family: 'Fira Code',
		description: 'Tonsky · Fira Mono with ligatures',
		url: 'https://cdn.jsdelivr.net/gh/tonsky/FiraCode@master/distr/otf/FiraCode-Regular.otf'
	},
	{
		id: 'public-sans',
		label: 'Public Sans',
		family: 'Public Sans',
		description: 'US Web Design System · neutral sans',
		url: 'https://cdn.jsdelivr.net/gh/uswds/public-sans@master/fonts/otf/PublicSans-Regular.otf'
	},
	{
		id: 'work-sans',
		label: 'Work Sans',
		family: 'Work Sans',
		description: 'Wei Huang · grotesque sans-serif',
		url: 'https://cdn.jsdelivr.net/gh/weiweihuanghuang/Work-Sans@master/fonts/static/otf/WorkSans-Regular.otf'
	}
];

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
