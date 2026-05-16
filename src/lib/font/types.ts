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
	updatedAt: string;
};

export type KerningPair = {
	left: number; // codepoint
	right: number; // codepoint
	value: number; // negative = pull together, positive = push apart
};

export type KerningClass = {
	name: string;
	members: number[]; // codepoints
};

export type FontMetrics = {
	unitsPerEm: number;
	ascender: number;
	descender: number;
	capHeight: number;
	xHeight: number;
	defaultSidebearing: number;
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

export type Project = {
	id: string;
	name: string;
	metadata: FontMetadata;
	metrics: FontMetrics;
	/** Keyed by Unicode codepoint. */
	glyphs: Record<number, Glyph>;
	kerning: KerningPair[];
	classes?: KerningClass[];
	features: ProjectFeatures;
	createdAt: string;
	updatedAt: string;
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
