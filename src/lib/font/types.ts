/**
 * Font Studio data model.
 * Coordinate system: font space, Y+ is UP, origin at glyph baseline.
 */

export type GlyphStatus = 'empty' | 'sketch' | 'draft' | 'final';

export type PathCommand =
	| { type: 'M'; x: number; y: number }
	| { type: 'L'; x: number; y: number }
	| { type: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
	| { type: 'Q'; x1: number; y1: number; x: number; y: number }
	| { type: 'Z' };

export type BezierContour = {
	closed: boolean;
	winding: 'cw' | 'ccw';
	commands: PathCommand[];
};

export type SketchPoint = { x: number; y: number; pressure: number; t: number };
export type SketchStroke = { id: string; points: SketchPoint[] };

export type GlyphReference = {
	/** Unicode codepoint of the base glyph being referenced */
	baseCodepoint: number;
	/** Translation offset (font units) */
	offsetX: number;
	offsetY: number;
};

export type Anchor = { name: string; x: number; y: number };

export type Glyph = {
	codepoint: number;
	name: string;
	status: GlyphStatus;
	advanceWidth: number;
	leftSidebearing: number;
	rightSidebearing: number;
	sketch?: SketchStroke[];
	contours: BezierContour[];
	components?: GlyphReference[];
	anchors?: Anchor[];
	/** Freeform designer notes for this glyph. */
	notes?: string;
	/** Optional bitmap reference (data URL) shown behind the canvas as a tracing template. */
	referenceImage?: ReferenceImage;
	updatedAt: string;
};

export type ReferenceImage = {
	/** Data URL (image/*) — kept inline so the project file is self-contained. */
	src: string;
	/** Horizontal offset in font units — left edge of the image. */
	x: number;
	/** Vertical offset in font units — bottom edge of the image (baseline-relative). */
	y: number;
	/** Display width in font units. */
	width: number;
	/** Display height in font units (computed from the source aspect ratio at upload). */
	height: number;
	/** 0..1 opacity. */
	opacity: number;
};

export type KerningSide = number | string; // codepoint OR @class-name (string starts with '@')

export type KerningPair = {
	left: KerningSide;
	right: KerningSide;
	value: number; // negative = pull together, positive = push apart
};

export type KerningClass = {
	/** Class name, including the leading '@' (e.g. '@A_left') */
	name: string;
	/** Member glyphs as codepoints */
	members: number[];
};

export const isClassRef = (side: KerningSide): side is string =>
	typeof side === 'string' && side.startsWith('@');

export type FontMetrics = {
	unitsPerEm: number;
	/** Baseline ascender (used for editor + opentype.js Font ascender). */
	ascender: number;
	/** Baseline descender (negative). */
	descender: number;
	capHeight: number;
	xHeight: number;
	defaultSidebearing: number;
	/**
	 * OS/2 typo metrics (recommended by Microsoft for cross-platform line
	 * spacing). When undefined, they are derived from ascender/descender.
	 */
	typoAscender?: number;
	typoDescender?: number;
	typoLineGap?: number;
	/** hhea metrics — should match typo* for predictable behavior. */
	hheaAscender?: number;
	hheaDescender?: number;
	hheaLineGap?: number;
	/** Windows clipping rectangle (always positive). */
	winAscent?: number;
	winDescent?: number;
	/** OS/2 fsSelection USE_TYPO_METRICS bit (recommended on). */
	useTypoMetrics?: boolean;
};

/** Derive the full vertical metric set from the basic ascender/descender pair. */
export const resolveVerticalMetrics = (m: FontMetrics) => {
	const typoAscender = m.typoAscender ?? m.ascender;
	const typoDescender = m.typoDescender ?? m.descender;
	const typoLineGap = m.typoLineGap ?? 0;
	return {
		typoAscender,
		typoDescender,
		typoLineGap,
		hheaAscender: m.hheaAscender ?? typoAscender,
		hheaDescender: m.hheaDescender ?? typoDescender,
		hheaLineGap: m.hheaLineGap ?? typoLineGap,
		winAscent: m.winAscent ?? typoAscender,
		winDescent: m.winDescent ?? Math.abs(typoDescender),
		useTypoMetrics: m.useTypoMetrics ?? true
	};
};

export type FontMetadata = {
	familyName: string;
	styleName: string; // 'Regular' for v1
	designer: string;
	copyright: string;
	license: string;
	version: string;
};

export type ProjectFeatures = {
	kern: boolean;
	liga: boolean;
	/**
	 * Optional custom .fea source. When set, this overrides the auto-generated
	 * features and is compiled into the font at export time via Pyodide+fontTools.
	 */
	feaSource?: string;
};

/**
 * A variable-font axis (subset of the OpenType `fvar` schema).
 * Tag is a four-char string: standard ones include 'wght', 'wdth', 'opsz',
 * 'slnt', 'ital'. Custom axes use uppercase tags like 'GRAD'.
 */
export type Axis = {
	tag: string;
	name: string;
	minimum: number;
	default: number;
	maximum: number;
};

/**
 * An additional master in a multi-master/variable-font project.
 * The "default master" is the project's main `glyphs` map — extra masters
 * live in `Project.masters` keyed by id, each at its own axis location.
 */
export type Master = {
	id: string;
	name: string;
	/** Map of axis tag → value (must lie within the axis range). */
	location: Record<string, number>;
	/** Per-master glyph overrides keyed by Unicode codepoint. */
	glyphs: Record<number, Glyph>;
	createdAt: string;
	updatedAt: string;
};

/**
 * A named instance in a variable font's fvar table — a preset axis location
 * that shows up in OS font menus as a selectable style (e.g. "Regular",
 * "Bold", "Black Condensed").
 */
export type VariableInstance = {
	id: string;
	/** Family name as shown in menus (usually same as the project's family). */
	familyName?: string;
	/** Style name as shown in menus (e.g. "Regular", "Bold", "Display Light"). */
	styleName: string;
	/** Map of axis tag → value within the axis range. */
	location: Record<string, number>;
	/** Optional PostScript name override; auto-derived if omitted. */
	postScriptName?: string;
};

export type Project = {
	id: string;
	name: string;
	metadata: FontMetadata;
	metrics: FontMetrics;
	/** Default master's glyphs, keyed by Unicode codepoint. */
	glyphs: Record<number, Glyph>;
	kerning: KerningPair[];
	classes?: KerningClass[];
	features: ProjectFeatures;
	/** Variable font axes. Undefined / empty = static font. */
	axes?: Axis[];
	/** Additional masters beyond the default. */
	masters?: Master[];
	/** Named instances baked into the VF's fvar table. */
	instances?: VariableInstance[];
	createdAt: string;
	updatedAt: string;
};

/** Standard registered OpenType variation axes. */
export const STANDARD_AXES: Record<string, { name: string; min: number; default: number; max: number }> = {
	wght: { name: 'Weight', min: 100, default: 400, max: 900 },
	wdth: { name: 'Width', min: 50, default: 100, max: 200 },
	opsz: { name: 'Optical size', min: 8, default: 14, max: 144 },
	slnt: { name: 'Slant', min: -15, default: 0, max: 0 },
	ital: { name: 'Italic', min: 0, default: 0, max: 1 }
};

/** Default metrics — UPM 1000 industry standard. */
export const DEFAULT_METRICS: FontMetrics = {
	unitsPerEm: 1000,
	ascender: 800,
	descender: -200,
	capHeight: 700,
	xHeight: 500,
	defaultSidebearing: 50
};

export const DEFAULT_FEATURES: ProjectFeatures = {
	kern: true,
	liga: false
};
