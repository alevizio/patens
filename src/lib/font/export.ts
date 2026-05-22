/**
 * Build an opentype.js Font from a Project.
 * Used by both the live preview pipeline and the OTF/TTF exporter.
 *
 * Future escape hatch: if opentype.js can't write a feature we need,
 * lazy-load Pyodide + fontTools and run that step there.
 */

import { Font, Glyph as OTGlyphClass, Path } from 'opentype.js';
import type { BezierContour, Glyph as ProjectGlyph, Project, PathCommand } from './types';
import { resolveVerticalMetrics } from './types';
import { buildNotdefContours, NOTDEF_ADVANCE_WIDTH } from './notdef';
import { glyphBounds, roundToFontUnits } from './path';
import { applyDetectedFeatures, detectFeatures } from './feature-detect';
import { buildColorFontPlan, resolveColorFontPlan, resolveV1ColorFontPlan } from './color-build';
import { buildAutoKern } from './kerning-auto';
import { expandKerningClasses } from './kerning-classes';
import { expandSubset, filterKerningToSubset } from './subset';

type OTPath = InstanceType<typeof Path>;
type OTGlyph = InstanceType<typeof OTGlyphClass>;

const applyCommandsToPath = (path: OTPath, commands: PathCommand[]): void => {
	for (const c of commands) {
		switch (c.type) {
			case 'M':
				path.moveTo(c.x, c.y);
				break;
			case 'L':
				path.lineTo(c.x, c.y);
				break;
			case 'Q':
				path.quadraticCurveTo(c.x1, c.y1, c.x, c.y);
				break;
			case 'C':
				path.curveTo(c.x1, c.y1, c.x2, c.y2, c.x, c.y);
				break;
			case 'Z':
				path.close();
				break;
		}
	}
};

const contoursToOpenTypePath = (contours: BezierContour[]): OTPath => {
	const path = new Path();
	for (const contour of contours) {
		applyCommandsToPath(path, roundToFontUnits(contour.commands));
	}
	return path;
};

/**
 * Resolve effective contours for a glyph, including composite components.
 *
 * For composites with two components (typical base + mark pattern), we look
 * for matching anchors: an anchor named 'top' on the first component aligns
 * with an anchor named '_top' on the second component (Glyphs / UFO
 * convention). When a match is found it overrides the stored xy offset.
 */
const effectiveContoursWithMap = (
	glyph: ProjectGlyph,
	glyphs: Record<number, ProjectGlyph>,
	depth = 0
): BezierContour[] => {
	if (depth > 4) return glyph.contours;
	if (glyph.contours.length > 0) return glyph.contours;
	if (!glyph.components || glyph.components.length === 0) return [];

	const components = glyph.components;
	const translations: { dx: number; dy: number }[] = components.map((c) => ({
		dx: c.offsetX,
		dy: c.offsetY
	}));
	if (components.length >= 2) {
		const base = glyphs[components[0].baseCodepoint];
		if (base) {
			for (let i = 1; i < components.length; i++) {
				const mark = glyphs[components[i].baseCodepoint];
				if (!mark) continue;
				const anchorPair = findAnchorPair(base.anchors, mark.anchors);
				if (anchorPair) {
					translations[i] = {
						dx: anchorPair.baseX - anchorPair.markX,
						dy: anchorPair.baseY - anchorPair.markY
					};
				}
			}
		}
	}

	const out: BezierContour[] = [];
	for (let i = 0; i < components.length; i++) {
		const ref = components[i];
		const t = translations[i];
		const base = glyphs[ref.baseCodepoint];
		if (!base) continue;
		const baseContours = effectiveContoursWithMap(base, glyphs, depth + 1);
		for (const c of baseContours) {
			out.push({
				...c,
				commands: c.commands.map((cmd) => translate(cmd, t.dx, t.dy))
			});
		}
	}
	return out;
};

/** Back-compat wrapper that keeps the original Project-based signature. */
const effectiveContours = (
	glyph: ProjectGlyph,
	project: Project,
	depth = 0
): BezierContour[] => effectiveContoursWithMap(glyph, project.glyphs, depth);

/**
 * Find a pair of anchors where the base has 'X' and the mark has '_X'
 * (Glyphs / UFO convention).
 */
