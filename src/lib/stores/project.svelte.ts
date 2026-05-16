/**
 * Project store — runes-backed reactive state for the currently loaded project.
 * Autosaves to IndexedDB on a debounce.
 */

import type { Glyph, KerningPair, Project } from '$lib/font/types';
import { addScriptPack as addScriptPackHelper, saveProject } from '$lib/font/project';
import type { ScriptPack } from '$lib/font/charsets';

class ProjectStore {
	project = $state<Project | null>(null);
	selectedCodepoint = $state<number>(0x0041);
	dirty = $state(false);
	saving = $state(false);

	private saveTimer: ReturnType<typeof setTimeout> | null = null;

	load(project: Project) {
		this.project = project;
		this.dirty = false;
		const codepoints = Object.keys(project.glyphs).map(Number);
		const upper = codepoints.find((cp) => cp >= 0x0041 && cp <= 0x005a);
		this.selectedCodepoint = upper ?? codepoints[0] ?? 0x0041;
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

	get selectedGlyph(): Glyph | null {
		if (!this.project) return null;
		return this.project.glyphs[this.selectedCodepoint] ?? null;
	}

	selectGlyph(codepoint: number) {
		if (!this.project) return;
		if (this.project.glyphs[codepoint]) this.selectedCodepoint = codepoint;
	}

	updateGlyph(codepoint: number, mut: (g: Glyph) => Glyph) {
		if (!this.project) return;
		const current = this.project.glyphs[codepoint];
		if (!current) return;
		const next = mut({ ...current });
		next.updatedAt = new Date().toISOString();
		this.project = {
			...this.project,
			glyphs: { ...this.project.glyphs, [codepoint]: next }
		};
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

	getKerningValue(left: number, right: number): number {
		if (!this.project) return 0;
		return this.project.kerning.find((k) => k.left === left && k.right === right)?.value ?? 0;
	}

	async addScriptPack(pack: ScriptPack) {
		if (!this.project) return;
		this.project = addScriptPackHelper(this.project, pack);
		this.touch();
		// Bulk additions are significant — flush immediately rather than waiting for debounce
		await this.flush();
	}
}

export const projectStore = new ProjectStore();
