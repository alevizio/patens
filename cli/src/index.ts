/**
 * Patens CLI — entry point.
 *
 * Surface: `patens <command> [...args]`
 *
 *   patens audit <path>      Run the 94-code audit against a Patens
 *                            .font.json project file. Output mirrors
 *                            the /audit page; exit code is non-zero
 *                            iff any error-severity issue is found.
 *
 *   patens describe <code>   Print the plain-language explanation
 *                            for an audit code (same dictionary the
 *                            editor + /learn/audit-codes use).
 *
 *   patens version           Print CLI + audit-module version.
 *
 *   patens help              This text.
 *
 * Implementation notes:
 *   - Pure Node (no DOM, no browser shims). The audit module is
 *     side-effect-free pure TypeScript and runs unmodified here.
 *   - Bundled via cli/build.mjs (esbuild → single .mjs in cli/dist).
 *   - No runtime dependencies beyond Node 22+ + the bundled audit
 *     module. No `commander`, `yargs`, `chalk`. Plain Node argv +
 *     ANSI escapes. The CLI is a thin shell around the existing
 *     audit pipeline; fewer deps = fewer supply-chain surfaces.
 */

import { runAudit } from './commands/audit';
import { runDescribe } from './commands/describe';
import { runVersion } from './commands/version';
import { renderHelp } from './commands/help';

const main = async (): Promise<number> => {
	const argv = process.argv.slice(2);
	const [command, ...rest] = argv;

	if (!command || command === 'help' || command === '--help' || command === '-h') {
		process.stdout.write(renderHelp());
		return 0;
	}

	switch (command) {
		case 'audit':
			return runAudit(rest);
		case 'describe':
			return runDescribe(rest);
		case 'version':
		case '--version':
		case '-v':
			return runVersion();
		default:
			process.stderr.write(`patens: unknown command "${command}"\n`);
			process.stderr.write(`Try \`patens help\`.\n`);
			return 2;
	}
};

main().then(
	(code) => process.exit(code),
	(err) => {
		process.stderr.write(`patens: ${err instanceof Error ? err.message : String(err)}\n`);
		process.exit(2);
	}
);
