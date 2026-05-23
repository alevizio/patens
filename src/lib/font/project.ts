/**
 * Project CRUD + persistence via idb-keyval.
 * Single store key per project; index list keyed by 'projects:index'.
 */

import { get, set, del, createStore } from 'idb-keyval';
import type { Axis, Glyph, Master, Project, FontMetrics, FontMetadata } from './types';
import { DEFAULT_METRICS, DEFAULT_FEATURES, STANDARD_AXES, CURRENT_SCHEMA_VERSION } from './types';

/**
 * Project kind presets — each tweaks metric defaults to suit the family's
 * intended use case. Pure UX layer; the underlying data model is identical.
 */
export type ProjectKind = 'display' | 'text' | 'ui' | 'mono';

export const KIND_PRESETS: Record<
	ProjectKind,
	{ label: string; description: string; metrics: Partial<FontMetrics> }
> = {
	display: {
		label: 'Display',
		description: 'Posters, headlines, branding — tall caps, looser spacing.',
		metrics: { unitsPerEm: 1000, ascender: 850, descender: -200, capHeight: 740, xHeight: 510, defaultSidebearing: 60 }
	},
	text: {
		label: 'Text',
		description: 'Books, articles — modest contrast, taller x-height for reading.',
		metrics: { unitsPerEm: 1000, ascender: 800, descender: -200, capHeight: 700, xHeight: 530, defaultSidebearing: 50 }
	},
	ui: {
		label: 'UI',
		description: 'Apps, dashboards — large x-height, tight metrics, snap rendering.',
		metrics: { unitsPerEm: 1000, ascender: 800, descender: -200, capHeight: 720, xHeight: 560, defaultSidebearing: 45 }
	},
	mono: {
		label: 'Mono',
		description: 'Code, terminals — fixed advance width, generous metrics.',
		metrics: { unitsPerEm: 1000, ascender: 820, descender: -220, capHeight: 700, xHeight: 530, defaultSidebearing: 80 }
	}
};
import { DEFAULT_GLYPH_SET } from './glyph-set';
import { auditProject, auditCompatibility, preflightProject } from './audit';

const store = createStore('font-studio', 'projects');
const INDEX_KEY = '__index__';

export type ProjectIndexEntry = {
	id: string;
	name: string;
	familyName: string;
	createdAt: string;
	updatedAt: string;
	glyphCount: number;
	/** First line of brief.intent or project.description — surfaces project's purpose. */
	tagline?: string;
	/** SVG path of the first drawn glyph + its viewBox — for thumbnail preview on the home page. */
	thumbnail?: { path: string; viewBox: string; advance: number };
	/** Brief completeness 0-100 (6 fields, even weight). */
	briefPct?: number;
	/** Comma-joined list of unfilled brief fields — populates the badge tooltip. */
	briefMissing?: string[];
	/** Glyphs whose updatedAt is within the last 24 hours. */
	editsToday?: number;
	/** Glyphs whose updatedAt is within the last 7 days. */
	editsThisWeek?: number;
	/** Mirror of project.locked — surfaces a lock icon in lists. */
	locked?: boolean;
	/** Count of kerning pairs at index time — surfaces in stats popover / switcher. */
	kerningCount?: number;
	/** Edits per day for the last 14 days (index 0 = 14 days ago, index 13 = today). */
	editsByDay?: number[];
	/** Error count from auditProject + auditCompatibility + preflightProject
	 *  at index-build time. Drives the home-page card badge so designers see
	 *  at a glance which projects need attention. Recomputed on save. */
	auditErrorCount?: number;
	/** Warn count from the same combined audit run. */
	auditWarnCount?: number;
	/** Most recent changelog entry's version, when any has been sealed. */
	lastSealedVersion?: string;
	/** ISO date of the most recent changelog entry. */
	lastSealedAt?: string;
	/** When true, sorts to top of the home page. */
	pinned?: boolean;
	/** When true, hidden from home list unless "Show archived" is enabled. */
	archived?: boolean;
	/** Freeform organisational tags for the home page chips/filter. */
	tags?: string[];
	/** Codepoint + name of the most recently edited glyph (deep-linked from "Continue"). */
	lastEditedGlyph?: { codepoint: number; name: string };
	/** Optional family link — populated on the home page to surface the family chip. */
	familyId?: string;
	/** This sibling's position in the family's design space (rendered as compact chips). */
	familyAxes?: import('./types').FamilyAxes;
	/** Number of additional masters (a VF project ships >1 master at distinct
	 *  axis locations); used by the family hub to surface a "+N masters" chip
	 *  per sibling without loading the full project. Excludes the default. */
	masterCount?: number;
	/** Names of additional masters, in order. Capped at the first three to
	 *  keep the badge readable. */
	masterNames?: string[];
};

