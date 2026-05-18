/**
 * Font Studio data model.
 * Coordinate system: font space, Y+ is UP, origin at glyph baseline.
 */

export type GlyphStatus = 'empty' | 'sketch' | 'draft' | 'final';

/**
 * Whether an on-curve point is a "smooth" tangent or a "corner". Smooth points
 * constrain incoming/outgoing handles to be colinear when one handle is dragged
 * (G1 continuity). Corner points have independent handles. Defaults to corner
 * when unset (preserves existing behavior on older glyph data).
 */
export type PointType = 'smooth' | 'corner';

export type PathCommand =
	| { type: 'M'; x: number; y: number; pointType?: PointType }
	| { type: 'L'; x: number; y: number; pointType?: PointType }
	| { type: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number; pointType?: PointType }
	| { type: 'Q'; x1: number; y1: number; x: number; y: number; pointType?: PointType }
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
	/** Pinned glyphs surface at the top of the browser for fast access. */
	pinned?: boolean;
	/** Flagged for review — orthogonal to status. Surfaces as a warning dot on the tile. */
	flagged?: boolean;
	/** When true, sidebearing/advance inputs in the editor are read-only — protect finalised metrics from accidental edits. */
	metricsLocked?: boolean;
	/** Saved snapshots of the contour state — for iteration / undo at a coarse level. */
	revisions?: GlyphRevision[];
	updatedAt: string;
};

