/**
 * Yjs ↔ Project schema bridge — first foundation commit for the CRDT
 * collab arc (roadmap §12, "Phase C: Option D→B"). Pure data layer:
 * defines the shape of a Y.Doc that mirrors `Project` and provides
 * lossless round-trip conversions both ways.
 *
 * Why this exists separately from the rest of the store:
 *
 * The eventual collab refactor moves `projectStore.project` from a
 * plain `$state<Project>` into a Y.Doc that automatically syncs via
 * y-indexeddb + y-partykit. Doing that as one big-bang change risks
 * destabilising everything that depends on the store. So we land the
 * **conversion** first as a tested module, then in a later commit
 * swap the store internals. The conversion module is the contract
 * between "what the rest of the app expects" (Project shape) and
 * "what the network sends" (Y.Doc updates).
 *
 * **Conflict model (per the CRDT research):**
 * - Y.Text for free-text fields (notes, brief.intent, .fea source,
 *   designNotes) — character-level merge.
 * - Y.Map for keyed records (glyphs by codepoint, named axes, etc.).
 * - Y.Array for ordered collections (kerning pairs, palettes,
 *   masters, instances, classes).
 * - Bezier contours: LWW at the contour level, NOT per-point — no
 *   prior art for vector-graphics character-level CRDT, and the
 *   research recommended Figma's pattern. The "active editor lock
 *   per glyph" via Yjs awareness lands in a later phase.
 *
 * This file ships the **schema definition + round-trip primitives**.
 * The live Yjs binding inside `projectStore` lands in a later commit
 * once the round-trip is stable on `main`.
 */

import * as Y from 'yjs';
import type { Project } from '$lib/font/types';

/**
 * Top-level Y.Doc field names. Stable strings — changing them is a
 * schema break that requires a migration. Keep aligned with Project's
 * top-level keys for grep-ability.
 */
export const ROOT = {
	id: 'id',
	name: 'name',
	description: 'description',
	metadata: 'metadata',
	metrics: 'metrics',
	glyphs: 'glyphs',
	kerning: 'kerning',
	classes: 'classes',
	sidebearingClasses: 'sidebearingClasses',
	features: 'features',
	axes: 'axes',
	masters: 'masters',
	instances: 'instances',
	palettes: 'palettes',
	brief: 'brief',
	changelog: 'changelog',
	decisions: 'decisions',
	releaseChecks: 'releaseChecks',
	specimenSections: 'specimenSections',
	samples: 'samples',
	tags: 'tags',
	familyId: 'familyId',
	familyAxes: 'familyAxes',
	locked: 'locked',
	pinned: 'pinned',
	archived: 'archived',
	schemaVersion: 'schemaVersion',
	createdAt: 'createdAt',
	updatedAt: 'updatedAt'
} as const;

/**
 * Encode an existing Project into a fresh Y.Doc. The result is
 * suitable for handing to y-indexeddb / y-partykit; once a Y.Doc
 * exists for a project, subsequent edits should go through Y.Doc
 * transactions, not through `projectToYDoc` again.
 *
 * Implementation note: we stash deeply-nested arrays + objects as
 * Y.Map / Y.Array where the research recommends collab semantics
 * (kerning, palettes, glyphs by codepoint). Smaller scalar fields go
 * as plain JS values inside a single root Y.Map. This minimises
 * Y.Doc memory footprint without sacrificing collab granularity.
 */
export const projectToYDoc = (project: Project, target?: Y.Doc): Y.Doc => {
	const doc = target ?? new Y.Doc();
	doc.transact(() => {
		const root = doc.getMap('project');
		// Scalars + plain objects — set directly. These don't need
		// per-field CRDT semantics; whole-value LWW is fine.
		setScalar(root, ROOT.id, project.id);
		setScalar(root, ROOT.name, project.name);
		setScalar(root, ROOT.description, project.description);
		setScalar(root, ROOT.metadata, project.metadata);
		setScalar(root, ROOT.metrics, project.metrics);
		setScalar(root, ROOT.features, project.features);
		setScalar(root, ROOT.familyId, project.familyId);
		setScalar(root, ROOT.familyAxes, project.familyAxes);
		setScalar(root, ROOT.locked, project.locked);
		setScalar(root, ROOT.pinned, project.pinned);
		setScalar(root, ROOT.archived, project.archived);
		setScalar(root, ROOT.schemaVersion, project.schemaVersion);
		setScalar(root, ROOT.createdAt, project.createdAt);
		setScalar(root, ROOT.updatedAt, project.updatedAt);
		setScalar(root, ROOT.brief, project.brief);
		setScalar(root, ROOT.changelog, project.changelog);
		setScalar(root, ROOT.decisions, project.decisions);
		setScalar(root, ROOT.releaseChecks, project.releaseChecks);
		setScalar(root, ROOT.specimenSections, project.specimenSections);
		setScalar(root, ROOT.samples, project.samples);
		setScalar(root, ROOT.tags, project.tags);

		// Glyphs: Y.Map keyed by codepoint-as-string. Per-glyph edits
		// land on isolated keys so two designers editing different
		// glyphs never conflict.
		const glyphMap = new Y.Map<unknown>();
		root.set(ROOT.glyphs, glyphMap);
		for (const [cp, glyph] of Object.entries(project.glyphs)) {
			glyphMap.set(cp, glyph);
		}

		// Ordered arrays: Y.Array gives us insertion + deletion CRDT
		// semantics. For now we stash each item as a plain object;
		// inner-field CRDT-isation lands later if usage demands.
		setArray(root, ROOT.kerning, project.kerning);
		setArray(root, ROOT.classes, project.classes);
		setArray(root, ROOT.sidebearingClasses, project.sidebearingClasses);
		setArray(root, ROOT.axes, project.axes);
		setArray(root, ROOT.masters, project.masters);
		setArray(root, ROOT.instances, project.instances);
		setArray(root, ROOT.palettes, project.palettes);
	});
	return doc;
};

