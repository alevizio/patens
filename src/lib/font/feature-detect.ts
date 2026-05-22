/**
 * Glyph-name suffix → OpenType feature detector. The first piece of
 * the OT-layout-depth milestone-1 plan (roadmap §11, day-2).
 *
 * Scans a project's glyphs and groups them into feature lookups based
 * on the de-facto naming conventions used by Glyphs / FontLab / AGL:
 *
 *   a.sc      → smcp:   a → a.sc
 *   A.c2sc    → c2sc:   A → A.c2sc
 *   a.ss01    → ss01:   a → a.ss01
 *   a.cv05    → cv05:   a → a.cv05
 *   a.salt    → salt:   a → a.salt  (also accepts `.alt`)
 *   one.osf   → onum:   one → one.osf  (also `.onum`)
 *   one.tf    → tnum:   one → one.tf   (also `.tnum`)
 *   one.tosf  → tnum + onum: tabular oldstyle, both features fire
 *   one.lf    → lnum:   one → one.lf   (also `.lnum`)
 *   one.numr  → numr:   one → one.numr (also `.numerator`)
 *   one.dnom  → dnom:   one → one.dnom (also `.denominator`)
 *   one.sups  → sups:   one → one.sups (also `.superior`)
 *   one.subs  → subs:   one → one.subs (also `.inferior`)
 *   K.swsh    → swsh:   K → K.swsh
 *
 * Returns one `DetectedFeature` per feature tag, with the
 * `(from, to)` glyph-name pairs sorted ascending by `from` so the
 * downstream compile path emits stable byte output across runs.
 *
 * The detector itself returns features in alphabetical tag order —
 * required by opentype.js's `addSingle` API per the day-1 smoke test
 * (`Features must be added in alphabetical order`).
 *
 * Pure TypeScript. No DOM, no Pyodide. Sub-millisecond on any font.
 */

import type { Glyph } from './types';

export type SubPair = {
	from: string;
	to: string;
};

export type DetectedFeature = {
	/** Feature tag: `smcp`, `c2sc`, `salt`, `ss01–ss20`, `cv01–cv99`, etc. */
	feature: string;
	/** Type of GSUB lookup this feature uses. */
	kind: 'single';
	/** (from, to) pairs sorted ascending by `from`. */
	subs: SubPair[];
};

// Suffix → feature mapping. A single suffix may produce ONE OR MORE
// features (e.g. `.tosf` is tabular + oldstyle, so it fires both
// `tnum` and `onum`). Order of suffixes within the table is
// longest-first so `.smcp` wins over `.sc` when both match.
const SUFFIX_MAP: ReadonlyArray<{
	suffix: string;
	features: readonly string[];
}> = [
	// Small caps
	{ suffix: '.smcp', features: ['smcp'] },
	{ suffix: '.sc', features: ['smcp'] },
	// Caps to small caps
	{ suffix: '.c2sc', features: ['c2sc'] },
	// Stylistic alternates
	{ suffix: '.salt', features: ['salt'] },
	{ suffix: '.alt', features: ['salt'] },
	// Figure variants — tabular-oldstyle fires both `tnum` and `onum`.
	{ suffix: '.tosf', features: ['onum', 'tnum'] },
	{ suffix: '.osf', features: ['onum'] },
	{ suffix: '.onum', features: ['onum'] },
	{ suffix: '.tf', features: ['tnum'] },
	{ suffix: '.tnum', features: ['tnum'] },
	{ suffix: '.lf', features: ['lnum'] },
	{ suffix: '.lnum', features: ['lnum'] },
	{ suffix: '.pnum', features: ['pnum'] },
	// Fractions / superior / inferior
	{ suffix: '.numr', features: ['numr'] },
	{ suffix: '.numerator', features: ['numr'] },
	{ suffix: '.dnom', features: ['dnom'] },
	{ suffix: '.denominator', features: ['dnom'] },
	{ suffix: '.sups', features: ['sups'] },
	{ suffix: '.superior', features: ['sups'] },
	{ suffix: '.subs', features: ['subs'] },
	{ suffix: '.inferior', features: ['subs'] },
	// Swashes (non-contextual only; contextual lives in `calt`)
	{ suffix: '.swsh', features: ['swsh'] },
	// Arabic positional — M1 stretch goal.
	{ suffix: '.init', features: ['init'] },
	{ suffix: '.medi', features: ['medi'] },
	{ suffix: '.fina', features: ['fina'] },
	{ suffix: '.isol', features: ['isol'] }
];

/**
 * Stylistic sets and character variants follow indexed conventions —
 * `.ss01` through `.ss20`, `.cv01` through `.cv99`. We pattern-match
 * those rather than enumerate.
 */
const INDEXED_SUFFIX_PATTERNS: ReadonlyArray<{
	regex: RegExp;
	feature: (digits: string) => string;
}> = [
	{
		regex: /\.ss(\d{2})$/,
		feature: (d) => `ss${d}`
	},
	{
		regex: /\.cv(\d{2})$/,
		feature: (d) => `cv${d}`
	}
];

const featureFromName = (name: string): string[] | null => {
	// Indexed patterns first — `.ss01` and `.cv01` are more specific
	// than any prefix in the fixed table.
	for (const p of INDEXED_SUFFIX_PATTERNS) {
		const m = name.match(p.regex);
		if (m) return [p.feature(m[1])];
	}
	// Fixed suffixes — table is longest-first so the first hit wins.
	for (const s of SUFFIX_MAP) {
		if (name.endsWith(s.suffix)) return [...s.features];
	}
	return null;
};

