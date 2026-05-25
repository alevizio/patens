/**
 * GET /health — minimal liveness endpoint for monitoring.
 *
 * Returns 200 + a small JSON payload with version + commit + uptime.
 * Useful for:
 *  - Uptime checks (Uptime Robot, BetterStack, etc.) polling the URL
 *  - Vercel's serverless health checks
 *  - Quick "is the deploy alive?" confirmation in a terminal
 *
 * Doesn't touch IndexedDB or Vercel Blob — pure server response. If
 * this returns 200, the SvelteKit handler is alive; for the cloud
 * share data path, GET /api/share/{id} is the more meaningful probe.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import pkg from '../../../package.json';

const STARTED_AT = Date.now();

// Vercel exposes the commit SHA + ref via build-time env vars (the
// VERCEL_GIT_* family). We read them at request time so the
// response reflects the deploy's actual provenance.
const VERCEL_COMMIT_SHA = process.env.VERCEL_GIT_COMMIT_SHA || 'dev';
const VERCEL_COMMIT_REF = process.env.VERCEL_GIT_COMMIT_REF || 'local';

export const GET: RequestHandler = ({ setHeaders }) => {
	setHeaders({
		// Don't cache — health checks need real-time signal.
		'cache-control': 'no-store'
	});
	return json({
		status: 'ok',
		service: 'patens',
		version: pkg.version,
		commit: VERCEL_COMMIT_SHA.slice(0, 7),
		ref: VERCEL_COMMIT_REF,
		uptimeMs: Date.now() - STARTED_AT,
		now: new Date().toISOString()
	});
};
