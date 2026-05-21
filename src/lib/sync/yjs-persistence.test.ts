/**
 * Smoke tests for the y-indexeddb persistence binding. The test
 * environment is Node (no `window.indexedDB`), so the binding's
 * "graceful no-op in non-browser" path is what we exercise here.
 * Real browser-side persistence is verified manually + by Playwright
 * in the broader e2e suite once the store swap lands.
 */

import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { bindIndexedDb, projectRoomName } from './yjs-persistence';

describe('bindIndexedDb', () => {
	it('returns null in non-browser environments (Node)', () => {
		const doc = new Y.Doc();
		expect(bindIndexedDb(doc, 'test-project')).toBeNull();
	});
});

describe('projectRoomName', () => {
	it('namespaces project IDs under font-studio:', () => {
		expect(projectRoomName('p1')).toBe('font-studio:p1');
		expect(projectRoomName('abc-123')).toBe('font-studio:abc-123');
	});

	it('returns the same name for the same id (deterministic)', () => {
		expect(projectRoomName('p1')).toBe(projectRoomName('p1'));
	});
});
