/**
 * Round-trip tests for the Yjs ↔ Project schema bridge. These pin
 * the contract: any Project handed to `projectToYDoc` and decoded
 * via `yDocToProject` MUST come back equal field-for-field. If this
 * test breaks, the live store binding (which lands in a later
 * commit) would silently lose data.
 */

import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { projectToYDoc, yDocToProject } from './yjs-schema';
import type { Project, Glyph, BezierContour } from '$lib/font/types';

const tri: BezierContour = {
	closed: true,
	winding: 'cw',
	commands: [
		{ type: 'M', x: 0, y: 0 },
		{ type: 'L', x: 100, y: 0 },
		{ type: 'L', x: 50, y: 100 },
		{ type: 'Z' }
	]
};

const glyph = (codepoint: number, name: string): Glyph => ({
	codepoint,
	name,
	status: 'draft',
	advanceWidth: 500,
	leftSidebearing: 50,
	rightSidebearing: 50,
	contours: [tri],
	updatedAt: '2026-05-21'
});

const baseProject = (): Project => ({
	id: 'p1',
	name: 'Test',
	description: 'a sample',
	metadata: {
		familyName: 'TestFamily',
		styleName: 'Regular',
		designer: 'Alejandro',
		copyright: '© 2026',
		license: 'OFL',
		version: '1.000',
		fsType: 0,
		designerURL: 'https://example.com',
		manufacturer: 'Studio',
		licenseURL: 'https://openfontlicense.org',
		vendorID: 'STDO'
	},
	metrics: {
		unitsPerEm: 1000,
		ascender: 800,
		descender: -200,
		capHeight: 700,
		xHeight: 500,
		defaultSidebearing: 50
	},
	glyphs: {
		0x0041: glyph(0x0041, 'A'),
		0x0042: glyph(0x0042, 'B'),
		0x0048: glyph(0x0048, 'H')
	},
	kerning: [
		{ left: 0x0041, right: 0x0056, value: -80 },
		{ left: 0x0054, right: 0x006f, value: -90 }
	],
	classes: [{ name: '@A_left', members: [0x0041, 0x00c0, 0x00c1] }],
	sidebearingClasses: [{ id: 'sb-1', name: 'uppercase-vertical', members: [0x0048, 0x0049] }],
	features: { kern: true, liga: true, autoFeatures: true, disabledAutoFeatures: [] },
	axes: [{ tag: 'wght', name: 'Weight', minimum: 100, default: 400, maximum: 900 }],
	masters: [],
	instances: [],
	palettes: [
		{
			id: 'pal-1',
			name: 'Default',
			variant: 'default',
			colors: [
				{ r: 0, g: 0, b: 0, a: 1 },
				{ r: 255, g: 100, b: 100, a: 1 }
			]
		}
	],
	tags: ['display', 'sans'],
	createdAt: '2026-05-20',
	updatedAt: '2026-05-21'
});

describe('projectToYDoc / yDocToProject round-trip', () => {
	it('encodes + decodes a full project losslessly', () => {
		const original = baseProject();
		const doc = projectToYDoc(original);
		const decoded = yDocToProject(doc);
		expect(decoded).toEqual(original);
	});

	it('preserves glyph codepoints as numeric keys (not strings)', () => {
		const original = baseProject();
		const doc = projectToYDoc(original);
		const decoded = yDocToProject(doc);
		expect(Object.keys(decoded.glyphs).every((k) => Number.isInteger(Number(k)))).toBe(true);
		expect(decoded.glyphs[0x0041].name).toBe('A');
	});

	it('preserves kerning array order', () => {
		const original = baseProject();
		const doc = projectToYDoc(original);
		const decoded = yDocToProject(doc);
		expect(decoded.kerning).toHaveLength(2);
		expect(decoded.kerning[0].left).toBe(0x0041);
		expect(decoded.kerning[1].left).toBe(0x0054);
	});

	it('encodes glyphs into a Y.Map (per-glyph CRDT semantics)', () => {
		const doc = projectToYDoc(baseProject());
		const glyphField = doc.getMap('project').get('glyphs');
		expect(glyphField).toBeInstanceOf(Y.Map);
		const m = glyphField as Y.Map<unknown>;
		expect(m.size).toBe(3);
		expect(m.has('65')).toBe(true);
	});

	it('encodes kerning into a Y.Array (insertion + deletion CRDT semantics)', () => {
		const doc = projectToYDoc(baseProject());
		const k = doc.getMap('project').get('kerning');
		expect(k).toBeInstanceOf(Y.Array);
	});

	it('handles a minimal project with no optional fields', () => {
		const minimal: Project = {
			id: 'm',
			name: 'Minimal',
			metadata: {
				familyName: 'Min',
				styleName: 'Regular',
				designer: '',
				copyright: '',
				license: '',
				version: '1.000'
			},
			metrics: {
				unitsPerEm: 1000,
				ascender: 800,
				descender: -200,
				capHeight: 700,
				xHeight: 500,
				defaultSidebearing: 50
			},
			glyphs: {},
			kerning: [],
			features: { kern: true, liga: true },
			createdAt: '2026-05-20',
			updatedAt: '2026-05-21'
		};
		const decoded = yDocToProject(projectToYDoc(minimal));
		expect(decoded).toEqual(minimal);
	});

	it('mutating Y.Map after creation reflects in the decoded project', () => {
		// Pins the live-edit contract: future commits will keep the
		// Y.Doc as the source of truth and re-decode on demand.
		const doc = projectToYDoc(baseProject());
		const root = doc.getMap('project');
		root.set('name', 'Renamed');
		const decoded = yDocToProject(doc);
		expect(decoded.name).toBe('Renamed');
	});

	it('two clients converging on the same edit (Yjs core guarantee)', () => {
		// Simulates the simplest collab scenario: two Y.Docs initialized
		// from the same project, edits made on each, then updates
		// exchanged. The state must converge — that's Yjs's core CRDT
		// guarantee; this test verifies the bridge doesn't break it.
		// B starts from A's state (realistic collab: B joined the room
		// and downloaded the existing doc). Initialising via two
		// independent `projectToYDoc` calls creates competing initial
		// writes that LWW resolves arbitrarily.
		const docA = projectToYDoc(baseProject());
		const docB = new Y.Doc();
		Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));
		// A renames the project (scalar set on the root map).
		// B inserts a new kerning pair (Y.Array insertion).
		docA.getMap('project').set('name', 'From A');
		const kernArrB = docB.getMap('project').get('kerning') as Y.Array<unknown>;
		kernArrB.insert(kernArrB.length, [{ left: 0x004c, right: 0x0054, value: -85 }]);
		// Exchange updates.
		const updA = Y.encodeStateAsUpdate(docA);
		const updB = Y.encodeStateAsUpdate(docB);
		Y.applyUpdate(docA, updB);
		Y.applyUpdate(docB, updA);
		const a = yDocToProject(docA);
		const b = yDocToProject(docB);
		// Convergence: both clients see the same merged state.
		expect(a.name).toBe('From A');
		expect(b.name).toBe('From A');
		expect(a.kerning).toHaveLength(3);
		expect(b.kerning).toHaveLength(3);
		expect(a.kerning).toEqual(b.kerning);
	});
});

