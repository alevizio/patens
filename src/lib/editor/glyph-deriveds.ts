// Pure derivation helpers for the editor sidebar — given the current
// glyph + project, compute the data the panels need. Each function is
// side-effect free; the editor wraps them in $derived.by(() => ...).
//
// Pulled out of the editor +page.svelte so the reactive declarations
// stay one-liners instead of inline switch/filter chains.

import { glyphBounds } from '$lib/font/path';
import { CONTROL_GLYPHS, useCaseTargets } from '$lib/editor/onboarding-targets';
import type { Glyph, Project } from '$lib/font/types';

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
