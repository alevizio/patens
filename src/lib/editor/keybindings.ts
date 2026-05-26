// Editor keyboard handler factory. The editor wires up reactive
// getters + setters; this module owns the dispatch logic. Lifted out
// so the keyboard map is one scrollable place (and so the editor
// +page.svelte doesn't carry 100 lines of `else if` chains).

import { projectStore } from '$lib/stores/project.svelte';
import { toast } from '$lib/stores/toast.svelte';
import { auditGlyph, sortBySeverity } from '$lib/font/audit';
import type { Glyph, Project } from '$lib/font/types';

export type EditorTool = 'pencil' | 'eraser' | 'edit';

export type EditorKeybindings = {
	// State accessors
	getGlyph: () => Glyph | null;
	getSkipEmptyNav: () => boolean;
	getFamilyRegular: () => Project | null;
	// State mutators
	setTool: (t: EditorTool) => void;
	toggleSketch: () => void;
	toggleVector: () => void;
	toggleGrid: () => void;
	toggleReference: () => void;
	toggleFamilyRegular: () => void;
	toggleOnion: () => void;
	toggleAnchors: () => void;
	// Compound actions
	trace: () => void;
	copyGlyph: () => void;
	pasteGlyph: () => void;
};

const STATUS_MAP: Record<string, 'empty' | 'sketch' | 'draft' | 'final'> = {
	'1': 'empty',
	'2': 'sketch',
	'3': 'draft',
	'4': 'final'
};

// "Jump to next/prev glyph that needs attention" — Shift+]/Shift+[.
// Computed on-demand: only pays the audit cost when the user actually
// presses the shortcut, not on every render.
const jumpAttention = (
	direction: 'next' | 'prev',
	codepoints: number[],
	allGlyphs: Record<number, Glyph>,
	project: Project
) => {
	const attention: Array<{ cp: number; firstMessage: string }> = [];
	for (const cp of codepoints) {
		const g = allGlyphs[cp];
		if (!g) continue;
		const issues = sortBySeverity(auditGlyph(g, project)).filter(
			(i) => i.severity === 'warn' || i.severity === 'error'
		);
		if (issues.length > 0) attention.push({ cp, firstMessage: issues[0].message });
	}
	if (attention.length === 0) {
		toast.info('No glyphs need attention', 1500);
		return;
	}
	const aIdx = attention.findIndex((a) => a.cp === projectStore.selectedCodepoint);
	const targetIdx =
		direction === 'next'
			? aIdx >= 0
				? (aIdx + 1) % attention.length
				: 0
			: aIdx >= 0
				? (aIdx - 1 + attention.length) % attention.length
				: attention.length - 1;
	const target = attention[targetIdx];
	projectStore.selectGlyph(target.cp);
	const name = allGlyphs[target.cp]?.name ?? 'glyph';
	toast.info(`${name} — ${target.firstMessage}`, 2200);
};

