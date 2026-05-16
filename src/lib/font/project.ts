/**
 * Project CRUD + persistence via idb-keyval.
 * Single store key per project; index list keyed by 'projects:index'.
 */

import { get, set, del, createStore } from 'idb-keyval';
import type { Glyph, Project, FontMetrics, FontMetadata } from './types';
import { DEFAULT_METRICS, DEFAULT_FEATURES } from './types';
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
	// Sensible default advance widths so the editor canvas looks letter-shaped
	// before any drawing happens.
	let advance = Math.round(metrics.unitsPerEm * 0.6);
	if (codepoint === 0x20) advance = Math.round(metrics.unitsPerEm * 0.25);
	else if (codepoint >= 0x0030 && codepoint <= 0x0039) advance = Math.round(metrics.unitsPerEm * 0.55);
	else if (codepoint === 0x0049 || codepoint === 0x0069 || codepoint === 0x006c)
		advance = Math.round(metrics.unitsPerEm * 0.3);
	else if (codepoint === 0x004d || codepoint === 0x0057)
		advance = Math.round(metrics.unitsPerEm * 0.85);
	return {
		codepoint,
		name,
		status: 'empty',
		advanceWidth: advance,
		leftSidebearing: metrics.defaultSidebearing,
		rightSidebearing: metrics.defaultSidebearing,
		contours: [],
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
