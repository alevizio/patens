/**
 * Project CRUD + persistence via idb-keyval.
 * Single store key per project; index list keyed by 'projects:index'.
 */

import { get, set, del, createStore } from 'idb-keyval';
import type { Axis, Glyph, Master, Project, FontMetrics, FontMetadata } from './types';
import { DEFAULT_METRICS, DEFAULT_FEATURES, STANDARD_AXES } from './types';
import { DEFAULT_GLYPH_SET } from './glyph-set';

const store = createStore('font-studio', 'projects');
const INDEX_KEY = '__index__';

export type ProjectIndexEntry = {
	id: string;
	name: string;
	familyName: string;
	createdAt: string;
	updatedAt: string;
	glyphCount: number;
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
}): Project => {
	const ts = now();
	const metrics = { ...DEFAULT_METRICS };
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

const indexEntry = (p: Project): ProjectIndexEntry => ({
	id: p.id,
	name: p.name,
	familyName: p.metadata.familyName,
	createdAt: p.createdAt,
	updatedAt: p.updatedAt,
	glyphCount: Object.values(p.glyphs).filter(
		(g) => g.contours.length > 0 || (g.components && g.components.length > 0)
	).length
});

export const listProjects = async (): Promise<ProjectIndexEntry[]> => {
	const idx = (await get<ProjectIndexEntry[]>(INDEX_KEY, store)) ?? [];
	return [...idx].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
};

export const loadProject = async (id: string): Promise<Project | null> => {
	const value = await get<Project>(id, store);
	return value ?? null;
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
