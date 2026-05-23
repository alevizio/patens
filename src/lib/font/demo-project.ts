/**
 * In-app example project — opens a fully-set-up Font Studio project in the
 * editor with several drawn glyphs, a brief, and project metadata. The point
 * is to let a new user explore a font mid-design instead of staring at empty
 * slots, then "Start a new font" once they understand the surfaces.
 *
 * Shapes mirror the Studio Geometric demo OTF in scripts/build-demo-fonts.mjs.
 * Constructed as straight-line polygons in font space (Y+ up) — the editor's
 * vector layer renders them, and the user can immediately edit points, run
 * boolean ops, switch tools, etc.
 */

import type { BezierContour, PathCommand, Project } from './types';
import { createProject } from './project';

const ASCENDER = 800;
const DESCENDER = -200;
const CAP_HEIGHT = 700;
const X_HEIGHT = 500;
const STEM = 90;
const BAR = 80;
const CAP_W = 560;
const LC_W = 480;

/** Closed polygon from a list of [x, y] vertices (Y-up font space). */
const poly = (verts: Array<[number, number]>, winding: 'cw' | 'ccw' = 'cw'): BezierContour => {
	const commands: PathCommand[] = [
		{ type: 'M', x: verts[0][0], y: verts[0][1] },
		...verts.slice(1).map(([x, y]) => ({ type: 'L' as const, x, y })),
		{ type: 'Z' as const }
	];
	return { closed: true, winding, commands };
};

// ---------- Glyph shape builders ----------

const buildH = (): BezierContour[] => [
	poly([
		[80, 0],
		[80 + STEM, 0],
		[80 + STEM, CAP_HEIGHT],
		[80, CAP_HEIGHT]
	]),
	poly([
		[CAP_W - STEM - 80, 0],
		[CAP_W - 80, 0],
		[CAP_W - 80, CAP_HEIGHT],
		[CAP_W - STEM - 80, CAP_HEIGHT]
	]),
	poly([
		[80, CAP_HEIGHT / 2 - BAR / 2],
		[CAP_W - 80, CAP_HEIGHT / 2 - BAR / 2],
		[CAP_W - 80, CAP_HEIGHT / 2 + BAR / 2],
		[80, CAP_HEIGHT / 2 + BAR / 2]
	])
];

const buildT = (): BezierContour[] => [
	poly([
		[CAP_W / 2 - STEM / 2, 0],
		[CAP_W / 2 + STEM / 2, 0],
		[CAP_W / 2 + STEM / 2, CAP_HEIGHT - BAR],
		[CAP_W / 2 - STEM / 2, CAP_HEIGHT - BAR]
	]),
	poly([
		[60, CAP_HEIGHT - BAR],
		[CAP_W - 60, CAP_HEIGHT - BAR],
		[CAP_W - 60, CAP_HEIGHT],
		[60, CAP_HEIGHT]
	])
];

const buildI = (): BezierContour[] => [
	poly([
		[CAP_W / 2 - STEM / 2, 0],
		[CAP_W / 2 + STEM / 2, 0],
		[CAP_W / 2 + STEM / 2, CAP_HEIGHT],
		[CAP_W / 2 - STEM / 2, CAP_HEIGHT]
	])
];

const buildE = (): BezierContour[] => [
	poly([
		[80, 0],
		[80 + STEM, 0],
		[80 + STEM, CAP_HEIGHT],
		[80, CAP_HEIGHT]
	]),
	poly([
		[80, CAP_HEIGHT - BAR],
		[CAP_W - 60, CAP_HEIGHT - BAR],
		[CAP_W - 60, CAP_HEIGHT],
		[80, CAP_HEIGHT]
	]),
	poly([
		[80, CAP_HEIGHT / 2 - BAR / 2],
		[CAP_W - 100, CAP_HEIGHT / 2 - BAR / 2],
		[CAP_W - 100, CAP_HEIGHT / 2 + BAR / 2],
		[80, CAP_HEIGHT / 2 + BAR / 2]
	]),
	poly([
		[80, 0],
		[CAP_W - 60, 0],
		[CAP_W - 60, BAR],
		[80, BAR]
	])
];

const buildN = (): BezierContour[] => [
	poly([
		[80, 0],
		[80 + STEM, 0],
		[80 + STEM, CAP_HEIGHT],
		[80, CAP_HEIGHT]
	]),
	poly([
		[CAP_W - STEM - 80, 0],
		[CAP_W - 80, 0],
		[CAP_W - 80, CAP_HEIGHT],
		[CAP_W - STEM - 80, CAP_HEIGHT]
	]),
	poly([
		[80 + STEM, CAP_HEIGHT],
		[CAP_W - 80, 0],
		[CAP_W - STEM - 80, 0],
		[80, CAP_HEIGHT]
	])
];