const findAnchorPair = (
	baseAnchors: ProjectGlyph['anchors'],
	markAnchors: ProjectGlyph['anchors']
): { baseX: number; baseY: number; markX: number; markY: number } | null => {
	if (!baseAnchors || !markAnchors) return null;
	for (const m of markAnchors) {
		if (!m.name.startsWith('_')) continue;
		const base = baseAnchors.find((b) => b.name === m.name.slice(1));
		if (base) return { baseX: base.x, baseY: base.y, markX: m.x, markY: m.y };
	}
	return null;
};

const translate = (c: PathCommand, dx: number, dy: number): PathCommand => {
	if (c.type === 'M' || c.type === 'L') return { ...c, x: c.x + dx, y: c.y + dy };
	if (c.type === 'Q')
		return { ...c, x1: c.x1 + dx, y1: c.y1 + dy, x: c.x + dx, y: c.y + dy };
	if (c.type === 'C')
		return {
			...c,
			x1: c.x1 + dx,
			y1: c.y1 + dy,
			x2: c.x2 + dx,
			y2: c.y2 + dy,
			x: c.x + dx,
			y: c.y + dy
		};
	return c;
};

/** Compute advance width: explicit if set, otherwise bbox + sidebearings. */
const effectiveAdvanceWidth = (
	glyph: ProjectGlyph,
	contours: BezierContour[]
): number => {
	if (glyph.advanceWidth > 0) return glyph.advanceWidth;
	if (contours.length === 0) return Math.max(50, glyph.leftSidebearing + glyph.rightSidebearing);
	const b = glyphBounds(contours);
	return Math.max(50, Math.round(b.maxX + glyph.rightSidebearing));
};

export type BuildResult = {
	font: InstanceType<typeof Font>;
	indexByCodepoint: Map<number, number>;
	glyphCount: number;
	/**
	 * For color fonts: the COLR baseGlyphRecords ready to feed
	 * `applyColorFontTables`. Empty when the project has no color
	 * layers or no palettes. IDs are post-append (synthetic layer
	 * glyphs are already in the font).
	 */
	colorBaseGlyphs: Array<{
		glyphID: number;
		layers: Array<{ glyphID: number; paletteIndex: number }>;
	}>;
	/**
	 * For color fonts with gradient layers: the COLR v1 base-glyph
	 * paint records ready to feed `applyColorFontTables`. Empty when
	 * no gradient layers exist. When non-empty, the export emits a
	 * combined v0 + v1 COLR table.
	 */
	colorV1BaseGlyphs: ReturnType<typeof resolveV1ColorFontPlan>;
};

export type BuildOptions = {
	/** If set, render this master's glyphs instead of the project's default. */
	masterId?: string;
	/** If set, used as a name suffix (e.g. "Bold") in the PostScript subfamily. */
	styleSuffix?: string;
	/**
	 * Auto-detected OpenType features (small caps, stylistic alternates,
	 * figure variants, …) to apply in addition to `liga` / `kern`.
	 * Defaults to `false` — opt-in until the Features-tab UI ships. When
	 * `true`, runs `detectFeatures(project.glyphs)` and emits the
	 * corresponding GSUB lookups via opentype.js. Specific tags can be
	 * disabled via `disableAutoFeatures`.
	 */
	autoFeatures?: boolean;
	/** Tags to skip even when `autoFeatures` is true. */
	disableAutoFeatures?: ReadonlySet<string>;
	/**
	 * Optional glyph subset — if provided, the export only includes
	 * these codepoints (plus .notdef + space + transitive composite
	 * base glyphs). Used to ship lean web-font subsets. When omitted,
	 * the full glyph set is exported.
	 */
	subset?: ReadonlySet<number>;
};