const newId = () => crypto.randomUUID();
const now = () => new Date().toISOString();

const seedGlyph = (codepoint: number, name: string, metrics: FontMetrics): Glyph => {
	let advance = Math.round(metrics.unitsPerEm * 0.6);
	if (codepoint === 0x20) advance = Math.round(metrics.unitsPerEm * 0.25);
	else if (codepoint >= 0x0030 && codepoint <= 0x0039) advance = Math.round(metrics.unitsPerEm * 0.55);
	else if (codepoint === 0x0049 || codepoint === 0x0069 || codepoint === 0x006c)
		advance = Math.round(metrics.unitsPerEm * 0.3);
	else if (codepoint === 0x004d || codepoint === 0x0057)
		advance = Math.round(metrics.unitsPerEm * 0.85);
	// Combining marks default to zero advance (they overlap the base)
	if (codepoint >= 0x0300 && codepoint <= 0x036f) advance = 0;

	const cx = Math.round(advance / 2);
	const isUpper = codepoint >= 0x0041 && codepoint <= 0x005a;
	const isLower = codepoint >= 0x0061 && codepoint <= 0x007a;
	const isMark = codepoint >= 0x0300 && codepoint <= 0x036f;
	const anchors: Glyph['anchors'] = [];
	if (isUpper) {
		anchors.push({ name: 'top', x: cx, y: metrics.capHeight });
		anchors.push({ name: 'bottom', x: cx, y: 0 });
	} else if (isLower) {
		anchors.push({ name: 'top', x: cx, y: metrics.xHeight });
		anchors.push({ name: 'bottom', x: cx, y: 0 });
	} else if (isMark) {
		// Mark anchor (entry) sits at the top of where the mark visually attaches.
		anchors.push({ name: '_top', x: cx, y: metrics.xHeight });
	}
	return {
		codepoint,
		name,
		status: 'empty',
		advanceWidth: advance,
		leftSidebearing: metrics.defaultSidebearing,
		rightSidebearing: metrics.defaultSidebearing,
		contours: [],
		anchors,
		updatedAt: now()
	};
};

export const createProject = (input: {
	name: string;
	familyName?: string;
	designer?: string;
	kind?: ProjectKind;
}): Project => {
	const ts = now();
	const baseMetrics = input.kind ? { ...DEFAULT_METRICS, ...KIND_PRESETS[input.kind].metrics } : { ...DEFAULT_METRICS };
	const metrics = baseMetrics;
	const metadata: FontMetadata = {
		familyName: input.familyName?.trim() || input.name.trim() || 'My Font',
		styleName: 'Regular',
		designer: input.designer?.trim() || '',
		copyright: `Copyright (c) ${new Date().getFullYear()}`,
		license: 'Personal use only',
		version: '1.000'
	};
	const glyphs: Record<number, Glyph> = {};
	for (const spec of DEFAULT_GLYPH_SET) {
		glyphs[spec.codepoint] = {
			...seedGlyph(spec.codepoint, spec.name, metrics),
			components: spec.composite
				? [
						{ baseCodepoint: spec.composite.base, offsetX: 0, offsetY: 0 },
						{ baseCodepoint: spec.composite.mark, offsetX: 0, offsetY: metrics.xHeight }
					]
				: undefined
		};
	}
	return {
		schemaVersion: CURRENT_SCHEMA_VERSION,
		id: newId(),
		name: input.name.trim() || 'Untitled font',
		metadata,
		metrics,
		glyphs,
		kerning: [],
		features: { ...DEFAULT_FEATURES },
		createdAt: ts,
		updatedAt: ts
	};
};

