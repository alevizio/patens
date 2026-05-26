import { describe, it, expect } from 'vitest';
import { renderJson } from './json';
import { renderGithub } from './github';
import { renderText } from './text';
import type { AuditIssue } from '../../../src/lib/font/audit';
import type { Project } from '../../../src/lib/font/types';

const project: Pick<Project, 'name' | 'metadata'> = {
	name: 'test',
	metadata: { familyName: 'Test', styleName: 'Regular', version: '1.000' }
} as Project;

const baseIssue: AuditIssue = {
	code: 'self-intersecting',
	severity: 'warn',
	codepoint: 0x0061,
	message: 'A contour crosses itself.',
	glyphName: 'a'
};

describe('renderJson', () => {
	it('emits one JSON line per issue plus a summary line', () => {
		const out = renderJson([baseIssue], project as Project);
		const lines = out.trim().split('\n');
		expect(lines).toHaveLength(2);
		const issue = JSON.parse(lines[0]);
		expect(issue.code).toBe('self-intersecting');
		expect(issue.severity).toBe('warn');
		expect(issue.codepoint).toBe(0x0061);
		const summary = JSON.parse(lines[1]);
		expect(summary.summary.total).toBe(1);
		expect(summary.summary.warn).toBe(1);
		expect(summary.summary.family).toBe('Test');
	});

	it('counts severities correctly', () => {
		const issues: AuditIssue[] = [
			{ ...baseIssue, severity: 'error' },
			{ ...baseIssue, severity: 'error' },
			{ ...baseIssue, severity: 'warn' },
			{ ...baseIssue, severity: 'info' }
		];
		const out = renderJson(issues, project as Project);
		const summary = JSON.parse(out.trim().split('\n').at(-1)!);
		expect(summary.summary.error).toBe(2);
		expect(summary.summary.warn).toBe(1);
		expect(summary.summary.info).toBe(1);
	});

	it('handles empty issue list', () => {
		const out = renderJson([], project as Project);
		const lines = out.trim().split('\n');
		expect(lines).toHaveLength(1);
		const summary = JSON.parse(lines[0]);
		expect(summary.summary.total).toBe(0);
	});
});

describe('renderGithub', () => {
	it('maps severity to the right GitHub workflow command', () => {
		const issues: AuditIssue[] = [
			{ ...baseIssue, severity: 'error' },
			{ ...baseIssue, severity: 'warn' },
			{ ...baseIssue, severity: 'info' }
		];
		const out = renderGithub(issues);
		expect(out).toMatch(/^::error /m);
		expect(out).toMatch(/^::warning /m);
		expect(out).toMatch(/^::notice /m);
	});

	it('encodes special characters per the workflow-command spec', () => {
		const issue: AuditIssue = {
			...baseIssue,
			message: 'Line 1\nLine 2: colons and 50% percent'
		};
		const out = renderGithub([issue]);
		expect(out).toContain('%0A');
		expect(out).toContain('%3A');
		expect(out).toContain('%25');
	});

	it('renders project-scope issues with title "project"', () => {
		const out = renderGithub([{ ...baseIssue, codepoint: 0 }]);
		expect(out).toContain('(project)');
	});

	it('renders glyph-scope issues with a U+ hex title', () => {
		const out = renderGithub([baseIssue]);
		expect(out).toContain('U+0061');
	});

	it('returns an empty string for an empty issue list', () => {
		expect(renderGithub([])).toBe('');
	});
});

describe('renderText', () => {
	const opts = {
		color: false,
		project: { name: 'Test', familyName: 'Test', version: '1.000' }
	};

	it('shows the "all checks pass" surface when no issues', () => {
		const out = renderText([], opts);
		expect(out).toContain('All checks pass');
	});

	it('groups issues by code with the worst severity first', () => {
		const issues: AuditIssue[] = [
			{ ...baseIssue, code: 'kerning-extreme', severity: 'warn' },
			{ ...baseIssue, code: 'empty', severity: 'info' },
			{ ...baseIssue, code: 'self-intersecting', severity: 'error' }
		];
		const out = renderText(issues, opts);
		const errorIdx = out.indexOf('self-intersecting');
		const warnIdx = out.indexOf('kerning-extreme');
		const infoIdx = out.indexOf('empty');
		expect(errorIdx).toBeGreaterThanOrEqual(0);
		expect(errorIdx).toBeLessThan(warnIdx);
		expect(warnIdx).toBeLessThan(infoIdx);
	});

	it('caps the per-code occurrence list with "...and N more"', () => {
		const issues: AuditIssue[] = Array.from({ length: 10 }, (_, i) => ({
			...baseIssue,
			codepoint: 0x0041 + i,
			message: `glyph ${i}`
		}));
		const out = renderText(issues, opts);
		expect(out).toContain('and 4 more');
	});

	it('emits a footer summary with severity counts', () => {
		const issues: AuditIssue[] = [
			{ ...baseIssue, severity: 'error' },
			{ ...baseIssue, severity: 'warn' },
			{ ...baseIssue, severity: 'warn' }
		];
		const out = renderText(issues, opts);
		expect(out).toContain('1 error');
		expect(out).toContain('2 warnings');
	});

	it('does not include ANSI escape codes when color is false', () => {
		const out = renderText([baseIssue], opts);
		// Matching ESC (0x1b) is the whole point of the assertion — the
		// no-control-regex rule fires on the literal but this is the
		// right test shape.
		// eslint-disable-next-line no-control-regex
		expect(out).not.toMatch(/\x1b\[/);
	});
});