export const buildFont = (project: Project, opts: BuildOptions = {}): BuildResult => {
	const { metrics, metadata } = project;
	// Resolve which glyph set to use
	let activeGlyphs = project.glyphs;
	let styleName = metadata.styleName || 'Regular';
	if (opts.masterId) {
		const master = (project.masters ?? []).find((m) => m.id === opts.masterId);
		if (master) {
			activeGlyphs = master.glyphs;
			styleName = opts.styleSuffix ?? master.name;
		}
	}
	// Subset filter — keep only the requested codepoints (+ .notdef +
	// space + transitive composite base glyphs). Kerning gets filtered
	// to match below.
	let subsetIncluded: Set<number> | null = null;
	if (opts.subset) {
		const projectForSubset = { ...project, glyphs: activeGlyphs };
		const { glyphs, included } = expandSubset(projectForSubset, opts.subset);
		activeGlyphs = glyphs;
		subsetIncluded = included;
	}

	// .notdef is always glyph index 0.
	const notdefPath = contoursToOpenTypePath(buildNotdefContours(metrics));
	const notdef = new OTGlyphClass({
		name: '.notdef',
		unicode: 0,
		advanceWidth: NOTDEF_ADVANCE_WIDTH,
		path: notdefPath
	});

	const glyphs: OTGlyph[] = [notdef];
	const indexByCodepoint = new Map<number, number>();
	indexByCodepoint.set(0, 0);

	const codepoints = Object.keys(activeGlyphs)
		.map((s) => Number(s))
		.sort((a, b) => a - b);

	const glyphIdByName = new Map<string, number>();
	for (const cp of codepoints) {
		const g = activeGlyphs[cp];
		const eff = effectiveContoursWithMap(g, activeGlyphs);
		const advanceWidth = effectiveAdvanceWidth(g, eff);
		const path = contoursToOpenTypePath(eff);
		const name = g.name || `uni${cp.toString(16).toUpperCase().padStart(4, '0')}`;
		const otGlyph = new OTGlyphClass({
			name,
			unicode: cp,
			advanceWidth,
			path
		});
		indexByCodepoint.set(cp, glyphs.length);
		glyphIdByName.set(name, glyphs.length);
		glyphs.push(otGlyph);
	}

	// Color-font synthetic layer glyphs. Each visible ColorLayer becomes
	// a standalone glyph (no codepoint) carrying just that layer's
	// contours; the COLR baseGlyphRecord later references it by ID.
	const colorPlan = buildColorFontPlan(project);
	for (const syn of colorPlan.syntheticGlyphs) {
		const path = contoursToOpenTypePath(syn.contours);
		const otGlyph = new OTGlyphClass({
			name: syn.name,
			advanceWidth: syn.advanceWidth,
			path
		});
		glyphIdByName.set(syn.name, glyphs.length);
		glyphs.push(otGlyph);
	}
	const colorBaseGlyphs = resolveColorFontPlan(colorPlan, glyphIdByName);
	const colorV1BaseGlyphs = resolveV1ColorFontPlan(colorPlan, glyphIdByName);

	const font = new Font({
		familyName: metadata.familyName || 'Untitled',
		styleName,
		unitsPerEm: metrics.unitsPerEm,
		ascender: metrics.ascender,
		descender: metrics.descender,
		designer: metadata.designer || '',
		designerURL: metadata.designerURL || '',
		// Spec: name table ID 8 — foundry. Falls back to designer name when
		// the user hasn't set a separate foundry/publisher.
		manufacturer: metadata.manufacturer || metadata.designer || '',
		manufacturerURL: metadata.manufacturerURL || '',
		license: metadata.license || '',
		licenseURL: metadata.licenseURL || '',
		version: metadata.version || '1.000',
		copyright: metadata.copyright || '',
		glyphs
	});

	if (project.features.kern) {
		const pairs: Record<string, number> = {};
		// OT layout M2: expand class-based pairs into explicit codepoint
		// pairs at export time. Previously class-based pairs were
		// skipped here ("handled by the .fea compile step"), which left
		// them orphaned unless the user had Pyodide+fontTools running.
		// `expandKerningClasses` ensures direct user-set pairs override
		// class-derived ones, so manual tuning still wins.
		//
		// Subset filter applies BEFORE expansion so class-vs-class pairs
		// (which survive subsetting at filterKerningToSubset) still get
		// their codepoint members filtered to subset-resolved ones.
		const sourceKerning = subsetIncluded
			? filterKerningToSubset(project.kerning, subsetIncluded)
			: project.kerning;
		const expanded = expandKerningClasses(sourceKerning, project.classes ?? []).filter(
			(p) => !subsetIncluded || (subsetIncluded.has(p.left) && subsetIncluded.has(p.right))
		);
		for (const k of expanded) {
			const li = indexByCodepoint.get(k.left);
			const ri = indexByCodepoint.get(k.right);
			if (li === undefined || ri === undefined) continue;
			pairs[`${li},${ri}`] = k.value;
		}
		// Auto-kern M2: layer algorithmic suggestions on top, skipping any
		// pair the user already set (the buildAutoKern helper's userSet
		// filter handles that). Default-on (undefined → true) so fresh
		// exports get reasonable kerning without explicit opt-in. Skipped
		// when no reference pair exists or autoKern is explicitly false.
		const autoKernEnabled = project.features.autoKern !== false;
		if (autoKernEnabled && project.kerning.length > 0) {
			const auto = buildAutoKern(project);
			for (const p of auto.pairs) {
				const li = indexByCodepoint.get(p.left);
				const ri = indexByCodepoint.get(p.right);
				if (li === undefined || ri === undefined) continue;
				const key = `${li},${ri}`;
				// Belt-and-braces double-check (the auto helper already
				// excluded these, but if a future caller bypasses that
				// filter we never want to clobber a user value).
				if (pairs[key] !== undefined) continue;
				pairs[key] = p.value;
			}
		}
		font.kerningPairs = pairs;
	}

	// OS/2.fsType — embedding bits. Default 0 (installable, no restrictions) per
	// Google Fonts' OFL requirement; users can opt into restricted/preview/editable.
	// OS/2.achVendID — 4-byte ASCII foundry tag (registered with Microsoft).
	// Padded/truncated to exactly 4 chars; defaults to 'NONE' when unspecified.
	const os2 = (font.tables as Record<string, unknown> | undefined)?.os2 as
		| { fsType?: number; achVendID?: string }
		| undefined;
	if (os2) {
		os2.fsType = metadata.fsType ?? 0;
		const raw = (metadata.vendorID ?? '').trim();
		os2.achVendID = (raw || 'NONE').slice(0, 4).padEnd(4, ' ');
	}

	// Vertical metrics (OS/2 + hhea). Was a Pyodide round-trip; now native to
	// opentype.js so OTF export skips the ~15MB Python runtime unless .fea
	// features actually need compilation downstream.
	applyVerticalMetrics(font, resolveVerticalMetrics(metrics));

	// Standard liga substitutions written via opentype.js's built-in GSUB
	// writer — another Pyodide elimination for any project whose feature
	// surface is just liga + kern (the common case).
	applyStandardLigatures(font, project, indexByCodepoint);

	// Auto-detected OT features (opt-in). Sorted alphabetically by tag so
	// opentype.js's `addSingle` doesn't throw — `detectFeatures` does this.
	// `liga` is already written above; the detector doesn't re-emit it.
	if (opts.autoFeatures) {
		const detected = detectFeatures(project.glyphs);
		applyDetectedFeatures(
			font as unknown as Parameters<typeof applyDetectedFeatures>[0],
			detected,
			opts.disableAutoFeatures
		);
	}

	return {
		font,
		indexByCodepoint,
		glyphCount: glyphs.length,
		colorBaseGlyphs,
		colorV1BaseGlyphs
	};
};

