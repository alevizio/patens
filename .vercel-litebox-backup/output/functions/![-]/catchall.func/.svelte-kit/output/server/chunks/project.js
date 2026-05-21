import { createStore, del, get, set } from "idb-keyval";
//#region src/lib/font/types.ts
var isClassRef = (side) => typeof side === "string" && side.startsWith("@");
/** Derive the full vertical metric set from the basic ascender/descender pair. */
var resolveVerticalMetrics = (m) => {
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
var FS_TYPE_OPTIONS = [
	{
		value: 0,
		label: "Installable embedding (0)",
		hint: "No restrictions — required by Google Fonts for OFL projects."
	},
	{
		value: 2,
		label: "Restricted (2)",
		hint: "No embedding without explicit permission. Commercial-restrictive."
	},
	{
		value: 4,
		label: "Preview & Print (4)",
		hint: "Documents may embed but text is read-only when embedded."
	},
	{
		value: 8,
		label: "Editable (8)",
		hint: "Documents may embed and text remains editable downstream."
	}
];
var USE_CASE_LABELS = {
	print: "Print / publishing",
	"web-ui": "Web UI",
	"body-text": "Body / paragraph",
	display: "Display / headlines",
	signage: "Signage / wayfinding",
	code: "Code / monospace",
	"data-tables": "Data tables",
	editorial: "Editorial",
	branding: "Branding identity",
	multiscript: "Multiscript / multilingual"
};
/** Standard registered OpenType variation axes. */
var STANDARD_AXES = {
	wght: {
		name: "Weight",
		min: 100,
		default: 400,
		max: 900
	},
	wdth: {
		name: "Width",
		min: 50,
		default: 100,
		max: 200
	},
	opsz: {
		name: "Optical size",
		min: 8,
		default: 14,
		max: 144
	},
	slnt: {
		name: "Slant",
		min: -15,
		default: 0,
		max: 0
	},
	ital: {
		name: "Italic",
		min: 0,
		default: 0,
		max: 1
	}
};
/** Default metrics — UPM 1000 industry standard. */
var DEFAULT_METRICS = {
	unitsPerEm: 1e3,
	ascender: 800,
	descender: -200,
	capHeight: 700,
	xHeight: 500,
	defaultSidebearing: 50
};
var DEFAULT_FEATURES = {
	kern: true,
	liga: false
};
//#endregion
//#region src/lib/font/glyph-set.ts
var range = (start, end, prefix = "") => {
	const out = [];
	for (let cp = start; cp <= end; cp++) out.push({
		codepoint: cp,
		name: (prefix ? prefix : "") + String.fromCodePoint(cp),
		category: cp >= 48 && cp <= 57 ? "figure" : cp >= 97 ? "lowercase" : "uppercase"
	});
	return out;
};
var punctuation = [
	{
		codepoint: 32,
		name: "space",
		category: "symbol"
	},
	{
		codepoint: 46,
		name: "period",
		category: "punctuation"
	},
	{
		codepoint: 44,
		name: "comma",
		category: "punctuation"
	},
	{
		codepoint: 59,
		name: "semicolon",
		category: "punctuation"
	},
	{
		codepoint: 58,
		name: "colon",
		category: "punctuation"
	},
	{
		codepoint: 33,
		name: "exclam",
		category: "punctuation"
	},
	{
		codepoint: 63,
		name: "question",
		category: "punctuation"
	},
	{
		codepoint: 39,
		name: "quotesingle",
		category: "punctuation"
	},
	{
		codepoint: 34,
		name: "quotedbl",
		category: "punctuation"
	},
	{
		codepoint: 8216,
		name: "quoteleft",
		category: "punctuation"
	},
	{
		codepoint: 8217,
		name: "quoteright",
		category: "punctuation"
	},
	{
		codepoint: 8220,
		name: "quotedblleft",
		category: "punctuation"
	},
	{
		codepoint: 8221,
		name: "quotedblright",
		category: "punctuation"
	},
	{
		codepoint: 40,
		name: "parenleft",
		category: "punctuation"
	},
	{
		codepoint: 41,
		name: "parenright",
		category: "punctuation"
	},
	{
		codepoint: 91,
		name: "bracketleft",
		category: "punctuation"
	},
	{
		codepoint: 93,
		name: "bracketright",
		category: "punctuation"
	},
	{
		codepoint: 45,
		name: "hyphen",
		category: "punctuation"
	},
	{
		codepoint: 8211,
		name: "endash",
		category: "punctuation"
	},
	{
		codepoint: 8212,
		name: "emdash",
		category: "punctuation"
	},
	{
		codepoint: 47,
		name: "slash",
		category: "punctuation"
	},
	{
		codepoint: 38,
		name: "ampersand",
		category: "symbol"
	},
	{
		codepoint: 64,
		name: "at",
		category: "symbol"
	},
	{
		codepoint: 35,
		name: "numbersign",
		category: "symbol"
	},
	{
		codepoint: 42,
		name: "asterisk",
		category: "punctuation"
	},
	{
		codepoint: 37,
		name: "percent",
		category: "symbol"
	},
	{
		codepoint: 43,
		name: "plus",
		category: "symbol"
	}
];
var marks = [
	{
		codepoint: 769,
		name: "acutecomb",
		category: "mark"
	},
	{
		codepoint: 768,
		name: "gravecomb",
		category: "mark"
	},
	{
		codepoint: 776,
		name: "dieresiscomb",
		category: "mark"
	},
	{
		codepoint: 770,
		name: "circumflexcomb",
		category: "mark"
	},
	{
		codepoint: 771,
		name: "tildecomb",
		category: "mark"
	},
	{
		codepoint: 778,
		name: "ringcomb",
		category: "mark"
	},
	{
		codepoint: 807,
		name: "cedillacomb",
		category: "mark"
	}
];
var compositeDef = (codepoint, name, base, mark) => ({
	codepoint,
	name,
	category: "composite",
	composite: {
		base,
		mark
	}
});
var composites = [
	compositeDef(225, "aacute", 97, 769),
	compositeDef(224, "agrave", 97, 768),
	compositeDef(228, "adieresis", 97, 776),
	compositeDef(226, "acircumflex", 97, 770),
	compositeDef(227, "atilde", 97, 771),
	compositeDef(229, "aring", 97, 778),
	compositeDef(233, "eacute", 101, 769),
	compositeDef(232, "egrave", 101, 768),
	compositeDef(235, "edieresis", 101, 776),
	compositeDef(234, "ecircumflex", 101, 770),
	compositeDef(237, "iacute", 105, 769),
	compositeDef(236, "igrave", 105, 768),
	compositeDef(239, "idieresis", 105, 776),
	compositeDef(238, "icircumflex", 105, 770),
	compositeDef(243, "oacute", 111, 769),
	compositeDef(242, "ograve", 111, 768),
	compositeDef(246, "odieresis", 111, 776),
	compositeDef(244, "ocircumflex", 111, 770),
	compositeDef(245, "otilde", 111, 771),
	compositeDef(250, "uacute", 117, 769),
	compositeDef(249, "ugrave", 117, 768),
	compositeDef(252, "udieresis", 117, 776),
	compositeDef(251, "ucircumflex", 117, 770),
	compositeDef(241, "ntilde", 110, 771),
	compositeDef(231, "ccedilla", 99, 807)
];
/** Default Latin starter set used when creating a new project. */
var DEFAULT_GLYPH_SET = [
	...punctuation,
	...range(48, 57),
	...range(65, 90),
	...range(97, 122),
	...marks,
	...composites
];
var CATEGORY_LABELS = {
	uppercase: "Uppercase",
	lowercase: "Lowercase",
	figure: "Figures",
	punctuation: "Punctuation",
	symbol: "Symbols",
	mark: "Combining marks",
	composite: "Composites"
};
var CATEGORY_ORDER = [
	"uppercase",
	"lowercase",
	"figure",
	"punctuation",
	"symbol",
	"mark",
	"composite"
];
//#endregion
//#region src/lib/font/project.ts
/**
* Project CRUD + persistence via idb-keyval.
* Single store key per project; index list keyed by 'projects:index'.
*/
var KIND_PRESETS = {
	display: {
		label: "Display",
		description: "Posters, headlines, branding — tall caps, looser spacing.",
		metrics: {
			unitsPerEm: 1e3,
			ascender: 850,
			descender: -200,
			capHeight: 740,
			xHeight: 510,
			defaultSidebearing: 60
		}
	},
	text: {
		label: "Text",
		description: "Books, articles — modest contrast, taller x-height for reading.",
		metrics: {
			unitsPerEm: 1e3,
			ascender: 800,
			descender: -200,
			capHeight: 700,
			xHeight: 530,
			defaultSidebearing: 50
		}
	},
	ui: {
		label: "UI",
		description: "Apps, dashboards — large x-height, tight metrics, snap rendering.",
		metrics: {
			unitsPerEm: 1e3,
			ascender: 800,
			descender: -200,
			capHeight: 720,
			xHeight: 560,
			defaultSidebearing: 45
		}
	},
	mono: {
		label: "Mono",
		description: "Code, terminals — fixed advance width, generous metrics.",
		metrics: {
			unitsPerEm: 1e3,
			ascender: 820,
			descender: -220,
			capHeight: 700,
			xHeight: 530,
			defaultSidebearing: 80
		}
	}
};
var store = createStore("font-studio", "projects");
var INDEX_KEY = "__index__";
var newId = () => crypto.randomUUID();
var now = () => (/* @__PURE__ */ new Date()).toISOString();
var seedGlyph = (codepoint, name, metrics) => {
	let advance = Math.round(metrics.unitsPerEm * .6);
	if (codepoint === 32) advance = Math.round(metrics.unitsPerEm * .25);
	else if (codepoint >= 48 && codepoint <= 57) advance = Math.round(metrics.unitsPerEm * .55);
	else if (codepoint === 73 || codepoint === 105 || codepoint === 108) advance = Math.round(metrics.unitsPerEm * .3);
	else if (codepoint === 77 || codepoint === 87) advance = Math.round(metrics.unitsPerEm * .85);
	if (codepoint >= 768 && codepoint <= 879) advance = 0;
	const cx = Math.round(advance / 2);
	const isUpper = codepoint >= 65 && codepoint <= 90;
	const isLower = codepoint >= 97 && codepoint <= 122;
	const isMark = codepoint >= 768 && codepoint <= 879;
	const anchors = [];
	if (isUpper) {
		anchors.push({
			name: "top",
			x: cx,
			y: metrics.capHeight
		});
		anchors.push({
			name: "bottom",
			x: cx,
			y: 0
		});
	} else if (isLower) {
		anchors.push({
			name: "top",
			x: cx,
			y: metrics.xHeight
		});
		anchors.push({
			name: "bottom",
			x: cx,
			y: 0
		});
	} else if (isMark) anchors.push({
		name: "_top",
		x: cx,
		y: metrics.xHeight
	});
	return {
		codepoint,
		name,
		status: "empty",
		advanceWidth: advance,
		leftSidebearing: metrics.defaultSidebearing,
		rightSidebearing: metrics.defaultSidebearing,
		contours: [],
		anchors,
		updatedAt: now()
	};
};
var createProject = (input) => {
	const ts = now();
	const metrics = input.kind ? {
		...DEFAULT_METRICS,
		...KIND_PRESETS[input.kind].metrics
	} : { ...DEFAULT_METRICS };
	const metadata = {
		familyName: input.familyName?.trim() || input.name.trim() || "My Font",
		styleName: "Regular",
		designer: input.designer?.trim() || "",
		copyright: `Copyright (c) ${(/* @__PURE__ */ new Date()).getFullYear()}`,
		license: "Personal use only",
		version: "1.000"
	};
	const glyphs = {};
	for (const spec of DEFAULT_GLYPH_SET) glyphs[spec.codepoint] = {
		...seedGlyph(spec.codepoint, spec.name, metrics),
		components: spec.composite ? [{
			baseCodepoint: spec.composite.base,
			offsetX: 0,
			offsetY: 0
		}, {
			baseCodepoint: spec.composite.mark,
			offsetX: 0,
			offsetY: metrics.xHeight
		}] : void 0
	};
	return {
		schemaVersion: 2,
		id: newId(),
		name: input.name.trim() || "Untitled font",
		metadata,
		metrics,
		glyphs,
		kerning: [],
		features: { ...DEFAULT_FEATURES },
		createdAt: ts,
		updatedAt: ts
	};
};
var migrate = (raw) => {
	if (!raw || typeof raw !== "object") return null;
	const r = raw;
	if (typeof r.id !== "string" || !r.glyphs || typeof r.glyphs !== "object") return null;
	const fromVersion = typeof r.schemaVersion === "number" ? r.schemaVersion : 0;
	let p = r;
	let v = fromVersion;
	v = 2;
	if (!p.metadata) p = {
		...p,
		metadata: {}
	};
	if (!p.metrics) p = {
		...p,
		metrics: { ...DEFAULT_METRICS }
	};
	if (!p.features) p = {
		...p,
		features: { ...DEFAULT_FEATURES }
	};
	if (!Array.isArray(p.kerning)) p = {
		...p,
		kerning: []
	};
	if (!p.createdAt) p = {
		...p,
		createdAt: now()
	};
	if (!p.updatedAt) p = {
		...p,
		updatedAt: now()
	};
	return {
		project: {
			...p,
			schemaVersion: v
		},
		fromVersion,
		toVersion: v,
		upgraded: fromVersion !== v
	};
};
var indexEntry = (p) => {
	const drawn = Object.values(p.glyphs).filter((g) => g.contours.length > 0);
	const firstChar = p.metadata.familyName.trim()[0]?.toUpperCase();
	const target = firstChar ? drawn.find((g) => String.fromCodePoint(g.codepoint) === firstChar) : void 0;
	const upper = drawn.find((g) => g.codepoint >= 65 && g.codepoint <= 90);
	const pick = target ?? upper ?? drawn[0];
	let thumbnail;
	if (pick) {
		const cmds = [];
		for (const c of pick.contours) for (const cmd of c.commands) if (cmd.type === "M") cmds.push(`M${cmd.x} ${cmd.y}`);
		else if (cmd.type === "L") cmds.push(`L${cmd.x} ${cmd.y}`);
		else if (cmd.type === "Q") cmds.push(`Q${cmd.x1} ${cmd.y1} ${cmd.x} ${cmd.y}`);
		else if (cmd.type === "C") cmds.push(`C${cmd.x1} ${cmd.y1} ${cmd.x2} ${cmd.y2} ${cmd.x} ${cmd.y}`);
		else if (cmd.type === "Z") cmds.push("Z");
		const totalHeight = p.metrics.ascender - p.metrics.descender;
		thumbnail = {
			path: cmds.join(" "),
			viewBox: `0 ${-p.metrics.ascender} ${Math.max(pick.advanceWidth, 200)} ${totalHeight}`,
			advance: pick.advanceWidth
		};
	}
	const taglineRaw = (p.brief?.intent ?? p.description ?? "").trim();
	const tagline = taglineRaw ? taglineRaw.split(/\r?\n/)[0].trim().slice(0, 140) : void 0;
	const b = p.brief ?? {};
	const briefFieldChecks = [
		["intent", !!b.intent?.trim()],
		["audience", !!b.audience?.trim()],
		["use cases", (b.useCases?.length ?? 0) > 0],
		["reading conditions", !!b.readingConditions?.trim()],
		["differentiation", !!b.differentiation?.trim()],
		["references", (b.references?.length ?? 0) > 0]
	];
	const filled = briefFieldChecks.filter(([, ok]) => ok).length;
	const briefPct = Math.round(filled / briefFieldChecks.length * 100);
	const briefMissing = briefFieldChecks.filter(([, ok]) => !ok).map(([name]) => name);
	const dayAgo = Date.now() - 24 * 3600 * 1e3;
	const weekAgo = Date.now() - 168 * 3600 * 1e3;
	let editsToday = 0;
	let editsThisWeek = 0;
	const DAY_MS = 24 * 3600 * 1e3;
	const todayMid = /* @__PURE__ */ new Date();
	todayMid.setHours(0, 0, 0, 0);
	const todayMidMs = todayMid.getTime();
	const editsByDay = new Array(14).fill(0);
	let lastEditedGlyphEntry;
	let lastEditedAt = 0;
	for (const g of Object.values(p.glyphs)) {
		const t = Date.parse(g.updatedAt);
		if (!Number.isFinite(t)) continue;
		if (t >= dayAgo) editsToday++;
		if (t >= weekAgo) editsThisWeek++;
		const dayOffset = Math.floor((todayMidMs - t) / DAY_MS);
		if (dayOffset >= 0 && dayOffset < 14) editsByDay[13 - dayOffset]++;
		if ((g.contours.length > 0 || (g.components?.length ?? 0) > 0 || (g.sketch?.length ?? 0) > 0) && t > lastEditedAt) {
			lastEditedAt = t;
			lastEditedGlyphEntry = {
				codepoint: g.codepoint,
				name: g.name
			};
		}
	}
	return {
		id: p.id,
		name: p.name,
		familyName: p.metadata.familyName,
		createdAt: p.createdAt,
		updatedAt: p.updatedAt,
		glyphCount: Object.values(p.glyphs).filter((g) => g.contours.length > 0 || g.components && g.components.length > 0).length,
		tagline,
		thumbnail,
		briefPct,
		briefMissing,
		editsToday,
		editsThisWeek,
		editsByDay,
		locked: p.locked,
		kerningCount: p.kerning.length,
		lastSealedVersion: p.changelog?.[0]?.version,
		lastSealedAt: p.changelog?.[0]?.date,
		pinned: p.pinned,
		archived: p.archived,
		tags: p.tags,
		lastEditedGlyph: lastEditedGlyphEntry,
		familyId: p.familyId,
		familyAxes: p.familyAxes
	};
};
var listProjects = async () => {
	return [...await get(INDEX_KEY, store) ?? []].sort((a, b) => a.updatedAt < b.updatedAt ? 1 : -1);
};
var loadProject = async (id) => {
	const value = await get(id, store);
	if (value === void 0) return null;
	const result = migrate(value);
	if (!result) return null;
	if (result.upgraded) await set(id, result.project, store);
	return result.project;
};
var saveProject = async (project) => {
	const stamped = {
		...project,
		updatedAt: now()
	};
	await set(stamped.id, stamped, store);
	const filtered = (await get(INDEX_KEY, store) ?? []).filter((e) => e.id !== stamped.id);
	filtered.push(indexEntry(stamped));
	await set(INDEX_KEY, filtered, store);
};
var deleteProject = async (id) => {
	await del(id, store);
	await set(INDEX_KEY, (await get(INDEX_KEY, store) ?? []).filter((e) => e.id !== id), store);
};
var toggleProjectArchive = async (id) => {
	const value = await get(id, store);
	if (!value) return false;
	const next = {
		...value,
		archived: !value.archived
	};
	await set(id, next, store);
	const filtered = (await get(INDEX_KEY, store) ?? []).filter((e) => e.id !== id);
	filtered.push(indexEntry(next));
	await set(INDEX_KEY, filtered, store);
	return next.archived === true;
};
var duplicateProject = async (id, newName) => {
	const original = await loadProject(id);
	if (!original) return null;
	const copy = {
		...original,
		id: newId(),
		name: newName ?? `${original.name} copy`,
		createdAt: now(),
		updatedAt: now()
	};
	await saveProject(copy);
	return copy;
};
/**
* Add a registered axis to the project (idempotent — no-op if axis with the
* same tag is already present).
*/
var addAxis = (project, tag, location = 0) => {
	const existing = project.axes ?? [];
	if (existing.some((a) => a.tag === tag)) return project;
	const def = STANDARD_AXES[tag];
	const axis = def ? {
		tag,
		name: def.name,
		minimum: def.min,
		default: def.default,
		maximum: def.max
	} : {
		tag,
		name: tag,
		minimum: 0,
		default: 0,
		maximum: 1e3
	};
	return {
		...project,
		axes: [...existing, axis],
		updatedAt: now()
	};
};
var removeAxis = (project, tag) => {
	const axes = (project.axes ?? []).filter((a) => a.tag !== tag);
	const masters = (project.masters ?? []).map((m) => {
		const loc = { ...m.location };
		delete loc[tag];
		return {
			...m,
			location: loc
		};
	});
	return {
		...project,
		axes,
		masters,
		updatedAt: now()
	};
};
var cloneGlyphs = (src) => {
	return JSON.parse(JSON.stringify(src));
};
/**
* Add a new master, copying the default master's glyphs as a starting point
* (so it's automatically interpolation-compatible). Location should specify
* a value for at least one defined axis.
*/
var addMaster = (project, input) => {
	const ts = now();
	const master = {
		id: newId(),
		name: input.name.trim() || "Untitled master",
		location: { ...input.location },
		glyphs: cloneGlyphs(project.glyphs),
		createdAt: ts,
		updatedAt: ts
	};
	return {
		...project,
		masters: [...project.masters ?? [], master],
		updatedAt: ts
	};
};
var removeMaster = (project, masterId) => ({
	...project,
	masters: (project.masters ?? []).filter((m) => m.id !== masterId),
	updatedAt: now()
});
var updateMaster = (project, masterId, mut) => ({
	...project,
	masters: (project.masters ?? []).map((m) => m.id === masterId ? mut(m) : m),
	updatedAt: now()
});
var updateMasterGlyph = (project, masterId, codepoint, mut) => {
	return updateMaster(project, masterId, (m) => {
		const current = m.glyphs[codepoint];
		if (!current) return m;
		const next = mut({ ...current });
		next.updatedAt = now();
		return {
			...m,
			glyphs: {
				...m.glyphs,
				[codepoint]: next
			},
			updatedAt: now()
		};
	});
};
/**
* Add a script pack's glyphs to an existing project. No-ops for codepoints
* already present (so re-adding is safe and idempotent).
*/
var addScriptPack = (project, pack) => {
	const next = { ...project.glyphs };
	for (const spec of pack.glyphs) {
		if (next[spec.codepoint]) continue;
		next[spec.codepoint] = {
			...seedGlyph(spec.codepoint, spec.name, project.metrics),
			components: spec.composite ? [{
				baseCodepoint: spec.composite.base,
				offsetX: 0,
				offsetY: 0
			}, {
				baseCodepoint: spec.composite.mark,
				offsetX: 0,
				offsetY: project.metrics.xHeight
			}] : void 0
		};
	}
	return {
		...project,
		glyphs: next,
		updatedAt: now()
	};
};
//#endregion
export { isClassRef as C, USE_CASE_LABELS as S, CATEGORY_ORDER as _, createProject as a, FS_TYPE_OPTIONS as b, listProjects as c, removeMaster as d, saveProject as f, CATEGORY_LABELS as g, updateMasterGlyph as h, addScriptPack as i, loadProject as l, updateMaster as m, addAxis as n, deleteProject as o, toggleProjectArchive as p, addMaster as r, duplicateProject as s, KIND_PRESETS as t, removeAxis as u, DEFAULT_GLYPH_SET as v, resolveVerticalMetrics as w, STANDARD_AXES as x, DEFAULT_FEATURES as y };
