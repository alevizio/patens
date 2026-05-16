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

/**
 * Curated OFL-licensed starter fonts pulled from google/fonts via jsdelivr.
 * Every URL HEAD-checks 200 at commit time; google/fonts is the most stable
 * open-font repo on GitHub.
 */
const gfBase = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl';

const gf = (slug: string, file: string) => `${gfBase}/${slug}/${encodeURIComponent(file)}`;

export const STARTER_FONTS: StarterFont[] = [
	{
		id: 'inter',
		label: 'Inter',
		family: 'Inter',
		description: 'Rasmus Andersson · neutral UI sans',
		url: gf('inter', 'Inter[opsz,wght].ttf')
	},
	{
		id: 'recursive',
		label: 'Recursive',
		family: 'Recursive',
		description: 'Arrow Type · variable code/UI',
		url: gf('recursive', 'Recursive[CASL,CRSV,MONO,slnt,wght].ttf')
	},
	{
		id: 'ibm-plex-sans',
		label: 'IBM Plex Sans',
		family: 'IBM Plex Sans',
		description: 'IBM · corporate humanist sans',
		url: gf('ibmplexsans', 'IBMPlexSans[wdth,wght].ttf')
	},
	{
		id: 'jetbrains-mono',
		label: 'JetBrains Mono',
		family: 'JetBrains Mono',
		description: 'JetBrains · code-oriented monospace',
		url: gf('jetbrainsmono', 'JetBrainsMono[wght].ttf')
	},
	{
		id: 'fira-code',
		label: 'Fira Code',
		family: 'Fira Code',
		description: 'Tonsky · Fira Mono with ligatures',
		url: gf('firacode', 'FiraCode[wght].ttf')
	},
	{
		id: 'space-grotesk',
		label: 'Space Grotesk',
		family: 'Space Grotesk',
		description: 'Florian Karsten · proportional grotesque',
		url: gf('spacegrotesk', 'SpaceGrotesk[wght].ttf')
	},
	{
		id: 'dm-sans',
		label: 'DM Sans',
		family: 'DM Sans',
		description: 'Colophon · low-contrast geometric',
		url: gf('dmsans', 'DMSans[opsz,wght].ttf')
	},
	{
		id: 'manrope',
		label: 'Manrope',
		family: 'Manrope',
		description: 'Mikhail Sharanda · open-source sans',
		url: gf('manrope', 'Manrope[wght].ttf')
	},
	{
		id: 'work-sans',
		label: 'Work Sans',
		family: 'Work Sans',
		description: 'Wei Huang · grotesque sans-serif',
		url: gf('worksans', 'WorkSans[wght].ttf')
	},
	{
		id: 'public-sans',
		label: 'Public Sans',
		family: 'Public Sans',
		description: 'US Web Design System · neutral sans',
		url: gf('publicsans', 'PublicSans[wght].ttf')
	},
	{
		id: 'playfair',
		label: 'Playfair Display',
		family: 'Playfair Display',
		description: 'Claus Eggers Sørensen · transitional serif',
		url: gf('playfairdisplay', 'PlayfairDisplay[wght].ttf')
	},
	{
		id: 'lora',
		label: 'Lora',
		family: 'Lora',
		description: 'Cyreal · contemporary serif',
		url: gf('lora', 'Lora[wght].ttf')
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
