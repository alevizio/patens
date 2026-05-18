/**
 * Family CRUD — sibling-project linking for multi-style families.
 *
 * Each Family record represents a font family that spans multiple Project
 * records (one per style). The Family record is the canonical owner of
 * family-wide metadata (designer, copyright, license); siblings denormalize
 * `metadata.familyName` and inherit those fields unless overridden.
 *
 * See the v3 section of the plan file for the full design.
 */

import { get, set, del, createStore } from 'idb-keyval';
import type { Family, Project } from './types';
import { listProjects, loadProject, saveProject } from './project';

const familyStore = createStore('font-studio', 'families');
const FAMILY_INDEX_KEY = '__family_index__';

const newId = () => crypto.randomUUID();
const now = () => new Date().toISOString();

export type FamilyIndexEntry = {
	id: string;
	name: string;
	updatedAt: string;
	/** Cached count of sibling projects in this family. */
	siblingCount?: number;
};

const indexEntry = (f: Family, siblingCount: number): FamilyIndexEntry => ({
	id: f.id,
	name: f.name,
	updatedAt: f.updatedAt,
	siblingCount
});

export const createFamily = async (input: {
	name: string;
	designer?: string;
	copyright?: string;
	license?: string;
}): Promise<Family> => {
	const ts = now();
	const family: Family = {
		id: newId(),
		name: input.name.trim() || 'Untitled family',
		designer: input.designer?.trim() || undefined,
		copyright: input.copyright?.trim() || undefined,
		license: input.license?.trim() || undefined,
		createdAt: ts,
		updatedAt: ts
	};
	await set(family.id, family, familyStore);
	const idx = (await get<FamilyIndexEntry[]>(FAMILY_INDEX_KEY, familyStore)) ?? [];
	idx.push(indexEntry(family, 0));
	await set(FAMILY_INDEX_KEY, idx, familyStore);
	return family;
};

export const loadFamily = async (id: string): Promise<Family | null> => {
	const value = await get<Family>(id, familyStore);
	return value ?? null;
};

export const saveFamily = async (family: Family): Promise<void> => {
	const stamped: Family = { ...family, updatedAt: now() };
	await set(stamped.id, stamped, familyStore);
	const idx = (await get<FamilyIndexEntry[]>(FAMILY_INDEX_KEY, familyStore)) ?? [];
	const siblings = await listSiblings(stamped.id);
	const filtered = idx.filter((e) => e.id !== stamped.id);
	filtered.push(indexEntry(stamped, siblings.length));
	await set(FAMILY_INDEX_KEY, filtered, familyStore);
};

export const listFamilies = async (): Promise<FamilyIndexEntry[]> => {
	const idx = (await get<FamilyIndexEntry[]>(FAMILY_INDEX_KEY, familyStore)) ?? [];
	return [...idx].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
};

export const deleteFamily = async (id: string): Promise<void> => {
	// Unlink siblings (they keep existing as standalone projects). We rebuild the
	// project record without the family fields rather than spreading + destructure,
	// to guarantee no `familyId: undefined` survives the IndexedDB round-trip.
	const siblings = await listSiblings(id);
	for (const s of siblings) {
		const p = await loadProject(s.id);
		if (!p) continue;
		const cleaned: Project = { ...p };
		delete cleaned.familyId;
		delete cleaned.familyAxes;
		await saveProject(cleaned);
	}
	await del(id, familyStore);
	const idx = (await get<FamilyIndexEntry[]>(FAMILY_INDEX_KEY, familyStore)) ?? [];
	await set(
		FAMILY_INDEX_KEY,
		idx.filter((e) => e.id !== id),
		familyStore
	);
};

/** Projects whose `familyId` matches this family, ordered by their family axes. */
export const listSiblings = async (familyId: string) => {
	const idx = await listProjects();
	const siblings = idx.filter((p) => p.familyId === familyId);
	// Sort by ital first (upright before italic), then by wght (light → bold)
	return siblings.sort((a, b) => {
		const ai = a.familyAxes?.ital ?? 0;
		const bi = b.familyAxes?.ital ?? 0;
		if (ai !== bi) return ai - bi;
		const aw = a.familyAxes?.wght ?? 400;
		const bw = b.familyAxes?.wght ?? 400;
		return aw - bw;
	});
};

export const linkProjectToFamily = async (
	projectId: string,
	familyId: string,
	familyAxes?: Project['familyAxes']
): Promise<void> => {
	const p = await loadProject(projectId);
	if (!p) return;
	const next: Project = { ...p, familyId, familyAxes: familyAxes ?? p.familyAxes };
	await saveProject(next);
	// Refresh the family index sibling count
	const f = await loadFamily(familyId);
	if (f) await saveFamily(f);
};

