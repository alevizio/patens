// Pure derivation helpers for the editor sidebar — given the current
// glyph + project, compute the data the panels need. Each function is
// side-effect free; the editor wraps them in $derived.by(() => ...).
//
// Pulled out of the editor +page.svelte so the reactive declarations
// stay one-liners instead of inline switch/filter chains.

import { glyphBounds } from '$lib/font/path';
import { CONTROL_GLYPHS, useCaseTargets } from '$lib/editor/onboarding-targets';
import { aglfnName } from '$lib/font/aglfn';
import { auditGlyph, auditCompatibility, sortBySeverity } from '$lib/font/audit';
import type {
	BezierContour,
	Glyph,
	Project,
	KerningSide
} from '$lib/font/types';

// ---- "Glyph" panel ----------------------------------------------------

export type PeerComparison = {
	medianAdv: number;
	diff: number;
	pct: number;
	peerCount: number;
};

// Advance-width comparison against same-category peers (upper / lower /
// digit). Returns null when the glyph is empty or there are < 2 peers.
export const computePeerComparison = (
	glyph: Glyph,
	project: Project
): PeerComparison | null => {
	if (glyph.contours.length === 0) return null;
	const cp = glyph.codepoint;
	const sameCat = (other: number): boolean => {
		if (cp >= 0x0041 && cp <= 0x005a) return other >= 0x0041 && other <= 0x005a;
		if (cp >= 0x0061 && cp <= 0x007a) return other >= 0x0061 && other <= 0x007a;
		if (cp >= 0x0030 && cp <= 0x0039) return other >= 0x0030 && other <= 0x0039;
		return false;
	};
	const peers = Object.values(project.glyphs).filter(
		(g) => g.codepoint !== cp && sameCat(g.codepoint) && g.contours.length > 0
	);
	if (peers.length < 2) return null;
	const adv = peers.map((g) => g.advanceWidth).sort((a, b) => a - b);
	const medianAdv = adv[Math.floor(adv.length / 2)];
	const diff = glyph.advanceWidth - medianAdv;
	const pct = Math.round((Math.abs(diff) / medianAdv) * 100);
	return { medianAdv, diff, pct, peerCount: peers.length };
};

// ---- Spacing "Match peer" suggestion ----------------------------------

export type SpacingSuggestion = {
	peerName: string;
	peerChar: string;
	lsb: number;
	rsb: number;
};

// Pick a same-category peer with the closest bbox width — its
// sidebearings are a sensible match. Returns null when nothing better
// than the current LSB/RSB is found.
export const computeSpacingSuggestion = (
	glyph: Glyph,
	project: Project
): SpacingSuggestion | null => {
	if (glyph.contours.length === 0) return null;
	const cp = glyph.codepoint;
	const sameCategory = (other: number): boolean => {
		if (cp >= 0x0041 && cp <= 0x005a) return other >= 0x0041 && other <= 0x005a;
		if (cp >= 0x0061 && cp <= 0x007a) return other >= 0x0061 && other <= 0x007a;
		if (cp >= 0x0030 && cp <= 0x0039) return other >= 0x0030 && other <= 0x0039;
		return false;
	};
	const myBounds = glyphBounds(glyph.contours);
	const myWidth = myBounds.maxX - myBounds.minX;
	if (myWidth <= 0) return null;
	const peers = Object.values(project.glyphs).filter(
		(g) => g.codepoint !== cp && g.contours.length > 0 && sameCategory(g.codepoint)
	);
	if (peers.length === 0) return null;
	const scored = peers
		.map((g) => {
			const b = glyphBounds(g.contours);
			const w = b.maxX - b.minX;
			return { glyph: g, diff: Math.abs(w - myWidth) };
		})
		.sort((a, b) => a.diff - b.diff);
	const closest = scored[0];
	if (
		closest.glyph.leftSidebearing === glyph.leftSidebearing &&
		closest.glyph.rightSidebearing === glyph.rightSidebearing
	)
		return null;
	return {
		peerName: closest.glyph.name,
		peerChar: String.fromCodePoint(closest.glyph.codepoint),
		lsb: closest.glyph.leftSidebearing,
		rsb: closest.glyph.rightSidebearing
	};
};

// ---- Onboarding totals ------------------------------------------------

export const countDrawnGlyphs = (project: Project | null): number =>
	project
		? Object.values(project.glyphs).filter((g) => g.contours.length > 0).length
		: 0;

export const findMissingControlGlyphs = (project: Project | null): number[] =>
	project
		? CONTROL_GLYPHS.filter(
				(cp) => (project.glyphs[cp]?.contours.length ?? 0) === 0
			)
		: [];

