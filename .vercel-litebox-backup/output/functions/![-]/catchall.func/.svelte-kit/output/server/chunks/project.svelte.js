import "./dev.js";
import { d as removeMaster, f as saveProject, h as updateMasterGlyph, i as addScriptPack, m as updateMaster, n as addAxis, r as addMaster, u as removeAxis } from "./project.js";
//#region src/lib/font/aglfn.ts
/**
* Compact AGLFN (Adobe Glyph List for New Fonts) lookup. Covers the ranges
* most fonts need: Basic Latin, Latin-1 Supplement, common punctuation,
* combining marks, and a handful of math/currency/arrows.
*
* Full AGL is ~4000 entries; we ship the ~400 a beginner-friendly font
* touches. For everything else we fall back to "uniXXXX".
*/
var AGLFN = {
	32: "space",
	48: "zero",
	49: "one",
	50: "two",
	51: "three",
	52: "four",
	53: "five",
	54: "six",
	55: "seven",
	56: "eight",
	57: "nine",
	33: "exclam",
	34: "quotedbl",
	35: "numbersign",
	36: "dollar",
	37: "percent",
	38: "ampersand",
	39: "quotesingle",
	40: "parenleft",
	41: "parenright",
	42: "asterisk",
	43: "plus",
	44: "comma",
	45: "hyphen",
	46: "period",
	47: "slash",
	58: "colon",
	59: "semicolon",
	60: "less",
	61: "equal",
	62: "greater",
	63: "question",
	64: "at",
	91: "bracketleft",
	92: "backslash",
	93: "bracketright",
	94: "asciicircum",
	95: "underscore",
	96: "grave",
	123: "braceleft",
	124: "bar",
	125: "braceright",
	126: "asciitilde",
	160: "nbspace",
	161: "exclamdown",
	162: "cent",
	163: "sterling",
	164: "currency",
	165: "yen",
	166: "brokenbar",
	167: "section",
	168: "dieresis",
	169: "copyright",
	170: "ordfeminine",
	171: "guillemetleft",
	172: "logicalnot",
	174: "registered",
	175: "macron",
	176: "degree",
	177: "plusminus",
	180: "acute",
	181: "mu",
	182: "paragraph",
	183: "periodcentered",
	184: "cedilla",
	186: "ordmasculine",
	187: "guillemetright",
	191: "questiondown",
	198: "AE",
	208: "Eth",
	215: "multiply",
	216: "Oslash",
	222: "Thorn",
	223: "germandbls",
	230: "ae",
	240: "eth",
	247: "divide",
	248: "oslash",
	254: "thorn",
	305: "dotlessi",
	321: "Lslash",
	322: "lslash",
	338: "OE",
	339: "oe",
	352: "Scaron",
	353: "scaron",
	376: "Ydieresis",
	381: "Zcaron",
	382: "zcaron",
	402: "florin",
	710: "circumflex",
	711: "caron",
	728: "breve",
	729: "dotaccent",
	730: "ring",
	731: "ogonek",
	732: "tilde",
	733: "hungarumlaut",
	8211: "endash",
	8212: "emdash",
	8216: "quoteleft",
	8217: "quoteright",
	8218: "quotesinglbase",
	8220: "quotedblleft",
	8221: "quotedblright",
	8222: "quotedblbase",
	8224: "dagger",
	8225: "daggerdbl",
	8226: "bullet",
	8230: "ellipsis",
	8240: "perthousand",
	8249: "guilsinglleft",
	8250: "guilsinglright",
	8364: "Euro",
	8482: "trademark",
	8706: "partialdiff",
	8710: "Delta",
	8719: "product",
	8721: "summation",
	8722: "minus",
	8730: "radical",
	8734: "infinity",
	8747: "integral",
	8776: "approxequal",
	8800: "notequal",
	8804: "lessequal",
	8805: "greaterequal",
	9674: "lozenge",
	64257: "fi",
	64258: "fl"
};
/** Return the AGLFN name for a codepoint, or a derived name as a fallback. */
var aglfnName = (codepoint) => {
	if (AGLFN[codepoint]) return AGLFN[codepoint];
	if (codepoint >= 65 && codepoint <= 90 || codepoint >= 97 && codepoint <= 122) return String.fromCodePoint(codepoint);
	const acc = extendedLatin(codepoint);
	if (acc) return acc;
	return `uni${codepoint.toString(16).toUpperCase().padStart(4, "0")}`;
};
/**
* Pattern-based derivation for Latin Extended that follows AGLFN convention
* (e.g. U+00C1 → Aacute, U+00E9 → eacute, U+0103 → abreve).
*/
var extendedLatin = (cp) => {
	return {
		192: "Agrave",
		193: "Aacute",
		194: "Acircumflex",
		195: "Atilde",
		196: "Adieresis",
		197: "Aring",
		199: "Ccedilla",
		200: "Egrave",
		201: "Eacute",
		202: "Ecircumflex",
		203: "Edieresis",
		204: "Igrave",
		205: "Iacute",
		206: "Icircumflex",
		207: "Idieresis",
		209: "Ntilde",
		210: "Ograve",
		211: "Oacute",
		212: "Ocircumflex",
		213: "Otilde",
		214: "Odieresis",
		217: "Ugrave",
		218: "Uacute",
		219: "Ucircumflex",
		220: "Udieresis",
		221: "Yacute",
		224: "agrave",
		225: "aacute",
		226: "acircumflex",
		227: "atilde",
		228: "adieresis",
		229: "aring",
		231: "ccedilla",
		232: "egrave",
		233: "eacute",
		234: "ecircumflex",
		235: "edieresis",
		236: "igrave",
		237: "iacute",
		238: "icircumflex",
		239: "idieresis",
		241: "ntilde",
		242: "ograve",
		243: "oacute",
		244: "ocircumflex",
		245: "otilde",
		246: "odieresis",
		249: "ugrave",
		250: "uacute",
		251: "ucircumflex",
		252: "udieresis",
		253: "yacute",
		255: "ydieresis",
		258: "Abreve",
		259: "abreve",
		260: "Aogonek",
		261: "aogonek",
		262: "Cacute",
		263: "cacute",
		268: "Ccaron",
		269: "ccaron",
		270: "Dcaron",
		271: "dcaron",
		272: "Dcroat",
		273: "dcroat"
	}[cp] ?? null;
};
//#endregion
//#region src/lib/stores/project.svelte.ts
var ProjectStore = class {
	project = null;
	selectedCodepoint = 65;
	/** undefined → default master; otherwise the id of an additional master. */
	selectedMasterId = void 0;
	dirty = false;
	saving = false;
	/** Timestamp (ms) of the last successful flush() — drives "Saved Xs ago" UI. */
	lastSavedAt = null;
	canUndo = false;
	canRedo = false;
	saveTimer = null;
	snapshotTimer = null;
	undoStack = [];
	redoStack = [];
	maxHistory = 50;
	load(project) {
		this.project = project;
		this.dirty = false;
		const codepoints = Object.keys(project.glyphs).map(Number);
		let initial;
		try {
			const stored = localStorage.getItem(`font-studio:last-cp:${project.id}`);
			if (stored) {
				const cp = Number(stored);
				if (Number.isFinite(cp) && project.glyphs[cp]) initial = cp;
			}
		} catch {}
		const upper = codepoints.find((cp) => cp >= 65 && cp <= 90);
		this.selectedCodepoint = initial ?? upper ?? codepoints[0] ?? 65;
		try {
			const masterId = localStorage.getItem(`font-studio:last-master:${project.id}`);
			if (masterId && (project.masters ?? []).some((m) => m.id === masterId)) this.selectedMasterId = masterId;
			else this.selectedMasterId = void 0;
		} catch {
			this.selectedMasterId = void 0;
		}
		this.undoStack = [JSON.parse(JSON.stringify(project))];
		this.redoStack = [];
		this.updateUndoFlags();
	}
	snapshotForHistory() {
		if (!this.project) return;
		if (this.project.locked) return;
		const snap = JSON.parse(JSON.stringify(this.project));
		this.undoStack.push(snap);
		if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
		this.redoStack = [];
		this.updateUndoFlags();
	}
	scheduleSnapshot() {
		if (this.snapshotTimer) clearTimeout(this.snapshotTimer);
		this.snapshotTimer = setTimeout(() => this.snapshotForHistory(), 400);
	}
	updateUndoFlags() {
		this.canUndo = this.undoStack.length > 1;
		this.canRedo = this.redoStack.length > 0;
	}
	undo() {
		if (this.undoStack.length < 2) return;
		if (this.project?.locked) return;
		if (this.snapshotTimer) {
			clearTimeout(this.snapshotTimer);
			this.snapshotTimer = null;
		}
		const current = this.undoStack.pop();
		this.redoStack.push(current);
		const prev = this.undoStack[this.undoStack.length - 1];
		this.project = JSON.parse(JSON.stringify(prev));
		this.updateUndoFlags();
		this.dirty = true;
		this.scheduleSave();
	}
	redo() {
		if (this.redoStack.length === 0) return;
		if (this.project?.locked) return;
		if (this.snapshotTimer) {
			clearTimeout(this.snapshotTimer);
			this.snapshotTimer = null;
		}
		const next = this.redoStack.pop();
		this.undoStack.push(next);
		this.project = JSON.parse(JSON.stringify(next));
		this.updateUndoFlags();
		this.dirty = true;
		this.scheduleSave();
	}
	clear() {
		if (this.saveTimer) clearTimeout(this.saveTimer);
		this.saveTimer = null;
		this.project = null;
		this.dirty = false;
	}
	touch() {
		if (!this.project) return;
		if (this.project.locked) return;
		this.project = {
			...this.project,
			updatedAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		this.dirty = true;
		this.scheduleSave();
		this.scheduleSnapshot();
	}
	scheduleSave() {
		if (this.saveTimer) clearTimeout(this.saveTimer);
		this.saveTimer = setTimeout(() => this.flush(), 600);
	}
	async flush() {
		if (!this.project) return;
		if (this.saveTimer) {
			clearTimeout(this.saveTimer);
			this.saveTimer = null;
		}
		this.saving = true;
		try {
			const snapshot = this.project;
			if (snapshot) await saveProject(snapshot);
			this.dirty = false;
			this.lastSavedAt = Date.now();
		} catch (err) {
			console.error("Project save failed:", err);
			this.dirty = true;
		} finally {
			this.saving = false;
		}
	}
	/** Glyph map for the currently selected master (or the default master's). */
	get activeGlyphs() {
		if (!this.project) return {};
		if (this.selectedMasterId) {
			const master = (this.project.masters ?? []).find((m) => m.id === this.selectedMasterId);
			if (master) return master.glyphs;
		}
		return this.project.glyphs;
	}
	get selectedGlyph() {
		return this.activeGlyphs[this.selectedCodepoint] ?? null;
	}
	get activeMaster() {
		if (!this.project || !this.selectedMasterId) return null;
		return (this.project.masters ?? []).find((m) => m.id === this.selectedMasterId) ?? null;
	}
	get masterOptions() {
		if (!this.project) return [];
		const out = [{
			id: void 0,
			name: "Default"
		}];
		for (const m of this.project.masters ?? []) out.push({
			id: m.id,
			name: m.name,
			location: m.location
		});
		return out;
	}
	selectMaster(id) {
		this.selectedMasterId = id;
		if (!this.project) return;
		try {
			const key = `font-studio:last-master:${this.project.id}`;
			if (id) localStorage.setItem(key, id);
			else localStorage.removeItem(key);
		} catch {}
	}
	selectGlyph(codepoint) {
		if (!this.project) return;
		if (this.project.glyphs[codepoint]) {
			this.selectedCodepoint = codepoint;
			try {
				localStorage.setItem(`font-studio:last-cp:${this.project.id}`, String(codepoint));
			} catch {}
		}
	}
	toggleLock() {
		if (!this.project) return;
		this.project = {
			...this.project,
			locked: !this.project.locked
		};
		this.project = {
			...this.project,
			updatedAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		this.dirty = true;
		this.scheduleSave();
	}
	updateTags(tags) {
		if (!this.project) return;
		if (this.project.locked) return;
		const cleaned = Array.from(new Set(tags.map((t) => t.trim().toLowerCase()).filter((t) => t.length > 0)));
		this.project = {
			...this.project,
			tags: cleaned
		};
		this.touch();
	}
	updateGlyph(codepoint, mut) {
		if (!this.project) return;
		if (this.project.locked) return;
		const drawnBefore = this.countDrawnGlyphs();
		if (this.selectedMasterId) this.project = updateMasterGlyph(this.project, this.selectedMasterId, codepoint, mut);
		else {
			const current = this.project.glyphs[codepoint];
			if (!current) return;
			const next = mut({ ...current });
			next.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
			this.project = {
				...this.project,
				glyphs: {
					...this.project.glyphs,
					[codepoint]: next
				}
			};
		}
		this.touch();
		this.checkMilestone(drawnBefore);
	}
	countDrawnGlyphs() {
		if (!this.project) return 0;
		return Object.values(this.project.glyphs).filter((g) => g.contours.length > 0).length;
	}
	milestoneKey() {
		return `font-studio:milestones:${this.project?.id ?? ""}`;
	}
	checkMilestone(drawnBefore) {
		if (!this.project || typeof localStorage === "undefined") return;
		const drawnAfter = this.countDrawnGlyphs();
		if (drawnAfter <= drawnBefore) return;
		const milestones = [
			5,
			10,
			25,
			50,
			100,
			200
		];
		let celebrated = [];
		try {
			celebrated = JSON.parse(localStorage.getItem(this.milestoneKey()) ?? "[]");
		} catch {}
		for (const m of milestones) if (drawnBefore < m && drawnAfter >= m && !celebrated.includes(m)) {
			celebrated.push(m);
			localStorage.setItem(this.milestoneKey(), JSON.stringify(celebrated));
			Promise.all([import("./toast.svelte.js"), import("./delight.js")]).then(([{ toast }, { milestoneMessage, celebrate }]) => {
				toast.success(milestoneMessage(m));
				celebrate(m >= 100 ? "large" : m >= 25 ? "medium" : "small");
			});
			break;
		}
	}
	updateMetadata(mut) {
		if (!this.project) return;
		if (this.project.locked) return;
		this.project = {
			...this.project,
			metadata: {
				...this.project.metadata,
				...mut
			}
		};
		this.touch();
	}
	updateMetrics(mut) {
		if (!this.project) return;
		if (this.project.locked) return;
		this.project = {
			...this.project,
			metrics: {
				...this.project.metrics,
				...mut
			}
		};
		this.touch();
	}
	updateName(name) {
		if (!this.project) return;
		if (this.project.locked) return;
		this.project = {
			...this.project,
			name
		};
		this.touch();
	}
	updateDescription(description) {
		if (!this.project) return;
		if (this.project.locked) return;
		this.project = {
			...this.project,
			description
		};
		this.touch();
	}
	addChangelogEntry(entry) {
		if (!this.project) return;
		if (this.project.locked) return;
		const next = {
			id: crypto.randomUUID(),
			version: entry.version.trim() || this.project.metadata.version,
			date: (/* @__PURE__ */ new Date()).toISOString(),
			notes: entry.notes.trim()
		};
		this.project = {
			...this.project,
			changelog: [next, ...this.project.changelog ?? []]
		};
		this.touch();
	}
	addDecision(entry) {
		if (!this.project) return;
		if (this.project.locked) return;
		const next = {
			id: crypto.randomUUID(),
			date: (/* @__PURE__ */ new Date()).toISOString(),
			decision: entry.decision.trim(),
			rationale: entry.rationale.trim()
		};
		this.project = {
			...this.project,
			decisions: [next, ...this.project.decisions ?? []]
		};
		this.touch();
	}
	removeDecision(id) {
		if (!this.project) return;
		if (this.project.locked) return;
		this.project = {
			...this.project,
			decisions: (this.project.decisions ?? []).filter((e) => e.id !== id)
		};
		this.touch();
	}
	removeChangelogEntry(id) {
		if (!this.project) return;
		if (this.project.locked) return;
		this.project = {
			...this.project,
			changelog: (this.project.changelog ?? []).filter((e) => e.id !== id)
		};
		this.touch();
	}
	updateSamples(mut) {
		if (!this.project) return;
		if (this.project.locked) return;
		this.project = {
			...this.project,
			samples: {
				...this.project.samples ?? {},
				...mut
			}
		};
		this.touch();
	}
	toggleSpecimenSection(id) {
		if (!this.project) return;
		if (this.project.locked) return;
		const cur = this.project.specimenSections ?? {};
		const next = {
			...cur,
			[id]: !(cur[id] ?? true)
		};
		this.project = {
			...this.project,
			specimenSections: next
		};
		this.touch();
	}
	resetReleaseChecks() {
		if (!this.project) return;
		if (this.project.locked) return;
		this.project = {
			...this.project,
			releaseChecks: {}
		};
		this.touch();
	}
	toggleReleaseCheck(id) {
		if (!this.project) return;
		if (this.project.locked) return;
		const next = { ...this.project.releaseChecks ?? {} };
		next[id] = !next[id];
		this.project = {
			...this.project,
			releaseChecks: next
		};
		this.touch();
	}
	updateBrief(mut) {
		if (!this.project) return;
		if (this.project.locked) return;
		this.project = {
			...this.project,
			brief: {
				...this.project.brief ?? {},
				...mut
			}
		};
		this.touch();
	}
	/**
	* Inject a Google Fonts <link> for the family name so it can be used in
	* any font-family CSS rule (e.g., the spacing playground's "Compare with"
	* dropdown). No-op if the family is already loaded or if we're not in
	* a browser context.
	*/
	loadGoogleFontIfNeeded(family) {
		if (typeof document === "undefined") return;
		const name = family.trim();
		if (!name) return;
		const id = "gf-" + name.replace(/[^A-Za-z0-9]+/g, "-");
		if (document.getElementById(id)) return;
		const link = document.createElement("link");
		link.id = id;
		link.rel = "stylesheet";
		link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g, "+")}&display=swap`;
		document.head.appendChild(link);
	}
	addBriefReference(ref) {
		if (!this.project) return;
		if (this.project.locked) return;
		const brief = this.project.brief ?? {};
		this.project = {
			...this.project,
			brief: {
				...brief,
				references: [...brief.references ?? [], {
					...ref,
					id: crypto.randomUUID()
				}]
			}
		};
		this.touch();
		this.loadGoogleFontIfNeeded(ref.name);
	}
	/** Re-inject all references' Google Fonts at boot / project load. */
	loadAllReferenceFonts() {
		if (!this.project) return;
		for (const r of this.project.brief?.references ?? []) this.loadGoogleFontIfNeeded(r.name);
	}
	removeBriefReference(id) {
		if (!this.project) return;
		if (this.project.locked) return;
		const brief = this.project.brief ?? {};
		this.project = {
			...this.project,
			brief: {
				...brief,
				references: (brief.references ?? []).filter((r) => r.id !== id)
			}
		};
		this.touch();
	}
	updateFeatures(mut) {
		if (!this.project) return;
		if (this.project.locked) return;
		this.project = {
			...this.project,
			features: {
				...this.project.features,
				...mut
			}
		};
		this.touch();
	}
	upsertKerningPair(pair) {
		if (!this.project) return;
		if (this.project.locked) return;
		const existing = this.project.kerning.findIndex((k) => k.left === pair.left && k.right === pair.right);
		const next = [...this.project.kerning];
		if (pair.value === 0) {
			if (existing >= 0) next.splice(existing, 1);
		} else if (existing >= 0) next[existing] = pair;
		else next.push(pair);
		this.project = {
			...this.project,
			kerning: next
		};
		this.touch();
	}
	getKerningValue(left, right) {
		if (!this.project) return 0;
		return this.project.kerning.find((k) => k.left === left && k.right === right)?.value ?? 0;
	}
	/** Kerning classes CRUD */
	upsertKerningClass(cls) {
		if (!this.project) return;
		if (this.project.locked) return;
		const existing = (this.project.classes ?? []).findIndex((c) => c.name === cls.name);
		const next = [...this.project.classes ?? []];
		if (existing >= 0) next[existing] = cls;
		else next.push(cls);
		this.project = {
			...this.project,
			classes: next
		};
		this.touch();
	}
	removeKerningClass(name) {
		if (!this.project) return;
		if (this.project.locked) return;
		this.project = {
			...this.project,
			classes: (this.project.classes ?? []).filter((c) => c.name !== name),
			kerning: this.project.kerning.filter((p) => p.left !== name && p.right !== name)
		};
		this.touch();
	}
	/** Sidebearing classes — linked LSB/RSB across a group of glyphs. */
	addSidebearingClass(name, members) {
		const id = crypto.randomUUID();
		if (!this.project) return id;
		if (this.project.locked) return id;
		const cleanName = name.trim() || `Group ${(this.project.sidebearingClasses?.length ?? 0) + 1}`;
		this.project = {
			...this.project,
			sidebearingClasses: [...this.project.sidebearingClasses ?? [], {
				id,
				name: cleanName,
				members: [...new Set(members)]
			}]
		};
		this.touch();
		return id;
	}
	removeSidebearingClass(id) {
		if (!this.project) return;
		if (this.project.locked) return;
		this.project = {
			...this.project,
			sidebearingClasses: (this.project.sidebearingClasses ?? []).filter((c) => c.id !== id)
		};
		this.touch();
	}
	updateSidebearingClassMembers(id, members) {
		if (!this.project) return;
		if (this.project.locked) return;
		this.project = {
			...this.project,
			sidebearingClasses: (this.project.sidebearingClasses ?? []).map((c) => c.id === id ? {
				...c,
				members: [...new Set(members)]
			} : c)
		};
		this.touch();
	}
	renameSidebearingClass(id, name) {
		if (!this.project) return;
		if (this.project.locked) return;
		const cleanName = name.trim();
		if (!cleanName) return;
		this.project = {
			...this.project,
			sidebearingClasses: (this.project.sidebearingClasses ?? []).map((c) => c.id === id ? {
				...c,
				name: cleanName
			} : c)
		};
		this.touch();
	}
	/** Set LSB and/or RSB on every member of a sidebearing class, recomputing advance from bbox + sb. */
	setSidebearingClassValues(id, lsb, rsb) {
		if (!this.project) return;
		if (this.project.locked) return;
		const cls = (this.project.sidebearingClasses ?? []).find((c) => c.id === id);
		if (!cls) return;
		const nextGlyphs = { ...this.project.glyphs };
		for (const cp of cls.members) {
			const g = nextGlyphs[cp];
			if (!g) continue;
			const newLsb = lsb !== null ? lsb : g.leftSidebearing;
			const newRsb = rsb !== null ? rsb : g.rightSidebearing;
			const bboxW = Math.max(0, g.advanceWidth - g.leftSidebearing - g.rightSidebearing);
			nextGlyphs[cp] = {
				...g,
				leftSidebearing: newLsb,
				rightSidebearing: newRsb,
				advanceWidth: newLsb + bboxW + newRsb,
				updatedAt: (/* @__PURE__ */ new Date()).toISOString()
			};
		}
		this.project = {
			...this.project,
			glyphs: nextGlyphs
		};
		this.touch();
	}
	/** Named instances CRUD */
	upsertInstance(inst) {
		if (!this.project) return;
		if (this.project.locked) return;
		const existing = (this.project.instances ?? []).findIndex((i) => i.id === inst.id);
		const next = [...this.project.instances ?? []];
		if (existing >= 0) next[existing] = inst;
		else next.push(inst);
		this.project = {
			...this.project,
			instances: next
		};
		this.touch();
	}
	removeInstance(id) {
		if (!this.project) return;
		if (this.project.locked) return;
		this.project = {
			...this.project,
			instances: (this.project.instances ?? []).filter((i) => i.id !== id)
		};
		this.touch();
	}
	async addScriptPack(pack) {
		if (!this.project) return;
		if (this.project.locked) return;
		this.project = addScriptPack(this.project, pack);
		this.touch();
		await this.flush();
	}
	addCustomGlyph(codepoint, name) {
		if (!this.project) return false;
		if (this.project.locked) return false;
		if (this.project.glyphs[codepoint]) return false;
		const auto = name?.trim() || aglfnName(codepoint);
		const sb = this.project.metrics.defaultSidebearing;
		const advance = Math.round(this.project.metrics.unitsPerEm * .6);
		this.project = {
			...this.project,
			glyphs: {
				...this.project.glyphs,
				[codepoint]: {
					codepoint,
					name: auto,
					status: "empty",
					advanceWidth: advance,
					leftSidebearing: sb,
					rightSidebearing: sb,
					contours: [],
					updatedAt: (/* @__PURE__ */ new Date()).toISOString()
				}
			}
		};
		this.touch();
		return true;
	}
	resetGlyph(codepoint) {
		if (!this.project) return;
		if (this.project.locked) return;
		const current = this.project.glyphs[codepoint];
		if (!current) return;
		const sb = this.project.metrics.defaultSidebearing;
		const advance = Math.round(this.project.metrics.unitsPerEm * .6);
		this.project = {
			...this.project,
			glyphs: {
				...this.project.glyphs,
				[codepoint]: {
					...current,
					status: "empty",
					contours: [],
					sketch: [],
					components: [],
					anchors: [],
					notes: void 0,
					referenceImage: void 0,
					advanceWidth: advance,
					leftSidebearing: sb,
					rightSidebearing: sb,
					updatedAt: (/* @__PURE__ */ new Date()).toISOString()
				}
			}
		};
		this.touch();
	}
	saveRevision(codepoint, label) {
		if (!this.project) return;
		if (this.project.locked) return;
		const current = this.project.glyphs[codepoint];
		if (!current || current.contours.length === 0) return;
		const rev = {
			id: crypto.randomUUID(),
			takenAt: (/* @__PURE__ */ new Date()).toISOString(),
			label: label?.trim() || void 0,
			contours: JSON.parse(JSON.stringify(current.contours)),
			advanceWidth: current.advanceWidth,
			leftSidebearing: current.leftSidebearing,
			rightSidebearing: current.rightSidebearing
		};
		const next = [...current.revisions ?? [], rev];
		const trimmed = next.length > 8 ? next.slice(-8) : next;
		this.project = {
			...this.project,
			glyphs: {
				...this.project.glyphs,
				[codepoint]: {
					...current,
					revisions: trimmed,
					updatedAt: (/* @__PURE__ */ new Date()).toISOString()
				}
			}
		};
		this.touch();
	}
	restoreRevision(codepoint, revisionId) {
		if (!this.project) return;
		if (this.project.locked) return;
		const current = this.project.glyphs[codepoint];
		if (!current) return;
		const rev = (current.revisions ?? []).find((r) => r.id === revisionId);
		if (!rev) return;
		this.project = {
			...this.project,
			glyphs: {
				...this.project.glyphs,
				[codepoint]: {
					...current,
					contours: JSON.parse(JSON.stringify(rev.contours)),
					advanceWidth: rev.advanceWidth,
					leftSidebearing: rev.leftSidebearing,
					rightSidebearing: rev.rightSidebearing,
					updatedAt: (/* @__PURE__ */ new Date()).toISOString()
				}
			}
		};
		this.touch();
	}
	deleteRevision(codepoint, revisionId) {
		if (!this.project) return;
		if (this.project.locked) return;
		const current = this.project.glyphs[codepoint];
		if (!current?.revisions) return;
		this.project = {
			...this.project,
			glyphs: {
				...this.project.glyphs,
				[codepoint]: {
					...current,
					revisions: current.revisions.filter((r) => r.id !== revisionId),
					updatedAt: (/* @__PURE__ */ new Date()).toISOString()
				}
			}
		};
		this.touch();
	}
	toggleGlyphFlag(codepoint) {
		if (!this.project) return;
		if (this.project.locked) return;
		const current = this.project.glyphs[codepoint];
		if (!current) return;
		this.project = {
			...this.project,
			glyphs: {
				...this.project.glyphs,
				[codepoint]: {
					...current,
					flagged: !current.flagged,
					updatedAt: (/* @__PURE__ */ new Date()).toISOString()
				}
			}
		};
		this.touch();
	}
	toggleGlyphPin(codepoint) {
		if (!this.project) return;
		if (this.project.locked) return;
		const current = this.project.glyphs[codepoint];
		if (!current) return;
		this.project = {
			...this.project,
			glyphs: {
				...this.project.glyphs,
				[codepoint]: {
					...current,
					pinned: !current.pinned,
					updatedAt: (/* @__PURE__ */ new Date()).toISOString()
				}
			}
		};
		this.touch();
	}
	setGlyphStatus(codepoint, status) {
		if (!this.project) return;
		if (this.project.locked) return;
		if (!this.project.glyphs[codepoint]) return;
		const current = this.project.glyphs[codepoint];
		this.project = {
			...this.project,
			glyphs: {
				...this.project.glyphs,
				[codepoint]: {
					...current,
					status,
					updatedAt: (/* @__PURE__ */ new Date()).toISOString()
				}
			}
		};
		this.touch();
	}
	renameGlyph(codepoint, name) {
		if (!this.project) return;
		if (this.project.locked) return;
		if (!this.project.glyphs[codepoint]) return;
		const trimmed = name.trim();
		if (!trimmed) return;
		const current = this.project.glyphs[codepoint];
		this.project = {
			...this.project,
			glyphs: {
				...this.project.glyphs,
				[codepoint]: {
					...current,
					name: trimmed,
					updatedAt: (/* @__PURE__ */ new Date()).toISOString()
				}
			}
		};
		this.touch();
	}
	removeGlyph(codepoint) {
		if (!this.project) return;
		if (this.project.locked) return;
		if (!this.project.glyphs[codepoint]) return;
		const { [codepoint]: _, ...rest } = this.project.glyphs;
		this.project = {
			...this.project,
			glyphs: rest,
			kerning: this.project.kerning.filter((p) => p.left !== codepoint && p.right !== codepoint),
			classes: (this.project.classes ?? []).map((c) => ({
				...c,
				members: c.members.filter((m) => m !== codepoint)
			}))
		};
		if (this.selectedCodepoint === codepoint) {
			const codepoints = Object.keys(this.project.glyphs).map(Number);
			this.selectedCodepoint = codepoints[0] ?? 65;
		}
		this.touch();
	}
	addAxis(tag) {
		if (!this.project) return;
		if (this.project.locked) return;
		this.project = addAxis(this.project, tag);
		this.touch();
	}
	removeAxis(tag) {
		if (!this.project) return;
		if (this.project.locked) return;
		this.project = removeAxis(this.project, tag);
		this.touch();
	}
	updateAxis(tag, mut) {
		if (!this.project) return;
		if (this.project.locked) return;
		this.project = {
			...this.project,
			axes: (this.project.axes ?? []).map((a) => a.tag === tag ? {
				...a,
				...mut
			} : a)
		};
		this.touch();
	}
	async addMaster(name, location) {
		if (!this.project) return;
		if (this.project.locked) return;
		this.project = addMaster(this.project, {
			name,
			location
		});
		this.touch();
		await this.flush();
	}
	removeMaster(masterId) {
		if (!this.project) return;
		if (this.project.locked) return;
		this.project = removeMaster(this.project, masterId);
		if (this.selectedMasterId === masterId) this.selectedMasterId = void 0;
		this.touch();
	}
	updateMaster(masterId, mut) {
		if (!this.project) return;
		if (this.project.locked) return;
		this.project = updateMaster(this.project, masterId, mut);
		this.touch();
	}
	/**
	* Sync every glyph in a master from the default master that doesn't
	* already have a drawn outline in that master. Useful for setting up a
	* fresh master with the same starting point as default.
	*
	* Returns the number of glyphs copied.
	*/
	syncAllEmptyFromDefault(masterId) {
		if (!this.project) return 0;
		if (this.project.locked) return 0;
		let count = 0;
		this.project = updateMaster(this.project, masterId, (m) => {
			const next = { ...m.glyphs };
			for (const [cpStr, srcGlyph] of Object.entries(this.project.glyphs)) {
				const cp = Number(cpStr);
				const existing = next[cp];
				if (existing && existing.contours && existing.contours.length > 0) continue;
				if (srcGlyph.contours.length === 0) continue;
				next[cp] = JSON.parse(JSON.stringify(srcGlyph));
				count++;
			}
			return {
				...m,
				glyphs: next
			};
		});
		this.touch();
		return count;
	}
	/**
	* Copy a glyph's full data (contours, metrics, anchors, components) from
	* the default master into the named additional master. Used to keep
	* interpolation compatible when starting fresh on a master.
	*/
	syncGlyphFromDefault(codepoint, masterId) {
		if (!this.project) return;
		if (this.project.locked) return;
		const src = this.project.glyphs[codepoint];
		if (!src) return;
		this.project = updateMaster(this.project, masterId, (m) => ({
			...m,
			glyphs: {
				...m.glyphs,
				[codepoint]: JSON.parse(JSON.stringify(src))
			}
		}));
		this.touch();
	}
};
var projectStore = new ProjectStore();
//#endregion
export { projectStore as t };
