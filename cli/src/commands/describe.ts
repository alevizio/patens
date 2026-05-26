import { describeAuditCode } from '../../../src/lib/font/audit';

export const runDescribe = (args: string[]): number => {
	const code = args[0];
	if (!code) {
		process.stderr.write('patens describe: missing audit code argument.\n');
		process.stderr.write('Usage: patens describe <audit-code>\n');
		process.stderr.write('Try `patens describe self-intersecting` or see /learn/audit-codes.\n');
		return 2;
	}
	const description = describeAuditCode(code);
	if (!description) {
		process.stderr.write(`patens describe: no curated description for code "${code}".\n`);
		process.stderr.write('Either the code is misspelled, or it post-dates this CLI build.\n');
		process.stderr.write('Full catalog: https://patens.design/learn/audit-codes\n');
		return 2;
	}
	process.stdout.write(`${code}\n${'─'.repeat(code.length)}\n${description}\n`);
	return 0;
};