// Priority codepoints by Brief use case — control glyphs first, then
// use-case-specific picks. Returns up to 10. Designed for the
// "Suggested next" hint banner.
export const computeSuggestedNext = (project: Project | null): number[] => {
	if (!project) return [];
	const useCases = project.brief?.useCases ?? [];
	const priority: number[] = [];
	for (const cp of CONTROL_GLYPHS) {
		if ((project.glyphs[cp]?.contours.length ?? 0) === 0) priority.push(cp);
	}
	for (const uc of useCases) {
		for (const cp of useCaseTargets(uc)) {
			if (priority.includes(cp)) continue;
			if ((project.glyphs[cp]?.contours.length ?? 0) === 0) priority.push(cp);
		}
	}
	return priority.slice(0, 10);
};

export const isBriefEmpty = (project: Project | null): boolean => {
	const b = project?.brief;
	if (!b) return true;
	return !(
		b.intent?.trim() ||
		b.audience?.trim() ||
		(b.useCases?.length ?? 0) > 0 ||
		b.differentiation?.trim() ||
		(b.references?.length ?? 0) > 0
	);
};

// ---- Reference / onion glyph pickers ---------------------------------

// Chooses a reference glyph to overlay (H/O/N for uppercase, n/o for
// lowercase, 0/1 for digits — fallback H/n/o for everything else).
export const pickReferenceGlyph = (glyph: Glyph, project: Project): Glyph | null => {
	const cp = glyph.codepoint;
	const candidates: number[] = [];
	if (cp >= 0x0041 && cp <= 0x005a) candidates.push(0x0048, 0x004f, 0x004e);
	else if (cp >= 0x0061 && cp <= 0x007a) candidates.push(0x006e, 0x006f);
	else if (cp >= 0x0030 && cp <= 0x0039) candidates.push(0x0030, 0x0031);
	else if (cp === 0x0020 || cp === 0x002e) return null;
	else candidates.push(0x0048, 0x006e, 0x006f);
	for (const c of candidates) {
		if (c === cp) continue;
		const g = project.glyphs[c];
		if (g && g.contours.length > 0) return g;
	}
	return null;
};

// Picks the nearest drawn glyphs before + after the current one for
// onion-skinning. Skips empty glyphs in either direction.
// ---- Glyph-panel bbox stats ------------------------------------------

export type GlyphStats = {
	contours: number;
	points: number;
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
	width: number;
	height: number;
};

const EMPTY_STATS: GlyphStats = {
	contours: 0,
	points: 0,
	minX: 0,
	maxX: 0,
	minY: 0,
	maxY: 0,
	width: 0,
	height: 0
};

const countPathPoints = (commands: BezierContour['commands']) =>
	commands.reduce(
		(n, cmd) =>
			cmd.type === 'M' || cmd.type === 'L' || cmd.type === 'Q' || cmd.type === 'C'
				? n + 1
				: n,
		0
	);

export const computeGlyphStats = (glyph: Glyph | null): GlyphStats => {
	if (!glyph || glyph.contours.length === 0) return EMPTY_STATS;
	const b = glyphBounds(glyph.contours);
	const points = glyph.contours.reduce((n, c) => n + countPathPoints(c.commands), 0);
	return {
		contours: glyph.contours.length,
		points,
		minX: Math.round(b.minX),
		maxX: Math.round(b.maxX),
		minY: Math.round(b.minY),
		maxY: Math.round(b.maxY),
		width: Math.round(b.maxX - b.minX),
		height: Math.round(b.maxY - b.minY)
	};
};

// ---- AGLFN name suggestion -------------------------------------------

// Canonical Adobe Glyph List for New Fonts name for the glyph's
// codepoint, if (a) one exists, (b) it differs from the current name,
// (c) it's a valid PostScript glyph name.
export const computeAglfnSuggestion = (glyph: Glyph | null): string | null => {
	if (!glyph) return null;
	const aglfn = aglfnName(glyph.codepoint);
	if (!aglfn || aglfn === glyph.name) return null;
	if (!/^[A-Za-z._][A-Za-z0-9._-]{0,62}$/.test(aglfn)) return null;
	return aglfn;
};

// ---- Combined audit issues for the current glyph ---------------------