export const unlinkProjectFromFamily = async (projectId: string): Promise<void> => {
	const p = await loadProject(projectId);
	if (!p?.familyId) return;
	const familyId = p.familyId;
	const cleaned: Project = { ...p };
	delete cleaned.familyId;
	delete cleaned.familyAxes;
	await saveProject(cleaned);
	const f = await loadFamily(familyId);
	if (f) await saveFamily(f);
};

/**
 * Propagate family-level designer/copyright/license to every sibling. Called
 * when the user edits these on the family hub. Per-sibling overrides are
 * intentional, so this overwrites — the family is the canonical owner of these
 * fields.
 */
export const propagateFamilyMetadata = async (familyId: string): Promise<number> => {
	const family = await loadFamily(familyId);
	if (!family) return 0;
	const siblings = await listSiblings(familyId);
	let count = 0;
	for (const s of siblings) {
		const p = await loadProject(s.id);
		if (!p) continue;
		// Treat empty strings as unset so the family hub can "clear" a propagated
		// field (UI sets the value to "" on blank input).
		const present = (v: string | undefined) =>
			v !== undefined && v.trim().length > 0;
		const nextMeta = {
			...p.metadata,
			familyName: family.name,
			...(present(family.designer) ? { designer: family.designer } : {}),
			...(present(family.copyright) ? { copyright: family.copyright } : {}),
			...(present(family.license) ? { license: family.license } : {})
		};
		await saveProject({ ...p, metadata: nextMeta });
		count++;
	}
	return count;
};

/**
 * Sync structural metrics (UPM + ascender/descender/capHeight/xHeight) from
 * the Regular sibling to one specific other sibling. Used by the family audit
 * auto-fix actions.
 */
export const syncMetricsFromRegular = async (
	familyId: string,
	targetProjectId: string
): Promise<boolean> => {
	const regular = await findRegularSibling(familyId);
	if (!regular || regular.id === targetProjectId) return false;
	const [regularProject, target] = await Promise.all([
		loadProject(regular.id),
		loadProject(targetProjectId)
	]);
	if (!regularProject || !target) return false;
	const next: Project = {
		...target,
		metrics: { ...target.metrics, ...regularProject.metrics }
	};
	await saveProject(next);
	return true;
};

/**
 * Copy missing anchors from the Regular sibling into one specific other
 * sibling. Existing anchors on the target are preserved; only missing-by-name
 * anchors are added at the Regular's coordinates.
 */
export const syncAnchorsFromRegular = async (
	familyId: string,
	targetProjectId: string
): Promise<number> => {
	const regular = await findRegularSibling(familyId);
	if (!regular || regular.id === targetProjectId) return 0;
	const [regularProject, target] = await Promise.all([
		loadProject(regular.id),
		loadProject(targetProjectId)
	]);
	if (!regularProject || !target) return 0;
	const nextGlyphs = { ...target.glyphs };
	let added = 0;
	for (const [cpStr, regGlyph] of Object.entries(regularProject.glyphs)) {
		const cp = Number(cpStr);
		const t = nextGlyphs[cp];
		if (!t) continue;
		const tAnchorNames = new Set((t.anchors ?? []).map((a) => a.name));
		const missing = (regGlyph.anchors ?? []).filter((a) => !tAnchorNames.has(a.name));
		if (missing.length === 0) continue;
		nextGlyphs[cp] = {
			...t,
			anchors: [...(t.anchors ?? []), ...missing.map((a) => ({ ...a }))],
			updatedAt: new Date().toISOString()
		};
		added += missing.length;
	}
	if (added > 0) {
		await saveProject({ ...target, glyphs: nextGlyphs });
	}
	return added;
};

/**
 * Find the canonical "Regular" sibling — `wght=400 ital=0`. Falls back to the
 * first sibling when no exact match exists. Used as the source of truth for
 * family-wide structural decisions (kerning classes, anchors).
 */
export const findRegularSibling = async (familyId: string) => {
	const siblings = await listSiblings(familyId);
	const exact = siblings.find(
		(s) =>
			(s.familyAxes?.wght ?? 400) === 400 &&
			!s.familyAxes?.ital &&
			(s.familyAxes?.wdth ?? 100) === 100
	);
	return exact ?? siblings[0] ?? null;
};

/**
 * Push the Regular sibling's kerning class *definitions* (names + members) to
 * every other sibling. The *pair values* in each sibling stay independent —
 * only the class shape propagates. Returns the number of siblings updated.
 */
export const propagateKerningClasses = async (familyId: string): Promise<number> => {
	const regular = await findRegularSibling(familyId);
	if (!regular) return 0;
	const regularProject = await loadProject(regular.id);
	if (!regularProject) return 0;
	const sourceClasses = regularProject.classes ?? [];
	const siblings = await listSiblings(familyId);
	let count = 0;
	for (const s of siblings) {
		if (s.id === regular.id) continue;
		const p = await loadProject(s.id);
		if (!p) continue;
		// Deep clone to avoid sharing refs across IndexedDB writes.
		const next: Project = {
			...p,
			classes: sourceClasses.map((c) => ({ ...c, members: [...c.members] }))
		};
		await saveProject(next);
		count++;
	}
	return count;
};

