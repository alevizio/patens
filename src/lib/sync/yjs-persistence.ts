/**
 * y-indexeddb persistence binding — Phase C foundation, second piece.
 *
 * Wraps `IndexeddbPersistence` from y-indexeddb so the Y.Doc backing
 * a project replicates to the browser's IndexedDB. Loads stay in
 * sync across tabs (Yjs broadcasts via BroadcastChannel) and across
 * reloads (state persists in IndexedDB).
 *
 * Lifecycle:
 *   1. Construct a Y.Doc (typically via `projectToYDoc`).
 *   2. Call `bindIndexedDb(doc, projectId)` — returns an
 *      `IndexeddbPersistence` instance.
 *   3. `await persistence.whenSynced` resolves once the existing
 *      IndexedDB state has been merged into the doc.
 *   4. To stop persisting (e.g. on logout / project close), call
 *      `persistence.destroy()`.
 *
 * Skipped in non-browser environments — `bindIndexedDb` no-ops and
 * returns null when `window.indexedDB` isn't available (SSR / Node).
 *
 * One IndexedDB database per project keyed by `font-studio:<id>`.
 */

import { IndexeddbPersistence } from 'y-indexeddb';
import type * as Y from 'yjs';

const ROOM_PREFIX = 'font-studio:';

export type ProjectPersistence = {
	/** Underlying y-indexeddb instance — exposed for advanced lifecycle. */
	persistence: IndexeddbPersistence;
	/** Resolves once the existing IndexedDB state has merged into the doc. */
	whenSynced: Promise<void>;
	/** Stop persisting + close the IndexedDB connection. */
	destroy: () => Promise<void>;
};

/**
 * Bind a Y.Doc to IndexedDB. Returns `null` when run outside a
 * browser (SSR, Node, test env without jsdom).
 */
export const bindIndexedDb = (doc: Y.Doc, projectId: string): ProjectPersistence | null => {
	if (typeof window === 'undefined' || typeof window.indexedDB === 'undefined') {
		return null;
	}
	const persistence = new IndexeddbPersistence(`${ROOM_PREFIX}${projectId}`, doc);
	return {
		persistence,
		whenSynced: persistence.whenSynced.then(() => undefined),
		destroy: () => persistence.destroy()
	};
};

/** The room name we hand to network providers (y-partykit / y-websocket). Stable across clients. */
export const projectRoomName = (projectId: string): string => `${ROOM_PREFIX}${projectId}`;