// Audit + compatibility issues merged + severity-sorted. The
// auditCompatibility scan is O(masters × glyphs × contours) so caching
// this $derived means it only re-runs when project state changes — not
// on every accordion render.
export const computeCurrentGlyphIssues = (
	glyph: Glyph | null,
	project: Project | null
) => {
	if (!glyph || !project) return [];
	return sortBySeverity([
		...auditGlyph(glyph, project),
		...auditCompatibility(project).filter((i) => i.codepoint === glyph.codepoint)
	]);
};

// ---- Project-wide tag catalogue --------------------------------------

// Unique tag set across every glyph, sorted. Drives the autocomplete
// datalist on the per-glyph Tags accordion so designers can reuse
// existing tags instead of drifting between "wip", "WIP", "in-progress".
export const computeAllProjectTags = (project: Project | null): string[] => {
	if (!project) return [];
	const set = new Set<string>();
	for (const g of Object.values(project.glyphs)) {
		for (const t of g.tags ?? []) set.add(t);
	}
	return [...set].sort();
};

// ---- Family-Regular overlay glyph ------------------------------------

// When the editor's "Regular" overlay is enabled and a family Regular
// project is loaded, returns the same-codepoint glyph from that family
// (only when it has any contours).
export const pickFamilyReferenceGlyph = (
	glyph: Glyph | null,
	familyRegular: Project | null
): Glyph | null => {
	if (!familyRegular || !glyph) return null;
	const same = familyRegular.glyphs[glyph.codepoint];
	return same && same.contours.length > 0 ? same : null;
};

// ---- Pinned-snapshot ghost contours ----------------------------------

// Most-recent pinned revision's contours. Turns "pin" into an active
// comparison tool: pin the version you like, iterate, see the delta.
export const pickPinnedSnapshotGhost = (
	glyph: Glyph | null
): BezierContour[] | null => {
	const pins = glyph?.revisions?.filter((r) => r.pinned) ?? [];
	if (pins.length === 0) return null;
	const newest = pins.reduce((a, b) => (a.takenAt > b.takenAt ? a : b));
	return newest.contours;
};

// ---- "Used by" — composite-glyph back-references ---------------------

export const computeUsedByGlyphs = (
	glyph: Glyph | null,
	project: Project | null
): Glyph[] => {
	if (!project || !glyph) return [];
	return Object.values(project.glyphs).filter((g) =>
		(g.components ?? []).some((c) => c.baseCodepoint === glyph.codepoint)
	);
};

// ---- Kerning involvement count --------------------------------------

// Counts the kerning pairs in which the current glyph appears, either
// directly via codepoint or through membership in a kerning class.
export const computeInvolvedKerning = (
	glyph: Glyph | null,
	project: Project | null
): { asLeft: number; asRight: number } => {
	if (!project || !glyph) return { asLeft: 0, asRight: 0 };
	const cp = glyph.codepoint;
	const classes = project.classes ?? [];
	const memberClassNames = new Set(
		classes.filter((c) => c.members.includes(cp)).map((c) => c.name)
	);
	let asLeft = 0;
	let asRight = 0;
	const matches = (side: KerningSide, role: 'left' | 'right') => {
		const hit =
			(typeof side === 'number' && side === cp) ||
			(typeof side === 'string' && memberClassNames.has(side));
		if (!hit) return;
		if (role === 'left') asLeft++;
		else asRight++;
	};
	for (const pair of project.kerning) {
		matches(pair.left, 'left');
		matches(pair.right, 'right');
	}
	return { asLeft, asRight };
};

// ---- Metric-copy source dropdown -------------------------------------

// Every other drawn glyph, ordered by codepoint — populates the
// Metrics panel "Copy from…" dropdown.
export const computeCopyableMetricSources = (
	glyph: Glyph | null,
	project: Project | null
): Glyph[] => {
	if (!project || !glyph) return [];
	return Object.values(project.glyphs)
		.filter((g) => g.codepoint !== glyph.codepoint && g.contours.length > 0)
		.sort((a, b) => a.codepoint - b.codepoint);
};

export const pickOnionNeighbours = (
	glyph: Glyph,
	project: Project
): { prev: Glyph | null; next: Glyph | null } => {
	const codepoints = Object.keys(project.glyphs)
		.map(Number)
		.sort((a, b) => a - b);
	const idx = codepoints.indexOf(glyph.codepoint);
	if (idx === -1) return { prev: null, next: null };
	const findDrawn = (start: number, step: number): Glyph | null => {
		let i = start;
		while (i >= 0 && i < codepoints.length) {
			const g = project.glyphs[codepoints[i]];
			if (g && g.contours.length > 0) return g;
			i += step;
		}
		return null;
	};
	return { prev: findDrawn(idx - 1, -1), next: findDrawn(idx + 1, 1) };
};
