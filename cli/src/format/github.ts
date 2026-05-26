import type { AuditIssue } from '../../../src/lib/font/audit';

/**
 * GitHub Actions workflow-command output. When this CLI runs as a
 * step in a GitHub Actions workflow, lines starting with `::error::`
 * / `::warning::` / `::notice::` are picked up by Actions and rendered
 * as PR annotations + checks-summary entries.
 *
 * Spec: https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions
 *
 * Patens audits don't have file-line attribution (the project is a
 * single JSON blob, not split source files), so we use the
 * file=patens-audit virtual filename + the codepoint in title=. The
 * "line" trick (line=1) keeps Actions happy without misleading
 * anyone.
 */
export const renderGithub = (issues: AuditIssue[]): string => {
	const lines: string[] = [];
	for (const issue of issues) {
		const cmd =
			issue.severity === 'error'
				? 'error'
				: issue.severity === 'warn'
					? 'warning'
					: 'notice';
		const cpHex = issue.codepoint > 0 ? `U+${issue.codepoint.toString(16).toUpperCase().padStart(4, '0')}` : 'project';
		const title = `${issue.code} (${cpHex})`;
		// Escape per the workflow-command spec — percent-encode CR / LF
		// and colons inside the message.
		const safeMessage = issue.message
			.replaceAll('%', '%25')
			.replaceAll('\r', '%0D')
			.replaceAll('\n', '%0A')
			.replaceAll(':', '%3A');
		const safeTitle = title
			.replaceAll('%', '%25')
			.replaceAll('\r', '%0D')
			.replaceAll('\n', '%0A')
			.replaceAll(',', '%2C');
		lines.push(`::${cmd} title=${safeTitle}::${safeMessage}`);
	}
	return lines.join('\n') + (lines.length > 0 ? '\n' : '');
};
