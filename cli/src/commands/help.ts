export const renderHelp = (): string => `patens — type-design audit CLI

USAGE
  patens <command> [options]

COMMANDS
  audit <path>        Run the 94-code audit against a .font.json file.
                      Exit code is 0 when no errors, 1 when there are
                      error-severity issues, 2 on usage/parse error.

  describe <code>     Print the plain-language explanation for a
                      single audit code (e.g. self-intersecting,
                      kerning-extreme, metrics-asc-mismatch). Same
                      text the editor + /learn/audit-codes show.

  version             Print CLI + audit-module version.

  help                This text. Also: --help, -h.

AUDIT OPTIONS
  --json              Output every issue as a JSON line (one issue per
                      line, JSONL). Useful for jq, CI pipelines.

  --github            Output as GitHub Actions annotations (::error::,
                      ::warning::, ::notice::). Drop the CLI in a step
                      and warnings appear inline on PR diffs.

  --severity=<level>  Filter output to a minimum severity. One of
                      info | warn | error. Default: info (show all).

  --no-color          Disable ANSI colors. Auto-detected on non-TTY.

EXIT CODES
  0    No error-severity issues found (warnings + info don't fail).
  1    At least one error-severity issue.
  2    Usage error, file not found, parse error.

EXAMPLES
  patens audit my-font.json
  patens audit my-font.json --severity=error
  patens audit my-font.json --json | jq '.code'
  patens audit my-font.json --github          # In CI
  patens describe kerning-extreme

LEARN MORE
  https://patens.design/learn/audit-codes     94-code reference
  https://patens.design/learn                 Tutorials
  https://github.com/alevizio/patens          Source
`;
