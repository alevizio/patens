/**
 * POST /api/hint-font — LOCAL DEV FALLBACK
 *
 * In production this URL is served by the Vercel Python function at
 * `api/hint-font.py` (Python functions at `/api/*.py` take precedence
 * over SvelteKit routes per Vercel's routing rules). The Python path
 * uses `ttfautohint-py` which ships the hinter binary inside its
 * wheel — no manual binary install required.
 *
 * In `pnpm dev` the Python runtime doesn't run; SvelteKit handles
 * this URL via the route here. To exercise hinting in local dev,
 * install the binary system-wide:
 *
 *     brew install ttfautohint          # macOS
 *     apt-get install ttfautohint       # Debian / Ubuntu
 *
 * Then `pnpm dev` and the toggle on the Export page lights up.
 *
 * Without the binary installed locally, this route reports the
 * hinter as unavailable and the UI gracefully hides the toggle.
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
const MAX_BYTES = 8 * 1024 * 1024;

export const POST: RequestHandler = async ({ request, url }) => {
	const ab = await request.arrayBuffer();
	if (ab.byteLength === 0) throw error(400, 'Empty body — POST a TTF binary.');
	if (ab.byteLength > MAX_BYTES) {
		throw error(
			413,
			`Font is ${(ab.byteLength / 1024 / 1024).toFixed(1)} MB; max ${MAX_BYTES / 1024 / 1024} MB.`
		);
	}

	const view = new DataView(ab);
	if (view.getUint32(0) !== 0x00010000) {
		throw error(
			400,
			'Not a TTF — sfntVersion is not 0x00010000. (OTF/CFF must be converted to glyf first.)'
		);
	}

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
				'--hinting-range-min',
				String(rangeMin),
				'--hinting-range-max',
				String(rangeMax),
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
				'X-Hinter': 'ttfautohint-cli',
				'X-Hint-Range': `${rangeMin}-${rangeMax}`
			}
		});
	} catch (err) {
		const e = err as NodeJS.ErrnoException & { stderr?: string | Buffer };
		if (e.code === 'ENOENT') {
			throw error(
				503,
				`Hinting unavailable in local dev: ttfautohint binary not found at "${HINTER_BIN}". On macOS run \`brew install ttfautohint\`. In production this route is served by the Vercel Python function via ttfautohint-py and works without any local install.`
			);
		}
		const stderr = e.stderr ? e.stderr.toString() : '';
		throw error(500, `ttfautohint failed: ${e.message}${stderr ? `\n${stderr}` : ''}`);
	} finally {
		await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
	}
};

export const GET: RequestHandler = async () => {
	try {
		const { stdout } = await execFileAsync(HINTER_BIN, ['--version'], { timeout: 5_000 });
		return json({ available: true, version: stdout.trim() });
	} catch (err) {
		const e = err as NodeJS.ErrnoException;
		return json({
			available: false,
			reason:
				e.code === 'ENOENT'
					? 'binary-missing-locally — in production this route is the Vercel Python function (ttfautohint-py), works without any local install'
					: e.message
		});
	}
};

const clampInt = (raw: string | null, min: number, max: number, fallback: number): number => {
	const n = raw == null ? NaN : parseInt(raw, 10);
	if (!Number.isFinite(n)) return fallback;
	return Math.max(min, Math.min(max, n));
};