export const fontToArrayBuffer = (font: InstanceType<typeof Font>): ArrayBuffer =>
	font.toArrayBuffer();

/** The four standard Latin ligatures the auto-fea generator emits. */
const STANDARD_LIGATURES: Array<{ result: number; parts: number[] }> = [
	{ result: 0xfb01, parts: [0x66, 0x69] }, // fi
	{ result: 0xfb02, parts: [0x66, 0x6c] }, // fl
	{ result: 0xfb03, parts: [0x66, 0x66, 0x69] }, // ffi
	{ result: 0xfb04, parts: [0x66, 0x66, 0x6c] } // ffl
];

/**
 * Apply the standard ligature feature (`liga`) directly to the opentype.js
 * font in JS — no Pyodide round-trip needed. Mirrors the liga block from
 * autoFeaSource(): for each standard ligature, if the project has both the
 * component glyphs AND the result glyph drawn, register the substitution.
 *
 * Adds the feature under both DFLT/dflt and latn/dflt to match what the
 * Pyodide-generated .fea was producing.
 */
export const applyStandardLigatures = (
	font: InstanceType<typeof Font>,
	project: Project,
	indexByCodepoint: Map<number, number>
): void => {
	if (!project.features.liga) return;
	// substitution is exposed via the opentype.js Font as a non-typed extension.
	const sub = (font as unknown as {
		substitution?: {
			addLigature(
				feature: string,
				ligature: { sub: number[]; by: number },
				script: string,
				language: string
			): void;
		};
	}).substitution;
	if (!sub || typeof sub.addLigature !== 'function') return;
	for (const lig of STANDARD_LIGATURES) {
		const partIndices = lig.parts.map((cp) => indexByCodepoint.get(cp));
		const resultIndex = indexByCodepoint.get(lig.result);
		if (resultIndex === undefined) continue;
		if (partIndices.some((i) => i === undefined)) continue;
		const ligature = { sub: partIndices as number[], by: resultIndex };
		try {
			sub.addLigature('liga', ligature, 'DFLT', 'dflt');
			sub.addLigature('liga', ligature, 'latn', 'dflt');
		} catch {
			// addLigature can throw on duplicates / coverage-format mismatches.
			// Skip this lig and keep going — the worst case is the lig doesn't
			// activate for that pair, identical to the project not having it.
		}
	}
};

