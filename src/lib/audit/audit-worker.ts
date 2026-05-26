/// <reference lib="webworker" />
/**
 * Audit worker — runs the three audit passes (per-glyph, multi-master
 * compatibility, release preflight) off the main thread.
 *
 * Wire diagram:
 *
 *   main thread                          worker
 *   ──────────                           ──────
 *   auditStore.request(p)                onmessage({project})
 *      └─ postMessage({project,seq})  →    auditProject(p)
 *                                          auditCompatibility(p)
 *                                          preflightProject(p)
 *                       ← postMessage({seq, perGlyph, compatibility,
 *                                       preflight, durationMs})
 *      onmessage → store.setResults
 *
 * Stale-response guard: every request carries a monotonic `seq`. The
 * store only accepts responses where seq matches the latest request's,
 * so a slow audit on an old project state doesn't clobber fresh data.
 */

import {
	auditProject,
	auditCompatibility,
	preflightProject,
	type AuditIssue
} from '$lib/font/audit';
import type { Project } from '$lib/font/types';

export type AuditRequest = {
	project: Project;
	seq: number;
};

export type AuditResponse = {
	seq: number;
	perGlyph: AuditIssue[];
	compatibility: AuditIssue[];
	preflight: AuditIssue[];
	durationMs: number;
};

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.addEventListener('message', (event: MessageEvent<AuditRequest>) => {
	const { project, seq } = event.data;
	const start = performance.now();
	const perGlyph = auditProject(project);
	const compatibility = auditCompatibility(project);
	const preflight = preflightProject(project);
	const durationMs = performance.now() - start;
	const response: AuditResponse = { seq, perGlyph, compatibility, preflight, durationMs };
	ctx.postMessage(response);
});
