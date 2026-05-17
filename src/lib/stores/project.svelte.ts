/**
 * Project store — runes-backed reactive state for the currently loaded project.
 * Autosaves to IndexedDB on a debounce.
 */

import type {
	Axis,
	Glyph,
	KerningClass,
	KerningPair,
	KerningSide,
	Master,
	Project,
	VariableInstance
} from '$lib/font/types';
import {
	addAxis as addAxisHelper,
	addMaster as addMasterHelper,
	addScriptPack as addScriptPackHelper,
	removeAxis as removeAxisHelper,
	removeMaster as removeMasterHelper,
	saveProject,
	updateMaster as updateMasterHelper,
	updateMasterGlyph
} from '$lib/font/project';
import type { ScriptPack } from '$lib/font/charsets';
import { aglfnName } from '$lib/font/aglfn';

class ProjectStore {
	project = $state<Project | null>(null);
	selectedCodepoint = $state<number>(0x0041);
	/** undefined → default master; otherwise the id of an additional master. */
	selectedMasterId = $state<string | undefined>(undefined);
	dirty = $state(false);
	saving = $state(false);
	canUndo = $state(false);
	canRedo = $state(false);

	private saveTimer: ReturnType<typeof setTimeout> | null = null;
	private snapshotTimer: ReturnType<typeof setTimeout> | null = null;
	private undoStack: Project[] = [];
	private redoStack: Project[] = [];
	private readonly maxHistory = 50;

	load(project: Project) {
		this.project = project;
		this.dirty = false;
		const codepoints = Object.keys(project.glyphs).map(Number);
		const upper = codepoints.find((cp) => cp >= 0x0041 && cp <= 0x005a);
		this.selectedCodepoint = upper ?? codepoints[0] ?? 0x0041;
		// Seed history with the loaded state
		this.undoStack = [JSON.parse(JSON.stringify(project)) as Project];
		this.redoStack = [];
		this.updateUndoFlags();
	}

	private snapshotForHistory() {
		if (!this.project) return;
		const snap = JSON.parse(JSON.stringify(this.project)) as Project;
		this.undoStack.push(snap);
		if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
		this.redoStack = [];
		this.updateUndoFlags();
	}

	private scheduleSnapshot() {
		if (this.snapshotTimer) clearTimeout(this.snapshotTimer);
		this.snapshotTimer = setTimeout(() => this.snapshotForHistory(), 400);
	}

	private updateUndoFlags() {
		this.canUndo = this.undoStack.length > 1;
		this.canRedo = this.redoStack.length > 0;
	}

	undo() {
		if (this.undoStack.length < 2) return;
		// Cancel any pending snapshot so it doesn't overwrite our restored state
		if (this.snapshotTimer) {
			clearTimeout(this.snapshotTimer);
			this.snapshotTimer = null;
		}
		const current = this.undoStack.pop()!;
		this.redoStack.push(current);
		const prev = this.undoStack[this.undoStack.length - 1];
		this.project = JSON.parse(JSON.stringify(prev)) as Project;
		this.updateUndoFlags();
		this.dirty = true;
		this.scheduleSave();
	}

