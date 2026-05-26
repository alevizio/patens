import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
	auditProject,
	auditCompatibility,
	preflightProject,
	sortBySeverity,
	type AuditIssue,
	type AuditSeverity
} from '../../../src/lib/font/audit';
import type { Project } from '../../../src/lib/font/types';
import { renderText, type TextOptions } from '../format/text';
import { renderJson } from '../format/json';
import { renderGithub } from '../format/github';

type AuditOptions = {
	path: string;
	format: 'text' | 'json' | 'github';
	severity: AuditSeverity | 'all';
	color: boolean;
};

const SEVERITIES: ReadonlySet<string> = new Set(['info', 'warn', 'error']);

const parseArgs = (args: string[]): AuditOptions | { error: string } => {
	let path: string | undefined;
	let format: AuditOptions['format'] = 'text';
	let severity: AuditOptions['severity'] = 'all';
	let color = process.stdout.isTTY === true;

	for (const arg of args) {
		if (arg === '--json') format = 'json';
		else if (arg === '--github') format = 'github';
		else if (arg.startsWith('--severity=')) {
			const value = arg.slice('--severity='.length);
			if (!SEVERITIES.has(value)) {
				return { error: `--severity must be one of info / warn / error (got "${value}").` };
			}
			severity = value as AuditSeverity;
		} else if (arg === '--no-color') color = false;
		else if (arg === '--color') color = true;
		else if (arg.startsWith('-')) {
			return { error: `unknown audit option "${arg}". See \`patens help\`.` };
		} else if (!path) {
			path = arg;
		} else {
			return { error: `audit accepts a single file argument (got "${path}" and "${arg}").` };
		}
	}
	if (!path) {
		return { error: 'audit needs a .font.json path. Try `patens audit my-font.json`.' };
	}
	return { path, format, severity, color };
};

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

const filterBySeverity = (
	issues: AuditIssue[],
	min: AuditOptions['severity']
): AuditIssue[] => {
	if (min === 'all' || min === 'info') return issues;
	// `min === 'warn'` includes 'warn' + 'error'.
	// `min === 'error'` includes 'error' only.
	const allow = new Set<AuditSeverity>(
		min === 'warn' ? ['warn', 'error'] : ['error']
	);
	return issues.filter((i) => allow.has(i.severity));
};

export const runAudit = async (args: string[]): Promise<number> => {
	const parsed = parseArgs(args);
	if ('error' in parsed) {
		process.stderr.write(`patens audit: ${parsed.error}\n`);
		return 2;
	}

	const loaded = await loadProject(parsed.path);
	if ('error' in loaded) {
		process.stderr.write(`patens audit: ${loaded.error}\n`);
		return 2;
	}
	const project = loaded;

	// Run the three audit passes the editor runs. preflight is the
	// strictest pass and applies only at release time, but a CLI user
	// who passed a .font.json explicitly almost always wants the full
	// picture — they can filter with --severity if they only want
	// errors.
	const all: AuditIssue[] = [
		...auditProject(project),
		...auditCompatibility(project),
		...preflightProject(project)
	];

	// Dedup by (codepoint, code, message) — the three passes share a
	// few codes so the editor de-duplicates the same way.
	const seen = new Set<string>();
	const deduped: AuditIssue[] = [];
	for (const issue of all) {
		const k = `${issue.codepoint}:${issue.code}:${issue.message}`;
		if (seen.has(k)) continue;
		seen.add(k);
		deduped.push(issue);
	}
	const sorted = sortBySeverity(deduped);
	const filtered = filterBySeverity(sorted, parsed.severity);

	const textOpts: TextOptions = {
		color: parsed.color,
		project: { name: project.name, familyName: project.metadata.familyName, version: project.metadata.version }
	};

	switch (parsed.format) {
		case 'json':
			process.stdout.write(renderJson(filtered, project));
			break;
		case 'github':
			process.stdout.write(renderGithub(filtered));
			break;
		case 'text':
		default:
			process.stdout.write(renderText(filtered, textOpts));
			break;
	}

	const hasErrors = filtered.some((i) => i.severity === 'error');
	return hasErrors ? 1 : 0;
};
