/**
 * Pure parser for the changelog markdown. Lifted out of +server.ts so
 * it's unit-testable without spinning up SvelteKit's request lifecycle.
 *
 * Each "## [X.Y.Z] — YYYY-MM-DD" heading in CHANGELOG.md becomes one
 * Release. The body is everything between this heading and the next
 * (or the file's end).
 */

export type Release = {
	version: string;
	date: string;
	anchor: string;
	body: string;
};

const slugify = (s: string): string =>
	s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const parseReleases = (md: string): Release[] => {
	const releases: Release[] = [];
	// Capture: "## [X.Y.Z] — YYYY-MM-DD" then everything until the next
	// "## [" (or end of file). The version sits in group 1; the date in 2.
	// The body match is non-greedy; the lookahead terminates at the next
	// release header OR at end-of-string (the $(?![\s\S]) trick — a real
	// end anchor in multi-line mode that doesn't match between lines).
	const re = /^## \[([^\]]+)\] — (\d{4}-\d{2}-\d{2})\n([\s\S]*?)(?=^## \[|$(?![\s\S]))/gm;
	let m: RegExpExecArray | null;
	while ((m = re.exec(md)) !== null) {
		releases.push({
			version: m[1],
			date: m[2],
			anchor: slugify(`${m[1]} — ${m[2]}`),
			body: m[3].trim()
		});
	}
	return releases;
};