/**
 * Migrate a raw stored object forward to the current schema. Defensive: returns
 * `null` if the input is too broken to salvage. For backwards-compatible
 * additions we just fill in defaults; for shape-changing migrations, add an
 * explicit step in the switch below and bump `CURRENT_SCHEMA_VERSION` in types.
 */
export type MigrationResult = {
	project: Project;
	fromVersion: number;
	toVersion: number;
	upgraded: boolean;
};
export const migrate = (raw: unknown): MigrationResult | null => {
	if (!raw || typeof raw !== 'object') return null;
	const r = raw as Record<string, unknown> & Partial<Project>;
	// Must have an id and a glyphs map to be salvageable.
	if (typeof r.id !== 'string' || !r.glyphs || typeof r.glyphs !== 'object') return null;
	const fromVersion = typeof r.schemaVersion === 'number' ? r.schemaVersion : 0;
	let p = r as unknown as Project;
	// Stepwise migrations (none required yet at v1, but the switch is ready)
	let v = fromVersion;
	// Example for future use:
	// while (v < CURRENT_SCHEMA_VERSION) {
	//   switch (v) {
	//     case 0: p = migrateV0ToV1(p); v = 1; break;
	//     case 1: p = migrateV1ToV2(p); v = 2; break;
	//   }
	// }
	v = CURRENT_SCHEMA_VERSION;
	// Fill in any missing required fields with defaults, in case the stored
	// record predates a field being added.
	if (!p.metadata) p = { ...p, metadata: { ...({} as FontMetadata) } };
	if (!p.metrics) p = { ...p, metrics: { ...DEFAULT_METRICS } };
	if (!p.features) p = { ...p, features: { ...DEFAULT_FEATURES } };
	if (!Array.isArray(p.kerning)) p = { ...p, kerning: [] };
	if (!p.createdAt) p = { ...p, createdAt: now() };
	if (!p.updatedAt) p = { ...p, updatedAt: now() };
	const finalised: Project = { ...p, schemaVersion: v };
	return {
		project: finalised,
		fromVersion,
		toVersion: v,
		upgraded: fromVersion !== v
	};
};

