/**
 * GET /og/[id] — server-rendered OpenGraph image for a shared project.
 * The image renders at 1200×630 (standard OG dimensions) with the
 * project's family name set in Studio Slab (the bundled serif we ship
 * with the demo) + designer + version + glyph count.
 *
 * Render pipeline: satori (JSX-style → SVG) → resvg (SVG → PNG).
 * Both are imported lazily so the cold-start cost only lands on
 * requests for OG images, not on every page render.
 *
 * Lookup order matches the share-page loader:
 *   1. /og/demo — build demo on the fly
 *   2. Otherwise, try Vercel Blob via list+fetch (same path as
 *      /api/share/[id]); cache aggressively because OG previews are
 *      requested by social bots that follow URL changes rarely.
 *
 * If the project can't be found, returns a generic Patens brand
 * card so Slack/Twitter previews still look professional rather than
 * 404'd.
 */

import type { RequestHandler } from './$types';
import type { Project } from '$lib/font/types';
import { read } from '$app/server';
// Bundled-asset imports — SvelteKit + Vite embed the binary into the
// function bundle so it's available at runtime regardless of platform.
// Previously read from `static/og-fonts/` via process.cwd()+readFile,
// which broke on Vercel because static/ is served from the CDN, not
// bundled with serverless functions. Lesson: anything the function
// needs at runtime has to live under src/ + go through Vite.
import loraUrl from '$lib/og-fonts/Lora-600.ttf';
import interUrl from '$lib/og-fonts/Inter-500.ttf';

const isUuidish = (s: string): boolean => /^[a-zA-Z0-9_-]{8,64}$/.test(s);

