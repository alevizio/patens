/**
 * GET /og/[id] — server-rendered OpenGraph card.
 *
 * Swiss International Style: stone palette, single grotesque (Inter
 * Medium), opacity-as-hierarchy, Swiss Red accent mark. Lipi/Plex/
 * fontsource all ship WOFF/WOFF2 which Satori can't read, and the raw
 * GitHub mirrors gate binary downloads behind redirects — so we use the
 * Latin-subset Inter Medium we already bundle (60KB, embedded into the
 * function bundle at build time via Vite + $app/server read()) for the
 * entire card. Size + color opacity carry hierarchy; weight is single.
 *
 * Render pipeline: satori (JSX-shaped → SVG) → resvg (SVG → PNG).
 *
 * Lookup order matches the share-page loader:
 *   1. Named variant (home/brand/audit/learn/compare/press/about) → no
 *      project lookup; variant-specific copy only.
 *   2. /og/demo → build demo on the fly.
 *   3. UUID-ish → try Vercel Blob via list+fetch.
 *   4. Anything else → generic brand card so Slack/Twitter previews
 *      still look intentional rather than 404.
 */

import type { RequestHandler } from './$types';
import type { Project } from '$lib/font/types';
import { read } from '$app/server';
import interUrl from '$lib/og-fonts/Inter-500.ttf';

const isUuidish = (s: string): boolean => /^[a-zA-Z0-9_-]{8,64}$/.test(s);

type Variant = 'brand' | 'audit' | 'learn' | 'compare' | 'press' | 'about' | 'project';

const NAMED_VARIANTS = new Set(['home', 'brand', 'audit', 'learn', 'compare', 'press', 'about']);

const variantFor = (id: string): Variant => {
	if (id === 'home' || id === 'brand') return 'brand';
	if (id === 'audit') return 'audit';
	if (id === 'learn') return 'learn';
	if (id === 'compare') return 'compare';
	if (id === 'press') return 'press';
	if (id === 'about') return 'about';
	return 'project';
};

const fetchProject = async (
	id: string,
	fetchFn: typeof fetch
): Promise<Project | null> => {
	if (NAMED_VARIANTS.has(id)) return null;
	if (id === 'demo') {
		const { createDemoProject } = await import('$lib/font/demo-project');
		return { ...createDemoProject(), id: 'demo' };
	}
	if (!isUuidish(id)) return null;
	if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
	try {
		const { list } = await import('@vercel/blob');
		const listed = await list({ prefix: `shares/${id}.json`, limit: 1 });
		const blobUrl = listed.blobs.find((b) => b.pathname === `shares/${id}.json`)?.url;
		if (!blobUrl) return null;
		const res = await fetchFn(blobUrl);
		if (!res.ok) return null;
		return (await res.json()) as Project;
	} catch {
		return null;
	}
};

// Stone palette — exact hex per @fontsource Tailwind stones, mirrored
// in the site's CSS tokens (app.css). Opacity layers are inlined as the
// pre-blended hex over stone-50 / stone-950 so Satori (which doesn't
// render rgba over a background) gets a deterministic color.
const STONE = {
	bg: '#fafaf9', // stone-50
	fg: '#1c1917', // stone-900
	muted: '#57534e', // ~stone-600 = stone-900 @ ~70% over canvas
	secondary: '#78716c', // stone-500
	subtle: '#a8a29e' // ~stone-400 = stone-900 @ ~40% over canvas
};
const SWISS_RED = '#C8102E';

// Cache the font buffer across requests within a single function instance.
let cachedFont: ArrayBuffer | null = null;
const loadFont = async (): Promise<ArrayBuffer> => {
	if (cachedFont) return cachedFont;
	cachedFont = await read(interUrl).arrayBuffer();
	return cachedFont;
};

