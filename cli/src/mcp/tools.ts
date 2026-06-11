/**
 * MCP tool definitions — the three tools the Patens MCP server exposes
 * to coding agents (Claude Code, Cursor, anything MCP-aware).
 *
 *   audit_font         Run the full audit + preflight against a
 *                      .font.json. Same three passes + dedup the CLI's
 *                      `patens audit` runs (cli/src/commands/audit.ts).
 *   explain_audit_code Plain-English description of one audit code —
 *                      the same `describeAuditCode()` dictionary the
 *                      editor, /learn/audit-codes, and `patens
 *                      describe` use. No prose is duplicated here.
 *   list_audit_codes   The full catalogue: code, title, family
 *                      (category), severity, fixable.
 *
 * Severity per code is not stored anywhere in the audit module (it's
 * decided at each emit site), so cli/build-mcp.mjs extracts it from
 * the audit sources at build time and injects it as the
 * `__AUDIT_SEVERITY_BY_CODE__` constant below. Codes whose severity is
 * genuinely context-dependent surface as 'varies'.
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
	auditProject,
	auditCompatibility,
	preflightProject,
	sortBySeverity,
	describeAuditCode,
	type AuditIssue,
	type AuditSeverity
} from '../../../src/lib/font/audit';
import { AUDIT_CATALOGUE, AUDIT_CATALOGUE_BY_CODE } from '../../../src/lib/font/audit-catalogue';
import type { Project } from '../../../src/lib/font/types';

/** Injected by cli/build-mcp.mjs (esbuild `define`) — code → severity. */
declare const __AUDIT_SEVERITY_BY_CODE__: Record<string, AuditSeverity | 'varies'>;

const SEVERITY_BY_CODE: Record<string, AuditSeverity | 'varies'> =
	typeof __AUDIT_SEVERITY_BY_CODE__ === 'undefined' ? {} : __AUDIT_SEVERITY_BY_CODE__;

export type ToolResult = {
	content: Array<{ type: 'text'; text: string }>;
	structuredContent?: Record<string, unknown>;
	isError?: boolean;
};

export type ToolDefinition = {
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
	handler: (args: Record<string, unknown>) => Promise<ToolResult>;
};

/** Both text + structuredContent so old and new MCP clients get data. */
const ok = (structured: Record<string, unknown>): ToolResult => ({
	content: [{ type: 'text', text: JSON.stringify(structured, null, 2) }],
	structuredContent: structured
});

const fail = (message: string): ToolResult => ({
	content: [{ type: 'text', text: message }],
	isError: true
});