const indexEntry = (p: Project): ProjectIndexEntry => {
	// Pick a representative drawn glyph for the thumbnail: prefer the first
	// letter of the family name, else first uppercase, else any drawn glyph.
	const drawn = Object.values(p.glyphs).filter((g) => g.contours.length > 0);
	const firstChar = p.metadata.familyName.trim()[0]?.toUpperCase();
	const target = firstChar
		? drawn.find((g) => String.fromCodePoint(g.codepoint) === firstChar)
		: undefined;
	const upper = drawn.find((g) => g.codepoint >= 0x0041 && g.codepoint <= 0x005a);
	const pick = target ?? upper ?? drawn[0];
	let thumbnail: ProjectIndexEntry['thumbnail'];
	if (pick) {
		const cmds: string[] = [];
		for (const c of pick.contours) {
			for (const cmd of c.commands) {
				if (cmd.type === 'M') cmds.push(`M${cmd.x} ${cmd.y}`);
				else if (cmd.type === 'L') cmds.push(`L${cmd.x} ${cmd.y}`);
				else if (cmd.type === 'Q') cmds.push(`Q${cmd.x1} ${cmd.y1} ${cmd.x} ${cmd.y}`);
				else if (cmd.type === 'C')
					cmds.push(`C${cmd.x1} ${cmd.y1} ${cmd.x2} ${cmd.y2} ${cmd.x} ${cmd.y}`);
				else if (cmd.type === 'Z') cmds.push('Z');
			}
		}
		const totalHeight = p.metrics.ascender - p.metrics.descender;
		thumbnail = {
			path: cmds.join(' '),
			// viewBox min-y is `descender` (not `-ascender`): paired with the
			// scaleY(-1) the renderer applies, this maps font ascender to the
			// visual top of the thumbnail and descender to the bottom.
			viewBox: `0 ${p.metrics.descender} ${Math.max(pick.advanceWidth, 200)} ${totalHeight}`,
			advance: pick.advanceWidth
		};
	}
	const taglineRaw = (p.brief?.intent ?? p.description ?? '').trim();
	const tagline = taglineRaw
		? taglineRaw.split(/\r?\n/)[0].trim().slice(0, 140)
		: undefined;
	const b = p.brief ?? {};
	const briefFieldChecks: Array<[string, boolean]> = [
		['intent', !!b.intent?.trim()],
		['audience', !!b.audience?.trim()],
		['use cases', (b.useCases?.length ?? 0) > 0],
		['reading conditions', !!b.readingConditions?.trim()],
		['differentiation', !!b.differentiation?.trim()],
		['references', (b.references?.length ?? 0) > 0]
	];
	const filled = briefFieldChecks.filter(([, ok]) => ok).length;
	const briefPct = Math.round((filled / briefFieldChecks.length) * 100);
	const briefMissing = briefFieldChecks.filter(([, ok]) => !ok).map(([name]) => name);
	const dayAgo = Date.now() - 24 * 3600 * 1000;
	const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
	let editsToday = 0;
	let editsThisWeek = 0;
	const DAY_MS = 24 * 3600 * 1000;
	const todayMid = new Date();
	todayMid.setHours(0, 0, 0, 0);
	const todayMidMs = todayMid.getTime();
	const editsByDay = new Array<number>(14).fill(0);
	let lastEditedGlyphEntry: ProjectIndexEntry['lastEditedGlyph'];
	let lastEditedAt = 0;
	for (const g of Object.values(p.glyphs)) {
		const t = Date.parse(g.updatedAt);
		if (!Number.isFinite(t)) continue;
		if (t >= dayAgo) editsToday++;
		if (t >= weekAgo) editsThisWeek++;
		const dayOffset = Math.floor((todayMidMs - t) / DAY_MS);
		if (dayOffset >= 0 && dayOffset < 14) {
			editsByDay[13 - dayOffset]++;
		}
		// Track the single most-recently edited glyph that has actual content.
		const hasContent =
			g.contours.length > 0 || (g.components?.length ?? 0) > 0 || (g.sketch?.length ?? 0) > 0;
		if (hasContent && t > lastEditedAt) {
			lastEditedAt = t;
			lastEditedGlyphEntry = { codepoint: g.codepoint, name: g.name };
		}
	}
	// Audit roll-up — combined error / warn count across the full
	// per-glyph + compatibility + preflight checks. Run at index-build
	// time (on save) so the home page never recomputes. Typical projects
	// (<300 glyphs) take a few ms total; large fonts may take 20-30ms
	// here, which is fine for a debounced-on-save path.
	const allIssues = [
		...auditProject(p),
		...auditCompatibility(p),
		...preflightProject(p)
	];
	const auditErrorCount = allIssues.filter((i) => i.severity === 'error').length;
	const auditWarnCount = allIssues.filter((i) => i.severity === 'warn').length;

	return {
		id: p.id,
		name: p.name,
		familyName: p.metadata.familyName,
		createdAt: p.createdAt,
		updatedAt: p.updatedAt,
		glyphCount: Object.values(p.glyphs).filter(
			(g) => g.contours.length > 0 || (g.components && g.components.length > 0)
		).length,
		tagline,
		thumbnail,
		briefPct,
		briefMissing,
		editsToday,
		editsThisWeek,
		editsByDay,
		auditErrorCount,
		auditWarnCount,
		locked: p.locked,
		kerningCount: p.kerning.length,
		lastSealedVersion: p.changelog?.[0]?.version,
		lastSealedAt: p.changelog?.[0]?.date,
		pinned: p.pinned,
		archived: p.archived,
		tags: p.tags,
		lastEditedGlyph: lastEditedGlyphEntry,
		familyId: p.familyId,
		familyAxes: p.familyAxes,
		masterCount: p.masters?.length,
		masterNames: (p.masters ?? []).slice(0, 3).map((m) => m.name)
	};
};