// Variant types that have dedicated OG layouts. 'project' is the default
// for any UUID-ish id; the named variants each render a marketing-page-
// specific card.
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
	if (NAMED_VARIANTS.has(id)) {
		// Variant cards — no project lookup. Returning null causes draw()
		// to fall through to the variant-specific layout.
		return null;
	}
	if (id === 'demo') {
		// Lazy-import demo builder so this route doesn't pull the demo
		// project into the bundle when other ids are requested.
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

// Module-level cache so the font buffers persist across requests
// within the same serverless function instance. Cold start reads from
// disk once; subsequent renders are instant.
let cachedFonts: { serif: ArrayBuffer; sans: ArrayBuffer } | null = null;

const loadFonts = async (): Promise<{ serif: ArrayBuffer; sans: ArrayBuffer }> => {
	if (cachedFonts) return cachedFonts;
	// Lora (serif) for the family name, Inter (sans) for the meta lines.
	// Both lifted in via Vite import + SvelteKit's $app/server read() so
	// the binaries are embedded in the function bundle. No filesystem
	// access at runtime, no dependency on static/ being co-located.
	const [serif, sans] = await Promise.all([
		read(loraUrl).arrayBuffer(),
		read(interUrl).arrayBuffer()
	]);
	cachedFonts = { serif, sans };
	return cachedFonts;
};

const draw = async (
	project: Project | null,
	variant: Variant = 'brand'
): Promise<{ png: Buffer; status: number }> => {
	// Variant-specific content. The layout shape (eyebrow + headline +
	// bottom-left meta + bottom-right domain) is shared across variants;
	// only the text changes.
	let eyebrow: string;
	let headline: string;
	let metaLeftTop: string;
	let metaLeftBottom: string;

	if (variant === 'audit') {
		// Differentiator card — what unfurls when someone shares
		// https://patens.design/audit on Bluesky / X / Show HN / Slack.
		eyebrow = 'The audit module · Patens';
		headline = 'Teaches as you draw.';
		metaLeftTop = '94 codes · 30 one-click fixes';
		metaLeftBottom = 'OPEN SOURCE · MIT · TYPE DESIGN';
	} else if (variant === 'learn') {
		eyebrow = 'Learn · Patens';
		headline = 'Type design tutorials.';
		metaLeftTop = 'Seven tutorials · 94-code reference';
		metaLeftBottom = 'BEGINNER TO SHIPPING · OPEN SOURCE';
	} else if (variant === 'compare') {
		eyebrow = 'Comparison · Patens';
		headline = 'Patens vs the world.';
		metaLeftTop = 'FontLab · Glyphs · Fontra · Glyphr · typlr';
		metaLeftBottom = 'FREE · MIT · BROWSER-NATIVE';
	} else if (variant === 'press') {
		eyebrow = 'Press kit · Patens';
		headline = 'Press kit.';
		metaLeftTop = 'Factsheet · brand assets · contact';
		metaLeftBottom = 'OPEN SOURCE · INDEPENDENT';
	} else if (variant === 'about') {
		eyebrow = 'About · Patens';
		headline = 'About Patens.';
		metaLeftTop = 'Browser-native · open source · MIT';
		metaLeftBottom = 'BY ALEJANDRO VIZIO · 2026';
	} else if (project) {
		// Per-project specimen card (the default for /og/[uuid] paths).
		const glyphCount = Object.values(project.glyphs).filter(
			(g) => g.contours.length > 0 || (g.components?.length ?? 0) > 0
		).length;
		eyebrow = 'Patens · specimen';
		headline = project.metadata.familyName ?? 'Patens';
		metaLeftTop = project.metadata.designer || 'Unsigned';
		metaLeftBottom = `${project.metadata.version} · ${glyphCount} glyphs`;
	} else {
		// Generic brand card — /og/brand and /og/home.
		eyebrow = 'Type design in the browser';
		headline = 'Patens';
		metaLeftTop = 'Browser-native type design';
		metaLeftBottom = 'OPEN SOURCE · MIT · v1.0';
	}

	// Lazy-load the heavy bits so unrelated routes don't pay.
	const [{ default: satori }, { Resvg }] = await Promise.all([
		import('satori'),
		import('@resvg/resvg-js')
	]);

	const { serif, sans } = await loadFonts();

	const node = {
		type: 'div',
		props: {
			style: {
				width: '1200px',
				height: '630px',
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'space-between',
				padding: '80px',
				background: '#fafaf9',
				color: '#1a1a1a'
			},
			children: [
				{
					type: 'div',
					props: {
						style: {
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'flex-start',
							gap: '12px'
						},
						children: [
							{
								type: 'div',
								props: {
									style: {
										fontSize: '20px',
										letterSpacing: '0.2em',
										textTransform: 'uppercase',
										color: '#737373',
										fontFamily: 'Sans'
									},
									children: eyebrow
								}
							},
							{
								type: 'div',
								props: {
									style: {
										// Named-variant headlines vary in length; scale so
										// each fits comfortably. brand + project get the
										// max (140); marketing-page variants shrink to 104
										// for longer multi-word headlines without truncation.
										fontSize:
											variant === 'brand' || variant === 'project'
												? '140px'
												: '104px',
										lineHeight: '1.05',
										letterSpacing: '-0.02em',
										fontFamily: 'Serif',
										maxWidth: '1040px'
									},
									children: headline
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
										gap: '6px'
									},
									children: [
										{
											type: 'div',
											props: {
												style: {
													fontSize: '24px',
													fontFamily: 'Serif',
													color: '#404040'
												},
												children: metaLeftTop
											}
										},
										{
											type: 'div',
											props: {
												style: {
													fontSize: '16px',
													fontFamily: 'Sans',
													color: '#737373',
													letterSpacing: '0.1em'
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
										fontSize: '14px',
										fontFamily: 'Sans',
										color: '#a3a3a3',
										letterSpacing: '0.2em',
										textTransform: 'uppercase'
									},
									children:
										variant === 'audit'
											? 'patens.design/audit'
											: variant === 'learn'
												? 'patens.design/learn'
												: variant === 'compare'
													? 'patens.design/compare'
													: variant === 'press'
														? 'patens.design/press'
														: variant === 'about'
															? 'patens.design/about'
															: 'patens.design'
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
		fonts: [
			{ name: 'Serif', data: serif, weight: 600, style: 'normal' },
			{ name: 'Sans', data: sans, weight: 500, style: 'normal' }
		]
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
		// 60s edge cache + 10 min SWR matches the project payload route
		// so OG updates after a re-share land within the same window.
		// Static variants (brand/audit) get longer SWR since their
		// content is fixed.
		'cache-control':
			variant === 'project'
				? 'public, max-age=60, s-maxage=60, stale-while-revalidate=600'
				: 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400'
	});
	return new Response(new Uint8Array(png), { status: 200 });
};