	redo() {
		if (this.redoStack.length === 0) return;
		if (this.snapshotTimer) {
			clearTimeout(this.snapshotTimer);
			this.snapshotTimer = null;
		}
		const next = this.redoStack.pop()!;
		this.undoStack.push(next);
		this.project = JSON.parse(JSON.stringify(next)) as Project;
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

	private touch() {
		if (!this.project) return;
		this.project = { ...this.project, updatedAt: new Date().toISOString() };
		this.dirty = true;
		this.scheduleSave();
		this.scheduleSnapshot();
	}

	private scheduleSave() {
		if (this.saveTimer) clearTimeout(this.saveTimer);
		this.saveTimer = setTimeout(() => this.flush(), 600);
	}

	async flush() {
		if (!this.project) return;
		this.saving = true;
		try {
			// $state.snapshot strips Svelte's reactive proxy so idb-keyval can
			// structured-clone the value reliably across all data shapes
			// (including the larger nested Records added by script packs).
			const snapshot = $state.snapshot(this.project) as typeof this.project;
			if (snapshot) await saveProject(snapshot);
			this.dirty = false;
		} catch (err) {
			console.error('Project save failed:', err);
		} finally {
			this.saving = false;
		}
	}

	/** Glyph map for the currently selected master (or the default master's). */
	get activeGlyphs(): Record<number, Glyph> {
		if (!this.project) return {};
		if (this.selectedMasterId) {
			const master = (this.project.masters ?? []).find((m) => m.id === this.selectedMasterId);
			if (master) return master.glyphs;
		}
		return this.project.glyphs;
	}

	get selectedGlyph(): Glyph | null {
		return this.activeGlyphs[this.selectedCodepoint] ?? null;
	}

	get activeMaster(): Master | null {
		if (!this.project || !this.selectedMasterId) return null;
		return (this.project.masters ?? []).find((m) => m.id === this.selectedMasterId) ?? null;
	}

	get masterOptions(): Array<{ id: string | undefined; name: string; location?: Record<string, number> }> {
		if (!this.project) return [];
		const out: Array<{ id: string | undefined; name: string; location?: Record<string, number> }> = [
			{ id: undefined, name: 'Default' }
		];
		for (const m of this.project.masters ?? []) {
			out.push({ id: m.id, name: m.name, location: m.location });
		}
		return out;
	}

	selectMaster(id: string | undefined) {
		this.selectedMasterId = id;
	}

	selectGlyph(codepoint: number) {
		if (!this.project) return;
		if (this.project.glyphs[codepoint]) this.selectedCodepoint = codepoint;
	}

	updateGlyph(codepoint: number, mut: (g: Glyph) => Glyph) {
		if (!this.project) return;
		if (this.selectedMasterId) {
			// Route to the additional master
			this.project = updateMasterGlyph(this.project, this.selectedMasterId, codepoint, mut);
		} else {
			const current = this.project.glyphs[codepoint];
			if (!current) return;
			const next = mut({ ...current });
			next.updatedAt = new Date().toISOString();
			this.project = {
				...this.project,
				glyphs: { ...this.project.glyphs, [codepoint]: next }
			};
		}
		this.touch();
	}

	updateMetadata(mut: Partial<Project['metadata']>) {
		if (!this.project) return;
		this.project = {
			...this.project,
			metadata: { ...this.project.metadata, ...mut }
		};
		this.touch();
	}

	updateMetrics(mut: Partial<Project['metrics']>) {
		if (!this.project) return;
		this.project = {
			...this.project,
			metrics: { ...this.project.metrics, ...mut }
		};
		this.touch();
	}

	updateName(name: string) {
		if (!this.project) return;
		this.project = { ...this.project, name };
		this.touch();
	}

	updateFeatures(mut: Partial<Project['features']>) {
		if (!this.project) return;
		this.project = {
			...this.project,
			features: { ...this.project.features, ...mut }
		};
		this.touch();
	}

	upsertKerningPair(pair: KerningPair) {
		if (!this.project) return;
		const existing = this.project.kerning.findIndex(
			(k) => k.left === pair.left && k.right === pair.right
		);
		const next = [...this.project.kerning];
		if (pair.value === 0) {
			if (existing >= 0) next.splice(existing, 1);
		} else if (existing >= 0) {
			next[existing] = pair;
		} else {
			next.push(pair);
		}
		this.project = { ...this.project, kerning: next };
		this.touch();
	}

	getKerningValue(left: KerningSide, right: KerningSide): number {
		if (!this.project) return 0;
		return this.project.kerning.find((k) => k.left === left && k.right === right)?.value ?? 0;
	}

	/** Kerning classes CRUD */
	upsertKerningClass(cls: KerningClass) {
		if (!this.project) return;
		const existing = (this.project.classes ?? []).findIndex((c) => c.name === cls.name);
		const next = [...(this.project.classes ?? [])];
		if (existing >= 0) next[existing] = cls;
		else next.push(cls);
		this.project = { ...this.project, classes: next };
		this.touch();
	}

	removeKerningClass(name: string) {
		if (!this.project) return;
		this.project = {
			...this.project,
			classes: (this.project.classes ?? []).filter((c) => c.name !== name),
			// Also drop any kerning pairs that reference this class
			kerning: this.project.kerning.filter((p) => p.left !== name && p.right !== name)
		};
		this.touch();
	}

	/** Named instances CRUD */
	upsertInstance(inst: VariableInstance) {
		if (!this.project) return;
		const existing = (this.project.instances ?? []).findIndex((i) => i.id === inst.id);
		const next = [...(this.project.instances ?? [])];
		if (existing >= 0) next[existing] = inst;
		else next.push(inst);
		this.project = { ...this.project, instances: next };
		this.touch();
	}

	removeInstance(id: string) {
		if (!this.project) return;
		this.project = {
			...this.project,
			instances: (this.project.instances ?? []).filter((i) => i.id !== id)
		};
		this.touch();
	}

	async addScriptPack(pack: ScriptPack) {
		if (!this.project) return;
		this.project = addScriptPackHelper(this.project, pack);
		this.touch();
		await this.flush();
	}

	addCustomGlyph(codepoint: number, name?: string) {
		if (!this.project) return false;
		if (this.project.glyphs[codepoint]) return false;
		const auto = name?.trim() || aglfnName(codepoint);
		const sb = this.project.metrics.defaultSidebearing;
		const advance = Math.round(this.project.metrics.unitsPerEm * 0.6);
		this.project = {
			...this.project,
			glyphs: {
				...this.project.glyphs,
				[codepoint]: {
					codepoint,
					name: auto,
					status: 'empty',
					advanceWidth: advance,
					leftSidebearing: sb,
					rightSidebearing: sb,
					contours: [],
					updatedAt: new Date().toISOString()
				}
			}
		};
		this.touch();
		return true;
	}

	toggleGlyphPin(codepoint: number) {
		if (!this.project) return;
		const current = this.project.glyphs[codepoint];
		if (!current) return;
		this.project = {
			...this.project,
			glyphs: {
				...this.project.glyphs,
				[codepoint]: { ...current, pinned: !current.pinned, updatedAt: new Date().toISOString() }
			}
		};
		this.touch();
	}

	setGlyphStatus(codepoint: number, status: Glyph['status']) {
		if (!this.project) return;
		if (!this.project.glyphs[codepoint]) return;
		const current = this.project.glyphs[codepoint];
		this.project = {
			...this.project,
			glyphs: {
				...this.project.glyphs,
				[codepoint]: { ...current, status, updatedAt: new Date().toISOString() }
			}
		};
		this.touch();
	}

	renameGlyph(codepoint: number, name: string) {
		if (!this.project) return;
		if (!this.project.glyphs[codepoint]) return;
		const trimmed = name.trim();
		if (!trimmed) return;
		const current = this.project.glyphs[codepoint];
		this.project = {
			...this.project,
			glyphs: {
				...this.project.glyphs,
				[codepoint]: { ...current, name: trimmed, updatedAt: new Date().toISOString() }
			}
		};
		this.touch();
	}

	removeGlyph(codepoint: number) {
		if (!this.project) return;
		if (!this.project.glyphs[codepoint]) return;
		const { [codepoint]: _, ...rest } = this.project.glyphs;
		this.project = {
			...this.project,
			glyphs: rest,
			// Drop kerning pairs referencing this glyph
			kerning: this.project.kerning.filter((p) => p.left !== codepoint && p.right !== codepoint),
			// Drop class members referencing this glyph
			classes: (this.project.classes ?? []).map((c) => ({
				...c,
				members: c.members.filter((m) => m !== codepoint)
			}))
		};
		// If this was the selected glyph, pick another
		if (this.selectedCodepoint === codepoint) {
			const codepoints = Object.keys(this.project.glyphs).map(Number);
			this.selectedCodepoint = codepoints[0] ?? 0x0041;
		}
		this.touch();
	}

	addAxis(tag: string) {
		if (!this.project) return;
		this.project = addAxisHelper(this.project, tag);
		this.touch();
	}

	removeAxis(tag: string) {
		if (!this.project) return;
		this.project = removeAxisHelper(this.project, tag);
		this.touch();
	}

	updateAxis(tag: string, mut: Partial<Axis>) {
		if (!this.project) return;
		this.project = {
			...this.project,
			axes: (this.project.axes ?? []).map((a) => (a.tag === tag ? { ...a, ...mut } : a))
		};
		this.touch();
	}

	async addMaster(name: string, location: Record<string, number>) {
		if (!this.project) return;
		this.project = addMasterHelper(this.project, { name, location });
		this.touch();
		await this.flush();
	}

	removeMaster(masterId: string) {
		if (!this.project) return;
		this.project = removeMasterHelper(this.project, masterId);
		if (this.selectedMasterId === masterId) this.selectedMasterId = undefined;
		this.touch();
	}

	updateMaster(masterId: string, mut: (m: Master) => Master) {
		if (!this.project) return;
		this.project = updateMasterHelper(this.project, masterId, mut);
		this.touch();
	}

	/**
	 * Copy a glyph's full data (contours, metrics, anchors, components) from
	 * the default master into the named additional master. Used to keep
	 * interpolation compatible when starting fresh on a master.
	 */
	syncGlyphFromDefault(codepoint: number, masterId: string) {
		if (!this.project) return;
		const src = this.project.glyphs[codepoint];
		if (!src) return;
		this.project = updateMasterHelper(this.project, masterId, (m) => ({
			...m,
			glyphs: {
				...m.glyphs,
				[codepoint]: JSON.parse(JSON.stringify(src)) as Glyph
			}
		}));
		this.touch();
	}
}

export const projectStore = new ProjectStore();