export const listProjects = async (): Promise<ProjectIndexEntry[]> => {
	const idx = (await get<ProjectIndexEntry[]>(INDEX_KEY, store)) ?? [];
	return [...idx].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
};

export const loadProject = async (id: string): Promise<Project | null> => {
	const value = await get<unknown>(id, store);
	if (value === undefined) return null;
	const result = migrate(value);
	if (!result) return null;
	// If the schema actually advanced, persist the upgraded record so the next
	// load is a no-op. Defensive against indefinitely-stale on-disk records.
	if (result.upgraded) {
		await set(id, result.project, store);
	}
	return result.project;
};

export const saveProject = async (project: Project): Promise<void> => {
	const stamped: Project = { ...project, updatedAt: now() };
	await set(stamped.id, stamped, store);
	const idx = (await get<ProjectIndexEntry[]>(INDEX_KEY, store)) ?? [];
	const filtered = idx.filter((e) => e.id !== stamped.id);
	filtered.push(indexEntry(stamped));
	await set(INDEX_KEY, filtered, store);
};

export const deleteProject = async (id: string): Promise<void> => {
	await del(id, store);
	const idx = (await get<ProjectIndexEntry[]>(INDEX_KEY, store)) ?? [];
	await set(
		INDEX_KEY,
		idx.filter((e) => e.id !== id),
		store
	);
};

export const toggleProjectPin = async (id: string): Promise<boolean> => {
	const value = await get<Project>(id, store);
	if (!value) return false;
	const next: Project = { ...value, pinned: !value.pinned };
	await set(id, next, store);
	const idx = (await get<ProjectIndexEntry[]>(INDEX_KEY, store)) ?? [];
	const filtered = idx.filter((e) => e.id !== id);
	filtered.push(indexEntry(next));
	await set(INDEX_KEY, filtered, store);
	return next.pinned === true;
};

/** Current backup envelope version. Bumped to 2 when schemaVersion was added. */
export const BACKUP_VERSION = 2;
export type Backup = {
	exportedAt: string;
	version: number;
	schemaVersion?: number;
	projects: Project[];
};

export const backupAllProjects = async (): Promise<Backup> => {
	const idx = (await get<ProjectIndexEntry[]>(INDEX_KEY, store)) ?? [];
	const projects: Project[] = [];
	for (const entry of idx) {
		const raw = await get<unknown>(entry.id, store);
		const migrated = migrate(raw);
		if (migrated) projects.push(migrated.project);
	}
	return {
		exportedAt: new Date().toISOString(),
		version: BACKUP_VERSION,
		schemaVersion: CURRENT_SCHEMA_VERSION,
		projects
	};
};

export const restoreFromBackup = async (
	data: { projects: unknown[]; version?: number },
	opts: { overwrite?: boolean } = {}
): Promise<{ added: number; skipped: number; upgraded: number }> => {
	let added = 0;
	let skipped = 0;
	let upgraded = 0;
	for (const raw of data.projects) {
		const result = migrate(raw);
		if (!result) {
			skipped++;
			continue;
		}
		const project = result.project;
		if (result.upgraded) upgraded++;
		if (!opts.overwrite) {
			const existing = await get<Project>(project.id, store);
			if (existing) {
				skipped++;
				continue;
			}
		}
		await saveProject(project);
		added++;
	}
	return { added, skipped, upgraded };
};

export const toggleProjectArchive = async (id: string): Promise<boolean> => {
	const value = await get<Project>(id, store);
	if (!value) return false;
	const next: Project = { ...value, archived: !value.archived };
	await set(id, next, store);
	const idx = (await get<ProjectIndexEntry[]>(INDEX_KEY, store)) ?? [];
	const filtered = idx.filter((e) => e.id !== id);
	filtered.push(indexEntry(next));
	await set(INDEX_KEY, filtered, store);
	return next.archived === true;
};

export const duplicateProject = async (id: string, newName?: string): Promise<Project | null> => {
	const original = await loadProject(id);
	if (!original) return null;
	const copy: Project = {
		...original,
		id: newId(),
		name: newName ?? `${original.name} copy`,
		createdAt: now(),
		updatedAt: now()
	};
	await saveProject(copy);
	return copy;
};

