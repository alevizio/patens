/**
 * Audit store — reactive façade in front of the audit worker.
 *
 * Consumers read `perGlyph`, `compatibility`, `preflight` as $state and
 * call `request(project)` (typically inside a $effect that watches the
 * project) to schedule a fresh audit run. The store debounces requests
 * by 80ms so a rapid sequence of edits (e.g. dragging a point) doesn't
 * flood the worker.
 *
 * Stale-response guard: every request bumps a monotonic seq. The store
 * only accepts responses whose seq matches the latest request's. So if
 * the user mutates the project mid-audit, the stale result is dropped
 * and the fresh audit's result lands.
 *
 * Initial-load semantics: the lists start empty. Callers should not
 * assume the lists are populated immediately — wait for a microtask
 * after the first request, or accept that the first paint of an audit
 * surface shows "loading" or stale state until the worker responds.
 *
 * Graceful degradation: if the worker can't be constructed (no Worker
 * support, CSP), the store falls back to running the audit functions
 * synchronously on the main thread. Callers see no behavioural change.
 */

import { browser } from '$app/environment';
import {
	auditProject,
	auditCompatibility,
	preflightProject,
	type AuditIssue
} from '$lib/font/audit';
import type { Project } from '$lib/font/types';
import type { AuditRequest, AuditResponse } from '$lib/audit/audit-worker';

// Worker construction is a top-level function so Vite's worker-detection
// plugin sees the `new Worker(new URL('./...', import.meta.url))` pattern
// statically and emits the worker chunk. Calling it from inside a class
// method (or lazy-init) hides the call from Vite's static analyzer and
// breaks the bundling.
const createAuditWorker = (): Worker =>
	new Worker(new URL('../audit/audit-worker.ts', import.meta.url), { type: 'module' });

class AuditStore {
	perGlyph = $state<AuditIssue[]>([]);
	compatibility = $state<AuditIssue[]>([]);
	preflight = $state<AuditIssue[]>([]);
	/** Wall-clock duration of the last audit run, ms. Surfaced for debug + perf telemetry. */
	lastDurationMs = $state(0);

	private seq = 0;
	private worker: Worker | null = null;
	private pendingTimer: ReturnType<typeof setTimeout> | null = null;
	private workerFailed = false;

	private ensureWorker(): Worker | null {
		if (!browser || this.workerFailed) return null;
		if (this.worker) return this.worker;
		try {
			this.worker = createAuditWorker();
			this.worker.addEventListener('message', (event: MessageEvent<AuditResponse>) => {
				const { seq, perGlyph, compatibility, preflight, durationMs } = event.data;
				// Drop stale responses: a slow audit on an old project state must
				// never clobber the fresh data.
				if (seq !== this.seq) return;
				this.perGlyph = perGlyph;
				this.compatibility = compatibility;
				this.preflight = preflight;
				this.lastDurationMs = durationMs;
			});
			this.worker.addEventListener('error', (e) => {
				console.warn('Audit worker errored; falling back to sync:', e.message);
				this.workerFailed = true;
				this.worker?.terminate();
				this.worker = null;
			});
			return this.worker;
		} catch (e) {
			console.warn('Audit worker unavailable; falling back to sync:', e);
			this.workerFailed = true;
			return null;
		}
	}

	/**
	 * Schedule an audit run for the given project. Debounced 80ms.
	 * Subsequent calls within the debounce window replace the pending
	 * request — only the most recent project is sent to the worker.
	 */
	request(project: Project, debounceMs = 80) {
		if (this.pendingTimer) clearTimeout(this.pendingTimer);
		this.pendingTimer = setTimeout(() => {
			this.pendingTimer = null;
			this.runNow(project);
		}, debounceMs);
	}

	/**
	 * Run the audit immediately (skipping the debounce). Used by routes
	 * like /release that need fresh data on mount, not after a pause.
	 */
	runNow(project: Project) {
		const seq = ++this.seq;
		const worker = this.ensureWorker();
		if (worker) {
			// Svelte 5 $state values are proxy-wrapped and not structured-
			// cloneable across the worker boundary. $state.snapshot() returns
			// a plain deep copy that postMessage can clone.
			const req: AuditRequest = { project: $state.snapshot(project) as Project, seq };
			worker.postMessage(req);
			return;
		}
		// Sync fallback — runs on main thread but still respects the seq
		// guard so a delayed sync call doesn't clobber a fresh worker
		// response (in the rare case the worker recovers after failing).
		const start = performance.now();
		const perGlyph = auditProject(project);
		const compatibility = auditCompatibility(project);
		const preflight = preflightProject(project);
		const durationMs = performance.now() - start;
		if (seq !== this.seq) return;
		this.perGlyph = perGlyph;
		this.compatibility = compatibility;
		this.preflight = preflight;
		this.lastDurationMs = durationMs;
	}

	/**
	 * Clear cached results — useful when navigating between projects so
	 * the previous project's audit doesn't flash on the new one's surface.
	 */
	clear() {
		this.seq++;
		if (this.pendingTimer) {
			clearTimeout(this.pendingTimer);
			this.pendingTimer = null;
		}
		this.perGlyph = [];
		this.compatibility = [];
		this.preflight = [];
		this.lastDurationMs = 0;
	}
}

export const auditStore = new AuditStore();
