import { c as listProjects, f as saveProject, l as loadProject } from "./project.js";
import { createStore, get, set } from "idb-keyval";
//#region src/lib/font/family.ts
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
var familyStore = createStore("font-studio-families", "families");
var FAMILY_INDEX_KEY = "__family_index__";
var now = () => (/* @__PURE__ */ new Date()).toISOString();
var indexEntry = (f, siblingCount) => ({
	id: f.id,
	name: f.name,
	updatedAt: f.updatedAt,
	siblingCount
});
var loadFamily = async (id) => {
	return await get(id, familyStore) ?? null;
};
var saveFamily = async (family) => {
	const stamped = {
		...family,
		updatedAt: now()
	};
	await set(stamped.id, stamped, familyStore);
	const idx = await get(FAMILY_INDEX_KEY, familyStore) ?? [];
	const siblings = await listSiblings(stamped.id);
	const filtered = idx.filter((e) => e.id !== stamped.id);
	filtered.push(indexEntry(stamped, siblings.length));
	await set(FAMILY_INDEX_KEY, filtered, familyStore);
};
var listFamilies = async () => {
	return [...await get(FAMILY_INDEX_KEY, familyStore) ?? []].sort((a, b) => a.updatedAt < b.updatedAt ? 1 : -1);
};
/** Projects whose `familyId` matches this family, ordered by their family axes. */
var listSiblings = async (familyId) => {
	return (await listProjects()).filter((p) => p.familyId === familyId).sort((a, b) => {
		const ai = a.familyAxes?.ital ?? 0;
		const bi = b.familyAxes?.ital ?? 0;
		if (ai !== bi) return ai - bi;
		return (a.familyAxes?.wght ?? 400) - (b.familyAxes?.wght ?? 400);
	});
};
/**
* Propagate family-level designer/copyright/license to every sibling. Called
* when the user edits these on the family hub. Per-sibling overrides are
* intentional, so this overwrites — the family is the canonical owner of these
* fields.
*
* Locked siblings are skipped (name-table metadata is shipped content, and the
* lock contract is "no content edits until unlocked"). Returns count of
* siblings actually updated and a separate list of skipped-because-locked ids.
*/
var propagateFamilyMetadata = async (familyId) => {
	const family = await loadFamily(familyId);
	if (!family) return {
		updated: 0,
		skipped: []
	};
	const siblings = await listSiblings(familyId);
	let updated = 0;
	const skipped = [];
	for (const s of siblings) {
		const p = await loadProject(s.id);
		if (!p) continue;
		if (p.locked) {
			skipped.push(p.metadata.styleName || p.name);
			continue;
		}
		const present = (v) => v !== void 0 && v.trim().length > 0;
		const nextMeta = {
			...p.metadata,
			familyName: family.name,
			...present(family.designer) ? { designer: family.designer } : {},
			...present(family.copyright) ? { copyright: family.copyright } : {},
			...present(family.license) ? { license: family.license } : {}
		};
		await saveProject({
			...p,
			metadata: nextMeta
		});
		updated++;
	}
	return {
		updated,
		skipped
	};
};
/**
* Find the canonical "Regular" sibling — `wght=400 ital=0`. Falls back to the
* first sibling when no exact match exists. Used as the source of truth for
* family-wide structural decisions (kerning classes, anchors).
*/
var findRegularSibling = async (familyId) => {
	const siblings = await listSiblings(familyId);
	return siblings.find((s) => (s.familyAxes?.wght ?? 400) === 400 && !s.familyAxes?.ital && (s.familyAxes?.wdth ?? 100) === 100) ?? siblings[0] ?? null;
};
/**
* Push the Regular sibling's kerning class *definitions* (names + members) to
* every other sibling. The *pair values* in each sibling stay independent —
* only the class shape propagates. Returns the number of siblings updated.
*/
var propagateKerningClasses = async (familyId) => {
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
		if (!p || p.locked) continue;
		await saveProject({
			...p,
			classes: sourceClasses.map((c) => ({
				...c,
				members: [...c.members]
			}))
		});
		count++;
	}
	return count;
};
/**
* Build every sibling's OTF in-browser and register each as a FontFace with a
* unique CSS family name (e.g. `__family-<id>__regular`). The caller can then
* render the same text in every sibling's actual rendered font, side-by-side.
*
* Returns a map of sibling project id → CSS family name. Already-registered
* faces are returned without rebuilding. Caller can call `unloadSiblingFonts`
* to clean up when the comparison view is dismissed.
*/
var loadedFontFaces = /* @__PURE__ */ new Map();
var loadSiblingFonts = async (familyId) => {
	const sibs = await listSiblings(familyId);
	const out = /* @__PURE__ */ new Map();
	for (const s of sibs) {
		const familyName = `__sibling-${s.id}__`;
		out.set(s.id, familyName);
		if (loadedFontFaces.has(s.id)) continue;
		const project = await loadProject(s.id);
		if (!project) continue;
		const { buildFont } = await import("./export2.js");
		const { font } = buildFont(project);
		const buffer = font.toArrayBuffer();
		try {
			const face = new FontFace(familyName, buffer);
			await face.load();
			document.fonts.add(face);
			loadedFontFaces.set(s.id, face);
		} catch (err) {
			console.warn(`Failed to load sibling font ${s.id}:`, err);
		}
	}
	return out;
};
var unloadSiblingFonts = () => {
	for (const face of loadedFontFaces.values()) try {
		document.fonts.delete(face);
	} catch {}
	loadedFontFaces.clear();
};
//#endregion
export { propagateFamilyMetadata as a, unloadSiblingFonts as c, loadSiblingFonts as i, listSiblings as n, propagateKerningClasses as o, loadFamily as r, saveFamily as s, listFamilies as t };