/**
 * Slant every contour point of a glyph by `tan(slantDeg)` on X (the standard
 * shear-italic transform). Coordinates are rounded to integer font units. The
 * skew center is the baseline (y=0), matching foundry convention.
 */
const slantContours = (
	contours: import('./types').BezierContour[],
	slantDeg: number
): import('./types').BezierContour[] => {
	const k = Math.tan((slantDeg * Math.PI) / 180);
	const shift = (x: number, y: number): { x: number; y: number } => ({
		x: Math.round(x + y * k),
		y
	});
	return contours.map((c) => ({
		...c,
		commands: c.commands.map((cmd) => {
			if (cmd.type === 'Z') return cmd;
			if (cmd.type === 'C') {
				const p1 = shift(cmd.x1, cmd.y1);
				const p2 = shift(cmd.x2, cmd.y2);
				const p = shift(cmd.x, cmd.y);
				return { ...cmd, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, x: p.x, y: p.y };
			}
			if (cmd.type === 'Q') {
				const p1 = shift(cmd.x1, cmd.y1);
				const p = shift(cmd.x, cmd.y);
				return { ...cmd, x1: p1.x, y1: p1.y, x: p.x, y: p.y };
			}
			const p = shift(cmd.x, cmd.y);
			return { ...cmd, x: p.x, y: p.y };
		})
	}));
};

/**
 * Create an italic sibling by slanting every contour from the template
 * (typically the Regular). Skips empty glyphs; preserves anchors (with the same
 * slant applied so they keep their relationship to the outlines).
 */
export const createSlantedSibling = async (
	templateProjectId: string,
	input: {
		styleName: string;
		familyAxes: Project['familyAxes'];
		slantDeg: number;
	}
): Promise<Project | null> => {
	const template = await loadProject(templateProjectId);
	if (!template) return null;
	const ts = now();
	const k = Math.tan((input.slantDeg * Math.PI) / 180);
	const slantedGlyphs: Project['glyphs'] = {};
	for (const [cpStr, g] of Object.entries(template.glyphs)) {
		const cp = Number(cpStr);
		const hasContent = g.contours.length > 0;
		slantedGlyphs[cp] = {
			...g,
			contours: hasContent ? slantContours(g.contours, input.slantDeg) : [],
			anchors: (g.anchors ?? []).map((a) => ({
				...a,
				x: Math.round(a.x + a.y * k)
			})),
			// Drop sketch + components — they don't slant meaningfully
			sketch: undefined,
			components: undefined,
			// Auto-italicized starts as 'draft' for content-bearing glyphs; designer
			// refines from here.
			status: hasContent ? 'draft' : 'empty',
			updatedAt: ts
		};
	}
	const sibling: Project = {
		...template,
		id: newId(),
		name: `${template.metadata.familyName} ${input.styleName}`,
		metadata: { ...template.metadata, styleName: input.styleName, version: '0.001' },
		glyphs: slantedGlyphs,
		kerning: [],
		instances: [],
		decisions: [],
		changelog: [],
		familyAxes: input.familyAxes,
		createdAt: ts,
		updatedAt: ts
	};
	await saveProject(sibling);
	return sibling;
};

/**
 * Create a new sibling style by cloning an existing project. The clone keeps
 * the family's structure (UPM, metrics, kerning classes, anchors) but starts
 * with empty glyphs so the designer can draw the new style from scratch.
 */
export const createSibling = async (
	templateProjectId: string,
	input: {
		styleName: string;
		familyAxes: Project['familyAxes'];
	}
): Promise<Project | null> => {
	const template = await loadProject(templateProjectId);
	if (!template) return null;
	const ts = now();
	const blankGlyphs: Project['glyphs'] = {};
	for (const [cpStr, g] of Object.entries(template.glyphs)) {
		// Drop contours, sketch, and components — composites would otherwise still
		// resolve through the template's outlines until the designer re-draws the
		// bases, producing silent visual inconsistency.
		// Keep anchors (used by family kerning + mkmk) and the glyph's name/codepoint.
		blankGlyphs[Number(cpStr)] = {
			...g,
			contours: [],
			sketch: undefined,
			components: undefined,
			status: 'empty',
			updatedAt: ts
		};
	}
	const sibling: Project = {
		...template,
		id: newId(),
		name: `${template.metadata.familyName} ${input.styleName}`,
		metadata: { ...template.metadata, styleName: input.styleName },
		glyphs: blankGlyphs,
		// Preserve kerning class structure but drop pair values (sibling re-tunes)
		kerning: [],
		// Drop instances; siblings start fresh
		instances: [],
		// Drop revisions and decisions; they're style-specific
		decisions: [],
		changelog: [],
		familyAxes: input.familyAxes,
		createdAt: ts,
		updatedAt: ts
	};
	await saveProject(sibling);
	return sibling;
};
