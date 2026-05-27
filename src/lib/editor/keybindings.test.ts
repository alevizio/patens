// @vitest-environment happy-dom
//
// Tests for the editor keyboard-handler factory. The factory itself
// is pure — it takes a bindings object of getters/setters/actions and
// returns a (KeyboardEvent) => void. We synthesize events and verify
// the right binding fires. Two paths require store mocks: the
// jumpAttention helper (auditGlyph + selectGlyph) and the undo/redo /
// status-set paths (projectStore mutations). The happy-dom env gives
// us a working KeyboardEvent + HTMLInputElement.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEditorKeyHandler, type EditorKeybindings } from './keybindings';
import type { Glyph } from '$lib/font/types';

// ---- Mocks ----

vi.mock('$lib/stores/toast.svelte', () => ({
	toast: { info: vi.fn(), success: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

vi.mock('$lib/stores/project.svelte', () => ({
	projectStore: {
		project: {
			glyphs: {
				0x41: { codepoint: 0x41, name: 'A', contours: [], status: 'empty' },
				0x42: { codepoint: 0x42, name: 'B', contours: [{}], status: 'draft' },
				0x43: { codepoint: 0x43, name: 'C', contours: [{}], status: 'draft' }
			}
		},
		selectedCodepoint: 0x42,
		selectGlyph: vi.fn(),
		setGlyphStatus: vi.fn(),
		toggleGlyphPin: vi.fn(),
		toggleGlyphFlag: vi.fn(),
		undo: vi.fn(),
		redo: vi.fn()
	}
}));

vi.mock('$lib/font/audit', () => ({
	auditGlyph: vi.fn(() => []), // no attention by default
	sortBySeverity: vi.fn((arr) => arr)
}));

// ---- Fixtures ----

const makeBindings = (glyph: Glyph | null = null): EditorKeybindings & {
	calls: Record<string, number>;
} => {
	const calls: Record<string, number> = {};
	const inc = (k: string) => () => {
		calls[k] = (calls[k] ?? 0) + 1;
	};
	return {
		calls,
		getGlyph: () => glyph,
		getSkipEmptyNav: () => false,
		getFamilyRegular: () => null,
		setTool: vi.fn((t) => {
			calls['setTool:' + t] = (calls['setTool:' + t] ?? 0) + 1;
		}) as unknown as EditorKeybindings['setTool'],
		toggleSketch: inc('toggleSketch'),
		toggleVector: inc('toggleVector'),
		toggleGrid: inc('toggleGrid'),
		toggleReference: inc('toggleReference'),
		toggleFamilyRegular: inc('toggleFamilyRegular'),
		toggleOnion: inc('toggleOnion'),
		toggleAnchors: inc('toggleAnchors'),
		trace: inc('trace'),
		copyGlyph: inc('copyGlyph'),
		pasteGlyph: inc('pasteGlyph')
	};
};

const baseGlyph = (overrides: Partial<Glyph> = {}): Glyph =>
	({
		codepoint: 0x42,
		name: 'B',
		status: 'draft',
		advanceWidth: 600,
		leftSidebearing: 50,
		rightSidebearing: 50,
		contours: [{ closed: true, winding: 'ccw', commands: [] }],
		updatedAt: '2026-01-01T00:00:00Z',
		...overrides
	}) as Glyph;

const key = (k: string, mods: Partial<KeyboardEventInit> = {}, target?: EventTarget) => {
	const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...mods });
	if (target) Object.defineProperty(ev, 'target', { value: target });
	return ev;
};

// ---- Tests ----

describe('createEditorKeyHandler — text-input passthrough', () => {
	beforeEach(() => vi.clearAllMocks());

	it('does NOT preempt when target is an HTMLInputElement', () => {
		const b = makeBindings(baseGlyph());
		const handle = createEditorKeyHandler(b);
		const input = document.createElement('input');
		handle(key('p', {}, input));
		expect(b.calls['setTool:pencil']).toBeUndefined();
	});

	it('does NOT preempt when target is an HTMLTextAreaElement', () => {
		const b = makeBindings(baseGlyph());
		const handle = createEditorKeyHandler(b);
		const ta = document.createElement('textarea');
		handle(key('p', {}, ta));
		expect(b.calls['setTool:pencil']).toBeUndefined();
	});
});

describe('createEditorKeyHandler — tool selection', () => {
	beforeEach(() => vi.clearAllMocks());

	it('p / P → pencil', () => {
		const b = makeBindings(baseGlyph());
		const handle = createEditorKeyHandler(b);
		handle(key('p'));
		expect(b.calls['setTool:pencil']).toBe(1);
		handle(key('P'));
		expect(b.calls['setTool:pencil']).toBe(2);
	});

	it('e / E → eraser', () => {
		const b = makeBindings(baseGlyph());
		const handle = createEditorKeyHandler(b);
		handle(key('e'));
		expect(b.calls['setTool:eraser']).toBe(1);
	});

	it('a → edit only when glyph has contours', () => {
		const b = makeBindings(baseGlyph({ contours: [{ closed: true, winding: 'ccw', commands: [] }] }));
		const handle = createEditorKeyHandler(b);
		handle(key('a'));
		expect(b.calls['setTool:edit']).toBe(1);
	});

	it('a → no-op when glyph is empty', () => {
		const b = makeBindings(baseGlyph({ contours: [] }));
		const handle = createEditorKeyHandler(b);
		handle(key('a'));
		expect(b.calls['setTool:edit']).toBeUndefined();
	});
});

describe('createEditorKeyHandler — visibility toggles', () => {
	beforeEach(() => vi.clearAllMocks());

	it.each([
		['s', 'toggleSketch'],
		['g', 'toggleGrid'],
		['o', 'toggleOnion'],
		['x', 'toggleAnchors']
	])('%s → %s', (k, expected) => {
		const b = makeBindings(baseGlyph());
		const handle = createEditorKeyHandler(b);
		handle(key(k));
		expect(b.calls[expected]).toBe(1);
	});

	it('bare V toggles vector', () => {
		const b = makeBindings(baseGlyph());
		const handle = createEditorKeyHandler(b);
		handle(key('v'));
		expect(b.calls['toggleVector']).toBe(1);
	});

	it('bare R toggles reference', () => {
		const b = makeBindings(baseGlyph());
		const handle = createEditorKeyHandler(b);
		handle(key('r'));
		expect(b.calls['toggleReference']).toBe(1);
	});

	it('Shift+R toggles family-Regular only when a family is loaded', () => {
		const familyRegular = { glyphs: {} } as any;
		const b = { ...makeBindings(baseGlyph()), getFamilyRegular: () => familyRegular };
		const handle = createEditorKeyHandler(b);
		handle(key('R', { shiftKey: true }));
		expect(b.calls['toggleFamilyRegular']).toBe(1);
	});

	it('Shift+R falls through to bare-R when no family-Regular', () => {
		const b = makeBindings(baseGlyph());
		const handle = createEditorKeyHandler(b);
		handle(key('R', { shiftKey: true }));
		expect(b.calls['toggleFamilyRegular']).toBeUndefined();
		expect(b.calls['toggleReference']).toBe(1);
	});
});

describe('createEditorKeyHandler — V/Cmd+Shift+V disambiguation', () => {
	beforeEach(() => vi.clearAllMocks());

	it('bare V toggles vector (no modifier)', () => {
		const b = makeBindings(baseGlyph());
		createEditorKeyHandler(b)(key('v'));
		expect(b.calls['toggleVector']).toBe(1);
		expect(b.calls['pasteGlyph']).toBeUndefined();
	});

	it('Cmd+Shift+V triggers paste, NOT vector toggle', () => {
		const b = makeBindings(baseGlyph());
		createEditorKeyHandler(b)(key('v', { metaKey: true, shiftKey: true }));
		expect(b.calls['pasteGlyph']).toBe(1);
		expect(b.calls['toggleVector']).toBeUndefined();
	});

	it('Ctrl+Shift+V triggers paste too (Linux/Windows)', () => {
		const b = makeBindings(baseGlyph());
		createEditorKeyHandler(b)(key('v', { ctrlKey: true, shiftKey: true }));
		expect(b.calls['pasteGlyph']).toBe(1);
	});
});

describe('createEditorKeyHandler — undo / redo', () => {
	beforeEach(() => vi.clearAllMocks());

	it('Cmd+Z → undo', async () => {
		const { projectStore } = await import('$lib/stores/project.svelte');
		createEditorKeyHandler(makeBindings(baseGlyph()))(key('z', { metaKey: true }));
		expect(projectStore.undo).toHaveBeenCalled();
	});

	it('Cmd+Shift+Z → redo', async () => {
		const { projectStore } = await import('$lib/stores/project.svelte');
		createEditorKeyHandler(makeBindings(baseGlyph()))(
			key('z', { metaKey: true, shiftKey: true })
		);
		expect(projectStore.redo).toHaveBeenCalled();
	});

	it('Cmd+Y → redo (Windows convention)', async () => {
		const { projectStore } = await import('$lib/stores/project.svelte');
		createEditorKeyHandler(makeBindings(baseGlyph()))(key('y', { ctrlKey: true }));
		expect(projectStore.redo).toHaveBeenCalled();
	});
});

describe('createEditorKeyHandler — status digits + copy/paste', () => {
	beforeEach(() => vi.clearAllMocks());

	it.each([
		['1', 'empty'],
		['2', 'sketch'],
		['3', 'draft'],
		['4', 'final']
	])('digit %s → setGlyphStatus(%s)', async (digit, status) => {
		const { projectStore } = await import('$lib/stores/project.svelte');
		const g = baseGlyph();
		createEditorKeyHandler(makeBindings(g))(key(digit));
		expect(projectStore.setGlyphStatus).toHaveBeenCalledWith(g.codepoint, status);
	});

	it('digits do nothing under Cmd/Ctrl (browser shortcuts pass through)', async () => {
		const { projectStore } = await import('$lib/stores/project.svelte');
		createEditorKeyHandler(makeBindings(baseGlyph()))(key('1', { metaKey: true }));
		expect(projectStore.setGlyphStatus).not.toHaveBeenCalled();
	});

	it('` toggles glyph pin', async () => {
		const { projectStore } = await import('$lib/stores/project.svelte');
		const g = baseGlyph();
		createEditorKeyHandler(makeBindings(g))(key('`'));
		expect(projectStore.toggleGlyphPin).toHaveBeenCalledWith(g.codepoint);
	});

	it('Shift+F toggles glyph flag', async () => {
		const { projectStore } = await import('$lib/stores/project.svelte');
		const g = baseGlyph();
		createEditorKeyHandler(makeBindings(g))(key('F', { shiftKey: true }));
		expect(projectStore.toggleGlyphFlag).toHaveBeenCalledWith(g.codepoint);
	});

	it('Cmd+Shift+C → copyGlyph', () => {
		const b = makeBindings(baseGlyph());
		createEditorKeyHandler(b)(key('c', { metaKey: true, shiftKey: true }));
		expect(b.calls['copyGlyph']).toBe(1);
	});
});

describe('createEditorKeyHandler — glyph navigation', () => {
	beforeEach(() => vi.clearAllMocks());

	it(']  → next glyph (sorted by codepoint)', async () => {
		const { projectStore } = await import('$lib/stores/project.svelte');
		createEditorKeyHandler(makeBindings(baseGlyph()))(key(']'));
		expect(projectStore.selectGlyph).toHaveBeenCalledWith(0x43); // B → C
	});

	it('[ → previous glyph', async () => {
		const { projectStore } = await import('$lib/stores/project.svelte');
		createEditorKeyHandler(makeBindings(baseGlyph()))(key('['));
		expect(projectStore.selectGlyph).toHaveBeenCalledWith(0x41); // B → A
	});

	it('] at the end clamps to last (no wrap)', async () => {
		const { projectStore } = await import('$lib/stores/project.svelte');
		// Move "selectedCodepoint" mock to be the last glyph
		const m = await import('$lib/stores/project.svelte');
		(m.projectStore as { selectedCodepoint: number }).selectedCodepoint = 0x43;
		createEditorKeyHandler(makeBindings(baseGlyph({ codepoint: 0x43 })))(key(']'));
		// Should clamp to 0x43 itself (no wrap-around)
		expect(projectStore.selectGlyph).toHaveBeenLastCalledWith(0x43);
		(m.projectStore as { selectedCodepoint: number }).selectedCodepoint = 0x42; // reset
	});
});

describe('createEditorKeyHandler — Shift+] jump-to-attention', () => {
	beforeEach(() => vi.clearAllMocks());

	it('shows toast when no glyphs need attention', async () => {
		const { toast } = await import('$lib/stores/toast.svelte');
		createEditorKeyHandler(makeBindings(baseGlyph()))(key(']', { shiftKey: true }));
		expect(toast.info).toHaveBeenCalledWith('No glyphs need attention', 1500);
	});

	it('Shift+} (the same physical key but with shift) also jumps', async () => {
		const { toast } = await import('$lib/stores/toast.svelte');
		createEditorKeyHandler(makeBindings(baseGlyph()))(key('}'));
		expect(toast.info).toHaveBeenCalledWith('No glyphs need attention', 1500);
	});
});

describe('createEditorKeyHandler — actions', () => {
	beforeEach(() => vi.clearAllMocks());

	it('t → trace', () => {
		const b = makeBindings(baseGlyph());
		createEditorKeyHandler(b)(key('t'));
		expect(b.calls['trace']).toBe(1);
	});
});