const baseGlyphName = (name: string): string => {
	// Strip indexed suffix first.
	for (const p of INDEXED_SUFFIX_PATTERNS) {
		const m = name.match(p.regex);
		if (m) return name.slice(0, name.length - m[0].length);
	}
	for (const s of SUFFIX_MAP) {
		if (name.endsWith(s.suffix)) return name.slice(0, name.length - s.suffix.length);
	}
	return name;
};

/**
 * Run the detector across every glyph in a project.
 *
 * `glyphsByCp` is what `Project.glyphs` is — codepoint-keyed, with each
 * glyph carrying a `name`. We index glyphs by name to verify that the
 * base glyph exists before emitting a substitution.
 *
 * Output is alphabetical by feature tag — required by opentype.js's
 * write API (see ot-substitution.smoke.test.ts for the constraint).
 */
export const detectFeatures = (
	glyphsByCp: Record<number, Glyph>
): DetectedFeature[] => {
	// Index by name for fast base-lookup.
	const byName = new Map<string, Glyph>();
	for (const g of Object.values(glyphsByCp)) {
		if (g.name) byName.set(g.name, g);
	}

	// Group subs by feature tag.
	const byFeature = new Map<string, SubPair[]>();
	for (const g of Object.values(glyphsByCp)) {
		if (!g.name) continue;
		const features = featureFromName(g.name);
		if (!features) continue;
		const base = baseGlyphName(g.name);
		// Only emit when the base glyph actually exists in the project —
		// orphan suffixed glyphs are likely typos.
		if (!byName.has(base)) continue;
		// Skip if the base IS the suffixed glyph (e.g. someone literally
		// named a glyph `a.sc` with no `a` — caught above, but belt+braces).
		if (base === g.name) continue;
		const pair: SubPair = { from: base, to: g.name };
		for (const feature of features) {
			const list = byFeature.get(feature);
			if (list) list.push(pair);
			else byFeature.set(feature, [pair]);
		}
	}

	// Sort entries within each feature for stable output.
	const out: DetectedFeature[] = [];
	for (const [feature, subs] of byFeature) {
		const sortedSubs = [...subs].sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
		out.push({ feature, kind: 'single', subs: sortedSubs });
	}
	// Sort features alphabetically — opentype.js requires this.
	out.sort((a, b) => (a.feature < b.feature ? -1 : a.feature > b.feature ? 1 : 0));
	return out;
};

/**
 * Apply a set of detected features to an opentype.js Font in place.
 * Writes through `font.substitution.addSingle` per the day-1 smoke
 * test. Caller is responsible for already-having-sorted the input —
 * `detectFeatures` does that by default, but if you construct
 * `DetectedFeature[]` manually you MUST sort by `feature` first or
 * opentype.js will throw "Features must be added in alphabetical
 * order."
 *
 * `disabledFeatures` lets the UI gate which features actually compile
 * (e.g. user unchecked Small Caps in the toggle list — don't emit it).
 *
 * Returns the number of substitution calls made, for diagnostic /
 * toast purposes.
 */
export const applyDetectedFeatures = (
	font: {
		substitution: {
			addSingle: (
				feature: string,
				sub: { sub: string; by: string }
			) => void;
		};
	},
	features: DetectedFeature[],
	disabledFeatures: ReadonlySet<string> = new Set()
): number => {
	let count = 0;
	for (const f of features) {
		if (disabledFeatures.has(f.feature)) continue;
		for (const pair of f.subs) {
			font.substitution.addSingle(f.feature, { sub: pair.from, by: pair.to });
			count++;
		}
	}
	return count;
};

/** Human-readable description used by the Features-tab UI. */
export const featureLabel = (tag: string): string => {
	if (tag.startsWith('ss')) return `Stylistic set ${tag.slice(2)}`;
	if (tag.startsWith('cv')) return `Character variant ${tag.slice(2)}`;
	const labels: Record<string, string> = {
		// Letter/case substitutions
		smcp: 'Small caps',
		c2sc: 'Caps to small caps',
		case: 'Case-sensitive forms',
		unic: 'Unicase',
		titl: 'Titling',
		hist: 'Historical forms',
		// Alternates
		salt: 'Stylistic alternates',
		aalt: 'Access all alternates',
		nalt: 'Alternate annotation',
		swsh: 'Swashes',
		ornm: 'Ornaments',
		// Ligatures
		liga: 'Standard ligatures',
		dlig: 'Discretionary ligatures',
		hlig: 'Historical ligatures',
		rlig: 'Required ligatures',
		clig: 'Contextual ligatures',
		calt: 'Contextual alternates',
		// Positioning
		kern: 'Kerning',
		mark: 'Mark positioning',
		mkmk: 'Mark-to-mark positioning',
		ccmp: 'Glyph composition / decomposition',
		locl: 'Localized forms',
		// Figures
		onum: 'Oldstyle figures',
		lnum: 'Lining figures',
		tnum: 'Tabular figures',
		pnum: 'Proportional figures',
		numr: 'Numerators',
		dnom: 'Denominators',
		sups: 'Superscript',
		subs: 'Subscript',
		frac: 'Fractions',
		afrc: 'Alternative fractions',
		ordn: 'Ordinals',
		zero: 'Slashed zero',
		// Arabic
		init: 'Arabic initial form',
		medi: 'Arabic medial form',
		fina: 'Arabic final form',
		isol: 'Arabic isolated form',
		// Vertical
		vert: 'Vertical writing',
		vrt2: 'Vertical alternates and rotation',
		// Width
		fwid: 'Full widths',
		hwid: 'Half widths',
		pwid: 'Proportional widths',
		palt: 'Proportional alternate widths'
	};
	return labels[tag] ?? tag;
};