/**
 * Decode a Y.Doc back to a plain Project. Should be a no-op
 * round-trip for documents created by `projectToYDoc` — verified by
 * the test suite. Used for snapshotting / debugging / migration.
 */
export const yDocToProject = (doc: Y.Doc): Project => {
	const root = doc.getMap('project');
	const glyphMapRaw = root.get(ROOT.glyphs);
	const glyphMap =
		glyphMapRaw instanceof Y.Map ? glyphMapRaw : new Y.Map<unknown>();
	const glyphs: Record<number, Project['glyphs'][number]> = {};
	for (const [cp, glyph] of glyphMap.entries()) {
		glyphs[Number(cp)] = glyph as Project['glyphs'][number];
	}
	const project: Project = {
		id: getScalar(root, ROOT.id, ''),
		name: getScalar(root, ROOT.name, ''),
		description: getScalar(root, ROOT.description, undefined),
		metadata: getScalar(root, ROOT.metadata, undefined as unknown as Project['metadata']),
		metrics: getScalar(root, ROOT.metrics, undefined as unknown as Project['metrics']),
		features: getScalar(root, ROOT.features, undefined as unknown as Project['features']),
		glyphs,
		kerning: getArray(root, ROOT.kerning),
		classes: getArrayOptional(root, ROOT.classes),
		sidebearingClasses: getArrayOptional(root, ROOT.sidebearingClasses),
		axes: getArrayOptional(root, ROOT.axes),
		masters: getArrayOptional(root, ROOT.masters),
		instances: getArrayOptional(root, ROOT.instances),
		palettes: getArrayOptional(root, ROOT.palettes),
		brief: getScalar(root, ROOT.brief, undefined),
		changelog: getScalar(root, ROOT.changelog, undefined),
		decisions: getScalar(root, ROOT.decisions, undefined),
		releaseChecks: getScalar(root, ROOT.releaseChecks, undefined),
		specimenSections: getScalar(root, ROOT.specimenSections, undefined),
		samples: getScalar(root, ROOT.samples, undefined),
		tags: getScalar(root, ROOT.tags, undefined),
		familyId: getScalar(root, ROOT.familyId, undefined),
		familyAxes: getScalar(root, ROOT.familyAxes, undefined),
		locked: getScalar(root, ROOT.locked, undefined),
		pinned: getScalar(root, ROOT.pinned, undefined),
		archived: getScalar(root, ROOT.archived, undefined),
		schemaVersion: getScalar(root, ROOT.schemaVersion, undefined),
		createdAt: getScalar(root, ROOT.createdAt, ''),
		updatedAt: getScalar(root, ROOT.updatedAt, '')
	};
	return project;
};

// ---------- helpers ----------

const setScalar = (map: Y.Map<unknown>, key: string, value: unknown): void => {
	if (value === undefined) return;
	map.set(key, value);
};

const getScalar = <T>(map: Y.Map<unknown>, key: string, fallback: T): T => {
	if (!map.has(key)) return fallback;
	return map.get(key) as T;
};

const setArray = <T>(map: Y.Map<unknown>, key: string, items: T[] | undefined): void => {
	if (!items) return;
	const arr = new Y.Array<T>();
	arr.insert(0, items);
	map.set(key, arr);
};

const getArray = <T>(map: Y.Map<unknown>, key: string): T[] => {
	const v = map.get(key);
	if (v instanceof Y.Array) return v.toArray() as T[];
	return [];
};

const getArrayOptional = <T>(map: Y.Map<unknown>, key: string): T[] | undefined => {
	const v = map.get(key);
	if (v === undefined) return undefined;
	if (v instanceof Y.Array) return v.toArray() as T[];
	return undefined;
};
