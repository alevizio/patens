import type { AuditIssue } from '../../../src/lib/font/audit';
import type { Project } from '../../../src/lib/font/types';

/**
 * JSON Lines output — one issue per line. Easier to consume from jq,
 * grep, or a streaming reader than a single big array.
 *
 * Each line is a complete JSON object:
 *   {"code":"self-intersecting","severity":"warn","codepoint":97,...}
 *
 * Closes with a single summary line:
 *   {"summary":{"total":N,"error":N,"warn":N,"info":N,"family":"..."}}
 */
export const renderJson = (issues: AuditIssue[], project: Project): string => {
	const lines: string[] = [];
	const counts = { error: 0, warn: 0, info: 0 };
	for (const issue of issues) {
		counts[issue.severity]++;
		lines.push(
			JSON.stringify({
				code: issue.code,
				severity: issue.severity,
				codepoint: issue.codepoint,
				message: issue.message,
				glyphName: issue.glyphName ?? null
			})
		);
	}
	lines.push(
		JSON.stringify({
			summary: {
				total: issues.length,
				error: counts.error,
				warn: counts.warn,
				info: counts.info,
				family: project.metadata.familyName,
				version: project.metadata.version ?? null
			}
		})
	);
	return lines.join('\n') + '\n';
};
