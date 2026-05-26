// Per-glyph audit-issue auto-fix dispatcher. Each branch maps an
// audit code to a transformation of the current glyph + a confirmation
// toast. Auto-snapshots the glyph before any contour-mutating fix so
// ⌘Z + a labelled revision are both available afterwards.
//
// Lifted out of the editor +page.svelte so the 150-line switch lives
// next to the audit code that emits it instead of bloating the editor.

import { projectStore } from '$lib/stores/project.svelte';
import { toast } from '$lib/stores/toast.svelte';
import { glyphBounds, roundToFontUnits } from '$lib/font/path';
import { booleanContours } from '$lib/font/path-edit';
import type { BezierContour, Glyph } from '$lib/font/types';

const CONTOUR_MUTATING_FIXES = new Set([
	'self-intersecting',
	'contour-winding-collision',
	'duplicate-points',
	'near-collinear-points',
	'off-grid-points',
	'tiny-contour'
]);

// Best-effort auto-snapshot before mutating fixes — cheap insurance.
// 30s debounce prevents spam if the user fires multiple fixes in a row.
const snapshotIfStale = (glyph: Glyph, code: string) => {
	const latest = glyph.revisions?.[glyph.revisions.length - 1];
	const recent = latest
		? Date.now() - new Date(latest.takenAt).getTime() < 30_000
		: false;
	if (!recent) projectStore.saveRevision(glyph.codepoint, `pre-fix: ${code}`);
};

export const fixAuditIssue = (
	glyph: Glyph,
	code: string,
	commitContours: (contours: BezierContour[]) => void
): void => {
	const cp = glyph.codepoint;
	if (CONTOUR_MUTATING_FIXES.has(code) && glyph.contours.length > 0) {
		snapshotIfStale(glyph, code);
	}

	if (code === 'off-grid-points') {
		commitContours(
			glyph.contours.map((c) => ({ ...c, commands: roundToFontUnits(c.commands) }))
		);
		toast.success('Snapped all points to integer font units.');
		return;
	}

	if (code === 'self-intersecting' || code === 'contour-winding-collision') {
		commitContours(booleanContours(glyph.contours, 'union'));
		toast.success(
			code === 'self-intersecting'
				? 'Cleaned self-intersections via boolean union.'
				: 'Re-oriented nested contours via boolean union.'
		);
		return;
	}

	if (code === 'duplicate-points') {
		const cleaned = glyph.contours.map((c) => {
			const out: typeof c.commands = [];
			let prevX: number | null = null;
			let prevY: number | null = null;
			for (const cmd of c.commands) {
				if (cmd.type === 'Z') {
					out.push(cmd);
					prevX = null;
					prevY = null;
					continue;
				}
				if (
					prevX !== null &&
					prevY !== null &&
					cmd.type !== 'M' &&
					Math.abs(cmd.x - prevX) < 0.5 &&
					Math.abs(cmd.y - prevY) < 0.5
				) {
					continue;
				}
				out.push(cmd);
				prevX = cmd.x;
				prevY = cmd.y;
			}
			return { ...c, commands: out };
		});
		commitContours(cleaned);
		toast.success('Removed duplicate points.');
		return;
	}

	if (code === 'near-collinear-points') {
		const cleaned = glyph.contours.map((c) => {
			const cmds = [...c.commands];
			const drop = new Set<number>();
			for (let i = 1; i < cmds.length - 1; i++) {
				const a = cmds[i - 1];
				const b = cmds[i];
				const d = cmds[i + 1];
				if (
					(a.type !== 'M' && a.type !== 'L') ||
					b.type !== 'L' ||
					d.type !== 'L'
				)
					continue;
				const num = Math.abs(
					(d.y - a.y) * b.x - (d.x - a.x) * b.y + d.x * a.y - d.y * a.x
				);
				const den = Math.hypot(d.x - a.x, d.y - a.y);
				if (den < 0.001) continue;
				if (num / den < 1) drop.add(i);
			}
			if (drop.size === 0) return c;
			return { ...c, commands: cmds.filter((_, i) => !drop.has(i)) };
		});
		commitContours(cleaned);
		toast.success('Removed near-collinear points.');
		return;
	}

	if (code === 'open-contour') {
		commitContours(
			glyph.contours.map((c) => (c.closed ? c : { ...c, closed: true }))
		);
		toast.success('Closed open contours.');
		return;
	}

	if (code === 'zero-advance' || code === 'overflows-advance') {
		if (glyph.contours.length === 0 || !projectStore.project) return;
		const b = glyphBounds(glyph.contours);
		const sb = projectStore.project.metrics.defaultSidebearing;
		const target = Math.max(1, Math.round(b.maxX) + sb);
		projectStore.updateGlyph(cp, (g) => ({ ...g, advanceWidth: target }));
		toast.success(`Set advance to ${target}.`);
		return;
	}

	if (
		code === 'anchor-naming-mark-no-prefix' ||
		code === 'anchor-naming-base-with-prefix'
	) {
		if (!glyph.anchors) return;
		const isMark = cp >= 0x0300 && cp <= 0x036f;
		const cleaned = glyph.anchors.map((a) => {
			if (isMark && !a.name.startsWith('_')) return { ...a, name: `_${a.name}` };
			if (!isMark && a.name.startsWith('_')) return { ...a, name: a.name.slice(1) };
			return a;
		});
		projectStore.updateGlyph(cp, (g) => ({ ...g, anchors: cleaned }));
		toast.success('Renamed anchors to match convention.');
		return;
	}

	if (code === 'tiny-contour') {
		const before = glyph.contours.length;
		const cleaned = glyph.contours.filter((c) => {
			if (!c.closed) return true;
			const b = glyphBounds([c]);
			return b.maxX - b.minX >= 8 || b.maxY - b.minY >= 8;
		});
		const dropped = before - cleaned.length;
		if (dropped === 0) return;
		commitContours(cleaned);
		toast.success(`Removed ${dropped} tiny contour${dropped === 1 ? '' : 's'}.`);
		return;
	}
};
