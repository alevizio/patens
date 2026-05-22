/**
 * Project store — runes-backed reactive state for the currently loaded project.
 * Autosaves to IndexedDB on a debounce.
 */

import type {
	Axis,
	ColorLayer,
	ColorPalette,
	Glyph,
	KerningClass,
	KerningPair,
	KerningSide,
	Master,
	Project,
	RGBA,
	SidebearingClass,
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
import * as Y from 'yjs';
import { projectToYDoc, yDocToProject } from '$lib/sync/yjs-schema';
import { bindIndexedDb, type ProjectPersistence } from '$lib/sync/yjs-persistence';
import { connectToPartyKit, type NetworkConnection } from '$lib/sync/yjs-network';
// PartyKit host read via Vite's import.meta.env rather than
// $env/dynamic/public — the dynamic variant relies on a server-
// populated env object that doesn't exist on ssr=false routes
// (crashes with "Cannot read properties of undefined (reading
// 'env')"). $env/static/public would also fail at typecheck time
// because PUBLIC_PARTYKIT_HOST isn't set in the current env.
// import.meta.env is the universal escape hatch.
const PUBLIC_PARTYKIT_HOST = import.meta.env.PUBLIC_PARTYKIT_HOST as string | undefined;

class ProjectStore {
	project = $state<Project | null>(null);
	selectedCodepoint = $state<number>(0x0041);
	/** undefined → default master; otherwise the id of an additional master. */
	selectedMasterId = $state<string | undefined>(undefined);
	dirty = $state(false);
	saving = $state(false);
	/** Timestamp (ms) of the last successful flush() — drives "Saved Xs ago" UI. */
	lastSavedAt = $state<number | null>(null);
	canUndo = $state(false);
	canRedo = $state(false);

	private saveTimer: ReturnType<typeof setTimeout> | null = null;
	private snapshotTimer: ReturnType<typeof setTimeout> | null = null;
	private undoStack: Project[] = [];
	private redoStack: Project[] = [];
	private readonly maxHistory = 50;

	/**
	 * Phase C Day 1 — passive Y.Doc mirror.
	 *
	 * The doc is initialised in `load(project)` from the legacy
	 * Project value and lives alongside the existing `project` state.
	 * **Mutators do NOT write to the doc yet** — that's Day 2-3 work,
	 * each mutator migrated one at a time through a Y.Doc transaction.
	 * For now the doc is purely a scaffold: it exists, it can be read
	 * via `getDoc()`, and it'll be wired to IndexedDB + PartyKit in
	 * Days 4-5.
	 *
	 * Behaviour is unchanged for every existing caller; the doc just
	 * tags along.
	 */
	private doc: Y.Doc | null = null;
	private docUpdateUnsubscribe: (() => void) | null = null;
	/**
	 * Phase C Day 4 — y-indexeddb persistence binding. Created in
	 * `load()` (browser only); destroyed in `clear()` and on project
	 * switch. Survives reloads — re-mounting on the same project ID
	 * picks up where the previous session left off.
	 */
	private persistence: ProjectPersistence | null = null;
	/**
	 * Phase C Day 5 — y-partykit network binding for cross-machine
	 * collab. Only connects when `PUBLIC_PARTYKIT_HOST` is set in the
	 * environment; without it (current default), this stays null and
	 * IDB-only sync (cross-tab via BroadcastChannel, persistence
	 * across reloads) is the only persistence layer.
	 */
	private network: NetworkConnection | null = null;

	getDoc(): Y.Doc | null {
		return this.doc;
	}

	/**
	 * Decodes the current Y.Doc state back into the legacy
	 * `project = $state(...)` field. Fired automatically on any Y.Doc
	 * update once we start writing through transactions in Day 2.
	 *
	 * Cheap-enough today (~ms on real projects); future optimisation
	 * is patch-based reconciliation if it ever shows up in profiling.
	 */
	private refreshFromDoc = () => {
		if (!this.doc) return;
		this.project = yDocToProject(this.doc);
	};

	async load(project: Project) {
		this.dirty = false;
		// Tear down any state from a previous project before binding the
		// new one — these can outlive route navigations otherwise.
		if (this.docUpdateUnsubscribe) {
			this.docUpdateUnsubscribe();
			this.docUpdateUnsubscribe = null;
		}
		if (this.network) {
			this.network.destroy();
			this.network = null;
		}
		if (this.persistence) {
			this.persistence.destroy();
			this.persistence = null;
		}
		if (this.doc) this.doc.destroy();

		// Phase C Day 4 — migration-safe load.
		//
		// Start with an EMPTY Y.Doc. Bind y-indexeddb, await sync. If
		// IDB had stored state (returning user), the doc is now hydrated
		// — read it back via the schema bridge. Otherwise (fresh user
		// on this project) seed the doc from the legacy Project
		// parameter so subsequent writes layer on top.
		//
		// Critical: subscribe to the doc's 'update' event AFTER seeding,
		// not before. The seed phase triggers one update per Y.Map.set
		// and Y.Array.insert — wiring refreshFromDoc before then would
		// cause many redundant rebuilds of `this.project` against
		// partial doc state.
		//
		// Avoids the duplicate-Y.Array-entry trap: seeding into an
		// already-hydrated doc would re-insert kerning pairs / palettes
		// / etc on every reload, producing N-fold duplicates over N
		// sessions. The hydration check (`root.size > 0`) gates the
		// seed correctly.
		const d = new Y.Doc();
		this.doc = d;
		this.persistence = bindIndexedDb(d, project.id);
		if (this.persistence) {
			try {
				await this.persistence.whenSynced;
			} catch {
				/* IDB unavailable — fall through to the seed branch */
			}
		}
		const wasHydrated = d.getMap('project').size > 0;
		if (!wasHydrated) {
			// First-time load (or IDB unavailable / disabled). Seed from
			// the legacy Project. The doc 'update' event isn't subscribed
			// yet, so this doesn't fire N partial-state refreshFromDocs.
			projectToYDoc(project, d);
			this.project = project;
		} else {
			// Returning user on this project — the doc state in IDB is
			// the source of truth. The legacy Project from `data.project`
			// may be stale (autosave still runs but is best-effort).
			this.project = yDocToProject(d);
		}
		// NOW it's safe to subscribe — future writes propagate.
		d.on('update', this.refreshFromDoc);
		this.docUpdateUnsubscribe = () => d.off('update', this.refreshFromDoc);

		// Phase C Day 5 — opt-in PartyKit cross-machine sync. Only
		// connects when PUBLIC_PARTYKIT_HOST is configured; without it
		// IDB-only persistence is the default. Connection is per-room
		// keyed by project ID — sharing the same `/share/<id>` URL
		// joins the same room.
		const partyKitHost = PUBLIC_PARTYKIT_HOST?.trim();
		if (partyKitHost) {
			this.network = connectToPartyKit(d, project.id, { host: partyKitHost });
		}

		const finalProject = this.project!;
		const codepoints = Object.keys(finalProject.glyphs).map(Number);
		// Restore last-selected glyph from localStorage if it's still in the set;
		// otherwise default to the first uppercase Latin glyph that exists.
		// Uses `finalProject` (the actual loaded state from IDB or seed)
		// rather than the `project` parameter, in case those diverge.
		let initial: number | undefined;
		try {
			const stored = localStorage.getItem(`font-studio:last-cp:${project.id}`);
			if (stored) {
				const cp = Number(stored);
				if (Number.isFinite(cp) && finalProject.glyphs[cp]) initial = cp;
			}
		} catch {
			/* ignore */
		}
		const upper = codepoints.find((cp) => cp >= 0x0041 && cp <= 0x005a);
		this.selectedCodepoint = initial ?? upper ?? codepoints[0] ?? 0x0041;
		try {
			const masterId = localStorage.getItem(`font-studio:last-master:${project.id}`);
			if (masterId && (finalProject.masters ?? []).some((m) => m.id === masterId)) {
				this.selectedMasterId = masterId;
			} else {
				this.selectedMasterId = undefined;
			}
		} catch {
			this.selectedMasterId = undefined;
		}
		// Seed history with the loaded state (post-IDB-hydration if applicable)
		this.undoStack = [JSON.parse(JSON.stringify(finalProject)) as Project];
		this.redoStack = [];
		this.updateUndoFlags();
	}

	private snapshotForHistory() {
		if (!this.project) return;
		if (this.project.locked) return;
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
		if (this.project?.locked) return;
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
		if (this.project?.locked) return;
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
		if (this.docUpdateUnsubscribe) {
			this.docUpdateUnsubscribe();
			this.docUpdateUnsubscribe = null;
		}
		if (this.network) {
			this.network.destroy();
			this.network = null;
		}
		if (this.persistence) {
			this.persistence.destroy();
			this.persistence = null;
		}
		if (this.doc) {
			this.doc.destroy();
			this.doc = null;
		}
	}

	private touch() {
		if (!this.project) return;
		if (this.project.locked) return;
		const nextUpdatedAt = new Date().toISOString();
		// Write updatedAt through the doc so live state + doc stay in
		// sync. Without this, `this.project.updatedAt` drifts ahead of
		// `doc.getMap('project').get('updatedAt')` between mutator
		// calls, and the next mutator's refreshFromDoc would revert
		// the live value to the doc's older one.
		//
		// The transact() fires its own 'update' event, which triggers
		// refreshFromDoc. That's intentional: it pulls `this.project`
		// back from the doc, keeping the two definitionally equal.
		// The cost is ~0.04ms per touch() at 500 glyphs (bench
		// d9ab393), so doubling per-mutator transact cost is invisible
		// to the user.
		if (this.doc) {
			this.doc.transact(() => {
				this.doc!.getMap('project').set('updatedAt', nextUpdatedAt);
			});
		} else {
			this.project = { ...this.project, updatedAt: nextUpdatedAt };
		}
		this.dirty = true;
		this.scheduleSave();
		this.scheduleSnapshot();
	}

	private scheduleSave() {
		if (this.saveTimer) clearTimeout(this.saveTimer);
		this.saveTimer = setTimeout(() => this.flush(), 600);
	}

	/** Track that we've already surfaced a save-error toast for the current failure
	 *  run, so repeated debounced retries don't spam. Cleared on next successful save. */
	private saveErrorActive = false;

	async flush() {
		if (!this.project) return;
		// Cancel any pending debounced save so we don't fire twice
		if (this.saveTimer) {
			clearTimeout(this.saveTimer);
			this.saveTimer = null;
		}
		this.saving = true;
		try {
			// $state.snapshot strips Svelte's reactive proxy so idb-keyval can
			// structured-clone the value reliably across all data shapes
			// (including the larger nested Records added by script packs).
			const snapshot = $state.snapshot(this.project) as typeof this.project;
			if (snapshot) await saveProject(snapshot);
			this.dirty = false;
			this.lastSavedAt = Date.now();
			this.saveErrorActive = false;
		} catch (err) {
			console.error('Project save failed:', err);
			// Keep dirty=true so the user can see save is pending + retry
			this.dirty = true;
			// Surface to the user — once per failure run, not on every retry.
			if (!this.saveErrorActive) {
				this.saveErrorActive = true;
				const message = err instanceof Error ? err.message : String(err);
				const isQuota =
					(err instanceof DOMException && err.name === 'QuotaExceededError') ||
					/quota/i.test(message);
				import('./toast.svelte').then(({ toast }) => {
					if (isQuota) {
						toast.error(
							'Browser storage is full — your edits are not being saved. Export the project, then clear some space or remove old projects.'
						);
					} else {
						toast.error(`Save failed: ${message}`);
					}
				});
			}
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
		if (!this.project) return;
		try {
			const key = `font-studio:last-master:${this.project.id}`;
			if (id) localStorage.setItem(key, id);
			else localStorage.removeItem(key);
		} catch {
			/* ignore */
		}
	}

	selectGlyph(codepoint: number) {
		if (!this.project) return;
		if (this.project.glyphs[codepoint]) {
			this.selectedCodepoint = codepoint;
			try {
				localStorage.setItem(`font-studio:last-cp:${this.project.id}`, String(codepoint));
			} catch {
				/* ignore */
			}
		}
	}

	toggleLock() {
		if (!this.project) return;
		const nextLocked = !this.project.locked;
		const nextUpdatedAt = new Date().toISOString();
		// touch() short-circuits when locked, so we write `updatedAt`
		// manually here to ensure the lock state actually persists. Both
		// fields go in one transact() so observers see one update event.
		if (!this.doc) {
			this.project = { ...this.project, locked: nextLocked, updatedAt: nextUpdatedAt };
		} else {
			this.doc.transact(() => {
				const root = this.doc!.getMap('project');
				root.set('locked', nextLocked);
				root.set('updatedAt', nextUpdatedAt);
			});
		}
		this.dirty = true;
		this.scheduleSave();
	}

	updateTags(tags: string[]) {
		const cleaned = Array.from(
			new Set(tags.map((t) => t.trim().toLowerCase()).filter((t) => t.length > 0))
		);
		this.withRootScalar('tags', cleaned);
	}

	updateGlyph(codepoint: number, mut: (g: Glyph) => Glyph) {
		if (!this.project) return;
		if (this.project.locked) return;
		const drawnBefore = this.countDrawnGlyphs();
		if (this.selectedMasterId) {
			// Master branch — the helper returns a new Project with the
			// `masters` array updated. Sync via the Y.Array helper using
			// whole-array replacement, same shape as the Day 3c
			// helper-delegating mutators. Perf is fine: master edits are
			// rare (user has to explicitly select a non-default master)
			// and the bench at 500 glyphs shows yDocToProject < 0.05ms.
			const nextProject = updateMasterGlyph(
				this.project,
				this.selectedMasterId,
				codepoint,
				mut
			);
			this.withYArray<Master>(
				'masters',
				(arr) => {
					arr.delete(0, arr.length);
					arr.insert(0, nextProject.masters ?? []);
				},
				() => nextProject.masters ?? []
			);
		} else {
			// Default master branch — single-glyph write to the Y.Map.
			// Hot path during brush strokes; Day 3d profiling
			// (yjs-schema.bench.test.ts) confirmed the doc round-trip
			// stays sub-millisecond at 500 glyphs, so plain migration
			// is safe without patch-based reconciliation.
			const current = this.project.glyphs[codepoint];
			if (!current) return;
			const next = mut({ ...current });
			next.updatedAt = new Date().toISOString();
			this.writeGlyph(codepoint, next);
		}
		this.checkMilestone(drawnBefore);
	}

	private countDrawnGlyphs(): number {
		if (!this.project) return 0;
		return Object.values(this.project.glyphs).filter((g) => g.contours.length > 0).length;
	}

	private milestoneKey(): string {
		return `font-studio:milestones:${this.project?.id ?? ''}`;
	}

	private checkMilestone(drawnBefore: number) {
		if (!this.project || typeof localStorage === 'undefined') return;
		const drawnAfter = this.countDrawnGlyphs();
		if (drawnAfter <= drawnBefore) return; // only celebrate going up
		const milestones = [1, 5, 10, 25, 50, 100, 200];
		let celebrated: number[] = [];
		try {
			celebrated = JSON.parse(localStorage.getItem(this.milestoneKey()) ?? '[]') as number[];
		} catch {
			/* ignore */
		}
		for (const m of milestones) {
			if (drawnBefore < m && drawnAfter >= m && !celebrated.includes(m)) {
				celebrated.push(m);
				localStorage.setItem(this.milestoneKey(), JSON.stringify(celebrated));
				// Lazy-import the toast + delight to avoid cycles and keep
				// canvas-confetti out of the initial bundle.
				Promise.all([import('./toast.svelte'), import('$lib/delight')]).then(
					([{ toast }, { milestoneMessage, celebrate }]) => {
						toast.success(milestoneMessage(m));
						celebrate(m >= 100 ? 'large' : m >= 25 ? 'medium' : 'small');
					}
				);
				break;
			}
		}
	}

	/**
	 * Day 3e helper for root-scalar fields stored as plain values on
	 * the project Y.Map (metadata, metrics, features, name, etc.).
	 * The doc path is a single `root.set(key, next)` inside a
	 * transact(); the legacy fallback writes `this.project` directly.
	 */
	private withRootScalar<K extends keyof Project>(
		key: K,
		next: Project[K]
	): void {
		if (!this.project) return;
		if (this.project.locked) return;
		if (!this.doc) {
			this.project = { ...this.project, [key]: next } as Project;
			this.touch();
			return;
		}
		this.doc.transact(() => {
			this.doc!.getMap('project').set(key as string, next as unknown);
		});
		this.touch();
	}

	updateMetadata(mut: Partial<Project['metadata']>) {
		if (!this.project) return;
		this.withRootScalar('metadata', { ...this.project.metadata, ...mut });
	}

	updateMetrics(mut: Partial<Project['metrics']>) {
		if (!this.project) return;
		this.withRootScalar('metrics', { ...this.project.metrics, ...mut });
	}

	updateName(name: string) {
		this.withRootScalar('name', name);
	}

	updateDescription(description: string) {
		this.withRootScalar('description', description);
	}

	addChangelogEntry(entry: { version: string; notes: string }) {
		if (!this.project) return;
		const next: import('$lib/font/types').ChangelogEntry = {
			id: crypto.randomUUID(),
			version: entry.version.trim() || this.project.metadata.version,
			date: new Date().toISOString(),
			notes: entry.notes.trim()
		};
		this.withRootScalar('changelog', [next, ...(this.project.changelog ?? [])]);
	}

	addDecision(entry: { decision: string; rationale: string }) {
		if (!this.project) return;
		const next: import('$lib/font/types').DecisionEntry = {
			id: crypto.randomUUID(),
			date: new Date().toISOString(),
			decision: entry.decision.trim(),
			rationale: entry.rationale.trim()
		};
		this.withRootScalar('decisions', [next, ...(this.project.decisions ?? [])]);
	}

	removeDecision(id: string) {
		if (!this.project) return;
		this.withRootScalar(
			'decisions',
			(this.project.decisions ?? []).filter((e) => e.id !== id)
		);
	}

	removeChangelogEntry(id: string) {
		if (!this.project) return;
		this.withRootScalar(
			'changelog',
			(this.project.changelog ?? []).filter((e) => e.id !== id)
		);
	}

	updateSamples(mut: Partial<import('$lib/font/types').ProjectSamples>) {
		if (!this.project) return;
		this.withRootScalar('samples', { ...(this.project.samples ?? {}), ...mut });
	}

	toggleSpecimenSection(id: string) {
		if (!this.project) return;
		const cur = this.project.specimenSections ?? {};
		// undefined means "on"; once toggled, store explicit boolean
		this.withRootScalar('specimenSections', { ...cur, [id]: !(cur[id] ?? true) });
	}

	resetReleaseChecks() {
		this.withRootScalar('releaseChecks', {});
	}

	toggleReleaseCheck(id: string) {
		if (!this.project) return;
		const next = { ...(this.project.releaseChecks ?? {}) };
		next[id] = !next[id];
		this.withRootScalar('releaseChecks', next);
	}

	updateBrief(mut: Partial<import('$lib/font/types').ProjectBrief>) {
		if (!this.project) return;
		this.withRootScalar('brief', { ...(this.project.brief ?? {}), ...mut });
	}

	/**
	 * Inject a Google Fonts <link> for the family name so it can be used in
	 * any font-family CSS rule (e.g., the spacing playground's "Compare with"
	 * dropdown). No-op if the family is already loaded or if we're not in
	 * a browser context.
	 */
	private loadGoogleFontIfNeeded(family: string) {
		if (typeof document === 'undefined') return;
		const name = family.trim();
		if (!name) return;
		const id = 'gf-' + name.replace(/[^A-Za-z0-9]+/g, '-');
		if (document.getElementById(id)) return;
		const link = document.createElement('link');
		link.id = id;
		link.rel = 'stylesheet';
		link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g, '+')}&display=swap`;
		document.head.appendChild(link);
	}

	addBriefReference(ref: Omit<import('$lib/font/types').BriefReference, 'id'>) {
		if (!this.project) return;
		const brief = this.project.brief ?? {};
		this.withRootScalar('brief', {
			...brief,
			references: [...(brief.references ?? []), { ...ref, id: crypto.randomUUID() }]
		});
		// Try to load the family from Google Fonts so it becomes usable wherever
		// font-family rules look it up (silently 404s if not on GF).
		this.loadGoogleFontIfNeeded(ref.name);
	}

	/** Re-inject all references' Google Fonts at boot / project load. */
	loadAllReferenceFonts() {
		if (!this.project) return;
		for (const r of this.project.brief?.references ?? []) {
			this.loadGoogleFontIfNeeded(r.name);
		}
	}

	removeBriefReference(id: string) {
		if (!this.project) return;
		const brief = this.project.brief ?? {};
		this.withRootScalar('brief', {
			...brief,
			references: (brief.references ?? []).filter((r) => r.id !== id)
		});
	}

	updateFeatures(mut: Partial<Project['features']>) {
		if (!this.project) return;
		this.withRootScalar('features', { ...this.project.features, ...mut });
	}

	upsertKerningPair(pair: KerningPair) {
		if (!this.project) return;
		if (this.project.locked) return;
		if (!this.doc) {
			// Belt-and-braces: Day 1 wires up the doc unconditionally
			// in load(), but if a future caller bypassed load() this
			// keeps the legacy mutation path alive instead of throwing.
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
			return;
		}
		// Phase C Day 2: first mutator migrated to the Y.Doc transaction
		// path. After this transact() returns, the doc fires 'update' →
		// refreshFromDoc() → project = yDocToProject(doc) → Svelte
		// reactivity. No more direct `this.project = { ... }` here.
		this.doc.transact(() => {
			const root = this.doc!.getMap('project');
			const arr = root.get('kerning') as Y.Array<KerningPair>;
			const items = arr.toArray();
			const existing = items.findIndex(
				(k) => k.left === pair.left && k.right === pair.right
			);
			if (pair.value === 0) {
				if (existing >= 0) arr.delete(existing, 1);
			} else if (existing >= 0) {
				arr.delete(existing, 1);
				arr.insert(existing, [pair]);
			} else {
				arr.insert(arr.length, [pair]);
			}
		});
		this.touch();
	}

	getKerningValue(left: KerningSide, right: KerningSide): number {
		if (!this.project) return 0;
		return this.project.kerning.find((k) => k.left === left && k.right === right)?.value ?? 0;
	}

	/** Kerning classes CRUD */
	upsertKerningClass(cls: KerningClass) {
		this.withYArray<KerningClass>(
			'classes',
			(arr) => {
				const items = arr.toArray();
				const i = items.findIndex((c) => c.name === cls.name);
				if (i >= 0) {
					arr.delete(i, 1);
					arr.insert(i, [cls]);
				} else {
					arr.insert(arr.length, [cls]);
				}
			},
			(curr) => {
				const i = curr.findIndex((c) => c.name === cls.name);
				const next = [...curr];
				if (i >= 0) next[i] = cls;
				else next.push(cls);
				return next;
			}
		);
	}

	removeKerningClass(name: string) {
		if (!this.project) return;
		if (this.project.locked) return;
		// Two-array atomic update: drop the class itself AND any kerning
		// pairs that reference it. Both writes share one transact() so
		// observers see a single update event (and remote peers don't
		// briefly observe orphan pairs).
		const nextClasses = (this.project.classes ?? []).filter((c) => c.name !== name);
		const nextKerning = this.project.kerning.filter(
			(p) => p.left !== name && p.right !== name
		);
		if (!this.doc) {
			this.project = { ...this.project, classes: nextClasses, kerning: nextKerning };
			this.touch();
			return;
		}
		this.doc.transact(() => {
			const root = this.doc!.getMap('project');
			const cls = root.get('classes') as Y.Array<KerningClass>;
			cls.delete(0, cls.length);
			cls.insert(0, nextClasses);
			const kern = root.get('kerning') as Y.Array<KerningPair>;
			kern.delete(0, kern.length);
			kern.insert(0, nextKerning);
		});
		this.touch();
	}

	/** Sidebearing classes — linked LSB/RSB across a group of glyphs. */
	addSidebearingClass(name: string, members: number[]): string {
		const id = crypto.randomUUID();
		if (!this.project) return id;
		if (this.project.locked) return id;
		const cleanName = name.trim() || `Group ${(this.project.sidebearingClasses?.length ?? 0) + 1}`;
		const entry: SidebearingClass = { id, name: cleanName, members: [...new Set(members)] };
		this.withYArray<SidebearingClass>(
			'sidebearingClasses',
			(arr) => arr.insert(arr.length, [entry]),
			(curr) => [...curr, entry]
		);
		return id;
	}

	removeSidebearingClass(id: string) {
		this.withYArray<SidebearingClass>(
			'sidebearingClasses',
			(arr) => {
				const items = arr.toArray();
				const i = items.findIndex((c) => c.id === id);
				if (i >= 0) arr.delete(i, 1);
			},
			(curr) => curr.filter((c) => c.id !== id)
		);
	}

	updateSidebearingClassMembers(id: string, members: number[]) {
		const uniq = [...new Set(members)];
		this.withYArray<SidebearingClass>(
			'sidebearingClasses',
			(arr) => {
				const items = arr.toArray();
				const i = items.findIndex((c) => c.id === id);
				if (i < 0) return;
				arr.delete(i, 1);
				arr.insert(i, [{ ...items[i], members: uniq }]);
			},
			(curr) => curr.map((c) => (c.id === id ? { ...c, members: uniq } : c))
		);
	}

	renameSidebearingClass(id: string, name: string) {
		const cleanName = name.trim();
		if (!cleanName) return;
		this.withYArray<SidebearingClass>(
			'sidebearingClasses',
			(arr) => {
				const items = arr.toArray();
				const i = items.findIndex((c) => c.id === id);
				if (i < 0) return;
				arr.delete(i, 1);
				arr.insert(i, [{ ...items[i], name: cleanName }]);
			},
			(curr) => curr.map((c) => (c.id === id ? { ...c, name: cleanName } : c))
		);
	}

	/** Set LSB and/or RSB on every member of a sidebearing class, recomputing advance from bbox + sb. */
	setSidebearingClassValues(id: string, lsb: number | null, rsb: number | null) {
		if (!this.project) return;
		if (this.project.locked) return;
		const cls = (this.project.sidebearingClasses ?? []).find((c) => c.id === id);
		if (!cls) return;
		// Compute the next glyphs for every class member; we'll write
		// them all atomically in a single transact() so the doc fires
		// one 'update' event for the whole batch instead of one per
		// glyph (which would re-rebuild this.project N times).
		const updates: Array<[number, Glyph]> = [];
		for (const cp of cls.members) {
			const g = this.project.glyphs[cp];
			if (!g) continue;
			const newLsb = lsb !== null ? lsb : g.leftSidebearing;
			const newRsb = rsb !== null ? rsb : g.rightSidebearing;
			// Recompute advance: keep bbox width stable, slide LSB and pad RSB.
			const bboxW = Math.max(0, g.advanceWidth - g.leftSidebearing - g.rightSidebearing);
			updates.push([cp, {
				...g,
				leftSidebearing: newLsb,
				rightSidebearing: newRsb,
				advanceWidth: newLsb + bboxW + newRsb,
				updatedAt: new Date().toISOString()
			}]);
		}
		if (updates.length === 0) return;
		if (!this.doc) {
			const nextGlyphs = { ...this.project.glyphs };
			for (const [cp, g] of updates) nextGlyphs[cp] = g;
			this.project = { ...this.project, glyphs: nextGlyphs };
			this.touch();
			return;
		}
		this.doc.transact(() => {
			const glyphMap = this.doc!.getMap('project').get('glyphs') as Y.Map<unknown>;
			for (const [cp, g] of updates) glyphMap.set(String(cp), g);
		});
		this.touch();
	}

	// ---------- Y.Array mutator helper ----------

	/**
	 * Run a callback inside a Y.Doc transaction targeting the named
	 * Y.Array field, or fall back to a legacy direct-assignment
	 * mutator when the doc isn't wired up (defensive — Day 1
	 * unconditionally inits the doc in load()).
	 *
	 * Day 3a started with a palette-specific version of this; Day 3b
	 * generalised it so every Y.Array-backed collection in the
	 * schema (kerning, classes, sidebearingClasses, axes, masters,
	 * instances, palettes) shares one implementation.
	 *
	 * Multi-field mutators (e.g. `removeKerningClass`, which touches
	 * both `classes` and `kerning`) and helper-delegating ones
	 * (`addAxis`, `addMaster`, `updateMaster`) bypass this and open
	 * their own `doc.transact()` block — they're Day 3c work.
	 */
	private withYArray<T>(
		field:
			| 'kerning'
			| 'classes'
			| 'sidebearingClasses'
			| 'axes'
			| 'masters'
			| 'instances'
			| 'palettes',
		viaDoc: (arr: Y.Array<T>) => void,
		viaLegacy: (current: T[]) => T[]
	): void {
		if (!this.project) return;
		if (this.project.locked) return;
		if (!this.doc) {
			const current = (this.project[field] as unknown as T[] | undefined) ?? [];
			this.project = {
				...this.project,
				[field]: viaLegacy(current)
			};
			this.touch();
			return;
		}
		this.doc.transact(() => {
			const arr = this.doc!.getMap('project').get(field) as Y.Array<T>;
			viaDoc(arr);
		});
		this.touch();
	}

	// ---------- Color palettes (CPAL) ----------

	/** Add a fresh palette to the project. Returns the new palette's id. */
	addPalette(palette: ColorPalette): string {
		this.withYArray<ColorPalette>(
			'palettes',
			(arr) => arr.insert(arr.length, [palette]),
			(curr) => [...curr, palette]
		);
		return palette.id;
	}

	removePalette(id: string) {
		this.withYArray<ColorPalette>(
			'palettes',
			(arr) => {
				const items = arr.toArray();
				const i = items.findIndex((p) => p.id === id);
				if (i >= 0) arr.delete(i, 1);
			},
			(curr) => curr.filter((p) => p.id !== id)
		);
	}

	updatePalette(id: string, mut: (p: ColorPalette) => ColorPalette) {
		this.withYArray<ColorPalette>(
			'palettes',
			(arr) => {
				const items = arr.toArray();
				const i = items.findIndex((p) => p.id === id);
				if (i < 0) return;
				arr.delete(i, 1);
				arr.insert(i, [mut(items[i])]);
			},
			(curr) => curr.map((p) => (p.id === id ? mut(p) : p))
		);
	}

	/**
	 * Set a single colour in a palette by index. Out-of-range indexes are
	 * a no-op (CPAL requires all palettes share a length; resize via
	 * `resizePalettes` instead of writing past the end).
	 */
	setPaletteColor(id: string, index: number, color: RGBA) {
		this.updatePalette(id, (p) => {
			if (index < 0 || index >= p.colors.length) return p;
			const colors = [...p.colors];
			colors[index] = color;
			return { ...p, colors };
		});
	}

	/**
	 * Resize every palette to `length` entries. Truncates or pads with the
	 * given fill colour (default: opaque ink). CPAL invariant: all
	 * palettes must agree on length.
	 */
	resizePalettes(length: number, fill: RGBA = { r: 26, g: 26, b: 26, a: 1 }) {
		if (length < 0) return;
		const reshape = (p: ColorPalette): ColorPalette => {
			if (p.colors.length === length) return p;
			if (p.colors.length > length) return { ...p, colors: p.colors.slice(0, length) };
			const padding = new Array(length - p.colors.length).fill(0).map(() => ({ ...fill }));
			return { ...p, colors: [...p.colors, ...padding] };
		};
		this.withYArray<ColorPalette>(
			'palettes',
			(arr) => {
				// Replace every entry in place via delete + insert so the Y.Array
				// observes the right structural changes (insertion CRDT semantics).
				const items = arr.toArray();
				for (let i = 0; i < items.length; i++) {
					const next = reshape(items[i]);
					if (next === items[i]) continue;
					arr.delete(i, 1);
					arr.insert(i, [next]);
				}
			},
			(curr) => curr.map(reshape)
		);
	}

	// ---------- Color layers (COLR v0) ----------

	addColorLayer(codepoint: number, layer: ColorLayer) {
		this.updateGlyph(codepoint, (g) => ({
			...g,
			colorLayers: [...(g.colorLayers ?? []), layer]
		}));
	}

	removeColorLayer(codepoint: number, layerId: string) {
		this.updateGlyph(codepoint, (g) => ({
			...g,
			colorLayers: (g.colorLayers ?? []).filter((l) => l.id !== layerId)
		}));
	}

	updateColorLayer(codepoint: number, layerId: string, mut: (l: ColorLayer) => ColorLayer) {
		this.updateGlyph(codepoint, (g) => ({
			...g,
			colorLayers: (g.colorLayers ?? []).map((l) => (l.id === layerId ? mut(l) : l))
		}));
	}

	/**
	 * Reorder a glyph's color layers by listing layer IDs in their new
	 * bottom-up order. Layers not in the order list are dropped from the
	 * glyph — pass every existing id to avoid data loss.
	 */
	reorderColorLayers(codepoint: number, layerIds: string[]) {
		this.updateGlyph(codepoint, (g) => {
			const byId = new Map((g.colorLayers ?? []).map((l) => [l.id, l]));
			const next: ColorLayer[] = [];
			for (const id of layerIds) {
				const l = byId.get(id);
				if (l) next.push(l);
			}
			return { ...g, colorLayers: next };
		});
	}

	/** Named instances CRUD */
	upsertInstance(inst: VariableInstance) {
		this.withYArray<VariableInstance>(
			'instances',
			(arr) => {
				const items = arr.toArray();
				const i = items.findIndex((x) => x.id === inst.id);
				if (i >= 0) {
					arr.delete(i, 1);
					arr.insert(i, [inst]);
				} else {
					arr.insert(arr.length, [inst]);
				}
			},
			(curr) => {
				const i = curr.findIndex((x) => x.id === inst.id);
				const next = [...curr];
				if (i >= 0) next[i] = inst;
				else next.push(inst);
				return next;
			}
		);
	}

	removeInstance(id: string) {
		this.withYArray<VariableInstance>(
			'instances',
			(arr) => {
				const items = arr.toArray();
				const i = items.findIndex((x) => x.id === id);
				if (i >= 0) arr.delete(i, 1);
			},
			(curr) => curr.filter((x) => x.id !== id)
		);
	}

	async addScriptPack(pack: ScriptPack) {
		if (!this.project) return;
		if (this.project.locked) return;
		// addScriptPackHelper can add a whole range of glyphs (e.g. Cyrillic
		// pack adds ~100 codepoints) plus potentially seed kerning classes.
		// Write the new glyphs into the Y.Map atomically so observers see
		// one update event instead of N.
		const next = addScriptPackHelper(this.project, pack);
		if (!this.doc) {
			this.project = next;
			this.touch();
			await this.flush();
			return;
		}
		this.doc.transact(() => {
			const root = this.doc!.getMap('project');
			const glyphMap = root.get('glyphs') as Y.Map<unknown>;
			// Diff: add only the codepoints not previously present.
			for (const [cpStr, glyph] of Object.entries(next.glyphs)) {
				if (!glyphMap.has(cpStr)) glyphMap.set(cpStr, glyph);
			}
			// Classes can have additional entries from the script pack —
			// replace the full Y.Array (same pattern as Day 3c helpers).
			const cls = root.get('classes') as Y.Array<KerningClass>;
			cls.delete(0, cls.length);
			cls.insert(0, next.classes ?? []);
		});
		this.touch();
		await this.flush();
	}

	/**
	 * Day 3g helper for cold-path single-glyph writes (addCustomGlyph,
	 * resetGlyph, saveRevision, restoreRevision, deleteRevision). The
	 * drawing-hot-path `updateGlyph` deliberately does NOT use this
	 * yet — see Day 3d note for the perf-profiling rationale.
	 *
	 * Doc path: stash the next glyph into the Y.Map keyed by string
	 * codepoint, inside a transact() so the 'update' event fires once
	 * and refreshFromDoc rebuilds the project once.
	 *
	 * Legacy path: assign the next glyphs record onto this.project.
	 */
	private writeGlyph(codepoint: number, next: Glyph): void {
		if (!this.project) return;
		if (this.project.locked) return;
		if (!this.doc) {
			this.project = {
				...this.project,
				glyphs: { ...this.project.glyphs, [codepoint]: next }
			};
			this.touch();
			return;
		}
		this.doc.transact(() => {
			const glyphMap = this.doc!.getMap('project').get('glyphs') as Y.Map<unknown>;
			glyphMap.set(String(codepoint), next);
		});
		this.touch();
	}

	addCustomGlyph(codepoint: number, name?: string) {
		if (!this.project) return false;
		if (this.project.locked) return false;
		if (this.project.glyphs[codepoint]) return false;
		const auto = name?.trim() || aglfnName(codepoint);
		const sb = this.project.metrics.defaultSidebearing;
		const advance = Math.round(this.project.metrics.unitsPerEm * 0.6);
		this.writeGlyph(codepoint, {
			codepoint,
			name: auto,
			status: 'empty',
			advanceWidth: advance,
			leftSidebearing: sb,
			rightSidebearing: sb,
			contours: [],
			updatedAt: new Date().toISOString()
		});
		return true;
	}

	/**
	 * Apply auto-suggested anchors to a glyph. Used by the "Suggest
	 * anchors" button in the editor — replaces existing canonical-
	 * named anchors (top, bottom, _top) with bbox-centred
	 * suggestions and leaves any designer-named custom anchors
	 * (e.g. `centerleft`) untouched.
	 */
	applyAnchorSuggestions(
		codepoint: number,
		suggestions: ReadonlyArray<{ name: string; x: number; y: number }>
	) {
		if (!this.project) return;
		if (this.project.locked) return;
		const current = this.project.glyphs[codepoint];
		if (!current) return;
		const suggestedNames = new Set(suggestions.map((s) => s.name));
		const kept = (current.anchors ?? []).filter((a) => !suggestedNames.has(a.name));
		const next = [...kept, ...suggestions.map((s) => ({ name: s.name, x: s.x, y: s.y }))];
		this.writeGlyph(codepoint, {
			...current,
			anchors: next,
			updatedAt: new Date().toISOString()
		});
	}

	/**
	 * Apply a composite decomposition to a glyph. Replaces the
	 * current contours/components with the provided reference list
	 * (from `decomposeCodepoint`) and marks status as 'draft' so the
	 * designer sees it surface in the "Drawn" filter immediately.
	 * The base glyph's advance is inherited from the first
	 * component (typically the letterform, not the mark).
	 */
	applyComposite(codepoint: number, references: import('$lib/font/types').GlyphReference[]) {
		if (!this.project) return;
		if (this.project.locked) return;
		const current = this.project.glyphs[codepoint];
		if (!current || references.length === 0) return;
		const baseCp = references[0].baseCodepoint;
		const base = this.project.glyphs[baseCp];
		const advance = base?.advanceWidth ?? current.advanceWidth;
		this.writeGlyph(codepoint, {
			...current,
			contours: [],
			components: references.map((r) => ({ ...r })),
			advanceWidth: advance,
			leftSidebearing: base?.leftSidebearing ?? current.leftSidebearing,
			rightSidebearing: base?.rightSidebearing ?? current.rightSidebearing,
			status: 'draft',
			updatedAt: new Date().toISOString()
		});
	}

	resetGlyph(codepoint: number) {
		if (!this.project) return;
		if (this.project.locked) return;
		const current = this.project.glyphs[codepoint];
		if (!current) return;
		const sb = this.project.metrics.defaultSidebearing;
		const advance = Math.round(this.project.metrics.unitsPerEm * 0.6);
		this.writeGlyph(codepoint, {
			...current,
			status: 'empty',
			contours: [],
			sketch: [],
			components: [],
			anchors: [],
			notes: undefined,
			referenceImage: undefined,
			advanceWidth: advance,
			leftSidebearing: sb,
			rightSidebearing: sb,
			updatedAt: new Date().toISOString()
		});
	}

	saveRevision(codepoint: number, label?: string) {
		if (!this.project) return;
		if (this.project.locked) return;
		const current = this.project.glyphs[codepoint];
		if (!current || current.contours.length === 0) return;
		const rev: import('$lib/font/types').GlyphRevision = {
			id: crypto.randomUUID(),
			takenAt: new Date().toISOString(),
			label: label?.trim() || undefined,
			contours: JSON.parse(JSON.stringify(current.contours)),
			advanceWidth: current.advanceWidth,
			leftSidebearing: current.leftSidebearing,
			rightSidebearing: current.rightSidebearing
		};
		const next = [...(current.revisions ?? []), rev];
		// Cap at 8 revisions to keep the project file lean. Pinned revisions
		// are exempt from the rotation — when we'd otherwise evict, we drop
		// the oldest *unpinned* revision instead. If every slot is pinned,
		// nothing is evicted and the count grows past 8 until the designer
		// unpins or deletes one.
		let trimmed = next;
		while (trimmed.length > 8) {
			const oldestUnpinnedIdx = trimmed.findIndex((r) => !r.pinned);
			if (oldestUnpinnedIdx === -1) break;
			trimmed = [
				...trimmed.slice(0, oldestUnpinnedIdx),
				...trimmed.slice(oldestUnpinnedIdx + 1)
			];
		}
		this.writeGlyph(codepoint, {
			...current,
			revisions: trimmed,
			updatedAt: new Date().toISOString()
		});
	}

	toggleRevisionPin(codepoint: number, revisionId: string) {
		if (!this.project) return;
		if (this.project.locked) return;
		const current = this.project.glyphs[codepoint];
		if (!current?.revisions) return;
		this.writeGlyph(codepoint, {
			...current,
			revisions: current.revisions.map((r) =>
				r.id === revisionId ? { ...r, pinned: !r.pinned } : r
			),
			updatedAt: new Date().toISOString()
		});
	}

	restoreRevision(codepoint: number, revisionId: string) {
		if (!this.project) return;
		if (this.project.locked) return;
		const current = this.project.glyphs[codepoint];
		if (!current) return;
		const rev = (current.revisions ?? []).find((r) => r.id === revisionId);
		if (!rev) return;
		this.writeGlyph(codepoint, {
			...current,
			contours: JSON.parse(JSON.stringify(rev.contours)),
			advanceWidth: rev.advanceWidth,
			leftSidebearing: rev.leftSidebearing,
			rightSidebearing: rev.rightSidebearing,
			updatedAt: new Date().toISOString()
		});
	}

	deleteRevision(codepoint: number, revisionId: string) {
		if (!this.project) return;
		if (this.project.locked) return;
		const current = this.project.glyphs[codepoint];
		if (!current?.revisions) return;
		this.writeGlyph(codepoint, {
			...current,
			revisions: current.revisions.filter((r) => r.id !== revisionId),
			updatedAt: new Date().toISOString()
		});
	}

	toggleGlyphFlag(codepoint: number) {
		if (!this.project) return;
		if (this.project.locked) return;
		const current = this.project.glyphs[codepoint];
		if (!current) return;
		this.writeGlyph(codepoint, {
			...current,
			flagged: !current.flagged,
			updatedAt: new Date().toISOString()
		});
	}

	toggleGlyphPin(codepoint: number) {
		if (!this.project) return;
		if (this.project.locked) return;
		const current = this.project.glyphs[codepoint];
		if (!current) return;
		this.writeGlyph(codepoint, {
			...current,
			pinned: !current.pinned,
			updatedAt: new Date().toISOString()
		});
	}

	setGlyphStatus(codepoint: number, status: Glyph['status']) {
		if (!this.project) return;
		if (this.project.locked) return;
		const current = this.project.glyphs[codepoint];
		if (!current) return;
		this.writeGlyph(codepoint, {
			...current,
			status,
			updatedAt: new Date().toISOString()
		});
	}

	renameGlyph(codepoint: number, name: string) {
		if (!this.project) return;
		if (this.project.locked) return;
		const current = this.project.glyphs[codepoint];
		if (!current) return;
		const trimmed = name.trim();
		if (!trimmed) return;
		this.writeGlyph(codepoint, {
			...current,
			name: trimmed,
			updatedAt: new Date().toISOString()
		});
	}

	removeGlyph(codepoint: number) {
		if (!this.project) return;
		if (this.project.locked) return;
		if (!this.project.glyphs[codepoint]) return;
		// Three-shape atomic delete: glyphs Y.Map drop + kerning Y.Array
		// filter (drop referencing pairs) + classes Y.Array (drop the
		// codepoint from every member list). One transact() so observers
		// see a single update event instead of three.
		const nextKerning = this.project.kerning.filter(
			(p) => p.left !== codepoint && p.right !== codepoint
		);
		const nextClasses = (this.project.classes ?? []).map((c) => ({
			...c,
			members: c.members.filter((m) => m !== codepoint)
		}));
		const willBeOrphaned = this.selectedCodepoint === codepoint;
		if (!this.doc) {
			const { [codepoint]: _, ...rest } = this.project.glyphs;
			this.project = {
				...this.project,
				glyphs: rest,
				kerning: nextKerning,
				classes: nextClasses
			};
		} else {
			this.doc.transact(() => {
				const root = this.doc!.getMap('project');
				const glyphMap = root.get('glyphs') as Y.Map<unknown>;
				glyphMap.delete(String(codepoint));
				const kern = root.get('kerning') as Y.Array<KerningPair>;
				kern.delete(0, kern.length);
				kern.insert(0, nextKerning);
				const cls = root.get('classes') as Y.Array<KerningClass>;
				cls.delete(0, cls.length);
				cls.insert(0, nextClasses);
			});
		}
		if (willBeOrphaned) {
			const codepoints = Object.keys(this.project?.glyphs ?? {}).map(Number);
			this.selectedCodepoint = codepoints[0] ?? 0x0041;
		}
		this.touch();
	}

	addAxis(tag: string) {
		if (!this.project) return;
		if (this.project.locked) return;
		const next = addAxisHelper(this.project, tag);
		this.withYArray<Axis>(
			'axes',
			(arr) => {
				arr.delete(0, arr.length);
				arr.insert(0, next.axes ?? []);
			},
			() => next.axes ?? []
		);
	}

	removeAxis(tag: string) {
		if (!this.project) return;
		if (this.project.locked) return;
		// removeAxis also cleans up the dropped tag from every master's
		// location, so it's a two-array atomic update (axes + masters).
		const next = removeAxisHelper(this.project, tag);
		if (!this.doc) {
			this.project = next;
			this.touch();
			return;
		}
		this.doc.transact(() => {
			const root = this.doc!.getMap('project');
			const axesArr = root.get('axes') as Y.Array<Axis>;
			axesArr.delete(0, axesArr.length);
			axesArr.insert(0, next.axes ?? []);
			const mastersArr = root.get('masters') as Y.Array<Master>;
			mastersArr.delete(0, mastersArr.length);
			mastersArr.insert(0, next.masters ?? []);
		});
		this.touch();
	}

	updateAxis(tag: string, mut: Partial<Axis>) {
		this.withYArray<Axis>(
			'axes',
			(arr) => {
				const items = arr.toArray();
				const i = items.findIndex((a) => a.tag === tag);
				if (i < 0) return;
				arr.delete(i, 1);
				arr.insert(i, [{ ...items[i], ...mut }]);
			},
			(curr) => curr.map((a) => (a.tag === tag ? { ...a, ...mut } : a))
		);
	}

	async addMaster(name: string, location: Record<string, number>) {
		if (!this.project) return;
		if (this.project.locked) return;
		const next = addMasterHelper(this.project, { name, location });
		this.withYArray<Master>(
			'masters',
			(arr) => {
				arr.delete(0, arr.length);
				arr.insert(0, next.masters ?? []);
			},
			() => next.masters ?? []
		);
		await this.flush();
	}

	removeMaster(masterId: string) {
		if (!this.project) return;
		if (this.project.locked) return;
		const next = removeMasterHelper(this.project, masterId);
		this.withYArray<Master>(
			'masters',
			(arr) => {
				arr.delete(0, arr.length);
				arr.insert(0, next.masters ?? []);
			},
			() => next.masters ?? []
		);
		if (this.selectedMasterId === masterId) this.selectedMasterId = undefined;
	}

	updateMaster(masterId: string, mut: (m: Master) => Master) {
		if (!this.project) return;
		if (this.project.locked) return;
		const next = updateMasterHelper(this.project, masterId, mut);
		this.withYArray<Master>(
			'masters',
			(arr) => {
				arr.delete(0, arr.length);
				arr.insert(0, next.masters ?? []);
			},
			() => next.masters ?? []
		);
	}

	/**
	 * Sync every glyph in a master from the default master that doesn't
	 * already have a drawn outline in that master. Useful for setting up a
	 * fresh master with the same starting point as default.
	 *
	 * Returns the number of glyphs copied.
	 */
	syncAllEmptyFromDefault(masterId: string): number {
		if (!this.project) return 0;
		if (this.project.locked) return 0;
		let count = 0;
		const nextProject = updateMasterHelper(this.project, masterId, (m) => {
			const next = { ...m.glyphs };
			for (const [cpStr, srcGlyph] of Object.entries(this.project!.glyphs)) {
				const cp = Number(cpStr);
				const existing = next[cp];
				const existingDrawn =
					existing && existing.contours && existing.contours.length > 0;
				if (existingDrawn) continue;
				if (srcGlyph.contours.length === 0) continue;
				next[cp] = JSON.parse(JSON.stringify(srcGlyph)) as Glyph;
				count++;
			}
			return { ...m, glyphs: next };
		});
		this.withYArray<Master>(
			'masters',
			(arr) => {
				arr.delete(0, arr.length);
				arr.insert(0, nextProject.masters ?? []);
			},
			() => nextProject.masters ?? []
		);
		return count;
	}

	/**
	 * Copy a glyph's full data (contours, metrics, anchors, components) from
	 * the default master into the named additional master. Used to keep
	 * interpolation compatible when starting fresh on a master.
	 */
	syncGlyphFromDefault(codepoint: number, masterId: string) {
		if (!this.project) return;
		if (this.project.locked) return;
		const src = this.project.glyphs[codepoint];
		if (!src) return;
		const nextProject = updateMasterHelper(this.project, masterId, (m) => ({
			...m,
			glyphs: {
				...m.glyphs,
				[codepoint]: JSON.parse(JSON.stringify(src)) as Glyph
			}
		}));
		this.withYArray<Master>(
			'masters',
			(arr) => {
				arr.delete(0, arr.length);
				arr.insert(0, nextProject.masters ?? []);
			},
			() => nextProject.masters ?? []
		);
	}
}

export const projectStore = new ProjectStore();