/** First contour ever drawn locks the UPM (warn UI before letting user change). */
export const hasAnyContours = (project: Project): boolean =>
	Object.values(project.glyphs).some((g) => g.contours.length > 0);

/**
 * Add a registered axis to the project (idempotent — no-op if axis with the
 * same tag is already present).
 */
export const addAxis = (project: Project, tag: string, location = 0): Project => {
	const existing = project.axes ?? [];
	if (existing.some((a) => a.tag === tag)) return project;
	const def = STANDARD_AXES[tag];
	const axis: Axis = def
		? {
				tag,
				name: def.name,
				minimum: def.min,
				default: def.default,
				maximum: def.max
			}
		: {
				tag,
				name: tag,
				minimum: 0,
				default: 0,
				maximum: 1000
			};
	return { ...project, axes: [...existing, axis], updatedAt: now() };
};

export const removeAxis = (project: Project, tag: string): Project => {
	const axes = (project.axes ?? []).filter((a) => a.tag !== tag);
	// Also clean up the tag from every master's location
	const masters = (project.masters ?? []).map((m) => {
		const loc = { ...m.location };
		delete loc[tag];
		return { ...m, location: loc };
	});
	return { ...project, axes, masters, updatedAt: now() };
};

// Deep-copy via JSON serialization to strip any Svelte $state proxies the
// caller may have passed in. Project glyph data is plain JSON anyway, so the
// round-trip is lossless. Avoids `structuredClone` which throws on proxies.
const cloneGlyphs = (src: Record<number, Glyph>): Record<number, Glyph> => {
	return JSON.parse(JSON.stringify(src)) as Record<number, Glyph>;
};

/**
 * Add a new master, copying the default master's glyphs as a starting point
 * (so it's automatically interpolation-compatible). Location should specify
 * a value for at least one defined axis.
 */
export const addMaster = (
	project: Project,
	input: { name: string; location: Record<string, number> }
): Project => {
	const ts = now();
	const master: Master = {
		id: newId(),
		name: input.name.trim() || 'Untitled master',
		location: { ...input.location },
		glyphs: cloneGlyphs(project.glyphs),
		createdAt: ts,
		updatedAt: ts
	};
	return { ...project, masters: [...(project.masters ?? []), master], updatedAt: ts };
};

export const removeMaster = (project: Project, masterId: string): Project => ({
	...project,
	masters: (project.masters ?? []).filter((m) => m.id !== masterId),
	updatedAt: now()
});

export const updateMaster = (
	project: Project,
	masterId: string,
	mut: (m: Master) => Master
): Project => ({
	...project,
	masters: (project.masters ?? []).map((m) => (m.id === masterId ? mut(m) : m)),
	updatedAt: now()
});

export const updateMasterGlyph = (
	project: Project,
	masterId: string,
	codepoint: number,
	mut: (g: Glyph) => Glyph
): Project => {
	return updateMaster(project, masterId, (m) => {
		const current = m.glyphs[codepoint];
		if (!current) return m;
		const next = mut({ ...current });
		next.updatedAt = now();
		return {
			...m,
			glyphs: { ...m.glyphs, [codepoint]: next },
			updatedAt: now()
		};
	});
};

/**
 * Add a script pack's glyphs to an existing project. No-ops for codepoints
 * already present (so re-adding is safe and idempotent).
 */
export const addScriptPack = (
	project: Project,
	pack: { glyphs: { codepoint: number; name: string; composite?: { base: number; mark: number } }[] }
): Project => {
	const next: Record<number, Glyph> = { ...project.glyphs };
	for (const spec of pack.glyphs) {
		if (next[spec.codepoint]) continue;
		next[spec.codepoint] = {
			...seedGlyph(spec.codepoint, spec.name, project.metrics),
			components: spec.composite
				? [
						{ baseCodepoint: spec.composite.base, offsetX: 0, offsetY: 0 },
						{ baseCodepoint: spec.composite.mark, offsetX: 0, offsetY: project.metrics.xHeight }
					]
				: undefined
		};
	}
	return { ...project, glyphs: next, updatedAt: now() };
};
