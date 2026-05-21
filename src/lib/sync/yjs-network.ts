/**
 * y-partykit network binding — Phase C foundation, third piece.
 *
 * Wraps `YPartyKitProvider` so a Y.Doc syncs with a PartyKit server
 * (deployed to Cloudflare Workers). With this + the y-indexeddb
 * persistence binding from the previous commit + the schema bridge
 * from before that, the data + transport layers are complete; only
 * the live store integration remains for Phase C.
 *
 * Lifecycle:
 *   1. Construct a Y.Doc and (optionally) bind it to IndexedDB for
 *      offline persistence.
 *   2. Call `connectToPartyKit(doc, projectId, host)` to start
 *      syncing with the room over WebSocket.
 *   3. The returned provider exposes `awareness` for cursor /
 *      selection presence — see roadmap §12 for the presence
 *      design.
 *   4. Call `provider.destroy()` to disconnect cleanly on logout
 *      or project close.
 *
 * Skipped in non-browser environments — returns null when
 * `WebSocket` isn't a constructor.
 *
 * The PartyKit room name matches `projectRoomName(id)` from the
 * persistence module so IndexedDB + the network share the same
 * keying.
 */

import YPartyKitProvider from 'y-partykit/provider';
import type * as Y from 'yjs';
import { projectRoomName } from './yjs-persistence';

export type NetworkConnection = {
	provider: YPartyKitProvider;
	/** Convenience accessor — `provider.awareness` for presence. */
	awareness: YPartyKitProvider['awareness'];
	/** Disconnect + clean up the WebSocket. */
	destroy: () => void;
};

export type ConnectOptions = {
	/**
	 * Host where the PartyKit server is deployed. Default
	 * `font-studio.<deployer>.partykit.dev`; override via env var or
	 * settings for self-hosted Cloudflare Workers deployments.
	 */
	host?: string;
	/**
	 * Connection party — PartyKit lets a server expose multiple
	 * routes ("parties"). Default `'main'`; matches the entrypoint
	 * convention in `partykit/font-studio.ts`.
	 */
	party?: string;
};

const DEFAULT_HOST = 'font-studio.partykit.dev';

/**
 * Connect a Y.Doc to a PartyKit room. Returns `null` outside the
 * browser. Inside the browser, the connection starts immediately and
 * sync is automatic — Y.Doc updates fan out, remote updates apply.
 */
export const connectToPartyKit = (
	doc: Y.Doc,
	projectId: string,
	options: ConnectOptions = {}
): NetworkConnection | null => {
	// Gate on `window` (Node 22+ ships a WebSocket global, so the
	// constructor check alone isn't enough). Real sync only happens
	// in the browser; SSR / vitest get a no-op.
	if (typeof window === 'undefined') return null;
	if (typeof WebSocket === 'undefined') return null;
	const host = options.host ?? DEFAULT_HOST;
	const provider = new YPartyKitProvider(host, projectRoomName(projectId), doc, {
		party: options.party ?? 'main'
	});
	return {
		provider,
		awareness: provider.awareness,
		destroy: () => provider.destroy()
	};
};