/**
 * Does the project have anchor data that would trigger the GPOS `mark` feature
 * via autoFeaSource? When false (the common case), the OTF export can skip
 * Pyodide entirely — kern is handled by font.kerningPairs, liga via
 * applyStandardLigatures, and there are no anchor-positioned marks.
 */
export const hasMarkAnchors = (project: Project): boolean => {
	const isMarkGlyph = (cp: number) => cp >= 0x0300 && cp <= 0x036f;
	let hasMarkAttachAnchor = false;
	let hasBaseAttachAnchor = false;
	let hasMark2Anchor = false; // unprefixed anchor ON a mark = mkmk target
	for (const g of Object.values(project.glyphs)) {
		const cpIsMark = isMarkGlyph(g.codepoint);
		for (const a of g.anchors ?? []) {
			if (a.name.startsWith('_')) hasMarkAttachAnchor = true;
			else if (cpIsMark) hasMark2Anchor = true;
			else hasBaseAttachAnchor = true;
		}
	}
	// Trigger the GPOS splice when EITHER mark-to-base (mark + base
	// anchors present) OR mark-to-mark (two marks, one with _, one
	// without) has usable data.
	if (hasMarkAttachAnchor && hasBaseAttachAnchor) return true;
	if (hasMarkAttachAnchor && hasMark2Anchor) return true;
	return false;
};

/**
 * Mutate an opentype.js Font's OS/2 + hhea vertical-metric fields in place.
 * Equivalent to the vertical-metrics half of python.ts:finalizeFont, but
 * skipping the Pyodide round-trip entirely. Use BEFORE font.toArrayBuffer()
 * so the writes land in the serialized binary.
 */
export const applyVerticalMetrics = (
	font: InstanceType<typeof Font>,
	vm: {
		typoAscender: number;
		typoDescender: number;
		typoLineGap: number;
		hheaAscender: number;
		hheaDescender: number;
		hheaLineGap: number;
		winAscent: number;
		winDescent: number;
		useTypoMetrics: boolean;
	}
): void => {
	const tables = font.tables as Record<string, unknown> | undefined;
	const os2 = tables?.os2 as
		| {
				sTypoAscender?: number;
				sTypoDescender?: number;
				sTypoLineGap?: number;
				usWinAscent?: number;
				usWinDescent?: number;
				fsSelection?: number;
		  }
		| undefined;
	if (os2) {
		os2.sTypoAscender = vm.typoAscender;
		os2.sTypoDescender = vm.typoDescender;
		os2.sTypoLineGap = vm.typoLineGap;
		os2.usWinAscent = vm.winAscent;
		os2.usWinDescent = vm.winDescent;
		// fsSelection bit 7 = USE_TYPO_METRICS (per OpenType OS/2 spec)
		const sel = os2.fsSelection ?? 0;
		os2.fsSelection = vm.useTypoMetrics ? sel | 0x80 : sel & ~0x80;
	}
	// opentype.js exposes hhea differently across versions — write both
	// `ascender/descender` and `ascent/descent` so the binary writer picks
	// up whichever it consumes. Harmless when only one is read.
	const hhea = tables?.hhea as
		| {
				ascender?: number;
				descender?: number;
				lineGap?: number;
				ascent?: number;
				descent?: number;
		  }
		| undefined;
	if (hhea) {
		hhea.ascender = vm.hheaAscender;
		hhea.descender = vm.hheaDescender;
		hhea.lineGap = vm.hheaLineGap;
		hhea.ascent = vm.hheaAscender;
		hhea.descent = vm.hheaDescender;
	}
};

/** Trigger a browser download of the font as OTF. */
export const downloadFont = (
	font: InstanceType<typeof Font>,
	filename: string
): void => {
	const buffer = font.toArrayBuffer();
	const blob = new Blob([buffer], { type: 'font/otf' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
};
