/**
 * Curated OFL-licensed starter fonts — just metadata, no import logic.
 *
 * Extracted from `./url-import.ts` so consumers that only need the
 * dropdown list (e.g., CreateFontDialog) don't transitively pull in
 * importFromOtf → opentype.js (240KB). The actual URL-fetch logic
 * stays in url-import.ts and is dynamically imported from the home
 * page when the user submits a URL.
 *
 * Every URL HEAD-checks 200 at commit time; google/fonts is the most
 * stable open-font repo on GitHub. jsdelivr is CDN-cached, CORS-clean,
 * and the canonical mirror.
 */

export type StarterFont = {
	id: string;
	label: string;
	family: string;
	description: string;
	url: string;
};

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
