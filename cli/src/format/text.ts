import type { AuditIssue } from '../../../src/lib/font/audit';

export type TextOptions = {
	color: boolean;
	project: { name: string; familyName: string; version?: string };
};

// ANSI helpers — bundled so the CLI has zero runtime deps beyond Node.
const ansi = (open: number, close: number) => (s: string, enabled: boolean) =>
	enabled ? `\x1b[${open}m${s}\x1b[${close}m` : s;
const red = ansi(31, 39);
const yellow = ansi(33, 39);
const blue = ansi(34, 39);
const gray = ansi(90, 39);
const bold = ansi(1, 22);
const dim = ansi(2, 22);

const SEVERITY_BADGE: Record<AuditIssue['severity'], (color: boolean) => string> = {
	error: (c) => red('error', c),
	warn: (c) => yellow('warn ', c),
	info: (c) => blue('info ', c)
};

const SEVERITY_RANK: Record<AuditIssue['severity'], number> = {
	error: 0,
	warn: 1,
	info: 2
};

const formatCodepoint = (cp: number): string => {
	if (cp <= 0) return 'project';
	const hex = cp.toString(16).toUpperCase().padStart(4, '0');
	const char = cp > 0x20 && cp < 0x10000 ? ` ${String.fromCodePoint(cp)}` : '';
	return `U+${hex}${char}`;
};

export const renderText = (issues: AuditIssue[], opts: TextOptions): string => {
	const lines: string[] = [];

	// Header — what we audited.
	const family = opts.project.familyName || opts.project.name;
	const version = opts.project.version ? ` v${opts.project.version}` : '';
	lines.push(bold(`${family}${version}`, opts.color));
	lines.push(dim(`Patens audit · ${issues.length} ${issues.length === 1 ? 'issue' : 'issues'}\n`, opts.color));

	if (issues.length === 0) {
		lines.push(`  ${blue('✓', opts.color)}  ${gray('All checks pass. Ship it.', opts.color)}\n`);
		return lines.join('\n');
	}

	// Group by code. The /audit page does the same grouping; reading a
	// flat list of 60 issues is impossible, but reading 12 codes with
	// counts is fine.
	const byCode = new Map<string, AuditIssue[]>();
	for (const i of issues) {
		const list = byCode.get(i.code) ?? [];
		list.push(i);
		byCode.set(i.code, list);
	}

	// Sort code groups by their worst severity, then by occurrence count.
	const groups = [...byCode.entries()].sort(([codeA, listA], [codeB, listB]) => {
		const worstA = Math.min(...listA.map((i) => SEVERITY_RANK[i.severity]));
		const worstB = Math.min(...listB.map((i) => SEVERITY_RANK[i.severity]));
		if (worstA !== worstB) return worstA - worstB;
		if (listA.length !== listB.length) return listB.length - listA.length;
		return codeA.localeCompare(codeB);
	});

	for (const [code, codeIssues] of groups) {
		const worst = codeIssues.reduce<AuditIssue['severity']>(
			(acc, i) => (SEVERITY_RANK[i.severity] < SEVERITY_RANK[acc] ? i.severity : acc),
			'info'
		);
		const badge = SEVERITY_BADGE[worst](opts.color);
		const count = codeIssues.length;
		const countLabel = count === 1 ? '1 occurrence' : `${count} occurrences`;
		lines.push(`  ${badge}  ${bold(code, opts.color)}  ${gray(`(${countLabel})`, opts.color)}`);

		// Show up to 6 affected codepoints; cap the rest with "+ N more".
		const cap = 6;
		const sample = codeIssues.slice(0, cap);
		for (const issue of sample) {
			const where = formatCodepoint(issue.codepoint);
			lines.push(`         ${gray(where.padEnd(12), opts.color)}  ${dim(issue.message, opts.color)}`);
		}
		if (count > cap) {
			lines.push(`         ${gray(`...and ${count - cap} more`, opts.color)}`);
		}
		lines.push('');
	}

	// Footer summary.
	const counts = { error: 0, warn: 0, info: 0 };
	for (const i of issues) counts[i.severity]++;
	const parts: string[] = [];
	if (counts.error > 0) parts.push(red(`${counts.error} error${counts.error === 1 ? '' : 's'}`, opts.color));
	if (counts.warn > 0) parts.push(yellow(`${counts.warn} warning${counts.warn === 1 ? '' : 's'}`, opts.color));
	if (counts.info > 0) parts.push(blue(`${counts.info} info`, opts.color));
	lines.push(parts.join(', ') + '\n');

	return lines.join('\n');
};
