import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { connectToPartyKit } from './yjs-network';

describe('connectToPartyKit', () => {
	it('returns null in non-browser environments (no WebSocket constructor)', () => {
		const doc = new Y.Doc();
		// vitest runs in Node without WebSocket; the binding's graceful
		// no-op path is what we verify here. Real connection lifecycle
		// is exercised by Playwright once the live store binding lands.
		expect(connectToPartyKit(doc, 'test')).toBeNull();
	});
});
