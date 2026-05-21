/**
 * PartyKit server for Font Studio collab sync.
 *
 * Each connected client streams Yjs updates here; we relay them to
 * every other client in the room and persist a snapshot to durable
 * storage so a room that goes empty doesn't lose state.
 *
 * Deploy via:
 *   pnpm dlx partykit deploy
 *
 * Cloudflare Workers free tier covers 100K req/day — plenty for the
 * indie scale Font Studio targets. PartyKit was acquired by
 * Cloudflare in 2024; deployments run on Workers + Durable Objects
 * under the hood.
 *
 * Auth: at this stage of the rollout (Option B — read-only share
 * links) we trust the room-name token as the access control. A
 * future commit adds Supabase JWT verification before any
 * write-permission upgrade (Option A milestone).
 */

import type * as Party from 'partykit/server';
import { onConnect } from 'y-partykit';

export default class FontStudioServer implements Party.Server {
	constructor(readonly party: Party.Party) {}

	async onConnect(connection: Party.Connection, ctx: Party.ConnectionContext) {
		// y-partykit handles the full Yjs sync protocol: handshake,
		// update fan-out, awareness, persistence. We just hand it the
		// connection and let it do its job.
		return onConnect(connection, this.party, {
			// Persist the doc state to PartyKit storage so a room that
			// goes empty can come back to its state. Storage is
			// per-room, keyed by `this.party.id` — matches the room
			// name the client passed.
			persist: { mode: 'snapshot' }
		});
	}
}