export const createEditorKeyHandler = (b: EditorKeybindings) => {
	return (ev: KeyboardEvent) => {
		// Form inputs eat their own keys — never preempt typing.
		if (ev.target instanceof HTMLInputElement) return;
		if (ev.target instanceof HTMLTextAreaElement) return;

		const project = projectStore.project;
		const allGlyphs = project?.glyphs ?? {};
		const allCodepoints = Object.keys(allGlyphs)
			.map(Number)
			.sort((a, b) => a - b);
		const codepoints = b.getSkipEmptyNav()
			? allCodepoints.filter(
					(cp) =>
						allGlyphs[cp]?.contours.length > 0 ||
						(allGlyphs[cp]?.components?.length ?? 0) > 0
				)
			: allCodepoints;
		const idx = codepoints.indexOf(projectStore.selectedCodepoint);
		const glyph = b.getGlyph();

		// Shift+]/Shift+[ — jump-to-attention.
		if ((ev.key === '}' || (ev.key === ']' && ev.shiftKey)) && project) {
			ev.preventDefault();
			jumpAttention('next', codepoints, allGlyphs, project);
			return;
		}
		if ((ev.key === '{' || (ev.key === '[' && ev.shiftKey)) && project) {
			ev.preventDefault();
			jumpAttention('prev', codepoints, allGlyphs, project);
			return;
		}

		// Glyph navigation: [ / ]
		if (ev.key === ']') {
			ev.preventDefault();
			projectStore.selectGlyph(
				codepoints[Math.min(idx + 1, codepoints.length - 1)]
			);
			return;
		}
		if (ev.key === '[') {
			ev.preventDefault();
			projectStore.selectGlyph(codepoints[Math.max(idx - 1, 0)]);
			return;
		}

		// Tool selection.
		if (ev.key === 'p' || ev.key === 'P') {
			b.setTool('pencil');
			return;
		}
		if (ev.key === 'e' || ev.key === 'E') {
			b.setTool('eraser');
			return;
		}
		if (ev.key === 'a' || ev.key === 'A') {
			if (glyph && glyph.contours.length > 0) b.setTool('edit');
			return;
		}

		// Action shortcuts.
		if (ev.key === 't' || ev.key === 'T') {
			b.trace();
			return;
		}

		// Visibility toggles.
		if (ev.key === 's' || ev.key === 'S') {
			b.toggleSketch();
			return;
		}
		// Bare V toggles vector layer. Cmd+Shift+V (paste glyph) is the
		// modifier-aware branch below — without the meta/ctrl guard this
		// branch swallowed paste and made it unreachable.
		if ((ev.key === 'v' || ev.key === 'V') && !ev.metaKey && !ev.ctrlKey) {
			b.toggleVector();
			return;
		}
		if (ev.key === 'g' || ev.key === 'G') {
			b.toggleGrid();
			return;
		}
		// Shift+R toggles the family-Regular ghost overlay (only when a
		// family Regular is loaded). Bare R toggles reference.
		if (ev.key === 'R' && ev.shiftKey && b.getFamilyRegular()) {
			b.toggleFamilyRegular();
			return;
		}
		if (ev.key === 'r' || ev.key === 'R') {
			b.toggleReference();
			return;
		}
		if (ev.key === 'o' || ev.key === 'O') {
			b.toggleOnion();
			return;
		}
		if (ev.key === 'x' || ev.key === 'X') {
			b.toggleAnchors();
			return;
		}

		// Status digits 1-4 — set glyph status.
		if (ev.key >= '1' && ev.key <= '4' && glyph && !ev.metaKey && !ev.ctrlKey) {
			const status = STATUS_MAP[ev.key];
			projectStore.setGlyphStatus(glyph.codepoint, status);
			toast.info(`Status: ${status}`, 1500);
			return;
		}

		// Pin / flag.
		if (ev.key === '`' && glyph) {
			const willPin = !glyph.pinned;
			projectStore.toggleGlyphPin(glyph.codepoint);
			toast.info(willPin ? `Pinned ${glyph.name}` : `Unpinned ${glyph.name}`, 1500);
			return;
		}
		if ((ev.key === 'F' || ev.key === 'f') && ev.shiftKey && glyph) {
			const willFlag = !glyph.flagged;
			projectStore.toggleGlyphFlag(glyph.codepoint);
			toast.info(
				willFlag ? `Flagged ${glyph.name} for review` : `Unflagged ${glyph.name}`,
				1500
			);
			return;
		}

		// Undo / redo.
		if ((ev.key === 'z' || ev.key === 'Z') && (ev.metaKey || ev.ctrlKey)) {
			ev.preventDefault();
			if (ev.shiftKey) projectStore.redo();
			else projectStore.undo();
			return;
		}
		if ((ev.key === 'y' || ev.key === 'Y') && (ev.metaKey || ev.ctrlKey)) {
			ev.preventDefault();
			projectStore.redo();
			return;
		}

		// Glyph copy / paste.
		if (
			(ev.key === 'c' || ev.key === 'C') &&
			ev.shiftKey &&
			(ev.metaKey || ev.ctrlKey)
		) {
			ev.preventDefault();
			b.copyGlyph();
			return;
		}
		if (
			(ev.key === 'v' || ev.key === 'V') &&
			ev.shiftKey &&
			(ev.metaKey || ev.ctrlKey)
		) {
			ev.preventDefault();
			b.pasteGlyph();
			return;
		}
	};
};
