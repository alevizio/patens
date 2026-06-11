#!/usr/bin/env node
/**
 * Smoke test for the Patens MCP server — plain Node, no test runner.
 *
 *   node cli/mcp-server.test.mjs
 *
 * Spawns cli/dist/mcp-server.mjs over stdio, performs the MCP
 * initialize handshake, then calls each of the three tools once
 * against a tiny generated .font.json fixture and asserts sane output.
 * Exits non-zero on any failure. Build first: pnpm run cli:build:mcp.
 */

import { spawn } from 'node:child_process';
import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER = resolve(__dirname, 'dist/mcp-server.mjs');

if (!existsSync(SERVER)) {
	console.error('mcp-server.test: cli/dist/mcp-server.mjs not found — run `pnpm run cli:build:mcp` first.');
	process.exit(1);
}

// ── Fixture ─────────────────────────────────────────────────────────
// A 4-glyph project deliberately seeded with findable issues: 'n' sits
// 20fu below x-height (xheight-misaligned), U+03E8 has an invalid name
// and pokes above the ascender, and the metadata is mostly blank.
const glyph = (cp, name, contours) => ({
	codepoint: cp,
	name,
	status: 'draft',
	advanceWidth: 500,
	leftSidebearing: 50,
	rightSidebearing: 50,
	contours,
	updatedAt: '2026-06-10T00:00:00.000Z'
});
const box = (x0, y0, x1, y1) => ({
	closed: true,
	winding: 'cw',
	commands: [
		{ type: 'M', x: x0, y: y0 },
		{ type: 'L', x: x0, y: y1 },
		{ type: 'L', x: x1, y: y1 },
		{ type: 'L', x: x1, y: y0 },
		{ type: 'Z' }
	]
});
const fixture = {
	schemaVersion: 1,
	id: 'mcp-smoke-fixture',
	name: 'MCP Smoke',
	metadata: {
		familyName: 'MCP Smoke',
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
	glyphs: {
		72: glyph(72, 'H', [box(50, 0, 450, 700)]),
		110: glyph(110, 'n', [box(50, 0, 450, 480)]),
		111: glyph(111, 'o', [box(50, 0, 450, 500)]),
		1000: glyph(1000, 'BAD NAME!', [box(50, 0, 450, 900)])
	},
	kerning: [],
	features: { kern: true, liga: false },
	createdAt: '2026-06-10T00:00:00.000Z',
	updatedAt: '2026-06-10T00:00:00.000Z'
};

// ── Minimal stdio MCP client ────────────────────────────────────────
const child = spawn(process.execPath, [SERVER], { stdio: ['pipe', 'pipe', 'inherit'] });
const pending = new Map();
let nextId = 1;
let buffer = '';

child.stdout.on('data', (chunk) => {
	buffer += chunk.toString('utf8');
	let nl;
	while ((nl = buffer.indexOf('\n')) !== -1) {
		const line = buffer.slice(0, nl).trim();
		buffer = buffer.slice(nl + 1);
		if (!line) continue;
		const message = JSON.parse(line); // anything non-JSON on stdout = failure
		const waiter = pending.get(message.id);
		if (waiter) {
			pending.delete(message.id);
			waiter(message);
		}
	}
});

const request = (method, params = {}) =>
	new Promise((resolvePromise, reject) => {
		const id = nextId++;
		const timer = setTimeout(() => {
			pending.delete(id);
			reject(new Error(`timed out waiting for response to ${method} (id ${id})`));
		}, 10_000);
		pending.set(id, (message) => {
			clearTimeout(timer);
			resolvePromise(message);
		});
		child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
	});

const notify = (method, params = {}) => {
	child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
};

const callTool = async (name, args = {}) => {
	const response = await request('tools/call', { name, arguments: args });
	assert.equal(response.error, undefined, `${name}: unexpected protocol error ${JSON.stringify(response.error)}`);
	return response.result;
};

// ── The test ────────────────────────────────────────────────────────
const run = async () => {
	const dir = await mkdtemp(join(tmpdir(), 'patens-mcp-'));
	const fixturePath = join(dir, 'smoke.font.json');
	await writeFile(fixturePath, JSON.stringify(fixture));

	try {
		// 1. initialize handshake
		const init = await request('initialize', {
			protocolVersion: '2025-06-18',
			capabilities: {},
			clientInfo: { name: 'smoke-test', version: '0.0.0' }
		});
		assert.equal(init.result.protocolVersion, '2025-06-18');
		assert.equal(init.result.serverInfo.name, 'patens-mcp');
		assert.ok(init.result.capabilities.tools, 'server must advertise tools capability');
		notify('notifications/initialized');

		// 2. tools/list
		const list = await request('tools/list');
		const names = list.result.tools.map((t) => t.name).sort();
		assert.deepEqual(names, ['audit_font', 'explain_audit_code', 'list_audit_codes']);
		for (const tool of list.result.tools) {
			assert.ok(tool.description.length > 20, `${tool.name} needs a real description`);
			assert.equal(tool.inputSchema.type, 'object', `${tool.name} inputSchema must be an object schema`);
		}

		// 3. audit_font against the fixture
		const audit = await callTool('audit_font', { path: fixturePath });
		assert.notEqual(audit.isError, true, `audit_font errored: ${audit.content?.[0]?.text}`);
		const { findings, summary } = audit.structuredContent;
		assert.ok(findings.length >= 5, `expected several findings, got ${findings.length}`);
		assert.equal(summary.total, findings.length);
		assert.equal(summary.family, 'MCP Smoke');
		const badName = findings.find((f) => f.code === 'glyph-name-invalid');
		assert.ok(badName, 'fixture must trigger glyph-name-invalid');
		assert.equal(badName.severity, 'warn');
		assert.equal(badName.glyph, 'BAD NAME!');
		assert.equal(badName.codepoint, 1000);
		assert.ok(findings.every((f) => f.code && f.severity && f.message), 'every finding has code/severity/message');

		// 3b. severity filter: warn must exclude info findings
		const warnOnly = await callTool('audit_font', { path: fixturePath, severity: 'warn' });
		const warnFindings = warnOnly.structuredContent.findings;
		assert.ok(warnFindings.length > 0 && warnFindings.length < findings.length, 'warn filter must narrow results');
		assert.ok(warnFindings.every((f) => f.severity !== 'info'), 'warn filter must drop info findings');

		// 3c. bad path → in-band tool error, not a crash
		const missing = await callTool('audit_font', { path: join(dir, 'nope.font.json') });
		assert.equal(missing.isError, true, 'missing file must return isError');

		// 4. explain_audit_code
		const explain = await callTool('explain_audit_code', { code: 'self-intersecting' });
		assert.notEqual(explain.isError, true);
		const explained = explain.structuredContent;
		assert.equal(explained.code, 'self-intersecting');
		assert.equal(explained.family, 'Contour shape');
		assert.equal(explained.severity, 'warn');
		assert.ok(explained.description.includes('contour crosses itself'), 'must return the curated prose');

		const unknown = await callTool('explain_audit_code', { code: 'definitely-not-a-code' });
		assert.equal(unknown.isError, true, 'unknown code must return isError');

		// 5. list_audit_codes
		const catalogue = await callTool('list_audit_codes');
		const { codes, total } = catalogue.structuredContent;
		assert.ok(total >= 90, `expected ≥90 catalogue codes, got ${total}`);
		assert.equal(codes.length, total);
		const valid = new Set(['info', 'warn', 'error', 'varies']);
		for (const c of codes) {
			assert.ok(c.code && c.family, `catalogue entry missing code/family: ${JSON.stringify(c)}`);
			assert.ok(valid.has(c.severity), `${c.code}: bad severity "${c.severity}"`);
		}
		assert.ok(codes.some((c) => c.code === 'self-intersecting' && c.severity === 'warn'));
		assert.ok(codes.some((c) => c.code === 'naming-family' && c.severity === 'error'));

		process.stdout.write(
			`✓ MCP smoke test passed — ${total} codes listed, ${findings.length} findings on fixture, 3 tools verified\n`
		);
	} finally {
		child.kill();
		await rm(dir, { recursive: true, force: true });
	}
};

run().then(
	() => process.exit(0),
	(err) => {
		console.error(`✗ MCP smoke test failed: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`);
		child.kill();
		process.exit(1);
	}
);