export type GlyphRevision = {
	id: string;
	takenAt: string;
	/** Optional designer-supplied label. */
	label?: string;
	contours: BezierContour[];
	advanceWidth: number;
	leftSidebearing: number;
	rightSidebearing: number;
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

/**
 * A sidebearing class: a named group of glyphs that share LSB and RSB. Editing
 * any one through the class updates every member. font5.md: "well-set
 * sidebearings should create a stable text color across repeated patterns of
 * stems, rounds, diagonals … before heavy kerning is introduced."
 */
export type SidebearingClass = {
	id: string;
	name: string;
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
	/**
	 * OS/2.fsType embedding bits — controls how desktop apps embed the font.
	 * 0 = Installable (Google Fonts requirement for libre fonts);
	 * 2 = Restricted; 4 = Preview & Print; 8 = Editable.
	 * Undefined defaults to 0 at build time.
	 */
	fsType?: 0 | 2 | 4 | 8;
};

export const FS_TYPE_OPTIONS: Array<{ value: 0 | 2 | 4 | 8; label: string; hint: string }> = [
	{ value: 0, label: 'Installable embedding (0)', hint: 'No restrictions — required by Google Fonts for OFL projects.' },
	{ value: 2, label: 'Restricted (2)', hint: 'No embedding without explicit permission. Commercial-restrictive.' },
	{ value: 4, label: 'Preview & Print (4)', hint: 'Documents may embed but text is read-only when embedded.' },
	{ value: 8, label: 'Editable (8)', hint: 'Documents may embed and text remains editable downstream.' }
];

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

/**
 * The current Project schema version. Bump when making a breaking change to the
 * shape of `Project` or any of its nested types. Pair the bump with a step in
 * `migrate()` in `project.ts` that transforms the prior shape forward.
 */
export const CURRENT_SCHEMA_VERSION = 2;

/**
 * A multi-style font family. Each Project that opts in stores a `familyId`
 * pointing to a Family record; the Family hub then renders all siblings
 * together and supports family-wide operations (name, designer, license).
 * Per-style fields (`metadata.familyName` etc.) remain authoritative inside
 * each Project; the Family record is the canonical owner that fans changes
 * out to its siblings.
 */
export type Family = {
	id: string;
	name: string;
	/** Optional family-wide designer/copyright/license — siblings inherit unless overridden */
	designer?: string;
	copyright?: string;
	license?: string;
	createdAt: string;
	updatedAt: string;
};

/**
 * A Project's position in its Family's static design space. Used to drive STAT
 * generation in the family bundle export.
 */
export type FamilyAxes = {
	/** OS/2 weight class, 100..900. Regular=400, Bold=700. */
	wght?: number;
	/** OS/2 width class, 50..200 (percentage of normal). */
	wdth?: number;
	/** 0 = upright, 1 = italic. */
	ital?: 0 | 1;
	/** Slant in degrees, -15..0. */
	slnt?: number;
};

export type Project = {
	/** Schema version of this Project record. Pinned via `CURRENT_SCHEMA_VERSION`
	 * at create time; `migrate()` advances older records to the current version. */
	schemaVersion?: number;
	id: string;
	name: string;
	/** Freeform brief / goals / sketch ideas — shown on the home page tooltip + stats popover. */
	description?: string;
	/** Structured design brief — the "type design is system design" artifact. */
	brief?: ProjectBrief;
	/** Release readiness checklist — manual sign-offs for cross-platform tests. */
	releaseChecks?: Record<string, boolean>;
	/** Versioned release notes — one entry per shipped version. */
	changelog?: ChangelogEntry[];
	/** Living log of design decisions and their rationale (per-decision, not per-version). */
	decisions?: DecisionEntry[];
	/** When true, the project is sealed read-only; the editor still views but every mutation is blocked at the store level. */
	locked?: boolean;
	/** When true, the project floats to the top of the home page list. */
	pinned?: boolean;
	/** When true, the project is hidden from the default home list (toggle "Show archived"). */
	archived?: boolean;
	/** Freeform tags for organising the home list (lowercased, deduped). */
	tags?: string[];
	/** Which specimen sections render. Unset = all on. */
	specimenSections?: Record<string, boolean>;
	/** Designer-supplied proofing strings shown in Preview + Specimen instead of defaults. */
	samples?: ProjectSamples;
	metadata: FontMetadata;
	metrics: FontMetrics;
	/** Default master's glyphs, keyed by Unicode codepoint. */
	glyphs: Record<number, Glyph>;
	kerning: KerningPair[];
	classes?: KerningClass[];
	/** Sidebearing groups — linked LSB/RSB across members. */
	sidebearingClasses?: SidebearingClass[];
	features: ProjectFeatures;
	/** Variable font axes. Undefined / empty = static font. */
	axes?: Axis[];
	/** Additional masters beyond the default. */
	masters?: Master[];
	/** Named instances baked into the VF's fvar table. */
	instances?: VariableInstance[];
	/** Optional Family link — siblings sharing this id render together in /family/[id]. */
	familyId?: string;
	/** This sibling's position in the family's design space (drives STAT records). */
	familyAxes?: FamilyAxes;
	createdAt: string;
	updatedAt: string;
};

/** Structured design brief — populated on the /brief route. */
export type ProjectBrief = {
	intent?: string;
	audience?: string;
	useCases?: UseCase[];
	readingConditions?: string;
	differentiation?: string;
	references?: BriefReference[];
	/** Editorial "design notes" essay — Hoefler-style narrative shown on the specimen. */
	designNotes?: string;
};

export type UseCase =
	| 'print'
	| 'web-ui'
	| 'body-text'
	| 'display'
	| 'signage'
	| 'code'
	| 'data-tables'
	| 'editorial'
	| 'branding'
	| 'multiscript';

export const USE_CASE_LABELS: Record<UseCase, string> = {
	print: 'Print / publishing',
	'web-ui': 'Web UI',
	'body-text': 'Body / paragraph',
	display: 'Display / headlines',
	signage: 'Signage / wayfinding',
	code: 'Code / monospace',
	'data-tables': 'Data tables',
	editorial: 'Editorial',
	branding: 'Branding identity',
	multiscript: 'Multiscript / multilingual'
};

export type ProjectSamples = {
	/** Paragraph used in Preview's Paragraph panel + Specimen's Paragraph section. */
	paragraph?: string;
};

export type ChangelogEntry = {
	id: string;
	version: string;
	date: string;
	notes: string;
};

/**
 * A timestamped design decision — separate from the version-scoped changelog.
 * Captures the *why* behind a non-trivial choice as it happens, so the
 * rationale is recorded while the context is fresh. font5.md: "foundries that
 * explain their decisions … get studied."
 */
export type DecisionEntry = {
	id: string;
	date: string;
	decision: string;
	rationale: string;
};

export type BriefReference = {
	id: string;
	name: string;
	url?: string;
	kind?: 'functional' | 'historical' | 'competitive';
	notes?: string;
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