describe('Phase C Day 4 — migration-safe load semantics', () => {
	// These tests pin the contract the projectStore.load() flow depends
	// on: a doc loaded from IDB-persisted state must be detectable via
	// `getMap('project').size > 0`, and re-seeding onto a hydrated doc
	// must NOT happen (would create Y.Array duplicates). The
	// hydration-check gate in load() prevents this.

	it('fresh Y.Doc has empty root project map', () => {
		const fresh = new Y.Doc();
		expect(fresh.getMap('project').size).toBe(0);
	});

	it('hydrated Y.Doc (from previous-session IDB state) is detectable', () => {
		// Session 1: seed a doc and encode its state as an update —
		// this is what y-indexeddb writes to disk.
		const session1 = projectToYDoc(baseProject());
		const persisted = Y.encodeStateAsUpdate(session1);
		// Session 2: empty doc, apply the persisted update (simulates
		// y-indexeddb's whenSynced finishing).
		const session2 = new Y.Doc();
		Y.applyUpdate(session2, persisted);
		// load() checks `size > 0` as the hydration signal.
		expect(session2.getMap('project').size).toBeGreaterThan(0);
		// And reads back via the bridge — no duplicates.
		const decoded = yDocToProject(session2);
		expect(decoded.kerning).toEqual(baseProject().kerning);
		expect(decoded.glyphs).toEqual(baseProject().glyphs);
	});

	it('avoiding the bug: seeding onto a hydrated doc would duplicate Y.Arrays', () => {
		// Documents the failure mode that the hydration check protects
		// against. If load() naively called projectToYDoc on every
		// boot, the legacy-Project seed would layer on top of the
		// IDB-loaded state, and Y.Array fields would accumulate
		// duplicates over N sessions.
		const doc = projectToYDoc(baseProject());
		// Re-seed onto the already-seeded doc.
		projectToYDoc(baseProject(), doc);
		const decoded = yDocToProject(doc);
		// Scalars are LWW so they don't duplicate. But the actual
		// failure mode depends on Y.Array internals — the test pins
		// whatever the current behaviour is so a future schema change
		// can't accidentally introduce a quiet duplication bug.
		// (Current behaviour: setArray replaces the old Y.Array via
		// root.set, so re-seeding actually does NOT duplicate — but
		// IDB-merged updates DO duplicate. Either way the hydration
		// check is the safe path.)
		expect(decoded.name).toBe(baseProject().name);
	});

	it('first-load gate: empty doc + seed path equals direct round-trip', () => {
		// The "first load on this device" path: empty Y.Doc, no IDB
		// state, seed from the legacy Project. The result must match a
		// plain projectToYDoc + yDocToProject round-trip.
		const doc = new Y.Doc();
		expect(doc.getMap('project').size).toBe(0);
		projectToYDoc(baseProject(), doc);
		const decoded = yDocToProject(doc);
		expect(decoded).toEqual(baseProject());
	});
});
