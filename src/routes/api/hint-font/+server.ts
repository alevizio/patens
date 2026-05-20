/**
 * POST /api/hint-font
 *
 * Body: raw TTF binary (Content-Type: font/ttf).
 * Response: hinted TTF binary, or a JSON error describing why hinting
 * couldn't be performed.
 *
 * This route shells out to the `ttfautohint` binary, which must be
 * available on PATH (or at TTFAUTOHINT_BIN). On macOS dev:
 *     brew install ttfautohint
 * On the Vercel deploy, the build step needs to either install the
 * binary or provide one at `bin/ttfautohint` and set TTFAUTOHINT_BIN.
 *
 * ttfautohint only handles TT outlines (the `glyf` table) — the client
 * must convert OTF/CFF → TTF via Cu2Qu before posting here.
 */

import { error, json } from '@sveltejs/kit';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { RequestHandler } from './$types';

const execFileAsync = promisify(execFile);

const HINTER_BIN = process.env.TTFAUTOHINT_BIN || 'ttfautohint';

// Cap input size at 8 MB. Fonts above that almost certainly have
// embedded bitmaps or non-Latin scripts we'd want to handle separately.
const MAX_BYTES = 8 * 1024 * 1024;

export const POST: RequestHandler = async ({ request, url }) => {
	const ab = await request.arrayBuffer();
	if (ab.byteLength === 0) {
		throw error(400, 'Empty body — POST a TTF binary.');
	}
	if (ab.byteLength > MAX_BYTES) {
		throw error(413, `Font is ${(ab.byteLength / 1024 / 1024).toFixed(1)} MB; max ${MAX_BYTES / 1024 / 1024} MB.`);
	}

	// Quick SFNT sanity check — TTF magic is 0x00010000.
	const view = new DataView(ab);
	if (view.getUint32(0) !== 0x00010000) {
		throw error(400, 'Not a TTF — sfntVersion is not 0x00010000. (OTF/CFF must be converted to glyf first.)');
	}

	// Hint range comes from the query string so the UI can offer presets.
	// Defaults follow the Google Fonts webfont recommendation: 8 → 50 PPM.
	const rangeMin = clampInt(url.searchParams.get('rangeMin'), 4, 50, 8);
	const rangeMax = clampInt(url.searchParams.get('rangeMax'), rangeMin, 200, 50);

	const dir = await fs.mkdtemp(join(tmpdir(), 'fs-hint-'));
	const inPath = join(dir, 'in.ttf');
	const outPath = join(dir, 'out.ttf');
	try {
		await fs.writeFile(inPath, Buffer.from(ab));
		await execFileAsync(
			HINTER_BIN,
			[
				'--hinting-range-min', String(rangeMin),
				'--hinting-range-max', String(rangeMax),
				'--no-info',
				inPath,
				outPath
			],
			{ timeout: 30_000 }
		);
		const hinted = await fs.readFile(outPath);
		return new Response(new Uint8Array(hinted), {
			status: 200,
			headers: {
				'Content-Type': 'font/ttf',
				'Content-Length': String(hinted.byteLength),
				'X-Hinter': 'ttfautohint',
				'X-Hint-Range': `${rangeMin}-${rangeMax}`
			}
		});
	} catch (err) {
		const e = err as NodeJS.ErrnoException & { stderr?: string | Buffer };
		if (e.code === 'ENOENT') {
			throw error(
				503,
				`Hinting unavailable: ttfautohint binary not found at "${HINTER_BIN}". On dev: brew install ttfautohint. In production: bundle the binary or set TTFAUTOHINT_BIN.`
			);
		}
		const stderr = e.stderr ? e.stderr.toString() : '';
		throw error(500, `ttfautohint failed: ${e.message}${stderr ? `\n${stderr}` : ''}`);
	} finally {
		// Best-effort cleanup; ignore errors.
		await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
	}
};

// Cheap health-check the UI uses to decide whether to even offer the toggle.
export const GET: RequestHandler = async () => {
	try {
		const { stdout } = await execFileAsync(HINTER_BIN, ['--version'], { timeout: 5_000 });
		return json({ available: true, version: stdout.trim() });
	} catch (err) {
		const e = err as NodeJS.ErrnoException;
		return json({ available: false, reason: e.code === 'ENOENT' ? 'binary-missing' : e.message });
	}
};

const clampInt = (raw: string | null, min: number, max: number, fallback: number): number => {
	const n = raw == null ? NaN : parseInt(raw, 10);
	if (!Number.isFinite(n)) return fallback;
	return Math.max(min, Math.min(max, n));
};