const draw = async (
	project: Project | null,
	variant: Variant = 'brand'
): Promise<{ png: Buffer; status: number }> => {
	let eyebrow: string;
	let headline: string;
	let metaLeftTop: string;
	let metaLeftBottom: string;
	let domain: string;

	if (variant === 'audit') {
		eyebrow = 'The audit module · Patens';
		headline = 'Teaches as you draw.';
		metaLeftTop = '105 codes · 30 one-click fixes';
		metaLeftBottom = 'OPEN SOURCE · MIT · TYPE DESIGN';
		domain = 'patens.design/audit';
	} else if (variant === 'learn') {
		eyebrow = 'Learn · Patens';
		headline = 'Type design tutorials.';
		metaLeftTop = 'Seven tutorials · 105-code reference';
		metaLeftBottom = 'BEGINNER TO SHIPPING · OPEN SOURCE';
		domain = 'patens.design/learn';
	} else if (variant === 'compare') {
		eyebrow = 'Comparison · Patens';
		headline = 'Patens vs the field.';
		metaLeftTop = 'FontLab · Glyphs · Fontra · Lipi · Fontish';
		metaLeftBottom = 'FREE · MIT · BROWSER-NATIVE';
		domain = 'patens.design/compare';
	} else if (variant === 'press') {
		eyebrow = 'Press kit · Patens';
		headline = 'Press kit.';
		metaLeftTop = 'Factsheet · brand assets · contact';
		metaLeftBottom = 'OPEN SOURCE · INDEPENDENT';
		domain = 'patens.design/press';
	} else if (variant === 'about') {
		eyebrow = 'About · Patens';
		headline = 'About Patens.';
		metaLeftTop = 'Browser-native · open source · MIT';
		metaLeftBottom = 'BY ALEJANDRO VIZIO · 2026';
		domain = 'patens.design/about';
	} else if (project) {
		const glyphCount = Object.values(project.glyphs).filter(
			(g) => g.contours.length > 0 || (g.components?.length ?? 0) > 0
		).length;
		eyebrow = 'Patens · specimen';
		headline = project.metadata.familyName ?? 'Patens';
		metaLeftTop = project.metadata.designer || 'Unsigned';
		metaLeftBottom = `${project.metadata.version} · ${glyphCount} glyphs`;
		domain = 'patens.design';
	} else {
		eyebrow = 'A type editor with a method';
		headline = 'Patens';
		metaLeftTop = 'Browser-native · 105 rules, plain English';
		metaLeftBottom = 'OPEN SOURCE · MIT · PRIVATE ALPHA · 2026';
		domain = 'patens.design';
	}

	const [{ default: satori }, { Resvg }] = await Promise.all([
		import('satori'),
		import('@resvg/resvg-js')
	]);

	const fontData = await loadFont();

	// Headline sizes — brand + project specimens get the largest display
	// (Swiss poster scale). Marketing-variant headlines are longer, scale
	// down so they fit without truncation.
	const headlineFontSize =
		variant === 'brand' || variant === 'project' ? '180px' : '120px';

	const node = {
		type: 'div',
		props: {
			style: {
				width: '1200px',
				height: '630px',
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'space-between',
				padding: '72px 80px',
				background: STONE.bg,
				color: STONE.fg,
				fontFamily: 'Sans',
				position: 'relative'
			},
			children: [
				// Swiss Red corner mark — single 56×6 rule top-right. The one
				// chromatic accent on an otherwise stone-only card.
				{
					type: 'div',
					props: {
						style: {
							position: 'absolute',
							top: '72px',
							right: '80px',
							width: '56px',
							height: '6px',
							background: SWISS_RED
						}
					}
				},
				// Top: eyebrow only.
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							fontSize: '20px',
							letterSpacing: '0.2em',
							textTransform: 'uppercase',
							color: STONE.muted
						},
						children: eyebrow
					}
				},
				// Middle: large grotesque headline. Anchored to the bottom of
				// its flex slot so the eye lands on the wordmark, then sweeps
				// down to the meta. Swiss display restraint — single weight,
				// big size carries the visual.
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							fontSize: headlineFontSize,
							lineHeight: '1.0',
							letterSpacing: '-0.04em',
							color: STONE.fg,
							maxWidth: '1040px'
						},
						children: headline
					}
				},
				// Bottom row: meta left + domain right.
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'flex-end',
							width: '100%'
						},
						children: [
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										flexDirection: 'column',
										gap: '8px'
									},
									children: [
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													fontSize: '22px',
													color: STONE.muted
												},
												children: metaLeftTop
											}
										},
										{
											type: 'div',
											props: {
												style: {
													display: 'flex',
													fontSize: '14px',
													letterSpacing: '0.2em',
													textTransform: 'uppercase',
													color: STONE.secondary
												},
												children: metaLeftBottom
											}
										}
									]
								}
							},
							{
								type: 'div',
								props: {
									style: {
										display: 'flex',
										fontSize: '16px',
										letterSpacing: '0.18em',
										textTransform: 'uppercase',
										color: STONE.subtle
									},
									children: domain
								}
							}
						]
					}
				}
			]
		}
	};

	const svg = await satori(node as unknown as Parameters<typeof satori>[0], {
		width: 1200,
		height: 630,
		fonts: [{ name: 'Sans', data: fontData, weight: 500, style: 'normal' }]
	});
	const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } })
		.render()
		.asPng();
	return { png: Buffer.from(png), status: 200 };
};

export const GET: RequestHandler = async ({ params, fetch, setHeaders }) => {
	const variant = variantFor(params.id);
	const project = await fetchProject(params.id, fetch);
	const { png } = await draw(project, variant);
	setHeaders({
		'content-type': 'image/png',
		// Static variants (brand/audit/etc) cache aggressively. Project
		// specimens (which can change on re-share) get the same 60s edge
		// cache + 10min SWR as the project payload route.
		'cache-control':
			variant === 'project'
				? 'public, max-age=60, s-maxage=60, stale-while-revalidate=600'
				: 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400'
	});
	return new Response(new Uint8Array(png), { status: 200 });
};