/** O — ring approximated by 12-sided outer polygon with inner counter (ccw). */
const buildO = (): BezierContour[] => {
	const cx = CAP_W / 2;
	const cy = CAP_HEIGHT / 2;
	const rx = CAP_W / 2 - 80;
	const ry = CAP_HEIGHT / 2;
	const t = STEM;
	const sides = 16;
	const ring = (radX: number, radY: number, ccw = false): Array<[number, number]> => {
		const pts: Array<[number, number]> = [];
		for (let i = 0; i < sides; i++) {
			const angle = (i / sides) * Math.PI * 2 * (ccw ? -1 : 1);
			pts.push([cx + Math.cos(angle) * radX, cy + Math.sin(angle) * radY]);
		}
		return pts;
	};
	return [poly(ring(rx, ry), 'cw'), poly(ring(rx - t, ry - t, true), 'ccw')];
};

const buildO_lc = (): BezierContour[] => {
	const cx = LC_W / 2;
	const cy = X_HEIGHT / 2;
	const rx = LC_W / 2 - 80;
	const ry = X_HEIGHT / 2;
	const t = STEM - 10;
	const sides = 16;
	const ring = (radX: number, radY: number, ccw = false): Array<[number, number]> => {
		const pts: Array<[number, number]> = [];
		for (let i = 0; i < sides; i++) {
			const angle = (i / sides) * Math.PI * 2 * (ccw ? -1 : 1);
			pts.push([cx + Math.cos(angle) * radX, cy + Math.sin(angle) * radY]);
		}
		return pts;
	};
	return [poly(ring(rx, ry), 'cw'), poly(ring(rx - t, ry - t, true), 'ccw')];
};

const buildN_lc = (): BezierContour[] => [
	poly([
		[80, 0],
		[80 + STEM, 0],
		[80 + STEM, X_HEIGHT - STEM],
		[80, X_HEIGHT - STEM]
	]),
	poly([
		[80, X_HEIGHT - STEM],
		[LC_W - 80, X_HEIGHT - STEM],
		[LC_W - 80, X_HEIGHT],
		[80, X_HEIGHT]
	]),
	poly([
		[LC_W - STEM - 80, 0],
		[LC_W - 80, 0],
		[LC_W - 80, X_HEIGHT - STEM],
		[LC_W - STEM - 80, X_HEIGHT - STEM]
	])
];

// ---------- Assembly ----------

type GlyphSpec = {
	codepoint: number;
	contours: BezierContour[];
	advanceWidth: number;
	leftSidebearing: number;
	rightSidebearing: number;
	status: 'draft' | 'final' | 'sketch';
};