/** Same shape check as the CLI's loadProject (cli/src/commands/audit.ts). */
const loadProject = async (path: string): Promise<Project | { error: string }> => {
	const absolute = resolve(path);
	let raw: string;
	try {
		raw = await readFile(absolute, 'utf8');
	} catch (e) {
		return { error: `couldn't read "${absolute}": ${e instanceof Error ? e.message : String(e)}` };
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch (e) {
		return { error: `"${absolute}" is not valid JSON: ${e instanceof Error ? e.message : String(e)}` };
	}
	if (!parsed || typeof parsed !== 'object') {
		return { error: `"${absolute}" doesn't look like a Patens .font.json (top level isn't an object).` };
	}
	const p = parsed as Record<string, unknown>;
	if (!p.id || !p.glyphs || !p.metadata) {
		return {
			error: `"${absolute}" doesn't look like a Patens .font.json (missing id / glyphs / metadata).`
		};
	}
	return parsed as Project;
};

const SEVERITIES: ReadonlySet<string> = new Set(['info', 'warn', 'error']);

const auditFont = async (args: Record<string, unknown>): Promise<ToolResult> => {
	const path = args.path;
	if (typeof path !== 'string' || path.length === 0) {
		return fail('audit_font: "path" is required — the path to a Patens .font.json file.');
	}
	const severity = args.severity ?? 'all';
	if (severity !== 'all' && (typeof severity !== 'string' || !SEVERITIES.has(severity))) {
		return fail(`audit_font: "severity" must be one of info / warn / error (got "${String(severity)}").`);
	}

	const loaded = await loadProject(path);
	if ('error' in loaded) return fail(`audit_font: ${loaded.error}`);
	const project = loaded;

	// Same three passes + dedup as `patens audit`.
	const all: AuditIssue[] = [
		...auditProject(project),
		...auditCompatibility(project),
		...preflightProject(project)
	];
	const seen = new Set<string>();
	const deduped: AuditIssue[] = [];
	for (const issue of all) {
		const k = `${issue.codepoint}:${issue.code}:${issue.message}`;
		if (seen.has(k)) continue;
		seen.add(k);
		deduped.push(issue);
	}
	const sorted = sortBySeverity(deduped);
	const allow = new Set<AuditSeverity>(
		severity === 'all' || severity === 'info'
			? ['info', 'warn', 'error']
			: severity === 'warn'
				? ['warn', 'error']
				: ['error']
	);
	const filtered = sorted.filter((i) => allow.has(i.severity));

	const counts = { error: 0, warn: 0, info: 0 };
	for (const i of filtered) counts[i.severity]++;

	return ok({
		findings: filtered.map((i) => ({
			code: i.code,
			severity: i.severity,
			// codepoint 0 = project-level issue (metadata, metrics, kerning…).
			glyph: i.codepoint > 0 ? (project.glyphs[i.codepoint]?.name ?? null) : null,
			codepoint: i.codepoint > 0 ? i.codepoint : null,
			message: i.message
		})),
		summary: {
			total: filtered.length,
			error: counts.error,
			warn: counts.warn,
			info: counts.info,
			family: project.metadata.familyName,
			version: project.metadata.version ?? null
		}
	});
};

const explainAuditCode = async (args: Record<string, unknown>): Promise<ToolResult> => {
	const code = args.code;
	if (typeof code !== 'string' || code.length === 0) {
		return fail('explain_audit_code: "code" is required — an audit code id like "self-intersecting".');
	}
	const description = describeAuditCode(code);
	if (!description) {
		return fail(
			`explain_audit_code: no curated description for code "${code}". ` +
				'Either it is misspelled or it post-dates this build — call list_audit_codes for the full catalogue.'
		);
	}
	const rule = AUDIT_CATALOGUE_BY_CODE[code];
	return ok({
		code,
		title: rule?.title ?? null,
		family: rule?.category ?? null,
		severity: SEVERITY_BY_CODE[code] ?? 'varies',
		fixable: rule?.fixable ?? false,
		description
	});
};

const listAuditCodes = async (): Promise<ToolResult> =>
	ok({
		total: AUDIT_CATALOGUE.length,
		codes: AUDIT_CATALOGUE.map((rule) => ({
			code: rule.code,
			title: rule.title,
			family: rule.category,
			severity: SEVERITY_BY_CODE[rule.code] ?? 'varies',
			fixable: rule.fixable
		})),
		note:
			'Peer-comparison codes (peer-<group>-<metric>) are generated dynamically and not listed; ' +
			'their severity scales with how far a glyph drifts from its peer group.'
	});

export const TOOLS: ToolDefinition[] = [
	{
		name: 'audit_font',
		description:
			'Run the full Patens audit (~102 deterministic codes + release preflight) against a .font.json ' +
			'project file. Returns structured findings (code, severity, glyph, message) plus a severity ' +
			'summary. Use explain_audit_code to expand any returned code.',
		inputSchema: {
			type: 'object',
			properties: {
				path: {
					type: 'string',
					description: 'Path to a Patens .font.json project file (absolute, or relative to the server cwd).'
				},
				severity: {
					type: 'string',
					enum: ['info', 'warn', 'error'],
					description:
						'Minimum severity to report — "warn" returns warn + error, "error" returns errors only. Omit for all.'
				}
			},
			required: ['path']
		},
		handler: auditFont
	},
	{
		name: 'explain_audit_code',
		description:
			'Plain-English explanation of a single Patens audit code — what triggers it, why it matters, ' +
			'how to fix. Same dictionary the editor and patens.design/learn/audit-codes use.',
		inputSchema: {
			type: 'object',
			properties: {
				code: {
					type: 'string',
					description: 'The audit code id, e.g. "self-intersecting" or "metrics-win-clip-top".'
				}
			},
			required: ['code']
		},
		handler: explainAuditCode
	},
	{
		name: 'list_audit_codes',
		description:
			'List every audit code in the Patens catalogue with its title, family (category), typical ' +
			'severity, and whether the editor has a one-click fix for it.',
		inputSchema: { type: 'object', properties: {} },
		handler: listAuditCodes
	}
];