const DRAWN: GlyphSpec[] = [
	{ codepoint: 0x48, contours: buildH(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 80, status: 'final' },
	{ codepoint: 0x4f, contours: buildO(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 80, status: 'final' },
	{ codepoint: 0x54, contours: buildT(), advanceWidth: CAP_W, leftSidebearing: 60, rightSidebearing: 60, status: 'draft' },
	{ codepoint: 0x49, contours: buildI(), advanceWidth: Math.round(CAP_W * 0.6), leftSidebearing: 60, rightSidebearing: 60, status: 'draft' },
	{ codepoint: 0x45, contours: buildE(), advanceWidth: CAP_W, leftSidebearing: 80, rightSidebearing: 60, status: 'draft' },
	{ codepoint: 0x4e, contours: buildN(), advanceWidth: CAP_W + 20, leftSidebearing: 80, rightSidebearing: 80, status: 'draft' },
	{ codepoint: 0x6f, contours: buildO_lc(), advanceWidth: LC_W, leftSidebearing: 80, rightSidebearing: 80, status: 'draft' },
	{ codepoint: 0x6e, contours: buildN_lc(), advanceWidth: LC_W, leftSidebearing: 80, rightSidebearing: 80, status: 'sketch' }
];

/** Build a fresh demo project. Caller is expected to saveProject() it. */
export const createDemoProject = (): Project => {
	const project = createProject({
		name: 'Studio Geometric (example)',
		familyName: 'Studio Geometric Demo',
		kind: 'ui'
	});

	// Patch metrics to match the shapes (the kind preset is close but not exact).
	project.metrics = {
		...project.metrics,
		unitsPerEm: 1000,
		ascender: ASCENDER,
		descender: DESCENDER,
		capHeight: CAP_HEIGHT,
		xHeight: X_HEIGHT
	};

	// Inject drawn contours into existing glyph slots from the default set.
	for (const spec of DRAWN) {
		const g = project.glyphs[spec.codepoint];
		if (!g) continue;
		project.glyphs[spec.codepoint] = {
			...g,
			contours: spec.contours,
			advanceWidth: spec.advanceWidth,
			leftSidebearing: spec.leftSidebearing,
			rightSidebearing: spec.rightSidebearing,
			status: spec.status,
			updatedAt: new Date().toISOString()
		};
	}

	// Pre-fill the Brief so the user sees a complete project, not just
	// glyphs. Six fields filled = 100% brief completion.
	project.brief = {
		intent:
			'A neutral monolinear geometric sans built for product interfaces at 12–28px. The aim is texture as steady as a column of bricks — readable at small sizes, calm at large ones, never calling attention to itself unless asked. Geometric construction gives the letters a clean, modern aesthetic without sacrificing legibility.',
		audience:
			'Designers and engineers building interfaces who need a typeface that disappears into the layout and lets the content speak. Equally happy in a Settings panel, a data table, or a marketing landing page.',
		useCases: ['web-ui', 'body-text', 'display'],
		readingConditions:
			'Primarily on high-DPI screens at body sizes (12–18px) with optical sizing for larger heads (24–96px). Tested against macOS, iOS, Chrome on Android, and 1× / 2× Retina rendering. Should hold up at 12px on a low-DPI second monitor.',
		differentiation:
			'Where Inter and Manrope optimise for variable spans, this typeface optimises for the static body case: even rhythm, slightly tighter aperture on `c` and `e` so they hold their shape at 12px, and stylistic alternates (ss01) for designers who want a single-storey `a`.',
		designNotes:
			'Stem width 90fu (≈9% UPM); bar weight 80fu to match the optical balance at body sizes. Geometric letters (`O`, `o`) use circular construction; humanist letters (`a`, `g`) get a more handwritten lean. Kerning targets the AV/Ta/We pairs hardest — those carry most of the perceived spacing in Latin body text.',
		references: [
			{
				id: crypto.randomUUID(),
				name: 'Inter',
				url: 'https://rsms.me/inter/',
				kind: 'functional',
				notes: 'The UI-grade benchmark. Reference for x-height proportion and spacing rhythm.'
			},
			{
				id: crypto.randomUUID(),
				name: 'Söhne',
				kind: 'competitive',
				notes:
					'Klim Type Foundry, 2019. Studied for the geometric/humanist crossover — particularly the way the lowercase a holds at small sizes.'
			},
			{
				id: crypto.randomUUID(),
				name: 'Futura',
				kind: 'historical',
				notes:
					"Paul Renner, 1927. The geometric grandparent; reference for `O` circularity and `n` shoulder."
			}
		]
	};

	// Two decisions captured in the design journal so the Brief tab's
	// decision log isn't empty.
	project.decisions = [
		{
			id: crypto.randomUUID(),
			date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
			decision: 'Single-storey `a` as ss01 alternate, not the default',
			rationale:
				'Tested both in body copy. The two-storey `a` reads more solidly at 12-14px where most UI text lives. Single-storey reserved for designers who want the geometric look — opt in via the ss01 OpenType feature.'
		},
		{
			id: crypto.randomUUID(),
			date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
			decision: 'Stem width fixed at 90fu across uppercase + lowercase',
			rationale:
				'Tried 100fu for caps and 85fu for lowercase to match optical density. The contrast was too visible in mixed-case settings. 90fu reads as consistent across body text without looking mechanical.'
		}
	];

	// Sample text the Preview + Specimen pages pick up.
	project.samples = {
		paragraph:
			'Typography is the craft of endowing human language with a durable visual form, and thus with an independent existence. Its heartwood is calligraphy — the dance, on a tiny stage, of the living, speaking hand — and its roots reach into living soil, though its branches may be hung each year with new and shifting leaves.'
	};

	// Curated kerning pairs — the AV/HE/TO/Ta/We trifecta that carries
	// most of the perceived spacing in Latin body text. Negative values
	// pull the glyphs closer; positive push them apart.
	project.kerning = [
		// Uppercase pairs against H / T / N / O — the demo's drawn caps.
		{ left: 0x48, right: 0x49, value: -20 }, // HI
		{ left: 0x48, right: 0x4f, value: -10 }, // HO
		{ left: 0x49, right: 0x48, value: -20 }, // IH
		{ left: 0x49, right: 0x4e, value: -10 }, // IN
		{ left: 0x49, right: 0x4f, value: -30 }, // IO
		{ left: 0x4f, right: 0x48, value: -10 }, // OH
		{ left: 0x4f, right: 0x4e, value: -10 }, // ON
		{ left: 0x4f, right: 0x54, value: -20 }, // OT
		{ left: 0x4e, right: 0x4f, value: -10 }, // NO
		{ left: 0x54, right: 0x4e, value: -20 }, // TN
		{ left: 0x54, right: 0x4f, value: -30 }, // TO
		// Lowercase pairs against n / o — the demo's drawn lowercase.
		{ left: 0x6e, right: 0x6f, value: -10 }, // no
		{ left: 0x6f, right: 0x6e, value: -10 }, // on
		// Mixed-case caps following lowercase (common after-period case).
		{ left: 0x6e, right: 0x48, value: 10 }, // nH
		{ left: 0x6f, right: 0x48, value: 10 } // oH
	];

	// Sidebearing class: vertical-stem caps. H I T all share the same
	// left/right whitespace by convention. Demonstrates the class system
	// + the sidebearing-class-drift audit.
	project.sidebearingClasses = [
		{
			id: crypto.randomUUID(),
			name: 'Cap vertical stems',
			members: [0x48, 0x49, 0x54, 0x4e] // H I T N
		}
	];

	// A starter changelog entry so the Release tab shows something on first open.
	project.changelog = [
		{
			id: crypto.randomUUID(),
			version: '0.1.0-demo',
			date: new Date().toISOString(),
			notes:
				'Initial example project shipped with Font Studio. Eight drawn glyphs across uppercase + lowercase, kerning pairs, sidebearing classes, and a stylistic-alternate set.'
		}
	];

	return project;
};
